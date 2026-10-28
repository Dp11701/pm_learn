// Dữ liệu Ôn tập trên web (bước 3; đề xuất 3.3, 3.5): GET /api/on-tap (thẻ đến hạn, số hộp, tỉ lệ nhớ — server
// quyết hôm nay) + POST /api/on-tap/:theId (một câu trả lời của phiên ôn). TanStack Query, cùng cách làm với
// trang-thai.tsx:
// - useOnTap(): tải một lần, rồi tải lại khi revision của /api/meta mới hơn revision đang giữ (thẻ tạo / sửa / xoá
//   ở trang bài, tab khác, Claude) hoặc khi /api/meta sang ngày mới (thẻ tới hạn). Đang có lần ghi dữ liệu học thì
//   chờ ghi xong. Ngoài QueryClientProvider (gallery, test khung): không gọi API, chưa có dữ liệu.
// - useSoTheDenHan(): số thẻ đến hạn (badge Ôn tập, Tổng quan); undefined khi chưa có dữ liệu.
// - useOnThe(): gửi một câu trả lời, trả Promise kết quả (lỗi → LoiGoiApi mang câu của server). Lần ôn thật xong:
//   bỏ thẻ khỏi danh sách đến hạn, chuyển hộp, cộng tỉ lệ nhớ ngay trong cache (badge giảm theo từng câu), ghi nhận
//   revision là của chính tab (trạng thái nội dung không tải lại); ảnh chụp trạng thái học ("Cần ôn lại") và dữ
//   liệu học của mục (hộp, hạn ở card Flashcard) được tải lại. Vòng luyện thêm không đổi gì.
import { useCallback, useContext, useEffect, useMemo } from 'react'
import {
  QueryClientContext,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { z } from 'zod'
import type {
  AnhChupOnTap,
  KetQuaOnThe,
  SoTheTheoHop,
  TheOn,
  YeuCauOnThe,
} from '../../../server/du-lieu/hop-dong-the'
import { useKetNoi } from '../ket-noi'
import { goiApi } from './api'
import { khoaHoc } from './hoc'
import { canTaiLaiTheoMeta, ghiNhanRevisionCuaTab, revisionSauGhi } from './revision'
import { KHOA_GHI, KHOA_TRANG_THAI, layClientRong } from './trang-thai'

export type { AnhChupOnTap, KetQuaOnThe, TheOn, YeuCauOnThe }

/** Khoá query ảnh chụp Ôn tập. */
export const KHOA_ON_TAP = ['du-lieu-hoc', 'on-tap'] as const
/** Khoá lần ghi (dưới KHOA_GHI: đang ghi thì các ảnh chụp dữ liệu học không tải lại theo revision). */
const KHOA_GHI_ON = [...KHOA_GHI, 'on-tap'] as const

export const DUONG_DAN_ON_TAP = '/api/on-tap'

// ---------- Hợp đồng ----------

const LuocDoTheOn: z.ZodType<TheOn> = z.object({
  id: z.number(),
  itemId: z.string(),
  truoc: z.string(),
  sau: z.string(),
  hop: z.number().int().min(1).max(5),
  hanOn: z.string(),
  taoLuc: z.string(),
})

const LuocDoHop: z.ZodType<SoTheTheoHop> = z.object({
  1: z.number(),
  2: z.number(),
  3: z.number(),
  4: z.number(),
  5: z.number(),
})

export const LuocDoOnTap: z.ZodType<AnhChupOnTap> = z.object({
  revision: z.number(),
  homNay: z.string(),
  denHan: z.array(LuocDoTheOn),
  hop: LuocDoHop,
  tongThe: z.number(),
  tiLeNho30: z.number().nullable(),
  lanOn30: z.object({ nho: z.number(), tong: z.number() }),
  hanKeTiep: z.string().nullable(),
})

export const LuocDoKetQuaOn: z.ZodType<KetQuaOnThe> = z.object({
  revision: z.number(),
  daDoi: z.boolean(),
  luyenThem: z.boolean(),
  ket: z.enum(['nho', 'quen']),
  the: LuocDoTheOn,
  truoc: LuocDoTheOn,
})

/** GET /api/on-tap */
export function taiOnTap(): Promise<AnhChupOnTap> {
  return goiApi(DUONG_DAN_ON_TAP, LuocDoOnTap)
}

/** POST /api/on-tap/:theId */
export function guiOnThe(theId: number, yeuCau: YeuCauOnThe): Promise<KetQuaOnThe> {
  return goiApi(`${DUONG_DAN_ON_TAP}/${theId}`, LuocDoKetQuaOn, { method: 'POST', body: yeuCau })
}

/** Ảnh chụp sau một lần ôn thật (thẻ không còn đến hạn: hạn mới luôn sau hôm nay). */
export function apKetQuaOn(cu: AnhChupOnTap, kq: KetQuaOnThe): AnhChupOnTap {
  if (!kq.daDoi) return cu
  const hop: SoTheTheoHop = { ...cu.hop }
  const tu = kq.truoc.hop as keyof SoTheTheoHop
  const den = kq.the.hop as keyof SoTheTheoHop
  hop[tu] = Math.max(0, hop[tu] - 1)
  hop[den] += 1
  const lanOn30 = {
    nho: cu.lanOn30.nho + (kq.ket === 'nho' ? 1 : 0),
    tong: cu.lanOn30.tong + 1,
  }
  const hanKeTiep =
    cu.hanKeTiep === null || kq.the.hanOn < cu.hanKeTiep ? kq.the.hanOn : cu.hanKeTiep
  return {
    ...cu,
    revision: revisionSauGhi(cu.revision, kq.revision),
    denHan: cu.denHan.filter((t) => t.id !== kq.the.id),
    hop,
    lanOn30,
    tiLeNho30: lanOn30.nho / lanOn30.tong,
    hanKeTiep,
  }
}

// ---------- Đọc ----------

export interface DuLieuOnTap {
  /** undefined khi chưa tải xong (hoặc lỗi lần đầu, hoặc ngoài QueryClientProvider) */
  duLieu: AnhChupOnTap | undefined
  dangTai: boolean
  /** Tải lỗi và chưa có dữ liệu nào */
  loi: boolean
  taiLai: () => void
}

export function useOnTap({ taiKhiMo = false }: { taiKhiMo?: boolean } = {}): DuLieuOnTap {
  const ctx = useContext(QueryClientContext)
  const client = ctx ?? layClientRong()
  const q = useQuery(
    {
      queryKey: KHOA_ON_TAP,
      queryFn: () => taiOnTap(),
      enabled: ctx !== undefined,
      // Độ mới do revision và ngày của /api/meta quyết (effect dưới); trang Ôn tập tải lại khi mở.
      staleTime: Number.POSITIVE_INFINITY,
      refetchOnMount: taiKhiMo ? 'always' : true,
    },
    client,
  )
  const duLieu = q.data
  const meta = useKetNoi().meta
  const revisionMeta = meta?.revision
  const homNayMeta = meta?.homNay
  const soDangGhi = useIsMutating({ mutationKey: KHOA_GHI }, client)

  useEffect(() => {
    if (!ctx || duLieu === undefined || soDangGhi > 0) return
    // Gọi canTaiLaiTheoMeta mỗi lần (nó ghi nhớ revision meta cao nhất đã thấy).
    const theoRevision =
      revisionMeta !== undefined && canTaiLaiTheoMeta(ctx, 'on-tap', revisionMeta, duLieu.revision)
    // Chỉ khi meta đã sang ngày sau ngày của dữ liệu (dữ liệu mới hơn meta thì chờ meta, không tải vòng).
    const sangNgayMoi = homNayMeta !== undefined && homNayMeta > duLieu.homNay
    if (theoRevision || sangNgayMoi) {
      void ctx.invalidateQueries({ queryKey: KHOA_ON_TAP }, { cancelRefetch: false })
    }
  }, [ctx, duLieu, revisionMeta, homNayMeta, soDangGhi])

  const { refetch } = q
  const taiLai = useCallback(() => void refetch(), [refetch])
  return useMemo(
    () => ({
      duLieu,
      dangTai: ctx !== undefined && duLieu === undefined && !q.isError,
      loi: duLieu === undefined && q.isError,
      taiLai,
    }),
    [duLieu, ctx, q.isError, taiLai],
  )
}

/** Số thẻ đến hạn hôm nay (server tính hôm nay); undefined khi đang tải. Tổng quan và badge sidebar dùng. */
export function useSoTheDenHan(): number | undefined {
  return useOnTap().duLieu?.denHan.length
}

/** Tải mới ảnh chụp (đầu phiên ôn: chụp danh sách thẻ đến hạn mới nhất). */
export function taiOnTapMoi(client: QueryClient): Promise<AnhChupOnTap> {
  return client.fetchQuery({ queryKey: KHOA_ON_TAP, queryFn: () => taiOnTap(), staleTime: 0 })
}

// ---------- Ghi ----------

export interface BienOnThe extends YeuCauOnThe {
  theId: number
}

/** Gửi một câu trả lời của phiên ôn; Promise lỗi mang LoiGoiApi (câu của server). */
export function useOnThe(): (bien: BienOnThe) => Promise<KetQuaOnThe> {
  const client = useQueryClient()
  const { mutateAsync } = useMutation<KetQuaOnThe, Error, BienOnThe>({
    mutationKey: KHOA_GHI_ON,
    mutationFn: ({ theId, ...yeuCau }) => guiOnThe(theId, yeuCau),
    // Gắn ở useMutation (không ở từng lần gọi): vẫn chạy khi trang phiên ôn đã rời đi giữa chừng.
    onSuccess: (kq) => {
      if (!kq.daDoi) return
      ghiNhanRevisionCuaTab(client, kq.revision)
      client.setQueryData<AnhChupOnTap>(KHOA_ON_TAP, (cu) => cu && apKetQuaOn(cu, kq))
      // Hộp, hạn ở card Flashcard của bài; "Cần ôn lại" của ảnh chụp trạng thái (server tính).
      void client.invalidateQueries({ queryKey: khoaHoc(kq.the.itemId) })
      if (client.isMutating({ mutationKey: KHOA_GHI }) <= 1) {
        void client.invalidateQueries({ queryKey: KHOA_TRANG_THAI })
      }
    },
    onError: () => {
      // 409 (đã ôn ở tab khác) hay lỗi khác: danh sách có thể đã cũ → tải lại.
      void client.invalidateQueries({ queryKey: KHOA_ON_TAP })
    },
  })
  return mutateAsync
}
