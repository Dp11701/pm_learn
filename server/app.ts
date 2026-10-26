import express, { type Express } from 'express'
import { layCay, type Cay } from '../shared/roadmap/index.ts'
import { kiemHost, kiemOrigin, nosniff } from './an-toan.ts'
import type { CauHinh } from './cau-hinh.ts'
import type { Db } from './db/index.ts'
import { khongCoApi, khongTimThay, xuLyLoi } from './loi.ts'
import { routeApDung } from './routes/ap-dung.ts'
import { routeBai } from './routes/bai.ts'
import { routeDongHo } from './routes/dong-ho.ts'
import { routeHoc } from './routes/hoc.ts'
import { routeMeta } from './routes/meta.ts'
import { routeNhap } from './routes/nhap.ts'
import { routeNoiDung } from './routes/noi-dung.ts'
import { routeThe } from './routes/the.ts'
import { routeTrangThai } from './routes/trang-thai.ts'
import { taoSaoLuu, type SaoLuu } from './sao-luu.ts'

export interface TuyChonApp {
  cauHinh: Pick<CauHinh, 'congApi' | 'congWeb' | 'dataDir' | 'noiDungDir'>
  db: Db
  /** Số mục học của cây (cay.soMucHoc); truyền vào để test không phụ thuộc cây. */
  soMucHoc: number
  saoLuu?: SaoLuu
  /** Cây để kiểm id mục học (bất biến 8); mặc định cây của app (layCay). */
  cay?: Pick<Cay, 'mucTheoId'>
}

/** Dựng app Express (chưa listen) — dùng cho server thật và supertest. */
export function taoApp({ cauHinh, db, soMucHoc, saoLuu, cay = layCay() }: TuyChonApp): Express {
  const boSaoLuu =
    saoLuu ?? taoSaoLuu({ db, dataDir: cauHinh.dataDir, noiDungDir: cauHinh.noiDungDir })
  const app = express()
  app.disable('x-powered-by')
  app.use(nosniff)
  app.use(kiemHost(cauHinh.congApi, cauHinh.congWeb))
  app.use(kiemOrigin(cauHinh.congApi, cauHinh.congWeb))
  // Body JSON tối đa 1 MB; riêng /api/nhap/* gắn parser 16 MB trong routeNhap (đề xuất 1.7).
  const docJson = express.json({ limit: '1mb' })
  app.use((req, res, next) =>
    req.path.startsWith('/api/nhap/') ? next() : docJson(req, res, next),
  )
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })

  app.use('/api', routeMeta(db, boSaoLuu, soMucHoc))
  app.use('/api', routeTrangThai(db, cay))
  app.use('/api', routeBai(db, cay, cauHinh.noiDungDir))
  app.use('/api', routeNoiDung(db, cay, cauHinh.noiDungDir))
  app.use('/api', routeApDung(db, cay))
  app.use('/api', routeHoc(db, cay))
  app.use('/api', routeThe(db, cay))
  app.use('/api', routeDongHo(db, cay))
  app.use('/api', routeNhap(db, cay, cauHinh.noiDungDir, boSaoLuu))

  app.use('/api', khongCoApi)
  app.use(khongTimThay)
  app.use(xuLyLoi)
  return app
}
