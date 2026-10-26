// @vitest-environment jsdom
// Bộ xử lý phím toàn cục (§11, đề xuất 5): so theo e.code, bỏ qua khi đang gõ / IME ghép chữ /
// giữ Alt-Ctrl-⌘, Shift chỉ cho "?"; usePhimTat đăng ký theo lớp; PhimTatProvider mở F27.
import { useState, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PhimTatProvider,
  laChoGo,
  useMoBangPhimTat,
  usePhimTat,
  type MaPhimToanCuc,
} from '../../../src/app/phim-tat'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

const choMotNhip = () => act(() => new Promise((r) => setTimeout(r, 0)))

type XuLy = (e: KeyboardEvent) => void

function DangKy({ ma, xuLy, enabled }: { ma: MaPhimToanCuc; xuLy: XuLy; enabled?: boolean }) {
  usePhimTat(ma, xuLy, { enabled })
  return null
}

/** Gõ một phím lên phần tử (mặc định body); trả về sự kiện để xem defaultPrevented. */
function go(init: KeyboardEventInit & { keyCode?: number }, dich: Element = document.body) {
  const { keyCode, ...khac } = init
  const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...khac })
  if (keyCode !== undefined) Object.defineProperty(e, 'keyCode', { value: keyCode })
  act(() => {
    dich.dispatchEvent(e)
  })
  return e
}

function khung(ma: MaPhimToanCuc, them?: ReactNode) {
  const xuLy = vi.fn<XuLy>()
  render(
    <PhimTatProvider>
      <DangKy ma={ma} xuLy={xuLy} />
      {them}
    </PhimTatProvider>,
  )
  return xuLy
}

describe('so theo e.code (vị trí phím vật lý)', () => {
  it('"[" khi Telex biến thành "ơ": key "ơ", code BracketLeft vẫn nhận', () => {
    const xuLy = khung('BracketLeft')
    const e = go({ key: 'ơ', code: 'BracketLeft' })
    expect(xuLy).toHaveBeenCalledTimes(1)
    expect(e.defaultPrevented).toBe(true)
  })

  it('key "[" nhưng code khác thì không nhận', () => {
    const xuLy = khung('BracketLeft')
    go({ key: '[', code: 'BracketRight' })
    go({ key: '[', code: '' })
    expect(xuLy).not.toHaveBeenCalled()
  })

  it('"]" và chữ số theo code', () => {
    const phai = vi.fn<XuLy>()
    const so3 = vi.fn<XuLy>()
    render(
      <PhimTatProvider>
        <DangKy ma="BracketRight" xuLy={phai} />
        <DangKy ma="Digit3" xuLy={so3} />
      </PhimTatProvider>,
    )
    go({ key: 'ư', code: 'BracketRight' })
    go({ key: '3', code: 'Digit3' })
    go({ key: '3', code: 'Numpad3' })
    expect(phai).toHaveBeenCalledTimes(1)
    expect(so3).toHaveBeenCalledTimes(1)
  })
})

describe('bỏ qua khi đang gõ', () => {
  const choGo = [
    '<input type="text">',
    '<input type="search">',
    '<input>',
    '<textarea></textarea>',
    '<select><option>a</option></select>',
    '<div contenteditable="true"><p><b>x</b></p></div>',
    '<div class="cm-editor"><div class="cm-content">x</div></div>',
    '<div role="textbox" tabindex="0">x</div>',
  ]

  for (const html of choGo) {
    it(`focus ở ${html}`, () => {
      const xuLy = khung('Slash')
      const vung = document.createElement('div')
      vung.innerHTML = html
      document.body.append(vung)
      const dich = vung.querySelector('b, .cm-content, input, textarea, select, [role]') ?? vung
      expect(laChoGo(dich)).toBe(true)
      const e = go({ key: '/', code: 'Slash' }, dich)
      expect(xuLy).not.toHaveBeenCalled()
      expect(e.defaultPrevented).toBe(false)
      vung.remove()
    })
  }

  it('checkbox, nút: không phải chỗ gõ, phím tắt vẫn chạy', () => {
    const xuLy = khung('Slash')
    const vung = document.createElement('div')
    vung.innerHTML = '<input type="checkbox"><button type="button">b</button>'
    document.body.append(vung)
    for (const dich of vung.children) {
      expect(laChoGo(dich)).toBe(false)
      go({ key: '/', code: 'Slash' }, dich)
    }
    expect(xuLy).toHaveBeenCalledTimes(2)
    vung.remove()
  })

  it('contenteditable="false" không phải chỗ gõ', () => {
    const vung = document.createElement('div')
    vung.innerHTML = '<div contenteditable="false"><span>x</span></div>'
    expect(laChoGo(vung.querySelector('span'))).toBe(false)
  })
})

describe('IME, phím bổ trợ, lặp', () => {
  it('Telex/VNI đang ghép chữ (isComposing hoặc keyCode 229) → bỏ qua', () => {
    const xuLy = khung('BracketLeft')
    go({ key: 'ơ', code: 'BracketLeft', isComposing: true })
    go({ key: 'Process', code: 'BracketLeft', keyCode: 229 })
    expect(xuLy).not.toHaveBeenCalled()
  })

  it('giữ Alt / Ctrl / ⌘ → bỏ qua, không chặn tổ hợp của trình duyệt', () => {
    const xuLy = khung('Slash')
    for (const mod of ['altKey', 'ctrlKey', 'metaKey'] as const) {
      const e = go({ key: '/', code: 'Slash', [mod]: true })
      expect(e.defaultPrevented).toBe(false)
    }
    expect(xuLy).not.toHaveBeenCalled()
  })

  it('Shift chỉ cho "?" (Shift + Slash)', () => {
    const hoi = vi.fn<XuLy>()
    const gach = vi.fn<XuLy>()
    const trai = vi.fn<XuLy>()
    render(
      <>
        <PhimTatProvider>
          <DangKy ma="Slash" xuLy={gach} />
          <DangKy ma="BracketLeft" xuLy={trai} />
        </PhimTatProvider>
        <DangKyHoi xuLy={hoi} />
      </>,
    )
    go({ key: '?', code: 'Slash', shiftKey: true })
    expect(hoi).toHaveBeenCalledTimes(1)
    expect(gach).not.toHaveBeenCalled()
    go({ key: '/', code: 'Slash' })
    expect(gach).toHaveBeenCalledTimes(1)
    expect(hoi).toHaveBeenCalledTimes(1)
    go({ key: '{', code: 'BracketLeft', shiftKey: true })
    expect(trai).not.toHaveBeenCalled()
  })

  it('giữ phím (repeat) hoặc sự kiện đã bị chặn → bỏ qua', () => {
    const xuLy = khung('KeyT')
    go({ key: 't', code: 'KeyT', repeat: true })
    const e = new KeyboardEvent('keydown', { code: 'KeyT', bubbles: true, cancelable: true })
    e.preventDefault()
    document.body.dispatchEvent(e)
    expect(xuLy).not.toHaveBeenCalled()
  })

  it('phím không có trong sổ hoặc chưa ai đăng ký → không chặn', () => {
    khung('KeyT')
    expect(go({ key: 'm', code: 'KeyM' }).defaultPrevented).toBe(false)
    expect(go({ key: 'x', code: 'KeyX' }).defaultPrevented).toBe(false)
  })
})

describe('vùng tự xử lý phím', () => {
  it('menu, listbox, combobox: bỏ qua (typeahead của chúng)', () => {
    const xuLy = khung('KeyT')
    const vung = document.createElement('div')
    vung.innerHTML =
      '<div role="menu"><div role="menuitem" tabindex="-1">a</div></div><div role="listbox"><div role="option">b</div></div><button role="combobox">c</button>'
    document.body.append(vung)
    for (const dich of vung.querySelectorAll('[role=menuitem], [role=option], [role=combobox]'))
      go({ key: 't', code: 'KeyT' }, dich)
    expect(xuLy).not.toHaveBeenCalled()
    vung.remove()
  })

  it('Space trên nút, link là "bấm", không phải phím tắt; trên nền trang thì nhận', () => {
    const xuLy = khung('Space')
    const vung = document.createElement('div')
    vung.innerHTML = '<button type="button">a</button><a href="/x">b</a>'
    document.body.append(vung)
    for (const dich of vung.children) go({ key: ' ', code: 'Space' }, dich)
    expect(xuLy).not.toHaveBeenCalled()
    go({ key: ' ', code: 'Space' })
    expect(xuLy).toHaveBeenCalledTimes(1)
    vung.remove()
  })

  it('đang mở dialog modal → phím của trang không chạy', () => {
    const xuLy = khung('KeyT')
    const modal = document.createElement('div')
    modal.setAttribute('aria-modal', 'true')
    document.body.append(modal)
    go({ key: 't', code: 'KeyT' })
    expect(xuLy).not.toHaveBeenCalled()
    // Đang chạy hiệu ứng đóng: không còn chặn
    modal.dataset.state = 'closed'
    go({ key: 't', code: 'KeyT' })
    expect(xuLy).toHaveBeenCalledTimes(1)
    modal.remove()
    go({ key: 't', code: 'KeyT' })
    expect(xuLy).toHaveBeenCalledTimes(2)
  })
})

describe('usePhimTat', () => {
  it('enabled = false thì không nhận; bật lại thì nhận', () => {
    const xuLy = vi.fn<XuLy>()
    const { rerender } = render(
      <PhimTatProvider>
        <DangKy ma="KeyE" xuLy={xuLy} enabled={false} />
      </PhimTatProvider>,
    )
    go({ key: 'e', code: 'KeyE' })
    expect(xuLy).not.toHaveBeenCalled()
    rerender(
      <PhimTatProvider>
        <DangKy ma="KeyE" xuLy={xuLy} enabled />
      </PhimTatProvider>,
    )
    go({ key: 'e', code: 'KeyE' })
    expect(xuLy).toHaveBeenCalledTimes(1)
  })

  it('cùng phím: nơi đăng ký sau cùng nhận; gỡ đi thì nơi trước nhận lại', () => {
    const duoi = vi.fn<XuLy>()
    const tren = vi.fn<XuLy>()
    function Thu({ coTren }: { coTren: boolean }) {
      return (
        <PhimTatProvider>
          <DangKy ma="Digit1" xuLy={duoi} />
          {coTren && <DangKy ma="Digit1" xuLy={tren} />}
        </PhimTatProvider>
      )
    }
    const { rerender } = render(<Thu coTren={false} />)
    rerender(<Thu coTren />)
    go({ key: '1', code: 'Digit1' })
    expect(tren).toHaveBeenCalledTimes(1)
    expect(duoi).not.toHaveBeenCalled()
    rerender(<Thu coTren={false} />)
    go({ key: '1', code: 'Digit1' })
    expect(duoi).toHaveBeenCalledTimes(1)
  })

  it('luôn gọi hàm xử lý mới nhất (không cần useCallback)', () => {
    const cu = vi.fn<XuLy>()
    const moi = vi.fn<XuLy>()
    const { rerender } = render(
      <PhimTatProvider>
        <DangKy ma="KeyM" xuLy={cu} />
      </PhimTatProvider>,
    )
    rerender(
      <PhimTatProvider>
        <DangKy ma="KeyM" xuLy={moi} />
      </PhimTatProvider>,
    )
    go({ key: 'm', code: 'KeyM' })
    expect(cu).not.toHaveBeenCalled()
    expect(moi).toHaveBeenCalledTimes(1)
  })

  it('không có PhimTatProvider thì không có bộ nghe; lỡ gắn 2 provider, gỡ 1 vẫn chạy', () => {
    const xuLy = vi.fn<XuLy>()
    const { unmount } = render(<DangKy ma="KeyT" xuLy={xuLy} />)
    go({ key: 't', code: 'KeyT' })
    expect(xuLy).not.toHaveBeenCalled()
    unmount()

    function Hai({ coThuHai }: { coThuHai: boolean }) {
      return (
        <>
          <PhimTatProvider>
            <DangKy ma="KeyT" xuLy={xuLy} />
          </PhimTatProvider>
          {coThuHai && <PhimTatProvider>{null}</PhimTatProvider>}
        </>
      )
    }
    const { rerender } = render(<Hai coThuHai />)
    rerender(<Hai coThuHai={false} />)
    go({ key: 't', code: 'KeyT' })
    expect(xuLy).toHaveBeenCalledTimes(1)
  })
})

function DangKyHoi({ xuLy }: { xuLy: XuLy }) {
  usePhimTat('Shift+Slash', xuLy)
  return null
}

function NutMoBang() {
  const moBang = useMoBangPhimTat()
  return (
    <button type="button" onClick={moBang}>
      ?
    </button>
  )
}

describe('PhimTatProvider — "?" mở F27', () => {
  function ThuApp() {
    const [chu, datChu] = useState('')
    return (
      <PhimTatProvider>
        <NutMoBang />
        <label>
          Ghi chú
          <input value={chu} onChange={(e) => datChu(e.target.value)} />
        </label>
      </PhimTatProvider>
    )
  }

  it('Shift + Slash mở bảng, nút "Esc Đóng" nhận focus; Esc đóng, focus về chỗ cũ', async () => {
    render(<ThuApp />)
    const nut = screen.getByRole('button', { name: '?' })
    nut.focus()
    const e = go({ key: '?', code: 'Slash', shiftKey: true }, nut)
    expect(e.defaultPrevented).toBe(true)
    const dialog = screen.getByRole('dialog', { name: 'Phím tắt' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Đóng (Esc)' }))

    // "?" lần nữa trong dialog: không mở chồng
    go({ key: '?', code: 'Slash', shiftKey: true }, document.activeElement ?? dialog)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)

    fireEvent.keyDown(document.activeElement ?? dialog, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await choMotNhip()
    expect(document.activeElement).toBe(nut)
  })

  it('useMoBangPhimTat mở bảng (nút "?" ở sidebar)', () => {
    render(<ThuApp />)
    fireEvent.click(screen.getByRole('button', { name: '?' }))
    expect(screen.getByRole('dialog', { name: 'Phím tắt' })).toBeTruthy()
  })

  it('đang gõ "?" trong ô nhập, hoặc Telex đang ghép: không mở', () => {
    render(<ThuApp />)
    const o = screen.getByLabelText('Ghi chú')
    go({ key: '?', code: 'Slash', shiftKey: true }, o)
    go({ key: '?', code: 'Slash', shiftKey: true, isComposing: true })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('axe không lỗi khi bảng mở', async () => {
    render(<ThuApp />)
    go({ key: '?', code: 'Slash', shiftKey: true })
    await expectNoAxeViolations(document.body)
  })
})
