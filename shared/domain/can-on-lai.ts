// Cờ "Cần ôn lại" (§1, đề xuất 3.3, bất biến 3): SUY RA, không bao giờ lưu. Bật khi mục Đã xong có ≥ 1 thẻ đến
// hạn (hạn ôn ≤ hôm nay), tắt khi các thẻ đó đã ôn. GET /api/state trả sẵn danh sách id (`canOnLai`, server
// tính); các hàm dưới cho web tính lại tại chỗ khi đã có thẻ của mục (trang bài: vừa xoá / khôi phục thẻ).
// "Hôm nay" luôn lấy từ homNay() của shared/clock (server là nguồn) — không tự dựng ngày.
// P1 (Cài đặt) thêm điều kiện "lần chấm mới nhất của câu tự kiểm tra là Sai" — chưa có ở đây.
import type { TrangThaiHoc } from './trang-thai'

/** Thẻ đến hạn: hạn ôn (YYYY-MM-DD) ≤ hôm nay. */
export function denHan(the: { hanOn: string }, homNay: string): boolean {
  return the.hanOn <= homNay
}

/** Số thẻ đến hạn trong danh sách. */
export function soTheDenHan(cacThe: readonly { hanOn: string }[], homNay: string): number {
  return cacThe.filter((t) => denHan(t, homNay)).length
}

/** Cần ôn lại: Đã xong + ≥ 1 thẻ đến hạn. */
export function canOnLai(
  trangThai: TrangThaiHoc,
  cacThe: readonly { hanOn: string }[],
  homNay: string,
): boolean {
  return trangThai === 'da-xong' && cacThe.some((t) => denHan(t, homNay))
}

/** Cờ của một mục theo danh sách `canOnLai` của GET /api/state (thiếu danh sách = không bật). */
export function canOnLaiTrong(
  anhChup: { canOnLai?: readonly string[] } | null | undefined,
  id: string,
): boolean {
  return anhChup?.canOnLai?.includes(id) ?? false
}
