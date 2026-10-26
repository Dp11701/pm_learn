import { now } from '../../shared/clock.ts'
import type { Db } from '../db/index.ts'
import { tangRevision } from '../db/settings.ts'
import type { DuAn, KetQuaThemDuAn } from './hop-dong-hoc.ts'

// Dự án thực hành (đề xuất 2.1 bảng projects; §8.5 "chọn dự án"; F33 tab Dự án là P1). Phase 3: đọc danh sách,
// thêm dự án (dialog "Thêm dự án" ở khối Thực hành). Mỗi lần ghi: một transaction + tăng revision.

interface DongDuAn {
  id: number
  name: string
  role: string | null
  phase: string | null
}

const sangDuAn = (d: DongDuAn): DuAn => ({
  id: d.id,
  ten: d.name,
  vaiTro: d.role,
  giaiDoan: d.phase,
})

/** Mọi dự án, cũ trước. */
export function docDsDuAn(db: Db): DuAn[] {
  return (
    db.prepare('SELECT id, name, role, phase FROM projects ORDER BY id').all() as DongDuAn[]
  ).map(sangDuAn)
}

export interface ThamSoThemDuAn {
  /** Đã bỏ khoảng trắng hai đầu, có chữ */
  ten: string
  vaiTro?: string | null
  giaiDoan?: string | null
  luc?: number
}

/** POST /api/du-an — chuỗi rỗng ở vai trò / giai đoạn lưu là null. */
export function themDuAn(db: Db, thamSo: ThamSoThemDuAn): KetQuaThemDuAn {
  const at = new Date(thamSo.luc ?? now()).toISOString()
  const rongLaNull = (s: string | null | undefined) => (s ? s : null)
  return db.transaction((): KetQuaThemDuAn => {
    const kq = db
      .prepare(
        'INSERT INTO projects (name, role, phase, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(thamSo.ten, rongLaNull(thamSo.vaiTro), rongLaNull(thamSo.giaiDoan), at, at)
    const duAn: DuAn = {
      id: Number(kq.lastInsertRowid),
      ten: thamSo.ten,
      vaiTro: rongLaNull(thamSo.vaiTro),
      giaiDoan: rongLaNull(thamSo.giaiDoan),
    }
    return { revision: tangRevision(db), daDoi: true, duAn }
  })()
}
