// Câu báo lỗi / thông báo của lõi nội dung phase 2b (đề xuất 1.3, 1.6): ghi file, file_ops, quét, Giữ bản cũ,
// thay cây. Đều là câu mới (đề xuất không có câu chữ), gửi duyệt ở báo cáo phase 2b. API trả qua { loi }.

export const TB_ND = {
  // Đường dẫn / ghi file (1.6)
  duongDanSai: (p: string) => `Đường dẫn không hợp lệ trong thư mục nội dung: “${p}”.`,
  tenTepSai: (ten: string) =>
    `Tên file không hợp lệ: “${ten}” (chỉ nhận tên .md, tối đa 200 ký tự, không có / \\).`,
  quaSymlink: (p: string) => `“${p}” đi qua symlink — app không đọc, ghi qua symlink.`,
  khongPhaiThuMuc: (p: string) => `“${p}”: một phần của đường dẫn không phải thư mục.`,
  khongPhaiFile: (p: string) => `“${p}” không phải file thường.`,
  ngoaiThuMuc: (p: string) => `“${p}” nằm ngoài thư mục nội dung.`,
  thieuNoiDungGhi: (p: string) => `Thiếu nội dung để ghi vào “${p}”.`,
  hashKhongKhop: (p: string) => `Nội dung ghi vào “${p}” không khớp hash đã kiểm.`,
  nguonMat: (tu: string, den: string) => `Không còn file “${tu}” để chuyển sang “${den}”.`,
  khongTaoThuMuc: (p: string) => `Không tạo được thư mục cho “${p}”.`,

  // Bất biến 5
  ghiDeDaDuyet: (p: string) =>
    `Không ghi đè bài Đã duyệt “${p}”: sửa bài đã duyệt phải ghi vào bản sửa (.ban-sua.md).`,
  racDaDuyet: (p: string) => `Không chuyển bài Đã duyệt “${p}” vào thùng rác.`,
  thayBanDuyet: 'Chỉ “duyệt bản sửa” mới thay được bản đã duyệt.',
  nutKhongCo: (id: string) => `Không có id “${id}” trong cây roadmap.`,

  // Hoàn tác (đảo file_ops)
  khongCoThaoTac: (id: number) => `Không có thao tác file số ${id}.`,
  hoanTacHoanTac: 'Không hoàn tác được một lần hoàn tác.',
  daHoanTac: 'Thao tác này đã được hoàn tác.',
  doiSauDo: 'Không hoàn tác được: file đã được đổi bởi một thao tác sau.',

  // Quét lại (1.6)
  quaSau: (p: string, cap: number) =>
    `Thư mục nội dung lồng quá ${cap} cấp: “${p}”. Chuyển file lên tối đa ${cap} cấp rồi Quét lại.`,
  quaNhieu: (so: string) =>
    `Thư mục nội dung có hơn ${so} file .md — Quét lại dừng. Bớt file rồi thử lại.`,
  /** 422: thư mục nội dung không có (đổi tên, ổ ngoài chưa gắn, NOI_DUNG_DIR sai) — không gỡ sổ */
  gocKhongCo: (p: string) =>
    `Không thấy thư mục nội dung “${p}” (bị đổi tên, ổ ngoài chưa gắn hoặc NOI_DUNG_DIR sai) — chưa quét, sổ nội dung giữ nguyên. Kiểm tra thư mục rồi Quét lại.`,
  gocKhongDoc: (p: string) =>
    `Không đọc được thư mục nội dung “${p}” (thiếu quyền) — chưa quét, sổ nội dung giữ nguyên. Cấp quyền đọc rồi Quét lại.`,

  // Thao tác file dở dang (lỗi đĩa giữa chừng)
  /** 503: thao tác vừa lưu bị lỗi đĩa khi đang làm các bước file */
  opDoDang: (id: number, ma: string | null) =>
    `Thao tác file số ${id} dừng giữa chừng vì lỗi đĩa${ma ? ` (${ma})` : ''}. App sẽ làm tiếp thao tác này trước thao tác sau; nếu vẫn lỗi, kiểm tra quyền ghi và dung lượng của thư mục nội dung.`,
  /** 503: còn thao tác trước chưa xong nên chưa làm thao tác mới */
  opDoChan: (id: number, ma: string | null) =>
    `Thao tác file số ${id} trước đó vẫn chưa xong (lỗi đĩa${ma ? ` ${ma}` : ''}) nên app chưa làm thao tác mới. Kiểm tra quyền ghi và dung lượng của thư mục nội dung rồi thử lại.`,

  // Giữ bản cũ
  chuaDuyet: 'Mục này chưa có bản Đã duyệt nên không có bản cũ để giữ.',
} as const
