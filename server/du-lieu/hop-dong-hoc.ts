import type { TrangThaiApDung } from './ap-dung.ts'
import type { TheHoc } from './hop-dong-the.ts'

// Hợp đồng API dữ liệu học của một mục (phase 3; đề xuất 2.1, 3.2, 3.5; Cần chốt 6) — TS thuần, không phụ thuộc
// Node: server (routes/hoc.ts, routes/du-an.ts) dùng để ghi DB và trả phản hồi, web import để đọc phản hồi.
// - GET /api/hoc/:id                       DuLieuHoc
// - PUT /api/hoc/:id/noi-lai               { text }                         → KetQuaGhiNoiLai
// - PUT /api/hoc/:id/thuc-hanh             YeuCauThucHanh                   → KetQuaGhiThucHanh
// - PUT /api/hoc/:id/tu-kiem-tra/:khoa     { traLoi?, daXem?, cham? }      → KetQuaGhiTuKiemTra
// - PUT /api/hoc/:id/ghi-chu               { text }                         → KetQuaGhiGhiChu
// - GET /api/du-an                         DuAn[];  POST /api/du-an { ten, vaiTro?, giaiDoan? } → KetQuaThemDuAn
// Mọi lần ghi tăng revision (như /api/trang-thai) và trả { revision, daDoi }; daDoi false = không có gì đổi,
// không ghi, revision giữ nguyên. id không phải mục học của cây → 404 (bất biến 8). Thời điểm ISO UTC do server.

/** Chữ đã lưu kèm lúc lưu gần nhất (ISO UTC) — Nói lại, Ghi chú. */
export interface VanBanLuu {
  text: string
  capNhat: string
}

/** Bước Áp dụng (bảng practice). Không có hàng = trangThai null, các trường rỗng. */
export interface ThucHanh {
  /** null = chưa làm */
  trangThai: TrangThaiApDung | null
  duAnId: number | null
  /** "Kết quả của bạn" (Markdown); '' khi chưa viết */
  ketQua: string
  /** Tiêu chí tự kiểm đã tick: khoá tiêu chí (taoKhoa của shared/noi-dung) → true */
  tieuChi: Record<string, boolean>
  /** Chỉ khi trangThai = 'khong-ap-dung' */
  lyDo: string | null
  /** Lúc đánh dấu Xong (ISO UTC); null khi chưa Xong */
  xongLuc: string | null
}

export const CAC_DIEM_CHAM = ['dung', 'mot-phan', 'sai'] as const
export type DiemCham = (typeof CAC_DIEM_CHAM)[number]

/** Một câu Tự kiểm tra (bảng self_check). Không có khoá = chưa trả lời. */
export interface CauTuKiemTra {
  traLoi: string
  daXem: boolean
  /** Lần chấm mới nhất; null = chưa chấm */
  cham: DiemCham | null
  chamLuc: string | null
}

/** GET /api/hoc/:id */
export interface DuLieuHoc {
  revision: number
  noiLai: VanBanLuu | null
  thucHanh: ThucHanh
  /** khoá câu (taoKhoa) → câu đã trả lời / xem / chấm */
  tuKiemTra: Record<string, CauTuKiemTra>
  ghiChu: VanBanLuu | null
  /** Thẻ của mục, cũ trước */
  the: TheHoc[]
  /** Phase 7c điền (Bản của tôi); giờ luôn false */
  banCuaToi: { coHoanThanh: boolean }
  /** P1 (kế hoạch thi); giờ luôn false */
  keHoachThi: { coNgayThi: boolean }
  /** Tổng giây đã học của mục (phiên đã ghi; không gồm đồng hồ đang chạy) — "Đã học 35 phút" */
  daHocGiay: number
}

/** Body của PUT /api/hoc/:id/noi-lai và /ghi-chu: chữ chỉ có khoảng trắng = xoá. */
export interface YeuCauVanBan {
  text: string
}

export interface KetQuaGhiNoiLai {
  revision: number
  daDoi: boolean
  noiLai: VanBanLuu | null
}

export interface KetQuaGhiGhiChu {
  revision: number
  daDoi: boolean
  ghiChu: VanBanLuu | null
}

/**
 * Body của PUT /api/hoc/:id/thuc-hanh (gửi trường nào đổi trường đó, cần ít nhất một):
 * - trangThai null = về chưa làm (còn dự án / kết quả / tiêu chí thì thành 'dang-lam');
 * - 'khong-ap-dung' cần lyDo (1–500 ký tự sau khi bỏ khoảng trắng hai đầu), gửi kèm hoặc đã có;
 * - 'xong' (Chủ đề) cần ketQua có chữ (gửi kèm hoặc đã có); xoá hết ketQua khi đang Xong → 'dang-lam';
 * - ghi duAnId / ketQua / tieuChi khi chưa làm → 'dang-lam';
 * - tieuChi là bản vá: { khoá: true } tick, { khoá: false } bỏ tick;
 * - Tài liệu / Chứng chỉ chỉ nhận trangThai 'khong-ap-dung' | null và lyDo (409 cho trường khác).
 */
export interface YeuCauThucHanh {
  trangThai?: TrangThaiApDung | null
  duAnId?: number | null
  ketQua?: string
  tieuChi?: Record<string, boolean>
  lyDo?: string
}

export interface KetQuaGhiThucHanh {
  revision: number
  daDoi: boolean
  thucHanh: ThucHanh
  /** Giá trị trước khi ghi — Hoàn tác gửi lại trangThai / lyDo này */
  truoc: ThucHanh
}

/**
 * Body của PUT /api/hoc/:id/tu-kiem-tra/:khoa (cần ít nhất một trường). daXem chỉ true và chỉ khi câu trả lời
 * có chữ (409); cham chỉ sau khi đã xem đáp án (409), giữ lần chấm mới nhất.
 */
export interface YeuCauTuKiemTra {
  traLoi?: string
  daXem?: true
  cham?: DiemCham
}

export interface KetQuaGhiTuKiemTra {
  revision: number
  daDoi: boolean
  khoa: string
  /** null = câu không còn dữ liệu (trả lời rỗng, chưa xem, chưa chấm) */
  cau: CauTuKiemTra | null
  truoc: CauTuKiemTra | null
}

/** Dự án thực hành (bảng projects). */
export interface DuAn {
  id: number
  ten: string
  vaiTro: string | null
  giaiDoan: string | null
}

export interface YeuCauThemDuAn {
  ten: string
  vaiTro?: string | null
  giaiDoan?: string | null
}

export interface KetQuaThemDuAn {
  revision: number
  daDoi: true
  duAn: DuAn
}

// ---------- Giới hạn (ký tự, sau khi bỏ khoảng trắng hai đầu với trường bắt buộc) ----------

export const NOI_LAI_TOI_DA = 5000
export const GHI_CHU_TOI_DA = 50_000
export const KET_QUA_TOI_DA = 20_000
export const TRA_LOI_TOI_DA = 5000
export const TIEU_CHI_TOI_DA = 50
export const TEN_DU_AN_TOI_DA = 200
/** Vai trò, giai đoạn của dự án */
export const THUOC_TINH_DU_AN_TOI_DA = 200

/**
 * Khoá câu tự kiểm tra / tiêu chí: bam() 11 ký tự base36 của shared/noi-dung, câu trùng thêm '#n'. Server chỉ
 * kiểm dạng (không đọc bài): chữ thường a–z, số, tuỳ chọn '#n', tối đa 40 ký tự.
 */
export const MAU_KHOA_CAU = /^[0-9a-z]{1,32}(#[1-9][0-9]{0,5})?$/

/** Thực hành khi chưa có hàng nào. */
export const THUC_HANH_TRONG: ThucHanh = {
  trangThai: null,
  duAnId: null,
  ketQua: '',
  tieuChi: {},
  lyDo: null,
  xongLuc: null,
}
