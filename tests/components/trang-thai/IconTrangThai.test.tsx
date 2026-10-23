// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import IconTrangThai, {
  GlyphCanOnLai,
  netIcon,
  nhanTrangThai,
} from '../../../src/components/trang-thai/IconTrangThai'
import { CAC_TRANG_THAI_HOC } from '../../../shared/domain/trang-thai'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

describe('IconTrangThai', () => {
  it('4 hình khác nhau: vòng / vòng tô nửa / vòng + check / vòng + gạch chéo', () => {
    const { container } = render(
      <>
        {CAC_TRANG_THAI_HOC.map((tt) => (
          <IconTrangThai key={tt} trangThai={tt} />
        ))}
      </>,
    )
    const svg = [...container.querySelectorAll('svg')]
    expect(svg).toHaveLength(4)
    const duongVe = svg.map((s) => s.querySelector('path')?.getAttribute('d') ?? null)
    expect(duongVe).toEqual([null, 'M12 2a10 10 0 0 1 0 20z', 'm9 12 2 2 4-4', 'm4.9 4.9 14.2 14.2'])
    // Đang học tô nửa vòng
    expect(svg[1].querySelector('path')?.getAttribute('fill')).toBe('currentColor')
    for (const s of svg) expect(s.querySelector('circle')?.getAttribute('r')).toBe('10')
  })

  it('đi kèm chữ thì aria-hidden; đứng một mình có nhãn thì role="img"', () => {
    const { container } = render(
      <>
        <IconTrangThai trangThai="dang-hoc" />
        <IconTrangThai trangThai="da-xong" nhan="Đã xong" />
      </>,
    )
    const [an, co] = [...container.children] as HTMLElement[]
    expect(an.getAttribute('aria-hidden')).toBe('true')
    expect(an.hasAttribute('role')).toBe(false)
    expect(screen.getByRole('img', { name: 'Đã xong' })).toBe(co)
  })

  it('cỡ và nét như frame: 16 mặc định nét 2, 12 trở xuống nét 2,5', () => {
    const { container } = render(<IconTrangThai trangThai="chua-hoc" />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('16')
    expect(svg.getAttribute('stroke-width')).toBe('2')
    expect(netIcon(12)).toBe(2.5)
    expect(netIcon(14)).toBe(2)
  })

  it('toMau tô theo token icon trạng thái, mặc định theo màu chữ cha', () => {
    const { container } = render(
      <>
        <IconTrangThai trangThai="dang-hoc" toMau />
        <IconTrangThai trangThai="dang-hoc" />
      </>,
    )
    const [co, khong] = [...container.children] as HTMLElement[]
    expect(co.className).toContain('text-[var(--st-learning-ic)]')
    expect(khong.className).not.toContain('--st-learning-ic')
  })

  it('Cần ôn lại: glyph ↺ trong vòng 16px nền surface ở góc phải trên, màu mòng két', () => {
    const { container } = render(
      <IconTrangThai trangThai="da-xong" canOnLai nhan={nhanTrangThai('da-xong', true)} />,
    )
    const icon = screen.getByRole('img', { name: 'Đã xong, Cần ôn lại' })
    expect(icon.className).toContain('relative')
    const glyph = container.querySelector('span[aria-hidden="true"]') as HTMLElement
    expect(glyph.className).toContain('size-4')
    expect(glyph.className).toContain('rounded-full')
    expect(glyph.className).toContain('bg-surface')
    expect(glyph.className).toContain('text-[var(--st-review-solid)]')
    expect(glyph.className).toContain('-top-2 -right-2')
    expect(glyph.querySelector('svg')?.getAttribute('width')).toBe('11')
  })

  it('GlyphCanOnLai đổi được vị trí', () => {
    const { container } = render(<GlyphCanOnLai className="absolute top-0 right-0" />)
    expect((container.firstElementChild as HTMLElement).className).toContain('top-0 right-0')
  })

  it('nhanTrangThai', () => {
    expect(nhanTrangThai('bo-qua')).toBe('Bỏ qua')
    expect(nhanTrangThai('da-xong', true)).toBe('Đã xong, Cần ôn lại')
  })

  it('không vi phạm axe', async () => {
    const { container } = render(
      <p>
        <IconTrangThai trangThai="dang-hoc" /> Đang học{' '}
        <IconTrangThai trangThai="da-xong" canOnLai nhan="Đã xong, Cần ôn lại" />
      </p>,
    )
    await expectNoAxeViolations(container)
  })
})
