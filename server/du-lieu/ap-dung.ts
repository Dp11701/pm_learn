import type { MauBai } from '../../shared/roadmap/types.ts'
import type { TinhTrangBuoc } from '../../shared/domain/trang-thai.ts'

// Hợp đồng API bước Áp dụng (đề xuất 2.1 bảng practice, 3.2; §1 "Hoặc chọn Không áp dụng và ghi lý do") —
// TS thuần, không phụ thuộc Node: server (routes/ap-dung.ts) dùng để ghi DB và trả phản hồi, web
// (src/app/du-lieu/ap-dung.ts) import để đọc phản hồi. Giá trị state lưu DB dùng thẳng làm giá trị API.
// Không có hàng / không có khoá = bước Áp dụng chưa làm.
//
// Phase 2a chỉ có "Không áp dụng" của Chứng chỉ (khối Kế hoạch thi, trước phase 11 là ô C38 kèm nút này) để
// chứng chỉ xong được bước Áp dụng ngay ở P0. Phase 3 thêm Chủ đề / Tài liệu vào MAU_DANH_DAU_DUOC và các
// trường dự án, kết quả, tiêu chí.

export const CAC_TRANG_THAI_AP_DUNG = ['dang-lam', 'xong', 'khong-ap-dung'] as const
export type TrangThaiApDung = (typeof CAC_TRANG_THAI_AP_DUNG)[number]

/** Lý do Không áp dụng: bắt buộc, sau khi bỏ khoảng trắng hai đầu dài 1–500 ký tự. */
export const LY_DO_AP_DUNG_TOI_DA = 500

/** Mẫu bài được đánh dấu Không áp dụng qua API. Phase 3 thêm 'chu-de', 'tai-lieu'. */
export const MAU_DANH_DAU_DUOC: readonly MauBai[] = ['chung-chi']

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
