// @vitest-environment jsdom
// Trang 404 (F26, F26b, §8.10, D24): đường dẫn, H1, gợi ý mục gần nhất, ô tìm trong trang (IME), nút phụ
// "Về Tổng quan"; axe.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import KhongTimThay from '../../src/pages/KhongTimThay'
import { expectNoAxeViolations } from '../ho-tro/axe'
import { cayMau } from '../app/he-thong/gia'

vi.mock('../../shared/roadmap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../shared/roadmap')>()),
  layCay: (await import('../app/he-thong/gia')).layCayGia,
}))

function mo(duongDan: string) {
  const router = createMemoryRouter(
    [
      { path: '/hoc/scope-creep', element: <p>Trang đích</p> },
      { path: '*', Component: KhongTimThay },
    ],
    { initialEntries: [duongDan] },
  )
  return { router, ...render(<RouterProvider router={router} />) }
}

afterEach(cleanup)

const oTim = () => screen.getByRole('textbox', { name: 'Tìm mục' })

describe('KhongTimThay', () => {
  it('đúng chữ F26: đường dẫn, H1 có focus được, gợi ý, ô tìm, nút phụ Về Tổng quan', () => {
    mo('/hoc/scope-creap')
    expect(screen.getByText('/hoc/scope-creap')).toBeTruthy()
    const h1 = screen.getByRole('heading', { level: 1, name: 'Không tìm thấy trang này.' })
    expect(h1.getAttribute('tabindex')).toBe('-1')
    expect(screen.getByText(/Có phải bạn muốn mở/).textContent).toBe(
      'Có phải bạn muốn mở Scope Creep?',
    )
    const link = screen.getByRole('link', { name: 'Scope Creep' })
    expect(link.getAttribute('href')).toBe('/hoc/scope-creep')
    expect(link.querySelector('[lang="en"]')).not.toBeNull()
    expect(oTim().getAttribute('placeholder')).toBe(`Tìm trong ${cayMau.soMucHoc} mục…`)
    expect(screen.getByRole('search')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Về Tổng quan' }).getAttribute('href')).toBe('/')
  })

  it('đường dẫn mã hoá %xx hiện dạng đọc được', () => {
    mo('/hoc/Scope%20Cr%C3%A9ep')
    expect(screen.getByText('/hoc/Scope Créep')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Scope Creep' })).toBeTruthy()
  })

  it('không giống mục nào: không có câu gợi ý, vẫn có ô tìm và nút', () => {
    mo('/xyz')
    expect(screen.queryByText(/Có phải bạn muốn mở/)).toBeNull()
    expect(oTim()).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Về Tổng quan' })).toBeTruthy()
  })

  it('nhiều gợi ý: "X hoặc Y"', () => {
    mo('/hoc/risk-assessment')
    expect(screen.getByText(/Có phải bạn muốn mở/).textContent).toBe(
      'Có phải bạn muốn mở Qualitative Risk Assessment hoặc Quantitative Risk Assessment?',
    )
  })

  it('ô tìm: gõ → kết quả có phần khớp in đậm và cấp cha; Enter mở kết quả đầu', async () => {
    const { router } = mo('/khong-co')
    fireEvent.change(oTim(), { target: { value: 'scope cre' } })
    const ds = screen.getByRole('list', { name: 'Kết quả tìm mục' })
    const dau = within(ds).getAllByRole('link')[0]!
    expect(dau.getAttribute('href')).toBe('/hoc/scope-creep')
    expect(dau.querySelector('strong')?.textContent).toBe('Scope Cre')
    expect(oTim().getAttribute('aria-controls')).toBe(ds.id)
    await act(async () => {
      fireEvent.keyDown(oTim(), { key: 'Enter', code: 'Enter' })
    })
    expect(router.state.location.pathname).toBe('/hoc/scope-creep')
    expect(screen.getByText('Trang đích')).toBeTruthy()
  })

  it('ô tìm: Enter/Esc khi Telex đang ghép chữ hoặc giữ ⌘ thì bỏ qua', () => {
    const { router } = mo('/khong-co')
    fireEvent.change(oTim(), { target: { value: 'scope cre' } })
    fireEvent.keyDown(oTim(), { key: 'Enter', code: 'Enter', isComposing: true })
    fireEvent.keyDown(oTim(), { key: 'Enter', code: 'Enter', keyCode: 229 })
    fireEvent.keyDown(oTim(), { key: 'Enter', code: 'Enter', metaKey: true })
    fireEvent.keyDown(oTim(), { key: 'Escape', code: 'Escape', isComposing: true })
    expect(router.state.location.pathname).toBe('/khong-co')
    expect((oTim() as HTMLInputElement).value).toBe('scope cre')
  })

  it('ô tìm: Esc xoá chữ; không có kết quả thì gợi ý tên tiếng Anh hoặc viết tắt', () => {
    mo('/khong-co')
    fireEvent.change(oTim(), { target: { value: 'zzzzqq' } })
    expect(screen.getByText('Không có kết quả. Thử tên tiếng Anh hoặc viết tắt.')).toBeTruthy()
    fireEvent.keyDown(oTim(), { key: 'Escape', code: 'Escape' })
    expect((oTim() as HTMLInputElement).value).toBe('')
    expect(screen.queryByText(/Không có kết quả/)).toBeNull()
  })

  it('không vi phạm axe (có gợi ý, có kết quả tìm)', async () => {
    const { container } = mo('/hoc/scope-creap')
    fireEvent.change(oTim(), { target: { value: 'risk' } })
    await expectNoAxeViolations(container)
  })
})
