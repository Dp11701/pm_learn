// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import cayJson from '../../../docs/roadmap-tree.json'
import { layCay } from '../../../shared/roadmap'
import { dinhDangNgay } from '../../../shared/dinh-dang'
import { KHOA_GIAO_DIEN, datGiaoDien } from '../../../src/app/giao-dien'
import { DU_LIEU_KHUNG_TRONG, type DuLieuKhung } from '../../../src/app/khung/du-lieu-khung'
import { LE_NGANG_TRANG } from '../../../src/app/khung/le-trang'
import { KhungTrang } from '../../../src/pages/chung'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { dungLocalStorageJsdom } from '../../giao-dien/moi-truong'
import { choMotNhip, doiBeRong, giaMatchMedia, moKhung } from './moi-truong'

const { moTimKiem, moBangPhimTat } = vi.hoisted(() => ({
  moTimKiem: vi.fn(),
  moBangPhimTat: vi.fn(),
}))

// Tìm kiếm, phím tắt, kết nối là module khác: chỉ kiểm khung gọi đúng hook / đặt banner đúng chỗ.
vi.mock('../../../src/components/tim-kiem/TimKiem', () => ({
  useTimKiem: () => ({ mo: moTimKiem }),
}))
vi.mock(import('../../../src/app/phim-tat'), async (goc) => ({
  ...(await goc()),
  useMoBangPhimTat: () => moBangPhimTat,
}))
vi.mock(import('../../../src/app/ket-noi'), async (goc) => ({
  ...(await goc()),
  BannerMatKetNoi: ({ className }: { className?: string }) => (
    <div data-testid="banner-mat-ket-noi" className={className} />
  ),
}))

const cay = layCay()
const taiLieu = cay.mucHoc.find((m) => m.mau === 'tai-lieu')!
const cacChuDe = cay.mucHoc.filter((m) => m.mau === 'chu-de')
const chungChi = cay.mucHoc.find((m) => m.mau === 'chung-chi')!

const THU_TU_MENU: [string, string][] = [
  ['Tổng quan', '/'],
  ['Lộ trình', '/lo-trinh'],
  ['Ôn tập', '/on-tap'],
  ['Nội dung', '/noi-dung'],
  ['Thống kê', '/thong-ke'],
  ['Bộ hồ sơ dự án', '/ho-so'],
  ['Chứng chỉ', '/chung-chi'],
  ['Thuật ngữ', '/thuat-ngu'],
  ['Ghi chú', '/ghi-chu'],
  ['Cài đặt', '/cai-dat'],
]

const FOCUS_DUOC =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

const menu = () => screen.getByRole('navigation', { name: 'Menu' })
const linkMenu = () => within(menu()).getAllByRole('link')
const h1 = () => screen.getByRole('heading', { level: 1 })

beforeEach(() => {
  // afterEach gỡ mọi stub toàn cục → gắn lại localStorage của jsdom mỗi test.
  dungLocalStorageJsdom()
  giaMatchMedia(1440)
  datGiaoDien('he-thong')
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  moTimKiem.mockClear()
  moBangPhimTat.mockClear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('KhungApp — link bỏ qua và vùng chính', () => {
  it('"Chuyển tới nội dung chính" là phần tử focus được đầu tiên, trỏ tới <main id="noi-dung-chinh">', () => {
    const { container } = moKhung('/')
    const dau = container.querySelector(FOCUS_DUOC)!
    expect(dau.textContent).toBe('Chuyển tới nội dung chính')
    expect(dau.getAttribute('href')).toBe('#noi-dung-chinh')

    const main = screen.getByRole('main')
    expect(main.id).toBe('noi-dung-chinh')
    expect(main.tabIndex).toBe(-1)
    expect(main.contains(h1())).toBe(true)

    fireEvent.click(dau)
    expect(document.activeElement).toBe(main)
  })

  it('banner mất kết nối nằm đầu cột nội dung, trước <main> (dưới top bar mobile)', () => {
    moKhung('/')
    const banner = screen.getByTestId('banner-mat-ket-noi')
    const main = screen.getByRole('main')
    expect(banner.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // F26: thẻ bo góc trong lề trang; vùng dính có nền nên nội dung cuộn không lộ qua góc bo.
    expect(banner.className).toContain('sticky')
    expect(banner.className).toContain('top-0')
    expect(banner.className).toContain('bg-bg')
    expect(banner.className).toContain(LE_NGANG_TRANG)
    cleanup()

    giaMatchMedia(375)
    moKhung('/')
    const thanhTren = screen.getByRole('banner')
    expect(
      thanhTren.compareDocumentPosition(screen.getByTestId('banner-mat-ket-noi')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByTestId('banner-mat-ket-noi').className).toContain('top-[var(--topbar-h)]')
  })
})

describe('Sidebar C34 (≥ 1280)', () => {
  it('menu đúng thứ tự, route §6.1; mục của trang đang mở có aria-current="page"', () => {
    moKhung('/')
    expect(linkMenu().map((a) => [a.textContent, a.getAttribute('href')])).toEqual(THU_TU_MENU)
    expect(linkMenu().filter((a) => a.hasAttribute('aria-current'))).toEqual([
      screen.getByRole('link', { name: 'Tổng quan' }),
    ])
    expect(screen.getByRole('link', { name: 'Tổng quan' }).getAttribute('aria-current')).toBe(
      'page',
    )

    fireEvent.click(screen.getByRole('link', { name: 'Lộ trình' }))
    expect(screen.getByRole('link', { name: 'Lộ trình' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Tổng quan' }).hasAttribute('aria-current')).toBe(false)
  })

  it('trang con (bài học) tô mục cha với aria-current="true"', () => {
    moKhung(`/hoc/${cacChuDe[0].slug}`)
    expect(screen.getByRole('link', { name: 'Lộ trình' }).getAttribute('aria-current')).toBe('true')
    cleanup()
    moKhung(`/hoc/${chungChi.slug}`)
    expect(screen.getByRole('link', { name: 'Chứng chỉ' }).getAttribute('aria-current')).toBe(
      'true',
    )
  })

  it('ô tìm có gợi ý "/" và gọi useTimKiem().mo() khi bấm', () => {
    moKhung('/')
    const o = screen.getByRole('button', { name: 'Tìm mục…' })
    expect(o.getAttribute('aria-keyshortcuts')).toBe('/')
    expect(o.querySelector('kbd')?.textContent).toBe('/')
    fireEvent.click(o)
    expect(moTimKiem).toHaveBeenCalledTimes(1)
  })

  it('badge: đặc ở Ôn tập (thẻ đến hạn), viền ở Nội dung (bản nháp); 0 thì không có', () => {
    moKhung('/', { duLieu: { ...DU_LIEU_KHUNG_TRONG, soTheDenHan: 12, soBanNhap: 9 } })
    const onTap = screen.getByRole('link', { name: 'Ôn tập, 12 thẻ đến hạn' })
    const noiDung = screen.getByRole('link', { name: 'Nội dung, 9 bản nháp' })
    expect(onTap.querySelector('[data-kieu="dac"] [aria-hidden="true"]')?.textContent).toBe('12')
    expect(noiDung.querySelector('[data-kieu="vien"] [aria-hidden="true"]')?.textContent).toBe('9')
    cleanup()
    moKhung('/')
    expect(screen.getByRole('link', { name: 'Ôn tập' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Nội dung' })).toBeTruthy()
  })

  it('badge dùng C7: > 99 hiện "99+", tên truy cập giữ đủ số; hàng đang mở thì badge đảo màu', () => {
    moKhung('/on-tap', { duLieu: { ...DU_LIEU_KHUNG_TRONG, soTheDenHan: 150, soBanNhap: 1234 } })
    const onTap = screen.getByRole('link', { name: 'Ôn tập, 150 thẻ đến hạn' })
    const noiDung = screen.getByRole('link', { name: 'Nội dung, 1.234 bản nháp' })
    const badgeOnTap = onTap.querySelector('[data-kieu="dac"]')!
    expect(badgeOnTap.querySelector('[aria-hidden="true"]')?.textContent).toBe('99+')
    expect(noiDung.querySelector('[data-kieu="vien"] [aria-hidden="true"]')?.textContent).toBe(
      '99+',
    )
    expect(onTap.getAttribute('aria-current')).toBe('page')
    expect(badgeOnTap.className).toContain('bg-on-primary!')
    expect(noiDung.querySelector('[data-kieu="vien"]')!.className).not.toContain('!')
  })

  it('khối "Đang học" trống → "Chưa có mục đang học", không có "Xem tất cả"', () => {
    moKhung('/')
    const khoi = screen.getByRole('region', { name: 'Đang học' })
    expect(within(khoi).getByText('Chưa có mục đang học')).toBeTruthy()
    expect(within(khoi).queryAllByRole('link')).toEqual([])
  })

  it('khối "Đang học" có dữ liệu → 3 mục đầu (tên lấy từ cây, lang="en", icon loại) + "Xem tất cả (n)"', () => {
    const duLieu: DuLieuKhung = {
      ...DU_LIEU_KHUNG_TRONG,
      dangHoc: [taiLieu.id, cacChuDe[0].id, cacChuDe[1].id, cacChuDe[2].id],
      tongDangHoc: 6,
    }
    moKhung(`/hoc/${cacChuDe[0].slug}`, { duLieu })
    const khoi = screen.getByRole('region', { name: 'Đang học' })
    const cac = within(khoi).getAllByRole('listitem')
    expect(cac.map((li) => li.querySelector('[lang="en"]')?.textContent)).toEqual([
      taiLieu.label,
      cacChuDe[0].label,
      cacChuDe[1].label,
    ])
    expect(within(cac[0]).getByRole('img', { name: 'Tài liệu' })).toBeTruthy()
    expect(within(cac[1]).queryByRole('img')).toBeNull()
    const link = within(cac[1]).getByRole('link')
    expect(link.getAttribute('href')).toBe(`/hoc/${cacChuDe[0].slug}`)
    expect(link.getAttribute('aria-current')).toBe('page')
    const tatCa = within(khoi).getByRole('link', { name: 'Xem tất cả (6)' })
    expect(tatCa.getAttribute('href')).toBe('/lo-trinh?xem=danh-sach&trang-thai=dang-hoc')
  })

  it('chân sidebar: đồng hồ ở trạng thái nghỉ "Chưa bấm giờ", không có nút Bắt đầu; phase 3 cắm qua dongHo.sidebar', () => {
    moKhung('/')
    expect(screen.getByText('Chưa bấm giờ')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Bắt đầu/ })).toBeNull()
    cleanup()
    moKhung('/', {
      duLieu: { ...DU_LIEU_KHUNG_TRONG, dongHo: { sidebar: <p>Ô đồng hồ phase 3</p> } },
    })
    expect(screen.getByText('Ô đồng hồ phase 3')).toBeTruthy()
    expect(screen.queryByText('Chưa bấm giờ')).toBeNull()
  })

  it('nút Giao diện đổi vòng Sáng → Tối → Theo hệ thống (mặc định Theo hệ thống), nhãn ghi giao diện đang dùng', () => {
    moKhung('/')
    const html = document.documentElement
    const nut = () => screen.getByRole('button', { name: /^Giao diện:/ })
    expect(nut().textContent).toBe('Giao diện: Theo hệ thống')
    expect(nut().getAttribute('aria-label')).toBe(
      'Giao diện: Theo hệ thống. Bấm để chuyển sang Sáng',
    )

    fireEvent.click(nut())
    expect(nut().textContent).toBe('Giao diện: Sáng')
    expect(html.dataset.theme).toBe('light')
    expect(localStorage.getItem(KHOA_GIAO_DIEN)).toBe('sang')

    fireEvent.click(nut())
    expect(nut().textContent).toBe('Giao diện: Tối')
    expect(html.dataset.theme).toBe('dark')

    fireEvent.click(nut())
    expect(nut().textContent).toBe('Giao diện: Theo hệ thống')
    expect(html.hasAttribute('data-theme')).toBe(false)
  })

  it('nút Giao diện luôn có icon như C34 (cả "Theo hệ thống"); chữ chỉ xuống dòng sau "Giao diện:"', () => {
    moKhung('/')
    const nut = () => screen.getByRole('button', { name: /^Giao diện:/ })
    for (let i = 0; i < 3; i++) {
      expect(nut().querySelectorAll('svg')).toHaveLength(1)
      const ten = nut().querySelector('.whitespace-nowrap')!
      expect(nut().textContent).toBe(`Giao diện: ${ten.textContent}`)
      fireEvent.click(nut())
    }
  })

  it('nút "?" gọi useMoBangPhimTat()()', () => {
    moKhung('/')
    const nut = screen.getByRole('button', { name: 'Bảng phím tắt' })
    expect(nut.textContent).toBe('?')
    fireEvent.click(nut)
    expect(moBangPhimTat).toHaveBeenCalledTimes(1)
  })

  it('chỉ một bộ điều hướng: không có top bar mobile, không có rail', () => {
    moKhung('/')
    expect(screen.getAllByRole('navigation')).toHaveLength(1)
    expect(screen.getByRole('complementary', { name: 'Điều hướng chính' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mở menu' })).toBeNull()
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it('axe', async () => {
    const { container } = moKhung('/', {
      duLieu: {
        ...DU_LIEU_KHUNG_TRONG,
        soTheDenHan: 12,
        soBanNhap: 9,
        dangHoc: [taiLieu.id, cacChuDe[0].id],
      },
    })
    await expectNoAxeViolations(container)
  })
})

describe('Rail 72px (1024–1279)', () => {
  beforeEach(() => giaMatchMedia(1100))

  it('menu chỉ icon: tên ở aria-label (kèm badge), đúng thứ tự, aria-current; không có khối Đang học', () => {
    moKhung('/on-tap', { duLieu: { ...DU_LIEU_KHUNG_TRONG, soTheDenHan: 12, soBanNhap: 9 } })
    expect(linkMenu().map((a) => a.getAttribute('aria-label'))).toEqual(
      THU_TU_MENU.map(([ten]) =>
        ten === 'Ôn tập'
          ? 'Ôn tập, 12 thẻ đến hạn'
          : ten === 'Nội dung'
            ? 'Nội dung, 9 bản nháp'
            : ten,
      ),
    )
    expect(linkMenu().map((a) => a.getAttribute('href'))).toEqual(THU_TU_MENU.map(([, den]) => den))
    expect(
      screen.getByRole('link', { name: 'Ôn tập, 12 thẻ đến hạn' }).getAttribute('aria-current'),
    ).toBe('page')
    expect(
      linkMenu().every((a) => a.textContent === '' || /^(\d+|99\+)$/.test(a.textContent ?? '')),
    ).toBe(true)
    expect(screen.queryByRole('region', { name: 'Đang học' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mở menu' })).toBeNull()
  })

  it('badge thu nhỏ của C7: > 99 hiện "99+", aria-label đủ số; ô đang mở đảo màu', () => {
    moKhung('/on-tap', { duLieu: { ...DU_LIEU_KHUNG_TRONG, soTheDenHan: 150, soBanNhap: 100 } })
    const onTap = screen.getByRole('link', { name: 'Ôn tập, 150 thẻ đến hạn' })
    const badge = onTap.querySelector('[data-kieu="dac"]')!
    expect(badge.textContent).toBe('99+')
    expect(badge.className).toContain('bg-on-primary!')
    const noiDung = screen.getByRole('link', { name: 'Nội dung, 100 bản nháp' })
    expect(noiDung.querySelector('[data-kieu="vien"]')?.textContent).toBe('99+')
  })

  it('tìm, Giao diện, "?" và chỗ cắm đồng hồ (chấm khi chạy) ở rail', () => {
    moKhung('/', {
      duLieu: { ...DU_LIEU_KHUNG_TRONG, dongHo: { rail: <span>Đồng hồ rail</span> } },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tìm mục' }))
    expect(moTimKiem).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Bảng phím tắt' }))
    expect(moBangPhimTat).toHaveBeenCalledTimes(1)
    const giaoDien = screen.getByRole('button', { name: /^Giao diện: Theo hệ thống/ })
    fireEvent.click(giaoDien)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(screen.getByText('Đồng hồ rail')).toBeTruthy()
  })

  it('axe', async () => {
    const { container } = moKhung('/', {
      duLieu: { ...DU_LIEU_KHUNG_TRONG, soTheDenHan: 3 },
    })
    await expectNoAxeViolations(container)
  })
})

describe.each([800, 375])('Top bar mobile + drawer (%ipx)', (rong) => {
  beforeEach(() => giaMatchMedia(rong))

  it('top bar: menu bên trái, tiêu đề trang (handle route), tìm kiếm; không có sidebar trên trang', () => {
    moKhung('/on-tap/phien')
    const thanh = screen.getByRole('banner')
    const nut = within(thanh).getAllByRole('button')
    expect(nut.map((b) => b.getAttribute('aria-label'))).toEqual(['Mở menu', 'Tìm kiếm'])
    expect(within(thanh).getByText('Phiên ôn').tagName).toBe('P')
    expect(screen.queryByRole('navigation')).toBeNull()

    fireEvent.click(within(thanh).getByRole('button', { name: 'Tìm kiếm' }))
    expect(moTimKiem).toHaveBeenCalledTimes(1)
  })

  it('mở drawer: dialog "Menu" aria-modal, focus vào trong, nút menu aria-expanded; Esc đóng, focus về nút menu', async () => {
    moKhung('/')
    const nutMenu = screen.getByRole('button', { name: 'Mở menu' })
    nutMenu.focus()
    fireEvent.click(nutMenu)
    const drawer = screen.getByRole('dialog', { name: 'Menu' })
    expect(drawer.getAttribute('aria-modal')).toBe('true')
    expect(drawer.contains(document.activeElement)).toBe(true)
    expect(nutMenu.getAttribute('aria-expanded')).toBe('true')
    expect(within(drawer).getByRole('navigation', { name: 'Menu' })).toBeTruthy()
    expect(within(drawer).getByRole('button', { name: 'Đóng menu' })).toBeTruthy()

    // Esc lúc Telex/VNI đang ghép chữ chỉ huỷ ghép, không đóng.
    fireEvent.keyDown(document.activeElement!, { key: 'Escape', keyCode: 229 })
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeTruthy()

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await choMotNhip()
    expect(document.activeElement).toBe(nutMenu)
    expect(nutMenu.getAttribute('aria-expanded')).toBe('false')
  })

  it('drawer giữ focus bên trong (Tab ở cuối về đầu, Shift+Tab ở đầu về cuối, focus ra ngoài bị kéo lại)', () => {
    moKhung('/')
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }))
    const drawer = screen.getByRole('dialog', { name: 'Menu' })
    const cac = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUS_DUOC))
    const dau = cac[0]
    const cuoi = cac[cac.length - 1]
    expect(dau.textContent).toContain('Học PM A–Z')
    expect(cuoi.getAttribute('aria-label')).toBe('Bảng phím tắt')

    cuoi.focus()
    fireEvent.keyDown(cuoi, { key: 'Tab' })
    expect(document.activeElement).toBe(dau)
    fireEvent.keyDown(dau, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(cuoi)

    // Ngoài drawer đang bị aria-hidden nên lấy <main> theo id.
    document.getElementById('noi-dung-chinh')!.focus()
    expect(drawer.contains(document.activeElement)).toBe(true)
  })

  it('bấm mục menu trong drawer → chuyển trang, drawer đóng, focus về H1 trang mới', async () => {
    const { router } = moKhung('/')
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }))
    const drawer = screen.getByRole('dialog', { name: 'Menu' })
    fireEvent.click(within(drawer).getByRole('link', { name: 'Ôn tập' }))
    expect(router.state.location.pathname).toBe('/on-tap')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(h1())
    expect(h1().textContent).toBe('Ôn tập')
    await choMotNhip()
    expect(document.activeElement).toBe(h1())
  })

  it('⌘ / Ctrl + click mục menu (mở tab mới) không đóng drawer', () => {
    moKhung('/')
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }))
    const drawer = screen.getByRole('dialog', { name: 'Menu' })
    fireEvent.click(within(drawer).getByRole('link', { name: 'Ôn tập' }), { ctrlKey: true })
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeTruthy()
  })

  it('Lùi của trình duyệt khi drawer mở → drawer đóng, focus về H1', async () => {
    const { router } = moKhung('/lo-trinh')
    await act(() => router.navigate('/on-tap'))
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }))
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeTruthy()
    await act(() => router.navigate(-1))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(h1().textContent).toBe('Lộ trình')
    await choMotNhip()
    expect(document.activeElement).toBe(h1())
  })

  it('nút "?" và ô tìm trong drawer: đóng drawer rồi mở lớp kia', () => {
    moKhung('/')
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bảng phím tắt' }))
    expect(moBangPhimTat).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tìm mục…' }))
    expect(moTimKiem).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('nút "Đóng menu" đóng drawer', () => {
    moKhung('/')
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Đóng menu' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('axe: top bar và drawer đang mở', async () => {
    const { container } = moKhung('/')
    await expectNoAxeViolations(container)
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }))
    await expectNoAxeViolations(screen.getByRole('dialog', { name: 'Menu' }))
  })
})

describe('Top bar mobile — "‹ cấp cha"', () => {
  it('trang đặt cấp cha: link "Về {tên}" cắt 1 dòng, tên đủ ở title, lang="en" cho tên mục', () => {
    giaMatchMedia(375)
    const ten = cay.mucHoc.reduce((dai, m) => (m.label.length > dai.length ? m.label : dai), '')
    moKhung('/cap-cha', { capCha: { ten, den: '/lo-trinh', tiengAnh: true } })
    const thanh = screen.getByRole('banner')
    const link = within(thanh).getByRole('link', { name: `Về ${ten}` })
    expect(link.getAttribute('href')).toBe('/lo-trinh')
    expect(link.getAttribute('title')).toBe(ten)
    const chu = link.querySelector('[lang="en"]')!
    expect(chu.textContent).toBe(ten)
    expect(chu.className).toContain('truncate')
    // Nút menu vẫn ở bên trái (D6).
    expect(within(thanh).getAllByRole('button')[0].getAttribute('aria-label')).toBe('Mở menu')
  })

  it('nới cửa sổ quá 1024 lúc drawer mở → drawer đóng, sidebar/rail thay top bar', async () => {
    giaMatchMedia(375)
    moKhung('/')
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }))
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeTruthy()
    doiBeRong(1440)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('banner')).toBeNull()
    expect(screen.getByRole('complementary', { name: 'Điều hướng chính' })).toBeTruthy()
    await choMotNhip()
    expect(document.activeElement).toBe(h1())

    doiBeRong(1100)
    expect(screen.getByRole('link', { name: 'Tổng quan' }).getAttribute('aria-label')).toBe(
      'Tổng quan',
    )
    doiBeRong(375)
    expect(screen.getByRole('button', { name: 'Mở menu' }).getAttribute('aria-expanded')).toBe(
      'false',
    )
  })
})

describe('Focus sau khi chuyển trang (§11)', () => {
  it('lần tải đầu không kéo focus; chuyển trang → focus H1; trang không có H1 → <main>', async () => {
    const { router } = moKhung('/')
    expect(document.activeElement).toBe(document.body)

    fireEvent.click(screen.getByRole('link', { name: 'Lộ trình' }))
    expect(document.activeElement).toBe(h1())
    expect(h1().textContent).toBe('Lộ trình')

    await act(() => router.navigate('/khong-h1'))
    expect(document.activeElement).toBe(screen.getByRole('main'))

    await act(() => router.navigate(-1))
    expect(document.activeElement).toBe(h1())
  })

  it('chỉ đổi query (bộ lọc) thì không kéo focus', async () => {
    const { router } = moKhung('/lo-trinh')
    const nut = screen.getByRole('button', { name: 'Nút trong trang Lộ trình' })
    nut.focus()
    await act(() => router.navigate('/lo-trinh?xem=danh-sach'))
    expect(document.activeElement).toBe(nut)
  })

  it('từ trang ngoài khung (trình soạn) bấm link về → khung gắn mới nhưng vẫn focus H1', () => {
    moKhung('/ngoai')
    fireEvent.click(screen.getByRole('link', { name: 'Về khung' }))
    expect(document.activeElement).toBe(h1())
    expect(h1().textContent).toBe('Tổng quan')
  })

  it('Lùi / Tiến giữa trang ngoài khung và khung (gắn mới, POP) vẫn focus H1; chỉ lần tải đầu là không', async () => {
    const { router } = moKhung('/ngoai')
    expect(document.activeElement).toBe(document.body)
    fireEvent.click(screen.getByRole('link', { name: 'Về khung' }))
    expect(h1().textContent).toBe('Tổng quan')

    // Lùi về mục lịch sử đầu tiên (key 'default', POP): trang ngoài khung gắn mới.
    await act(() => router.navigate(-1))
    expect(router.state.location.key).toBe('default')
    expect(h1().textContent).toBe('Trang ngoài khung')
    expect(document.activeElement).toBe(h1())

    // Tiến: khung gắn mới bằng POP.
    await act(() => router.navigate(1))
    expect(h1().textContent).toBe('Tổng quan')
    expect(document.activeElement).toBe(h1())
  })
})

describe('Trang 404 trong khung: không tô mục menu nào', () => {
  const coCurrent = () => linkMenu().filter((a) => a.hasAttribute('aria-current'))

  it('sidebar (1440): /hoc/<slug sai> không tô Lộ trình; về bài thật thì tô lại', async () => {
    const { router } = moKhung('/hoc/khong-co-muc-nay')
    expect(h1().textContent).toBe('Không tìm thấy trang này.')
    expect(coCurrent()).toEqual([])
    await act(() => router.navigate(`/hoc/${cacChuDe[0].slug}`))
    expect(screen.getByRole('link', { name: 'Lộ trình' }).getAttribute('aria-current')).toBe('true')
  })

  it('rail (1100): không ô nào aria-current', () => {
    giaMatchMedia(1100)
    moKhung('/hoc/khong-co-muc-nay')
    expect(coCurrent()).toEqual([])
  })

  it('375: top bar ghi tên app, drawer không tô mục nào', () => {
    giaMatchMedia(375)
    moKhung('/hoc/khong-co-muc-nay')
    expect(within(screen.getByRole('banner')).getByText('Học PM A–Z').tagName).toBe('P')
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }))
    const drawer = screen.getByRole('dialog', { name: 'Menu' })
    expect(
      within(drawer)
        .getAllByRole('link')
        .filter((a) => a.hasAttribute('aria-current')),
    ).toEqual([])
  })
})

describe('Chân trang ghi nguồn (§6.1)', () => {
  it('dựng từ docs/roadmap-tree.json: tên roadmap (lang="en"), tác giả, ngày dd/MM/yyyy', () => {
    moKhung('/')
    const chan = screen.getByRole('contentinfo')
    expect(chan.textContent).toBe(
      `Cấu trúc theo roadmap ${cayJson.title} của ${cayJson.creator} trên roadmap.sh · cập nhật ${dinhDangNgay(cayJson.roadmapUpdatedAt.slice(0, 10))} · dữ liệu lấy ngày ${dinhDangNgay(cayJson.fetchedAt)}`,
    )
    expect(chan.querySelector('[lang="en"]')?.textContent).toBe(cayJson.title)
    expect(
      within(chan).getByRole('link', { name: 'roadmap.sh (mở tab mới)' }).getAttribute('href'),
    ).toBe(cayJson.source)
  })

  it('lề ngang của chân trang bằng lề nội dung (KhungTrang) ở mọi bề rộng: 40 / 24 / 16', () => {
    const leNgang = (el: Element) =>
      el.className.split(/\s+/).filter((c) => /^(max-\w+:)?px-/.test(c))
    moKhung('/')
    const chan = leNgang(screen.getByRole('contentinfo'))
    cleanup()
    const { container } = render(<KhungTrang>Nội dung</KhungTrang>)
    expect(chan).toEqual(leNgang(container.firstElementChild!))
    expect(chan).toEqual(['px-10', 'max-lg:px-6', 'max-md:px-4'])
  })

  it('mã nguồn không gõ cứng tên roadmap, tác giả hay ngày', () => {
    const nguon = readFileSync(`${process.cwd()}/src/app/khung/ChanTrang.tsx`, 'utf8')
    expect(nguon).not.toContain(cayJson.title)
    expect(nguon).not.toContain(cayJson.creator)
    expect(nguon).not.toContain(dinhDangNgay(cayJson.fetchedAt))
    expect(nguon).toContain("from '../../../docs/roadmap-tree.json'")
  })
})
