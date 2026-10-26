// /hoc/:slug/soan — trình soạn (phase 7b). Màn tập trung không có sidebar (D27, F20): thanh trên 64px
// có "‹ Về bài", H1 "Soạn bài" và tên mục. Nằm ngoài khung app nên tự có link bỏ qua, <main>, banner mất
// kết nối và tự đưa focus về H1 khi vào từ trang khác.
// Slug không phải mục học → 404 trong khung app như mọi trang (D24): dựng KhungApp, <Outlet/> của khung
// hiện route con index của route này (KhongTimThay, src/app/router.tsx).
import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import type { MucHoc } from '../../shared/roadmap'
import { BannerMatKetNoi } from '../app/ket-noi'
import KhungApp from '../app/khung/KhungApp'
import TenMuc from '../components/TenMuc'
import TieuDeTrang, { ID_TIEU_DE_TRANG } from '../components/TieuDeTrang'
import { SapCo } from '../components/TrangThaiTrong'
import { timMucHoc } from './chung'

const ID_NOI_DUNG = 'noi-dung-chinh'

function useFocusKhiVao() {
  const { key } = useLocation()
  useEffect(() => {
    // 'default' = lần tải đầu: để trình duyệt tự xử lý focus.
    if (key !== 'default') document.getElementById(ID_TIEU_DE_TRANG)?.focus()
  }, [key])
}

function TrinhSoanSapCo({ muc }: { muc: MucHoc }) {
  useFocusKhiVao()
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <a
        href={`#${ID_NOI_DUNG}`}
        className="sr-only z-50 rounded-[var(--radius-sm)] bg-surface px-3 py-2 text-text focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Chuyển tới nội dung chính
      </a>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-6 max-md:h-14 max-md:gap-2 max-md:px-1.5">
        <Link
          to={`/hoc/${muc.slug}`}
          className="inline-flex h-[var(--h-control)] shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-text no-underline transition-colors duration-150 hover:bg-surface-2 max-md:h-[var(--h-control-touch)]"
        >
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          Về bài
        </Link>
        <TieuDeTrang
          tenTrang={`Soạn bài · ${muc.label}`}
          className="m-0 shrink-0 text-[length:var(--fs-h2-m)] leading-[var(--lh-h2-m)] font-bold outline-none"
        >
          Soạn bài
        </TieuDeTrang>
        <TenMuc className="min-w-0 truncate text-muted">{muc.label}</TenMuc>
      </header>
      <main id={ID_NOI_DUNG} tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <div className="flex flex-col items-center gap-4 px-6 py-12 max-md:px-4 max-md:py-6">
          <BannerMatKetNoi className="w-full max-w-[720px]" />
          <SapCo
            phase="7b"
            moTa="Trình soạn Markdown: khung bài theo mẫu, báo lỗi theo dòng, xem trước và lưu bản nháp."
            khung
            className="w-full max-w-[720px] bg-surface"
          />
        </div>
      </main>
    </div>
  )
}

export default function TrangSoan() {
  const muc = timMucHoc(useParams().slug)
  return muc ? <TrinhSoanSapCo muc={muc} /> : <KhungApp />
}
