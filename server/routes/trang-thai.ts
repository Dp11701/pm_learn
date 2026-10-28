import { Router, type Request } from 'express'
import { z } from 'zod'
import { CAC_TRANG_THAI_HOC } from '../../shared/domain/trang-thai.ts'
import type { Cay } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import {
  CAC_TRANG_THAI_HANG_LOAT,
  CAC_VIA_MOT_MUC,
  LY_DO_TOI_DA,
  type AnhChupHoc,
  type GiaTriTrangThai,
  type KetQuaDatHangLoat,
  type KetQuaDatTrangThai,
  type KetQuaGhiLuotMo,
  type KetQuaHoanTacHangLoat,
  type TrangThaiHangLoat,
} from '../du-lieu/hop-dong-trang-thai.ts'
import { TB_HANG_LOAT } from '../du-lieu/thong-bao-lo-trinh.ts'
import { TB_HOC } from '../du-lieu/thong-bao.ts'
import {
  datHangLoat,
  datTrangThai,
  docAnhChup,
  ghiLuotMo,
  hoanTacHangLoat,
} from '../du-lieu/trang-thai.ts'
import { LoiApi } from '../loi.ts'

// API trạng thái học (đề xuất 1.10, 2.2, 3.1, 3.9):
// - GET  /api/state                          ảnh chụp dữ liệu học (trạng thái + lượt mở), chỉ mục còn trong cây;
// - PUT  /api/trang-thai/:id                 đặt trạng thái 1 mục (Hoàn tác gửi via 'hoan-tac' với giá trị cũ);
// - POST /api/trang-thai/hang-loat           { ids, trangThai } đặt Chưa học / Đang học / Bỏ qua cho nhiều mục
//                                            (không bao giờ Đã xong — bất biến 2), một transaction;
// - POST /api/trang-thai/hang-loat/hoan-tac  { trangThai, truoc } trả các mục về giá trị cũ, một transaction. Server
//                                            kiểm lại từng mục theo status_events (bất biến 2): chỉ khôi phục khi
//                                            sự kiện cuối là lần hàng loạt từ đúng giá trị cũ đó; mục đã đổi sau đó
//                                            hoặc `truoc` không khớp (giả, gửi lại) thì giữ nguyên;
// - POST /api/luot-mo/:id                    ghi lần mở bài gần nhất.
// id phải là mục học của cây (bất biến 8), không thì 404.

const DS_TRANG_THAI = CAC_TRANG_THAI_HOC.join(', ')

const LuocDoDat = z
  .strictObject({
    trangThai: z.enum(CAC_TRANG_THAI_HOC),
    lyDo: z.string().max(LY_DO_TOI_DA).optional(),
    via: z.enum(CAC_VIA_MOT_MUC).optional(),
  })
  .refine((b) => b.lyDo === undefined || b.trangThai === 'bo-qua', {
    path: ['lyDo'],
    params: { chiBoQua: true },
  })

type VanDe = z.core.$ZodIssue

/** Câu lỗi tiếng Việt cho vấn đề đầu tiên của body PUT /api/trang-thai/:id. */
function cauLoiDat(vanDe: VanDe | undefined): string {
  if (!vanDe) return 'Yêu cầu không hợp lệ.'
  if (vanDe.code === 'unrecognized_keys') {
    return `Trường không được nhận: ${vanDe.keys.join(', ')}. Chỉ nhận trangThai, lyDo, via.`
  }
  switch (vanDe.path[0]) {
    case 'trangThai':
      return `trangThai không hợp lệ: cần một trong ${DS_TRANG_THAI}.`
    case 'lyDo':
      if (vanDe.code === 'custom') return 'lyDo chỉ dùng khi trangThai là bo-qua.'
      if (vanDe.code === 'too_big') return `Lý do Bỏ qua dài tối đa ${LY_DO_TOI_DA} ký tự.`
      return 'lyDo phải là chuỗi.'
    case 'via':
      return `via không hợp lệ: cần ${CAC_VIA_MOT_MUC.join(' hoặc ')}.`
    default:
      return 'Thân yêu cầu phải là JSON dạng { "trangThai": …, "lyDo"?: …, "via"?: … }.'
  }
}

/** Lỗi 400 của body hàng loạt: unrecognized_keys → câu "Chỉ nhận …"; còn lại theo trường đầu tiên lỗi. */
function cauLoiHangLoat(
  vanDe: VanDe | undefined,
  chiNhan: readonly string[],
  theoTruong: (truong: string | undefined, vanDe: VanDe) => string,
): string {
  if (!vanDe) return 'Yêu cầu không hợp lệ.'
  if (vanDe.code === 'unrecognized_keys') return TB_HOC.truongLa(vanDe.keys, chiNhan)
  const truong = vanDe.path[0]
  return theoTruong(typeof truong === 'string' ? truong : undefined, vanDe)
}

/** trangThai của body hàng loạt; 'da-xong' có câu riêng (bất biến 2). */
function docTrangThaiHangLoat(giaTri: unknown): TrangThaiHangLoat {
  if (giaTri === 'da-xong') throw new LoiApi(400, TB_HANG_LOAT.khongDaXong)
  const kq = z.enum(CAC_TRANG_THAI_HANG_LOAT).safeParse(giaTri)
  if (!kq.success) throw new LoiApi(400, TB_HANG_LOAT.trangThai)
  return kq.data
}

const LuocDoGiaTriTruoc = z
  .strictObject({
    trangThai: z.enum(CAC_TRANG_THAI_HOC),
    lyDo: z.string().max(LY_DO_TOI_DA).optional(),
  })
  .refine((g) => g.lyDo === undefined || g.trangThai === 'bo-qua')

export function routeTrangThai(db: Db, cay: Pick<Cay, 'mucTheoId'>): Router {
  const r = Router()
  const laMuc = (id: string) => cay.mucTheoId.has(id)
  /** Tối đa số mục mỗi lần hàng loạt = số mục học của cây (soMucHoc). */
  const toiDa = () => cay.mucTheoId.size

  /** Mọi id phải là mục học của cây (bất biến 8): id đầu tiên không có → 404. */
  function kiemCoTrongCay(ids: Iterable<string>): void {
    for (const id of ids) if (!laMuc(id)) throw new LoiApi(404, TB_HOC.khongCoMuc(id))
  }

  r.post('/trang-thai/hang-loat', (req, res) => {
    const LuocDo = z.strictObject({
      ids: z.array(z.string().min(1)).min(1).max(toiDa()),
      trangThai: z.unknown(),
    })
    const kq = LuocDo.safeParse(req.body)
    if (!kq.success) {
      throw new LoiApi(
        400,
        cauLoiHangLoat(kq.error.issues[0], ['ids', 'trangThai'], (truong) =>
          truong === 'trangThai'
            ? TB_HANG_LOAT.trangThai
            : truong === 'ids'
              ? TB_HANG_LOAT.ids(toiDa())
              : TB_HOC.thanBody(
                  '{ "ids": ["…"], "trangThai": "chua-hoc" | "dang-hoc" | "bo-qua" }',
                ),
        ),
      )
    }
    const trangThai = docTrangThaiHangLoat(kq.data.trangThai)
    const { ids } = kq.data
    const daCo = new Set<string>()
    for (const id of ids) {
      if (daCo.has(id)) throw new LoiApi(400, TB_HANG_LOAT.idTrung(id))
      daCo.add(id)
    }
    kiemCoTrongCay(ids)
    const phanHoi: KetQuaDatHangLoat = datHangLoat(db, { ids, trangThai })
    res.json(phanHoi)
  })

  r.post('/trang-thai/hang-loat/hoan-tac', (req, res) => {
    const LuocDo = z.strictObject({
      trangThai: z.unknown(),
      truoc: z.record(z.string().min(1), z.unknown()),
    })
    const kq = LuocDo.safeParse(req.body)
    if (!kq.success) {
      throw new LoiApi(
        400,
        cauLoiHangLoat(kq.error.issues[0], ['trangThai', 'truoc'], (truong) =>
          truong === 'trangThai' ? TB_HANG_LOAT.trangThai : TB_HANG_LOAT.truoc(toiDa()),
        ),
      )
    }
    const trangThai = docTrangThaiHangLoat(kq.data.trangThai)
    const cacId = Object.keys(kq.data.truoc)
    if (cacId.length === 0 || cacId.length > toiDa()) {
      throw new LoiApi(400, TB_HANG_LOAT.truoc(toiDa()))
    }
    const truoc: Record<string, GiaTriTrangThai> = {}
    for (const [id, giaTri] of Object.entries(kq.data.truoc)) {
      const g = LuocDoGiaTriTruoc.safeParse(giaTri)
      if (!g.success) throw new LoiApi(400, TB_HANG_LOAT.giaTriTruoc(id))
      truoc[id] = g.data
    }
    kiemCoTrongCay(cacId)
    const phanHoi: KetQuaHoanTacHangLoat = hoanTacHangLoat(db, { trangThai, truoc })
    res.json(phanHoi)
  })

  /** id của route phải là mục học trong cây (bất biến 8). */
  function idMuc(req: Request<{ id: string }>): string {
    const id = req.params.id
    if (!laMuc(id)) throw new LoiApi(404, `Không có mục học id "${id}" trong cây roadmap.`)
    return id
  }

  r.get('/state', (_req, res) => {
    const phanHoi: AnhChupHoc = docAnhChup(db, laMuc)
    res.json(phanHoi)
  })

  r.put('/trang-thai/:id', (req: Request<{ id: string }>, res) => {
    const id = idMuc(req)
    const kq = LuocDoDat.safeParse(req.body)
    if (!kq.success) throw new LoiApi(400, cauLoiDat(kq.error.issues[0]))
    const { trangThai, lyDo, via = 'mot-muc' } = kq.data
    const phanHoi: KetQuaDatTrangThai = datTrangThai(db, {
      id,
      giaTri: lyDo === undefined ? { trangThai } : { trangThai, lyDo },
      via,
    })
    res.json(phanHoi)
  })

  r.post('/luot-mo/:id', (req: Request<{ id: string }>, res) => {
    const phanHoi: KetQuaGhiLuotMo = ghiLuotMo(db, idMuc(req))
    res.json(phanHoi)
  })

  return r
}
