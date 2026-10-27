// @vitest-environment jsdom
// Hồi quy review bước 1 trên trang /hoc/:slug thật (máy chủ giả đầy đủ: trang bài + dữ liệu học):
// - Mục lục của trang chưa có bài liệt kê khối chứa việc của người học đang hiện (D15; cùng nguồn với neo 4 bước);
// - Chủ đề thiếu khối "Thực hành trên dự án thật" / chưa có bài: vẫn có phần làm bài (bước Áp dụng xong được, thanh 4
//   bước có neo);
// - câu trả lời không còn hiện thành C21 (khối Tự kiểm tra viết khác quy ước / thiếu khối) luôn có chỗ hiện;
// - đặt Đã xong lúc dữ liệu học còn đang tải: hoãn tới khi tải xong rồi mới quyết (F19), không đặt thẳng.
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CHUA_CO_NOI_DUNG_VAN_HOC_DUOC,
  MUC_LUC_TRONG,
  THUC_HANH_CHUA_CO_DE_BAI,
} from '../../../src/copy/cho-duyet'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { giaMatchMedia } from '../../app/khung/moi-truong'
import { taoMayChuDayDu, type MayChuDayDu } from '../../components/bai-hoc/moi-truong-hoc'
import { cay, fileChuDe, muc, phanHoi } from './ho-tro'
import { moBai } from './moi-truong'

let sv: MayChuDayDu
const sc = muc('scope-creep')
const pmp = muc('project-management-professional-pmp')
const ID_TH = 'thuc-hanh-tren-du-an-that'

beforeEach(() => {
  sv = taoMayChuDayDu()
  giaMatchMedia(1440)
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.title = ''
})

const buoc = (b: string) => document.querySelector(`header [data-buoc="${b}"]`) as HTMLElement
const linkBuoc = (b: string) => within(buoc(b)).queryByRole('link')
const mucLuc = () => within(screen.getByRole('tabpanel'))

describe('Mục lục của trang chưa có bài (D15)', () => {
  it('Chứng chỉ chưa có bài: Mục lục có "Kế hoạch thi của tôi" (đích bước Áp dụng), không phải câu "chưa có mục lục"', async () => {
    moBai(`/hoc/${pmp.slug}`)
    await screen.findByRole('heading', { name: 'Mục này chưa có nội dung.' })
    await waitFor(() =>
      expect(
        mucLuc().getByRole('link', { name: 'Kế hoạch thi của tôi' }).getAttribute('href'),
      ).toBe('#ke-hoach-thi-cua-toi'),
    )
    expect(screen.getByRole('tabpanel').textContent).not.toContain(MUC_LUC_TRONG)
    expect(linkBuoc('ap-dung')?.getAttribute('href')).toBe('#ke-hoach-thi-cua-toi')
  })
})

describe('Chủ đề không có khối Thực hành: bước Áp dụng vẫn làm được', () => {
  it('bài thiếu khối: thẻ làm bài (ô "Chưa có đề bài", Kết quả, Xong, Không áp dụng); neo bước Áp dụng; Xong → Áp dụng xong; axe', async () => {
    sv.bai.bai.set(sc.id, phanHoi(sc, fileChuDe(sc, { bo: ['Thực hành trên dự án thật'] })))
    const { container } = moBai(`/hoc/${sc.slug}`)
    await screen.findByRole('article')
    const th = document.getElementById(ID_TH)!
    expect(th.textContent).toContain(THUC_HANH_CHUA_CO_DE_BAI)
    expect(th.querySelector('[data-khoi-thieu]')).toBeNull()
    expect(within(th).getByRole('button', { name: 'Không áp dụng (ghi lý do)' })).toBeTruthy()
    expect(linkBuoc('ap-dung')?.getAttribute('href')).toBe(`#${ID_TH}`)
    expect(mucLuc().getByRole('link', { name: 'Thực hành trên dự án thật' })).toBeTruthy()
    const ketQua = within(th).getByRole('textbox', { name: 'Kết quả của bạn' })
    await waitFor(() => expect((ketQua as HTMLTextAreaElement).disabled).toBe(false))
    fireEvent.focus(ketQua)
    fireEvent.change(ketQua, { target: { value: 'Đã làm trên dự án' } })
    fireEvent.click(within(th).getByRole('button', { name: 'Xong' }))
    await waitFor(() => expect(buoc('ap-dung').getAttribute('data-tinh-trang')).toBe('xong'))
    await waitFor(() => expect(sv.hoc.mucCua(sc.id).thucHanh.trangThai).toBe('xong'))
    await expectNoAxeViolations(container)
  })

  it('Chủ đề chưa có file: khung bài có thẻ làm bài thay ô nét đứt; neo bước Áp dụng + Mục lục; đánh dấu Không áp dụng được', async () => {
    moBai(`/hoc/${sc.slug}`)
    const the = await screen.findByRole('heading', { name: 'Mục này chưa có nội dung.' })
    // Câu F17 bỏ "bấm giờ" (không có đồng hồ học)
    expect(the.closest('section')!.textContent).toContain(CHUA_CO_NOI_DUNG_VAN_HOC_DUOC)
    expect(document.body.textContent).not.toMatch(/bấm giờ|đồng hồ/)
    const th = document.getElementById(ID_TH)!
    expect(th.closest('li')?.getAttribute('data-khoi-app')).toBe(ID_TH)
    expect(th.textContent).toContain(THUC_HANH_CHUA_CO_DE_BAI)
    expect(linkBuoc('ap-dung')?.getAttribute('href')).toBe(`#${ID_TH}`)
    await waitFor(() =>
      expect(mucLuc().getByRole('link', { name: 'Thực hành trên dự án thật' })).toBeTruthy(),
    )
    const nut = within(th).getByRole('button', { name: 'Không áp dụng (ghi lý do)' })
    await waitFor(() => expect((nut as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(nut)
    const dialog = await screen.findByRole('dialog', { name: 'Đánh dấu Không áp dụng' })
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Chưa có dự án' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
    await waitFor(() =>
      expect(buoc('ap-dung').getAttribute('data-tinh-trang')).toBe('khong-ap-dung'),
    )
  })
})

describe('câu trả lời cho câu hỏi cũ luôn có chỗ hiện (đề xuất 1.5)', () => {
  const traLoiCu = () => {
    sv.hoc.mucCua(sc.id).tuKiemTra['khoacu123'] = {
      traLoi: 'Câu trả lời cũ',
      daXem: true,
      cham: 'sai',
      chamLuc: null,
    }
  }

  it('khối Tự kiểm tra viết khác quy ước (Markdown thường): câu trả lời cũ hiện trong khối đó', async () => {
    traLoiCu()
    sv.bai.bai.set(
      sc.id,
      phanHoi(sc, fileChuDe(sc, { thay: { 'Tự kiểm tra': 'Viết tự do, không theo dạng H / Đ.' } })),
    )
    moBai(`/hoc/${sc.slug}`)
    await screen.findByRole('article')
    const khoi = document.getElementById('tu-kiem-tra')!
    expect(await within(khoi).findByText('Câu trả lời cho câu hỏi cũ (1)')).toBeTruthy()
    expect(khoi.textContent).toContain('Câu trả lời cũ')
  })

  it('bài thiếu khối Tự kiểm tra: câu trả lời cũ hiện ngay sau ô "Chưa có Tự kiểm tra"', async () => {
    traLoiCu()
    sv.bai.bai.set(sc.id, phanHoi(sc, fileChuDe(sc, { bo: ['Tự kiểm tra'] })))
    moBai(`/hoc/${sc.slug}`)
    await screen.findByRole('article')
    const tieuDe = await screen.findByText('Câu trả lời cho câu hỏi cũ (1)')
    const o = document.getElementById('tu-kiem-tra')!
    expect(o.hasAttribute('data-khoi-thieu')).toBe(true)
    expect(o.nextElementSibling?.contains(tieuDe)).toBe(true)
  })
})

describe('đặt Đã xong lúc dữ liệu học còn đang tải (F19)', () => {
  it('bấm 3 trước khi GET /api/hoc trả về: không đặt ngay; tải xong còn thiếu bước → F19 hỏi', async () => {
    sv.bai.bai.set(sc.id, phanHoi(sc, fileChuDe(sc)))
    // Giữ GET /api/hoc/:id tới khi mở
    let mo: () => void = () => {}
    const cho = new Promise<void>((r) => (mo = r))
    const fetchGoc = globalThis.fetch
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      if (/^\/api\/hoc\/[^/]+$/.test(String(input)) && (init?.method ?? 'GET') === 'GET') {
        await cho
      }
      return fetchGoc(input, init)
    })
    moBai(`/hoc/${sc.slug}`)
    await screen.findByRole('article')
    // Trạng thái học đã tải (segmented bật), dữ liệu học chưa
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Đã xong/ }).hasAttribute('disabled')).toBe(false),
    )
    fireEvent.keyDown(document.body, { key: '3', code: 'Digit3' })
    await new Promise((r) => setTimeout(r, 30))
    expect(sv.bai.yeuCau.some((y) => y.method === 'PUT')).toBe(false)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    mo()
    const f19 = await screen.findByRole('alertdialog')
    expect(f19.textContent).toContain('chưa xong')
    expect(sv.bai.yeuCau.some((y) => y.method === 'PUT')).toBe(false)
    fireEvent.click(within(f19).getByRole('button', { name: 'Vẫn đánh dấu Đã xong' }))
    await waitFor(() => expect(sv.bai.trangThai[sc.id]).toEqual({ status: 'done' }))
  })
})

// Dùng cay để chắc fixture có đủ ba mẫu bài
it('cây có mục Chủ đề và Chứng chỉ dùng ở trên', () => {
  expect(sc.mau).toBe('chu-de')
  expect(pmp.mau).toBe('chung-chi')
  expect(cay.mucTheoId.get(sc.id)).toBe(sc)
})
