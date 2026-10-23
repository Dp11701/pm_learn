// HỢP ĐỒNG (stub, agent "he-thong" viết thật): hỏi /api/meta mỗi 5 giây, đồng bộ đồng hồ, trạng thái kết nối.
import type { ReactNode } from 'react'

export type TrangThaiKetNoi = 'dang-ket-noi' | 'on-dinh' | 'mat-ket-noi'

export interface Meta {
  revision: number
  now: string
  homNay: string
  soMucHoc: number
}

export function KetNoiProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function useKetNoi(): { trangThai: TrangThaiKetNoi; meta: Meta | null } {
  return { trangThai: 'dang-ket-noi', meta: null }
}

/** Banner dính đầu trang khi mất kết nối (§5 đề xuất, F26). */
export function BannerMatKetNoi() {
  return null
}
