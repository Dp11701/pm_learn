// Môi trường test trang bước 2 (Lộ trình, Lĩnh vực, Tổng quan): máy chủ giả trong bộ nhớ theo hợp đồng API
// (GET /api/state, GET /api/noi-dung/trang-thai, GET /api/on-tap, POST /api/trang-thai/hang-loat (+ /hoan-tac) theo
// đúng quy tắc của server/du-lieu/trang-thai.ts) và dựng các trang với QueryClient, toast, phím tắt, router bộ nhớ
// (StrictMode). Dùng cây thật (layCay) — tên mục chỉ lấy từ cây.
import { StrictMode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { vi } from 'vitest'
import type { TrangThaiHoc, TrangThaiNoiDung } from '../../../shared/domain/trang-thai'
import { layCay } from '../../../shared/roadmap'
import type { AnhChupOnTap } from '../../../server/du-lieu/hop-dong-the'
import {
  giaTriCua,
  mucCua,
  sangDb,
  type AnhChupHoc,
  type GiaTriTrangThai,
  type KetQuaDatHangLoat,
  type KetQuaHoanTacHangLoat,
  type TrangThaiHangLoat,
} from '../../../server/du-lieu/hop-dong-trang-thai'
import { PhimTatProvider } from '../../../src/app/phim-tat'
import { ToastProvider } from '../../../src/components/Toast'
import TrangLoTrinh from '../../../src/pages/lo-trinh/TrangLoTrinh'
import TrangLinhVuc from '../../../src/pages/TrangLinhVuc'
import TrangTongQuan from '../../../src/pages/tong-quan/TrangTongQuan'

export const cay = layCay()
export const HOM_NAY = '2026-10-28'

export interface YeuCau {
  method: string
  url: string
  body: unknown
}

export interface MayChu {
  anhChup: AnhChupHoc
  /** id → trạng thái nội dung (chỉ mục có file) */
  noiDung: Record<string, TrangThaiNoiDung>
  onTap: AnhChupOnTap
  yeuCau: YeuCau[]
  /** Trả lỗi 500 cho GET /api/state */
  loiState?: boolean
  /** Trả lỗi 500 cho GET /api/noi-dung/trang-thai */
  loiNoiDung?: boolean
}

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export function onTapRong(dat: Partial<AnhChupOnTap> = {}): AnhChupOnTap {
  return {
    revision: 1,
    homNay: HOM_NAY,
    denHan: [],
    hop: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    tongThe: 0,
    tiLeNho30: null,
    lanOn30: { nho: 0, tong: 0 },
    hanKeTiep: null,
    ...dat,
  }
}

/** Ảnh chụp từ bảng id → trạng thái (Chưa học = không có khoá). */
export function anhChupTu(
  bang: Record<string, TrangThaiHoc>,
  dat: Partial<AnhChupHoc> = {},
): AnhChupHoc {
  const trangThai: AnhChupHoc['trangThai'] = {}
  for (const [id, tt] of Object.entries(bang)) {
    const muc = mucCua({ trangThai: tt })
    if (muc) trangThai[id] = muc
  }
  return { revision: 1, trangThai, luotMo: {}, canOnLai: [], ...dat }
}

export function taoMayChu(): MayChu {
  const may: MayChu = {
    anhChup: anhChupTu({}),
    noiDung: {},
    onTap: onTapRong(),
    yeuCau: [],
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined
      may.yeuCau.push({ method, url, body })
      if (method === 'GET' && url === '/api/state') {
        return may.loiState ? json(500, { loi: 'hỏng' }) : json(200, may.anhChup)
      }
      if (method === 'GET' && url === '/api/noi-dung/trang-thai') {
        return may.loiNoiDung ? json(500, { loi: 'hỏng' }) : json(200, may.noiDung)
      }
      if (method === 'GET' && url === '/api/on-tap') return json(200, may.onTap)
      if (method === 'POST' && url === '/api/trang-thai/hang-loat') {
        const { ids, trangThai } = body as { ids: string[]; trangThai: TrangThaiHangLoat }
        if ((trangThai as string) === 'da-xong') return json(400, { loi: 'Không đặt Đã xong.' })
        const moi = mucCua({ trangThai })
        const daDoi: string[] = []
        const truoc: Record<string, GiaTriTrangThai> = {}
        const bang = { ...may.anhChup.trangThai }
        for (const id of ids) {
          const cu = bang[id] ?? null
          if ((cu?.status ?? null) === (moi?.status ?? null)) continue
          truoc[id] = giaTriCua(cu)
          if (moi) bang[id] = moi
          else delete bang[id]
          daDoi.push(id)
        }
        const revision = may.anhChup.revision + (daDoi.length > 0 ? 1 : 0)
        may.anhChup = { ...may.anhChup, trangThai: bang, revision }
        const kq: KetQuaDatHangLoat = { revision, trangThai, daDoi, truoc }
        return json(200, kq)
      }
      if (method === 'POST' && url === '/api/trang-thai/hang-loat/hoan-tac') {
        const { trangThai, truoc } = body as {
          trangThai: TrangThaiHangLoat
          truoc: Record<string, GiaTriTrangThai>
        }
        const daDat = sangDb(trangThai)
        const bang = { ...may.anhChup.trangThai }
        const daKhoiPhuc: string[] = []
        const giuNguyen: string[] = []
        for (const [id, g] of Object.entries(truoc)) {
          if ((bang[id]?.status ?? null) !== daDat) {
            giuNguyen.push(id)
            continue
          }
          const muc = mucCua(g)
          if (muc) bang[id] = muc
          else delete bang[id]
          daKhoiPhuc.push(id)
        }
        const revision = may.anhChup.revision + (daKhoiPhuc.length > 0 ? 1 : 0)
        may.anhChup = { ...may.anhChup, trangThai: bang, revision }
        const kq: KetQuaHoanTacHangLoat = { revision, daKhoiPhuc, giuNguyen }
        return json(200, kq)
      }
      return json(404, { loi: `Không có ${method} ${url}` })
    }),
  )
  return may
}

/** Các lần gọi API ghi (method + url + body). */
export function cacLanGhi(may: MayChu): YeuCau[] {
  return may.yeuCau.filter((y) => y.method !== 'GET')
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

export function moTrang(duongDan: string, client = taoClient()) {
  return {
    client,
    ...render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <ToastProvider>
            <PhimTatProvider>
              <MemoryRouter initialEntries={[duongDan]}>
                <main>
                  <Routes>
                    <Route path="/" element={<TrangTongQuan />} />
                    <Route path="/lo-trinh" element={<TrangLoTrinh />} />
                    <Route path="/linh-vuc/:slug" element={<TrangLinhVuc />} />
                    <Route path="*" element={<p>Trang khác</p>} />
                  </Routes>
                </main>
                <DuongDan />
              </MemoryRouter>
            </PhimTatProvider>
          </ToastProvider>
        </QueryClientProvider>
      </StrictMode>,
    ),
  }
}

/** Đường dẫn hiện tại của router bộ nhớ (pathname + search). */
export function duongDanHienTai(): string {
  const cac = document.querySelectorAll('[data-testid="duong-dan"]')
  return cac[cac.length - 1]?.textContent ?? ''
}
