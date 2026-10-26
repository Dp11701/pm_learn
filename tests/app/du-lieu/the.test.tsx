// @vitest-environment jsdom
// Flashcard của mục (src/app/du-lieu/the.ts; đề xuất 3.5) trên máy chủ giả: tạo chờ server (hộp 1, hạn ngày mai
// của server) → bước Ghi nhớ xong; sửa lạc quan, lỗi → giá trị server đã xác nhận; xoá lạc quan + toast "Đã xoá
// thẻ" + Hoàn tác khôi phục đúng thẻ (cùng id, hộp, hạn); xoá có thể đổi "Cần ôn lại" → tải lại ảnh chụp trạng thái.
import { StrictMode, cloneElement, type ReactElement, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layCay } from '../../../shared/roadmap'
import { ToastProvider } from '../../../src/components/Toast'
import { useBonBuoc } from '../../../src/app/du-lieu/hoc'
import {
  useSuaThe,
  useTaoThe,
  useThe,
  useXoaThe,
  type KetQuaThe,
} from '../../../src/app/du-lieu/the'
import { useTrangThai } from '../../../src/app/du-lieu/trang-thai'
import { taoGiaMayChuHoc, type GiaMayChuHoc } from './hoc-gia-may-chu'

const ketNoi = vi.hoisted(() => ({ revision: undefined as number | undefined }))
vi.mock(import('../../../src/app/ket-noi'), async (goc) => ({
  ...(await goc()),
  useKetNoi: () => ({
    trangThai: 'on-dinh' as const,
    meta:
      ketNoi.revision === undefined
        ? null
        : {
            revision: ketNoi.revision,
            now: '2026-10-22T14:42:00.000Z',
            homNay: '2026-10-22',
            soMucHoc: 1,
          },
    thuNgay: async () => {},
    dangThu: false,
  }),
}))

const muc = layCay().mucHoc.find((m) => m.mau === 'chu-de')!
const ID = muc.id

let sv: GiaMayChuHoc

beforeEach(() => {
  sv = taoGiaMayChuHoc()
  ketNoi.revision = undefined
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const h = {} as {
  the: ReturnType<typeof useThe>
  tao: ReturnType<typeof useTaoThe>
  sua: ReturnType<typeof useSuaThe>
  xoa: ReturnType<typeof useXoaThe>
  bb: ReturnType<typeof useBonBuoc>
}

function Thu() {
  useTrangThai()
  h.the = useThe(ID)
  h.tao = useTaoThe(ID)
  h.sua = useSuaThe(ID)
  h.xoa = useXoaThe(ID)
  h.bb = useBonBuoc(ID, 'chu-de', [])
  return null
}

function dung(ui: ReactElement = <Thu />) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  })
  const boc = (x: ReactNode) => (
    <StrictMode>
      <QueryClientProvider client={client}>
        <ToastProvider>{x}</ToastProvider>
      </QueryClientProvider>
    </StrictMode>
  )
  const kq = render(boc(ui))
  return { client, dungLai: () => kq.rerender(boc(cloneElement(ui))) }
}

const cho = (ms = 20) => act(() => new Promise((r) => setTimeout(r, ms)))
const daTai = () => waitFor(() => expect(h.the.dangTai).toBe(false))
const vungToast = () => screen.getByRole('status', { name: 'Thông báo' })

function coThe(id = 7, doi: Partial<GiaMayChuHoc['the'][number]> = {}) {
  sv.the.push({
    id,
    itemId: ID,
    truoc: 'Mặt trước',
    sau: 'Mặt sau',
    hop: 3,
    hanOn: '2026-10-20',
    khoaCau: null,
    ...doi,
  })
}

describe('tạo thẻ', () => {
  it('chờ server: thẻ mới hộp 1, hạn = hôm nay của server + 1; bỏ khoảng trắng; bước Ghi nhớ xong', async () => {
    dung()
    await daTai()
    expect(h.bb?.buoc['ghi-nho'].thieu).toBe('Thiếu · chưa có flashcard')
    let kq: KetQuaThe | undefined
    await act(async () => {
      kq = await h.tao({ truoc: '  Hỏi  ', sau: ' Đáp ', khoaCau: 'k1' })
    })
    expect(kq).toEqual({
      ok: true,
      the: { id: 101, truoc: 'Hỏi', sau: 'Đáp', hop: 1, hanOn: '2026-10-23', khoaCau: 'k1' },
    })
    expect(sv.cacLan('POST /api/the')[0].body).toEqual({
      itemId: ID,
      truoc: 'Hỏi',
      sau: 'Đáp',
      khoaCau: 'k1',
    })
    await waitFor(() => expect(h.the.the).toHaveLength(1))
    expect(h.bb?.buoc['ghi-nho'].tinhTrang).toBe('xong')
  })

  it('tạo lỗi → kết quả lỗi kèm câu của máy chủ; danh sách không đổi', async () => {
    dung()
    await daTai()
    sv.loiGhi = 1
    let kq: KetQuaThe | undefined
    await act(async () => {
      kq = await h.tao({ truoc: 'H', sau: 'Đ' })
    })
    expect(kq).toEqual({ ok: false, loi: 'Máy chủ gặp lỗi.' })
    expect(h.the.the).toEqual([])
    expect(sv.cacLan('POST /api/the')[0].body).toEqual({ itemId: ID, truoc: 'H', sau: 'Đ' })
  })
})

describe('sửa thẻ', () => {
  it('lạc quan; lưu xong trả thẻ đã sửa', async () => {
    coThe()
    dung()
    await waitFor(() => expect(h.the.the).toHaveLength(1))
    sv.dongCua()
    let hua: Promise<KetQuaThe> | undefined
    act(() => {
      hua = h.sua(7, { truoc: ' Trước mới ' })
    })
    await waitFor(() => expect(h.the.the[0].truoc).toBe('Trước mới'))
    await act(async () => sv.moCua())
    const kq = await hua!
    expect(kq.ok && kq.the).toMatchObject({ id: 7, truoc: 'Trước mới', sau: 'Mặt sau', hop: 3 })
    expect(sv.cacLan('PUT /api/the/7')[0].body).toEqual({ truoc: 'Trước mới' })
  })

  it('lỗi → trả về giá trị server đã xác nhận, kết quả lỗi cho hộp thoại', async () => {
    coThe()
    dung()
    await waitFor(() => expect(h.the.the).toHaveLength(1))
    sv.loiGhi = 1
    let kq: KetQuaThe | undefined
    await act(async () => {
      kq = await h.sua(7, { sau: 'Sau mới' })
    })
    expect(kq).toEqual({ ok: false, loi: 'Máy chủ gặp lỗi.' })
    await waitFor(() => expect(h.the.the[0].sau).toBe('Mặt sau'))
  })
})

describe('xoá thẻ', () => {
  it('lạc quan + toast "Đã xoá thẻ" + Hoàn tác khôi phục đúng thẻ (cùng id, hộp, hạn)', async () => {
    coThe(7, { hop: 4, hanOn: '2026-10-30' })
    dung()
    await waitFor(() => expect(h.the.the).toHaveLength(1))
    act(() => h.xoa(7))
    await waitFor(() => expect(h.the.the).toEqual([]))
    await waitFor(() => expect(vungToast().textContent).toContain('Đã xoá thẻ'))
    expect(sv.the).toEqual([])
    await act(() => fireEvent.click(within(vungToast()).getByRole('button', { name: 'Hoàn tác' })))
    await waitFor(() => expect(sv.dem('POST /api/the/7/khoi-phuc')).toBe(1))
    await waitFor(() => expect(h.the.the).toHaveLength(1))
    expect(h.the.the[0]).toMatchObject({ id: 7, hop: 4, hanOn: '2026-10-30' })
    expect(sv.the.map((t) => t.id)).toEqual([7])
  })

  it('xoá lỗi → thẻ trở lại + toast lỗi "Thử lại"; Thử lại xoá được', async () => {
    coThe()
    dung()
    await waitFor(() => expect(h.the.the).toHaveLength(1))
    sv.loiGhi = 1
    act(() => h.xoa(7))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Lỗi lưu — đã giữ trạng thái cũ.')
    await waitFor(() => expect(h.the.the).toHaveLength(1))
    await act(() => fireEvent.click(within(alert).getByRole('button', { name: 'Thử lại' })))
    await waitFor(() => expect(sv.the).toEqual([]))
    await waitFor(() => expect(h.the.the).toEqual([]))
  })

  it('xoá / khôi phục thẻ tải lại ảnh chụp trạng thái học (cờ Cần ôn lại có thể đổi)', async () => {
    sv.revision = 2
    ketNoi.revision = 2
    coThe()
    const { dungLai } = dung()
    await waitFor(() => expect(h.the.the).toHaveLength(1))
    await waitFor(() => expect(sv.dem('GET /api/state')).toBe(1))
    act(() => h.xoa(7))
    await waitFor(() => expect(sv.dem('GET /api/state')).toBe(2))
    // Meta bắt kịp lần xoá: dữ liệu học không tải lại (lần ghi của chính tab)
    ketNoi.revision = 3
    dungLai()
    await cho()
    expect(sv.dem(`GET /api/hoc/${encodeURIComponent(ID)}`)).toBe(1)
  })
})
