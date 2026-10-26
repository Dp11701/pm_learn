// /phan/:slug — trang phần (P1, phase 10). H1 "Phần <tên>" như F29. Slug sai → slug cũ thì chuyển, không thì 404 có gợi ý.
import { useParams } from 'react-router'
import TenMuc from '../components/TenMuc'
import { timNut } from './chung'
import SlugCuHoac404 from './khong-tim-thay/SlugCuHoac404'
import TrangSapCo from './TrangSapCo'
import { MO_TA_SAP_CO } from '../copy/cho-duyet'

export default function TrangPhan() {
  const { slug } = useParams()
  const phan = timNut(slug, 'part')
  if (!phan) return <SlugCuHoac404 slug={slug} loai="part" />
  return (
    <TrangSapCo
      tenTrang={`Phần ${phan.label}`}
      tieuDe={
        <>
          Phần <TenMuc>{phan.label}</TenMuc>
        </>
      }
      phase="10"
      moTa={MO_TA_SAP_CO.phan}
    />
  )
}
