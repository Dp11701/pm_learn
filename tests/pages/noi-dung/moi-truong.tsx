// Môi trường test trang /noi-dung (phase 2b): máy chủ giả theo hợp đồng nhập (fetch giả: POST /api/nhap/*,
// /api/noi-dung/giu-ban-cu/:id, GET /api/noi-dung/trang-thai) và dựng trang với QueryClient, toast, router.
import { StrictMode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { vi } from 'vitest'
import type { TrangThaiNoiDung } from '../../../shared/domain/trang-thai'
import { ToastProvider } from '../../../src/components/Toast'
import TrangNoiDung from '../../../src/pages/noi-dung/TrangNoiDung'

export interface YeuCau {
  method: string
  url: string
  body: unknown
}

export type TraLoi = (
  body: unknown,
) => { status?: number; data: unknown } | Promise<{ status?: number; data: unknown }>

export interface MayChuNhap {
  yeuCau: YeuCau[]
  /** "POST /api/nhap/kiem-tra" → hàm trả lời */
  traLoi: Map<string, TraLoi>
  trangThaiNoiDung: Record<string, TrangThaiNoiDung>
  /** Các yêu cầu tới một đường dẫn (không tính GET trạng thái nội dung). */
  goi: (khoa: string) => YeuCau[]
}

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export function taoMayChu(): MayChuNhap {
  const may: MayChuNhap = {
    yeuCau: [],
    traLoi: new Map(),
    trangThaiNoiDung: {},
    goi: (khoa) => may.yeuCau.filter((y) => `${y.method} ${y.url}` === khoa),
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined
      if (method === 'GET' && url === '/api/noi-dung/trang-thai') {
        return json(200, may.trangThaiNoiDung)
      }
      may.yeuCau.push({ method, url, body })
      const tl = may.traLoi.get(`${method} ${url}`)
      if (!tl) return json(404, { loi: `Không có ${method} ${url}` })
      const { status = 200, data } = await tl(body)
      return json(status, data)
    }),
  )
  return may
}

function DuongDan() {
  const { pathname, search } = useLocation()
  return <p data-testid="duong-dan">{`${pathname}${search}`}</p>
}

export function taoClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  })
}

export function moTrang(duongDan = '/noi-dung', client = taoClient()) {
  return {
    client,
    ...render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <ToastProvider>
            <MemoryRouter initialEntries={[duongDan]}>
              <main>
                <Routes>
                  <Route path="/noi-dung" element={<TrangNoiDung />} />
                  <Route path="*" element={<p>Trang khác</p>} />
                </Routes>
              </main>
              <DuongDan />
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      </StrictMode>,
    ),
  }
}
