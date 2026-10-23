// C26 Banner (F02, F26, §5.1): nền surface-2, viền 1px, icon 20px + tiêu đề đậm, không vạch trái.
// - thong-tin: viền border-input, icon info màu chữ;
// - loi (D30): viền và icon alert-circle màu danger, tiêu đề danger;
// - voHieu (F02 "Disabled"): viền border, chữ muted.
// `dinh`: dính đầu vùng cuộn (banner mất kết nối, F26).
import type { ReactNode } from 'react'
import { CircleAlert, Info, X, type LucideIcon } from 'lucide-react'
import Nut from './Nut'

export type LoaiBanner = 'thong-tin' | 'loi'

export interface PropsBanner {
  loai?: LoaiBanner
  tieuDe: ReactNode
  /** Dòng phụ 13/20 muted. */
  moTa?: ReactNode
  /** moTa là vùng aria-live polite (vd. "Tự thử lại sau 5 giây…" đổi theo thời gian). */
  moTaLive?: boolean
  /** Nút hành động (C35, thường là `bien="phu"`). */
  hanhDong?: ReactNode
  /** Có thì hiện nút đóng (X). */
  khiDong?: () => void
  nhanDong?: string
  /** Thay icon mặc định (info / alert-circle), vd. wifi-off cho mất kết nối. */
  icon?: LucideIcon
  dinh?: boolean
  voHieu?: boolean
  /** Mặc định: thong-tin → status, loi → alert. 'none' = không gắn role. */
  vaiTro?: 'status' | 'alert' | 'none'
  className?: string
}

export default function Banner({
  loai = 'thong-tin',
  tieuDe,
  moTa,
  moTaLive,
  hanhDong,
  khiDong,
  nhanDong = 'Đóng thông báo',
  icon,
  dinh,
  voHieu,
  vaiTro,
  className = '',
}: PropsBanner) {
  const loi = loai === 'loi' && !voHieu
  const Icon = icon ?? (loai === 'loi' ? CircleAlert : Info)
  const role = vaiTro ?? (voHieu ? 'none' : loi ? 'alert' : 'status')
  const mau = voHieu
    ? 'border-border text-muted'
    : loi
      ? 'border-danger text-text'
      : 'border-border-input text-text'
  return (
    <div
      role={role === 'none' ? undefined : role}
      className={`flex flex-wrap items-start gap-3 rounded-[var(--radius-md)] border bg-surface-2 ${mau} ${
        dinh ? 'sticky top-0 z-30 px-4 py-3.5' : 'p-4'
      } ${className}`}
    >
      <Icon
        size={20}
        strokeWidth={1.75}
        aria-hidden="true"
        className={`mt-0.5 shrink-0 ${loi ? 'text-danger' : ''}`}
      />
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
        <strong className={`font-semibold ${loi ? 'text-danger' : ''}`}>{tieuDe}</strong>
        {moTa != null && (
          <span
            aria-live={moTaLive ? 'polite' : undefined}
            className={`text-[length:var(--fs-meta)] leading-[var(--lh-meta)] ${voHieu ? '' : 'text-muted'}`}
          >
            {moTa}
          </span>
        )}
      </div>
      {(hanhDong || khiDong) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {hanhDong}
          {khiDong && <Nut bien="ghost" chiIcon icon={X} aria-label={nhanDong} onClick={khiDong} />}
        </div>
      )}
    </div>
  )
}
