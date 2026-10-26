import { congNgay } from '../../shared/lich.ts'

// Hợp đồng API flashcard (phase 3; đề xuất 2.1, 3.5; Cần chốt 5) + quy tắc Leitner thuần — TS thuần, không phụ
// thuộc Node: server (du-lieu/the.ts, routes/the.ts) và web cùng import.
// - POST   /api/the                 { itemId, truoc, sau, khoaCau? } → KetQuaGhiThe (thẻ mới: hộp 1, hạn ngày mai)
// - PUT    /api/the/:id             { truoc?, sau? }                 → KetQuaSuaThe
// - DELETE /api/the/:id                                              → KetQuaGhiThe (the = thẻ vừa xoá)
// - POST   /api/the/:id/khoi-phuc   Hoàn tác xoá: cùng id, giữ hộp, hạn, lịch sử ôn → KetQuaGhiThe
// Phiên ôn (ghi Nhớ / Quên) là phase 8; quy tắc chuyển hộp đã có ở đây (sauKhiOn) và ở du-lieu/the.ts (ghiLanOn).

/** Một flashcard. */
export interface TheHoc {
  id: number
  itemId: string
  truoc: string
  sau: string
  /** Hộp Leitner 1–5 */
  hop: number
  /** Ngày đến hạn ôn (YYYY-MM-DD, ngày lịch server) */
  hanOn: string
  /** Khoá câu Tự kiểm tra khi tạo từ câu đó ("Tạo flashcard"); null khi tự gõ */
  khoaCau: string | null
}

export interface YeuCauTaoThe {
  itemId: string
  truoc: string
  sau: string
  khoaCau?: string | null
}

export interface YeuCauSuaThe {
  truoc?: string
  sau?: string
}

export interface KetQuaGhiThe {
  revision: number
  daDoi: boolean
  the: TheHoc
}

export interface KetQuaSuaThe extends KetQuaGhiThe {
  /** Thẻ trước khi sửa */
  truoc: TheHoc
}

/** Mặt thẻ dài tối đa (ký tự, sau khi bỏ khoảng trắng hai đầu). */
export const MAT_THE_TOI_DA = 2000

// ---------- Leitner (đề xuất 3.5) ----------

export const HOP_TOI_DA = 5
/** Số ngày tới lần ôn sau theo hộp MỚI (hộp 1…5), cộng theo ngày lịch. */
export const KHOANG_ON_NGAY: Readonly<Record<number, number>> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 }

export type KetQuaOn = 'nho' | 'quen'

/** Thẻ mới: hộp 1, hạn = ngày mai (theo ngày lịch của server). */
export function theMoi(homNay: string): { hop: number; hanOn: string } {
  return { hop: 1, hanOn: congNgay(homNay, KHOANG_ON_NGAY[1]) }
}

/**
 * Sau một lần ôn ngày `ngayOn` (YYYY-MM-DD theo giờ server): Nhớ lên 1 hộp (tối đa 5), Quên về hộp 1;
 * hạn = ngayOn + 1/2/4/8/16 ngày theo hộp mới, cộng trên ngày lịch (không theo mili-giây, nên đúng cả lúc đổi DST).
 */
export function sauKhiOn(
  hop: number,
  ketQua: KetQuaOn,
  ngayOn: string,
): { hop: number; hanOn: string } {
  if (!Number.isInteger(hop) || hop < 1 || hop > HOP_TOI_DA) {
    throw new RangeError(`Hộp không hợp lệ: ${hop}`)
  }
  const moi = ketQua === 'nho' ? Math.min(hop + 1, HOP_TOI_DA) : 1
  return { hop: moi, hanOn: congNgay(ngayOn, KHOANG_ON_NGAY[moi]) }
}

/** Thẻ đến hạn hôm nay: hạn ≤ homNay. */
export function denHan(the: Pick<TheHoc, 'hanOn'>, homNay: string): boolean {
  return the.hanOn <= homNay
}
