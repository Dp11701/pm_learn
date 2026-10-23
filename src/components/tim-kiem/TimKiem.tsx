// HỢP ĐỒNG (stub, agent "phim-tat" viết thật): popover tìm kiếm C28 (phase 1: chỉ Mục học).
import type { ReactNode } from 'react'

export function TimKiemProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function useTimKiem(): { mo: () => void } {
  return { mo: () => {} }
}
