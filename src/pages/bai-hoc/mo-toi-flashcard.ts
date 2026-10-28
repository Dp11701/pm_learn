// Mở trang bài bằng neo #flashcard (vd. "Tạo thẻ" của Ôn tập: /hoc/<slug>#flashcard): card Flashcard ở cột phải có
// vùng cuộn riêng (hoặc ở cuối bài khi < 1280), nên ScrollRestoration của router không đưa nó vào tầm nhìn, và khung
// app đưa focus về H1. Hook này làm như bước "Ghi nhớ" của thanh 4 bước (DauBai): khi trang đã dựng xong (bài và dữ
// liệu học đã tải — khối phía trên card không còn đổi cao), cuộn tới card ('nearest' trong cột phải, 'start' ở cuối
// bài) và focus card. Một lần cho mỗi lần vào URL; chạy sau một nhịp để đứng sau focus H1 của khung app.
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { ID_FLASHCARD } from '../../components/the/TheFlashcard'

export function useMoToiFlashcard(sanSang: boolean): void {
  const { hash, key } = useLocation()
  const daMo = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!sanSang || hash !== `#${ID_FLASHCARD}` || daMo.current === key) return
    const hen = window.setTimeout(() => {
      daMo.current = key
      const the = document.getElementById(ID_FLASHCARD)
      if (!the) return
      the.scrollIntoView?.({ block: the.closest('aside') ? 'nearest' : 'start' })
      the.focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(hen)
  }, [sanSang, hash, key])
}
