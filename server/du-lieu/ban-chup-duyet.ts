import type { Db } from '../db/index.ts'

// Bản chụp lúc duyệt (content_approvals, đề xuất 1.6 "Bảo vệ bản Đã duyệt", 2.1). Phase 2a chỉ ĐỌC
// (bộ mẫu điền sẵn); ghi bản chụp khi duyệt / Giữ bản cũ / Nhận là Đã duyệt có ở phase 2b, 7a.
// Bản chụp hiện hành của một mục = hàng có superseded_at IS NULL (DB bảo đảm tối đa 1 hàng).

export interface BanChupDuyet {
  id: number
  itemId: string
  /** YYYY-MM-DD (ngay_duyet) */
  ngayDuyet: string
  /** sha256 của toàn file lúc duyệt */
  hash: string
  /** Toàn văn file lúc duyệt */
  noiDung: string
}

/** Thông tin bản chụp không kèm toàn văn (cho danh sách). */
export type TomTatBanChup = Omit<BanChupDuyet, 'noiDung'>

const COT = 'id, item_id AS itemId, approved_on AS ngayDuyet, hash'

/** Bản chụp hiện hành của một mục; undefined = mục chưa từng được duyệt (hoặc DB chưa có bản chụp). */
export function docBanChupHienHanh(db: Db, itemId: string): BanChupDuyet | undefined {
  return db
    .prepare(
      `SELECT ${COT}, body AS noiDung FROM content_approvals
       WHERE item_id = ? AND superseded_at IS NULL`,
    )
    .get(itemId) as BanChupDuyet | undefined
}

/** Bản chụp hiện hành của mọi mục (không kèm toàn văn), khoá theo id nút. */
export function docCacBanChupHienHanh(db: Db): Map<string, TomTatBanChup> {
  const cacDong = db
    .prepare(`SELECT ${COT} FROM content_approvals WHERE superseded_at IS NULL ORDER BY item_id`)
    .all() as TomTatBanChup[]
  return new Map(cacDong.map((d) => [d.itemId, d]))
}

/** Mục có bản chụp nào chưa (kể cả bản đã bị thay) — để phân biệt ca ◎ "Đã duyệt nhưng app chưa có bản chụp". */
export function coBanChup(db: Db, itemId: string): boolean {
  return (
    db.prepare('SELECT 1 FROM content_approvals WHERE item_id = ? LIMIT 1').get(itemId) !==
    undefined
  )
}
