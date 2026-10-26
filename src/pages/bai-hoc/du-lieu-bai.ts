// Dữ liệu bài học của trang /hoc/:slug (đề xuất 1.10, 1.6, 3.6): GET /api/bai/:id theo hợp đồng
// server/noi-dung/hop-dong-bai.ts (PhanHoiBai) — bài đã đọc bằng phanTichBai + trạng thái nội dung + lỗi đọc
// file + cảnh báo bảo vệ bản Đã duyệt. Server chọn bản để hiện ("Hiện ở bài": luôn là bản đã duyệt; bị sửa
// ngoài app thì là bản chụp); web chỉ hiện.
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import type { KetQuaBai } from '../../../shared/noi-dung'
import type { CanhBaoDuyet, PhanHoiBai } from '../../../server/noi-dung/hop-dong-bai'
import { goiApi, LuocDoTrangThaiNoiDung } from '../../app/du-lieu/api'

export type { CanhBaoDuyet, PhanHoiBai }

/** Phần của phản hồi trang bài dùng (test và gallery dựng được mà không cần hashFile, banHien). */
export type DuLieuBai = Pick<PhanHoiBai, 'trangThaiNoiDung' | 'bai' | 'loiDoc' | 'canhBaoDuyet'>

/** Kiểm vừa đủ hình dạng KetQuaBai mà trang dùng (server dùng cùng shared/noi-dung). */
const LuocDoBai = z.custom<KetQuaBai>(
  (x) =>
    typeof x === 'object' &&
    x !== null &&
    Array.isArray((x as KetQuaBai).boCuc) &&
    Array.isArray((x as KetQuaBai).khoi) &&
    typeof (x as KetQuaBai).duKhoi === 'object',
  { message: 'bai không đúng dạng kết quả phanTichBai' },
)

export const LuocDoPhanHoiBai: z.ZodType<PhanHoiBai> = z.object({
  muc: z.string(),
  trangThaiNoiDung: LuocDoTrangThaiNoiDung,
  bai: LuocDoBai.nullable(),
  loiDoc: z.object({ dong: z.number(), thongBao: z.string() }).nullable(),
  canhBaoDuyet: z.enum(['chua-xac-nhan', 'doi-ngoai-app']).nullable(),
  banHien: z.enum(['file', 'ban-chup']).nullable(),
  hashFile: z.string().nullable(),
})

export const duongDanApiBai = (id: string) => `/api/bai/${encodeURIComponent(id)}`

/** GET /api/bai/:id */
export function taiBai(id: string): Promise<PhanHoiBai> {
  return goiApi(duongDanApiBai(id), LuocDoPhanHoiBai)
}

/** Khoá query bài học của một mục; nhập / trình soạn (phase 2b, 7b) invalidate khoá này sau khi ghi file. */
export const khoaBai = (id: string) => ['noi-dung', 'bai', id] as const

/** Trạng thái tải bài, tách khỏi TanStack để phần vẽ trang dùng được cả khi không có máy chủ. */
export type TaiBai =
  | { tinhTrang: 'dang-tai' }
  | { tinhTrang: 'loi'; thuLai: () => void }
  | { tinhTrang: 'xong'; duLieu: DuLieuBai }

/** Bài của một mục; mỗi lần vào trang tải lại (staleTime 0) để thấy file vừa sửa ngoài app. */
export function useBai(id: string): TaiBai {
  const q = useQuery({ queryKey: khoaBai(id), queryFn: () => taiBai(id), staleTime: 0 })
  if (q.data) return { tinhTrang: 'xong', duLieu: q.data }
  if (q.isError) return { tinhTrang: 'loi', thuLai: () => void q.refetch() }
  return { tinhTrang: 'dang-tai' }
}
