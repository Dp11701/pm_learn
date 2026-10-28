// Neo #slug của danh sách (đề xuất 3.9, duongDanNut: nhóm không có trang riêng, link tới nhóm là "<trang cha>#<slug
// nhóm>"): tiêu đề phần / lĩnh vực / nhóm có id = slug, nhưng danh sách chỉ dựng sau khi tải xong trạng thái học nên
// lúc ScrollRestoration của router tìm neo thì chưa có. Hook này cuộn tới neo một lần cho mỗi lần vào URL, khi danh
// sách đã dựng (sau một nhịp, để chạy sau ScrollRestoration).
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

export function useCuonToiNeo(sanSang: boolean): void {
  const { hash, key } = useLocation()
  const daCuon = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!sanSang || hash.length < 2) return
    const khoa = `${key}|${hash}`
    if (daCuon.current === khoa) return
    const hen = window.setTimeout(() => {
      daCuon.current = khoa
      let id = hash.slice(1)
      try {
        id = decodeURIComponent(id)
      } catch {
        // neo hỏng: dùng nguyên văn
      }
      document.getElementById(id)?.scrollIntoView?.({ block: 'start' })
    }, 0)
    return () => window.clearTimeout(hen)
  }, [sanSang, hash, key])
}
