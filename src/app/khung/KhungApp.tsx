// Khung app (§6.1, §5.2, §11; đề xuất 4.4): link "Chuyển tới nội dung chính", điều hướng theo bề rộng
// (≥ 1280 sidebar 264 · 1024–1279 rail 72 · < 1024 top bar mobile + drawer 312), banner mất kết nối dính
// đầu cột nội dung, <main id="noi-dung-chinh"> chứa trang, chân trang ghi nguồn. Sau mỗi lần chuyển
// trang phía client, focus về H1 (#tieu-de-trang) hoặc <main>.
// Khung là layout route bao mọi trang nên gắn luôn các provider dùng chung (toast, kết nối, tìm kiếm,
// phím tắt) — các provider này cần nằm trong router (điều hướng) và chỉ được gắn MỘT lần ở đây.
import { useCallback, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import { ToastProvider } from '../../components/Toast'
import { TimKiemProvider } from '../../components/tim-kiem/TimKiem'
import { BannerMatKetNoi, KetNoiProvider } from '../ket-noi'
import { PhimTatProvider } from '../phim-tat'
import { useBeRong } from './be-rong'
import ChanTrang from './ChanTrang'
import Drawer, { type LyDoDongDrawer } from './Drawer'
import { ID_NOI_DUNG_CHINH, useFocusSauDieuHuong } from './focus'
import Rail from './Rail'
import Sidebar from './Sidebar'
import ThanhTrenMobile from './ThanhTrenMobile'
import { ThanhTrenProvider, type CauHinhThanhTren } from './thanh-tren'

/** Các provider dùng chung của app (thứ tự: kết nối → toast → tìm kiếm → phím tắt). */
export function NhaCungCapApp({ children }: { children: ReactNode }) {
  return (
    <KetNoiProvider>
      <ToastProvider>
        <TimKiemProvider>
          <PhimTatProvider>{children}</PhimTatProvider>
        </TimKiemProvider>
      </ToastProvider>
    </KetNoiProvider>
  )
}

function LinkBoQua() {
  function khiBam(e: MouseEvent<HTMLAnchorElement>) {
    // Tự focus <main> thay vì đổi #hash (không tạo lượt điều hướng của router).
    e.preventDefault()
    document.getElementById(ID_NOI_DUNG_CHINH)?.focus()
  }
  return (
    <a
      href={`#${ID_NOI_DUNG_CHINH}`}
      onClick={khiBam}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:flex focus:h-11 focus:items-center focus:rounded-[var(--radius-sm)] focus:border focus:border-border-input focus:bg-surface focus:px-4 focus:font-medium focus:text-text focus:underline focus:shadow-[var(--shadow-2)]"
    >
      Chuyển tới nội dung chính
    </a>
  )
}

function Khung() {
  const beRong = useBeRong()
  const [cauHinhThanhTren, datCauHinhThanhTren] = useState<CauHinhThanhTren | null>(null)
  const [moDrawer, datMoDrawer] = useState(false)
  const lyDoDongRef = useRef<LyDoDongDrawer>(null)
  const nutMenuRef = useRef<HTMLButtonElement>(null)

  const dongDrawer = useCallback((lyDo: LyDoDongDrawer) => {
    lyDoDongRef.current = lyDo
    datMoDrawer(false)
  }, [])

  // Lên bề rộng có sidebar / rail thì drawer không còn chỗ: đóng (điều chỉnh state theo bề rộng).
  const [beRongTruoc, datBeRongTruoc] = useState(beRong)
  if (beRongTruoc !== beRong) {
    datBeRongTruoc(beRong)
    if (beRong !== 'hep') datMoDrawer(false)
  }

  // Chuyển trang (kể cả Lùi / Tiến của trình duyệt) khi drawer đang mở → đóng, focus về H1 trang mới.
  useFocusSauDieuHuong(() => dongDrawer('dieu-huong'))

  const hep = beRong === 'hep'

  return (
    <ThanhTrenProvider dat={datCauHinhThanhTren}>
      <LinkBoQua />
      <div className="flex min-h-dvh bg-bg text-text">
        {beRong === 'day-du' && (
          <aside
            aria-label="Điều hướng chính"
            className="sticky top-0 flex h-dvh w-[var(--sidebar-w)] shrink-0 flex-col self-start overflow-y-auto border-r border-border bg-surface"
          >
            <Sidebar />
          </aside>
        )}
        {beRong === 'rail' && <Rail />}
        <div className="flex min-w-0 flex-1 flex-col">
          {hep && (
            <ThanhTrenMobile
              cauHinh={cauHinhThanhTren}
              drawerMo={moDrawer}
              moDrawer={() => {
                lyDoDongRef.current = null
                datMoDrawer(true)
              }}
              refNutMenu={nutMenuRef}
            />
          )}
          {/* Bọc dính để banner nằm ngay dưới top bar mobile (banner tự dính chỉ có tác dụng trong bọc). */}
          <div className={`sticky z-30 ${hep ? 'top-[var(--topbar-h)]' : 'top-0'}`}>
            <BannerMatKetNoi />
          </div>
          <main
            id={ID_NOI_DUNG_CHINH}
            tabIndex={-1}
            className="flex min-w-0 flex-1 flex-col outline-none"
          >
            <Outlet />
          </main>
          <ChanTrang />
        </div>
      </div>
      {hep && <Drawer mo={moDrawer} dong={dongDrawer} lyDoDongRef={lyDoDongRef} nutMenuRef={nutMenuRef} />}
      <ScrollRestoration />
    </ThanhTrenProvider>
  )
}

export default function KhungApp() {
  return (
    <NhaCungCapApp>
      <Khung />
    </NhaCungCapApp>
  )
}
