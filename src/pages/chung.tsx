// Phần dùng chung của các trang: lề trang, cỡ H1, tra slug trên cây.
import type { ReactNode } from 'react'
import { layCay, type MucHoc, type Nut } from '../../shared/roadmap'

/** H1 28/40, mobile 24/34, đậm 700 như mọi frame (D17). */
export const LOP_H1 =
  'm-0 text-[length:var(--fs-h1)] leading-[var(--lh-h1)] font-bold outline-none max-md:text-[length:var(--fs-h1-m)] max-md:leading-[var(--lh-h1-m)]'

/**
 * Lề nội dung trong khung app: 32 40 48 như F03, F29–F38; < 1024 lề ngang 24; < 768 lề 16 (D35).
 * Khung app (<main>) không thêm lề — mỗi trang tự đặt vì bản đồ, phiên ôn không có lề.
 */
export function KhungTrang({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-6 px-10 pt-8 pb-12 max-lg:px-6 max-md:gap-4 max-md:px-4 max-md:pt-4 max-md:pb-6 ${className}`}
    >
      {children}
    </div>
  )
}

/** Mục học theo slug; không có thì undefined. */
export function timMucHoc(slug: string | undefined): MucHoc | undefined {
  return slug ? layCay().mucTheoSlug.get(slug) : undefined
}

/** Nút (lĩnh vực, phần…) theo slug và đúng loại; sai loại thì undefined. */
export function timNut(slug: string | undefined, kind: Nut['kind']): Nut | undefined {
  const nut = slug ? layCay().nutTheoSlug.get(slug) : undefined
  return nut?.kind === kind ? nut : undefined
}
