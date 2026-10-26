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
/** Khu toast (định vị fixed, chứa vùng polite và các toast lỗi). */
const khu = () => vung().parentElement as HTMLElement
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
    expect(khu().style.getPropertyValue('--day-toast')).toBe('64px')
    expect(khu().className).toContain('max-md:bottom-[calc(16px+var(--day-toast))]')
    expect(khu().className).toContain('max-md:left-4')
    expect(khu().className).toContain('max-md:right-4')
    rerender(<ToastProvider>{null}</ToastProvider>)
    expect(khu().style.getPropertyValue('--day-toast')).toBe('0px')
    cleanup()
    dung(64)
    expect(khu().style.getPropertyValue('--day-toast')).toBe('64px')
  })

  it('không che chân sidebar / rail: ≥ 1280 lùi sau sidebar, 1024–1279 lùi sau rail, < 1024 lề 24', () => {
    dung()
    const lop = khu().className.split(/\s+/)
    expect(lop).toEqual(
      expect.arrayContaining([
        'fixed',
        'bottom-6',
        'left-6',
        'lg:left-[calc(var(--rail-w)+24px)]',
        'xl:left-[calc(var(--sidebar-w)+24px)]',
        'lg:max-w-[calc(100vw-var(--rail-w)-48px)]',
        'xl:max-w-[calc(100vw-var(--sidebar-w)-48px)]',
      ]),
    )
  })

  it('toast lỗi là role=alert (F26), nằm ngoài vùng polite; toast thường ở vùng polite', () => {
    dung()
    hien({ noiDung: 'Đã lưu' })
    hien({ noiDung: 'Lỗi lưu', loai: 'loi' })
    const canhBao = screen.getByRole('alert')
    expect(canhBao.textContent).toContain('Lỗi lưu')
    expect(vung().contains(canhBao)).toBe(false)
    expect(vung().textContent).toContain('Đã lưu')
    expect(vung().textContent).not.toContain('Lỗi lưu')
    // Không lồng vùng live: trong vùng polite không có alert / aria-live con, alert không nằm trong vùng live nào.
    expect(vung().querySelector('[role="alert"],[role="status"],[aria-live]')).toBeNull()
    expect(canhBao.parentElement?.closest('[role="alert"],[role="status"],[aria-live]')).toBeNull()
    // Vùng polite vẫn duy nhất và luôn có mặt.
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('toast thường + toast lỗi: vẫn theo thứ tự thời gian, mới nhất ở dưới', () => {
    dung()
    hien({ noiDung: 'Thường' })
    hien({ noiDung: 'Lỗi', loai: 'loi' })
    const nhomLoi = screen.getByRole('alert').parentElement as HTMLElement
    expect(Number(nhomLoi.style.order)).toBeGreaterThan(Number(vung().style.order))
    // Toast thứ 3 đẩy toast cũ nhất (Thường) ra: còn Lỗi (trên) rồi Thường mới (dưới).
    hien({ noiDung: 'Thường mới' })
    expect(screen.queryByText('Thường')).toBeNull()
    expect(Number(vung().style.order)).toBeGreaterThan(Number(nhomLoi.style.order))
    // Toast trên cùng không có lề trên, toast sau cách 8px.
    expect(screen.getByRole('alert').className).not.toContain('mt-2')
    expect((screen.getByText('Thường mới').parentElement as HTMLElement).className).toContain(
      'mt-2',
    )
  })

  it('useToast ngoài provider báo lỗi rõ ràng', () => {
    const loi = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<LayApi />)).toThrow(/ToastProvider/)
    loi.mockRestore()
  })
})

describe('Toast — trả focus khi toast đang giữ focus bị đóng', () => {
  function dungTrang({ h1 = true, ngoai = true } = {}) {
    return render(
      <ToastProvider>
        <LayApi />
        <main tabIndex={-1}>
          {h1 && (
            <h1 id="tieu-de-trang" tabIndex={-1}>
              Trang
            </h1>
          )}
          {ngoai && <button type="button">Ngoài</button>}
        </main>
      </ToastProvider>,
    )
  }
  const nut = (ten: string) => screen.getByRole('button', { name: ten })
  /** Focus vào nút trong toast, đến từ nút "Ngoài" (như Tab từ trang xuống toast). */
  function vaoToast(ten: string) {
    act(() => nut('Ngoài').focus())
    act(() => nut(ten).focus())
    expect(document.activeElement).toBe(nut(ten))
  }

  it('bấm X: focus về phần tử có focus trước khi vào toast', () => {
    dungTrang()
    hien({ noiDung: 'Một' })
    vaoToast('Đóng thông báo')
    fireEvent.click(nut('Đóng thông báo'))
    expect(screen.queryByText('Một')).toBeNull()
    expect(document.activeElement).toBe(nut('Ngoài'))
  })

  it('bấm hành động (Hoàn tác): focus cũng về phần tử trước đó', () => {
    dungTrang()
    hien({ noiDung: 'Hai', hanhDong: { nhan: 'Hoàn tác', chay: () => {} } })
    vaoToast('Hoàn tác')
    fireEvent.click(nut('Hoàn tác'))
    expect(document.activeElement).toBe(nut('Ngoài'))
  })

  it('toast thứ 3 đẩy toast đang giữ focus ra: focus về phần tử trước đó', () => {
    dungTrang()
    hien({ noiDung: 'A', hanhDong: { nhan: 'Hoàn tác A', chay: () => {} } })
    vaoToast('Hoàn tác A')
    hien({ noiDung: 'B' })
    hien({ noiDung: 'C' })
    expect(screen.queryByText('A')).toBeNull()
    expect(document.activeElement).toBe(nut('Ngoài'))
  })

  it('api.dong(id) khi focus đang ở trong toast cũng trả focus', () => {
    dungTrang()
    const id = hien({ noiDung: 'Ba' })
    vaoToast('Đóng thông báo')
    act(() => api.dong(id))
    expect(document.activeElement).toBe(nut('Ngoài'))
  })

  it('phần tử trước đó đã mất: về H1 #tieu-de-trang; không có H1 thì về <main>', () => {
    const { rerender } = dungTrang()
    hien({ noiDung: 'Bốn' })
    vaoToast('Đóng thông báo')
    // Trang đổi, nút "Ngoài" bị gỡ khi focus đang ở toast.
    rerender(
      <ToastProvider>
        <LayApi />
        <main tabIndex={-1}>
          <h1 id="tieu-de-trang" tabIndex={-1}>
            Trang
          </h1>
        </main>
      </ToastProvider>,
    )
    fireEvent.click(nut('Đóng thông báo'))
    expect(document.activeElement?.id).toBe('tieu-de-trang')

    cleanup()
    dungTrang({ h1: false })
    hien({ noiDung: 'Năm' })
    vaoToast('Đóng thông báo')
    act(() => nut('Ngoài').setAttribute('disabled', ''))
    fireEvent.click(nut('Đóng thông báo'))
    expect(document.activeElement?.tagName).toBe('MAIN')
  })

  it('focus không ở trong toast: đóng toast không kéo focus đi', () => {
    dungTrang()
    hien({ noiDung: 'Sáu' })
    act(() => nut('Ngoài').focus())
    fireEvent.click(nut('Đóng thông báo'))
    expect(document.activeElement).toBe(nut('Ngoài'))
    hien({ noiDung: 'Bảy' })
    act(() => (document.activeElement as HTMLElement).blur())
    fireEvent.click(nut('Đóng thông báo'))
    expect(document.activeElement).toBe(document.body)
  })

  it('hành động tự chuyển focus đi (vd. mở dialog): không giành lại focus', () => {
    dungTrang()
    hien({
      noiDung: 'Tám',
      hanhDong: { nhan: 'Mở', chay: () => document.getElementById('tieu-de-trang')?.focus() },
    })
    vaoToast('Mở')
    fireEvent.click(nut('Mở'))
    expect(document.activeElement?.id).toBe('tieu-de-trang')
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
