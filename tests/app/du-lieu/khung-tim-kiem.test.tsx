// @vitest-environment jsdom
// Dữ liệu học thật vào khung app (đề xuất 3.9, §6.1): khối "Đang học" ở sidebar = 3 mục Đang học mở gần
// nhất + "Xem tất cả (n)", cập nhật ngay khi đổi trạng thái; kết quả tìm kiếm C28 hiện icon + chữ trạng
// thái học thật (D2).
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layCay } from '../../../shared/roadmap'
import KhungApp from '../../../src/app/khung/KhungApp'
import { datLaiTaiDau } from '../../../src/app/khung/focus'
import { useDatTrangThai } from '../../../src/app/du-lieu/trang-thai'
import { ToastProvider } from '../../../src/components/Toast'
import HopTimKiem from '../../../src/components/tim-kiem/HopTimKiem'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { giaMatchMedia, Trang } from '../khung/moi-truong'
import { taoGiaMayChu, type GiaMayChu } from './gia-may-chu'

const cay = layCay()
const m = cay.mucHoc

let sv: GiaMayChu

beforeEach(() => {
  giaMatchMedia(1440)
  sv = taoGiaMayChu()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function taoClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

/** Nút trong trang để đổi trạng thái một mục (như C6 ở trang bài). */
function TrangDoi() {
  const { dat } = useDatTrangThai()
  return (
    <>
      <Trang ten="Bài" />
      <button type="button" onClick={() => dat(m[60].id, 'da-xong')}>
        Xong mục đang mở gần nhất
      </button>
    </>
  )
}

function moKhung(client = taoClient()) {
  datLaiTaiDau()
  const router = createMemoryRouter(
    [{ Component: KhungApp, children: [{ index: true, Component: TrangDoi }] }],
    { initialEntries: ['/'] },
  )
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

const khoiDangHoc = () => screen.getByRole('region', { name: 'Đang học' })
const tenTrongKhoi = () =>
  within(khoiDangHoc())
    .queryAllByRole('listitem')
    .map((li) => li.querySelector('[lang="en"]')?.textContent)

describe('sidebar "Đang học" từ dữ liệu thật', () => {
  it('3 mục Đang học mở gần nhất (tên từ cây) + "Xem tất cả (n)"; đổi trạng thái thì cập nhật ngay', async () => {
    const dangHoc = [m[10], m[60], m[30], m[120], m[5]]
    for (const muc of dangHoc) sv.trangThai[muc.id] = { status: 'learning' }
    sv.trangThai[m[2].id] = { status: 'done' }
    sv.luotMo = {
      [m[10].id]: '2026-10-18T09:00:00.000Z',
      [m[60].id]: '2026-10-22T14:00:00.000Z',
      [m[30].id]: '2026-10-21T08:00:00.000Z',
      [m[120].id]: '2026-10-22T10:00:00.000Z',
      // Mở gần nhất nhưng Đã xong: không vào khối.
      [m[2].id]: '2026-10-22T15:00:00.000Z',
    }
    const { container } = moKhung()
    expect(within(khoiDangHoc()).getByText('Chưa có mục đang học')).toBeTruthy()

    await waitFor(() => expect(tenTrongKhoi()).toEqual([m[60].label, m[120].label, m[30].label]))
    const tatCa = within(khoiDangHoc()).getByRole('link', { name: 'Xem tất cả (5)' })
    expect(tatCa.getAttribute('href')).toBe('/lo-trinh?xem=danh-sach&trang-thai=dang-hoc')
    expect(within(khoiDangHoc()).getAllByRole('link')[0].getAttribute('href')).toBe(
      `/hoc/${m[60].slug}`,
    )
    await expectNoAxeViolations(container)

    // Mục mở gần nhất chuyển sang Đã xong → rời khối ngay (cập nhật lạc quan), mục kế lên thay.
    await act(() =>
      fireEvent.click(screen.getByRole('button', { name: 'Xong mục đang mở gần nhất' })),
    )
    await waitFor(() => expect(tenTrongKhoi()).toEqual([m[120].label, m[30].label, m[10].label]))
    expect(within(khoiDangHoc()).getByRole('link', { name: 'Xem tất cả (4)' })).toBeTruthy()
  })

  it('không có mục Đang học → "Chưa có mục đang học"', async () => {
    sv.trangThai[m[0].id] = { status: 'done' }
    moKhung()
    await waitFor(() => expect(sv.dem('GET /api/state')).toBe(1))
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(within(khoiDangHoc()).getByText('Chưa có mục đang học')).toBeTruthy()
    expect(within(khoiDangHoc()).queryAllByRole('link')).toEqual([])
  })
})

describe('tìm kiếm C28: icon + chữ trạng thái học thật', () => {
  it('kết quả hiện đúng trạng thái của từng mục; mục không có khoá là Chưa học', async () => {
    const [dangHoc, boQua, daXong, chuaHoc] = [m[0], m[1], m[2], m[3]]
    sv.trangThai = {
      [dangHoc.id]: { status: 'learning' },
      [boQua.id]: { status: 'skip', lyDoBoQua: 'Để sau' },
      [daXong.id]: { status: 'done' },
    }
    const client = taoClient()
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <HopTimKiem mo doiMo={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(sv.dem('GET /api/state')).toBe(1))
    const oTim = screen.getByRole('combobox', { name: 'Tìm mục' })

    for (const [muc, chu] of [
      [dangHoc, 'Đang học'],
      [boQua, 'Bỏ qua'],
      [daXong, 'Đã xong'],
      [chuaHoc, 'Chưa học'],
    ] as const) {
      fireEvent.change(oTim, { target: { value: muc.label } })
      const hang = await waitFor(() => {
        const ds = screen
          .getAllByRole('option')
          .filter((o) => o.querySelector('[lang="en"]')?.textContent === muc.label)
        expect(ds.length).toBeGreaterThan(0)
        return ds[0]
      })
      await waitFor(() => expect(within(hang).getByText(chu)).toBeTruthy())
      // Icon trạng thái đi kèm chữ (D2).
      expect(within(hang).getByText(chu).querySelector('svg')).not.toBeNull()
    }
  })
})
