// Nút Giao diện ở chân sidebar / rail (C34, D5): mỗi lần bấm đổi Sáng → Tối → Theo hệ thống → Sáng;
// mặc định Theo hệ thống. Nhãn ghi giao diện đang dùng; tên truy cập nói thêm giao diện kế tiếp.
import type { ComponentProps } from 'react'
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { TEN_GIAO_DIEN, giaoDienKe, useGiaoDien, type GiaoDien } from '../giao-dien'

const ICON: Record<GiaoDien, LucideIcon> = { sang: Sun, toi: Moon, 'he-thong': Monitor }

export function nhanGiaoDien(g: GiaoDien): string {
  return `Giao diện: ${TEN_GIAO_DIEN[g]}`
}

export function tenTruyCapGiaoDien(g: GiaoDien): string {
  return `${nhanGiaoDien(g)}. Bấm để chuyển sang ${TEN_GIAO_DIEN[giaoDienKe(g)]}`
}

type Props = Omit<ComponentProps<'button'>, 'children' | 'type'> & {
  /** Chỉ icon (rail): nhãn nằm ở tooltip và aria-label. */
  chiIcon?: boolean
}

/** Nhận cả ref (React 19) để làm trigger của tooltip rail. */
export default function NutGiaoDien({ chiIcon = false, className = '', onClick, ...khac }: Props) {
  const [giaoDien, datGiaoDien] = useGiaoDien()
  const Icon = ICON[giaoDien]
  return (
    <button
      {...khac}
      type="button"
      aria-label={tenTruyCapGiaoDien(giaoDien)}
      onClick={(e) => {
        onClick?.(e)
        datGiaoDien(giaoDienKe(giaoDien))
      }}
      className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border-input bg-surface text-text transition-colors duration-150 hover:border-text hover:bg-surface-2 ${className}`}
    >
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
      {!chiIcon && (
        <span className="truncate text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-medium">
          {nhanGiaoDien(giaoDien)}
        </span>
      )}
    </button>
  )
}
