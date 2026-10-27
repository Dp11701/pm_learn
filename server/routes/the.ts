// API flashcard (phase 3; đề xuất 2.1, 3.5). Hợp đồng ở server/du-lieu/hop-dong-the.ts:
// - POST   /api/the                { itemId, truoc, sau, khoaCau? } → thẻ mới hộp 1, hạn ngày mai;
// - PUT    /api/the/:id            { truoc?, sau? };
// - DELETE /api/the/:id            xoá (giữ bản để Hoàn tác);
// - POST   /api/the/:id/khoi-phuc  Hoàn tác xoá (cùng id, giữ hộp, hạn, lịch sử ôn).
// itemId phải là mục học của cây (bất biến 8), thẻ không có → 404; khôi phục thẻ của mục đã bỏ khỏi cây → 409 (giữ
// bản xoá). Mỗi lần ghi: một transaction + tăng revision.
import { Router, type Request } from 'express'
import { z } from 'zod'
import type { Cay } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import { MAU_KHOA_CAU } from '../du-lieu/hop-dong-hoc.ts'
import { MAT_THE_TOI_DA, type KetQuaGhiThe, type KetQuaSuaThe } from '../du-lieu/hop-dong-the.ts'
import { khoiPhucThe, suaThe, taoThe, xoaThe } from '../du-lieu/the.ts'
import { TB_HOC } from '../du-lieu/thong-bao.ts'
import { LoiApi } from '../loi.ts'
import { coItNhatMot, docBody, mucCuaId, soNguyenDuong, type CauHinhLoi } from './kiem-body.ts'

const matThe = z.string().trim().min(1).max(MAT_THE_TOI_DA)

const LuocDoTao = z.strictObject({
  itemId: z.string().min(1),
  truoc: matThe,
  sau: matThe,
  khoaCau: z.string().regex(MAU_KHOA_CAU).nullable().optional(),
})

const LuocDoSua = z
  .strictObject({ truoc: matThe.optional(), sau: matThe.optional() })
  .refine(coItNhatMot, { params: { canMot: true } })

const loiMat = (bien: string) => (v: z.core.$ZodIssue) => {
  if (v.code === 'too_big') return TB_HOC.quaDai(bien, MAT_THE_TOI_DA)
  return bien === 'truoc' ? TB_HOC.matTruoc : TB_HOC.matSau
}

const LOI_TAO: CauHinhLoi = {
  chiNhan: ['itemId', 'truoc', 'sau', 'khoaCau'],
  mau: '{ "itemId": "…", "truoc": "…", "sau": "…", "khoaCau"?: "…" }',
  truong: {
    itemId: () => TB_HOC.phaiLaChuoi('itemId'),
    truoc: loiMat('truoc'),
    sau: loiMat('sau'),
    khoaCau: () => TB_HOC.khoaSai('khoaCau'),
  },
}

const LOI_SUA: CauHinhLoi = {
  chiNhan: ['truoc', 'sau'],
  mau: '{ "truoc"?: "…", "sau"?: "…" }',
  truong: { truoc: loiMat('truoc'), sau: loiMat('sau') },
}

export function routeThe(db: Db, cay: Pick<Cay, 'mucTheoId'>): Router {
  const r = Router()
  const laMuc = (id: string) => cay.mucTheoId.has(id)

  /** id thẻ của route; không phải số nguyên dương → 404 như thẻ không có. */
  function idThe(req: Request<{ id: string }>): number {
    const id = soNguyenDuong(req.params.id)
    if (id === undefined) throw new LoiApi(404, TB_HOC.khongCoThe(req.params.id))
    return id
  }

  r.post('/the', (req, res) => {
    const body = docBody(LuocDoTao, req.body, LOI_TAO)
    const muc = mucCuaId(cay, body.itemId)
    const phanHoi: KetQuaGhiThe = taoThe(db, { ...body, itemId: muc.id })
    res.json(phanHoi)
  })

  r.put('/the/:id', (req: Request<{ id: string }>, res) => {
    const id = idThe(req)
    const body = docBody(LuocDoSua, req.body, LOI_SUA)
    const phanHoi: KetQuaSuaThe | undefined = suaThe(db, { id, ...body })
    if (!phanHoi) throw new LoiApi(404, TB_HOC.khongCoThe(req.params.id))
    res.json(phanHoi)
  })

  r.delete('/the/:id', (req: Request<{ id: string }>, res) => {
    const phanHoi: KetQuaGhiThe | undefined = xoaThe(db, idThe(req))
    if (!phanHoi) throw new LoiApi(404, TB_HOC.khongCoThe(req.params.id))
    res.json(phanHoi)
  })

  r.post('/the/:id/khoi-phuc', (req: Request<{ id: string }>, res) => {
    const kq = khoiPhucThe(db, idThe(req), laMuc)
    if (!kq) throw new LoiApi(404, TB_HOC.theKhongKhoiPhuc(req.params.id))
    if ('mucKhongCon' in kq) {
      throw new LoiApi(409, TB_HOC.theMucKhongCon(req.params.id, kq.mucKhongCon))
    }
    const phanHoi: KetQuaGhiThe = kq
    res.json(phanHoi)
  })

  return r
}
