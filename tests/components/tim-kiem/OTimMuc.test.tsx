// @vitest-environment jsdom
// Ô tìm trang 404 (F26, F26b): danh sách là link thường nên dòng "Enter mở: …" (mô tả của ô) nói rõ Enter
// mở mục nào; số kết quả / "Không có kết quả" báo qua role="status" khi ngừng gõ.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import OTimMuc from '../../../src/pages/khong-tim-thay/OTimMuc'
import { TRE_THONG_BAO } from '../../../src/components/tim-kiem/ThongBaoKetQua'
import { layCay } from '../../../shared/roadmap'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const cay = layCay()

function ViTri() {
  return <p data-testid="vi-tri">{useLocation().pathname}</p>
}

function khoiDong() {
  const ket = render(
    <MemoryRouter initialEntries={['/khong-co']}>
      <OTimMuc cay={cay} />
      <Routes>
        <Route path="*" element={<ViTri />} />
      </Routes>
    </MemoryRouter>,
  )
  return { ...ket, o: screen.getByRole('textbox', { name: 'Tìm mục' }) as HTMLInputElement }
}

const go = (o: HTMLInputElement, chu: string) => fireEvent.change(o, { target: { value: chu } })
const vungStatus = () => screen.getByRole('status')
const moTa = (o: HTMLElement) =>
  document.getElementById(o.getAttribute('aria-describedby') ?? '')?.textContent

describe('OTimMuc — Enter mở mục nào', () => {
  it('có kết quả: dòng "Enter mở: <kết quả đầu>" là mô tả của ô, tên gắn lang="en"', () => {
    const { o } = khoiDong()
    expect(o.hasAttribute('aria-describedby')).toBe(false)
    go(o, 'risk')
    const dau = screen.getAllByRole('link')[0]
    const tenDau = dau.querySelector('[lang="en"]')?.textContent
    expect(tenDau).toBe('Risk and Issue Reports')
    expect(moTa(o)).toBe(`Enter mở: ${tenDau}`)
    const dong = document.getElementById(o.getAttribute('aria-describedby')!)!
    expect(dong.querySelector('[lang="en"]')?.textContent).toBe(tenDau)
    // Gõ tiếp: dòng đổi theo kết quả đầu, Enter mở đúng mục đó
    go(o, 'risk reg')
    expect(moTa(o)).toBe('Enter mở: Risk Register')
    fireEvent.keyDown(o, { key: 'Enter', code: 'Enter' })
    const slug = cay.mucHoc.find((m) => m.label === 'Risk Register')?.slug
    expect(screen.getByTestId('vi-tri').textContent).toBe(`/hoc/${slug}`)
  })

  it('không có kết quả: không có dòng "Enter mở", câu gợi ý không có ví dụ gõ cứng', () => {
    const { o } = khoiDong()
    go(o, 'zzzzqq')
    expect(o.hasAttribute('aria-describedby')).toBe(false)
    expect(screen.queryByText(/Enter mở/)).toBeNull()
    expect(screen.getByText('Không có kết quả. Thử tên tiếng Anh hoặc viết tắt.')).toBeTruthy()
  })
})

describe('OTimMuc — trình đọc màn hình', () => {
  it('số kết quả và mục Enter mở báo qua role="status" khi ngừng gõ, không theo từng phím', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { o } = khoiDong()
    expect(vungStatus().textContent).toBe('')
    for (const chu of ['s', 'sc', 'sco', 'scope']) {
      go(o, chu)
      act(() => vi.advanceTimersByTime(TRE_THONG_BAO - 100))
      expect(vungStatus().textContent).toBe('')
    }
    act(() => vi.advanceTimersByTime(100))
    const so = screen.getAllByRole('link').length
    expect(vungStatus().textContent).toBe(`${so} kết quả. Enter mở: Scope Creep.`)
    expect(vungStatus().querySelector('[lang="en"]')?.textContent).toBe('Scope Creep')
  })

  it('không có kết quả báo cả câu; Esc xoá chữ thì vùng trống ngay', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { o } = khoiDong()
    go(o, 'zzzzqq')
    act(() => vi.advanceTimersByTime(TRE_THONG_BAO))
    expect(vungStatus().textContent).toBe(
      'Không có kết quả cho "zzzzqq". Thử tên tiếng Anh hoặc viết tắt.',
    )
    fireEvent.keyDown(o, { key: 'Escape', code: 'Escape' })
    expect(o.value).toBe('')
    expect(vungStatus().textContent).toBe('')
    act(() => vi.advanceTimersByTime(TRE_THONG_BAO * 2))
    expect(vungStatus().textContent).toBe('')
  })

  it('axe không lỗi khi có kết quả và khi không có kết quả (đã báo)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { o, container } = khoiDong()
    go(o, 'risk')
    act(() => vi.advanceTimersByTime(TRE_THONG_BAO))
    vi.useRealTimers()
    await expectNoAxeViolations(container)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    go(o, 'zzzzqq')
    act(() => vi.advanceTimersByTime(TRE_THONG_BAO))
    vi.useRealTimers()
    await expectNoAxeViolations(container)
  })
})
