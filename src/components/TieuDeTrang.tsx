import { useEffect, type ReactNode } from 'react'
import { TEN_APP } from '../app/ten-app'

export const ID_TIEU_DE_TRANG = 'tieu-de-trang'

/**
 * H1 của trang: đặt document.title = "{trang} · {TEN_APP}" (tên app người dùng chốt, như logo); khung app đưa
 * focus về đây sau khi chuyển trang (§11). `tenTrang` là chữ thuần cho title khi children có định dạng.
 */
export default function TieuDeTrang({
  children,
  tenTrang,
  className,
}: {
  children: ReactNode
  tenTrang: string
  className?: string
}) {
  useEffect(() => {
    document.title = `${tenTrang} · ${TEN_APP}`
  }, [tenTrang])
  return (
    <h1
      id={ID_TIEU_DE_TRANG}
      tabIndex={-1}
      className={
        className ??
        'text-[length:var(--fs-h1)] leading-[var(--lh-h1)] font-semibold outline-none max-md:text-[length:var(--fs-h1-m)] max-md:leading-[var(--lh-h1-m)]'
      }
    >
      {children}
    </h1>
  )
}
