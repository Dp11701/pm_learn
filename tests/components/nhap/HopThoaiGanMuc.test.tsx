// @vitest-environment jsdom
// "Gán cho mục…" (C28 trong C32; đề xuất 1.7, 4.3): ô trống hiện ứng viên, không chọn sẵn (trừ mục đang gán);
// ↓ rồi Enter gán; gõ tên / viết tắt để tìm mọi mục học; Enter lúc Telex đang ghép chữ không gán; "Bỏ gán"; axe.
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HopThoaiGanMuc from '../../../src/components/nhap/HopThoaiGanMuc'
import type { MucNgan, UngVien } from '../../../src/app/du-lieu/nhap'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { mucNgan } from './ho-tro'

afterEach(cleanup)

const UNG_VIEN: UngVien[] = [
  { ...mucNgan('risk-appetite'), diem: 0.61 },
  { ...mucNgan('risk-register'), diem: 0.82 },
]

function Mo({
  dangGan = null,
  onChon = () => {},
  onBoGan,
}: {
  dangGan?: MucNgan | null
  onChon?: (m: MucNgan) => void
  onBoGan?: () => void
}) {
  const [mo, datMo] = useState(true)
  return (
    <>
      <button type="button">Gán cho mục…</button>
      <HopThoaiGanMuc
        mo={mo}
        doiMo={datMo}
        tenFile="risk-registr.md"
        ungVien={UNG_VIEN}
        dangGan={dangGan}
        onChon={onChon}
        onBoGan={onBoGan}
      />
    </>
  )
}

const o = () => screen.getByRole('combobox', { name: 'Tìm mục để gán' })
const cacDong = () => within(screen.getByRole('listbox')).getAllByRole('option')

describe('HopThoaiGanMuc', () => {
  it('ô trống: ứng viên theo điểm, không chọn sẵn; ↓ chọn đầu, Enter gán và đóng; axe', async () => {
    const onChon = vi.fn()
    render(<Mo onChon={onChon} />)
    const dialog = screen.getByRole('dialog', { name: 'Gán cho mục' })
    expect(within(dialog).getByText('risk-registr.md')).toBeTruthy()
    expect(document.activeElement).toBe(o())
    expect(cacDong().map((d) => d.textContent)).toEqual([
      expect.stringContaining('Risk Register'),
      expect.stringContaining('Risk Appetite'),
    ])
    expect(o().getAttribute('aria-activedescendant')).toBeNull()
    expect(cacDong().every((d) => d.getAttribute('aria-selected') === 'false')).toBe(true)
    await expectNoAxeViolations(document.body)

    fireEvent.keyDown(o(), { key: 'ArrowDown' })
    expect(o().getAttribute('aria-activedescendant')).toBe(cacDong()[0].id)
    fireEvent.keyDown(o(), { key: 'Enter' })
    expect(onChon).toHaveBeenCalledWith(mucNgan('risk-register'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('mục đang gán (gán sẵn) được chọn sẵn, có dấu "Đang gán"', () => {
    render(<Mo dangGan={mucNgan('risk-register')} />)
    const dau = cacDong()[0]
    expect(o().getAttribute('aria-activedescendant')).toBe(dau.id)
    expect(within(dau).getByText('Đang gán')).toBeTruthy()
  })

  it('gõ để tìm mọi mục học (không dấu, viết tắt), kết quả đầu được chọn, bấm chuột để gán', () => {
    const onChon = vi.fn()
    render(<Mo onChon={onChon} />)
    fireEvent.change(o(), { target: { value: 'pestle' } })
    expect(cacDong()[0].textContent).toContain('PESTLE')
    expect(o().getAttribute('aria-activedescendant')).toBe(cacDong()[0].id)
    fireEvent.change(o(), { target: { value: 'capex' } })
    fireEvent.click(cacDong()[0])
    expect(onChon).toHaveBeenCalledWith(mucNgan('capex-opex'))
  })

  it('không có kết quả: câu gợi ý; Enter khi đang ghép chữ (IME) không gán', () => {
    const onChon = vi.fn()
    render(<Mo onChon={onChon} />)
    fireEvent.change(o(), { target: { value: 'khongcomucnaoten' } })
    expect(screen.getByText('Không có kết quả cho "khongcomucnaoten"')).toBeTruthy()
    fireEvent.change(o(), { target: { value: 'vieetj' } })
    fireEvent.keyDown(o(), { key: 'Enter', isComposing: true })
    fireEvent.keyDown(o(), { key: 'Enter', keyCode: 229 })
    expect(onChon).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('"Bỏ gán" khi dòng đang có mục bạn gán', () => {
    const onBoGan = vi.fn()
    render(<Mo dangGan={mucNgan('bani')} onBoGan={onBoGan} />)
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ gán' }))
    expect(onBoGan).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
