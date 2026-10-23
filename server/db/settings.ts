import type { Db } from './index.ts'

// Bảng settings(key, value): giá trị luôn là chuỗi, null khi chưa có.

export function docSetting(db: Db, key: string): string | null {
  const dong = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    { value: string | null } | undefined
  return dong?.value ?? null
}

export function ghiSetting(db: Db, key: string, value: string): void {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, value)
}

/** Số tăng mỗi lần dữ liệu học đổi; web so để biết khi nào tải lại. */
export function layRevision(db: Db): number {
  return Number(docSetting(db, 'revision') ?? 0)
}

/** Gọi trong mọi thao tác ghi (cùng transaction với thao tác đó). */
export function tangRevision(db: Db): number {
  const dong = db
    .prepare(
      `INSERT INTO settings (key, value) VALUES ('revision', '1')
       ON CONFLICT(key) DO UPDATE SET value = CAST(value AS INTEGER) + 1
       RETURNING value`,
    )
    .get() as { value: string | number }
  return Number(dong.value)
}
