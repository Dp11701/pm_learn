// Môi trường test khung app: matchMedia theo bề rộng giả (đổi được giữa chừng), router bộ nhớ với các
// trang giả có H1 (TieuDeTrang), bọc DuLieuKhungProvider khi cần dữ liệu học. Gốc router giả làm việc của
// GocApp với focus: khép "lần tải đầu" sau lần gắn đầu; mỗi moKhung coi như tải lại tài liệu.
import { act, render } from '@testing-library/react'
import { Link, Outlet, RouterProvider, createMemoryRouter, type RouteObject } from 'react-router'
import { vi } from 'vitest'
import TieuDeTrang from '../../../src/components/TieuDeTrang'
import KhungApp from '../../../src/app/khung/KhungApp'
import { datLaiTaiDau, useFocusSauDieuHuong, useKetThucTaiDau } from '../../../src/app/khung/focus'
import TrangMucHoc from '../../../src/pages/TrangMucHoc'
import { DuLieuKhungProvider, type DuLieuKhung } from '../../../src/app/khung/du-lieu-khung'
import { useThanhTrenMobile, type CapCha } from '../../../src/app/khung/thanh-tren'

let beRong = 1440
const nguoiNghe = new Set<() => void>()

function khop(q: string): boolean {
  const min = /\(min-width:\s*(\d+)px\)/.exec(q)
  if (min) return beRong >= Number(min[1])
  const max = /\(max-width:\s*([\d.]+)px\)/.exec(q)
  if (max) return beRong <= Number(max[1])
  return false
}

/** Gắn window.matchMedia giả; gọi trong beforeEach. */
export function giaMatchMedia(rong = 1440): void {
  beRong = rong
  nguoiNghe.clear()
  vi.stubGlobal('matchMedia', (q: string) => ({
    get matches() {
      return khop(q)
    },
    media: q,
    onchange: null,
    addEventListener: (_: string, f: () => void) => nguoiNghe.add(f),
    removeEventListener: (_: string, f: () => void) => nguoiNghe.delete(f),
    addListener: (f: () => void) => nguoiNghe.add(f),
    removeListener: (f: () => void) => nguoiNghe.delete(f),
    dispatchEvent: () => false,
  }))
  // Radix Tooltip / Popper đo kích thước khi mở.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
}

/** Đổi bề rộng cửa sổ giữa chừng (bắn sự kiện change của mọi media query). */
export function doiBeRong(rong: number): void {
  beRong = rong
  act(() => nguoiNghe.forEach((f) => f()))
}

export function Trang({ ten }: { ten: string }) {
  return (
    <div>
      <TieuDeTrang tenTrang={ten}>{ten}</TieuDeTrang>
      <button type="button">Nút trong trang {ten}</button>
    </div>
  )
}

export function TrangCoCapCha({ capCha }: { capCha: CapCha }) {
  useThanhTrenMobile({ capCha })
  return <Trang ten="Trang có cấp cha" />
}

/** Trang tập trung ngoài khung (như trình soạn): tự đưa focus về H1 khi vào bằng điều hướng. */
function TrangNgoaiKhung() {
  useFocusSauDieuHuong()
  return (
    <main id="noi-dung-chinh" tabIndex={-1}>
      <TieuDeTrang tenTrang="Trang ngoài khung">Trang ngoài khung</TieuDeTrang>
      <Link to="/">Về khung</Link>
    </main>
  )
}

function GocThu() {
  useKetThucTaiDau()
  return <Outlet />
}

export function cacRouteThu(capCha?: CapCha): RouteObject[] {
  return [
    {
      Component: GocThu,
      children: [
        { path: '/ngoai', Component: TrangNgoaiKhung },
        {
          Component: KhungApp,
          children: [
            { index: true, element: <Trang ten="Tổng quan" />, handle: { tenTrang: 'Tổng quan' } },
            {
              path: 'lo-trinh',
              element: <Trang ten="Lộ trình" />,
              handle: { tenTrang: 'Lộ trình' },
            },
            { path: 'on-tap', element: <Trang ten="Ôn tập" />, handle: { tenTrang: 'Ôn tập' } },
            {
              path: 'on-tap/phien',
              element: <Trang ten="Phiên ôn" />,
              handle: { tenTrang: 'Phiên ôn' },
            },
            { path: 'khong-h1', element: <p>Trang không có tiêu đề</p> },
            {
              path: 'cap-cha',
              element: capCha ? <TrangCoCapCha capCha={capCha} /> : <Outlet />,
            },
            // Bài học thật: slug sai → KhongTimThay thật trong khung (404 không tô mục menu).
            { path: 'hoc/:slug', Component: TrangMucHoc },
            { path: '*', element: <Trang ten="Trang khác" /> },
          ],
        },
      ],
    },
  ]
}

export function moKhung(
  duongDan = '/',
  { duLieu, capCha }: { duLieu?: DuLieuKhung; capCha?: CapCha } = {},
) {
  datLaiTaiDau()
  const router = createMemoryRouter(cacRouteThu(capCha), { initialEntries: [duongDan] })
  const ui = <RouterProvider router={router} />
  const ketQua = render(
    duLieu ? <DuLieuKhungProvider giaTri={duLieu}>{ui}</DuLieuKhungProvider> : ui,
  )
  return { router, ...ketQua }
}

/** Radix trả focus khi đóng dialog sau một nhịp setTimeout(0). */
export const choMotNhip = () => act(() => new Promise((r) => setTimeout(r, 0)))
