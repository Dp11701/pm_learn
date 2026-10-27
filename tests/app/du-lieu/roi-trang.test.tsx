// @vitest-environment jsdom
// Ô tự lưu khi rời trang (src/app/du-lieu/hoc.ts; §11 "Tự lưu"; đề xuất 5) — hồi quy review bước 1: đóng tab / cửa
// sổ trong 800 ms sau lần gõ cuối (hoặc lúc PUT còn đang bay) từng mất chữ (bản tạm ở sessionStorage mất theo tab,
// không có pagehide / beforeunload). Giờ: pagehide / ẩn tab / beforeunload gửi ngay bằng fetch keepalive; chữ có thể
// mất (lần gửi trước lỗi, chữ quá dài cho keepalive) thì beforeunload để trình duyệt hỏi "Rời trang?".
import { StrictMode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layCay } from '../../../shared/roadmap'
import { KEEPALIVE_TOI_DA } from '../../../src/app/du-lieu/hoc'
import { ToastProvider } from '../../../src/components/Toast'
import TheGhiChu from '../../../src/components/ghi-chu/TheGhiChu'
import { taoGiaMayChuHoc, type GiaMayChuHoc } from './hoc-gia-may-chu'

const muc = layCay().mucHoc.find((m) => m.mau === 'chu-de')!
const ID = muc.id
const PUT = `/api/hoc/${ID}/ghi-chu`

let sv: GiaMayChuHoc
/** keepalive của từng lần PUT ghi chú, theo thứ tự gửi */
let keepalive: boolean[]

beforeEach(() => {
  sv = taoGiaMayChuHoc()
  keepalive = []
  const goc = globalThis.fetch
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === PUT) keepalive.push(init?.keepalive === true)
    return goc(input, init)
  })
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function mo() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  })
  render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <TheGhiChu itemId={ID} />
        </ToastProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

const o = () => screen.getByRole('textbox', { name: 'Ghi chú' }) as HTMLTextAreaElement

async function go(chu: string) {
  await waitFor(() => expect(o().disabled).toBe(false))
  fireEvent.focus(o())
  fireEvent.change(o(), { target: { value: chu } })
}

/** beforeunload như trình duyệt: trả true khi trang xin hỏi "Rời trang?" */
function dongTab(): boolean {
  const e = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(e)
  return e.defaultPrevented
}

describe('rời trang khi còn chữ chưa lưu', () => {
  it('pagehide trong lúc chờ ngừng gõ: PUT keepalive gọi NGAY trong sự kiện (không đợi 800 ms / hàng chờ), chữ mới nhất', async () => {
    mo()
    await go('Chữ gõ ngay trước khi đóng tab')
    window.dispatchEvent(new Event('pagehide'))
    // fetch đã được gọi đồng bộ trong sự kiện (trang đóng thì nhịp sau không còn)
    expect(sv.dem(`PUT ${PUT}`)).toBe(1)
    expect(keepalive).toEqual([true])
    expect(sv.cacLan(`PUT ${PUT}`)[0].body).toEqual({ text: 'Chữ gõ ngay trước khi đóng tab' })
    await waitFor(() => expect(sv.mucCua(ID).ghiChu?.text).toBe('Chữ gõ ngay trước khi đóng tab'))
  })

  it('ẩn tab (visibilitychange → hidden) cũng gửi ngay bằng keepalive; tab còn hiện thì không', async () => {
    mo()
    await go('Chuyển sang tab khác')
    const an = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(sv.dem(`PUT ${PUT}`)).toBe(0)
    an.mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(sv.dem(`PUT ${PUT}`)).toBe(1)
    expect(keepalive).toEqual([true])
  })

  it('beforeunload: gửi ngay bằng keepalive, không hỏi "Rời trang?" (keepalive giữ được lần gửi)', async () => {
    mo()
    await go('Đóng cửa sổ')
    expect(dongTab()).toBe(false)
    expect(keepalive).toEqual([true])
  })

  it('PUT thường đang bay lúc đóng tab (trang đóng thì bị huỷ): gửi lại đúng chữ đó bằng keepalive', async () => {
    mo()
    await go('Đang bay')
    sv.dongCua()
    fireEvent.blur(o())
    await waitFor(() => expect(sv.soDangGiu()).toBe(1))
    expect(keepalive).toEqual([false])
    window.dispatchEvent(new Event('pagehide'))
    expect(keepalive).toEqual([false, true])
    // Đã có keepalive đang bay: lần sau không gửi thêm
    window.dispatchEvent(new Event('pagehide'))
    expect(keepalive).toEqual([false, true])
    sv.moCua()
    await waitFor(() => expect(sv.mucCua(ID).ghiChu?.text).toBe('Đang bay'))
  })

  it('lần gửi trước lỗi ("Lỗi lưu — Thử lại"): đóng tab thì gửi lại bằng keepalive VÀ hỏi "Rời trang?"', async () => {
    mo()
    await go('Chữ quý')
    sv.loiGhi = 1
    fireEvent.blur(o())
    await screen.findByRole('button', { name: 'Thử lại' })
    expect(dongTab()).toBe(true)
    expect(keepalive.at(-1)).toBe(true)
  })

  it('chữ dài quá giới hạn keepalive: chỉ gửi thường (qua hàng chờ) và hỏi "Rời trang?"', async () => {
    mo()
    await go('ạ'.repeat(Math.ceil(KEEPALIVE_TOI_DA / 3) + 10))
    expect(dongTab()).toBe(true)
    await waitFor(() => expect(keepalive).toEqual([false]))
  })

  it('không có chữ chưa lưu: không gửi, không hỏi', async () => {
    mo()
    await waitFor(() => expect(o().disabled).toBe(false))
    window.dispatchEvent(new Event('pagehide'))
    expect(dongTab()).toBe(false)
    expect(sv.dem(`PUT ${PUT}`)).toBe(0)
  })
})
