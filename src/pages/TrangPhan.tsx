// /phan/:slug — trang phần (P1, phase 10). H1 "Phần <tên>" như F29. Slug sai → 404 có gợi ý.
import { useParams } from 'react-router'
import TenMuc from '../components/TenMuc'
import { timNut } from './chung'
import KhongTimThay from './KhongTimThay'
import TrangSapCo from './TrangSapCo'

export default function TrangPhan() {
  const phan = timNut(useParams().slug, 'part')
  if (!phan) return <KhongTimThay />
  return (
    <TrangSapCo
      tenTrang={`Phần ${phan.label}`}
      tieuDe={
        <>
          Phần <TenMuc>{phan.label}</TenMuc>
        </>
      }
      phase="10"
      moTa="Tiến độ và độ phủ nội dung của phần, các nhóm và mục học, phần tổng quan do bạn soạn."
    />
  )
}
