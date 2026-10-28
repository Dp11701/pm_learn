// @vitest-environment jsdom
// /lo-trinh (bước 2; §8.3, §6.3, đề xuất 3.3, 3.9) trên máy chủ giả: cây Phần › Lĩnh vực › Nhóm › Mục, hàng có
// trạng thái học (icon + chữ), chip loại, chip nội dung, cờ Cần ôn lại; phân số phần không phụ thuộc bộ lọc; bộ lọc
// trong URL (HOẶC trong nhóm, VÀ giữa nhóm), "Đang hiển thị x/{soMucHoc} mục", "Xoá bộ lọc"; link cũ ?muc=, ?phan=,
// ?linh-vuc=&noi-dung=chua-co; sắp A–Z / Mở gần đây (phẳng, breadcrumb); hàng loạt (Space, không có Đã xong,
// Hoàn tác, đổi bộ lọc bỏ chọn mục bị ẩn); axe. Hồi quy review: lọc theo Nội dung khi không tải được trạng thái nội
// dung → lỗi + Thử lại (không skeleton mãi); hàng đang chọn có mô tả "Đã chọn" trên link (điểm focus); toast hàng
// loạt không tự đóng sau 5 giây.
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chuPhanSo } from '../../../src/components/trang-thai/TienDo'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import {
  anhChupTu,
  cacLanGhi,
  cay,
  duongDanHienTai,
  moTrang,
  taoMayChu,
  type MayChu,
} from './moi-truong'

const ketNoi = vi.hoisted(() => ({ meta: null as unknown }))
vi.mock('../../../src/app/ket-noi', async (goc) => {
  const thuc = await goc<typeof import('../../../src/app/ket-noi')>()
  return {
    ...thuc,
    useKetNoi: () => ({
      trangThai: 'on-dinh',
      meta: ketNoi.meta,
      thuNgay: async () => {},
      dangThu: false,
    }),
  }
})

let sv: MayChu
const cuon = vi.fn()

beforeEach(() => {
  sv = taoMayChu()
  Element.prototype.scrollIntoView = cuon
  cuon.mockClear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.title = ''
})

const N = cay.soMucHoc
const phan = cay.phan[0]
const mucPhan = cay.mucHoc.filter((m) => m.phan.id === phan.id)
const [a, b, c] = mucPhan
/** Lĩnh vực có nhóm (để kiểm cấp nhóm) */
const lv = cay.mucHoc.find((m) => m.linhVuc && m.nhom)!.linhVuc!
const mucLv = cay.mucHoc.filter((m) => m.linhVuc?.id === lv.id)

const hang = (id: string) => document.querySelector<HTMLElement>(`[data-hang-muc="${id}"]`)!
const lienKet = (id: string) => document.querySelector<HTMLElement>(`[data-lien-ket-muc="${id}"]`)!
const nhom = (ten: string) => screen.getByRole('group', { name: ten })
const chip = (tenNhom: string, ten: string) =>
  within(nhom(tenNhom)).getByRole('button', { name: ten })
const dangHien = (x: number) => `Đang hiển thị ${x}/${N} mục`
/** Phân số cạnh tiêu đề của một nút (phần, lĩnh vực, nhóm). */
const phanSoCua = (nutId: string) =>
  document.querySelector(`[data-nut="${nutId}"] > div > span.tabular-nums`)?.textContent

describe('/lo-trinh — cây và bộ lọc', () => {
  it('cây Phần › Lĩnh vực › Nhóm › Mục; hàng: trạng thái, chip loại, nội dung, Cần ôn lại, link bài; axe', async () => {
    sv.anhChup = anhChupTu(
      { [a.id]: 'da-xong', [b.id]: 'dang-hoc', [c.id]: 'bo-qua' },
      { canOnLai: [a.id] },
    )
    sv.noiDung = {
      [a.id]: { loai: 'da-duyet', ngayDuyet: '2026-10-20' },
      [b.id]: { loai: 'ban-nhap', nguon: 'ai' },
    }
    const { container } = moTrang('/lo-trinh')
    expect(await screen.findByText(dangHien(N))).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Lộ trình')
    // Phần là h2 theo thứ tự cây; lĩnh vực h3 là link tới trang lĩnh vực; nhóm h4
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(
      cay.phan.map((p) => p.label),
    )
    expect(
      screen
        .getByRole('link', { name: lv.label })
        .closest('h3')
        ?.querySelector('a')
        ?.getAttribute('href'),
    ).toBe(`/linh-vuc/${lv.slug}`)
    const nhomDau = mucLv.find((m) => m.nhom)!.nhom!
    expect(document.getElementById(nhomDau.slug)?.tagName).toBe('H4')

    await waitFor(() =>
      expect(within(hang(a.id)).queryByText('Đã duyệt · 20/10/2026')).toBeTruthy(),
    )
    expect(within(hang(a.id)).getByText('Đã xong')).toBeTruthy()
    expect(within(hang(a.id)).getByText('Cần ôn lại')).toBeTruthy()
    expect(within(hang(b.id)).getByText('Đang học')).toBeTruthy()
    expect(within(hang(b.id)).getByText('Bản nháp · AI')).toBeTruthy()
    expect(within(hang(c.id)).getByText('Bỏ qua')).toBeTruthy()
    expect(within(hang(c.id)).getByText('Chưa có nội dung')).toBeTruthy()
    expect(within(hang(c.id)).queryByText('Cần ôn lại')).toBeNull()
    expect(lienKet(a.id).getAttribute('href')).toBe(`/hoc/${a.slug}`)
    // Chip loại theo mẫu bài
    const taiLieu = cay.mucHoc.find((m) => m.mau === 'tai-lieu')!
    expect(within(hang(taiLieu.id)).getByText('Tài liệu')).toBeTruthy()
    // Phân số của phần: 1/(n − 1) · 1 bỏ qua
    expect(phanSoCua(phan.id)).toBe(chuPhanSo({ xong: 1, boQua: 1, tong: mucPhan.length }))
    // Một điểm Tab: chỉ hàng đầu có tabindex 0
    expect(container.querySelectorAll('[data-lien-ket-muc][tabindex="0"]')).toHaveLength(1)
    await expectNoAxeViolations(container)
  })

  it('chip lọc ghi vào URL; HOẶC trong nhóm, VÀ giữa nhóm; phân số phần không đổi; "Xoá bộ lọc"', async () => {
    sv.anhChup = anhChupTu({ [a.id]: 'da-xong', [b.id]: 'dang-hoc', [c.id]: 'bo-qua' })
    moTrang('/lo-trinh?xem=danh-sach')
    await screen.findByText(dangHien(N))
    const xoa = screen.getByRole('button', { name: 'Xoá bộ lọc' })
    expect(xoa.getAttribute('aria-disabled')).toBe('true')
    // Bấm khi chưa lọc: không đổi gì
    fireEvent.click(xoa)
    expect(duongDanHienTai()).toBe('/lo-trinh?xem=danh-sach')

    fireEvent.click(chip('Trạng thái', 'Đang học'))
    expect(duongDanHienTai()).toBe('/lo-trinh?xem=danh-sach&trang-thai=dang-hoc')
    expect(await screen.findByText(dangHien(1))).toBeTruthy()
    expect(chip('Trạng thái', 'Đang học').getAttribute('aria-pressed')).toBe('true')
    expect(hang(a.id)).toBeNull()
    // Phân số phần không phụ thuộc bộ lọc
    expect(phanSoCua(phan.id)).toBe(chuPhanSo({ xong: 1, boQua: 1, tong: mucPhan.length }))

    // HOẶC trong nhóm
    fireEvent.click(chip('Trạng thái', 'Bỏ qua'))
    expect(duongDanHienTai()).toBe('/lo-trinh?xem=danh-sach&trang-thai=dang-hoc%2Cbo-qua')
    expect(await screen.findByText(dangHien(2))).toBeTruthy()
    // VÀ giữa nhóm: thêm loại của b → chỉ còn b
    fireEvent.click(
      chip('Loại', { 'chu-de': 'Chủ đề', 'tai-lieu': 'Tài liệu', 'chung-chi': 'Chứng chỉ' }[b.mau]),
    )
    const conLai = [b, c].filter((m) => m.mau === b.mau).length
    expect(await screen.findByText(dangHien(conLai))).toBeTruthy()
    expect(hang(b.id)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }))
    expect(duongDanHienTai()).toBe('/lo-trinh?xem=danh-sach')
    expect(await screen.findByText(dangHien(N))).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Xoá bộ lọc' }).getAttribute('aria-disabled')).toBe(
      'true',
    )
  })

  it('link cũ ?xem=danh-sach&muc=<slug>: cuộn tới, nổi bật, focus hàng; bộ lọc ẩn mục thì báo', async () => {
    const m = cay.mucHoc[Math.floor(N / 2)]
    moTrang(`/lo-trinh?xem=danh-sach&muc=${m.slug}`)
    await waitFor(() => expect(document.activeElement).toBe(lienKet(m.id)))
    expect(hang(m.id).hasAttribute('data-noi-bat')).toBe(true)
    expect(lienKet(m.id).getAttribute('tabindex')).toBe('0')
    expect(cuon).toHaveBeenCalledWith({ block: 'center' })
    cleanup()

    moTrang(`/lo-trinh?xem=danh-sach&trang-thai=da-xong&muc=${m.slug}`)
    expect(await screen.findByText(dangHien(0))).toBeTruthy()
    expect(screen.getByText(/không khớp bộ lọc đang chọn nên đang bị ẩn\.$/).textContent).toBe(
      `${m.label} không khớp bộ lọc đang chọn nên đang bị ẩn.`,
    )
    expect(screen.getByText('Không có mục nào khớp bộ lọc.')).toBeTruthy()
  })

  it('link cũ ?phan=<slug> và ?linh-vuc=<slug>&noi-dung=chua-co lọc đúng; đổi bộ lọc bỏ ?muc=', async () => {
    moTrang(`/lo-trinh?xem=danh-sach&phan=${phan.slug}`)
    expect(await screen.findByText(dangHien(mucPhan.length))).toBeTruthy()
    expect(chip('Phần', phan.label).getAttribute('aria-pressed')).toBe('true')
    cleanup()

    sv.noiDung = { [mucLv[0].id]: { loai: 'ban-nhap', nguon: 'tu-viet' } }
    moTrang(`/lo-trinh?xem=danh-sach&linh-vuc=${lv.slug}&noi-dung=chua-co&muc=${mucLv[1].slug}`)
    expect(await screen.findByText(dangHien(mucLv.length - 1))).toBeTruthy()
    expect(hang(mucLv[0].id)).toBeNull()
    expect(hang(mucLv[1].id)).toBeTruthy()
    fireEvent.click(chip('Nội dung', 'Bản nháp'))
    expect(duongDanHienTai()).toBe(
      `/lo-trinh?xem=danh-sach&linh-vuc=${lv.slug}&noi-dung=chua-co%2Cban-nhap`,
    )
    expect(await screen.findByText(dangHien(mucLv.length))).toBeTruthy()
  })
})

describe('/lo-trinh — sắp xếp', () => {
  it('A–Z: danh sách phẳng có breadcrumb, theo tên; chưa có lượt mở thì không có "Mở gần đây"', async () => {
    moTrang('/lo-trinh?sap-xep=mo-gan-day')
    await screen.findByText(dangHien(N))
    const o = screen.getByRole('combobox', { name: 'Sắp xếp' }) as HTMLSelectElement
    // Chưa có lượt mở nào: sắp theo cây, không có lựa chọn "Mở gần đây"
    expect(o.value).toBe('cay')
    expect([...o.options].map((x) => x.textContent)).toEqual(['Theo thứ tự cây', 'A–Z'])
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(cay.phan.length)

    fireEvent.change(o, { target: { value: 'a-z' } })
    expect(duongDanHienTai()).toBe('/lo-trinh?sap-xep=a-z')
    await waitFor(() => expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0))
    const thuTu = [...document.querySelectorAll('[data-lien-ket-muc]')].map((x) => x.textContent)
    const soSanh = new Intl.Collator('en', { sensitivity: 'base', numeric: true })
    expect(thuTu).toEqual([...thuTu].sort((x, y) => soSanh.compare(x!, y!)))
    // Breadcrumb nhỏ: phần › …
    expect(hang(a.id).textContent).toContain(a.phan.label)
  })

  it('Mở gần đây: mở gần nhất trước, mục chưa mở theo thứ tự cây', async () => {
    const [x, y] = [cay.mucHoc[10], cay.mucHoc[20]]
    sv.anhChup = anhChupTu(
      {},
      { luotMo: { [x.id]: '2026-10-27T08:00:00.000Z', [y.id]: '2026-10-28T08:00:00.000Z' } },
    )
    moTrang('/lo-trinh?sap-xep=mo-gan-day')
    await screen.findByText(dangHien(N))
    const o = screen.getByRole('combobox', { name: 'Sắp xếp' }) as HTMLSelectElement
    expect(o.value).toBe('mo-gan-day')
    const ids = [...document.querySelectorAll('[data-lien-ket-muc]')].map((e) =>
      e.getAttribute('data-lien-ket-muc'),
    )
    expect(ids.slice(0, 3)).toEqual([y.id, x.id, cay.mucHoc[0].id])
  })
})

describe('/lo-trinh — hàng loạt', () => {
  it('Space chọn; "Đặt trạng thái…" chỉ Chưa học / Đang học / Bỏ qua; toast + Hoàn tác', async () => {
    moTrang(`/lo-trinh?phan=${phan.slug}`)
    await screen.findByText(dangHien(mucPhan.length))
    act(() => lienKet(a.id).focus())
    fireEvent.keyDown(lienKet(a.id), { code: 'Space', key: ' ' })
    expect(screen.getByText('Đã chọn 1 mục')).toBeTruthy()
    // ↓ sang hàng kế, Space chọn tiếp
    fireEvent.keyDown(lienKet(a.id), { code: 'ArrowDown', key: 'ArrowDown' })
    expect(document.activeElement).toBe(lienKet(b.id))
    fireEvent.keyDown(lienKet(b.id), { code: 'Space', key: ' ' })
    expect(screen.getByText('Đã chọn 2 mục')).toBeTruthy()
    expect((within(hang(b.id)).getByRole('checkbox') as HTMLInputElement).checked).toBe(true)

    const nut = screen.getByRole('button', { name: /Đặt trạng thái…/ })
    act(() => nut.focus())
    fireEvent.keyDown(nut, { key: 'Enter' })
    const cacMuc = within(screen.getByRole('menu')).getAllByRole('menuitem')
    expect(cacMuc.map((m) => m.textContent)).toEqual(['Chưa học', 'Đang học', 'Bỏ qua'])
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Bỏ qua' }), { key: 'Enter' })

    expect(await screen.findByText('Đã chuyển 2 mục sang Bỏ qua')).toBeTruthy()
    expect(cacLanGhi(sv)).toEqual([
      {
        method: 'POST',
        url: '/api/trang-thai/hang-loat',
        body: { ids: [a.id, b.id], trangThai: 'bo-qua' },
      },
    ])
    await waitFor(() => expect(screen.getByText('Đã chọn 0 mục')).toBeTruthy())
    expect(hang(a.id).getAttribute('data-trang-thai')).toBe('bo-qua')
    expect(hang(b.id).getAttribute('data-trang-thai')).toBe('bo-qua')

    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    expect(await screen.findByText('Đã hoàn tác 2 mục')).toBeTruthy()
    expect(cacLanGhi(sv)[1]).toEqual({
      method: 'POST',
      url: '/api/trang-thai/hang-loat/hoan-tac',
      body: {
        trangThai: 'bo-qua',
        truoc: { [a.id]: { trangThai: 'chua-hoc' }, [b.id]: { trangThai: 'chua-hoc' } },
      },
    })
    await waitFor(() => expect(hang(a.id).getAttribute('data-trang-thai')).toBe('chua-hoc'))
  })

  it('hàng đang chọn: link (điểm focus) có mô tả "Đã chọn"; bỏ chọn thì mất', async () => {
    const { container } = moTrang(`/lo-trinh?phan=${phan.slug}`)
    await screen.findByText(dangHien(mucPhan.length))
    const moTa = (el: HTMLElement) =>
      (el.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent)
        .join(' ')
    expect(lienKet(a.id).hasAttribute('aria-describedby')).toBe(false)
    act(() => lienKet(a.id).focus())
    fireEvent.keyDown(lienKet(a.id), { code: 'Space', key: ' ' })
    expect(moTa(lienKet(a.id))).toBe('Đã chọn')
    expect(lienKet(b.id).hasAttribute('aria-describedby')).toBe(false)
    // Chữ mô tả không hiện ra và không bị đọc lặp khi duyệt trang
    const idMoTa = lienKet(a.id).getAttribute('aria-describedby')!
    expect(document.getElementById(idMoTa)!.hidden).toBe(true)
    fireEvent.click(within(hang(b.id)).getByRole('checkbox'))
    expect(moTa(lienKet(b.id))).toBe('Đã chọn')
    fireEvent.keyDown(lienKet(a.id), { code: 'Space', key: ' ' })
    expect(lienKet(a.id).hasAttribute('aria-describedby')).toBe(false)
    await expectNoAxeViolations(container)
  })

  it('toast "Đã chuyển n mục…" + Hoàn tác không tự đóng sau 5 giây (lưới an toàn của lần ghi nhiều mục)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      sv.anhChup = anhChupTu({ [a.id]: 'da-xong' })
      moTrang(`/lo-trinh?phan=${phan.slug}`)
      await screen.findByText(dangHien(mucPhan.length))
      fireEvent.click(within(hang(a.id)).getByRole('checkbox'))
      const nut = screen.getByRole('button', { name: /Đặt trạng thái…/ })
      act(() => nut.focus())
      fireEvent.keyDown(nut, { key: 'Enter' })
      fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Chưa học' }), { key: 'Enter' })
      expect(await screen.findByText('Đã chuyển 1 mục sang Chưa học')).toBeTruthy()
      act(() => vi.advanceTimersByTime(60_000))
      expect(screen.getByText('Đã chuyển 1 mục sang Chưa học')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
      expect(await screen.findByText('Đã hoàn tác 1 mục')).toBeTruthy()
      await waitFor(() => expect(hang(a.id).getAttribute('data-trang-thai')).toBe('da-xong'))
    } finally {
      vi.useRealTimers()
    }
  })

  it('đổi bộ lọc bỏ chọn mục bị ẩn; chọn tất cả chỉ chọn mục đang hiện', async () => {
    sv.anhChup = anhChupTu({ [b.id]: 'dang-hoc' })
    moTrang(`/lo-trinh?phan=${phan.slug}`)
    await screen.findByText(dangHien(mucPhan.length))
    fireEvent.click(within(hang(a.id)).getByRole('checkbox'))
    fireEvent.click(within(hang(b.id)).getByRole('checkbox'))
    expect(screen.getByText('Đã chọn 2 mục')).toBeTruthy()
    fireEvent.click(chip('Trạng thái', 'Chưa học'))
    await screen.findByText(dangHien(mucPhan.length - 1))
    expect(screen.getByText('Đã chọn 1 mục')).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn tất cả mục đang hiển thị' }))
    expect(screen.getByText(`Đã chọn ${mucPhan.length - 1} mục`)).toBeTruthy()
  })

  it('lọc theo Nội dung mà không tải được trạng thái nội dung: lỗi + Thử lại, không skeleton mãi', async () => {
    sv.loiNoiDung = true
    moTrang(`/lo-trinh?xem=danh-sach&linh-vuc=${lv.slug}&noi-dung=chua-co`)
    expect(await screen.findByText('Không tải được trạng thái nội dung.')).toBeTruthy()
    expect(document.querySelector('[data-hang-muc]')).toBeNull()
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
    sv.loiNoiDung = false
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText(dangHien(mucLv.length))).toBeTruthy()
    expect(screen.queryByText('Không tải được trạng thái nội dung.')).toBeNull()
  })

  it('không lọc theo Nội dung: trạng thái nội dung lỗi không chặn danh sách (chỉ thiếu chip nội dung)', async () => {
    sv.loiNoiDung = true
    moTrang(`/lo-trinh?phan=${phan.slug}`)
    expect(await screen.findByText(dangHien(mucPhan.length))).toBeTruthy()
    expect(screen.queryByText('Không tải được trạng thái nội dung.')).toBeNull()
  })

  it('không tải được trạng thái học: báo lỗi + Thử lại, không vẽ danh sách', async () => {
    sv.loiState = true
    moTrang('/lo-trinh')
    expect(await screen.findByText('Không tải được trạng thái học.')).toBeTruthy()
    expect(document.querySelector('[data-hang-muc]')).toBeNull()
    sv.loiState = false
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText(dangHien(N))).toBeTruthy()
  })
})
