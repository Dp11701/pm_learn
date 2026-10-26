// @vitest-environment jsdom
// Gallery F02, F02b (/_dev/thanh-phan/f02, /f02b) dựng bằng component thật: đủ mục của frame, component
// chưa dựng là hàng "Có ở phase n", chữ mẫu từ fixtures/mau, ép hover / focus đúng ô, không lỗi console,
// qua axe, đổi giao diện được; dialog, toast, bảng phím tắt, sidebar mở và chạy thật.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ThanhPhan from '../../src/dev/ThanhPhan'
import { datGiaoDien } from '../../src/app/giao-dien'
import { PhimTatProvider } from '../../src/app/phim-tat'
import { ToastProvider } from '../../src/components/Toast'
import { TimKiemProvider } from '../../src/components/tim-kiem/TimKiem'
import { layCay } from '../../shared/roadmap'
import { dinhDangGioPhut } from '../../shared/dinh-dang'
import { mauF02, mauF02b } from '../../fixtures/mau/thanh-phan'
import { expectNoAxeViolations } from '../ho-tro/axe'
import { dungLocalStorageJsdom } from './moi-truong'

dungLocalStorageJsdom()

let loiConsole: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  datGiaoDien('sang')
  loiConsole = vi.spyOn(console, 'error')
  // Radix Popper / Dialog đo kích thước.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  dungLocalStorageJsdom()
})

function trangGallery() {
  return (
    <ToastProvider>
      <PhimTatProvider>
        <TimKiemProvider>
          <ThanhPhan />
        </TimKiemProvider>
      </PhimTatProvider>
    </ToastProvider>
  )
}

async function dung(duong: string) {
  const router = createMemoryRouter(
    [
      { path: '/_dev/thanh-phan', element: trangGallery() },
      { path: '/_dev/thanh-phan/:phan', element: trangGallery() },
      { path: '*', element: <p>Trang khác</p> },
    ],
    { initialEntries: [duong] },
  )
  const kq = await act(async () => render(<RouterProvider router={router} />))
  await screen.findByRole('heading', { level: 1 })
  return { ...kq, router }
}

// Radix trả focus, gắn bộ nghe sau một nhịp setTimeout(0).
const choMotNhip = () => act(() => new Promise((r) => setTimeout(r, 0)))

const tenH2 = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
const muc = (ten: string) => layCay().mucHoc.find((m) => m.label === ten)

describe('gallery F02 (component phần 1)', () => {
  it('đủ mục của frame, C1 là hàng "Có ở phase 6", không lỗi console', async () => {
    await dung('/_dev/thanh-phan/f02')
    expect(
      screen.getByRole('heading', { level: 1, name: 'C1 · C4–C8 · C10–C11 · C26 · C35 · C36' }),
    ).toBeTruthy()
    expect(tenH2()).toEqual([
      'Nút bản đồ',
      'Chip loại',
      'Status pill',
      'Segmented trạng thái',
      'Cờ, badge',
      'Chip nội dung',
      'Thanh 4 bước',
      'Tiến độ — luôn có phân số và số bỏ qua',
      'Banner',
      'Nút',
      'Trường nhập',
    ])
    expect(screen.getByText('Có ở phase 6')).toBeTruthy()
    expect(document.title).toBe('Component phần 1 · Học PM A–Z')
    expect(loiConsole).not.toHaveBeenCalled()
  })

  it('chữ mẫu và số liệu lấy từ fixtures; tên mục gắn lang="en"', async () => {
    await dung('/_dev/thanh-phan/f02')
    expect(screen.getByText(`Bỏ qua · ${mauF02.lyDoBoQua}`)).toBeTruthy()
    for (const v of mauF02.theoVung) {
      expect(screen.getByText(v.ten).getAttribute('lang')).toBe('en')
    }
    expect(screen.getByText('19%')).toBeTruthy()
    expect(screen.getByText('37/195')).toBeTruthy()
    expect(screen.getByText('3/14 · 2 bỏ qua')).toBeTruthy()
    expect(screen.getByText(mauF02.loiFile)).toBeTruthy()
    expect(screen.getByText('Đã duyệt · 18/10/2026')).toBeTruthy()
    expect(screen.getByDisplayValue(mauF02.ngaySai)).toBeTruthy()
    expect(screen.getByPlaceholderText(mauF02.goiYDuAn)).toBeTruthy()
    expect(screen.getByText('Cần ôn lại · 2 thẻ đến hạn')).toBeTruthy()
    expect(screen.getByText('99+')).toBeTruthy()
  })

  it('chip "Chưa có nội dung" là link tới trang Soạn bài của mục mẫu (slug từ cây)', async () => {
    await dung('/_dev/thanh-phan/f02')
    const slug = muc(mauF02.mucSoan)?.slug
    expect(slug).toBeTruthy()
    const links = screen.getAllByRole('link', { name: 'Chưa có nội dung' })
    expect(links).toHaveLength(2)
    for (const l of links) expect(l.getAttribute('href')).toBe(`/hoc/${slug}/soan`)
    // Disabled · chỉ đọc: không còn là link
    expect(screen.queryByRole('link', { name: 'Bản nháp · Tự viết' })).toBeNull()
  })

  it('ép hover / focus đúng ô như frame', async () => {
    const { container } = await dung('/_dev/thanh-phan/f02')
    const seg = screen.getAllByRole('radiogroup', { name: 'Trạng thái học' })[0]
    expect(
      within(seg)
        .getByRole('radio', { name: /Đã xong/ })
        .hasAttribute('data-gia-hover'),
    ).toBe(true)
    expect(
      within(seg)
        .getByRole('radio', { name: /Bỏ qua/ })
        .hasAttribute('data-gia-focus'),
    ).toBe(true)
    const buoc = screen.getByRole('navigation', { name: 'Bốn bước học' })
    expect(
      within(buoc)
        .getByRole('link', { name: /Kiểm tra/ })
        .hasAttribute('data-gia-hover'),
    ).toBe(true)
    expect(
      within(buoc)
        .getByRole('link', { name: /Ghi nhớ/ })
        .hasAttribute('data-gia-focus'),
    ).toBe(true)
    expect(screen.getByRole('button', { name: 'Xem đề xuất' }).hasAttribute('data-gia-focus')).toBe(
      true,
    )
    // C35: 4 biến thể × (hover, focus)
    expect(container.querySelectorAll('button[data-gia-hover]').length).toBeGreaterThanOrEqual(6)
    expect(screen.getByLabelText('Ngày thi · focus').hasAttribute('data-gia-focus')).toBe(true)
    expect(screen.getByLabelText('Tên dự án · hover').hasAttribute('data-gia-hover')).toBe(true)
  })

  it('trạng thái disabled và lỗi đi qua prop thật', async () => {
    await dung('/_dev/thanh-phan/f02')
    for (const ten of ['Ôn ngay', 'Soạn bài', 'Hoàn tác', 'Xoá ghi chú']) {
      const nut = screen.getAllByRole('button', { name: ten })
      expect(nut).toHaveLength(4)
      expect(nut.filter((n) => (n as HTMLButtonElement).disabled)).toHaveLength(1)
    }
    expect(screen.getByRole('button', { name: 'Đang lưu…' }).getAttribute('aria-busy')).toBe('true')
    const loiNgay = screen.getByLabelText('Ngày nhập · lỗi')
    expect(loiNgay.getAttribute('aria-invalid')).toBe('true')
    expect(
      document.getElementById(loiNgay.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe('Ngày không hợp lệ. Nhập theo dd/MM/yyyy.')
    expect((screen.getByLabelText('Loại · disabled (chỉ đọc)') as HTMLInputElement).disabled).toBe(
      true,
    )
    expect(screen.getByText('Lỗi lưu — đã giữ trạng thái cũ.')).toBeTruthy()
    expect(screen.getByText(/Lỗi: không đọc được tiến độ bước/)).toBeTruthy()
    expect(screen.getByText(/Không tính được tiến độ/)).toBeTruthy()
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('component chạy thật: đổi segmented, ô ngày kiểm khi rời ô, nút "?" mở bảng phím tắt', async () => {
    await dung('/_dev/thanh-phan/f02')
    const seg = screen.getAllByRole('radiogroup', { name: 'Trạng thái học' })[0]
    fireEvent.click(within(seg).getByRole('radio', { name: /Đã xong/ }))
    expect(screen.getByText(/Đang chọn: Đã xong/)).toBeTruthy()

    const ngay = screen.getByLabelText('Ngày thi · focus')
    expect((ngay as HTMLInputElement).value).toBe('15/06/2027')
    fireEvent.change(ngay, { target: { value: '30/02/2027' } })
    fireEvent.blur(ngay)
    expect(ngay.getAttribute('aria-invalid')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Bảng phím tắt' }))
    expect(await screen.findByRole('dialog', { name: 'Phím tắt' })).toBeTruthy()
    expect(loiConsole).not.toHaveBeenCalled()
  })

  it('đổi giao diện: nhãn frame đổi Sáng → Tối', async () => {
    await dung('/_dev/thanh-phan/f02')
    expect(screen.getByText('F02 · Component phần 1 · Sáng')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'Tối' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByText('F02 · Component phần 1 · Tối')).toBeTruthy()
  })

  it('không có lỗi axe', async () => {
    const { container } = await dung('/_dev/thanh-phan/f02')
    await expectNoAxeViolations(container)
  })
})

describe('gallery F02b (component phần 2)', () => {
  it('đủ mục của frame; component chưa dựng là "Có ở phase n" theo đề xuất mục 9', async () => {
    await dung('/_dev/thanh-phan/f02b')
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'C2 · C3 · C9 · C12–C25 · C28–C34 · C37 · C38',
      }),
    ).toBeTruthy()
    const the = (ma: string) =>
      screen.getAllByRole('heading', { level: 2 }).find((h) => h.textContent?.startsWith(ma))
        ?.parentElement as HTMLElement
    const phase: [string, string][] = [
      ['C2', '6'],
      ['C3', '6'],
      ['C9', '3'],
      ['C12', '2a'],
      ['C13 · C14', '2a'],
      ['C15 · C16', '2a'],
      ['C17 · C18', '7c'],
      ['C21', '3'],
      ['C22', '8'],
      ['C30', '2b'],
      ['C37', '11'],
    ]
    for (const [ma, p] of phase) {
      expect(within(the(ma)).getByText(new RegExp(`Có ở phase ${p}\\b`))).toBeTruthy()
    }
    expect(within(the('C19 · C20')).getByText(/Có ở phase 2a/)).toBeTruthy()
    expect(within(the('C19 · C20')).getByText(/Có ở phase 3/)).toBeTruthy()
    expect(within(the('C28 · C29')).getByText(/Có ở phase 4/)).toBeTruthy()
    expect(within(the('C31 · C32')).getByText(/Có ở phase 7b/)).toBeTruthy()
    expect(within(the('C34')).queryByText(/^Có ở phase/)).toBeNull()
    // C25, C33, C38 thật: không có hàng giữ chỗ
    expect(within(the('C33')).queryByText(/^Có ở phase/)).toBeNull()
    expect(within(the('C38')).queryByText(/^Có ở phase/)).toBeNull()
    expect(document.title).toBe('Component phần 2 · Học PM A–Z')
    expect(loiConsole).not.toHaveBeenCalled()
  })

  it('C25 Tự lưu ba trạng thái; C38 trống / lỗi / skeleton', async () => {
    await dung('/_dev/thanh-phan/f02b')
    expect(screen.getByText('Đang lưu…')).toBeTruthy()
    // Giờ theo múi giờ máy (21:42 ở Asia/Ho_Chi_Minh)
    expect(screen.getByText(`Đã lưu lúc ${dinhDangGioPhut(mauF02b.luuLuc)}`)).toBeTruthy()
    expect(screen.getByText(/^Lỗi lưu —$/)).toBeTruthy()
    expect(screen.getByText('Chưa có ghi chú')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Mở bài đang học' }).getAttribute('href')).toBe(
      `/hoc/${muc(mauF02b.mucMau)?.slug}`,
    )
    expect(screen.getByText('Không tải được card này')).toBeTruthy()
    expect(document.querySelector('[aria-busy="true"]')?.textContent).toBe('Đang tải…')
  })

  it('C34 sidebar thật với dữ liệu mẫu; bỏ dữ liệu thì về trạng thái trống', async () => {
    await dung('/_dev/thanh-phan/f02b')
    const menu = screen.getByRole('navigation', { name: 'Menu' })
    expect(within(menu).getByRole('link', { name: /Ôn tập/ }).textContent).toContain(
      `${mauF02b.soTheDenHan} thẻ đến hạn`,
    )
    for (const ten of mauF02b.dangHoc) {
      expect(screen.getAllByText(ten).some((el) => el.getAttribute('lang') === 'en')).toBe(true)
    }
    expect(screen.getByRole('link', { name: `Xem tất cả (${mauF02b.tongDangHoc})` })).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Có dữ liệu học mẫu' }))
    expect(screen.getByText('Chưa có mục đang học')).toBeTruthy()
    expect(within(menu).getByRole('link', { name: /Ôn tập/ }).textContent).not.toContain(
      'thẻ đến hạn',
    )
  })

  it('C32: dialog mở bằng nút, Esc đóng, focus về nút mở; alertdialog focus đầu "Quay lại học tiếp"', async () => {
    await dung('/_dev/thanh-phan/f02b')
    const nut = screen.getByRole('button', { name: 'Dialog' })
    nut.focus()
    fireEvent.click(nut)
    const dialog = await screen.findByRole('dialog', { name: 'Duyệt bài này?' })
    expect(within(dialog).getByText(/Sẽ thành Đã duyệt · \d{2}\/\d{2}\/\d{4}/)).toBeTruthy()
    expect(within(dialog).getByText(mauF02b.mucMau).getAttribute('lang')).toBe('en')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await choMotNhip()
    expect(screen.queryByRole('dialog', { name: 'Duyệt bài này?' })).toBeNull()
    expect(document.activeElement).toBe(nut)

    fireEvent.click(screen.getByRole('button', { name: 'Alertdialog' }))
    const alert = await screen.findByRole('alertdialog')
    expect(within(alert).getByText(/Bài còn 2 bước chưa xong/)).toBeTruthy()
    expect(document.activeElement).toBe(
      within(alert).getByRole('button', { name: 'Quay lại học tiếp' }),
    )
    expect(loiConsole).not.toHaveBeenCalled()
  })

  it('C33: toast thường có Hoàn tác, toast lỗi có Thử lại', async () => {
    await dung('/_dev/thanh-phan/f02b')
    fireEvent.click(screen.getByRole('button', { name: 'Toast thường' }))
    const vung = screen.getByRole('status', { name: 'Thông báo' })
    expect(within(vung).getByText(/Đã chuyển/).textContent).toBe(
      `Đã chuyển ${mauF02b.mucMau} sang Đã xong`,
    )
    expect(within(vung).getByRole('button', { name: 'Hoàn tác' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Toast lỗi' }))
    expect(within(vung).getByRole('button', { name: 'Thử lại' })).toBeTruthy()
  })

  it('C28: nút "Tìm mục…" của gallery mở hộp tìm kiếm thật', async () => {
    await dung('/_dev/thanh-phan/f02b')
    const nut = screen
      .getAllByRole('button', { name: /Tìm mục/ })
      .find((n) => !n.closest('nav, [aria-labelledby]') && n.textContent === 'Tìm mục…')
    expect(nut).toBeTruthy()
    fireEvent.click(nut as HTMLElement)
    expect(await screen.findByRole('combobox')).toBeTruthy()
  })

  it('đổi giao diện: nhãn frame đổi Sáng → Tối', async () => {
    await dung('/_dev/thanh-phan/f02b')
    fireEvent.click(screen.getByRole('radio', { name: 'Tối' }))
    expect(screen.getByText('F02 · Component phần 2 · Tối')).toBeTruthy()
  })

  it('không có lỗi axe', async () => {
    const { container } = await dung('/_dev/thanh-phan/f02b')
    await expectNoAxeViolations(container)
  })
})
