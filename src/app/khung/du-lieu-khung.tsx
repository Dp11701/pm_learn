// Dữ liệu học mà khung app hiện (badge, khối Đang học, đồng hồ). Phase 1 chưa có API dữ liệu học
// (phase 2a) nên mặc định là trạng thái trống; phase sau bọc khung bằng <DuLieuKhungProvider giaTri={…}>.
import { createContext, useContext, type ReactNode } from 'react'

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

const NguCanhDuLieuKhung = createContext<DuLieuKhung>(DU_LIEU_KHUNG_TRONG)

export function DuLieuKhungProvider({
  giaTri,
  children,
}: {
  giaTri: DuLieuKhung
  children: ReactNode
}) {
  return <NguCanhDuLieuKhung.Provider value={giaTri}>{children}</NguCanhDuLieuKhung.Provider>
}

export function useDuLieuKhung(): DuLieuKhung {
  return useContext(NguCanhDuLieuKhung)
}
