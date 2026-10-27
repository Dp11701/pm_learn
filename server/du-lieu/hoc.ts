import { now } from '../../shared/clock.ts'
import {
  ganLaiKhoa,
  type DanhSachTrongBai,
  type DongCu,
  type DongTrongBai,
} from '../../shared/noi-dung/index.ts'
import type { Db } from '../db/index.ts'
import { layRevision, tangRevision } from '../db/settings.ts'
import { LoiApi } from '../loi.ts'
import type { TrangThaiApDung } from './ap-dung.ts'
import { tongGiayCuaMuc } from './dong-ho.ts'
import {
  THUC_HANH_TRONG,
  type CauTuKiemTra,
  type DiemCham,
  type DuLieuHoc,
  type KetQuaGhiGhiChu,
  type KetQuaGhiNoiLai,
  type KetQuaGhiThucHanh,
  type KetQuaGhiTuKiemTra,
  type ThucHanh,
  type TieuChiCu,
  type VanBanLuu,
  type YeuCauThucHanh,
  type YeuCauTuKiemTra,
} from './hop-dong-hoc.ts'
import { docTheCuaMuc } from './the.ts'
import { TB_HOC } from './thong-bao.ts'

// Đọc / ghi dữ liệu học của một mục (đề xuất 2.1, 3.2): Nói lại (restatements), bài thực hành (practice), tự kiểm
// tra (self_check), ghi chú (notes); gán lại khoá câu hỏi / tiêu chí khi bài đổi (1.5). Mỗi lần ghi: MỘT
// transaction gồm thay đổi + tăng revision; không có gì đổi thì không ghi (daDoi false). Kiểm id có trong cây (bất
// biến 8) và kiểm dạng body là việc của route; ở đây kiểm quy tắc nghiệp vụ (LoiApi 400 / 409). Tham số `luc` (ms)
// chỉ để seed / test đặt thời điểm.

const iso = (luc: number) => new Date(luc).toISOString()

// ---------- Nói lại, Ghi chú (một ô chữ mỗi mục) ----------

type BangVanBan = { bang: 'restatements'; cot: 'text' } | { bang: 'notes'; cot: 'body' }
const NOI_LAI: BangVanBan = { bang: 'restatements', cot: 'text' }
const GHI_CHU: BangVanBan = { bang: 'notes', cot: 'body' }

function docVanBan(db: Db, { bang, cot }: BangVanBan, id: string): VanBanLuu | null {
  const dong = db
    .prepare(`SELECT ${cot} AS text, updated_at AS capNhat FROM ${bang} WHERE item_id = ?`)
    .get(id) as VanBanLuu | undefined
  return dong ?? null
}

/** Ghi ô chữ: chỉ có khoảng trắng = xoá hàng. Trả giá trị mới và có đổi không. */
function ghiVanBan(
  db: Db,
  b: BangVanBan,
  id: string,
  text: string,
  luc: number,
): { revision: number; daDoi: boolean; giaTri: VanBanLuu | null } {
  const at = iso(luc)
  return db.transaction(() => {
    const cu = docVanBan(db, b, id)
    const xoa = text.trim() === ''
    if ((xoa && !cu) || (!xoa && cu?.text === text)) {
      return { revision: layRevision(db), daDoi: false, giaTri: cu }
    }
    if (xoa) {
      db.prepare(`DELETE FROM ${b.bang} WHERE item_id = ?`).run(id)
    } else {
      db.prepare(
        `INSERT INTO ${b.bang} (item_id, ${b.cot}, created_at, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(item_id) DO UPDATE SET ${b.cot} = excluded.${b.cot}, updated_at = excluded.updated_at`,
      ).run(id, text, at, at)
    }
    return { revision: tangRevision(db), daDoi: true, giaTri: xoa ? null : { text, capNhat: at } }
  })()
}

export function docNoiLai(db: Db, id: string): VanBanLuu | null {
  return docVanBan(db, NOI_LAI, id)
}

export function docGhiChu(db: Db, id: string): VanBanLuu | null {
  return docVanBan(db, GHI_CHU, id)
}

/** PUT /api/hoc/:id/noi-lai */
export function ghiNoiLai(db: Db, id: string, text: string, luc: number = now()): KetQuaGhiNoiLai {
  const { revision, daDoi, giaTri } = ghiVanBan(db, NOI_LAI, id, text, luc)
  return { revision, daDoi, noiLai: giaTri }
}

/** PUT /api/hoc/:id/ghi-chu */
export function ghiGhiChu(db: Db, id: string, text: string, luc: number = now()): KetQuaGhiGhiChu {
  const { revision, daDoi, giaTri } = ghiVanBan(db, GHI_CHU, id, text, luc)
  return { revision, daDoi, ghiChu: giaTri }
}

// ---------- Bài thực hành (practice) ----------

interface DongPractice {
  project_id: number | null
  result_md: string | null
  criteria: string | null
  state: TrangThaiApDung
  na_reason: string | null
  done_at: string | null
}

/** Hàng practice như lưu; tick: khoá tiêu chí → chữ tiêu chí lúc tick (null = chưa biết). */
interface PracticeTho {
  trangThai: TrangThaiApDung
  duAnId: number | null
  ketQua: string
  tick: Map<string, string | null>
  lyDo: string | null
  xongLuc: string | null
}

/** criteria (migration 6): JSON { khoá: chữ | null }; true (trước migration 6) cũng là đã tick. */
function docTick(json: string | null): Map<string, string | null> {
  const kq = new Map<string, string | null>()
  if (!json) return kq
  for (const [k, v] of Object.entries(JSON.parse(json) as Record<string, unknown>)) {
    if (typeof v === 'string') kq.set(k, v)
    else if (v === null || v === true) kq.set(k, null)
  }
  return kq
}

function luuTick(tick: ReadonlyMap<string, string | null>): string | null {
  return tick.size ? JSON.stringify(Object.fromEntries(tick)) : null
}

function docPracticeTho(db: Db, id: string): PracticeTho | null {
  const dong = db
    .prepare(
      'SELECT project_id, result_md, criteria, state, na_reason, done_at FROM practice WHERE item_id = ?',
    )
    .get(id) as DongPractice | undefined
  if (!dong) return null
  return {
    trangThai: dong.state,
    duAnId: dong.project_id,
    ketQua: dong.result_md ?? '',
    tick: docTick(dong.criteria),
    lyDo: dong.state === 'khong-ap-dung' ? dong.na_reason : null,
    xongLuc: dong.state === 'xong' ? dong.done_at : null,
  }
}

/** Khoá tick đang có trong bài (`trongBai` undefined = chưa biết bài: mọi tick). */
const tickTrongBai = (tick: ReadonlyMap<string, unknown>, trongBai?: ReadonlySet<string>) =>
  [...tick.keys()].filter((k) => !trongBai || trongBai.has(k))

/**
 * Hàng practice → ThucHanh của API theo bài hiện tại (đề xuất 1.5): tick dưới khoá không còn trong bài không hiện,
 * không tính; hàng chỉ còn giữ những tick đó (Đang làm, không dự án, không kết quả) là chưa làm.
 */
function sangThucHanh(tho: PracticeTho | null, trongBai?: ReadonlySet<string>): ThucHanh {
  if (!tho) return { ...THUC_HANH_TRONG, tieuChi: {} }
  const hien = tickTrongBai(tho.tick, trongBai)
  const chiConTickCu =
    tho.trangThai === 'dang-lam' &&
    tho.duAnId === null &&
    tho.ketQua.trim() === '' &&
    hien.length === 0 &&
    tho.tick.size > 0
  if (chiConTickCu) return { ...THUC_HANH_TRONG, tieuChi: {} }
  return {
    trangThai: tho.trangThai,
    duAnId: tho.duAnId,
    ketQua: tho.ketQua,
    tieuChi: Object.fromEntries(hien.map((k) => [k, true])),
    lyDo: tho.lyDo,
    xongLuc: tho.xongLuc,
  }
}

/** Tick dưới khoá không còn trong bài (chưa biết bài → không có). */
function tieuChiCuCua(tho: PracticeTho | null, trongBai?: ReadonlySet<string>): TieuChiCu[] {
  if (!tho || !trongBai) return []
  return [...tho.tick].filter(([khoa]) => !trongBai.has(khoa)).map(([khoa, chu]) => ({ khoa, chu }))
}

/** Bài thực hành của mục theo bài hiện tại (`khoaTieuChi` undefined = chưa biết bài). */
export function docThucHanh(db: Db, id: string, khoaTieuChi?: ReadonlySet<string>): ThucHanh {
  return sangThucHanh(docPracticeTho(db, id), khoaTieuChi)
}

function giongThucHanh(a: ThucHanh, b: ThucHanh): boolean {
  const ka = Object.keys(a.tieuChi).sort()
  const kb = Object.keys(b.tieuChi).sort()
  return (
    a.trangThai === b.trangThai &&
    a.duAnId === b.duAnId &&
    a.ketQua === b.ketQua &&
    a.lyDo === b.lyDo &&
    a.xongLuc === b.xongLuc &&
    ka.length === kb.length &&
    ka.every((k, i) => k === kb[i])
  )
}

export interface ThamSoThucHanh {
  id: string
  /** Body đã qua zod (kiểu, độ dài, khoá) */
  yeuCau: YeuCauThucHanh
  /**
   * Tiêu chí đang có trong bài của mục (khoá + chữ, đề xuất 1.5). undefined = chưa biết bài (lỗi đọc file; seed):
   * mọi tick đều tính, không kiểm khoá, không lưu chữ.
   */
  tieuChiTrongBai?: readonly DongTrongBai[]
  luc?: number
}

/**
 * PUT /api/hoc/:id/thuc-hanh — quy tắc ở YeuCauThucHanh (hop-dong-hoc.ts), như nhau cho mọi mẫu bài (phạm vi rút
 * gọn 27/10/2026). MỘT transaction: đọc giá trị cũ, gộp, kiểm quy tắc, ghi / xoá hàng practice, tăng revision.
 * Tick lưu kèm chữ tiêu chí; tick dưới khoá không còn trong bài được giữ nguyên (không bao giờ xoá), không tính.
 */
export function ghiThucHanh(db: Db, thamSo: ThamSoThucHanh): KetQuaGhiThucHanh {
  const { id, yeuCau: yc } = thamSo
  const at = iso(thamSo.luc ?? now())
  const chuTieuChi = thamSo.tieuChiTrongBai
    ? new Map(thamSo.tieuChiTrongBai.map((t) => [t.khoa, t.chu]))
    : undefined
  const trongBai = chuTieuChi ? new Set(chuTieuChi.keys()) : undefined

  return db.transaction((): KetQuaGhiThucHanh => {
    const tho = docPracticeTho(db, id)
    // Chỉ tick được tiêu chí của bài; khoá cũ đã tick sẵn (web gửi lại cả bảng tick từ dữ liệu cũ) thì bỏ qua
    for (const [k, v] of Object.entries(yc.tieuChi ?? {})) {
      if (v && trongBai && !trongBai.has(k) && !tho?.tick.has(k)) {
        throw new LoiApi(409, TB_HOC.tieuChiKhongCo(k))
      }
    }
    const truoc = sangThucHanh(tho, trongBai)
    let trangThai = yc.trangThai !== undefined ? yc.trangThai : truoc.trangThai
    const duAnId = yc.duAnId !== undefined ? yc.duAnId : truoc.duAnId
    const ketQua = yc.ketQua ?? truoc.ketQua
    const tick = new Map(tho?.tick)
    for (const [k, v] of Object.entries(yc.tieuChi ?? {})) {
      if (!v) tick.delete(k)
      else tick.set(k, chuTieuChi?.get(k) ?? tick.get(k) ?? null)
    }
    const hien = tickTrongBai(tick, trongBai)

    if (yc.lyDo !== undefined && trangThai !== 'khong-ap-dung') {
      throw new LoiApi(400, TB_HOC.lyDoChiKhiKhongApDung)
    }
    const lyDo = trangThai === 'khong-ap-dung' ? (yc.lyDo?.trim() ?? truoc.lyDo) : null
    if (trangThai === 'khong-ap-dung' && !lyDo) throw new LoiApi(400, TB_HOC.canLyDo)
    if (duAnId !== null && duAnId !== truoc.duAnId) {
      const co = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(duAnId)
      if (!co) throw new LoiApi(400, TB_HOC.khongCoDuAn(duAnId))
    }

    const coDuLieu = duAnId !== null || ketQua.trim() !== '' || hien.length > 0
    if (trangThai === null && coDuLieu) trangThai = 'dang-lam'
    if (trangThai === 'xong' && ketQua.trim() === '') {
      // Xong khi ô Kết quả có chữ (3.2): đặt Xong mà chưa có kết quả → từ chối; xoá hết kết quả khi đang Xong
      // → về Đang làm.
      if (yc.trangThai === 'xong') throw new LoiApi(409, TB_HOC.canKetQua)
      trangThai = 'dang-lam'
    }

    const sau: ThucHanh = {
      trangThai,
      duAnId: trangThai === null ? null : duAnId,
      ketQua: trangThai === null ? '' : ketQua,
      tieuChi: trangThai === null ? {} : Object.fromEntries(hien.map((k) => [k, true])),
      lyDo,
      xongLuc: trangThai === 'xong' ? (truoc.trangThai === 'xong' ? truoc.xongLuc : at) : null,
    }
    if (giongThucHanh(truoc, sau)) {
      return { revision: layRevision(db), daDoi: false, thucHanh: truoc, truoc }
    }

    // Chưa làm: chỉ còn tick cũ (khoá không còn trong bài) thì giữ hàng Đang làm để không mất chúng —
    // sangThucHanh vẫn đọc là chưa làm.
    if (sau.trangThai === null && tick.size === 0) {
      db.prepare('DELETE FROM practice WHERE item_id = ?').run(id)
    } else {
      db.prepare(
        `INSERT INTO practice
           (item_id, project_id, result_md, criteria, state, na_reason, done_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(item_id) DO UPDATE SET
           project_id = excluded.project_id, result_md = excluded.result_md, criteria = excluded.criteria,
           state = excluded.state, na_reason = excluded.na_reason, done_at = excluded.done_at,
           updated_at = excluded.updated_at`,
      ).run(
        id,
        sau.duAnId,
        sau.ketQua === '' ? null : sau.ketQua,
        luuTick(tick),
        sau.trangThai ?? 'dang-lam',
        sau.lyDo,
        sau.xongLuc,
        at,
        at,
      )
    }
    return { revision: tangRevision(db), daDoi: true, thucHanh: sau, truoc }
  })()
}

// ---------- Tự kiểm tra (self_check) ----------

interface DongTuKiemTra {
  question_key: string
  answer: string | null
  revealed_at: string | null
  grade: DiemCham | null
  graded_at: string | null
  question_text: string | null
}

function sangCau(dong: DongTuKiemTra): CauTuKiemTra {
  return {
    traLoi: dong.answer ?? '',
    daXem: dong.revealed_at !== null,
    cham: dong.grade,
    chamLuc: dong.graded_at,
    cauHoi: dong.question_text,
  }
}

const COT_TU_KIEM_TRA = 'question_key, answer, revealed_at, grade, graded_at, question_text'

export function docTuKiemTra(db: Db, id: string): Record<string, CauTuKiemTra> {
  const kq: Record<string, CauTuKiemTra> = {}
  const cacDong = db
    .prepare(`SELECT ${COT_TU_KIEM_TRA} FROM self_check WHERE item_id = ? ORDER BY question_key`)
    .all(id) as DongTuKiemTra[]
  for (const dong of cacDong) kq[dong.question_key] = sangCau(dong)
  return kq
}

export interface ThamSoTuKiemTra {
  id: string
  khoa: string
  yeuCau: YeuCauTuKiemTra
  /**
   * Chữ câu hỏi của khoá trong bài hiện tại (đề xuất 1.5) — lưu cùng câu trả lời để gán lại khi câu đổi chữ.
   * undefined = khoá không có trong bài / chưa biết bài: giữ chữ đã lưu (nếu có).
   */
  cauHoi?: string
  luc?: number
}

/**
 * PUT /api/hoc/:id/tu-kiem-tra/:khoa (đề xuất 3.2): "Xem đáp án" chỉ khi câu trả lời có chữ; Đúng / Một phần /
 * Sai chỉ sau khi xem; lưu lần chấm mới nhất (chấm lại cùng mức thì không đổi gì). Câu không còn gì (trả lời
 * rỗng, chưa xem, chưa chấm) thì xoá hàng. Khoá không có trong bài vẫn ghi được (câu người học đã viết không bị
 * bỏ): hiện dưới "Câu trả lời cho câu hỏi cũ".
 */
export function ghiTuKiemTra(db: Db, thamSo: ThamSoTuKiemTra): KetQuaGhiTuKiemTra {
  const { id, khoa, yeuCau: yc } = thamSo
  const at = iso(thamSo.luc ?? now())
  return db.transaction((): KetQuaGhiTuKiemTra => {
    const dong = db
      .prepare(`SELECT ${COT_TU_KIEM_TRA} FROM self_check WHERE item_id = ? AND question_key = ?`)
      .get(id, khoa) as DongTuKiemTra | undefined
    const truoc = dong ? sangCau(dong) : null
    const traLoi = yc.traLoi ?? truoc?.traLoi ?? ''
    if (yc.daXem && !truoc?.daXem && traLoi.trim() === '') {
      throw new LoiApi(409, TB_HOC.traLoiTruoc)
    }
    const daXemLuc = dong?.revealed_at ?? (yc.daXem ? at : null)
    if (yc.cham !== undefined && daXemLuc === null) throw new LoiApi(409, TB_HOC.xemTruocKhiCham)
    const doiCham = yc.cham !== undefined && yc.cham !== truoc?.cham
    const cham = yc.cham ?? truoc?.cham ?? null
    const chamLuc = doiCham ? at : (truoc?.chamLuc ?? null)
    const cauHoi = thamSo.cauHoi ?? truoc?.cauHoi ?? null

    const sau: CauTuKiemTra | null =
      traLoi === '' && daXemLuc === null && cham === null
        ? null
        : { traLoi, daXem: daXemLuc !== null, cham, chamLuc, cauHoi }
    const giong =
      sau === null
        ? truoc === null
        : truoc !== null &&
          truoc.traLoi === sau.traLoi &&
          truoc.daXem === sau.daXem &&
          truoc.cham === sau.cham &&
          truoc.chamLuc === sau.chamLuc
    if (giong) return { revision: layRevision(db), daDoi: false, khoa, cau: truoc, truoc }

    if (sau === null) {
      db.prepare('DELETE FROM self_check WHERE item_id = ? AND question_key = ?').run(id, khoa)
    } else {
      db.prepare(
        `INSERT INTO self_check
           (item_id, question_key, answer, revealed_at, grade, graded_at, question_text, created_at,
            updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(item_id, question_key) DO UPDATE SET
           answer = excluded.answer, revealed_at = excluded.revealed_at, grade = excluded.grade,
           graded_at = excluded.graded_at, question_text = excluded.question_text,
           updated_at = excluded.updated_at`,
      ).run(id, khoa, traLoi === '' ? null : traLoi, daXemLuc, cham, chamLuc, cauHoi, at, at)
    }
    return { revision: tangRevision(db), daDoi: true, khoa, cau: sau, truoc }
  })()
}

// ---------- Gán lại khoá khi bài đổi (đề xuất 1.5) ----------

/** Bỏ khoá trùng (hai khối Tự kiểm tra / Thực hành trùng tên có thể ra cùng khoá), giữ lần đầu. */
function khoaKhongTrung(ds: readonly DongTrongBai[]): DongTrongBai[] {
  const da = new Set<string>()
  const kq: DongTrongBai[] = []
  for (const d of ds) {
    if (da.has(d.khoa)) continue
    da.add(d.khoa)
    kq.push(d)
  }
  return kq
}

/**
 * Gán lại khoá theo bài hiện tại — GET /api/hoc/:id chạy trước khi đọc. MỘT transaction:
 * - điền chữ câu / tiêu chí cho dữ liệu có khoá còn trong bài mà chưa lưu chữ (hàng trước migration 6) — không
 *   đổi gì người dùng thấy nên không tăng revision;
 * - câu trả lời có khoá không còn trong bài → câu mới chưa có câu trả lời (ganLaiKhoa: Dice ≥ 0,8, hơn ứng viên
 *   thứ hai ≥ 0,15), kèm thẻ tạo từ câu đó (flashcards.source_question_key); tick tiêu chí cũ → tiêu chí mới chưa
 *   tick. Không gán được thì giữ nguyên dưới khoá cũ. Có gán thì tăng revision.
 * Trả số khoá đã gán lại.
 */
export function ganLaiTheoBai(db: Db, id: string, trongBai: DanhSachTrongBai): number {
  return db.transaction((): number => {
    let soGan = 0

    const cauTheoKhoa = new Map(trongBai.cauHoi.map((c) => [c.khoa, c.chu]))
    const hang = db
      .prepare(
        'SELECT question_key AS khoa, question_text AS chu FROM self_check WHERE item_id = ?',
      )
      .all(id) as DongCu[]
    const dienChu = db.prepare(
      'UPDATE self_check SET question_text = ? WHERE item_id = ? AND question_key = ?',
    )
    for (const h of hang) {
      const chu = cauTheoKhoa.get(h.khoa)
      if (chu !== undefined && h.chu !== chu) dienChu.run(chu, id, h.khoa)
    }
    const coHang = new Set(hang.map((h) => h.khoa))
    const ganCau = ganLaiKhoa(
      hang.filter((h) => !cauTheoKhoa.has(h.khoa)),
      khoaKhongTrung(trongBai.cauHoi).filter((c) => !coHang.has(c.khoa)),
    )
    const doiKhoa = db.prepare(
      'UPDATE self_check SET question_key = ?, question_text = ? WHERE item_id = ? AND question_key = ?',
    )
    const doiThe = db.prepare(
      'UPDATE flashcards SET source_question_key = ? WHERE item_id = ? AND source_question_key = ?',
    )
    for (const [cu, moi] of ganCau) {
      doiKhoa.run(moi.khoa, moi.chu, id, cu)
      doiThe.run(moi.khoa, id, cu)
      soGan++
    }

    const tho = docPracticeTho(db, id)
    if (tho && tho.tick.size > 0) {
      const tieuChiTheoKhoa = new Map(trongBai.tieuChi.map((t) => [t.khoa, t.chu]))
      const tick = new Map(tho.tick)
      let doi = false
      for (const [khoa, chu] of tick) {
        const moi = tieuChiTheoKhoa.get(khoa)
        if (moi !== undefined && chu !== moi) {
          tick.set(khoa, moi)
          doi = true
        }
      }
      const ganTick = ganLaiKhoa(
        [...tick]
          .filter(([khoa]) => !tieuChiTheoKhoa.has(khoa))
          .map(([khoa, chu]) => ({ khoa, chu })),
        khoaKhongTrung(trongBai.tieuChi).filter((t) => !tick.has(t.khoa)),
      )
      for (const [cu, moi] of ganTick) {
        tick.delete(cu)
        tick.set(moi.khoa, moi.chu)
        doi = true
        soGan++
      }
      if (doi) {
        db.prepare('UPDATE practice SET criteria = ? WHERE item_id = ?').run(luuTick(tick), id)
      }
    }

    if (soGan > 0) tangRevision(db)
    return soGan
  })()
}

// ---------- Tổng hợp ----------

/**
 * GET /api/hoc/:id — mọi dữ liệu học của một mục, đọc trong một transaction (ảnh chụp nhất quán). `trongBai`: câu
 * hỏi / tiêu chí của bài hiện tại (undefined = chưa biết bài: không lọc tick, không có tieuChiCu).
 */
export function docDuLieuHoc(db: Db, id: string, trongBai?: DanhSachTrongBai): DuLieuHoc {
  const khoaTieuChi = trongBai ? new Set(trongBai.tieuChi.map((t) => t.khoa)) : undefined
  return db.transaction((): DuLieuHoc => {
    const thucHanh = docPracticeTho(db, id)
    return {
      revision: layRevision(db),
      noiLai: docNoiLai(db, id),
      thucHanh: sangThucHanh(thucHanh, khoaTieuChi),
      tuKiemTra: docTuKiemTra(db, id),
      tieuChiCu: tieuChiCuCua(thucHanh, khoaTieuChi),
      ghiChu: docGhiChu(db, id),
      the: docTheCuaMuc(db, id),
      banCuaToi: { coHoanThanh: false },
      keHoachThi: { coNgayThi: false },
      daHocGiay: tongGiayCuaMuc(db, id),
    }
  })()
}
