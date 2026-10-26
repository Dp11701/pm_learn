// Phần tử gốc của router: các provider dùng chung rồi <Outlet/>. Lỗi ở đây (kể cả cây roadmap không nạp
// được) do ErrorBoundary gốc (src/pages/loi/LoiUngDung) hiện, không cần khung app.
import { useState } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { layCay } from '../../shared/roadmap'
import { ToastProvider } from '../components/Toast'
import { TimKiemProvider } from '../components/tim-kiem/TimKiem'
import { KetNoiProvider, ThongBaoKetNoiLai } from './ket-noi'
import { useKetThucTaiDau } from './khung/focus'
import { PhimTatProvider } from './phim-tat'

/**
 * Một QueryClient cho app. Máy chủ chạy cục bộ nên networkMode 'always': vẫn gọi API khi trình duyệt
 * báo mất mạng internet. Mất kết nối máy chủ do KetNoiProvider báo, không tự thử lại nhiều lần.
 */
export function taoQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { networkMode: 'always', retry: 1, refetchOnWindowFocus: false },
      mutations: { networkMode: 'always' },
    },
  })
}

export default function GocApp() {
  // Cây lỗi → ném LoiCay ngay ở gốc → trang "Không đọc được cây roadmap" (bất biến 1).
  layCay()
  const [queryClient] = useState(taoQueryClient)
  // Khép "lần tải đầu của tài liệu" sau lần gắn đầu: từ đó mọi lần đổi trang đều đưa focus về H1 (§11).
  useKetThucTaiDau()
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <KetNoiProvider>
          <ThongBaoKetNoiLai />
          <PhimTatProvider>
            <TimKiemProvider>
              <Outlet />
            </TimKiemProvider>
          </PhimTatProvider>
        </KetNoiProvider>
      </ToastProvider>
      <ScrollRestoration />
    </QueryClientProvider>
  )
}
