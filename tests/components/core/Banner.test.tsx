// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WifiOff } from 'lucide-react'
import Banner from '../../../src/components/Banner'
import Nut from '../../../src/components/Nut'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

describe('Banner (C26)', () => {
  it('thông tin: role status, nền surface-2, viền 1px border-input, icon info 20px, tiêu đề đậm, không vạch trái', () => {
    render(
      <Banner
        tieuDe="Bản nháp chưa được duyệt"
        moTa="Soát từng khối rồi bấm Duyệt bài."
        hanhDong={<Nut>Vào chế độ duyệt</Nut>}
      />,
    )
    const b = screen.getByRole('status')
    expect(b.className).toContain('bg-surface-2')
    expect(b.className).toContain('border-border-input')
    expect(b.className).not.toMatch(/border-l-/)
    const icon = b.querySelector('svg')
    expect(icon?.getAttribute('width')).toBe('20')
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByText('Bản nháp chưa được duyệt').tagName).toBe('STRONG')
    expect(screen.getByText('Soát từng khối rồi bấm Duyệt bài.').className).toContain('text-muted')
    expect(screen.getByRole('button', { name: 'Vào chế độ duyệt' })).toBeTruthy()
  })

  it('lỗi (D30): role alert, viền + icon alert-circle + tiêu đề màu danger', () => {
    render(<Banner loai="loi" tieuDe="Không đọc được file" />)
    const b = screen.getByRole('alert')
    expect(b.className).toContain('border-danger')
    expect(b.className).toContain('bg-surface-2')
    expect(b.querySelector('svg')?.getAttribute('class')).toContain('text-danger')
    expect(b.querySelector('svg')?.getAttribute('class')).toContain('lucide-circle-alert')
    expect(screen.getByText('Không đọc được file').className).toContain('text-danger')
  })

  it('dính đầu trang, icon riêng, mô tả là vùng live (banner mất kết nối F26)', () => {
    render(
      <Banner
        loai="loi"
        dinh
        icon={WifiOff}
        tieuDe="Mất kết nối với máy chủ cục bộ."
        moTa="Tự thử lại sau 5 giây…"
        moTaLive
        hanhDong={<Nut>Thử ngay</Nut>}
      />,
    )
    const b = screen.getByRole('alert')
    expect(b.className).toContain('sticky')
    expect(b.className).toContain('top-0')
    expect(b.querySelector('svg')?.getAttribute('class')).toContain('lucide-wifi-off')
    expect(screen.getByText('Tự thử lại sau 5 giây…').getAttribute('aria-live')).toBe('polite')
  })

  it('nút đóng gọi khiDong; disabled (voHieu) không có role, chữ muted', () => {
    const dong = vi.fn()
    const { rerender } = render(<Banner tieuDe="Có thay đổi" khiDong={dong} />)
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }))
    expect(dong).toHaveBeenCalledTimes(1)
    rerender(<Banner tieuDe="Có thay đổi" voHieu hanhDong={<Nut disabled>Mở bản sửa</Nut>} />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByText('Có thay đổi').closest('div[class*="border-border"]')).not.toBeNull()
  })

  it('không vi phạm axe', async () => {
    const { container } = render(
      <>
        <Banner tieuDe="Thông tin" moTa="Mô tả" hanhDong={<Nut>Xem</Nut>} khiDong={() => {}} />
        <Banner loai="loi" tieuDe="Lỗi" hanhDong={<Nut>Thử ngay</Nut>} />
        <Banner tieuDe="Tắt" voHieu />
      </>,
    )
    await expectNoAxeViolations(container)
  })
})
