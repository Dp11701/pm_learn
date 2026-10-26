// Lớp dữ liệu bước Áp dụng trên web (đề xuất 3.2; §1 "Hoặc chọn Không áp dụng và ghi lý do"): TanStack Query,
// cùng cách làm với trang-thai.tsx. Hợp đồng ở server/du-lieu/ap-dung.ts.
// - useApDung(): GET /api/ap-dung; tải lại khi revision của /api/meta khác revision đang giữ. Ngoài
//   QueryClientProvider thì coi như chưa có dữ liệu (không gọi API, mọi bước Áp dụng chưa làm).
// - useGhiApDung(): Không áp dụng kèm lý do (PUT) / bỏ đánh dấu (DELETE), có hiệu lực ngay (cập nhật lạc
//   quan); lưu lỗi thì trả về giá trị cũ + toast lỗi "Thử lại"; lưu xong thì toast + "Hoàn tác" 5 giây (Hoàn tác
//   gửi lại giá trị cũ: lý do cũ → PUT, chưa đánh dấu → DELETE). Các lần ghi chạy nối tiếp theo thứ tự bấm.
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
import { layCay } from '../../../shared/roadmap'
import {
  CAC_TRANG_THAI_AP_DUNG,
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
import { goiApi, LoiGoiApi } from './api'
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

/** DELETE /api/ap-dung/:id (goiApi chưa nhận DELETE; xử lý lỗi như goiApi). */
async function guiBoDanhDau(id: string): Promise<KetQuaGhiApDung> {
  const duongDan = duongDanMuc(id)
  const phanHoi = await fetch(duongDan, {
    method: 'DELETE',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  const json: unknown = await phanHoi.json().catch(() => null)
  if (!phanHoi.ok) {
    const loi =
      typeof json === 'object' && json !== null && 'loi' in json && typeof json.loi === 'string'
        ? json.loi
        : `DELETE ${duongDan}: ${phanHoi.status}`
    throw new LoiGoiApi(phanHoi.status, loi)
  }
  return LuocDoKetQua.parse(json)
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

/** Nhận revision của lần ghi chỉ khi đó là thay đổi duy nhất kể từ dữ liệu đang giữ (như trang-thai.tsx). */
function revisionSauGhi(cu: number, moi: number): number {
  return moi === cu + 1 ? moi : cu
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

export function useApDung(): DuLieuApDung {
  const ctx = useContext(QueryClientContext)
  const client = ctx ?? layClientRong()
  const q = useQuery(
    {
      queryKey: KHOA_AP_DUNG,
      queryFn: () => taiApDung(),
      enabled: ctx !== undefined,
      // Độ mới do revision quyết (effect dưới), như ảnh chụp trạng thái học.
      staleTime: Number.POSITIVE_INFINITY,
    },
    client,
  )
  const anhChup = q.data
  const revisionMeta = useKetNoi().meta?.revision
  const soDangGhi = useIsMutating({ mutationKey: KHOA_GHI }, client)

  useEffect(() => {
    if (!ctx || revisionMeta === undefined || anhChup === undefined || soDangGhi > 0) return
    if (revisionMeta === anhChup.revision) return
    void ctx.invalidateQueries({ queryKey: KHOA_AP_DUNG }, { cancelRefetch: false })
  }, [ctx, revisionMeta, anhChup, soDangGhi])

  const { refetch } = q
  const taiLai = useCallback(() => void refetch(), [refetch])
  return useMemo(
    () => ({
      anhChup,
      dangTai: ctx !== undefined && anhChup === undefined && !q.isError,
      loi: anhChup === undefined && q.isError,
      taiLai,
      cua: (id: string) => anhChup?.apDung[id],
      buocCua: (id: string) => buocApDung(anhChup?.apDung[id]),
    }),
    [anhChup, ctx, q.isError, taiLai],
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

interface NguCanhGhi {
  truoc: MucApDung | null
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

export function useGhiApDung(): ApiGhiApDung {
  const client = useQueryClient()
  const { toast } = useToast()

  const mutation = useMutation<KetQuaGhiApDung, Error, BienGhi, NguCanhGhi>({
    mutationKey: KHOA_GHI_AP_DUNG,
    scope: PHAM_VI_GHI,
    mutationFn: ({ id, lyDo }) => (lyDo === null ? guiBoDanhDau(id) : guiKhongApDung(id, lyDo)),
    // Đồng bộ: cache đổi ngay lúc bấm; huỷ lượt tải đang chạy để nó không ghi đè giá trị lạc quan.
    onMutate: ({ id, lyDo }) => {
      void client.cancelQueries({ queryKey: KHOA_AP_DUNG })
      const truoc = client.getQueryData<AnhChupApDung>(KHOA_AP_DUNG)?.apDung[id] ?? null
      const moi: MucApDung | null = lyDo === null ? null : { trangThai: 'khong-ap-dung', lyDo }
      client.setQueryData<AnhChupApDung>(KHOA_AP_DUNG, (cu) => cu && ganMuc(cu, id, moi))
      return { truoc }
    },
    onError: (_loi, bien, nguCanh) => {
      if (nguCanh) {
        client.setQueryData<AnhChupApDung>(
          KHOA_AP_DUNG,
          (cu) => cu && ganMuc(cu, bien.id, nguCanh.truoc),
        )
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
      client.setQueryData<AnhChupApDung>(
        KHOA_AP_DUNG,
        (cu) =>
          cu && {
            ...ganMuc(cu, kq.id, kq.muc),
            revision: revisionSauGhi(cu.revision, kq.revision),
          },
      )
      // Ảnh chụp trạng thái học nhận revision mới để không phải tải lại vì lần ghi này.
      client.setQueryData<AnhChupHoc>(
        KHOA_TRANG_THAI,
        (cu) => cu && { ...cu, revision: revisionSauGhi(cu.revision, kq.revision) },
      )
      if (bien.lyDo !== null) xoaNhapTam(khoaNhapLyDo(kq.id))
      if (!kq.daDoi) return
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
