import { now } from '../../shared/clock.ts'
import { TEN_LOAI } from '../../shared/domain/trang-thai.ts'
import type { MauBai } from '../../shared/roadmap/types.ts'
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
  type VanBanLuu,
  type YeuCauThucHanh,
  type YeuCauTuKiemTra,
} from './hop-dong-hoc.ts'
import { docTheCuaMuc } from './the.ts'
import { TB_HOC } from './thong-bao.ts'

// Đọc / ghi dữ liệu học của một mục (đề xuất 2.1, 3.2): Nói lại (restatements), bài thực hành (practice), tự kiểm
// tra (self_check), ghi chú (notes). Mỗi lần ghi: MỘT transaction gồm thay đổi + tăng revision; không có gì đổi
// thì không ghi (daDoi false). Kiểm id có trong cây (bất biến 8) và kiểm dạng body là việc của route; ở đây kiểm
// quy tắc nghiệp vụ (LoiApi 400 / 409). Tham số `luc` (ms) chỉ để seed / test đặt thời điểm.

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

function docTieuChi(json: string | null): Record<string, boolean> {
  if (!json) return {}
  const obj = JSON.parse(json) as Record<string, unknown>
  const kq: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(obj)) if (v === true) kq[k] = true
  return kq
}

export function docThucHanh(db: Db, id: string): ThucHanh {
  const dong = db
    .prepare(
      'SELECT project_id, result_md, criteria, state, na_reason, done_at FROM practice WHERE item_id = ?',
    )
    .get(id) as DongPractice | undefined
  if (!dong) return { ...THUC_HANH_TRONG, tieuChi: {} }
  return {
    trangThai: dong.state,
    duAnId: dong.project_id,
    ketQua: dong.result_md ?? '',
    tieuChi: docTieuChi(dong.criteria),
    lyDo: dong.state === 'khong-ap-dung' ? dong.na_reason : null,
    xongLuc: dong.state === 'xong' ? dong.done_at : null,
  }
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

/** Khối giữ bước Áp dụng của Tài liệu / Chứng chỉ (đề xuất 3.2) — cho câu lỗi 409. */
const KHOI_AP_DUNG: Record<Exclude<MauBai, 'chu-de'>, string> = {
  'tai-lieu': 'Bản của tôi',
  'chung-chi': 'Kế hoạch thi',
}

export interface ThamSoThucHanh {
  id: string
  mau: MauBai
  /** Body đã qua zod (kiểu, độ dài, khoá) */
  yeuCau: YeuCauThucHanh
  luc?: number
}

/**
 * PUT /api/hoc/:id/thuc-hanh — quy tắc ở YeuCauThucHanh (hop-dong-hoc.ts). MỘT transaction: đọc giá trị cũ, gộp,
 * kiểm quy tắc, ghi / xoá hàng practice, tăng revision.
 */
export function ghiThucHanh(db: Db, thamSo: ThamSoThucHanh): KetQuaGhiThucHanh {
  const { id, mau, yeuCau: yc } = thamSo
  const at = iso(thamSo.luc ?? now())

  if (mau !== 'chu-de') {
    const khac = (['duAnId', 'ketQua', 'tieuChi'] as const).some((k) => yc[k] !== undefined)
    if (khac || yc.trangThai === 'dang-lam' || yc.trangThai === 'xong') {
      throw new LoiApi(409, TB_HOC.chiKhongApDung(TEN_LOAI[mau], KHOI_AP_DUNG[mau]))
    }
  }

  return db.transaction((): KetQuaGhiThucHanh => {
    const truoc = docThucHanh(db, id)
    let trangThai = yc.trangThai !== undefined ? yc.trangThai : truoc.trangThai
    const duAnId = yc.duAnId !== undefined ? yc.duAnId : truoc.duAnId
    const ketQua = yc.ketQua ?? truoc.ketQua
    const tieuChi = { ...truoc.tieuChi }
    for (const [k, v] of Object.entries(yc.tieuChi ?? {})) {
      if (v) tieuChi[k] = true
      else delete tieuChi[k]
    }

    if (yc.lyDo !== undefined && trangThai !== 'khong-ap-dung') {
      throw new LoiApi(400, TB_HOC.lyDoChiKhiKhongApDung)
    }
    const lyDo = trangThai === 'khong-ap-dung' ? (yc.lyDo?.trim() ?? truoc.lyDo) : null
    if (trangThai === 'khong-ap-dung' && !lyDo) throw new LoiApi(400, TB_HOC.canLyDo)
    if (duAnId !== null && duAnId !== truoc.duAnId) {
      const co = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(duAnId)
      if (!co) throw new LoiApi(400, TB_HOC.khongCoDuAn(duAnId))
    }

    const coDuLieu = duAnId !== null || ketQua.trim() !== '' || Object.keys(tieuChi).length > 0
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
      tieuChi: trangThai === null ? {} : tieuChi,
      lyDo,
      xongLuc: trangThai === 'xong' ? (truoc.trangThai === 'xong' ? truoc.xongLuc : at) : null,
    }
    if (giongThucHanh(truoc, sau)) {
      return { revision: layRevision(db), daDoi: false, thucHanh: truoc, truoc }
    }

    if (sau.trangThai === null) {
      db.prepare('DELETE FROM practice WHERE item_id = ?').run(id)
    } else {
      const criteria = Object.keys(sau.tieuChi).length ? JSON.stringify(sau.tieuChi) : null
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
        criteria,
        sau.trangThai,
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
}

function sangCau(dong: DongTuKiemTra): CauTuKiemTra {
  return {
    traLoi: dong.answer ?? '',
    daXem: dong.revealed_at !== null,
    cham: dong.grade,
    chamLuc: dong.graded_at,
  }
}

const COT_TU_KIEM_TRA = 'question_key, answer, revealed_at, grade, graded_at'

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
  luc?: number
}

/**
 * PUT /api/hoc/:id/tu-kiem-tra/:khoa (đề xuất 3.2): "Xem đáp án" chỉ khi câu trả lời có chữ; Đúng / Một phần /
 * Sai chỉ sau khi xem; lưu lần chấm mới nhất (chấm lại cùng mức thì không đổi gì). Câu không còn gì (trả lời
 * rỗng, chưa xem, chưa chấm) thì xoá hàng.
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

    const sau: CauTuKiemTra | null =
      traLoi === '' && daXemLuc === null && cham === null
        ? null
        : { traLoi, daXem: daXemLuc !== null, cham, chamLuc }
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
           (item_id, question_key, answer, revealed_at, grade, graded_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(item_id, question_key) DO UPDATE SET
           answer = excluded.answer, revealed_at = excluded.revealed_at, grade = excluded.grade,
           graded_at = excluded.graded_at, updated_at = excluded.updated_at`,
      ).run(id, khoa, traLoi === '' ? null : traLoi, daXemLuc, cham, chamLuc, at, at)
    }
    return { revision: tangRevision(db), daDoi: true, khoa, cau: sau, truoc }
  })()
}

// ---------- Tổng hợp ----------

/** GET /api/hoc/:id — mọi dữ liệu học của một mục, đọc trong một transaction (ảnh chụp nhất quán). */
export function docDuLieuHoc(db: Db, id: string): DuLieuHoc {
  return db.transaction((): DuLieuHoc => ({
    revision: layRevision(db),
    noiLai: docNoiLai(db, id),
    thucHanh: docThucHanh(db, id),
    tuKiemTra: docTuKiemTra(db, id),
    ghiChu: docGhiChu(db, id),
    the: docTheCuaMuc(db, id),
    banCuaToi: { coHoanThanh: false },
    keHoachThi: { coNgayThi: false },
    daHocGiay: tongGiayCuaMuc(db, id),
  }))()
}
