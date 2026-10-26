// @vitest-environment jsdom
// Khối "Kế hoạch thi của tôi" của Chứng chỉ (phase 2a; đề xuất 3.2, mục 9 hàng 2a; §1 "Không áp dụng" kèm lý
// do): C38 "Có ở phase 11" + nút "Không áp dụng" → dialog C32 lý do bắt buộc (C36, Enter lưu, bỏ qua khi ghép
// chữ, bản tạm nhap-tam) → khối "Không áp dụng" + lý do + "Bỏ đánh dấu"; toast Hoàn tác; lỗi lưu giữ giá trị
// cũ + Thử lại; lỗi tải; focus giữ trên cùng một nút; axe trên khối và dialog. Máy chủ giả: trang bài
// (moi-truong) + GET / PUT / DELETE /api/ap-dung theo hợp đồng server/du-lieu/ap-dung.ts.
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MucApDung } from '../../../server/du-lieu/ap-dung'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { fileChuDe, giuCho, muc, phanHoi } from './ho-tro'
import { giaResizeObserver, moBai, taoMayChuBai, type MayChuBai } from './moi-truong'

interface MayChuApDung {
  apDung: Record<string, MucApDung>
  /** Số lần GET /api/ap-dung tới trả 500 */
  loiTai: number
  /** Số lần PUT / DELETE tới trả 500 */
  loiGhi: number
}

let sv: MayChuBai
let ad: MayChuApDung

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

/** Thêm GET / PUT / DELETE /api/ap-dung vào máy chủ giả của trang bài (dùng chung revision, yeuCau). */
function ganApDung(goc: MayChuBai): MayChuApDung {
  const may: MayChuApDung = { apDung: {}, loiTai: 0, loiGhi: 0 }
  const fetchTruoc = globalThis.fetch
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (url === '/api/ap-dung' && method === 'GET') {
        goc.yeuCau.push({ method, url })
        if (may.loiTai > 0) {
          may.loiTai -= 1
          return json(500, { loi: 'Máy chủ gặp lỗi.' })
        }
        return json(200, { revision: goc.revision, apDung: structuredClone(may.apDung) })
      }
      const m = /^\/api\/ap-dung\/(.+)$/.exec(url)
      if (m && (method === 'PUT' || method === 'DELETE')) {
        const body = init?.body === undefined ? undefined : JSON.parse(String(init.body))
        goc.yeuCau.push({ method, url, body })
        if (may.loiGhi > 0) {
          may.loiGhi -= 1
          return json(500, { loi: 'Máy chủ gặp lỗi.' })
        }
        const id = decodeURIComponent(m[1])
        const truoc = may.apDung[id] ?? null
        const moi: MucApDung | null =
          method === 'PUT' ? { trangThai: 'khong-ap-dung', lyDo: String(body.lyDo).trim() } : null
        if (moi) may.apDung[id] = moi
        else delete may.apDung[id]
        goc.revision += 1
        return json(200, { revision: goc.revision, id, muc: moi, truoc, daDoi: true })
      }
      return fetchTruoc(input, init)
    }),
  )
  return may
}

const pmp = muc('project-management-professional-pmp')
const sc = muc('scope-creep')
const TEN_KHOI = 'Kế hoạch thi của tôi'
const DUONG_DAN = `/api/ap-dung/${encodeURIComponent(pmp.id)}`

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
  sv.bai.set(pmp.id, phanHoi(pmp, text))
}

beforeEach(() => {
  sv = taoMayChuBai()
  ad = ganApDung(sv)
  giaResizeObserver()
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
/** Nút hành động của khối: "Không áp dụng" hoặc "Bỏ đánh dấu" (cùng một phần tử). */
const nutKhoi = () => within(khoi()).getByRole('button', { name: /^(Không áp dụng|Bỏ đánh dấu)$/ })
const ghiDaGui = () => sv.yeuCau.filter((y) => y.url.startsWith('/api/ap-dung/'))

async function moVaCho() {
  const kq = moBai(`/hoc/${pmp.slug}`)
  await screen.findByRole('heading', { level: 2, name: TEN_KHOI })
  await waitFor(() => expect(nutKhoi().hasAttribute('disabled')).toBe(false))
  return kq
}

async function moHopThoai() {
  fireEvent.click(within(khoi()).getByRole('button', { name: 'Không áp dụng' }))
  return screen.findByRole('dialog', { name: 'Đánh dấu Không áp dụng' })
}

describe('khối Kế hoạch thi — chưa đánh dấu', () => {
  it('C38 "Có ở phase 11" + mô tả + nút phụ "Không áp dụng"; tải GET /api/ap-dung; axe', async () => {
    const { container } = await moVaCho()
    const k = khoi()
    expect(k.textContent).toContain('Có ở phase 11')
    expect(k.textContent).toContain('Ngày thi dự kiến và số ngày còn lại')
    expect(within(k).getByRole('button', { name: 'Không áp dụng' })).toBeTruthy()
    expect(sv.dem('GET /api/ap-dung')).toBeGreaterThanOrEqual(1)
    await expectNoAxeViolations(container)
  })

  it('bài Chủ đề: không có khối Kế hoạch thi, không gọi /api/ap-dung', async () => {
    sv.bai.set(sc.id, phanHoi(sc, fileChuDe(sc)))
    moBai(`/hoc/${sc.slug}`)
    await screen.findByRole('article')
    await cho(10)
    expect(sv.dem('GET /api/ap-dung')).toBe(0)
    expect(screen.queryByRole('heading', { name: TEN_KHOI })).toBeNull()
  })

  it('đã đánh dấu từ trước: hiện "Không áp dụng" + Lý do: "…" + "Bỏ đánh dấu"; axe', async () => {
    ad.apDung[pmp.id] = { trangThai: 'khong-ap-dung', lyDo: 'Chưa định thi năm nay' }
    const { container } = await moVaCho()
    await waitFor(() => expect(khoi().textContent).toContain('Lý do: "Chưa định thi năm nay"'))
    expect(within(khoi()).getByText('Không áp dụng')).toBeTruthy()
    expect(khoi().textContent).not.toContain('Có ở phase 11')
    expect(nutKhoi().textContent).toBe('Bỏ đánh dấu')
    await expectNoAxeViolations(container)
  })

  it('tải lỗi: dòng lỗi + "Thử lại", nút tắt; Thử lại tải được thì bật', async () => {
    ad.loiTai = 1
    moBai(`/hoc/${pmp.slug}`)
    expect(await screen.findByText(/Lỗi: không đọc được bước Áp dụng/)).toBeTruthy()
    expect(nutKhoi().hasAttribute('disabled')).toBe(true)
    fireEvent.click(within(khoi()).getByRole('button', { name: 'Thử lại' }))
    await waitFor(() =>
      expect(
        within(khoi()).getByRole('button', { name: 'Không áp dụng' }).hasAttribute('disabled'),
      ).toBe(false),
    )
    expect(screen.queryByText(/Lỗi: không đọc được bước Áp dụng/)).toBeNull()
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
    expect(ghiDaGui()).toEqual([])
  })

  it('Enter khi Telex/VNI đang ghép chữ không lưu; Enter thường lưu lý do đã bỏ khoảng trắng', async () => {
    await moVaCho()
    const dialog = await moHopThoai()
    const o = within(dialog).getByRole('textbox', { name: 'Lý do' })
    fireEvent.change(o, { target: { value: '  Không định thi chứng chỉ này  ' } })
    fireEvent.keyDown(o, { key: 'Enter', code: 'Enter', isComposing: true })
    fireEvent.keyDown(o, { key: 'Process', code: 'Enter', keyCode: 229 })
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(ghiDaGui()).toEqual([])

    fireEvent.keyDown(o, { key: 'Enter', code: 'Enter' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(ghiDaGui()).toEqual([
      {
        method: 'PUT',
        url: DUONG_DAN,
        body: { khongApDung: true, lyDo: 'Không định thi chứng chỉ này' },
      },
    ])
  })

  it('Huỷ / Esc đóng, không gửi, focus về nút "Không áp dụng"; chữ đang gõ còn khi mở lại (nhap-tam)', async () => {
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
  it('Lưu: khối hiện "Không áp dụng" + lý do ngay; focus về CÙNG nút, giờ là "Bỏ đánh dấu"; toast + Hoàn tác → DELETE', async () => {
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
    // Bản tạm của ô lý do bị xoá khi máy chủ lưu xong.
    await waitFor(() => expect(window.sessionStorage.length).toBe(0))

    const chuToast = await screen.findByText(/Đã đánh dấu Không áp dụng:/)
    expect(chuToast.textContent).toBe(`Đã đánh dấu Không áp dụng: ${pmp.label}`)
    expect(chuToast.querySelector('[lang="en"]')?.textContent).toBe(pmp.label)
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    await waitFor(() => expect(nut.textContent).toBe('Không áp dụng'))
    expect(ghiDaGui().map((y) => y.method)).toEqual(['PUT', 'DELETE'])
    expect(ad.apDung).toEqual({})
    // Hoàn tác của Hoàn tác thì không có.
    expect(await screen.findByText(/Đã bỏ đánh dấu Không áp dụng:/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Hoàn tác' })).toBeNull()
  })

  it('"Bỏ đánh dấu": DELETE, nút thành "Không áp dụng" (giữ focus); Hoàn tác gửi lại lý do cũ (PUT)', async () => {
    ad.apDung[pmp.id] = { trangThai: 'khong-ap-dung', lyDo: 'Lý do cũ' }
    await moVaCho()
    await waitFor(() => expect(nutKhoi().textContent).toBe('Bỏ đánh dấu'))
    const nut = nutKhoi()
    nut.focus()
    fireEvent.click(nut)
    await waitFor(() => expect(nut.textContent).toBe('Không áp dụng'))
    expect(nutKhoi()).toBe(nut)
    expect(document.activeElement).toBe(nut)
    expect(khoi().textContent).toContain('Có ở phase 11')
    expect(await screen.findByText(/Đã bỏ đánh dấu Không áp dụng:/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    await waitFor(() => expect(khoi().textContent).toContain('Lý do: "Lý do cũ"'))
    expect(ghiDaGui()).toEqual([
      { method: 'DELETE', url: DUONG_DAN, body: undefined },
      { method: 'PUT', url: DUONG_DAN, body: { khongApDung: true, lyDo: 'Lý do cũ' } },
    ])
  })

  it('lưu lỗi: trả về chưa đánh dấu, toast lỗi "Thử lại"; lý do còn trong dialog khi mở lại; Thử lại lưu được', async () => {
    ad.loiGhi = 1
    await moVaCho()
    const dialog = await moHopThoai()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Lý do' }), {
      target: { value: 'Lý do giữ lại' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
    const loi = await screen.findByRole('alert')
    expect(loi.textContent).toContain('Lỗi lưu — đã giữ trạng thái cũ.')
    await waitFor(() => expect(nutKhoi().textContent).toBe('Không áp dụng'))
    expect(khoi().textContent).toContain('Có ở phase 11')

    const lai = await moHopThoai()
    expect((within(lai).getByRole('textbox', { name: 'Lý do' }) as HTMLInputElement).value).toBe(
      'Lý do giữ lại',
    )
    fireEvent.click(within(lai).getByRole('button', { name: 'Huỷ' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(khoi().textContent).toContain('Lý do: "Lý do giữ lại"'))
    expect(ad.apDung[pmp.id]).toEqual({ trangThai: 'khong-ap-dung', lyDo: 'Lý do giữ lại' })
  })

  it('lý do dài không gây cuộn ngang: chữ được ngắt ở bất kỳ đâu', async () => {
    ad.apDung[pmp.id] = { trangThai: 'khong-ap-dung', lyDo: 'x'.repeat(500) }
    await moVaCho()
    const dong = await within(khoi()).findByText(/^Lý do: "x+"$/)
    expect(dong.className).toContain('[overflow-wrap:anywhere]')
  })
})
