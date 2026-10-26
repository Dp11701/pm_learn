// @vitest-environment jsdom
// Trang bài /hoc/:slug (phase 2a; F11 trừ cột phải, F17, F18, F19 trái, F26 lỗi đọc file; đề xuất 3.1, 3.6,
// 3.9; D1, D2, D8, D10, D12, D14, D15, D30) trên máy chủ giả: đầu bài + aria, segmented đổi trạng thái + toast
// Hoàn tác, phím 1–4 và [ ] theo e.code (bỏ qua khi đang gõ / ghép chữ), ô khối ★ thiếu, khối tuỳ chọn trống
// ẩn, Mục liên quan, trang chưa có nội dung + dialog Sao chép prompt, banner, lỗi tải, axe.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPrompt } from '../../../shared/noi-dung'
import { viTriTrongVung } from '../../../shared/roadmap'
import TrangMucHoc from '../../../src/pages/TrangMucHoc'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { cay, fileChuDe, giuCho, muc, phanHoi } from './ho-tro'
import { giaResizeObserver, moBai, taoMayChuBai, type MayChuBai } from './moi-truong'

let sv: MayChuBai

beforeEach(() => {
  sv = taoMayChuBai()
  giaResizeObserver()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.title = ''
})

const sc = muc('scope-creep')
const duongDan = () => screen.getAllByTestId('duong-dan').at(-1)!.textContent
const h1 = () => screen.getByRole('heading', { level: 1 })
const cho = (ms = 0) => act(() => new Promise((r) => setTimeout(r, ms)))

/** Scope Creep đã duyệt, đủ khối, có giải nghĩa, liên quan 2 mục có thật + 1 giá trị không tra được. */
function datScopeCreep(tc: Parameters<typeof fileChuDe>[1] = {}) {
  const text = fileChuDe(sc, {
    trangThai: 'da-duyet',
    giaiNghia: 'giải nghĩa giữ chỗ',
    lienQuan: ['change-request-cr', 'khong-co-muc-nay', 'scope-baseline'],
    ...tc,
  })
  sv.bai.set(
    sc.id,
    phanHoi(sc, text, { banChup: { ngayDuyet: '2026-10-18', noiDung: text, khop: true } }),
  )
}

async function moVaCho(slug = sc.slug) {
  const kq = moBai(`/hoc/${slug}`)
  await screen.findByRole('radio', { name: /Chưa học/, checked: true })
  return kq
}

describe('đầu bài (F11, D1, D2, D8, D10)', () => {
  it('breadcrumb, chip loại + chip nội dung có ngày, H1 lang=en + " — giải nghĩa", segmented, 4 bước, dải vị trí', async () => {
    datScopeCreep()
    const { container } = await moVaCho()
    await screen.findByRole('article', { name: `Bài học ${sc.label}` })

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy()
    expect(screen.getByText('Chủ đề').closest('[data-loai]')?.getAttribute('data-loai')).toBe(
      'chu-de',
    )
    expect(screen.getByText('Đã duyệt · 18/10/2026')).toBeTruthy()
    expect(h1().textContent).toBe(`${sc.label} — giải nghĩa giữ chỗ`)
    expect(h1().querySelector('[lang="en"]')?.textContent).toBe(sc.label)
    expect(document.title).toBe(`${sc.label} · Học PM A–Z`)

    const nhom = screen.getByRole('radiogroup', { name: 'Trạng thái học' })
    expect(
      within(nhom)
        .getAllByRole('radio')
        .map((r) => r.textContent),
    ).toEqual(['Chưa học', 'Đang học', 'Đã xong', 'Bỏ qua'])
    expect(screen.getByRole('link', { name: 'Xem trên bản đồ' }).getAttribute('href')).toBe(
      `/lo-trinh?xem=ban-do&muc=${sc.slug}`,
    )
    expect(screen.getByRole('link', { name: 'Soạn' }).getAttribute('href')).toBe(
      `/hoc/${sc.slug}/soan`,
    )

    const bonBuoc = screen.getByRole('navigation', { name: 'Bốn bước học' })
    expect(within(bonBuoc).getByRole('link', { name: /Hiểu/ }).getAttribute('href')).toBe(
      '#noi-lai-bang-loi-cua-ban',
    )
    expect(
      within(bonBuoc)
        .getByRole('link', { name: /Kiểm tra/ })
        .getAttribute('href'),
    ).toBe('#tu-kiem-tra')
    expect(within(bonBuoc).queryByRole('link', { name: /Ghi nhớ/ })).toBeNull()

    const vt = viTriTrongVung(cay, sc.id)
    expect(container.textContent).toContain(`Mục ${vt.thuTu}/${vt.tong} · ${sc.linhVuc!.label}`)
    // Không banner bản nháp với bài đã duyệt; lượt mở ghi đúng một lần (StrictMode)
    expect(screen.queryByText(/Bản nháp do/)).toBeNull()
    expect(sv.dem(`POST /api/luot-mo/${encodeURIComponent(sc.id)}`)).toBe(1)
    await expectNoAxeViolations(container)
  })

  it('dòng "Tên gốc trên roadmap: …" (lang=en) chỉ ở mục có tên gốc', async () => {
    const coTenGoc = cay.mucHoc.find((m) => m.labelOriginal)!
    await moVaCho(coTenGoc.slug)
    const dong = screen.getByText(/Tên gốc trên roadmap:/)
    expect(dong.textContent).toBe(`Tên gốc trên roadmap: ${coTenGoc.labelOriginal}`)
    expect(dong.querySelector('[lang="en"]')?.textContent).toBe(coTenGoc.labelOriginal)
    cleanup()
    await moVaCho()
    expect(screen.queryByText(/Tên gốc trên roadmap:/)).toBeNull()
  })

  it('segmented đổi trạng thái ngay + toast "Đã chuyển … sang …" + Hoàn tác (đề xuất 3.1)', async () => {
    await moVaCho()
    sv.dongCua()
    fireEvent.click(screen.getByRole('radio', { name: /Đã xong/ }))
    // Cập nhật lạc quan: đổi trước khi máy chủ trả lời
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Đã xong/ }).getAttribute('aria-checked')).toBe(
        'true',
      ),
    )
    sv.moCua()
    const toast = await screen.findByText(/Đã chuyển/)
    expect(toast.textContent).toBe(`Đã chuyển ${sc.label} sang Đã xong`)
    expect(sv.trangThai[sc.id]).toEqual({ status: 'done' })
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    await waitFor(() => expect(sv.trangThai[sc.id]).toBeUndefined())
    expect(sv.yeuCau.at(-1)?.body).toEqual({ trangThai: 'chua-hoc', via: 'hoan-tac' })
    expect(screen.getByRole('radio', { name: /Chưa học/ }).getAttribute('aria-checked')).toBe(
      'true',
    )
  })

  it('lưu lỗi → giữ trạng thái cũ + "Lỗi lưu — đã giữ trạng thái cũ." + Thử lại', async () => {
    sv.loiPut = 1
    await moVaCho()
    fireEvent.click(screen.getByRole('radio', { name: /Đang học/ }))
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Chưa học/ }).getAttribute('aria-checked')).toBe(
        'true',
      ),
    )
    expect(screen.getAllByText(/Lỗi lưu — đã giữ trạng thái cũ\./).length).toBeGreaterThan(0)
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(sv.trangThai[sc.id]).toEqual({ status: 'learning' }))
  })
})

describe('phím tắt (§11, đề xuất 5)', () => {
  it('1–4 theo e.code đặt trạng thái; bỏ qua khi đang gõ, khi IME ghép chữ, khi giữ Ctrl/⌘/Alt', async () => {
    await moVaCho()
    fireEvent.keyDown(document.body, { key: '2', code: 'Digit2' })
    await waitFor(() => expect(sv.trangThai[sc.id]).toEqual({ status: 'learning' }))
    const soPut = () => sv.yeuCau.filter((y) => y.method === 'PUT').length
    const truoc = soPut()

    const o = document.createElement('input')
    document.body.append(o)
    fireEvent.keyDown(o, { key: '3', code: 'Digit3' })
    o.remove()
    fireEvent.keyDown(document.body, { key: '3', code: 'Digit3', isComposing: true })
    fireEvent.keyDown(document.body, { key: 'Process', code: 'Digit3', keyCode: 229 })
    fireEvent.keyDown(document.body, { key: '3', code: 'Digit3', ctrlKey: true })
    fireEvent.keyDown(document.body, { key: '3', code: 'Digit3', metaKey: true })
    await cho()
    expect(soPut()).toBe(truoc)

    // Bàn phím khác (AZERTY: Digit4 ra "'") vẫn theo vị trí phím
    fireEvent.keyDown(document.body, { key: "'", code: 'Digit4' })
    await waitFor(() => expect(sv.trangThai[sc.id]).toMatchObject({ status: 'skip' }))
  })

  it('[ ] sang mục trước / sau theo e.code (Telex: "[" thành "ơ"), bỏ qua mục Bỏ qua', async () => {
    const [truoc, sau1, sau2] = [
      cay.mucHoc[sc.index - 1],
      cay.mucHoc[sc.index + 1],
      cay.mucHoc[sc.index + 2],
    ]
    sv.trangThai[sau1.id] = { status: 'skip' }
    await moVaCho()
    fireEvent.keyDown(document.body, { key: 'ư', code: 'BracketRight' })
    await waitFor(() => expect(duongDan()).toBe(`/hoc/${sau2.slug}`))
    await screen.findByRole('heading', { level: 1, name: sau2.label })
    fireEvent.keyDown(document.body, { key: 'ơ', code: 'BracketLeft' })
    await waitFor(() => expect(duongDan()).toBe(`/hoc/${sc.slug}`))
    fireEvent.keyDown(document.body, { key: 'ơ', code: 'BracketLeft' })
    await waitFor(() => expect(duongDan()).toBe(`/hoc/${truoc.slug}`))
  })
})

describe('thân bài (đề xuất 3.6 "Hiện ở bài", 1.5)', () => {
  it('khối ★ thiếu → ô nét đứt "Chưa có … — khối bắt buộc, bài vẫn đọc được." + "Thêm"; khối tuỳ chọn trống ẩn', async () => {
    datScopeCreep({ bo: ['Tự kiểm tra'] })
    const { container } = await moVaCho()
    await screen.findByRole('article')
    const o = container.querySelector('[data-khoi-thieu="tu-kiem-tra"]')!
    expect(o.textContent).toBe('Chưa có Tự kiểm tra — khối bắt buộc, bài vẫn đọc được.Thêm')
    expect(o.className).toContain('border-dashed')
    expect(
      within(o as HTMLElement)
        .getByRole('link', { name: 'Thêm Tự kiểm tra' })
        .getAttribute('href'),
    ).toBe(`/hoc/${sc.slug}/soan`)
    expect(container.querySelector('#so-sanh')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'So sánh' })).toBeNull()
    // D8: không có câu hỏi → Kiểm tra "Không áp dụng · chưa có câu hỏi", không bấm được
    const kiemTra = container.querySelector('[data-buoc="kiem-tra"]')!
    expect(kiemTra.textContent).toBe('Kiểm tra · Không áp dụng · chưa có câu hỏi')
    expect(kiemTra.querySelector('a')).toBeNull()
  })

  it('khối theo quy ước: định nghĩa, callout 2 cột, thực hành C20 + câu hỏi C21 chỉ đọc (đáp án không có trong trang)', async () => {
    datScopeCreep()
    const { container } = await moVaCho()
    await screen.findByRole('article')
    expect(container.querySelectorAll('#khai-niem-cot-loi dt')).toHaveLength(2)
    const callout = container.querySelector('#goc-dev-lead-pm')!
    expect([...callout.querySelectorAll('h3')].map((h) => h.textContent)).toEqual([
      'Bạn đã quen',
      'Điều cần đổi',
    ])
    const thucHanh = container.querySelector('#thuc-hanh-tren-du-an-that')!
    expect(thucHanh.textContent).toContain('Bước Áp dụng · chưa làm')
    expect(thucHanh.textContent).toContain('Có ở phase 3')
    const tuKiemTra = container.querySelector('#tu-kiem-tra')!
    expect(within(tuKiemTra as HTMLElement).getAllByRole('listitem')).toHaveLength(2)
    expect(tuKiemTra.textContent).toContain('Câu 1/2')
    expect(tuKiemTra.textContent).not.toContain('Đáp án')
    expect(
      within(tuKiemTra as HTMLElement)
        .getAllByRole('button', { name: 'Xem đáp án' })
        .every((b) => (b as HTMLButtonElement).disabled),
    ).toBe(true)
    // Nói lại (phase 3) đúng chỗ: sau Góc dev lead → PM, trước Thực hành
    const thuTu = [...container.querySelectorAll('article section[id]')].map((s) => s.id)
    expect(thuTu.indexOf('noi-lai-bang-loi-cua-ban')).toBe(thuTu.indexOf('goc-dev-lead-pm') + 1)
    expect(container.querySelector('#noi-lai-bang-loi-cua-ban')?.textContent).toContain(
      'Có ở phase 3',
    )
  })

  it('đổi trạng thái bằng phím khi focus ở link trong bài: link không bị gắn lại (giữ focus)', async () => {
    datScopeCreep({
      thay: { 'Tham khảo': '- [Nguồn mẫu 1](https://example.com/nguon) — chưa điền' },
    })
    await moVaCho()
    const link = await screen.findByRole('link', { name: /Nguồn mẫu 1/ })
    act(() => link.focus())
    fireEvent.keyDown(link, { key: '2', code: 'Digit2' })
    await waitFor(() => expect(sv.trangThai[sc.id]).toEqual({ status: 'learning' }))
    expect(link.isConnected).toBe(true)
    expect(document.activeElement).toBe(link)
  })

  it('Mục liên quan từ lien_quan: mục tra được kèm icon + chữ trạng thái, giá trị không tra được bỏ qua', async () => {
    datScopeCreep()
    sv.trangThai[muc('change-request-cr').id] = { status: 'done' }
    const { container } = await moVaCho()
    await screen.findByRole('article')
    const khoi = container.querySelector('#muc-lien-quan') as HTMLElement
    const cac = within(khoi).getAllByRole('link')
    expect(cac.map((a) => a.getAttribute('href'))).toEqual([
      '/hoc/change-request-cr',
      '/hoc/scope-baseline',
    ])
    expect(cac[0].textContent).toContain('Đã xong · ')
    expect(cac[0].querySelector('[data-trang-thai="da-xong"]')).not.toBeNull()
    expect(cac[1].textContent).toContain('Chưa học · ')
  })

  it('pager và Mục liên quan hiện chip nội dung của mục đích; mục chưa có file → "Chưa có nội dung" (§6.2, F11, F17)', async () => {
    datScopeCreep()
    const truoc = cay.mucHoc[sc.index - 1]
    const cr = muc('change-request-cr')
    sv.noiDung = {
      [sc.id]: { loai: 'da-duyet', ngayDuyet: '2026-10-18' },
      [truoc.id]: { loai: 'ban-nhap', nguon: 'ai' },
      [cr.id]: { loai: 'da-duyet', ngayDuyet: '2026-10-20' },
    }
    const { container } = await moVaCho()
    await screen.findByRole('article')
    const pager = screen.getByRole('navigation', { name: 'Mục trước và tiếp' })
    const [the1, the2] = within(pager).getAllByRole('link')
    await waitFor(() => expect(within(the1).getByText('Bản nháp · AI')).toBeTruthy())
    // Mục kề chưa có nội dung vẫn là điểm dừng của Tiếp, kèm chip nét đứt
    const chuaCo = within(the2).getByText('Chưa có nội dung')
    expect(chuaCo.getAttribute('data-noi-dung')).toBe('chua-co')
    expect(chuaCo.className).toContain('border-dashed')
    // Card Trước căn trái: chip không giãn hết bề ngang
    expect(within(the1).getByText('Bản nháp · AI').className).toContain('self-start')

    const hang = within(container.querySelector('#muc-lien-quan') as HTMLElement).getAllByRole(
      'link',
    )
    expect(within(hang[0]).getByText('Đã duyệt · 20/10/2026')).toBeTruthy()
    expect(within(hang[1]).getByText('Chưa có nội dung')).toBeTruthy()
    expect(sv.dem('GET /api/noi-dung/trang-thai')).toBe(1)
    await expectNoAxeViolations(container)
  })

  it('bản nháp: banner AI / Tự viết (đề xuất 3.7); chip "Bản nháp · AI"', async () => {
    sv.bai.set(sc.id, phanHoi(sc, fileChuDe(sc)))
    await moVaCho()
    expect(
      await screen.findByText('Bản nháp do AI soạn — chưa được bạn duyệt, có thể sai.'),
    ).toBeTruthy()
    expect(screen.getByText('Bản nháp · AI')).toBeTruthy()
    cleanup()
    sv.bai.set(sc.id, phanHoi(sc, fileChuDe(sc, { nguon: 'tu-viet' })))
    await moVaCho()
    expect(await screen.findByText('Bản nháp do bạn tự viết — chưa duyệt.')).toBeTruthy()
  })

  it('chân bài: "Đã xong, sang bài tiếp" đặt Đã xong rồi sang mục sau; pager có nhãn', async () => {
    datScopeCreep()
    await moVaCho()
    await screen.findByRole('article')
    const sau = cay.mucHoc[sc.index + 1]
    const pager = screen.getByRole('navigation', { name: 'Mục trước và tiếp' })
    expect(
      within(pager)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href')),
    ).toEqual([`/hoc/${cay.mucHoc[sc.index - 1].slug}`, `/hoc/${sau.slug}`])
    fireEvent.click(screen.getByRole('button', { name: 'Đã xong, sang bài tiếp' }))
    await waitFor(() => expect(duongDan()).toBe(`/hoc/${sau.slug}`))
    await waitFor(() => expect(sv.trangThai[sc.id]).toEqual({ status: 'done' }))
  })

  it('mục cuối của roadmap (D30): không có "Đã xong, sang bài tiếp", card "Đây là mục cuối cùng của roadmap"', async () => {
    const cuoi = cay.mucHoc[cay.soMucHoc - 1]
    await moVaCho(cuoi.slug)
    expect(await screen.findByText('Đây là mục cuối cùng của roadmap')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Đã xong, sang bài tiếp' })).toBeNull()
  })
})

describe('chưa có nội dung (F17, F18, D8, D14)', () => {
  it('giữ đủ đầu bài; card + 3 nút; khung các khối nét đứt; không có giải thích về mục', async () => {
    const sm = muc('salience-model')
    const { container } = await moVaCho(sm.slug)
    await screen.findByRole('heading', { name: 'Mục này chưa có nội dung.' })
    expect(h1().textContent).toBe(sm.label)
    expect(within(container.querySelector('header')!).getByText('Chưa có nội dung')).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Trạng thái học' })).toBeTruthy()
    expect(container.querySelector('[data-buoc="kiem-tra"]')?.textContent).toBe(
      'Kiểm tra · Không áp dụng · chưa có câu hỏi',
    )
    expect(screen.getByRole('link', { name: 'Soạn bài' }).getAttribute('href')).toBe(
      `/hoc/${sm.slug}/soan`,
    )
    expect(screen.getByRole('link', { name: 'Nhập file .md' }).getAttribute('href')).toBe(
      `/noi-dung?tab=nhap&muc=${sm.slug}`,
    )
    expect(screen.getByRole('button', { name: 'Sao chép prompt soạn bài' })).toBeTruthy()
    expect(container.textContent).toContain('0/9 khối bắt buộc')
    expect(screen.queryByRole('article')).toBeNull()
    await expectNoAxeViolations(container)
  })

  it('dialog Sao chép prompt (F19 trái): prompt của buildPrompt, focus sẵn "Sao chép", ghi clipboard, đóng + toast', async () => {
    const sm = muc('salience-model')
    const ghi = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: ghi } })
    await moVaCho(sm.slug)
    const nutMo = await screen.findByRole('button', { name: 'Sao chép prompt soạn bài' })
    fireEvent.click(nutMo)
    const dialog = await screen.findByRole('dialog', { name: 'Sao chép prompt soạn bài' })
    const vung = within(dialog).getByRole('region', { name: 'Xem trước prompt' })
    expect(vung.textContent).toBe(buildPrompt(sm, cay))
    expect(dialog.textContent).toContain(`${sm.label} · Chủ đề`)
    expect(dialog.textContent).toContain('App không tự gọi AI.')
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Sao chép' }))
    await expectNoAxeViolations(dialog)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sao chép' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(ghi).toHaveBeenCalledWith(buildPrompt(sm, cay))
    expect(await screen.findByText('Đã sao chép prompt soạn bài.')).toBeTruthy()
  })

  it('clipboard bị từ chối → prompt được chọn sẵn, câu hướng dẫn trong dialog, dialog vẫn mở', async () => {
    const sm = muc('salience-model')
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('không cho')) },
    })
    await moVaCho(sm.slug)
    fireEvent.click(await screen.findByRole('button', { name: 'Sao chép prompt soạn bài' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sao chép' }))
    expect(await within(dialog).findByText(/Không sao chép tự động được/)).toBeTruthy()
    expect(String(window.getSelection())).toBe(buildPrompt(sm, cay))
    expect(screen.getByRole('dialog')).toBe(dialog)
  })
})

describe('banner bảo vệ bản Đã duyệt và lỗi đọc file (đề xuất 1.6, F26, D30)', () => {
  it('frontmatter lỗi: banner lỗi "<file>.md: lỗi frontmatter dòng N" + "Mở trong trình soạn", chip lỗi, không hiện thân bài', async () => {
    const hong = fileChuDe(sc).replace('loai: chu-de', 'loai: tai-lieu')
    sv.bai.set(sc.id, phanHoi(sc, hong))
    const { container } = await moVaCho()
    const banner = await screen.findByRole('alert')
    expect(banner.textContent).toContain('scope-creep.md: lỗi frontmatter dòng 3')
    expect(banner.textContent).toContain('Bài vẫn hiện trạng thái học, đồng hồ và ghi chú.')
    expect(
      within(banner).getByRole('link', { name: 'Mở trong trình soạn' }).getAttribute('href'),
    ).toBe(`/hoc/${sc.slug}/soan`)
    expect(screen.getByText('Lỗi frontmatter · dòng 3')).toBeTruthy()
    expect(screen.queryByRole('article')).toBeNull()
    expect(screen.queryByText('Mục này chưa có nội dung.')).toBeNull()
    await expectNoAxeViolations(container)
  })

  it('"File ghi Đã duyệt nhưng app chưa xác nhận" + Quét lại; "File đã đổi ngoài app" + Quét lại để kiểm tra', async () => {
    sv.bai.set(sc.id, phanHoi(sc, fileChuDe(sc, { trangThai: 'da-duyet' })))
    await moVaCho()
    expect(await screen.findByText('File ghi Đã duyệt nhưng app chưa xác nhận')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Quét lại' }).getAttribute('href')).toBe(
      '/noi-dung?tab=nhap',
    )
    expect(screen.getByText('Bản nháp · AI')).toBeTruthy()
    cleanup()
    const goc = fileChuDe(sc, { trangThai: 'da-duyet' })
    sv.bai.set(
      sc.id,
      phanHoi(sc, `${goc}\n${giuCho('Sửa ngoài app')}`, {
        banChup: { ngayDuyet: '2026-10-18', noiDung: goc, khop: false },
      }),
    )
    await moVaCho()
    expect(await screen.findByText('File đã đổi ngoài app')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Quét lại để kiểm tra' })).toBeTruthy()
    expect(screen.getByText('Đã duyệt · 18/10/2026')).toBeTruthy()
    expect(screen.queryByText(/Sửa ngoài app/)).toBeNull()
  })

  it('GET /api/bai lỗi → card lỗi + "Thử lại" tải lại được (đầu bài vẫn hiện)', async () => {
    sv.loiBai = 1
    datScopeCreep()
    await moVaCho()
    expect(await screen.findByText('Không tải được bài học.')).toBeTruthy()
    expect(h1().textContent).toContain(sc.label)
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('article')).toBeTruthy()
  })
})

describe('ngoài máy chủ (gallery, test khung app)', () => {
  it('không có QueryClientProvider: vẽ đầu bài từ cây, trạng thái chỉ đọc, thân bài đang tải, không gọi API', () => {
    render(
      <MemoryRouter initialEntries={[`/hoc/${sc.slug}`]}>
        <Routes>
          <Route path="/hoc/:slug" element={<TrangMucHoc />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(h1().textContent).toBe(sc.label)
    expect(
      within(screen.getByRole('radiogroup'))
        .getAllByRole('radio')
        .every((r) => (r as HTMLButtonElement).disabled),
    ).toBe(true)
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(sv.yeuCau).toEqual([])
  })
})
