// Khung app (§6.1, §5.2, §11; đề xuất 4.4): link "Chuyển tới nội dung chính", điều hướng theo bề rộng
// (≥ 1280 sidebar 264 · 1024–1279 rail 72 · < 1024 top bar mobile + drawer 312), banner mất kết nối dính
// đầu cột nội dung (thẻ bo góc trong lề trang như F26, vùng dính có nền nên nội dung cuộn không lộ qua góc
// bo), <main id="noi-dung-chinh"> chứa trang, chân trang ghi nguồn. Sau mỗi lần chuyển trang phía client,
// focus về H1 (#tieu-de-trang) hoặc <main>.
// Provider dùng chung (toast, kết nối, tìm kiếm, phím tắt) và ScrollRestoration nằm ở GocApp — khung
// không gắn lại (gắn hai lần sẽ nghe phím hai lần).
import { useCallback, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { BannerMatKetNoi } from '../ket-noi'
import { useBeRong } from './be-rong'
import ChanTrang from './ChanTrang'
import Drawer, { type LyDoDongDrawer } from './Drawer'
import { ID_NOI_DUNG_CHINH, useFocusSauDieuHuong } from './focus'
import { LE_NGANG_TRANG } from './le-trang'
import LinkBoQua from './LinkBoQua'
import Rail from './Rail'
import Sidebar from './Sidebar'
import ThanhTrenMobile from './ThanhTrenMobile'
import { ThanhTrenProvider, type CauHinhThanhTren } from './thanh-tren'

export default function KhungApp() {
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
  useFocusSauDieuHuong(() => {
    if (moDrawer) dongDrawer('dieu-huong')
  })

  const hep = beRong === 'hep'

  return (
    <ThanhTrenProvider cauHinh={cauHinhThanhTren} dat={datCauHinhThanhTren}>
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
          {/* Vùng bọc dính ngay dưới top bar mobile; chỉ có khi mất kết nối. */}
          <BannerMatKetNoi
            className={`sticky z-30 bg-bg pt-4 pb-2 ${LE_NGANG_TRANG} ${
              hep ? 'top-[var(--topbar-h)]' : 'top-0'
            }`}
          />
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
      {hep && (
        <Drawer mo={moDrawer} dong={dongDrawer} lyDoDongRef={lyDoDongRef} nutMenuRef={nutMenuRef} />
      )}
    </ThanhTrenProvider>
  )
}
