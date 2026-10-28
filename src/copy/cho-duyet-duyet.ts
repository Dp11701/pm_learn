// Câu chữ bước 4 (duyệt bài gọn) tự đặt, chưa có nguyên văn trong đặc tả, frame hay đề xuất — gom ở đây để bạn
// duyệt và sửa một chỗ. Chữ lấy nguyên văn từ đặc tả / đề xuất / task vẫn nằm tại chỗ: "Duyệt bài", "Duyệt bài
// này?", "Sẽ thành Đã duyệt · dd/MM/yyyy", "Duyệt", "Huỷ", "Đã duyệt {tên}", "Duyệt bản sửa", "Bỏ bản sửa",
// "Có thay đổi chưa duyệt" (§8.7 F12), "Chờ duyệt (n)", "Độ phủ", "Đủ khối", "Ngày nhập", "Mở bài để duyệt",
// "Bản sửa chờ duyệt (m)", "Không có bản nháp nào chờ duyệt" + "Nhập file .md" (§8.8), "Bản nháp do AI soạn — chưa
// được bạn duyệt, có thể sai." / "Bản nháp do bạn tự viết — chưa duyệt." (đề xuất 3.7).
// Mỗi mục ghi nơi dùng; hàm dùng cho câu có biến (số đã định dạng).

// ---------- Trang bài: dialog Duyệt bài (src/components/duyet/HopThoaiDuyet.tsx) ----------

/** Đầu danh sách khối ★ còn thiếu trong dialog duyệt; `so` đã định dạng. */
export function conThieuKhoi(so: string): string {
  return `Còn ${so} khối bắt buộc (★) chưa có — bạn vẫn duyệt được:`
}

/** Dòng phụ trong dialog duyệt: duyệt không hoàn tác được (Cần chốt 13). */
export const KHONG_HOAN_TAC_DUYET = 'Duyệt xong không hoàn tác được.'

/** Dialog duyệt bản sửa: câu giải thích. */
export const DUYET_BAN_SUA_MO_TA =
  'Bản sửa sẽ thay bản Đã duyệt đang hiện (bản cũ vào thùng rác của thư mục nội dung).'

/** Tiêu đề dialog duyệt bản sửa. */
export const DUYET_BAN_SUA_TIEU_DE = 'Duyệt bản sửa này?'

/** Tiêu đề dialog bỏ bản sửa. */
export const BO_BAN_SUA_TIEU_DE = 'Bỏ bản sửa?'

/** Câu của dialog bỏ bản sửa; `tenFile` = "<slug>.ban-sua.md". */
export function boBanSuaMoTa(tenFile: string): string {
  return `File ${tenFile} sẽ vào thùng rác của thư mục nội dung (.thung-rac). Bản Đã duyệt giữ nguyên.`
}

// ---------- Trang bài: banner bản sửa (src/pages/bai-hoc/BannerBai.tsx) ----------

/** Mô tả banner "Có thay đổi chưa duyệt"; ngày dd/MM/yyyy, số đã định dạng. */
export function moTaBanSua(tenFile: string, ngayNhap: string, co: string, tong: string): string {
  return `${tenFile} · nhập ${ngayNhap} · Đủ khối ${co}/${tong}. Trang đang hiện bản Đã duyệt.`
}

/** Bản sửa lỗi frontmatter: dòng mô tả của banner bản sửa (câu lỗi của bộ đọc đứng sau). */
export function banSuaLoi(tenFile: string, dong: string): string {
  return `${tenFile}: lỗi frontmatter dòng ${dong} — sửa file rồi duyệt.`
}

/** Banner bản sửa khi chưa tải xong chi tiết bản sửa. */
export const DANG_TAI_BAN_SUA = 'Đang tải bản sửa…'

/** Banner bản sửa khi không tải được chi tiết bản sửa (vẫn bỏ được). */
export const KHONG_TAI_BAN_SUA = 'Không tải được thông tin bản sửa — tải lại trang để thử lại.'

/** Banner bản sửa khi file bản sửa không còn trên đĩa (vẫn bỏ được: gỡ khỏi sổ). */
export const BAN_SUA_KHONG_CON =
  'File bản sửa không còn trên đĩa — “Bỏ bản sửa” để gỡ khỏi danh sách.'

// ---------- Toast ----------

/** Toast sau khi duyệt bản sửa (trước tên mục). */
export const DA_DUYET_BAN_SUA = 'Đã duyệt bản sửa'

/** Toast sau khi bỏ bản sửa (trước tên mục). */
export const DA_BO_BAN_SUA = 'Đã bỏ bản sửa'

/** Toast lỗi: đứng trước câu lỗi của máy chủ. */
export const LOI_DUYET = {
  duyet: 'Không duyệt được',
  boBanSua: 'Không bỏ được bản sửa',
} as const

/** Đứng sau câu lỗi của toast: trang đã tải lại bản trên đĩa. */
export const DA_TAI_LAI_BAI = 'Trang đã tải lại bản mới nhất.'

// ---------- /noi-dung tab Chờ duyệt (src/pages/noi-dung/TabChoDuyet.tsx) ----------

/** Tiêu đề bảng chính (bản nháp). */
export const BAN_NHAP_CHO_DUYET = 'Bản nháp chờ duyệt'

/** Tên cột của bảng Chờ duyệt (bản nháp, bản sửa). */
export const COT_CHO_DUYET = {
  muc: 'Mục',
  linhVuc: 'Lĩnh vực / phần',
  nguon: 'Nguồn',
} as const

/** Ô "Đủ khối" của bản nháp không đọc được. */
export const LOI_FILE_NHAP = 'Lỗi frontmatter'

/** Tên cột chứa link mở bài (chỉ trình đọc màn hình). */
export const COT_MO_BAI = 'Mở bài'

/** Không tải được danh sách. */
export const KHONG_TAI_CHO_DUYET = 'Không tải được danh sách chờ duyệt.'

/** Dòng phụ dưới tiêu đề bảng bản nháp. */
export const MO_TA_CHO_DUYET =
  'Ngày nhập mới nhất trước. Mở bài, đọc hết rồi bấm “Duyệt bài” trên banner của bài.'

/** Dòng phụ dưới tiêu đề nhóm bản sửa. */
export const MO_TA_BAN_SUA_CHO =
  'Bài đã duyệt có file .ban-sua.md. Mở bài để “Duyệt bản sửa” hoặc “Bỏ bản sửa”.'

/**
 * Dòng phụ của banner "Có n file chưa nhận" ở tab Chờ duyệt / Độ phủ (src/pages/noi-dung/TrangNoiDung.tsx): file
 * chưa nhận chưa được đếm. Tiêu đề và nút "Quét lại" giữ như banner của tab Nhập.
 */
export const CHUA_NHAN_CHUA_TINH =
  'File trong thư mục nội dung chưa được nhận nên chưa có trong danh sách và số đếm. Quét lại để nhận.'

// ---------- /noi-dung tab Độ phủ (src/pages/noi-dung/TabDoPhu.tsx) ----------

/** Tiêu đề khối tổng của tab Độ phủ. */
export const TOAN_ROADMAP = 'Cả roadmap'

/** Tiêu đề bảng theo phần / lĩnh vực. */
export const THEO_PHAN_LINH_VUC = 'Theo phần và lĩnh vực'

/** Tên cột đầu của bảng Độ phủ. */
export const COT_PHAN_LINH_VUC = 'Phần / lĩnh vực'

/** Tên cột tổng số mục. */
export const COT_TONG = 'Tổng'

/** Link tới danh sách lọc mục chưa có nội dung của một lĩnh vực / phần. */
export const XEM_MUC_CHUA_CO = 'Xem mục chưa có'

/** Phần chữ chỉ cho trình đọc màn hình của link trên (đứng trước tên lĩnh vực / phần). */
export const XEM_MUC_CHUA_CO_CUA = 'nội dung của'

/** Không tải được trạng thái nội dung. */
export const KHONG_TAI_DO_PHU = 'Không tải được trạng thái nội dung.'
