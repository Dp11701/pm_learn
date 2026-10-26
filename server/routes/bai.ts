import { Router, type Request, type Response } from 'express'
import { DUOI_ANH } from '../../shared/noi-dung/index.ts'
import type { Cay, MucHoc } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import { LoiApi } from '../loi.ts'
import { CSP_ANH, docAnh } from '../noi-dung/anh.ts'
import { layKhoNoiDung } from '../noi-dung/kho-noi-dung.ts'
import type { PhanHoiBai } from '../noi-dung/hop-dong-bai.ts'

// API bài học, chỉ đọc (đề xuất 1.5, 1.6, 1.10, 2.2 bất biến 5, 7, 8; 3.6 "Hiện ở bài"):
// - GET /api/bai/:id                     bài đã đọc + trạng thái nội dung (PhanHoiBai);
// - GET /api/anh/:id?duong-dan=<src>     ảnh trong bài (shared/noi-dung duongDanAnh tạo URL này);
// - GET /api/anh/:id/<src>               cùng việc, đường dẫn đặt trong path (không viết được '../').
// id phải là mục học của cây (bất biến 8), không thì 404. Không có route ghi nào ở đây. Từ phase 2b bài đọc
// file ĐÃ NHẬN qua sổ nội dung (kho-noi-dung.ts, doc-bai.ts).

const DS_DUOI = DUOI_ANH.join(' ')

export function routeBai(db: Db, cay: Pick<Cay, 'mucTheoId'>, noiDungDir: string): Router {
  const r = Router()
  const kho = layKhoNoiDung(db, noiDungDir, cay)

  function mucCua(req: Request<{ id: string }>): MucHoc {
    const muc = cay.mucTheoId.get(req.params.id)
    if (!muc) throw new LoiApi(404, `Không có mục học id "${req.params.id}" trong cây roadmap.`)
    return muc
  }

  async function guiAnh(res: Response, muc: MucHoc, duongDan: unknown): Promise<void> {
    if (typeof duongDan !== 'string' || duongDan === '') {
      throw new LoiApi(400, 'Thiếu duong-dan: đường dẫn ảnh như viết trong bài.')
    }
    const kq = await docAnh(noiDungDir, muc, duongDan)
    if (!kq.ok && kq.lyDo === 'khong-hop-le') {
      throw new LoiApi(
        400,
        `Đường dẫn ảnh không được phép: chỉ nhận file ${DS_DUOI} nằm trong thư mục nội dung.`,
      )
    }
    if (!kq.ok) throw new LoiApi(404, 'Không có ảnh này trong thư mục nội dung.')
    res.setHeader('Content-Security-Policy', CSP_ANH)
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
    res.type(kq.loai).send(kq.noiDung)
  }

  r.get('/bai/:id', async (req: Request<{ id: string }>, res) => {
    const phanHoi: PhanHoiBai = await kho.docBai(mucCua(req))
    res.json(phanHoi)
  })

  r.get('/anh/:id', async (req: Request<{ id: string }>, res) => {
    await guiAnh(res, mucCua(req), req.query['duong-dan'])
  })

  r.get('/anh/:id/*duongDan', async (req: Request<{ id: string; duongDan: string[] }>, res) => {
    await guiAnh(res, mucCua(req), req.params.duongDan.join('/'))
  })

  return r
}
