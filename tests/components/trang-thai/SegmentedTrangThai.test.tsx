// @vitest-environment jsdom
import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SegmentedTrangThai, {
  viTriKeTiep,
} from '../../../src/components/trang-thai/SegmentedTrangThai'
import type { TrangThaiHoc } from '../../../shared/domain/trang-thai'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

const TEN = ['Chưa học', 'Đang học', 'Đã xong', 'Bỏ qua']

function CoTrangThai({
  dau = 'dang-hoc',
  khiDoi,
}: {
  dau?: TrangThaiHoc
  khiDoi?: (tt: TrangThaiHoc) => void
}) {
  const [giaTri, datGiaTri] = useState<TrangThaiHoc>(dau)
  return (
    <SegmentedTrangThai
      giaTri={giaTri}
      khiDoi={(tt) => {
        datGiaTri(tt)
        khiDoi?.(tt)
      }}
      goiYPhim
    />
  )
}

const doan = () => screen.getAllByRole('radio')

describe('SegmentedTrangThai (C6)', () => {
  it('radiogroup có nhãn, 4 đoạn icon + chữ theo thứ tự, đúng 1 đoạn được chọn', () => {
    render(<SegmentedTrangThai giaTri="dang-hoc" khiDoi={() => {}} />)
    const nhom = screen.getByRole('radiogroup', { name: 'Trạng thái học' })
    expect(nhom.className).toContain('rounded-[var(--radius-sm)]')
    expect(nhom.className).toContain('p-[3px]')
    expect(nhom.className).toContain('border-border-input')
    const ds = doan()
    expect(ds.map((d) => d.textContent)).toEqual(TEN)
    for (const d of ds) {
      expect(d.querySelector('svg')).not.toBeNull()
      expect(d.querySelector('svg')?.getAttribute('width')).toBe('16')
      // cao 28 + padding 3 + viền 1 = 36; mobile 44
      expect(d.className).toContain('h-7')
      expect(d.className).toContain('max-md:h-[var(--h-control-touch)]')
    }
    expect(ds.map((d) => d.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
      'false',
    ])
  })

  it('D16 / quyết định 2: đoạn đang chọn = nền pill + viền trong 1,5px màu trạng thái, chữ 600', () => {
    render(<SegmentedTrangThai giaTri="da-xong" khiDoi={() => {}} />)
    const chon = screen.getByRole('radio', { name: 'Đã xong' })
    expect(chon.className).toContain('bg-[var(--st-done-bg)]')
    expect(chon.className).toContain('text-[var(--st-done-fg)]')
    expect(chon.className).toContain('shadow-[inset_0_0_0_1.5px_var(--st-done-vien)]')
    expect(chon.className).toContain('font-semibold')
    const khac = screen.getByRole('radio', { name: 'Chưa học' })
    expect(khac.className).toContain('hover:bg-surface-2')
    expect(khac.className).not.toContain('shadow-[inset')
  })

  it('gợi ý phím 1–4: kbd ẩn với trình đọc màn hình, có aria-keyshortcuts', () => {
    render(<CoTrangThai />)
    const ds = doan()
    expect(ds.map((d) => d.getAttribute('aria-keyshortcuts'))).toEqual(['1', '2', '3', '4'])
    expect(ds.map((d) => d.querySelector('kbd')?.textContent)).toEqual(['1', '2', '3', '4'])
    expect(ds[0].querySelector('kbd')?.getAttribute('aria-hidden')).toBe('true')
    // Tên truy cập không lẫn số phím
    expect(screen.getByRole('radio', { name: 'Bỏ qua' })).toBe(ds[3])
  })

  it('không bật gợi ý thì không có kbd', () => {
    render(<SegmentedTrangThai giaTri={null} khiDoi={() => {}} />)
    expect(document.querySelector('kbd')).toBeNull()
    expect(doan()[0].hasAttribute('aria-keyshortcuts')).toBe(false)
  })

  it('bấm đoạn khác gọi khiDoi; bấm đoạn đang chọn thì không', () => {
    const khiDoi = vi.fn()
    render(<SegmentedTrangThai giaTri="dang-hoc" khiDoi={khiDoi} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Đang học' }))
    expect(khiDoi).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('radio', { name: 'Bỏ qua' }))
    expect(khiDoi).toHaveBeenCalledWith('bo-qua')
  })

  it('roving tabindex: chỉ đoạn đang chọn có tabindex 0; chưa có giá trị thì đoạn đầu', () => {
    const { rerender } = render(<SegmentedTrangThai giaTri="da-xong" khiDoi={() => {}} />)
    expect(doan().map((d) => d.tabIndex)).toEqual([-1, -1, 0, -1])
    rerender(<SegmentedTrangThai giaTri={null} khiDoi={() => {}} />)
    expect(doan().map((d) => d.tabIndex)).toEqual([0, -1, -1, -1])
  })

  it('mũi tên / Home / End dời focus (vòng lại hai đầu), không đổi trạng thái', () => {
    const khiDoi = vi.fn()
    render(<CoTrangThai dau="dang-hoc" khiDoi={khiDoi} />)
    const ds = doan()
    act(() => ds[1].focus())
    fireEvent.keyDown(ds[1], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(ds[2])
    expect(ds[2].tabIndex).toBe(0)
    expect(ds[1].tabIndex).toBe(-1)
    fireEvent.keyDown(ds[2], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(ds[3])
    fireEvent.keyDown(ds[3], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(ds[0])
    fireEvent.keyDown(ds[0], { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(ds[3])
    fireEvent.keyDown(ds[3], { key: 'ArrowUp' })
    expect(document.activeElement).toBe(ds[2])
    fireEvent.keyDown(ds[2], { key: 'Home' })
    expect(document.activeElement).toBe(ds[0])
    fireEvent.keyDown(ds[0], { key: 'End' })
    expect(document.activeElement).toBe(ds[3])
    // Đổi trạng thái có hiệu lực ngay nên mũi tên không được chọn (tránh lướt qua Đã xong)
    expect(khiDoi).not.toHaveBeenCalled()
    expect(ds[1].getAttribute('aria-checked')).toBe('true')
  })

  it('mũi tên được preventDefault; phím khác thì không', () => {
    render(<CoTrangThai />)
    const ds = doan()
    act(() => ds[1].focus())
    expect(fireEvent.keyDown(ds[1], { key: 'ArrowRight' })).toBe(false)
    expect(fireEvent.keyDown(ds[2], { key: 'a' })).toBe(true)
    expect(fireEvent.keyDown(ds[2], { key: 'Tab' })).toBe(true)
  })

  it('không nuốt tổ hợp Alt/Ctrl/⌘/Shift và bỏ qua khi IME đang ghép chữ', () => {
    render(<CoTrangThai />)
    const ds = doan()
    act(() => ds[1].focus())
    for (const mod of [
      { altKey: true },
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
    ]) {
      expect(fireEvent.keyDown(ds[1], { key: 'ArrowRight', ...mod })).toBe(true)
      expect(document.activeElement).toBe(ds[1])
    }
    expect(fireEvent.keyDown(ds[1], { key: 'ArrowRight', isComposing: true })).toBe(true)
    expect(fireEvent.keyDown(ds[1], { key: 'ArrowRight', keyCode: 229 })).toBe(true)
    expect(document.activeElement).toBe(ds[1])
  })

  it('Enter / Space trên đoạn đang focus chọn đoạn đó (nút gốc)', () => {
    const khiDoi = vi.fn()
    render(<CoTrangThai dau="chua-hoc" khiDoi={khiDoi} />)
    const ds = doan()
    act(() => ds[0].focus())
    fireEvent.keyDown(ds[0], { key: 'ArrowRight' })
    // jsdom không tự sinh click từ Enter; nút gốc <button type="button"> làm việc này trên trình duyệt
    expect(ds[1].tagName).toBe('BUTTON')
    expect(ds[1].getAttribute('type')).toBe('button')
    fireEvent.click(ds[1])
    expect(khiDoi).toHaveBeenCalledWith('dang-hoc')
    expect(ds[1].getAttribute('aria-checked')).toBe('true')
  })

  it('ra khỏi nhóm thì tab stop trở về đoạn đang chọn', () => {
    render(
      <>
        <CoTrangThai dau="dang-hoc" />
        <button type="button">Ngoài</button>
      </>,
    )
    const ds = doan()
    act(() => ds[1].focus())
    fireEvent.keyDown(ds[1], { key: 'End' })
    expect(ds[3].tabIndex).toBe(0)
    act(() => screen.getByRole('button', { name: 'Ngoài' }).focus())
    expect(doan().map((d) => d.tabIndex)).toEqual([-1, 0, -1, -1])
  })

  it('disabled (đang tải): khung surface-2, các đoạn disabled, không gọi khiDoi', () => {
    const khiDoi = vi.fn()
    render(<SegmentedTrangThai giaTri="dang-hoc" khiDoi={khiDoi} voHieu />)
    const nhom = screen.getByRole('radiogroup')
    expect(nhom.getAttribute('aria-disabled')).toBe('true')
    expect(nhom.className).toContain('bg-surface-2')
    expect(nhom.className).toContain('text-muted')
    for (const d of doan()) expect(d).toHaveProperty('disabled', true)
    // Đoạn đang chọn vẫn thấy được: nền surface, chữ 600, không viền màu
    const chon = screen.getByRole('radio', { name: 'Đang học' })
    expect(chon.className).toContain('bg-surface')
    expect(chon.className).not.toContain('--st-learning-bg')
    fireEvent.click(screen.getByRole('radio', { name: 'Bỏ qua' }))
    expect(khiDoi).not.toHaveBeenCalled()
  })

  it('lỗi lưu: khung viền danger, câu lỗi có icon + "Thử lại", gắn aria-describedby', () => {
    const thuLai = vi.fn()
    render(<SegmentedTrangThai giaTri="dang-hoc" khiDoi={() => {}} loi thuLai={thuLai} />)
    const nhom = screen.getByRole('radiogroup')
    expect(nhom.className).toContain('border-danger')
    const cau = document.getElementById(nhom.getAttribute('aria-describedby')!)!
    expect(cau.textContent).toBe('Lỗi lưu — đã giữ trạng thái cũ.Thử lại')
    expect(cau.querySelector('svg')).not.toBeNull()
    // đoạn đang chọn giữ nền pill, bỏ viền màu
    const chon = screen.getByRole('radio', { name: 'Đang học' })
    expect(chon.className).toContain('bg-[var(--st-learning-bg)]')
    expect(chon.className).not.toContain('inset_0_0_0_1.5px')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(thuLai).toHaveBeenCalledTimes(1)
  })

  it('viTriKeTiep', () => {
    expect(viTriKeTiep('ArrowRight', 3, 4)).toBe(0)
    expect(viTriKeTiep('ArrowLeft', 0, 4)).toBe(3)
    expect(viTriKeTiep('Home', 2, 4)).toBe(0)
    expect(viTriKeTiep('End', 0, 4)).toBe(3)
    expect(viTriKeTiep('Enter', 1, 4)).toBeNull()
  })

  it('không vi phạm axe (thường, gợi ý phím, disabled, lỗi)', async () => {
    const { container } = render(
      <div>
        <SegmentedTrangThai giaTri="dang-hoc" khiDoi={() => {}} goiYPhim />
        <SegmentedTrangThai giaTri={null} khiDoi={() => {}} nhan="Trạng thái mục khác" />
        <SegmentedTrangThai giaTri="bo-qua" khiDoi={() => {}} voHieu nhan="Đang tải" />
        <SegmentedTrangThai
          giaTri="da-xong"
          khiDoi={() => {}}
          loi
          thuLai={() => {}}
          nhan="Có lỗi"
        />
      </div>,
    )
    await expectNoAxeViolations(container)
  })
})
