// @vitest-environment jsdom
// / Tổng quan gọn (bước 2; §8.1 rút gọn, F05, đề xuất 3.3, 3.9) trên máy chủ giả: banner lần đầu, Tiếp tục học,
// tiến độ (% làm tròn, không 100% khi chưa đủ, "—" khi mẫu số 0; số mục theo trạng thái), "Theo phần" dẫn tới Lộ trình
// lọc theo phần, thẻ cần ôn hôm nay + "Bắt đầu ôn", độ phủ nội dung; không có đồng hồ / giờ học / streak; axe.
// Hồi quy review: trạng thái nội dung tải lỗi → card "Nội dung bài học" báo lỗi + Thử lại (không skeleton mãi), banner
// F05 vẫn hiện (bỏ con số độ phủ).
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TheOn } from '../../../server/du-lieu/hop-dong-the'
import type { TrangThaiHoc } from '../../../shared/domain/trang-thai'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import {
  HOM_NAY,
  anhChupTu,
  cay,
  duongDanHienTai,
  moTrang,
  onTapRong,
  taoMayChu,
  type MayChu,
} from '../lo-trinh/moi-truong'

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

const N = cay.soMucHoc
const the = (i: number): TheOn => ({
  id: i + 1,
  itemId: cay.mucHoc[i].id,
  truoc: `Câu ${i}`,
  sau: `Đáp ${i}`,
  hop: 1,
  hanOn: HOM_NAY,
  taoLuc: '2026-10-20T00:00:00.000Z',
})
const vung = (ten: string) => screen.getByRole('region', { name: new RegExp(`^${ten}`) })

describe('/ Tổng quan', () => {
  it('lần đầu (F05): banner + "Bắt đầu với mục đầu tiên"; 0% · 0/N · 0 bỏ qua; 0 thẻ; độ phủ; axe', async () => {
    const { container } = moTrang('/')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Tổng quan')
    const cauF05 = `Roadmap có ${N} mục, hiện 0/${N} mục có nội dung. Bắt đầu từ đâu?`
    expect(await screen.findByText(cauF05)).toBeTruthy()
    const dau = cay.mucHoc[0]
    expect(
      screen.getByRole('link', { name: 'Bắt đầu với mục đầu tiên' }).getAttribute('href'),
    ).toBe(`/hoc/${dau.slug}`)

    const hocTiep = vung('Tiếp tục học')
    expect(within(hocTiep).getByText(dau.label)).toBeTruthy()
    expect(within(hocTiep).getByText(/mục đầu tiên trong cây/)).toBeTruthy()
    expect(within(hocTiep).getByRole('link', { name: 'Học tiếp' }).getAttribute('href')).toBe(
      `/hoc/${dau.slug}`,
    )

    const tienDo = vung('Tiến độ')
    expect(within(tienDo).getByText(`0% · 0/${N} · 0 bỏ qua`)).toBeTruthy()
    expect(within(tienDo).getByText(`Chưa học ${N}`)).toBeTruthy()
    // Theo phần: mỗi phần một dòng, link tới Lộ trình lọc theo phần
    const cacPhan = within(tienDo)
      .getAllByRole('listitem')
      .filter((li) => li.querySelector('a'))
    expect(cacPhan.map((li) => li.querySelector('a')!.getAttribute('href'))).toEqual(
      cay.phan.map((p) => `/lo-trinh?xem=danh-sach&phan=${p.slug}`),
    )

    expect(await screen.findByRole('heading', { name: 'Thẻ cần ôn hôm nay: 0' })).toBeTruthy()
    expect(screen.getByText('Hôm nay không có thẻ đến hạn.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Xem Ôn tập' }).getAttribute('href')).toBe('/on-tap')
    expect(screen.queryByRole('link', { name: 'Bắt đầu ôn' })).toBeNull()

    expect(screen.getByText(`Đã duyệt 0 · Bản nháp 0 · Chưa có ${N}`)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Xem Nội dung' }).getAttribute('href')).toBe(
      '/noi-dung',
    )
    // Không có đồng hồ / giờ học / streak
    expect(screen.queryByText(/giờ học|streak|Bấm giờ/i)).toBeNull()
    await expectNoAxeViolations(container)
  })

  it('có dữ liệu: không banner; % không lên 100% khi chưa đủ; Học tiếp; thẻ đến hạn + "Bắt đầu ôn"', async () => {
    // Đã xong mọi mục trừ mục cuối (Đang học): 99%, không phải 100%
    const cuoi = cay.mucHoc[N - 1]
    const bang: Record<string, TrangThaiHoc> = Object.fromEntries(
      cay.mucHoc.map((m) => [m.id, m.id === cuoi.id ? 'dang-hoc' : 'da-xong']),
    )
    sv.anhChup = anhChupTu(bang)
    sv.onTap = onTapRong({ denHan: [the(0), the(1), the(2)], tongThe: 5 })
    sv.noiDung = {
      [cay.mucHoc[0].id]: { loai: 'da-duyet', ngayDuyet: '2026-10-20' },
      [cay.mucHoc[1].id]: { loai: 'ban-nhap', nguon: 'ai' },
    }
    moTrang('/')
    const tienDo = vung('Tiến độ')
    expect(await within(tienDo).findByText(`99% · ${N - 1}/${N} · 0 bỏ qua`)).toBeTruthy()
    expect(within(tienDo).getByText(`Đã xong ${N - 1}`)).toBeTruthy()
    expect(within(tienDo).getByText('Đang học 1')).toBeTruthy()
    expect(screen.queryByText(/Bắt đầu từ đâu\?/)).toBeNull()

    const hocTiep = vung('Tiếp tục học')
    expect(within(hocTiep).getByText(cuoi.label)).toBeTruthy()
    expect(within(hocTiep).getByText('Đang học')).toBeTruthy()
    expect(within(hocTiep).queryByText(/mục đầu tiên trong cây/)).toBeNull()

    expect(await screen.findByRole('heading', { name: 'Thẻ cần ôn hôm nay: 3' })).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Bắt đầu ôn' }))
    expect(duongDanHienTai()).toBe('/on-tap/phien')
    cleanup()

    moTrang('/')
    expect(await screen.findByText(`Đã duyệt 1 · Bản nháp 1 · Chưa có ${N - 2}`)).toBeTruthy()
  })

  it('bất biến 8: banGhiNgoaiCay > 0 → banner trung tính "n bản ghi thuộc mục không còn trong cây roadmap…"; 0 / thiếu → không có; axe', async () => {
    const cau = (n: number) =>
      `${n} bản ghi thuộc mục không còn trong cây roadmap. Dữ liệu vẫn được giữ.`
    sv.anhChup = anhChupTu({ [cay.mucHoc[0].id]: 'dang-hoc' }, { banGhiNgoaiCay: 3 })
    const { container } = moTrang('/')
    const banner = await screen.findByText(cau(3))
    // Trung tính: không phải banner lỗi (không role alert, không chữ màu danger), không vạch trái
    expect(banner.closest('[role="alert"]')).toBeNull()
    expect(banner.className).not.toContain('danger')
    // Bản ghi mồ côi không tính tiến độ
    expect(within(vung('Tiến độ')).getByText(`0% · 0/${N} · 0 bỏ qua`)).toBeTruthy()
    await expectNoAxeViolations(container)
    cleanup()

    sv.anhChup = anhChupTu({ [cay.mucHoc[0].id]: 'dang-hoc' }, { banGhiNgoaiCay: 0 })
    moTrang('/')
    await within(vung('Tiến độ')).findByText(`0% · 0/${N} · 0 bỏ qua`)
    expect(screen.queryByText(/bản ghi thuộc mục không còn trong cây/)).toBeNull()
    cleanup()

    // Server cũ không gửi trường này: không có banner
    sv.anhChup = anhChupTu({ [cay.mucHoc[0].id]: 'dang-hoc' })
    moTrang('/')
    await within(vung('Tiến độ')).findByText(`0% · 0/${N} · 0 bỏ qua`)
    expect(screen.queryByText(/bản ghi thuộc mục không còn trong cây/)).toBeNull()
  })

  it('trạng thái nội dung lỗi: card Nội dung báo lỗi + Thử lại; banner F05 vẫn hiện, không có con số độ phủ; axe', async () => {
    sv.loiNoiDung = true
    const { container } = moTrang('/')
    const theNoiDung = vung('Nội dung bài học')
    expect(await within(theNoiDung).findByText('Không tải được trạng thái nội dung.')).toBeTruthy()
    expect(theNoiDung.querySelector('[aria-busy="true"]')).toBeNull()
    expect(await screen.findByText(`Roadmap có ${N} mục. Bắt đầu từ đâu?`)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Bắt đầu với mục đầu tiên' })).toBeTruthy()
    // Các card khác không bị ảnh hưởng
    expect(within(vung('Tiến độ')).getByText(`0% · 0/${N} · 0 bỏ qua`)).toBeTruthy()
    await expectNoAxeViolations(container)

    sv.loiNoiDung = false
    fireEvent.click(within(theNoiDung).getByRole('button', { name: 'Thử lại' }))
    expect(
      await within(theNoiDung).findByText(`Đã duyệt 0 · Bản nháp 0 · Chưa có ${N}`),
    ).toBeTruthy()
    expect(
      await screen.findByText(`Roadmap có ${N} mục, hiện 0/${N} mục có nội dung. Bắt đầu từ đâu?`),
    ).toBeTruthy()
  })

  it('bỏ qua hết: % là "—"; không còn mục để học tiếp; lỗi tải Ôn tập chỉ card đó báo lỗi', async () => {
    sv.anhChup = anhChupTu(Object.fromEntries(cay.mucHoc.map((m) => [m.id, 'bo-qua' as const])))
    const fetchGia = vi.mocked(fetch)
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
        String(input) === '/api/on-tap'
          ? Promise.resolve(new Response('{"loi":"hỏng"}', { status: 500 }))
          : fetchGia(input, init),
      ),
    )
    moTrang('/')
    const tienDo = vung('Tiến độ')
    expect(await within(tienDo).findByText(`— · 0/0 · ${N} bỏ qua`)).toBeTruthy()
    expect(
      within(vung('Tiếp tục học')).getByText('Không còn mục Đang học hay Chưa học.'),
    ).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Không tải được số thẻ cần ôn.')).toBeTruthy())
    expect(within(vung('Thẻ cần ôn hôm nay')).getByRole('button', { name: 'Thử lại' })).toBeTruthy()
  })
})
