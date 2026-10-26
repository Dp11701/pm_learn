// Lớp dữ liệu bước Áp dụng trên web (đề xuất 3.2; §1 "Hoặc chọn Không áp dụng và ghi lý do"): TanStack Query,
// cùng cách làm với trang-thai.tsx. Hợp đồng ở server/du-lieu/ap-dung.ts.
// - useApDung(): GET /api/ap-dung; tải lại khi revision của /api/meta mới hơn revision đang giữ (như ảnh chụp
//   trạng thái học: lần ghi của chính tab nhận revision server trả về, meta hỏi trước lần ghi không làm tải lại).
//   Ngoài QueryClientProvider thì coi như chưa có dữ liệu (không gọi API, mọi bước Áp dụng chưa làm).
// - useGhiApDung(): Không áp dụng kèm lý do (PUT) / bỏ đánh dấu (DELETE), có hiệu lực ngay (cập nhật lạc
//   quan); lưu lỗi thì trả về giá trị server đã xác nhận gần nhất + toast lỗi "Thử lại"; lưu xong thì toast +
//   "Hoàn tác" 5 giây (Hoàn tác gửi lại giá trị cũ: lý do cũ → PUT, chưa đánh dấu → DELETE). Các lần ghi chạy
//   nối tiếp theo thứ tự bấm.
// Phase 2a chỉ Chứng chỉ đánh dấu được (khối Kế hoạch thi); thanh 4 bước đọc buocCua(id).
import { createElement, Fragment, useCallback, useContext, useEffect, useMemo } from 'react'
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
import type { TinhTrangBuoc } from '../../../shared/domain/trang-thai'
import { layCay, type MauBai } from '../../../shared/roadmap'
import {
  CAC_TRANG_THAI_AP_DUNG,
  MAU_DANH_DAU_DUOC,
  buocApDung,
  lyDoKhongApDung,
  type AnhChupApDung,
  type KetQuaGhiApDung,
  type MucApDung,
  type YeuCauKhongApDung,
} from '../../../server/du-lieu/ap-dung'
import type { AnhChupHoc } from '../../../server/du-lieu/hop-dong-trang-thai'
import { TRE_TOAST } from '../../components/HopThoaiPrompt'
import TenMuc from '../../components/TenMuc'
import { useToast } from '../../components/Toast'
import { DA_BO_DANH_DAU_KHONG_AP_DUNG, DA_DANH_DAU_KHONG_AP_DUNG } from '../../copy/cho-duyet'
import { useKetNoi } from '../ket-noi'
import { xoaNhapTam } from '../nhap-tam'
import { goiApi } from './api'
import { canTaiLaiTheoMeta, ghiNhanRevisionCuaTab, revisionSauGhi } from './revision'
import { KHOA_GHI, KHOA_TRANG_THAI } from './trang-thai'

export type { MucApDung }

/** Khoá query dữ liệu Áp dụng. */
export const KHOA_AP_DUNG = ['du-lieu-hoc', 'ap-dung'] as const
const KHOA_GHI_AP_DUNG = [...KHOA_GHI, 'ap-dung'] as const
/** Mọi lần ghi Áp dụng chạy nối tiếp (TanStack scope): phản hồi về đúng thứ tự bấm. */
const PHAM_VI_GHI = { id: 'du-lieu-hoc:ap-dung' }

export const DUONG_DAN_AP_DUNG = '/api/ap-dung'

// Toast (§8.10, F26; đề xuất 3.1 — nguyên văn).
const LOI_LUU = 'Lỗi lưu — đã giữ trạng thái cũ.'
const THU_LAI = 'Thử lại'
const HOAN_TAC = 'Hoàn tác'

/** Khoá bản tạm (src/app/nhap-tam.ts) của ô lý do Không áp dụng; xoá khi máy chủ lưu xong. */
export const khoaNhapLyDo = (id: string) => `ap-dung-ly-do:${id}`

// ---------- Gọi API ----------

const LuocDoMuc = z.object({
  trangThai: z.enum(CAC_TRANG_THAI_AP_DUNG),
  lyDo: z.string().optional(),
})

const LuocDoAnhChup: z.ZodType<AnhChupApDung> = z.object({
  revision: z.number(),
  apDung: z.record(z.string(), LuocDoMuc),
})

const LuocDoKetQua: z.ZodType<KetQuaGhiApDung> = z.object({
  revision: z.number(),
  id: z.string(),
  muc: LuocDoMuc.nullable(),
  truoc: LuocDoMuc.nullable(),
  daDoi: z.boolean(),
})

const duongDanMuc = (id: string) => `${DUONG_DAN_AP_DUNG}/${encodeURIComponent(id)}`

/** GET /api/ap-dung */
export function taiApDung(): Promise<AnhChupApDung> {
  return goiApi(DUONG_DAN_AP_DUNG, LuocDoAnhChup)
}

/** PUT /api/ap-dung/:id */
function guiKhongApDung(id: string, lyDo: string): Promise<KetQuaGhiApDung> {
  const body: YeuCauKhongApDung = { khongApDung: true, lyDo }
  return goiApi(duongDanMuc(id), LuocDoKetQua, { method: 'PUT', body })
}

/** DELETE /api/ap-dung/:id */
function guiBoDanhDau(id: string): Promise<KetQuaGhiApDung> {
  return goiApi(duongDanMuc(id), LuocDoKetQua, { method: 'DELETE' })
}

// ---------- Đọc ----------

let clientRong: QueryClient | undefined
/** Client không bao giờ gọi API, cho hook chạy ngoài QueryClientProvider. */
function layClientRong(): QueryClient {
  clientRong ??= new QueryClient()
  return clientRong
}

/** Gắn (hoặc gỡ, khi null) một mục vào dữ liệu Áp dụng, không đổi đối tượng cũ. */
function ganMuc(anhChup: AnhChupApDung, id: string, muc: MucApDung | null): AnhChupApDung {
  const apDung = { ...anhChup.apDung }
  if (muc) apDung[id] = muc
  else delete apDung[id]
  return { ...anhChup, apDung }
}

/** Mẫu bài có dữ liệu Áp dụng (MAU_DANH_DAU_DUOC của server; phase 3 thêm Chủ đề, Tài liệu). */
export function coDuLieuApDung(mau: MauBai): boolean {
  return MAU_DANH_DAU_DUOC.includes(mau)
}

export interface DuLieuApDung {
  /** undefined khi chưa tải xong (hoặc lỗi lần đầu, hoặc ngoài QueryClientProvider) */
  anhChup: AnhChupApDung | undefined
  /** Đang tải lần đầu */
  dangTai: boolean
  /** Tải lỗi và chưa có dữ liệu nào */
  loi: boolean
  taiLai: () => void
  /** Áp dụng của một mục; undefined = chưa làm (hoặc chưa có dữ liệu) */
  cua: (id: string) => MucApDung | undefined
  /** Tình trạng bước Áp dụng trên thanh 4 bước theo dữ liệu đã lưu ('chua-lam' khi chưa có dữ liệu) */
  buocCua: (id: string) => TinhTrangBuoc
}

/**
 * Dữ liệu Áp dụng. `tai: false` (vd. mục có mẫu chưa có dữ liệu Áp dụng — coDuLieuApDung): không gọi API, chỉ
 * đọc dữ liệu đã có trong cache.
 */
export function useApDung({ tai = true }: { tai?: boolean } = {}): DuLieuApDung {
  const ctx = useContext(QueryClientContext)
  const client = ctx ?? layClientRong()
  const bat = ctx !== undefined && tai
  const q = useQuery(
    {
      queryKey: KHOA_AP_DUNG,
      queryFn: () => taiApDung(),
      enabled: bat,
      // Độ mới do revision quyết (effect dưới), như ảnh chụp trạng thái học.
      staleTime: Number.POSITIVE_INFINITY,
    },
    client,
  )
  const anhChup = q.data
  const revisionMeta = useKetNoi().meta?.revision
  const soDangGhi = useIsMutating({ mutationKey: KHOA_GHI }, client)

  // Server có dữ liệu mới hơn → tải lại (không chen vào lúc đang ghi; cancelRefetch false để nhiều nơi cùng
  // gọi chỉ thành một lượt tải). Meta cũ hơn dữ liệu (hỏi trước lần ghi của chính tab) thì không.
  useEffect(() => {
    if (!ctx || !bat || revisionMeta === undefined || anhChup === undefined || soDangGhi > 0) return
    if (!canTaiLaiTheoMeta(ctx, 'ap-dung', revisionMeta, anhChup.revision)) return
    void ctx.invalidateQueries({ queryKey: KHOA_AP_DUNG }, { cancelRefetch: false })
  }, [ctx, bat, revisionMeta, anhChup, soDangGhi])

  const { refetch } = q
  const taiLai = useCallback(() => void refetch(), [refetch])
  return useMemo(
    () => ({
      anhChup,
      dangTai: bat && anhChup === undefined && !q.isError,
      loi: anhChup === undefined && q.isError,
      taiLai,
      cua: (id: string) => anhChup?.apDung[id],
      buocCua: (id: string) => buocApDung(anhChup?.apDung[id]),
    }),
    [anhChup, bat, q.isError, taiLai],
  )
}

// ---------- Ghi ----------

interface BienGhi {
  id: string
  /** Lý do (đã bỏ khoảng trắng hai đầu) → PUT Không áp dụng; null → DELETE bỏ đánh dấu */
  lyDo: string | null
  /** Lần ghi này là Hoàn tác: toast không có Hoàn tác nữa */
  hoanTac?: boolean
  /** Hiện toast sau TRE_TOAST ms (gọi từ dialog: chờ dialog đóng hẳn để vùng toast không bị ẩn) */
  treToast?: boolean
}

export interface ApiGhiApDung {
  /** Đánh dấu Không áp dụng kèm lý do (khoảng trắng hai đầu bị bỏ; 1–500 ký tự). */
  khongApDung: (id: string, lyDo: string, tuyChon?: { treToast?: boolean }) => void
  /** Bỏ đánh dấu Không áp dụng. */
  boDanhDau: (id: string) => void
  /** Mục đang có lần ghi chưa xong. */
  dangLuu: (id: string) => boolean
}

function tenMuc(id: string) {
  const muc = layCay().mucTheoId.get(id)
  return muc ? createElement(TenMuc, null, muc.label) : id
}

/**
 * Giá trị server đã xác nhận của các mục đang có lần ghi chưa xong, theo từng QueryClient (như trang-thai.tsx).
 * Lưu lỗi thì trả mục về giá trị này, không phải giá trị trước lần ghi đó (có thể là giá trị lạc quan của lần
 * ghi trước, chưa từng lưu). Có khoá từ lần ghi đầu tới khi lần ghi cuối của mục xong.
 */
const daXacNhan = new WeakMap<QueryClient, Map<string, MucApDung | null>>()

function bangXacNhan(client: QueryClient): Map<string, MucApDung | null> {
  let bang = daXacNhan.get(client)
  if (!bang) {
    bang = new Map()
    daXacNhan.set(client, bang)
  }
  return bang
}

/** Số lần ghi Áp dụng của mục chưa xong (lần đang gọi callback vẫn tính là chưa xong). */
function soLanDangGhi(client: QueryClient, id: string): number {
  return client.getMutationCache().findAll({
    mutationKey: KHOA_GHI_AP_DUNG,
    status: 'pending',
    predicate: (m) => (m.state.variables as BienGhi | undefined)?.id === id,
  }).length
}

export function useGhiApDung(): ApiGhiApDung {
  const client = useQueryClient()
  const { toast } = useToast()

  const mutation = useMutation<KetQuaGhiApDung, Error, BienGhi>({
    mutationKey: KHOA_GHI_AP_DUNG,
    scope: PHAM_VI_GHI,
    mutationFn: ({ id, lyDo }) => (lyDo === null ? guiBoDanhDau(id) : guiKhongApDung(id, lyDo)),
    // Đồng bộ: cache đổi ngay lúc bấm (cả lần ghi còn xếp hàng sau lần khác); huỷ lượt tải đang chạy để nó không
    // ghi đè giá trị lạc quan. Lần ghi đầu của mục giữ lại giá trị đang có — giá trị server đã xác nhận.
    onMutate: ({ id, lyDo }) => {
      void client.cancelQueries({ queryKey: KHOA_AP_DUNG })
      const xacNhan = bangXacNhan(client)
      if (!xacNhan.has(id)) {
        xacNhan.set(id, client.getQueryData<AnhChupApDung>(KHOA_AP_DUNG)?.apDung[id] ?? null)
      }
      const moi: MucApDung | null = lyDo === null ? null : { trangThai: 'khong-ap-dung', lyDo }
      client.setQueryData<AnhChupApDung>(KHOA_AP_DUNG, (cu) => cu && ganMuc(cu, id, moi))
    },
    onError: (_loi, bien) => {
      // Còn lần ghi sau của cùng mục đang chờ: giá trị lạc quan của lần sau giữ nguyên và kết quả của lần sau
      // quyết định (Thử lại lần này sẽ ghi đè lần sau), nên không trả về, không toast.
      if (soLanDangGhi(client, bien.id) > 1) return
      // Giữ trạng thái cũ: trả mục về giá trị server đã xác nhận gần nhất. Không còn lần ghi nào khác đang chờ
      // thì tải lại cho chắc.
      const xacNhan = bangXacNhan(client)
      if (xacNhan.has(bien.id)) {
        const muc = xacNhan.get(bien.id) ?? null
        client.setQueryData<AnhChupApDung>(KHOA_AP_DUNG, (cu) => cu && ganMuc(cu, bien.id, muc))
      }
      if (client.isMutating({ mutationKey: KHOA_GHI }) <= 1) {
        void client.invalidateQueries({ queryKey: KHOA_AP_DUNG })
      }
      toast({
        loai: 'loi',
        noiDung: LOI_LUU,
        hanhDong: { nhan: THU_LAI, chay: () => mutation.mutate({ ...bien, treToast: false }) },
      })
    },
    onSuccess: (kq, bien) => {
      bangXacNhan(client).set(kq.id, kq.muc)
      // Còn lần ghi sau của cùng mục: giữ giá trị lạc quan của lần sau trên màn hình, chỉ nhận revision.
      const conLanSau = soLanDangGhi(client, kq.id) > 1
      // Revision server trả về chỉ là của lần ghi này khi có đổi (không đổi → revision hiện tại của DB, có thể
      // là thay đổi của nơi khác mà dữ liệu đang giữ chưa có).
      const revision = (cu: number) => (kq.daDoi ? revisionSauGhi(cu, kq.revision) : cu)
      client.setQueryData<AnhChupApDung>(
        KHOA_AP_DUNG,
        (cu) =>
          cu && {
            ...(conLanSau ? cu : ganMuc(cu, kq.id, kq.muc)),
            revision: revision(cu.revision),
          },
      )
      // Ảnh chụp trạng thái học nhận revision mới để không phải tải lại vì lần ghi này.
      client.setQueryData<AnhChupHoc>(
        KHOA_TRANG_THAI,
        (cu) => cu && { ...cu, revision: revision(cu.revision) },
      )
      if (bien.lyDo !== null) xoaNhapTam(khoaNhapLyDo(kq.id))
      if (!kq.daDoi) return
      ghiNhanRevisionCuaTab(client, kq.revision)
      const lyDoCu = lyDoKhongApDung(kq.truoc)
      const hien = () =>
        toast({
          noiDung: createElement(
            Fragment,
            null,
            bien.lyDo === null ? DA_BO_DANH_DAU_KHONG_AP_DUNG : DA_DANH_DAU_KHONG_AP_DUNG,
            ' ',
            tenMuc(kq.id),
          ),
          // Hoàn tác của Hoàn tác thì không có (đổi lại bằng nút trong khối).
          hanhDong: bien.hoanTac
            ? undefined
            : {
                nhan: HOAN_TAC,
                chay: () => mutation.mutate({ id: kq.id, lyDo: lyDoCu ?? null, hoanTac: true }),
              },
        })
      if (bien.treToast) window.setTimeout(hien, TRE_TOAST)
      else hien()
    },
    // Lần ghi cuối của mục xong (thành công hay lỗi) → bỏ giá trị đã xác nhận đang giữ.
    onSettled: (_kq, _loi, bien) => {
      if (soLanDangGhi(client, bien.id) <= 1) bangXacNhan(client).delete(bien.id)
    },
  })
  const { mutate } = mutation

  const cacLan = useMutationState({
    filters: { mutationKey: KHOA_GHI_AP_DUNG, status: 'pending' },
    select: (m) => (m.state.variables as BienGhi | undefined)?.id,
  })

  return useMemo(
    () => ({
      khongApDung: (id, lyDo, tuyChon) => mutate({ id, lyDo: lyDo.trim(), ...tuyChon }),
      boDanhDau: (id) => mutate({ id, lyDo: null }),
      dangLuu: (id) => cacLan.includes(id),
    }),
    [cacLan, mutate],
  )
}
