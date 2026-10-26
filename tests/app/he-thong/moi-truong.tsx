// Môi trường chung cho test router: fetch /api/meta giả, scrollTo, mở router bộ nhớ trên bảng route thật.
// File test tự vi.mock khung app, phím tắt, tìm kiếm, layCay bằng bản giả trong ./gia.
import { act, render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { datLaiTaiDau } from '../../../src/app/khung/focus'
import { cacRoute } from '../../../src/app/router'

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

/**
 * Mở router bộ nhớ ở đường dẫn như vừa tải tài liệu; chờ lượt hỏi /api/meta đầu tiên xong để không có cập
 * nhật trễ.
 */
export async function moTrang(duongDan: string) {
  datLaiTaiDau()
  const router = createMemoryRouter(cacRoute, { initialEntries: [duongDan] })
  const ketQua = await act(async () => render(<RouterProvider router={router} />))
  return { router, ...ketQua }
}
