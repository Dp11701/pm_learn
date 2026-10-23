// Bảng route (§6.1 routes P0 + P1, đề xuất 4.1). Route chưa làm tới hiện C38 "Có ở phase n".
// - Gốc: GocApp (provider) + ErrorBoundary toàn app (không cần khung).
// - Khung app: KhungApp; ErrorBoundary của route con nằm ở route không đường dẫn bên trong, nên lỗi một
//   trang vẫn hiện trong khung (sidebar còn dùng được). KhungApp hỏng → trang lỗi không khung.
// - /hoc/:slug/soan nằm ngoài khung (D27, F20).
// - /_dev/* chỉ có ở bản dev; bản build loại bỏ nhánh này (tests/go-cung/kiem-bundle).
// `handle.tenTrang` của route tĩnh để khung app (top bar mobile) đọc qua useMatches nếu cần.
import { createBrowserRouter, type RouteObject } from 'react-router'
import DangTai from '../pages/DangTai'
import KhongTimThay from '../pages/KhongTimThay'
import LoiTrang from '../pages/loi/LoiTrang'
import LoiUngDung from '../pages/loi/LoiUngDung'
import TrangLinhVuc from '../pages/TrangLinhVuc'
import TrangMucHoc from '../pages/TrangMucHoc'
import TrangPhan from '../pages/TrangPhan'
import TrangSapCo from '../pages/TrangSapCo'
import TrangSoan from '../pages/TrangSoan'
import { CAC_TRANG_TINH } from '../pages/cac-trang'
import GocApp from './GocApp'
import KhungApp from './khung/KhungApp'

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
              { path: 'hoc/:slug', Component: TrangMucHoc },
              { path: 'linh-vuc/:slug', Component: TrangLinhVuc },
              { path: 'phan/:slug', Component: TrangPhan },
              { path: '*', Component: KhongTimThay },
            ],
          },
        ],
      },
      { path: 'hoc/:slug/soan', Component: TrangSoan, ErrorBoundary: LoiUngDung },
      ...trangDev,
    ],
  },
]

export const router = createBrowserRouter(cacRoute)
