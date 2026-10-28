// API duyệt bài gọn (bước 4; đề xuất 3.6, 3.7 rút gọn theo mục 10; bất biến 5, 7, 8; Cần chốt 13). Hợp đồng ở
// server/du-lieu/duyet.ts:
// - GET  /api/duyet/cho-duyet           { banNhap: [{ id, nguon, ngayNhap, duKhoi, coLoi }], banSua: [{ id,
//   ngayNhap }] } — ngày nhập mới nhất trước, cùng ngày theo thứ tự cây;
// - GET  /api/duyet/:id                 { homNay, banSua } — bản sửa của mục Đã duyệt (hash, khối ★ thiếu);
// - POST /api/duyet/:id                 { hashNhap } duyệt bản nháp → { revision, ngayDuyet };
// - POST /api/duyet/:id/ban-sua         { hashNhap } duyệt bản sửa → { revision, ngayDuyet };
// - POST /api/duyet/:id/bo-ban-sua      bản sửa vào thùng rác → { revision }.
// id phải là mục học của cây (bất biến 8), không thì 404. File đã đổi so với hashNhap, không phải bản nháp /
// không có bản sửa, lỗi frontmatter → 409, không đổi gì. Không có Hoàn tác (Cần chốt 13). revision = revision
// nội dung (cùng số với /api/meta noiDung.revision).
import { Router, type Request } from 'express'
import { z } from 'zod'
import type { Cay } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import {
  boBanSua,
  chiTietDuyet,
  dsChoDuyet,
  duyetBai,
  duyetBanSua,
  type KetQuaBoBanSua,
  type KetQuaDuyet,
  type PhanHoiChiTietDuyet,
  type PhanHoiChoDuyet,
} from '../du-lieu/duyet.ts'
import { layKhoNoiDung } from '../noi-dung/kho-noi-dung.ts'
import { TB_DUYET } from '../noi-dung/thong-bao-duyet.ts'
import { docBody, mucCuaThamSo, type CauHinhLoi } from './kiem-body.ts'

const LuocDoDuyet = z.strictObject({ hashNhap: z.string().regex(/^[0-9a-f]{64}$/) })

const LOI_DUYET: CauHinhLoi = {
  chiNhan: ['hashNhap'],
  mau: '{ "hashNhap": "<sha256 của file đang đọc>" }',
  truong: { hashNhap: () => TB_DUYET.hashNhap },
}

export function routeDuyet(db: Db, cay: Pick<Cay, 'mucTheoId'>, noiDungDir: string): Router {
  const r = Router()
  // Cùng kho với routeBai / routeNhap: mọi thao tác file nối tiếp qua một khoá
  const kho = layKhoNoiDung(db, noiDungDir, cay)

  r.get('/duyet/cho-duyet', async (_req, res) => {
    const phanHoi: PhanHoiChoDuyet = await dsChoDuyet(kho)
    res.json(phanHoi)
  })

  r.get('/duyet/:id', async (req: Request<{ id: string }>, res) => {
    const phanHoi: PhanHoiChiTietDuyet = await chiTietDuyet(kho, mucCuaThamSo(cay, req))
    res.json(phanHoi)
  })

  r.post('/duyet/:id', async (req: Request<{ id: string }>, res) => {
    const muc = mucCuaThamSo(cay, req)
    const { hashNhap } = docBody(LuocDoDuyet, req.body, LOI_DUYET)
    const phanHoi: KetQuaDuyet = await duyetBai(kho, muc, hashNhap)
    res.json(phanHoi)
  })

  r.post('/duyet/:id/ban-sua', async (req: Request<{ id: string }>, res) => {
    const muc = mucCuaThamSo(cay, req)
    const { hashNhap } = docBody(LuocDoDuyet, req.body, LOI_DUYET)
    const phanHoi: KetQuaDuyet = await duyetBanSua(kho, muc, hashNhap)
    res.json(phanHoi)
  })

  r.post('/duyet/:id/bo-ban-sua', async (req: Request<{ id: string }>, res) => {
    const phanHoi: KetQuaBoBanSua = await boBanSua(kho, mucCuaThamSo(cay, req))
    res.json(phanHoi)
  })

  return r
}
