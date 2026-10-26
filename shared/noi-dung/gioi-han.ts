// Giới hạn khi đọc file nội dung (đề xuất 1.7 "tối đa 256 KB/file"): server không đọc file bài lớn hơn
// (GET /api/bai/:id trả lỗi đọc file, bất biến 7 vẫn tính Bản nháp); trang Nhập (phase 2b) dùng cùng hằng số.

/** Số byte tối đa của một file bài .md */
export const TOI_DA_BYTE_BAI = 256 * 1024

/** Số KB (làm tròn lên) để ghi trong thông báo */
export function soKb(soByte: number): number {
  return Math.ceil(soByte / 1024)
}
