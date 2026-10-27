// Gọi API dữ liệu học (đề xuất 1.10): JSON, không cache; lỗi HTTP → LoiGoiApi mang câu `loi` của server.
// Phản hồi được kiểm bằng zod theo hợp đồng ở server/du-lieu/hop-dong-trang-thai.ts (nơi duy nhất ánh xạ
// learning / done / skip ↔ TrangThaiHoc).
import { z } from 'zod'
import { CAC_NGUON } from '../../../shared/noi-dung'
import { CAC_TRANG_THAI_HOC, type TrangThaiNoiDung } from '../../../shared/domain/trang-thai'
import {
  CAC_TRANG_THAI_DB,
  type AnhChupHoc,
  type KetQuaDatTrangThai,
  type KetQuaGhiLuotMo,
  type YeuCauDatTrangThai,
} from '../../../server/du-lieu/hop-dong-trang-thai'

export class LoiGoiApi extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'LoiGoiApi'
    this.status = status
  }
}

interface TuyChonGoi {
  method?: 'GET' | 'PUT' | 'POST' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  /** Yêu cầu sống tiếp sau khi trang đóng (gửi chữ đang gõ lúc rời trang; thân ≤ 64 KiB) */
  keepalive?: boolean
}

export async function goiApi<T>(
  duongDan: string,
  luocDo: z.ZodType<T>,
  { method = 'GET', body, signal, keepalive }: TuyChonGoi = {},
): Promise<T> {
  const phanHoi = await fetch(duongDan, {
    method,
    signal,
    ...(keepalive ? { keepalive: true } : {}),
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json: unknown = await phanHoi.json().catch(() => null)
  if (!phanHoi.ok) {
    const loi =
      typeof json === 'object' && json !== null && 'loi' in json && typeof json.loi === 'string'
        ? json.loi
        : `${method} ${duongDan}: ${phanHoi.status}`
    throw new LoiGoiApi(phanHoi.status, loi)
  }
  return luocDo.parse(json)
}

const LuocDoMucTrangThai = z.object({
  status: z.enum(CAC_TRANG_THAI_DB),
  lyDoBoQua: z.string().optional(),
})

const LuocDoGiaTri = z.object({
  trangThai: z.enum(CAC_TRANG_THAI_HOC),
  lyDo: z.string().optional(),
})

// z.object bỏ khoá lạ: trường nào web dùng phải khai ở đây (canOnLai thiếu thì cờ "Cần ôn lại" không bao giờ hiện).
export const LuocDoAnhChup: z.ZodType<AnhChupHoc> = z.object({
  revision: z.number(),
  trangThai: z.record(z.string(), LuocDoMucTrangThai),
  luotMo: z.record(z.string(), z.string()),
  /** Phase 3: id các mục Cần ôn lại (server tính; bất biến 3) */
  canOnLai: z.array(z.string()).optional(),
})

export const LuocDoKetQuaDat: z.ZodType<KetQuaDatTrangThai> = z.object({
  revision: z.number(),
  id: z.string(),
  muc: LuocDoMucTrangThai.nullable(),
  sau: LuocDoGiaTri,
  truoc: LuocDoGiaTri,
  daDoi: z.boolean(),
})

export const LuocDoKetQuaLuotMo: z.ZodType<KetQuaGhiLuotMo> = z.object({
  revision: z.number(),
  id: z.string(),
  lanMoCuoi: z.string(),
})

export const DUONG_DAN_STATE = '/api/state'

/** GET /api/state */
export function taiAnhChup(signal?: AbortSignal): Promise<AnhChupHoc> {
  return goiApi(DUONG_DAN_STATE, LuocDoAnhChup, { signal })
}

/** PUT /api/trang-thai/:id */
export function guiDatTrangThai(
  id: string,
  yeuCau: YeuCauDatTrangThai,
): Promise<KetQuaDatTrangThai> {
  return goiApi(`/api/trang-thai/${encodeURIComponent(id)}`, LuocDoKetQuaDat, {
    method: 'PUT',
    body: yeuCau,
  })
}

/** Trạng thái nội dung của một mục (C8; frontmatter + bản chụp duyệt). */
export const LuocDoTrangThaiNoiDung: z.ZodType<TrangThaiNoiDung> = z.discriminatedUnion('loai', [
  z.object({ loai: z.literal('chua-co') }),
  z.object({ loai: z.literal('ban-nhap'), nguon: z.enum(CAC_NGUON) }),
  z.object({
    loai: z.literal('da-duyet'),
    ngayDuyet: z.string(),
    coBanSua: z.boolean().optional(),
  }),
])

/** Trạng thái nội dung theo id mục; chỉ mục có file, không có khoá = Chưa có nội dung. */
export type BangTrangThaiNoiDung = Record<string, TrangThaiNoiDung>

const LuocDoBangTrangThaiNoiDung: z.ZodType<BangTrangThaiNoiDung> = z.record(
  z.string(),
  LuocDoTrangThaiNoiDung,
)

export const DUONG_DAN_TRANG_THAI_NOI_DUNG = '/api/noi-dung/trang-thai'

/** GET /api/noi-dung/trang-thai (server/routes/noi-dung.ts) */
export function taiTrangThaiNoiDung(): Promise<BangTrangThaiNoiDung> {
  return goiApi(DUONG_DAN_TRANG_THAI_NOI_DUNG, LuocDoBangTrangThaiNoiDung)
}

/** POST /api/luot-mo/:id */
export function guiLuotMo(id: string): Promise<KetQuaGhiLuotMo> {
  return goiApi(`/api/luot-mo/${encodeURIComponent(id)}`, LuocDoKetQuaLuotMo, { method: 'POST' })
}
