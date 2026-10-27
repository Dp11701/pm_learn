import { homNay, ngayCua, now } from '../../shared/clock.ts'
import type { Db } from '../db/index.ts'
import { layRevision, tangRevision } from '../db/settings.ts'
import { catBanXoa, layBanXoa, xemBanXoa, type MucKhongCon } from './ban-ghi-da-xoa.ts'
import {
  sauKhiOn,
  theMoi,
  type KetQuaGhiThe,
  type KetQuaOn,
  type KetQuaSuaThe,
  type TheHoc,
} from './hop-dong-the.ts'

// Flashcard (đề xuất 2.1, 3.5): tạo / sửa / xoá / khôi phục + ghi một lần ôn (Leitner) + "Cần ôn lại" (bất biến
// 3: luôn suy ra). Mỗi lần ghi: MỘT transaction gồm thay đổi + tăng revision. Ngày lịch (hạn, ngày ôn) do server
// quyết theo shared/clock. Kiểm itemId có trong cây (bất biến 8) là việc của route; riêng khôi phục nhận `laMuc` vì
// itemId nằm trong bản xoá. `luc` (ms) chỉ để seed / test.

interface DongThe {
  id: number
  item_id: string
  front: string
  back: string
  box: number
  due_on: string
  source_question_key: string | null
  created_at: string
  updated_at: string
}

interface DongLanOn {
  id: number
  card_id: number
  reviewed_at: string
  reviewed_on: string
  result: KetQuaOn
  from_box: number
  to_box: number
  created_at: string
}

const COT_THE = 'id, item_id, front, back, box, due_on, source_question_key, created_at, updated_at'

function sangThe(d: DongThe): TheHoc {
  return {
    id: d.id,
    itemId: d.item_id,
    truoc: d.front,
    sau: d.back,
    hop: d.box,
    hanOn: d.due_on,
    khoaCau: d.source_question_key,
  }
}

function docDong(db: Db, id: number): DongThe | undefined {
  return db.prepare(`SELECT ${COT_THE} FROM flashcards WHERE id = ?`).get(id) as DongThe | undefined
}

export function docThe(db: Db, id: number): TheHoc | undefined {
  const d = docDong(db, id)
  return d && sangThe(d)
}

/** Thẻ của một mục, cũ trước. */
export function docTheCuaMuc(db: Db, itemId: string): TheHoc[] {
  return (
    db
      .prepare(`SELECT ${COT_THE} FROM flashcards WHERE item_id = ? ORDER BY id`)
      .all(itemId) as DongThe[]
  ).map(sangThe)
}

export interface ThamSoTaoThe {
  itemId: string
  /** Đã bỏ khoảng trắng hai đầu, có chữ */
  truoc: string
  sau: string
  khoaCau?: string | null
  luc?: number
}

/** POST /api/the — thẻ mới hộp 1, hạn = ngày mai (ngày lịch server). */
export function taoThe(db: Db, thamSo: ThamSoTaoThe): KetQuaGhiThe {
  const luc = thamSo.luc ?? now()
  const at = new Date(luc).toISOString()
  const { hop, hanOn } = theMoi(ngayCua(luc))
  return db.transaction((): KetQuaGhiThe => {
    const kq = db
      .prepare(
        `INSERT INTO flashcards (item_id, front, back, box, due_on, source_question_key, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(thamSo.itemId, thamSo.truoc, thamSo.sau, hop, hanOn, thamSo.khoaCau ?? null, at, at)
    const the = docThe(db, Number(kq.lastInsertRowid))!
    return { revision: tangRevision(db), daDoi: true, the }
  })()
}

export interface ThamSoSuaThe {
  id: number
  truoc?: string
  sau?: string
  luc?: number
}

/** PUT /api/the/:id — sửa mặt thẻ; giữ hộp, hạn. undefined khi không có thẻ. */
export function suaThe(db: Db, thamSo: ThamSoSuaThe): KetQuaSuaThe | undefined {
  const at = new Date(thamSo.luc ?? now()).toISOString()
  return db.transaction((): KetQuaSuaThe | undefined => {
    const cu = docThe(db, thamSo.id)
    if (!cu) return undefined
    const moi: TheHoc = { ...cu, truoc: thamSo.truoc ?? cu.truoc, sau: thamSo.sau ?? cu.sau }
    if (moi.truoc === cu.truoc && moi.sau === cu.sau) {
      return { revision: layRevision(db), daDoi: false, the: cu, truoc: cu }
    }
    db.prepare('UPDATE flashcards SET front = ?, back = ?, updated_at = ? WHERE id = ?').run(
      moi.truoc,
      moi.sau,
      at,
      cu.id,
    )
    return { revision: tangRevision(db), daDoi: true, the: moi, truoc: cu }
  })()
}

interface BanXoaThe {
  the: DongThe
  lanOn: DongLanOn[]
}

/** DELETE /api/the/:id — xoá thẻ (kéo theo lịch sử ôn), giữ bản để khôi phục. undefined khi không có thẻ. */
export function xoaThe(db: Db, id: number, luc: number = now()): KetQuaGhiThe | undefined {
  return db.transaction((): KetQuaGhiThe | undefined => {
    const dong = docDong(db, id)
    if (!dong) return undefined
    const lanOn = db
      .prepare('SELECT * FROM flashcard_reviews WHERE card_id = ? ORDER BY id')
      .all(id) as DongLanOn[]
    catBanXoa(db, 'flashcards', id, { the: dong, lanOn } satisfies BanXoaThe, luc)
    db.prepare('DELETE FROM flashcards WHERE id = ?').run(id)
    return { revision: tangRevision(db), daDoi: true, the: sangThe(dong) }
  })()
}

/**
 * POST /api/the/:id/khoi-phuc — Hoàn tác xoá: cùng id, giữ hộp, hạn, lịch sử ôn. Thẻ vẫn còn → daDoi false;
 * không có bản vừa xoá → undefined. Khôi phục là ghi bản ghi mới nên mục của thẻ phải còn trong cây (`laMuc`,
 * bất biến 8): không còn → { mucKhongCon }, không ghi, không tăng revision, giữ bản xoá (cây đổi lại trong hạn
 * giữ thì vẫn khôi phục được).
 */
export function khoiPhucThe(
  db: Db,
  id: number,
  laMuc: (itemId: string) => boolean,
): KetQuaGhiThe | MucKhongCon | undefined {
  return db.transaction((): KetQuaGhiThe | MucKhongCon | undefined => {
    const conThe = docThe(db, id)
    if (conThe) return { revision: layRevision(db), daDoi: false, the: conThe }
    const ban = xemBanXoa<BanXoaThe>(db, 'flashcards', id)
    if (!ban) return undefined
    if (!laMuc(ban.the.item_id)) return { mucKhongCon: ban.the.item_id }
    layBanXoa(db, 'flashcards', id) // gỡ bản xoá: thẻ sắp có lại
    const t = ban.the
    db.prepare(`INSERT INTO flashcards (${COT_THE}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      t.id,
      t.item_id,
      t.front,
      t.back,
      t.box,
      t.due_on,
      t.source_question_key,
      t.created_at,
      t.updated_at,
    )
    // id lần ôn không được tham chiếu ở đâu: cấp id mới, giữ thứ tự.
    const them = db.prepare(
      `INSERT INTO flashcard_reviews (card_id, reviewed_at, reviewed_on, result, from_box, to_box, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    for (const l of ban.lanOn) {
      them.run(t.id, l.reviewed_at, l.reviewed_on, l.result, l.from_box, l.to_box, l.created_at)
    }
    return { revision: tangRevision(db), daDoi: true, the: sangThe(t) }
  })()
}

export interface ThamSoLanOn {
  theId: number
  ketQua: KetQuaOn
  luc?: number
}

/**
 * Ghi một lần ôn (Leitner, đề xuất 3.5): Nhớ lên 1 hộp (tối đa 5), Quên về hộp 1; hạn = ngày ôn + 1/2/4/8/16
 * ngày theo hộp mới. Phiên ôn (route) là phase 8; seed bộ mẫu dùng hàm này. undefined khi không có thẻ.
 */
export function ghiLanOn(
  db: Db,
  thamSo: ThamSoLanOn,
): { revision: number; the: TheHoc; truoc: TheHoc } | undefined {
  const luc = thamSo.luc ?? now()
  const at = new Date(luc).toISOString()
  const ngayOn = ngayCua(luc)
  return db.transaction(() => {
    const truoc = docThe(db, thamSo.theId)
    if (!truoc) return undefined
    const { hop, hanOn } = sauKhiOn(truoc.hop, thamSo.ketQua, ngayOn)
    db.prepare(
      `INSERT INTO flashcard_reviews (card_id, reviewed_at, reviewed_on, result, from_box, to_box, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(truoc.id, at, ngayOn, thamSo.ketQua, truoc.hop, hop, at)
    db.prepare('UPDATE flashcards SET box = ?, due_on = ?, updated_at = ? WHERE id = ?').run(
      hop,
      hanOn,
      at,
      truoc.id,
    )
    return { revision: tangRevision(db), the: { ...truoc, hop, hanOn }, truoc }
  })()
}

/**
 * "Cần ôn lại" (đề xuất 3.3, bất biến 3 — suy ra, không lưu): id các mục Đã xong có ≥ 1 thẻ hạn ≤ homNay, chỉ
 * mục còn trong cây (`laMuc`), xếp theo id.
 */
export function mucCanOnLai(
  db: Db,
  laMuc: (id: string) => boolean = () => true,
  ngay: string = homNay(),
): string[] {
  const ids = db
    .prepare(
      `SELECT DISTINCT f.item_id FROM flashcards f
       JOIN item_status s ON s.item_id = f.item_id
       WHERE s.status = 'done' AND f.due_on <= ?
       ORDER BY f.item_id`,
    )
    .pluck()
    .all(ngay) as string[]
  return ids.filter(laMuc)
}
