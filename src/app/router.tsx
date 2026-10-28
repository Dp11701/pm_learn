// Bảng route (§6.1 routes P0, đề xuất 4.1; phạm vi rút gọn mục 10). Route chưa làm tới hiện C38 "Có ở phase n"
// (CAC_TRANG_TINH; từ bước 2 không còn route nào như vậy).
// - Gốc: GocApp (provider) + ErrorBoundary toàn app (không cần khung).
// - Khung app: KhungApp; ErrorBoundary của route con nằm ở route không đường dẫn bên trong, nên lỗi một
//   trang vẫn hiện trong khung (sidebar còn dùng được). KhungApp hỏng → trang lỗi không khung.
// - Chỉ còn /, /lo-trinh, /on-tap, /on-tap/phien, /noi-dung, /linh-vuc/:slug, /hoc/:slug. Route của phần đã bỏ
//   (trang P1, /phan/:slug, trình soạn …/soan, /hoc/:slug/ban-cua-toi/:id) không còn: rơi vào '*' → 404 trong khung.
// - /noi-dung là trang thật từ phase 2b (tab Nhập; Độ phủ, Chờ duyệt là C38 trong trang tới phase 7a).
// - / (Tổng quan gọn), /lo-trinh (danh sách có bộ lọc), /linh-vuc/:slug là trang thật từ bước 2.
// - /_dev/* chỉ có ở bản dev; bản build loại bỏ nhánh này (scripts/kiem-bundle.ts).
import { createBrowserRouter, type RouteObject } from 'react-router'
import DangTai from '../pages/DangTai'
import KhongTimThay from '../pages/KhongTimThay'
import LoiTrang from '../pages/loi/LoiTrang'
import LoiUngDung from '../pages/loi/LoiUngDung'
import TrangLinhVuc from '../pages/TrangLinhVuc'
import TrangLoTrinh from '../pages/lo-trinh/TrangLoTrinh'
import TrangMucHoc from '../pages/TrangMucHoc'
import TrangSapCo from '../pages/TrangSapCo'
import TrangNoiDung from '../pages/noi-dung/TrangNoiDung'
import TrangTongQuan from '../pages/tong-quan/TrangTongQuan'
import TrangOnTap from '../pages/on-tap/TrangOnTap'
import PhienOn from '../pages/on-tap/PhienOn'
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
                index: true,
                Component: TrangTongQuan,
                handle: { tenTrang: 'Tổng quan' } satisfies HandleRoute,
              },
              {
                path: 'noi-dung',
                Component: TrangNoiDung,
                handle: { tenTrang: 'Nội dung' } satisfies HandleRoute,
              },
              {
                path: 'lo-trinh',
                Component: TrangLoTrinh,
                handle: { tenTrang: 'Lộ trình' } satisfies HandleRoute,
              },
              { path: 'hoc/:slug', Component: TrangMucHoc },
              { path: 'linh-vuc/:slug', Component: TrangLinhVuc },
              { path: 'on-tap', Component: TrangOnTap },
              { path: 'on-tap/phien', Component: PhienOn },
              { path: '*', Component: KhongTimThay },
            ],
          },
        ],
      },
      ...trangDev,
    ],
  },
]

export const router = createBrowserRouter(cacRoute)
