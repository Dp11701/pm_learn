// C6 Segmented trạng thái (F02, F11, F17; quyết định 2 / D16; đề xuất 1.2): khung viền border-input,
// padding 3, gap 2, bo 6 cả khung lẫn đoạn, cao 36 (đoạn 28); mobile đoạn cao 44 (vùng chạm).
// Đoạn: icon 16 + chữ 15/24 (+ gợi ý phím 1–4 nếu bật). Đang chọn: nền pill + viền trong 1,5px màu
// trạng thái, chữ 600. Hover: nền surface-2. Disabled (đang tải): khung surface-2, chữ muted.
// Lỗi lưu: khung viền danger + "Lỗi lưu — đã giữ trạng thái cũ. Thử lại".
// Bàn phím: roving tabindex; mũi tên / Home / End chỉ dời focus, Space / Enter mới chọn (đổi trạng
// thái có hiệu lực ngay, không để mũi tên lướt qua "Đã xong" làm bật hộp xác nhận F19).
import { useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { CircleAlert } from 'lucide-react'
import {
  CAC_TRANG_THAI_HOC,
  TEN_TRANG_THAI_HOC,
  type TrangThaiHoc,
} from '../../../shared/domain/trang-thai'
import { dangGhepChu } from '../TruongNhap'
import IconTrangThai from './IconTrangThai'
import { LOP_CHU_META, LOP_PILL, LOP_VIEN_CHON } from './mau-trang-thai'

export interface PropsSegmentedTrangThai {
  giaTri: TrangThaiHoc | null
  khiDoi: (trangThai: TrangThaiHoc) => void
  /** Hiện gợi ý phím 1–4 (trang bài, panel bản đồ — D32); thêm aria-keyshortcuts. */
  goiYPhim?: boolean
  /** Đang tải dữ liệu: không bấm được. */
  voHieu?: boolean
  /** Lưu lỗi (đã giữ trạng thái cũ). */
  loi?: boolean
  thuLai?: () => void
  /** Nhãn nhóm cho trình đọc màn hình. */
  nhan?: string
  className?: string
}

/** Đoạn kế tiếp khi bấm mũi tên / Home / End (vòng lại ở hai đầu); null nếu phím khác. */
export function viTriKeTiep(key: string, hienTai: number, soDoan: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (hienTai + 1) % soDoan
    case 'ArrowLeft':
    case 'ArrowUp':
      return (hienTai - 1 + soDoan) % soDoan
    case 'Home':
      return 0
    case 'End':
      return soDoan - 1
    default:
      return null
  }
}

export default function SegmentedTrangThai({
  giaTri,
  khiDoi,
  goiYPhim = false,
  voHieu = false,
  loi = false,
  thuLai,
  nhan = 'Trạng thái học',
  className = '',
}: PropsSegmentedTrangThai) {
  const idLoi = useId()
  const nut = useRef<(HTMLButtonElement | null)[]>([])
  // Đoạn đang giữ tab stop khi focus ở trong nhóm; ra khỏi nhóm thì về đoạn đang chọn.
  const [dangFocus, setDangFocus] = useState<number | null>(null)
  const viTriChon = giaTri ? CAC_TRANG_THAI_HOC.indexOf(giaTri) : -1
  const tabStop = dangFocus ?? (viTriChon >= 0 ? viTriChon : 0)

  function khiPhim(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    if (dangGhepChu(e) || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
    const toi = viTriKeTiep(e.key, i, CAC_TRANG_THAI_HOC.length)
    if (toi === null) return
    e.preventDefault()
    nut.current[toi]?.focus()
  }

  function khiRoi(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDangFocus(null)
  }

  const khung = voHieu
    ? 'border-border bg-surface-2 text-muted'
    : `bg-surface text-text ${loi ? 'border-danger' : 'border-border-input'}`

  return (
    <div className={`inline-flex max-w-full flex-col items-start gap-1.5 ${className}`}>
      <div
        role="radiogroup"
        aria-label={nhan}
        aria-disabled={voHieu || undefined}
        aria-describedby={loi ? idLoi : undefined}
        onBlur={khiRoi}
        className={`inline-flex max-w-full flex-wrap gap-0.5 rounded-[var(--radius-sm)] border p-[3px] ${khung}`}
      >
        {CAC_TRANG_THAI_HOC.map((tt, i) => {
          const chon = tt === giaTri
          const mau = chon
            ? voHieu
              ? 'bg-surface font-semibold'
              : `${LOP_PILL[tt]} font-semibold ${loi ? '' : LOP_VIEN_CHON[tt]}`
            : `bg-transparent font-medium ${voHieu ? '' : 'hover:bg-surface-2'}`
          return (
            <button
              key={tt}
              ref={(el) => {
                nut.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={chon}
              aria-keyshortcuts={goiYPhim ? String(i + 1) : undefined}
              disabled={voHieu}
              tabIndex={i === tabStop ? 0 : -1}
              data-trang-thai={tt}
              onFocus={() => setDangFocus(i)}
              onKeyDown={(e) => khiPhim(e, i)}
              onClick={() => {
                if (!chon) khiDoi(tt)
              }}
              className={`inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] whitespace-nowrap transition-colors duration-150 not-disabled:cursor-pointer disabled:cursor-not-allowed max-md:h-[var(--h-control-touch)] ${mau}`}
            >
              <IconTrangThai trangThai={tt} size={16} />
              {TEN_TRANG_THAI_HOC[tt]}
              {goiYPhim && (
                <kbd
                  aria-hidden="true"
                  className={`font-mono text-[length:var(--fs-chip)] max-md:hidden ${chon ? '' : 'text-muted'}`}
                >
                  {i + 1}
                </kbd>
              )}
            </button>
          )
        })}
      </div>
      {loi && (
        <p
          id={idLoi}
          className={`m-0 flex flex-wrap items-center gap-1.5 text-danger ${LOP_CHU_META}`}
        >
          <CircleAlert size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
          Lỗi lưu — đã giữ trạng thái cũ.
          {thuLai && (
            <button
              type="button"
              onClick={thuLai}
              className="cursor-pointer rounded-[var(--radius-sm)] text-danger underline hover:decoration-2 max-md:inline-flex max-md:min-h-[var(--h-control-touch)] max-md:items-center"
            >
              Thử lại
            </button>
          )}
        </p>
      )}
    </div>
  )
}
