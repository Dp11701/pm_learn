// Công cụ của bài khi không có cột phải (1024–1279; đề xuất 4.4): hai nút phụ "Mục lục" / "Ghi chú" ở đầu trang, mỗi
// nút mở một panel trượt 360px từ phải (C32 dạng 'phai': giữ focus bên trong, Esc / X / bấm ra ngoài đóng, focus về
// nút). Panel "Mục lục" chứa đúng card tab của cột phải; bấm một khối thì panel đóng rồi mới cuộn + focus khối đó —
// việc tới khối chạy ĐÚNG lúc panel đóng hẳn (HopThoai khiDongXong, thay cho việc trả focus về nút), không đua với hẹn
// giờ khi chuyển động đóng chậm.
// Panel "Ghi chú" chứa C24 (focus vào ô khi mở). Card Flashcard nằm ở cuối bài (TrangBaiHoc), không ở đây.
import { useRef, useState, type MouseEvent } from 'react'
import { ListTree, StickyNote } from 'lucide-react'
import type { Cay, MucHoc } from '../../../../shared/roadmap'
import HopThoai from '../../../components/HopThoai'
import Nut from '../../../components/Nut'
import { denKhoi, type DongMucLuc } from '../../../components/bai-hoc/MucLuc'
import type { TraTrangThai } from '../../../components/bai-hoc/kieu'
import TheGhiChu from '../../../components/ghi-chu/TheGhiChu'
import TheDieuHuong from './TheDieuHuong'

type Panel = 'muc-luc' | 'ghi-chu'

export interface PropsCongCuGon {
  muc: MucHoc
  cay: Cay
  /** null: bài đang tải */
  mucLuc: readonly DongMucLuc[] | null
  trangThaiCua: TraTrangThai
  className?: string
}

export default function CongCuGon({
  muc,
  cay,
  mucLuc,
  trangThaiCua,
  className = '',
}: PropsCongCuGon) {
  const [mo, datMo] = useState<Panel | null>(null)
  // Khối cần tới sau khi panel Mục lục đóng hẳn
  const khoiCanToi = useRef<string | null>(null)
  const refGhiChu = useRef<HTMLTextAreaElement>(null)
  const doiMo = (panel: Panel) => (m: boolean) => datMo(m ? panel : null)
  /** Safari không focus nút khi bấm chuột: focus trước để panel trả focus về đúng nút khi đóng. */
  const moPanel = (panel: Panel) => (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.focus()
    khoiCanToi.current = null
    datMo(panel)
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Nut bien="phu" icon={ListTree} aria-haspopup="dialog" onClick={moPanel('muc-luc')}>
        Mục lục
      </Nut>
      <Nut bien="phu" icon={StickyNote} aria-haspopup="dialog" onClick={moPanel('ghi-chu')}>
        Ghi chú
      </Nut>
      <HopThoai
        mo={mo === 'muc-luc'}
        doiMo={doiMo('muc-luc')}
        dang="phai"
        tieuDe="Điều hướng trong bài"
        khiDongXong={() => {
          const id = khoiCanToi.current
          khoiCanToi.current = null
          // Tới được khối (cuộn + focus) thì không trả focus về nút "Mục lục"
          return id !== null && denKhoi(id)
        }}
      >
        <TheDieuHuong
          muc={muc}
          cay={cay}
          mucLuc={mucLuc}
          trangThaiCua={trangThaiCua}
          khiChonMuc={(id) => {
            khoiCanToi.current = id
            datMo(null)
          }}
        />
      </HopThoai>
      <HopThoai
        mo={mo === 'ghi-chu'}
        doiMo={doiMo('ghi-chu')}
        dang="phai"
        tieuDe="Ghi chú"
        focusDau={refGhiChu}
      >
        <TheGhiChu itemId={muc.id} dang="panel" refO={refGhiChu} />
      </HopThoai>
    </div>
  )
}
