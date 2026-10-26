// Link "Chuyển tới nội dung chính" (§11, F11): phần tử focus được đầu tiên, ẩn tới khi được focus. Dùng ở
// khung app và trang tập trung ngoài khung (trình soạn).
import type { MouseEvent } from 'react'
import { ID_NOI_DUNG_CHINH } from './focus'

export default function LinkBoQua() {
  function khiBam(e: MouseEvent<HTMLAnchorElement>) {
    // Tự focus <main> thay vì đổi #hash: không tạo lượt điều hướng của router, không thêm mục lịch sử.
    e.preventDefault()
    document.getElementById(ID_NOI_DUNG_CHINH)?.focus()
  }
  return (
    <a
      href={`#${ID_NOI_DUNG_CHINH}`}
      onClick={khiBam}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:flex focus:h-11 focus:items-center focus:rounded-[var(--radius-sm)] focus:border focus:border-border-input focus:bg-surface focus:px-4 focus:font-medium focus:text-text focus:underline focus:shadow-[var(--shadow-2)]"
    >
      Chuyển tới nội dung chính
    </a>
  )
}
