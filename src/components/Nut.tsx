// C35 Nút (F02): chính màu mực / phụ / ghost / nguy hiểm; cao 36, mobile 44 (D17); bản nhỏ 32 như
// nút trong card, toast. Nút không có trạng thái lỗi riêng (lỗi hiện ở toast, trường nhập, banner).
// Đang xử lý = spinner + chữ, giữ nguyên kích thước, aria-busy; không bấm lại được.
import type { ComponentProps, MouseEvent, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import type { LucideIcon } from 'lucide-react'

export type BienNut = 'chinh' | 'phu' | 'ghost' | 'nguy-hiem'
export type CoNut = 'thuong' | 'nho'

export interface TuyChonLopNut {
  bien?: BienNut
  co?: CoNut
  chiIcon?: boolean
}

const NEN =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] whitespace-nowrap no-underline transition-colors duration-150 select-none disabled:cursor-not-allowed'

// Disabled (F02): viền border, nền surface-2, chữ muted; ghost giữ nền trong suốt.
const TAT = 'disabled:border disabled:border-border disabled:bg-surface-2 disabled:text-muted'

const BIEN: Record<BienNut, string> = {
  chinh: `border-0 bg-primary font-semibold text-on-primary not-disabled:hover:bg-primary-hover ${TAT}`,
  phu: `border border-border-input bg-surface font-medium text-text not-disabled:hover:border-text not-disabled:hover:bg-surface-2 ${TAT}`,
  ghost:
    'border-0 bg-transparent font-medium text-text not-disabled:hover:bg-surface-2 disabled:text-muted',
  'nguy-hiem': `border-0 bg-danger font-semibold text-on-danger not-disabled:hover:bg-[var(--danger-hover)] ${TAT}`,
}

const CO: Record<CoNut, string> = {
  thuong:
    'h-[var(--h-control)] px-[14px] text-[length:var(--fs-ui)] leading-[var(--lh-ui)] max-md:h-[var(--h-control-touch)] max-md:px-[18px]',
  nho: 'h-8 px-[10px] text-[length:var(--fs-meta)] leading-[var(--lh-meta)] max-md:h-[var(--h-control-touch)]',
}

const CO_VUONG: Record<CoNut, string> = {
  thuong: 'w-[var(--h-control)] px-0 max-md:w-[var(--h-control-touch)] max-md:px-0',
  nho: 'w-8 px-0 max-md:w-[var(--h-control-touch)]',
}

const CO_ICON: Record<CoNut, number> = { thuong: 16, nho: 14 }

/** Lớp CSS của nút, dùng cho phần tử khác cần trông như nút (link, Radix asChild…). */
export function lopNut({ bien = 'phu', co = 'thuong', chiIcon = false }: TuyChonLopNut = {}) {
  return `${NEN} ${BIEN[bien]} ${CO[co]} ${chiIcon ? CO_VUONG[co] : ''}`
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
    />
  )
}

type PropsChung = Omit<TuyChonLopNut, 'chiIcon'> & {
  icon?: LucideIcon
  className?: string
}

/** Nút chỉ có icon (hoặc 1 ký tự như "?") bắt buộc có aria-label. */
type NoiDung =
  | { chiIcon?: false; children: ReactNode; 'aria-label'?: string }
  | { chiIcon: true; 'aria-label': string; children?: ReactNode }

export type PropsNut = PropsChung &
  NoiDung & {
    /** Đang xử lý: spinner + chữ, aria-busy, chặn bấm lại nhưng vẫn giữ focus. */
    dangXuLy?: boolean
  } & Omit<ComponentProps<'button'>, 'children' | 'aria-label' | 'className'>

function NoiDungNut({
  icon: Icon,
  co = 'thuong',
  dangXuLy,
  chiIcon,
  children,
}: {
  icon?: LucideIcon
  co?: CoNut
  dangXuLy?: boolean
  chiIcon?: boolean
  children?: ReactNode
}) {
  const kichThuoc = CO_ICON[co]
  const bieuTuong = dangXuLy ? (
    <Spinner />
  ) : Icon ? (
    <Icon size={kichThuoc} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
  ) : null
  if (chiIcon) return bieuTuong ?? <span aria-hidden="true">{children}</span>
  return (
    <>
      {bieuTuong}
      {children}
    </>
  )
}

export default function Nut(props: PropsNut) {
  const {
    bien,
    co,
    icon,
    chiIcon,
    dangXuLy = false,
    className = '',
    children,
    type = 'button',
    onClick,
    ...khac
  } = props
  function khiBam(e: MouseEvent<HTMLButtonElement>) {
    if (dangXuLy) {
      e.preventDefault()
      return
    }
    onClick?.(e)
  }
  return (
    <button
      {...khac}
      type={type}
      onClick={khiBam}
      aria-busy={dangXuLy || undefined}
      aria-disabled={dangXuLy || khac['aria-disabled'] || undefined}
      className={`${lopNut({ bien, co, chiIcon })} ${className}`}
    >
      <NoiDungNut icon={icon} co={co} dangXuLy={dangXuLy} chiIcon={chiIcon}>
        {children}
      </NoiDungNut>
    </button>
  )
}

export type PropsNutLink = PropsChung & NoiDung & Omit<LinkProps, 'children' | 'className'>

/** Link điều hướng (react-router) trông như nút. */
export function NutLink(props: PropsNutLink) {
  const { bien, co, icon, chiIcon, className = '', children, ...khac } = props
  return (
    <Link {...khac} className={`${lopNut({ bien, co, chiIcon })} ${className}`}>
      <NoiDungNut icon={icon} co={co} chiIcon={chiIcon}>
        {children}
      </NoiDungNut>
    </Link>
  )
}
