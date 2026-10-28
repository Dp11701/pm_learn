import { homNay, ngayCua, now } from '../../shared/clock.ts'
import type { Db } from '../db/index.ts'
import { layRevision } from '../db/settings.ts'
import {
  denHan,
  ngayDauTiLeNho,
  soThuTuOn,
  type AnhChupOnTap,
  type KetQuaOn,
  type KetQuaOnThe,
  type SoTheTheoHop,
  type TheOn,
} from './hop-dong-the.ts'
import { ghiLanOn } from './the.ts'

// Phiên ôn flashcard (bước 3; đề xuất 3.3, 3.5): ảnh chụp trang Ôn tập + ghi một câu trả lời của phiên.
// "Hôm nay" là ngày lịch của server (shared/clock); `luc` (ms) chỉ để test. Lần ôn thật dùng ghiLanOn (Leitner,
// lịch sử ôn, tăng revision) trong cùng transaction với bước kiểm "đến hạn", nên hai lần bấm liền nhau chỉ đẩy
// hộp một lần. Thẻ của mục không còn trong cây (`laMuc`, bất biến 8) bị bỏ qua khi đọc và bị từ chối khi ghi.

interface DongTheOn {
  id: number
  item_id: string
  front: string
  back: string
  box: number
  due_on: string
  created_at: string
}

const COT = 'id, item_id, front, back, box, due_on, created_at'

function sangTheOn(d: DongTheOn): TheOn {
  return {
    id: d.id,
    itemId: d.item_id,
    truoc: d.front,
    sau: d.back,
    hop: d.box,
    hanOn: d.due_on,
    taoLuc: d.created_at,
  }
}

function docTheOn(db: Db, id: number): TheOn | undefined {
  const d = db.prepare(`SELECT ${COT} FROM flashcards WHERE id = ?`).get(id) as
    DongTheOn | undefined
  return d && sangTheOn(d)
}

/** GET /api/on-tap — thẻ đến hạn (xếp hạn → hộp → lúc tạo), số thẻ theo hộp, tỉ lệ nhớ 30 ngày. */
export function docOnTap(
  db: Db,
  laMuc: (id: string) => boolean = () => true,
  ngay: string = homNay(),
): AnhChupOnTap {
  return db.transaction((): AnhChupOnTap => {
    const cacThe = (db.prepare(`SELECT ${COT} FROM flashcards ORDER BY id`).all() as DongTheOn[])
      .filter((d) => laMuc(d.item_id))
      .map(sangTheOn)
      .sort(soThuTuOn)

    const hop: SoTheTheoHop = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const t of cacThe) hop[t.hop as keyof SoTheTheoHop] += 1
    const denHanHomNay = cacThe.filter((t) => denHan(t, ngay))
    const hanKeTiep = cacThe.find((t) => !denHan(t, ngay))?.hanOn ?? null

    const lanOn = (
      db
        .prepare(
          `SELECT r.result AS ket, f.item_id AS itemId FROM flashcard_reviews r
           JOIN flashcards f ON f.id = r.card_id
           WHERE r.reviewed_on >= ? AND r.reviewed_on <= ?`,
        )
        .all(ngayDauTiLeNho(ngay), ngay) as { ket: KetQuaOn; itemId: string }[]
    ).filter((l) => laMuc(l.itemId))
    const nho = lanOn.filter((l) => l.ket === 'nho').length
    const tong = lanOn.length

    return {
      revision: layRevision(db),
      homNay: ngay,
      denHan: denHanHomNay,
      hop,
      tongThe: cacThe.length,
      tiLeNho30: tong === 0 ? null : nho / tong,
      lanOn30: { nho, tong },
      hanKeTiep,
    }
  })()
}

export interface ThamSoOnThe {
  theId: number
  ket: KetQuaOn
  luyenThem?: boolean
  luc?: number
}

/** Kết quả ghi: thành công, hoặc lý do route đổi thành 404 / 409. */
export type KetQuaGhiOn =
  | { ok: true; ketQua: KetQuaOnThe }
  | { ok: false; loi: 'khong-co-the' }
  | { ok: false; loi: 'muc-khong-con'; itemId: string }
  | { ok: false; loi: 'chua-den-han'; the: TheOn }

/**
 * POST /api/on-tap/:theId — một câu trả lời của phiên ôn. Lần ôn thật: thẻ phải đến hạn (hạn ≤ ngày ôn), rồi
 * Leitner + lịch sử ôn + tăng revision (ghiLanOn). Vòng luyện thêm: không ghi gì, trả thẻ như đang có.
 */
export function onThe(
  db: Db,
  thamSo: ThamSoOnThe,
  laMuc: (id: string) => boolean = () => true,
): KetQuaGhiOn {
  const luc = thamSo.luc ?? now()
  const ngayOn = ngayCua(luc)
  const luyenThem = thamSo.luyenThem === true
  return db.transaction((): KetQuaGhiOn => {
    const truoc = docTheOn(db, thamSo.theId)
    if (!truoc) return { ok: false, loi: 'khong-co-the' }
    if (!laMuc(truoc.itemId)) return { ok: false, loi: 'muc-khong-con', itemId: truoc.itemId }
    if (luyenThem) {
      return {
        ok: true,
        ketQua: {
          revision: layRevision(db),
          daDoi: false,
          luyenThem,
          ket: thamSo.ket,
          the: truoc,
          truoc,
        },
      }
    }
    if (!denHan(truoc, ngayOn)) return { ok: false, loi: 'chua-den-han', the: truoc }
    // Transaction lồng (savepoint): kiểm hạn và ghi là một khối.
    const kq = ghiLanOn(db, { theId: truoc.id, ketQua: thamSo.ket, luc })
    if (!kq) return { ok: false, loi: 'khong-co-the' }
    const the: TheOn = { ...truoc, hop: kq.the.hop, hanOn: kq.the.hanOn }
    return {
      ok: true,
      ketQua: { revision: kq.revision, daDoi: true, luyenThem, ket: thamSo.ket, the, truoc },
    }
  })()
}
