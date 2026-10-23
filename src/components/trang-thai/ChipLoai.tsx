// C4 Chip loại (F02, legend F01 mục 2): cao 24, padding 0 8, viền 1px, bo 6, chữ 12/18/600, icon 14.
// Chỉ để đọc, không có trạng thái tương tác. Chứng chỉ dùng màu Chủ đề + icon award (D33).
// Bản `chiIcon`: ô màu 20px + icon loại cho hàng kết quả C28 (D3).
import { Award, BookOpen, FileText, Folder, Layers, type LucideIcon } from 'lucide-react'
import { TEN_LOAI, type LoaiHienThi } from '../../../shared/domain/trang-thai'
import { LOP_CHU_CHIP } from './mau-trang-thai'

/** Loại có chip (Phần dùng icon riêng theo cấu hình cây, không có chip). */
export type LoaiChip = Exclude<LoaiHienThi, 'phan'>

const LOAI: Record<LoaiChip, { Icon: LucideIcon; mau: string }> = {
  'linh-vuc': {
    Icon: Layers,
    mau: 'border-[var(--type-area-bd)] bg-[var(--type-area-bg)] text-[var(--type-area-fg)]',
  },
  'chu-de': {
    Icon: BookOpen,
    mau: 'border-[var(--type-topic-bd)] bg-[var(--type-topic-bg)] text-[var(--type-topic-fg)]',
  },
  'tai-lieu': {
    Icon: FileText,
    mau: 'border-[var(--type-doc-bd)] bg-[var(--type-doc-bg)] text-[var(--type-doc-fg)]',
  },
  'chung-chi': {
    Icon: Award,
    mau: 'border-[var(--type-topic-bd)] bg-[var(--type-topic-bg)] text-[var(--type-topic-fg)]',
  },
  nhom: {
    Icon: Folder,
    mau: 'border-[var(--type-group-bd)] bg-[var(--type-group-bg)] text-[var(--type-group-fg)]',
  },
}

/** Icon Lucide của loại (dùng lại ở hàng cây, nút bản đồ…). */
export function iconLoai(loai: LoaiChip): LucideIcon {
  return LOAI[loai].Icon
}

export interface PropsChipLoai {
  loai: LoaiChip
  /** Ô màu 20px chỉ có icon (C28); có aria-label là tên loại. */
  chiIcon?: boolean
  className?: string
}

export default function ChipLoai({ loai, chiIcon = false, className = '' }: PropsChipLoai) {
  const { Icon, mau } = LOAI[loai]
  if (chiIcon)
    return (
      <span
        role="img"
        aria-label={TEN_LOAI[loai]}
        data-loai={loai}
        className={`inline-flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border ${mau} ${className}`}
      >
        <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
      </span>
    )
  return (
    <span
      data-loai={loai}
      className={`inline-flex h-[var(--h-chip)] shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border px-2 whitespace-nowrap ${LOP_CHU_CHIP} ${mau} ${className}`}
    >
      <Icon size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      {TEN_LOAI[loai]}
    </span>
  )
}
