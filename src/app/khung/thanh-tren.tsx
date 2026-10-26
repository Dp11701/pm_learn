// Cấu hình khung theo trang: nội dung giữa top bar mobile (D6) — tiêu đề trang hoặc link "‹ cấp cha" — và
// trang không thuộc mục menu nào (404). Trang gọi useThanhTrenMobile({ … }); không gọi thì khung tự lấy tên
// mục menu đang mở và tô mục menu theo đường dẫn.
import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { menuDangMo, type MenuDangMo } from './menu'

export interface CapCha {
  /** Tên cấp cha; dài thì cắt 1 dòng + "…", tên đủ ở title và tên truy cập (câu hỏi 2 của designer). */
  ten: string
  den: string
  /** Tên mục / lĩnh vực / phần của roadmap → lang="en". */
  tiengAnh?: boolean
}

export interface CauHinhThanhTren {
  tieuDe?: string
  /** Tiêu đề là tên mục tiếng Anh → lang="en". */
  tieuDeTiengAnh?: boolean
  capCha?: CapCha
  /** Trang không thuộc mục menu nào (404): sidebar, rail, drawer không tô mục nào. */
  ngoaiMenu?: boolean
}

type DatCauHinh = (cauHinh: CauHinhThanhTren | null) => void

const NguCanhDat = createContext<DatCauHinh | null>(null)
const NguCanhCauHinh = createContext<CauHinhThanhTren | null>(null)

export function ThanhTrenProvider({
  cauHinh,
  dat,
  children,
}: {
  cauHinh: CauHinhThanhTren | null
  dat: DatCauHinh
  children: ReactNode
}) {
  return (
    <NguCanhDat.Provider value={dat}>
      <NguCanhCauHinh.Provider value={cauHinh}>{children}</NguCanhCauHinh.Provider>
    </NguCanhDat.Provider>
  )
}

/**
 * Trang đặt cấu hình khung; rời trang thì trả về mặc định. Ngoài khung app thì không làm gì. Layout effect:
 * khung cập nhật trước khi vẽ, không nháy tiêu đề / mục menu cũ.
 */
export function useThanhTrenMobile({
  tieuDe,
  tieuDeTiengAnh,
  capCha,
  ngoaiMenu,
}: CauHinhThanhTren) {
  const dat = useContext(NguCanhDat)
  const tenCha = capCha?.ten
  const denCha = capCha?.den
  const chaTiengAnh = capCha?.tiengAnh
  useLayoutEffect(() => {
    if (!dat) return
    dat({
      tieuDe,
      tieuDeTiengAnh,
      capCha:
        tenCha !== undefined && denCha !== undefined
          ? { ten: tenCha, den: denCha, tiengAnh: chaTiengAnh }
          : undefined,
      ngoaiMenu,
    })
    return () => dat(null)
  }, [dat, tieuDe, tieuDeTiengAnh, tenCha, denCha, chaTiengAnh, ngoaiMenu])
}

/** Mục menu đang mở của khung: theo đường dẫn, trừ trang tự báo ngoài menu (404). */
export function useMenuDangMo(): MenuDangMo | null {
  const { pathname } = useLocation()
  const cauHinh = useContext(NguCanhCauHinh)
  return cauHinh?.ngoaiMenu ? null : menuDangMo(pathname)
}
