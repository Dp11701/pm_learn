// /on-tap/phien — phiên ôn flashcard (bước 3; đặc tả §8.9 F23, đề xuất 3.5; chỉ máy tính, bố cục gọn):
// - Đầu phiên chụp danh sách thẻ đến hạn mới nhất (GET /api/on-tap); phiên chạy trên bản chụp đó.
// - Mặt trước + tên mục (link tới bài); "Lật thẻ" (Space) hiện mặt sau; rồi "Quên" (1) / "Nhớ" (2) lưu ngay
//   (POST /api/on-tap/:theId), xong mới sang thẻ sau; tiến độ "Thẻ i/n". Thẻ đã được ôn ở nơi khác (409) hay vừa bị
//   xoá (404): báo, bỏ qua, không đếm. Lỗi khác: báo, thẻ ở lại để bấm lại.
// - "Thoát phiên" / Esc rời phiên, không hỏi (đã lưu từng câu).
// - Cuối phiên: số Nhớ / Quên + lần ôn kế tiếp; "Ôn lại n thẻ đã quên" là vòng luyện thêm (luyenThem: không đổi
//   hộp, không tính tỉ lệ nhớ); "Về Ôn tập".
// - Hết thẻ đến hạn: "Hôm nay không còn thẻ nào cần ôn" + "Tạo thẻ" + "Về Ôn tập".
// Phím so theo e.code qua usePhimTat (không chạy khi đang gõ / ghép chữ / giữ Alt, Ctrl, ⌘; dialog đang mở).
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { CircleCheck, RotateCcw } from 'lucide-react'
import { dinhDangNgay, dinhDangSo } from '../../../shared/dinh-dang'
import { layCay } from '../../../shared/roadmap'
import type { KetQuaOn } from '../../../server/du-lieu/hop-dong-the'
import { LoiGoiApi } from '../../app/du-lieu/api'
import { taiOnTapMoi, useOnTap, useOnThe, type TheOn } from '../../app/du-lieu/on-tap'
import { usePhimTat } from '../../app/phim-tat'
import Nut, { NutLink } from '../../components/Nut'
import TenMuc from '../../components/TenMuc'
import TieuDeTrang from '../../components/TieuDeTrang'
import { useToast } from '../../components/Toast'
import TrangThaiTrong, { TheCho, TrangThaiLoi, VungDangTai } from '../../components/TrangThaiTrong'
import { veTrangCha } from '../../copy/cho-duyet'
import {
  LOI_LUU_CAU_TRA_LOI,
  LOI_TAI_ON_TAP,
  MAT_SAU,
  MAT_TRUOC,
  NHAN_MUC_CUA_THE,
  NHOM_TRA_LOI,
  VONG_LUYEN_THEM,
  XONG_VONG_LUYEN,
  ketQuaVongLuyen,
  tienDoPhien,
} from '../../copy/cho-duyet-on-tap'
import { KhungTrang, LOP_H1 } from '../chung'
import { useDichTaoThe } from './TrangOnTap'

const VE_ON_TAP = veTrangCha('Ôn tập')

const LOP_META = 'm-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted'
const LOP_KBD =
  'rounded-[4px] border border-current px-1.5 font-mono text-[length:var(--fs-chip)] leading-[var(--lh-chip)] opacity-80'

/** Một vòng: bản chụp các thẻ + vòng thật hay vòng luyện thêm. */
interface Vong {
  cacThe: readonly TheOn[]
  luyenThem: boolean
}

interface CauTraLoi {
  theId: number
  ket: KetQuaOn
}

type DichFocus = 'truoc' | 'sau' | 'ket-thuc' | null

function PhimGoi({ children }: { children: string }) {
  return (
    <kbd aria-hidden="true" className={LOP_KBD}>
      {children}
    </kbd>
  )
}

export default function PhienOn() {
  const client = useQueryClient()
  const navigate = useNavigate()
  const { toast } = useToast()
  const onThe = useOnThe()
  const { duLieu: onTap } = useOnTap()
  const dichTaoThe = useDichTaoThe()

  const [vong, datVong] = useState<Vong | null>(null)
  const [loiTai, datLoiTai] = useState(false)
  const [lanTai, datLanTai] = useState(0)
  const [thu, datThu] = useState(0)
  const [daLat, datDaLat] = useState(false)
  const [traLoi, datTraLoi] = useState<CauTraLoi[]>([])
  const [dangGui, datDangGui] = useState(false)
  // Chặn bấm hai lần trong cùng một nhịp (state chưa kịp render lại)
  const dangGuiRef = useRef(false)

  const refTruoc = useRef<HTMLDivElement>(null)
  const refSau = useRef<HTMLDivElement>(null)
  const refKetThuc = useRef<HTMLHeadingElement>(null)
  const dichFocus = useRef<DichFocus>(null)

  // Chụp danh sách thẻ đến hạn mới nhất lúc vào phiên (và lúc "Thử lại").
  useEffect(() => {
    let boQua = false
    taiOnTapMoi(client).then(
      (d) => {
        if (boQua) return
        datVong({ cacThe: d.denHan, luyenThem: false })
        datLoiTai(false)
      },
      () => {
        if (!boQua) datLoiTai(true)
      },
    )
    return () => {
      boQua = true
    }
  }, [client, lanTai])

  // Focus sau khi lật / sang thẻ / hết vòng (chỉ sau thao tác của người dùng; lúc vào trang focus ở H1).
  useEffect(() => {
    const dich = dichFocus.current
    if (!dich) return
    dichFocus.current = null
    const phanTu =
      dich === 'truoc' ? refTruoc.current : dich === 'sau' ? refSau.current : refKetThuc.current
    phanTu?.focus()
  })

  const cacThe = vong?.cacThe ?? []
  const the = cacThe[thu] as TheOn | undefined
  const dangHienThe = vong !== null && the !== undefined

  const lat = useCallback(() => {
    if (!dangHienThe || daLat) return
    dichFocus.current = 'sau'
    datDaLat(true)
  }, [dangHienThe, daLat])

  const sangThe = useCallback(
    (cau: CauTraLoi | null) => {
      if (cau) datTraLoi((ds) => [...ds, cau])
      dichFocus.current = thu + 1 < cacThe.length ? 'truoc' : 'ket-thuc'
      datThu((i) => i + 1)
      datDaLat(false)
    },
    [thu, cacThe.length],
  )

  const tra = useCallback(
    async (ket: KetQuaOn) => {
      if (!vong || !the || !daLat || dangGuiRef.current) return
      dangGuiRef.current = true
      datDangGui(true)
      try {
        await onThe({ theId: the.id, ket, luyenThem: vong.luyenThem })
        sangThe({ theId: the.id, ket })
      } catch (loi) {
        if (loi instanceof LoiGoiApi && (loi.status === 409 || loi.status === 404)) {
          // Đã ôn ở nơi khác / vừa bị xoá: bỏ qua thẻ này, không đếm
          toast({ noiDung: loi.message })
          sangThe(null)
        } else {
          toast({
            loai: 'loi',
            noiDung: loi instanceof LoiGoiApi ? loi.message : LOI_LUU_CAU_TRA_LOI,
          })
        }
      } finally {
        dangGuiRef.current = false
        datDangGui(false)
      }
    },
    [vong, the, daLat, onThe, sangThe, toast],
  )

  const onLaiQuen = useCallback(() => {
    if (!vong) return
    const quen = new Set(traLoi.filter((c) => c.ket === 'quen').map((c) => c.theId))
    dichFocus.current = 'truoc'
    datVong({ cacThe: vong.cacThe.filter((t) => quen.has(t.id)), luyenThem: true })
    datThu(0)
    datDaLat(false)
    datTraLoi([])
  }, [vong, traLoi])

  const thoat = useCallback(() => navigate('/on-tap'), [navigate])

  usePhimTat('Space', lat, { enabled: dangHienThe && !daLat })
  usePhimTat('Digit1', () => void tra('quen'), { enabled: dangHienThe && daLat && !dangGui })
  usePhimTat('Digit2', () => void tra('nho'), { enabled: dangHienThe && daLat && !dangGui })
  usePhimTat('Escape', thoat)

  let noiDung
  if (vong === null) {
    noiDung = loiTai ? (
      <TrangThaiLoi cauChinh={LOI_TAI_ON_TAP} thuLai={() => datLanTai((n) => n + 1)} khung />
    ) : (
      <VungDangTai>
        <TheCho cao={260} />
      </VungDangTai>
    )
  } else if (cacThe.length === 0) {
    noiDung = (
      <TrangThaiTrong
        icon={CircleCheck}
        khung
        className="bg-surface"
        cauChinh="Hôm nay không còn thẻ nào cần ôn"
        nut={
          <>
            <NutLink to="/on-tap" bien="chinh">
              {VE_ON_TAP}
            </NutLink>
            <NutLink to={dichTaoThe} bien="phu">
              Tạo thẻ
            </NutLink>
          </>
        }
      />
    )
  } else if (the) {
    noiDung = (
      <MatThe
        the={the}
        daLat={daLat}
        dangGui={dangGui}
        luyenThem={vong.luyenThem}
        refTruoc={refTruoc}
        refSau={refSau}
        khiLat={lat}
        khiTra={(ket) => void tra(ket)}
      />
    )
  } else {
    const nho = traLoi.filter((c) => c.ket === 'nho').length
    const quen = traLoi.filter((c) => c.ket === 'quen').length
    const hanKe = onTap && (onTap.denHan.length > 0 ? onTap.homNay : onTap.hanKeTiep)
    noiDung = (
      <section
        aria-labelledby="ket-thuc-phien"
        className="flex flex-col items-start gap-4 rounded-[var(--radius-md)] border border-border bg-surface p-6"
      >
        <h2
          id="ket-thuc-phien"
          ref={refKetThuc}
          tabIndex={-1}
          className="m-0 text-[length:var(--fs-h2)] leading-[var(--lh-h2)] font-bold outline-none"
        >
          {vong.luyenThem ? XONG_VONG_LUYEN : 'Xong phiên hôm nay'}
        </h2>
        <p className="m-0 tabular-nums">
          {vong.luyenThem
            ? ketQuaVongLuyen(nho, quen)
            : `Nhớ ${dinhDangSo(nho)} · Quên ${dinhDangSo(quen)}${
                hanKe ? ` · Lần ôn kế tiếp ${dinhDangNgay(hanKe)}` : ''
              }`}
        </p>
        <div className="flex flex-wrap gap-2">
          {quen > 0 && (
            <Nut bien="chinh" icon={RotateCcw} onClick={onLaiQuen}>
              Ôn lại {dinhDangSo(quen)} thẻ đã quên
            </Nut>
          )}
          <NutLink to="/on-tap" bien={quen > 0 ? 'phu' : 'chinh'}>
            {VE_ON_TAP}
          </NutLink>
        </div>
      </section>
    )
  }

  return (
    <KhungTrang className="max-w-[760px]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <TieuDeTrang tenTrang="Phiên ôn" className={LOP_H1}>
            Phiên ôn
          </TieuDeTrang>
          {dangHienThe && (
            <span className="text-muted tabular-nums">{tienDoPhien(thu + 1, cacThe.length)}</span>
          )}
        </div>
        <NutLink to="/on-tap" bien="ghost" aria-keyshortcuts="Escape">
          Thoát phiên <PhimGoi>Esc</PhimGoi>
        </NutLink>
      </div>
      {vong?.luyenThem && dangHienThe && <p className={LOP_META}>{VONG_LUYEN_THEM}</p>}
      {noiDung}
    </KhungTrang>
  )
}

interface PropsMatThe {
  the: TheOn
  daLat: boolean
  dangGui: boolean
  luyenThem: boolean
  refTruoc: RefObject<HTMLDivElement | null>
  refSau: RefObject<HTMLDivElement | null>
  khiLat: () => void
  khiTra: (ket: KetQuaOn) => void
}

function MatThe({
  the,
  daLat,
  dangGui,
  luyenThem,
  refTruoc,
  refSau,
  khiLat,
  khiTra,
}: PropsMatThe) {
  const muc = layCay().mucTheoId.get(the.itemId)
  return (
    <article className="flex flex-col gap-5 rounded-[var(--radius-md)] border border-border bg-surface p-6">
      <div
        ref={refTruoc}
        tabIndex={-1}
        role="group"
        aria-label={MAT_TRUOC}
        className="flex flex-col gap-3 outline-none"
      >
        <p className={LOP_META}>
          {muc && (
            <>
              {NHAN_MUC_CUA_THE}{' '}
              <Link to={`/hoc/${muc.slug}`} className="text-text underline">
                <TenMuc>{muc.label}</TenMuc>
              </Link>
              {' · '}
            </>
          )}
          Hộp {dinhDangSo(the.hop)}
        </p>
        <p className="m-0 text-[length:var(--fs-h2)] leading-[var(--lh-h2)] font-semibold whitespace-pre-line [overflow-wrap:anywhere]">
          {the.truoc}
        </p>
      </div>

      {!daLat ? (
        <div className="flex flex-col items-start gap-3 border-t border-border pt-5">
          <p className={LOP_META}>Tự nhớ lại đáp án trước khi lật</p>
          <Nut bien="chinh" onClick={khiLat} aria-keyshortcuts="Space">
            Lật thẻ <PhimGoi>Space</PhimGoi>
          </Nut>
        </div>
      ) : (
        <>
          <div
            ref={refSau}
            tabIndex={-1}
            role="group"
            aria-label={MAT_SAU}
            className="border-t border-border pt-5 outline-none"
          >
            <p className="m-0 whitespace-pre-line [overflow-wrap:anywhere]">{the.sau}</p>
          </div>
          <div className="flex flex-col items-start gap-2">
            <div role="group" aria-label={NHOM_TRA_LOI} className="flex gap-2">
              <Nut
                bien="phu"
                onClick={() => khiTra('quen')}
                dangXuLy={dangGui}
                aria-keyshortcuts="1"
              >
                Quên <PhimGoi>1</PhimGoi>
              </Nut>
              <Nut
                bien="chinh"
                onClick={() => khiTra('nho')}
                dangXuLy={dangGui}
                aria-keyshortcuts="2"
              >
                Nhớ <PhimGoi>2</PhimGoi>
              </Nut>
            </div>
            {!luyenThem && <p className={LOP_META}>Nhớ → lên 1 hộp · Quên → về hộp 1</p>}
          </div>
        </>
      )}
    </article>
  )
}
