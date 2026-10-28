// Câu chữ bước 3 (Ôn tập, phiên ôn) tự đặt, chưa có nguyên văn trong đặc tả (docs/prompt-design.md §8.9, §9 F31),
// frame F23 / F31 hay đề xuất (3.3, 3.5). Gom ở đây để bạn duyệt và sửa một chỗ. Chữ lấy nguyên văn từ ba nguồn
// đó (vd. "Bắt đầu phiên", "Hộp 1", "ôn sau 1 ngày", "Tỉ lệ nhớ 30 ngày", "Chưa có tỉ lệ nhớ", "Lật", "Quên",
// "Nhớ", "Thoát phiên", "Ôn lại 3 thẻ đã quên", "Hôm nay không còn thẻ nào cần ôn", "Tạo thẻ") vẫn nằm tại chỗ.
import { dinhDangNgay, dinhDangSo } from '../../shared/dinh-dang'

// ---------- Trang Ôn tập /on-tap ----------

/** Dòng phụ dưới "n thẻ đến hạn hôm nay" khi không còn thẻ đến hạn nhưng có thẻ hạn sau. */
export function lanOnKeTiep(han: string): string {
  return `Lần ôn kế tiếp ${dinhDangNgay(han)}`
}

/** Dòng phụ trạng thái trống "Chưa có flashcard nào" (F31): nơi tạo thẻ. */
export const MO_TA_CHUA_CO_THE = 'Tạo thẻ ở card Flashcard trong trang bài đang học.'

/** Dòng dưới tỉ lệ nhớ: số lần Nhớ / tổng lần ôn (đủ số, cho người đọc kiểm). */
export function chuLanOn30(nho: number, tong: number): string {
  return `${dinhDangSo(nho)}/${dinhDangSo(tong)} lần ôn`
}

/** Lỗi tải trang Ôn tập / phiên ôn (C38 lỗi, có "Thử lại"). */
export const LOI_TAI_ON_TAP = 'Không tải được danh sách thẻ.'

// ---------- Phiên ôn /on-tap/phien ----------

/** Tiến độ phiên "Thẻ 3/12" (frame F23 chỉ có "3/12"). */
export function tienDoPhien(thu: number, tong: number): string {
  return `Thẻ ${dinhDangSo(thu)}/${dinhDangSo(tong)}`
}

/** Tên vùng mặt sau (đáp án) cho trình đọc màn hình, nhận focus sau khi lật. */
export const MAT_SAU = 'Đáp án'

/** Tên vùng mặt trước (câu hỏi) cho trình đọc màn hình, nhận focus khi sang thẻ mới. */
export const MAT_TRUOC = 'Câu hỏi'

/** Dòng "Mục:" trước tên mục (link) trên mặt thẻ. */
export const NHAN_MUC_CUA_THE = 'Mục:'

/** Banner trong vòng "Ôn lại n thẻ đã quên" (đề xuất 3.5: không đổi hộp, không tính tỉ lệ nhớ). */
export const VONG_LUYEN_THEM = 'Vòng luyện thêm: không đổi hộp, không tính vào tỉ lệ nhớ.'

/** Tiêu đề cuối vòng luyện thêm (cuối phiên thật là "Xong phiên hôm nay" của F23). */
export const XONG_VONG_LUYEN = 'Xong vòng luyện thêm'

/** Dòng cuối vòng luyện thêm (không có "Lần ôn kế tiếp": vòng này không đổi hạn). */
export function ketQuaVongLuyen(nho: number, quen: number): string {
  return `Nhớ ${dinhDangSo(nho)} · Quên ${dinhDangSo(quen)}`
}

/** Toast khi lưu câu trả lời lỗi (thẻ vẫn ở lại, bấm lại Quên / Nhớ để gửi lại). */
export const LOI_LUU_CAU_TRA_LOI = 'Chưa lưu được câu trả lời.'

/** aria-label vùng nút trả lời của thẻ. */
export const NHOM_TRA_LOI = 'Trả lời'
