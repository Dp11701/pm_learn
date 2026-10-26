// Số liệu của bộ dữ liệu mẫu (§7 "Dữ liệu mẫu (mọi frame dùng chung)", đề xuất mục 7).
// Chỉ dùng cho `npm run dev:mau` và test; app thật không bao giờ nạp file này.
// Mọi mốc giờ viết theo giờ Việt Nam (+07:00) như GIO_MAU. Mục học ghi bằng slug của cây.

/** Đồng hồ ảo của bộ mẫu: Thứ Năm 22/10/2026 21:42, tuần ISO 43 (§7). */
export const GIO_MAU = '2026-10-22T21:42:00+07:00'

/** Múi giờ của bộ mẫu: ngày lịch (`on`, ngày duyệt) tính theo múi giờ này. */
export const MUI_GIO_MAU = 'Asia/Ho_Chi_Minh'

/** Ngày bắt đầu học (§7). */
export const NGAY_BAT_DAU = '2026-09-17'

/** Mục tiêu giờ học mỗi tuần (§7 "4 giờ 35 phút / 6 giờ"; đề xuất 2.1 settings muc_tieu_gio_tuan=6). */
export const MUC_TIEU_GIO_TUAN = 6

/** Lý do Bỏ qua của 4 mục (§7). */
export const LY_DO_BO_QUA = 'Không dùng trong công việc'

/** "YYYY-MM-DD HH:mm[:ss]" giờ Việt Nam → ms. */
export function luc(gio: string): number {
  const iso = `${gio.replace(' ', 'T')}${gio.length === 16 ? ':00' : ''}+07:00`
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) throw new Error(`Mốc giờ mẫu sai: "${gio}"`)
  return ms
}

/** Ngày lịch (YYYY-MM-DD) của một mốc "YYYY-MM-DD HH:mm" — luôn là phần ngày, vì mốc viết theo giờ VN. */
export function ngayCuaMoc(gio: string): string {
  return gio.slice(0, 10)
}

export interface LichSuXong {
  slug: string
  /** Chưa học → Đang học */
  batDau: string
  /** Đang học → Đã xong */
  xong: string
}

/**
 * 37 mục Đã xong (§7, đúng danh sách theo lĩnh vực), theo thứ tự xong. Cộng dồn theo tuần ISO 38–43
 * = 6 · 12 · 19 · 27 · 33 · 37 (burnup §7). Lần mở bài cuối của mỗi mục = lúc xong.
 */
export const DA_XONG: readonly LichSuXong[] = [
  // Tuần 38 (17–20/09): 6
  { slug: 'sdlc', batDau: '2026-09-17 19:30', xong: '2026-09-17 21:00' },
  { slug: 'pdlc', batDau: '2026-09-17 19:45', xong: '2026-09-17 21:40' },
  { slug: 'scrum', batDau: '2026-09-17 20:00', xong: '2026-09-18 21:15' },
  { slug: 'kanban', batDau: '2026-09-18 20:00', xong: '2026-09-19 20:50' },
  { slug: 'agile', batDau: '2026-09-18 20:20', xong: '2026-09-19 21:30' },
  { slug: 'ci-cd', batDau: '2026-09-19 21:40', xong: '2026-09-20 10:30' },
  // Tuần 39 (21–27/09): 6
  { slug: 'waterfall', batDau: '2026-09-20 11:00', xong: '2026-09-21 21:00' },
  { slug: 'iterative-approach', batDau: '2026-09-21 21:10', xong: '2026-09-22 20:40' },
  { slug: 'incremental-approach', batDau: '2026-09-21 21:20', xong: '2026-09-22 21:25' },
  { slug: 'code-review', batDau: '2026-09-23 20:30', xong: '2026-09-24 21:00' },
  { slug: 'branching-strategy', batDau: '2026-09-24 21:10', xong: '2026-09-25 20:45' },
  { slug: 'tech-debt', batDau: '2026-09-26 15:00', xong: '2026-09-27 16:20' },
  // Tuần 40 (28/09–04/10): 7
  { slug: 'lean-principles', batDau: '2026-09-27 16:30', xong: '2026-09-28 21:05' },
  { slug: 'v-model', batDau: '2026-09-28 21:10', xong: '2026-09-29 20:55' },
  { slug: 'poc', batDau: '2026-09-29 21:00', xong: '2026-09-30 20:30' },
  { slug: 'mvp', batDau: '2026-09-29 21:05', xong: '2026-09-30 21:00' },
  { slug: 'test-strategy-test-plan', batDau: '2026-09-30 21:20', xong: '2026-10-01 21:10' },
  { slug: 'confluence', batDau: '2026-10-01 21:20', xong: '2026-10-02 20:40' },
  { slug: 'definition-of-done', batDau: '2026-10-03 15:00', xong: '2026-10-04 16:10' },
  // Tuần 41 (05–11/10): 8
  { slug: 'definition-of-ready', batDau: '2026-10-04 16:20', xong: '2026-10-05 21:00' },
  { slug: 'functional-requirements', batDau: '2026-10-05 21:10', xong: '2026-10-06 20:30' },
  { slug: 'non-functional-requirements', batDau: '2026-10-05 21:15', xong: '2026-10-06 21:20' },
  { slug: 'moscow', batDau: '2026-10-06 21:30', xong: '2026-10-07 21:00' },
  { slug: 't-shirt-sizing', batDau: '2026-10-07 21:10', xong: '2026-10-08 20:45' },
  {
    slug: 'story-points-estimation-planning-poker',
    batDau: '2026-10-08 20:50',
    xong: '2026-10-09 21:15',
  },
  { slug: 'burndown-burnup-charts', batDau: '2026-10-09 21:20', xong: '2026-10-10 15:30' },
  { slug: 'project-sponsor', batDau: '2026-10-10 15:40', xong: '2026-10-11 16:00' },
  // Tuần 42 (12–18/10): 6
  { slug: 'initiation', batDau: '2026-10-11 16:10', xong: '2026-10-12 21:00' },
  { slug: 'planning', batDau: '2026-10-12 21:10', xong: '2026-10-13 21:05' },
  { slug: 'execution', batDau: '2026-10-13 21:10', xong: '2026-10-14 20:50' },
  { slug: 'meeting-notes', batDau: '2026-10-14 21:00', xong: '2026-10-15 21:10' },
  { slug: 'decision-log', batDau: '2026-10-15 21:20', xong: '2026-10-16 20:40' },
  { slug: 'presales', batDau: '2026-10-16 20:50', xong: '2026-10-17 15:20' },
  // Tuần 43 (19–22/10): 4
  { slug: 'change-control-board-ccb', batDau: '2026-10-18 20:00', xong: '2026-10-19 21:00' },
  { slug: 'change-request-cr', batDau: '2026-10-18 20:10', xong: '2026-10-20 21:10' },
  { slug: 'dedicated-team', batDau: '2026-10-20 21:15', xong: '2026-10-21 20:20' },
  { slug: 'staff-augmentation', batDau: '2026-10-20 21:20', xong: '2026-10-21 21:20' },
]

export interface LichSuDangHoc {
  slug: string
  batDau: string
  /** Lần mở bài gần nhất */
  moCuoi: string
}

/**
 * 6 mục Đang học, theo thứ tự mở gần nhất (§7): sidebar hiện 3 mục đầu + "Xem tất cả (6)"; Học tiếp =
 * Risk Register. Risk Register mở lúc 21:17:20, trước khi bấm đồng hồ (started_at = GIO_MAU − 24:17, phase 3).
 */
export const DANG_HOC: readonly LichSuDangHoc[] = [
  { slug: 'risk-register', batDau: '2026-10-21 20:30', moCuoi: '2026-10-22 21:17:20' },
  { slug: 'scope-creep', batDau: '2026-10-18 20:30', moCuoi: '2026-10-22 21:05' },
  { slug: 'power-interest-grid', batDau: '2026-10-22 20:40', moCuoi: '2026-10-22 20:48' },
  { slug: 'jira', batDau: '2026-10-21 21:30', moCuoi: '2026-10-21 22:10' },
  { slug: 'qualitative-risk-assessment', batDau: '2026-10-20 21:25', moCuoi: '2026-10-20 21:30' },
  {
    slug: 'schedule-creation-milestones-phases-critical-path',
    batDau: '2026-10-19 20:10',
    moCuoi: '2026-10-19 20:15',
  },
]

/** 4 mục Bỏ qua (§7), cùng lúc ở tuần 40 → phạm vi burnup 199 → 195 ở tuần 40. */
export const BO_QUA: readonly { slug: string; luc: string }[] = [
  { slug: 'use-case-points', luc: '2026-09-30 21:40:00' },
  { slug: 'function-point-analysis', luc: '2026-09-30 21:40:10' },
  { slug: 'mural', luc: '2026-09-30 21:40:20' },
  { slug: 'primavera-p6-oracle', luc: '2026-09-30 21:40:30' },
]

export interface BaiDaDuyet {
  slug: string
  /** Lúc duyệt (giờ VN); ngay_duyet = phần ngày */
  duyetLuc: string
  nguon: 'ai' | 'tu-viet'
}

/** Bài duyệt trước khi bắt đầu học mục đó 10 phút (mục Đã xong). */
function duyetTruoc(gio: string): string {
  const [ngay, hm] = gio.split(' ')
  const [h, m] = hm.split(':').map(Number)
  const phut = h * 60 + m - 10
  return `${ngay} ${String(Math.floor(phut / 60)).padStart(2, '0')}:${String(phut % 60).padStart(2, '0')}`
}

/**
 * 41 bài Đã duyệt (§7) = 37 mục Đã xong + Scope Creep (duyệt 18/10/2026) + Feasibility Study + Miro + Trello.
 * Nguồn: AI, riêng mỗi bài thứ 4 là Tự viết (tự đặt; §7 không nói).
 */
export const DA_DUYET: readonly BaiDaDuyet[] = [
  ...DA_XONG.map((x) => ({ slug: x.slug, duyetLuc: duyetTruoc(x.batDau) })),
  { slug: 'scope-creep', duyetLuc: '2026-10-18 20:20' },
  { slug: 'feasibility-study', duyetLuc: '2026-10-14 20:00' },
  { slug: 'miro', duyetLuc: '2026-10-16 21:40' },
  { slug: 'trello', duyetLuc: '2026-10-16 21:45' },
].map((x, i): BaiDaDuyet => ({ ...x, nguon: i % 4 === 3 ? 'tu-viet' : 'ai' }))

export interface BanNhap {
  slug: string
  nguon: 'ai' | 'tu-viet'
  /** Khối ★ (tên trong mẫu) không viết trong file → "Đủ khối" như cột F21b */
  thieuKhoi: readonly string[]
  /** "Đủ khối" của F21b (để test đối chiếu) */
  duKhoi: string
  /** "Ngày nhập" của F21b — sổ nội dung (content_files) ở phase 2b sẽ seed giá trị này */
  ngayNhap: string
}

/**
 * 9 bản nháp (§7) theo thứ tự cột F21b; Project Charter và Change log là Tự viết, còn lại AI.
 * Earned Value Management có thêm khối So sánh: 10 khối có nội dung (F14).
 */
export const BAN_NHAP: readonly BanNhap[] = [
  {
    slug: 'wbs-wbs-dictionary',
    nguon: 'ai',
    thieuKhoi: ['Checklist chất lượng'],
    duKhoi: '7/8',
    ngayNhap: '2026-09-25',
  },
  {
    slug: 'project-charter',
    nguon: 'tu-viet',
    thieuKhoi: ['Mẫu điền sẵn', 'Checklist chất lượng'],
    duKhoi: '6/8',
    ngayNhap: '2026-09-19',
  },
  {
    slug: 'change-log',
    nguon: 'tu-viet',
    thieuKhoi: ['Mẫu điền sẵn', 'Checklist chất lượng', 'Tự kiểm tra'],
    duKhoi: '5/8',
    ngayNhap: '2026-10-02',
  },
  {
    slug: 'schedule-creation-milestones-phases-critical-path',
    nguon: 'ai',
    thieuKhoi: [],
    duKhoi: '9/9',
    ngayNhap: '2026-10-08',
  },
  {
    slug: 'earned-value-management',
    nguon: 'ai',
    thieuKhoi: [],
    duKhoi: '9/9',
    ngayNhap: '2026-10-10',
  },
  {
    slug: 'three-point-estimation',
    nguon: 'ai',
    thieuKhoi: ['Ví dụ thực tế'],
    duKhoi: '8/9',
    ngayNhap: '2026-10-12',
  },
  { slug: 'risk-register', nguon: 'ai', thieuKhoi: [], duKhoi: '8/8', ngayNhap: '2026-10-15' },
  {
    slug: 'qualitative-risk-assessment',
    nguon: 'ai',
    thieuKhoi: [],
    duKhoi: '9/9',
    ngayNhap: '2026-10-17',
  },
  {
    slug: 'power-interest-grid',
    nguon: 'ai',
    thieuKhoi: [],
    duKhoi: '9/9',
    ngayNhap: '2026-10-20',
  },
]

/** Mục chắc chắn không có file (F17/F18 Salience Model; §7 "Salience Model và Jira chưa có nội dung"). */
export const KHONG_CO_NOI_DUNG: readonly string[] = ['salience-model', 'jira']

/** Liên quan có trong đặc tả / frame; mục khác lấy 2 mục kề trong cùng lĩnh vực (hoặc phần). */
export const LIEN_QUAN_FRAME: Readonly<Record<string, readonly string[]>> = {
  // §4, §8.5, F11
  'scope-creep': ['change-request-cr', 'change-control-board-ccb', 'scope-baseline'],
  // F15
  'risk-register': [
    'qualitative-risk-assessment',
    'risk-identification-process',
    'risk-and-opportunity-response-strategies',
  ],
}

/** Giải nghĩa có trong đặc tả (§4 ví dụ frontmatter, H1 F11); mục khác để trống. */
export const GIAI_NGHIA_FRAME: Readonly<Record<string, string>> = {
  'scope-creep': 'phình phạm vi',
}

/** process_group có trong frame (F15: Planning, Monitoring and Control được tô). */
export const PROCESS_GROUP_FRAME: Readonly<Record<string, readonly string[]>> = {
  'risk-register': ['planning', 'monitoring-and-control'],
}

/** Khối tuỳ chọn 7 của Chủ đề (D13: ba tên đều hợp lệ). Scope Creep không có (F11). */
export const KHOI_7: Readonly<Record<string, 'So sánh' | 'Thuật ngữ' | 'Thực hành công cụ'>> = {
  'earned-value-management': 'So sánh', // F14: 9 bắt buộc + So sánh
  scrum: 'So sánh',
  'iterative-approach': 'So sánh',
  'definition-of-ready': 'Thuật ngữ',
  'burndown-burnup-charts': 'Thuật ngữ',
  'ci-cd': 'Thuật ngữ',
  confluence: 'Thực hành công cụ',
  miro: 'Thực hành công cụ',
  trello: 'Thực hành công cụ',
}

/** Số câu Tự kiểm tra cố định theo frame (F11 "Câu 1/1", F15 một câu); mục khác 1–3 câu. */
export const SO_CAU_HOI_FRAME: Readonly<Record<string, number>> = {
  'scope-creep': 1,
  'risk-register': 1,
}

/** Số khái niệm cố định theo frame (F11: 3); mục khác 3–5. */
export const SO_KHAI_NIEM_FRAME: Readonly<Record<string, number>> = { 'scope-creep': 3 }

/** Mục có bài viết đúng như frame (mỗi khối 1 đoạn như F11/F12/F15), không thêm đoạn thứ hai. */
export const BAI_THEO_FRAME: readonly string[] = ['scope-creep', 'risk-register']

/** Số cột Mẫu điền sẵn: Risk Register 8 cột như F15; tài liệu khác 4 cột. */
export const SO_COT_MAU_DIEN_SAN: Readonly<Record<string, number>> = { 'risk-register': 8 }
