// @vitest-environment jsdom
// useTrangThaiNoiDung (chip C8 ở pager, Mục liên quan; §6.2): GET /api/noi-dung/trang-thai một lần cho mọi nơi
// dùng, không có khoá = Chưa có nội dung, tải lại khi revision của /api/meta đổi vì nơi khác (revision do lần
// ghi trạng thái học / lượt mở của chính tab thì không) và khi cửa sổ được focus lại; ngoài
// QueryClientProvider thì không gọi API, không có chip.
import { StrictMode, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layCay } from '../../../shared/roadmap'
import { useTrangThaiNoiDung } from '../../../src/app/du-lieu/noi-dung'
import { useDatTrangThai, useGhiLuotMo } from '../../../src/app/du-lieu/trang-thai'
import { ToastProvider } from '../../../src/components/Toast'
import { taoGiaMayChu, type GiaMayChu } from './gia-may-chu'

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

const [mucA, mucB] = layCay().mucHoc
const DUONG_DAN = 'GET /api/noi-dung/trang-thai'

let sv: GiaMayChu

beforeEach(() => {
  sv = taoGiaMayChu()
  ketNoi.revision = undefined
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function NoiDung({ id, testId = 'noi-dung' }: { id: string; testId?: string }) {
  const noiDungCua = useTrangThaiNoiDung()
  return <p data-testid={testId}>{JSON.stringify(noiDungCua(id) ?? null)}</p>
}

function dung(ui: ReactNode) {
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
  return { client, dungLai: (x: ReactNode) => kq.rerender(boc(x)) }
}

const chu = (testId = 'noi-dung') => screen.getByTestId(testId).textContent

describe('useTrangThaiNoiDung', () => {
  it('mục có file → trạng thái của server; không có khoá → Chưa có nội dung; một lượt tải cho mọi nơi dùng', async () => {
    sv.noiDung = { [mucA.id]: { loai: 'ban-nhap', nguon: 'ai' } }
    dung(
      <>
        <NoiDung id={mucA.id} />
        <NoiDung id={mucB.id} testId="noi-dung-b" />
      </>,
    )
    expect(chu()).toBe('null')
    await waitFor(() => expect(chu()).toBe(JSON.stringify({ loai: 'ban-nhap', nguon: 'ai' })))
    expect(chu('noi-dung-b')).toBe(JSON.stringify({ loai: 'chua-co' }))
    expect(sv.dem(DUONG_DAN)).toBe(1)
  })

  it('revision của /api/meta đổi → tải lại một lần; không đổi thì không', async () => {
    sv.revision = 3
    ketNoi.revision = 3
    const { dungLai } = dung(<NoiDung id={mucA.id} />)
    await waitFor(() => expect(chu()).toBe(JSON.stringify({ loai: 'chua-co' })))
    dungLai(<NoiDung id={mucA.id} />)
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(sv.dem(DUONG_DAN)).toBe(1)

    sv.noiDung = { [mucA.id]: { loai: 'da-duyet', ngayDuyet: '2026-10-18' } }
    ketNoi.revision = 4
    dungLai(<NoiDung id={mucA.id} />)
    await waitFor(() =>
      expect(chu()).toBe(JSON.stringify({ loai: 'da-duyet', ngayDuyet: '2026-10-18' })),
    )
    expect(sv.dem(DUONG_DAN)).toBe(2)
    dungLai(<NoiDung id={mucA.id} />)
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(sv.dem(DUONG_DAN)).toBe(2)
  })

  it('revision tăng chỉ vì lần ghi của chính tab (lượt mở, trạng thái học) → không tải lại; nơi khác ghi → tải lại', async () => {
    sv.revision = 3
    ketNoi.revision = 3
    /** Trang bài thu gọn: ghi lượt mở khi vào, đặt trạng thái học, chip nội dung. */
    function Bai({ id }: { id: string }) {
      useGhiLuotMo(id)
      const { dat, dangLuu } = useDatTrangThai()
      return (
        <>
          <NoiDung id={id} />
          <p data-testid="luu">{dangLuu(id) ? 'dang-luu' : 'xong'}</p>
          <button type="button" onClick={() => dat(id, 'dang-hoc')}>
            Đang học
          </button>
          <button type="button" onClick={() => dat(id, 'da-xong')}>
            Đã xong
          </button>
        </>
      )
    }
    const { dungLai } = dung(<Bai id={mucA.id} />)
    await waitFor(() => expect(chu()).toBe(JSON.stringify({ loai: 'chua-co' })))
    // Lượt mở (POST) → revision 4; meta bắt kịp → không tải lại
    await waitFor(() => expect(sv.revision).toBe(4))
    await act(() => new Promise((r) => setTimeout(r, 20)))
    ketNoi.revision = 4
    dungLai(<Bai id={mucA.id} />)
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(sv.dem(DUONG_DAN)).toBe(1)

    // Đặt trạng thái học (PUT) → revision 5 → không tải lại
    await act(() => fireEvent.click(screen.getByRole('button', { name: 'Đang học' })))
    await waitFor(() => expect(sv.revision).toBe(5))
    await waitFor(() => expect(chu('luu')).toBe('xong'))
    ketNoi.revision = 5
    dungLai(<Bai id={mucA.id} />)
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(sv.dem(DUONG_DAN)).toBe(1)

    // Nơi khác (Claude duyệt bài, tab khác) → tải lại đúng một lần
    sv.noiDung = { [mucA.id]: { loai: 'da-duyet', ngayDuyet: '2026-10-18' } }
    sv.revision = 6
    ketNoi.revision = 6
    dungLai(<Bai id={mucA.id} />)
    await waitFor(() => expect(sv.dem(DUONG_DAN)).toBe(2))
    await waitFor(() =>
      expect(chu()).toBe(JSON.stringify({ loai: 'da-duyet', ngayDuyet: '2026-10-18' })),
    )

    // Lẫn cả hai trong một lần hỏi meta (tab ghi 7, nơi khác ghi 8) → vẫn tải lại
    await act(() => fireEvent.click(screen.getByRole('button', { name: 'Đã xong' })))
    await waitFor(() => expect(sv.revision).toBe(7))
    await waitFor(() => expect(chu('luu')).toBe('xong'))
    sv.revision = 8
    ketNoi.revision = 8
    dungLai(<Bai id={mucA.id} />)
    await waitFor(() => expect(sv.dem(DUONG_DAN)).toBe(3))
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(sv.dem(DUONG_DAN)).toBe(3)
  })

  it('focus lại cửa sổ → tải lại một lần cho mọi nơi dùng (file sửa ngoài app chưa làm tăng revision)', async () => {
    dung(
      <>
        <NoiDung id={mucA.id} />
        <NoiDung id={mucB.id} testId="noi-dung-b" />
      </>,
    )
    await waitFor(() => expect(chu()).toBe(JSON.stringify({ loai: 'chua-co' })))
    expect(sv.dem(DUONG_DAN)).toBe(1)
    sv.noiDung = { [mucB.id]: { loai: 'ban-nhap', nguon: 'tu-viet' } }
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    await waitFor(() =>
      expect(chu('noi-dung-b')).toBe(JSON.stringify({ loai: 'ban-nhap', nguon: 'tu-viet' })),
    )
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(sv.dem(DUONG_DAN)).toBe(2)
  })

  it('ngoài QueryClientProvider: không gọi API, không có chip (undefined)', () => {
    render(<NoiDung id={mucA.id} />)
    expect(chu()).toBe('null')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('tải lỗi: không có chip (không đoán là Chưa có nội dung)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{"loi":"x"}', { status: 500 }))),
    )
    dung(<NoiDung id={mucA.id} />)
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(chu()).toBe('null')
  })
})
