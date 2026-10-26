import { Router } from 'express'
import type { Cay } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import type { PhanHoiTrangThaiNoiDung } from '../noi-dung/hop-dong-bai.ts'
import { taoBoTrangThaiNoiDung } from '../noi-dung/trang-thai-noi-dung.ts'

// API nội dung, chỉ đọc (đề xuất 1.6, 3.6, 2.2 bất biến 7):
// - GET /api/noi-dung/trang-thai   { [id mục]: TrangThaiNoiDung } cho mọi mục học có bản chụp duyệt hiện
//   hành hoặc có file ở đường dẫn chuẩn; không có khoá = Chưa có nội dung. Cùng quy tắc với GET /api/bai/:id
//   (trangThaiNoiDungCua); chỉ stat + đọc frontmatter, đệm theo mtime/size (trang-thai-noi-dung.ts).

export function routeNoiDung(db: Db, cay: Pick<Cay, 'mucTheoId'>, noiDungDir: string): Router {
  const r = Router()
  const bo = taoBoTrangThaiNoiDung(noiDungDir)

  r.get('/noi-dung/trang-thai', async (_req, res) => {
    const phanHoi: PhanHoiTrangThaiNoiDung = await bo.docTatCa(db, cay.mucTheoId.values())
    res.json(phanHoi)
  })

  return r
}
