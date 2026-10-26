// Trạng thái nội dung của mọi mục (C8 ở pager, Mục liên quan…): GET /api/noi-dung/trang-thai → { [id]:
// TrangThaiNoiDung }, chỉ mục có file; không có khoá = Chưa có nội dung. Tải một lần rồi tải lại khi revision
// của /api/meta đổi (§6.2: pager vẫn dừng ở mục chưa có nội dung và hiện chip "Chưa có nội dung" cho mục đó).
// Ngoài QueryClientProvider (test component lẻ, gallery) thì không gọi API và không có chip.
import { useContext, useEffect, useMemo } from 'react'
import { QueryClient, QueryClientContext, useQuery } from '@tanstack/react-query'
import type { TrangThaiNoiDung } from '../../../shared/domain/trang-thai'
import { useKetNoi } from '../ket-noi'
import { taiTrangThaiNoiDung } from './api'
import { layClientRong } from './trang-thai'

/** Khoá query trạng thái nội dung; nơi ghi file (nhập, trình soạn, duyệt) invalidate khoá này. */
export const KHOA_TRANG_THAI_NOI_DUNG = ['noi-dung', 'trang-thai'] as const

/** Trạng thái nội dung của một mục; undefined khi chưa biết (đang tải, lỗi, ngoài máy chủ) → không vẽ chip. */
export type TraNoiDung = (id: string) => TrangThaiNoiDung | undefined

const CHUA_CO: TrangThaiNoiDung = { loai: 'chua-co' }

/** Revision /api/meta ứng với bảng đang giữ, theo từng QueryClient (mọi nơi dùng hook chung một bảng). */
const revisionDangGiu = new WeakMap<QueryClient, number>()

export function useTrangThaiNoiDung(): TraNoiDung {
  const ctx = useContext(QueryClientContext)
  const { data } = useQuery(
    {
      queryKey: KHOA_TRANG_THAI_NOI_DUNG,
      queryFn: () => taiTrangThaiNoiDung(),
      enabled: ctx !== undefined,
      // Độ mới do revision quyết (effect dưới), không tải lại khi gắn thêm nơi dùng.
      staleTime: Number.POSITIVE_INFINITY,
    },
    ctx ?? layClientRong(),
  )
  const revisionMeta = useKetNoi().meta?.revision

  // Lần đầu có cả bảng lẫn meta: nhận revision đang có. Sau đó revision đổi (tăng hay lùi) → tải lại một lần.
  useEffect(() => {
    if (!ctx || revisionMeta === undefined || data === undefined) return
    const dangGiu = revisionDangGiu.get(ctx)
    revisionDangGiu.set(ctx, revisionMeta)
    if (dangGiu === undefined || dangGiu === revisionMeta) return
    void ctx.invalidateQueries({ queryKey: KHOA_TRANG_THAI_NOI_DUNG }, { cancelRefetch: false })
  }, [ctx, revisionMeta, data])

  return useMemo(() => (id: string) => (data ? (data[id] ?? CHUA_CO) : undefined), [data])
}
