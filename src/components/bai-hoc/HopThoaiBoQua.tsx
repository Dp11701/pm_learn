// Lý do Bỏ qua (§1 "Bỏ qua (có thể kèm lý do)"; đề xuất 3.1 "Lý do Bỏ qua tuỳ chọn, app gợi ý lý do đã dùng", 4.3
// C32 + C36; F02 "Bỏ qua kèm lý do (tuỳ chọn)"). Bỏ qua có hiệu lực ngay (segmented / phím 4, toast Hoàn tác như
// mọi lần đổi trạng thái); lý do ghi sau, không chặn:
// - LyDoBoQua (dưới segmented ở đầu bài, chỉ khi mục đang Bỏ qua): `Lý do: "…"` + "Sửa lý do", hoặc "Chưa ghi lý
//   do bỏ qua." + "Ghi lý do (tuỳ chọn)";
// - HopThoaiBoQua: ô C36 (để trống = bỏ lý do), các lý do đã dùng ở mục khác là nút bấm để điền, Huỷ / Lưu. Chữ
//   đang gõ giữ trong bản tạm (nhap-tam) tới khi Lưu. Lưu = PUT /api/trang-thai với 'bo-qua' + lý do (useDatTrangThai,
//   trùng giá trị đang có thì không gửi). Chỉ đổi lý do (trạng thái vẫn Bỏ qua) thì toast "Đã lưu lý do bỏ qua: …"
//   (trang-thai.tsx), không phải "Đã chuyển … sang Bỏ qua".
// - Dòng lý do mất đi lúc đang giữ focus (vd. focus ở "Sửa lý do" rồi bấm phím 2): focus chuyển sang nơi dùng chỉ
//   (`traFocus`, ở đầu bài là đoạn đang chọn của segmented) thay vì rơi về <body>.
import { useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { LY_DO_TOI_DA, type AnhChupHoc } from '../../../server/du-lieu/hop-dong-trang-thai'
import { TEN_LOAI } from '../../../shared/domain/trang-thai'
import type { MucHoc } from '../../../shared/roadmap'
import { useDatTrangThai, useTrangThai } from '../../app/du-lieu/trang-thai'
import { docNhapTam, luuNhapTam, xoaNhapTam } from '../../app/nhap-tam'
import HopThoai from '../HopThoai'
import Nut from '../Nut'
import TenMuc from '../TenMuc'
import TruongNhap from '../TruongNhap'
import { goiYLyDoTuyChon, LY_DO_BO_QUA, NHAN_LY_DO, NUT_LUU } from '../../copy/cho-duyet'

/** Số lý do đã dùng gợi ý tối đa. */
const SO_GOI_Y = 5

const khoaNhap = (id: string) => `bo-qua-ly-do:${id}`

/** Lý do Bỏ qua đã dùng ở các mục khác (trừ `boQua`): dùng nhiều trước, rồi theo bảng chữ cái. */
export function lyDoDaDung(anhChup: AnhChupHoc | undefined, boQua?: string): string[] {
  if (!anhChup) return []
  const dem = new Map<string, number>()
  for (const muc of Object.values(anhChup.trangThai)) {
    const lyDo = muc.status === 'skip' ? muc.lyDoBoQua?.trim() : undefined
    if (lyDo && lyDo !== boQua) dem.set(lyDo, (dem.get(lyDo) ?? 0) + 1)
  }
  return [...dem.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'vi'))
    .slice(0, SO_GOI_Y)
    .map(([lyDo]) => lyDo)
}

export interface PropsHopThoaiBoQua {
  mo: boolean
  doiMo: (mo: boolean) => void
  muc: MucHoc
  /** Lý do đang có */
  lyDo: string | undefined
  goiY: readonly string[]
  /** Lý do đã bỏ khoảng trắng hai đầu; '' = bỏ lý do */
  khiLuu: (lyDo: string) => void
}

export default function HopThoaiBoQua({ mo, doiMo, muc, lyDo, goiY, khiLuu }: PropsHopThoaiBoQua) {
  const khoa = khoaNhap(muc.id)
  const [chu, datChu] = useState(() => docNhapTam(khoa) ?? lyDo ?? '')
  // Gợi ý cố định trong một lần mở (lưu xong, lý do mới không làm danh sách nhảy lúc dialog đang đóng)
  const [cacGoiY] = useState(goiY)
  const refO = useRef<HTMLInputElement>(null)

  function doiChu(moi: string) {
    datChu(moi)
    luuNhapTam(khoa, moi)
  }

  function luu() {
    xoaNhapTam(khoa)
    khiLuu(chu.trim())
  }

  return (
    <HopThoai
      mo={mo}
      doiMo={doiMo}
      tieuDe={LY_DO_BO_QUA.tieuDe}
      phuDe={
        <>
          <TenMuc>{muc.label}</TenMuc> · {TEN_LOAI[muc.mau]}
        </>
      }
      moTa={LY_DO_BO_QUA.moTa}
      focusDau={refO}
      chan={
        <>
          <Nut bien="ghost" onClick={() => doiMo(false)}>
            Huỷ
          </Nut>
          <Nut bien="chinh" onClick={luu}>
            {NUT_LUU}
          </Nut>
        </>
      }
    >
      <TruongNhap
        ref={refO}
        nhan={NHAN_LY_DO}
        goiY={goiYLyDoTuyChon(LY_DO_TOI_DA)}
        value={chu}
        maxLength={LY_DO_TOI_DA}
        autoComplete="off"
        onChange={(e) => doiChu(e.target.value)}
        khiEnter={luu}
      />
      {cacGoiY.length > 0 && (
        <div role="group" aria-label={LY_DO_BO_QUA.daDung} className="flex flex-col gap-2">
          <span className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-semibold">
            {LY_DO_BO_QUA.daDung}
          </span>
          <div className="flex flex-wrap gap-2">
            {cacGoiY.map((g) => (
              <Nut
                key={g}
                co="nho"
                bien="phu"
                aria-pressed={chu.trim() === g}
                onClick={() => {
                  doiChu(g)
                  refO.current?.focus()
                }}
                className="max-w-full"
              >
                <span className="truncate">{g}</span>
              </Nut>
            ))}
          </div>
        </div>
      )}
    </HopThoai>
  )
}

/** Dòng lý do Bỏ qua dưới segmented ở đầu bài (chỉ vẽ khi mục đang Bỏ qua). */
export function LyDoBoQua({
  muc,
  traFocus,
}: {
  muc: MucHoc
  /** Dòng bị gỡ (mục thôi Bỏ qua) lúc đang giữ focus: đưa focus tới đây (chạy sau khi trang vẽ xong) */
  traFocus?: () => void
}) {
  const { anhChup, lyDoBoQuaCua } = useTrangThai()
  const { dat } = useDatTrangThai()
  const [mo, datMo] = useState(false)
  const [lanMo, datLanMo] = useState(0)
  const lyDo = lyDoBoQuaCua(muc.id)
  const goiY = useMemo(() => lyDoDaDung(anhChup, lyDo), [anhChup, lyDo])
  const refDong = useRef<HTMLParagraphElement>(null)
  const refTraFocus = useRef(traFocus)
  useLayoutEffect(() => {
    refTraFocus.current = traFocus
  })
  // Cleanup của layout effect chạy khi phần tử còn trong DOM: biết được focus có đang ở dòng này không.
  useLayoutEffect(() => {
    const dong = refDong.current
    return () => {
      if (!dong?.contains(document.activeElement)) return
      const tra = refTraFocus.current
      // Đợi trang vẽ xong (segmented đã đổi đoạn đang chọn) rồi mới đưa focus
      if (tra) queueMicrotask(tra)
    }
  }, [])

  function moHopThoai(e: MouseEvent<HTMLButtonElement>) {
    // Safari không focus nút khi bấm chuột: focus trước để dialog trả focus về đúng nút
    e.currentTarget.focus()
    datLanMo((n) => n + 1)
    datMo(true)
  }

  return (
    <>
      <p
        ref={refDong}
        data-ly-do-bo-qua=""
        className="m-0 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-[length:var(--fs-meta)] leading-[var(--lh-meta)]"
      >
        {lyDo ? (
          <span className="min-w-0 [overflow-wrap:anywhere]">{`Lý do: "${lyDo}"`}</span>
        ) : (
          <span className="text-muted">{LY_DO_BO_QUA.chuaCo}</span>
        )}
        <button
          type="button"
          onClick={moHopThoai}
          className="cursor-pointer rounded-[var(--radius-sm)] text-text underline hover:decoration-2"
        >
          {lyDo ? LY_DO_BO_QUA.sua : LY_DO_BO_QUA.ghi}
        </button>
      </p>
      <HopThoaiBoQua
        key={lanMo}
        mo={mo}
        doiMo={datMo}
        muc={muc}
        lyDo={lyDo}
        goiY={goiY}
        khiLuu={(moi) => {
          dat(muc.id, 'bo-qua', moi)
          datMo(false)
        }}
      />
    </>
  )
}
