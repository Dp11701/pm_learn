// @vitest-environment jsdom
import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DropdownMenu } from 'radix-ui'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import PillTrangThai, {
  CoCanOnLai,
  NutPillTrangThai,
  tenTrangThaiHien,
} from '../../../src/components/trang-thai/PillTrangThai'
import type { TrangThaiHien } from '../../../src/components/trang-thai/mau-trang-thai'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

const CA: [TrangThaiHien, string, string][] = [
  ['chua-hoc', 'Chưa học', '--st-none-bg'],
  ['dang-hoc', 'Đang học', '--st-learning-bg'],
  ['da-xong', 'Đã xong', '--st-done-bg'],
  ['bo-qua', 'Bỏ qua', '--st-skip-bg'],
  ['can-on-lai', 'Cần ôn lại', '--st-review-bg'],
]

describe('PillTrangThai (C5, cờ C7)', () => {
  it.each(CA)('%s: icon + chữ "%s", nền token %s, cao 24, chữ chip', (tt, chu, nen) => {
    const { container } = render(<PillTrangThai trangThai={tt} />)
    const pill = container.firstElementChild as HTMLElement
    expect(pill.textContent).toBe(chu)
    expect(pill.querySelector('svg')).not.toBeNull()
    expect(pill.querySelector('svg')?.getAttribute('width')).toBe('14')
    expect(pill.className).toContain(`bg-[var(${nen})]`)
    expect(pill.className).toContain('h-[var(--h-chip)]')
    expect(pill.className).toContain('text-[length:var(--fs-chip)]')
    expect(tenTrangThaiHien(tt)).toBe(chu)
  })

  it('chữ phụ sau " · ": lý do Bỏ qua, số thẻ đến hạn', () => {
    const { container, rerender } = render(<PillTrangThai trangThai="bo-qua" phu="Lý do riêng" />)
    expect(container.textContent).toBe('Bỏ qua · Lý do riêng')
    rerender(<PillTrangThai trangThai="can-on-lai" phu="2 thẻ đến hạn" />)
    expect(container.textContent).toBe('Cần ôn lại · 2 thẻ đến hạn')
  })
})

describe('CoCanOnLai (C7 cờ)', () => {
  it('"Cần ôn lại · 2 thẻ đến hạn" với icon ↺; không có số thẻ thì chỉ "Cần ôn lại"', () => {
    const { container, rerender } = render(<CoCanOnLai soThe={2} />)
    expect(container.textContent).toBe('Cần ôn lại · 2 thẻ đến hạn')
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('lucide-rotate-ccw')
    expect((container.firstElementChild as HTMLElement).className).toContain(
      'bg-[var(--st-review-bg)]',
    )
    rerender(<CoCanOnLai soThe={0} />)
    expect(container.textContent).toBe('Cần ôn lại')
    rerender(<CoCanOnLai soThe={1200} />)
    expect(container.textContent).toBe('Cần ôn lại · 1.200 thẻ đến hạn')
  })
})

describe('NutPillTrangThai (C5 bấm được)', () => {
  it('nút mở menu: icon + chữ + chevron, hover viền 1px màu trạng thái', () => {
    const bam = vi.fn()
    render(<NutPillTrangThai trangThai="dang-hoc" onClick={bam} />)
    const nut = screen.getByRole('button', { name: 'Đang học' })
    expect(nut.getAttribute('type')).toBe('button')
    expect(nut.getAttribute('aria-haspopup')).toBe('menu')
    expect(nut.querySelectorAll('svg')).toHaveLength(2)
    expect(nut.className).toContain('hover:shadow-[inset_0_0_0_1px_var(--st-learning-vien)]')
    fireEvent.click(nut)
    expect(bam).toHaveBeenCalledTimes(1)
  })

  it('đang lưu: aria-disabled (không disabled thật, vẫn focus được), aria-busy, nền surface-2, không chevron', () => {
    const bam = vi.fn()
    const phim = vi.fn()
    render(<NutPillTrangThai trangThai="da-xong" dangLuu onClick={bam} onKeyDown={phim} />)
    const nut = screen.getByRole('button', { name: 'Đã xong, đang lưu' })
    expect(nut).toHaveProperty('disabled', false)
    expect(nut.getAttribute('aria-disabled')).toBe('true')
    act(() => nut.focus())
    expect(document.activeElement).toBe(nut)
    // Bấm / pointerdown / Enter / Space / ↓ bị chặn (preventDefault để Radix không mở menu).
    expect(fireEvent.click(nut)).toBe(false)
    expect(fireEvent.pointerDown(nut)).toBe(false)
    for (const key of ['Enter', ' ', 'ArrowDown', 'ArrowUp'])
      expect(fireEvent.keyDown(nut, { key }), key).toBe(false)
    expect(bam).not.toHaveBeenCalled()
    // Tab và phím khác không bị chặn.
    expect(fireEvent.keyDown(nut, { key: 'Tab' })).toBe(true)
    expect(phim).toHaveBeenCalledTimes(1)
    expect(nut.getAttribute('aria-busy')).toBe('true')
    expect(nut.className).toContain('bg-surface-2')
    // F02 "Disabled · đang lưu": padding 0 10 (không còn chevron)
    expect(nut.className).toContain('px-2.5')
    expect(nut.className).not.toContain('pr-2 ')
    expect(nut.querySelectorAll('svg')).toHaveLength(1)
  })

  it('lỗi lưu: viền trong danger, tên có "lỗi lưu"', () => {
    render(<NutPillTrangThai trangThai="bo-qua" loi />)
    const nut = screen.getByRole('button', { name: 'Bỏ qua, lỗi lưu' })
    expect(nut.className).toContain('shadow-[inset_0_0_0_1px_var(--danger)]')
    expect(nut.className).not.toContain('hover:shadow')
  })

  it('mobile: vùng chạm 44 bằng ::before, pill vẫn cao 24', () => {
    render(<NutPillTrangThai trangThai="chua-hoc" />)
    const nut = screen.getByRole('button')
    expect(nut.className).toContain('max-md:before:-inset-y-2.5')
    expect(nut.className).toContain('h-[var(--h-chip)]')
  })

  it('nhận ref và aria-label (dùng làm asChild của Radix)', () => {
    let nutRef: HTMLButtonElement | null = null
    render(
      <NutPillTrangThai
        trangThai="dang-hoc"
        aria-label="Đổi trạng thái"
        ref={(el) => {
          nutRef = el
        }}
      />,
    )
    expect(nutRef).toBe(screen.getByRole('button', { name: 'Đổi trạng thái' }))
  })

  it('disabled thật của nơi dùng vẫn giữ nguyên', () => {
    render(<NutPillTrangThai trangThai="chua-hoc" disabled />)
    expect(screen.getByRole('button')).toHaveProperty('disabled', true)
  })

  it('không vi phạm axe', async () => {
    const { container } = render(
      <div>
        {CA.map(([tt]) => (
          <PillTrangThai key={tt} trangThai={tt} />
        ))}
        <NutPillTrangThai trangThai="dang-hoc" />
        <NutPillTrangThai trangThai="da-xong" dangLuu />
        <NutPillTrangThai trangThai="bo-qua" loi />
      </div>,
    )
    await expectNoAxeViolations(container)
  })
})

describe('NutPillTrangThai làm trigger Radix DropdownMenu', () => {
  beforeAll(() => {
    // jsdom không có ResizeObserver (Radix Popper đo kích thước nội dung menu).
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  })

  function MenuTrangThai() {
    const [dangLuu, datDangLuu] = useState(false)
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <NutPillTrangThai trangThai="dang-hoc" dangLuu={dangLuu} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Item onSelect={() => datDangLuu(true)}>Đã xong</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    )
  }

  it('chọn trạng thái → đang lưu: Radix trả focus về pill (không rơi về body), menu không mở lại', async () => {
    render(<MenuTrangThai />)
    const nut = screen.getByRole('button', { name: 'Đang học' })
    act(() => nut.focus())
    fireEvent.keyDown(nut, { key: 'Enter' })
    const muc = screen.getByRole('menuitem', { name: 'Đã xong' })
    fireEvent.keyDown(muc, { key: 'Enter' })
    expect(screen.queryByRole('menu')).toBeNull()
    const dangLuu = screen.getByRole('button', { name: 'Đang học, đang lưu' })
    // FocusScope của Radix trả focus trong setTimeout(0) sau khi menu đóng.
    await act(() => new Promise((xong) => setTimeout(xong, 0)))
    expect(document.activeElement).toBe(dangLuu)
    fireEvent.keyDown(dangLuu, { key: 'Enter' })
    fireEvent.pointerDown(dangLuu, { button: 0 })
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
