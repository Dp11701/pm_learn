// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TuLuu from '../../../src/components/TuLuu'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

// 21:42 theo giờ máy (dinhDangGioPhut đọc múi giờ của tiến trình).
const luc2142 = new Date(2026, 9, 22, 21, 42, 5).getTime()

describe('TuLuu (C25)', () => {
  it('vùng aria-live polite luôn có mặt, kể cả khi chưa lưu gì', () => {
    const { container } = render(<TuLuu trangThai="nghi" />)
    const vung = container.firstElementChild as HTMLElement
    expect(vung.getAttribute('aria-live')).toBe('polite')
    expect(vung.textContent).toBe('')
  })

  it('3 trạng thái: Đang lưu… / Đã lưu lúc HH:mm / Lỗi lưu — Thử lại', () => {
    const thu = vi.fn()
    const { container, rerender } = render(<TuLuu trangThai="dang-luu" />)
    const vung = container.firstElementChild as HTMLElement
    expect(vung.textContent).toBe('Đang lưu…')

    rerender(<TuLuu trangThai="da-luu" luc={luc2142} />)
    expect(vung.textContent).toBe('Đã lưu lúc 21:42')
    expect(container.firstElementChild).toBe(vung) // cùng một vùng live

    rerender(<TuLuu trangThai="loi" thuLai={thu} />)
    expect(vung.textContent).toBe('Lỗi lưu — Thử lại')
    expect(screen.getByText(/Lỗi lưu/).className).toContain('text-danger')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(thu).toHaveBeenCalledTimes(1)
  })

  it('nhận cả chuỗi ISO', () => {
    render(<TuLuu trangThai="da-luu" luc={new Date(luc2142).toISOString()} />)
    expect(screen.getByText('Đã lưu lúc 21:42')).toBeTruthy()
  })

  it('không vi phạm axe', async () => {
    const { container } = render(
      <>
        <TuLuu trangThai="da-luu" luc={luc2142} />
        <TuLuu trangThai="loi" thuLai={() => {}} />
      </>,
    )
    await expectNoAxeViolations(container)
  })
})
