import { nowIso } from '../../shared/clock.ts'
import { docFrontmatter } from '../../shared/noi-dung/index.ts'
import type { Db } from '../db/index.ts'
import { bamNoiDung } from '../noi-dung/bam.ts'

// Bản chụp lúc duyệt (content_approvals, đề xuất 1.6 "Bảo vệ bản Đã duyệt", 2.1). Bản chụp hiện hành của một
// mục = hàng có superseded_at IS NULL (DB bảo đảm tối đa 1 hàng). Ghi bản chụp: chupBanDuyet (◎ "Nhận là Đã
// duyệt" ở phase 2b; Duyệt bài, duyệt bản sửa ở phase 7a dùng lại). "Giữ bản cũ" không tạo bản chụp mới.

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

export interface ChupBan {
  itemId: string
  /** Toàn văn file đúng như trên đĩa (hash = sha256 của chuỗi này theo UTF-8) */
  noiDung: string
  /** YYYY-MM-DD; mặc định ngay_duyet trong frontmatter của noiDung */
  ngayDuyet?: string
}

/**
 * Chụp một bản duyệt mới cho mục: bản hiện hành cũ (nếu có) đặt superseded_at, rồi thêm bản mới. Gọi trong
 * transaction của thao tác (cùng file_ops). ◎ "Nhận là Đã duyệt": giữ ngay_duyet trong file (đề xuất 1.6).
 * @throws Error khi không có ngày duyệt (không truyền và frontmatter không có ngay_duyet hợp lệ)
 */
export function chupBanDuyet(db: Db, ban: ChupBan): BanChupDuyet {
  const ngay = ban.ngayDuyet ?? docFrontmatter(ban.noiDung).frontmatter?.ngayDuyet
  if (!ngay || !/^\d{4}-\d{2}-\d{2}$/.test(ngay)) {
    throw new Error(`Bản chụp duyệt của mục ${ban.itemId} cần ngày duyệt YYYY-MM-DD.`)
  }
  const luc = nowIso()
  db.prepare(
    'UPDATE content_approvals SET superseded_at = ?, updated_at = ? WHERE item_id = ? AND superseded_at IS NULL',
  ).run(luc, luc, ban.itemId)
  const hash = bamNoiDung(ban.noiDung)
  const kq = db
    .prepare(
      `INSERT INTO content_approvals (item_id, approved_on, hash, body, superseded_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`,
    )
    .run(ban.itemId, ngay, hash, ban.noiDung, luc, luc)
  return {
    id: Number(kq.lastInsertRowid),
    itemId: ban.itemId,
    ngayDuyet: ngay,
    hash,
    noiDung: ban.noiDung,
  }
}

/** Hash bản chụp hiện hành của mọi mục (cho kiểm bất biến 5). */
export function docHashBanChupHienHanh(db: Db): Map<string, string> {
  const ds = db
    .prepare('SELECT item_id AS itemId, hash FROM content_approvals WHERE superseded_at IS NULL')
    .all() as { itemId: string; hash: string }[]
  return new Map(ds.map((d) => [d.itemId, d.hash]))
}

/** Dòng content_approvals không kèm toàn văn: để chụp trước / khôi phục khi Hoàn tác một lần nhập. */
export interface DongDuyet {
  id: number
  itemId: string
  supersededAt: string | null
}

export function docDongDuyet(db: Db): DongDuyet[] {
  return db
    .prepare(
      'SELECT id, item_id AS itemId, superseded_at AS supersededAt FROM content_approvals ORDER BY id',
    )
    .all() as DongDuyet[]
}
