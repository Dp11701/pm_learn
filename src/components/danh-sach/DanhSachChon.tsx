// Danh sách mục học có chọn nhiều (Lộ trình, trang Lĩnh vực; đề xuất 3.9): thanh hàng loạt (ThanhHangLoat) + danh
// sách (DanhSachMuc) dùng chung một tập chọn. Tập chọn luôn nằm trong các mục đang hiện: đổi bộ lọc thì bỏ chọn mục
// bị ẩn (useChonNhieu). Không mục nào hiện → câu "Không có mục nào khớp bộ lọc." thay danh sách.
import { useMemo } from 'react'
import type { Cay, MucHoc } from '../../../shared/roadmap'
import { KHONG_MUC_NAO_KHOP } from '../../copy/cho-duyet-lo-trinh'
import { LOP_CHU_META } from '../trang-thai/mau-trang-thai'
import { useChonNhieu } from './chon-nhieu'
import DanhSachMuc, { type KieuDanhSach, type PropsDanhSachMuc } from './DanhSachMuc'
import ThanhHangLoat from './ThanhHangLoat'

export interface PropsDanhSachChon extends Pick<
  PropsDanhSachMuc,
  'trangThaiCua' | 'canOnLaiCua' | 'noiDungCua' | 'noiBat' | 'nhan'
> {
  cay: Cay
  /** Mục đang hiện (đã lọc, đã sắp) */
  cacMuc: readonly MucHoc[]
  kieu: KieuDanhSach
}

export default function DanhSachChon({ cay, cacMuc, kieu, ...khac }: PropsDanhSachChon) {
  const hienIds = useMemo(() => cacMuc.map((m) => m.id), [cacMuc])
  const chonNhieu = useChonNhieu(hienIds)
  return (
    <div className="flex flex-col gap-4">
      <ThanhHangLoat hienIds={hienIds} chonNhieu={chonNhieu} />
      {cacMuc.length === 0 ? (
        <p className={`m-0 text-muted ${LOP_CHU_META}`}>{KHONG_MUC_NAO_KHOP}</p>
      ) : (
        <DanhSachMuc
          {...khac}
          cay={cay}
          cacMuc={cacMuc}
          kieu={kieu}
          chon={chonNhieu.chon}
          khiDoiChon={chonNhieu.doi}
        />
      )}
    </div>
  )
}
