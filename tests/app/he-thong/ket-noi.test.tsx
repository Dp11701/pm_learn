// @vitest-environment jsdom
// KetNoiProvider (đề xuất 1.10, F26): hỏi /api/meta mỗi 5 giây, đồng bộ đồng hồ, banner mất kết nối.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { datLech, layLech, now } from '../../../shared/clock'
import {
  BannerMatKetNoi,
  CHU_KY_HOI,
  HET_HAN_HOI,
  KetNoiProvider,
  ThongBaoKetNoiLai,
  useKetNoi,
  type Meta,
} from '../../../src/app/ket-noi'
import { ToastProvider } from '../../../src/components/Toast'
import { expectNoAxeViolations } from '../../ho-tro/axe'

const GIO_MAY = Date.parse('2026-10-23T08:00:00Z')
const LECH_SERVER = 90_000

type CheDo = 'ok' | 'loi' | 'treo'
let cheDo: CheDo = 'ok'
let soLanHoi = 0

function metaMau(): Meta {
  // Giờ server = giờ máy (giả) + 90 giây.
  return {
    revision: 3,
    now: new Date(now() - layLech() + LECH_SERVER).toISOString(),
    homNay: '2026-10-23',
    soMucHoc: 5,
  }
}

function giaFetch(url: string, init?: RequestInit): Promise<Response> {
  soLanHoi += 1
  expect(url).toBe('/api/meta')
  if (cheDo === 'loi') return Promise.reject(new TypeError('Failed to fetch'))
  if (cheDo === 'treo') {
    return new Promise((_ok, loi) => {
      init?.signal?.addEventListener('abort', () => loi(new DOMException('aborted', 'AbortError')))
    })
  }
  return Promise.resolve(new Response(JSON.stringify(metaMau())))
}

let giaTri: ReturnType<typeof useKetNoi>
function Doc() {
  giaTri = useKetNoi()
  return <span data-testid="trang-thai">{giaTri.trangThai}</span>
}

function dung() {
  return render(
    <ToastProvider>
      <KetNoiProvider>
        <ThongBaoKetNoiLai />
        <main>
          <BannerMatKetNoi />
          <Doc />
        </main>
      </KetNoiProvider>
    </ToastProvider>,
  )
}

const choXong = () => act(() => vi.advanceTimersByTimeAsync(0))
const troi = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const trangThai = () => screen.getByTestId('trang-thai').textContent

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(GIO_MAY)
  datLech(0)
  cheDo = 'ok'
  soLanHoi = 0
  vi.stubGlobal(
    'fetch',
    vi.fn((u: string, i?: RequestInit) => giaFetch(u, i)),
  )
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  datLech(0)
  datAn(false)
})

/** Giả tab ẩn / hiện (document.hidden, visibilityState) và bắn visibilitychange. */
function datAn(an: boolean, ban = false) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => an })
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (an ? 'hidden' : 'visible'),
  })
  if (ban) act(() => void document.dispatchEvent(new Event('visibilitychange')))
}

describe('KetNoiProvider', () => {
  it('đang kết nối → ổn định, có meta, đồng hồ lệch đúng theo giờ server', async () => {
    dung()
    expect(trangThai()).toBe('dang-ket-noi')
    await choXong()
    expect(trangThai()).toBe('on-dinh')
    expect(giaTri.meta).toMatchObject({ revision: 3, homNay: '2026-10-23', soMucHoc: 5 })
    expect(layLech()).toBe(LECH_SERVER)
    expect(now()).toBe(GIO_MAY + LECH_SERVER)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('hỏi lại mỗi 5 giây; độ lệch không cộng dồn', async () => {
    dung()
    await choXong()
    expect(soLanHoi).toBe(1)
    await troi(CHU_KY_HOI)
    expect(soLanHoi).toBe(2)
    await troi(CHU_KY_HOI)
    expect(soLanHoi).toBe(3)
    expect(layLech()).toBe(LECH_SERVER)
  })

  it('lỗi → banner mất kết nối (copy F26), tự thử lại sau 5 giây, có lại thì banner mất + toast', async () => {
    cheDo = 'loi'
    dung()
    await choXong()
    expect(trangThai()).toBe('mat-ket-noi')
    const banner = screen.getByRole('alert')
    expect(banner.textContent).toContain('Mất kết nối với máy chủ cục bộ.')
    expect(banner.textContent).toContain('Tự thử lại sau 5 giây… Nội dung đang gõ được giữ nguyên.')
    expect(screen.getByRole('button', { name: 'Thử ngay' })).toBeTruthy()

    await troi(CHU_KY_HOI - 1)
    expect(soLanHoi).toBe(1)
    await troi(1)
    expect(soLanHoi).toBe(2)
    expect(trangThai()).toBe('mat-ket-noi')

    cheDo = 'ok'
    await troi(CHU_KY_HOI)
    expect(trangThai()).toBe('on-dinh')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('status', { name: 'Thông báo' }).textContent).toContain(
      'Đã kết nối lại với máy chủ cục bộ.',
    )
    expect(layLech()).toBe(LECH_SERVER)
  })

  it('banner mất kết nối không vi phạm axe', async () => {
    cheDo = 'loi'
    const { container } = dung()
    await choXong()
    expect(screen.getByRole('alert')).toBeTruthy()
    // axe dùng setTimeout thật
    vi.useRealTimers()
    await expectNoAxeViolations(container)
  })

  it('"Thử ngay" hỏi lại ngay, không chờ hết 5 giây', async () => {
    cheDo = 'loi'
    dung()
    await choXong()
    cheDo = 'ok'
    fireEvent.click(screen.getByRole('button', { name: 'Thử ngay' }))
    await choXong()
    expect(soLanHoi).toBe(2)
    expect(trangThai()).toBe('on-dinh')
    // lịch hỏi định kỳ tính lại từ lần vừa rồi, không hỏi chồng
    await troi(CHU_KY_HOI - 1)
    expect(soLanHoi).toBe(2)
    await troi(1)
    expect(soLanHoi).toBe(3)
  })

  it('máy chủ không trả lời quá hạn → mất kết nối', async () => {
    cheDo = 'treo'
    dung()
    await troi(HET_HAN_HOI - 1)
    expect(trangThai()).toBe('dang-ket-noi')
    await troi(1)
    expect(trangThai()).toBe('mat-ket-noi')
  })

  it('phản hồi sai dạng hoặc lỗi HTTP → mất kết nối', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('<!doctype html>', { status: 502 }))),
    )
    dung()
    await choXong()
    expect(trangThai()).toBe('mat-ket-noi')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ revision: 'x' })))),
    )
    await troi(CHU_KY_HOI)
    expect(trangThai()).toBe('mat-ket-noi')
  })

  it('tháo provider thì dừng hỏi', async () => {
    const { unmount } = dung()
    await choXong()
    unmount()
    await troi(CHU_KY_HOI * 3)
    expect(soLanHoi).toBe(1)
  })

  it('tab ẩn thì nghỉ hỏi; hiện lại thì hỏi ngay rồi tiếp chu kỳ 5 giây', async () => {
    dung()
    await choXong()
    expect(soLanHoi).toBe(1)
    datAn(true, true)
    await troi(CHU_KY_HOI * 4)
    expect(soLanHoi).toBe(1)
    datAn(false, true)
    await choXong()
    expect(soLanHoi).toBe(2)
    await troi(CHU_KY_HOI)
    expect(soLanHoi).toBe(3)
  })

  it('đang mất kết nối mà tab ẩn: cũng nghỉ tự thử lại', async () => {
    cheDo = 'loi'
    dung()
    await choXong()
    expect(trangThai()).toBe('mat-ket-noi')
    datAn(true, true)
    await troi(CHU_KY_HOI * 3)
    expect(soLanHoi).toBe(1)
    cheDo = 'ok'
    datAn(false, true)
    await choXong()
    expect(soLanHoi).toBe(2)
    expect(trangThai()).toBe('on-dinh')
  })

  it('không hỏi chồng: hiện lại tab hay "Thử ngay" lúc lượt trước chưa xong thì chờ chung lượt đó', async () => {
    cheDo = 'treo'
    dung()
    await choXong()
    expect(soLanHoi).toBe(1)
    datAn(false, true)
    let xong = false
    act(() => {
      void giaTri.thuNgay().then(() => {
        xong = true
      })
    })
    await choXong()
    expect(soLanHoi).toBe(1)
    expect(giaTri.dangThu).toBe(true)
    await troi(HET_HAN_HOI)
    expect(xong).toBe(true)
    expect(trangThai()).toBe('mat-ket-noi')
    expect(soLanHoi).toBe(1)
    await troi(CHU_KY_HOI)
    expect(soLanHoi).toBe(2)
  })

  it('có lại kết nối khi focus ở "Thử ngay": focus về H1 trước khi banner mất (không rơi về body)', async () => {
    cheDo = 'loi'
    render(
      <ToastProvider>
        <KetNoiProvider>
          <BannerMatKetNoi />
          <main id="noi-dung-chinh" tabIndex={-1}>
            <h1 id="tieu-de-trang" tabIndex={-1}>
              Trang
            </h1>
          </main>
        </KetNoiProvider>
      </ToastProvider>,
    )
    await choXong()
    const nut = screen.getByRole('button', { name: 'Thử ngay' })
    nut.focus()
    cheDo = 'ok'
    fireEvent.click(nut)
    await choXong()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
  })

  it('có lại kết nối khi focus ở ngoài banner: không kéo focus', async () => {
    cheDo = 'loi'
    render(
      <ToastProvider>
        <KetNoiProvider>
          <BannerMatKetNoi />
          <h1 id="tieu-de-trang" tabIndex={-1}>
            Trang
          </h1>
          <button type="button">Nút khác</button>
        </KetNoiProvider>
      </ToastProvider>,
    )
    await choXong()
    const khac = screen.getByRole('button', { name: 'Nút khác' })
    khac.focus()
    cheDo = 'ok'
    await troi(CHU_KY_HOI)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.activeElement).toBe(khac)
  })

  it('banner bọc trong vùng đánh dấu: lớp vùng bọc và lớp banner truyền đúng chỗ', async () => {
    cheDo = 'loi'
    render(
      <KetNoiProvider>
        <BannerMatKetNoi className="lop-boc" lopBanner="lop-banner" />
      </KetNoiProvider>,
    )
    await choXong()
    const banner = screen.getByRole('alert')
    expect(banner.className).toContain('lop-banner')
    const boc = banner.parentElement!
    expect(boc.hasAttribute('data-banner-ket-noi')).toBe(true)
    expect(boc.className).toBe('lop-boc')
  })

  it('ngoài provider: trạng thái mặc định, không có banner', () => {
    render(
      <>
        <BannerMatKetNoi />
        <Doc />
      </>,
    )
    expect(trangThai()).toBe('dang-ket-noi')
    expect(giaTri.meta).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
