// /linh-vuc/:slug — trang lĩnh vực (phase 4). Slug phải là lĩnh vực trong cây; không có → 404 có gợi ý.
import { useParams } from 'react-router'
import ChipLoai from '../components/trang-thai/ChipLoai'
import TenMuc from '../components/TenMuc'
import { timNut } from './chung'
import KhongTimThay from './KhongTimThay'
import TrangSapCo from './TrangSapCo'
import { MO_TA_SAP_CO } from '../copy/cho-duyet'

export default function TrangLinhVuc() {
  const linhVuc = timNut(useParams().slug, 'area')
  if (!linhVuc) return <KhongTimThay />
  return (
    <TrangSapCo
      tenTrang={linhVuc.label}
      tieuDe={<TenMuc>{linhVuc.label}</TenMuc>}
      truocTieuDe={<ChipLoai loai="linh-vuc" />}
      phase="4"
      moTa={MO_TA_SAP_CO.linhVuc}
    />
  )
}
