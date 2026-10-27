// API dữ liệu học của một mục (phase 3; đề xuất 2.1, 3.2; Cần chốt 6) và dự án thực hành. Hợp đồng ở
// server/du-lieu/hop-dong-hoc.ts:
// - GET /api/hoc/:id                    Nói lại, thực hành, tự kiểm tra, ghi chú, thẻ, giờ đã học của mục; trước
//                                       khi đọc, gán lại khoá câu hỏi / tiêu chí theo bài hiện tại (đề xuất 1.5);
// - PUT /api/hoc/:id/noi-lai            { text } (chỉ khoảng trắng = xoá);
// - PUT /api/hoc/:id/thuc-hanh          { trangThai?, duAnId?, ketQua?, tieuChi?, lyDo? } — mọi mẫu bài; chỉ tick
//                                       được tiêu chí đang có trong bài (409), lưu kèm chữ tiêu chí;
// - PUT /api/hoc/:id/tu-kiem-tra/:khoa  { traLoi?, daXem?, cham? } — lưu kèm chữ câu hỏi của khoá trong bài;
// - PUT /api/hoc/:id/ghi-chu            { text };
// - GET /api/du-an, POST /api/du-an     { ten, vaiTro?, giaiDoan? }.
// id phải là mục học của cây (bất biến 8), không thì 404. Mỗi lần ghi: một transaction + tăng revision.
// Bài của mục đọc qua kho nội dung (file đã nhận / bản chụp duyệt, như GET /api/bai/:id): chưa có nội dung = không
// câu hỏi, không tiêu chí; lỗi đọc file = chưa biết bài (không gán lại, không lọc, không kiểm khoá).
import { Router, type Request } from 'express'
import { z } from 'zod'
import {
  DANH_SACH_TRONG_BAI_RONG,
  danhSachTrongBai,
  type DanhSachTrongBai,
} from '../../shared/noi-dung/index.ts'
import type { Cay, MucHoc } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import { CAC_TRANG_THAI_AP_DUNG, LY_DO_AP_DUNG_TOI_DA } from '../du-lieu/ap-dung.ts'
import { docDsDuAn, themDuAn } from '../du-lieu/du-an.ts'
import {
  docDuLieuHoc,
  ganLaiTheoBai,
  ghiGhiChu,
  ghiNoiLai,
  ghiThucHanh,
  ghiTuKiemTra,
} from '../du-lieu/hoc.ts'
import {
  CAC_DIEM_CHAM,
  GHI_CHU_TOI_DA,
  KET_QUA_TOI_DA,
  MAU_KHOA_CAU,
  NOI_LAI_TOI_DA,
  TEN_DU_AN_TOI_DA,
  THUOC_TINH_DU_AN_TOI_DA,
  TIEU_CHI_TOI_DA,
  TRA_LOI_TOI_DA,
  type DuAn,
  type DuLieuHoc,
  type KetQuaGhiGhiChu,
  type KetQuaGhiNoiLai,
  type KetQuaGhiThucHanh,
  type KetQuaGhiTuKiemTra,
  type KetQuaThemDuAn,
} from '../du-lieu/hop-dong-hoc.ts'
import { TB_HOC } from '../du-lieu/thong-bao.ts'
import { LoiApi } from '../loi.ts'
import type { PhanHoiBai } from '../noi-dung/hop-dong-bai.ts'
import { coItNhatMot, docBody, mucCuaThamSo, type CauHinhLoi } from './kiem-body.ts'

// ---------- Lược đồ body ----------

const luocDoVanBan = (toiDa: number) => z.strictObject({ text: z.string().max(toiDa) })
const LOI_VAN_BAN: CauHinhLoi = { chiNhan: ['text'], mau: '{ "text": "…" }' }

const KhoaCau = z.string().regex(MAU_KHOA_CAU)

const LuocDoThucHanh = z
  .strictObject({
    trangThai: z.enum(CAC_TRANG_THAI_AP_DUNG).nullable().optional(),
    duAnId: z.number().int().positive().nullable().optional(),
    ketQua: z.string().max(KET_QUA_TOI_DA).optional(),
    tieuChi: z
      .record(KhoaCau, z.boolean())
      .refine((o) => Object.keys(o).length <= TIEU_CHI_TOI_DA, { params: { quaNhieu: true } })
      .optional(),
    lyDo: z.string().trim().min(1).max(LY_DO_AP_DUNG_TOI_DA).optional(),
  })
  .refine(coItNhatMot, { params: { canMot: true } })

const LOI_THUC_HANH: CauHinhLoi = {
  chiNhan: ['trangThai', 'duAnId', 'ketQua', 'tieuChi', 'lyDo'],
  mau: '{ "trangThai"?: …, "duAnId"?: …, "ketQua"?: …, "tieuChi"?: {…}, "lyDo"?: … }',
  truong: {
    trangThai: () => TB_HOC.trangThaiThucHanh,
    duAnId: () => TB_HOC.duAnId,
    tieuChi: (v) => {
      if (v.code === 'custom' && v.params?.quaNhieu) return TB_HOC.quaNhieuTieuChi(TIEU_CHI_TOI_DA)
      if (v.code === 'invalid_key') return TB_HOC.khoaSai('tieuChi')
      return TB_HOC.tieuChi
    },
    lyDo: (v) => {
      if (v.code === 'too_small') return TB_HOC.canLyDo
      if (v.code === 'too_big') return TB_HOC.quaDai('lyDo', LY_DO_AP_DUNG_TOI_DA)
      return TB_HOC.phaiLaChuoi('lyDo')
    },
  },
}

const LuocDoTuKiemTra = z
  .strictObject({
    traLoi: z.string().max(TRA_LOI_TOI_DA).optional(),
    daXem: z.literal(true).optional(),
    cham: z.enum(CAC_DIEM_CHAM).optional(),
  })
  .refine(coItNhatMot, { params: { canMot: true } })

const LOI_TU_KIEM_TRA: CauHinhLoi = {
  chiNhan: ['traLoi', 'daXem', 'cham'],
  mau: '{ "traLoi"?: "…", "daXem"?: true, "cham"?: "dung" | "mot-phan" | "sai" }',
  truong: { daXem: () => TB_HOC.daXem, cham: () => TB_HOC.cham },
}

const thuocTinhDuAn = z.string().trim().max(THUOC_TINH_DU_AN_TOI_DA).nullable().optional()
const LuocDoDuAn = z.strictObject({
  ten: z.string().trim().min(1).max(TEN_DU_AN_TOI_DA),
  vaiTro: thuocTinhDuAn,
  giaiDoan: thuocTinhDuAn,
})
const LOI_DU_AN: CauHinhLoi = {
  chiNhan: ['ten', 'vaiTro', 'giaiDoan'],
  mau: '{ "ten": "…", "vaiTro"?: "…", "giaiDoan"?: "…" }',
  truong: {
    ten: (v) => (v.code === 'too_big' ? TB_HOC.quaDai('ten', TEN_DU_AN_TOI_DA) : TB_HOC.tenDuAn),
  },
}

// ---------- Bài hiện tại của mục ----------

/** Nguồn bài của mục — kho nội dung (layKhoNoiDung) có docBai. */
export interface NguonBai {
  docBai(muc: MucHoc): Promise<Pick<PhanHoiBai, 'bai' | 'loiDoc'>>
}

/** Câu hỏi / tiêu chí trong bài: chưa có nội dung → rỗng; lỗi đọc file → undefined (chưa biết). */
export function trongBaiCua(
  phanHoi: Pick<PhanHoiBai, 'bai' | 'loiDoc'>,
): DanhSachTrongBai | undefined {
  if (phanHoi.loiDoc) return undefined
  return phanHoi.bai ? danhSachTrongBai(phanHoi.bai) : DANH_SACH_TRONG_BAI_RONG
}

// ---------- Route ----------

/** @param nguonBai bài của mục; không truyền = chưa biết bài (không gán lại, không lọc, không kiểm khoá) */
export function routeHoc(db: Db, cay: Pick<Cay, 'mucTheoId'>, nguonBai?: NguonBai): Router {
  const r = Router()
  const docTrongBai = async (muc: MucHoc) =>
    nguonBai ? trongBaiCua(await nguonBai.docBai(muc)) : undefined

  r.get('/hoc/:id', async (req: Request<{ id: string }>, res) => {
    const muc = mucCuaThamSo(cay, req)
    const trongBai = await docTrongBai(muc)
    const phanHoi: DuLieuHoc = db.transaction(() => {
      if (trongBai) ganLaiTheoBai(db, muc.id, trongBai)
      return docDuLieuHoc(db, muc.id, trongBai)
    })()
    res.json(phanHoi)
  })

  r.put('/hoc/:id/noi-lai', (req: Request<{ id: string }>, res) => {
    const muc = mucCuaThamSo(cay, req)
    const { text } = docBody(luocDoVanBan(NOI_LAI_TOI_DA), req.body, LOI_VAN_BAN)
    const phanHoi: KetQuaGhiNoiLai = ghiNoiLai(db, muc.id, text)
    res.json(phanHoi)
  })

  r.put('/hoc/:id/ghi-chu', (req: Request<{ id: string }>, res) => {
    const muc = mucCuaThamSo(cay, req)
    const { text } = docBody(luocDoVanBan(GHI_CHU_TOI_DA), req.body, LOI_VAN_BAN)
    const phanHoi: KetQuaGhiGhiChu = ghiGhiChu(db, muc.id, text)
    res.json(phanHoi)
  })

  r.put('/hoc/:id/thuc-hanh', async (req: Request<{ id: string }>, res) => {
    const muc = mucCuaThamSo(cay, req)
    const yeuCau = docBody(LuocDoThucHanh, req.body, LOI_THUC_HANH)
    const trongBai = await docTrongBai(muc)
    const phanHoi: KetQuaGhiThucHanh = ghiThucHanh(db, {
      id: muc.id,
      yeuCau,
      tieuChiTrongBai: trongBai?.tieuChi,
    })
    res.json(phanHoi)
  })

  r.put('/hoc/:id/tu-kiem-tra/:khoa', async (req: Request<{ id: string; khoa: string }>, res) => {
    const muc = mucCuaThamSo(cay, req)
    const khoa = req.params.khoa
    if (!MAU_KHOA_CAU.test(khoa)) throw new LoiApi(400, TB_HOC.khoaSai('khoa'))
    const yeuCau = docBody(LuocDoTuKiemTra, req.body, LOI_TU_KIEM_TRA)
    const cauHoi = (await docTrongBai(muc))?.cauHoi.find((c) => c.khoa === khoa)?.chu
    const phanHoi: KetQuaGhiTuKiemTra = ghiTuKiemTra(db, { id: muc.id, khoa, yeuCau, cauHoi })
    res.json(phanHoi)
  })

  r.get('/du-an', (_req, res) => {
    const phanHoi: DuAn[] = docDsDuAn(db)
    res.json(phanHoi)
  })

  r.post('/du-an', (req, res) => {
    const body = docBody(LuocDoDuAn, req.body, LOI_DU_AN)
    const phanHoi: KetQuaThemDuAn = themDuAn(db, body)
    res.json(phanHoi)
  })

  return r
}
