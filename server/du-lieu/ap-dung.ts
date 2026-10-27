import type { TinhTrangBuoc } from '../../shared/domain/trang-thai.ts'

// Hợp đồng API bước Áp dụng (đề xuất 2.1 bảng practice, 3.2; §1 "Hoặc chọn Không áp dụng và ghi lý do") —
// TS thuần, không phụ thuộc Node: server (routes/ap-dung.ts) dùng để ghi DB và trả phản hồi; web import hằng
// (CAC_TRANG_THAI_AP_DUNG, LY_DO_AP_DUNG_TOI_DA). Giá trị state lưu DB dùng thẳng làm giá trị API.
// Không có hàng / không có khoá = bước Áp dụng chưa làm.
//
// Đường đầy đủ là PUT /api/hoc/:id/thuc-hanh (hop-dong-hoc.ts) cho MỌI mẫu bài; /api/ap-dung (phase 2a) là lối tắt
// (bí danh) của đường đó, web phase 3 không còn gọi.

export const CAC_TRANG_THAI_AP_DUNG = ['dang-lam', 'xong', 'khong-ap-dung'] as const
export type TrangThaiApDung = (typeof CAC_TRANG_THAI_AP_DUNG)[number]

/** Lý do Không áp dụng: bắt buộc, sau khi bỏ khoảng trắng hai đầu dài 1–500 ký tự. */
export const LY_DO_AP_DUNG_TOI_DA = 500

/** Một mục trong dữ liệu Áp dụng. */
export interface MucApDung {
  trangThai: TrangThaiApDung
  /** Chỉ khi trangThai = 'khong-ap-dung' (luôn có chữ) */
  lyDo?: string
}

/** GET /api/ap-dung */
export interface AnhChupApDung {
  /** Revision của DB lúc đọc (như /api/state): web so với /api/meta để biết khi nào tải lại */
  revision: number
  /** id nút → Áp dụng; không có khoá = chưa làm */
  apDung: Record<string, MucApDung>
}

/** Body của PUT /api/ap-dung/:id */
export interface YeuCauKhongApDung {
  khongApDung: true
  lyDo: string
}

/** Phản hồi PUT / DELETE /api/ap-dung/:id */
export interface KetQuaGhiApDung {
  revision: number
  id: string
  /** Giá trị mới; null = chưa làm (không còn hàng) */
  muc: MucApDung | null
  /** Giá trị trước khi ghi — Hoàn tác dựa vào đây (lý do cũ → PUT lại, null → DELETE) */
  truoc: MucApDung | null
  /** false khi không có gì đổi (cùng lý do, hoặc bỏ đánh dấu khi chưa đánh dấu): không ghi, revision giữ nguyên */
  daDoi: boolean
}

/** Lý do Không áp dụng của một mục; undefined khi mục không ở trạng thái Không áp dụng. */
export function lyDoKhongApDung(muc: MucApDung | null | undefined): string | undefined {
  return muc?.trangThai === 'khong-ap-dung' ? muc.lyDo : undefined
}

/** Tình trạng bước Áp dụng trên thanh 4 bước theo dữ liệu đã lưu (chưa có hàng = chưa làm). */
export function buocApDung(muc: MucApDung | null | undefined): TinhTrangBuoc {
  return muc?.trangThai ?? 'chua-lam'
}
