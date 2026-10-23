// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import ChonGiaoDien from '../../src/components/ChonGiaoDien'
import { KHOA_GIAO_DIEN, datGiaoDien } from '../../src/app/giao-dien'
import { expectNoAxeViolations } from './axe'
import { dungLocalStorageJsdom } from './moi-truong'

dungLocalStorageJsdom()

const html = document.documentElement
const NHAN = ['Sáng', 'Tối', 'Theo hệ thống']

const lua = (ten: string) => screen.getByRole('radio', { name: ten })
const daChon = () =>
  screen.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')

beforeEach(() => {
  datGiaoDien('he-thong')
  localStorage.clear()
  html.removeAttribute('data-theme')
})

afterEach(cleanup)

describe('ChonGiaoDien', () => {
  it('nhóm "Giao diện" có 3 lựa chọn đúng thứ tự, mặc định Theo hệ thống', () => {
    render(<ChonGiaoDien />)
    const nhom = screen.getByRole('radiogroup', { name: 'Giao diện' })
    const cac = screen.getAllByRole('radio')
    expect(cac.every((r) => nhom.contains(r))).toBe(true)
    expect(cac.map((r) => r.textContent)).toEqual(NHAN)
    expect(daChon()).toEqual([lua('Theo hệ thống')])
  })

  it('hiện đúng lựa chọn đã đặt trước', () => {
    datGiaoDien('toi')
    render(<ChonGiaoDien />)
    expect(lua('Tối').getAttribute('aria-checked')).toBe('true')
    expect(daChon()).toHaveLength(1)
  })

  it('bấm chọn → lưu, đặt data-theme, đổi trạng thái chọn', () => {
    render(<ChonGiaoDien />)
    fireEvent.click(lua('Tối'))
    expect(daChon()).toEqual([lua('Tối')])
    expect(html.dataset.theme).toBe('dark')
    expect(localStorage.getItem(KHOA_GIAO_DIEN)).toBe('toi')

    fireEvent.click(lua('Sáng'))
    expect(html.dataset.theme).toBe('light')
    fireEvent.click(lua('Theo hệ thống'))
    expect(html.hasAttribute('data-theme')).toBe(false)
  })

  it('chỉ lựa chọn đang chọn nằm trong thứ tự Tab (roving tabindex)', () => {
    render(<ChonGiaoDien />)
    expect(screen.getAllByRole('radio').map((r) => r.tabIndex)).toEqual([-1, -1, 0])
    for (const r of screen.getAllByRole('radio')) {
      expect(r.tagName).toBe('BUTTON')
      expect(r).toHaveProperty('disabled', false)
    }
  })

  it('mũi tên, Home, End chọn và chuyển focus, có vòng lại', () => {
    render(<ChonGiaoDien />)
    const hienTai = lua('Theo hệ thống')
    act(() => hienTai.focus())
    expect(document.activeElement).toBe(hienTai)

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(lua('Sáng'))
    expect(daChon()).toEqual([lua('Sáng')])
    expect(html.dataset.theme).toBe('light')

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(daChon()).toEqual([lua('Tối')])
    expect(document.activeElement).toBe(lua('Tối'))

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' })
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' })
    expect(daChon()).toEqual([lua('Theo hệ thống')])

    fireEvent.keyDown(document.activeElement!, { key: 'Home' })
    expect(document.activeElement).toBe(lua('Sáng'))
    fireEvent.keyDown(document.activeElement!, { key: 'End' })
    expect(document.activeElement).toBe(lua('Theo hệ thống'))
    expect(lua('Theo hệ thống').tabIndex).toBe(0)

    fireEvent.keyDown(document.activeElement!, { key: 'a' })
    expect(daChon()).toEqual([lua('Theo hệ thống')])
  })

  it('giữ Alt / Ctrl / ⌘ thì để phím cho trình duyệt, không đổi giao diện', () => {
    render(<ChonGiaoDien />)
    act(() => lua('Theo hệ thống').focus())
    for (const bo of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }]) {
      const suKien = new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
        cancelable: true,
        ...bo,
      })
      act(() => {
        document.activeElement!.dispatchEvent(suKien)
      })
      expect(suKien.defaultPrevented).toBe(false)
      expect(daChon()).toEqual([lua('Theo hệ thống')])
    }
  })

  it('không có lỗi axe', async () => {
    const { container } = render(<ChonGiaoDien />)
    // Component đứng riêng, không nằm trong landmark của trang.
    await expectNoAxeViolations(container, ['region'])
  })
})
