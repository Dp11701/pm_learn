// Slug không có trong cây hiện tại ở /hoc/:slug, /linh-vuc/:slug, /phan/:slug (đề xuất 1.3 bước 2 "để link cũ
// … vẫn tra được"): tra bảng slug cũ (GET /api/noi-dung/slug-cu). Slug cũ của một nút còn trong cây, đúng loại
// của route → chuyển (replace, giữ ?query và #neo) sang slug hiện tại; không có → 404 có gợi ý như trước.
// Đang hỏi bảng slug cũ: khung đang tải (aria-busy), không hiện 404 rồi mới chuyển. Ngoài máy chủ: 404 ngay.
import { Navigate, useLocation } from 'react-router'
import { layCay, type Nut } from '../../../shared/roadmap'
import { useSlugCu } from '../../app/du-lieu/thay-cay'
import DangTai from '../DangTai'
import KhongTimThay from '../KhongTimThay'

/** Đường dẫn trang của nút theo loại route; nút khác loại → undefined. */
const TRANG: Record<'muc' | 'area' | 'part', (nut: Nut) => string | undefined> = {
  muc: (nut) => (layCay().mucTheoId.has(nut.id) ? `/hoc/${nut.slug}` : undefined),
  area: (nut) => (nut.kind === 'area' ? `/linh-vuc/${nut.slug}` : undefined),
  part: (nut) => (nut.kind === 'part' ? `/phan/${nut.slug}` : undefined),
}

export default function SlugCuHoac404({
  slug,
  loai,
}: {
  slug: string | undefined
  /** Loại nút của route: mục học (/hoc), lĩnh vực (/linh-vuc), phần (/phan) */
  loai: 'muc' | 'area' | 'part'
}) {
  const { tra, xong } = useSlugCu(Boolean(slug))
  const { search, hash } = useLocation()
  const id = slug ? tra?.(slug) : undefined
  const nut = id === undefined ? undefined : layCay().nutTheoId.get(id)
  const den = nut ? TRANG[loai](nut) : undefined
  // Không vòng lặp: slug hiện tại của nút luôn có trong cây nên trang đích không tới đây nữa.
  if (den) return <Navigate to={{ pathname: den, search, hash }} replace />
  if (slug && !xong) return <DangTai />
  return <KhongTimThay />
}
