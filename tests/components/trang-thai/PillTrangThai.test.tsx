// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PillTrangThai, {
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

  it('đang lưu: disabled, aria-busy, nền surface-2, không chevron', () => {
    render(<NutPillTrangThai trangThai="da-xong" dangLuu />)
    const nut = screen.getByRole('button', { name: 'Đã xong, đang lưu' })
    expect(nut).toHaveProperty('disabled', true)
    expect(nut.getAttribute('aria-busy')).toBe('true')
    expect(nut.className).toContain('bg-surface-2')
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
