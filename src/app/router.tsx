import { createBrowserRouter, type RouteObject } from 'react-router'
import TrangTam from '../pages/TrangTam'
import KhongTimThay from '../pages/KhongTimThay'
import DangTai from '../pages/DangTai'

// Trang chỉ có ở bản dev (gallery, so frame). Bản build loại bỏ nhánh này.
const trangDev: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/_dev/thanh-phan',
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

export const router = createBrowserRouter([
  { path: '/', Component: TrangTam },
  ...trangDev,
  { path: '*', Component: KhongTimThay },
])
