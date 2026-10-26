// @vitest-environment jsdom
// Đồng hồ học (src/app/du-lieu/dong-ho.ts; đề xuất 3.4, Cần chốt 12; bất biến 6) trên máy chủ giả: bắt đầu lạc
// quan, đếm giây chỉ ở client; dừng; "quên tắt" (409 canHoi → hỏi → gửi lại kèm ghiGiay / null / huỷ); chuyển
// mục là một lần POST { chuyen: true } + toast Hoàn tác (chuyển lại); bấm giờ mục khác khi đang chạy = chuyển;
// tab khác vừa bật (409 dangChay) → hiện đồng hồ đó; Lịch sử: xoá lạc quan + Hoàn tác.
import { StrictMode, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { now } from '../../../shared/clock'
import { layCay } from '../../../shared/roadmap'
import { ToastProvider } from '../../../src/components/Toast'
import {
  useBatDau,
  useChuyen,
  useDongHo,
  useDung,
  useGiayDongHo,
  useHoiQuenTat,
  useXoaPhien,
} from '../../../src/app/du-lieu/dong-ho'
import { taoGiaMayChuHoc, type GiaMayChuHoc } from './hoc-gia-may-chu'

vi.mock(import('../../../src/app/ket-noi'), async (goc) => ({
  ...(await goc()),
  useKetNoi: () => ({
    trangThai: 'on-dinh' as const,
    meta: null,
    thuNgay: async () => {},
    dangThu: false,
  }),
}))

const [mucA, mucB] = layCay().mucHoc
const A = mucA.id
const B = mucB.id

let sv: GiaMayChuHoc

beforeEach(() => {
  sv = taoGiaMayChuHoc()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const h = {} as {
  dh: ReturnType<typeof useDongHo>
  giay: ReturnType<typeof useGiayDongHo>
  batDau: ReturnType<typeof useBatDau>
  dung: ReturnType<typeof useDung>
  chuyen: ReturnType<typeof useChuyen>
  xoaPhien: ReturnType<typeof useXoaPhien>
  hoi: ReturnType<typeof useHoiQuenTat>
}

function Thu() {
  h.dh = useDongHo()
  h.giay = useGiayDongHo()
  h.batDau = useBatDau()
  h.dung = useDung()
  h.chuyen = useChuyen()
  h.xoaPhien = useXoaPhien()
  h.hoi = useHoiQuenTat()
  return null
}

function dung(ui: ReactNode = <Thu />) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  })
  render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

const cho = (ms = 20) => act(() => new Promise((r) => setTimeout(r, ms)))
const daTai = () => waitFor(() => expect(h.dh.dangTai).toBe(false))
const vungToast = () => screen.getByRole('status', { name: 'Thông báo' })
const BAT_DAU = 'POST /api/dong-ho/bat-dau'
const DUNG = 'POST /api/dong-ho/dung'
const truocGiay = (giay: number) => new Date(now() - giay * 1000).toISOString()

describe('bắt đầu, đếm giây, dừng', () => {
  it('bắt đầu hiện ngay (lạc quan), POST { itemId }; đồng hồ theo batDau của server, đếm mỗi giây chỉ ở client', async () => {
    dung()
    await daTai()
    expect(h.giay).toBeNull()
    sv.gio = truocGiay(65)
    act(() => h.batDau(A))
    await waitFor(() => expect(h.dh.dangChay?.itemId).toBe(A))
    await waitFor(() => expect(sv.dangChay?.itemId).toBe(A))
    expect(sv.cacLan(BAT_DAU)[0].body).toEqual({ itemId: A })
    await waitFor(() => expect(h.dh.dangChay?.batDau).toBe(sv.gio))
    await waitFor(() => expect(h.giay).toBeGreaterThanOrEqual(65))
    const luc = h.giay!
    expect(luc).toBeLessThan(68)
    await cho(1300)
    expect(h.giay!).toBeGreaterThan(luc)
    // Chỉ một lần gọi server cho cả lúc đếm
    expect(sv.yeuCau.filter((y) => y.method !== 'GET')).toHaveLength(1)
  })

  it('bấm lại mục đang chạy: không gửi gì', async () => {
    sv.dangChay = { itemId: A, batDau: truocGiay(10) }
    dung()
    await waitFor(() => expect(h.dh.dangChay?.itemId).toBe(A))
    act(() => h.batDau(A))
    await cho()
    expect(sv.dem(BAT_DAU)).toBe(0)
  })

  it('dừng: POST dung {}; phiên mới vào Lịch sử, không còn đồng hồ chạy', async () => {
    sv.dangChay = { itemId: A, batDau: truocGiay(1800) }
    dung()
    await waitFor(() => expect(h.dh.dangChay?.itemId).toBe(A))
    act(() => h.dung())
    await waitFor(() => expect(h.dh.dangChay).toBeNull())
    expect(sv.cacLan(DUNG)[0].body).toEqual({})
    expect(h.dh.lichSu[0]).toMatchObject({ itemId: A, giay: 1800, ngay: '2026-10-22' })
    expect(h.giay).toBeNull()
  })

  it('bắt đầu lỗi → trả về như trước + toast lỗi "Thử lại"', async () => {
    dung()
    await daTai()
    sv.loiGhi = 1
    act(() => h.batDau(A))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Lỗi lưu — đã giữ trạng thái cũ.')
    await waitFor(() => expect(h.dh.dangChay).toBeNull())
    await act(() => fireEvent.click(within(alert).getByRole('button', { name: 'Thử lại' })))
    await waitFor(() => expect(sv.dangChay?.itemId).toBe(A))
  })

  it('tab khác vừa bật mục khác (409 dangChay): hiện đồng hồ đó, không tự chuyển', async () => {
    dung()
    await daTai()
    sv.dangChay = { itemId: B, batDau: truocGiay(30) }
    act(() => h.batDau(A))
    await waitFor(() => expect(h.dh.dangChay?.itemId).toBe(B))
    expect(sv.cacLan(BAT_DAU).map((y) => y.body)).toEqual([{ itemId: A }])
    expect(sv.dangChay.itemId).toBe(B)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('quên tắt đồng hồ (Cần chốt 12)', () => {
  it('dừng khi đã chạy > 3 giờ / qua nửa đêm: 409 canHoi → hỏi (đồng hồ vẫn chạy); "Ghi" gửi lại kèm ghiGiay', async () => {
    sv.dangChay = { itemId: A, batDau: truocGiay(33120) }
    sv.canHoi = 33120
    dung()
    await waitFor(() => expect(h.dh.dangChay?.itemId).toBe(A))
    act(() => h.dung())
    await waitFor(() =>
      expect(h.hoi.hoi).toEqual({ loai: 'dung', giay: 33120, itemId: A, itemIdMoi: null }),
    )
    expect(h.dh.dangChay?.itemId).toBe(A)
    expect(screen.queryByRole('alert')).toBeNull()
    act(() => h.hoi.traLoi(1800.4))
    await waitFor(() => expect(h.dh.dangChay).toBeNull())
    expect(h.hoi.hoi).toBeNull()
    expect(sv.cacLan(DUNG).map((y) => y.body)).toEqual([{}, { ghiGiay: 1800 }])
    expect(h.dh.lichSu[0]).toMatchObject({ itemId: A, giay: 1800 })
  })

  it('"Không ghi" → ghiGiay null, không có phiên; Huỷ → đóng hộp thoại, đồng hồ vẫn chạy, không gửi gì', async () => {
    sv.dangChay = { itemId: A, batDau: truocGiay(20000) }
    sv.canHoi = 20000
    dung()
    await waitFor(() => expect(h.dh.dangChay?.itemId).toBe(A))
    act(() => h.dung())
    await waitFor(() => expect(h.hoi.hoi?.loai).toBe('dung'))
    act(() => h.hoi.huy())
    expect(h.hoi.hoi).toBeNull()
    await cho()
    expect(sv.dem(DUNG)).toBe(1)
    expect(h.dh.dangChay?.itemId).toBe(A)

    act(() => h.dung())
    await waitFor(() => expect(h.hoi.hoi?.loai).toBe('dung'))
    act(() => h.hoi.traLoi(null))
    await waitFor(() => expect(h.dh.dangChay).toBeNull())
    expect(sv.cacLan(DUNG).at(-1)?.body).toEqual({ ghiGiay: null })
    expect(h.dh.lichSu).toEqual([])
  })

  it('chuyển khi quên tắt: hỏi trước, trả lời thì chuyển (một lần POST) kèm ghiGiay', async () => {
    sv.dangChay = { itemId: A, batDau: truocGiay(40000) }
    sv.canHoi = 40000
    dung()
    await waitFor(() => expect(h.dh.dangChay?.itemId).toBe(A))
    act(() => h.chuyen(B))
    await waitFor(() =>
      expect(h.hoi.hoi).toEqual({ loai: 'chuyen', giay: 40000, itemId: A, itemIdMoi: B }),
    )
    act(() => h.hoi.traLoi(600))
    await waitFor(() => expect(h.dh.dangChay?.itemId).toBe(B))
    expect(sv.cacLan(BAT_DAU).map((y) => y.body)).toEqual([
      { itemId: B, chuyen: true },
      { itemId: B, chuyen: true, ghiGiay: 600 },
    ])
    expect(h.dh.lichSu[0]).toMatchObject({ itemId: A, giay: 600 })
  })
})

describe('chuyển sang mục này (bất biến 6)', () => {
  it('một lần POST { chuyen: true }; toast "Đã chuyển đồng hồ sang …" + Hoàn tác (POST hoan-tac: chạy lại đồng hồ cũ đúng giờ cũ, bỏ phiên vừa ghi)', async () => {
    const batDauA = truocGiay(1200)
    sv.dangChay = { itemId: A, batDau: batDauA }
    dung()
    await waitFor(() => expect(h.dh.dangChay?.itemId).toBe(A))
    act(() => h.chuyen(B))
    await waitFor(() => expect(h.dh.dangChay?.itemId).toBe(B))
    expect(sv.cacLan(BAT_DAU).map((y) => y.body)).toEqual([{ itemId: B, chuyen: true }])
    expect(h.dh.lichSu[0]).toMatchObject({ itemId: A, giay: 1800 })
    await waitFor(() =>
      expect(vungToast().textContent).toContain(`Đã chuyển đồng hồ sang ${mucB.label}`),
    )
    expect(vungToast().querySelector('[lang="en"]')?.textContent).toBe(mucB.label)
    await act(() => fireEvent.click(within(vungToast()).getByRole('button', { name: 'Hoàn tác' })))
    await waitFor(() => expect(h.dh.dangChay).toEqual({ itemId: A, batDau: batDauA }))
    expect(sv.dem('POST /api/dong-ho/hoan-tac')).toBe(1)
    await waitFor(() => expect(h.dh.lichSu).toEqual([]))
    await waitFor(() =>
      expect(vungToast().textContent).toContain(`Đã chuyển đồng hồ sang ${mucA.label}`),
    )
    expect(within(vungToast()).queryByRole('button', { name: 'Hoàn tác' })).toBeNull()
  })

  it('bấm giờ mục khác khi đang chạy = chuyển', async () => {
    sv.dangChay = { itemId: A, batDau: truocGiay(100) }
    dung()
    await waitFor(() => expect(h.dh.dangChay?.itemId).toBe(A))
    act(() => h.batDau(B))
    await waitFor(() => expect(h.dh.dangChay?.itemId).toBe(B))
    expect(sv.cacLan(BAT_DAU).map((y) => y.body)).toEqual([{ itemId: B, chuyen: true }])
  })
})

describe('Lịch sử phiên', () => {
  it('xoá phiên: lạc quan + toast "Đã xoá phiên học" + Hoàn tác khôi phục đúng chỗ', async () => {
    sv.lichSu = [
      { id: 3, itemId: A, ngay: '2026-10-22', giay: 600 },
      { id: 2, itemId: B, ngay: '2026-10-21', giay: 1200 },
      { id: 1, itemId: A, ngay: '2026-10-20', giay: 300 },
    ]
    dung()
    await waitFor(() => expect(h.dh.lichSu).toHaveLength(3))
    act(() => h.xoaPhien(2))
    await waitFor(() => expect(h.dh.lichSu.map((p) => p.id)).toEqual([3, 1]))
    await waitFor(() => expect(vungToast().textContent).toContain('Đã xoá phiên học'))
    expect(sv.lichSu.map((p) => p.id)).toEqual([3, 1])
    await act(() => fireEvent.click(within(vungToast()).getByRole('button', { name: 'Hoàn tác' })))
    await waitFor(() => expect(sv.dem('POST /api/phien-gio/2/khoi-phuc')).toBe(1))
    await waitFor(() => expect(h.dh.lichSu.map((p) => p.id)).toEqual([3, 2, 1]))
  })

  it('xoá lỗi → phiên trở lại + toast lỗi', async () => {
    sv.lichSu = [{ id: 3, itemId: A, ngay: '2026-10-22', giay: 600 }]
    dung()
    await waitFor(() => expect(h.dh.lichSu).toHaveLength(1))
    sv.loiGhi = 1
    act(() => h.xoaPhien(3))
    await screen.findByRole('alert')
    await waitFor(() => expect(h.dh.lichSu.map((p) => p.id)).toEqual([3]))
  })
})

describe('Lịch sử của một mục (GET /api/dong-ho?itemId=)', () => {
  it('card của mục chỉ có phiên của mục; dừng thêm phiên vào đúng lịch sử', async () => {
    sv.lichSu = [
      { id: 3, itemId: B, ngay: '2026-10-22', giay: 600 },
      { id: 2, itemId: A, ngay: '2026-10-21', giay: 1200 },
    ]
    sv.dangChay = { itemId: A, batDau: truocGiay(1800) }
    const cua = {} as { a: ReturnType<typeof useDongHo>; b: ReturnType<typeof useDongHo> }
    function HaiCard() {
      cua.a = useDongHo(A)
      cua.b = useDongHo(B)
      h.dung = useDung()
      return null
    }
    dung(<HaiCard />)
    await waitFor(() => expect(cua.a.lichSu.map((p) => p.id)).toEqual([2]))
    await waitFor(() => expect(cua.b.lichSu.map((p) => p.id)).toEqual([3]))
    expect(sv.dem(`GET /api/dong-ho?itemId=${encodeURIComponent(A)}`)).toBe(1)
    expect(cua.b.dangChay?.itemId).toBe(A)
    act(() => h.dung())
    await waitFor(() => expect(cua.a.dangChay).toBeNull())
    expect(cua.b.dangChay).toBeNull()
    expect(cua.a.lichSu[0]).toMatchObject({ itemId: A, giay: 1800 })
    expect(cua.b.lichSu.map((p) => p.id)).toEqual([3])
  })
})

describe('ngoài QueryClientProvider', () => {
  it('không gọi API, không có đồng hồ chạy', () => {
    function Le() {
      h.dh = useDongHo()
      h.giay = useGiayDongHo()
      return null
    }
    render(<Le />)
    expect(h.dh.dangChay).toBeNull()
    expect(h.dh.dangTai).toBe(false)
    expect(h.giay).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})
