// Dialog C32 + C36 "Thêm dự án" từ ô Dự án của thẻ Thực hành (đề xuất 2.1 bảng projects, 4.3): Tên dự án (bắt
// buộc), Vai trò của bạn, Giai đoạn (tuỳ chọn). Enter ở một ô = Thêm (bỏ qua khi Telex/VNI đang ghép chữ), Esc /
// Huỷ đóng. Chờ máy chủ (cần id để chọn ngay cho bài thực hành): nút đang xử lý; lỗi hiện câu của máy chủ trong
// dialog, giữ chữ đã gõ. Mỗi lần mở là một lần gắn mới (key ở nơi dùng).
import { useRef, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { TEN_DU_AN_TOI_DA, THUOC_TINH_DU_AN_TOI_DA } from '../../../server/du-lieu/hop-dong-hoc'
import { useThemDuAn, type DuAn } from '../../app/du-lieu/du-an'
import HopThoai from '../HopThoai'
import Nut from '../Nut'
import TruongNhap from '../TruongNhap'
import { DU_AN, THEM_DU_AN } from '../../copy/cho-duyet'

export interface PropsHopThoaiThemDuAn {
  mo: boolean
  doiMo: (mo: boolean) => void
  /** Thêm xong (dự án mới; null khi máy chủ không gửi lại — danh sách được tải lại) */
  khiThem: (duAn: DuAn | null) => void
}

export default function HopThoaiThemDuAn({ mo, doiMo, khiThem }: PropsHopThoaiThemDuAn) {
  const them = useThemDuAn()
  const [ten, datTen] = useState('')
  const [vaiTro, datVaiTro] = useState('')
  const [giaiDoan, datGiaiDoan] = useState('')
  const [loiTen, datLoiTen] = useState<string | null>(null)
  const [loi, datLoi] = useState<string | null>(null)
  const [dangGui, datDangGui] = useState(false)
  const refTen = useRef<HTMLInputElement>(null)

  async function gui() {
    if (dangGui) return
    if (ten.trim() === '') {
      datLoiTen(DU_AN.thieuTen)
      refTen.current?.focus()
      return
    }
    datDangGui(true)
    datLoi(null)
    const kq = await them({ ten, vaiTro, giaiDoan })
    datDangGui(false)
    if (kq.ok) khiThem(kq.duAn)
    else datLoi(kq.loi)
  }
  const guiNgay = () => void gui()

  return (
    <HopThoai
      mo={mo}
      doiMo={doiMo}
      tieuDe={THEM_DU_AN}
      moTa={DU_AN.moTa}
      focusDau={refTen}
      chan={
        <>
          <Nut bien="ghost" onClick={() => doiMo(false)}>
            Huỷ
          </Nut>
          <Nut bien="chinh" onClick={guiNgay} dangXuLy={dangGui}>
            {THEM_DU_AN}
          </Nut>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TruongNhap
          ref={refTen}
          nhan={DU_AN.ten}
          loi={loiTen}
          value={ten}
          required
          maxLength={TEN_DU_AN_TOI_DA}
          autoComplete="off"
          onChange={(e) => {
            datTen(e.target.value)
            if (loiTen && e.target.value.trim() !== '') datLoiTen(null)
          }}
          khiEnter={guiNgay}
        />
        <TruongNhap
          nhan={DU_AN.vaiTro}
          goiY={DU_AN.tuyChon}
          value={vaiTro}
          maxLength={THUOC_TINH_DU_AN_TOI_DA}
          autoComplete="off"
          onChange={(e) => datVaiTro(e.target.value)}
          khiEnter={guiNgay}
        />
        <TruongNhap
          nhan={DU_AN.giaiDoan}
          goiY={DU_AN.tuyChon}
          value={giaiDoan}
          maxLength={THUOC_TINH_DU_AN_TOI_DA}
          autoComplete="off"
          onChange={(e) => datGiaiDoan(e.target.value)}
          khiEnter={guiNgay}
        />
        {loi && (
          <p
            role="alert"
            className="m-0 flex items-center gap-1.5 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-danger"
          >
            <CircleAlert size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            {loi}
          </p>
        )}
      </div>
    </HopThoai>
  )
}
