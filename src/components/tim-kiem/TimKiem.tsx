// Tìm kiếm C28: TimKiemProvider giữ trạng thái mở của popover và gắn phím "/" (sổ phím src/app/phim-tat);
// useTimKiem().mo() mở từ ô tìm sidebar, nút tìm top bar mobile, ô tìm trang 404.
// Provider phải nằm trong router (Enter mở /hoc/:slug bằng useNavigate).
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { usePhimTat } from '../../app/phim-tat'
import HopTimKiem, { type DuLieuTimKiem } from './HopTimKiem'

export type { DuLieuTimKiem, ThongTinMucTim } from './HopTimKiem'

const NguCanhTimKiem = createContext<{ mo: () => void }>({ mo: () => {} })

export function TimKiemProvider({ children, ...duLieu }: DuLieuTimKiem & { children: ReactNode }) {
  const [mo, datMo] = useState(false)
  const moTim = useCallback(() => datMo(true), [])
  usePhimTat('Slash', moTim)
  const api = useMemo(() => ({ mo: moTim }), [moTim])
  return (
    <NguCanhTimKiem.Provider value={api}>
      {children}
      <HopTimKiem mo={mo} doiMo={datMo} {...duLieu} />
    </NguCanhTimKiem.Provider>
  )
}

export function useTimKiem(): { mo: () => void } {
  return useContext(NguCanhTimKiem)
}
