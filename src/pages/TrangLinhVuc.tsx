// /linh-vuc/:slug — trang lĩnh vực (phase 4). Slug phải là lĩnh vực trong cây; không có → slug cũ thì chuyển, còn lại 404 có gợi ý.
import { useParams } from 'react-router'
import ChipLoai from '../components/trang-thai/ChipLoai'
import TenMuc from '../components/TenMuc'
import { timNut } from './chung'
import SlugCuHoac404 from './khong-tim-thay/SlugCuHoac404'
import TrangSapCo from './TrangSapCo'
import { MO_TA_SAP_CO } from '../copy/cho-duyet'

export default function TrangLinhVuc() {
  const { slug } = useParams()
  const linhVuc = timNut(slug, 'area')
  if (!linhVuc) return <SlugCuHoac404 slug={slug} loai="area" />
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
