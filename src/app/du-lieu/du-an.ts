// Dự án thực hành (đề xuất 2.1 bảng projects; §1 "làm bài thực hành trên dự án thật"): GET /api/du-an, thêm dự án
// mới từ ô chọn dự án của thẻ Thực hành (C32 + C36 "thêm dự án", đề xuất 4.3). Danh sách không có revision: tải
// lại khi revision của /api/meta đổi vì nơi khác (như noi-dung.ts); lần ghi của chính tab (dữ liệu học, trạng
// thái, đồng hồ…) không làm tải lại. Ngoài QueryClientProvider: không gọi API, chưa có danh sách.
import { useCallback, useContext, useEffect, useMemo } from 'react'
import {
  MutationObserver,
  QueryClient,
  QueryClientContext,
  useIsMutating,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { z } from 'zod'
import { useKetNoi } from '../ket-noi'
import { goiApi } from './api'
import { cauLoi, nhanRevisionCuaTab } from './hoc'
import { chiDoTabGhi } from './revision'
import { KHOA_GHI, layClientRong } from './trang-thai'

export interface DuAn {
  id: number
  ten: string
  vaiTro: string | null
  giaiDoan: string | null
}

export interface BienThemDuAn {
  ten: string
  vaiTro?: string
  giaiDoan?: string
}

export type KetQuaThemDuAn = { ok: true; duAn: DuAn | null } | { ok: false; loi: string }

const chuoiHoacNull = z
  .string()
  .nullish()
  .transform((v) => v ?? null)

export const LuocDoDuAn: z.ZodType<DuAn> = z.object({
  id: z.number(),
  ten: z.string(),
  vaiTro: chuoiHoacNull,
  giaiDoan: chuoiHoacNull,
})

const LuocDoPhanHoi = z.looseObject({
  revision: z.number().optional(),
  daDoi: z.boolean().optional(),
})

export const KHOA_DU_AN = ['du-lieu-hoc', 'du-an'] as const
const KHOA_GHI_DU_AN = [...KHOA_GHI, 'du-an'] as const
export const DUONG_DAN_DU_AN = '/api/du-an'

/** GET /api/du-an */
export function taiDuAn(): Promise<DuAn[]> {
  return goiApi(DUONG_DAN_DU_AN, z.array(LuocDoDuAn))
}

/** Revision /api/meta ứng với danh sách đang giữ, theo từng QueryClient. */
const revisionDangGiu = new WeakMap<QueryClient, number>()

export interface DuLieuDuAn {
  /** undefined khi chưa tải xong */
  duAn: DuAn[] | undefined
  dangTai: boolean
  loi: boolean
  taiLai: () => void
}

export function useDuAn(): DuLieuDuAn {
  const ctx = useContext(QueryClientContext)
  const client = ctx ?? layClientRong()
  const q = useQuery(
    {
      queryKey: KHOA_DU_AN,
      queryFn: () => taiDuAn(),
      enabled: ctx !== undefined,
      staleTime: Number.POSITIVE_INFINITY,
    },
    client,
  )
  const duAn = q.data
  const revisionMeta = useKetNoi().meta?.revision
  const soDangGhi = useIsMutating({ mutationKey: KHOA_GHI }, client)

  useEffect(() => {
    if (!ctx || revisionMeta === undefined || duAn === undefined || soDangGhi > 0) return
    const dangGiu = revisionDangGiu.get(ctx)
    revisionDangGiu.set(ctx, revisionMeta)
    if (dangGiu === undefined || dangGiu === revisionMeta) return
    if (chiDoTabGhi(ctx, dangGiu, revisionMeta)) return
    void ctx.invalidateQueries({ queryKey: KHOA_DU_AN }, { cancelRefetch: false })
  }, [ctx, revisionMeta, duAn, soDangGhi])

  const { refetch } = q
  const taiLai = useCallback(() => void refetch(), [refetch])
  return useMemo(
    () => ({
      duAn,
      dangTai: ctx !== undefined && duAn === undefined && !q.isError,
      loi: duAn === undefined && q.isError,
      taiLai,
    }),
    [duAn, ctx, q.isError, taiLai],
  )
}

/** Thêm dự án (chờ server: cần id để chọn ngay cho bài thực hành). */
export function useThemDuAn(): (bien: BienThemDuAn) => Promise<KetQuaThemDuAn> {
  const client = useQueryClient()
  return useCallback(
    (bien) => {
      const body: BienThemDuAn = { ten: bien.ten.trim() }
      const vaiTro = bien.vaiTro?.trim()
      const giaiDoan = bien.giaiDoan?.trim()
      if (vaiTro) body.vaiTro = vaiTro
      if (giaiDoan) body.giaiDoan = giaiDoan
      let duAn: DuAn | null = null
      const nguoiQuan = new MutationObserver(client, {
        mutationKey: KHOA_GHI_DU_AN,
        mutationFn: () => goiApi(DUONG_DAN_DU_AN, LuocDoPhanHoi, { method: 'POST', body }),
        // Trước khi lần ghi được tính là xong: revision của tab, danh sách mới
        onSuccess: (kq) => {
          if (kq.daDoi !== false && kq.revision !== undefined) {
            nhanRevisionCuaTab(client, kq.revision)
          }
          const trong = LuocDoDuAn.safeParse(kq.duAn)
          const ca = trong.success ? trong : LuocDoDuAn.safeParse(kq)
          duAn = ca.success ? ca.data : null
          const moi = duAn
          if (moi) {
            client.setQueryData<DuAn[]>(KHOA_DU_AN, (cu) =>
              cu ? [...cu.filter((d) => d.id !== moi.id), moi] : cu,
            )
          } else {
            void client.invalidateQueries({ queryKey: KHOA_DU_AN })
          }
        },
      })
      return nguoiQuan.mutate(undefined).then(
        (): KetQuaThemDuAn => ({ ok: true, duAn }),
        (loi: unknown): KetQuaThemDuAn => ({ ok: false, loi: cauLoi(loi) }),
      )
    },
    [client],
  )
}
