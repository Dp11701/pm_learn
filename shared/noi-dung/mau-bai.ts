import type { MauBai } from '../roadmap/types'

// Danh sách khối của 3 mẫu bài (§8.5 Chủ đề, §8.6 Tài liệu, §8.6b Chứng chỉ; đề xuất 1.5, D13).
// Chỉ là cấu trúc (tên khối, thứ tự, bắt buộc, kiểu khối), không có nội dung học.

/**
 * Kiểu khối: quyết định cách đọc chữ trong khối (quy ước 1.5) và cách hiện.
 * Khối do app tạo không đọc từ file (chữ trong file bị bỏ qua + cảnh báo).
 */
export type KieuKhoi =
  /** đoạn văn / danh sách Markdown thường */
  | 'van-ban'
  /** "- **Thuật ngữ** — giải thích" → danh sách định nghĩa */
  | 'dinh-nghia'
  /** "### Bạn đã quen", "### Điều cần đổi" → callout 2 cột C19 */
  | 'goc-dev-lead'
  /** "### Đề bài", "### Đầu ra", "### Tiêu chí tự kiểm" (task list) → C20 */
  | 'thuc-hanh'
  /** "- H: … | Đ: …" → mỗi câu một C21 */
  | 'tu-kiem-tra'
  /** danh sách nguồn (Markdown thường) */
  | 'tham-khao'
  /** đoạn văn + dải 5 process group tô theo frontmatter process_group */
  | 'process-group'
  /** bảng GFM đầu tiên → C17 + "Tải .md / .csv" */
  | 'mau-dien-san'
  /** task list "- [ ] …" → checkbox, tick lưu SQLite */
  | 'checklist'
  /** "- <Trường>: <giá trị>" (P1) */
  | 'thong-tin-thi'
  /** "### <tên domain>" + danh sách slug (P1) */
  | 'phu-roadmap'
  // Khối do app tạo
  | 'noi-lai'
  | 'ban-cua-toi'
  | 'ke-hoach-thi'
  | 'nhat-ky-thi-thu'
  | 'muc-lien-quan'

export interface KhoiMau {
  /** Khoá ổn định, cũng là neo trong trang (#ban-cua-toi…) = slug của tên khối */
  id: string
  /** Số thứ tự trong danh sách khối của đặc tả; khối "Nói lại" không có số */
  so: number | null
  /** Tên khối (tiêu đề ## trong file) */
  tieuDe: string
  /** Tên khác cũng hợp lệ (D13: khối 7 của Chủ đề) */
  tenKhac: readonly string[]
  /** ★ bắt buộc */
  batBuoc: boolean
  kieu: KieuKhoi
  /** 'file': viết trong file .md; 'app': app tự tạo, không đọc từ file */
  nguon: 'file' | 'app'
  /** Tiểu mục ### bắt buộc trong khối, theo thứ tự (Góc dev lead → PM, Thực hành) */
  mucCon: readonly string[]
  /** Khối chỉ có ở P1/P2 (hiện tạm C38 hoặc Markdown thường tới phase đó) */
  uuTien?: 'P1' | 'P2'
}

export interface DinhNghiaMau {
  mau: MauBai
  /** loai trong frontmatter */
  loai: MauBai
  /** Khối theo thứ tự hiện trong bài (gồm cả khối do app tạo, đúng vị trí) */
  khoi: readonly KhoiMau[]
  /** Số khối ★ = mẫu số của "Đủ khối" (9 / 8 / 7) */
  tongBatBuoc: number
}

function k(
  id: string,
  so: number | null,
  tieuDe: string,
  batBuoc: boolean,
  kieu: KieuKhoi,
  them: Partial<Pick<KhoiMau, 'tenKhac' | 'mucCon' | 'uuTien'>> = {},
): KhoiMau {
  const nguon = LA_KHOI_APP.has(kieu) ? 'app' : 'file'
  return {
    id,
    so,
    tieuDe,
    tenKhac: them.tenKhac ?? [],
    batBuoc,
    kieu,
    nguon,
    mucCon: them.mucCon ?? [],
    ...(them.uuTien ? { uuTien: them.uuTien } : {}),
  }
}

const LA_KHOI_APP: ReadonlySet<KieuKhoi> = new Set<KieuKhoi>([
  'noi-lai',
  'ban-cua-toi',
  'ke-hoach-thi',
  'nhat-ky-thi-thu',
  'muc-lien-quan',
])

// Khối dùng ở nhiều mẫu
const TOM_TAT = (so: number) => k('tom-tat', so, 'Tóm tắt', true, 'van-ban')
const NOI_LAI = k('noi-lai-bang-loi-cua-ban', null, 'Nói lại bằng lời của bạn', false, 'noi-lai')
const TU_KIEM_TRA = (so: number) => k('tu-kiem-tra', so, 'Tự kiểm tra', true, 'tu-kiem-tra')
const MUC_LIEN_QUAN = (so: number) =>
  k('muc-lien-quan', so, 'Mục liên quan', false, 'muc-lien-quan')
const THAM_KHAO = (so: number) => k('tham-khao', so, 'Tham khảo', true, 'tham-khao')

/** Tiểu mục ### của khối Góc dev lead → PM (1.5) */
export const MUC_CON_GOC_DEV_LEAD = ['Bạn đã quen', 'Điều cần đổi'] as const
/** Tiểu mục ### của khối Thực hành trên dự án thật (1.5) */
export const MUC_CON_THUC_HANH = ['Đề bài', 'Đầu ra', 'Tiêu chí tự kiểm'] as const
/** Tiểu mục chứa task list tiêu chí trong khối Thực hành */
export const MUC_CON_TIEU_CHI = 'Tiêu chí tự kiểm'

const KHOI_CHU_DE: readonly KhoiMau[] = [
  TOM_TAT(1),
  k('vi-sao-pm-can-biet', 2, 'Vì sao PM cần biết', true, 'van-ban'),
  k('khai-niem-cot-loi', 3, 'Khái niệm cốt lõi', true, 'dinh-nghia'),
  k('vi-du-thuc-te', 4, 'Ví dụ thực tế', true, 'van-ban'),
  k('cach-ap-dung', 5, 'Cách áp dụng', true, 'van-ban'),
  k('goc-dev-lead-pm', 6, 'Góc dev lead → PM', true, 'goc-dev-lead', {
    mucCon: MUC_CON_GOC_DEV_LEAD,
  }),
  NOI_LAI,
  // D13: ba tên đều hợp lệ cho khối 7
  k('so-sanh', 7, 'So sánh', false, 'van-ban', { tenKhac: ['Thuật ngữ', 'Thực hành công cụ'] }),
  k('thuc-hanh-tren-du-an-that', 8, 'Thực hành trên dự án thật', true, 'thuc-hanh', {
    mucCon: MUC_CON_THUC_HANH,
  }),
  TU_KIEM_TRA(9),
  MUC_LIEN_QUAN(10),
  THAM_KHAO(11),
]

const KHOI_TAI_LIEU: readonly KhoiMau[] = [
  k('muc-dich', 1, 'Mục đích', true, 'van-ban'),
  k('khi-nao-lap-ai-lap-ai-duyet', 2, 'Khi nào lập, ai lập, ai duyệt', true, 'process-group'),
  k('cau-truc-tai-lieu', 3, 'Cấu trúc tài liệu', true, 'van-ban'),
  NOI_LAI,
  k('mau-dien-san', 4, 'Mẫu điền sẵn', true, 'mau-dien-san'),
  k('checklist-chat-luong', 5, 'Checklist chất lượng', true, 'checklist'),
  k('loi-thuong-gap', 6, 'Lỗi thường gặp', false, 'van-ban'),
  k('ban-cua-toi', 7, 'Bản của tôi', true, 'ban-cua-toi'),
  TU_KIEM_TRA(8),
  MUC_LIEN_QUAN(9),
  THAM_KHAO(10),
]

const KHOI_CHUNG_CHI: readonly KhoiMau[] = [
  TOM_TAT(1),
  k('danh-cho-ai', 2, 'Dành cho ai', true, 'van-ban'),
  NOI_LAI,
  k('thong-tin-ky-thi', 3, 'Thông tin kỳ thi', true, 'thong-tin-thi', { uuTien: 'P1' }),
  k('phu-roadmap', 4, 'Phủ roadmap', true, 'phu-roadmap', { uuTien: 'P1' }),
  k('ke-hoach-thi-cua-toi', 5, 'Kế hoạch thi của tôi', true, 'ke-hoach-thi'),
  k('nhat-ky-thi-thu', 6, 'Nhật ký thi thử', false, 'nhat-ky-thi-thu', { uuTien: 'P2' }),
  TU_KIEM_TRA(7),
  MUC_LIEN_QUAN(8),
  THAM_KHAO(9),
]

function dinhNghia(mau: MauBai, khoi: readonly KhoiMau[]): DinhNghiaMau {
  return { mau, loai: mau, khoi, tongBatBuoc: khoi.filter((x) => x.batBuoc).length }
}

export const MAU_BAI: Readonly<Record<MauBai, DinhNghiaMau>> = {
  'chu-de': dinhNghia('chu-de', KHOI_CHU_DE),
  'tai-lieu': dinhNghia('tai-lieu', KHOI_TAI_LIEU),
  'chung-chi': dinhNghia('chung-chi', KHOI_CHUNG_CHI),
}

/** Mọi tên khối do app tạo (của cả 3 mẫu). Có trong file thì bỏ qua chữ + cảnh báo. */
export const TEN_KHOI_APP: readonly string[] = [
  ...new Set(
    Object.values(MAU_BAI).flatMap((m) =>
      m.khoi.filter((x) => x.nguon === 'app').map((x) => x.tieuDe),
    ),
  ),
]

/** Khối mẫu viết trong file, theo thứ tự (không gồm khối do app tạo). */
export function khoiTrongFile(mau: MauBai): KhoiMau[] {
  return MAU_BAI[mau].khoi.filter((x) => x.nguon === 'file')
}

/** Mọi tên hợp lệ của một khối (tên chính + tên khác). */
export function cacTen(khoi: KhoiMau): string[] {
  return [khoi.tieuDe, ...khoi.tenKhac]
}

/** "Đủ khối" khi mục chưa có file: 0/n (đề xuất 3.3). */
export function duKhoiChuaCo(mau: MauBai): { co: number; tong: number } {
  return { co: 0, tong: MAU_BAI[mau].tongBatBuoc }
}
