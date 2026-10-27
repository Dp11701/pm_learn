// @vitest-environment jsdom
// Panel "Mục lục" 1024–1279 (đề xuất 4.4; CongCuGon) — hồi quy review bước 1: việc tới khối từng chạy bằng hẹn giờ dự
// phòng 400ms, đua với lúc Radix trả focus (onCloseAutoFocus, sau chuyển động đóng). Chuyển động đóng chậm hơn 400ms
// (pane ẩn, máy chậm) thì khối được focus trước rồi focus bị kéo về nút "Mục lục" (trang cuộn ngược về đầu). Giờ việc
// tới khối chạy đúng lúc panel đóng hẳn (HopThoai khiDongXong).
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layCay } from '../../../shared/roadmap'
import CongCuGon from '../../../src/pages/bai-hoc/cot-phai/CongCuGon'

const cay = layCay()
const muc = cay.mucHoc[0]

/**
 * Giả chuyển động của panel: getComputedStyle(content).animationName theo data-state (Radix Presence đọc tên chuyển
 * động để chờ animationend), các phần tử khác như thật.
 */
function giaChuyenDong() {
  const goc = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
    const that = goc(el, pseudo)
    if (!(el instanceof HTMLElement) || el.getAttribute('role') !== 'dialog') return that
    return new Proxy(that, {
      get: (t, k) =>
        k === 'animationName'
          ? el.getAttribute('data-state') === 'closed'
            ? 'ra-phai'
            : 'vao-tu-phai'
          : Reflect.get(t, k, t),
    })
  })
  // jsdom không có CSS.escape (Presence dùng khi so tên chuyển động)
  if (typeof globalThis.CSS?.escape !== 'function')
    vi.stubGlobal('CSS', { escape: (s: string) => s })
}

/** Chuyển động đóng của panel xong (animationend). */
function xongChuyenDong(panel: HTMLElement) {
  const e = new Event('animationend')
  Object.defineProperty(e, 'animationName', { value: 'ra-phai' })
  fireEvent(panel, e)
}

const cho = (ms: number) => new Promise((r) => setTimeout(r, ms))

beforeEach(() => {
  window.scrollTo = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function dung() {
  render(
    <MemoryRouter>
      <main>
        <CongCuGon
          muc={muc}
          cay={cay}
          mucLuc={[
            { id: 'khoi-a', ten: 'Khối A' },
            { id: 'khoi-b', ten: 'Khối B' },
          ]}
          trangThaiCua={() => 'chua-hoc'}
        />
        <section id="khoi-a" tabIndex={-1}>
          <h2>Khối A</h2>
        </section>
        <section id="khoi-b" tabIndex={-1}>
          <h2>Khối B</h2>
        </section>
      </main>
    </MemoryRouter>,
  )
}

describe('panel Mục lục: tới khối khi panel đã đóng hẳn', () => {
  it('chuyển động đóng chậm hơn 400ms: focus vào khối, không bị kéo về nút "Mục lục"', async () => {
    giaChuyenDong()
    dung()
    const nut = screen.getByRole('button', { name: 'Mục lục' })
    nut.focus()
    fireEvent.click(nut)
    const panel = screen.getByRole('dialog', { name: 'Điều hướng trong bài' })
    const hang = within(within(panel).getByRole('tabpanel')).getByRole('link', { name: 'Khối B' })
    hang.focus()
    fireEvent.click(hang)
    // Panel đang chạy chuyển động đóng (vẫn trong DOM, data-state closed): chưa tới khối
    await cho(500)
    expect(panel.isConnected).toBe(true)
    expect(document.activeElement?.id).not.toBe('khoi-b')
    xongChuyenDong(panel)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement?.id).toBe('khoi-b'))
    // Không có lần trả focus nào về nút sau đó
    await cho(50)
    expect(document.activeElement?.id).toBe('khoi-b')
    expect(document.activeElement).not.toBe(nut)
  })

  it('đóng bằng Esc (không chọn khối): focus về nút "Mục lục" như thường', async () => {
    dung()
    const nut = screen.getByRole('button', { name: 'Mục lục' })
    nut.focus()
    fireEvent.click(nut)
    const panel = screen.getByRole('dialog', { name: 'Điều hướng trong bài' })
    fireEvent.keyDown(panel, { key: 'Escape', code: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(nut))
  })
})
