import type { ReactNode } from 'react'

// Tên mục, thuật ngữ tiếng Anh: luôn gắn lang="en" (§11, đề xuất 5). Chữ người dùng nhập thì không.
export default function TenMuc({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span lang="en" className={className}>
      {children}
    </span>
  )
}
