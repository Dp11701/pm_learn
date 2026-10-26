// Sau khi thay file cây (đề xuất 1.3): web đọc slug cũ để link cũ và `lien_quan` cũ vẫn tra được, và tắt banner
// một lần "Cây roadmap vừa cập nhật…" (meta.noiDung.thayCay).
// - GET  /api/noi-dung/slug-cu         { [slug cũ]: id nút } — khoá query bắt đầu bằng 'noi-dung' nên tải lại
//   khi revision nội dung của /api/meta đổi (useTheoDoiNoiDung ở KhungApp) hoặc sau một lần ghi file trong app.
// - POST /api/noi-dung/thay-cay/da-xem  → { revision } (revision nội dung).
import { useContext, useMemo } from 'react'
import { QueryClientContext, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import type { TraSlugCu } from '../../../shared/noi-dung'
import { goiApi } from './api'
import { layClientRong } from './trang-thai'

export const DUONG_DAN_SLUG_CU = '/api/noi-dung/slug-cu'
export const DUONG_DAN_DA_XEM_THAY_CAY = '/api/noi-dung/thay-cay/da-xem'

/** Khoá query slug cũ (dưới tiền tố 'noi-dung' của dữ liệu nội dung). */
export const KHOA_SLUG_CU = ['noi-dung', 'slug-cu'] as const

const LuocDoSlugCu = z.record(z.string(), z.string())

/** GET /api/noi-dung/slug-cu */
export function taiSlugCu(): Promise<Record<string, string>> {
  return goiApi(DUONG_DAN_SLUG_CU, LuocDoSlugCu)
}

/** POST /api/noi-dung/thay-cay/da-xem — tắt banner thay cây (một lần). */
export function guiDaXemThayCay(): Promise<{ revision: number }> {
  return goiApi(DUONG_DAN_DA_XEM_THAY_CAY, z.object({ revision: z.number() }), { method: 'POST' })
}

export interface DuLieuSlugCu {
  /** Tra slug cũ → id nút; undefined khi chưa có bảng (đang tải, lỗi, ngoài máy chủ, chưa cần) */
  tra: TraSlugCu | undefined
  /** Đã biết kết quả: có bảng, tải lỗi, hoặc không có máy chủ để hỏi */
  xong: boolean
}

/**
 * Bảng slug cũ, tải một lần (rồi theo revision nội dung). `can` = false thì không tải (vd. bài không có giá trị
 * `lien_quan` nào tra trượt theo cây hiện tại). Ngoài QueryClientProvider: không gọi API, xong ngay.
 */
export function useSlugCu(can = true): DuLieuSlugCu {
  const ctx = useContext(QueryClientContext)
  const q = useQuery(
    {
      queryKey: KHOA_SLUG_CU,
      queryFn: taiSlugCu,
      enabled: ctx !== undefined && can,
      staleTime: Number.POSITIVE_INFINITY,
      // Lỗi thì coi như không có slug cũ (404 thường, lien_quan bỏ qua) — không chờ thử lại.
      retry: false,
    },
    ctx ?? layClientRong(),
  )
  const bang = q.data
  const tra = useMemo<TraSlugCu | undefined>(
    () => (bang ? (slug) => (Object.hasOwn(bang, slug) ? bang[slug] : undefined) : undefined),
    [bang],
  )
  return { tra, xong: ctx === undefined || bang !== undefined || q.isError }
}
