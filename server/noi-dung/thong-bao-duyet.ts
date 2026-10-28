// Câu báo lỗi của API duyệt bài gọn (bước 4; đề xuất 3.6, 3.7 rút gọn theo mục 10). Đều là câu mới (đề xuất
// không có câu chữ cho lỗi API), gửi duyệt ở báo cáo bước 4. API trả qua { loi }.

export const TB_DUYET = {
  // ---------- Body ----------
  hashNhap:
    'hashNhap phải là sha256 (64 ký tự hex chữ thường) của file bạn đang đọc — lấy từ hashFile của GET /api/bai/:id.',

  // ---------- Duyệt bản nháp ----------
  /** 409: mục đã có bản Đã duyệt (bất biến 5: sửa bài đã duyệt chỉ qua bản sửa) */
  daDuyetRoi:
    'Bài này đã được duyệt rồi. Bài đã duyệt chỉ đổi được qua bản sửa (.ban-sua.md) rồi “Duyệt bản sửa”.',
  /** 409: không có file bản nháp đã nhận (Chưa có nội dung, hoặc file đã bị xoá ngoài app) */
  khongCoBanNhap:
    'Mục này không có bản nháp để duyệt (chưa có file, hoặc file vừa bị xoá ngoài app).',
  /** 409: file trên đĩa khác bản bạn đang đọc */
  banNhapDaDoi:
    'File bài đã đổi từ lúc bạn mở trang (vừa được sửa ngoài app?). Đọc bản mới trên trang rồi duyệt lại.',
  /** 409: file lỗi frontmatter / quá lớn: không sửa được frontmatter để ghi Đã duyệt */
  loiFrontmatter: (dong: number, cau: string) =>
    `File bài có lỗi frontmatter dòng ${dong} (${cau}) — sửa file rồi duyệt.`,
  quaLon: 'File bài lớn hơn 256 KB nên app không đọc — chia nhỏ hoặc rút gọn file rồi duyệt.',
  /**
   * 409: file đã ghi da-duyet mà app chưa có bản chụp hiện hành (◎ / đổi ngoài app, đề xuất 1.6, 3.8) — duyệt ở đây
   * sẽ ghi đè ngay_duyet của file, nên chỉ nhận qua Quét lại
   */
  fileGhiDaDuyet:
    'File bài đã ghi Đã duyệt nhưng app chưa xác nhận bản này, nên không duyệt lại ở đây (sẽ ghi đè ngày duyệt trong file). Bấm “Quét lại” để app kiểm tra file.',

  // ---------- Bản sửa ----------
  /** 409: mục chưa có bản Đã duyệt → không có đường bản sửa */
  chuaDuyet: 'Mục này chưa có bản Đã duyệt nên không có bản sửa để duyệt hay bỏ.',
  khongCoBanSua:
    'Mục này không có bản sửa chờ duyệt (đã duyệt, đã bỏ, hoặc file bị xoá ngoài app).',
  banSuaDaDoi:
    'File bản sửa đã đổi từ lúc bạn mở trang (vừa được sửa ngoài app?). Tải lại trang rồi duyệt lại.',
  loiFrontmatterBanSua: (dong: number, cau: string) =>
    `File bản sửa có lỗi frontmatter dòng ${dong} (${cau}) — sửa file rồi duyệt.`,
  quaLonBanSua:
    'File bản sửa lớn hơn 256 KB nên app không đọc — chia nhỏ hoặc rút gọn file rồi duyệt.',
} as const
