// Lớp dữ liệu học của MỘT mục trên web (đề xuất 2.1, 3.2, 3.5; §1 vòng 4 bước; §11 "Tự lưu, không tải đè lên ô
// đang gõ"): GET /api/hoc/:id + các lần ghi Nói lại, Thực hành, Tự kiểm tra, Ghi chú (file này) và flashcard
// (the.ts) của mục. TanStack Query, cùng cách làm với trang-thai.tsx:
// - Cache của mục = giá trị server đã xác nhận ⊕ các lần ghi đang chờ (theo thứ tự bấm) ⊕ chữ đang gõ chưa lưu.
//   Vì vậy lưu lỗi thì tự trả về giá trị server đã xác nhận (trừ khoá mà lần ghi sau còn chờ sẽ quyết), và tải
//   lại (revision của /api/meta mới hơn) không bao giờ đè chữ đang gõ.
// - Mọi lần ghi của một mục chạy nối tiếp (TanStack scope): server nhận đúng thứ tự bấm. Lần ghi có đổi dữ liệu
//   trả revision: ghi nhận là của chính tab (revision.ts), ảnh chụp trạng thái học / dữ liệu học các mục khác nhận
//   revision đó nên không phải tải lại vì lần ghi này.
// - Ô chữ (Nói lại, Ghi chú, Kết quả thực hành, câu trả lời Tự kiểm tra) tự lưu: mỗi lần gõ giữ bản tạm
//   (src/app/nhap-tam.ts) và hẹn gửi sau TRE_TU_LUU ms (lần gõ sau thay lần trước, chữ mới nhất thắng); trạng
//   thái C25 "Đang lưu…" / "Đã lưu lúc 21:42" / "Lỗi lưu — Thử lại"; lưu xong mới xoá bản tạm. Lần ghi khác
//   của cùng khối (Xong, Xem đáp án…) mang theo chữ chưa lưu của ô đó.
// - Rời trang (đóng tab / cửa sổ, tải lại, ẩn tab): chữ đang hẹn gửi hoặc đang gửi được gửi ngay bằng fetch keepalive
//   (sống tiếp sau khi trang đóng) — bản tạm ở sessionStorage mất theo tab nên không đủ. Chữ có thể mất (lần gửi
//   trước lỗi, hoặc dài quá giới hạn keepalive) thì beforeunload để trình duyệt hỏi "Rời trang?".
// - Ngoài QueryClientProvider (gallery, test component lẻ): không gọi API, chưa có dữ liệu.
import {
  createElement,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react'
import {
  MutationObserver,
  QueryClient,
  QueryClientContext,
  useIsMutating,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { z } from 'zod'
import { nowIso } from '../../../shared/clock'
import {
  CAC_MUC_CHAM,
  CAC_TRANG_THAI_THUC_HANH,
  tinhBonBuoc,
  type KetQuaBonBuoc,
  type MucCham,
  type TrangThaiThucHanh,
} from '../../../shared/domain/bon-buoc'
import { layCay, type MauBai } from '../../../shared/roadmap'
import type { AnhChupHoc } from '../../../server/du-lieu/hop-dong-trang-thai'
import { TRE_TOAST } from '../../components/HopThoaiPrompt'
import TenMuc from '../../components/TenMuc'
import { useToast, type ApiToast } from '../../components/Toast'
import { DA_BO_DANH_DAU_KHONG_AP_DUNG, DA_DANH_DAU_KHONG_AP_DUNG } from '../../copy/cho-duyet'
import { useKetNoi } from '../ket-noi'
import { docNhapTam, luuNhapTam, xoaNhapTam } from '../nhap-tam'
import { goiApi, LoiGoiApi } from './api'
import { canTaiLaiTheoMeta, ghiNhanRevisionCuaTab, revisionSauGhi } from './revision'
import { ganGhiChu, KHOA_GHI, KHOA_TRANG_THAI, layClientRong } from './trang-thai'

export type { MucCham, TrangThaiThucHanh }

// ---------- Hợp đồng GET /api/hoc/:id ----------

/** Nói lại / Ghi chú: chữ + lần lưu cuối (ISO UTC). */
export interface ChuCoLuc {
  text: string
  capNhat: string
}

export interface ThucHanh {
  trangThai: TrangThaiThucHanh | null
  duAnId: number | null
  ketQua: string
  /** Khoá tiêu chí tự kiểm (taoKhoa của dòng) → đã tick */
  tieuChi: Record<string, boolean>
  /** Lý do Không áp dụng (1–500 ký tự) */
  lyDo: string | null
  xongLuc: string | null
}

export interface CauTraLoi {
  traLoi: string
  daXem: boolean
  /** Lần chấm mới nhất */
  cham: MucCham | null
  chamLuc: string | null
  /**
   * Chữ câu hỏi lúc lưu (server ghi, đề xuất 1.5) — hiện ở "Câu trả lời cho câu hỏi cũ"; null / thiếu = chưa biết.
   * Câu đổi chữ ít đã được server gán lại sang khoá mới khi trả GET /api/hoc/:id.
   */
  cauHoi?: string | null
}

/** Flashcard của mục (đề xuất 3.5: Leitner hộp 1–5, hạn ôn theo ngày lịch do server tính). */
export interface The {
  id: number
  truoc: string
  sau: string
  hop: number
  /** YYYY-MM-DD */
  hanOn: string
  /** Khoá câu Tự kiểm tra khi tạo từ câu đó */
  khoaCau: string | null
}

export interface DuLieuHoc {
  revision: number
  noiLai: ChuCoLuc | null
  thucHanh: ThucHanh
  /** Khoá câu (CauHoi.khoa) → câu trả lời */
  tuKiemTra: Record<string, CauTraLoi>
  ghiChu: ChuCoLuc | null
  the: The[]
}

const chuoiHoacNull = z
  .string()
  .nullish()
  .transform((v) => v ?? null)

const LuocDoChu: z.ZodType<ChuCoLuc> = z.object({ text: z.string(), capNhat: z.string() })

export const LuocDoThucHanh: z.ZodType<ThucHanh> = z.object({
  trangThai: z.enum(CAC_TRANG_THAI_THUC_HANH).nullable(),
  duAnId: z.number().nullable(),
  ketQua: z.string(),
  tieuChi: z.record(z.string(), z.boolean()).default({}),
  lyDo: chuoiHoacNull,
  xongLuc: chuoiHoacNull,
})

export const LuocDoCauTraLoi: z.ZodType<CauTraLoi> = z.object({
  traLoi: z.string(),
  daXem: z.boolean(),
  cham: z.enum(CAC_MUC_CHAM).nullable(),
  chamLuc: chuoiHoacNull,
  cauHoi: chuoiHoacNull,
})

export const LuocDoThe: z.ZodType<The> = z.object({
  id: z.number(),
  truoc: z.string(),
  sau: z.string(),
  hop: z.number().int().min(1).max(5),
  hanOn: z.string(),
  khoaCau: chuoiHoacNull,
})

export const LuocDoHoc: z.ZodType<DuLieuHoc> = z.object({
  revision: z.number(),
  noiLai: LuocDoChu.nullable(),
  thucHanh: LuocDoThucHanh,
  tuKiemTra: z.record(z.string(), LuocDoCauTraLoi),
  ghiChu: LuocDoChu.nullable(),
  the: z.array(LuocDoThe),
})

/** Phản hồi mọi lần ghi: { revision, daDoi } như /api/trang-thai, kèm dữ liệu mới nếu server gửi. */
const LuocDoPhanHoiGhi = z.looseObject({
  revision: z.number().optional(),
  daDoi: z.boolean().optional(),
})
export type PhanHoiGhi = z.infer<typeof LuocDoPhanHoiGhi>

const CAU_TRONG: CauTraLoi = { traLoi: '', daXem: false, cham: null, chamLuc: null }

// ---------- Khoá, đường dẫn ----------

/** Khoá query dữ liệu học của một mục. */
export const khoaHoc = (itemId: string) => ['du-lieu-hoc', 'hoc', itemId] as const
/** Tiền tố khoá các lần ghi dữ liệu học của mục (nằm dưới KHOA_GHI: đang ghi thì các ảnh chụp không tải lại). */
const KHOA_GHI_HOC = [...KHOA_GHI, 'hoc'] as const

const ma = encodeURIComponent
const duongDanHoc = (itemId: string) => `/api/hoc/${ma(itemId)}`

/** GET /api/hoc/:id */
export function taiHoc(itemId: string): Promise<DuLieuHoc> {
  return goiApi(duongDanHoc(itemId), LuocDoHoc)
}

// ---------- Các lần ghi ----------

export interface PatchThucHanh {
  /** null = bỏ đánh dấu (về chưa làm; còn dự án / kết quả / tiêu chí thì server đặt Đang làm) */
  trangThai?: TrangThaiThucHanh | null
  duAnId?: number | null
  ketQua?: string
  /** Gửi cả bảng tiêu chí (đã gộp với bảng đang có) */
  tieuChi?: Record<string, boolean>
  /** Chỉ đi với Không áp dụng */
  lyDo?: string
}

export interface PatchCauTraLoi {
  traLoi?: string
  daXem?: boolean
  cham?: MucCham
}

export interface BienTaoThe {
  truoc: string
  sau: string
  khoaCau?: string
}

export type YeuCauGhi =
  | { loai: 'noi-lai'; text: string }
  | { loai: 'ghi-chu'; text: string }
  | { loai: 'thuc-hanh'; patch: PatchThucHanh }
  | { loai: 'tu-kiem-tra'; khoa: string; patch: PatchCauTraLoi }
  | { loai: 'tao-the'; bien: BienTaoThe }
  | { loai: 'sua-the'; id: number; truoc?: string; sau?: string }
  | { loai: 'xoa-the'; id: number }
  | { loai: 'khoi-phuc-the'; the: The }

/** Ô chữ tự lưu của một mục. */
export type TruongChu = 'noi-lai' | 'ghi-chu' | 'ket-qua' | `tra-loi:${string}`

/** Một lần ghi đã gửi (hoặc đang xếp hàng). */
export interface BienGhi {
  itemId: string
  yc: YeuCauGhi
  /** Số thứ tự lần ghi trong tab */
  lan: number
  /** Lúc bấm (ISO): giá trị lạc quan của capNhat / xongLuc / chamLuc */
  luc: string
  /** Lần ghi mang chữ của một ô tự lưu */
  chu?: { truong: TruongChu; giaTri: string }
  /** Gửi bằng fetch keepalive (lúc rời trang) */
  keepalive?: boolean
}

function goiGhi({ itemId, yc, keepalive }: BienGhi): Promise<PhanHoiGhi> {
  const goc = duongDanHoc(itemId)
  const gui = (duongDan: string, method: 'PUT' | 'POST' | 'DELETE', body?: unknown) =>
    goiApi(duongDan, LuocDoPhanHoiGhi, { method, body, keepalive })
  switch (yc.loai) {
    case 'noi-lai':
      return gui(`${goc}/noi-lai`, 'PUT', { text: yc.text })
    case 'ghi-chu':
      return gui(`${goc}/ghi-chu`, 'PUT', { text: yc.text })
    case 'thuc-hanh':
      return gui(`${goc}/thuc-hanh`, 'PUT', yc.patch)
    case 'tu-kiem-tra':
      return gui(`${goc}/tu-kiem-tra/${ma(yc.khoa)}`, 'PUT', yc.patch)
    case 'tao-the':
      return gui('/api/the', 'POST', { itemId, ...yc.bien })
    case 'sua-the': {
      const body: { truoc?: string; sau?: string } = {}
      if (yc.truoc !== undefined) body.truoc = yc.truoc
      if (yc.sau !== undefined) body.sau = yc.sau
      return gui(`/api/the/${yc.id}`, 'PUT', body)
    }
    case 'xoa-the':
      return gui(`/api/the/${yc.id}`, 'DELETE')
    case 'khoi-phuc-the':
      return gui(`/api/the/${yc.the.id}/khoi-phuc`, 'POST')
  }
}

/** Đặt / thay một thẻ trong danh sách (giữ thứ tự theo id). */
function chenThe(cac: readonly The[], the: The): The[] {
  if (cac.some((t) => t.id === the.id)) return cac.map((t) => (t.id === the.id ? the : t))
  return [...cac, the].sort((a, b) => a.id - b.id)
}

/** Áp chữ của một ô vào dữ liệu (ô chữ chưa lưu, hoặc lần ghi chữ). */
function apChu(d: DuLieuHoc, truong: TruongChu, chu: string, luc: string): DuLieuHoc {
  switch (truong) {
    case 'noi-lai':
      return { ...d, noiLai: { text: chu, capNhat: d.noiLai?.capNhat ?? luc } }
    case 'ghi-chu':
      return { ...d, ghiChu: { text: chu, capNhat: d.ghiChu?.capNhat ?? luc } }
    case 'ket-qua':
      return { ...d, thucHanh: { ...d.thucHanh, ketQua: chu } }
    default: {
      const khoa = truong.slice('tra-loi:'.length)
      const cau = d.tuKiemTra[khoa] ?? CAU_TRONG
      return { ...d, tuKiemTra: { ...d.tuKiemTra, [khoa]: { ...cau, traLoi: chu } } }
    }
  }
}

/** Giá trị sau một lần ghi (lạc quan; cũng dùng khi server không gửi lại dữ liệu mới). */
export function apDungGhi(d: DuLieuHoc, yc: YeuCauGhi, luc: string): DuLieuHoc {
  switch (yc.loai) {
    case 'noi-lai':
      return { ...d, noiLai: { text: yc.text, capNhat: luc } }
    case 'ghi-chu':
      return { ...d, ghiChu: { text: yc.text, capNhat: luc } }
    case 'thuc-hanh': {
      const cu = d.thucHanh
      const p = yc.patch
      const ketQua = p.ketQua ?? cu.ketQua
      const duAnId = p.duAnId !== undefined ? p.duAnId : cu.duAnId
      const tieuChi = p.tieuChi ? { ...cu.tieuChi, ...p.tieuChi } : cu.tieuChi
      const coDuLieu =
        ketQua.trim() !== '' || duAnId !== null || Object.values(tieuChi).some(Boolean)
      let trangThai = p.trangThai !== undefined ? p.trangThai : cu.trangThai
      // Như server (hop-dong-hoc.ts): chưa làm mà có dự án / kết quả / tiêu chí → Đang làm; xoá hết Kết quả khi
      // đang Xong → Đang làm
      if (trangThai === null && coDuLieu) trangThai = 'dang-lam'
      if (trangThai === 'xong' && ketQua.trim() === '' && p.ketQua !== undefined) {
        trangThai = 'dang-lam'
      }
      const xongLuc =
        trangThai !== 'xong' ? null : cu.trangThai === 'xong' ? (cu.xongLuc ?? luc) : luc
      return {
        ...d,
        thucHanh: {
          trangThai,
          duAnId,
          ketQua,
          tieuChi,
          // Lý do chỉ đi với Không áp dụng
          lyDo: trangThai === 'khong-ap-dung' ? (p.lyDo ?? cu.lyDo) : null,
          xongLuc,
        },
      }
    }
    case 'tu-kiem-tra': {
      const cu = d.tuKiemTra[yc.khoa] ?? CAU_TRONG
      const p = yc.patch
      const moi: CauTraLoi = {
        ...cu,
        traLoi: p.traLoi ?? cu.traLoi,
        daXem: p.daXem ?? cu.daXem,
        cham: p.cham ?? cu.cham,
        chamLuc: p.cham ? luc : cu.chamLuc,
      }
      return { ...d, tuKiemTra: { ...d.tuKiemTra, [yc.khoa]: moi } }
    }
    case 'tao-the':
      // Chưa biết id, hộp, hạn: thẻ chỉ vào danh sách khi server trả về
      return d
    case 'sua-the':
      return {
        ...d,
        the: d.the.map((t) =>
          t.id === yc.id ? { ...t, truoc: yc.truoc ?? t.truoc, sau: yc.sau ?? t.sau } : t,
        ),
      }
    case 'xoa-the':
      return { ...d, the: d.the.filter((t) => t.id !== yc.id) }
    case 'khoi-phuc-the':
      return { ...d, the: chenThe(d.the, yc.the) }
  }
}

/** Thẻ trong phản hồi: `{ the }` hoặc chính phản hồi. */
export function layTheTrong(kq: PhanHoiGhi): The | null {
  const a = LuocDoThe.safeParse(kq.the)
  if (a.success) return a.data
  const b = LuocDoThe.safeParse(kq)
  return b.success ? b.data : null
}

/** Lúc lưu trong phản hồi (capNhat của Nói lại / Ghi chú) nếu server gửi. */
function lucTrong(kq: PhanHoiGhi): string | null {
  if (typeof kq.capNhat === 'string') return kq.capNhat
  for (const k of ['noiLai', 'ghiChu'] as const) {
    const p = LuocDoChu.safeParse(kq[k])
    if (p.success) return p.data.capNhat
  }
  return null
}

/** Giá trị server đã xác nhận sau một lần ghi thành công: ưu tiên dữ liệu server gửi lại. */
function apDungPhanHoi(d: DuLieuHoc, b: BienGhi, kq: PhanHoiGhi): DuLieuHoc {
  const { yc } = b
  switch (yc.loai) {
    case 'noi-lai':
    case 'ghi-chu': {
      const khoa = yc.loai === 'noi-lai' ? 'noiLai' : 'ghiChu'
      if (khoa in kq) {
        const p = LuocDoChu.nullable().safeParse(kq[khoa])
        if (p.success) return { ...d, [khoa]: p.data }
      }
      return apDungGhi(d, yc, lucTrong(kq) ?? b.luc)
    }
    case 'thuc-hanh': {
      const p = LuocDoThucHanh.safeParse(kq.thucHanh)
      return p.success ? { ...d, thucHanh: p.data } : apDungGhi(d, yc, b.luc)
    }
    case 'tu-kiem-tra': {
      // { khoa, cau } — cau null = câu không còn dữ liệu
      if ('cau' in kq) {
        const c = LuocDoCauTraLoi.nullable().safeParse(kq.cau)
        if (c.success) {
          const tuKiemTra = { ...d.tuKiemTra }
          if (c.data) tuKiemTra[yc.khoa] = c.data
          else delete tuKiemTra[yc.khoa]
          return { ...d, tuKiemTra }
        }
      }
      const tk = kq.tuKiemTra
      let p = LuocDoCauTraLoi.safeParse(tk)
      if (!p.success && typeof tk === 'object' && tk !== null) {
        p = LuocDoCauTraLoi.safeParse((tk as Record<string, unknown>)[yc.khoa])
      }
      return p.success
        ? { ...d, tuKiemTra: { ...d.tuKiemTra, [yc.khoa]: p.data } }
        : apDungGhi(d, yc, b.luc)
    }
    case 'tao-the':
    case 'sua-the':
    case 'khoi-phuc-the': {
      const the = layTheTrong(kq)
      return the ? { ...d, the: chenThe(d.the, the) } : apDungGhi(d, yc, b.luc)
    }
    case 'xoa-the':
      return apDungGhi(d, yc, b.luc)
  }
}

// ---------- Kho của tab (theo từng QueryClient) ----------

export type TinhTrangTuLuu = 'dang-luu' | 'da-luu' | 'loi'

export interface TrangThaiTuLuu {
  /** null = chưa có gì để báo */
  tinhTrang: TinhTrangTuLuu | null
  /** Lần lưu xong gần nhất (ISO) */
  luc: string | null
  /** Câu lỗi của lần lưu hỏng gần nhất */
  loi: string | null
}

const TU_LUU_YEN: TrangThaiTuLuu = { tinhTrang: null, luc: null, loi: null }

interface OChu {
  /** Chữ chưa được server xác nhận; null = không có */
  chuaLuu: string | null
  hen: ReturnType<typeof setTimeout> | null
  /** Lần gửi gần nhất của ô và chữ của nó */
  lanGuiCuoi: number
  giaTriGuiCuoi: string | null
  /** Chữ đã gửi thẳng bằng keepalive lúc rời trang gần nhất (không gửi trùng giữa beforeunload và pagehide) */
  guiRoiTrang: string | null
  soDangGui: number
  trangThai: TrangThaiTuLuu
}

interface KhoMuc {
  /** Giá trị server đã xác nhận (GET + các lần ghi thành công) */
  xacNhan: DuLieuHoc | undefined
  /** Lần ghi đang chờ, theo thứ tự gửi */
  dangCho: BienGhi[]
  /** Số lần ghi đã xong (thành công hay lỗi): GET bắt đầu trước một lần ghi xong thì có thể cũ */
  soGhiXong: number
  o: Map<TruongChu, OChu>
}

class KhoHoc {
  lan = 0
  muc = new Map<string, KhoMuc>()
  private nghe = new Set<() => void>()
  dangKy = (f: () => void) => {
    this.nghe.add(f)
    return () => {
      this.nghe.delete(f)
    }
  }
  phat() {
    for (const f of this.nghe) f()
  }
  layMuc(itemId: string): KhoMuc {
    let m = this.muc.get(itemId)
    if (!m) {
      m = { xacNhan: undefined, dangCho: [], soGhiXong: 0, o: new Map() }
      this.muc.set(itemId, m)
    }
    return m
  }
  layO(itemId: string, truong: TruongChu): OChu {
    const m = this.layMuc(itemId)
    let o = m.o.get(truong)
    if (!o) {
      o = {
        chuaLuu: null,
        hen: null,
        lanGuiCuoi: 0,
        giaTriGuiCuoi: null,
        guiRoiTrang: null,
        soDangGui: 0,
        trangThai: TU_LUU_YEN,
      }
      m.o.set(truong, o)
    }
    return o
  }
}

const khoTheoClient = new WeakMap<QueryClient, KhoHoc>()

function layKho(client: QueryClient): KhoHoc {
  let kho = khoTheoClient.get(client)
  if (!kho) {
    kho = new KhoHoc()
    khoTheoClient.set(client, kho)
  }
  return kho
}

/** Dữ liệu hiện ra = đã xác nhận ⊕ lần ghi đang chờ ⊕ chữ chưa lưu. */
function hienThi(m: KhoMuc): DuLieuHoc | undefined {
  if (!m.xacNhan) return undefined
  let d = m.xacNhan
  for (const b of m.dangCho) d = apDungGhi(d, b.yc, b.luc)
  for (const [truong, o] of m.o) if (o.chuaLuu !== null) d = apChu(d, truong, o.chuaLuu, nowIso())
  return d
}

function capNhatCache(client: QueryClient, itemId: string): void {
  const d = hienThi(layKho(client).layMuc(itemId))
  if (d) client.setQueryData<DuLieuHoc>(khoaHoc(itemId), d)
}

/** GET rồi ghi nhận làm giá trị đã xác nhận; trả dữ liệu hiện ra (giữ lần ghi đang chờ, chữ đang gõ). */
async function taiVaGhiNhan(client: QueryClient, itemId: string): Promise<DuLieuHoc> {
  const m = layKho(client).layMuc(itemId)
  const truoc = m.soGhiXong
  const moi = await taiHoc(itemId)
  if (m.soGhiXong !== truoc) {
    // Có lần ghi của tab xong trong lúc tải: bản vừa tải có thể cũ hơn lần ghi đó.
    if (m.xacNhan) return hienThi(m) as DuLieuHoc
    queueMicrotask(() => void client.invalidateQueries({ queryKey: khoaHoc(itemId) }))
  }
  m.xacNhan = moi
  return hienThi(m) as DuLieuHoc
}

/**
 * Revision của một lần ghi CÓ ĐỔI dữ liệu (dữ liệu học, đồng hồ, dự án…) của chính tab: các bản đang giữ không bị
 * lần ghi này làm cũ nhận revision mới (chỉ khi đúng +1 — revisionSauGhi), để /api/meta không làm tải lại.
 * `trangThai: false` khi lần ghi có thể đổi ảnh chụp trạng thái học (vd. xoá thẻ đến hạn đổi "Cần ôn lại").
 */
export function nhanRevisionCuaTab(
  client: QueryClient,
  revision: number,
  { trangThai = true }: { trangThai?: boolean } = {},
): void {
  ghiNhanRevisionCuaTab(client, revision)
  for (const [itemId, m] of layKho(client).muc) {
    if (!m.xacNhan) continue
    m.xacNhan = { ...m.xacNhan, revision: revisionSauGhi(m.xacNhan.revision, revision) }
    if (client.getQueryData(khoaHoc(itemId)) !== undefined) capNhatCache(client, itemId)
  }
  if (trangThai) {
    client.setQueryData<AnhChupHoc>(
      KHOA_TRANG_THAI,
      (cu) => cu && { ...cu, revision: revisionSauGhi(cu.revision, revision) },
    )
  }
}

function datTrangThaiO(o: OChu, moi: TrangThaiTuLuu): void {
  const cu = o.trangThai
  if (cu.tinhTrang === moi.tinhTrang && cu.luc === moi.luc && cu.loi === moi.loi) return
  o.trangThai = moi
}

/** Câu lỗi cho người dùng: câu của server (tiếng Việt) hoặc câu lưu lỗi chung (3.1). */
export function cauLoi(loi: unknown): string {
  return loi instanceof LoiGoiApi ? loi.message : LOI_LUU
}

/** Lỗi do dữ liệu gửi lên (4xx): gửi lại y nguyên cũng hỏng, nên không có "Thử lại". */
export function loiDoDuLieu(loi: unknown): boolean {
  return loi instanceof LoiGoiApi && loi.status >= 400 && loi.status < 500
}

export interface TuyChonGhi {
  khiXong?: (kq: PhanHoiGhi, b: BienGhi) => void
  khiLoi?: (loi: Error, b: BienGhi) => void
}

function xongGhi(client: QueryClient, b: BienGhi, kq: PhanHoiGhi, tuyChon: TuyChonGhi): void {
  const kho = layKho(client)
  const m = kho.layMuc(b.itemId)
  m.dangCho = m.dangCho.filter((x) => x !== b)
  m.soGhiXong += 1
  if (m.xacNhan) m.xacNhan = apDungPhanHoi(m.xacNhan, b, kq)
  const doiTrangThai = b.yc.loai === 'xoa-the' || b.yc.loai === 'khoi-phuc-the'
  if (kq.daDoi !== false && kq.revision !== undefined) {
    nhanRevisionCuaTab(client, kq.revision, { trangThai: !doiTrangThai })
  }
  // Ghi chú vừa lưu / xoá: ảnh chụp trạng thái không tải lại (lần ghi của tab) nên tự cập nhật "Có ghi chú"
  if (b.yc.loai === 'ghi-chu' && kq.daDoi !== false) {
    const co = b.yc.text.trim() !== ''
    client.setQueryData<AnhChupHoc>(KHOA_TRANG_THAI, (cu) => cu && ganGhiChu(cu, b.itemId, co))
  }
  // Xoá / khôi phục thẻ có thể đổi "Cần ôn lại" trong ảnh chụp trạng thái: tải lại khi không còn lần ghi nào khác
  if (doiTrangThai && client.isMutating({ mutationKey: KHOA_GHI }) <= 1) {
    void client.invalidateQueries({ queryKey: KHOA_TRANG_THAI })
  }
  if (b.yc.loai === 'tao-the' && !layTheTrong(kq)) {
    queueMicrotask(() => void client.invalidateQueries({ queryKey: khoaHoc(b.itemId) }))
  }
  if (b.chu) {
    const o = kho.layO(b.itemId, b.chu.truong)
    o.soDangGui -= 1
    if (b.lan === o.lanGuiCuoi) {
      if (o.chuaLuu === b.chu.giaTri) {
        o.chuaLuu = null
        if (o.hen) clearTimeout(o.hen)
        o.hen = null
        xoaNhapTam(khoaNhapTam(b.itemId, b.chu.truong))
        datTrangThaiO(o, { tinhTrang: 'da-luu', luc: lucTrong(kq) ?? nowIso(), loi: null })
      } else if (o.chuaLuu !== null && o.hen === null) {
        guiChu(client, b.itemId, b.chu.truong)
      }
    }
  }
  capNhatCache(client, b.itemId)
  kho.phat()
  tuyChon.khiXong?.(kq, b)
}

function loiGhi(client: QueryClient, b: BienGhi, loi: Error, tuyChon: TuyChonGhi): void {
  const kho = layKho(client)
  const m = kho.layMuc(b.itemId)
  m.dangCho = m.dangCho.filter((x) => x !== b)
  m.soGhiXong += 1
  if (b.chu) {
    const o = kho.layO(b.itemId, b.chu.truong)
    o.soDangGui -= 1
    // Lần gửi mới nhất của ô hỏng và không có chữ mới đang hẹn gửi → báo lỗi, giữ chữ + bản tạm
    if (b.lan === o.lanGuiCuoi && o.hen === null) {
      datTrangThaiO(o, { tinhTrang: 'loi', luc: o.trangThai.luc, loi: cauLoi(loi) })
    }
  }
  // Bỏ lần ghi hỏng khỏi hàng chờ = trả về giá trị server đã xác nhận (trừ khoá lần ghi sau còn chờ sẽ quyết)
  capNhatCache(client, b.itemId)
  kho.phat()
  if (m.dangCho.length === 0 && client.isMutating({ mutationKey: KHOA_GHI }) <= 1) {
    void client.invalidateQueries({ queryKey: khoaHoc(b.itemId) })
  }
  tuyChon.khiLoi?.(loi, b)
}

/**
 * Gửi một lần ghi dữ liệu học của mục: giá trị lạc quan hiện ngay; các lần ghi của cùng mục chạy nối tiếp.
 * Lỗi đã được xử lý (trả về giá trị server đã xác nhận); `khiLoi` để báo người dùng.
 */
export function guiGhiHoc(
  client: QueryClient,
  itemId: string,
  yc: YeuCauGhi,
  tuyChon: TuyChonGhi = {},
  chu?: BienGhi['chu'],
): BienGhi {
  const kho = layKho(client)
  const m = kho.layMuc(itemId)
  const b: BienGhi = { itemId, yc, lan: (kho.lan += 1), luc: nowIso(), ...(chu ? { chu } : {}) }
  m.dangCho.push(b)
  if (chu) {
    const o = kho.layO(itemId, chu.truong)
    o.lanGuiCuoi = b.lan
    o.giaTriGuiCuoi = chu.giaTri
    o.soDangGui += 1
    datTrangThaiO(o, { tinhTrang: 'dang-luu', luc: o.trangThai.luc, loi: null })
  }
  // Lượt tải đang chạy không được ghi đè giá trị lạc quan (chỉ huỷ khi đã có dữ liệu: huỷ lượt tải đầu thì
  // query không tự tải lại)
  if (client.getQueryData(khoaHoc(itemId)) !== undefined) {
    void client.cancelQueries({ queryKey: khoaHoc(itemId) })
  }
  capNhatCache(client, itemId)
  kho.phat()
  const nguoiQuan = new MutationObserver<PhanHoiGhi, Error, BienGhi>(client, {
    mutationKey: [...KHOA_GHI_HOC, itemId],
    scope: { id: `du-lieu-hoc:hoc:${itemId}` },
    mutationFn: goiGhi,
    onSuccess: (kq) => xongGhi(client, b, kq, tuyChon),
    onError: (loi) => loiGhi(client, b, loi, tuyChon),
  })
  nguoiQuan.mutate(b).catch(() => {
    // Đã xử lý ở onError
  })
  return b
}

/** Ô chữ của khối mà một lần ghi khác mang theo chữ chưa lưu (Xong mang Kết quả; Xem đáp án mang câu trả lời). */
function truongCuaKhoi(yc: YeuCauGhi): TruongChu | null {
  if (yc.loai === 'thuc-hanh') return 'ket-qua'
  if (yc.loai === 'tu-kiem-tra') return `tra-loi:${yc.khoa}`
  return null
}

function ycChu(truong: TruongChu, chu: string): YeuCauGhi {
  switch (truong) {
    case 'noi-lai':
      return { loai: 'noi-lai', text: chu }
    case 'ghi-chu':
      return { loai: 'ghi-chu', text: chu }
    case 'ket-qua':
      return { loai: 'thuc-hanh', patch: { ketQua: chu } }
    default:
      return {
        loai: 'tu-kiem-tra',
        khoa: truong.slice('tra-loi:'.length),
        patch: { traLoi: chu },
      }
  }
}

/** Gửi lần ghi của khối, kèm chữ chưa lưu của ô cùng khối (server nhận cả hai trong một lần). */
export function guiGhiKemChu(
  client: QueryClient,
  itemId: string,
  yc: YeuCauGhi,
  tuyChon: TuyChonGhi = {},
): BienGhi {
  const truong = truongCuaKhoi(yc)
  const o = truong ? layKho(client).muc.get(itemId)?.o.get(truong) : undefined
  // Không có chữ chưa lưu, hoặc chữ đó đang được gửi rồi: gửi riêng lần ghi này
  const dangGuiChuNay = o !== undefined && o.soDangGui > 0 && o.giaTriGuiCuoi === o.chuaLuu
  if (!truong || !o || o.chuaLuu === null || dangGuiChuNay) {
    return guiGhiHoc(client, itemId, yc, tuyChon)
  }
  if (o.hen) clearTimeout(o.hen)
  o.hen = null
  const chu = o.chuaLuu
  const kem: YeuCauGhi =
    yc.loai === 'thuc-hanh'
      ? { ...yc, patch: { ...yc.patch, ketQua: chu } }
      : yc.loai === 'tu-kiem-tra'
        ? { ...yc, patch: { ...yc.patch, traLoi: chu } }
        : yc
  return guiGhiHoc(client, itemId, kem, tuyChon, { truong, giaTri: chu })
}

// ---------- Tự lưu ô chữ ----------

/** Chờ ngừng gõ chừng này rồi mới gửi (ms). */
export const TRE_TU_LUU = 800

/** Khoá bản tạm (src/app/nhap-tam.ts) của một ô. */
export function khoaNhapTam(itemId: string, truong: TruongChu): string {
  if (truong.startsWith('tra-loi:')) return `tra-loi:${itemId}:${truong.slice('tra-loi:'.length)}`
  return `${truong}:${itemId}`
}

/** Chữ hiện tại của ô trong dữ liệu (đã gồm chữ chưa lưu). */
function chuTrong(d: DuLieuHoc | undefined, truong: TruongChu): string | undefined {
  if (!d) return undefined
  switch (truong) {
    case 'noi-lai':
      return d.noiLai?.text ?? ''
    case 'ghi-chu':
      return d.ghiChu?.text ?? ''
    case 'ket-qua':
      return d.thucHanh.ketQua
    default:
      return d.tuKiemTra[truong.slice('tra-loi:'.length)]?.traLoi ?? ''
  }
}

const rong = (s: string | undefined) => (s ?? '').trim() === ''

/** Gửi ngay chữ chưa lưu của ô (bỏ hẹn). */
function guiChu(client: QueryClient, itemId: string, truong: TruongChu): void {
  const kho = layKho(client)
  const o = kho.layO(itemId, truong)
  if (o.hen) clearTimeout(o.hen)
  o.hen = null
  const chu = o.chuaLuu
  if (chu === null) return
  // Đang gửi đúng chữ này rồi: chờ kết quả
  if (o.soDangGui > 0 && o.giaTriGuiCuoi === chu) return
  guiGhiHoc(client, itemId, ycChu(truong, chu), {}, { truong, giaTri: chu })
}

/** Thân yêu cầu keepalive tối đa (trình duyệt cho 64 KiB cho mọi yêu cầu keepalive đang bay): để dư. */
export const KEEPALIVE_TOI_DA = 60_000

/** Chữ gửi được bằng keepalive (UTF-8 + phần JSON bọc ngoài). */
function vuaKeepalive(chu: string): boolean {
  return new TextEncoder().encode(chu).length + 200 <= KEEPALIVE_TOI_DA
}

/**
 * Trang sắp ẩn / đóng mà ô còn chữ chưa lưu (đang hẹn gửi, đang gửi, hoặc lần trước lỗi): gửi THẲNG bằng fetch
 * keepalive ngay trong sự kiện — hàng chờ ghi của TanStack chạy ở nhịp sau (và chờ lần ghi trước của mục), trang đóng
 * thì không kịp; yêu cầu thường đang bay cũng bị huỷ khi trang đóng. Chữ đang hẹn vẫn gửi qua hàng chờ như thường để
 * trạng thái C25 đúng nếu trang ở lại (huỷ "Rời trang?", ẩn tab). PUT chữ là ghi đè nên gửi hai lần không sao.
 * Trả true khi chữ có thể mất — lần gửi trước lỗi (máy chủ có thể không nhận), hoặc chữ dài quá giới hạn keepalive —
 * để beforeunload hỏi người dùng.
 */
function guiKhiRoiTrang(client: QueryClient, itemId: string, truong: TruongChu): boolean {
  const o = layKho(client).muc.get(itemId)?.o.get(truong)
  const chu = o?.chuaLuu ?? null
  if (!o || chu === null) return false
  const daLoi = o.trangThai.tinhTrang === 'loi'
  const keepalive = vuaKeepalive(chu)
  if (keepalive && o.guiRoiTrang !== chu) {
    o.guiRoiTrang = chu
    goiGhi({ itemId, yc: ycChu(truong, chu), lan: 0, luc: nowIso(), keepalive: true }).catch(() => {
      // Không gửi được (máy chủ tắt): chữ còn trong bản tạm nếu tab còn
    })
  }
  if (o.hen !== null) guiChu(client, itemId, truong)
  return daLoi || !keepalive
}

/** Một lần gõ: giữ bản tạm, hẹn gửi; chữ mới thay chữ đang hẹn. */
function goChu(client: QueryClient, itemId: string, truong: TruongChu, chu: string): void {
  const kho = layKho(client)
  const o = kho.layO(itemId, truong)
  const truoc = chuTrong(client.getQueryData<DuLieuHoc>(khoaHoc(itemId)), truong)
  o.chuaLuu = chu
  luuNhapTam(khoaNhapTam(itemId, truong), chu)
  if (o.hen) clearTimeout(o.hen)
  o.hen = setTimeout(() => {
    o.hen = null
    guiChu(client, itemId, truong)
  }, TRE_TU_LUU)
  datTrangThaiO(o, { tinhTrang: 'dang-luu', luc: o.trangThai.luc, loi: null })
  // Cache chỉ đổi theo từng lần gõ khi ô chuyển giữa trống / có chữ (bước Hiểu, "Xem đáp án"); chữ đầy đủ vào
  // cache lúc gửi — ô đang gõ giữ chữ của chính nó, không vẽ lại cả trang mỗi phím.
  if (rong(truoc) !== rong(chu)) capNhatCache(client, itemId)
  kho.phat()
}

export interface TuLuu {
  /** Chữ của ô: chữ chưa lưu > bản tạm (nhap-tam) > máy chủ; undefined khi chưa tải xong */
  giaTri: string | undefined
  /** Gọi mỗi lần ô đổi chữ */
  luu: (chu: string) => void
  /** Lưu ngay chữ đang hẹn (blur, rời trang) */
  xongNgay: () => void
  /** Gửi lại sau "Lỗi lưu" */
  thuLai: () => void
  /** C25: 'dang-luu' "Đang lưu…" · 'da-luu' "Đã lưu lúc {luc}" · 'loi' "Lỗi lưu — Thử lại" · null: không hiện */
  tinhTrang: TinhTrangTuLuu | null
  luc: string | null
  loi: string | null
  khoaNhapTam: string
}

/** Ô chữ tự lưu `truong` của mục. */
function useTuLuu(itemId: string, truong: TruongChu, hoc: DuLieuHoc | undefined): TuLuu {
  const client = useQueryClient()
  const kho = layKho(client)
  const trangThai = useSyncExternalStore(
    kho.dangKy,
    () => kho.muc.get(itemId)?.o.get(truong)?.trangThai ?? TU_LUU_YEN,
  )
  const chuaLuu = useSyncExternalStore(
    kho.dangKy,
    () => kho.muc.get(itemId)?.o.get(truong)?.chuaLuu ?? null,
  )
  const khoa = khoaNhapTam(itemId, truong)
  const coDuLieu = hoc !== undefined

  // Có bản tạm khác máy chủ (lần trước chưa lưu được) → lưu lại; trùng thì bỏ bản tạm.
  useEffect(() => {
    if (!coDuLieu) return
    const o = kho.muc.get(itemId)?.o.get(truong)
    if (o && o.chuaLuu !== null) return
    const ban = docNhapTam(khoa)
    if (ban === null) return
    const mayChu = chuTrong(client.getQueryData<DuLieuHoc>(khoaHoc(itemId)), truong)
    if (ban === mayChu) xoaNhapTam(khoa)
    else goChu(client, itemId, truong, ban)
  }, [client, kho, itemId, truong, khoa, coDuLieu])

  // Rời ô / trang trong app: gửi ngay chữ đang hẹn
  useEffect(
    () => () => {
      if (kho.muc.get(itemId)?.o.get(truong)?.hen) guiChu(client, itemId, truong)
    },
    [client, kho, itemId, truong],
  )

  // Đóng tab / cửa sổ, tải lại, ẩn tab: gửi ngay bằng keepalive; chữ có thể mất thì để trình duyệt hỏi "Rời trang?"
  useEffect(() => {
    const roi = () => {
      guiKhiRoiTrang(client, itemId, truong)
    }
    const khiAn = () => {
      if (document.visibilityState === 'hidden') roi()
    }
    const truocKhiDong = (e: BeforeUnloadEvent) => {
      if (guiKhiRoiTrang(client, itemId, truong)) e.preventDefault()
    }
    window.addEventListener('pagehide', roi)
    document.addEventListener('visibilitychange', khiAn)
    window.addEventListener('beforeunload', truocKhiDong)
    return () => {
      window.removeEventListener('pagehide', roi)
      document.removeEventListener('visibilitychange', khiAn)
      window.removeEventListener('beforeunload', truocKhiDong)
    }
  }, [client, itemId, truong])

  const luu = useCallback(
    (chu: string) => goChu(client, itemId, truong, chu),
    [client, itemId, truong],
  )
  const xongNgay = useCallback(() => {
    if (kho.muc.get(itemId)?.o.get(truong)?.hen) guiChu(client, itemId, truong)
  }, [client, kho, itemId, truong])
  const thuLai = useCallback(() => guiChu(client, itemId, truong), [client, itemId, truong])

  // Chưa gõ gì ở tab này: "Đã lưu lúc …" theo lần lưu của máy chủ (Nói lại, Ghi chú)
  const capNhatMayChu =
    truong === 'noi-lai' ? hoc?.noiLai?.capNhat : truong === 'ghi-chu' ? hoc?.ghiChu?.capNhat : null
  const hien: TrangThaiTuLuu =
    trangThai.tinhTrang === null && capNhatMayChu
      ? { tinhTrang: 'da-luu', luc: capNhatMayChu, loi: null }
      : trangThai
  const giaTri = coDuLieu ? (chuaLuu ?? docNhapTam(khoa) ?? chuTrong(hoc, truong)) : undefined
  const { tinhTrang, luc, loi } = hien

  return useMemo(
    () => ({ giaTri, luu, xongNgay, thuLai, tinhTrang, luc, loi, khoaNhapTam: khoa }),
    [giaTri, luu, xongNgay, thuLai, tinhTrang, luc, loi, khoa],
  )
}

/** Mục có lần ghi (không tính lần chỉ mang chữ của ô tự lưu) chưa xong thoả `loc`. */
function useDangGhi(itemId: string, loc: (b: BienGhi) => boolean): boolean {
  const client = useQueryClient()
  const kho = layKho(client)
  return useSyncExternalStore(
    kho.dangKy,
    () => kho.muc.get(itemId)?.dangCho.some((b) => !laChiChu(b) && loc(b)) ?? false,
  )
}

/** Lần ghi chỉ mang chữ của một ô tự lưu (trạng thái riêng ở C25). */
function laChiChu(b: BienGhi): boolean {
  if (!b.chu) return false
  switch (b.yc.loai) {
    case 'noi-lai':
    case 'ghi-chu':
      return true
    case 'thuc-hanh':
      return Object.keys(b.yc.patch).every((k) => k === 'ketQua')
    case 'tu-kiem-tra':
      return Object.keys(b.yc.patch).every((k) => k === 'traLoi')
    default:
      return false
  }
}

/** Hai lần ghi cùng đặt một khoá (không tính chữ của ô tự lưu). */
function chungKhoa(a: YeuCauGhi, b: YeuCauGhi): boolean {
  if (a.loai === 'thuc-hanh' && b.loai === 'thuc-hanh') {
    return Object.keys(a.patch).some((k) => k !== 'ketQua' && k in b.patch)
  }
  if (a.loai === 'tu-kiem-tra' && b.loai === 'tu-kiem-tra') {
    return a.khoa === b.khoa && Object.keys(a.patch).some((k) => k !== 'traLoi' && k in b.patch)
  }
  const idThe = (y: YeuCauGhi) =>
    y.loai === 'sua-the' || y.loai === 'xoa-the'
      ? y.id
      : y.loai === 'khoi-phuc-the'
        ? y.the.id
        : undefined
  return idThe(a) !== undefined && idThe(a) === idThe(b)
}

/** Còn lần ghi sau (đang chờ) đặt cùng khoá: kết quả của lần sau quyết định, lỗi lần này không cần báo. */
export function conLanSau(client: QueryClient, b: BienGhi): boolean {
  const m = layKho(client).muc.get(b.itemId)
  return m?.dangCho.some((x) => x.lan > b.lan && chungKhoa(x.yc, b.yc)) ?? false
}

// Toast (§8.10, F26; đề xuất 3.1 — nguyên văn).
const LOI_LUU = 'Lỗi lưu — đã giữ trạng thái cũ.'
const THU_LAI = 'Thử lại'
const HOAN_TAC = 'Hoàn tác'
export { LOI_LUU, THU_LAI, HOAN_TAC }

/**
 * Báo lỗi một lần ghi (không phải ô tự lưu): còn lần ghi sau cùng khoá thì thôi; lỗi do dữ liệu (4xx) → câu của
 * server; lỗi khác → "Lỗi lưu — đã giữ trạng thái cũ." + Thử lại.
 */
export function baoLoiGhi(
  client: QueryClient,
  toast: ApiToast['toast'],
  thuLai: () => void,
): (loi: Error, b: BienGhi) => void {
  return (loi, b) => {
    if (conLanSau(client, b)) return
    if (loiDoDuLieu(loi)) toast({ loai: 'loi', noiDung: loi.message })
    else toast({ loai: 'loi', noiDung: LOI_LUU, hanhDong: { nhan: THU_LAI, chay: thuLai } })
  }
}

export function tenMuc(id: string) {
  const muc = layCay().mucTheoId.get(id)
  return muc ? createElement(TenMuc, null, muc.label) : id
}

// ---------- Đọc ----------

export interface DuLieuHocMuc {
  /** undefined khi chưa tải xong (hoặc lỗi lần đầu, hoặc ngoài QueryClientProvider) */
  hoc: DuLieuHoc | undefined
  dangTai: boolean
  /** Tải lỗi và chưa có dữ liệu */
  loi: boolean
  taiLai: () => void
}

/** Dữ liệu học của mục `itemId` (GET /api/hoc/:id); tải lại khi /api/meta có revision mới hơn. */
export function useHoc(itemId: string | undefined): DuLieuHocMuc {
  const ctx = useContext(QueryClientContext)
  const client = ctx ?? layClientRong()
  const bat = ctx !== undefined && itemId !== undefined
  const q = useQuery(
    {
      queryKey: khoaHoc(itemId ?? ''),
      queryFn: () => taiVaGhiNhan(client, itemId ?? ''),
      enabled: bat,
      // Độ mới do revision quyết (effect dưới), như ảnh chụp trạng thái học.
      staleTime: Number.POSITIVE_INFINITY,
    },
    client,
  )
  const hoc = q.data
  const revisionMeta = useKetNoi().meta?.revision
  const soDangGhi = useIsMutating({ mutationKey: KHOA_GHI }, client)

  // Server có dữ liệu mới hơn → tải lại (không chen vào lúc đang ghi). Lần ghi của chính tab đã nâng revision của
  // dữ liệu đang giữ nên không làm tải lại; chữ đang gõ vẫn giữ sau khi tải lại.
  useEffect(() => {
    if (!ctx || !bat || revisionMeta === undefined || hoc === undefined || soDangGhi > 0) return
    if (!canTaiLaiTheoMeta(ctx, `hoc:${itemId}`, revisionMeta, hoc.revision)) return
    void ctx.invalidateQueries({ queryKey: khoaHoc(itemId ?? '') }, { cancelRefetch: false })
  }, [ctx, bat, itemId, revisionMeta, hoc, soDangGhi])

  const { refetch } = q
  const taiLai = useCallback(() => void refetch(), [refetch])
  return useMemo(
    () => ({
      hoc,
      dangTai: bat && hoc === undefined && !q.isError,
      loi: hoc === undefined && q.isError,
      taiLai,
    }),
    [hoc, bat, q.isError, taiLai],
  )
}

/** Vòng 4 bước của mục (shared/domain/bon-buoc.ts); undefined khi chưa có dữ liệu học. */
export function useBonBuoc(
  itemId: string | undefined,
  mau: MauBai,
  cauHoiKhoa: readonly string[],
): KetQuaBonBuoc | undefined {
  const { hoc } = useHoc(itemId)
  const khoaCau = cauHoiKhoa.join('\n')
  return useMemo(
    () =>
      hoc ? tinhBonBuoc({ mau, cauHoiKhoa: khoaCau ? khoaCau.split('\n') : [], hoc }) : undefined,
    [hoc, mau, khoaCau],
  )
}

// ---------- Ghi: Nói lại, Ghi chú ----------

/** Ô "Nói lại bằng lời của bạn" (bước Hiểu): tự lưu. */
export function useLuuNoiLai(itemId: string): TuLuu {
  const { hoc } = useHoc(itemId)
  return useTuLuu(itemId, 'noi-lai', hoc)
}

/** Ghi chú của mục (C24): tự lưu. */
export function useLuuGhiChu(itemId: string): TuLuu {
  const { hoc } = useHoc(itemId)
  return useTuLuu(itemId, 'ghi-chu', hoc)
}

// ---------- Ghi: Thực hành (bước Áp dụng) ----------

export interface ApiThucHanh {
  /** Ô "Kết quả của bạn": tự lưu */
  ketQua: TuLuu
  /**
   * Ghi ngay các trường khác (lạc quan; lỗi → giá trị server đã xác nhận + toast). Không áp dụng cần lyDo (bỏ
   * khoảng trắng hai đầu, 1–500 ký tự); Xong của Chủ đề cần ô Kết quả có chữ (server kiểm). Đánh dấu / bỏ đánh
   * dấu Không áp dụng có toast + Hoàn tác như 2a. `khiXong`: máy chủ đã nhận lần ghi (kể cả lần "Thử lại" sau lỗi),
   * vd. để xoá bản tạm của ô lý do.
   */
  dat: (
    patch: Omit<PatchThucHanh, 'ketQua'>,
    tuyChon?: { treToast?: boolean; khiXong?: () => void },
  ) => void
  /** Tick / bỏ tick một tiêu chí tự kiểm */
  datTieuChi: (khoa: string, dat: boolean) => void
  /** Có lần ghi (không tính ô Kết quả) chưa xong */
  dangLuu: boolean
}

export function useLuuThucHanh(itemId: string): ApiThucHanh {
  const client = useQueryClient()
  const { toast } = useToast()
  const { hoc } = useHoc(itemId)
  const ketQua = useTuLuu(itemId, 'ket-qua', hoc)
  const dangLuu = useDangGhi(itemId, (b) => b.yc.loai === 'thuc-hanh')

  const dat = useCallback(
    function ghi(
      patch: Omit<PatchThucHanh, 'ketQua'>,
      tuyChon: { treToast?: boolean; hoanTac?: boolean; khiXong?: () => void } = {},
    ) {
      const cu = client.getQueryData<DuLieuHoc>(khoaHoc(itemId))?.thucHanh
      const p: PatchThucHanh = { ...patch }
      if (p.lyDo !== undefined) p.lyDo = p.lyDo.trim()
      guiGhiKemChu(
        client,
        itemId,
        { loai: 'thuc-hanh', patch: p },
        {
          khiXong: (kq) => {
            tuyChon.khiXong?.()
            if (kq.daDoi === false || !cu || p.trangThai === undefined) return
            const danhDau = p.trangThai === 'khong-ap-dung' && cu.trangThai !== 'khong-ap-dung'
            const boDanhDau = cu.trangThai === 'khong-ap-dung' && p.trangThai !== 'khong-ap-dung'
            if (!danhDau && !boDanhDau) return
            const hien = () =>
              toast({
                noiDung: createElement(
                  Fragment,
                  null,
                  danhDau ? DA_DANH_DAU_KHONG_AP_DUNG : DA_BO_DANH_DAU_KHONG_AP_DUNG,
                  ' ',
                  tenMuc(itemId),
                ),
                // Hoàn tác gửi lại giá trị cũ; Hoàn tác của Hoàn tác thì không có
                hanhDong: tuyChon.hoanTac
                  ? undefined
                  : {
                      nhan: HOAN_TAC,
                      chay: () =>
                        ghi(
                          cu.trangThai === 'khong-ap-dung' && cu.lyDo
                            ? { trangThai: cu.trangThai, lyDo: cu.lyDo }
                            : { trangThai: cu.trangThai },
                          { hoanTac: true },
                        ),
                    },
              })
            if (tuyChon.treToast) window.setTimeout(hien, TRE_TOAST)
            else hien()
          },
          khiLoi: baoLoiGhi(client, toast, () =>
            ghi(patch, { hoanTac: tuyChon.hoanTac, khiXong: tuyChon.khiXong }),
          ),
        },
      )
    },
    [client, itemId, toast],
  )

  const datTieuChi = useCallback(
    (khoa: string, gia: boolean) => {
      const cu = client.getQueryData<DuLieuHoc>(khoaHoc(itemId))?.thucHanh.tieuChi ?? {}
      dat({ tieuChi: { ...cu, [khoa]: gia } })
    },
    [client, itemId, dat],
  )

  return useMemo(
    () => ({ ketQua, dat: (p, t) => dat(p, t), datTieuChi, dangLuu }),
    [ketQua, dat, datTieuChi, dangLuu],
  )
}

// ---------- Ghi: Tự kiểm tra (bước Kiểm tra) ----------

export interface ApiTuKiemTra {
  /** Ô trả lời: tự lưu */
  traLoi: TuLuu
  /** "Xem đáp án" — chỉ khi ô trả lời có chữ (3.2); trả false khi chưa được */
  xemDapAn: () => boolean
  /** Tự chấm — chỉ sau khi đã xem đáp án; giữ lần chấm mới nhất. Trả false khi chưa được */
  cham: (muc: MucCham) => boolean
  dangLuu: boolean
}

export function useLuuTuKiemTra(itemId: string, khoa: string): ApiTuKiemTra {
  const client = useQueryClient()
  const { toast } = useToast()
  const { hoc } = useHoc(itemId)
  const traLoi = useTuLuu(itemId, `tra-loi:${khoa}`, hoc)
  const dangLuu = useDangGhi(itemId, (b) => b.yc.loai === 'tu-kiem-tra' && b.yc.khoa === khoa)

  const gui = useCallback(
    function ghi(patch: PatchCauTraLoi) {
      guiGhiKemChu(
        client,
        itemId,
        { loai: 'tu-kiem-tra', khoa, patch },
        { khiLoi: baoLoiGhi(client, toast, () => ghi(patch)) },
      )
    },
    [client, itemId, khoa, toast],
  )

  const xemDapAn = useCallback(() => {
    const kho = layKho(client)
    const chu =
      kho.muc.get(itemId)?.o.get(`tra-loi:${khoa}`)?.chuaLuu ??
      client.getQueryData<DuLieuHoc>(khoaHoc(itemId))?.tuKiemTra[khoa]?.traLoi
    if (rong(chu)) return false
    gui({ daXem: true })
    return true
  }, [client, itemId, khoa, gui])

  const cham = useCallback(
    (muc: MucCham) => {
      if (!client.getQueryData<DuLieuHoc>(khoaHoc(itemId))?.tuKiemTra[khoa]?.daXem) return false
      gui({ cham: muc })
      return true
    },
    [client, itemId, khoa, gui],
  )

  return useMemo(() => ({ traLoi, xemDapAn, cham, dangLuu }), [traLoi, xemDapAn, cham, dangLuu])
}
