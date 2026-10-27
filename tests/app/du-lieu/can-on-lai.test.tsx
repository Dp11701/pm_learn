// @vitest-environment jsdom
// Cờ "Cần ôn lại" trên web (đề xuất 3.3, bất biến 3: suy ra, không lưu) — hồi quy review bước 1: LuocDoAnhChup là
// z.object nên từng âm thầm bỏ trường `canOnLai` của GET /api/state, cờ không bao giờ hiện ở tab "Trong lĩnh vực"
// (C9 rút gọn) và C28. Kiểm: ảnh chụp giữ `canOnLai`; hàng C9 hiện "Đã xong · Cần ôn lại" + glyph ↺; đổi khỏi Đã
// xong → cờ tắt ngay (lạc quan); đặt lại Đã xong → tải lại ảnh chụp (cờ do server tính); sang ngày mới → tải lại.
import { StrictMode, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layCay, viTriTrongVung, type MucHoc } from '../../../shared/roadmap'
import { TEN_TRANG_THAI_HOC, type TrangThaiHoc } from '../../../shared/domain/trang-thai'
import { LuocDoAnhChup, taiAnhChup } from '../../../src/app/du-lieu/api'
import { useDatTrangThai, useTrangThai } from '../../../src/app/du-lieu/trang-thai'
import { ToastProvider } from '../../../src/components/Toast'
import HangCay from '../../../src/components/bai-hoc/HangCay'
import TrongLinhVuc from '../../../src/components/bai-hoc/TrongLinhVuc'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { taoGiaMayChu, type GiaMayChu } from './gia-may-chu'

const ketNoi = vi.hoisted(() => ({ homNay: undefined as string | undefined }))
vi.mock(import('../../../src/app/ket-noi'), async (goc) => ({
  ...(await goc()),
  useKetNoi: () => ({
    trangThai: 'on-dinh' as const,
    meta:
      ketNoi.homNay === undefined
        ? null
        : { revision: 0, now: '2026-10-22T14:42:00.000Z', homNay: ketNoi.homNay, soMucHoc: 1 },
    thuNgay: async () => {},
    dangThu: false,
  }),
}))

const cay = layCay()
// Một mục có lĩnh vực và một mục khác cùng lĩnh vực
const mucA = cay.mucHoc.find((m) => m.linhVuc && viTriTrongVung(cay, m.id).cacMuc.length > 2)!
const mucB = viTriTrongVung(cay, mucA.id).cacMuc.find((m) => m.id !== mucA.id)!

let sv: GiaMayChu

beforeEach(() => {
  sv = taoGiaMayChu()
  ketNoi.homNay = undefined
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

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
        <ToastProvider>
          <MemoryRouter>
            <main>{x}</main>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </StrictMode>
  )
  const kq = render(boc(ui))
  return { client, ...kq, dungLai: (moi: ReactNode) => kq.rerender(boc(moi)) }
}

/** Tab "Trong lĩnh vực" của mục A + nút đặt trạng thái cho mục B (như segmented ở trang bài của B). */
function Thu({ muc }: { muc: MucHoc }) {
  const { trangThaiCua, canOnLaiCua } = useTrangThai()
  const { dat } = useDatTrangThai()
  return (
    <>
      <TrongLinhVuc muc={muc} cay={cay} trangThaiCua={trangThaiCua} />
      <p data-testid="co">{canOnLaiCua(mucB.id) ? 'co' : 'khong'}</p>
      {(['dang-hoc', 'da-xong'] as TrangThaiHoc[]).map((tt) => (
        <button key={tt} type="button" onClick={() => dat(mucB.id, tt)}>
          Đặt {TEN_TRANG_THAI_HOC[tt]}
        </button>
      ))}
    </>
  )
}

const hang = (m: MucHoc) =>
  screen
    .getAllByRole('link')
    .find((a) => a.getAttribute('href') === `/hoc/${m.slug}`) as HTMLAnchorElement
const coGlyph = (a: HTMLElement) => a.querySelector('.lucide-rotate-ccw') !== null
const soLanTai = () => sv.dem('GET /api/state')

describe('ảnh chụp GET /api/state giữ canOnLai', () => {
  it('LuocDoAnhChup không bỏ canOnLai (z.object bỏ khoá lạ); thiếu trường vẫn hợp lệ (dữ liệu kiểu 2a)', async () => {
    const goc = { revision: 1, trangThai: {}, luotMo: {}, canOnLai: ['a', 'b'] }
    expect(LuocDoAnhChup.parse(goc).canOnLai).toEqual(['a', 'b'])
    expect(LuocDoAnhChup.parse({ revision: 1, trangThai: {}, luotMo: {} }).canOnLai).toBeUndefined()
    sv.trangThai = { [mucB.id]: { status: 'done' } }
    sv.theDenHan = new Set([mucB.id])
    expect((await taiAnhChup()).canOnLai).toEqual([mucB.id])
  })
})

describe('tab "Trong lĩnh vực" (C9 rút gọn): cờ Cần ôn lại', () => {
  it('mục Đã xong có thẻ đến hạn: "Đã xong · Cần ôn lại" + glyph ↺; mục khác không; axe', async () => {
    sv.trangThai = { [mucB.id]: { status: 'done' }, [mucA.id]: { status: 'learning' } }
    sv.theDenHan = new Set([mucB.id, mucA.id])
    const { container } = dung(<Thu muc={mucA} />)
    await waitFor(() => expect(hang(mucB).textContent).toContain('Đã xong · Cần ôn lại'))
    expect(coGlyph(hang(mucB))).toBe(true)
    // Mục A có thẻ đến hạn nhưng đang học: không có cờ (server cũng không gửi)
    expect(hang(mucA).textContent).toContain(TEN_TRANG_THAI_HOC['dang-hoc'])
    expect(hang(mucA).textContent).not.toContain('Cần ôn lại')
    expect(coGlyph(hang(mucA))).toBe(false)
    await expectNoAxeViolations(container)
  })

  it('đổi khỏi Đã xong → cờ tắt NGAY (máy chủ chưa trả lời); đặt lại Đã xong → tải lại ảnh chụp, cờ bật lại', async () => {
    sv.trangThai = { [mucB.id]: { status: 'done' } }
    sv.theDenHan = new Set([mucB.id])
    dung(<Thu muc={mucA} />)
    await waitFor(() => expect(screen.getByTestId('co').textContent).toBe('co'))
    const taiTruoc = soLanTai()

    sv.dongCua()
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Đặt Đang học' })))
    await waitFor(() => expect(screen.getByTestId('co').textContent).toBe('khong'))
    expect(sv.soDangGiu()).toBe(1)
    expect(hang(mucB).textContent).not.toContain('Cần ôn lại')
    expect(coGlyph(hang(mucB))).toBe(false)
    sv.moCua()
    await waitFor(() => expect(screen.queryByText(/Đã chuyển/)).not.toBeNull())
    expect(screen.getByTestId('co').textContent).toBe('khong')

    act(() => fireEvent.click(screen.getByRole('button', { name: 'Đặt Đã xong' })))
    // Lần ghi của chính tab không làm tải lại theo revision: cờ đến từ lượt tải lại riêng
    await waitFor(() => expect(screen.getByTestId('co').textContent).toBe('co'))
    expect(soLanTai()).toBeGreaterThan(taiTruoc)
    expect(hang(mucB).textContent).toContain('Đã xong · Cần ôn lại')
  })

  it('sang ngày mới (homNay của /api/meta đổi) → tải lại ảnh chụp: thẻ vừa tới hạn bật cờ', async () => {
    ketNoi.homNay = '2026-10-22'
    sv.trangThai = { [mucB.id]: { status: 'done' } }
    sv.theDenHan = new Set()
    const { dungLai } = dung(<Thu muc={mucA} />)
    await waitFor(() => expect(hang(mucB).textContent).toContain(TEN_TRANG_THAI_HOC['da-xong']))
    expect(screen.getByTestId('co').textContent).toBe('khong')
    const taiTruoc = soLanTai()
    // Cùng ngày: không tải lại
    dungLai(<Thu muc={mucA} />)
    expect(soLanTai()).toBe(taiTruoc)

    sv.theDenHan.add(mucB.id)
    ketNoi.homNay = '2026-10-23'
    dungLai(<Thu muc={mucA} />)
    await waitFor(() => expect(screen.getByTestId('co').textContent).toBe('co'))
    expect(soLanTai()).toBe(taiTruoc + 1)
  })
})

describe('HangCay', () => {
  it('cờ chỉ hiện ở mục Đã xong (cờ cũ của mục vừa đổi trạng thái bị bỏ qua)', () => {
    const { container } = render(
      <MemoryRouter>
        <ul>
          <li>
            <HangCay muc={mucA} trangThai="dang-hoc" canOnLai />
          </li>
          <li>
            <HangCay muc={mucB} trangThai="da-xong" canOnLai />
          </li>
        </ul>
      </MemoryRouter>,
    )
    const [a, b] = within(container).getAllByRole('link')
    expect(a.textContent).not.toContain('Cần ôn lại')
    expect(coGlyph(a)).toBe(false)
    expect(b.textContent).toContain('Đã xong · Cần ôn lại')
    expect(coGlyph(b)).toBe(true)
  })
})
