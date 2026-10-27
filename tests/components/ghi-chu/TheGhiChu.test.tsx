// @vitest-environment jsdom
// C24 Ghi chú (src/components/ghi-chu/TheGhiChu.tsx; §10, §11, F11, F15) trên máy chủ giả: nhãn + C25 "Đã lưu lúc
// 21:42" theo lần lưu của máy chủ, gõ → "Đang lưu…" → PUT sau khi ngừng gõ → "Đã lưu lúc …"; lỗi → "Lỗi lưu —
// Thử lại", giữ chữ; tải lại không đè ô đang focus; rời ô gửi ngay; dạng panel; không có máy chủ thì ô khoá; axe.
import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layCay } from '../../../shared/roadmap'
import { khoaHoc, khoaNhapTam } from '../../../src/app/du-lieu/hoc'
import { docNhapTam } from '../../../src/app/nhap-tam'
import { ToastProvider } from '../../../src/components/Toast'
import TheGhiChu from '../../../src/components/ghi-chu/TheGhiChu'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { taoGiaMayChuHoc, type GiaMayChuHoc } from '../../app/du-lieu/hoc-gia-may-chu'

const muc = layCay().mucHoc.find((m) => m.mau === 'chu-de')!
const ID = muc.id

let sv: GiaMayChuHoc

beforeEach(() => {
  sv = taoGiaMayChuHoc()
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function mo(dang?: 'card' | 'panel') {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  })
  return {
    client,
    ...render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <ToastProvider>
            <TheGhiChu itemId={ID} dang={dang} />
          </ToastProvider>
        </QueryClientProvider>
      </StrictMode>,
    ),
  }
}

const o = () => screen.getByRole('textbox', { name: 'Ghi chú' }) as HTMLTextAreaElement

describe('C24 Ghi chú', () => {
  it('nhãn "Ghi chú" + "Đã lưu lúc 21:42" (lần lưu của máy chủ), chữ đã lưu, gợi ý F15; axe', async () => {
    sv.mucCua(ID).ghiChu = { text: 'Ghi chú đã có', capNhat: '2026-10-22T14:42:00.000Z' }
    const { container } = mo()
    await waitFor(() => expect(o().value).toBe('Ghi chú đã có'))
    expect(o().getAttribute('placeholder')).toBe('Ghi chú riêng cho mục này')
    expect(o().hasAttribute('lang')).toBe(false)
    expect(screen.getByText('Đã lưu lúc 21:42')).toBeTruthy()
    expect(screen.getByText('Đã lưu lúc 21:42').getAttribute('aria-live')).toBe('polite')
    expect(screen.getByRole('region', { name: 'Ghi chú' })).toBeTruthy()
    await expectNoAxeViolations(container)
  })

  it('đang tải: ô khoá; tải xong mở', async () => {
    mo()
    expect(o().disabled).toBe(true)
    await waitFor(() => expect(o().disabled).toBe(false))
    expect(o().value).toBe('')
  })

  it('gõ: "Đang lưu…" + bản tạm; ngừng gõ → PUT chữ mới nhất → "Đã lưu lúc …", bỏ bản tạm', async () => {
    mo()
    await waitFor(() => expect(o().disabled).toBe(false))
    fireEvent.focus(o())
    fireEvent.change(o(), { target: { value: 'Dòng 1' } })
    fireEvent.change(o(), { target: { value: 'Dòng 1\nDòng 2' } })
    expect(screen.getByText('Đang lưu…')).toBeTruthy()
    expect(docNhapTam(khoaNhapTam(ID, 'ghi-chu'))).toBe('Dòng 1\nDòng 2')
    await waitFor(() => expect(sv.dem(`PUT /api/hoc/${ID}/ghi-chu`)).toBe(1), { timeout: 2000 })
    expect(sv.cacLan(`PUT /api/hoc/${ID}/ghi-chu`)[0].body).toEqual({ text: 'Dòng 1\nDòng 2' })
    expect(await screen.findByText('Đã lưu lúc 21:42')).toBeTruthy()
    expect(docNhapTam(khoaNhapTam(ID, 'ghi-chu'))).toBeNull()
    expect(o().value).toBe('Dòng 1\nDòng 2')
  })

  it('rời ô: gửi ngay, không chờ hết thời gian ngừng gõ', async () => {
    mo()
    await waitFor(() => expect(o().disabled).toBe(false))
    fireEvent.focus(o())
    fireEvent.change(o(), { target: { value: 'Gửi khi rời ô' } })
    fireEvent.blur(o())
    await waitFor(() => expect(sv.dem(`PUT /api/hoc/${ID}/ghi-chu`)).toBe(1), { timeout: 300 })
  })

  it('lưu lỗi: "Lỗi lưu — Thử lại" (đỏ), giữ chữ và bản tạm; Thử lại lưu được', async () => {
    mo()
    await waitFor(() => expect(o().disabled).toBe(false))
    sv.loiGhi = 1
    fireEvent.focus(o())
    fireEvent.change(o(), { target: { value: 'Chữ quý' } })
    fireEvent.blur(o())
    const thuLai = await screen.findByRole('button', { name: 'Thử lại' })
    expect(screen.getByText(/Lỗi lưu/)).toBeTruthy()
    expect(o().value).toBe('Chữ quý')
    expect(o().getAttribute('aria-invalid')).toBeNull()
    expect(docNhapTam(khoaNhapTam(ID, 'ghi-chu'))).toBe('Chữ quý')
    fireEvent.click(thuLai)
    expect(await screen.findByText('Đã lưu lúc 21:42')).toBeTruthy()
    expect(sv.mucCua(ID).ghiChu?.text).toBe('Chữ quý')
  })

  it('tải lại (máy chủ có chữ mới) không đè ô đang focus; rời ô mới hiện chữ của máy chủ (§11)', async () => {
    sv.mucCua(ID).ghiChu = { text: 'Cũ', capNhat: '2026-10-22T14:42:00.000Z' }
    const { client } = mo()
    await waitFor(() => expect(o().value).toBe('Cũ'))
    fireEvent.focus(o())
    sv.mucCua(ID).ghiChu = { text: 'Từ tab khác', capNhat: '2026-10-22T14:50:00.000Z' }
    sv.revision += 1
    await act(() => client.invalidateQueries({ queryKey: khoaHoc(ID) }))
    await waitFor(() => expect(sv.dem(`GET /api/hoc/${ID}`)).toBeGreaterThanOrEqual(2))
    await act(async () => {})
    expect(o().value).toBe('Cũ')
    fireEvent.blur(o())
    await waitFor(() => expect(o().value).toBe('Từ tab khác'))
  })

  it('dạng panel: nhãn chỉ cho trình đọc màn hình (panel đã có tiêu đề), vẫn có C25', async () => {
    sv.mucCua(ID).ghiChu = { text: 'Có', capNhat: '2026-10-22T14:42:00.000Z' }
    mo('panel')
    await waitFor(() => expect(o().value).toBe('Có'))
    const nhan = document.querySelector(`label[for="${o().id}"]`)!
    expect(nhan.className).toContain('sr-only')
    expect(screen.getByText('Đã lưu lúc 21:42')).toBeTruthy()
  })

  it('không có QueryClientProvider: ô khoá, không gọi API', () => {
    render(<TheGhiChu itemId={ID} />)
    expect(o().disabled).toBe(true)
    expect(sv.yeuCau).toHaveLength(0)
  })
})
