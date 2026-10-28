import type { TrangThaiHoc } from '../../shared/domain/trang-thai.ts'

// Hợp đồng API trạng thái học (đề xuất 1.10, 2.1) — TS thuần, không phụ thuộc Node: server dùng để ghi DB và
// trả phản hồi, web (src/app/du-lieu) import để đọc phản hồi. Đây là NƠI DUY NHẤT ánh xạ giá trị lưu DB
// (learning / done / skip) ↔ TrangThaiHoc (chua-hoc / dang-hoc / da-xong / bo-qua).
// Chưa học = không có hàng / không có khoá (bất biến 2).

export const CAC_TRANG_THAI_DB = ['learning', 'done', 'skip'] as const
export type TrangThaiDb = (typeof CAC_TRANG_THAI_DB)[number]

const SANG_DB: Record<TrangThaiHoc, TrangThaiDb | null> = {
  'chua-hoc': null,
  'dang-hoc': 'learning',
  'da-xong': 'done',
  'bo-qua': 'skip',
}

const TU_DB: Record<TrangThaiDb, TrangThaiHoc> = {
  learning: 'dang-hoc',
  done: 'da-xong',
  skip: 'bo-qua',
}

/** TrangThaiHoc → giá trị lưu DB; Chưa học → null (không có hàng). */
export function sangDb(trangThai: TrangThaiHoc): TrangThaiDb | null {
  return SANG_DB[trangThai]
}

/** Giá trị lưu DB (hoặc không có hàng) → TrangThaiHoc. */
export function tuDb(status: TrangThaiDb | null | undefined): TrangThaiHoc {
  return status ? TU_DB[status] : 'chua-hoc'
}

/** Nguồn của một lần đổi trạng thái (cột status_events.via). */
export const CAC_VIA = ['mot-muc', 'hang-loat', 'hoan-tac', 'nhap-json', 'tu-danh-gia'] as const
export type Via = (typeof CAC_VIA)[number]
/** via mà PUT /api/trang-thai/:id nhận (hàng loạt, nhập JSON, tự đánh giá có đường ghi riêng ở phase sau). */
export const CAC_VIA_MOT_MUC = ['mot-muc', 'hoan-tac'] as const
export type ViaMotMuc = (typeof CAC_VIA_MOT_MUC)[number]

/** Lý do Bỏ qua dài tối đa (ký tự). */
export const LY_DO_TOI_DA = 500

/** Một mục trong ảnh chụp trạng thái: chỉ có khi khác Chưa học. */
export interface MucTrangThai {
  status: TrangThaiDb
  /** Chỉ khi status = 'skip' và có lý do */
  lyDoBoQua?: string
}

/** GET /api/state */
export interface AnhChupHoc {
  revision: number
  /** id nút → trạng thái; Chưa học = không có khoá */
  trangThai: Record<string, MucTrangThai>
  /** id nút → lần mở bài gần nhất (ISO UTC) */
  luotMo: Record<string, string>
  /**
   * Phase 3: id các mục "Cần ôn lại" (đề xuất 3.3, bất biến 3 — suy ra, không lưu): Đã xong và có ≥ 1 thẻ hạn
   * ≤ hôm nay (server), xếp theo id. Server luôn gửi; tuỳ chọn trong kiểu để dữ liệu kiểu phase 2a vẫn hợp lệ.
   */
  canOnLai?: string[]
  /**
   * Bước 2: số bản ghi (trạng thái, lịch sử, lượt mở, 4 bước, ghi chú, thẻ, giờ học, sổ nội dung, bản chụp duyệt)
   * thuộc mục không còn trong cây — giữ trong DB, không tính tiến độ (bất biến 8); > 0 thì Tổng quan hiện banner
   * "n bản ghi thuộc mục không còn trong cây". Server luôn gửi; tuỳ chọn trong kiểu như canOnLai.
   */
  banGhiNgoaiCay?: number
}

/** Body của PUT /api/trang-thai/:id */
export interface YeuCauDatTrangThai {
  trangThai: TrangThaiHoc
  /** Chỉ với 'bo-qua'; chuỗi rỗng = không có lý do */
  lyDo?: string
  /** Mặc định 'mot-muc'; Hoàn tác gửi 'hoan-tac' */
  via?: ViaMotMuc
}

/** Giá trị trạng thái học kèm lý do, dạng TrangThaiHoc (để Hoàn tác gửi lại nguyên văn). */
export interface GiaTriTrangThai {
  trangThai: TrangThaiHoc
  lyDo?: string
}

/** Phản hồi PUT /api/trang-thai/:id */
export interface KetQuaDatTrangThai {
  revision: number
  id: string
  /** Mục mới trong ảnh chụp; null = Chưa học (đã xoá hàng) */
  muc: MucTrangThai | null
  /** Giá trị mới */
  sau: GiaTriTrangThai
  /** Giá trị trước khi đổi — Hoàn tác gửi lại đúng giá trị này với via 'hoan-tac' */
  truoc: GiaTriTrangThai
  /** false khi giá trị mới trùng giá trị cũ (không ghi gì, revision giữ nguyên) */
  daDoi: boolean
}

/** Phản hồi POST /api/luot-mo/:id */
export interface KetQuaGhiLuotMo {
  revision: number
  id: string
  /** ISO UTC */
  lanMoCuoi: string
}

/** MucTrangThai (hoặc không có) → GiaTriTrangThai. */
export function giaTriCua(muc: MucTrangThai | null | undefined): GiaTriTrangThai {
  const trangThai = tuDb(muc?.status)
  return muc?.lyDoBoQua !== undefined ? { trangThai, lyDo: muc.lyDoBoQua } : { trangThai }
}

/** GiaTriTrangThai → MucTrangThai (Chưa học → null). Lý do rỗng / chỉ khoảng trắng = không có lý do. */
export function mucCua(giaTri: GiaTriTrangThai): MucTrangThai | null {
  const status = sangDb(giaTri.trangThai)
  if (!status) return null
  const lyDo = giaTri.lyDo?.trim()
  return status === 'skip' && lyDo ? { status, lyDoBoQua: lyDo } : { status }
}

// ---------- Đặt hàng loạt (Danh sách, trang Lĩnh vực — đề xuất 3.9, bất biến 2) ----------

/** Trạng thái được đặt hàng loạt: không có Đã xong (bất biến 2 — Đã xong đặt từng mục ở trang bài). */
export const CAC_TRANG_THAI_HANG_LOAT = ['chua-hoc', 'dang-hoc', 'bo-qua'] as const
export type TrangThaiHangLoat = (typeof CAC_TRANG_THAI_HANG_LOAT)[number]

/** Body của POST /api/trang-thai/hang-loat */
export interface YeuCauDatHangLoat {
  /** id mục học, 1..soMucHoc, không trùng */
  ids: string[]
  trangThai: TrangThaiHangLoat
}

/** Phản hồi POST /api/trang-thai/hang-loat */
export interface KetQuaDatHangLoat {
  revision: number
  trangThai: TrangThaiHangLoat
  /** id các mục đã đổi, theo thứ tự gửi; mục đang ở đúng trạng thái đó thì giữ nguyên (kể cả lý do Bỏ qua) */
  daDoi: string[]
  /** Giá trị trước khi đổi của từng mục trong daDoi — Hoàn tác gửi lại nguyên văn */
  truoc: Record<string, GiaTriTrangThai>
}

/** Body của POST /api/trang-thai/hang-loat/hoan-tac: đúng `trangThai` và `truoc` của lần đặt hàng loạt. */
export interface YeuCauHoanTacHangLoat {
  trangThai: TrangThaiHangLoat
  truoc: Record<string, GiaTriTrangThai>
}

/** Phản hồi POST /api/trang-thai/hang-loat/hoan-tac */
export interface KetQuaHoanTacHangLoat {
  revision: number
  /** id các mục đã trả về giá trị cũ */
  daKhoiPhuc: string[]
  /**
   * id các mục giữ nguyên: đã đổi sau lần đặt hàng loạt, hoặc giá trị cũ gửi lên không khớp giá trị cũ server đã
   * ghi cho lần đó (status_events) — Hoàn tác không bao giờ đặt được giá trị mục chưa từng có (bất biến 2)
   */
  giuNguyen: string[]
}
