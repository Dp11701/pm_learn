// C7 Badge (F02, quyết định 4, đề xuất 3.3): đặc màu mực = việc cần làm hôm nay (thẻ đến hạn);
// viền = số đếm thông tin (Bản nháp chờ duyệt). 0 thì ẩn; > 99 hiện "99+". Cao 20, tối thiểu 20,
// padding 0 6, bo tròn, chữ 12/600 tabular-nums. Bản nhỏ (rail 72px, đề xuất 4.4) cao 16.
import { dinhDangSo } from '../../../shared/dinh-dang'

export type KieuBadge = 'dac' | 'vien'

export const SO_BADGE_TOI_DA = 99

/** Chữ hiện trên badge; null khi không hiện (≤ 0). */
export function chuBadge(so: number): string | null {
  if (!(so > 0)) return null
  return so > SO_BADGE_TOI_DA ? `${SO_BADGE_TOI_DA}+` : dinhDangSo(Math.floor(so))
}

export interface PropsBadge {
  so: number
  kieu?: KieuBadge
  /** Bản thu nhỏ cho rail. */
  nho?: boolean
  /** Câu đầy đủ cho trình đọc màn hình, vd. "12 thẻ đến hạn"; khi có, số hiện ra bị aria-hidden. */
  nhan?: string
  className?: string
}

const KIEU: Record<KieuBadge, string> = {
  dac: 'bg-primary text-on-primary',
  vien: 'border border-border-input text-text',
}

export default function Badge({ so, kieu = 'dac', nho = false, nhan, className = '' }: PropsBadge) {
  const chu = chuBadge(so)
  if (chu === null) return null
  // Viền 1px ăn vào chiều cao dòng (F02: badge viền line-height 18).
  const vien = kieu === 'vien'
  const co = nho
    ? `h-4 min-w-4 rounded-lg px-1 ${vien ? 'leading-[14px]' : 'leading-4'}`
    : `h-5 min-w-5 rounded-[10px] px-1.5 ${vien ? 'leading-[18px]' : 'leading-5'}`
  return (
    <span
      data-kieu={kieu}
      className={`inline-block shrink-0 text-center text-[length:var(--fs-chip)] font-semibold tabular-nums ${co} ${KIEU[kieu]} ${className}`}
    >
      {nhan ? (
        <>
          <span aria-hidden="true">{chu}</span>
          <span className="sr-only">{nhan}</span>
        </>
      ) : (
        chu
      )}
    </span>
  )
}
