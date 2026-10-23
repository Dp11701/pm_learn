// @vitest-environment jsdom
import { useRef, useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import HopThoai, { type PropsHopThoai } from '../../../src/components/HopThoai'
import Nut from '../../../src/components/Nut'
import TruongNhap from '../../../src/components/TruongNhap'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

type ThuThu = Partial<Omit<PropsHopThoai, 'mo' | 'doiMo' | 'nutMo' | 'focusDau'>> & {
  focusNutChinh?: boolean
}

/** Dialog có nút mở; chân có "Huỷ" và nút chính. */
function ThuDialog({ focusNutChinh, tieuDe = 'Duyệt bài này?', ...khac }: ThuThu) {
  const [mo, datMo] = useState(false)
  const nutChinh = useRef<HTMLButtonElement>(null)
  return (
    <>
      <HopThoai
        {...khac}
        tieuDe={tieuDe}
        mo={mo}
        doiMo={datMo}
        nutMo={<Nut>Mở</Nut>}
        focusDau={focusNutChinh ? nutChinh : undefined}
        chan={
          <>
            <Nut bien="phu" onClick={() => datMo(false)}>
              Huỷ
            </Nut>
            <Nut bien="chinh" ref={nutChinh}>
              Chính
            </Nut>
          </>
        }
      >
        {khac.children}
      </HopThoai>
      <button type="button">Ngoài</button>
    </>
  )
}

const moDialog = () => {
  const nut = screen.getByRole('button', { name: 'Mở' })
  nut.focus()
  fireEvent.click(nut)
  return nut
}

// Radix gắn bộ nghe pointerdown ngoài dialog, và trả focus khi đóng, sau một nhịp setTimeout(0).
const choMotNhip = () => act(() => new Promise((r) => setTimeout(r, 0)))

/** Bấm chuột trái ra ngoài: Radix hoãn việc đóng tới lúc click. */
async function bamRaNgoai() {
  await choMotNhip()
  const b = document.body
  fireEvent.pointerDown(b, { button: 0 })
  fireEvent.mouseDown(b, { button: 0 })
  fireEvent.pointerUp(b, { button: 0 })
  fireEvent.mouseUp(b, { button: 0 })
  fireEvent.click(b, { button: 0 })
  await choMotNhip()
}

describe('HopThoai (C32)', () => {
  it('dialog: role, aria-modal, tên từ tiêu đề, phụ đề, nút Đóng; focus vào trong khi mở', () => {
    render(<ThuDialog phuDe="Mục học · Chủ đề" />)
    moDialog()
    const d = screen.getByRole('dialog', { name: 'Duyệt bài này?' })
    expect(d.getAttribute('aria-modal')).toBe('true')
    expect(d.hasAttribute('aria-describedby')).toBe(false)
    expect(screen.getByText('Mục học · Chủ đề')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Đóng' })).toBeTruthy()
    expect(d.contains(document.activeElement)).toBe(true)
    expect(d.className).toContain('rounded-[var(--radius-lg)]')
    expect(d.className).toContain('shadow-[var(--shadow-3)]')
    expect(d.className).toContain('bg-[var(--surface-dialog)]')
    expect(d.className).toContain('border-[var(--border-dialog)]')
  })

  it('moTa gắn aria-describedby', () => {
    render(<ThuDialog moTa="Sẽ thành Đã duyệt." />)
    moDialog()
    const d = screen.getByRole('dialog')
    const id = d.getAttribute('aria-describedby')
    expect(id && document.getElementById(id)?.textContent).toBe('Sẽ thành Đã duyệt.')
  })

  it('Esc đóng và trả focus về nút mở', async () => {
    render(<ThuDialog />)
    const nutMo = moDialog()
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await choMotNhip()
    expect(document.activeElement).toBe(nutMo)
  })

  it('Esc khi Telex/VNI đang ghép chữ chỉ huỷ ghép, KHÔNG đóng dialog', () => {
    render(
      <ThuDialog>
        <TruongNhap nhan="Lý do" />
      </ThuDialog>,
    )
    moDialog()
    const o = screen.getByLabelText('Lý do')
    o.focus()
    fireEvent.compositionStart(o)
    fireEvent.keyDown(o, { key: 'Escape', isComposing: true })
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(o, { key: 'Escape', keyCode: 229 })
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.compositionEnd(o)
    fireEvent.keyDown(o, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('nút Đóng (X) đóng và trả focus về nút mở', async () => {
    render(<ThuDialog />)
    const nutMo = moDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await choMotNhip()
    expect(document.activeElement).toBe(nutMo)
  })

  it('giữ focus bên trong: Tab ở phần tử cuối quay về đầu, Shift+Tab ở đầu sang cuối', () => {
    render(<ThuDialog />)
    moDialog()
    const d = screen.getByRole('dialog')
    const dongNut = screen.getByRole('button', { name: 'Đóng' })
    const chinh = screen.getByRole('button', { name: 'Chính' })
    chinh.focus()
    fireEvent.keyDown(chinh, { key: 'Tab' })
    expect(document.activeElement).toBe(dongNut)
    fireEvent.keyDown(dongNut, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(chinh)
    // phần còn lại của trang bị ẩn khỏi trình đọc màn hình khi dialog mở
    expect(screen.getByText('Ngoài').closest('[aria-hidden="true"]')).not.toBeNull()
    expect(d.contains(document.activeElement)).toBe(true)
  })

  it('bấm ra ngoài (lớp phủ) thì dialog thường đóng', async () => {
    render(<ThuDialog />)
    moDialog()
    await bamRaNgoai()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('alertdialog: role alertdialog, focus vào nút được chỉ định, không có X, bấm ngoài không đóng, Esc đóng', async () => {
    render(
      <ThuDialog
        vaiTro="alertdialog"
        focusNutChinh
        tieuDe="Đánh dấu là Đã xong?"
        moTa="Bài còn 2 bước chưa xong."
      />,
    )
    const nutMo = moDialog()
    const d = screen.getByRole('alertdialog', { name: 'Đánh dấu là Đã xong?' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Chính' }))
    expect(screen.queryByRole('button', { name: 'Đóng' })).toBeNull()
    expect(d.getAttribute('aria-describedby')).toBeTruthy()
    await bamRaNgoai()
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await choMotNhip()
    expect(document.activeElement).toBe(nutMo)
  })

  it('mở bằng state (không có nút mở, vd. phím tắt): đóng thì focus về phần tử trước đó', async () => {
    function MoBangPhim() {
      const [mo, datMo] = useState(false)
      return (
        <>
          <button type="button" onClick={() => datMo(true)}>
            Trước
          </button>
          <HopThoai mo={mo} doiMo={datMo} tieuDe="Phím tắt">
            <p>Nội dung</p>
          </HopThoai>
        </>
      )
    }
    render(<MoBangPhim />)
    const truoc = screen.getByRole('button', { name: 'Trước' })
    truoc.focus()
    fireEvent.click(truoc)
    expect(screen.getByRole('dialog', { name: 'Phím tắt' })).toBeTruthy()
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await choMotNhip()
    expect(document.activeElement).toBe(truoc)
  })

  it('phần tử mở đã biến mất thì focus về H1 của trang', async () => {
    function MoTuMenu() {
      const [mo, datMo] = useState(false)
      return (
        <>
          <h1 id="tieu-de-trang" tabIndex={-1}>
            Trang
          </h1>
          {!mo && (
            <button type="button" onClick={() => datMo(true)}>
              Mục menu
            </button>
          )}
          <HopThoai mo={mo} doiMo={datMo} tieuDe="Thêm thẻ">
            <p>Nội dung</p>
          </HopThoai>
        </>
      )
    }
    render(<MoTuMenu />)
    const muc = screen.getByRole('button', { name: 'Mục menu' })
    muc.focus()
    fireEvent.click(muc)
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await choMotNhip()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Trang' }))
  })

  it('sheet: panel phải 360 (bottom sheet dưới 768) có thanh kéo; drawer trái 312; toàn màn hình', () => {
    const { rerender } = render(
      <HopThoai mo doiMo={() => {}} tieuDe="Mục lục" dang="phai">
        <p>x</p>
      </HopThoai>,
    )
    let d = screen.getByRole('dialog', { name: 'Mục lục' })
    expect(d.style.getPropertyValue('--rong')).toBe('var(--panel-truot-w)')
    expect(d.className).toContain('md:right-0')
    expect(d.className).toContain('rounded-t-[var(--radius-lg)]')
    expect(d.querySelector('span[aria-hidden="true"].md\\:hidden')).not.toBeNull()

    rerender(
      <HopThoai mo doiMo={() => {}} tieuDe="Menu" anTieuDe dang="trai">
        <p>x</p>
      </HopThoai>,
    )
    d = screen.getByRole('dialog', { name: 'Menu' })
    expect(d.style.getPropertyValue('--rong')).toBe('312px')
    expect(screen.getByText('Menu').className).toContain('sr-only')
    expect(screen.queryByRole('button', { name: 'Đóng' })).toBeNull()

    rerender(
      <HopThoai mo doiMo={() => {}} tieuDe="Tìm kiếm" dang="toan-man-hinh">
        <p>x</p>
      </HopThoai>,
    )
    expect(screen.getByRole('dialog', { name: 'Tìm kiếm' }).className).toContain('inset-0')

    rerender(
      <HopThoai mo doiMo={() => {}} tieuDe="Trạng thái học" dang="duoi" rong={400}>
        <p>x</p>
      </HopThoai>,
    )
    d = screen.getByRole('dialog', { name: 'Trạng thái học' })
    expect(d.className).toContain('bottom-0')
    expect(d.querySelector('span[aria-hidden="true"]')?.className).toContain(
      'bg-[var(--sheet-handle)]',
    )
  })

  it('chuyển động: sheet chỉ trượt khi motion-safe, reduced-motion chỉ cross-fade', () => {
    render(
      <HopThoai mo doiMo={() => {}} tieuDe="Panel" dang="phai">
        <p>x</p>
      </HopThoai>,
    )
    const lop = screen.getByRole('dialog').className.split(/\s+/)
    for (const l of lop.filter((x) => /vao-tu|ra-/.test(x))) expect(l).toContain('motion-safe:')
    expect(lop.some((l) => l.startsWith('motion-reduce:') && l.includes('hien-dan'))).toBe(true)
  })

  it('không vi phạm axe (dialog và alertdialog)', async () => {
    render(<ThuDialog phuDe="Phụ đề" moTa="Mô tả." />)
    moDialog()
    await expectNoAxeViolations(document.body)
    cleanup()
    render(<ThuDialog vaiTro="alertdialog" moTa="Mô tả." focusNutChinh />)
    moDialog()
    await expectNoAxeViolations(document.body)
  })
})
