// Tab "Trong lĩnh vực" ở cột phải trang bài (§8.5, đề xuất 4.3): mọi mục học cùng lĩnh vực với mục đang mở (không
// có lĩnh vực thì cùng phần — như dải vị trí C13), theo thứ tự cây, mỗi mục một hàng C9 rút gọn (HangCay); mục
// đang mở được tô. Trạng thái học lấy từ trangThaiCua của trang; cờ Cần ôn lại từ ảnh chụp /api/state (canOnLaiCua:
// chỉ mục Đã xong).
import { viTriTrongVung, type Cay, type MucHoc } from '../../../shared/roadmap'
import { useTrangThai } from '../../app/du-lieu/trang-thai'
import HangCay from './HangCay'
import type { TraTrangThai } from './kieu'

export interface PropsTrongLinhVuc {
  muc: MucHoc
  cay: Cay
  trangThaiCua: TraTrangThai
}

export default function TrongLinhVuc({ muc, cay, trangThaiCua }: PropsTrongLinhVuc) {
  const { canOnLaiCua } = useTrangThai()
  const { vung, cacMuc } = viTriTrongVung(cay, muc.id)
  return (
    <ul
      aria-label={`Các mục trong ${vung.label}`}
      className="m-0 flex list-none flex-col gap-0.5 p-0"
    >
      {cacMuc.map((m) => (
        <li key={m.id}>
          <HangCay
            muc={m}
            trangThai={trangThaiCua(m.id)}
            canOnLai={canOnLaiCua(m.id)}
            dangMo={m.id === muc.id}
          />
        </li>
      ))}
    </ul>
  )
}
