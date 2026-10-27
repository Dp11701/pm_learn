import type { Db } from '../db/index.ts'

// Bản ghi vừa xoá (bảng deleted_rows) cho Hoàn tác xoá thẻ / phiên giờ (đề xuất 3.4, 3.5): xoá thật khỏi bảng
// chính (thẻ kéo theo lịch sử ôn — ON DELETE CASCADE), giữ bản JSON ở đây để khôi phục đúng id. Giữ 1 ngày rồi
// dọn ở lần xoá sau. Gọi trong transaction của thao tác xoá / khôi phục.

export type BangCoHoanTac = 'flashcards' | 'time_entries'

/** Giữ bản ghi vừa xoá tối đa chừng này (ms). */
export const GIU_BAN_XOA_MS = 24 * 60 * 60 * 1000

export function catBanXoa(
  db: Db,
  bang: BangCoHoanTac,
  rowId: number,
  duLieu: unknown,
  luc: number,
): void {
  const at = new Date(luc).toISOString()
  db.prepare('DELETE FROM deleted_rows WHERE deleted_at < ?').run(
    new Date(luc - GIU_BAN_XOA_MS).toISOString(),
  )
  db.prepare(
    `INSERT INTO deleted_rows (tbl, row_id, data, deleted_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(tbl, row_id) DO UPDATE SET data = excluded.data, deleted_at = excluded.deleted_at`,
  ).run(bang, rowId, JSON.stringify(duLieu), at)
}

/**
 * Bản vừa xoá thuộc mục không còn trong cây (thay file cây sau lần xoá): khôi phục là ghi bản ghi mới nên bị từ
 * chối (bất biến 8); bản xoá vẫn giữ tới hạn dọn.
 */
export interface MucKhongCon {
  mucKhongCon: string
}

/** Đọc bản vừa xoá mà KHÔNG gỡ (để kiểm trước khi khôi phục); undefined khi không có. */
export function xemBanXoa<T>(db: Db, bang: BangCoHoanTac, rowId: number): T | undefined {
  const dong = db
    .prepare('SELECT data FROM deleted_rows WHERE tbl = ? AND row_id = ?')
    .get(bang, rowId) as { data: string } | undefined
  return dong && (JSON.parse(dong.data) as T)
}

/** Lấy (và gỡ) bản vừa xoá; undefined khi không có. */
export function layBanXoa<T>(db: Db, bang: BangCoHoanTac, rowId: number): T | undefined {
  const dong = db
    .prepare('SELECT id, data FROM deleted_rows WHERE tbl = ? AND row_id = ?')
    .get(bang, rowId) as { id: number; data: string } | undefined
  if (!dong) return undefined
  db.prepare('DELETE FROM deleted_rows WHERE id = ?').run(dong.id)
  return JSON.parse(dong.data) as T
}
