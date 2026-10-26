import { createHash } from 'node:crypto'

// Hash của file nội dung (đề xuất 1.6, 2.1 content_approvals.hash): sha256 dạng hex chữ thường trên
// TOÀN BỘ byte của file (cả frontmatter, BOM, CRLF nếu có). Chuỗi được băm theo UTF-8 — cùng kết quả
// với byte của file đã ghi bằng UTF-8. Bộ mẫu (seed) và các đường ghi bản chụp phải dùng hàm này.

export function bamNoiDung(noiDung: string | Uint8Array): string {
  return createHash('sha256').update(noiDung).digest('hex')
}
