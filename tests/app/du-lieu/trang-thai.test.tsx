// @vitest-environment jsdom
// Hook dữ liệu học (đề xuất 1.10, 3.1, 3.9) trên máy chủ giả: tải ảnh chụp, tải lại theo revision của
// /api/meta, đổi trạng thái lạc quan + toast Hoàn tác 5 giây, lưu lỗi thì giữ trạng thái cũ + toast "Thử lại",
// ghi lượt mở mỗi lần vào bài.
import { StrictMode, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layCay } from '../../../shared/roadmap'
import { TEN_TRANG_THAI_HOC, type TrangThaiHoc } from '../../../shared/domain/trang-thai'
import { ToastProvider } from '../../../src/components/Toast'
import {
  useDanhSachDangHoc,
  useDatTrangThai,
  useGhiLuotMo,
  useHocTiep,
  useTrangThai,
} from '../../../src/app/du-lieu/trang-thai'
import { expectNoAxeViolations } from '../../ho-tro/axe'
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

const cay = layCay()
const [mucA, mucB, mucC] = cay.mucHoc

let sv: GiaMayChu

beforeEach(() => {
  sv = taoGiaMayChu()
  ketNoi.revision = undefined
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function taoClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  })
}

function boc(ui: ReactNode, client: QueryClient) {
  return (
    <StrictMode>
      <QueryClientProvider client={client}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}

function dung(ui: ReactNode, client = taoClient()) {
  const kq = render(boc(ui, client))
  return { client, ...kq, dungLai: (moi: ReactNode) => kq.rerender(boc(moi, client)) }
}

/** Trạng thái của một mục + các nút đặt trạng thái (như C6 ở trang bài). */
function BangThu({ id }: { id: string }) {
  const { trangThaiCua, lyDoBoQuaCua, dangTai } = useTrangThai()
  const { dat, dangLuu, loiLuu, thuLai } = useDatTrangThai()
  const ly = lyDoBoQuaCua(id)
  return (
    <main>
      <p data-testid="trang-thai">{dangTai ? 'dang-tai' : trangThaiCua(id)}</p>
      <p data-testid="ly-do">{ly ?? ''}</p>
      <p data-testid="luu">{dangLuu(id) ? 'dang-luu' : loiLuu(id) ? 'loi' : 'xong'}</p>
      {(['chua-hoc', 'dang-hoc', 'da-xong', 'bo-qua'] as TrangThaiHoc[]).map((tt) => (
        <button
          key={tt}
          type="button"
          onClick={() => dat(id, tt, tt === 'bo-qua' ? 'Để sau' : undefined)}
        >
          Đặt {TEN_TRANG_THAI_HOC[tt]}
        </button>
      ))}
      <button type="button" onClick={() => thuLai(id)}>
        Thử lại mục
      </button>
    </main>
  )
}

const PUT_A = `PUT /api/trang-thai/${encodeURIComponent(mucA.id)}`
const trangThai = () => screen.getByTestId('trang-thai').textContent
const luu = () => screen.getByTestId('luu').textContent
const vungToast = () => screen.getByRole('status', { name: 'Thông báo' })
const bam = (ten: string) => act(() => fireEvent.click(screen.getByRole('button', { name: ten })))

describe('useTrangThai', () => {
  it('tải GET /api/state, ánh xạ learning/done/skip → TrangThaiHoc, không có khoá = Chưa học', async () => {
    sv.trangThai = {
      [mucA.id]: { status: 'skip', lyDoBoQua: 'Đã biết' },
      [mucB.id]: { status: 'done' },
    }
    dung(<BangThu id={mucA.id} />)
    expect(trangThai()).toBe('dang-tai')
    await waitFor(() => expect(trangThai()).toBe('bo-qua'))
    expect(screen.getByTestId('ly-do').textContent).toBe('Đã biết')
    cleanup()
    dung(<BangThu id={mucC.id} />)
    await waitFor(() => expect(trangThai()).toBe('chua-hoc'))
  })

  it('ngoài QueryClientProvider: không gọi API, mọi mục là Chưa học, không "đang tải"', () => {
    function Le() {
      const { trangThaiCua, dangTai, anhChup } = useTrangThai()
      return (
        <p data-testid="le">{`${String(dangTai)} ${trangThaiCua(mucA.id)} ${String(anhChup)}`}</p>
      )
    }
    render(<Le />)
    expect(screen.getByTestId('le').textContent).toBe('false chua-hoc undefined')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('revision của /api/meta khác ảnh chụp → tải lại; bằng thì không', async () => {
    sv.revision = 3
    ketNoi.revision = 3
    const { dungLai } = dung(<BangThu id={mucA.id} />)
    await waitFor(() => expect(trangThai()).toBe('chua-hoc'))
    expect(sv.dem('GET /api/state')).toBe(1)

    dungLai(<BangThu id={mucA.id} />)
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(sv.dem('GET /api/state')).toBe(1)

    // Tab khác / server đổi dữ liệu: revision tăng.
    sv.trangThai[mucA.id] = { status: 'learning' }
    sv.revision = 4
    ketNoi.revision = 4
    dungLai(<BangThu id={mucA.id} />)
    await waitFor(() => expect(trangThai()).toBe('dang-hoc'))
    expect(sv.dem('GET /api/state')).toBe(2)
  })

  it('sau lần ghi của chính tab: nhận revision server trả về; meta cũ hơn (hỏi trước lần ghi) không làm tải lại', async () => {
    sv.revision = 3
    ketNoi.revision = 3
    function Bai({ id }: { id: string }) {
      useGhiLuotMo(id)
      return <BangThu id={id} />
    }
    const { client, dungLai } = dung(<Bai id={mucA.id} />)
    const revisionAnh = () =>
      client.getQueryData<{ revision: number }>(['du-lieu-hoc', 'anh-chup'])?.revision
    // Lượt mở (POST) → revision 4; meta vẫn 3 tới lần hỏi sau
    await waitFor(() => expect(revisionAnh()).toBe(4))
    bam('Đặt Đang học')
    await waitFor(() => expect(revisionAnh()).toBe(5))
    await waitFor(() => expect(luu()).toBe('xong'))
    expect(sv.revision).toBe(5)
    dungLai(<Bai id={mucA.id} />)
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(sv.dem('GET /api/state')).toBe(1)

    // Lần hỏi meta sau bắt kịp lần ghi: vẫn không tải lại
    ketNoi.revision = 5
    dungLai(<Bai id={mucA.id} />)
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(sv.dem('GET /api/state')).toBe(1)

    // Tab khác ghi: meta mới hơn ảnh chụp → tải lại đúng một lần
    sv.trangThai[mucA.id] = { status: 'done' }
    sv.revision = 6
    ketNoi.revision = 6
    dungLai(<Bai id={mucA.id} />)
    await waitFor(() => expect(trangThai()).toBe('da-xong'))
    expect(sv.dem('GET /api/state')).toBe(2)
    expect(revisionAnh()).toBe(6)

    // Revision server lùi so với lần hỏi trước (thay file DB, chạy lại server) → tải lại
    delete sv.trangThai[mucA.id]
    sv.revision = 2
    ketNoi.revision = 2
    dungLai(<Bai id={mucA.id} />)
    await waitFor(() => expect(trangThai()).toBe('chua-hoc'))
    expect(sv.dem('GET /api/state')).toBe(3)
    expect(sv.dem(`POST /api/luot-mo/${encodeURIComponent(mucA.id)}`)).toBe(1)
  })
})

describe('useDatTrangThai', () => {
  it('cập nhật lạc quan ngay; lưu xong → toast "Đã chuyển … sang …" + Hoàn tác; Hoàn tác trả về giá trị cũ', async () => {
    const { client } = dung(<BangThu id={mucA.id} />)
    await waitFor(() => expect(trangThai()).toBe('chua-hoc'))

    sv.dongCua()
    bam('Đặt Đang học')
    // Có hiệu lực ngay, trước khi máy chủ trả lời (máy chủ giả đang giữ PUT).
    expect(
      client.getQueryData<{ trangThai: object }>(['du-lieu-hoc', 'anh-chup'])?.trangThai,
    ).toEqual({
      [mucA.id]: { status: 'learning' },
    })
    await waitFor(() => expect(trangThai()).toBe('dang-hoc'))
    expect(luu()).toBe('dang-luu')
    expect(sv.trangThai[mucA.id]).toBeUndefined()
    expect(within(vungToast()).queryByRole('button', { name: 'Hoàn tác' })).toBeNull()

    await act(async () => sv.moCua())
    await waitFor(() => expect(luu()).toBe('xong'))
    expect(sv.yeuCau.at(-1)).toEqual({
      method: 'PUT',
      url: `/api/trang-thai/${encodeURIComponent(mucA.id)}`,
      body: { trangThai: 'dang-hoc', via: 'mot-muc' },
    })
    const toast = vungToast()
    await waitFor(() =>
      expect(toast.textContent).toContain(`Đã chuyển ${mucA.label} sang Đang học`),
    )
    expect(toast.querySelector('[lang="en"]')?.textContent).toBe(mucA.label)
    // Revision của phản hồi được nhận: meta cùng revision thì không tải lại ảnh chụp.
    expect(client.getQueryData<{ revision: number }>(['du-lieu-hoc', 'anh-chup'])?.revision).toBe(1)

    await act(() => fireEvent.click(within(toast).getByRole('button', { name: 'Hoàn tác' })))
    await waitFor(() => expect(sv.trangThai[mucA.id]).toBeUndefined())
    expect(sv.yeuCau.at(-1)?.body).toEqual({ trangThai: 'chua-hoc', via: 'hoan-tac' })
    expect(trangThai()).toBe('chua-hoc')
    // Toast của Hoàn tác báo giá trị đã trả về, không có Hoàn tác lần nữa.
    await waitFor(() =>
      expect(vungToast().textContent).toContain(`Đã chuyển ${mucA.label} sang Chưa học`),
    )
    expect(within(vungToast()).queryByRole('button', { name: 'Hoàn tác' })).toBeNull()
    await expectNoAxeViolations(document.body)
  })

  it('Hoàn tác giữ cả lý do Bỏ qua cũ', async () => {
    sv.trangThai[mucB.id] = { status: 'skip', lyDoBoQua: 'Không dùng trong công việc' }
    dung(<BangThu id={mucB.id} />)
    await waitFor(() => expect(trangThai()).toBe('bo-qua'))
    bam('Đặt Đã xong')
    await waitFor(() => expect(sv.trangThai[mucB.id]).toEqual({ status: 'done' }))
    await act(() => fireEvent.click(within(vungToast()).getByRole('button', { name: 'Hoàn tác' })))
    await waitFor(() =>
      expect(sv.trangThai[mucB.id]).toEqual({
        status: 'skip',
        lyDoBoQua: 'Không dùng trong công việc',
      }),
    )
    expect(sv.yeuCau.at(-1)?.body).toEqual({
      trangThai: 'bo-qua',
      lyDo: 'Không dùng trong công việc',
      via: 'hoan-tac',
    })
    expect(screen.getByTestId('ly-do').textContent).toBe('Không dùng trong công việc')
  })

  it('Bỏ qua gửi kèm lý do', async () => {
    dung(<BangThu id={mucC.id} />)
    await waitFor(() => expect(trangThai()).toBe('chua-hoc'))
    bam('Đặt Bỏ qua')
    await waitFor(() => expect(screen.getByTestId('ly-do').textContent).toBe('Để sau'))
    await waitFor(() =>
      expect(sv.trangThai[mucC.id]).toEqual({ status: 'skip', lyDoBoQua: 'Để sau' }),
    )
    expect(sv.yeuCau.at(-1)?.body).toEqual({ trangThai: 'bo-qua', lyDo: 'Để sau', via: 'mot-muc' })
  })

  it('lưu lỗi → giữ trạng thái cũ, toast lỗi "Lỗi lưu — đã giữ trạng thái cũ." + Thử lại; Thử lại lưu được', async () => {
    sv.trangThai[mucA.id] = { status: 'learning' }
    dung(<BangThu id={mucA.id} />)
    await waitFor(() => expect(trangThai()).toBe('dang-hoc'))

    sv.loiPut = 1
    sv.dongCua()
    bam('Đặt Đã xong')
    await waitFor(() => expect(trangThai()).toBe('da-xong'))
    await act(async () => sv.moCua())
    await waitFor(() => expect(luu()).toBe('loi'))
    expect(trangThai()).toBe('dang-hoc')
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Lỗi lưu — đã giữ trạng thái cũ.')
    expect(within(vungToast()).queryByText(/Đã chuyển/)).toBeNull()

    await act(() => fireEvent.click(within(alert).getByRole('button', { name: 'Thử lại' })))
    await waitFor(() => expect(luu()).toBe('xong'))
    expect(trangThai()).toBe('da-xong')
    expect(sv.trangThai[mucA.id]).toEqual({ status: 'done' })
    await waitFor(() =>
      expect(vungToast().textContent).toContain(`Đã chuyển ${mucA.label} sang Đã xong`),
    )
  })

  it('thuLai(id) gửi lại lần ghi lỗi gần nhất của mục (nút "Thử lại" của C6)', async () => {
    dung(<BangThu id={mucA.id} />)
    await waitFor(() => expect(trangThai()).toBe('chua-hoc'))
    sv.loiPut = 1
    bam('Đặt Đang học')
    await waitFor(() => expect(luu()).toBe('loi'))
    expect(trangThai()).toBe('chua-hoc')
    bam('Thử lại mục')
    await waitFor(() => expect(sv.trangThai[mucA.id]).toEqual({ status: 'learning' }))
    await waitFor(() => expect(luu()).toBe('xong'))
    expect(trangThai()).toBe('dang-hoc')
  })

  it('hai lần ghi liên tiếp cùng lỗi: trả về giá trị server đã xác nhận, không phải giá trị lạc quan của lần trước', async () => {
    sv.trangThai[mucA.id] = { status: 'skip', lyDoBoQua: 'Để sau' }
    dung(<BangThu id={mucA.id} />)
    await waitFor(() => expect(trangThai()).toBe('bo-qua'))

    sv.loiPut = 2
    // Lượt tải lại ảnh chụp sau lỗi cũng hỏng: màn hình chỉ còn dựa vào giá trị trả về lúc lỗi
    sv.loiGet = 1
    sv.dongCua()
    bam('Đặt Đang học') // A
    bam('Đặt Đã xong') // B
    await waitFor(() => expect(trangThai()).toBe('da-xong'))
    await waitFor(() => expect(sv.soDangGiu()).toBe(1))

    // A lỗi khi B còn chờ: giữ giá trị lạc quan của B, không toast cho A (Thử lại A sẽ ghi đè B)
    await act(async () => sv.moMot())
    await waitFor(() => expect(sv.dem(PUT_A)).toBe(2))
    await waitFor(() => expect(sv.soDangGiu()).toBe(1))
    expect(trangThai()).toBe('da-xong')
    expect(luu()).toBe('dang-luu')
    expect(screen.queryByRole('alert')).toBeNull()

    // B lỗi: về Bỏ qua (giá trị server), không phải Đang học (giá trị lạc quan của A, chưa từng lưu)
    await act(async () => sv.moCua())
    await waitFor(() => expect(luu()).toBe('loi'))
    await waitFor(() => expect(sv.dem('GET /api/state')).toBe(2))
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(trangThai()).toBe('bo-qua')
    expect(screen.getByTestId('ly-do').textContent).toBe('Để sau')
    expect(sv.trangThai[mucA.id]).toEqual({ status: 'skip', lyDoBoQua: 'Để sau' })
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('lần trước lưu được, lần sau lỗi: trả về giá trị lần trước (server đã xác nhận)', async () => {
    dung(<BangThu id={mucA.id} />)
    await waitFor(() => expect(trangThai()).toBe('chua-hoc'))
    sv.dongCua()
    bam('Đặt Đang học') // A — lưu được
    bam('Đặt Đã xong') // B — lỗi
    await waitFor(() => expect(sv.soDangGiu()).toBe(1))
    await act(async () => sv.moMot())
    await waitFor(() => expect(sv.dem(PUT_A)).toBe(2))
    await waitFor(() => expect(sv.soDangGiu()).toBe(1))
    expect(sv.trangThai[mucA.id]).toEqual({ status: 'learning' })
    // A xong khi B còn chờ: màn hình giữ giá trị lạc quan của B
    expect(trangThai()).toBe('da-xong')
    sv.loiPut = 1
    sv.loiGet = 1
    await act(async () => sv.moCua())
    await waitFor(() => expect(luu()).toBe('loi'))
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(trangThai()).toBe('dang-hoc')
    expect(sv.trangThai[mucA.id]).toEqual({ status: 'learning' })
  })

  it('đặt đúng trạng thái đang có thì không gửi gì', async () => {
    sv.trangThai[mucA.id] = { status: 'learning' }
    dung(<BangThu id={mucA.id} />)
    await waitFor(() => expect(trangThai()).toBe('dang-hoc'))
    bam('Đặt Đang học')
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(sv.dem(`PUT /api/trang-thai/${encodeURIComponent(mucA.id)}`)).toBe(0)
  })

  it('bấm liên tiếp: các lần ghi chạy nối tiếp, máy chủ nhận đúng thứ tự bấm', async () => {
    dung(<BangThu id={mucA.id} />)
    await waitFor(() => expect(trangThai()).toBe('chua-hoc'))
    sv.dongCua()
    bam('Đặt Đang học')
    bam('Đặt Đã xong')
    await waitFor(() => expect(trangThai()).toBe('da-xong'))
    // Lần thứ hai chưa được gửi khi lần đầu chưa xong.
    expect(sv.yeuCau.filter((y) => y.method === 'PUT')).toHaveLength(1)
    await act(async () => sv.moCua())
    await waitFor(() => expect(sv.trangThai[mucA.id]).toEqual({ status: 'done' }))
    expect(sv.yeuCau.filter((y) => y.method === 'PUT').map((y) => y.body)).toEqual([
      { trangThai: 'dang-hoc', via: 'mot-muc' },
      { trangThai: 'da-xong', via: 'mot-muc' },
    ])
    expect(trangThai()).toBe('da-xong')
  })
})

describe('useGhiLuotMo, Học tiếp, Đang học', () => {
  function Bai({ id }: { id: string }) {
    useGhiLuotMo(id)
    const hocTiep = useHocTiep()
    const { cacMuc, tong } = useDanhSachDangHoc()
    return (
      <>
        <p data-testid="hoc-tiep">{hocTiep?.id ?? ''}</p>
        <p data-testid="dang-hoc">{`${cacMuc.map((m) => m.id).join(',')} / ${tong}`}</p>
      </>
    )
  }

  it('mỗi lần vào bài ghi 1 lượt mở (kể cả StrictMode); đổi mục thì ghi mục mới; Học tiếp theo lượt mở', async () => {
    sv.trangThai = { [mucA.id]: { status: 'learning' }, [mucB.id]: { status: 'learning' } }
    sv.luotMo = { [mucA.id]: '2026-10-20T08:00:00.000Z' }
    sv.gioMo = '2026-10-22T14:42:00.000Z'
    const { dungLai } = dung(<Bai id={mucB.id} />)
    await waitFor(() => expect(screen.getByTestId('hoc-tiep').textContent).toBe(mucB.id))
    expect(sv.dem(`POST /api/luot-mo/${encodeURIComponent(mucB.id)}`)).toBe(1)
    expect(screen.getByTestId('dang-hoc').textContent).toBe(`${mucB.id},${mucA.id} / 2`)

    dungLai(<Bai id={mucB.id} />)
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(sv.dem(`POST /api/luot-mo/${encodeURIComponent(mucB.id)}`)).toBe(1)

    sv.gioMo = '2026-10-22T15:00:00.000Z'
    dungLai(<Bai id={mucA.id} />)
    await waitFor(() => expect(screen.getByTestId('hoc-tiep').textContent).toBe(mucA.id))
    expect(sv.dem(`POST /api/luot-mo/${encodeURIComponent(mucA.id)}`)).toBe(1)
  })

  it('lần đầu (chưa có dữ liệu học nào) Học tiếp là mục đầu tiên của cây', async () => {
    function HocTiep() {
      return <p data-testid="hoc-tiep">{useHocTiep()?.label ?? ''}</p>
    }
    dung(<HocTiep />)
    await waitFor(() =>
      expect(screen.getByTestId('hoc-tiep').textContent).toBe(cay.mucHoc[0].label),
    )
  })

  it('ghi lượt mở lỗi thì im lặng (không toast)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{"loi":"x"}', { status: 500 }))),
    )
    dung(<Bai id={mucA.id} />)
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(vungToast().textContent).toBe('')
  })
})
