// @vitest-environment jsdom
// Bước Áp dụng của Chứng chỉ (khối "Kế hoạch thi của tôi") và Tài liệu (khối "Bản của tôi") — phạm vi rút gọn mục
// 10: app không lưu kế hoạch thi / bản tài liệu, ở vị trí khối là CÙNG thẻ Thực hành C20 như Chủ đề (đề xuất 3.1,
// 3.2; §1 "Không áp dụng" kèm lý do): "Đề bài" do app đặt (AP_DUNG_THEO_MAU), "Kết quả của bạn" (tự lưu), Xong (bật
// khi có kết quả) / "Không áp dụng (ghi lý do)" → dialog C32 lý do bắt buộc (C36, Enter lưu, bỏ qua khi ghép chữ,
// bản tạm nhap-tam chỉ xoá khi máy chủ đã nhận) → "Không áp dụng" + lý do + "Bỏ đánh dấu"; Chứng chỉ không có ô Dự
// án. Ghi qua PUT /api/hoc/:id/thuc-hanh; toast Hoàn tác; lỗi lưu trả về giá trị đã lưu + Thử lại; lỗi tải GET
// /api/hoc/:id; focus giữ trên cùng một nút; axe; bước Áp dụng của thanh 4 bước đổi ngay; không còn ô C38 "Có ở
// phase n"; chứng chỉ / tài liệu CHƯA có file bài vẫn có thẻ này (khối do app tạo, không phải ô "Chưa có").
// Máy chủ giả đầy đủ (moi-truong-hoc): trang bài + dữ liệu học theo hợp đồng server/du-lieu/hop-dong-hoc.ts.
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AP_DUNG_THEO_MAU, XONG_CAN_KET_QUA } from '../../../src/copy/cho-duyet'
import { khoaNhapLyDo } from '../../../src/components/bai-hoc/HopThoaiKhongApDung'
import { docNhapTam } from '../../../src/app/nhap-tam'
import { thucHanhTrong } from '../../app/du-lieu/hoc-gia-may-chu'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { taoMayChuDayDu, type MayChuDayDu } from '../../components/bai-hoc/moi-truong-hoc'
import { fileChuDe, giuCho, muc, phanHoi } from './ho-tro'
import { giaResizeObserver, moBai } from './moi-truong'

let sv: MayChuDayDu

const pmp = muc('project-management-professional-pmp')
const sc = muc('scope-creep')
const TEN_KHOI = 'Kế hoạch thi của tôi'
const DUONG_DAN = `/api/hoc/${encodeURIComponent(pmp.id)}/thuc-hanh`

/** File bài Chứng chỉ ngắn: chỉ Tóm tắt (khối ★ khác hiện ô "Chưa có"); Kế hoạch thi là khối do app tạo. */
function datBaiChungChi() {
  const text = [
    '---',
    `id: "${pmp.id}"`,
    'loai: chung-chi',
    'trang_thai_noi_dung: ban-nhap',
    'nguon: ai',
    '---',
    '',
    '## Tóm tắt',
    '',
    giuCho('Tóm tắt'),
    '',
  ].join('\n')
  sv.bai.bai.set(pmp.id, phanHoi(pmp, text))
}

/** Đã đánh dấu Không áp dụng từ trước (dữ liệu trên máy chủ giả). */
function daDanhDau(lyDo: string) {
  sv.hoc.mucCua(pmp.id).thucHanh = { ...thucHanhTrong(), trangThai: 'khong-ap-dung', lyDo }
}

beforeEach(() => {
  sv = taoMayChuDayDu()
  giaResizeObserver()
  window.sessionStorage.clear()
  datBaiChungChi()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.sessionStorage.clear()
  document.title = ''
})

const cho = (ms = 0) => act(() => new Promise((r) => setTimeout(r, ms)))
const khoi = () => screen.getByRole('heading', { level: 2, name: TEN_KHOI }).closest('section')!
/** Nút "Không áp dụng (ghi lý do)" / "Bỏ đánh dấu" của thẻ (cùng một phần tử). */
const nutKhoi = () =>
  within(khoi()).getByRole('button', { name: /^(Không áp dụng \(ghi lý do\)|Bỏ đánh dấu)$/ })
const NUT_KAD = 'Không áp dụng (ghi lý do)'
/** Ô "Kết quả của bạn" của thẻ (ẩn khi đã đánh dấu Không áp dụng). */
const oKetQua = () => within(khoi()).queryByRole('textbox', { name: 'Kết quả của bạn' })
const DE_BAI = AP_DUNG_THEO_MAU['chung-chi'].deBai
/** Bản tạm của ô lý do (sessionStorage qua nhap-tam). */
const banTamLyDo = () => docNhapTam(khoaNhapLyDo(pmp.id))
/** Các lần ghi Thực hành của mục PMP đã tới máy chủ (theo thứ tự). */
const ghiDaGui = () => sv.hoc.yeuCau.filter((y) => y.url === DUONG_DAN)
/** Không lần nào gọi API Áp dụng cũ của 2a. */
const goiApDungCu = () => sv.bai.yeuCau.filter((y) => y.url.startsWith('/api/ap-dung'))

async function moVaCho() {
  const kq = moBai(`/hoc/${pmp.slug}`)
  await screen.findByRole('heading', { level: 2, name: TEN_KHOI })
  await waitFor(() => expect(nutKhoi().hasAttribute('disabled')).toBe(false))
  return kq
}

async function moHopThoai() {
  fireEvent.click(within(khoi()).getByRole('button', { name: NUT_KAD }))
  return screen.findByRole('dialog', { name: 'Đánh dấu Không áp dụng' })
}

describe('khối Kế hoạch thi của tôi — thẻ Thực hành, chưa làm', () => {
  it('"Đề bài" do app đặt, "Kết quả của bạn", Xong (tắt tới khi có kết quả), "Không áp dụng (ghi lý do)"; không có ô Dự án, không còn "Có ở phase"; axe', async () => {
    const { container } = await moVaCho()
    const k = khoi()
    expect(k.textContent).toContain('Bước Áp dụng · chưa làm')
    expect(within(k).getByRole('heading', { level: 3, name: 'Đề bài' })).toBeTruthy()
    expect(k.textContent).toContain(DE_BAI)
    expect(oKetQua()?.getAttribute('placeholder')).toBe(AP_DUNG_THEO_MAU['chung-chi'].goiYKetQua)
    const xong = within(k).getByRole('button', { name: 'Xong' }) as HTMLButtonElement
    expect(xong.disabled).toBe(true)
    expect(k.textContent).toContain(XONG_CAN_KET_QUA)
    expect(within(k).queryByRole('combobox', { name: 'Dự án' })).toBeNull()
    expect(within(k).queryByRole('button', { name: 'Thêm dự án' })).toBeNull()
    expect(k.textContent).not.toContain('Có ở phase')
    expect(k.textContent).not.toContain('App không lưu')
    expect(within(k).getByRole('button', { name: NUT_KAD })).toBeTruthy()
    expect(sv.hoc.dem(`GET /api/hoc/${encodeURIComponent(pmp.id)}`)).toBeGreaterThanOrEqual(1)
    expect(goiApDungCu()).toEqual([])
    await expectNoAxeViolations(container)
  })

  it('bài Chủ đề: không có khối Kế hoạch thi', async () => {
    sv.bai.bai.set(sc.id, phanHoi(sc, fileChuDe(sc)))
    moBai(`/hoc/${sc.slug}`)
    await screen.findByRole('article')
    await cho(10)
    expect(screen.queryByRole('heading', { name: TEN_KHOI })).toBeNull()
    expect(goiApDungCu()).toEqual([])
  })

  it('đã đánh dấu từ trước: hiện "Không áp dụng" + Lý do: "…" + "Bỏ đánh dấu"; axe', async () => {
    daDanhDau('Chưa định thi năm nay')
    const { container } = await moVaCho()
    await waitFor(() => expect(khoi().textContent).toContain('Lý do: "Chưa định thi năm nay"'))
    expect(within(khoi()).getByText('Không áp dụng')).toBeTruthy()
    expect(khoi().textContent).toContain('Bước Áp dụng · Không áp dụng')
    expect(oKetQua()).toBeNull()
    expect(within(khoi()).queryByRole('button', { name: 'Xong' })).toBeNull()
    expect(nutKhoi().textContent).toBe('Bỏ đánh dấu')
    await expectNoAxeViolations(container)
  })

  it('tải lỗi: dòng lỗi + "Thử lại" trong khối, nút tắt; Thử lại tải được thì bật', async () => {
    // Mọi lượt tải GET /api/hoc/:id đều lỗi tới khi máy chủ hết lỗi
    sv.hoc.loiTai = Number.POSITIVE_INFINITY
    moBai(`/hoc/${pmp.slug}`)
    await screen.findByRole('heading', { level: 2, name: TEN_KHOI })
    expect(await within(khoi()).findByText(/Lỗi: không đọc được dữ liệu học/)).toBeTruthy()
    expect(nutKhoi().hasAttribute('disabled')).toBe(true)
    sv.hoc.loiTai = 0
    fireEvent.click(within(khoi()).getByRole('button', { name: 'Thử lại' }))
    await waitFor(() =>
      expect(within(khoi()).getByRole('button', { name: NUT_KAD }).hasAttribute('disabled')).toBe(
        false,
      ),
    )
    expect(screen.queryByText(/Lỗi: không đọc được dữ liệu học/)).toBeNull()
    // Cùng một dữ liệu học: thanh 4 bước ở đầu bài cũng hết lỗi
    expect(screen.queryByText(/Lỗi: không đọc được tiến độ bước/)).toBeNull()
  })
})

describe('dialog Không áp dụng (C32 + C36)', () => {
  it('tiêu đề, "<tên> · Chứng chỉ", mô tả, ô "Lý do" bắt buộc có focus sẵn; axe trên dialog', async () => {
    await moVaCho()
    const dialog = await moHopThoai()
    expect(dialog.textContent).toContain(`${pmp.label} · Chứng chỉ`)
    expect(dialog.textContent).toContain('được tính là xong mà không cần kế hoạch thi')
    const o = within(dialog).getByRole('textbox', { name: 'Lý do' })
    expect(document.activeElement).toBe(o)
    expect(o.hasAttribute('required')).toBe(true)
    expect(o.getAttribute('maxlength')).toBe('500')
    expect(dialog.textContent).toContain('Bắt buộc · tối đa 500 ký tự')
    expect(within(dialog).getByRole('button', { name: 'Huỷ' })).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Lưu' })).toBeTruthy()
    await expectNoAxeViolations(dialog)
  })

  it('lý do trống / chỉ khoảng trắng: câu lỗi C36 (aria-invalid), không gửi; gõ chữ thì gỡ lỗi; axe khi lỗi', async () => {
    await moVaCho()
    const dialog = await moHopThoai()
    const o = within(dialog).getByRole('textbox', { name: 'Lý do' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
    expect(within(dialog).getByText('Ghi lý do để đánh dấu Không áp dụng.')).toBeTruthy()
    expect(o.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(o)
    await expectNoAxeViolations(dialog)
    fireEvent.change(o, { target: { value: '   ' } })
    fireEvent.keyDown(o, { key: 'Enter', code: 'Enter' })
    expect(o.getAttribute('aria-invalid')).toBe('true')
    fireEvent.change(o, { target: { value: 'x' } })
    expect(o.getAttribute('aria-invalid')).toBeNull()
    await cho(10)
    expect(ghiDaGui()).toEqual([])
  })

  it('Enter khi Telex/VNI đang ghép chữ không lưu; Enter thường lưu lý do đã bỏ khoảng trắng qua PUT /api/hoc/:id/thuc-hanh', async () => {
    await moVaCho()
    const dialog = await moHopThoai()
    const o = within(dialog).getByRole('textbox', { name: 'Lý do' })
    fireEvent.change(o, { target: { value: '  Không định thi chứng chỉ này  ' } })
    fireEvent.keyDown(o, { key: 'Enter', code: 'Enter', isComposing: true })
    fireEvent.keyDown(o, { key: 'Process', code: 'Enter', keyCode: 229 })
    expect(screen.getByRole('dialog')).toBe(dialog)
    await cho(10)
    expect(ghiDaGui()).toEqual([])

    fireEvent.keyDown(o, { key: 'Enter', code: 'Enter' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(ghiDaGui()).toHaveLength(1))
    expect(ghiDaGui()).toEqual([
      {
        method: 'PUT',
        url: DUONG_DAN,
        body: { trangThai: 'khong-ap-dung', lyDo: 'Không định thi chứng chỉ này' },
      },
    ])
    await waitFor(() =>
      expect(sv.hoc.mucCua(pmp.id).thucHanh).toMatchObject({
        trangThai: 'khong-ap-dung',
        lyDo: 'Không định thi chứng chỉ này',
      }),
    )
    expect(goiApDungCu()).toEqual([])
  })

  it('Huỷ / Esc đóng, không gửi, focus về nút "Không áp dụng (ghi lý do)"; chữ đang gõ còn khi mở lại (nhap-tam)', async () => {
    await moVaCho()
    const nut = nutKhoi()
    let dialog = await moHopThoai()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Lý do' }), {
      target: { value: 'Đang gõ dở' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(nut))

    dialog = await moHopThoai()
    const o = within(dialog).getByRole('textbox', { name: 'Lý do' }) as HTMLInputElement
    expect(o.value).toBe('Đang gõ dở')
    fireEvent.keyDown(o, { key: 'Escape', code: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(nut))
    expect(ghiDaGui()).toEqual([])
  })
})

describe('đánh dấu / bỏ đánh dấu (đề xuất 3.1, 3.2)', () => {
  it('Lưu: khối hiện "Không áp dụng" + lý do ngay; focus về CÙNG nút, giờ là "Bỏ đánh dấu"; toast + Hoàn tác → PUT trangThai null', async () => {
    await moVaCho()
    const nut = nutKhoi()
    const dialog = await moHopThoai()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Lý do' }), {
      target: { value: 'Không định thi' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(khoi().textContent).toContain('Lý do: "Không định thi"')
    expect(nutKhoi()).toBe(nut)
    expect(nut.textContent).toBe('Bỏ đánh dấu')
    await waitFor(() => expect(document.activeElement).toBe(nut))
    // Bản tạm của ô lý do không còn sau khi máy chủ đã nhận
    await waitFor(() => expect(banTamLyDo()).toBeNull())

    const chuToast = await screen.findByText(/Đã đánh dấu Không áp dụng:/)
    expect(chuToast.textContent).toBe(`Đã đánh dấu Không áp dụng: ${pmp.label}`)
    expect(chuToast.querySelector('[lang="en"]')?.textContent).toBe(pmp.label)
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    await waitFor(() => expect(nut.textContent).toBe(NUT_KAD))
    await waitFor(() => expect(ghiDaGui()).toHaveLength(2))
    expect(ghiDaGui().map((y) => y.body)).toEqual([
      { trangThai: 'khong-ap-dung', lyDo: 'Không định thi' },
      { trangThai: null },
    ])
    await waitFor(() => expect(sv.hoc.mucCua(pmp.id).thucHanh.trangThai).toBeNull())
    expect(sv.hoc.mucCua(pmp.id).thucHanh.lyDo).toBeNull()
    // Hoàn tác của Hoàn tác thì không có.
    expect(await screen.findByText(/Đã bỏ đánh dấu Không áp dụng:/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Hoàn tác' })).toBeNull()
  })

  it('"Bỏ đánh dấu": PUT trangThai null, nút thành "Không áp dụng (ghi lý do)" (giữ focus); Hoàn tác gửi lại lý do cũ', async () => {
    daDanhDau('Lý do cũ')
    await moVaCho()
    await waitFor(() => expect(nutKhoi().textContent).toBe('Bỏ đánh dấu'))
    const nut = nutKhoi()
    nut.focus()
    fireEvent.click(nut)
    await waitFor(() => expect(nut.textContent).toBe(NUT_KAD))
    expect(nutKhoi()).toBe(nut)
    expect(document.activeElement).toBe(nut)
    expect(oKetQua()).not.toBeNull()
    expect(await screen.findByText(/Đã bỏ đánh dấu Không áp dụng:/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    await waitFor(() => expect(khoi().textContent).toContain('Lý do: "Lý do cũ"'))
    await waitFor(() => expect(ghiDaGui()).toHaveLength(2))
    expect(ghiDaGui()).toEqual([
      { method: 'PUT', url: DUONG_DAN, body: { trangThai: null } },
      { method: 'PUT', url: DUONG_DAN, body: { trangThai: 'khong-ap-dung', lyDo: 'Lý do cũ' } },
    ])
    await waitFor(() =>
      expect(sv.hoc.mucCua(pmp.id).thucHanh).toMatchObject({
        trangThai: 'khong-ap-dung',
        lyDo: 'Lý do cũ',
      }),
    )
  })

  it('lưu lỗi: trả về chưa đánh dấu, toast lỗi "Thử lại", bản tạm lý do CÒN; Thử lại gửi lại đúng lý do đó, lưu được thì mới xoá bản tạm', async () => {
    sv.hoc.loiGhi = 1
    await moVaCho()
    const dialog = await moHopThoai()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Lý do' }), {
      target: { value: 'Lý do giữ lại' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
    const loi = await screen.findByRole('alert')
    expect(loi.textContent).toContain('Lỗi lưu — đã giữ trạng thái cũ.')
    await waitFor(() => expect(nutKhoi().textContent).toBe(NUT_KAD))
    expect(oKetQua()).not.toBeNull()
    expect(sv.hoc.mucCua(pmp.id).thucHanh.trangThai).toBeNull()
    // Hồi quy: bản tạm từng bị xoá lúc bấm Lưu, lưu lỗi là mất chữ đã gõ
    expect(banTamLyDo()).toBe('Lý do giữ lại')
    const nut = nutKhoi()
    const moLai = await moHopThoai()
    expect((within(moLai).getByRole('textbox', { name: 'Lý do' }) as HTMLInputElement).value).toBe(
      'Lý do giữ lại',
    )
    fireEvent.click(within(moLai).getByRole('button', { name: 'Huỷ' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(nut))

    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(khoi().textContent).toContain('Lý do: "Lý do giữ lại"'))
    await waitFor(() => expect(banTamLyDo()).toBeNull())
    await waitFor(() =>
      expect(sv.hoc.mucCua(pmp.id).thucHanh).toMatchObject({
        trangThai: 'khong-ap-dung',
        lyDo: 'Lý do giữ lại',
      }),
    )
    expect(ghiDaGui().map((y) => y.body)).toEqual([
      { trangThai: 'khong-ap-dung', lyDo: 'Lý do giữ lại' },
      { trangThai: 'khong-ap-dung', lyDo: 'Lý do giữ lại' },
    ])
  })

  it('máy chủ từ chối (400): câu lỗi của server, không có "Thử lại"; khối về chưa đánh dấu, bản tạm lý do còn', async () => {
    await moVaCho()
    const dialog = await moHopThoai()
    // Lý do rỗng không qua được dialog: giả máy chủ trả 400 kèm câu riêng cho lần PUT này
    const CAU_400 = 'Câu lỗi 400 của máy chủ giả.'
    const fetchCu = globalThis.fetch
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
      String(input) === DUONG_DAN && init?.method === 'PUT'
        ? Promise.resolve(
            new Response(JSON.stringify({ loi: CAU_400 }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }),
          )
        : fetchCu(input, init),
    )
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Lý do' }), {
      target: { value: 'Bị máy chủ từ chối' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
    const loi = await screen.findByRole('alert')
    expect(loi.textContent).toContain(CAU_400)
    // Gửi lại y nguyên cũng hỏng: không có "Thử lại"
    expect(within(loi).queryByRole('button', { name: 'Thử lại' })).toBeNull()
    await waitFor(() => expect(nutKhoi().textContent).toBe(NUT_KAD))
    expect(sv.hoc.mucCua(pmp.id).thucHanh.trangThai).toBeNull()
    expect(banTamLyDo()).toBe('Bị máy chủ từ chối')
  })

  it('lý do dài không gây cuộn ngang: chữ được ngắt ở bất kỳ đâu', async () => {
    daDanhDau('x'.repeat(500))
    await moVaCho()
    const dong = await within(khoi()).findByText(/^Lý do: "x+"$/)
    expect(dong.className).toContain('[overflow-wrap:anywhere]')
  })
})

/** Ô bước Áp dụng của thanh 4 bước ở đầu bài. */
const buocApDung = () => document.querySelector('header [data-buoc="ap-dung"]')!

describe('thanh 4 bước — bước Áp dụng theo dữ liệu đã lưu (đề xuất 3.2)', () => {
  it('đã đánh dấu từ trước: "Áp dụng · Không áp dụng" ngay khi tải; bấm bước tới khối Kế hoạch thi của tôi', async () => {
    daDanhDau('Chưa định thi')
    await moVaCho()
    await waitFor(() => expect(buocApDung().getAttribute('data-tinh-trang')).toBe('khong-ap-dung'))
    expect(buocApDung().textContent).toBe('Áp dụng · Không áp dụng')
    expect(buocApDung().querySelector('a')?.getAttribute('href')).toBe('#ke-hoach-thi-cua-toi')
  })

  it('Lưu Không áp dụng → bước đổi NGAY (máy chủ chưa trả lời); Hoàn tác → về "chưa làm" ngay', async () => {
    await moVaCho()
    expect(buocApDung().getAttribute('data-tinh-trang')).toBe('chua-lam')
    expect(buocApDung().textContent).toBe('Áp dụng — chưa làm')

    sv.hoc.dongCua()
    const dialog = await moHopThoai()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Lý do' }), {
      target: { value: 'Không định thi' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
    // PUT còn bị giữ ở máy chủ: thanh đã đổi theo giá trị lạc quan
    await waitFor(() => expect(buocApDung().getAttribute('data-tinh-trang')).toBe('khong-ap-dung'))
    expect(buocApDung().textContent).toBe('Áp dụng · Không áp dụng')
    await waitFor(() => expect(sv.hoc.soDangGiu()).toBe(1))
    expect(sv.hoc.mucCua(pmp.id).thucHanh.trangThai).toBeNull()
    // Máy chủ chưa nhận: bản tạm lý do vẫn còn
    expect(banTamLyDo()).toBe('Không định thi')
    await act(async () => sv.hoc.moCua())
    await waitFor(() => expect(sv.hoc.mucCua(pmp.id).thucHanh.trangThai).toBe('khong-ap-dung'))
    await waitFor(() => expect(banTamLyDo()).toBeNull())
    expect(buocApDung().getAttribute('data-tinh-trang')).toBe('khong-ap-dung')

    sv.hoc.dongCua()
    fireEvent.click(await screen.findByRole('button', { name: 'Hoàn tác' }))
    await waitFor(() => expect(buocApDung().getAttribute('data-tinh-trang')).toBe('chua-lam'))
    await waitFor(() => expect(sv.hoc.soDangGiu()).toBe(1))
    expect(ghiDaGui().map((y) => y.body)).toEqual([
      { trangThai: 'khong-ap-dung', lyDo: 'Không định thi' },
      { trangThai: null },
    ])
    expect(sv.hoc.mucCua(pmp.id).thucHanh.trangThai).toBe('khong-ap-dung')
    await act(async () => sv.hoc.moCua())
    await waitFor(() => expect(sv.hoc.mucCua(pmp.id).thucHanh.trangThai).toBeNull())
    expect(buocApDung().getAttribute('data-tinh-trang')).toBe('chua-lam')
  })

  it('"Bỏ đánh dấu" → bước về "chưa làm" ngay; lưu lỗi → về lại "Không áp dụng" (giá trị đã lưu)', async () => {
    daDanhDau('Lý do cũ')
    await moVaCho()
    await waitFor(() => expect(nutKhoi().textContent).toBe('Bỏ đánh dấu'))
    sv.hoc.loiGhi = 1
    sv.hoc.dongCua()
    fireEvent.click(nutKhoi())
    await waitFor(() => expect(buocApDung().getAttribute('data-tinh-trang')).toBe('chua-lam'))
    await waitFor(() => expect(sv.hoc.soDangGiu()).toBe(1))
    expect(ghiDaGui().map((y) => y.body)).toEqual([{ trangThai: null }])
    await act(async () => sv.hoc.moCua())
    await screen.findByRole('alert')
    await waitFor(() => expect(buocApDung().getAttribute('data-tinh-trang')).toBe('khong-ap-dung'))
    expect(khoi().textContent).toContain('Lý do: "Lý do cũ"')
  })

  it('bài Chủ đề: bước Áp dụng "chưa làm", không gọi API Áp dụng cũ', async () => {
    sv.bai.bai.set(sc.id, phanHoi(sc, fileChuDe(sc)))
    moBai(`/hoc/${sc.slug}`)
    await screen.findByRole('article')
    await cho(10)
    expect(buocApDung().getAttribute('data-tinh-trang')).toBe('chua-lam')
    expect(goiApDungCu()).toEqual([])
  })
})

describe('chứng chỉ / tài liệu chưa có file bài (F17; đề xuất 3.2): thẻ Thực hành ở khối do app tạo, không phải ô "Chưa có"', () => {
  beforeEach(() => {
    sv.bai.bai.delete(pmp.id)
  })

  it('khung bài vẽ đúng thẻ Kế hoạch thi của tôi như trang bài (đề bài, Kết quả, Xong / Không áp dụng), không nét đứt; axe', async () => {
    const { container } = await moVaCho()
    expect(screen.getByRole('heading', { name: 'Mục này chưa có nội dung.' })).toBeTruthy()
    expect(container.textContent).toContain('0/7 khối bắt buộc')
    const k = khoi()
    expect(k.id).toBe('ke-hoach-thi-cua-toi')
    expect(k.textContent).toContain(DE_BAI)
    expect(oKetQua()).not.toBeNull()
    expect(within(k).getByRole('button', { name: 'Xong' })).toBeTruthy()
    expect(k.textContent).not.toContain('Có ở phase')
    expect(k.textContent).not.toContain('Chưa có')
    expect(k.closest('li')?.getAttribute('data-khoi-app')).toBe('ke-hoach-thi-cua-toi')
    expect(k.closest('li')?.className).not.toContain('border-dashed')
    expect(container.querySelector('[data-khoi="ke-hoach-thi-cua-toi"].border-dashed')).toBeNull()
    // Các khối nội dung vẫn là ô nét đứt "Chưa có"
    expect(container.querySelector('li[data-khoi="tom-tat"]')?.className).toContain('border-dashed')
    // Thanh 4 bước: bước Áp dụng bấm được, tới khối Kế hoạch thi
    expect(buocApDung().querySelector('a')?.getAttribute('href')).toBe('#ke-hoach-thi-cua-toi')
    await expectNoAxeViolations(container)
  })

  it('đánh dấu Không áp dụng được khi chưa có bài: PUT /api/hoc/:id/thuc-hanh, khối hiện lý do, bước Áp dụng xong', async () => {
    await moVaCho()
    const dialog = await moHopThoai()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Lý do' }), {
      target: { value: 'Không định thi' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(khoi().textContent).toContain('Lý do: "Không định thi"')
    expect(buocApDung().getAttribute('data-tinh-trang')).toBe('khong-ap-dung')
    await waitFor(() =>
      expect(sv.hoc.mucCua(pmp.id).thucHanh).toMatchObject({
        trangThai: 'khong-ap-dung',
        lyDo: 'Không định thi',
      }),
    )
    expect(ghiDaGui().map((y) => y.method)).toEqual(['PUT'])
    expect(goiApDungCu()).toEqual([])
  })

  it('Tài liệu chưa có bài: Bản của tôi là thẻ Thực hành (đề bài Tài liệu, ô Dự án, Kết quả), không phải ô "Chưa có"; Chủ đề: không có Nói lại', async () => {
    const rr = muc('risk-register')
    const { container } = moBai(`/hoc/${rr.slug}`)
    await screen.findByRole('heading', { name: 'Mục này chưa có nội dung.' })
    const banCuaToi = container.querySelector('section#ban-cua-toi') as HTMLElement
    expect(within(banCuaToi).getByRole('heading', { level: 2 }).textContent).toBe('Bản của tôi')
    expect(banCuaToi.textContent).toContain(AP_DUNG_THEO_MAU['tai-lieu'].deBai)
    expect(banCuaToi.textContent).not.toContain('Có ở phase')
    expect(within(banCuaToi).getByRole('combobox', { name: 'Dự án' })).toBeTruthy()
    expect(
      within(banCuaToi)
        .getByRole('textbox', { name: 'Kết quả của bạn' })
        .getAttribute('placeholder'),
    ).toBe(AP_DUNG_THEO_MAU['tai-lieu'].goiYKetQua)
    await waitFor(() =>
      expect(
        (within(banCuaToi).getByRole('button', { name: NUT_KAD }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    expect(banCuaToi.closest('li')?.getAttribute('data-khoi-app')).toBe('ban-cua-toi')
    expect(container.querySelector('li[data-khoi="ban-cua-toi"]')).toBeNull()
    await expectNoAxeViolations(container)
    cleanup()

    const sm = muc('salience-model')
    const chuDe = moBai(`/hoc/${sm.slug}`)
    await screen.findByRole('heading', { name: 'Mục này chưa có nội dung.' })
    expect(chuDe.container.querySelector('#noi-lai-bang-loi-cua-ban')).toBeNull()
    // Chủ đề chưa có bài: khối chứa việc của người học duy nhất là phần làm bài Thực hành (bước Áp dụng)
    expect(
      [...chuDe.container.querySelectorAll('[data-khoi-app]')].map((li) =>
        li.getAttribute('data-khoi-app'),
      ),
    ).toEqual(['thuc-hanh-tren-du-an-that'])
  })
})

describe('Kết quả + Xong của Chứng chỉ (mọi mẫu dùng chung bài thực hành — PUT /api/hoc/:id/thuc-hanh)', () => {
  it('ghi kế hoạch vào Kết quả → Xong bật; Xong gửi kèm kết quả, thẻ "Đã xong", bước Áp dụng xong, không còn "Không áp dụng"', async () => {
    const KE_HOACH = 'Thi tháng 6/2027, ôn 5 giờ mỗi tuần'
    await moVaCho()
    fireEvent.change(oKetQua()!, { target: { value: KE_HOACH } })
    const xong = within(khoi()).getByRole('button', { name: 'Xong' }) as HTMLButtonElement
    await waitFor(() => expect(xong.disabled).toBe(false))
    expect(khoi().textContent).not.toContain(XONG_CAN_KET_QUA)
    fireEvent.click(xong)
    await waitFor(() =>
      expect(sv.hoc.mucCua(pmp.id).thucHanh).toMatchObject({ trangThai: 'xong', ketQua: KE_HOACH }),
    )
    expect(ghiDaGui()[0].body).toEqual({ trangThai: 'xong', ketQua: KE_HOACH })
    expect(khoi().textContent).toContain('Kết quả đã lưu · sửa được')
    expect(khoi().textContent).toContain('Bước Áp dụng · đã xong')
    expect(buocApDung().getAttribute('data-tinh-trang')).toBe('xong')
    expect(within(khoi()).queryByRole('button', { name: NUT_KAD })).toBeNull()
    expect(within(khoi()).getByRole('button', { name: 'Bỏ đánh dấu Xong' })).toBeTruthy()
  })
})
