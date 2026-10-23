// HỢP ĐỒNG (stub, agent "trang-thai" viết thật): icon trạng thái học, §5.1.
import type { TrangThaiHoc } from '../../../shared/domain/trang-thai'

export interface PropsIconTrangThai {
  trangThai: TrangThaiHoc
  /** Cờ Cần ôn lại (suy ra) — vẽ glyph ↺ theo §5.1. */
  canOnLai?: boolean
  size?: number
  className?: string
  /** Có nhãn chữ đi kèm thì icon aria-hidden; đứng một mình thì cần nhãn. */
  nhan?: string
}

export default function IconTrangThai(_props: PropsIconTrangThai) {
  return null
}
