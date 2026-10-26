// Dữ liệu học mà khung app hiện (badge, khối Đang học, đồng hồ).
// - Không có <DuLieuKhungProvider> (app thật): lấy từ dữ liệu học thật (src/app/du-lieu) — từ phase 2a là
//   khối "Đang học" (mục Đang học mở gần nhất trước + tổng); badge, đồng hồ cắm ở phase 3, 7a, 8.
// - Có provider (gallery F02b, test khung): dùng đúng giá trị được đưa.
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { layCay } from '../../../shared/roadmap'
import { cacMucDangHoc } from '../du-lieu/hoc-tiep'
import { useTrangThai } from '../du-lieu/trang-thai'

/** Chỗ cắm đồng hồ của phase 3 (C23 rút gọn). Khung chỉ đặt chỗ, không có logic đồng hồ. */
export interface ODongHo {
  /** Thay khối "Chưa bấm giờ" ở chân sidebar (đang bấm giờ: tên mục, 00:00:00, Dừng / Bắt đầu). */
  sidebar?: ReactNode
  /** Nút đồng hồ ở chân rail 1024–1279 (có chấm khi đang chạy). */
  rail?: ReactNode
  /** Chip đồng hồ ở top bar mobile (F04). */
  chip?: ReactNode
}

export interface DuLieuKhung {
  /** Badge đặc ở "Ôn tập": số thẻ đến hạn (0 = không hiện). */
  soTheDenHan: number
  /** Badge viền ở "Nội dung": số bản nháp (0 = không hiện). */
  soBanNhap: number
  /** id nút roadmap của các mục Đang học, mở gần nhất trước; sidebar hiện 3 mục đầu, tên lấy từ cây. */
  dangHoc: readonly string[]
  /** Tổng số mục Đang học cho "Xem tất cả (n)"; không có thì = dangHoc.length. */
  tongDangHoc?: number
  dongHo?: ODongHo
}

export const DU_LIEU_KHUNG_TRONG: DuLieuKhung = { soTheDenHan: 0, soBanNhap: 0, dangHoc: [] }

const NguCanhDuLieuKhung = createContext<DuLieuKhung | null>(null)

export function DuLieuKhungProvider({
  giaTri,
  children,
}: {
  giaTri: DuLieuKhung
  children: ReactNode
}) {
  return <NguCanhDuLieuKhung.Provider value={giaTri}>{children}</NguCanhDuLieuKhung.Provider>
}

/** Dữ liệu khung lấy từ dữ liệu học thật; chưa tải xong (hoặc cây lỗi) thì như trạng thái trống. */
function useDuLieuKhungThat(): DuLieuKhung {
  const { anhChup } = useTrangThai()
  return useMemo(() => {
    if (!anhChup) return DU_LIEU_KHUNG_TRONG
    let dangHoc: string[]
    try {
      dangHoc = cacMucDangHoc(layCay(), anhChup).map((m) => m.id)
    } catch {
      // Cây lỗi: trang lỗi cây tự báo, khung coi như trống.
      return DU_LIEU_KHUNG_TRONG
    }
    return { ...DU_LIEU_KHUNG_TRONG, dangHoc, tongDangHoc: dangHoc.length }
  }, [anhChup])
}

export function useDuLieuKhung(): DuLieuKhung {
  const giaTri = useContext(NguCanhDuLieuKhung)
  const that = useDuLieuKhungThat()
  return giaTri ?? that
}
