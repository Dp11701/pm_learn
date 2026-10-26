// Trạng thái nội dung của mọi mục (C8 ở pager, Mục liên quan…): GET /api/noi-dung/trang-thai → { [id]:
// TrangThaiNoiDung }, chỉ mục có file; không có khoá = Chưa có nội dung (§6.2: pager vẫn dừng ở mục chưa có nội
// dung và hiện chip "Chưa có nội dung" cho mục đó). Tải một lần, rồi tải lại khi:
// - revision của /api/meta đổi vì nơi khác (tab khác, Claude, server; tăng hay lùi). Revision do lần ghi của
//   chính tab tạo ra (trạng thái học, lượt mở, Áp dụng — không đổi trạng thái nội dung) thì bỏ qua; nơi ghi
//   file trong app (nhập, trình soạn, duyệt) tự invalidate KHOA_TRANG_THAI_NOI_DUNG;
// - cửa sổ được focus lại: file .md sửa ngoài app (trình soạn khác, Claude) chưa làm tăng revision tới khi có
//   lượt quét nhanh của phase 2b, nên đây là cách duy nhất để chip bắt kịp file trên đĩa.
// Ngoài QueryClientProvider (test component lẻ, gallery) thì không gọi API và không có chip.
import { useContext, useEffect, useMemo } from 'react'
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

export function useTrangThaiNoiDung(): TraNoiDung {
  const ctx = useContext(QueryClientContext)
  const client = ctx ?? layClientRong()
  const { data } = useQuery(
    {
      queryKey: KHOA_TRANG_THAI_NOI_DUNG,
      queryFn: () => taiTrangThaiNoiDung(),
      enabled: ctx !== undefined,
      // Độ mới do revision và focus quyết (effect dưới), không tải lại khi gắn thêm nơi dùng.
      staleTime: Number.POSITIVE_INFINITY,
    },
    client,
  )
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
