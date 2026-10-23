// MobileTopBar < 1024px (D6; F04, F13): menu mở drawer bên trái, tiêu đề trang hoặc "‹ cấp cha", nút
// tìm kiếm, chip đồng hồ (phase 3). Cao 56; tên cấp cha dài thì cắt 1 dòng + "…", tên đủ ở title và
// tên truy cập (câu hỏi 2 của designer). Dính đầu trang để menu, tìm kiếm luôn trong tầm tay.
import type { Ref } from 'react'
import { Link, useLocation } from 'react-router'
import { ChevronLeft, Menu, Search } from 'lucide-react'
import { useTimKiem } from '../../components/tim-kiem/TimKiem'
import { useDuLieuKhung } from './du-lieu-khung'
import { tieuDeMacDinh } from './menu'
import type { CauHinhThanhTren } from './thanh-tren'

const NUT_44 =
  'flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-text transition-colors duration-150 hover:bg-surface-2'

export interface PropsThanhTrenMobile {
  cauHinh: CauHinhThanhTren | null
  drawerMo: boolean
  moDrawer: () => void
  refNutMenu: Ref<HTMLButtonElement>
}

export default function ThanhTrenMobile({
  cauHinh,
  drawerMo,
  moDrawer,
  refNutMenu,
}: PropsThanhTrenMobile) {
  const { pathname } = useLocation()
  const { mo: moTimKiem } = useTimKiem()
  const { dongHo } = useDuLieuKhung()
  const capCha = cauHinh?.capCha
  const tieuDe = cauHinh?.tieuDe ?? tieuDeMacDinh(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-h)] shrink-0 items-center gap-1 border-b border-border bg-surface px-1.5">
      <button
        ref={refNutMenu}
        type="button"
        aria-label="Mở menu"
        aria-haspopup="dialog"
        aria-expanded={drawerMo}
        onClick={moDrawer}
        className={NUT_44}
      >
        <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {capCha ? (
        <div className="flex min-w-0 flex-1">
          <Link
            to={capCha.den}
            title={capCha.ten}
            className="flex h-11 max-w-full min-w-0 items-center gap-0.5 rounded-[var(--radius-sm)] px-2 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-text no-underline transition-colors duration-150 hover:bg-surface-2"
          >
            <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            <span className="sr-only">Về </span>
            <span lang={capCha.tiengAnh ? 'en' : undefined} className="truncate">
              {capCha.ten}
            </span>
          </Link>
        </div>
      ) : (
        <p
          lang={cauHinh?.tieuDeTiengAnh ? 'en' : undefined}
          className="m-0 min-w-0 flex-1 truncate text-[17px] leading-7 font-semibold"
        >
          {tieuDe}
        </p>
      )}
      <button
        type="button"
        aria-label="Tìm kiếm"
        aria-keyshortcuts="/"
        onClick={moTimKiem}
        className={NUT_44}
      >
        <Search size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {dongHo?.chip}
    </header>
  )
}
