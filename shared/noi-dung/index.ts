// Nội dung bài học dùng chung web + server (đề xuất 1.5): mẫu bài, frontmatter, bộ đọc bài,
// quy ước trong khối, an toàn khi hiện Markdown, tải .csv, prompt soạn bài.

export {
  MAU_BAI,
  TEN_KHOI_APP,
  MUC_CON_GOC_DEV_LEAD,
  MUC_CON_THUC_HANH,
  MUC_CON_TIEU_CHI,
  khoiTrongFile,
  cacTen,
  duKhoiChuaCo,
  type KieuKhoi,
  type KhoiMau,
  type DinhNghiaMau,
} from './mau-bai'
export { chuanHoaTieuDe, chuanHoaCau, bam, taoKhoa } from './chuan-hoa'
export {
  docFrontmatter,
  tachDong,
  CAC_LOAI_FILE,
  CAC_TRANG_THAI_FILE,
  CAC_NGUON,
  KHOA_FRONTMATTER,
  type Frontmatter,
  type KetQuaFrontmatter,
  type LoaiFile,
  type TrangThaiFile,
} from './frontmatter'
export {
  phanTichBai,
  docFrontmatterCuaMuc,
  type Khoi,
  type OBoCuc,
  type KetQuaBai,
} from './phan-tich'
export { TOI_DA_BYTE_BAI, soKb } from './gioi-han'
export {
  tachO,
  timBang,
  tieuDeCap,
  type CauTrucKhoi,
  type CauHoi,
  type DinhNghia,
  type DongTick,
  type Bang,
  type MucCon,
  type TruongThi,
  type DomainPhu,
  type DoanTho,
  type Dong,
} from './quy-uoc'
export { TB, DANG, voiDong, type CanhBao, type LoiDong, type MucCanhBao } from './thong-bao'
export { traMucLienQuan, giaiLienQuan, type TraSlugCu } from './lien-quan'
export {
  GIAO_THUC_LINK,
  THUOC_TINH_LINK_NGOAI,
  DUOI_ANH,
  API_ANH,
  phanLoaiLink,
  giaiDuongDanAnh,
  duongDanAnh,
  oCsv,
  taoCsv,
  type LoaiLink,
} from './an-toan'
export { buildPrompt, GOI_Y_KHOI, GOI_Y_TEN_KHAC, GOI_Y_MUC_CON } from './prompt'
