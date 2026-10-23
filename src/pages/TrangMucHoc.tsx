// /hoc/:slug — bài học (phase 2a). Slug phải là mục học trong cây; không có → 404 có gợi ý.
// Phase 1: chip loại (C4) + H1 tên mục + dòng tên gốc (đề xuất 1.3) + "Có ở phase 2a".
import { useParams } from 'react-router'
import ChipLoai from '../components/trang-thai/ChipLoai'
import TenMuc from '../components/TenMuc'
import { timMucHoc } from './chung'
import KhongTimThay from './KhongTimThay'
import TrangSapCo from './TrangSapCo'

export default function TrangMucHoc() {
  const muc = timMucHoc(useParams().slug)
  if (!muc) return <KhongTimThay />
  return (
    <TrangSapCo
      tenTrang={muc.label}
      tieuDe={<TenMuc>{muc.label}</TenMuc>}
      truocTieuDe={<ChipLoai loai={muc.mau} />}
      sauTieuDe={
        muc.labelOriginal && (
          <p className="m-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
            Tên gốc trên roadmap: <TenMuc>{muc.labelOriginal}</TenMuc>
          </p>
        )
      }
      phase="2a"
      moTa="Bài học, trạng thái học, vị trí trong lĩnh vực và Trước/Tiếp theo thứ tự cây."
    />
  )
}
