// API đồng hồ học + phiên giờ (phase 3; đề xuất 2.2 bất biến 6, 3.4; Cần chốt 12). Hợp đồng ở
// server/du-lieu/hop-dong-dong-ho.ts:
// - GET    /api/dong-ho[?itemId=]          đồng hồ đang chạy + 5 phiên gần nhất;
// - POST   /api/dong-ho/bat-dau            { itemId, chuyen?, ghiGiay? } (409 dangChay / canHoi);
// - POST   /api/dong-ho/dung               { ghiGiay? } (409 canHoi);
// - POST   /api/dong-ho/hoan-tac           Hoàn tác lần dừng / chuyển gần nhất;
// - DELETE /api/phien-gio/:id, POST /api/phien-gio/:id/khoi-phuc.
// itemId phải là mục học của cây (bất biến 8), không thì 404. Mỗi lần ghi: một transaction + tăng revision.
import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import type { Cay } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import {
  LoiDongHo,
  batDau,
  docTrangThaiDongHo,
  dung,
  hoanTacDongHo,
  khoiPhucPhien,
  xoaPhien,
} from '../du-lieu/dong-ho.ts'
import type { KetQuaDongHo, KetQuaGhiPhien, TrangThaiDongHo } from '../du-lieu/hop-dong-dong-ho.ts'
import { TB_HOC } from '../du-lieu/thong-bao.ts'
import { LoiApi } from '../loi.ts'
import { docBody, mucCuaId, soNguyenDuong, type CauHinhLoi } from './kiem-body.ts'

/** Số giây muốn ghi khi quên tắt: số nguyên ≥ 0 (kẹp [60, giờ thật] ở du-lieu), null = Không ghi. */
const GhiGiay = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable().optional()

const LuocDoBatDau = z.strictObject({
  itemId: z.string().min(1),
  chuyen: z.boolean().optional(),
  ghiGiay: GhiGiay,
})
const LOI_BAT_DAU: CauHinhLoi = {
  chiNhan: ['itemId', 'chuyen', 'ghiGiay'],
  mau: '{ "itemId": "…", "chuyen"?: true, "ghiGiay"?: số | null }',
  truong: {
    itemId: () => TB_HOC.phaiLaChuoi('itemId'),
    chuyen: () => TB_HOC.chuyen,
    ghiGiay: () => TB_HOC.ghiGiay,
  },
}

const LuocDoDung = z.strictObject({ ghiGiay: GhiGiay })
const LOI_DUNG: CauHinhLoi = {
  chiNhan: ['ghiGiay'],
  mau: '{ "ghiGiay"?: số | null }',
  truong: { ghiGiay: () => TB_HOC.ghiGiay },
}

/** Chạy thao tác đồng hồ; 409 có thân riêng (dangChay / canHoi) trả nguyên văn. */
function traDongHo(res: Response, lam: () => KetQuaDongHo): void {
  try {
    res.json(lam())
  } catch (loi) {
    if (loi instanceof LoiDongHo) {
      res.status(409).json(loi.than)
      return
    }
    throw loi
  }
}

export function routeDongHo(db: Db, cay: Pick<Cay, 'mucTheoId'>): Router {
  const r = Router()
  const laMuc = (id: string) => cay.mucTheoId.has(id)
  const tenMuc = (id: string) => cay.mucTheoId.get(id)?.label ?? id

  function idPhien(req: Request<{ id: string }>): number {
    const id = soNguyenDuong(req.params.id)
    if (id === undefined) throw new LoiApi(404, TB_HOC.khongCoPhien(req.params.id))
    return id
  }

  r.get('/dong-ho', (req, res) => {
    const q = req.query.itemId
    if (q !== undefined && typeof q !== 'string') {
      throw new LoiApi(400, TB_HOC.phaiLaChuoi('itemId'))
    }
    const itemId = q === undefined ? undefined : mucCuaId(cay, q).id
    const phanHoi: TrangThaiDongHo = docTrangThaiDongHo(db, { itemId, laMuc })
    res.json(phanHoi)
  })

  r.post('/dong-ho/bat-dau', (req, res) => {
    const body = docBody(LuocDoBatDau, req.body, LOI_BAT_DAU)
    const itemId = mucCuaId(cay, body.itemId).id
    traDongHo(res, () =>
      batDau(db, { itemId, chuyen: body.chuyen, ghiGiay: body.ghiGiay, laMuc, tenMuc }),
    )
  })

  r.post('/dong-ho/dung', (req, res) => {
    const body = docBody(LuocDoDung, req.body ?? {}, LOI_DUNG)
    traDongHo(res, () => dung(db, { ghiGiay: body.ghiGiay, laMuc }))
  })

  r.post('/dong-ho/hoan-tac', (_req, res) => {
    traDongHo(res, () => hoanTacDongHo(db))
  })

  r.delete('/phien-gio/:id', (req: Request<{ id: string }>, res) => {
    const phanHoi: KetQuaGhiPhien | undefined = xoaPhien(db, idPhien(req))
    if (!phanHoi) throw new LoiApi(404, TB_HOC.khongCoPhien(req.params.id))
    res.json(phanHoi)
  })

  r.post('/phien-gio/:id/khoi-phuc', (req: Request<{ id: string }>, res) => {
    const phanHoi: KetQuaGhiPhien | undefined = khoiPhucPhien(db, idPhien(req))
    if (!phanHoi) throw new LoiApi(404, TB_HOC.phienKhongKhoiPhuc(req.params.id))
    res.json(phanHoi)
  })

  return r
}
