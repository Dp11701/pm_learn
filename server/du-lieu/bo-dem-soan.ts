import { nowIso } from '../../shared/clock.ts'
import type { Db } from '../db/index.ts'

// Bản tạm của trình soạn (editor_buffers, đề xuất 1.7, 2.1, 3.6): khoá là đường dẫn file (trình soạn, phase
// 7b) hoặc nhap:<token>:<i> (file nhập lỗi "Mở trong trình soạn", không ghi ra đĩa). Không phải file nội dung.

export interface BoDem {
  key: string
  /** null: file nhập lỗi chưa khớp mục nào */
  itemId: string | null
  text: string
  /** sha256 của file lúc mở trình soạn; null = chưa có file */
  baseHash: string | null
  updatedAt: string
}

/** Khoá bản tạm của file thứ i trong lô nhập `token` (đề xuất 1.7). */
export function khoaBoDemNhap(token: string, chiSo: number): string {
  return `nhap:${token}:${chiSo}`
}

export function docBoDem(db: Db, key: string): BoDem | undefined {
  return db
    .prepare(
      `SELECT key, item_id AS itemId, text, base_hash AS baseHash, updated_at AS updatedAt
       FROM editor_buffers WHERE key = ?`,
    )
    .get(key) as BoDem | undefined
}

/** @param bd.updatedAt mặc định bây giờ (lô nhập truyền đúng lúc tạo lô để biết bản tạm chưa sửa) */
export function ghiBoDem(
  db: Db,
  bd: {
    key: string
    itemId: string | null
    text: string
    baseHash: string | null
    updatedAt?: string
  },
): void {
  db.prepare(
    `INSERT INTO editor_buffers (key, item_id, text, base_hash, updated_at)
     VALUES (@key, @itemId, @text, @baseHash, @updatedAt)
     ON CONFLICT(key) DO UPDATE SET item_id = excluded.item_id, text = excluded.text,
       base_hash = excluded.base_hash, updated_at = excluded.updated_at`,
  ).run({ ...bd, updatedAt: bd.updatedAt ?? nowIso() })
}

export function xoaBoDem(db: Db, key: string): void {
  db.prepare('DELETE FROM editor_buffers WHERE key = ?').run(key)
}

/** Mọi bản tạm của file nhập lỗi (khoá nhap:*). */
export function dsBoDemNhap(db: Db): BoDem[] {
  return db
    .prepare(
      `SELECT key, item_id AS itemId, text, base_hash AS baseHash, updated_at AS updatedAt
       FROM editor_buffers WHERE key GLOB 'nhap:*' ORDER BY key`,
    )
    .all() as BoDem[]
}

/** Xoá mọi bản tạm của một lô nhập (token hết hạn / đã nhập). */
export function xoaBoDemCuaLo(db: Db, token: string): number {
  // Khoá do server tạo (token chỉ gồm chữ / số / -); GLOB thoát ký tự đặc biệt cho chắc
  const mau = `nhap:${token.replace(/[*?[\]]/g, (c) => `[${c}]`)}:*`
  return db.prepare('DELETE FROM editor_buffers WHERE key GLOB ?').run(mau).changes
}
