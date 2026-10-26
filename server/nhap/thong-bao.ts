// Câu của API nhập file .md (đề xuất 1.6, 1.7, 3.8; F22): ghi chú trên từng dòng kết quả kiểm tra và lỗi trả
// qua { loi }. Câu có trong đề xuất ghi "(1.7)" / "(1.6)"; còn lại là câu mới, gửi duyệt ở báo cáo phase 2b.

export const TB_NHAP = {
  // ---------- Ghi chú trên dòng kết quả ----------
  /** (1.7) id trong frontmatter không phải nút nào của cây → bỏ qua id, khớp theo tên file */
  idKhongCo: 'id không có trong cây',
  /** Lỗi YAML ở dòng "khoá giá trị" (quên dấu :) — nguyên văn F22: Dòng 3: thiếu dấu ":" sau loai */
  thieuHaiCham: (khoa: string) => `thiếu dấu ":" sau ${khoa}`,
  khongPhaiUtf8: 'file không phải chữ UTF-8 — lưu lại với mã UTF-8 rồi nhập lại',
  /** Lô có hai file cùng một mục: file sau xếp Không khớp mục (3.8) */
  fileThuHai: (ten: string) => `Lô đã có “${ten}” cho mục này — gán mục khác hoặc bỏ qua`,
  /** Quét lại: mục đã có file đã nhận khác (đề xuất 1.6 "2 file cùng id") */
  mucDaCoFile: (duongDan: string) =>
    `Mục đã có file “${duongDan}” — file ở đường dẫn chuẩn được giữ`,
  /** F22 "Bản hiện tại duyệt 18/10/2026" */
  banHienTaiDuyet: (ngay: string) => `Bản hiện tại duyệt ${ngay}`,
  /** Gán sẵn (?muc= / tên gần đúng) cho mục Đã duyệt: nhập sẽ ghi bản sửa (bất biến 5) */
  thanhBanSua: 'Mục đã duyệt — nhập sẽ thành bản sửa (.ban-sua.md)',
  /** Quét lại: file đã nhận của mục Đã duyệt bị sửa ngoài app (1.6 ⟳) */
  suaNgoaiApp: (ngay: string) => `File Đã duyệt bị sửa ngoài app · bản đã duyệt ${ngay}`,
  /** Quét lại: file đã nhận của mục Đã duyệt không còn (bị xoá / chuyển ngoài app) */
  matNgoaiApp: (ngay: string) =>
    `File Đã duyệt bị xoá hoặc chuyển đi ngoài app · bản đã duyệt ${ngay} — chỉ Giữ bản cũ được`,
  /** (1.6) "id trong file thuộc mục X, file nằm ở chỗ của mục Y" */
  idMucKhac: (x: string, y: string) =>
    `id trong file thuộc mục “${x}”, file nằm ở chỗ của mục “${y}”`,
  idKhongCoTaiCho: (y: string) => `id trong file không có trong cây, file nằm ở chỗ của mục “${y}”`,
  /** File tên bắt đầu bằng _ mà không phải _tong-quan.md của phần / lĩnh vực */
  tepRieng:
    'Tên bắt đầu bằng “_” là file riêng của app (tổng quan, lộ trình gợi ý) — chưa nhận ở đây',

  // ---------- Lỗi (HTTP) ----------
  duLieuSai: 'Dữ liệu gửi lên không đúng dạng của API nhập file.',
  khongCoFile: 'Chưa có file nào để kiểm tra.',
  quaNhieuFile: (toiDa: string) => `Mỗi lần nhập tối đa ${toiDa} file.`,
  fileQuaLon: (ten: string, kb: number) => `“${ten}” lớn hơn ${kb} KB — app không nhận file này.`,
  /** 410: token không còn (quá 30 phút, máy chủ khởi động lại, hoặc bị thay bằng lô mới hơn) */
  hetHan: 'Lô kiểm tra đã hết hạn (quá 30 phút) hoặc máy chủ vừa khởi động lại — bấm Kiểm tra lại.',
  /** 410: lô đã nhập rồi */
  daNhapLo: 'Lô này đã được nhập — kiểm tra lại nếu muốn nhập lần nữa.',
  /** 410: kiểm lại lúc nhập thấy khác lúc kiểm tra (nhập ở tab khác, file trên đĩa đổi…) */
  daDoi:
    'Thư mục nội dung hoặc trạng thái bài đã đổi từ lúc kiểm tra — bấm Kiểm tra lại để xem kết quả mới.',
  chiSoSai: (chiSo: string) => `Không có file số ${chiSo} trong lô.`,
  haiFileMotMuc: (a: string, b: string, muc: string) =>
    `“${a}” và “${b}” cùng nhập vào mục “${muc}” — bỏ bớt một file.`,
  khongNhapDuoc: (ten: string, muc: string, loi: string) =>
    `“${ten}” không nhập được vào mục “${muc}”: ${loi}.`,
  khongConFile: (ten: string) =>
    `“${ten}” không còn trên đĩa nên không nhập thành bản sửa được — chỉ Giữ bản cũ được.`,
  tongQuanDaDuyet: (ten: string) =>
    `“${ten}”: tổng quan đã duyệt chưa có bản sửa — chỉ Giữ bản cũ được.`,
  khongCoGiDeNhap: 'Không có file nào được chọn để nhập.',
  khongPhaiLanNhap: (id: number) =>
    `Thao tác file số ${id} không phải một lần nhập — không hoàn tác ở đây được.`,
  saoLuuLoi: 'Không sao lưu được trước khi nhập — chưa ghi file nào. Xem log của server.',
} as const
