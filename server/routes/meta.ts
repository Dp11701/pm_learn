import { Router } from 'express'
import { homNay, nowIso } from '../../shared/clock.ts'
import type { Db } from '../db/index.ts'
import { layRevision } from '../db/settings.ts'
import type { SaoLuu } from '../sao-luu.ts'

// GET /api/meta: web hỏi mỗi 5 giây để lấy giờ server, ngày, revision (đề xuất 1.10).

export interface PhanHoiMeta {
  revision: number
  now: string
  homNay: string
  soMucHoc: number
}

export function routeMeta(db: Db, saoLuu: SaoLuu, soMucHoc: number): Router {
  const r = Router()
  r.get('/meta', (_req, res) => {
    const phanHoi: PhanHoiMeta = {
      revision: layRevision(db),
      now: nowIso(),
      homNay: homNay(),
      soMucHoc,
    }
    res.json(phanHoi)
    // Sao lưu hằng ngày chạy nền, không chặn phản hồi.
    saoLuu.saoLuuHangNgayNeuCan()
  })
  return r
}
