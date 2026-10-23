// Bề rộng khung app (§5.2, đề xuất 4.4): ≥ 1280 sidebar 264px; 1024–1279 rail 72px;
// < 1024 top bar mobile + drawer 312px. Chỉ dựng một kiểu điều hướng để không trùng landmark, link.
import { useSyncExternalStore } from 'react'

export type BeRongKhung = 'day-du' | 'rail' | 'hep'

export const MQ_DAY_DU = '(min-width: 1280px)'
export const MQ_RAIL = '(min-width: 1024px)'

function coMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

export function docBeRong(): BeRongKhung {
  // Không có matchMedia (môi trường lạ): coi như desktop đầy đủ.
  if (!coMatchMedia()) return 'day-du'
  if (window.matchMedia(MQ_DAY_DU).matches) return 'day-du'
  if (window.matchMedia(MQ_RAIL).matches) return 'rail'
  return 'hep'
}

function dangKy(f: () => void): () => void {
  if (!coMatchMedia()) return () => {}
  const ds = [MQ_DAY_DU, MQ_RAIL].map((q) => window.matchMedia(q))
  ds.forEach((mq) => mq.addEventListener('change', f))
  return () => ds.forEach((mq) => mq.removeEventListener('change', f))
}

export function useBeRong(): BeRongKhung {
  return useSyncExternalStore(dangKy, docBeRong, () => 'day-du')
}
