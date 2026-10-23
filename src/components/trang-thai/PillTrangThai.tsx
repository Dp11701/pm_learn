// C5 Status pill (F02, F01 mục 3) và C7 cờ "Cần ôn lại · 2 thẻ đến hạn": cao 24, padding 0 10,
// bo 6, chữ 12/18/600, icon 14 + chữ (D2). Bản bấm được (F08: mở menu đổi trạng thái) có chevron,
// hover viền 1px màu trạng thái, disabled "đang lưu", lỗi viền danger.
import type { ComponentProps } from 'react'
import { ChevronDown, RotateCcw } from 'lucide-react'
import {
  TEN_CAN_ON_LAI,
  TEN_TRANG_THAI_HOC,
  type TrangThaiHoc,
} from '../../../shared/domain/trang-thai'
import IconTrangThai from './IconTrangThai'
import {
  LOP_CHU_CHIP,
  LOP_PILL,
  LOP_VIEN_HOVER,
  VUNG_CHAM,
  type TrangThaiHien,
} from './mau-trang-thai'

const NEN =
  'inline-flex h-[var(--h-chip)] shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] whitespace-nowrap'

/** Tên hiển thị: 4 trạng thái học + "Cần ôn lại". */
export function tenTrangThaiHien(trangThai: TrangThaiHien) {
  return trangThai === 'can-on-lai' ? TEN_CAN_ON_LAI : TEN_TRANG_THAI_HOC[trangThai]
}

function IconPill({ trangThai, size }: { trangThai: TrangThaiHien; size: number }) {
  if (trangThai === 'can-on-lai')
    return <RotateCcw size={size} strokeWidth={size <= 12 ? 2.5 : 2} aria-hidden="true" />
  return <IconTrangThai trangThai={trangThai} size={size} />
}

export interface PropsPillTrangThai {
  trangThai: TrangThaiHien
  /** Chữ thêm sau " · ", vd. lý do Bỏ qua, "2 thẻ đến hạn". */
  phu?: string
  className?: string
}

/** Pill chỉ để đọc. */
export default function PillTrangThai({ trangThai, phu, className = '' }: PropsPillTrangThai) {
  return (
    <span
      data-trang-thai={trangThai}
      className={`${NEN} px-2.5 ${LOP_CHU_CHIP} ${LOP_PILL[trangThai]} ${className}`}
    >
      <IconPill trangThai={trangThai} size={14} />
      {tenTrangThaiHien(trangThai)}
      {phu ? ` · ${phu}` : null}
    </span>
  )
}

export type PropsNutPillTrangThai = {
  trangThai: TrangThaiHoc
  /** Đang lưu: nền surface-2, chữ muted, không chevron, không bấm được. */
  dangLuu?: boolean
  /** Lưu lỗi: viền trong 1px màu danger (câu lỗi do nơi dùng hiện, vd. toast). */
  loi?: boolean
  className?: string
} & Omit<ComponentProps<'button'>, 'className' | 'children'>

/** Pill bấm được mở menu đổi trạng thái (F08, F13). Nhận mọi prop của <button> (kể cả ref) để
 *  dùng làm `asChild` của Radix DropdownMenu.Trigger / Popover.Trigger. */
export function NutPillTrangThai({
  trangThai,
  dangLuu = false,
  loi = false,
  className = '',
  disabled,
  type = 'button',
  ...khac
}: PropsNutPillTrangThai) {
  const tat = dangLuu || disabled
  const mau = tat
    ? 'bg-surface-2 text-muted shadow-[inset_0_0_0_1px_var(--border)] cursor-not-allowed'
    : `${LOP_PILL[trangThai]} cursor-pointer ${
        loi ? 'shadow-[inset_0_0_0_1px_var(--danger)]' : LOP_VIEN_HOVER[trangThai]
      }`
  return (
    <button
      aria-haspopup="menu"
      {...khac}
      type={type}
      disabled={tat}
      aria-busy={dangLuu || undefined}
      data-trang-thai={trangThai}
      className={`${NEN} relative justify-between pr-2 pl-2.5 ${LOP_CHU_CHIP} transition-shadow duration-150 ${VUNG_CHAM} ${mau} ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <IconPill trangThai={trangThai} size={12} />
        {TEN_TRANG_THAI_HOC[trangThai]}
        {dangLuu && <span className="sr-only">, đang lưu</span>}
        {loi && !tat && <span className="sr-only">, lỗi lưu</span>}
      </span>
      {!tat && <ChevronDown size={12} strokeWidth={2.5} aria-hidden="true" className="shrink-0" />}
    </button>
  )
}
