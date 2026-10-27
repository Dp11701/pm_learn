// Nút "Sao chép dòng lỗi" — thay "Mở trong trình soạn" (trình soạn trong app đã bỏ, đề xuất mục 10) ở banner lỗi đọc
// file của trang bài và dòng ✕ Lỗi frontmatter của tab Nhập: ghi "<tên file> · Dòng N: <lỗi>" vào clipboard để sửa
// file ở trình soạn bạn quen dùng. Sao chép xong → toast; trình duyệt không cho ghi clipboard → toast lỗi (dòng lỗi
// vẫn hiện trên trang để tự chọn).
import { Copy } from 'lucide-react'
import { voiDong, type LoiDong } from '../../shared/noi-dung'
import { ghiClipboard } from './HopThoaiPrompt'
import Nut, { type CoNut } from './Nut'
import { useToast } from './Toast'
import {
  DA_SAO_CHEP_DONG_LOI,
  KHONG_SAO_CHEP_DUOC_DONG_LOI,
  SAO_CHEP_DONG_LOI,
  chuDongLoi,
} from '../copy/cho-duyet'

export interface PropsNutSaoChepDongLoi {
  /** Tên file, vd. "vuca.md" */
  tenFile: string
  loi: LoiDong
  co?: CoNut
  /** id phần tử mô tả nút (vd. tên file của hàng trong bảng) */
  'aria-describedby'?: string
}

export default function NutSaoChepDongLoi({
  tenFile,
  loi,
  co,
  'aria-describedby': moTa,
}: PropsNutSaoChepDongLoi) {
  const { toast } = useToast()
  async function saoChep() {
    const daGhi = await ghiClipboard(chuDongLoi(tenFile, voiDong(loi)))
    toast(
      daGhi
        ? { noiDung: DA_SAO_CHEP_DONG_LOI }
        : { loai: 'loi', noiDung: KHONG_SAO_CHEP_DUOC_DONG_LOI },
    )
  }
  return (
    <Nut bien="phu" co={co} icon={Copy} aria-describedby={moTa} onClick={() => void saoChep()}>
      {SAO_CHEP_DONG_LOI}
    </Nut>
  )
}
