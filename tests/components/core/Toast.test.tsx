// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SO_TOAST_TOI_DA,
  THOI_GIAN_TOAST,
  ToastProvider,
  useKhoangDayToast,
  useToast,
  type ApiToast,
  type TuyChonToast,
} from '../../../src/components/Toast'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

let api: ApiToast
function LayApi() {
  api = useToast()
  return null
}

function dung(khoangDay?: number) {
  return render(
    <ToastProvider khoangDay={khoangDay}>
      <LayApi />
      <button type="button">Ngoài</button>
    </ToastProvider>,
  )
}

const vung = () => screen.getByRole('status', { name: 'Thông báo' })
const hien = (t: TuyChonToast) => {
  let id = ''
  act(() => {
    id = api.toast(t)
  })
  return id
}
const troi = (ms: number) => act(() => vi.advanceTimersByTime(ms))

describe('Toast (C33)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('một vùng aria-live polite (role=status) luôn có mặt, rỗng khi chưa có toast', () => {
    dung()
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(vung().getAttribute('aria-live')).toBe('polite')
    expect(vung().textContent).toBe('')
  })

  it('hiện nội dung trong vùng live; tự đóng sau đúng 5 giây', () => {
    dung()
    hien({ noiDung: 'Đã chuyển sang Đã xong' })
    expect(vung().textContent).toContain('Đã chuyển sang Đã xong')
    expect(THOI_GIAN_TOAST).toBe(5000)
    troi(4999)
    expect(screen.queryByText('Đã chuyển sang Đã xong')).not.toBeNull()
    troi(1)
    expect(screen.queryByText('Đã chuyển sang Đã xong')).toBeNull()
  })

  it('hover thì dừng đếm, rời chuột thì đếm tiếp phần còn lại', () => {
    dung()
    hien({ noiDung: 'Một' })
    troi(3000)
    const hop = screen.getByText('Một').parentElement as HTMLElement
    fireEvent.mouseEnter(hop)
    troi(20000)
    expect(screen.queryByText('Một')).not.toBeNull()
    fireEvent.mouseLeave(hop)
    troi(1999)
    expect(screen.queryByText('Một')).not.toBeNull()
    troi(1)
    expect(screen.queryByText('Một')).toBeNull()
  })

  it('focus vào nút trong toast thì dừng đếm; focus ra ngoài thì đếm tiếp', () => {
    dung()
    hien({ noiDung: 'Hai', hanhDong: { nhan: 'Hoàn tác', chay: () => {} } })
    troi(1000)
    act(() => screen.getByRole('button', { name: 'Hoàn tác' }).focus())
    troi(60000)
    expect(screen.queryByText('Hai')).not.toBeNull()
    // focus chuyển giữa các nút trong cùng toast: vẫn dừng
    act(() => screen.getByRole('button', { name: 'Đóng thông báo' }).focus())
    troi(60000)
    expect(screen.queryByText('Hai')).not.toBeNull()
    act(() => screen.getByRole('button', { name: 'Ngoài' }).focus())
    troi(3999)
    expect(screen.queryByText('Hai')).not.toBeNull()
    troi(1)
    expect(screen.queryByText('Hai')).toBeNull()
  })

  it('hành động (Hoàn tác): chạy rồi đóng toast', () => {
    dung()
    const chay = vi.fn()
    hien({ noiDung: 'Ba', hanhDong: { nhan: 'Hoàn tác', chay } })
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    expect(chay).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Ba')).toBeNull()
  })

  it('nút đóng và api.dong(id) đều đóng toast', () => {
    dung()
    hien({ noiDung: 'Bốn' })
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }))
    expect(screen.queryByText('Bốn')).toBeNull()
    const id = hien({ noiDung: 'Năm' })
    act(() => api.dong(id))
    expect(screen.queryByText('Năm')).toBeNull()
  })

  it('tối đa 2 toast cùng lúc (F26); mới nhất ở cuối', () => {
    dung()
    expect(SO_TOAST_TOI_DA).toBe(2)
    hien({ noiDung: 'A' })
    hien({ noiDung: 'B' })
    hien({ noiDung: 'C' })
    expect(screen.queryByText('A')).toBeNull()
    const ds = Array.from(vung().children).map((c) => c.firstElementChild?.textContent)
    expect(ds).toEqual(['B', 'C'])
  })

  it('toast lỗi: viền danger 1,5px trên nền surface, chữ danger; thoiGian null thì không tự đóng', () => {
    dung()
    hien({
      noiDung: 'Lỗi lưu',
      loai: 'loi',
      thoiGian: null,
      hanhDong: { nhan: 'Thử lại', chay: () => {} },
    })
    const chu = screen.getByText('Lỗi lưu')
    expect(chu.className).toContain('text-danger')
    expect(chu.parentElement?.className).toContain('border-[1.5px] border-danger')
    expect(chu.parentElement?.className).toContain('bg-surface')
    troi(60000)
    expect(screen.queryByText('Lỗi lưu')).not.toBeNull()
  })

  it('toast thường: nền mực (primary), chữ on-primary, bóng shadow-2', () => {
    dung()
    hien({ noiDung: 'Sáu' })
    const hop = screen.getByText('Sáu').parentElement as HTMLElement
    expect(hop.className).toContain('bg-primary')
    expect(hop.className).toContain('text-on-primary')
    expect(hop.className).toContain('shadow-[var(--shadow-2)]')
  })

  it('khoảng đáy mobile: prop của provider và useKhoangDayToast (trả về 0 khi rời trang)', () => {
    function TrangCoThanhDay() {
      useKhoangDayToast(64)
      return null
    }
    const { rerender } = render(
      <ToastProvider>
        <TrangCoThanhDay />
      </ToastProvider>,
    )
    expect(vung().style.getPropertyValue('--day-toast')).toBe('64px')
    expect(vung().className).toContain('max-md:bottom-[calc(16px+var(--day-toast))]')
    rerender(<ToastProvider>{null}</ToastProvider>)
    expect(vung().style.getPropertyValue('--day-toast')).toBe('0px')
    cleanup()
    dung(64)
    expect(vung().style.getPropertyValue('--day-toast')).toBe('64px')
  })

  it('useToast ngoài provider báo lỗi rõ ràng', () => {
    const loi = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<LayApi />)).toThrow(/ToastProvider/)
    loi.mockRestore()
  })
})

describe('Toast — axe', () => {
  it('không vi phạm axe', async () => {
    dung()
    act(() => {
      api.toast({ noiDung: 'Đã lưu', hanhDong: { nhan: 'Hoàn tác', chay: () => {} } })
      api.toast({ noiDung: 'Lỗi lưu', loai: 'loi' })
    })
    await expectNoAxeViolations(document.body)
  })
})
