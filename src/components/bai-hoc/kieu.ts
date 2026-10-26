// Kiểu dùng chung của các component trang bài.
import type { TrangThaiHoc } from '../../../shared/domain/trang-thai'

/** Trạng thái học của một mục (theo id); chưa có dữ liệu thì Chưa học. */
export type TraTrangThai = (id: string) => TrangThaiHoc
