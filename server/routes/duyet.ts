// HỢP ĐỒNG (stub, agent "duyet" viết thật): API duyệt bài gọn (bước 4; đề xuất 3.7 rút gọn theo mục 10).
import { Router } from 'express'
import type { Cay } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'

export function routeDuyet(_db: Db, _cay: Pick<Cay, 'mucTheoId'>, _noiDungDir: string): Router {
  return Router()
}
