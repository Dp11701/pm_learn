import { Router, type Request } from 'express'
import { z } from 'zod'
import { CAC_TRANG_THAI_HOC } from '../../shared/domain/trang-thai.ts'
import type { Cay } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import {
  CAC_VIA_MOT_MUC,
  LY_DO_TOI_DA,
  type AnhChupHoc,
  type KetQuaDatTrangThai,
  type KetQuaGhiLuotMo,
} from '../du-lieu/hop-dong-trang-thai.ts'
import { datTrangThai, docAnhChup, ghiLuotMo } from '../du-lieu/trang-thai.ts'
import { LoiApi } from '../loi.ts'

// API trạng thái học (đề xuất 1.10, 2.2, 3.1):
// - GET  /api/state            ảnh chụp dữ liệu học (trạng thái + lượt mở), chỉ mục còn trong cây;
// - PUT  /api/trang-thai/:id   đặt trạng thái 1 mục (Hoàn tác gửi via 'hoan-tac' với giá trị cũ);
// - POST /api/luot-mo/:id      ghi lần mở bài gần nhất.
// id phải là mục học của cây (bất biến 8), không thì 404. Đặt hàng loạt có ở phase 4.

const DS_TRANG_THAI = CAC_TRANG_THAI_HOC.join(', ')

const LuocDoDat = z
  .strictObject({
    trangThai: z.enum(CAC_TRANG_THAI_HOC),
    lyDo: z.string().max(LY_DO_TOI_DA).optional(),
    via: z.enum(CAC_VIA_MOT_MUC).optional(),
  })
  .refine((b) => b.lyDo === undefined || b.trangThai === 'bo-qua', {
    path: ['lyDo'],
    params: { chiBoQua: true },
  })

type VanDe = z.core.$ZodIssue

/** Câu lỗi tiếng Việt cho vấn đề đầu tiên của body PUT /api/trang-thai/:id. */
function cauLoiDat(vanDe: VanDe | undefined): string {
  if (!vanDe) return 'Yêu cầu không hợp lệ.'
  if (vanDe.code === 'unrecognized_keys') {
    return `Trường không được nhận: ${vanDe.keys.join(', ')}. Chỉ nhận trangThai, lyDo, via.`
  }
  switch (vanDe.path[0]) {
    case 'trangThai':
      return `trangThai không hợp lệ: cần một trong ${DS_TRANG_THAI}.`
    case 'lyDo':
      if (vanDe.code === 'custom') return 'lyDo chỉ dùng khi trangThai là bo-qua.'
      if (vanDe.code === 'too_big') return `Lý do Bỏ qua dài tối đa ${LY_DO_TOI_DA} ký tự.`
      return 'lyDo phải là chuỗi.'
    case 'via':
      return `via không hợp lệ: cần ${CAC_VIA_MOT_MUC.join(' hoặc ')}.`
    default:
      return 'Thân yêu cầu phải là JSON dạng { "trangThai": …, "lyDo"?: …, "via"?: … }.'
  }
}

export function routeTrangThai(db: Db, cay: Pick<Cay, 'mucTheoId'>): Router {
  const r = Router()
  const laMuc = (id: string) => cay.mucTheoId.has(id)

  /** id của route phải là mục học trong cây (bất biến 8). */
  function idMuc(req: Request<{ id: string }>): string {
    const id = req.params.id
    if (!laMuc(id)) throw new LoiApi(404, `Không có mục học id "${id}" trong cây roadmap.`)
    return id
  }

  r.get('/state', (_req, res) => {
    const phanHoi: AnhChupHoc = docAnhChup(db, laMuc)
    res.json(phanHoi)
  })

  r.put('/trang-thai/:id', (req: Request<{ id: string }>, res) => {
    const id = idMuc(req)
    const kq = LuocDoDat.safeParse(req.body)
    if (!kq.success) throw new LoiApi(400, cauLoiDat(kq.error.issues[0]))
    const { trangThai, lyDo, via = 'mot-muc' } = kq.data
    const phanHoi: KetQuaDatTrangThai = datTrangThai(db, {
      id,
      giaTri: lyDo === undefined ? { trangThai } : { trangThai, lyDo },
      via,
    })
    res.json(phanHoi)
  })

  r.post('/luot-mo/:id', (req: Request<{ id: string }>, res) => {
    const phanHoi: KetQuaGhiLuotMo = ghiLuotMo(db, idMuc(req))
    res.json(phanHoi)
  })

  return r
}
