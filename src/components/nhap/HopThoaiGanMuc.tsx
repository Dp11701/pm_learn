// "Gán cho mục…" (đề xuất 1.7 bước 3, 4.3: C28 trong C32; F22): chọn bất kỳ mục học nào của cây cho một file.
// Ô tìm combobox + listbox aria-activedescendant như C28 (shared/tim-kiem: tên, tên gốc, viết tắt; không phân
// biệt dấu, hoa/thường). Ô trống: hiện các ứng viên server gợi ý (≥ 0,6, tối đa 3) và mục đang gán; không chọn
// sẵn ứng viên nào trừ khi dòng đã có mục (gán sẵn hoặc bạn đã gán). Gõ chữ: kết quả đầu được chọn như C28.
// ↑/↓ di chuyển, Enter gán, chuột bấm để gán; bỏ qua phím khi Telex/VNI đang ghép chữ (đề xuất 5). Gán xong
// dialog đóng, focus về nút "Gán cho mục…" của dòng (C32 trả focus).
import {
  Fragment,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { Search } from 'lucide-react'
import { layCay, type Cay, type MucHoc } from '../../../shared/roadmap'
import {
  foldVi,
  tachDoan,
  taoChiMuc,
  timKiem,
  type ChiMuc,
  type Doan,
} from '../../../shared/tim-kiem'
import type { MucNgan, UngVien } from '../../app/du-lieu/nhap'
import HopThoai from '../HopThoai'
import Nut from '../Nut'
import { dangGhepChu } from '../TruongNhap'
import ChipLoai from '../trang-thai/ChipLoai'
import ThongBaoKetQua, { GOI_Y_KHONG_CO_KET_QUA } from '../tim-kiem/ThongBaoKetQua'
import { GAN_MUC } from '../../copy/cho-duyet'

const boNho = new WeakMap<Cay, ChiMuc>()
function chiMucCua(cay: Cay): ChiMuc {
  let cm = boNho.get(cay)
  if (!cm) {
    cm = taoChiMuc(cay)
    boNho.set(cay, cm)
  }
  return cm
}

export interface PropsHopThoaiGanMuc {
  mo: boolean
  doiMo: (mo: boolean) => void
  /** Tên file đang gán (phụ đề). */
  tenFile: string
  ungVien: readonly UngVien[]
  /** Mục đang gán (gán sẵn hoặc bạn đã gán); null = chưa có. */
  dangGan: MucNgan | null
  onChon: (muc: MucNgan) => void
  /** Có thì hiện nút "Bỏ gán" (khi dòng đang có mục). */
  onBoGan?: () => void
}

interface Dong {
  muc: MucHoc
  doan: readonly Doan[]
}

const nganCua = (m: MucHoc): MucNgan => ({ id: m.id, slug: m.slug, label: m.label })

export default function HopThoaiGanMuc(props: PropsHopThoaiGanMuc) {
  const { mo, doiMo, tenFile, dangGan, onBoGan } = props
  const oNhap = useRef<HTMLInputElement>(null)
  return (
    <HopThoai
      mo={mo}
      doiMo={doiMo}
      tieuDe={GAN_MUC.tieuDe}
      phuDe={<span className="font-mono">{tenFile}</span>}
      rong={560}
      focusDau={oNhap}
      chan={
        <>
          {dangGan && onBoGan && (
            <Nut
              bien="ghost"
              onClick={() => {
                onBoGan()
                doiMo(false)
              }}
              className="mr-auto"
            >
              {GAN_MUC.boGan}
            </Nut>
          )}
          <Nut bien="phu" onClick={() => doiMo(false)}>
            {GAN_MUC.huy}
          </Nut>
        </>
      }
    >
      {mo && <NoiDungGan {...props} oNhap={oNhap} />}
    </HopThoai>
  )
}

function NoiDungGan({
  ungVien,
  dangGan,
  onChon,
  doiMo,
  oNhap,
}: PropsHopThoaiGanMuc & { oNhap: RefObject<HTMLInputElement | null> }) {
  const id = useId()
  const cay = layCay()
  const [truyVan, datTruyVan] = useState('')
  const coTruyVan = foldVi(truyVan).folded !== ''

  // Ô trống: mục đang gán (nếu không nằm trong gợi ý) rồi các ứng viên theo điểm.
  const goiY = useMemo<Dong[]>(() => {
    const ds: Dong[] = []
    const them = (idMuc: string) => {
      const m = cay.mucTheoId.get(idMuc)
      if (m && !ds.some((d) => d.muc.id === m.id)) ds.push({ muc: m, doan: [] })
    }
    if (dangGan) them(dangGan.id)
    for (const u of [...ungVien].sort((a, b) => b.diem - a.diem)) them(u.id)
    return ds
  }, [cay, dangGan, ungVien])

  const ketQua = useMemo<Dong[]>(
    () =>
      coTruyVan
        ? timKiem(chiMucCua(cay), truyVan).mucHoc.map((kq) => ({ muc: kq.nut, doan: kq.doanTen }))
        : goiY,
    [cay, coTruyVan, goiY, truyVan],
  )

  // Không chọn sẵn ứng viên; có mục đang gán thì chọn sẵn mục đó. Gõ chữ: kết quả đầu (C28).
  const chonDau = coTruyVan ? 0 : goiY.findIndex((d) => d.muc.id === dangGan?.id)
  const [chon, datChon] = useState(chonDau)
  const dangChon = ketQua.length > 0 ? Math.min(chon, ketQua.length - 1) : -1
  const idDong = (m: MucHoc) => `${id}m-${m.id}`
  const idDangChon = dangChon >= 0 ? idDong(ketQua[dangChon].muc) : undefined
  const idDs = `${id}ds`
  const idNhom = `${id}nhom`
  const idHuongDan = `${id}hd`

  useEffect(() => {
    if (idDangChon) document.getElementById(idDangChon)?.scrollIntoView?.({ block: 'nearest' })
  }, [idDangChon])

  function chonMuc(m: MucHoc) {
    onChon(nganCua(m))
    doiMo(false)
  }

  function khiPhim(e: KeyboardEvent<HTMLInputElement>) {
    if (dangGhepChu(e) || e.altKey || e.ctrlKey || e.metaKey) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (ketQua.length === 0) return
      const buoc = e.key === 'ArrowDown' ? 1 : -1
      const tu = dangChon < 0 ? (buoc > 0 ? -1 : 0) : dangChon
      datChon((tu + buoc + ketQua.length) % ketQua.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (dangChon >= 0) chonMuc(ketQua[dangChon].muc)
    }
  }

  const tenNhom = coTruyVan ? GAN_MUC.ketQua : GAN_MUC.goiY

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex h-11 items-center gap-2.5 rounded-[var(--radius-sm)] border border-border-input bg-surface px-3 focus-within:[outline:var(--focus-ring)] focus-within:[outline-offset:var(--focus-offset)]">
        <Search size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-muted" />
        <label htmlFor={`${id}o`} className="sr-only">
          {GAN_MUC.timMuc}
        </label>
        <input
          ref={oNhap}
          id={`${id}o`}
          type="text"
          role="combobox"
          aria-expanded={ketQua.length > 0}
          aria-controls={ketQua.length > 0 ? idDs : undefined}
          aria-autocomplete="list"
          aria-activedescendant={idDangChon}
          aria-describedby={idHuongDan}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          placeholder="Tìm mục…"
          value={truyVan}
          onChange={(e) => {
            datTruyVan(e.target.value)
            // Xoá hết chữ: về gợi ý, lại không chọn sẵn (trừ mục đang gán).
            datChon(
              foldVi(e.target.value).folded === ''
                ? goiY.findIndex((d) => d.muc.id === dangGan?.id)
                : 0,
            )
          }}
          onKeyDown={khiPhim}
          className="h-9 min-w-0 flex-1 border-0 bg-transparent p-0 text-text outline-none placeholder:text-muted"
        />
      </div>
      <p id={idHuongDan} className="m-0 text-xs leading-[18px] text-muted">
        {!coTruyVan && goiY.length === 0 ? GAN_MUC.huongDanTrong : GAN_MUC.huongDanPhim}
      </p>

      {ketQua.length > 0 && (
        <div
          role="listbox"
          id={idDs}
          aria-labelledby={idNhom}
          className="-mx-6 max-h-[min(360px,50dvh)] overflow-y-auto"
        >
          <div
            role="presentation"
            id={idNhom}
            className="px-6 pt-1 pb-1.5 text-xs leading-[18px] font-semibold text-muted"
          >
            {tenNhom} · {ketQua.length}
          </div>
          {ketQua.map((d, i) => (
            <DongMuc
              key={d.muc.id}
              id={idDong(d.muc)}
              dong={d}
              chon={i === dangChon}
              dangGan={d.muc.id === dangGan?.id}
              khiBam={() => chonMuc(d.muc)}
            />
          ))}
        </div>
      )}
      {coTruyVan && ketQua.length === 0 && (
        <p className="m-0 py-2 text-center">
          <strong className="font-semibold">{`Không có kết quả cho "${truyVan.trim()}"`}</strong>
          <span className="block text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
            {GOI_Y_KHONG_CO_KET_QUA}.
          </span>
        </p>
      )}
      <ThongBaoKetQua truyVan={coTruyVan ? truyVan : ''} soKetQua={ketQua.length} />
    </div>
  )
}

function TenKhop({ ten, doan }: { ten: string; doan: readonly Doan[] }) {
  return (
    <>
      {tachDoan(ten, doan).map((m, i) =>
        m.khop ? <strong key={i}>{m.chu}</strong> : <Fragment key={i}>{m.chu}</Fragment>,
      )}
    </>
  )
}

function DongMuc({
  id,
  dong,
  chon,
  dangGan,
  khiBam,
}: {
  id: string
  dong: Dong
  chon: boolean
  dangGan: boolean
  khiBam: () => void
}) {
  const { muc } = dong
  const cha = [muc.phan, muc.linhVuc, muc.nhom].filter((n) => n !== undefined)
  return (
    // Focus ở ô tìm (aria-activedescendant); chuột bấm để gán, giữ focus ở ô tìm như C28.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      role="option"
      id={id}
      aria-selected={chon}
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onClick={khiBam}
      className={`flex min-h-[52px] cursor-pointer items-center gap-2.5 px-6 py-1.5 hover:bg-[var(--tim-kiem-chon)] ${
        chon ? 'bg-[var(--tim-kiem-chon)] shadow-[inset_0_0_0_2px_var(--primary)]' : ''
      }`}
    >
      <ChipLoai loai={muc.mau} chiIcon />
      <span className="flex min-w-0 flex-1 flex-col">
        <span lang="en">
          <TenKhop ten={muc.label} doan={dong.doan} />
        </span>
        <span lang="en" className="text-xs leading-[18px] text-muted">
          {cha.map((n) => n.label).join(' › ')}
        </span>
      </span>
      {dangGan && (
        <span className="shrink-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-semibold">
          <span aria-hidden="true">✓ </span>
          {GAN_MUC.dangGan}
        </span>
      )}
    </div>
  )
}
