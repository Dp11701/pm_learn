// /lo-trinh — bản tạm (27/10/2026, người dùng cần vào bài để học trước bước 2): cây Phần › Lĩnh vực › Nhóm › Mục
// bằng DanhSachMuc, chưa có bộ lọc, sắp xếp, chọn hàng loạt. Bước 2 thay bằng trang đầy đủ (F06–F08).
import { useMemo, useState } from 'react'
import { layCay } from '../../shared/roadmap'
import { useTrangThai } from '../app/du-lieu/trang-thai'
import { useTrangThaiNoiDung } from '../app/du-lieu/noi-dung'
import DanhSachMuc from '../components/danh-sach/DanhSachMuc'
import TieuDeTrang from '../components/TieuDeTrang'
import { KhungTrang, LOP_H1 } from './chung'

export default function TrangLoTrinh({ gocId }: { gocId?: string }) {
  const cay = layCay()
  const { trangThaiCua, canOnLaiCua } = useTrangThai()
  const noiDungCua = useTrangThaiNoiDung()
  const [chon, datChon] = useState<ReadonlySet<string>>(new Set())
  const goc = useMemo(() => (gocId ? [gocId] : cay.phan.map((p) => p.id)), [cay, gocId])
  const cacMuc = useMemo(
    () => (gocId ? cay.mucHoc.filter((m) => m.linhVuc?.id === gocId) : cay.mucHoc),
    [cay, gocId],
  )
  const tenTrang = gocId ? (cay.nutTheoId.get(gocId)?.label ?? '') : 'Lộ trình'
  const doiChon = (id: string) =>
    datChon((cu) => {
      const moi = new Set(cu)
      if (moi.has(id)) moi.delete(id)
      else moi.add(id)
      return moi
    })
  return (
    <KhungTrang>
      <TieuDeTrang tenTrang={tenTrang} className={LOP_H1}>
        {tenTrang}
      </TieuDeTrang>
      <DanhSachMuc
        cay={cay}
        cacMuc={cacMuc}
        kieu={{ loai: 'cay', goc, capDau: gocId ? 3 : 2 }}
        trangThaiCua={trangThaiCua}
        canOnLaiCua={canOnLaiCua}
        noiDungCua={noiDungCua}
        chon={chon}
        khiDoiChon={doiChon}
        nhan={tenTrang}
      />
    </KhungTrang>
  )
}
