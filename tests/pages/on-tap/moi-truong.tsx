// Môi trường test trang Ôn tập (bước 3): máy chủ giả theo hợp đồng phiên ôn (GET /api/on-tap, POST
// /api/on-tap/:theId theo Leitner thuần, GET /api/state cho "Tạo thẻ", GET /api/noi-dung/trang-thai) và dựng
// /on-tap, /on-tap/phien với QueryClient, toast, bộ xử lý phím tắt, router bộ nhớ (StrictMode).
import { StrictMode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { vi } from 'vitest'
import { congNgay } from '../../../shared/lich'
import { layCay } from '../../../shared/roadmap'
import {
  sauKhiOn,
  type AnhChupOnTap,
  type KetQuaOnThe,
  type TheOn,
  type YeuCauOnThe,
} from '../../../server/du-lieu/hop-dong-the'
import type { AnhChupHoc } from '../../../server/du-lieu/hop-dong-trang-thai'
import { PhimTatProvider } from '../../../src/app/phim-tat'
import { ToastProvider } from '../../../src/components/Toast'
import PhienOn from '../../../src/pages/on-tap/PhienOn'
import TrangOnTap from '../../../src/pages/on-tap/TrangOnTap'

export const cay = layCay()
export const HOM_NAY = '2026-10-27'

export interface YeuCau {
  method: string
  url: string
  body: unknown
}

export interface MayChuOnTap {
  onTap: AnhChupOnTap
  anhChup: AnhChupHoc
  yeuCau: YeuCau[]
  /** Trả lời riêng cho POST /api/on-tap/:id (mặc định: Leitner như server) */
  traLoiOn?: (theId: number, body: YeuCauOnThe) => { status: number; data: unknown }
  /** Các POST /api/on-tap/:id đã nhận */
  cacLanOn: () => { theId: number; body: YeuCauOnThe }[]
}

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

let soThe = 0
/** Thẻ đến hạn của mục thứ `i` trong cây. */
export function taoThe(i: number, dat: Partial<TheOn> = {}): TheOn {
  soThe += 1
  return {
    id: soThe,
    itemId: cay.mucHoc[i].id,
    truoc: `Câu hỏi ${soThe}`,
    sau: `Đáp án ${soThe}`,
    hop: 1,
    hanOn: HOM_NAY,
    taoLuc: `2026-10-0${(soThe % 9) + 1}T00:00:00.000Z`,
    ...dat,
  }
}

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

export function taoMayChu(): MayChuOnTap {
  const may: MayChuOnTap = {
    onTap: onTapRong(),
    anhChup: { revision: 1, trangThai: {}, luotMo: {} },
    yeuCau: [],
    cacLanOn: () =>
      may.yeuCau
        .filter((y) => y.method === 'POST' && y.url.startsWith('/api/on-tap/'))
        .map((y) => ({ theId: Number(y.url.split('/').at(-1)), body: y.body as YeuCauOnThe })),
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined
      may.yeuCau.push({ method, url, body })
      if (method === 'GET' && url === '/api/on-tap') return json(200, may.onTap)
      if (method === 'GET' && url === '/api/state') return json(200, may.anhChup)
      if (method === 'GET' && url === '/api/noi-dung/trang-thai') return json(200, {})
      const on = /^\/api\/on-tap\/(\d+)$/.exec(url)
      if (method === 'POST' && on) {
        const theId = Number(on[1])
        const yc = body as YeuCauOnThe
        if (may.traLoiOn) {
          const { status, data } = may.traLoiOn(theId, yc)
          return json(status, data)
        }
        const truoc = may.onTap.denHan.find((t) => t.id === theId)
        if (!truoc) return json(404, { loi: `Không có thẻ id ${theId}.` })
        if (yc.luyenThem) {
          const kq: KetQuaOnThe = {
            revision: may.onTap.revision,
            daDoi: false,
            luyenThem: true,
            ket: yc.ket,
            the: truoc,
            truoc,
          }
          return json(200, kq)
        }
        const { hop, hanOn } = sauKhiOn(truoc.hop, yc.ket, HOM_NAY)
        const the = { ...truoc, hop, hanOn }
        may.onTap = {
          ...may.onTap,
          revision: may.onTap.revision + 1,
          denHan: may.onTap.denHan.filter((t) => t.id !== theId),
          hanKeTiep: congNgay(HOM_NAY, 1),
        }
        const kq: KetQuaOnThe = {
          revision: may.onTap.revision,
          daDoi: true,
          luyenThem: false,
          ket: yc.ket,
          the,
          truoc,
        }
        return json(200, kq)
      }
      return json(404, { loi: `Không có ${method} ${url}` })
    }),
  )
  return may
}

function DuongDan() {
  const { pathname, hash } = useLocation()
  return <p data-testid="duong-dan">{`${pathname}${hash}`}</p>
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
                    <Route path="/on-tap" element={<TrangOnTap />} />
                    <Route path="/on-tap/phien" element={<PhienOn />} />
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
