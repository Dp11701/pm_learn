import { ngayCua, now } from '../../shared/clock.ts'
import type { Db } from '../db/index.ts'
import { layRevision, tangRevision } from '../db/settings.ts'
import { demBanGhiNgoaiCay } from './ngoai-cay.ts'
import { mucCanOnLai } from './the.ts'
import {
  giaTriCua,
  mucCua,
  sangDb,
  type AnhChupHoc,
  type GiaTriTrangThai,
  type KetQuaDatHangLoat,
  type KetQuaDatTrangThai,
  type KetQuaGhiLuotMo,
  type KetQuaHoanTacHangLoat,
  type MucTrangThai,
  type TrangThaiDb,
  type TrangThaiHangLoat,
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

type AnhChupDayDu = AnhChupHoc & {
  canOnLai: string[]
  banGhiNgoaiCay: number
  coGhiChu: string[]
}

/**
 * Ảnh chụp dữ liệu học cho GET /api/state. `laMuc` lọc theo cây: bản ghi của mục không còn trong cây vẫn
 * nằm trong DB (bất biến 8) nhưng không vào ảnh chụp, nên không tính tiến độ; chỉ SỐ bản ghi đó đi kèm
 * (banGhiNgoaiCay — banner Tổng quan). canOnLai tính lúc đọc theo homNay() của server (bất biến 3). coGhiChu: id
 * mục có ghi chú (bộ lọc "Có ghi chú"). Đọc trong một transaction để các phần khớp cùng một revision.
 */
export function docAnhChup(db: Db, laMuc: (id: string) => boolean = () => true): AnhChupDayDu {
  return db.transaction(() => docAnhChupTrong(db, laMuc))()
}

function docAnhChupTrong(db: Db, laMuc: (id: string) => boolean): AnhChupDayDu {
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

  // Bảng notes đã chặn chữ rỗng (CHECK trim(body) <> ''); lọc lại cho chắc
  const cacGhiChu = db
    .prepare(`SELECT item_id FROM notes WHERE trim(body) <> '' ORDER BY item_id`)
    .all() as { item_id: string }[]

  return {
    revision: layRevision(db),
    trangThai,
    luotMo,
    canOnLai: mucCanOnLai(db, laMuc),
    banGhiNgoaiCay: demBanGhiNgoaiCay(db, laMuc),
    coGhiChu: cacGhiChu.map((d) => d.item_id).filter((id) => laMuc(id)),
  }
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
    ghiMuc(db, { id, cu, moi, via, at, on })
    const revision = tangRevision(db)
    return { revision, id, muc: moi, sau, truoc, daDoi: true }
  })()
}

/**
 * Ghi giá trị mới của một mục (gọi TRONG transaction, chưa tăng revision): ghi / xoá hàng item_status (Chưa học =
 * xoá), thêm status_events khi trạng thái đổi (from/to NULL = Chưa học).
 */
function ghiMuc(
  db: Db,
  g: {
    id: string
    cu: MucTrangThai | null
    moi: MucTrangThai | null
    via: Via
    at: string
    on: string
  },
): void {
  const { id, cu, moi, via, at, on } = g
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
}

// ---------- Hàng loạt (đề xuất 3.9, bất biến 2) ----------

export interface ThamSoDatHangLoat {
  /** id mục học (route đã kiểm: có trong cây, không trùng) */
  ids: readonly string[]
  trangThai: TrangThaiHangLoat
  /** Thời điểm (ms); mặc định now() */
  luc?: number
}

/**
 * Đặt một trạng thái (Chưa học / Đang học / Bỏ qua — không bao giờ Đã xong) cho nhiều mục trong MỘT transaction,
 * tăng revision một lần. Mục đang ở đúng trạng thái đó giữ nguyên (cả lý do Bỏ qua), không vào `daDoi`. Mỗi mục
 * đổi có một dòng status_events via 'hang-loat' như PUT một mục. Không mục nào đổi thì không ghi gì.
 */
export function datHangLoat(db: Db, thamSo: ThamSoDatHangLoat): KetQuaDatHangLoat {
  const { ids, trangThai } = thamSo
  const luc = thamSo.luc ?? now()
  const at = new Date(luc).toISOString()
  const on = ngayCua(luc)
  const moi = mucCua({ trangThai })

  return db.transaction((): KetQuaDatHangLoat => {
    const daDoi: string[] = []
    const truoc: Record<string, GiaTriTrangThai> = {}
    for (const id of ids) {
      const cu = docMucTrangThai(db, id) ?? null
      if ((cu?.status ?? null) === (moi?.status ?? null)) continue
      ghiMuc(db, { id, cu, moi, via: 'hang-loat', at, on })
      daDoi.push(id)
      truoc[id] = giaTriCua(cu)
    }
    const revision = daDoi.length > 0 ? tangRevision(db) : layRevision(db)
    return { revision, trangThai, daDoi, truoc }
  })()
}

export interface ThamSoHoanTacHangLoat {
  /** Trạng thái lần đặt hàng loạt đã đặt */
  trangThai: TrangThaiHangLoat
  /** Giá trị cũ theo id (route đã kiểm id có trong cây) */
  truoc: Readonly<Record<string, GiaTriTrangThai>>
  luc?: number
}

interface DongSuKienCuoi {
  from_status: TrangThaiDb | null
  to_status: TrangThaiDb | null
  via: Via
  at: string
}

/**
 * Mục còn đúng như lần đặt hàng loạt để lại, và giá trị cũ client gửi khớp giá trị cũ server đã ghi (bất biến 2 —
 * server kiểm lại, 1.10): sự kiện cuối của mục là via 'hang-loat' từ `truoc` sang `daDat`, trạng thái hiện tại là
 * `daDat` và hàng item_status chưa bị ghi lại sau sự kiện đó (vd. chỉ đổi lý do Bỏ qua — không sinh sự kiện).
 * Nhờ vậy `truoc` giả (vd. Đã xong cho mục chưa từng Đã xong) không bao giờ được ghi. Lý do Bỏ qua cũ không lưu
 * trong status_events nên lấy theo client — chỉ khi giá trị cũ thật là Bỏ qua (lược đồ route chỉ nhận lyDo với
 * bo-qua).
 */
function conNhuLanHangLoat(
  db: Db,
  id: string,
  daDat: TrangThaiDb | null,
  truoc: TrangThaiDb | null,
): boolean {
  const cuoi = db
    .prepare(
      `SELECT from_status, to_status, via, at FROM status_events
       WHERE item_id = ? ORDER BY id DESC LIMIT 1`,
    )
    .get(id) as DongSuKienCuoi | undefined
  if (!cuoi || cuoi.via !== 'hang-loat' || cuoi.to_status !== daDat || cuoi.from_status !== truoc) {
    return false
  }
  const hang = db
    .prepare('SELECT status, updated_at FROM item_status WHERE item_id = ?')
    .get(id) as { status: TrangThaiDb; updated_at: string } | undefined
  if (daDat === null) return hang === undefined
  return hang?.status === daDat && hang.updated_at === cuoi.at
}

/**
 * Hoàn tác một lần đặt hàng loạt trong MỘT transaction: trả từng mục về đúng giá trị cũ (kể cả Đã xong và lý do Bỏ
 * qua — đây là khôi phục, không phải đặt hàng loạt). Chỉ khôi phục mục còn đúng như lần đặt hàng loạt để lại VÀ giá
 * trị cũ gửi lên khớp giá trị cũ server đã ghi trong status_events (conNhuLanHangLoat); mục đã đổi sau đó, hoặc
 * `truoc` không khớp (gửi lại lần hai, giá trị giả) thì giữ nguyên và báo trong `giuNguyen`. Sự kiện via 'hoan-tac';
 * tăng revision một lần nếu có mục đổi.
 */
export function hoanTacHangLoat(db: Db, thamSo: ThamSoHoanTacHangLoat): KetQuaHoanTacHangLoat {
  const daDat = sangDb(thamSo.trangThai)
  const luc = thamSo.luc ?? now()
  const at = new Date(luc).toISOString()
  const on = ngayCua(luc)

  return db.transaction((): KetQuaHoanTacHangLoat => {
    const daKhoiPhuc: string[] = []
    const giuNguyen: string[] = []
    for (const [id, giaTri] of Object.entries(thamSo.truoc)) {
      const cu = docMucTrangThai(db, id) ?? null
      if (!conNhuLanHangLoat(db, id, daDat, sangDb(giaTri.trangThai))) {
        giuNguyen.push(id)
        continue
      }
      const moi = mucCua(giaTri)
      if (giongNhau(cu, moi)) continue
      ghiMuc(db, { id, cu, moi, via: 'hoan-tac', at, on })
      daKhoiPhuc.push(id)
    }
    const revision = daKhoiPhuc.length > 0 ? tangRevision(db) : layRevision(db)
    return { revision, daKhoiPhuc, giuNguyen }
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
