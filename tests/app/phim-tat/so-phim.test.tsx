// @vitest-environment jsdom
// Sổ phím tắt (§11, đề xuất 5) ↔ bảng F27: F27 dựng toàn bộ từ sổ, sổ khớp đúng bảng của frame.
import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import BangPhimTat from '../../../src/components/BangPhimTat'
import {
  SO_PHIM_TAT,
  TEN_PHAM_VI,
  maPhimTuSuKien,
  nhomBangPhimTat,
  type MaPhimToanCuc,
} from '../../../src/app/phim-tat'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

// Radix trả focus khi đóng sau một nhịp setTimeout(0).
const choMotNhip = () => act(() => new Promise((r) => setTimeout(r, 0)))

// renderVals() của docs/design-handoff/design/F27-phim-tat-toi.dc.html (chép tay, không chạy file frame).
const F27 = [
  {
    title: 'Toàn app',
    rows: [
      { label: 'Bảng phím tắt', keys: ['?'] },
      { label: 'Tìm kiếm', keys: ['/'] },
      { label: 'Đóng', keys: ['Esc'] },
    ],
  },
  {
    title: 'Bài học · panel bản đồ',
    rows: [
      { label: 'Mục trước / sau', keys: ['[', ']'] },
      { label: 'Chưa học · Đang học · Đã xong · Bỏ qua', keys: ['1', '2', '3', '4'] },
      { label: 'Đồng hồ', keys: ['T'] },
      { label: 'Soạn', keys: ['E'] },
    ],
  },
  {
    title: 'Lộ trình',
    rows: [
      { label: 'Bản đồ ↔ Danh sách', keys: ['M'] },
      { label: 'Di chuyển giữa mục', keys: ['←', '↑', '↓', '→'] },
      { label: 'Mở panel', keys: ['Enter'] },
    ],
  },
  {
    title: 'Chỉ trong phiên ôn',
    rows: [
      { label: 'Lật thẻ', keys: ['Space'] },
      { label: 'Quên', keys: ['1'] },
      { label: 'Nhớ', keys: ['2'] },
    ],
  },
]

// Mã e.code của §11 / đề xuất 5 (không thêm phím ngoài bảng).
const MA_DE_XUAT = [
  'Shift+Slash',
  'Slash',
  'Escape',
  'BracketLeft',
  'BracketRight',
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'KeyT',
  'KeyE',
  'KeyM',
  'Space',
  'ArrowLeft',
  'ArrowUp',
  'ArrowDown',
  'ArrowRight',
  'Enter',
]
const MA_CUC_BO = new Set(['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'Enter'])

function ThuBang() {
  const [mo, datMo] = useState(false)
  return (
    <>
      <button type="button" onClick={() => datMo(true)}>
        Mở bảng
      </button>
      <BangPhimTat mo={mo} doiMo={datMo} nhom={nhomBangPhimTat()} />
    </>
  )
}

function moBang() {
  render(<ThuBang />)
  fireEvent.click(screen.getByRole('button', { name: 'Mở bảng' }))
  return screen.getByRole('dialog', { name: 'Phím tắt' })
}

/** Bảng đọc từ DOM của F27: nhóm (h3) → dòng (dt) → phím (kbd). */
function docBang(dialog: HTMLElement) {
  return within(dialog)
    .getAllByRole('heading', { level: 3 })
    .map((h3) => ({
      title: h3.textContent,
      rows: [...(h3.parentElement?.querySelectorAll('dl > div') ?? [])].map((dong) => ({
        label: dong.querySelector('dt')?.textContent,
        keys: [...dong.querySelectorAll('dd kbd')].map((k) => k.textContent),
      })),
    }))
}

describe('sổ phím tắt', () => {
  it('nhóm của sổ khớp đúng bảng F27 (tên nhóm, chữ dòng, phím, thứ tự)', () => {
    const nhom = nhomBangPhimTat().map((n) => ({
      title: n.ten,
      rows: n.dong.map((d) => ({ label: d.moTa, keys: d.phim.map((k) => k.hienThi) })),
    }))
    expect(nhom).toEqual(F27)
  })

  it('mọi dòng của sổ đều vào bảng F27, không trùng, không sót', () => {
    const daVao = nhomBangPhimTat().flatMap((n) => n.dong)
    expect(daVao).toHaveLength(SO_PHIM_TAT.length)
    expect(new Set(daVao)).toEqual(new Set(SO_PHIM_TAT))
  })

  it('chỉ dùng mã phím của §11, mỗi dòng có phạm vi và phase', () => {
    for (const d of SO_PHIM_TAT) {
      expect(TEN_PHAM_VI[d.phamVi]).toBeTruthy()
      expect(d.phase).toMatch(/^(1|2a|2b|3|4|5|6|7a|7b|7c|8)$/)
      for (const k of d.phim) expect(MA_DE_XUAT).toContain(k.ma)
    }
    const maDung = new Set(SO_PHIM_TAT.flatMap((d) => d.phim.map((k) => k.ma)))
    expect([...maDung].sort()).toEqual([...MA_DE_XUAT].sort())
  })

  it('phase 1 có tác dụng đúng 3 phím Toàn app: ?, /, Esc', () => {
    const phase1 = SO_PHIM_TAT.filter((d) => d.phase === '1')
    expect(phase1.map((d) => d.phim.map((k) => k.hienThi).join(''))).toEqual(['?', '/', 'Esc'])
    expect(phase1.every((d) => d.phamVi === 'toan-app')).toBe(true)
  })

  it('mọi phím toàn cục của sổ đều được bộ xử lý nhận (mũi tên, Enter do component tự xử lý)', () => {
    for (const d of SO_PHIM_TAT) {
      for (const k of d.phim) {
        const laHoi = k.ma === 'Shift+Slash'
        const e = new KeyboardEvent('keydown', {
          code: laHoi ? 'Slash' : k.ma,
          shiftKey: laHoi,
          bubbles: true,
        })
        document.body.dispatchEvent(e)
        expect(maPhimTuSuKien(e)).toBe(MA_CUC_BO.has(k.ma) ? null : (k.ma as MaPhimToanCuc))
      }
    }
  })
})

describe('F27 — bảng phím tắt', () => {
  it('dòng trên màn hình = sổ phím tắt, nhóm theo phạm vi như frame', () => {
    expect(docBang(moBang())).toEqual(F27)
  })

  it('tiêu đề h2 "Phím tắt", nút "Esc Đóng" nhận focus đầu tiên, có ghi chú Telex/VNI', () => {
    const dialog = moBang()
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Phím tắt')
    const nutDong = within(dialog).getByRole('button', { name: 'Đóng (Esc)' })
    expect(nutDong.textContent).toBe('EscĐóng')
    expect(document.activeElement).toBe(nutDong)
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.textContent).toContain(
      'Phím tắt không chạy khi bạn đang gõ, kể cả lúc Telex/VNI đang ghép chữ. Phím được nhận theo vị trí vật lý trên bàn phím.',
    )
    // Chỉ một nút đóng (không có thêm nút X mặc định của C32)
    expect(within(dialog).getAllByRole('button')).toHaveLength(1)
  })

  it('phím hiện bằng <kbd> kiểu JetBrains Mono, đáy viền 2px', () => {
    const kbd = moBang().querySelector('dd kbd')
    expect(kbd?.className).toContain('font-mono')
    expect(kbd?.className).toContain('border-b-2')
  })

  it('nút đóng và Esc đóng bảng, focus về nút đã mở', async () => {
    render(<ThuBang />)
    const nutMo = screen.getByRole('button', { name: 'Mở bảng' })
    nutMo.focus()
    fireEvent.click(nutMo)
    fireEvent.click(screen.getByRole('button', { name: 'Đóng (Esc)' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await choMotNhip()
    expect(document.activeElement).toBe(nutMo)

    fireEvent.click(nutMo)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await choMotNhip()
    expect(document.activeElement).toBe(nutMo)
  })

  it('axe không lỗi', async () => {
    moBang()
    await expectNoAxeViolations(document.body)
  })
})
