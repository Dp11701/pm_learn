// HỢP ĐỒNG (stub, agent "on-tap" viết thật): API phiên ôn flashcard (bước 3; đề xuất 3.5).
import { Router } from 'express'
import type { Cay } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'

export function routeOnTap(_db: Db, _cay: Pick<Cay, 'mucTheoId'>): Router {
  return Router()
}
