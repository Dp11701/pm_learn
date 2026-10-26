// Nút Giao diện ở chân sidebar / rail (C34, D5): mỗi lần bấm đổi Sáng → Tối → Theo hệ thống → Sáng;
// mặc định Theo hệ thống. Nhãn ghi giao diện đang dùng; tên truy cập nói thêm giao diện kế tiếp.
// Luôn có icon như C34. Sidebar 264: nút rộng 187, chữ còn ~149px sau icon; "Giao diện: Theo hệ thống"
// đo được 160px (13px/500) nên xuống dòng sau dấu hai chấm — 2 dòng 16px vẫn nằm trong nút cao 36.
import type { ComponentProps } from 'react'
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { TEN_GIAO_DIEN, giaoDienKe, useGiaoDien, type GiaoDien } from '../giao-dien'
import { tenNutGiaoDien } from '../../copy/cho-duyet'

const ICON: Record<GiaoDien, LucideIcon> = { sang: Sun, toi: Moon, 'he-thong': Monitor }

const DAU_NHAN = 'Giao diện:'

export function nhanGiaoDien(g: GiaoDien): string {
  return `${DAU_NHAN} ${TEN_GIAO_DIEN[g]}`
}

export function tenTruyCapGiaoDien(g: GiaoDien): string {
  return tenNutGiaoDien(nhanGiaoDien(g), TEN_GIAO_DIEN[giaoDienKe(g)])
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
        // Chỉ ngắt ở khoảng trắng sau "Giao diện:"; tên giao diện không bị tách.
        <span className="min-w-0 text-left text-[length:var(--fs-meta)] leading-4 font-medium">
          {DAU_NHAN} <span className="whitespace-nowrap">{TEN_GIAO_DIEN[giaoDien]}</span>
        </span>
      )}
    </button>
  )
}
