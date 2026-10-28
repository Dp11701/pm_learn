// Lớp dữ liệu trạng thái học trên web (đề xuất 1.10, 3.1, 3.9): TanStack Query.
// - useTrangThai(): ảnh chụp GET /api/state; tải lại khi revision của /api/meta mới hơn revision đang giữ
//   (tab khác, Claude, server đổi dữ liệu). Lần ghi của chính tab nhận revision server trả về, nên meta hỏi
//   trước lần ghi (cũ hơn) không làm tải lại. Ngoài QueryClientProvider (test component lẻ, gallery) thì coi
//   như chưa có dữ liệu: không gọi API, mọi mục là Chưa học.
// - useDatTrangThai(): đổi trạng thái có hiệu lực ngay (cập nhật lạc quan), lưu lỗi thì trả về giá trị server
//   đã xác nhận gần nhất + toast lỗi "Thử lại"; lưu xong thì toast "Đã chuyển … sang …" + "Hoàn tác" 5 giây
//   (Hoàn tác gửi lại giá trị cũ với via 'hoan-tac'). Các lần ghi chạy nối tiếp theo thứ tự bấm.
// - useGhiLuotMo(id): ghi một lượt mở bài cho mỗi lần vào trang bài.
// - useDatHangLoat(): đặt Chưa học / Đang học / Bỏ qua cho nhiều mục (Danh sách, trang Lĩnh vực — đề xuất 3.9, bất
//   biến 2: không có Đã xong). Không lạc quan: một transaction ở server, xong mới đổi ảnh chụp; toast "Đã chuyển n mục
//   sang …" + "Hoàn tác" (trả từng mục về giá trị cũ, mục đã đổi sau đó thì giữ nguyên) — toast này không tự đóng.
//   Chạy nối tiếp cùng lần đặt một mục.
// - Cờ "Cần ôn lại" (đề xuất 3.3, bất biến 3): danh sách `canOnLai` của GET /api/state (server tính); chỉ tính khi
//   mục đang Đã xong (canOnLaiCua). Đổi khỏi Đã xong → bỏ cờ ngay (lạc quan); đặt Đã xong → tải lại ảnh chụp khi hết
//   lần ghi (lần ghi của chính tab không làm tải lại theo revision); sang ngày mới (homNay của /api/meta) → tải lại.
// - "Có ghi chú" (bộ lọc Lộ trình, đề xuất 3.9): danh sách `coGhiChu` của GET /api/state; lưu ghi chú trong tab cập
//   nhật danh sách ngay (ganGhiChu, gọi từ hoc.ts) vì lần ghi của chính tab không làm tải lại ảnh chụp.
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import {
  QueryClient,
  QueryClientContext,
  useIsMutating,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { z } from 'zod'
import { canOnLaiTrong } from '../../../shared/domain/can-on-lai'
import {
  CAC_TRANG_THAI_HOC,
  TEN_TRANG_THAI_HOC,
  type TrangThaiHoc,
} from '../../../shared/domain/trang-thai'
import { layCay, type MucHoc } from '../../../shared/roadmap'
import {
  CAC_TRANG_THAI_HANG_LOAT,
  mucCua,
  type AnhChupHoc,
  type GiaTriTrangThai,
  type KetQuaDatHangLoat,
  type KetQuaDatTrangThai,
  type KetQuaGhiLuotMo,
  type KetQuaHoanTacHangLoat,
  type MucTrangThai,
  type TrangThaiHangLoat,
  type ViaMotMuc,
} from '../../../server/du-lieu/hop-dong-trang-thai'
import TenMuc from '../../components/TenMuc'
import { useToast } from '../../components/Toast'
import { DA_LUU_LY_DO_BO_QUA } from '../../copy/cho-duyet'
import { daChuyenHangLoat, daHoanTacHangLoat, khongMucNaoDoi } from '../../copy/cho-duyet-lo-trinh'
import { useKetNoi } from '../ket-noi'
import { goiApi, guiDatTrangThai, guiLuotMo, taiAnhChup } from './api'
import { canTaiLaiTheoMeta, ghiNhanRevisionCuaTab, revisionSauGhi } from './revision'
import {
  danhSachDangHoc,
  hocTiep,
  lyDoBoQuaTrong,
  trangThaiTrong,
  type DanhSachDangHoc,
} from './hoc-tiep'

/** Khoá query ảnh chụp dữ liệu học; phase sau invalidate khoá này sau khi ghi dữ liệu học khác. */
export const KHOA_TRANG_THAI = ['du-lieu-hoc', 'anh-chup'] as const
/** Tiền tố khoá của mọi lần ghi dữ liệu học (đang ghi thì không tải lại ảnh chụp theo revision). */
export const KHOA_GHI = ['du-lieu-hoc', 'ghi'] as const
const KHOA_DAT = [...KHOA_GHI, 'trang-thai'] as const
const KHOA_LUOT_MO = [...KHOA_GHI, 'luot-mo'] as const
/** Mọi lần đặt trạng thái chạy nối tiếp (TanStack scope): phản hồi về đúng thứ tự bấm. */
const PHAM_VI_DAT = { id: 'du-lieu-hoc:trang-thai' }

// Toast (§8.10, F26; đề xuất 3.1 — nguyên văn).
const LOI_LUU = 'Lỗi lưu — đã giữ trạng thái cũ.'
const THU_LAI = 'Thử lại'
const HOAN_TAC = 'Hoàn tác'

// ---------- Ảnh chụp ----------

let clientRong: QueryClient | undefined
/** Client không bao giờ gọi API, cho hook chạy ngoài QueryClientProvider. */
export function layClientRong(): QueryClient {
  clientRong ??= new QueryClient()
  return clientRong
}

/**
 * Gắn (hoặc gỡ, khi null) một mục vào ảnh chụp, không đổi đối tượng cũ. Mục không còn Đã xong thì bỏ khỏi
 * `canOnLai` (cờ chỉ có ở mục Đã xong); về lại Đã xong thì cờ chờ lần tải lại ảnh chụp (server tính).
 */
export function ganMuc(anhChup: AnhChupHoc, id: string, muc: MucTrangThai | null): AnhChupHoc {
  const trangThai = { ...anhChup.trangThai }
  if (muc) trangThai[id] = muc
  else delete trangThai[id]
  const moi: AnhChupHoc = { ...anhChup, trangThai }
  if (muc?.status !== 'done' && anhChup.canOnLai?.includes(id)) {
    moi.canOnLai = anhChup.canOnLai.filter((x) => x !== id)
  }
  return moi
}

/** Gắn / gỡ mục khỏi `coGhiChu` của ảnh chụp sau khi lưu ghi chú; không đổi gì thì trả lại đúng đối tượng cũ. */
export function ganGhiChu(anhChup: AnhChupHoc, id: string, co: boolean): AnhChupHoc {
  const cu = anhChup.coGhiChu ?? []
  if (cu.includes(id) === co) return anhChup
  return { ...anhChup, coGhiChu: co ? [...cu, id].sort() : cu.filter((x) => x !== id) }
}

/** Cờ "Cần ôn lại" của mục: có trong `canOnLai` của server VÀ đang Đã xong. */
export function canOnLaiCuaAnhChup(anhChup: AnhChupHoc | undefined, id: string): boolean {
  return trangThaiTrong(anhChup, id) === 'da-xong' && canOnLaiTrong(anhChup, id)
}

/**
 * Client cần tải lại ảnh chụp để biết cờ "Cần ôn lại" (vừa đặt Đã xong: cờ do server tính). Chờ tới khi không còn
 * lần ghi nào (tải chen vào lúc đang ghi có thể đè giá trị lạc quan).
 */
const canTaiCanOnLai = new WeakSet<QueryClient>()
/** homNay (của /api/meta) lúc ảnh chụp được dùng gần nhất, theo QueryClient: sang ngày mới thì tải lại. */
const ngayCuaAnhChup = new WeakMap<QueryClient, string>()

/** Tải lại ảnh chụp nếu đang chờ cờ "Cần ôn lại" và không còn lần ghi nào khác (`dangGhi` gồm cả lần đang gọi). */
function taiCanOnLaiNeuRanh(client: QueryClient, dangGhi: number): void {
  if (!canTaiCanOnLai.has(client) || dangGhi > 0) return
  canTaiCanOnLai.delete(client)
  void client.invalidateQueries({ queryKey: KHOA_TRANG_THAI }, { cancelRefetch: false })
}

export interface DuLieuTrangThai {
  /** undefined khi chưa tải xong (hoặc lỗi lần đầu, hoặc ngoài QueryClientProvider) */
  anhChup: AnhChupHoc | undefined
  /** Đang tải lần đầu: nơi dùng hiện skeleton / tắt nút đổi trạng thái */
  dangTai: boolean
  /** Tải lỗi và chưa có dữ liệu nào */
  loi: boolean
  taiLai: () => void
  trangThaiCua: (id: string) => TrangThaiHoc
  lyDoBoQuaCua: (id: string) => string | undefined
  /** Cờ "Cần ôn lại" (suy ra: Đã xong + có thẻ đến hạn theo server) */
  canOnLaiCua: (id: string) => boolean
  /** Mục có ghi chú (bộ lọc "Có ghi chú") */
  coGhiChuCua: (id: string) => boolean
}

export function useTrangThai(): DuLieuTrangThai {
  const ctx = useContext(QueryClientContext)
  const client = ctx ?? layClientRong()
  const q = useQuery(
    {
      queryKey: KHOA_TRANG_THAI,
      // Không dùng AbortSignal: TanStack huỷ lượt tải có dùng signal khi observer cuối gỡ ra (StrictMode gắn
      // lại → tải 2 lần); huỷ lạc quan ở onMutate vẫn chặn được kết quả cũ ghi đè.
      queryFn: () => taiAnhChup(),
      enabled: ctx !== undefined,
      // Độ mới do revision quyết (effect dưới): gắn thêm nơi dùng (mở tìm kiếm, sang bài khác) không tải lại.
      staleTime: Number.POSITIVE_INFINITY,
    },
    client,
  )
  const anhChup = q.data
  const meta = useKetNoi().meta
  const revisionMeta = meta?.revision
  const homNayMeta = meta?.homNay
  const soDangGhi = useIsMutating({ mutationKey: KHOA_GHI }, client)

  // Server có dữ liệu mới hơn ảnh chụp → tải lại (không chen vào lúc đang ghi; cancelRefetch false để nhiều
  // nơi cùng gọi chỉ thành một lượt tải).
  useEffect(() => {
    if (!ctx || revisionMeta === undefined || anhChup === undefined || soDangGhi > 0) return
    if (!canTaiLaiTheoMeta(ctx, 'trang-thai', revisionMeta, anhChup.revision)) return
    void ctx.invalidateQueries({ queryKey: KHOA_TRANG_THAI }, { cancelRefetch: false })
  }, [ctx, revisionMeta, anhChup, soDangGhi])

  // Cờ "Cần ôn lại": vừa đặt Đã xong (chờ hết lần ghi), hoặc sang ngày mới (thẻ tới hạn) → tải lại ảnh chụp.
  useEffect(() => {
    if (!ctx || anhChup === undefined) return
    taiCanOnLaiNeuRanh(ctx, soDangGhi)
    if (homNayMeta === undefined) return
    const truoc = ngayCuaAnhChup.get(ctx)
    if (truoc === homNayMeta || soDangGhi > 0) return
    ngayCuaAnhChup.set(ctx, homNayMeta)
    if (truoc !== undefined) {
      void ctx.invalidateQueries({ queryKey: KHOA_TRANG_THAI }, { cancelRefetch: false })
    }
  }, [ctx, anhChup, soDangGhi, homNayMeta])

  const { refetch } = q
  const taiLai = useCallback(() => void refetch(), [refetch])
  const coGhiChu = anhChup?.coGhiChu
  const tapGhiChu = useMemo(() => new Set(coGhiChu), [coGhiChu])
  return useMemo(
    () => ({
      anhChup,
      dangTai: ctx !== undefined && anhChup === undefined && !q.isError,
      loi: anhChup === undefined && q.isError,
      taiLai,
      trangThaiCua: (id: string) => trangThaiTrong(anhChup, id),
      lyDoBoQuaCua: (id: string) => lyDoBoQuaTrong(anhChup, id),
      canOnLaiCua: (id: string) => canOnLaiCuaAnhChup(anhChup, id),
      coGhiChuCua: (id: string) => tapGhiChu.has(id),
    }),
    [anhChup, ctx, q.isError, taiLai, tapGhiChu],
  )
}

/** "Học tiếp" (đề xuất 3.9); undefined khi chưa có dữ liệu. */
export function useHocTiep(): MucHoc | undefined {
  const { anhChup } = useTrangThai()
  return useMemo(() => hocTiep(layCay(), anhChup), [anhChup])
}

/** Khối "Đang học": n mục mở gần nhất + tổng. */
export function useDanhSachDangHoc(toiDa?: number): DanhSachDangHoc {
  const { anhChup } = useTrangThai()
  return useMemo(() => danhSachDangHoc(layCay(), anhChup, toiDa), [anhChup, toiDa])
}

// ---------- Đặt trạng thái ----------

export interface BienDatTrangThai {
  id: string
  trangThai: TrangThaiHoc
  /** Chỉ với 'bo-qua' */
  lyDo?: string
  via?: ViaMotMuc
}

export interface ApiDatTrangThai {
  /** Đặt trạng thái học của một mục (không làm gì nếu trùng giá trị đang có). */
  dat: (id: string, trangThai: TrangThaiHoc, lyDo?: string) => void
  /** Mục đang có lần ghi chưa xong (pill "đang lưu"). */
  dangLuu: (id: string) => boolean
  /** Lần ghi gần nhất của mục bị lỗi (segmented / pill "Lỗi lưu — đã giữ trạng thái cũ."). */
  loiLuu: (id: string) => boolean
  /** Gửi lại lần ghi lỗi gần nhất của mục. */
  thuLai: (id: string) => void
}

/**
 * Giá trị server đã xác nhận của các mục đang có lần ghi chưa xong, theo từng QueryClient. Lưu lỗi thì trả mục
 * về giá trị này, không phải giá trị trước lần ghi đó (có thể là giá trị lạc quan của lần ghi trước, chưa
 * từng lưu). Có khoá từ lần ghi đầu tới khi lần ghi cuối của mục xong.
 */
const daXacNhan = new WeakMap<QueryClient, Map<string, MucTrangThai | null>>()

function bangXacNhan(client: QueryClient): Map<string, MucTrangThai | null> {
  let bang = daXacNhan.get(client)
  if (!bang) {
    bang = new Map()
    daXacNhan.set(client, bang)
  }
  return bang
}

/** Số lần đặt trạng thái của mục chưa xong (lần đang gọi callback vẫn tính là chưa xong). */
function soLanDangGhi(client: QueryClient, id: string): number {
  return client.getMutationCache().findAll({
    mutationKey: KHOA_DAT,
    status: 'pending',
    predicate: (m) => (m.state.variables as BienDatTrangThai | undefined)?.id === id,
  }).length
}

function tenMuc(id: string) {
  const muc = layCay().mucTheoId.get(id)
  return muc ? <TenMuc>{muc.label}</TenMuc> : id
}

export function useDatTrangThai(): ApiDatTrangThai {
  const client = useQueryClient()
  const { toast } = useToast()

  const mutation = useMutation<KetQuaDatTrangThai, Error, BienDatTrangThai>({
    mutationKey: KHOA_DAT,
    scope: PHAM_VI_DAT,
    mutationFn: ({ id, trangThai, lyDo, via = 'mot-muc' }) =>
      guiDatTrangThai(id, lyDo === undefined ? { trangThai, via } : { trangThai, lyDo, via }),
    // Đồng bộ (không await): TanStack gọi onMutate ngay trong mutate() (cả lần ghi còn xếp hàng sau lần khác),
    // nên cache đổi ngay lúc bấm. Huỷ lượt tải ảnh chụp đang chạy trước (huỷ là đồng bộ) để nó không ghi đè
    // giá trị lạc quan. Lần ghi đầu của mục giữ lại giá trị đang có — giá trị server đã xác nhận.
    onMutate: (bien) => {
      void client.cancelQueries({ queryKey: KHOA_TRANG_THAI })
      const xacNhan = bangXacNhan(client)
      if (!xacNhan.has(bien.id)) {
        xacNhan.set(
          bien.id,
          client.getQueryData<AnhChupHoc>(KHOA_TRANG_THAI)?.trangThai[bien.id] ?? null,
        )
      }
      client.setQueryData<AnhChupHoc>(
        KHOA_TRANG_THAI,
        (cu) => cu && ganMuc(cu, bien.id, mucCua(bien)),
      )
    },
    onError: (_loi, bien) => {
      // Còn lần ghi sau của cùng mục đang chờ: giá trị lạc quan của lần sau giữ nguyên và kết quả của lần
      // sau quyết định (Thử lại lần này sẽ ghi đè lần sau), nên không trả về, không toast.
      if (soLanDangGhi(client, bien.id) > 1) return
      // Giữ trạng thái cũ: trả mục về giá trị server đã xác nhận gần nhất. Không còn lần ghi nào khác đang
      // chờ thì tải lại ảnh chụp cho chắc.
      const xacNhan = bangXacNhan(client)
      if (xacNhan.has(bien.id)) {
        const muc = xacNhan.get(bien.id) ?? null
        client.setQueryData<AnhChupHoc>(KHOA_TRANG_THAI, (cu) => cu && ganMuc(cu, bien.id, muc))
      }
      if (client.isMutating({ mutationKey: KHOA_GHI }) <= 1) {
        void client.invalidateQueries({ queryKey: KHOA_TRANG_THAI })
      }
      toast({
        loai: 'loi',
        noiDung: LOI_LUU,
        hanhDong: { nhan: THU_LAI, chay: () => mutation.mutate(bien) },
      })
    },
    onSuccess: (kq, bien) => {
      if (kq.daDoi) ghiNhanRevisionCuaTab(client, kq.revision)
      bangXacNhan(client).set(kq.id, kq.muc)
      // Còn lần ghi sau của cùng mục: giữ giá trị lạc quan của lần sau trên màn hình, chỉ nhận revision.
      const conLanSau = soLanDangGhi(client, kq.id) > 1
      client.setQueryData<AnhChupHoc>(
        KHOA_TRANG_THAI,
        (cu) =>
          cu && {
            ...(conLanSau ? cu : ganMuc(cu, kq.id, kq.muc)),
            // Ghi không đổi gì thì revision trả về có thể là của tab khác: không nhận, để còn tải lại.
            revision: kq.daDoi ? revisionSauGhi(cu.revision, kq.revision) : cu.revision,
          },
      )
      if (!kq.daDoi) return
      // Vừa thành Đã xong: cờ "Cần ôn lại" do server tính → tải lại ảnh chụp khi hết lần ghi (onSettled / useTrangThai)
      if (kq.sau.trangThai === 'da-xong') canTaiCanOnLai.add(client)
      // Mục đang Bỏ qua chỉ đổi lý do: không phải "chuyển sang Bỏ qua"
      const chiDoiLyDo = kq.truoc.trangThai === 'bo-qua' && kq.sau.trangThai === 'bo-qua'
      toast({
        noiDung: chiDoiLyDo ? (
          <>
            {DA_LUU_LY_DO_BO_QUA} {tenMuc(kq.id)}
          </>
        ) : (
          <>
            Đã chuyển {tenMuc(kq.id)} sang {TEN_TRANG_THAI_HOC[kq.sau.trangThai]}
          </>
        ),
        // Hoàn tác của Hoàn tác thì không có (đổi lại bằng cách đặt trạng thái).
        hanhDong:
          bien.via === 'hoan-tac'
            ? undefined
            : {
                nhan: HOAN_TAC,
                chay: () => mutation.mutate({ id: kq.id, ...kq.truoc, via: 'hoan-tac' }),
              },
      })
    },
    // Lần ghi cuối của mục xong (thành công hay lỗi) → bỏ giá trị đã xác nhận đang giữ.
    onSettled: (_kq, _loi, bien) => {
      if (soLanDangGhi(client, bien.id) <= 1) bangXacNhan(client).delete(bien.id)
      taiCanOnLaiNeuRanh(client, client.isMutating({ mutationKey: KHOA_GHI }) - 1)
    },
  })
  const { mutate } = mutation

  const cacLan = useMutationState({
    filters: { mutationKey: KHOA_DAT },
    select: (m) => ({
      bien: m.state.variables as BienDatTrangThai | undefined,
      tinhTrang: m.state.status,
      luc: m.state.submittedAt,
    }),
  })

  return useMemo(() => {
    const lanCuoi = (id: string) =>
      cacLan.reduce<(typeof cacLan)[number] | undefined>(
        (cuoi, lan) => (lan.bien?.id === id && (!cuoi || lan.luc >= cuoi.luc) ? lan : cuoi),
        undefined,
      )
    return {
      dat: (id, trangThai, lyDo) => {
        const hienTai = client.getQueryData<AnhChupHoc>(KHOA_TRANG_THAI)?.trangThai[id] ?? null
        const moi = mucCua({ trangThai, lyDo })
        const dangCo = client.getQueryData<AnhChupHoc>(KHOA_TRANG_THAI) !== undefined
        if (dangCo && hienTai?.status === moi?.status && hienTai?.lyDoBoQua === moi?.lyDoBoQua) {
          return
        }
        mutate(lyDo === undefined ? { id, trangThai } : { id, trangThai, lyDo })
      },
      dangLuu: (id) => cacLan.some((l) => l.bien?.id === id && l.tinhTrang === 'pending'),
      loiLuu: (id) => lanCuoi(id)?.tinhTrang === 'error',
      thuLai: (id) => {
        const lan = lanCuoi(id)
        if (lan?.tinhTrang === 'error' && lan.bien) mutate(lan.bien)
      },
    }
  }, [cacLan, client, mutate])
}

// ---------- Đặt hàng loạt ----------

const KHOA_HANG_LOAT = [...KHOA_GHI, 'hang-loat'] as const
const KHOA_HOAN_TAC_HANG_LOAT = [...KHOA_GHI, 'hang-loat', 'hoan-tac'] as const

const LuocDoGiaTriTruoc = z.object({
  trangThai: z.enum(CAC_TRANG_THAI_HOC),
  lyDo: z.string().optional(),
})

const LuocDoKetQuaHangLoat: z.ZodType<KetQuaDatHangLoat> = z.object({
  revision: z.number(),
  trangThai: z.enum(CAC_TRANG_THAI_HANG_LOAT),
  daDoi: z.array(z.string()),
  truoc: z.record(z.string(), LuocDoGiaTriTruoc),
})

const LuocDoKetQuaHoanTac: z.ZodType<KetQuaHoanTacHangLoat> = z.object({
  revision: z.number(),
  daKhoiPhuc: z.array(z.string()),
  giuNguyen: z.array(z.string()),
})

/** POST /api/trang-thai/hang-loat */
export function guiDatHangLoat(
  ids: readonly string[],
  trangThai: TrangThaiHangLoat,
): Promise<KetQuaDatHangLoat> {
  return goiApi('/api/trang-thai/hang-loat', LuocDoKetQuaHangLoat, {
    method: 'POST',
    body: { ids, trangThai },
  })
}

/** POST /api/trang-thai/hang-loat/hoan-tac */
export function guiHoanTacHangLoat(
  trangThai: TrangThaiHangLoat,
  truoc: Record<string, GiaTriTrangThai>,
): Promise<KetQuaHoanTacHangLoat> {
  return goiApi('/api/trang-thai/hang-loat/hoan-tac', LuocDoKetQuaHoanTac, {
    method: 'POST',
    body: { trangThai, truoc },
  })
}

interface BienHangLoat {
  ids: readonly string[]
  trangThai: TrangThaiHangLoat
}

interface BienHoanTacHangLoat {
  trangThai: TrangThaiHangLoat
  truoc: Record<string, GiaTriTrangThai>
}

/** Gắn giá trị mới của nhiều mục vào ảnh chụp (một lần ghi, revision theo phản hồi). */
function ganNhieuMuc(
  client: QueryClient,
  cacMuc: readonly [string, MucTrangThai | null][],
  revision: number,
): void {
  if (cacMuc.length === 0) return
  ghiNhanRevisionCuaTab(client, revision)
  client.setQueryData<AnhChupHoc>(KHOA_TRANG_THAI, (cu) => {
    if (!cu) return cu
    let moi = cu
    for (const [id, muc] of cacMuc) moi = ganMuc(moi, id, muc)
    return { ...moi, revision: revisionSauGhi(cu.revision, revision) }
  })
}

export interface ApiDatHangLoat {
  /** Đặt trạng thái cho các mục; `khiXong` chạy khi server đã ghi xong (vd. bỏ chọn). */
  dat: (ids: readonly string[], trangThai: TrangThaiHangLoat, khiXong?: () => void) => void
  /** Đang có lần đặt hàng loạt hoặc Hoàn tác chưa xong */
  dangLuu: boolean
}

export function useDatHangLoat(): ApiDatHangLoat {
  const client = useQueryClient()
  const { toast } = useToast()

  /** Lưu lỗi: server không ghi gì (một transaction) — toast lỗi + "Thử lại"; tải lại ảnh chụp cho chắc. */
  const baoLoi = (thuLai: () => void) => {
    if (client.isMutating({ mutationKey: KHOA_GHI }) <= 1) {
      void client.invalidateQueries({ queryKey: KHOA_TRANG_THAI })
    }
    toast({ loai: 'loi', noiDung: LOI_LUU, hanhDong: { nhan: THU_LAI, chay: thuLai } })
  }

  const hoanTac = useMutation<KetQuaHoanTacHangLoat, Error, BienHoanTacHangLoat>({
    mutationKey: KHOA_HOAN_TAC_HANG_LOAT,
    scope: PHAM_VI_DAT,
    mutationFn: ({ trangThai, truoc }) => guiHoanTacHangLoat(trangThai, truoc),
    onSuccess: (kq, bien) => {
      ganNhieuMuc(
        client,
        kq.daKhoiPhuc.map((id) => [id, mucCua(bien.truoc[id] ?? { trangThai: 'chua-hoc' })]),
        kq.revision,
      )
      // Trả về Đã xong: cờ "Cần ôn lại" do server tính → tải lại ảnh chụp khi hết lần ghi
      if (kq.daKhoiPhuc.some((id) => bien.truoc[id]?.trangThai === 'da-xong')) {
        canTaiCanOnLai.add(client)
      }
      toast({ noiDung: daHoanTacHangLoat(kq.daKhoiPhuc.length, kq.giuNguyen.length) })
    },
    onError: (_loi, bien) => baoLoi(() => hoanTac.mutate(bien)),
    onSettled: () => taiCanOnLaiNeuRanh(client, client.isMutating({ mutationKey: KHOA_GHI }) - 1),
  })

  const dat = useMutation<KetQuaDatHangLoat, Error, BienHangLoat>({
    mutationKey: KHOA_HANG_LOAT,
    scope: PHAM_VI_DAT,
    mutationFn: ({ ids, trangThai }) => guiDatHangLoat(ids, trangThai),
    onSuccess: (kq) => {
      const ten = TEN_TRANG_THAI_HOC[kq.trangThai]
      if (kq.daDoi.length === 0) {
        toast({ noiDung: khongMucNaoDoi(ten) })
        return
      }
      const muc = mucCua({ trangThai: kq.trangThai })
      ganNhieuMuc(
        client,
        kq.daDoi.map((id) => [id, muc]),
        kq.revision,
      )
      // Lưới an toàn của lần ghi nhiều mục (Chưa học / Bỏ qua đè cả Đã xong, không hỏi): toast không tự đóng sau 5
      // giây, để người chỉ dùng bàn phím kịp Tab tới "Hoàn tác" (đóng bằng X, hoặc bị 2 toast mới hơn đẩy ra).
      toast({
        thoiGian: null,
        noiDung: daChuyenHangLoat(kq.daDoi.length, ten),
        hanhDong: {
          nhan: HOAN_TAC,
          chay: () => hoanTac.mutate({ trangThai: kq.trangThai, truoc: kq.truoc }),
        },
      })
    },
    onError: (_loi, bien) => baoLoi(() => dat.mutate(bien)),
  })

  const { mutate } = dat
  const dangLuu = dat.isPending || hoanTac.isPending
  return useMemo(
    () => ({
      dat: (ids, trangThai, khiXong) => {
        if (ids.length === 0) return
        mutate({ ids: [...ids], trangThai }, { onSuccess: () => khiXong?.() })
      },
      dangLuu,
    }),
    [mutate, dangLuu],
  )
}

// ---------- Lượt mở bài ----------

/**
 * Ghi một lượt mở bài khi vào trang bài của `id` (mỗi lần vào trang một lần; đổi sang mục khác thì ghi mục
 * đó). Lỗi thì bỏ qua: lượt mở chỉ dùng để xếp "Đang học" / "Học tiếp".
 */
export function useGhiLuotMo(id: string | undefined): void {
  const client = useQueryClient()
  const { mutate } = useMutation<KetQuaGhiLuotMo, Error, string>({
    mutationKey: KHOA_LUOT_MO,
    mutationFn: guiLuotMo,
    onSuccess: (kq) => {
      ghiNhanRevisionCuaTab(client, kq.revision)
      client.setQueryData<AnhChupHoc>(
        KHOA_TRANG_THAI,
        (cu) =>
          cu && {
            ...cu,
            luotMo: { ...cu.luotMo, [kq.id]: kq.lanMoCuoi },
            revision: revisionSauGhi(cu.revision, kq.revision),
          },
      )
    },
  })
  // StrictMode chạy effect hai lần nhưng giữ ref: chỉ một lượt ghi cho mỗi lần vào trang.
  const daGhi = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!id || daGhi.current === id) return
    daGhi.current = id
    mutate(id)
  }, [id, mutate])
}
