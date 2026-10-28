// /linh-vuc/:slug — trang lĩnh vực (phase 4). Slug phải là lĩnh vực trong cây; không có → slug cũ thì chuyển, còn lại 404 có gợi ý.
import { useParams } from 'react-router'
import { timNut } from './chung'
import SlugCuHoac404 from './khong-tim-thay/SlugCuHoac404'
import TrangLoTrinh from './TrangLoTrinh'

export default function TrangLinhVuc() {
  const { slug } = useParams()
  const linhVuc = timNut(slug, 'area')
  if (!linhVuc) return <SlugCuHoac404 slug={slug} loai="area" />
  return <TrangLoTrinh gocId={linhVuc.id} />
}
