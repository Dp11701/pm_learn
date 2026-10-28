// Mở trang bài bằng neo #flashcard (vd. "Tạo thẻ" của Ôn tập: /hoc/<slug>#flashcard): card Flashcard ở cột phải có
// vùng cuộn riêng (hoặc ở cuối bài khi < 1280), nên ScrollRestoration của router không đưa nó vào tầm nhìn, và khung
// app đưa focus về H1. Hook này làm như bước "Ghi nhớ" của thanh 4 bước (DauBai): khi trang đã dựng xong (bài và dữ
// liệu học đã tải — khối phía trên card không còn đổi cao), cuộn tới card ('nearest' trong cột phải, 'start' ở cuối
// bài) và focus card. Một lần cho mỗi lần vào URL; chạy sau một nhịp để đứng sau focus H1 của khung app.
// Tải cả trang (gõ URL, mở tab mới): router khôi phục vị trí cuộn lần đầu (ScrollRestoration → window.scrollTo tới vị
// trí đã lưu của khoá 'default', thường là 0) bằng một lần cập nhật trong transition — lần này có thể commit SAU khi
// bài đã tải và hook đã cuộn, kéo trang về đầu (card nằm dưới mép màn hình). Nên hook theo dõi restoreScrollPosition
// của router (context trạng thái data router; ngoài data router — test, gallery — là undefined) và cuộn lại tới card
// sau khi router khôi phục xong.
import { useContext, useEffect, useRef } from 'react'
import { UNSAFE_DataRouterStateContext, useLocation } from 'react-router'
import { ID_FLASHCARD } from '../../components/the/TheFlashcard'

export function useMoToiFlashcard(sanSang: boolean): void {
  const { hash, key } = useLocation()
  // number: ScrollRestoration vừa cuộn cửa sổ tới vị trí đó (layout effect, chạy trước effect ở đây)
  const khoiPhuc = useContext(UNSAFE_DataRouterStateContext)?.restoreScrollPosition
  const daMo = useRef<string | undefined>(undefined)
  useEffect(() => {
    const khoa = `${key}|${typeof khoiPhuc === 'number' ? khoiPhuc : ''}`
    if (!sanSang || hash !== `#${ID_FLASHCARD}` || daMo.current === khoa) return
    const hen = window.setTimeout(() => {
      daMo.current = khoa
      const the = document.getElementById(ID_FLASHCARD)
      if (!the) return
      the.scrollIntoView?.({ block: the.closest('aside') ? 'nearest' : 'start' })
      the.focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(hen)
  }, [sanSang, hash, key, khoiPhuc])
}
