// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ChipLoai, { iconLoai, type LoaiChip } from '../../../src/components/trang-thai/ChipLoai'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

const CA: [LoaiChip, string, string, string][] = [
  ['linh-vuc', 'Lĩnh vực', 'area', 'layers'],
  ['chu-de', 'Chủ đề', 'topic', 'book-open'],
  ['tai-lieu', 'Tài liệu', 'doc', 'file-text'],
  ['chung-chi', 'Chứng chỉ', 'topic', 'award'],
  ['nhom', 'Nhóm', 'group', 'folder'],
]

describe('ChipLoai (C4)', () => {
  it.each(CA)('%s: icon + "%s", màu token loại %s, icon %s', (loai, chu, mau, icon) => {
    const { container } = render(<ChipLoai loai={loai} />)
    const chip = container.firstElementChild as HTMLElement
    expect(chip.textContent).toBe(chu)
    expect(chip.className).toContain(`bg-[var(--type-${mau}-bg)]`)
    expect(chip.className).toContain(`border-[var(--type-${mau}-bd)]`)
    expect(chip.className).toContain(`text-[var(--type-${mau}-fg)]`)
    expect(chip.className).toContain('h-[var(--h-chip)]')
    const svg = chip.querySelector('svg')!
    expect(svg.getAttribute('class')).toContain(`lucide-${icon}`)
    expect(svg.getAttribute('width')).toBe('14')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
  })

  it('D33: Chứng chỉ dùng màu Chủ đề + award', () => {
    const { container } = render(<ChipLoai loai="chung-chi" />)
    expect(container.innerHTML).toContain('--type-topic-bg')
    expect(container.querySelector('.lucide-award')).not.toBeNull()
    expect(iconLoai('chung-chi')).toBe(iconLoai('chung-chi'))
  })

  it('bản chỉ icon (C28, D3): ô 20px có aria-label tên loại', () => {
    render(<ChipLoai loai="tai-lieu" chiIcon />)
    const o = screen.getByRole('img', { name: 'Tài liệu' })
    expect(o.className).toContain('size-5')
    expect(o.className).toContain('bg-[var(--type-doc-bg)]')
    expect(o.querySelector('svg')).not.toBeNull()
  })

  it('không vi phạm axe', async () => {
    const { container } = render(
      <div>
        {CA.map(([loai]) => (
          <ChipLoai key={loai} loai={loai} />
        ))}
        <ChipLoai loai="chu-de" chiIcon />
      </div>,
    )
    await expectNoAxeViolations(container)
  })
})
