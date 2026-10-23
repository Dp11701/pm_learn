// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { Plus } from 'lucide-react'
import Nut, { NutLink, lopNut, type BienNut } from '../../../src/components/Nut'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

const BIEN: BienNut[] = ['chinh', 'phu', 'ghost', 'nguy-hiem']

describe('Nut (C35)', () => {
  it('mặc định là <button type="button"> biến thể phụ, cao 36 / 44 trên mobile', () => {
    render(<Nut>Soạn bài</Nut>)
    const nut = screen.getByRole('button', { name: 'Soạn bài' })
    expect(nut.tagName).toBe('BUTTON')
    expect(nut.getAttribute('type')).toBe('button')
    expect(nut.className).toContain('border-border-input')
    expect(nut.className).toContain('h-[var(--h-control)]')
    expect(nut.className).toContain('max-md:h-[var(--h-control-touch)]')
  })

  it('4 biến thể dùng đúng token màu (chính màu mực, nguy hiểm màu danger)', () => {
    const lop = Object.fromEntries(BIEN.map((b) => [b, lopNut({ bien: b })]))
    expect(lop.chinh).toContain('bg-primary')
    expect(lop.chinh).toContain('text-on-primary')
    expect(lop.chinh).toContain('not-disabled:hover:bg-primary-hover')
    expect(lop.phu).toContain('bg-surface')
    expect(lop.phu).toContain('not-disabled:hover:border-text')
    expect(lop.ghost).toContain('bg-transparent')
    expect(lop['nguy-hiem']).toContain('bg-danger')
    expect(lop['nguy-hiem']).toContain('hover:bg-[var(--danger-hover)]')
    for (const b of BIEN) expect(lop[b]).toContain('disabled:text-muted')
  })

  it('bản nhỏ cao 32, vẫn 44 trên mobile; nút vuông chỉ icon', () => {
    expect(lopNut({ co: 'nho' })).toContain('h-8')
    expect(lopNut({ co: 'nho' })).toContain('max-md:h-[var(--h-control-touch)]')
    expect(lopNut({ chiIcon: true })).toContain('w-[var(--h-control)]')
    expect(lopNut({ co: 'nho', chiIcon: true })).toContain('max-md:w-[var(--h-control-touch)]')
  })

  it('bấm gọi onClick; disabled thì không', () => {
    const bam = vi.fn()
    const { rerender } = render(
      <Nut bien="chinh" onClick={bam}>
        Ôn ngay
      </Nut>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(bam).toHaveBeenCalledTimes(1)
    rerender(
      <Nut bien="chinh" onClick={bam} disabled>
        Ôn ngay
      </Nut>,
    )
    expect(screen.getByRole('button')).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button'))
    expect(bam).toHaveBeenCalledTimes(1)
  })

  it('đang xử lý: spinner + chữ, aria-busy, không bấm lại được nhưng vẫn focus được', () => {
    const bam = vi.fn()
    render(
      <Nut bien="chinh" dangXuLy onClick={bam}>
        Đang lưu…
      </Nut>,
    )
    const nut = screen.getByRole('button', { name: 'Đang lưu…' })
    expect(nut.getAttribute('aria-busy')).toBe('true')
    expect(nut.getAttribute('aria-disabled')).toBe('true')
    expect(nut).toHaveProperty('disabled', false)
    fireEvent.click(nut)
    expect(bam).not.toHaveBeenCalled()
    nut.focus()
    expect(document.activeElement).toBe(nut)
    expect(nut.querySelector('span[aria-hidden="true"]')).not.toBeNull()
  })

  it('nút chỉ icon lấy tên từ aria-label; icon và ký tự đều aria-hidden', () => {
    render(
      <>
        <Nut chiIcon icon={Plus} aria-label="Thêm ghi chú" />
        <Nut chiIcon aria-label="Bảng phím tắt">
          ?
        </Nut>
      </>,
    )
    const icon = screen.getByRole('button', { name: 'Thêm ghi chú' })
    expect(icon.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    const kyTu = screen.getByRole('button', { name: 'Bảng phím tắt' })
    expect(kyTu.querySelector('span')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('icon kèm chữ: icon 16px (nhỏ 14px), aria-hidden', () => {
    render(
      <>
        <Nut icon={Plus}>Thêm</Nut>
        <Nut icon={Plus} co="nho">
          Thêm nhỏ
        </Nut>
      </>,
    )
    const [lon, nho] = screen.getAllByRole('button')
    expect(lon.querySelector('svg')?.getAttribute('width')).toBe('16')
    expect(nho.querySelector('svg')?.getAttribute('width')).toBe('14')
  })

  it('NutLink là link của router, trông như nút', () => {
    render(
      <MemoryRouter>
        <NutLink to="/on-tap" bien="chinh">
          Ôn ngay
        </NutLink>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Ôn ngay' })
    expect(link.getAttribute('href')).toBe('/on-tap')
    expect(link.className).toContain('bg-primary')
  })

  it('không vi phạm axe', async () => {
    const { container } = render(
      <MemoryRouter>
        {BIEN.map((b) => (
          <Nut key={b} bien={b}>
            {b}
          </Nut>
        ))}
        <Nut disabled>Tắt</Nut>
        <Nut dangXuLy>Đang lưu…</Nut>
        <Nut chiIcon icon={Plus} aria-label="Thêm" />
        <NutLink to="/">Về Tổng quan</NutLink>
      </MemoryRouter>,
    )
    await expectNoAxeViolations(container)
  })
})
