// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Badge, { chuBadge, SO_BADGE_TOI_DA } from '../../../src/components/trang-thai/Badge'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

describe('Badge (C7, quyết định 4)', () => {
  it('chuBadge: 0 / âm / NaN ẩn, > 99 thành "99+", số lẻ làm tròn xuống', () => {
    expect(chuBadge(0)).toBeNull()
    expect(chuBadge(-3)).toBeNull()
    expect(chuBadge(Number.NaN)).toBeNull()
    expect(chuBadge(1)).toBe('1')
    expect(chuBadge(99)).toBe('99')
    expect(chuBadge(100)).toBe('99+')
    expect(chuBadge(1234)).toBe('99+')
    expect(chuBadge(12.7)).toBe('12')
    expect(SO_BADGE_TOI_DA).toBe(99)
  })

  it('0 thì không render gì', () => {
    const { container } = render(<Badge so={0} />)
    expect(container.innerHTML).toBe('')
  })

  it('đặc (mặc định) = việc cần làm hôm nay: nền mực, chữ on-primary, cao 20, bo tròn', () => {
    render(<Badge so={12} />)
    const b = screen.getByText('12')
    expect(b.dataset.kieu).toBe('dac')
    expect(b.className).toContain('bg-primary')
    expect(b.className).toContain('text-on-primary')
    expect(b.className).toContain('h-5')
    expect(b.className).toContain('min-w-5')
    expect(b.className).toContain('rounded-[10px]')
    expect(b.className).toContain('px-1.5')
    expect(b.className).toContain('leading-5')
    expect(b.className).toContain('tabular-nums')
  })

  it('viền = số đếm thông tin: viền border-input, chữ text, line-height 18', () => {
    render(<Badge so={9} kieu="vien" />)
    const b = screen.getByText('9')
    expect(b.dataset.kieu).toBe('vien')
    expect(b.className).toContain('border-border-input')
    expect(b.className).toContain('text-text')
    expect(b.className).not.toContain('bg-primary')
    expect(b.className).toContain('leading-[18px]')
  })

  it('"99+" khi vượt 99; bản nhỏ cho rail cao 16', () => {
    render(<Badge so={150} nho />)
    const b = screen.getByText('99+')
    expect(b.className).toContain('h-4')
    expect(b.className).toContain('min-w-4')
  })

  it('có nhãn thì số hiện ra aria-hidden, trình đọc màn hình đọc câu đầy đủ', () => {
    const { container } = render(<Badge so={12} nhan="12 thẻ đến hạn" />)
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('12')
    expect(container.querySelector('.sr-only')?.textContent).toBe('12 thẻ đến hạn')
  })

  it('không vi phạm axe', async () => {
    const { container } = render(
      <ul>
        <li>
          Ôn tập <Badge so={12} nhan="12 thẻ đến hạn" />
        </li>
        <li>
          Nội dung <Badge so={9} kieu="vien" />
        </li>
        <li>
          Rail <Badge so={120} nho />
        </li>
      </ul>,
    )
    await expectNoAxeViolations(container)
  })
})
