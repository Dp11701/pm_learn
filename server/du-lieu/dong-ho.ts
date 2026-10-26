import { ngayCua, now } from '../../shared/clock.ts'
import type { Db } from '../db/index.ts'
import { docSetting, ghiSetting, layRevision, tangRevision } from '../db/settings.ts'
import { LoiApi } from '../loi.ts'
import { catBanXoa, layBanXoa } from './ban-ghi-da-xoa.ts'
import {
  SO_PHIEN_LICH_SU,
  canHoiQuenTat,
  giaySeGhi,
  giayGiua,
  type DongHoChay,
  type DongHoVuaDung,
  type KetQuaDongHo,
  type KetQuaGhiPhien,
  type PhienGio,
  type TrangThaiDongHo,
  type XungDotCanHoi,
  type XungDotDangChay,
} from './hop-dong-dong-ho.ts'
import { TB_HOC } from './thong-bao.ts'

// Đồng hồ học + phiên giờ (đề xuất 2.1, 2.2 bất biến 6, 3.4; Cần chốt 12).
// - active_timer có tối đa 1 hàng (id = 1, CHECK trong schema); bắt đầu / dừng / chuyển chạy trong transaction
//   IMMEDIATE (giành khoá ghi ngay từ đầu), nên hai yêu cầu cùng lúc không bao giờ để lại 2 đồng hồ hay một
//   đồng hồ dừng mà không ghi phiên.
// - Ghi phiên: ngày = ngày bắt đầu (server quyết), < 60 giây không ghi, mục không còn trong cây không ghi
//   (bất biến 8). Đồng hồ còn chạy qua tắt / mở server vì started_at nằm trong DB.
// - Hoàn tác lần dừng / chuyển gần nhất: settings.dong_ho_vua_dung (JSON) giữ đồng hồ cũ + phiên vừa ghi.
// `luc` (ms) chỉ để seed / test.

const iso = (ms: number) => new Date(ms).toISOString()

/** Hoàn tác lần dừng / chuyển chỉ trong chừng này phút. */
export const HOAN_TAC_TOI_DA_PHUT = 10
const KHOA_VUA_DUNG = 'dong_ho_vua_dung'

/** Lỗi 409 có thân riêng (route trả nguyên `than`). */
export class LoiDongHo extends LoiApi {
  than: XungDotDangChay | XungDotCanHoi
  constructor(than: XungDotDangChay | XungDotCanHoi) {
    super(409, than.loi)
    this.than = than
  }
}

interface DongPhien {
  id: number
  item_id: string
  date: string
  seconds: number
  started_at: string
  ended_at: string
  created_at: string
  updated_at: string
}

const sangPhien = (d: DongPhien): PhienGio => ({
  id: d.id,
  itemId: d.item_id,
  ngay: d.date,
  giay: d.seconds,
})

export function docDangChay(db: Db): DongHoChay | null {
  const dong = db.prepare('SELECT item_id, started_at FROM active_timer WHERE id = 1').get() as
    { item_id: string; started_at: string } | undefined
  return dong ? { itemId: dong.item_id, batDau: dong.started_at } : null
}

/** n phiên gần nhất (mới trước), của một mục nếu có itemId; bỏ phiên của mục không còn trong cây. */
export function docLichSu(
  db: Db,
  {
    itemId,
    laMuc = () => true,
    so = SO_PHIEN_LICH_SU,
  }: {
    itemId?: string
    laMuc?: (id: string) => boolean
    so?: number
  } = {},
): PhienGio[] {
  const kq: PhienGio[] = []
  const lenh = db.prepare(
    `SELECT * FROM time_entries ${itemId === undefined ? '' : 'WHERE item_id = ?'}
     ORDER BY ended_at DESC, id DESC`,
  )
  for (const d of (itemId === undefined
    ? lenh.iterate()
    : lenh.iterate(itemId)) as Iterable<DongPhien>) {
    if (!laMuc(d.item_id)) continue
    kq.push(sangPhien(d))
    if (kq.length >= so) break
  }
  return kq
}

/** Mọi phiên (cũ trước) — cho tổng hợp tuần / streak. */
export function docMoiPhien(db: Db): PhienGio[] {
  return (
    db.prepare('SELECT * FROM time_entries ORDER BY started_at, id').all() as DongPhien[]
  ).map(sangPhien)
}

/** Tổng giây đã ghi của một mục ("Đã học …"; không gồm đồng hồ đang chạy). */
export function tongGiayCuaMuc(db: Db, itemId: string): number {
  const dong = db
    .prepare('SELECT coalesce(sum(seconds), 0) AS n FROM time_entries WHERE item_id = ?')
    .get(itemId) as { n: number }
  return dong.n
}

export function docTrangThaiDongHo(
  db: Db,
  tuyChon: { itemId?: string; laMuc?: (id: string) => boolean } = {},
): TrangThaiDongHo {
  return db.transaction(() => ({
    revision: layRevision(db),
    dangChay: docDangChay(db),
    lichSu: docLichSu(db, tuyChon),
  }))()
}

/**
 * Ghi một phiên (không tăng revision — người gọi tăng trong cùng transaction). Ngày = ngày lịch lúc bắt đầu;
 * ended_at = started_at + số giây ghi. Trả null khi < 60 giây (không ghi).
 */
export function themPhien(
  db: Db,
  { itemId, batDauMs, giay, luc }: { itemId: string; batDauMs: number; giay: number; luc: number },
): PhienGio | null {
  if (giay < 60) return null
  const at = iso(luc)
  const kq = db
    .prepare(
      `INSERT INTO time_entries (item_id, date, seconds, started_at, ended_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(itemId, ngayCua(batDauMs), giay, iso(batDauMs), iso(batDauMs + giay * 1000), at, at)
  return { id: Number(kq.lastInsertRowid), itemId, ngay: ngayCua(batDauMs), giay }
}

interface VuaDung {
  itemId: string
  batDau: string
  phienId: number | null
  /** Lúc dừng (ISO) */
  luc: string
  /** Đồng hồ bấm ngay sau đó khi Chuyển; null khi chỉ Dừng */
  moi: DongHoChay | null
}

interface ThamSoDung {
  ghiGiay: number | null | undefined
  luc: number
  laMuc: (id: string) => boolean
}

/**
 * Dừng đồng hồ đang chạy (trong transaction của người gọi): hỏi trước nếu quên tắt và chưa có ghiGiay, ghi phiên,
 * xoá active_timer. Không tăng revision.
 */
function dungTrongGiaoDich(
  db: Db,
  dangChay: DongHoChay,
  { ghiGiay, luc, laMuc }: ThamSoDung,
): DongHoVuaDung {
  const batDauMs = Date.parse(dangChay.batDau)
  const giayThat = giayGiua(batDauMs, luc)
  const conTrongCay = laMuc(dangChay.itemId)
  // Mục không còn trong cây: không ghi phiên (bất biến 8), nên cũng không hỏi.
  if (conTrongCay && ghiGiay === undefined && canHoiQuenTat(batDauMs, luc, ngayCua)) {
    throw new LoiDongHo({
      loi: TB_HOC.canHoiGhi(thoiLuong(giayThat)),
      canHoi: true,
      giay: giayThat,
      dangChay,
    })
  }
  const giay = conTrongCay ? giaySeGhi(giayThat, ghiGiay) : 0
  const phien = themPhien(db, { itemId: dangChay.itemId, batDauMs, giay, luc })
  db.prepare('DELETE FROM active_timer WHERE id = 1').run()
  return { ...dangChay, giayThat, phien }
}

/** "9 giờ 12 phút" / "45 phút" cho câu hỏi quên tắt (làm tròn xuống phút). */
function thoiLuong(giay: number): string {
  const phut = Math.floor(giay / 60)
  const gio = Math.floor(phut / 60)
  return gio > 0 ? `${gio} giờ ${phut % 60} phút` : `${phut} phút`
}

function ghiVuaDung(db: Db, vuaDung: DongHoVuaDung, luc: number, moi: DongHoChay | null): void {
  const giaTri: VuaDung = {
    itemId: vuaDung.itemId,
    batDau: vuaDung.batDau,
    phienId: vuaDung.phien?.id ?? null,
    luc: iso(luc),
    moi,
  }
  ghiSetting(db, KHOA_VUA_DUNG, JSON.stringify(giaTri))
}

function xoaVuaDung(db: Db): void {
  db.prepare('DELETE FROM settings WHERE key = ?').run(KHOA_VUA_DUNG)
}

export interface ThamSoBatDau {
  itemId: string
  /** Tên mục đang chạy cho câu 409 (route tra từ cây) */
  tenMuc: (id: string) => string
  chuyen?: boolean
  ghiGiay?: number | null
  laMuc?: (id: string) => boolean
  luc?: number
}

/**
 * POST /api/dong-ho/bat-dau. Đang chạy chính mục này → không đổi gì. Mục khác đang chạy: không chuyen → 409
 * XungDotDangChay; chuyen → dừng (quy tắc quên tắt) + bấm giờ mục mới trong MỘT transaction.
 */
export function batDau(db: Db, thamSo: ThamSoBatDau): KetQuaDongHo {
  const luc = thamSo.luc ?? now()
  const laMuc = thamSo.laMuc ?? (() => true)
  return db
    .transaction((): KetQuaDongHo => {
      const dangChay = docDangChay(db)
      if (dangChay?.itemId === thamSo.itemId) {
        return { revision: layRevision(db), daDoi: false, dangChay, dung: null, phien: null }
      }
      let dung: DongHoVuaDung | null = null
      if (dangChay) {
        if (thamSo.chuyen !== true) {
          throw new LoiDongHo({
            loi: TB_HOC.dangChayMucKhac(thamSo.tenMuc(dangChay.itemId)),
            dangChay,
          })
        }
        dung = dungTrongGiaoDich(db, dangChay, { ghiGiay: thamSo.ghiGiay, luc, laMuc })
      }
      const moi: DongHoChay = { itemId: thamSo.itemId, batDau: iso(luc) }
      db.prepare('INSERT INTO active_timer (id, item_id, started_at) VALUES (1, ?, ?)').run(
        moi.itemId,
        moi.batDau,
      )
      if (dung) ghiVuaDung(db, dung, luc, moi)
      else xoaVuaDung(db)
      return {
        revision: tangRevision(db),
        daDoi: true,
        dangChay: moi,
        dung,
        phien: dung?.phien ?? null,
      }
    })
    .immediate()
}

/** POST /api/dong-ho/dung. Không có đồng hồ nào chạy → không đổi gì. */
export function dung(
  db: Db,
  thamSo: { ghiGiay?: number | null; laMuc?: (id: string) => boolean; luc?: number } = {},
): KetQuaDongHo {
  const luc = thamSo.luc ?? now()
  return db
    .transaction((): KetQuaDongHo => {
      const dangChay = docDangChay(db)
      if (!dangChay) {
        return { revision: layRevision(db), daDoi: false, dangChay: null, dung: null, phien: null }
      }
      const vuaDung = dungTrongGiaoDich(db, dangChay, {
        ghiGiay: thamSo.ghiGiay,
        luc,
        laMuc: thamSo.laMuc ?? (() => true),
      })
      ghiVuaDung(db, vuaDung, luc, null)
      return {
        revision: tangRevision(db),
        daDoi: true,
        dangChay: null,
        dung: vuaDung,
        phien: vuaDung.phien,
      }
    })
    .immediate()
}

/**
 * POST /api/dong-ho/hoan-tac — đảo lần dừng / chuyển gần nhất: bỏ đồng hồ bấm sau đó (nếu Chuyển), xoá phiên
 * vừa ghi, chạy lại đồng hồ cũ đúng giờ bắt đầu cũ. 409 khi không có gì để hoàn tác, đồng hồ đã đổi sau đó,
 * hoặc đã quá HOAN_TAC_TOI_DA_PHUT phút.
 */
export function hoanTacDongHo(db: Db, luc: number = now()): KetQuaDongHo {
  return db
    .transaction((): KetQuaDongHo => {
      const raw = docSetting(db, KHOA_VUA_DUNG)
      if (!raw) throw new LoiApi(409, TB_HOC.khongHoanTac)
      const vd = JSON.parse(raw) as VuaDung
      const dangChay = docDangChay(db)
      const khop =
        vd.moi === null
          ? dangChay === null
          : dangChay?.itemId === vd.moi.itemId && dangChay.batDau === vd.moi.batDau
      if (!khop) throw new LoiApi(409, TB_HOC.hoanTacDaDoi)
      if (luc - Date.parse(vd.luc) > HOAN_TAC_TOI_DA_PHUT * 60_000) {
        throw new LoiApi(409, TB_HOC.hoanTacQuaLau(HOAN_TAC_TOI_DA_PHUT))
      }
      db.prepare('DELETE FROM active_timer WHERE id = 1').run()
      if (vd.phienId !== null) db.prepare('DELETE FROM time_entries WHERE id = ?').run(vd.phienId)
      const cu: DongHoChay = { itemId: vd.itemId, batDau: vd.batDau }
      db.prepare('INSERT INTO active_timer (id, item_id, started_at) VALUES (1, ?, ?)').run(
        cu.itemId,
        cu.batDau,
      )
      xoaVuaDung(db)
      return { revision: tangRevision(db), daDoi: true, dangChay: cu, dung: null, phien: null }
    })
    .immediate()
}

/** DELETE /api/phien-gio/:id — undefined khi không có phiên. */
export function xoaPhien(db: Db, id: number, luc: number = now()): KetQuaGhiPhien | undefined {
  return db.transaction((): KetQuaGhiPhien | undefined => {
    const dong = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id) as
      DongPhien | undefined
    if (!dong) return undefined
    catBanXoa(db, 'time_entries', id, dong, luc)
    db.prepare('DELETE FROM time_entries WHERE id = ?').run(id)
    return { revision: tangRevision(db), daDoi: true, phien: sangPhien(dong) }
  })()
}

/** POST /api/phien-gio/:id/khoi-phuc — cùng id. Phiên còn → daDoi false; không có bản vừa xoá → undefined. */
export function khoiPhucPhien(db: Db, id: number): KetQuaGhiPhien | undefined {
  return db.transaction((): KetQuaGhiPhien | undefined => {
    const con = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id) as
      DongPhien | undefined
    if (con) return { revision: layRevision(db), daDoi: false, phien: sangPhien(con) }
    const d = layBanXoa<DongPhien>(db, 'time_entries', id)
    if (!d) return undefined
    db.prepare(
      `INSERT INTO time_entries (id, item_id, date, seconds, started_at, ended_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(d.id, d.item_id, d.date, d.seconds, d.started_at, d.ended_at, d.created_at, d.updated_at)
    return { revision: tangRevision(db), daDoi: true, phien: sangPhien(d) }
  })()
}
