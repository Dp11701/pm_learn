// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import ChipNoiDung, { nhanNoiDung } from '../../../src/components/trang-thai/ChipNoiDung'
import type { TrangThaiNoiDung } from '../../../shared/domain/trang-thai'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

const CA: [TrangThaiNoiDung, string, string][] = [
  [{ loai: 'chua-co' }, 'Chưa có nội dung', 'file-x'],
  [{ loai: 'ban-nhap', nguon: 'ai' }, 'Bản nháp · AI', 'file-pen'],
  [{ loai: 'ban-nhap', nguon: 'tu-viet' }, 'Bản nháp · Tự viết', 'file-pen'],
  [{ loai: 'da-duyet', ngayDuyet: '2026-10-18' }, 'Đã duyệt · 18/10/2026', 'file-check'],
  [
    { loai: 'da-duyet', ngayDuyet: '2026-10-18', coBanSua: true },
    'Đã duyệt · có bản sửa chưa duyệt',
    'file-check',
  ],
]

const chip = (container: HTMLElement) => container.firstElementChild as HTMLElement

describe('ChipNoiDung (C8, D1)', () => {
  it.each(CA)('%j: luôn có icon + chữ "%s"', (tt, chu, icon) => {
    const { container } = render(<ChipNoiDung trangThai={tt} />)
    const c = chip(container)
    expect(c.textContent).toBe(chu)
    expect(nhanNoiDung(tt)).toBe(chu)
    const svg = c.querySelector('svg')!
    expect(svg.getAttribute('class')).toContain(`lucide-${icon}`)
    expect(svg.getAttribute('width')).toBe('14')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    // cao 24, padding 0 10, bo 6, chữ chip
    expect(c.className).toContain('h-[var(--h-chip)]')
    expect(c.className).toContain('px-2.5')
    expect(c.className).toContain('rounded-[var(--radius-sm)]')
    expect(c.className).toContain('text-[length:var(--fs-chip)]')
  })

  it('Chưa có nội dung: viền nét đứt border-input, chữ muted (nét đứt = "chưa có")', () => {
    const { container } = render(<ChipNoiDung trangThai={{ loai: 'chua-co' }} />)
    expect(chip(container).className).toContain('border-dashed')
    expect(chip(container).className).toContain('border-border-input')
    expect(chip(container).className).toContain('text-muted')
  })

  it('chỉ Chưa có dùng nét đứt; Bản nháp nền surface-2, Đã duyệt nền surface', () => {
    for (const [tt] of CA.slice(1)) {
      const { container, unmount } = render(<ChipNoiDung trangThai={tt} />)
      expect(chip(container).className).not.toContain('border-dashed')
      expect(chip(container).className).toContain(
        tt.loai === 'ban-nhap' ? 'bg-surface-2' : 'bg-surface',
      )
      unmount()
    }
  })

  it('Đã duyệt có bản sửa: thêm chấm 6px cạnh icon; Đã duyệt thường không có chấm', () => {
    const { container, rerender } = render(
      <ChipNoiDung trangThai={{ loai: 'da-duyet', ngayDuyet: '2026-10-18', coBanSua: true }} />,
    )
    const cham = container.querySelector('.size-1\\.5.rounded-full')
    expect(cham).not.toBeNull()
    expect(cham?.getAttribute('aria-hidden')).toBe('true')
    rerender(<ChipNoiDung trangThai={{ loai: 'da-duyet', ngayDuyet: '2026-10-18' }} />)
    expect(container.querySelector('.size-1\\.5.rounded-full')).toBeNull()
  })

  it('có `den` thì là link (vd. Chưa có → Soạn bài), hover theo F02, vùng chạm 44 trên mobile', () => {
    render(
      <MemoryRouter>
        <ChipNoiDung trangThai={{ loai: 'chua-co' }} den="/soan/x" />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Chưa có nội dung' })
    expect(link.getAttribute('href')).toBe('/soan/x')
    expect(link.className).toContain('hover:border-text')
    expect(link.className).toContain('hover:bg-surface-2')
    expect(link.className).toContain('hover:underline')
    expect(link.className).toContain('max-md:before:-inset-y-2.5')
    expect(link.className).toContain('relative')
  })

  it('disabled (chỉ đọc): chữ muted, không phải link dù có `den`', () => {
    const { container } = render(
      <MemoryRouter>
        <ChipNoiDung trangThai={{ loai: 'ban-nhap', nguon: 'tu-viet' }} den="/soan/x" voHieu />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link')).toBeNull()
    expect(chip(container).className).toContain('text-muted')
  })

  it('lỗi đọc file: icon alert-circle, viền + chữ danger, câu lỗi thay chữ', () => {
    const { container } = render(
      <ChipNoiDung trangThai={{ loai: 'ban-nhap', nguon: 'ai' }} loi="Lỗi frontmatter · dòng 3" />,
    )
    const c = chip(container)
    expect(c.textContent).toBe('Lỗi frontmatter · dòng 3')
    expect(c.className).toContain('border-danger')
    expect(c.className).toContain('text-danger')
    expect(c.querySelector('svg')?.getAttribute('class')).toContain('lucide-circle-alert')
  })

  it('không vi phạm axe', async () => {
    const { container } = render(
      <MemoryRouter>
        <div>
          {CA.map(([tt], i) => (
            <ChipNoiDung key={i} trangThai={tt} />
          ))}
          <ChipNoiDung trangThai={{ loai: 'chua-co' }} den="/soan/x" />
          <ChipNoiDung trangThai={{ loai: 'ban-nhap', nguon: 'ai' }} voHieu />
          <ChipNoiDung trangThai={{ loai: 'chua-co' }} loi="Lỗi frontmatter · dòng 3" />
        </div>
      </MemoryRouter>,
    )
    await expectNoAxeViolations(container)
  })
})
