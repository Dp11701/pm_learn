import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { datLech } from '../../shared/clock.ts'
import { kiemShaCay, shaCuaTep } from '../../server/cay-sha.ts'
import {
  capNhatSchema,
  dbCoDuLieu,
  layPhienBan,
  moDb,
  moKetNoi,
  type Db,
} from '../../server/db/index.ts'
import { dsMigration, type Migration } from '../../server/db/migrations.ts'
import { docSetting, ghiSetting, layRevision, tangRevision } from '../../server/db/settings.ts'
import { taoSaoLuu } from '../../server/sao-luu.ts'
import { datGio, dsTen, taoThuMucTam, type ThuMucTam } from './tro-giup.ts'

let tam: ThuMucTam
let tepDb: string
const moDang: Db[] = []

function mo(): Db {
  const db = moKetNoi(tepDb)
  moDang.push(db)
  return db
}

const migrationThem: Migration = {
  ten: 'thu',
  chay: (db) => db.exec('CREATE TABLE thu (id INTEGER PRIMARY KEY)'),
}

beforeEach(() => {
  tam = taoThuMucTam()
  tepDb = path.join(tam.dataDir, 'hoc.db')
})

afterEach(() => {
  for (const db of moDang.splice(0)) if (db.open) db.close()
  tam.xoa()
  datLech(0)
})

describe('mở DB', () => {
  it('WAL, foreign_keys ON, busy_timeout', () => {
    const db = mo()
    expect(db.pragma('journal_mode', { simple: true })).toBe('wal')
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
    expect(db.pragma('busy_timeout', { simple: true })).toBe(5000)
  })
})

describe('migration', () => {
  it('DB mới: chạy hết, user_version = số migration, có bảng settings', async () => {
    const db = mo()
    expect(dbCoDuLieu(db)).toBe(false)
    expect(await capNhatSchema(db)).toBe(dsMigration.length)
    expect(layPhienBan(db)).toBe(dsMigration.length)
    const bang = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").pluck().all()
    expect(bang).toContain('settings')
  })

  it('chạy lại không làm gì (idempotent), dữ liệu giữ nguyên', async () => {
    const db = mo()
    await capNhatSchema(db)
    ghiSetting(db, 'muc_tieu_gio_tuan', '6')
    expect(await capNhatSchema(db)).toBe(0)
    db.close()
    const lai = mo()
    expect(await capNhatSchema(lai)).toBe(0)
    expect(layPhienBan(lai)).toBe(dsMigration.length)
    expect(docSetting(lai, 'muc_tieu_gio_tuan')).toBe('6')
  })

  it('migration lỗi thì rollback, user_version không đổi', async () => {
    const db = mo()
    await capNhatSchema(db)
    const hong: Migration = {
      ten: 'hong',
      chay: (d) => {
        d.exec('CREATE TABLE nua_chung (id INTEGER)')
        throw new Error('hỏng giữa chừng')
      },
    }
    await expect(capNhatSchema(db, { migrations: [...dsMigration, hong] })).rejects.toThrow(
      'hỏng giữa chừng',
    )
    expect(layPhienBan(db)).toBe(dsMigration.length)
    const bang = db.prepare("SELECT name FROM sqlite_master WHERE name = 'nua_chung'").all()
    expect(bang).toEqual([])
  })

  it('DB mới hơn app → báo lỗi tiếng Việt, không đụng DB', async () => {
    const db = mo()
    await capNhatSchema(db, { migrations: [...dsMigration, migrationThem] })
    await expect(capNhatSchema(db)).rejects.toThrow(/mới hơn app/)
    expect(layPhienBan(db)).toBe(dsMigration.length + 1)
  })

  it('moDb mở và cập nhật schema một bước', async () => {
    const db = await moDb(tepDb)
    moDang.push(db)
    expect(layPhienBan(db)).toBe(dsMigration.length)
  })
})

describe('sao lưu trước migration', () => {
  it('DB mới (trống) thì không sao lưu', async () => {
    const truocMigration = vi.fn(async () => {})
    await capNhatSchema(mo(), { truocMigration })
    expect(truocMigration).not.toHaveBeenCalled()
  })

  it('DB đã có dữ liệu + có migration mới → sao lưu trước, bản sao lưu ở phiên bản cũ', async () => {
    datGio('2026-10-22T12:00:00')
    const db = mo()
    await capNhatSchema(db)
    ghiSetting(db, 'ngay_bat_dau', '2026-09-17')
    const saoLuu = taoSaoLuu({ db, dataDir: tam.dataDir, noiDungDir: tam.noiDungDir })
    const goi: number[] = []
    const n = await capNhatSchema(db, {
      migrations: [...dsMigration, migrationThem],
      truocMigration: async () => {
        goi.push(layPhienBan(db))
        await saoLuu.saoLuuNgay('truoc-migration')
      },
    })
    expect(n).toBe(1)
    expect(goi).toEqual([dsMigration.length])
    const thuMuc = path.join(tam.dataDir, 'backups')
    expect(dsTen(thuMuc)).toEqual(['hoc-2026-10-22-truoc-migration.db'])
    const banSao = new Database(path.join(thuMuc, 'hoc-2026-10-22-truoc-migration.db'), {
      readonly: true,
    })
    try {
      expect(banSao.pragma('user_version', { simple: true })).toBe(dsMigration.length)
      expect(banSao.prepare("SELECT value FROM settings WHERE key = 'ngay_bat_dau'").get()).toEqual(
        { value: '2026-09-17' },
      )
    } finally {
      banSao.close()
    }
  })

  it('DB đã ở bản mới nhất thì không sao lưu', async () => {
    const db = mo()
    await capNhatSchema(db)
    const truocMigration = vi.fn(async () => {})
    await capNhatSchema(db, { truocMigration })
    expect(truocMigration).not.toHaveBeenCalled()
  })

  it('sao lưu lỗi thì không chạy migration', async () => {
    const db = mo()
    await capNhatSchema(db)
    await expect(
      capNhatSchema(db, {
        migrations: [...dsMigration, migrationThem],
        truocMigration: async () => {
          throw new Error('đĩa đầy')
        },
      }),
    ).rejects.toThrow('đĩa đầy')
    expect(layPhienBan(db)).toBe(dsMigration.length)
  })
})

describe('settings', () => {
  it('đọc/ghi giá trị, null khi chưa có', async () => {
    const db = mo()
    await capNhatSchema(db)
    expect(docSetting(db, 'khoa_la')).toBeNull()
    ghiSetting(db, 'k', 'a')
    ghiSetting(db, 'k', 'b')
    expect(docSetting(db, 'k')).toBe('b')
  })

  it('revision mặc định 0, tăng 1 mỗi lần', async () => {
    const db = mo()
    await capNhatSchema(db)
    expect(layRevision(db)).toBe(0)
    expect(tangRevision(db)).toBe(1)
    expect(tangRevision(db)).toBe(2)
    expect(layRevision(db)).toBe(2)
  })
})

describe('cay_sha', () => {
  it('lần đầu lưu sha; trùng → khop; khác → khac và giữ sha cũ', async () => {
    const db = mo()
    await capNhatSchema(db)
    const tepCay = path.join(tam.goc, 'cay.json')
    fs.writeFileSync(tepCay, '{"parts":[]}')
    const shaDau = shaCuaTep(tepCay)
    expect(shaDau).toMatch(/^[0-9a-f]{64}$/)
    expect(kiemShaCay(db, tepCay)).toBe('moi')
    expect(docSetting(db, 'cay_sha')).toBe(shaDau)
    expect(kiemShaCay(db, tepCay)).toBe('khop')
    fs.writeFileSync(tepCay, '{"parts":[1]}')
    expect(kiemShaCay(db, tepCay)).toBe('khac')
    expect(docSetting(db, 'cay_sha')).toBe(shaDau)
  })
})
