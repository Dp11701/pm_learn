import { congNgay } from '../../shared/lich.ts'

// Hợp đồng API flashcard (phase 3; đề xuất 2.1, 3.5; Cần chốt 5) + quy tắc Leitner thuần — TS thuần, không phụ
// thuộc Node: server (du-lieu/the.ts, routes/the.ts) và web cùng import.
// - POST   /api/the                 { itemId, truoc, sau, khoaCau? } → KetQuaGhiThe (thẻ mới: hộp 1, hạn ngày mai)
// - PUT    /api/the/:id             { truoc?, sau? }                 → KetQuaSuaThe
// - DELETE /api/the/:id                                              → KetQuaGhiThe (the = thẻ vừa xoá)
// - POST   /api/the/:id/khoi-phuc   Hoàn tác xoá: cùng id, giữ hộp, hạn, lịch sử ôn → KetQuaGhiThe
// Phiên ôn (ghi Nhớ / Quên): hợp đồng ở mục "Phiên ôn" cuối file; quy tắc chuyển hộp là sauKhiOn (ghi: ghiLanOn
// ở du-lieu/the.ts).

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

// ---------- Phiên ôn (bước 3; đề xuất 3.3, 3.5) ----------
// - GET  /api/on-tap          → AnhChupOnTap (server quyết "hôm nay")
// - POST /api/on-tap/:theId   { ket, luyenThem? } → KetQuaOnThe
//   · luyenThem false/thiếu: lần ôn thật — Leitner (sauKhiOn) theo ngày ôn = hôm nay của server, ghi lịch sử ôn
//     (tính tỉ lệ nhớ), tăng revision; thẻ chưa đến hạn → 409 (bấm hai lần không đẩy hộp hai lần).
//   · luyenThem true: vòng "Ôn lại n thẻ đã quên" — không đổi hộp, hạn, không ghi lịch sử, không tăng revision.
//   Thẻ không có, hoặc mục của thẻ không còn trong cây (bất biến 8) → 404.
// Thẻ của mục không còn trong cây không vào danh sách, số hộp, tổng thẻ, tỉ lệ nhớ.

/** Số ngày tính tỉ lệ nhớ (gồm cả hôm nay). */
export const SO_NGAY_TI_LE_NHO = 30

/** Thẻ trong phiên ôn: TheHoc (trừ khoaCau) + lúc tạo (ISO UTC, để xếp). */
export interface TheOn {
  id: number
  itemId: string
  truoc: string
  sau: string
  hop: number
  hanOn: string
  taoLuc: string
}

/** Số thẻ theo hộp Leitner 1–5. */
export type SoTheTheoHop = Record<1 | 2 | 3 | 4 | 5, number>

export interface AnhChupOnTap {
  revision: number
  /** Hôm nay của server (YYYY-MM-DD) */
  homNay: string
  /** Mọi thẻ hạn ≤ homNay, xếp hạn → hộp → lúc tạo (→ id) */
  denHan: TheOn[]
  /** Số thẻ (mọi thẻ) theo hộp */
  hop: SoTheTheoHop
  tongThe: number
  /** Số lần Nhớ / tổng lần ôn thật trong SO_NGAY_TI_LE_NHO ngày gần nhất (0–1); null khi chưa ôn lần nào */
  tiLeNho30: number | null
  /** Tử số và mẫu số của tiLeNho30 */
  lanOn30: { nho: number; tong: number }
  /** Hạn sớm nhất sau hôm nay; null khi không có thẻ nào hạn sau hôm nay */
  hanKeTiep: string | null
}

export interface YeuCauOnThe {
  ket: KetQuaOn
  /** Vòng luyện thêm: không đổi hộp, không tính tỉ lệ nhớ */
  luyenThem?: boolean
}

export interface KetQuaOnThe {
  revision: number
  /** false với vòng luyện thêm */
  daDoi: boolean
  luyenThem: boolean
  ket: KetQuaOn
  /** Thẻ sau lần ôn */
  the: TheOn
  /** Thẻ trước lần ôn */
  truoc: TheOn
}

/** Ngày đầu của cửa sổ tỉ lệ nhớ kết thúc ở `homNay` (gồm cả hai đầu). */
export function ngayDauTiLeNho(homNay: string): string {
  return congNgay(homNay, 1 - SO_NGAY_TI_LE_NHO)
}

/** Thứ tự phiên ôn: hạn → hộp → lúc tạo → id. */
export function soThuTuOn(a: TheOn, b: TheOn): number {
  if (a.hanOn !== b.hanOn) return a.hanOn < b.hanOn ? -1 : 1
  if (a.hop !== b.hop) return a.hop - b.hop
  if (a.taoLuc !== b.taoLuc) return a.taoLuc < b.taoLuc ? -1 : 1
  return a.id - b.id
}
