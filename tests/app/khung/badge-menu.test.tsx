// @vitest-environment jsdom
// Badge menu với dữ liệu thật (đề xuất 3.3; bước 3): Ôn tập = số thẻ đến hạn (đặc, GET /api/on-tap), Nội dung = số
// mục Bản nháp (viền, GET /api/noi-dung/trang-thai); 0 thì ẩn, > 99 → "99+", tên truy cập đủ số; ở cả sidebar và
// rail; cập nhật sau một lần ôn (cache phiên ôn) và sau khi duyệt bài (invalidate trạng thái nội dung).
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layCay } from '../../../shared/roadmap'
import type { TrangThaiNoiDung } from '../../../shared/domain/trang-thai'
import { sauKhiOn, type AnhChupOnTap, type TheOn } from '../../../server/du-lieu/hop-dong-the'
import { KHOA_TRANG_THAI_NOI_DUNG } from '../../../src/app/du-lieu/noi-dung'
import { useOnThe } from '../../../src/app/du-lieu/on-tap'
import Rail from '../../../src/app/khung/Rail'
import Sidebar from '../../../src/app/khung/Sidebar'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { dungLocalStorageJsdom } from '../../giao-dien/moi-truong'
import { giaMatchMedia } from './moi-truong'

vi.mock('../../../src/components/tim-kiem/TimKiem', () => ({
  useTimKiem: () => ({ mo: () => {} }),
}))
vi.mock('../../../src/app/ket-noi', async (goc) => ({
  ...(await goc<typeof import('../../../src/app/ket-noi')>()),
  useKetNoi: () => ({ trangThai: 'on-dinh', meta: null, thuNgay: async () => {}, dangThu: false }),
}))

const cay = layCay()
const HOM_NAY = '2026-10-27'

interface MayChu {
  denHan: TheOn[]
  noiDung: Record<string, TrangThaiNoiDung>
}
let sv: MayChu

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

function the(id: number): TheOn {
  return {
    id,
    itemId: cay.mucHoc[id % cay.mucHoc.length].id,
    truoc: `H${id}`,
    sau: `Đ${id}`,
    hop: 1,
    hanOn: HOM_NAY,
    taoLuc: '2026-10-01T00:00:00.000Z',
  }
}

function anhChup(): AnhChupOnTap {
  return {
    revision: 1,
    homNay: HOM_NAY,
    denHan: sv.denHan,
    hop: { 1: sv.denHan.length, 2: 0, 3: 0, 4: 0, 5: 0 },
    tongThe: sv.denHan.length,
    tiLeNho30: null,
    lanOn30: { nho: 0, tong: 0 },
    hanKeTiep: null,
  }
}

/** n mục đầu của cây là Bản nháp (AI), mục kế tiếp Đã duyệt. */
function banNhap(n: number): Record<string, TrangThaiNoiDung> {
  const bang: Record<string, TrangThaiNoiDung> = {}
  cay.mucHoc.slice(0, n).forEach((m) => (bang[m.id] = { loai: 'ban-nhap', nguon: 'ai' }))
  bang[cay.mucHoc[n].id] = { loai: 'da-duyet', ngayDuyet: HOM_NAY }
  return bang
}

beforeEach(() => {
  dungLocalStorageJsdom()
  giaMatchMedia(1440)
  sv = { denHan: [the(1), the(2), the(3)], noiDung: banNhap(2) }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (method === 'GET' && url === '/api/on-tap') return json(200, anhChup())
      if (method === 'GET' && url === '/api/noi-dung/trang-thai') return json(200, sv.noiDung)
      if (method === 'GET' && url === '/api/state') {
        return json(200, { revision: 1, trangThai: {}, luotMo: {} })
      }
      const on = /^\/api\/on-tap\/(\d+)$/.exec(url)
      if (method === 'POST' && on) {
        const truoc = sv.denHan.find((t) => t.id === Number(on[1]))!
        sv.denHan = sv.denHan.filter((t) => t !== truoc)
        const the = { ...truoc, ...sauKhiOn(truoc.hop, 'nho', HOM_NAY) }
        return json(200, { revision: 2, daDoi: true, luyenThem: false, ket: 'nho', the, truoc })
      }
      return json(404, { loi: `Không có ${method} ${url}` })
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** Nút thử: một lần ôn thật (như phiên ôn) và "duyệt bài" (như hook duyệt: invalidate trạng thái nội dung). */
function NutThu() {
  const onThe = useOnThe()
  const client = useQueryClient()
  return (
    <>
      <button type="button" onClick={() => void onThe({ theId: 1, ket: 'nho' })}>
        Ôn thẻ 1
      </button>
      <button
        type="button"
        onClick={() => void client.invalidateQueries({ queryKey: KHOA_TRANG_THAI_NOI_DUNG })}
      >
        Đã duyệt
      </button>
    </>
  )
}

function mo(khung: 'sidebar' | 'rail') {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        {khung === 'sidebar' ? <Sidebar /> : <Rail />}
        <NutThu />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const menu = () => screen.getByRole('navigation', { name: 'Menu' })
const linkMenu = (ten: RegExp) => within(menu()).getByRole('link', { name: ten })

describe('badge menu từ dữ liệu thật', () => {
  it('sidebar: Ôn tập đặc, Nội dung viền, tên truy cập đủ số; cập nhật sau lần ôn và sau duyệt; axe', async () => {
    const { container } = mo('sidebar')
    const onTap = await waitFor(() => linkMenu(/^Ôn tập, 3 thẻ đến hạn$/))
    expect(onTap.querySelector('[data-kieu]')?.getAttribute('data-kieu')).toBe('dac')
    const noiDung = await waitFor(() => linkMenu(/^Nội dung, 2 bản nháp$/))
    expect(noiDung.querySelector('[data-kieu]')?.getAttribute('data-kieu')).toBe('vien')
    // Tổng quan, Lộ trình không có badge
    expect(linkMenu(/^Tổng quan$/).querySelector('[data-kieu]')).toBeNull()
    await expectNoAxeViolations(container)

    // Một lần ôn thật: badge giảm ngay theo cache, không chờ tải lại
    fireEvent.click(screen.getByRole('button', { name: 'Ôn thẻ 1' }))
    await waitFor(() => linkMenu(/^Ôn tập, 2 thẻ đến hạn$/))

    // Duyệt một bản nháp (server đổi) + invalidate trạng thái nội dung
    sv.noiDung = banNhap(1)
    fireEvent.click(screen.getByRole('button', { name: 'Đã duyệt' }))
    await waitFor(() => linkMenu(/^Nội dung, 1 bản nháp$/))

    // Duyệt nốt: 0 thì ẩn
    sv.noiDung = banNhap(0)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Đã duyệt' }))
    })
    await waitFor(() => expect(linkMenu(/^Nội dung$/).querySelector('[data-kieu]')).toBeNull())
  })

  it('rail: badge nhỏ, tên ô gồm số; > 99 hiện "99+" nhưng tên đọc đủ số; 0 thẻ thì ẩn', async () => {
    giaMatchMedia(1100)
    sv.denHan = []
    sv.noiDung = banNhap(120)
    const { container } = mo('rail')
    const noiDung = await waitFor(() => linkMenu(/^Nội dung, 120 bản nháp$/))
    expect(noiDung.querySelector('[data-kieu="vien"]')?.textContent).toBe('99+')
    await waitFor(() => expect(screen.queryAllByRole('link', { name: /thẻ đến hạn/ })).toEqual([]))
    expect(linkMenu(/^Ôn tập$/).querySelector('[data-kieu]')).toBeNull()
    await expectNoAxeViolations(container)
  })
})
