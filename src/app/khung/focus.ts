// Focus khi chuyển trang (§11, đề xuất 5): sau mỗi lần đổi trang phía client, focus về H1 của trang
// (TieuDeTrang), không có H1 thì về <main>. Lần tải đầu của tài liệu thì để trình duyệt tự lo.
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { ID_TIEU_DE_TRANG } from '../../components/TieuDeTrang'

export const ID_NOI_DUNG_CHINH = 'noi-dung-chinh'

/**
 * Đang trong lần tải đầu của tài liệu: từ lúc nạp module tới khi gốc app gắn xong lần đầu. Cờ cấp module,
 * không theo từng lần gắn: Lùi / Tiến giữa trình soạn (ngoài khung) và trang trong khung gắn mới component
 * (kiểu điều hướng POP, location.key có thể là 'default') nhưng không phải lần tải đầu → vẫn focus H1.
 */
let dangTaiDau = true

/**
 * Gốc app (GocApp) gọi một lần. Effect của cha chạy sau effect của mọi con trong cùng lần gắn, nên khi nó
 * chạy thì các trang của lần tải đầu đã bỏ qua focus xong.
 */
export function useKetThucTaiDau(): void {
  useEffect(() => {
    dangTaiDau = false
  }, [])
}

/** Chỉ cho test: coi như vừa tải lại tài liệu. */
export function datLaiTaiDau(): void {
  dangTaiDau = true
}

/** Focus H1 của trang, không có thì <main>. Không cuộn: ScrollRestoration lo vị trí cuộn. */
export function focusDauTrang(): void {
  const dich =
    document.getElementById(ID_TIEU_DE_TRANG) ?? document.getElementById(ID_NOI_DUNG_CHINH)
  dich?.focus({ preventScroll: true })
}

/**
 * Dùng ở khung app và trang tập trung ngoài khung (trình soạn). Chỉ theo pathname: đổi bộ lọc trong query
 * (?xem=, ?trang-thai=) hay neo #… không kéo focus đi. Ref giữ pathname trước nên StrictMode chạy effect
 * 2 lần vẫn chỉ tính một lần đổi trang.
 */
export function useFocusSauDieuHuong(khiDoiTrang?: () => void): void {
  const { pathname } = useLocation()
  const truoc = useRef<string | null>(null)
  const goiLai = useRef(khiDoiTrang)
  useEffect(() => {
    goiLai.current = khiDoiTrang
  })
  useEffect(() => {
    if (truoc.current === pathname) return
    truoc.current = pathname
    if (dangTaiDau) return
    goiLai.current?.()
    focusDauTrang()
  }, [pathname])
}
