// API bước Áp dụng (đề xuất 2.1 bảng practice, 3.2; §1). Phase 2a chỉ có "Không áp dụng" + lý do cho
// Chứng chỉ (khối Kế hoạch thi); phase 3 mở cho Chủ đề / Tài liệu (MAU_DANH_DAU_DUOC) và thêm bài thực hành.
// - GET    /api/ap-dung      { revision, apDung: { [id]: { trangThai, lyDo? } } }, chỉ mục còn trong cây;
// - PUT    /api/ap-dung/:id  { khongApDung: true, lyDo } → Không áp dụng kèm lý do (đã bỏ khoảng trắng hai
//                            đầu, 1–500 ký tự);
// - DELETE /api/ap-dung/:id  bỏ đánh dấu Không áp dụng (Hoàn tác của PUT khi trước đó chưa đánh dấu).
// id phải là mục học của cây (bất biến 8), không thì 404; mẫu bài chưa được đánh dấu → 409. Mọi lần ghi: một
// transaction gồm thay đổi + tăng revision; không có gì đổi thì không ghi.
import { Router, type Request } from 'express'
import { z } from 'zod'
import { now } from '../../shared/clock.ts'
import { TEN_LOAI } from '../../shared/domain/trang-thai.ts'
import type { Cay, MucHoc } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import { layRevision, tangRevision } from '../db/settings.ts'
import {
  LY_DO_AP_DUNG_TOI_DA,
  MAU_DANH_DAU_DUOC,
  type AnhChupApDung,
  type KetQuaGhiApDung,
  type MucApDung,
  type TrangThaiApDung,
} from '../du-lieu/ap-dung.ts'
import { LoiApi } from '../loi.ts'

// ---------- Đọc / ghi bảng practice ----------

interface DongApDung {
  item_id: string
  state: TrangThaiApDung
  na_reason: string | null
  project_id: number | null
  result_md: string | null
  criteria: string | null
}

const COT = 'item_id, state, na_reason, project_id, result_md, criteria'

function sangMuc(dong: DongApDung): MucApDung {
  return dong.state === 'khong-ap-dung' && dong.na_reason !== null
    ? { trangThai: dong.state, lyDo: dong.na_reason }
    : { trangThai: dong.state }
}

function docDong(db: Db, id: string): DongApDung | undefined {
  return db.prepare(`SELECT ${COT} FROM practice WHERE item_id = ?`).get(id) as
    DongApDung | undefined
}

/** Áp dụng hiện tại của một mục; undefined = chưa làm (không có hàng). */
export function docMucApDung(db: Db, id: string): MucApDung | undefined {
  const dong = docDong(db, id)
  return dong && sangMuc(dong)
}

/** Dữ liệu cho GET /api/ap-dung; `laMuc` lọc theo cây (bản ghi mục không còn trong cây vẫn giữ trong DB). */
export function docAnhChupApDung(
  db: Db,
  laMuc: (id: string) => boolean = () => true,
): AnhChupApDung {
  const apDung: Record<string, MucApDung> = {}
  const cacDong = db.prepare(`SELECT ${COT} FROM practice ORDER BY item_id`).all() as DongApDung[]
  for (const dong of cacDong) if (laMuc(dong.item_id)) apDung[dong.item_id] = sangMuc(dong)
  return { revision: layRevision(db), apDung }
}

export interface ThamSoKhongApDung {
  id: string
  /** Lý do (route đã kiểm 1–500 ký tự); khoảng trắng hai đầu bị bỏ */
  lyDo: string
  /** Thời điểm (ms); mặc định now() */
  luc?: number
}

/**
 * Đánh dấu bước Áp dụng của một mục là Không áp dụng kèm lý do, trong MỘT transaction: thêm / cập nhật hàng
 * practice (giữ dự án, kết quả, tiêu chí đã có) + tăng revision. Đang Không áp dụng với cùng lý do thì không
 * ghi gì (daDoi false).
 */
export function danhDauKhongApDung(db: Db, thamSo: ThamSoKhongApDung): KetQuaGhiApDung {
  const { id } = thamSo
  const lyDo = thamSo.lyDo.trim()
  const at = new Date(thamSo.luc ?? now()).toISOString()
  const moi: MucApDung = { trangThai: 'khong-ap-dung', lyDo }

  return db.transaction((): KetQuaGhiApDung => {
    const dong = docDong(db, id)
    const truoc = dong ? sangMuc(dong) : null
    if (truoc?.trangThai === 'khong-ap-dung' && truoc.lyDo === lyDo) {
      return { revision: layRevision(db), id, muc: truoc, truoc, daDoi: false }
    }
    db.prepare(
      `INSERT INTO practice (item_id, state, na_reason, created_at, updated_at)
       VALUES (?, 'khong-ap-dung', ?, ?, ?)
       ON CONFLICT(item_id) DO UPDATE SET
         state = excluded.state, na_reason = excluded.na_reason, updated_at = excluded.updated_at`,
    ).run(id, lyDo, at, at)
    return { revision: tangRevision(db), id, muc: moi, truoc, daDoi: true }
  })()
}

/**
 * Bỏ đánh dấu Không áp dụng trong MỘT transaction (+ tăng revision): hàng chỉ có dấu này thì xoá (về chưa
 * làm); hàng đã có dự án / kết quả / tiêu chí (phase 3) thì về 'dang-lam', giữ các trường đó. Không đang
 * Không áp dụng thì không ghi gì (daDoi false).
 */
export function boDanhDauKhongApDung(db: Db, id: string, luc: number = now()): KetQuaGhiApDung {
  const at = new Date(luc).toISOString()
  return db.transaction((): KetQuaGhiApDung => {
    const dong = docDong(db, id)
    const truoc = dong ? sangMuc(dong) : null
    if (!dong || dong.state !== 'khong-ap-dung') {
      return { revision: layRevision(db), id, muc: truoc, truoc, daDoi: false }
    }
    const conDuLieu = dong.project_id !== null || dong.result_md !== null || dong.criteria !== null
    let muc: MucApDung | null = null
    if (conDuLieu) {
      db.prepare(
        `UPDATE practice SET state = 'dang-lam', na_reason = NULL, updated_at = ? WHERE item_id = ?`,
      ).run(at, id)
      muc = { trangThai: 'dang-lam' }
    } else {
      db.prepare('DELETE FROM practice WHERE item_id = ?').run(id)
    }
    return { revision: tangRevision(db), id, muc, truoc, daDoi: true }
  })()
}

// ---------- Route ----------

const LuocDoKhongApDung = z.strictObject({
  khongApDung: z.literal(true),
  lyDo: z.string().trim().min(1).max(LY_DO_AP_DUNG_TOI_DA),
})

type VanDe = z.core.$ZodIssue

/** Câu lỗi tiếng Việt cho vấn đề đầu tiên của body PUT /api/ap-dung/:id. */
function cauLoiKhongApDung(vanDe: VanDe | undefined): string {
  if (!vanDe) return 'Yêu cầu không hợp lệ.'
  if (vanDe.code === 'unrecognized_keys') {
    return `Trường không được nhận: ${vanDe.keys.join(', ')}. Chỉ nhận khongApDung, lyDo.`
  }
  switch (vanDe.path[0]) {
    case 'khongApDung':
      return 'khongApDung phải là true. Bỏ đánh dấu Không áp dụng thì gửi DELETE /api/ap-dung/:id.'
    case 'lyDo':
      if (vanDe.code === 'too_small') return 'Cần ghi lý do Không áp dụng (không để trống).'
      if (vanDe.code === 'too_big') {
        return `Lý do Không áp dụng dài tối đa ${LY_DO_AP_DUNG_TOI_DA} ký tự.`
      }
      return 'Cần lyDo: lý do Không áp dụng, dạng chuỗi.'
    default:
      return 'Thân yêu cầu phải là JSON dạng { "khongApDung": true, "lyDo": "…" }.'
  }
}

export function routeApDung(db: Db, cay: Pick<Cay, 'mucTheoId'>): Router {
  const r = Router()
  const laMuc = (id: string) => cay.mucTheoId.has(id)

  /** Mục học của route (bất biến 8: phải có trong cây, không thì 404) và được đánh dấu ở phase này (409). */
  function mucGhiDuoc(req: Request<{ id: string }>): MucHoc {
    const id = req.params.id
    const muc = cay.mucTheoId.get(id)
    if (!muc) throw new LoiApi(404, `Không có mục học id "${id}" trong cây roadmap.`)
    if (!MAU_DANH_DAU_DUOC.includes(muc.mau)) {
      throw new LoiApi(
        409,
        `Mục "${muc.label}" là ${TEN_LOAI[muc.mau]}: hiện chỉ mục ${TEN_LOAI['chung-chi']} đánh dấu Không áp dụng được (khối Kế hoạch thi); bước Áp dụng của ${TEN_LOAI['chu-de']} và ${TEN_LOAI['tai-lieu']} có ở phase 3.`,
      )
    }
    return muc
  }

  r.get('/ap-dung', (_req, res) => {
    const phanHoi: AnhChupApDung = docAnhChupApDung(db, laMuc)
    res.json(phanHoi)
  })

  r.put('/ap-dung/:id', (req: Request<{ id: string }>, res) => {
    const muc = mucGhiDuoc(req)
    const kq = LuocDoKhongApDung.safeParse(req.body)
    if (!kq.success) throw new LoiApi(400, cauLoiKhongApDung(kq.error.issues[0]))
    const phanHoi: KetQuaGhiApDung = danhDauKhongApDung(db, { id: muc.id, lyDo: kq.data.lyDo })
    res.json(phanHoi)
  })

  r.delete('/ap-dung/:id', (req: Request<{ id: string }>, res) => {
    const phanHoi: KetQuaGhiApDung = boDanhDauKhongApDung(db, mucGhiDuoc(req).id)
    res.json(phanHoi)
  })

  return r
}
