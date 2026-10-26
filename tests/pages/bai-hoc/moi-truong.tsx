// Môi trường test trang /hoc/:slug: máy chủ giả (trạng thái học của tests/app/du-lieu/gia-may-chu +
// GET /api/bai/:id) và dựng trang với đủ provider như GocApp (QueryClient, toast, phím tắt) trong StrictMode.
import { StrictMode, type ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { vi } from 'vitest'
import type { PhanHoiBai } from '../../../server/noi-dung/hop-dong-bai'
import { ToastProvider } from '../../../src/components/Toast'
import { PhimTatProvider } from '../../../src/app/phim-tat'
import TrangMucHoc from '../../../src/pages/TrangMucHoc'
import { taoGiaMayChu, type GiaMayChu } from '../../app/du-lieu/gia-may-chu'
import { cay, phanHoi } from './ho-tro'

export interface MayChuBai extends GiaMayChu {
  /** Phản hồi /api/bai theo id; không có → Chưa có nội dung */
  bai: Map<string, PhanHoiBai>
  /** Số lần GET /api/bai/<id> tới trả 500 */
  loiBai: number
}

/** Máy chủ giả: trạng thái học (gia-may-chu) + GET /api/bai/:id. */
export function taoMayChuBai(): MayChuBai {
  const goc = taoGiaMayChu() as MayChuBai
  goc.bai = new Map()
  goc.loiBai = 0
  const fetchGoc = globalThis.fetch
  const json = (status: number, data: unknown) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const m = /^\/api\/bai\/(.+)$/.exec(url)
      if (m && (init?.method ?? 'GET') === 'GET') {
        goc.yeuCau.push({ method: 'GET', url })
        if (goc.loiBai > 0) {
          goc.loiBai -= 1
          return json(500, { loi: 'Máy chủ gặp lỗi.' })
        }
        const id = decodeURIComponent(m[1])
        const mucHoc = cay.mucTheoId.get(id)!
        return json(200, goc.bai.get(id) ?? phanHoi(mucHoc, null))
      }
      return fetchGoc(input, init)
    }),
  )
  return goc
}

/** Trang hiện đường dẫn đang mở (đích của link / phím ngoài /hoc/:slug). */
function DuongDan() {
  const { pathname, search, hash } = useLocation()
  return <p data-testid="duong-dan">{`${pathname}${search}${hash}`}</p>
}

export function taoClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  })
}

/** Mở /hoc/:slug với provider như GocApp (QueryClient, toast, phím tắt). */
export function moBai(duongDan: string, client = taoClient()) {
  const ui: ReactNode = (
    <StrictMode>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <PhimTatProvider>
            <MemoryRouter initialEntries={[duongDan]}>
              <main>
                <Routes>
                  <Route path="/hoc/:slug" element={<TrangMucHoc />} />
                  <Route path="*" element={<p>Trang khác</p>} />
                </Routes>
              </main>
              <DuongDan />
            </MemoryRouter>
          </PhimTatProvider>
        </ToastProvider>
      </QueryClientProvider>
    </StrictMode>
  )
  return { client, ...render(ui) }
}

/** jsdom thiếu ResizeObserver (Radix Popper / Tooltip đo kích thước). */
export function giaResizeObserver() {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
}
