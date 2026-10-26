// Focus khi chuyển trang (§11, đề xuất 5): sau mỗi lần đổi route phía client (không tính lần tải đầu),
// focus về H1 của trang (TieuDeTrang), không có H1 thì về <main>.
import { useEffect, useRef } from 'react'
import { NavigationType, useLocation, useNavigationType } from 'react-router'
import { ID_TIEU_DE_TRANG } from '../../components/TieuDeTrang'

export const ID_NOI_DUNG_CHINH = 'noi-dung-chinh'

/** Focus H1 của trang, không có thì <main>. Không cuộn: ScrollRestoration lo vị trí cuộn. */
export function focusDauTrang(): void {
  const dich =
    document.getElementById(ID_TIEU_DE_TRANG) ?? document.getElementById(ID_NOI_DUNG_CHINH)
  dich?.focus({ preventScroll: true })
}

/**
 * Chỉ theo pathname: đổi bộ lọc trong query (?xem=, ?trang-thai=) hay neo #… không kéo focus đi.
 * Lần gắn đầu của khung: tải trang (POP) thì để yên; tới bằng link từ trang ngoài khung (trình soạn →
 * "‹ Về bài", PUSH/REPLACE) thì vẫn là chuyển trang → focus. Ref giữ pathname trước nên StrictMode chạy
 * effect 2 lần vẫn đúng.
 */
export function useFocusSauDieuHuong(khiDoiTrang?: () => void): void {
  const { pathname } = useLocation()
  const kieu = useNavigationType()
  const truoc = useRef<string | null>(null)
  const goiLai = useRef(khiDoiTrang)
  useEffect(() => {
    goiLai.current = khiDoiTrang
  })
  useEffect(() => {
    const lanDau = truoc.current === null
    if (truoc.current === pathname) return
    truoc.current = pathname
    if (lanDau && kieu === NavigationType.Pop) return
    goiLai.current?.()
    focusDauTrang()
  }, [pathname, kieu])
}
