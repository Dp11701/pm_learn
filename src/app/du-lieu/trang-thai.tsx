// Lớp dữ liệu trạng thái học trên web (đề xuất 1.10, 3.1, 3.9): TanStack Query.
// - useTrangThai(): ảnh chụp GET /api/state; tải lại khi revision của /api/meta mới hơn revision đang giữ
//   (tab khác, Claude, server đổi dữ liệu). Lần ghi của chính tab nhận revision server trả về, nên meta hỏi
//   trước lần ghi (cũ hơn) không làm tải lại. Ngoài QueryClientProvider (test component lẻ, gallery) thì coi
//   như chưa có dữ liệu: không gọi API, mọi mục là Chưa học.
// - useDatTrangThai(): đổi trạng thái có hiệu lực ngay (cập nhật lạc quan), lưu lỗi thì trả về giá trị server
//   đã xác nhận gần nhất + toast lỗi "Thử lại"; lưu xong thì toast "Đã chuyển … sang …" + "Hoàn tác" 5 giây
//   (Hoàn tác gửi lại giá trị cũ với via 'hoan-tac'). Các lần ghi chạy nối tiếp theo thứ tự bấm.
// - useGhiLuotMo(id): ghi một lượt mở bài cho mỗi lần vào trang bài.
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
import { TEN_TRANG_THAI_HOC, type TrangThaiHoc } from '../../../shared/domain/trang-thai'
import { layCay, type MucHoc } from '../../../shared/roadmap'
import {
  mucCua,
  type AnhChupHoc,
  type KetQuaDatTrangThai,
  type KetQuaGhiLuotMo,
  type MucTrangThai,
  type ViaMotMuc,
} from '../../../server/du-lieu/hop-dong-trang-thai'
import TenMuc from '../../components/TenMuc'
import { useToast } from '../../components/Toast'
import { useKetNoi } from '../ket-noi'
import { guiDatTrangThai, guiLuotMo, taiAnhChup } from './api'
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

/** Gắn (hoặc gỡ, khi null) một mục vào ảnh chụp, không đổi đối tượng cũ. */
export function ganMuc(anhChup: AnhChupHoc, id: string, muc: MucTrangThai | null): AnhChupHoc {
  const trangThai = { ...anhChup.trangThai }
  if (muc) trangThai[id] = muc
  else delete trangThai[id]
  return { ...anhChup, trangThai }
}

/** Nhận revision từ phản hồi ghi chỉ khi lần ghi đó là thay đổi duy nhất kể từ ảnh chụp đang giữ;
 *  ngược lại để nguyên, revision của /api/meta sẽ mới hơn và ảnh chụp được tải lại. */
function revisionSauGhi(anhChup: AnhChupHoc, revisionMoi: number): number {
  return revisionMoi === anhChup.revision + 1 ? revisionMoi : anhChup.revision
}

/** Revision /api/meta lớn nhất đã thấy, theo từng QueryClient (mọi nơi dùng hook chung một ảnh chụp). */
const metaCaoNhat = new WeakMap<QueryClient, number>()

/**
 * Có cần tải lại ảnh chụp không. Meta mới hơn ảnh chụp → có. Meta cũ hơn ảnh chụp là lần hỏi trước lần ghi của
 * chính tab (ảnh chụp đã nhận revision server trả về) → không. Riêng khi revision server lùi so với lần hỏi
 * trước (thay file DB rồi chạy lại server) → có.
 */
function canTaiLaiAnhChup(client: QueryClient, revisionMeta: number, revisionAnh: number) {
  const truoc = metaCaoNhat.get(client)
  const lui = truoc !== undefined && revisionMeta < truoc
  if (truoc === undefined || revisionMeta > truoc || lui) metaCaoNhat.set(client, revisionMeta)
  return revisionMeta > revisionAnh || (lui && revisionMeta !== revisionAnh)
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
  const revisionMeta = useKetNoi().meta?.revision
  const soDangGhi = useIsMutating({ mutationKey: KHOA_GHI }, client)

  // Server có dữ liệu mới hơn ảnh chụp → tải lại (không chen vào lúc đang ghi; cancelRefetch false để nhiều
  // nơi cùng gọi chỉ thành một lượt tải).
  useEffect(() => {
    if (!ctx || revisionMeta === undefined || anhChup === undefined || soDangGhi > 0) return
    if (!canTaiLaiAnhChup(ctx, revisionMeta, anhChup.revision)) return
    void ctx.invalidateQueries({ queryKey: KHOA_TRANG_THAI }, { cancelRefetch: false })
  }, [ctx, revisionMeta, anhChup, soDangGhi])

  const { refetch } = q
  const taiLai = useCallback(() => void refetch(), [refetch])
  return useMemo(
    () => ({
      anhChup,
      dangTai: ctx !== undefined && anhChup === undefined && !q.isError,
      loi: anhChup === undefined && q.isError,
      taiLai,
      trangThaiCua: (id: string) => trangThaiTrong(anhChup, id),
      lyDoBoQuaCua: (id: string) => lyDoBoQuaTrong(anhChup, id),
    }),
    [anhChup, ctx, q.isError, taiLai],
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
      bangXacNhan(client).set(kq.id, kq.muc)
      // Còn lần ghi sau của cùng mục: giữ giá trị lạc quan của lần sau trên màn hình, chỉ nhận revision.
      const conLanSau = soLanDangGhi(client, kq.id) > 1
      client.setQueryData<AnhChupHoc>(
        KHOA_TRANG_THAI,
        (cu) =>
          cu && {
            ...(conLanSau ? cu : ganMuc(cu, kq.id, kq.muc)),
            revision: revisionSauGhi(cu, kq.revision),
          },
      )
      if (!kq.daDoi) return
      toast({
        noiDung: (
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
      client.setQueryData<AnhChupHoc>(
        KHOA_TRANG_THAI,
        (cu) =>
          cu && {
            ...cu,
            luotMo: { ...cu.luotMo, [kq.id]: kq.lanMoCuoi },
            revision: revisionSauGhi(cu, kq.revision),
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
