// Icon trạng thái học (§5.1, F01 mục 3 và 9): circle / contrast (vòng tô nửa) / circle-check /
// circle-slash. Vẽ đúng hình của frame (lưới Lucide 24, nét 2; icon ≤ 12px nét 2,5).
// Cần ôn lại: glyph ↺ (rotate-ccw) màu mòng két trong vòng 16px nền surface ở góc phải trên.
import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import {
  TEN_CAN_ON_LAI,
  TEN_TRANG_THAI_HOC,
  type TrangThaiHoc,
} from '../../../shared/domain/trang-thai'
import { LOP_ICON } from './mau-trang-thai'

export interface PropsIconTrangThai {
  trangThai: TrangThaiHoc
  /** Cờ Cần ôn lại (suy ra) — vẽ glyph ↺ theo §5.1. */
  canOnLai?: boolean
  size?: number
  className?: string
  /** Có nhãn chữ đi kèm thì icon aria-hidden; đứng một mình thì cần nhãn. */
  nhan?: string
  /** Tô màu icon theo trạng thái (icon đứng riêng ở hàng, danh sách); mặc định theo màu chữ cha. */
  toMau?: boolean
}

// Phần vẽ thêm trong vòng tròn r=10 (F02 C5/C6, F01).
const HINH: Record<TrangThaiHoc, ReactNode> = {
  'chua-hoc': null,
  'dang-hoc': <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" />,
  'da-xong': <path d="m9 12 2 2 4-4" />,
  'bo-qua': <path d="m4.9 4.9 14.2 14.2" />,
}

/** Nét vẽ theo cỡ như frame: 12px trở xuống nét 2,5, còn lại nét 2. */
export function netIcon(size: number) {
  return size <= 12 ? 2.5 : 2
}

/** Nhãn đọc cho icon đứng một mình, vd. "Đã xong, Cần ôn lại". */
export function nhanTrangThai(trangThai: TrangThaiHoc, canOnLai = false) {
  const ten = TEN_TRANG_THAI_HOC[trangThai]
  return canOnLai ? `${ten}, ${TEN_CAN_ON_LAI}` : ten
}

/** Vòng 16px nền surface + ↺ 11px màu mòng két. Mặc định đặt ở góc phải trên (−8px) của khối cha
 *  `relative` như nút bản đồ C1; truyền className để đổi vị trí. */
export function GlyphCanOnLai({ className = 'absolute -top-2 -right-2' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-4 items-center justify-center rounded-full border border-border bg-surface text-[var(--st-review-solid)] ${className}`}
    >
      <RotateCcw size={11} strokeWidth={2.5} />
    </span>
  )
}

export default function IconTrangThai({
  trangThai,
  canOnLai = false,
  size = 16,
  className = '',
  nhan,
  toMau = false,
}: PropsIconTrangThai) {
  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={netIcon(size)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
      {HINH[trangThai]}
    </svg>
  )
  return (
    <span
      role={nhan ? 'img' : undefined}
      aria-label={nhan}
      aria-hidden={nhan ? undefined : true}
      data-trang-thai={trangThai}
      className={`relative inline-flex shrink-0 ${toMau ? LOP_ICON[trangThai] : ''} ${className}`}
    >
      {svg}
      {canOnLai && <GlyphCanOnLai />}
    </span>
  )
}
