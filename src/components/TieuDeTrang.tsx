import { useEffect, type ReactNode } from 'react'

export const ID_TIEU_DE_TRANG = 'tieu-de-trang'
const TEN_APP = 'Học PM A–Z'

/**
 * H1 của trang: đặt document.title = "{trang} · Học PM A–Z"; khung app đưa focus về đây sau khi
 * chuyển trang (§11). `tenTrang` là chữ thuần cho title khi children có định dạng.
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
