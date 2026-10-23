import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { dsMigration, type Migration } from './migrations.ts'

// Mở SQLite và chạy migration theo PRAGMA user_version (đề xuất 2.1).

export type Db = Database.Database

export function moKetNoi(duongDan: string): Db {
  fs.mkdirSync(path.dirname(duongDan), { recursive: true })
  const db = new Database(duongDan)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  return db
}

export function layPhienBan(db: Db): number {
  return db.pragma('user_version', { simple: true }) as number
}

/** DB đã có bảng nào chưa (DB mới tạo thì chưa). */
export function dbCoDuLieu(db: Db): boolean {
  const dong = db.prepare('SELECT count(*) AS n FROM sqlite_master').get() as { n: number }
  return dong.n > 0
}

export interface TuyChonSchema {
  migrations?: Migration[]
  /** Gọi trước khi chạy migration trên DB đã có dữ liệu (sao lưu). */
  truocMigration?: () => Promise<void>
}

/** Đưa schema lên bản mới nhất; mỗi migration một transaction. Trả về số migration đã chạy. */
export async function capNhatSchema(db: Db, tuyChon: TuyChonSchema = {}): Promise<number> {
  const ds = tuyChon.migrations ?? dsMigration
  const batDau = layPhienBan(db)
  if (batDau > ds.length) {
    throw new Error(
      `DB ở phiên bản ${batDau}, mới hơn app (${ds.length}). Hãy cập nhật app trước khi mở DB này.`,
    )
  }
  if (batDau === ds.length) return 0
  if (tuyChon.truocMigration && dbCoDuLieu(db)) await tuyChon.truocMigration()
  for (let i = batDau; i < ds.length; i++) {
    const m = ds[i]
    db.transaction(() => {
      m.chay(db)
      db.pragma(`user_version = ${i + 1}`)
    })()
  }
  return ds.length - batDau
}

/** Mở DB và cập nhật schema; dùng cho test và script. */
export async function moDb(duongDan: string, tuyChon: TuyChonSchema = {}): Promise<Db> {
  const db = moKetNoi(duongDan)
  try {
    await capNhatSchema(db, tuyChon)
  } catch (loi) {
    db.close()
    throw loi
  }
  return db
}
