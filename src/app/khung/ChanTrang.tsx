// Chân trang §6.1: dòng ghi nguồn dựng từ docs/roadmap-tree.json (tên roadmap là tên nút nên không gõ
// cứng). Ngày cập nhật lấy phần ngày UTC của roadmapUpdatedAt — ngày roadmap.sh ghi, không đổi theo
// múi giờ máy.
import cayJson from '../../../docs/roadmap-tree.json'
import { dinhDangNgay } from '../../../shared/dinh-dang'

const NGAY_CAP_NHAT = dinhDangNgay(cayJson.roadmapUpdatedAt.slice(0, 10))
const NGAY_LAY = dinhDangNgay(cayJson.fetchedAt)

export default function ChanTrang() {
  return (
    <footer className="px-10 pt-4 pb-6 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted max-md:px-4">
      <p className="m-0">
        Cấu trúc theo roadmap <span lang="en">{cayJson.title}</span> của {cayJson.creator} trên{' '}
        <a
          href={cayJson.source}
          target="_blank"
          rel="noreferrer"
          className="text-text underline hover:text-[var(--primary-hover)]"
        >
          roadmap.sh<span className="sr-only"> (mở tab mới)</span>
        </a>{' '}
        · cập nhật {NGAY_CAP_NHAT} · dữ liệu lấy ngày {NGAY_LAY}
      </p>
    </footer>
  )
}
