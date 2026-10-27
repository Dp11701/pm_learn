// @vitest-environment jsdom
// Các khối học trên trang bài (phase 3; F11, F02b C20/C21; §1; đề xuất 1.5, 3.2, 3.5): Nói lại (tự lưu C25, bản
// tạm, không đè ô đang focus), thẻ Thực hành (tiêu chí, dự án + Thêm dự án, Kết quả tự lưu, Xong chỉ khi có kết
// quả, Không áp dụng kèm lý do, nút giữ focus), Tự kiểm tra (Xem đáp án chỉ khi có câu trả lời, tự chấm sau khi
// xem, giữ lần chấm mới nhất, Tạo flashcard điền sẵn H/Đ + khoá câu, câu trả lời cho câu hỏi cũ kèm chữ câu hỏi lúc
// lưu), khối Bản của tôi / Kế hoạch thi của tôi là cùng thẻ Thực hành (phạm vi rút gọn — API chung). Dựng ThanBai /
// KhoiApp trên máy chủ giả, axe.
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropsHopThoaiThe } from '../../../src/components/the/HopThoaiThe'
import { TRE_TU_LUU } from '../../../src/app/du-lieu/hoc'
import { cacOHien } from '../../../src/pages/bai-hoc/bo-cuc'
import KhoiApp from '../../../src/pages/bai-hoc/KhoiApp'
import ThanBai, { cacKhoaCauHoi } from '../../../src/pages/bai-hoc/ThanBai'
import { MAU_BAI } from '../../../shared/noi-dung'
import { AP_DUNG_THEO_MAU } from '../../../src/copy/cho-duyet'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { cay, fileChuDe, giuCho, muc, phanHoi } from '../../pages/bai-hoc/ho-tro'
import { giaResizeObserver } from '../../pages/bai-hoc/moi-truong'
import { dungVoiProvider, taoMayChuDayDu, type MayChuDayDu } from './moi-truong-hoc'

// Hộp thoại thẻ (của card Flashcard) thay bằng bản ghi lại props
const theMo = vi.hoisted(() => ({ props: [] as PropsHopThoaiThe[] }))
vi.mock(import('../../../src/components/the/HopThoaiThe'), () => ({
  default: (p: PropsHopThoaiThe) => {
    theMo.props.push(p)
    return p.mo ? (
      <div role="dialog" aria-label="Hộp thoại thẻ giả">
        {p.giaTriDau?.truoc}
      </div>
    ) : null
  },
}))

let sv: MayChuDayDu
const sc = muc('scope-creep')
const ID = sc.id
const GOC = `/api/hoc/${encodeURIComponent(ID)}`

beforeEach(() => {
  sv = taoMayChuDayDu()
  giaResizeObserver()
  window.sessionStorage.clear()
  theMo.props = []
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const cho = (ms = 20) => act(() => new Promise((r) => setTimeout(r, ms)))

/** Bài Scope Creep giữ chỗ (đủ khối, 2 câu hỏi, 2 tiêu chí). */
function baiScopeCreep(tc: Parameters<typeof fileChuDe>[1] = {}) {
  const bai = phanHoi(sc, fileChuDe(sc, tc)).bai!
  return { bai, cacO: cacOHien(bai, { coLienQuan: false }) }
}

function dungThanBai(tc: Parameters<typeof fileChuDe>[1] = {}) {
  const { bai, cacO } = baiScopeCreep(tc)
  const kq = dungVoiProvider(
    <article>
      <ThanBai
        muc={sc}
        cay={cay}
        bai={bai}
        cacO={cacO}
        lienQuan={[]}
        trangThaiCua={() => 'dang-hoc'}
      />
    </article>,
  )
  return { ...kq, cacO }
}

const khoi = (id: string) => document.getElementById(id) as HTMLElement
const thucHanh = () => khoi('thuc-hanh-tren-du-an-that')
const tuKiemTra = () => khoi('tu-kiem-tra')
const noiLai = () => within(khoi('noi-lai-bang-loi-cua-ban')).getByRole('textbox')
const daTai = () => waitFor(() => expect((noiLai() as HTMLTextAreaElement).disabled).toBe(false))

describe('Nói lại bằng lời của bạn (bước Hiểu; C25, nhap-tam, §11)', () => {
  it('F11: tên khối + câu gợi ý; ô tắt khi chưa tải; gõ → "Đang lưu…" → một lần PUT chữ cuối → "Đã lưu lúc"; axe', async () => {
    const { container } = dungThanBai()
    expect((noiLai() as HTMLTextAreaElement).disabled).toBe(true)
    await daTai()
    const k = khoi('noi-lai-bang-loi-cua-ban')
    expect(within(k).getByRole('heading', { level: 2 }).textContent).toBe(
      'Nói lại bằng lời của bạn',
    )
    expect(k.textContent).toContain('1–3 câu. Viết xong thì bước Hiểu được đánh dấu.')
    const o = noiLai()
    expect(o.getAttribute('aria-describedby')).toBeTruthy()
    fireEvent.focus(o)
    fireEvent.change(o, { target: { value: 'Câu' } })
    fireEvent.change(o, { target: { value: 'Câu của tôi' } })
    expect(k.textContent).toContain('Đang lưu…')
    expect(window.sessionStorage.getItem(`hoc-pm-a-z:nhap-tam:noi-lai:${ID}`)).toBe('Câu của tôi')
    await cho(TRE_TU_LUU + 100)
    await waitFor(() => expect(k.textContent).toMatch(/Đã lưu lúc \d\d:\d\d/))
    expect(sv.hoc.cacLan(`PUT ${GOC}/noi-lai`).map((y) => y.body)).toEqual([
      { text: 'Câu của tôi' },
    ])
    expect(window.sessionStorage.getItem(`hoc-pm-a-z:nhap-tam:noi-lai:${ID}`)).toBeNull()
    await expectNoAxeViolations(container)
  })

  it('tải lại lúc đang focus không đè chữ đang gõ; rời ô thì hiện giá trị mới của máy chủ', async () => {
    const { client } = dungThanBai()
    await daTai()
    const o = noiLai() as HTMLTextAreaElement
    fireEvent.focus(o)
    fireEvent.change(o, { target: { value: 'Chữ của tôi' } })
    await cho(TRE_TU_LUU + 100)
    await waitFor(() => expect(sv.hoc.dem(`PUT ${GOC}/noi-lai`)).toBe(1))
    // Tab khác sửa Nói lại → tải lại
    sv.hoc.mucCua(ID).noiLai = { text: 'Bản của tab khác', capNhat: sv.hoc.gio }
    await act(() => client.invalidateQueries({ queryKey: ['du-lieu-hoc', 'hoc', ID] }))
    await cho(50)
    expect(o.value).toBe('Chữ của tôi')
    fireEvent.blur(o)
    await waitFor(() => expect(o.value).toBe('Bản của tab khác'))
  })

  it('lưu lỗi: "Lỗi lưu — Thử lại" trong ô, giữ chữ và bản tạm; Thử lại lưu được', async () => {
    dungThanBai()
    await daTai()
    const o = noiLai() as HTMLTextAreaElement
    sv.hoc.loiGhi = 1
    fireEvent.focus(o)
    fireEvent.change(o, { target: { value: 'Giữ chữ này' } })
    fireEvent.blur(o)
    const k = khoi('noi-lai-bang-loi-cua-ban')
    await waitFor(() => expect(k.textContent).toContain('Lỗi lưu — Thử lại'))
    expect(o.value).toBe('Giữ chữ này')
    expect(window.sessionStorage.getItem(`hoc-pm-a-z:nhap-tam:noi-lai:${ID}`)).toBe('Giữ chữ này')
    fireEvent.click(within(k).getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(k.textContent).toMatch(/Đã lưu lúc/))
    expect(sv.hoc.mucCua(ID).noiLai?.text).toBe('Giữ chữ này')
  })

  it('bản tạm còn lại từ lần trước (chưa lưu được) hiện ra và tự lưu lại', async () => {
    window.sessionStorage.setItem(`hoc-pm-a-z:nhap-tam:noi-lai:${ID}`, 'Chữ chưa kịp lưu')
    dungThanBai()
    await daTai()
    expect((noiLai() as HTMLTextAreaElement).value).toBe('Chữ chưa kịp lưu')
    await cho(TRE_TU_LUU + 100)
    await waitFor(() => expect(sv.hoc.mucCua(ID).noiLai?.text).toBe('Chữ chưa kịp lưu'))
  })
})

describe('thẻ Thực hành C20 (bước Áp dụng; đề xuất 3.2)', () => {
  it('đề bài, đầu ra, tiêu chí là ô tick; "Bước Áp dụng · chưa làm"; Xong tắt kèm câu hướng dẫn; axe', async () => {
    const { container } = dungThanBai()
    await daTai()
    const th = thucHanh()
    expect(th.textContent).toContain('Bước Áp dụng · chưa làm')
    expect([...th.querySelectorAll('h3')].map((h) => h.textContent)).toEqual(['Đề bài', 'Đầu ra'])
    const nhom = within(th).getByRole('group', { name: 'Tiêu chí tự kiểm' })
    expect(within(nhom).getAllByRole('checkbox')).toHaveLength(2)
    const xong = within(th).getByRole('button', { name: 'Xong' }) as HTMLButtonElement
    expect(xong.disabled).toBe(true)
    expect(th.textContent).toContain('Ghi kết quả của bạn để bật Xong.')
    expect(within(th).getByRole('button', { name: 'Không áp dụng (ghi lý do)' })).toBeTruthy()
    expect(th.textContent).not.toContain('Có ở phase')
    await expectNoAxeViolations(container)
  })

  it('tick tiêu chí lưu ngay (PUT tieuChi) và bước thành đang làm', async () => {
    dungThanBai()
    await daTai()
    const o = within(thucHanh()).getAllByRole('checkbox')[1] as HTMLInputElement
    fireEvent.click(o)
    expect(o.checked).toBe(true)
    await waitFor(() => expect(sv.hoc.dem(`PUT ${GOC}/thuc-hanh`)).toBe(1))
    const body = sv.hoc.cacLan(`PUT ${GOC}/thuc-hanh`)[0].body as { tieuChi: object }
    expect(Object.values(body.tieuChi)).toEqual([true])
    await waitFor(() => expect(thucHanh().textContent).toContain('Bước Áp dụng · đang làm'))
  })

  it('Kết quả có chữ → Xong bật; Xong gửi kèm chữ chưa lưu; nút giữ focus thành "Bỏ đánh dấu Xong" → Đang làm', async () => {
    dungThanBai()
    await daTai()
    const th = thucHanh()
    const ketQua = within(th).getByRole('textbox', { name: 'Kết quả của bạn' })
    expect(ketQua.getAttribute('placeholder')).toBe(
      'Dán link, ghi chú hoặc mô tả bạn đã làm gì trên dự án.',
    )
    fireEvent.focus(ketQua)
    fireEvent.change(ketQua, { target: { value: 'Link biên bản' } })
    const nut = within(th).getByRole('button', { name: 'Xong' }) as HTMLButtonElement
    expect(nut.disabled).toBe(false)
    nut.focus()
    fireEvent.click(nut)
    await waitFor(() => expect(sv.hoc.mucCua(ID).thucHanh.trangThai).toBe('xong'))
    expect(sv.hoc.cacLan(`PUT ${GOC}/thuc-hanh`).at(-1)?.body).toEqual({
      trangThai: 'xong',
      ketQua: 'Link biên bản',
    })
    expect(th.textContent).toContain('Bước Áp dụng · đã xong')
    expect(th.textContent).toContain('Đã xong· Kết quả đã lưu · sửa được')
    expect(nut.textContent).toBe('Bỏ đánh dấu Xong')
    expect(document.activeElement).toBe(nut)
    fireEvent.click(nut)
    await waitFor(() => expect(sv.hoc.mucCua(ID).thucHanh.trangThai).toBe('dang-lam'))
    expect(nut.textContent).toBe('Xong')
  })

  it('hồi quy: đã Xong thì không có "Không áp dụng" (Xong → Không áp dụng → Bỏ đánh dấu từng về Đang làm, mất Xong); Bỏ đánh dấu Xong thì có lại', async () => {
    sv.hoc.mucCua(ID).thucHanh = {
      ...sv.hoc.mucCua(ID).thucHanh,
      trangThai: 'xong',
      ketQua: 'Đã làm',
      xongLuc: '2026-10-22T14:42:00.000Z',
    }
    dungThanBai()
    await daTai()
    const th = thucHanh()
    await waitFor(() => expect(th.textContent).toContain('Bước Áp dụng · đã xong'))
    expect(within(th).queryByRole('button', { name: 'Không áp dụng (ghi lý do)' })).toBeNull()
    fireEvent.click(within(th).getByRole('button', { name: 'Bỏ đánh dấu Xong' }))
    await waitFor(() => expect(sv.hoc.mucCua(ID).thucHanh.trangThai).toBe('dang-lam'))
    expect(within(th).getByRole('button', { name: 'Không áp dụng (ghi lý do)' })).toBeTruthy()
  })

  it('Không áp dụng: dialog lý do bắt buộc → khối hiện "Không áp dụng" + Lý do, nút (cùng phần tử) thành "Bỏ đánh dấu"; toast Hoàn tác', async () => {
    dungThanBai()
    await daTai()
    const nut = within(thucHanh()).getByRole('button', { name: 'Không áp dụng (ghi lý do)' })
    nut.focus()
    fireEvent.click(nut)
    const dialog = await screen.findByRole('dialog', { name: 'Đánh dấu Không áp dụng' })
    expect(dialog.textContent).toContain('không cần bài thực hành')
    const o = within(dialog).getByRole('textbox', { name: /Lý do/ })
    await waitFor(() => expect(document.activeElement).toBe(o))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
    expect(within(dialog).getByText('Ghi lý do để đánh dấu Không áp dụng.')).toBeTruthy()
    fireEvent.change(o, { target: { value: '  Chưa có dự án  ' } })
    fireEvent.keyDown(o, { key: 'Enter' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(thucHanh().textContent).toContain('Lý do: "Chưa có dự án"')
    expect(thucHanh().textContent).toContain('Bước Áp dụng · Không áp dụng')
    expect(within(thucHanh()).queryByRole('textbox')).toBeNull()
    expect(nut.textContent).toBe('Bỏ đánh dấu')
    await waitFor(() => expect(document.activeElement).toBe(nut))
    await waitFor(() => expect(sv.hoc.mucCua(ID).thucHanh.lyDo).toBe('Chưa có dự án'))
    const toast = await screen.findByText(/Đã đánh dấu Không áp dụng:/)
    expect(toast.closest('[role="status"], li, div')).toBeTruthy()
    fireEvent.click(nut)
    await waitFor(() => expect(sv.hoc.mucCua(ID).thucHanh.trangThai).toBeNull())
    expect(nut.textContent).toBe('Không áp dụng (ghi lý do)')
  })

  it('dự án: chọn là lưu; "Thêm dự án" → dialog (tên bắt buộc) → POST rồi chọn luôn dự án mới', async () => {
    sv.hoc.duAn.push({ id: 3, ten: 'Dự án A', vaiTro: null, giaiDoan: 'Execution' })
    dungThanBai()
    await daTai()
    const chon = (await within(thucHanh()).findByRole('combobox', {
      name: 'Dự án',
    })) as HTMLSelectElement
    await waitFor(() => expect(chon.disabled).toBe(false))
    expect([...chon.options].map((o) => o.textContent)).toEqual([
      'Chưa chọn dự án',
      'Dự án A · Execution',
    ])
    fireEvent.change(chon, { target: { value: '3' } })
    await waitFor(() => expect(sv.hoc.mucCua(ID).thucHanh.duAnId).toBe(3))

    fireEvent.click(within(thucHanh()).getByRole('button', { name: 'Thêm dự án' }))
    const dialog = await screen.findByRole('dialog', { name: 'Thêm dự án' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Thêm dự án' }))
    expect(within(dialog).getByText('Ghi tên dự án.')).toBeTruthy()
    expect(sv.hoc.dem('POST /api/du-an')).toBe(0)
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Tên dự án' }), {
      target: { value: 'Cổng mới' },
    })
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Giai đoạn/ }), {
      target: { value: 'Planning' },
    })
    await expectNoAxeViolations(dialog)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Thêm dự án' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(sv.hoc.cacLan('POST /api/du-an')[0].body).toEqual({
      ten: 'Cổng mới',
      giaiDoan: 'Planning',
    })
    await waitFor(() => expect(sv.hoc.mucCua(ID).thucHanh.duAnId).toBe(11))
    expect(chon.value).toBe('11')
  })

  it('khối viết khác quy ước: thân là Markdown thường, vẫn có phần làm bài (không có ô tick tiêu chí)', async () => {
    dungThanBai({ thay: { 'Thực hành trên dự án thật': giuCho('Thực hành viết tự do') } })
    await daTai()
    const th = thucHanh()
    expect(th.textContent).toContain('[Nội dung mẫu — Thực hành viết tự do]')
    expect(within(th).queryByRole('checkbox')).toBeNull()
    expect(within(th).getByRole('textbox', { name: 'Kết quả của bạn' })).toBeTruthy()
    expect(within(th).getByRole('button', { name: 'Xong' })).toBeTruthy()
  })
})

describe('Tự kiểm tra C21 (bước Kiểm tra; §1, đề xuất 3.2, quyết định 7)', () => {
  const cau1 = () => within(tuKiemTra()).getAllByRole('listitem')[0]

  it('chưa trả lời: "Xem đáp án" tắt + câu F11; tự chấm và Tạo flashcard tắt; đáp án không có trong trang; axe', async () => {
    const { container } = dungThanBai()
    await daTai()
    const c = cau1()
    expect(c.textContent).toContain('Câu 1/2')
    const xem = within(c).getByRole('button', { name: 'Xem đáp án' }) as HTMLButtonElement
    expect(xem.disabled).toBe(true)
    expect(c.textContent).toContain('Viết câu trả lời để mở đáp án.')
    const cham = within(c).getByRole('group', { name: 'Tự chấm' })
    expect(
      within(cham)
        .getAllByRole('button')
        .map((b) => [b.textContent, (b as HTMLButtonElement).disabled]),
    ).toEqual([
      ['Đúng', true],
      ['Một phần', true],
      ['Sai', true],
      ['Tạo flashcard', true],
    ])
    // F11: nút tự chấm đệm ngang 12 (px-3), không phải 10 của nút nhỏ
    for (const ten of ['Đúng', 'Một phần', 'Sai']) {
      expect(within(cham).getByRole('button', { name: ten }).className).toContain('px-3!')
    }
    expect(tuKiemTra().textContent).not.toContain('Đáp án 1')
    await expectNoAxeViolations(container)
  })

  it('trả lời → Xem đáp án bật → gửi kèm câu trả lời; đáp án hiện + nhận focus; chấm → giữ lần mới nhất (aria-pressed)', async () => {
    dungThanBai()
    await daTai()
    const c = cau1()
    const o = within(c).getByRole('textbox', { name: 'Câu trả lời của bạn' })
    fireEvent.focus(o)
    fireEvent.change(o, { target: { value: 'Trả lời của tôi' } })
    const xem = within(c).getByRole('button', { name: 'Xem đáp án' }) as HTMLButtonElement
    expect(xem.disabled).toBe(false)
    fireEvent.click(xem)
    const dapAn = await waitFor(() => c.querySelector('[data-dap-an]') as HTMLElement)
    expect(dapAn.textContent).toContain('Đáp án:')
    expect(dapAn.textContent).toContain('[Nội dung mẫu — Đáp án 1]')
    expect(document.activeElement).toBe(dapAn)
    await waitFor(() =>
      expect(
        sv.hoc.dem(
          `PUT ${GOC}/tu-kiem-tra/${encodeURIComponent(cacKhoaCauHoi(baiScopeCreep().cacO)[0])}`,
        ),
      ).toBe(1),
    )
    const khoa = cacKhoaCauHoi(baiScopeCreep().cacO)[0]
    expect(sv.hoc.cacLan(`PUT ${GOC}/tu-kiem-tra/${encodeURIComponent(khoa)}`)[0].body).toEqual({
      daXem: true,
      traLoi: 'Trả lời của tôi',
    })
    const cham = within(c).getByRole('group', { name: 'Tự chấm' })
    fireEvent.click(within(cham).getByRole('button', { name: /^Một phần/ }))
    await waitFor(() =>
      expect(
        within(cham)
          .getByRole('button', { name: /^Một phần/ })
          .getAttribute('aria-pressed'),
      ).toBe('true'),
    )
    expect(within(cham).getByRole('button', { name: /^Một phần/ }).textContent).toBe('Một phần✓')
    fireEvent.click(within(cham).getByRole('button', { name: /^Sai/ }))
    await waitFor(() => expect(sv.hoc.mucCua(ID).tuKiemTra[khoa].cham).toBe('sai'))
    expect(
      within(cham)
        .getByRole('button', { name: /^Một phần/ })
        .getAttribute('aria-pressed'),
    ).toBe('false')
    expect(within(cham).getByRole('button', { name: /^Sai/ }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })

  it('Tạo flashcard (sau khi xem đáp án) mở hộp thoại thẻ điền sẵn H/Đ + khoá câu', async () => {
    const khoa = cacKhoaCauHoi(baiScopeCreep().cacO)[0]
    sv.hoc.mucCua(ID).tuKiemTra[khoa] = {
      traLoi: 'Đã trả lời',
      daXem: true,
      cham: 'dung',
      chamLuc: null,
    }
    dungThanBai()
    await daTai()
    const nut = within(cau1()).getByRole('button', { name: 'Tạo flashcard' }) as HTMLButtonElement
    await waitFor(() => expect(nut.disabled).toBe(false))
    fireEvent.click(nut)
    await screen.findByRole('dialog', { name: 'Hộp thoại thẻ giả' })
    const mo = theMo.props.filter((p) => p.mo).at(-1)!
    expect(mo.itemId).toBe(ID)
    expect(mo.giaTriDau?.khoaCau).toBe(khoa)
    expect(mo.giaTriDau?.truoc).toContain('[Nội dung mẫu — Câu hỏi 1]')
    expect(mo.giaTriDau?.sau).toContain('[Nội dung mẫu — Đáp án 1]')
  })

  it('câu trả lời có khoá không còn trong bài: thu gọn "Câu trả lời cho câu hỏi cũ (1)", không xoá', async () => {
    sv.hoc.mucCua(ID).tuKiemTra['khoacu123'] = {
      traLoi: 'Câu trả lời cũ',
      daXem: true,
      cham: 'mot-phan',
      chamLuc: null,
    }
    const { container } = dungThanBai()
    await daTai()
    const tieuDe = await within(tuKiemTra()).findByText('Câu trả lời cho câu hỏi cũ (1)')
    const chiTiet = tieuDe.closest('details')!
    expect(chiTiet.open).toBe(false)
    expect(chiTiet.textContent).toContain('Câu trả lời cũ')
    expect(chiTiet.textContent).toContain('Lần tự chấm cuối: Một phần')
    expect(sv.hoc.yeuCau.some((y) => y.method !== 'GET')).toBe(false)
    await expectNoAxeViolations(container)
  })

  it('câu trả lời cũ có chữ câu hỏi lúc lưu (server ghi): hiện câu hỏi (Markdown trong dòng) trên câu trả lời', async () => {
    sv.hoc.mucCua(ID).tuKiemTra['khoacu456'] = {
      traLoi: 'Trả lời cho câu đã bỏ',
      daXem: false,
      cham: null,
      chamLuc: null,
      cauHoi: '[Nội dung mẫu — Câu hỏi đã bỏ] Câu **giữ chỗ**?',
    }
    sv.hoc.mucCua(ID).tuKiemTra['khoacu789'] = {
      traLoi: 'Trả lời không rõ câu',
      daXem: false,
      cham: null,
      chamLuc: null,
      cauHoi: null,
    }
    const { container } = dungThanBai()
    await daTai()
    const tieuDe = await within(tuKiemTra()).findByText('Câu trả lời cho câu hỏi cũ (2)')
    const chiTiet = tieuDe.closest('details')!
    const cacCau = [...chiTiet.querySelectorAll('li')]
    expect(cacCau).toHaveLength(2)
    const cauHoi = cacCau[0].querySelector('[data-cau-hoi-cu]')!
    expect(cauHoi.textContent).toBe('[Nội dung mẫu — Câu hỏi đã bỏ] Câu giữ chỗ?')
    expect(cauHoi.querySelector('strong')?.textContent).toBe('giữ chỗ')
    expect(cacCau[0].textContent).toContain('Trả lời cho câu đã bỏ')
    // Chưa biết chữ câu hỏi: chỉ câu trả lời
    expect(cacCau[1].querySelector('[data-cau-hoi-cu]')).toBeNull()
    expect(cacCau[1].textContent).toBe('Trả lời không rõ câu')
    await expectNoAxeViolations(container)
  })

  it('cacKhoaCauHoi: chỉ câu của khối theo quy ước, theo thứ tự; bài không có Tự kiểm tra → []', () => {
    expect(cacKhoaCauHoi(baiScopeCreep().cacO)).toHaveLength(2)
    expect(cacKhoaCauHoi(baiScopeCreep({ bo: ['Tự kiểm tra'] }).cacO)).toEqual([])
    expect(
      cacKhoaCauHoi(baiScopeCreep({ thay: { 'Tự kiểm tra': giuCho('Không theo quy ước') } }).cacO),
    ).toEqual([])
  })
})

describe('Bản của tôi (Tài liệu), Kế hoạch thi của tôi (Chứng chỉ): thẻ Thực hành C20 (phạm vi rút gọn)', () => {
  const rr = muc('risk-register')
  const pmp = cay.mucHoc.find((m) => m.mau === 'chung-chi')!
  const NUT_KAD = 'Không áp dụng (ghi lý do)'

  it.each([
    [rr, 'ban-cua-toi', AP_DUNG_THEO_MAU['tai-lieu'].deBai, 'không cần bản của bạn', true],
    [pmp, 'ke-hoach-thi', AP_DUNG_THEO_MAU['chung-chi'].deBai, 'không cần kế hoạch thi', false],
  ] as const)(
    '%s: tên khối theo mẫu, "Đề bài" do app đặt, Kết quả, Xong; không có "Có ở phase"; Không áp dụng → PUT /api/hoc/:id/thuc-hanh; Bỏ đánh dấu → trangThai null; axe',
    async (m, kieu, deBai, moTaDialog, coDuAn) => {
      const khoiMau = MAU_BAI[m.mau].khoi.find((k) => k.kieu === kieu)!
      const { container } = dungVoiProvider(<KhoiApp khoi={khoiMau} muc={m} />)
      const k = () => document.getElementById(khoiMau.id) as HTMLElement
      const nut = within(k()).getByRole('button', { name: NUT_KAD }) as HTMLButtonElement
      await waitFor(() => expect(nut.disabled).toBe(false))
      expect(within(k()).getByRole('heading', { level: 2 }).textContent).toBe(khoiMau.tieuDe)
      expect(k().textContent).toContain(deBai)
      expect(within(k()).getByRole('textbox', { name: 'Kết quả của bạn' })).toBeTruthy()
      expect(within(k()).getByRole('button', { name: 'Xong' })).toBeTruthy()
      expect(within(k()).queryByRole('combobox', { name: 'Dự án' }) !== null).toBe(coDuAn)
      expect(k().textContent).toContain('Bước Áp dụng · chưa làm')
      expect(k().textContent).not.toContain('Có ở phase')
      await expectNoAxeViolations(container)
      nut.focus()
      fireEvent.click(nut)
      const dialog = await screen.findByRole('dialog', { name: 'Đánh dấu Không áp dụng' })
      expect(dialog.textContent).toContain(moTaDialog)
      fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Lý do riêng' } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
      await waitFor(() => expect(k().textContent).toContain('Lý do: "Lý do riêng"'))
      const url = `PUT /api/hoc/${encodeURIComponent(m.id)}/thuc-hanh`
      await waitFor(() => expect(sv.hoc.dem(url)).toBe(1))
      expect(sv.hoc.cacLan(url)[0].body).toEqual({
        trangThai: 'khong-ap-dung',
        lyDo: 'Lý do riêng',
      })
      expect(
        sv.bai.yeuCau.some((y) => y.method !== 'GET' && y.url.startsWith('/api/ap-dung')),
      ).toBe(false)
      expect(nut.textContent).toBe('Bỏ đánh dấu')
      fireEvent.click(nut)
      await waitFor(() => expect(sv.hoc.dem(url)).toBe(2))
      expect(sv.hoc.cacLan(url)[1].body).toEqual({ trangThai: null })
      await waitFor(() => expect(nut.textContent).toBe(NUT_KAD))
    },
  )

  it('lỗi đọc dữ liệu học: dòng lỗi + "Thử lại", nút tắt; Thử lại tải được thì bật', async () => {
    sv.hoc.loiTai = 1
    const khoiMau = MAU_BAI['tai-lieu'].khoi.find((k) => k.kieu === 'ban-cua-toi')!
    const { client } = dungVoiProvider(<KhoiApp khoi={khoiMau} muc={rr} />)
    void client
    const k = () => document.getElementById(khoiMau.id) as HTMLElement
    await within(k()).findByText(/Lỗi: không đọc được dữ liệu học/)
    expect((within(k()).getByRole('button', { name: NUT_KAD }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    fireEvent.click(within(k()).getByRole('button', { name: 'Thử lại' }))
    await waitFor(() =>
      expect(
        (within(k()).getByRole('button', { name: NUT_KAD }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
  })
})
