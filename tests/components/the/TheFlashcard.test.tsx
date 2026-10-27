// @vitest-environment jsdom
// C22 card Flashcard + hộp thoại tạo / sửa thẻ (src/components/the; đề xuất 3.5, 4.3, 5) trên máy chủ giả của lớp dữ
// liệu học: tiêu đề "Flashcard · n thẻ", dòng "Hộp n · ôn lại dd/MM/yyyy", trống theo F15; "Tạo thẻ" điền sẵn tên mục,
// lỗi ô trống (C36), ⌘/Ctrl+Enter lưu (không khi đang ghép chữ), lỗi máy chủ giữ chữ, bản tạm nhap-tam; sửa; xoá qua
// alertdialog + toast "Đã xoá thẻ" + Hoàn tác (cùng id); focus sau mỗi bước; axe.
import { StrictMode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layCay } from '../../../shared/roadmap'
import { ToastProvider } from '../../../src/components/Toast'
import TheFlashcard, { dongHopHan } from '../../../src/components/the/TheFlashcard'
import HopThoaiThe, { khoaNhapThe } from '../../../src/components/the/HopThoaiThe'
import { docNhapTam } from '../../../src/app/nhap-tam'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { taoGiaMayChuHoc, type GiaMayChuHoc } from '../../app/du-lieu/hoc-gia-may-chu'

const muc = layCay().mucHoc.find((m) => m.mau === 'chu-de')!
const ID = muc.id

let sv: GiaMayChuHoc

beforeEach(() => {
  sv = taoGiaMayChuHoc()
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function taoClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  })
}

function moCard() {
  return render(
    <StrictMode>
      <QueryClientProvider client={taoClient()}>
        <ToastProvider>
          <h1 id="tieu-de-trang" tabIndex={-1}>
            Trang
          </h1>
          <TheFlashcard muc={muc} />
        </ToastProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

const the = (id: number, truoc: string, hop: number, hanOn: string) => ({
  id,
  itemId: ID,
  truoc,
  sau: `Đáp ${id}`,
  hop,
  hanOn,
  khoaCau: null,
})

const card = () => document.getElementById('flashcard')!
const tieuDe = () => within(card()).getByRole('heading', { level: 2 })
const cacThe = () => within(card()).queryAllByRole('listitem')
const nutTao = () => within(card()).getByRole('button', { name: 'Tạo thẻ' })
const hopThoai = () => screen.getByRole('dialog')
const oTruoc = () => within(hopThoai()).getByLabelText('Mặt trước') as HTMLTextAreaElement
const oSau = () => within(hopThoai()).getByLabelText('Mặt sau') as HTMLTextAreaElement

describe('card Flashcard (C22, F11, F15)', () => {
  it('"Flashcard · n thẻ", mỗi thẻ: mặt trước + "Hộp n · ôn lại dd/MM/yyyy", nút Sửa / Xoá có mô tả; neo #flashcard; axe', async () => {
    sv.the.push(the(1, 'Thẻ một', 2, '2026-10-24'), the(2, 'Thẻ hai', 1, '2026-10-23'))
    const { container } = moCard()
    await waitFor(() => expect(cacThe()).toHaveLength(2))
    expect(tieuDe().textContent).toBe('Flashcard · 2 thẻ')
    expect(card().getAttribute('aria-labelledby')).toBe(tieuDe().id)
    expect(card().tabIndex).toBe(-1)
    expect(cacThe()[0].textContent).toContain('Thẻ một')
    expect(cacThe()[0].textContent).toContain('Hộp 2 · ôn lại 24/10/2026')
    expect(cacThe()[1].textContent).toContain('Hộp 1 · ôn lại 23/10/2026')
    const sua = within(cacThe()[0]).getByRole('button', { name: 'Sửa thẻ' })
    expect(sua.getAttribute('aria-describedby')).toBeTruthy()
    expect(document.getElementById(sua.getAttribute('aria-describedby')!)!.textContent).toBe(
      'Thẻ một',
    )
    expect(within(cacThe()[1]).getByRole('button', { name: 'Xoá thẻ' })).toBeTruthy()
    await expectNoAxeViolations(container)
  })

  it('dongHopHan: hộp + ngày dd/MM/yyyy (F11)', () => {
    expect(dongHopHan({ hop: 5, hanOn: '2027-01-03' })).toBe('Hộp 5 · ôn lại 03/01/2027')
  })

  it('chưa có thẻ: "Flashcard" + câu F15, "Tạo thẻ" bật; đang tải: "Tạo thẻ" tắt', async () => {
    moCard()
    expect(nutTao().hasAttribute('disabled')).toBe(true)
    await waitFor(() => expect(nutTao().hasAttribute('disabled')).toBe(false))
    expect(tieuDe().textContent).toBe('Flashcard')
    expect(card().textContent).toContain('Chưa có thẻ cho mục này. Bước Ghi nhớ cần ít nhất 1 thẻ.')
    expect(cacThe()).toHaveLength(0)
  })

  it('tải lỗi: dòng lỗi + "Thử lại" tải lại được', async () => {
    sv.loiTai = 1
    moCard()
    fireEvent.click(await within(card()).findByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(tieuDe().textContent).toBe('Flashcard'))
    expect(card().textContent).not.toContain('không đọc được')
  })

  it('không có QueryClientProvider: card vẫn có neo, "Tạo thẻ" tắt, không gọi API', () => {
    render(<TheFlashcard muc={muc} />)
    expect(card().tabIndex).toBe(-1)
    expect(nutTao().hasAttribute('disabled')).toBe(true)
    expect(sv.yeuCau).toHaveLength(0)
  })
})

describe('tạo thẻ (HopThoaiThe; đề xuất 3.5 "Tạo thẻ" điền sẵn tên mục)', () => {
  it('mở: tiêu đề "Tạo thẻ" + tên mục (lang=en), Mặt trước điền sẵn tên mục và có focus; axe trên dialog', async () => {
    moCard()
    await waitFor(() => expect(nutTao().hasAttribute('disabled')).toBe(false))
    fireEvent.click(nutTao())
    const d = hopThoai()
    expect(within(d).getByRole('heading', { name: 'Tạo thẻ' })).toBeTruthy()
    expect(d.querySelector('[lang="en"]')?.textContent).toBe(muc.label)
    expect(oTruoc().value).toBe(muc.label)
    expect(oSau().value).toBe('')
    expect(document.activeElement).toBe(oTruoc())
    // Con trỏ cuối chữ điền sẵn để gõ tiếp
    expect(oTruoc().selectionStart).toBe(muc.label.length)
    expect(oTruoc().hasAttribute('lang')).toBe(false)
    await expectNoAxeViolations(document.body)
  })

  it('ô trống: câu lỗi C36 (aria-invalid), không gửi; gõ chữ gỡ lỗi', async () => {
    moCard()
    await waitFor(() => expect(nutTao().hasAttribute('disabled')).toBe(false))
    fireEvent.click(nutTao())
    fireEvent.change(oTruoc(), { target: { value: '   ' } })
    fireEvent.click(within(hopThoai()).getByRole('button', { name: 'Tạo thẻ' }))
    expect(within(hopThoai()).getByText('Ghi mặt trước của thẻ.')).toBeTruthy()
    expect(within(hopThoai()).getByText('Ghi mặt sau của thẻ.')).toBeTruthy()
    expect(oTruoc().getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(oTruoc())
    expect(sv.dem('POST /api/the')).toBe(0)
    fireEvent.change(oTruoc(), { target: { value: 'Câu hỏi' } })
    expect(within(hopThoai()).queryByText('Ghi mặt trước của thẻ.')).toBeNull()
    await expectNoAxeViolations(document.body)
  })

  it('⌘/Ctrl+Enter lưu (không khi đang ghép chữ): POST, dialog đóng, thẻ mới hiện, toast "Đã tạo thẻ", focus về "Tạo thẻ"', async () => {
    moCard()
    await waitFor(() => expect(nutTao().hasAttribute('disabled')).toBe(false))
    nutTao().focus()
    fireEvent.click(nutTao())
    fireEvent.change(oSau(), { target: { value: 'Đáp án mới' } })
    // Enter thường xuống dòng; ⌘+Enter lúc Telex đang ghép chữ không lưu
    fireEvent.keyDown(oSau(), { key: 'Enter' })
    fireEvent.keyDown(oSau(), { key: 'Enter', metaKey: true, isComposing: true })
    fireEvent.keyDown(oSau(), { key: 'Enter', ctrlKey: true, keyCode: 229 })
    expect(sv.dem('POST /api/the')).toBe(0)
    fireEvent.keyDown(oSau(), { key: 'Enter', metaKey: true })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(sv.cacLan('POST /api/the')[0].body).toEqual({
      itemId: ID,
      truoc: muc.label,
      sau: 'Đáp án mới',
    })
    await waitFor(() => expect(cacThe()).toHaveLength(1))
    expect(tieuDe().textContent).toBe('Flashcard · 1 thẻ')
    expect(cacThe()[0].textContent).toContain('Hộp 1 · ôn lại 23/10/2026')
    expect(screen.getByText('Đã tạo thẻ')).toBeTruthy()
    expect(document.activeElement).toBe(nutTao())
    expect(docNhapTam(khoaNhapThe(ID))).toBeNull()
  })

  it('đang gõ thì giữ bản tạm (nhap-tam); lỗi máy chủ: câu lỗi trong dialog, giữ chữ; Thử lại lưu được', async () => {
    moCard()
    await waitFor(() => expect(nutTao().hasAttribute('disabled')).toBe(false))
    fireEvent.click(nutTao())
    fireEvent.change(oSau(), { target: { value: 'Đáp án' } })
    expect(JSON.parse(docNhapTam(khoaNhapThe(ID))!)).toEqual({ truoc: muc.label, sau: 'Đáp án' })
    sv.loiGhi = 1
    fireEvent.click(within(hopThoai()).getByRole('button', { name: 'Tạo thẻ' }))
    expect(await within(hopThoai()).findByRole('alert')).toBeTruthy()
    expect(oSau().value).toBe('Đáp án')
    fireEvent.click(within(hopThoai()).getByRole('button', { name: 'Tạo thẻ' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(cacThe()).toHaveLength(1))
  })

  it('hồi quy: Esc (hoặc X) sau khi gõ → đóng nhưng GIỮ bản tạm, mở lại vẫn còn chữ; chỉ Huỷ mới bỏ', async () => {
    moCard()
    await waitFor(() => expect(nutTao().hasAttribute('disabled')).toBe(false))
    fireEvent.click(nutTao())
    fireEvent.change(oSau(), { target: { value: 'Mặt sau đã gõ' } })
    fireEvent.keyDown(hopThoai(), { key: 'Escape', code: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(JSON.parse(docNhapTam(khoaNhapThe(ID))!).sau).toBe('Mặt sau đã gõ')
    fireEvent.click(nutTao())
    expect(oSau().value).toBe('Mặt sau đã gõ')
    fireEvent.click(within(hopThoai()).getByRole('button', { name: 'Đóng' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(docNhapTam(khoaNhapThe(ID))).not.toBeNull()
  })

  it('hồi quy: đã gõ thì bấm ra ngoài KHÔNG đóng; chưa gõ gì thì bấm ra ngoài đóng như thường', async () => {
    moCard()
    await waitFor(() => expect(nutTao().hasAttribute('disabled')).toBe(false))
    /** Bấm chuột trái ra ngoài (Radix hoãn việc đóng tới lúc click; chỉ nghe sau một nhịp kể từ lúc mở). */
    async function bamRaNgoai() {
      await new Promise((r) => setTimeout(r, 0))
      const b = document.body
      fireEvent.pointerDown(b, { button: 0 })
      fireEvent.mouseDown(b, { button: 0 })
      fireEvent.pointerUp(b, { button: 0 })
      fireEvent.mouseUp(b, { button: 0 })
      fireEvent.click(b, { button: 0 })
    }
    fireEvent.click(nutTao())
    await bamRaNgoai()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(nutTao())
    fireEvent.change(oSau(), { target: { value: 'Đang gõ dở' } })
    await bamRaNgoai()
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(oSau().value).toBe('Đang gõ dở')
  })

  it('hồi quy: đang lưu thì không đóng được (Esc, Huỷ tắt); lưu lỗi → câu lỗi hiện trong hộp thoại, chữ còn', async () => {
    moCard()
    await waitFor(() => expect(nutTao().hasAttribute('disabled')).toBe(false))
    fireEvent.click(nutTao())
    fireEvent.change(oSau(), { target: { value: 'Đáp án' } })
    sv.dongCua()
    sv.loiGhi = 1
    fireEvent.click(within(hopThoai()).getByRole('button', { name: 'Tạo thẻ' }))
    await waitFor(() => expect(sv.soDangGiu()).toBe(1))
    expect(
      (within(hopThoai()).getByRole('button', { name: 'Huỷ' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    fireEvent.keyDown(hopThoai(), { key: 'Escape', code: 'Escape' })
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.getByRole('dialog')).toBeTruthy()
    sv.moCua()
    expect(await within(hopThoai()).findByRole('alert')).toBeTruthy()
    expect(oSau().value).toBe('Đáp án')
    expect(cacThe()).toHaveLength(0)
  })

  it('mở lại sau khi tải lại trang: bắt đầu từ bản tạm; Huỷ bỏ bản tạm', async () => {
    const khoa = khoaNhapThe(ID)
    sessionStorage.setItem(
      `hoc-pm-a-z:nhap-tam:${khoa}`,
      JSON.stringify({ truoc: 'Bản tạm trước', sau: 'Bản tạm sau' }),
    )
    moCard()
    await waitFor(() => expect(nutTao().hasAttribute('disabled')).toBe(false))
    fireEvent.click(nutTao())
    expect(oTruoc().value).toBe('Bản tạm trước')
    expect(oSau().value).toBe('Bản tạm sau')
    fireEvent.click(within(hopThoai()).getByRole('button', { name: 'Huỷ' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(docNhapTam(khoa)).toBeNull()
    fireEvent.click(nutTao())
    expect(oTruoc().value).toBe(muc.label)
  })

  it('từ câu Tự kiểm tra: giaTriDau H/Đ + khoaCau gửi kèm, bản tạm riêng từng câu', async () => {
    function Mo() {
      return (
        <HopThoaiThe
          mo
          doiMo={() => {}}
          itemId={ID}
          giaTriDau={{ truoc: 'Hỏi?', sau: 'Đáp.', khoaCau: 'cau-1' }}
        />
      )
    }
    render(
      <QueryClientProvider client={taoClient()}>
        <ToastProvider>
          <Mo />
        </ToastProvider>
      </QueryClientProvider>,
    )
    expect(oTruoc().value).toBe('Hỏi?')
    expect(oSau().value).toBe('Đáp.')
    fireEvent.change(oSau(), { target: { value: 'Đáp khác.' } })
    expect(docNhapTam(khoaNhapThe(ID, undefined, 'cau-1'))).not.toBeNull()
    expect(docNhapTam(khoaNhapThe(ID))).toBeNull()
    fireEvent.click(within(hopThoai()).getByRole('button', { name: 'Tạo thẻ' }))
    await waitFor(() => expect(sv.dem('POST /api/the')).toBe(1))
    expect(sv.cacLan('POST /api/the')[0].body).toEqual({
      itemId: ID,
      truoc: 'Hỏi?',
      sau: 'Đáp khác.',
      khoaCau: 'cau-1',
    })
  })

  it('không có QueryClientProvider: không vẽ gì', () => {
    render(<HopThoaiThe mo doiMo={() => {}} itemId={ID} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('sửa thẻ', () => {
  it('"Sửa thẻ": điền sẵn hai mặt, Lưu → PUT, thẻ đổi, focus về nút Sửa', async () => {
    sv.the.push(the(7, 'Trước cũ', 3, '2026-10-26'))
    moCard()
    await waitFor(() => expect(cacThe()).toHaveLength(1))
    const sua = within(cacThe()[0]).getByRole('button', { name: 'Sửa thẻ' })
    sua.focus()
    fireEvent.click(sua)
    expect(within(hopThoai()).getByRole('heading', { name: 'Sửa thẻ' })).toBeTruthy()
    expect(oTruoc().value).toBe('Trước cũ')
    expect(oSau().value).toBe('Đáp 7')
    fireEvent.change(oTruoc(), { target: { value: 'Trước mới' } })
    fireEvent.click(within(hopThoai()).getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(sv.cacLan('PUT /api/the/7')[0].body).toEqual({ truoc: 'Trước mới', sau: 'Đáp 7' })
    expect(cacThe()[0].textContent).toContain('Trước mới')
    expect(cacThe()[0].textContent).toContain('Hộp 3 · ôn lại 26/10/2026')
    expect(document.activeElement).toBe(sua)
    expect(screen.queryByText('Đã tạo thẻ')).toBeNull()
  })
})

describe('xoá thẻ (alertdialog + Hoàn tác; đề xuất 3.5, 5)', () => {
  async function moXoa() {
    sv.the.push(the(1, 'Thẻ một', 2, '2026-10-24'), the(2, 'Thẻ hai', 1, '2026-10-23'))
    const kq = moCard()
    await waitFor(() => expect(cacThe()).toHaveLength(2))
    const xoa = within(cacThe()[0]).getByRole('button', { name: 'Xoá thẻ' })
    fireEvent.click(xoa)
    return { ...kq, xoa }
  }

  it('alertdialog "Xoá thẻ này?" + mặt trước + mô tả, focus sẵn "Huỷ"; Huỷ không xoá, focus về nút Xoá; axe', async () => {
    const { xoa } = await moXoa()
    const d = screen.getByRole('alertdialog')
    expect(within(d).getByRole('heading', { name: 'Xoá thẻ này?' })).toBeTruthy()
    expect(d.textContent).toContain('Thẻ một')
    expect(d.textContent).toContain('Sau khi xoá, bạn có 5 giây để bấm Hoàn tác.')
    expect(document.activeElement).toBe(within(d).getByRole('button', { name: 'Huỷ' }))
    await expectNoAxeViolations(document.body)
    fireEvent.click(within(d).getByRole('button', { name: 'Huỷ' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    // Radix trả focus ở nhịp sau (setTimeout 0)
    await waitFor(() => expect(document.activeElement).toBe(xoa))
    expect(sv.dem('DELETE /api/the/1')).toBe(0)
    expect(cacThe()).toHaveLength(2)
  })

  it('Xoá thẻ: DELETE, thẻ mất, focus về nút "Tạo thẻ" (thấy được vòng focus), toast "Đã xoá thẻ" + Hoàn tác → khôi phục cùng id, hộp, hạn', async () => {
    await moXoa()
    const d = screen.getByRole('alertdialog')
    fireEvent.click(within(d).getByRole('button', { name: 'Xoá thẻ' }))
    await waitFor(() => expect(cacThe()).toHaveLength(1))
    // Hồi quy review: focus từng về <section> có focus:outline-none — người dùng bàn phím không thấy focus ở đâu
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Tạo thẻ' })),
    )
    expect(document.activeElement).not.toBe(card())
    expect(tieuDe().textContent).toBe('Flashcard · 1 thẻ')
    await waitFor(() => expect(sv.dem('DELETE /api/the/1')).toBe(1))
    expect(screen.getByText('Đã xoá thẻ')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    await waitFor(() => expect(cacThe()).toHaveLength(2))
    expect(sv.dem('POST /api/the/1/khoi-phuc')).toBe(1)
    const khoiPhuc = cacThe().find((li) => li.textContent?.includes('Thẻ một'))!
    expect(khoiPhuc.textContent).toContain('Hộp 2 · ôn lại 24/10/2026')
  })
})
