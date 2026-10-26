// @vitest-environment jsdom
// C28 tối giản (phase 1, §6.3, đề xuất 1.8; frame C28, F25, F25b): "/" mở, combobox + listbox
// aria-activedescendant, ↑/↓, Enter mở /hoc/:slug, Esc đóng, bỏ qua phím khi Telex/VNI ghép chữ.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PhimTatProvider } from '../../../src/app/phim-tat'
import {
  TimKiemProvider,
  useTimKiem,
  type DuLieuTimKiem,
} from '../../../src/components/tim-kiem/TimKiem'
import { TRE_THONG_BAO } from '../../../src/components/tim-kiem/ThongBaoKetQua'
import { layCay } from '../../../shared/roadmap'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const choMotNhip = () => act(() => new Promise((r) => setTimeout(r, 0)))

function ViTri() {
  return <p data-testid="vi-tri">{useLocation().pathname}</p>
}

function NutMo() {
  const { mo } = useTimKiem()
  return (
    <button type="button" onClick={mo}>
      Tìm mục…
    </button>
  )
}

function khoiDong(duLieu: DuLieuTimKiem = {}) {
  render(
    <MemoryRouter initialEntries={['/']}>
      <PhimTatProvider>
        <TimKiemProvider {...duLieu}>
          <NutMo />
          <Routes>
            <Route path="*" element={<ViTri />} />
          </Routes>
        </TimKiemProvider>
      </PhimTatProvider>
    </MemoryRouter>,
  )
}

/** Mở bằng phím "/" từ nền trang; trả về ô tìm. */
function moBangPhim(): HTMLInputElement {
  const e = new KeyboardEvent('keydown', {
    key: '/',
    code: 'Slash',
    bubbles: true,
    cancelable: true,
  })
  act(() => {
    document.body.dispatchEvent(e)
  })
  expect(e.defaultPrevented).toBe(true)
  return screen.getByRole('combobox', { name: 'Tìm mục' })
}

function go(o: HTMLInputElement, chu: string) {
  fireEvent.change(o, { target: { value: chu } })
}

const cacKetQua = () => screen.queryAllByRole('option')
const tenKetQua = (opt: HTMLElement) => opt.querySelector('[lang="en"]')?.textContent
const dangChon = (o: HTMLInputElement) => {
  const id = o.getAttribute('aria-activedescendant')
  return id ? document.getElementById(id) : null
}
const viTri = () => screen.getByTestId('vi-tri').textContent

describe('mở, đóng', () => {
  it('"/" mở popover, focus vào ô tìm, ký tự "/" không bị gõ vào ô', () => {
    khoiDong()
    const o = moBangPhim()
    expect(document.activeElement).toBe(o)
    expect(o.value).toBe('')
    expect(screen.getByRole('dialog', { name: 'Tìm kiếm' }).getAttribute('aria-modal')).toBe('true')
  })

  it('useTimKiem().mo() mở; Esc đóng và focus về nút đã mở', async () => {
    khoiDong()
    const nut = screen.getByRole('button', { name: 'Tìm mục…' })
    nut.focus()
    fireEvent.click(nut)
    const o = screen.getByRole('combobox', { name: 'Tìm mục' })
    await choMotNhip()
    fireEvent.keyDown(o, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await choMotNhip()
    expect(document.activeElement).toBe(nut)
  })

  it('Esc lúc Telex/VNI đang ghép chữ chỉ huỷ ghép, không đóng', () => {
    khoiDong()
    const o = moBangPhim()
    fireEvent.keyDown(o, { key: 'Escape', code: 'Escape', isComposing: true })
    fireEvent.keyDown(o, { key: 'Escape', code: 'Escape', keyCode: 229 })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('mở lại thì ô tìm trống', () => {
    khoiDong()
    go(moBangPhim(), 'risk')
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape', code: 'Escape' })
    expect(moBangPhim().value).toBe('')
  })
})

describe('kết quả', () => {
  it('ô trống: chưa có danh sách, không báo "Không có kết quả"', () => {
    khoiDong()
    const o = moBangPhim()
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(o.getAttribute('aria-expanded')).toBe('false')
    expect(o.hasAttribute('aria-activedescendant')).toBe(false)
    expect(screen.getByRole('dialog').textContent).not.toContain('Không có kết quả')
  })

  it('"risk": nhóm "Mục học · 7", đầu tiên Risk and Issue Reports, "Risk" in đậm, mặc định chọn', () => {
    khoiDong()
    const o = moBangPhim()
    go(o, 'risk')
    const ds = screen.getByRole('listbox')
    expect(o.getAttribute('aria-expanded')).toBe('true')
    expect(o.getAttribute('aria-controls')).toBe(ds.id)
    const nhom = within(ds).getByRole('group', { name: 'Mục học · 7' })
    const opts = within(nhom).getAllByRole('option')
    expect(opts.map(tenKetQua)).toEqual([
      'Risk and Issue Reports',
      'Risk Register',
      'Risk Identification Process',
      'Risk and Opportunity Response Strategies',
      'Risk Appetite',
      'Quantitative Risk Assessment',
      'Qualitative Risk Assessment',
    ])
    const dau = opts[0]
    expect([...dau.querySelectorAll('strong')].map((s) => s.textContent)).toEqual(['Risk'])
    expect(dau.getAttribute('aria-selected')).toBe('true')
    expect(dangChon(o)).toBe(dau)
    expect(opts.slice(1).every((x) => x.getAttribute('aria-selected') === 'false')).toBe(true)
    // "Quantitative Risk Assessment": khớp giữa tên, chỉ "Risk" in đậm
    expect([...opts[5].querySelectorAll('strong')].map((s) => s.textContent)).toEqual(['Risk'])
  })

  it('mỗi hàng: icon loại, breadcrumb, icon + chữ trạng thái (phase 1: Chưa học)', () => {
    khoiDong()
    const o = moBangPhim()
    go(o, 'risk')
    const [dau, thuHai] = cacKetQua()
    expect(within(dau).getByRole('img', { name: 'Chủ đề' })).toBeTruthy()
    expect(within(thuHai).getByRole('img', { name: 'Tài liệu' })).toBeTruthy()
    expect(dau.textContent).toContain('Project Management › Project Governance › Project Reporting')
    expect(thuHai.textContent).toContain('Project Management › Risk Management')
    for (const opt of cacKetQua()) {
      expect(opt.textContent).toContain('Chưa học')
      expect(opt.querySelector('[data-trang-thai="chua-hoc"]')).not.toBeNull()
      expect(opt.textContent).not.toContain('Chưa có nội dung')
    }
  })

  it('traMuc: trạng thái học, Cần ôn lại, chip "Chưa có nội dung" theo dữ liệu học', () => {
    const cay = layCay()
    const id = (label: string) => cay.mucHoc.find((m) => m.label === label)?.id
    const dangHoc = id('Risk Register')
    const daXong = id('Risk Appetite')
    khoiDong({
      traMuc: (ma) =>
        ma === dangHoc
          ? { trangThai: 'dang-hoc' }
          : ma === daXong
            ? { trangThai: 'da-xong', canOnLai: true }
            : { noiDung: { loai: 'chua-co' } },
    })
    go(moBangPhim(), 'risk')
    const opts = cacKetQua()
    expect(opts[1].textContent).toContain('Đang học')
    expect(opts[1].querySelector('[data-trang-thai="dang-hoc"]')).not.toBeNull()
    expect(opts[1].textContent).not.toContain('Chưa có nội dung')
    expect(opts[4].textContent).toContain('Đã xong · Cần ôn lại')
    expect(opts[0].textContent).toContain('Chưa có nội dung')
  })

  it('"comittee" → Steering Committee, in đậm "Committee", dòng "Khớp tên gốc trên roadmap"', () => {
    khoiDong()
    go(moBangPhim(), 'comittee')
    const opts = cacKetQua()
    expect(opts.map(tenKetQua)).toEqual(['Steering Committee'])
    expect([...opts[0].querySelectorAll('strong')].map((s) => s.textContent)).toEqual(['Committee'])
    expect(opts[0].textContent).toContain('Khớp tên gốc trên roadmap: Steering Comittee')
    expect(opts[0].textContent).toContain('Project Management › Project Governance')
  })

  it('"safe": 2 mục trùng tên, phân biệt bằng breadcrumb', () => {
    khoiDong()
    go(moBangPhim(), 'safe')
    const opts = cacKetQua()
    expect(opts.map(tenKetQua)).toEqual(['SAFe', 'SAFe'])
    expect(opts[0].textContent).toContain(
      'Project Management › PM Framework / Approach › Scaled Agile',
    )
    expect(opts[1].textContent).toContain('Certifications')
  })

  it('không có kết quả: câu của frame, ví dụ lấy từ cây (không gõ cứng), không có listbox', () => {
    khoiDong()
    const o = moBangPhim()
    go(o, 'kiểm thử tự động')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(o.getAttribute('aria-expanded')).toBe('false')
    const text = screen.getByRole('dialog').textContent
    expect(text).toContain('Không có kết quả cho "kiểm thử tự động"')
    // Ví dụ: tên 2 từ đầu tiên không có viết tắt; viết tắt đầu tiên không đứng đầu tên ("… (CCB)")
    const goiY = screen.getByText(/^Thử tên tiếng Anh hoặc viết tắt/)
    expect(goiY.textContent).toBe(
      'Thử tên tiếng Anh hoặc viết tắt, vd. "iterative approach" hoặc "ccb".',
    )
    expect([...goiY.querySelectorAll('[lang="en"]')].map((x) => x.textContent)).toEqual([
      'iterative approach',
      'ccb',
    ])
    // Hai ví dụ gõ vào thì có kết quả
    go(o, 'iterative approach')
    expect(cacKetQua().map(tenKetQua)).toEqual(['Iterative approach'])
    go(o, 'ccb')
    expect(cacKetQua().map(tenKetQua)).toEqual(['Change Control Board (CCB)'])
  })

  it('tối đa 30 mục học', () => {
    khoiDong()
    go(moBangPhim(), 'e')
    expect(cacKetQua()).toHaveLength(30)
    expect(screen.getByRole('group', { name: 'Mục học · 30' })).toBeTruthy()
  })

  it('giải nghĩa (mục đã có nội dung) tìm được bằng tiếng Việt', () => {
    const muc = layCay().mucHoc[0]
    khoiDong({ giaiNghia: new Map([[muc.id, 'Giải nghĩa thử để tìm']]) })
    go(moBangPhim(), 'giai nghia thu')
    expect(cacKetQua().map(tenKetQua)).toEqual([muc.label])
  })
})

describe('bàn phím', () => {
  it('↓/↑ đổi aria-activedescendant, quay vòng ở hai đầu; gõ chữ mới chọn lại mục đầu', () => {
    khoiDong()
    const o = moBangPhim()
    go(o, 'risk')
    const opts = cacKetQua()
    fireEvent.keyDown(o, { key: 'ArrowDown', code: 'ArrowDown' })
    expect(dangChon(o)).toBe(opts[1])
    expect(opts[1].getAttribute('aria-selected')).toBe('true')
    expect(opts[0].getAttribute('aria-selected')).toBe('false')
    fireEvent.keyDown(o, { key: 'ArrowUp', code: 'ArrowUp' })
    fireEvent.keyDown(o, { key: 'ArrowUp', code: 'ArrowUp' })
    expect(dangChon(o)).toBe(opts[6])
    fireEvent.keyDown(o, { key: 'ArrowDown', code: 'ArrowDown' })
    expect(dangChon(o)).toBe(opts[0])
    fireEvent.keyDown(o, { key: 'ArrowDown', code: 'ArrowDown' })
    go(o, 'risk r')
    expect(dangChon(o)).toBe(cacKetQua()[0])
  })

  it('Enter mở /hoc/:slug của mục đang chọn và đóng popover', () => {
    khoiDong()
    const o = moBangPhim()
    go(o, 'risk')
    fireEvent.keyDown(o, { key: 'ArrowDown', code: 'ArrowDown' })
    const slug = layCay().mucHoc.find((m) => m.label === 'Risk Register')?.slug
    fireEvent.keyDown(o, { key: 'Enter', code: 'Enter' })
    expect(viTri()).toBe(`/hoc/${slug}`)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Enter mặc định mở kết quả đầu', () => {
    khoiDong()
    const o = moBangPhim()
    go(o, 'comittee')
    fireEvent.keyDown(o, { key: 'Enter', code: 'Enter' })
    const slug = layCay().mucHoc.find((m) => m.label === 'Steering Committee')?.slug
    expect(viTri()).toBe(`/hoc/${slug}`)
  })

  it('Telex/VNI đang ghép chữ: Enter, ↑/↓ bị bỏ qua', () => {
    khoiDong()
    const o = moBangPhim()
    go(o, 'risk')
    const dau = dangChon(o)
    fireEvent.keyDown(o, { key: 'ArrowDown', code: 'ArrowDown', isComposing: true })
    fireEvent.keyDown(o, { key: 'ArrowDown', code: 'ArrowDown', keyCode: 229 })
    expect(dangChon(o)).toBe(dau)
    fireEvent.keyDown(o, { key: 'Enter', code: 'Enter', isComposing: true })
    fireEvent.keyDown(o, { key: 'Enter', code: 'Enter', keyCode: 229 })
    expect(viTri()).toBe('/')
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('giữ Alt/Ctrl/⌘: không di chuyển, không mở', () => {
    khoiDong()
    const o = moBangPhim()
    go(o, 'risk')
    const dau = dangChon(o)
    fireEvent.keyDown(o, { key: 'ArrowDown', code: 'ArrowDown', altKey: true })
    fireEvent.keyDown(o, { key: 'Enter', code: 'Enter', metaKey: true })
    fireEvent.keyDown(o, { key: 'Enter', code: 'Enter', ctrlKey: true })
    expect(dangChon(o)).toBe(dau)
    expect(viTri()).toBe('/')
  })

  it('Enter khi không có kết quả: không làm gì', () => {
    khoiDong()
    const o = moBangPhim()
    go(o, 'zzzzqqq')
    fireEvent.keyDown(o, { key: 'Enter', code: 'Enter' })
    expect(viTri()).toBe('/')
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('bấm chuột vào kết quả cũng mở; focus vẫn ở ô tìm khi nhấn chuột', () => {
    khoiDong()
    const o = moBangPhim()
    go(o, 'safe')
    const opt = cacKetQua()[1]
    const e = fireEvent.mouseDown(opt)
    expect(e).toBe(false) // mousedown bị chặn mặc định → ô tìm giữ focus
    fireEvent.click(opt)
    expect(viTri()).toBe('/hoc/safe-certifications')
  })

  it('"/" khi đang gõ trong ô tìm là chữ, không mở lại', () => {
    khoiDong()
    const o = moBangPhim()
    const e = fireEvent.keyDown(o, { key: '/', code: 'Slash' })
    expect(e).toBe(true)
  })
})

describe('trình đọc màn hình', () => {
  const vungStatus = () => screen.getByRole('status')

  it('số kết quả báo qua role="status" khi ngừng gõ, không theo từng phím', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    khoiDong()
    const o = moBangPhim()
    expect(within(screen.getByRole('dialog')).getByRole('status')).toBe(vungStatus())
    expect(vungStatus().textContent).toBe('')
    for (const chu of ['r', 'ri', 'ris', 'risk']) {
      go(o, chu)
      act(() => vi.advanceTimersByTime(TRE_THONG_BAO - 100))
      expect(vungStatus().textContent).toBe('')
    }
    act(() => vi.advanceTimersByTime(100))
    expect(vungStatus().textContent).toBe('7 kết quả.')
    // Gõ tiếp: vùng trống lại (không đọc số cũ), ngừng gõ thì báo số mới
    go(o, 'risk register')
    expect(vungStatus().textContent).toBe('')
    act(() => vi.advanceTimersByTime(TRE_THONG_BAO))
    expect(vungStatus().textContent).toBe('1 kết quả.')
  })

  it('không có kết quả: báo cả câu; xoá hết chữ thì vùng trống ngay', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    khoiDong()
    const o = moBangPhim()
    go(o, 'kiểm thử tự động ')
    act(() => vi.advanceTimersByTime(TRE_THONG_BAO))
    expect(vungStatus().textContent).toBe(
      'Không có kết quả cho "kiểm thử tự động". Thử tên tiếng Anh hoặc viết tắt.',
    )
    go(o, '')
    expect(vungStatus().textContent).toBe('')
    act(() => vi.advanceTimersByTime(TRE_THONG_BAO * 2))
    expect(vungStatus().textContent).toBe('')
  })

  it('kết quả đầu đổi khi gõ thì aria-activedescendant đổi theo (trình đọc đọc mục Enter mở)', () => {
    khoiDong()
    const o = moBangPhim()
    go(o, 'risk')
    const truoc = o.getAttribute('aria-activedescendant')
    expect(tenKetQua(dangChon(o)!)).toBe('Risk and Issue Reports')
    go(o, 'risk reg')
    const sau = o.getAttribute('aria-activedescendant')
    expect(sau).not.toBe(truoc)
    expect(dangChon(o)).toBe(cacKetQua()[0])
    expect(tenKetQua(dangChon(o)!)).toBe('Risk Register')
    // id option không trùng nhau
    go(o, 'safe')
    const ids = cacKetQua().map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('accessibility', () => {
  it('axe không lỗi khi popover mở có kết quả, không có kết quả', async () => {
    khoiDong()
    const o = moBangPhim()
    go(o, 'risk')
    await expectNoAxeViolations(document.body)
    go(o, 'kiểm thử tự động')
    await expectNoAxeViolations(document.body)
  })

  it('combobox có hướng dẫn phím (aria-describedby), listbox có nhãn, option không nhận Tab', () => {
    khoiDong()
    const o = moBangPhim()
    go(o, 'risk')
    const hd = document.getElementById(o.getAttribute('aria-describedby') ?? '')
    expect(hd?.textContent).toContain('↑ ↓ di chuyển')
    expect(hd?.textContent).toContain('Không phân biệt dấu, hoa/thường')
    expect(screen.getByRole('listbox', { name: 'Kết quả tìm kiếm' })).toBeTruthy()
    for (const opt of cacKetQua()) expect(opt.tabIndex).toBe(-1)
  })
})
