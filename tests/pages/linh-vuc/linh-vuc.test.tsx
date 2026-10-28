// @vitest-environment jsdom
// /linh-vuc/:slug (bước 2; §8.4 rút gọn, đề xuất 3.3, 3.9) trên máy chủ giả: chip Lĩnh vực + H1, dòng thành phần,
// tiến độ "x/y · Đang học a · Chưa học b", độ phủ nội dung, "Học tiếp trong lĩnh vực" (Đang học mở gần nhất, không
// có thì Chưa học đầu tiên, hết thì một câu), "Xem trong Lộ trình", cây mục của lĩnh vực có chọn nhiều, pager lĩnh
// vực theo thứ tự cây; axe.
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cacLinhVuc } from '../../../shared/domain/loc-danh-sach'
import { hocTiepTrong } from '../../../src/app/du-lieu/hoc-tiep'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { anhChupTu, cay, moTrang, taoMayChu, type MayChu } from '../lo-trinh/moi-truong'

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
beforeEach(() => {
  sv = taoMayChu()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.title = ''
})

const cacLv = cacLinhVuc(cay)
/** Lĩnh vực có nhóm, không phải đầu / cuối (có cả hai chiều pager) */
const viTri = cacLv.findIndex(
  (n, i) =>
    i > 0 && i < cacLv.length - 1 && n.con.some((id) => cay.nutTheoId.get(id)?.kind === 'group'),
)
const lv = cacLv[viTri]
const mucLv = cay.mucHoc.filter((m) => m.linhVuc?.id === lv.id)
const phan = cay.nutTheoId.get(lv.chaId!)!

describe('/linh-vuc/:slug', () => {
  it('đầu trang, tiến độ, độ phủ, Học tiếp trong lĩnh vực, Xem trong Lộ trình, cây mục, pager; axe', async () => {
    sv.anhChup = anhChupTu({ [mucLv[0].id]: 'da-xong', [mucLv[2].id]: 'dang-hoc' })
    sv.noiDung = { [mucLv[0].id]: { loai: 'da-duyet', ngayDuyet: '2026-10-20' } }
    const { container } = moTrang(`/linh-vuc/${lv.slug}`)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe(lv.label)
    expect(h1.querySelector('[lang="en"]')).not.toBeNull()
    const dau = h1.closest('header')!
    expect(within(dau).getByText('Lĩnh vực')).toBeTruthy()
    expect(within(dau).getByText(/ mục/).textContent).toMatch(
      new RegExp(`^Phần ${phan.label} · ${mucLv.length} mục`),
    )

    const n = mucLv.length
    expect(await screen.findByText(`1/${n} · Đang học 1 · Chưa học ${n - 2}`)).toBeTruthy()
    expect(await screen.findByText(`1 duyệt · 0 nháp · ${n - 1} chưa có`)).toBeTruthy()
    const hocTiep = screen.getByRole('link', { name: /^Học tiếp trong lĩnh vực:/ })
    expect(hocTiep.textContent).toBe(`Học tiếp trong lĩnh vực: ${mucLv[2].label}`)
    expect(hocTiep.getAttribute('href')).toBe(`/hoc/${mucLv[2].slug}`)
    expect(screen.getByRole('link', { name: 'Xem trong Lộ trình' }).getAttribute('href')).toBe(
      `/lo-trinh?xem=danh-sach&linh-vuc=${lv.slug}`,
    )

    // Cây: mọi mục của lĩnh vực, nhóm là h2; có thanh hàng loạt
    expect(container.querySelectorAll('[data-hang-muc]')).toHaveLength(n)
    const tenNhom = lv.con
      .map((id) => cay.nutTheoId.get(id)!)
      .filter((x) => x.kind === 'group')
      .map((x) => x.label)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(tenNhom)
    expect(screen.getByRole('button', { name: /Đặt trạng thái…/ })).toBeTruthy()

    const pager = screen.getByRole('navigation', { name: 'Lĩnh vực trước và tiếp' })
    expect(
      within(pager)
        .getAllByRole('link')
        .map((l) => [l.textContent, l.getAttribute('href')]),
    ).toEqual([
      [`Lĩnh vực trước${cacLv[viTri - 1].label}`, `/linh-vuc/${cacLv[viTri - 1].slug}`],
      [`Lĩnh vực tiếp${cacLv[viTri + 1].label}`, `/linh-vuc/${cacLv[viTri + 1].slug}`],
    ])
    await expectNoAxeViolations(container)

    // Sang lĩnh vực sau bằng pager
    fireEvent.click(within(pager).getAllByRole('link')[1])
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
      cacLv[viTri + 1].label,
    )
  })

  it('Học tiếp: không có Đang học → Chưa học đầu tiên; hết mục → một câu; lĩnh vực đầu không có "trước"', async () => {
    sv.anhChup = anhChupTu({ [mucLv[0].id]: 'da-xong' })
    moTrang(`/linh-vuc/${lv.slug}`)
    const lk = await screen.findByRole('link', { name: /^Học tiếp trong lĩnh vực:/ })
    expect(lk.getAttribute('href')).toBe(`/hoc/${mucLv[1].slug}`)
    cleanup()

    sv.anhChup = anhChupTu(
      Object.fromEntries(mucLv.map((m, i) => [m.id, i % 2 ? 'bo-qua' : 'da-xong'] as const)),
    )
    moTrang(`/linh-vuc/${lv.slug}`)
    expect(await screen.findByText('Đã học hết các mục của lĩnh vực này.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /^Học tiếp trong lĩnh vực:/ })).toBeNull()
    cleanup()

    moTrang(`/linh-vuc/${cacLv[0].slug}`)
    const pager = await screen.findByRole('navigation', { name: 'Lĩnh vực trước và tiếp' })
    expect(within(pager).getAllByRole('link')).toHaveLength(1)
    expect(within(pager).getByRole('link').textContent).toMatch(/^Lĩnh vực tiếp/)
  })

  it('#<slug nhóm> (link tới nhóm): cuộn tới tiêu đề nhóm khi danh sách đã dựng', async () => {
    const nhom = cay.nutTheoId.get(lv.con.find((id) => cay.nutTheoId.get(id)?.kind === 'group')!)!
    const cuon = vi.fn()
    Element.prototype.scrollIntoView = cuon
    moTrang(`/linh-vuc/${lv.slug}#${nhom.slug}`)
    await waitFor(() => expect(cuon).toHaveBeenCalledWith({ block: 'start' }))
    expect(cuon.mock.contexts[0]).toBe(document.getElementById(nhom.slug))
    expect(document.getElementById(nhom.slug)?.textContent).toBe(nhom.label)
  })

  it('hocTiepTrong: Đang học mở gần nhất trước, chưa có ảnh chụp → undefined', () => {
    const anh = anhChupTu(
      { [mucLv[0].id]: 'dang-hoc', [mucLv[1].id]: 'dang-hoc' },
      { luotMo: { [mucLv[1].id]: '2026-10-28T01:00:00.000Z' } },
    )
    expect(hocTiepTrong(mucLv, anh)).toBe(mucLv[1])
    expect(hocTiepTrong(mucLv, undefined)).toBeUndefined()
    expect(hocTiepTrong(mucLv, anhChupTu({}))).toBe(mucLv[0])
  })
})
