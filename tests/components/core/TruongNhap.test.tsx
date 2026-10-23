// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TruongNhap, {
  TruongChon,
  TruongNgay,
  TruongVanBan,
  dangGhepChu,
} from '../../../src/components/TruongNhap'
import { LOI_NGAY } from '../../../shared/dinh-dang'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

const moTaCua = (o: HTMLElement) =>
  (o.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent)

describe('TruongNhap (C36)', () => {
  it('nhãn gắn với ô, gợi ý nối qua aria-describedby', () => {
    render(<TruongNhap nhan="Tên dự án" goiY="Tối đa 80 ký tự" />)
    const o = screen.getByLabelText('Tên dự án')
    expect(o.tagName).toBe('INPUT')
    expect(o.getAttribute('type')).toBe('text')
    expect(o.hasAttribute('aria-invalid')).toBe(false)
    expect(moTaCua(o)).toEqual(['Tối đa 80 ký tự'])
    expect(o.className).toContain('h-[var(--h-control)]')
    expect(o.className).toContain('max-md:h-[var(--h-control-touch)]')
  })

  it('lỗi: aria-invalid, viền danger 1,5px, câu lỗi thay gợi ý trong aria-describedby', () => {
    render(<TruongNhap nhan="Tên dự án" goiY="Gợi ý" loi="Chưa nhập tên." />)
    const o = screen.getByLabelText('Tên dự án')
    expect(o.getAttribute('aria-invalid')).toBe('true')
    expect(o.className).toContain('border-[1.5px] border-danger')
    expect(moTaCua(o)).toEqual(['Chưa nhập tên.'])
    expect(screen.queryByText('Gợi ý')).toBeNull()
  })

  it('voHieu: ô disabled, nhãn muted', () => {
    render(<TruongNhap nhan="Loại" voHieu defaultValue="Chủ đề" />)
    const o = screen.getByLabelText('Loại')
    expect(o).toHaveProperty('disabled', true)
    expect(screen.getByText('Loại').className).toContain('text-muted')
  })

  it('Enter / Esc gọi handler, nhưng bỏ qua khi đang ghép chữ (Telex/VNI) hoặc giữ Ctrl/⌘/Alt', () => {
    const enter = vi.fn()
    const esc = vi.fn()
    render(<TruongNhap nhan="Tìm" khiEnter={enter} khiEsc={esc} />)
    const o = screen.getByLabelText('Tìm')
    fireEvent.compositionStart(o)
    fireEvent.keyDown(o, { key: 'Enter', isComposing: true })
    fireEvent.keyDown(o, { key: 'Enter', keyCode: 229 })
    fireEvent.keyDown(o, { key: 'Escape', isComposing: true })
    fireEvent.compositionEnd(o)
    fireEvent.keyDown(o, { key: 'Enter', ctrlKey: true })
    fireEvent.keyDown(o, { key: 'Enter', metaKey: true })
    fireEvent.keyDown(o, { key: 'Escape', altKey: true })
    expect(enter).not.toHaveBeenCalled()
    expect(esc).not.toHaveBeenCalled()
    fireEvent.keyDown(o, { key: 'Enter' })
    fireEvent.keyDown(o, { key: 'Escape' })
    expect(enter).toHaveBeenCalledTimes(1)
    expect(esc).toHaveBeenCalledTimes(1)
  })

  it('dangGhepChu nhận cả isComposing lẫn keyCode 229', () => {
    expect(dangGhepChu(new KeyboardEvent('keydown', { isComposing: true }))).toBe(true)
    expect(dangGhepChu(new KeyboardEvent('keydown', { keyCode: 229 } as KeyboardEventInit))).toBe(
      true,
    )
    expect(dangGhepChu(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(false)
  })

  it('TruongVanBan: Enter xuống dòng (không gọi gì), Esc gọi khiEsc; TruongChon có nhãn', () => {
    const esc = vi.fn()
    render(
      <>
        <TruongVanBan nhan="Nói lại" khiEsc={esc} benPhaiNhan={<span>Đã lưu</span>} />
        <TruongChon nhan="Dự án">
          <option>Một</option>
        </TruongChon>
      </>,
    )
    const vb = screen.getByLabelText('Nói lại')
    expect(vb.tagName).toBe('TEXTAREA')
    const ev = fireEvent.keyDown(vb, { key: 'Enter' })
    expect(ev).toBe(true) // không preventDefault
    fireEvent.keyDown(vb, { key: 'Escape' })
    expect(esc).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Đã lưu')).toBeTruthy()
    expect(screen.getByLabelText('Dự án').tagName).toBe('SELECT')
  })

  it('không vi phạm axe', async () => {
    const { container } = render(
      <>
        <TruongNhap nhan="Tên" goiY="Gợi ý" />
        <TruongNhap nhan="Lỗi" loi="Sai." />
        <TruongNhap nhan="Tắt" voHieu />
        <TruongVanBan nhan="Nhiều dòng" />
        <TruongChon nhan="Chọn">
          <option>Một</option>
        </TruongChon>
        <TruongNgay nhan="Ngày thi" giaTri="2027-06-15" khiDoi={() => {}} />
      </>,
    )
    await expectNoAxeViolations(container)
  })
})

function NgayCoState({
  dau = null,
  khiDoi,
  khiEnter,
  khiEsc,
}: {
  dau?: string | null
  khiDoi?: (n: string | null) => void
  khiEnter?: (n: string | null) => void
  khiEsc?: () => void
}) {
  const [ngay, datNgay] = useState<string | null>(dau)
  return (
    <>
      <TruongNgay
        nhan="Ngày thi"
        giaTri={ngay}
        khiDoi={(n) => {
          datNgay(n)
          khiDoi?.(n)
        }}
        khiEnter={khiEnter}
        khiEsc={khiEsc}
      />
      <output data-testid="gia-tri">{ngay ?? 'trống'}</output>
    </>
  )
}

describe('TruongNgay (C36, dd/MM/yyyy)', () => {
  it('ô chữ inputmode=numeric, không phải date picker; hiện ngày đã có theo dd/MM/yyyy', () => {
    render(<NgayCoState dau="2027-06-15" />)
    const o = screen.getByLabelText('Ngày thi') as HTMLInputElement
    expect(o.type).toBe('text')
    expect(o.inputMode).toBe('numeric')
    expect(o.value).toBe('15/06/2027')
    expect(o.className).toContain('tabular-nums')
    expect(moTaCua(o)).toEqual(['dd/MM/yyyy'])
  })

  it('ngày không có thật → câu lỗi chuẩn, aria-invalid, không đổi giá trị', () => {
    const doi = vi.fn()
    render(<NgayCoState khiDoi={doi} />)
    const o = screen.getByLabelText('Ngày thi')
    fireEvent.change(o, { target: { value: '31/02/2026' } })
    fireEvent.blur(o)
    expect(o.getAttribute('aria-invalid')).toBe('true')
    expect(moTaCua(o)).toEqual([LOI_NGAY])
    expect(LOI_NGAY).toBe('Ngày không hợp lệ. Nhập theo dd/MM/yyyy.')
    expect(doi).not.toHaveBeenCalled()
    expect((o as HTMLInputElement).value).toBe('31/02/2026')
  })

  it('sai dạng (yyyy-MM-dd, chữ) cũng báo lỗi', () => {
    render(<NgayCoState />)
    const o = screen.getByLabelText('Ngày thi')
    for (const sai of ['2027-06-15', '15/6/27', 'mai']) {
      fireEvent.change(o, { target: { value: sai } })
      fireEvent.blur(o)
      expect(o.getAttribute('aria-invalid'), sai).toBe('true')
    }
  })

  it('ngày hợp lệ → khiDoi(YYYY-MM-DD), chuẩn hoá chữ, gỡ lỗi', () => {
    const doi = vi.fn()
    render(<NgayCoState khiDoi={doi} />)
    const o = screen.getByLabelText('Ngày thi') as HTMLInputElement
    fireEvent.change(o, { target: { value: '31/02/2026' } })
    fireEvent.blur(o)
    fireEvent.change(o, { target: { value: '5/1/2027' } })
    // sửa thành ngày đúng thì gỡ lỗi ngay khi gõ
    expect(o.hasAttribute('aria-invalid')).toBe(false)
    fireEvent.blur(o)
    expect(doi).toHaveBeenCalledWith('2027-01-05')
    expect(o.value).toBe('05/01/2027')
    expect(screen.getByTestId('gia-tri').textContent).toBe('2027-01-05')
  })

  it('xoá trắng → khiDoi(null)', () => {
    const doi = vi.fn()
    render(<NgayCoState dau="2027-06-15" khiDoi={doi} />)
    const o = screen.getByLabelText('Ngày thi')
    fireEvent.change(o, { target: { value: '  ' } })
    fireEvent.blur(o)
    expect(doi).toHaveBeenCalledWith(null)
    expect(o.hasAttribute('aria-invalid')).toBe(false)
  })

  it('Enter chốt ngày rồi gọi khiEnter; đang ghép chữ thì bỏ qua; ngày sai thì không gọi', () => {
    const enter = vi.fn()
    render(<NgayCoState khiEnter={enter} />)
    const o = screen.getByLabelText('Ngày thi')
    fireEvent.change(o, { target: { value: '15/06/2027' } })
    fireEvent.keyDown(o, { key: 'Enter', isComposing: true })
    fireEvent.keyDown(o, { key: 'Enter', keyCode: 229 })
    expect(enter).not.toHaveBeenCalled()
    expect(screen.getByTestId('gia-tri').textContent).toBe('trống')
    fireEvent.keyDown(o, { key: 'Enter' })
    expect(enter).toHaveBeenCalledWith('2027-06-15')
    expect(screen.getByTestId('gia-tri').textContent).toBe('2027-06-15')

    fireEvent.change(o, { target: { value: '32/01/2027' } })
    fireEvent.keyDown(o, { key: 'Enter' })
    expect(enter).toHaveBeenCalledTimes(1)
    expect(o.getAttribute('aria-invalid')).toBe('true')
  })

  it('Esc trả về ngày đã chốt và gỡ lỗi; đang ghép chữ thì không', () => {
    const esc = vi.fn()
    render(<NgayCoState dau="2027-06-15" khiEsc={esc} />)
    const o = screen.getByLabelText('Ngày thi') as HTMLInputElement
    fireEvent.change(o, { target: { value: '99/99/2027' } })
    fireEvent.blur(o)
    fireEvent.keyDown(o, { key: 'Escape', isComposing: true })
    expect(esc).not.toHaveBeenCalled()
    expect(o.value).toBe('99/99/2027')
    fireEvent.keyDown(o, { key: 'Escape' })
    expect(esc).toHaveBeenCalledTimes(1)
    expect(o.value).toBe('15/06/2027')
    expect(o.hasAttribute('aria-invalid')).toBe(false)
  })

  it('giá trị ngoài đổi thì ô hiện theo', () => {
    const { rerender } = render(<TruongNgay nhan="Ngày" giaTri="2027-06-15" khiDoi={() => {}} />)
    rerender(<TruongNgay nhan="Ngày" giaTri="2027-04-17" khiDoi={() => {}} />)
    expect((screen.getByLabelText('Ngày') as HTMLInputElement).value).toBe('17/04/2027')
  })
})
