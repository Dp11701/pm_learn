// @vitest-environment jsdom
// Trang Nội dung /noi-dung, tab Chờ duyệt + Độ phủ (bước 4; §8.8; đề xuất 3.7 rút gọn theo mục 10) trên máy chủ giả:
// - Chờ duyệt: bảng bản nháp (tên → /hoc/:slug, lĩnh vực / phần, nguồn, Đủ khối, ngày nhập, "Mở bài để duyệt"),
//   theo thứ tự server trả; file lỗi → "Lỗi frontmatter"; nhóm "Bản sửa chờ duyệt (m)"; trống → câu §8.8 + "Nhập
//   file .md"; lỗi tải → Thử lại; axe.
// - Độ phủ: ba số + % của cả roadmap (bất biến 7), hàng phần › lĩnh vực, link Lộ trình lọc mục chưa có; axe.
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PhanHoiChoDuyet } from '../../../src/app/du-lieu/duyet'
import { duongDanChuaCo, tinhDoPhu } from '../../../src/pages/noi-dung/TabDoPhu'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { cay, muc } from '../../components/nhap/ho-tro'
import { moTrang, taoMayChu, type MayChuNhap } from './moi-truong'

vi.mock('../../../src/app/ket-noi', async (goc) => {
  const thuc = await goc<typeof import('../../../src/app/ket-noi')>()
  return {
    ...thuc,
    useKetNoi: () => ({
      trangThai: 'on-dinh',
      meta: null,
      thuNgay: async () => {},
      dangThu: false,
    }),
  }
})

let sv: MayChuNhap

beforeEach(() => {
  sv = taoMayChu()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.title = ''
})

const duongDan = () => screen.getAllByTestId('duong-dan').at(-1)!.textContent

const pestle = muc('pestle')
const bani = muc('bani')
const sc = muc('scope-creep')
const rr = muc('risk-register')

const CHO: PhanHoiChoDuyet = {
  banNhap: [
    {
      id: pestle.id,
      nguon: 'ai',
      ngayNhap: '2026-10-25',
      duKhoi: { co: 7, tong: 9 },
      coLoi: false,
    },
    {
      id: sc.id,
      nguon: 'tu-viet',
      ngayNhap: '2026-10-22',
      duKhoi: { co: 9, tong: 9 },
      coLoi: false,
    },
    { id: bani.id, nguon: 'ai', ngayNhap: '2026-10-01', duKhoi: { co: 0, tong: 9 }, coLoi: true },
  ],
  banSua: [{ id: rr.id, ngayNhap: '2026-10-24' }],
}

describe('tab Chờ duyệt', () => {
  it('bảng bản nháp theo thứ tự server, đủ cột; bản sửa chờ duyệt; link mở bài; axe', async () => {
    sv.trangThaiNoiDung = {
      [pestle.id]: { loai: 'ban-nhap', nguon: 'ai' },
      [sc.id]: { loai: 'ban-nhap', nguon: 'tu-viet' },
      [bani.id]: { loai: 'ban-nhap', nguon: 'ai' },
      [rr.id]: { loai: 'da-duyet', ngayDuyet: '2026-10-10', coBanSua: true },
    }
    sv.traLoi.set('GET /api/duyet/cho-duyet', () => ({ data: CHO }))
    moTrang('/noi-dung')

    const bang = await screen.findByRole('table', { name: 'Bản nháp chờ duyệt (3)' })
    expect(screen.getByRole('tab', { name: 'Chờ duyệt (3)' }).getAttribute('aria-selected')).toBe(
      'true',
    )
    const cot = within(bang)
      .getAllByRole('columnheader')
      .map((c) => c.textContent)
    expect(cot).toEqual(['Mục', 'Lĩnh vực / phần', 'Nguồn', 'Đủ khối', 'Ngày nhập', 'Mở bài'])
    const hang = within(bang).getAllByRole('row').slice(1)
    expect(hang.map((h) => h.getAttribute('data-id'))).toEqual([pestle.id, sc.id, bani.id])

    const o = (h: HTMLElement) =>
      within(h)
        .getAllByRole('cell')
        .map((c) => c.textContent)
    expect(o(hang[0])).toEqual([
      (pestle.linhVuc ?? pestle.phan).label,
      'AI',
      '7/9',
      '25/10/2026',
      `Mở bài để duyệt: ${pestle.label}`,
    ])
    expect(o(hang[1])).toEqual([
      (sc.linhVuc ?? sc.phan).label,
      'Tự viết',
      '9/9',
      '22/10/2026',
      `Mở bài để duyệt: ${sc.label}`,
    ])
    expect(o(hang[2])[2]).toBe('Lỗi frontmatter')

    // Tên mục là link tới bài (lang=en), nút mở bài cùng đích
    const ten = within(hang[0]).getByRole('rowheader')
    expect(within(ten).getByRole('link').getAttribute('href')).toBe(`/hoc/${pestle.slug}`)
    expect(ten.querySelector('[lang="en"]')?.textContent).toBe(pestle.label)
    expect(
      within(hang[0])
        .getByRole('link', { name: `Mở bài để duyệt: ${pestle.label}` })
        .getAttribute('href'),
    ).toBe(`/hoc/${pestle.slug}`)

    const sua = screen.getByRole('table', { name: 'Bản sửa chờ duyệt (1)' })
    const hangSua = within(sua).getAllByRole('row').slice(1)
    expect(hangSua).toHaveLength(1)
    expect(within(hangSua[0]).getByRole('rowheader').textContent).toBe(rr.label)
    expect(within(hangSua[0]).getByText('24/10/2026')).toBeTruthy()

    fireEvent.click(within(hang[1]).getByRole('link', { name: `Mở bài để duyệt: ${sc.label}` }))
    expect(duongDan()).toBe(`/hoc/${sc.slug}`)
  })

  it('axe trên bảng chờ duyệt', async () => {
    sv.traLoi.set('GET /api/duyet/cho-duyet', () => ({ data: CHO }))
    moTrang('/noi-dung?tab=cho-duyet')
    await screen.findByRole('table', { name: /^Bản nháp chờ duyệt/ })
    await expectNoAxeViolations(screen.getByRole('main'))
  })

  it('trống: "Không có bản nháp nào chờ duyệt" + "Nhập file .md" → tab Nhập; không có nhóm bản sửa', async () => {
    sv.traLoi.set('GET /api/duyet/cho-duyet', () => ({ data: { banNhap: [], banSua: [] } }))
    moTrang('/noi-dung?tab=cho-duyet')
    expect(await screen.findByText('Không có bản nháp nào chờ duyệt')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByText(/^Bản sửa chờ duyệt/)).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: 'Nhập file .md' }))
    expect(duongDan()).toBe('/noi-dung?tab=nhap')
    expect(screen.getByRole('tab', { name: 'Nhập' }).getAttribute('aria-selected')).toBe('true')
  })

  it('lỗi tải → câu lỗi + Thử lại tải lại', async () => {
    let lan = 0
    sv.traLoi.set('GET /api/duyet/cho-duyet', () =>
      lan++ === 0 ? { status: 500, data: { loi: 'Máy chủ gặp lỗi.' } } : { data: CHO },
    )
    moTrang('/noi-dung?tab=cho-duyet')
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('table', { name: 'Bản nháp chờ duyệt (3)' })).toBeTruthy()
  })
})

describe('tab Độ phủ', () => {
  it('tinhDoPhu: Đã duyệt + Bản nháp + Chưa có = soMucHoc ở mọi cấp; phần không có lĩnh vực chỉ có hàng phần', () => {
    const bang = {
      [pestle.id]: { loai: 'ban-nhap', nguon: 'ai' },
      [sc.id]: { loai: 'da-duyet', ngayDuyet: '2026-10-10' },
      [rr.id]: { loai: 'da-duyet', ngayDuyet: '2026-10-10', coBanSua: true },
    } as const
    const kq = tinhDoPhu(cay, (id) => bang[id as keyof typeof bang] ?? { loai: 'chua-co' })!
    expect(kq.tong).toEqual({
      daDuyet: 2,
      banNhap: 1,
      chuaCo: cay.soMucHoc - 3,
      tong: cay.soMucHoc,
    })
    expect(kq.phan.map((p) => p.nut.id)).toEqual(cay.phan.map((p) => p.id))
    for (const p of kq.phan) {
      const d = p.dem
      expect(d.daDuyet + d.banNhap + d.chuaCo).toBe(d.tong)
      expect(d.tong).toBe(cay.mucHoc.filter((m) => m.phan.id === p.nut.id).length)
      const lv = p.linhVuc.reduce((s, h) => s + h.dem.tong, 0)
      const khongLv = cay.mucHoc.filter((m) => m.phan.id === p.nut.id && !m.linhVuc).length
      expect(lv + khongLv).toBe(d.tong)
    }
    // Chưa biết trạng thái một mục → chưa đếm
    expect(tinhDoPhu(cay, () => undefined)).toBeUndefined()
    expect(duongDanChuaCo(sc.linhVuc!)).toBe(
      `/lo-trinh?xem=danh-sach&linh-vuc=${sc.linhVuc!.slug}&noi-dung=chua-co`,
    )
    expect(duongDanChuaCo(sc.phan)).toBe(
      `/lo-trinh?xem=danh-sach&phan=${sc.phan.slug}&noi-dung=chua-co`,
    )
  })

  it('cả roadmap: ba số + %; bảng phần › lĩnh vực; link Lộ trình lọc mục chưa có; axe', async () => {
    // Mọi mục của lĩnh vực chứa scope-creep đã duyệt → hàng đó không có link
    const lvSc = sc.linhVuc!
    const cungLv = cay.mucHoc.filter((m) => m.linhVuc?.id === lvSc.id)
    sv.trangThaiNoiDung = Object.fromEntries(
      cungLv.map((m) => [m.id, { loai: 'da-duyet', ngayDuyet: '2026-10-10' }]),
    )
    sv.trangThaiNoiDung[pestle.id] = { loai: 'ban-nhap', nguon: 'ai' }
    moTrang('/noi-dung?tab=do-phu')

    const tong = await screen.findByRole('region', { name: /^Cả roadmap/ })
    const so = cay.soMucHoc
    const nhom = within(tong).getAllByRole('definition')
    expect(nhom.map((d) => d.textContent)).toEqual([
      `${cungLv.length}${Math.round((cungLv.length / so) * 100)}%`,
      `1${Math.round((1 / so) * 100)}%`,
      `${so - cungLv.length - 1}${Math.round(((so - cungLv.length - 1) / so) * 100)}%`,
    ])

    const bang = screen.getByRole('table', { name: 'Theo phần và lĩnh vực' })
    const hangLv = within(bang).getByRole('rowheader', { name: lvSc.label }).closest('tr')!
    expect(
      within(hangLv)
        .getAllByRole('cell')
        .slice(0, 4)
        .map((c) => c.textContent),
    ).toEqual([String(cungLv.length), '0', '0', String(cungLv.length)])
    expect(within(hangLv).queryByRole('link')).toBeNull()

    // Phần không có lĩnh vực (mục nằm thẳng trong phần): chỉ hàng phần, link lọc theo phần
    const phanTrong = cay.mucHoc.find((m) => !m.linhVuc)!.phan
    const hangPhan = within(bang).getByRole('rowheader', { name: phanTrong.label }).closest('tr')!
    const link = within(hangPhan).getByRole('link', {
      name: `Xem mục chưa có nội dung của ${phanTrong.label}`,
    })
    expect(link.getAttribute('href')).toBe(duongDanChuaCo(phanTrong))

    // Lĩnh vực của pestle (nếu có) hoặc phần của nó: còn mục chưa có → có link
    const noiPestle = pestle.linhVuc ?? pestle.phan
    const hangPestle = within(bang).getByRole('rowheader', { name: noiPestle.label }).closest('tr')!
    fireEvent.click(within(hangPestle).getByRole('link'))
    await waitFor(() => expect(duongDan()).toBe(duongDanChuaCo(noiPestle)))
  })

  it('axe', async () => {
    sv.trangThaiNoiDung = { [pestle.id]: { loai: 'ban-nhap', nguon: 'ai' } }
    moTrang('/noi-dung?tab=do-phu')
    await screen.findByRole('table', { name: 'Theo phần và lĩnh vực' })
    await expectNoAxeViolations(screen.getByRole('main'))
  })
})
