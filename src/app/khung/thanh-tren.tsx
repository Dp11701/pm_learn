// Nội dung giữa top bar mobile (D6): tiêu đề trang, hoặc link "‹ cấp cha". Trang gọi
// useThanhTrenMobile({ tieuDe }) hoặc useThanhTrenMobile({ capCha }); không gọi thì khung tự lấy tên
// mục menu đang mở.
import { createContext, useContext, useEffect, type ReactNode } from 'react'

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
}

type DatCauHinh = (cauHinh: CauHinhThanhTren | null) => void

const NguCanhThanhTren = createContext<DatCauHinh | null>(null)

export function ThanhTrenProvider({ dat, children }: { dat: DatCauHinh; children: ReactNode }) {
  return <NguCanhThanhTren.Provider value={dat}>{children}</NguCanhThanhTren.Provider>
}

/** Trang đặt nội dung top bar mobile; rời trang thì trả về mặc định. Ngoài khung app thì không làm gì. */
export function useThanhTrenMobile({ tieuDe, tieuDeTiengAnh, capCha }: CauHinhThanhTren) {
  const dat = useContext(NguCanhThanhTren)
  const tenCha = capCha?.ten
  const denCha = capCha?.den
  const chaTiengAnh = capCha?.tiengAnh
  useEffect(() => {
    if (!dat) return
    dat({
      tieuDe,
      tieuDeTiengAnh,
      capCha:
        tenCha !== undefined && denCha !== undefined
          ? { ten: tenCha, den: denCha, tiengAnh: chaTiengAnh }
          : undefined,
    })
    return () => dat(null)
  }, [dat, tieuDe, tieuDeTiengAnh, tenCha, denCha, chaTiengAnh])
}
