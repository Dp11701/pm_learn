// API bước Áp dụng kiểu phase 2a (đề xuất 2.1 bảng practice, 3.2; §1). Từ phase 3 là lối tắt (bí danh) của
// PUT /api/hoc/:id/thuc-hanh (routes/hoc.ts) và nhận MỌI mẫu bài; web phase 3 không còn gọi (dùng /api/hoc/:id),
// giữ cho công cụ / test. Không đọc bài nên không lọc tick theo bài (đề xuất 1.5 làm ở GET /api/hoc/:id):
// - GET    /api/ap-dung      { revision, apDung: { [id]: { trangThai, lyDo? } } }, chỉ mục còn trong cây;
// - PUT    /api/ap-dung/:id  { khongApDung: true, lyDo } = thuc-hanh { trangThai: 'khong-ap-dung', lyDo };
// - DELETE /api/ap-dung/:id  bỏ đánh dấu Không áp dụng = thuc-hanh { trangThai: null } khi đang Không áp dụng
//                            (còn dự án / kết quả / tiêu chí thì về Đang làm).
// id phải là mục học của cây (bất biến 8), không thì 404. Mọi lần ghi: một transaction gồm thay đổi + tăng
// revision; không có gì đổi thì không ghi.
import { Router, type Request } from 'express'
import { z } from 'zod'
import { now } from '../../shared/clock.ts'
import type { Cay } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import { layRevision } from '../db/settings.ts'
import {
  LY_DO_AP_DUNG_TOI_DA,
  type AnhChupApDung,
  type KetQuaGhiApDung,
  type MucApDung,
  type TrangThaiApDung,
} from '../du-lieu/ap-dung.ts'
import { docThucHanh, ghiThucHanh } from '../du-lieu/hoc.ts'
import type { ThucHanh } from '../du-lieu/hop-dong-hoc.ts'
import { LoiApi } from '../loi.ts'
import { mucCuaThamSo } from './kiem-body.ts'

// ---------- Đọc / ghi bảng practice ----------

/** ThucHanh (phase 3) → hình dạng phase 2a; chưa làm → null. */
function sangMuc(th: ThucHanh): MucApDung | null {
  if (th.trangThai === null) return null
  return th.trangThai === 'khong-ap-dung' && th.lyDo !== null
    ? { trangThai: th.trangThai, lyDo: th.lyDo }
    : { trangThai: th.trangThai }
}

/** Áp dụng hiện tại của một mục; undefined = chưa làm (không có hàng). */
export function docMucApDung(db: Db, id: string): MucApDung | undefined {
  return sangMuc(docThucHanh(db, id)) ?? undefined
}

/** Dữ liệu cho GET /api/ap-dung; `laMuc` lọc theo cây (bản ghi mục không còn trong cây vẫn giữ trong DB). */
export function docAnhChupApDung(
  db: Db,
  laMuc: (id: string) => boolean = () => true,
): AnhChupApDung {
  const apDung: Record<string, MucApDung> = {}
  const cacDong = db
    .prepare('SELECT item_id, state, na_reason FROM practice ORDER BY item_id')
    .all() as { item_id: string; state: TrangThaiApDung; na_reason: string | null }[]
  for (const d of cacDong) {
    if (!laMuc(d.item_id)) continue
    apDung[d.item_id] =
      d.state === 'khong-ap-dung' && d.na_reason !== null
        ? { trangThai: d.state, lyDo: d.na_reason }
        : { trangThai: d.state }
  }
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
 * Đánh dấu bước Áp dụng là Không áp dụng kèm lý do (giữ dự án, kết quả, tiêu chí đã có), trong MỘT transaction +
 * tăng revision. Đang Không áp dụng với cùng lý do thì không ghi gì (daDoi false).
 */
export function danhDauKhongApDung(db: Db, thamSo: ThamSoKhongApDung): KetQuaGhiApDung {
  const kq = ghiThucHanh(db, {
    id: thamSo.id,
    yeuCau: { trangThai: 'khong-ap-dung', lyDo: thamSo.lyDo },
    luc: thamSo.luc ?? now(),
  })
  return {
    revision: kq.revision,
    id: thamSo.id,
    muc: sangMuc(kq.thucHanh),
    truoc: sangMuc(kq.truoc),
    daDoi: kq.daDoi,
  }
}

/**
 * Bỏ đánh dấu Không áp dụng trong MỘT transaction (+ tăng revision): không còn dữ liệu thì xoá hàng (về chưa làm);
 * còn dự án / kết quả / tiêu chí thì về 'dang-lam'. Không đang Không áp dụng thì không ghi gì (daDoi false).
 */
export function boDanhDauKhongApDung(db: Db, id: string, luc: number = now()): KetQuaGhiApDung {
  return db.transaction((): KetQuaGhiApDung => {
    const hienTai = docThucHanh(db, id)
    if (hienTai.trangThai !== 'khong-ap-dung') {
      const muc = sangMuc(hienTai)
      return { revision: layRevision(db), id, muc, truoc: muc, daDoi: false }
    }
    const kq = ghiThucHanh(db, { id, yeuCau: { trangThai: null }, luc })
    return {
      revision: kq.revision,
      id,
      muc: sangMuc(kq.thucHanh),
      truoc: sangMuc(kq.truoc),
      daDoi: kq.daDoi,
    }
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

  r.get('/ap-dung', (_req, res) => {
    const phanHoi: AnhChupApDung = docAnhChupApDung(db, laMuc)
    res.json(phanHoi)
  })

  r.put('/ap-dung/:id', (req: Request<{ id: string }>, res) => {
    const muc = mucCuaThamSo(cay, req)
    const kq = LuocDoKhongApDung.safeParse(req.body)
    if (!kq.success) throw new LoiApi(400, cauLoiKhongApDung(kq.error.issues[0]))
    const phanHoi: KetQuaGhiApDung = danhDauKhongApDung(db, { id: muc.id, lyDo: kq.data.lyDo })
    res.json(phanHoi)
  })

  r.delete('/ap-dung/:id', (req: Request<{ id: string }>, res) => {
    const phanHoi: KetQuaGhiApDung = boDanhDauKhongApDung(db, mucCuaThamSo(cay, req).id)
    res.json(phanHoi)
  })

  return r
}
