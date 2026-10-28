// Câu báo lỗi của API đặt trạng thái hàng loạt (bước 2 — Danh sách, trang Lĩnh vực; đề xuất 3.9, bất biến 2).
// Đều là câu mới (đề xuất không có câu chữ cho lỗi API), gửi duyệt ở báo cáo bước 2. API trả qua { loi }.
import { CAC_TRANG_THAI_HANG_LOAT } from './hop-dong-trang-thai.ts'

export const TB_HANG_LOAT = {
  ids: (toiDa: number) =>
    `ids phải là danh sách id mục học (chuỗi), từ 1 tới ${toiDa} mục, không trùng.`,
  idTrung: (id: string) => `ids có id "${id}" lặp lại; mỗi mục chỉ gửi một lần.`,
  khongDaXong:
    'Không đặt Đã xong hàng loạt: hãy đánh dấu Đã xong từng mục ở trang bài (bất biến 2).',
  trangThai: `trangThai không hợp lệ: cần một trong ${CAC_TRANG_THAI_HANG_LOAT.join(', ')}.`,
  truoc: (toiDa: number) =>
    `truoc phải là object { "<id mục>": { "trangThai": …, "lyDo"?: … } } có từ 1 tới ${toiDa} mục.`,
  giaTriTruoc: (id: string) =>
    `truoc["${id}"] không hợp lệ: cần { "trangThai": chua-hoc | dang-hoc | da-xong | bo-qua, "lyDo"?: chuỗi (chỉ với bo-qua) }.`,
} as const
