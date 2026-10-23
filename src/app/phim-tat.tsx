// HỢP ĐỒNG (stub, agent "phim-tat" viết thật): sổ phím tắt + bộ xử lý toàn cục + bảng F27.
import type { ReactNode } from 'react'

export function PhimTatProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/** Trả về hàm mở bảng phím tắt (F27). */
export function useMoBangPhimTat(): () => void {
  return () => {}
}
