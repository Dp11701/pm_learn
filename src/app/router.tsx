// Bảng route (§6.1 routes P0 + P1, đề xuất 4.1). Route chưa làm tới hiện C38 "Có ở phase n".
// - Gốc: GocApp (provider) + ErrorBoundary toàn app (không cần khung).
// - Khung app: KhungApp; ErrorBoundary của route con nằm ở route không đường dẫn bên trong, nên lỗi một
//   trang vẫn hiện trong khung (sidebar còn dùng được). KhungApp hỏng → trang lỗi không khung.
// - Trình soạn /hoc/:slug/soan, /linh-vuc/:slug/soan, /phan/:slug/soan (đề xuất 4.1 "Route thêm") nằm ngoài
//   khung (D27, F20); slug sai thì trang soạn dựng khung app và route con index (KhongTimThay) hiện trong
//   <Outlet/> của khung, nên 404 vẫn ở trong khung (D24).
// - /hoc/:slug/ban-cua-toi/:id (Bản của tôi, phase 7c) ở trong khung.
// - /noi-dung là trang thật từ phase 2b (tab Nhập; Độ phủ, Chờ duyệt là C38 trong trang tới phase 7a).
// - /_dev/* chỉ có ở bản dev; bản build loại bỏ nhánh này (scripts/kiem-bundle.ts).
import { createBrowserRouter, type RouteObject } from 'react-router'
import DangTai from '../pages/DangTai'
import KhongTimThay from '../pages/KhongTimThay'
import LoiTrang from '../pages/loi/LoiTrang'
import LoiUngDung from '../pages/loi/LoiUngDung'
import TrangLinhVuc from '../pages/TrangLinhVuc'
import TrangMucHoc from '../pages/TrangMucHoc'
import TrangPhan from '../pages/TrangPhan'
import TrangSapCo from '../pages/TrangSapCo'
import TrangBanCuaToi from '../pages/TrangBanCuaToi'
import TrangNoiDung from '../pages/noi-dung/TrangNoiDung'
import TrangSoan, { TrangSoanTongQuan } from '../pages/TrangSoan'
import { CAC_TRANG_TINH } from '../pages/cac-trang'
import GocApp from './GocApp'
import KhungApp from './khung/KhungApp'

/** `handle` của route: khung app đọc `tenTrang` qua useMatches làm tiêu đề top bar mobile (ThanhTrenMobile). */
export interface HandleRoute {
  tenTrang?: string
}

const trangTinh: RouteObject[] = CAC_TRANG_TINH.map(({ duongDan, tenTrang, phase, moTa }) => {
  const route = {
    element: <TrangSapCo tenTrang={tenTrang} phase={phase} moTa={moTa} />,
    handle: { tenTrang } satisfies HandleRoute,
  }
  return duongDan === '' ? { index: true, ...route } : { path: duongDan, ...route }
})

const trangDev: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/_dev/thanh-phan',
        HydrateFallback: DangTai,
        lazy: async () => ({ Component: (await import('../dev/ThanhPhan')).default }),
      },
      {
        path: '/_dev/thanh-phan/:phan',
        HydrateFallback: DangTai,
        lazy: async () => ({ Component: (await import('../dev/ThanhPhan')).default }),
      },
      {
        path: '/_dev/frame/:ma',
        HydrateFallback: DangTai,
        lazy: async () => ({ Component: (await import('../dev/XemFrame')).default }),
      },
    ]
  : []

/** Trang soạn ngoài khung; route con index là 404 hiện trong khung khi slug sai. */
const trangSoan: RouteObject[] = [
  { path: 'hoc/:slug/soan', element: <TrangSoan /> },
  { path: 'linh-vuc/:slug/soan', element: <TrangSoanTongQuan loai="area" /> },
  { path: 'phan/:slug/soan', element: <TrangSoanTongQuan loai="part" /> },
].map((route) => ({
  ...route,
  ErrorBoundary: LoiUngDung,
  children: [{ index: true, Component: KhongTimThay }],
}))

export const cacRoute: RouteObject[] = [
  {
    Component: GocApp,
    ErrorBoundary: LoiUngDung,
    HydrateFallback: DangTai,
    children: [
      {
        Component: KhungApp,
        ErrorBoundary: LoiUngDung,
        children: [
          {
            ErrorBoundary: LoiTrang,
            children: [
              ...trangTinh,
              {
                path: 'noi-dung',
                Component: TrangNoiDung,
                handle: { tenTrang: 'Nội dung' } satisfies HandleRoute,
              },
              { path: 'hoc/:slug', Component: TrangMucHoc },
              { path: 'hoc/:slug/ban-cua-toi/:id', Component: TrangBanCuaToi },
              { path: 'linh-vuc/:slug', Component: TrangLinhVuc },
              { path: 'phan/:slug', Component: TrangPhan },
              { path: '*', Component: KhongTimThay },
            ],
          },
        ],
      },
      ...trangSoan,
      ...trangDev,
    ],
  },
]

export const router = createBrowserRouter(cacRoute)
