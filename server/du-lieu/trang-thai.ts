import { ngayCua, now } from '../../shared/clock.ts'
import type { Db } from '../db/index.ts'
import { layRevision, tangRevision } from '../db/settings.ts'
import {
  giaTriCua,
  mucCua,
  type AnhChupHoc,
  type GiaTriTrangThai,
  type KetQuaDatTrangThai,
  type KetQuaGhiLuotMo,
  type MucTrangThai,
  type TrangThaiDb,
  type Via,
} from './hop-dong-trang-thai.ts'

// Đọc / ghi trạng thái học và lượt mở bài (đề xuất 2.1, 2.2, 3.1). Mọi lần ghi: một transaction gồm
// thay đổi + status_events + tăng revision. Thời điểm `at` (ISO UTC) và ngày `on` do server quyết theo
// shared/clock; tham số `luc` (ms) chỉ để seed / test đặt thời điểm cụ thể.
// Kiểm id có trong cây (bất biến 8) là việc của route: các hàm ở đây ghi đúng id được đưa.

interface DongTrangThai {
  item_id: string
  status: TrangThaiDb
  skip_reason: string | null
}

function sangMuc(dong: DongTrangThai): MucTrangThai {
  return dong.status === 'skip' && dong.skip_reason
    ? { status: dong.status, lyDoBoQua: dong.skip_reason }
    : { status: dong.status }
}

/** Trạng thái hiện tại của một mục; undefined = Chưa học. */
export function docMucTrangThai(db: Db, id: string): MucTrangThai | undefined {
  const dong = db
    .prepare('SELECT item_id, status, skip_reason FROM item_status WHERE item_id = ?')
    .get(id) as DongTrangThai | undefined
  return dong && sangMuc(dong)
}

/**
 * Ảnh chụp dữ liệu học cho GET /api/state. `laMuc` lọc theo cây: bản ghi của mục không còn trong cây vẫn
 * nằm trong DB (bất biến 8) nhưng không vào ảnh chụp, nên không tính tiến độ.
 */
export function docAnhChup(db: Db, laMuc: (id: string) => boolean = () => true): AnhChupHoc {
  const trangThai: Record<string, MucTrangThai> = {}
  const cacDong = db
    .prepare('SELECT item_id, status, skip_reason FROM item_status ORDER BY item_id')
    .all() as DongTrangThai[]
  for (const dong of cacDong) if (laMuc(dong.item_id)) trangThai[dong.item_id] = sangMuc(dong)

  const luotMo: Record<string, string> = {}
  const cacLuot = db
    .prepare('SELECT item_id, last_opened_at FROM item_visits ORDER BY item_id')
    .all() as { item_id: string; last_opened_at: string }[]
  for (const dong of cacLuot) if (laMuc(dong.item_id)) luotMo[dong.item_id] = dong.last_opened_at

  return { revision: layRevision(db), trangThai, luotMo }
}

export interface ThamSoDatTrangThai {
  id: string
  giaTri: GiaTriTrangThai
  via: Via
  /** Thời điểm (ms); mặc định now() */
  luc?: number
}

function giongNhau(a: MucTrangThai | null, b: MucTrangThai | null): boolean {
  return a?.status === b?.status && a?.lyDoBoQua === b?.lyDoBoQua
}

/**
 * Đặt trạng thái học của một mục trong MỘT transaction: ghi / xoá hàng item_status (Chưa học = xoá),
 * thêm status_events khi trạng thái đổi (from/to NULL = Chưa học), tăng revision. Chỉ đổi lý do Bỏ qua thì
 * cập nhật hàng + revision, không thêm sự kiện. Giá trị trùng giá trị cũ thì không ghi gì.
 */
export function datTrangThai(db: Db, thamSo: ThamSoDatTrangThai): KetQuaDatTrangThai {
  const { id, via } = thamSo
  const luc = thamSo.luc ?? now()
  const at = new Date(luc).toISOString()
  const on = ngayCua(luc)
  const moi = mucCua(thamSo.giaTri)

  return db.transaction((): KetQuaDatTrangThai => {
    const cu = docMucTrangThai(db, id) ?? null
    const truoc = giaTriCua(cu)
    const sau = giaTriCua(moi)
    if (giongNhau(cu, moi)) {
      return { revision: layRevision(db), id, muc: moi, sau, truoc, daDoi: false }
    }

    if (moi) {
      db.prepare(
        `INSERT INTO item_status (item_id, status, skip_reason, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(item_id) DO UPDATE SET
           status = excluded.status, skip_reason = excluded.skip_reason, updated_at = excluded.updated_at`,
      ).run(id, moi.status, moi.lyDoBoQua ?? null, at, at)
    } else {
      db.prepare('DELETE FROM item_status WHERE item_id = ?').run(id)
    }

    if (cu?.status !== moi?.status) {
      db.prepare(
        `INSERT INTO status_events (item_id, from_status, to_status, at, "on", via, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, cu?.status ?? null, moi?.status ?? null, at, on, via, at)
    }

    const revision = tangRevision(db)
    return { revision, id, muc: moi, sau, truoc, daDoi: true }
  })()
}

/** Ghi lần mở bài gần nhất (upsert item_visits) và tăng revision, cùng một transaction. */
export function ghiLuotMo(db: Db, id: string, luc: number = now()): KetQuaGhiLuotMo {
  const at = new Date(luc).toISOString()
  return db.transaction((): KetQuaGhiLuotMo => {
    db.prepare(
      `INSERT INTO item_visits (item_id, last_opened_at, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(item_id) DO UPDATE SET
         last_opened_at = excluded.last_opened_at, updated_at = excluded.updated_at`,
    ).run(id, at, at, at)
    return { revision: tangRevision(db), id, lanMoCuoi: at }
  })()
}

export interface SuKienTrangThai {
  id: number
  itemId: string
  tu: TrangThaiDb | null
  den: TrangThaiDb | null
  at: string
  on: string
  via: Via
}

/** Lịch sử đổi trạng thái của một mục (hoặc mọi mục), cũ trước. */
export function docSuKien(db: Db, itemId?: string): SuKienTrangThai[] {
  const sql = `SELECT id, item_id AS itemId, from_status AS tu, to_status AS den, at, "on", via
               FROM status_events ${itemId === undefined ? '' : 'WHERE item_id = ?'} ORDER BY id`
  const lenh = db.prepare(sql)
  return (itemId === undefined ? lenh.all() : lenh.all(itemId)) as SuKienTrangThai[]
}
