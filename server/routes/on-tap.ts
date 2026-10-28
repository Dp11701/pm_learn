// API phiên ôn flashcard (bước 3; đề xuất 3.3, 3.5). Hợp đồng ở server/du-lieu/hop-dong-the.ts (mục "Phiên ôn"):
// - GET  /api/on-tap          thẻ đến hạn hôm nay (server quyết hôm nay), số thẻ theo hộp, tỉ lệ nhớ 30 ngày;
// - POST /api/on-tap/:theId   { ket: 'nho' | 'quen', luyenThem?: boolean } → thẻ sau lần ôn + revision.
// Thẻ không có, hoặc mục của thẻ không còn trong cây (bất biến 8) → 404; lần ôn thật cho thẻ chưa đến hạn → 409.
// Mỗi lần ôn thật: một transaction + tăng revision (nên /api/state tính lại "Cần ôn lại").
import { Router, type Request } from 'express'
import { z } from 'zod'
import type { Cay } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import type { AnhChupOnTap, KetQuaOnThe } from '../du-lieu/hop-dong-the.ts'
import { docOnTap, onThe } from '../du-lieu/on-tap.ts'
import { TB_HOC } from '../du-lieu/thong-bao.ts'
import { TB_ON_TAP } from '../du-lieu/thong-bao-on-tap.ts'
import { LoiApi } from '../loi.ts'
import { docBody, soNguyenDuong, type CauHinhLoi } from './kiem-body.ts'

const LuocDoOn = z.strictObject({
  ket: z.enum(['nho', 'quen']),
  luyenThem: z.boolean().optional(),
})

const LOI_ON: CauHinhLoi = {
  chiNhan: ['ket', 'luyenThem'],
  mau: '{ "ket": "nho" | "quen", "luyenThem"?: true | false }',
  truong: {
    ket: () => TB_ON_TAP.ket,
    luyenThem: () => TB_ON_TAP.luyenThem,
  },
}

export function routeOnTap(db: Db, cay: Pick<Cay, 'mucTheoId'>): Router {
  const r = Router()
  const laMuc = (id: string) => cay.mucTheoId.has(id)

  r.get('/on-tap', (_req, res) => {
    const phanHoi: AnhChupOnTap = docOnTap(db, laMuc)
    res.json(phanHoi)
  })

  r.post('/on-tap/:theId', (req: Request<{ theId: string }>, res) => {
    const id = req.params.theId
    const theId = soNguyenDuong(id)
    if (theId === undefined) throw new LoiApi(404, TB_HOC.khongCoThe(id))
    const body = docBody(LuocDoOn, req.body, LOI_ON)
    const kq = onThe(db, { theId, ket: body.ket, luyenThem: body.luyenThem }, laMuc)
    if (!kq.ok) {
      if (kq.loi === 'khong-co-the') throw new LoiApi(404, TB_HOC.khongCoThe(id))
      if (kq.loi === 'muc-khong-con') throw new LoiApi(404, TB_ON_TAP.theMucKhongCon(id, kq.itemId))
      throw new LoiApi(409, TB_ON_TAP.chuaDenHan(id, kq.the.hanOn))
    }
    const phanHoi: KetQuaOnThe = kq.ketQua
    res.json(phanHoi)
  })

  return r
}
