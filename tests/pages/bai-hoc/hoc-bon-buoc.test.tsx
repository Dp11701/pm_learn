// @vitest-environment jsdom
// Trang /hoc/:slug phase 3 (F11; §1 vòng 4 bước; đề xuất 3.2): trên máy chủ giả đầy đủ (trang bài + dữ liệu học),
// học trọn các bước trong trang thật — Nói lại đổi bước Hiểu, Thực hành Xong đổi bước Áp dụng, các khối không còn
// ô "Có ở phase"; Tài liệu (khối Bản của tôi) và Chứng chỉ (Kế hoạch thi của tôi) có cùng thẻ Thực hành ở bước Áp
// dụng (phạm vi rút gọn mục 10): Kết quả + Xong, hoặc Không áp dụng — kể cả khi chưa có bài; axe cả trang.
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { taoMayChuDayDu, type MayChuDayDu } from '../../components/bai-hoc/moi-truong-hoc'
import { cay, fileChuDe, giuCho, muc, phanHoi } from './ho-tro'
import { giaResizeObserver, moBai } from './moi-truong'

let sv: MayChuDayDu
const sc = muc('scope-creep')

beforeEach(() => {
  sv = taoMayChuDayDu()
  giaResizeObserver()
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.title = ''
})

const buoc = (b: string) =>
  document.querySelector(`header [data-buoc="${b}"]`)?.getAttribute('data-tinh-trang')

describe('trang bài: vòng 4 bước (phase 3)', () => {
  it('Nói lại → Hiểu xong; Kết quả + Xong → Áp dụng xong; không còn "Có ở phase"; axe', async () => {
    const text = fileChuDe(sc, { trangThai: 'ban-nhap' })
    sv.bai.bai.set(sc.id, phanHoi(sc, text))
    const { container } = moBai(`/hoc/${sc.slug}`)
    const article = await screen.findByRole('article', { name: `Bài học ${sc.label}` })
    const noiLai = within(article).getByRole('textbox', { name: 'Nói lại bằng lời của bạn' })
    await waitFor(() => expect((noiLai as HTMLTextAreaElement).disabled).toBe(false))
    expect(article.textContent).not.toContain('Có ở phase')
    expect(buoc('hieu')).toBe('chua-lam')

    fireEvent.focus(noiLai)
    fireEvent.change(noiLai, { target: { value: 'Tóm lại bằng lời của tôi' } })
    await waitFor(() => expect(buoc('hieu')).toBe('xong'))

    const th = document.getElementById('thuc-hanh-tren-du-an-that')!
    const ketQua = within(th).getByRole('textbox', { name: 'Kết quả của bạn' })
    fireEvent.focus(ketQua)
    fireEvent.change(ketQua, { target: { value: 'Đã làm trên dự án' } })
    fireEvent.click(within(th).getByRole('button', { name: 'Xong' }))
    await waitFor(() => expect(buoc('ap-dung')).toBe('xong'))
    await waitFor(() => expect(sv.hoc.mucCua(sc.id).thucHanh.trangThai).toBe('xong'))
    await expectNoAxeViolations(container)
    // Cả trang + axe, test đầu của file (nạp module lần đầu): chạy cả bộ song song thì có lúc quá 5 giây mặc định
  }, 15_000)

  it('Tài liệu có bài: khối "Bản của tôi" (đúng vị trí mẫu) là thẻ Thực hành — Kết quả + Xong → Áp dụng xong qua PUT /api/hoc/:id/thuc-hanh; axe', async () => {
    const rr = muc('risk-register')
    const text = [
      '---',
      `id: "${rr.id}"`,
      'loai: tai-lieu',
      'trang_thai_noi_dung: ban-nhap',
      'nguon: ai',
      '---',
      '',
      '## Mục đích',
      '',
      giuCho('Mục đích'),
      '',
    ].join('\n')
    sv.bai.bai.set(rr.id, phanHoi(rr, text))
    const { container } = moBai(`/hoc/${rr.slug}`)
    const article = await screen.findByRole('article', { name: `Bài học ${rr.label}` })
    const khoi = within(article)
      .getByRole('heading', { level: 2, name: 'Bản của tôi' })
      .closest('section')!
    expect(khoi.id).toBe('ban-cua-toi')
    expect(khoi.textContent).not.toContain('Có ở phase')
    expect(khoi.textContent).toContain('Bước Áp dụng · chưa làm')
    const ketQua = within(khoi).getByRole('textbox', { name: 'Kết quả của bạn' })
    await waitFor(() => expect((ketQua as HTMLTextAreaElement).disabled).toBe(false))
    fireEvent.focus(ketQua)
    fireEvent.change(ketQua, { target: { value: 'Risk register của dự án ở Confluence' } })
    fireEvent.click(within(khoi).getByRole('button', { name: 'Xong' }))
    await waitFor(() => expect(buoc('ap-dung')).toBe('xong'))
    await waitFor(() =>
      expect(sv.hoc.mucCua(rr.id).thucHanh).toMatchObject({
        trangThai: 'xong',
        ketQua: 'Risk register của dự án ở Confluence',
      }),
    )
    await expectNoAxeViolations(container)
  })

  it('Chứng chỉ chưa có bài (F17): thẻ Thực hành ở khối Kế hoạch thi của tôi — Không áp dụng → PUT /api/hoc/:id/thuc-hanh, bước Áp dụng Không áp dụng', async () => {
    const pmp = cay.mucHoc.find((m) => m.mau === 'chung-chi')!
    moBai(`/hoc/${pmp.slug}`)
    await screen.findByRole('heading', { name: 'Mục này chưa có nội dung.' })
    const khoi = document.getElementById('ke-hoach-thi-cua-toi')!
    expect(khoi.textContent).not.toContain('Có ở phase')
    expect(within(khoi).getByRole('textbox', { name: 'Kết quả của bạn' })).toBeTruthy()
    const nut = within(khoi).getByRole('button', {
      name: 'Không áp dụng (ghi lý do)',
    }) as HTMLButtonElement
    await waitFor(() => expect(nut.disabled).toBe(false))
    fireEvent.click(nut)
    const dialog = await screen.findByRole('dialog', { name: 'Đánh dấu Không áp dụng' })
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Chưa định thi' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(buoc('ap-dung')).toBe('khong-ap-dung'))
    await waitFor(() =>
      expect(sv.hoc.mucCua(pmp.id).thucHanh).toMatchObject({
        trangThai: 'khong-ap-dung',
        lyDo: 'Chưa định thi',
      }),
    )
    expect(sv.bai.yeuCau.some((y) => y.method !== 'GET' && y.url.startsWith('/api/ap-dung'))).toBe(
      false,
    )
  })
})

describe('F19 phải trên trang bài (đề xuất 3.1; quyết định 10)', () => {
  const duongDan = () => screen.getAllByTestId('duong-dan').at(-1)!.textContent

  async function moScopeCreep() {
    sv.bai.bai.set(sc.id, phanHoi(sc, fileChuDe(sc)))
    const kq = moBai(`/hoc/${sc.slug}`)
    await screen.findByRole('article', { name: `Bài học ${sc.label}` })
    await waitFor(() => expect(sv.hoc.dem(`GET /api/hoc/${encodeURIComponent(sc.id)}`)).toBe(1))
    await waitFor(() => expect(screen.getByRole('radio', { name: /Chưa học/ })).toBeTruthy())
    await new Promise((r) => setTimeout(r, 30))
    return kq
  }

  it('segmented "Đã xong" khi còn bước thiếu → alertdialog 4 bước, focus "Quay lại học tiếp"; Quay lại không đặt gì', async () => {
    const { container } = await moScopeCreep()
    fireEvent.click(screen.getByRole('radio', { name: /Đã xong/ }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain('Bài còn 4 bước chưa xong.')
    expect(dialog.textContent).toContain('Thiếu · chưa tự chấm câu nào')
    await waitFor(() => expect(document.activeElement?.textContent).toBe('Quay lại học tiếp'))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Quay lại học tiếp' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(
      sv.bai.yeuCau.some((y) => y.method === 'PUT' && y.url.startsWith('/api/trang-thai')),
    ).toBe(false)
    await expectNoAxeViolations(container)
  })

  it('"Đã xong, sang bài tiếp" → F19 → "Vẫn đánh dấu Đã xong": đặt Đã xong rồi sang mục sau', async () => {
    await moScopeCreep()
    fireEvent.click(screen.getByRole('button', { name: 'Đã xong, sang bài tiếp' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(duongDan()).toBe(`/hoc/${sc.slug}`)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vẫn đánh dấu Đã xong' }))
    await waitFor(() => expect(duongDan()).toBe(`/hoc/${cay.mucHoc[sc.index + 1].slug}`))
    await waitFor(() => expect(sv.bai.trangThai[sc.id]).toEqual({ status: 'done' }))
  })
})
