// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotebookPen } from 'lucide-react'
import TrangThaiTrong, {
  DongCho,
  HopCho,
  SapCo,
  TheCho,
  TrangThaiLoi,
  VungDangTai,
} from '../../../src/components/TrangThaiTrong'
import Nut from '../../../src/components/Nut'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

describe('TrangThaiTrong (C38 empty, D20)', () => {
  it('icon 40px trong vòng surface-2 (aria-hidden) + câu + nút; không nét đứt', () => {
    const { container } = render(
      <TrangThaiTrong
        icon={NotebookPen}
        cauChinh="Chưa có ghi chú"
        nut={<Nut>Mở bài</Nut>}
        khung
      />,
    )
    const vong = container.querySelector('span[aria-hidden="true"]') as HTMLElement
    expect(vong.className).toContain('size-10')
    expect(vong.className).toContain('rounded-full')
    expect(vong.className).toContain('bg-surface-2')
    expect(vong.querySelector('svg')?.getAttribute('width')).toBe('20')
    expect(screen.getByText('Chưa có ghi chú').tagName).toBe('P')
    expect(screen.getByRole('button', { name: 'Mở bài' })).toBeTruthy()
    expect(container.innerHTML).not.toContain('dashed')
    expect((container.firstElementChild as HTMLElement).className).toContain('border-border')
  })

  it('canh giữa cỡ trang, câu chính có thể là h2', () => {
    render(<TrangThaiTrong icon={NotebookPen} cauChinh="Trống" cauChinhLa="h2" canGiua />)
    const h = screen.getByRole('heading', { level: 2, name: 'Trống' })
    expect(h.className).toContain('text-[length:var(--fs-h2)]')
  })
})

describe('TrangThaiLoi (C38 error)', () => {
  it('icon alert-circle danger, viền danger khi tự vẽ khung, Thử lại gọi hàm', () => {
    const thu = vi.fn()
    const { container } = render(
      <TrangThaiLoi cauChinh="Không tải được card này" thuLai={thu} khung />,
    )
    expect((container.firstElementChild as HTMLElement).className).toContain('border-danger')
    expect(container.querySelector('span[aria-hidden="true"]')?.className).toContain('text-danger')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(thu).toHaveBeenCalledTimes(1)
  })

  it('Chi tiết lỗi: nút mở/đóng (aria-expanded, aria-controls) khối chữ mono', () => {
    render(
      <TrangThaiLoi
        cauChinh="Trang này gặp lỗi khi hiển thị."
        cauChinhLa="h2"
        canGiua
        moTa="Dữ liệu học của bạn không bị ảnh hưởng."
        nut={<Nut bien="chinh">Tải lại</Nut>}
        chiTiet="TypeError: x is undefined"
      />,
    )
    const nut = screen.getByRole('button', { name: /Chi tiết lỗi/ })
    const khoi = document.getElementById(nut.getAttribute('aria-controls') ?? '') as HTMLElement
    expect(nut.getAttribute('aria-expanded')).toBe('false')
    expect(khoi.hidden).toBe(true)
    fireEvent.click(nut)
    expect(nut.getAttribute('aria-expanded')).toBe('true')
    expect(khoi.hidden).toBe(false)
    expect(khoi.textContent).toBe('TypeError: x is undefined')
    // thứ tự nút: Tải lại trước Chi tiết lỗi (F26)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Tải lại',
      'Chi tiết lỗi ▴',
    ])
  })
})

describe('SapCo (C38 "Có ở phase n")', () => {
  it('câu chính "Có ở phase n"', () => {
    render(<SapCo phase={3} />)
    expect(screen.getByText('Có ở phase 3')).toBeTruthy()
  })

  it('có tiêu đề thì "Có ở phase n" thành dòng phụ, kèm mô tả và nút', () => {
    render(
      <SapCo phase="7c" tieuDe="Bản của tôi" moTa="Làm bản của riêng bạn." nut={<Nut>Xem</Nut>} />,
    )
    expect(screen.getByText('Bản của tôi')).toBeTruthy()
    expect(screen.getByText(/Có ở phase 7c/).textContent).toBe(
      'Có ở phase 7c · Làm bản của riêng bạn.',
    )
    expect(screen.getByRole('button', { name: 'Xem' })).toBeTruthy()
  })
})

describe('Skeleton (C38)', () => {
  it('vùng đang tải: aria-busy + chữ "Đang tải…" cho trình đọc màn hình; khối skeleton aria-hidden', () => {
    const { container } = render(
      <VungDangTai>
        <TheCho />
        <DongCho rong="40%" />
        <HopCho cao={120} tron rong="120px" />
      </VungDangTai>,
    )
    const vung = container.firstElementChild as HTMLElement
    expect(vung.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('Đang tải…').className).toContain('sr-only')
    const khoi = vung.querySelectorAll('[aria-hidden="true"]')
    expect(khoi.length).toBeGreaterThan(0)
  })

  it('card F26: 4 dòng 40% · 70% (cao 20) · 90% · 60%; nhấp nháy chỉ khi motion-safe', () => {
    const { container } = render(<TheCho cao={140} />)
    const the = container.firstElementChild as HTMLElement
    expect(the.style.height).toBe('140px')
    const dong = Array.from(the.children) as HTMLElement[]
    expect(dong.map((d) => d.style.width)).toEqual(['40%', '70%', '90%', '60%'])
    expect(dong.map((d) => d.style.height)).toEqual(['12px', '20px', '12px', '12px'])
    for (const d of dong) {
      expect(d.className).toContain('bg-[var(--skeleton-bg)]')
      expect(d.className).toMatch(/(^|\s)motion-safe:animate-\[nhap-nhay/)
      expect(d.className).not.toMatch(/(^|\s)animate-/)
    }
  })

  it('không vi phạm axe', async () => {
    const { container } = render(
      <>
        <TrangThaiTrong icon={NotebookPen} cauChinh="Trống" nut={<Nut>Mở</Nut>} />
        <TrangThaiLoi cauChinh="Lỗi" thuLai={() => {}} chiTiet="chi tiết" />
        <SapCo phase={4} tieuDe="Danh sách" />
        <VungDangTai>
          <TheCho />
        </VungDangTai>
      </>,
    )
    await expectNoAxeViolations(container)
  })
})
