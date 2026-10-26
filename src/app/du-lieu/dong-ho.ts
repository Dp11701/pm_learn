// Đồng hồ học (đề xuất 3.4, Cần chốt 12; bất biến 6; D26, D31): GET /api/dong-ho[?itemId=] → { dangChay, lichSu }
// (5 phiên gần nhất — của mục đó khi có itemId, như card "Đồng hồ của mục"). Server giữ đồng hồ đang chạy
// (active_timer: còn sau khi tắt / mở server), quyết ngày của phiên (ngày bắt đầu) và bỏ phiên < 1 phút; web không
// bao giờ gửi ngày giờ, chỉ đếm giây để hiện (useGiayDongHo).
// - Bắt đầu: lạc quan; mục khác đang chạy thì là "Chuyển sang mục này". Server báo 409 { dangChay } (tab khác vừa
//   bật) → hiện đồng hồ đang chạy đó, không tự chuyển.
// - Dừng / Chuyển: chờ server. 409 { canHoi, giay } (chạy > 3 giờ hoặc qua nửa đêm) → hỏi "quên tắt đồng hồ"
//   (useHoiQuenTat: một hộp thoại dùng chung cho cả app), trả lời thì gửi lại kèm ghiGiay (số giây — server kẹp
//   vào [60, thời lượng thật]; null = "Không ghi").
// - Chuyển xong: toast "Đã chuyển đồng hồ sang …" + Hoàn tác (POST /api/dong-ho/hoan-tac: bỏ phiên vừa ghi, chạy
//   lại đồng hồ cũ đúng giờ bắt đầu cũ).
// - Lịch sử: Xoá phiên lạc quan + toast Hoàn tác (POST /api/phien-gio/:id/khoi-phuc).
// Mọi lần ghi đồng hồ chạy nối tiếp; revision của chính tab không làm tải lại. Tải lại khi revision /api/meta đổi
// vì nơi khác. Ngoài QueryClientProvider (test khung app, gallery): không gọi API, nút không làm gì. Hook ghi cần
// ToastProvider (như useDatTrangThai).
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
  type QueryKey,
} from '@tanstack/react-query'
import { z } from 'zod'
import { now, nowIso } from '../../../shared/clock'
import { useToast, type ApiToast } from '../../components/Toast'
import { DA_CHUYEN_DONG_HO_SANG, DA_XOA_PHIEN_HOC } from '../../copy/cho-duyet'
import { useKetNoi } from '../ket-noi'
import { goiApi, LoiGoiApi } from './api'
import { HOAN_TAC, LOI_LUU, THU_LAI, loiDoDuLieu, nhanRevisionCuaTab, tenMuc } from './hoc'
import { chiDoTabGhi } from './revision'
import { KHOA_GHI, layClientRong } from './trang-thai'

export interface DangChay {
  itemId: string
  /** ISO UTC lúc bắt đầu (server ghi) */
  batDau: string
}

export interface PhienGio {
  id: number
  itemId: string
  /** YYYY-MM-DD: ngày bắt đầu phiên */
  ngay: string
  giay: number
}

export interface DuLieuDongHo {
  dangChay: DangChay | null
  /** 5 phiên gần nhất (mới trước) */
  lichSu: PhienGio[]
}

export const LuocDoDangChay: z.ZodType<DangChay> = z.object({
  itemId: z.string(),
  batDau: z.string(),
})

export const LuocDoPhienGio: z.ZodType<PhienGio> = z.object({
  id: z.number(),
  itemId: z.string(),
  ngay: z.string(),
  giay: z.number(),
})

const LuocDoDongHo: z.ZodType<DuLieuDongHo> = z.object({
  dangChay: LuocDoDangChay.nullable(),
  lichSu: z.array(LuocDoPhienGio),
})

const LuocDoPhanHoi = z.looseObject({
  revision: z.number().optional(),
  daDoi: z.boolean().optional(),
})
type PhanHoi = z.infer<typeof LuocDoPhanHoi>

/** 409 khi Dừng / Chuyển một đồng hồ đã chạy > 3 giờ hoặc qua nửa đêm mà chưa gửi ghiGiay. */
const LuocDoCanHoi = z.object({ canHoi: z.literal(true), giay: z.number() })
/** 409 khi Bắt đầu (không chuyển) lúc mục khác đang chạy. */
const LuocDoDangChayKhac = z.object({ dangChay: LuocDoDangChay })

/** Tiền tố khoá query đồng hồ; khoá đủ = [...KHOA_DONG_HO, itemId | null] (lịch sử của mục / mọi mục). */
export const KHOA_DONG_HO = ['du-lieu-hoc', 'dong-ho'] as const
const khoaDongHo = (itemId: string | null) => [...KHOA_DONG_HO, itemId] as const
const KHOA_GHI_DONG_HO = [...KHOA_GHI, 'dong-ho'] as const
const PHAM_VI_GHI = { id: 'du-lieu-hoc:dong-ho' }
export const DUONG_DAN_DONG_HO = '/api/dong-ho'
const SO_PHIEN_LICH_SU = 5

/** GET /api/dong-ho (itemId: Lịch sử chỉ của mục đó). */
export function taiDongHo(itemId: string | null = null): Promise<DuLieuDongHo> {
  const duongDan = itemId
    ? `${DUONG_DAN_DONG_HO}?itemId=${encodeURIComponent(itemId)}`
    : DUONG_DAN_DONG_HO
  return goiApi(duongDan, LuocDoDongHo)
}

/** Lỗi HTTP của API đồng hồ, giữ thân phản hồi (409 canHoi / dangChay). */
export class LoiDongHo extends LoiGoiApi {
  duLieu: unknown
  constructor(status: number, message: string, duLieu: unknown) {
    super(status, message)
    this.name = 'LoiDongHo'
    this.duLieu = duLieu
  }
}

async function goiDongHo(
  duongDan: string,
  method: 'POST' | 'DELETE',
  body?: unknown,
): Promise<PhanHoi> {
  const phanHoi = await fetch(duongDan, {
    method,
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
    throw new LoiDongHo(phanHoi.status, loi, json)
  }
  return LuocDoPhanHoi.parse(json)
}

// ---------- Hỏi "quên tắt đồng hồ" (C32, Cần chốt 12) ----------

export interface HoiQuenTat {
  /** Câu hỏi đến từ Dừng hay Chuyển */
  loai: 'dung' | 'chuyen'
  /** Thời lượng thật (giây) server báo: mặc định và tối đa của ô số */
  giay: number
  /** Mục đang chạy (sẽ dừng) */
  itemId: string | null
  /** Mục chuyển sang (loai 'chuyen') */
  itemIdMoi: string | null
}

interface KhoDongHo {
  hoi: HoiQuenTat | null
  nghe: Set<() => void>
  /** Revision /api/meta ứng với dữ liệu đồng hồ đang giữ */
  revisionDangGiu: number | undefined
}

const khoTheoClient = new WeakMap<QueryClient, KhoDongHo>()

function layKho(client: QueryClient): KhoDongHo {
  let kho = khoTheoClient.get(client)
  if (!kho) {
    kho = { hoi: null, nghe: new Set(), revisionDangGiu: undefined }
    khoTheoClient.set(client, kho)
  }
  return kho
}

function datHoi(client: QueryClient, hoi: HoiQuenTat | null): void {
  const kho = layKho(client)
  kho.hoi = hoi
  for (const f of kho.nghe) f()
}

// ---------- Dữ liệu đang giữ (mọi query đồng hồ: chung dangChay, lịch sử theo mục) ----------

type Toast = ApiToast['toast']

/** itemId lọc lịch sử của một khoá query đồng hồ (null = mọi mục). */
const mucLocCua = (khoa: QueryKey) => (khoa[2] as string | null | undefined) ?? null

function cacBan(client: QueryClient): [QueryKey, DuLieuDongHo | undefined][] {
  return client.getQueriesData<DuLieuDongHo>({ queryKey: KHOA_DONG_HO })
}

/** Đồng hồ đang chạy theo dữ liệu đang giữ (giống nhau ở mọi query). */
function dangChayHienTai(client: QueryClient): DangChay | null {
  for (const [, d] of cacBan(client)) if (d) return d.dangChay
  return null
}

/** Đổi mọi query đồng hồ đang có dữ liệu; `doi` nhận itemId lọc lịch sử của query đó. */
function doiMoiBan(
  client: QueryClient,
  doi: (d: DuLieuDongHo, mucLoc: string | null) => DuLieuDongHo,
): void {
  for (const [khoa, d] of cacBan(client)) {
    if (d) client.setQueryData<DuLieuDongHo>(khoa, doi(d, mucLocCua(khoa)))
  }
}

/** Thêm phiên vừa ghi vào lịch sử của các query có lọc khớp. */
function themPhien(d: DuLieuDongHo, mucLoc: string | null, phien: PhienGio | null | undefined) {
  if (!phien || (mucLoc !== null && mucLoc !== phien.itemId)) return d
  const lichSu = [phien, ...d.lichSu.filter((p) => p.id !== phien.id)].slice(0, SO_PHIEN_LICH_SU)
  return { ...d, lichSu }
}

// ---------- Ghi ----------

interface BienDongHo {
  duongDan: string
  method: 'POST' | 'DELETE'
  body?: unknown
}

interface TuyChonDongHo {
  /** Giá trị lạc quan (đồng bộ, lúc bấm) */
  lacQuan?: (d: DuLieuDongHo, mucLoc: string | null) => DuLieuDongHo
  xong?: (kq: PhanHoi) => void
  loi?: (loi: Error) => void
}

/** Tải lại dữ liệu đồng hồ khi không còn lần ghi đồng hồ nào khác (lần đang gọi callback vẫn tính). */
function taiLaiKhiRanh(client: QueryClient): void {
  if (client.isMutating({ mutationKey: KHOA_GHI_DONG_HO }) <= 1) {
    void client.invalidateQueries({ queryKey: KHOA_DONG_HO })
  }
}

function chay(client: QueryClient, bien: BienDongHo, tuyChon: TuyChonDongHo): void {
  const truoc = cacBan(client)
  const nguoiQuan = new MutationObserver<PhanHoi, Error, BienDongHo>(client, {
    mutationKey: KHOA_GHI_DONG_HO,
    scope: PHAM_VI_GHI,
    mutationFn: ({ duongDan, method, body }) => goiDongHo(duongDan, method, body),
    onSuccess: (kq) => {
      if (kq.daDoi !== false && kq.revision !== undefined) nhanRevisionCuaTab(client, kq.revision)
      tuyChon.xong?.(kq)
      taiLaiKhiRanh(client)
    },
    onError: (loi) => {
      // Trả về giá trị trước lần bấm này (lạc quan)
      if (tuyChon.lacQuan) for (const [khoa, d] of truoc) if (d) client.setQueryData(khoa, d)
      tuyChon.loi?.(loi)
      taiLaiKhiRanh(client)
    },
  })
  if (tuyChon.lacQuan) {
    void client.cancelQueries({ queryKey: KHOA_DONG_HO })
    doiMoiBan(client, tuyChon.lacQuan)
  }
  nguoiQuan.mutate(bien).catch(() => {
    // Đã xử lý ở onError
  })
}

function phienTrong(kq: PhanHoi): PhienGio | null | undefined {
  if (!('phien' in kq)) return undefined
  const p = LuocDoPhienGio.nullable().safeParse(kq.phien)
  return p.success ? p.data : undefined
}

function dangChayTrong(kq: PhanHoi): DangChay | null | undefined {
  if (!('dangChay' in kq)) return undefined
  const p = LuocDoDangChay.nullable().safeParse(kq.dangChay)
  return p.success ? p.data : undefined
}

function baoLoi(toast: Toast, loi: Error, thuLai: () => void): void {
  if (loiDoDuLieu(loi)) toast({ loai: 'loi', noiDung: loi.message })
  else toast({ loai: 'loi', noiDung: LOI_LUU, hanhDong: { nhan: THU_LAI, chay: thuLai } })
}

function canHoiTrong(loi: Error): number | null {
  if (!(loi instanceof LoiDongHo) || loi.status !== 409) return null
  const p = LuocDoCanHoi.safeParse(loi.duLieu)
  return p.success ? p.data.giay : null
}

/** ghiGiay gửi lên: số giây nguyên (null = "Không ghi"); undefined = chưa hỏi. */
function bodyGhiGiay(ghiGiay: number | null | undefined): { ghiGiay?: number | null } {
  if (ghiGiay === undefined) return {}
  return { ghiGiay: ghiGiay === null ? null : Math.round(ghiGiay) }
}

export function batDau(client: QueryClient, toast: Toast, itemId: string): void {
  const cu = dangChayHienTai(client)
  if (cu?.itemId === itemId) return
  // Mục khác đang chạy: bấm giờ mục này = "Chuyển sang mục này" (3.4)
  if (cu) return chuyen(client, toast, itemId)
  chay(
    client,
    { duongDan: `${DUONG_DAN_DONG_HO}/bat-dau`, method: 'POST', body: { itemId } },
    {
      lacQuan: (d) => ({ ...d, dangChay: { itemId, batDau: nowIso() } }),
      xong: (kq) => {
        const dc = dangChayTrong(kq)
        if (dc !== undefined) doiMoiBan(client, (d) => ({ ...d, dangChay: dc }))
      },
      loi: (loi) => {
        // Tab khác vừa bật đồng hồ cho mục khác: hiện đồng hồ đó (thẻ đồng hồ có "Chuyển sang mục này")
        if (loi instanceof LoiDongHo && loi.status === 409) {
          const p = LuocDoDangChayKhac.safeParse(loi.duLieu)
          if (p.success) {
            doiMoiBan(client, (d) => ({ ...d, dangChay: p.data.dangChay }))
            return
          }
        }
        baoLoi(toast, loi, () => batDau(client, toast, itemId))
      },
    },
  )
}

export function dung(client: QueryClient, toast: Toast, ghiGiay?: number | null): void {
  const cu = dangChayHienTai(client)
  if (!cu) return
  chay(
    client,
    { duongDan: `${DUONG_DAN_DONG_HO}/dung`, method: 'POST', body: bodyGhiGiay(ghiGiay) },
    {
      xong: (kq) =>
        doiMoiBan(client, (d, loc) => ({ ...themPhien(d, loc, phienTrong(kq)), dangChay: null })),
      loi: (loi) => {
        const giay = canHoiTrong(loi)
        if (giay !== null) {
          datHoi(client, { loai: 'dung', giay, itemId: cu.itemId, itemIdMoi: null })
          return
        }
        baoLoi(toast, loi, () => dung(client, toast, ghiGiay))
      },
    },
  )
}

export function chuyen(
  client: QueryClient,
  toast: Toast,
  itemId: string,
  { ghiGiay }: { ghiGiay?: number | null } = {},
): void {
  const cu = dangChayHienTai(client)
  if (cu?.itemId === itemId) return
  chay(
    client,
    {
      duongDan: `${DUONG_DAN_DONG_HO}/bat-dau`,
      method: 'POST',
      body: { itemId, chuyen: true, ...bodyGhiGiay(ghiGiay) },
    },
    {
      xong: (kq) => {
        const dc = dangChayTrong(kq) ?? { itemId, batDau: nowIso() }
        doiMoiBan(client, (d, loc) => ({ ...themPhien(d, loc, phienTrong(kq)), dangChay: dc }))
        if (!cu) return
        toast({
          noiDung: createElement(Fragment, null, DA_CHUYEN_DONG_HO_SANG, ' ', tenMuc(itemId)),
          hanhDong: { nhan: HOAN_TAC, chay: () => hoanTacChuyen(client, toast, cu.itemId) },
        })
      },
      loi: (loi) => {
        const giay = canHoiTrong(loi)
        if (giay !== null) {
          datHoi(client, { loai: 'chuyen', giay, itemId: cu?.itemId ?? null, itemIdMoi: itemId })
          return
        }
        baoLoi(toast, loi, () => chuyen(client, toast, itemId, { ghiGiay }))
      },
    },
  )
}

/**
 * Hoàn tác "Chuyển sang mục này" (POST /api/dong-ho/hoan-tac): server bỏ phiên vừa ghi của mục cũ và chạy lại
 * đồng hồ cũ đúng giờ bắt đầu cũ. Toast báo đã về mục cũ, không có Hoàn tác nữa.
 */
function hoanTacChuyen(client: QueryClient, toast: Toast, itemIdCu: string): void {
  chay(
    client,
    { duongDan: `${DUONG_DAN_DONG_HO}/hoan-tac`, method: 'POST' },
    {
      xong: (kq) => {
        const dc = dangChayTrong(kq)
        if (dc !== undefined) doiMoiBan(client, (d) => ({ ...d, dangChay: dc }))
        toast({
          noiDung: createElement(
            Fragment,
            null,
            DA_CHUYEN_DONG_HO_SANG,
            ' ',
            tenMuc(dc?.itemId ?? itemIdCu),
          ),
        })
      },
      loi: (loi) => baoLoi(toast, loi, () => hoanTacChuyen(client, toast, itemIdCu)),
    },
  )
}

export function xoaPhien(client: QueryClient, toast: Toast, id: number): void {
  // Vị trí của phiên trong từng lịch sử đang giữ (để Hoàn tác đặt lại đúng chỗ)
  const viTri = new Map<string, number>()
  let phien: PhienGio | undefined
  for (const [khoa, d] of cacBan(client)) {
    const i = d?.lichSu.findIndex((p) => p.id === id) ?? -1
    if (i < 0 || !d) continue
    viTri.set(JSON.stringify(khoa), i)
    phien = d.lichSu[i]
  }
  if (!phien) return
  const daXoa = phien
  chay(
    client,
    { duongDan: `/api/phien-gio/${id}`, method: 'DELETE' },
    {
      lacQuan: (d) => ({ ...d, lichSu: d.lichSu.filter((p) => p.id !== id) }),
      xong: () =>
        toast({
          noiDung: DA_XOA_PHIEN_HOC,
          hanhDong: { nhan: HOAN_TAC, chay: () => khoiPhucPhien(client, toast, daXoa, viTri) },
        }),
      loi: (loi) => baoLoi(toast, loi, () => xoaPhien(client, toast, id)),
    },
  )
}

function khoiPhucPhien(
  client: QueryClient,
  toast: Toast,
  phien: PhienGio,
  viTri: Map<string, number>,
): void {
  chay(
    client,
    { duongDan: `/api/phien-gio/${phien.id}/khoi-phuc`, method: 'POST' },
    {
      lacQuan: (d, loc) => {
        if (loc !== null && loc !== phien.itemId) return d
        const lichSu = d.lichSu.filter((p) => p.id !== phien.id)
        const i = viTri.get(JSON.stringify(khoaDongHo(loc))) ?? 0
        lichSu.splice(Math.min(i, lichSu.length), 0, phien)
        return { ...d, lichSu: lichSu.slice(0, SO_PHIEN_LICH_SU) }
      },
      loi: (loi) => baoLoi(toast, loi, () => khoiPhucPhien(client, toast, phien, viTri)),
    },
  )
}

/** Trả lời hộp thoại quên tắt: số giây muốn ghi, hoặc null = "Không ghi". */
export function traLoiQuenTat(client: QueryClient, toast: Toast, ghiGiay: number | null): void {
  const hoi = layKho(client).hoi
  if (!hoi) return
  datHoi(client, null)
  if (hoi.loai === 'dung') dung(client, toast, ghiGiay)
  else if (hoi.itemIdMoi) chuyen(client, toast, hoi.itemIdMoi, { ghiGiay })
}

// ---------- Hook ----------

const khongLam = () => {}

export interface DuLieuDongHoHook {
  dangChay: DangChay | null
  /** 5 phiên gần nhất (của mục khi gọi useDongHo(itemId)) */
  lichSu: PhienGio[]
  dangTai: boolean
  loi: boolean
  taiLai: () => void
  /** Có lần ghi đồng hồ chưa xong (tắt nút để không bấm chồng) */
  dangGhi: boolean
}

/** Đồng hồ đang chạy + Lịch sử (của mục `itemId`, hoặc mọi mục khi không truyền). */
export function useDongHo(itemId: string | null = null): DuLieuDongHoHook {
  const ctx = useContext(QueryClientContext)
  const client = ctx ?? layClientRong()
  const q = useQuery(
    {
      queryKey: khoaDongHo(itemId),
      queryFn: () => taiDongHo(itemId),
      enabled: ctx !== undefined,
      staleTime: Number.POSITIVE_INFINITY,
    },
    client,
  )
  const data = q.data
  const revisionMeta = useKetNoi().meta?.revision
  const soDangGhi = useIsMutating({ mutationKey: KHOA_GHI }, client)
  const soGhiDongHo = useIsMutating({ mutationKey: KHOA_GHI_DONG_HO }, client)

  // Revision /api/meta đổi vì nơi khác (tab khác, server) → tải lại; lần ghi của chính tab thì không.
  useEffect(() => {
    if (!ctx || revisionMeta === undefined || data === undefined || soDangGhi > 0) return
    const kho = layKho(ctx)
    const dangGiu = kho.revisionDangGiu
    kho.revisionDangGiu = revisionMeta
    if (dangGiu === undefined || dangGiu === revisionMeta) return
    if (chiDoTabGhi(ctx, dangGiu, revisionMeta)) return
    void ctx.invalidateQueries({ queryKey: KHOA_DONG_HO }, { cancelRefetch: false })
  }, [ctx, revisionMeta, data, soDangGhi])

  const { refetch } = q
  const taiLai = useCallback(() => void refetch(), [refetch])
  return useMemo(
    () => ({
      dangChay: data?.dangChay ?? null,
      lichSu: data?.lichSu ?? [],
      dangTai: ctx !== undefined && data === undefined && !q.isError,
      loi: data === undefined && q.isError,
      taiLai,
      dangGhi: soGhiDongHo > 0,
    }),
    [data, ctx, q.isError, taiLai, soGhiDongHo],
  )
}

/** Bắt đầu bấm giờ mục (mục khác đang chạy → chuyển sang mục này). */
export function useBatDau(): (itemId: string) => void {
  const ctx = useContext(QueryClientContext)
  const { toast } = useToast()
  return useCallback((itemId: string) => ctx && batDau(ctx, toast, itemId), [ctx, toast])
}

/** Dừng đồng hồ đang chạy (có thể mở hộp thoại quên tắt). */
export function useDung(): () => void {
  const ctx = useContext(QueryClientContext)
  const { toast } = useToast()
  return useCallback(() => ctx && dung(ctx, toast), [ctx, toast])
}

/** "Chuyển sang mục này" (có thể mở hộp thoại quên tắt). */
export function useChuyen(): (itemId: string) => void {
  const ctx = useContext(QueryClientContext)
  const { toast } = useToast()
  return useCallback((itemId: string) => ctx && chuyen(ctx, toast, itemId), [ctx, toast])
}

/** Xoá một phiên trong Lịch sử (toast Hoàn tác). */
export function useXoaPhien(): (id: number) => void {
  const ctx = useContext(QueryClientContext)
  const { toast } = useToast()
  return useCallback((id: number) => ctx && xoaPhien(ctx, toast, id), [ctx, toast])
}

export interface ApiHoiQuenTat {
  /** Câu hỏi đang chờ trả lời; null = không mở hộp thoại */
  hoi: HoiQuenTat | null
  /** "Ghi": số giây muốn ghi (mặc định hoi.giay); null = "Không ghi" */
  traLoi: (ghiGiay: number | null) => void
  /** Đóng hộp thoại, đồng hồ vẫn chạy */
  huy: () => void
}

const KHO_RONG: KhoDongHo = { hoi: null, nghe: new Set(), revisionDangGiu: undefined }

/** Hộp thoại "quên tắt đồng hồ" (C32): dựng một lần trong khung app, đọc câu hỏi từ đây. */
export function useHoiQuenTat(): ApiHoiQuenTat {
  const ctx = useContext(QueryClientContext)
  const { toast } = useToast()
  const kho = ctx ? layKho(ctx) : KHO_RONG
  const dangKy = useCallback(
    (f: () => void) => {
      kho.nghe.add(f)
      return () => {
        kho.nghe.delete(f)
      }
    },
    [kho],
  )
  const hoi = useSyncExternalStore(dangKy, () => kho.hoi)
  const traLoi = useCallback(
    (ghiGiay: number | null) => ctx && traLoiQuenTat(ctx, toast, ghiGiay),
    [ctx, toast],
  )
  const huy = useCallback(() => ctx && datHoi(ctx, null), [ctx])
  return useMemo(() => ({ hoi, traLoi, huy }), [hoi, traLoi, huy])
}

// ---------- Đếm giây (chỉ để hiện) ----------

const ngheTick = new Set<() => void>()
let henTick: ReturnType<typeof setInterval> | null = null
let giayCuoi = 0

const giayNay = () => Math.floor(now() / 1000)

function dangKyTick(f: () => void): () => void {
  ngheTick.add(f)
  if (henTick === null) {
    giayCuoi = giayNay()
    // Hỏi 4 lần mỗi giây, chỉ báo khi sang giây mới: không lệch nhịp so với đồng hồ hệ thống
    henTick = setInterval(() => {
      const g = giayNay()
      if (g === giayCuoi) return
      giayCuoi = g
      for (const nghe of ngheTick) nghe()
    }, 250)
  }
  return () => {
    ngheTick.delete(f)
    if (ngheTick.size === 0 && henTick !== null) {
      clearInterval(henTick)
      henTick = null
    }
  }
}

const khongDangKy = () => khongLam

/** Số giây đã chạy kể từ `batDau` (ISO), đổi mỗi giây; null khi không chạy. Chỉ để hiện — server tính phiên. */
export function useGiayDaChay(batDau: string | null): number | null {
  const giay = useSyncExternalStore(batDau ? dangKyTick : khongDangKy, giayNay)
  if (!batDau) return null
  const moc = Date.parse(batDau)
  if (Number.isNaN(moc)) return null
  return Math.max(0, giay - Math.floor(moc / 1000))
}

/**
 * Số giây của đồng hồ đang chạy (00:24:17 = dinhDangDongHo(giay)); null khi không chạy. `itemId` như useDongHo
 * (cùng query với card của mục, không tải thêm).
 */
export function useGiayDongHo(itemId: string | null = null): number | null {
  return useGiayDaChay(useDongHo(itemId).dangChay?.batDau ?? null)
}
