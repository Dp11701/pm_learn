// C26 Banner (F02, F26, §5.1): nền surface-2, viền 1px, icon 20px + tiêu đề đậm, không vạch trái.
// - thong-tin: viền border-input, icon info màu chữ;
// - loi (D30): viền và icon alert-circle màu danger, tiêu đề danger;
// - voHieu (F02 "Disabled"): viền border, chữ muted.
// `dinh`: dính đầu vùng cuộn (banner mất kết nối, F26).
import type { ReactNode } from 'react'
import { CircleAlert, Info, X, type LucideIcon } from 'lucide-react'
import Nut from './Nut'
import { DONG_THONG_BAO } from '../copy/cho-duyet'

export type LoaiBanner = 'thong-tin' | 'loi'

export interface PropsBanner {
  loai?: LoaiBanner
  tieuDe: ReactNode
  /** Dòng phụ 13/20 muted. */
  moTa?: ReactNode
  /** moTa đổi theo thời gian (vd. "Tự thử lại sau 5 giây…") và cần được đọc lại. Banner có vai trò
   *  status / alert đã là vùng live nên moTa không gắn thêm aria-live (lồng vùng live → đọc hai lần);
   *  chỉ khi vaiTro="none" thì moTa mới là vùng aria-live polite. */
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
  nhanDong = DONG_THONG_BAO,
  icon,
  dinh,
  voHieu,
  vaiTro,
  className = '',
}: PropsBanner) {
  const loi = loai === 'loi' && !voHieu
  const Icon = icon ?? (loai === 'loi' ? CircleAlert : Info)
  const role = vaiTro ?? (voHieu ? 'none' : loi ? 'alert' : 'status')
  // Live chỉ ở một tầng: cả banner (status / alert) hoặc riêng moTa.
  const moTaLaVungLive = moTaLive && role === 'none'
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
            aria-live={moTaLaVungLive ? 'polite' : undefined}
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
