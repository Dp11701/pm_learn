import { Router, type Request } from 'express'
import type { Cay, MucHoc } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import { docSlugCu } from '../du-lieu/slug-cu.ts'
import { layRevisionNoiDung, tangRevisionNoiDung } from '../du-lieu/so-noi-dung.ts'
import { LoiApi } from '../loi.ts'
import type { PhanHoiTrangThaiNoiDung } from '../noi-dung/hop-dong-bai.ts'
import { layKhoNoiDung } from '../noi-dung/kho-noi-dung.ts'
import { docBannerThayCay, tatBannerThayCay } from '../noi-dung/thay-cay.ts'

// API nội dung (đề xuất 1.3, 1.6, 3.6, 2.2 bất biến 5, 7):
// - GET  /api/noi-dung/trang-thai          { [id mục]: TrangThaiNoiDung } cho mọi mục học có bản chụp duyệt
//   hiện hành hoặc có file đã nhận; không có khoá = Chưa có nội dung. Cùng quy tắc với GET /api/bai/:id.
// - POST /api/noi-dung/giu-ban-cu/:id       "Giữ bản cũ" cho mục Đã duyệt có file bị đổi / xoá ngoài app: ghi
//   lại bản chụp vào <slug>.md (bản đang có vào thùng rác) → { revision } (revision nội dung). Mục chưa duyệt
//   → 409.
// - GET  /api/noi-dung/slug-cu              { [slug cũ]: id nút } (sau khi thay file cây) để link cũ và
//   lien_quan cũ vẫn tra được (traMucLienQuan).
// - POST /api/noi-dung/thay-cay/da-xem      tắt banner một lần "Cây roadmap vừa cập nhật…" → { revision }.

export interface PhanHoiRevisionNoiDung {
  /** Revision nội dung (cùng số với /api/meta noiDung.revision) */
  revision: number
}

export function routeNoiDung(db: Db, cay: Pick<Cay, 'mucTheoId'>, noiDungDir: string): Router {
  const r = Router()
  const kho = layKhoNoiDung(db, noiDungDir, cay)

  function mucCua(req: Request<{ id: string }>): MucHoc {
    const muc = cay.mucTheoId.get(req.params.id)
    if (!muc) throw new LoiApi(404, `Không có mục học id "${req.params.id}" trong cây roadmap.`)
    return muc
  }

  r.get('/noi-dung/trang-thai', async (_req, res) => {
    const phanHoi: PhanHoiTrangThaiNoiDung = await kho.trangThaiTatCa()
    res.json(phanHoi)
  })

  r.post('/noi-dung/giu-ban-cu/:id', async (req: Request<{ id: string }>, res) => {
    const { revision } = await kho.giuBanCu(mucCua(req))
    const phanHoi: PhanHoiRevisionNoiDung = { revision }
    res.json(phanHoi)
  })

  r.get('/noi-dung/slug-cu', (_req, res) => {
    res.json(docSlugCu(db))
  })

  r.post('/noi-dung/thay-cay/da-xem', (_req, res) => {
    const revision = db.transaction(() => {
      if (!docBannerThayCay(db)) return layRevisionNoiDung(db)
      tatBannerThayCay(db)
      return tangRevisionNoiDung(db)
    })()
    const phanHoi: PhanHoiRevisionNoiDung = { revision }
    res.json(phanHoi)
  })

  return r
}
