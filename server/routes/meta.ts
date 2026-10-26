import { Router } from 'express'
import { homNay, nowIso } from '../../shared/clock.ts'
import type { Db } from '../db/index.ts'
import { layRevision } from '../db/settings.ts'
import { layRevisionNoiDung } from '../du-lieu/so-noi-dung.ts'
import { khoCuaDb, type KhoNoiDung, type NoiDungMeta } from '../noi-dung/kho-noi-dung.ts'
import { docBannerThayCay } from '../noi-dung/thay-cay.ts'
import type { SaoLuu } from '../sao-luu.ts'

// GET /api/meta: web hỏi mỗi 5 giây để lấy giờ server, ngày, revision (đề xuất 1.10); từ phase 2b thêm
// noiDung = kết quả quét nhẹ thư mục nội dung (đề xuất 1.6): revision nội dung, số file chưa nhận, banner thay
// cây một lần (1.3).

export interface PhanHoiMeta {
  revision: number
  now: string
  homNay: string
  soMucHoc: number
  noiDung: NoiDungMeta
}

/**
 * @param kho kho nội dung; không truyền thì dùng kho mà routeBai / routeNoiDung đã tạo cho DB này (lúc request)
 */
export function routeMeta(db: Db, saoLuu: SaoLuu, soMucHoc: number, kho?: KhoNoiDung): Router {
  const r = Router()
  r.get('/meta', async (_req, res) => {
    const k = kho ?? khoCuaDb(db)
    const noiDung: NoiDungMeta = k
      ? await k.meta()
      : { revision: layRevisionNoiDung(db), chuaNhan: 0, thayCay: docBannerThayCay(db) }
    const phanHoi: PhanHoiMeta = {
      revision: layRevision(db),
      now: nowIso(),
      homNay: homNay(),
      soMucHoc,
      noiDung,
    }
    res.json(phanHoi)
    // Sao lưu hằng ngày chạy nền, không chặn phản hồi.
    saoLuu.saoLuuHangNgayNeuCan()
  })
  return r
}
