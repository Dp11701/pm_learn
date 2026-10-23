// @vitest-environment jsdom
// Gallery F01 (/_dev/thanh-phan): dựng được, chữ mẫu đến từ fixtures/mau, không lỗi console, qua axe.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ThanhPhan from '../../src/dev/ThanhPhan'
import { datGiaoDien } from '../../src/app/giao-dien'
import { mauF01 } from '../../fixtures/mau/thanh-phan'
import { expectNoAxeViolations } from './axe'
import { dungLocalStorageJsdom } from './moi-truong'

dungLocalStorageJsdom()

let loiConsole: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  datGiaoDien('sang')
  loiConsole = vi.spyOn(console, 'error')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// Chữ mẫu nạp động + Suspense: dựng trong act bất đồng bộ để React xử lý lượt vẽ lại sau khi nạp xong.
async function dung() {
  const kq = await act(async () => render(<ThanhPhan />))
  await screen.findByText(mauF01.chuDe)
  return kq
}

describe('gallery F01', () => {
  it('dựng đủ 9 mục với chữ mẫu từ fixtures', async () => {
    await dung()
    expect(screen.getByRole('heading', { level: 1, name: 'Học PM A–Z' })).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(9)
    for (const chu of [mauF01.taiLieu, mauF01.nhom, mauF01.boQua, mauF01.chuThich.doan]) {
      expect(screen.getByText(chu)).toBeTruthy()
    }
    for (const p of mauF01.iconPhan) expect(screen.getByText(p.nhan)).toBeTruthy()
    expect(loiConsole).not.toHaveBeenCalled()
  })

  it('có ChonGiaoDien; đổi sang Tối thì nhãn frame đổi theo', async () => {
    await dung()
    expect(screen.getByText('F01 · Design system · Sáng')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'Tối' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByText('F01 · Design system · Tối')).toBeTruthy()
    expect(loiConsole).not.toHaveBeenCalled()
  })

  it('không có lỗi axe', async () => {
    const { container } = await dung()
    await expectNoAxeViolations(container)
  })
})
