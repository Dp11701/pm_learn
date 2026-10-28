import type { Db } from '../db/index.ts'

// Bản ghi thuộc mục không còn trong cây (bất biến 8, đề xuất 1.3 "thay cây": mục bị bỏ thành mồ côi, dữ liệu và
// file giữ nguyên, không tính tiến độ). P0 chỉ cần SỐ bản ghi cho banner Tổng quan "n bản ghi thuộc mục không còn
// trong cây"; liệt kê từng bản ghi là việc của Cài đặt (P1, đã bỏ).

/**
 * Bảng có cột item_id mà mỗi hàng là một bản ghi của người dùng về một mục: trạng thái học (+ lịch sử), lượt mở, 4
 * bước, ghi chú, flashcard, giờ học, sổ nội dung và bản chụp duyệt. Không tính bản tạm trình soạn (editor_buffers),
 * slug cũ (slug_cu — chỉ là bảng tra), đồng hồ đang chạy (active_timer — thoáng qua).
 */
export const BANG_THEO_MUC = [
  'item_status',
  'status_events',
  'item_visits',
  'restatements',
  'practice',
  'self_check',
  'notes',
  'flashcards',
  'time_entries',
  'content_files',
  'content_approvals',
] as const

/** Tổng số hàng của BANG_THEO_MUC có item_id không phải mục học của cây (`laMuc` false). */
export function demBanGhiNgoaiCay(db: Db, laMuc: (id: string) => boolean): number {
  let tong = 0
  for (const bang of BANG_THEO_MUC) {
    const cacNhom = db
      .prepare(`SELECT item_id AS id, COUNT(*) AS n FROM ${bang} GROUP BY item_id`)
      .all() as { id: string; n: number }[]
    for (const { id, n } of cacNhom) if (!laMuc(id)) tong += n
  }
  return tong
}
