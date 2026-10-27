// Môi trường test vòng 4 bước trên trang bài (phase 3): ghép máy chủ giả của trang bài (trạng thái học + GET
// /api/bai, tests/pages/bai-hoc/moi-truong) với máy chủ giả dữ liệu học (GET/PUT /api/hoc, /api/the, /api/du-an,
// tests/app/du-lieu/hoc-gia-may-chu). Dựng component lẻ với đủ provider như GocApp (QueryClient, toast, router).
import { StrictMode, type ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { ToastProvider } from '../../../src/components/Toast'
import { PhimTatProvider } from '../../../src/app/phim-tat'
import { taoGiaMayChuHoc, type GiaMayChuHoc } from '../../app/du-lieu/hoc-gia-may-chu'
import { taoClient, taoMayChuBai, type MayChuBai } from '../../pages/bai-hoc/moi-truong'

export interface MayChuDayDu {
  bai: MayChuBai
  hoc: GiaMayChuHoc
}

const API_HOC = /^\/api\/(hoc|the|du-an|dong-ho|phien-gio)(\/|\?|$)/

/** Hai máy chủ giả sau một `fetch`: dữ liệu học → máy chủ học, còn lại → máy chủ trang bài. */
export function taoMayChuDayDu(): MayChuDayDu {
  const bai = taoMayChuBai()
  const fetchBai = globalThis.fetch
  const hoc = taoGiaMayChuHoc()
  const fetchHoc = globalThis.fetch
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    API_HOC.test(String(input)) ? fetchHoc(input, init) : fetchBai(input, init),
  )
  return { bai, hoc }
}

/** Dựng `ui` với provider như GocApp (StrictMode, QueryClient, toast, phím tắt, router). */
export function dungVoiProvider(ui: ReactNode, client = taoClient()) {
  const kq = render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <PhimTatProvider>
            <MemoryRouter>
              <main>{ui}</main>
            </MemoryRouter>
          </PhimTatProvider>
        </ToastProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
  return { client, ...kq }
}
