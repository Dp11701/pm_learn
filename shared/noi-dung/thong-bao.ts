// Mọi câu báo lỗi / cảnh báo của bộ đọc bài (frontmatter + khối). Câu có trong đề xuất ghi "(1.5)";
// còn lại là câu mới, gửi duyệt ở báo cáo phase 2a. Câu không kèm "Dòng N:", ghép bằng voiDong().

export type MucCanhBao = 'loi' | 'canh-bao'

export interface CanhBao {
  /** Dòng trong file, đếm từ 1 (tính cả frontmatter) */
  dong: number
  thongBao: string
  /** 'loi' làm khối không tính vào "Đủ khối" (vd. câu hỏi thiếu ' | Đ: ') */
  muc: MucCanhBao
  /** id khối mẫu mà cảnh báo thuộc về, nếu có */
  khoi?: string
}

export interface LoiDong {
  dong: number
  thongBao: string
}

/** "Dòng N: <thông báo>" (như F20 "Dòng 25: câu hỏi thiếu ' | Đ: '"). */
export function voiDong(cb: { dong: number; thongBao: string }): string {
  return `Dòng ${cb.dong}: ${cb.thongBao}`
}

const DS_LOAI = 'chu-de, tai-lieu, chung-chi, tong-quan hoặc lo-trinh'

export const TB = {
  // Frontmatter — lỗi (không đọc được bài)
  thieuFrontmatter: 'thiếu frontmatter: file phải mở đầu bằng dòng ---',
  frontmatterChuaDong: 'frontmatter chưa đóng: thiếu dòng --- kết thúc',
  yamlLoi: 'frontmatter không đọc được (lỗi cú pháp YAML)',
  khoaLap: (khoa: string) => `khoá ${khoa} bị lặp`,
  khongPhaiBang: 'frontmatter phải gồm các dòng dạng khoá: giá trị',
  thieuLoai: `thiếu loai (${DS_LOAI})`,
  loaiSai: (x: string) => `loai “${x}” không hợp lệ: dùng ${DS_LOAI}`,
  loaiKhacMau: (x: string, mau: string) => `loai “${x}” khác mẫu bài của mục này (${mau})`,
  idSai: 'id phải là một chuỗi',
  giaiNghiaSai: 'giai_nghia phải là một chuỗi',
  trangThaiSai: 'trang_thai_noi_dung phải là ban-nhap hoặc da-duyet',
  nguonSai: 'nguon phải là ai hoặc tu-viet',
  thieuNgayDuyet: 'trang_thai_noi_dung da-duyet cần ngay_duyet dạng YYYY-MM-DD',
  ngaySai: (khoa: string) => `${khoa} phải là ngày có thật, dạng YYYY-MM-DD`,
  danhSachSai: (khoa: string) => `${khoa} phải là danh sách slug hoặc id, vd. [slug-1, slug-2]`,
  aliasYaml: (toiDa: number) =>
    `frontmatter có alias YAML (*tên) trỏ vào chính nó hoặc dùng quá ${toiDa} lần — viết thẳng giá trị thay cho alias`,
  longQuaSau: (toiDa: number) => `giá trị trong frontmatter lồng quá ${toiDa} cấp`,

  // File (đề xuất 1.7: tối đa 256 KB/file)
  fileQuaLon: (kb: number, toiDaKb: number) =>
    `file ${kb} KB, vượt giới hạn ${toiDaKb} KB của một bài — app không đọc file này`,

  // Frontmatter — cảnh báo (vẫn đọc bài)
  thieuNguon: 'thiếu nguon — coi như ai',
  thieuTrangThai: 'thiếu trang_thai_noi_dung — coi như ban-nhap',
  khoaLa: (khoa: string) => `khoá lạ “${khoa}” — giữ nguyên, app không dùng`,
  idKhacMuc: (id: string) => `id “${id}” khác id của mục này`,
  chiChoLoai: (khoa: string, loai: string) => `${khoa} chỉ dùng cho loai ${loai} — bỏ qua`,
  ngayDuyetKhiNhap: 'ngay_duyet chỉ dùng khi trang_thai_noi_dung là da-duyet — bỏ qua',
  /** (1.5) */
  lienQuanKhongThay: (x: string) => `Liên quan: không tìm thấy ${x}`,

  // Thân bài
  chuTruocKhoiDau: 'chữ trước khối ## đầu tiên — hiện ở đầu bài',
  /** (1.5) "Khối không có trong mẫu" */
  khoiLa: (tieuDe: string) => `Khối không có trong mẫu: “${tieuDe}”`,
  khoiTrung: (tieuDe: string, dauTien: string, dongDau: number, cungTen: boolean) =>
    cungTen
      ? `khối “${tieuDe}” lặp lại (lần đầu ở dòng ${dongDau}) — hiện cả hai`
      : `khối “${tieuDe}” trùng với “${dauTien}” ở dòng ${dongDau} (cùng một khối của mẫu) — hiện cả hai`,
  khoiApp: (tieuDe: string) => `khối “${tieuDe}” do app tạo — chữ trong file bị bỏ qua`,

  // Quy ước trong khối (1.5)
  /** (1.5) "Dòng N: câu hỏi thiếu ' | Đ: '" */
  cauHoiThieuDapAn: "câu hỏi thiếu ' | Đ: '",
  khongTheoDang: (khoi: string, dang: string) =>
    `khối ${khoi}: dòng không theo dạng ${dang} — hiện như Markdown thường`,
  thieuMucCon: (khoi: string, mucCon: string) => `khối ${khoi} thiếu “### ${mucCon}”`,
  mucConLa: (khoi: string, mucCon: string) =>
    `khối ${khoi}: “### ${mucCon}” không có trong mẫu — khối hiện như Markdown thường`,
  mucConTrung: (khoi: string, mucCon: string) =>
    `khối ${khoi}: “### ${mucCon}” lặp lại — khối hiện như Markdown thường`,
  chuTruocMucCon: (khoi: string) =>
    `khối ${khoi}: chữ trước “###” đầu tiên — khối hiện như Markdown thường`,
  khongCoBang: (khoi: string) => `khối ${khoi} chưa có bảng Markdown — hiện như Markdown thường`,
  khongCoDongTick: (khoi: string) => `khối ${khoi} chưa có dòng “- [ ] …”`,
} as const

/** Dạng quy ước, dùng trong TB.khongTheoDang */
export const DANG = {
  cauHoi: '“- H: … | Đ: …”',
  dinhNghia: '“- **Thuật ngữ** — giải thích”',
  dongTick: '“- [ ] …”',
  truong: '“- <Trường>: <giá trị>”',
  danhSach: '“- <slug>”',
} as const
