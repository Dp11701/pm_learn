// Môi trường chung cho test router: fetch /api/meta giả, scrollTo, mở router bộ nhớ trên bảng route thật.
// Khung app, phím tắt, tìm kiếm là module của agent khác: test file tự vi.mock bằng các bản giả ở đây.
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { cacRoute } from '../../../src/app/router'

export function KhungGia() {
  return (
    <div data-testid="khung">
      <main id="noi-dung-chinh">
        <Outlet />
      </main>
    </div>
  )
}

export function QuaMat({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function datMoiTruong() {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            revision: 1,
            now: '2026-10-23T08:00:00.000Z',
            homNay: '2026-10-23',
            soMucHoc: 1,
          }),
        ),
      ),
    ),
  )
  vi.stubGlobal('scrollTo', () => {})
}

export function moTrang(duongDan: string) {
  const router = createMemoryRouter(cacRoute, { initialEntries: [duongDan] })
  const ketQua = render(<RouterProvider router={router} />)
  return { router, ...ketQua }
}
