// Focus khi chuyển trang (§11, đề xuất 5): sau mỗi lần đổi route phía client (không tính lần tải đầu),
// focus về H1 của trang (TieuDeTrang), không có H1 thì về <main>.
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { ID_TIEU_DE_TRANG } from '../../components/TieuDeTrang'

export const ID_NOI_DUNG_CHINH = 'noi-dung-chinh'

export function focusDauTrang(): void {
  const dich =
    document.getElementById(ID_TIEU_DE_TRANG) ?? document.getElementById(ID_NOI_DUNG_CHINH)
  dich?.focus()
}

/**
 * Chỉ theo pathname: đổi bộ lọc trong query (?xem=, ?trang-thai=) hay neo #… không kéo focus đi.
 * So với pathname trước (không dùng cờ "lần đầu") nên StrictMode chạy effect 2 lần vẫn đúng.
 */
export function useFocusSauDieuHuong(khiDoiTrang?: () => void): void {
  const { pathname } = useLocation()
  const truoc = useRef(pathname)
  const goiLai = useRef(khiDoiTrang)
  useEffect(() => {
    goiLai.current = khiDoiTrang
  })
  useEffect(() => {
    if (truoc.current === pathname) return
    truoc.current = pathname
    goiLai.current?.()
    focusDauTrang()
  }, [pathname])
}
