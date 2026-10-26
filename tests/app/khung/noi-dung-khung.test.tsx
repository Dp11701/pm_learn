// @vitest-environment jsdom
// Khung app với KetNoiProvider thật (không giả useKetNoi().meta): /api/meta trả `noiDung` như server phase 2b.
// - Revision nội dung đổi (Claude ghi file, sửa ngoài app) → bài đang mở ở MỌI trang tải lại (đề xuất 1.6 "Bản
//   nháp đã nhận bị sửa ngoài app: đọc thẳng bản mới") — khung gắn useTheoDoiNoiDung, không chỉ trang Nội dung.
// - Banner một lần sau khi thay file cây (1.3 bước 4): câu nguyên văn, đóng → POST thay-cay/da-xem, focus về H1;
//   gửi lỗi → banner hiện lại + toast lỗi.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KhungApp from '../../../src/app/khung/KhungApp'
import { datLaiTaiDau } from '../../../src/app/khung/focus'
import { KetNoiProvider, type BannerThayCay } from '../../../src/app/ket-noi'
import TieuDeTrang from '../../../src/components/TieuDeTrang'
import { ToastProvider } from '../../../src/components/Toast'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { dungLocalStorageJsdom } from '../../giao-dien/moi-truong'
import { giaMatchMedia } from './moi-truong'

vi.mock('../../../src/components/tim-kiem/TimKiem', () => ({
  useTimKiem: () => ({ mo: () => {} }),
}))

interface MayChu {
  noiDung: { revision: number; chuaNhan: number; thayCay: BannerThayCay | null } | undefined
  /** Thân bài trên "đĩa" */
  bai: string
  soLanTaiBai: number
  daXem: number
  daXemLoi: boolean
}
let sv: MayChu

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  dungLocalStorageJsdom()
  giaMatchMedia(1440)
  sv = { noiDung: undefined, bai: 'Bản 1', soLanTaiBai: 0, daXem: 0, daXemLoi: false }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (url === '/api/meta') {
        return json({
          revision: 1,
          now: '2026-10-26T08:00:00.000Z',
          homNay: '2026-10-26',
          soMucHoc: 5,
          ...(sv.noiDung ? { noiDung: sv.noiDung } : {}),
        })
      }
      if (url === '/api/bai-gia') {
        sv.soLanTaiBai += 1
        return json({ than: sv.bai })
      }
      if (method === 'POST' && url === '/api/noi-dung/thay-cay/da-xem') {
        sv.daXem += 1
        if (sv.daXemLoi) return json({ loi: 'Máy chủ bận.' }, 500)
        if (sv.noiDung)
          sv.noiDung = { ...sv.noiDung, thayCay: null, revision: sv.noiDung.revision + 1 }
        return json({ revision: sv.noiDung?.revision ?? 1 })
      }
      return json({ loi: `Không có ${method} ${url}` }, 404)
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** Trang bài giả: dữ liệu dưới khoá ['noi-dung', 'bai', …] như useBai. */
function BaiGia() {
  const q = useQuery({
    queryKey: ['noi-dung', 'bai', 'x'],
    queryFn: async () => ((await (await fetch('/api/bai-gia')).json()) as { than: string }).than,
    staleTime: Number.POSITIVE_INFINITY,
  })
  return (
    <div>
      <TieuDeTrang tenTrang="Bài giả">Bài giả</TieuDeTrang>
      <p data-testid="than">{q.data ?? '…'}</p>
    </div>
  )
}

async function moKhung() {
  datLaiTaiDau()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [{ Component: KhungApp, children: [{ path: '/hoc/x', Component: BaiGia }] }],
    { initialEntries: ['/hoc/x'] },
  )
  const kq = render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <KetNoiProvider>
          <RouterProvider router={router} />
        </KetNoiProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )
  await screen.findByText('Bản 1')
  return kq
}

/** Hỏi lại /api/meta ngay (tab hiện lại) thay vì chờ chu kỳ 5 giây. */
async function hoiLaiMeta() {
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

describe('khung theo dõi revision nội dung của /api/meta (mọi trang)', () => {
  it('file bài sửa ngoài app (revision nội dung tăng) → bài đang mở tải lại, hiện bản mới', async () => {
    sv.noiDung = { revision: 4, chuaNhan: 0, thayCay: null }
    await moKhung()
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(1))
    expect(sv.soLanTaiBai).toBe(1)

    // Cùng revision → không tải lại
    await hoiLaiMeta()
    expect(sv.soLanTaiBai).toBe(1)

    sv.bai = 'Bản 2 sửa ngoài app'
    sv.noiDung = { revision: 5, chuaNhan: 0, thayCay: null }
    await hoiLaiMeta()
    expect(await screen.findByText('Bản 2 sửa ngoài app')).toBeTruthy()
    expect(sv.soLanTaiBai).toBe(2)
  })
})

describe('banner thay cây (đề xuất 1.3 bước 4)', () => {
  const thayCay: BannerThayCay = { them: 2, bo: 1, doiTen: 3, luc: '2026-10-26T07:00:00.000Z' }

  it('câu nguyên văn ở đầu <main>; đóng → POST da-xem một lần, banner mất, focus về H1; axe', async () => {
    sv.noiDung = { revision: 4, chuaNhan: 0, thayCay }
    const { container } = await moKhung()
    const tieuDe = await screen.findByText(
      'Cây roadmap vừa cập nhật: +2 mục, −1 mục, 3 mục đổi tên',
    )
    const banner = tieuDe.closest('[role="status"]') as HTMLElement
    expect(screen.getByRole('main').contains(banner)).toBe(true)
    // Banner trước H1 của trang
    expect(
      banner.compareDocumentPosition(screen.getByRole('heading', { level: 1 })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    await expectNoAxeViolations(container)

    const nutDong = within(banner).getByRole('button', { name: 'Đóng thông báo' })
    nutDong.focus()
    fireEvent.click(nutDong)
    await waitFor(() => expect(screen.queryByText(/Cây roadmap vừa cập nhật/)).toBeNull())
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
    await waitFor(() => expect(sv.daXem).toBe(1))
    // Meta mới không còn banner → không hiện lại
    await hoiLaiMeta()
    expect(screen.queryByText(/Cây roadmap vừa cập nhật/)).toBeNull()
    expect(sv.daXem).toBe(1)
  })

  it('POST da-xem lỗi → banner hiện lại + toast lỗi', async () => {
    sv.noiDung = { revision: 4, chuaNhan: 0, thayCay }
    sv.daXemLoi = true
    await moKhung()
    const tieuDe = await screen.findByText(/Cây roadmap vừa cập nhật/)
    const banner = tieuDe.closest('[role="status"]') as HTMLElement
    fireEvent.click(within(banner).getByRole('button', { name: 'Đóng thông báo' }))
    expect((await screen.findByText(/Không tắt được thông báo cây roadmap/)).textContent).toContain(
      'Máy chủ bận.',
    )
    expect(screen.getByText(/Cây roadmap vừa cập nhật/)).toBeTruthy()
  })

  it('không có thayCay (hay server chưa gửi noiDung) → không có banner', async () => {
    await moKhung()
    await hoiLaiMeta()
    expect(screen.queryByText(/Cây roadmap vừa cập nhật/)).toBeNull()
  })
})
