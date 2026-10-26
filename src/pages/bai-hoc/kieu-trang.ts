// Dữ liệu học mà phần vẽ trang bài cần — tách khỏi hook để trang vẽ được cả khi không có máy chủ (gallery,
// test khung app) và để test phần vẽ không cần TanStack.
import type { TrangThaiHoc } from '../../../shared/domain/trang-thai'
import type { TraTrangThai } from '../../components/bai-hoc/kieu'

/** Trạng thái học (useTrangThai, src/app/du-lieu/trang-thai.tsx). */
export interface TrangThaiTrang {
  trangThaiCua: TraTrangThai
  dangTai: boolean
  loi: boolean
  taiLai: () => void
}

/** Đặt trạng thái học (useDatTrangThai); không có = chỉ đọc. */
export interface DatTrangThaiTrang {
  dat: (id: string, trangThai: TrangThaiHoc) => void
  loiLuu: (id: string) => boolean
  thuLai: (id: string) => void
}
