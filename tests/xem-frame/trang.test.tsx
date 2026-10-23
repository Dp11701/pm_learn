// @vitest-environment jsdom
// src/dev/XemFrame.tsx: tiêu đề và kích thước lấy từ canvas.json, iframe đúng kích thước gốc, các trạng thái.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { taoTrang, THU_MUC_THIET_KE } from '../../scripts/xem-frame'
import XemFrame from '../../src/dev/XemFrame'

const canvasJson = readFileSync(path.join(THU_MUC_THIET_KE, 'canvas.json'), 'utf8')
const tieuDeF11 = (JSON.parse(canvasJson) as { boards: Record<string, { title: string }> }).boards[
  'F11-scope-creep.dc.html'
]?.title

// Trang đã dựng (có meta) cho F11; frame khác trả trang SPA dự phòng như Vite khi file không có.
let thieuF11: string[] = []
function giaFetch(url: string): Promise<Response> {
  if (url.endsWith('/canvas.json')) return Promise.resolve(new Response(canvasJson))
  if (url === '/.frame/F11.html') {
    const html = taoTrang(
      { ma: 'F11', tep: 'F11-scope-creep.dc.html', tieuDe: 'x', rong: 1440, cao: 3900 },
      { than: '<div></div>', helmet: [], thieu: thieuF11 },
    )
    return Promise.resolve(new Response(html))
  }
  return Promise.resolve(new Response('<!doctype html><div id="root"></div>'))
}

function moTrang(url: string) {
  const router = createMemoryRouter([{ path: '/_dev/frame/:ma', Component: XemFrame }], {
    initialEntries: [url],
  })
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => {
  thieuF11 = []
  vi.stubGlobal(
    'fetch',
    vi.fn((u: string) => giaFetch(u)),
  )
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('/_dev/frame/:ma', () => {
  it('hiện tiêu đề, kích thước từ canvas.json và iframe đúng kích thước gốc', async () => {
    moTrang('/_dev/frame/f11')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveProperty(
      'textContent',
      tieuDeF11,
    )
    expect(screen.getByText(/1440×3900 px/)).toBeTruthy()
    const khung = await screen.findByTitle(`Frame ${tieuDeF11}`)
    expect(khung.getAttribute('src')).toBe('/.frame/F11.html')
    expect((khung as HTMLIFrameElement).style.width).toBe('1440px')
    expect((khung as HTMLIFrameElement).style.height).toBe('3900px')
    // trang dựng từ file tải về: không cho chạy script
    expect(khung.getAttribute('sandbox')).toBe('allow-same-origin')
    // liên kết sang frame trước / sau theo thứ tự canvas
    expect(screen.getByRole('link', { name: '‹ F02-toi' }).getAttribute('href')).toBe(
      '/_dev/frame/F02-toi',
    )
    expect(screen.getByRole('link', { name: 'F03 ›' })).toBeTruthy()
  })

  it('hiện danh sách chỗ chưa dựng được ghi trong meta', async () => {
    thieuF11 = ['[F11] Thẻ <sc-else> chưa hỗ trợ']
    moTrang('/_dev/frame/F11')
    expect(await screen.findByText('Còn 1 chỗ chưa dựng được:')).toBeTruthy()
    expect(screen.getByText('[F11] Thẻ <sc-else> chưa hỗ trợ')).toBeTruthy()
  })

  it('frame chưa dựng thì chỉ lệnh cần chạy, không mở iframe', async () => {
    moTrang('/_dev/frame/F12')
    expect(await screen.findByText(/chưa được dựng/)).toBeTruthy()
    expect(screen.getByText('npm run frame -- F12')).toBeTruthy()
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('mã không có trong canvas', async () => {
    moTrang('/_dev/frame/F99')
    expect(await screen.findByText('Không có frame “F99”')).toBeTruthy()
  })

  it('nút Vừa bề rộng bật/tắt và ghi vào ?vua=1', async () => {
    const router = moTrang('/_dev/frame/F11')
    const nut = await screen.findByRole('button', { name: 'Vừa bề rộng' })
    expect(nut.getAttribute('aria-pressed')).toBe('false')
    await act(async () => {
      fireEvent.click(nut)
    })
    expect(router.state.location.search).toBe('?vua=1')
    expect(screen.getByRole('button', { name: 'Vừa bề rộng' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.getByRole('link', { name: 'F03 ›' }).getAttribute('href')).toBe(
      '/_dev/frame/F03?vua=1',
    )
  })
})
