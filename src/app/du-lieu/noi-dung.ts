// Trạng thái nội dung của mọi mục (C8 ở pager, Mục liên quan…): GET /api/noi-dung/trang-thai → { [id]:
// TrangThaiNoiDung }, chỉ mục có file; không có khoá = Chưa có nội dung (§6.2: pager vẫn dừng ở mục chưa có nội
// dung và hiện chip "Chưa có nội dung" cho mục đó). Tải một lần, rồi tải lại khi:
// - revision của /api/meta đổi vì nơi khác (tab khác, Claude, server; tăng hay lùi). Revision do lần ghi của
//   chính tab tạo ra (trạng thái học, lượt mở, Áp dụng — không đổi trạng thái nội dung) thì bỏ qua; nơi ghi
//   file trong app (nhập, trình soạn, duyệt) tự invalidate KHOA_TRANG_THAI_NOI_DUNG;
// - cửa sổ được focus lại: file .md sửa ngoài app (trình soạn khác, Claude) chưa làm tăng revision tới khi có
//   lượt quét nhanh của phase 2b, nên đây là cách duy nhất để chip bắt kịp file trên đĩa.
// Ngoài QueryClientProvider (test component lẻ, gallery) thì không gọi API và không có chip.
// useLoiTrangThaiNoiDung(): cùng query, cho nơi phải phân biệt "đang tải" với "tải lỗi" (tra trả undefined cả hai
// lúc) để hiện lỗi + "Thử lại" thay vì skeleton mãi (Tổng quan, Lộ trình lọc theo nội dung, tab Độ phủ).
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { QueryClient, QueryClientContext, useIsMutating, useQuery } from '@tanstack/react-query'
import type { TrangThaiNoiDung } from '../../../shared/domain/trang-thai'
import { useKetNoi } from '../ket-noi'
import { taiTrangThaiNoiDung } from './api'
import { chiDoTabGhi } from './revision'
import { KHOA_GHI, layClientRong } from './trang-thai'

/** Khoá query trạng thái nội dung; nơi ghi file (nhập, trình soạn, duyệt) invalidate khoá này. */
export const KHOA_TRANG_THAI_NOI_DUNG = ['noi-dung', 'trang-thai'] as const

/** Trạng thái nội dung của một mục; undefined khi chưa biết (đang tải, lỗi, ngoài máy chủ) → không vẽ chip. */
export type TraNoiDung = (id: string) => TrangThaiNoiDung | undefined

const CHUA_CO: TrangThaiNoiDung = { loai: 'chua-co' }

/** Revision /api/meta ứng với bảng đang giữ, theo từng QueryClient (mọi nơi dùng hook chung một bảng). */
const revisionDangGiu = new WeakMap<QueryClient, number>()

/** Tải lại bảng (nhiều nơi dùng cùng gọi chỉ thành một lượt tải: cancelRefetch false). */
function taiLai(client: QueryClient) {
  void client.invalidateQueries({ queryKey: KHOA_TRANG_THAI_NOI_DUNG }, { cancelRefetch: false })
}

/** Query bảng trạng thái nội dung (chung cho useTrangThaiNoiDung và useLoiTrangThaiNoiDung). */
function useQueryNoiDung() {
  const ctx = useContext(QueryClientContext)
  const client = ctx ?? layClientRong()
  const q = useQuery(
    {
      queryKey: KHOA_TRANG_THAI_NOI_DUNG,
      queryFn: () => taiTrangThaiNoiDung(),
      enabled: ctx !== undefined,
      // Độ mới do revision và focus quyết (effect của useTrangThaiNoiDung), không tải lại khi gắn thêm nơi dùng.
      staleTime: Number.POSITIVE_INFINITY,
    },
    client,
  )
  return { ctx, client, q }
}

export interface LoiTrangThaiNoiDung {
  /** Tải lỗi và chưa có bảng nào để dùng (có bảng cũ thì vẫn dùng bảng cũ, không báo lỗi). */
  loi: boolean
  /** Tải lại ngay (nút "Thử lại"). */
  taiLai: () => void
}

/** Lỗi tải bảng trạng thái nội dung + Thử lại; ngoài QueryClientProvider thì không bao giờ lỗi. */
export function useLoiTrangThaiNoiDung(): LoiTrangThaiNoiDung {
  const { q } = useQueryNoiDung()
  const loi = q.isError && q.data === undefined
  const { refetch } = q
  const thuLai = useCallback(() => void refetch(), [refetch])
  return useMemo(() => ({ loi, taiLai: thuLai }), [loi, thuLai])
}

export function useTrangThaiNoiDung(): TraNoiDung {
  const {
    ctx,
    client,
    q: { data },
  } = useQueryNoiDung()
  const revisionMeta = useKetNoi().meta?.revision
  const soDangGhi = useIsMutating({ mutationKey: KHOA_GHI }, client)

  // Lần đầu có cả bảng lẫn meta: nhận revision đang có. Sau đó revision đổi (tăng hay lùi) → tải lại một lần,
  // trừ khi mọi revision tăng thêm đều do lần ghi của chính tab. Chờ lần ghi đang chạy xong (lúc đó revision của
  // nó mới được ghi nhận) để meta tới trước phản hồi ghi không làm tải lại thừa.
  useEffect(() => {
    if (!ctx || revisionMeta === undefined || data === undefined || soDangGhi > 0) return
    const dangGiu = revisionDangGiu.get(ctx)
    revisionDangGiu.set(ctx, revisionMeta)
    if (dangGiu === undefined || dangGiu === revisionMeta) return
    if (chiDoTabGhi(ctx, dangGiu, revisionMeta)) return
    taiLai(ctx)
  }, [ctx, revisionMeta, data, soDangGhi])

  // Focus lại cửa sổ → tải lại (file sửa ngoài app chưa làm tăng revision trước phase 2b).
  useEffect(() => {
    if (!ctx) return
    const khiFocus = () => taiLai(ctx)
    window.addEventListener('focus', khiFocus)
    return () => window.removeEventListener('focus', khiFocus)
  }, [ctx])

  return useMemo(() => (id: string) => (data ? (data[id] ?? CHUA_CO) : undefined), [data])
}
