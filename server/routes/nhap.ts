import express, { Router, type Request } from 'express'
import { z } from 'zod'
import type { Db } from '../db/index.ts'
import { LoiApi } from '../loi.ts'
import { taoDichVuNhap } from '../nhap/dich-vu.ts'
import type {
  PhanHoiKiemTra,
  PhanHoiQuetLai,
  PhanHoiRevision,
  PhanHoiThucHien,
  YeuCauKiemTra,
  YeuCauThucHien,
} from '../nhap/hop-dong.ts'
import { TB_NHAP } from '../nhap/thong-bao.ts'
import type { CayNoiDung } from '../noi-dung/duong-dan.ts'
import type { SaoLuu } from '../sao-luu.ts'

// API nhập file .md (đề xuất 1.6, 1.7, 3.8; hợp đồng ở server/nhap/hop-dong.ts):
// - POST /api/nhap/kiem-tra   { files: [{ ten, noiDung, duongDan? }], mucMacDinh? } → kết quả + token lô
//   (không ghi file; file lỗi đọc được → bản tạm editor_buffers nhap:<token>:<i>)
// - POST /api/nhap/thuc-hien  { token, gan, xuLyTrung, nhanDaDuyet } → { daNhap, fileOp, revision }
//   (kiểm lại mọi thứ; token quá 30 phút / đã dùng / thư mục đã đổi → 410; sao lưu trước khi ghi)
// - POST /api/nhap/hoan-tac   { fileOp } → { revision }
// - POST /api/nhap/quet-lai   → { daNhap, fileOp, kiemTra, chuaNhan, daChuyen }
// Body JSON tối đa 16 MB chỉ ở /api/nhap/* (app.ts bỏ parser 1 MB cho đường này).

/** express.json cho /api/nhap/* (đề xuất 1.7: 16 MB mỗi lần) */
export const GIOI_HAN_BODY_NHAP = '16mb'

const LuocDoKiemTra = z.object({
  files: z
    .array(
      z.object({
        ten: z.string().max(1000),
        noiDung: z.string(),
        duongDan: z.string().max(4096).optional(),
      }),
    )
    .max(100_000),
  mucMacDinh: z.string().min(1).max(200).optional(),
})

const LuocDoThucHien = z.object({
  token: z.string().min(1).max(200),
  gan: z.record(z.string(), z.string().min(1).max(200)).default({}),
  xuLyTrung: z.record(z.string(), z.enum(['giu-ban-cu', 'thanh-ban-sua'])).default({}),
  nhanDaDuyet: z.array(z.number().int().nonnegative()).default([]),
})

const LuocDoHoanTac = z.object({ fileOp: z.number().int().positive() })

function docBody<T>(luocDo: z.ZodType<T>, req: Request): T {
  const kq = luocDo.safeParse(req.body ?? {})
  if (!kq.success) throw new LoiApi(400, TB_NHAP.duLieuSai)
  return kq.data
}

export function routeNhap(
  db: Db,
  cay: CayNoiDung,
  noiDungDir: string,
  saoLuu: Pick<SaoLuu, 'saoLuuNgay'>,
): Router {
  const r = Router()
  const dv = taoDichVuNhap({ db, cay, noiDungDir, saoLuu })
  r.use('/nhap', express.json({ limit: GIOI_HAN_BODY_NHAP }))

  r.post('/nhap/kiem-tra', async (req, res) => {
    const yc: YeuCauKiemTra = docBody(LuocDoKiemTra, req)
    const phanHoi: PhanHoiKiemTra = await dv.kiemTra(yc)
    res.json(phanHoi)
  })

  r.post('/nhap/thuc-hien', async (req, res) => {
    const yc: YeuCauThucHien = docBody(LuocDoThucHien, req)
    const phanHoi: PhanHoiThucHien = await dv.thucHien(yc)
    res.json(phanHoi)
  })

  r.post('/nhap/hoan-tac', async (req, res) => {
    const { fileOp } = docBody(LuocDoHoanTac, req)
    const phanHoi: PhanHoiRevision = await dv.hoanTac(fileOp)
    res.json(phanHoi)
  })

  r.post('/nhap/quet-lai', async (_req, res) => {
    const phanHoi: PhanHoiQuetLai = await dv.quetLai()
    res.json(phanHoi)
  })

  return r
}
