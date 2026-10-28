// @vitest-environment jsdom
// Không trắng màn hình (đề xuất 5, F26): lỗi một trang → "Lỗi trang" trong khung; khung hỏng → trang lỗi
// không khung; cây roadmap không nạp được → "Không đọc được cây roadmap" + "Thử lại" (bất biến 1).
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dieuHuongTrinhDuyet } from '../../../src/pages/loi/KhoiLoi'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { hong, LOI_CAY_THU, LOI_KHUNG_THU, LOI_TRANG_THU } from './gia'
import { datMoiTruong, moTrang } from './moi-truong'

vi.mock('../../../shared/roadmap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/roadmap')>()),
  layCay: (await import('./gia')).layCayGia,
}))
vi.mock('../../../src/app/khung/KhungApp', async () => ({
  default: (await import('./gia')).KhungGia,
}))
vi.mock('../../../src/app/phim-tat', async () => ({
  PhimTatProvider: (await import('./gia')).QuaMat,
  useMoBangPhimTat: () => () => {},
  usePhimTat: () => {},
}))
vi.mock('../../../src/components/tim-kiem/TimKiem', async () => ({
  TimKiemProvider: (await import('./gia')).QuaMat,
  useTimKiem: () => ({ mo: () => {} }),
}))
vi.mock('../../../src/pages/TrangLinhVuc', async (importOriginal) => ({
  default: (await import('./gia')).trangCoTheHong(
    (await importOriginal<typeof import('../../../src/pages/TrangLinhVuc')>()).default,
  ),
}))

let taiLai: ReturnType<typeof vi.fn<() => void>>

beforeEach(() => {
  datMoiTruong()
  // React và router ghi lỗi bị bắt ra console.error: tắt cho gọn đầu ra.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  taiLai = vi.fn<() => void>()
  vi.spyOn(dieuHuongTrinhDuyet, 'taiLai').mockImplementation(taiLai)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  hong.cay = false
  hong.khung = false
  hong.trang = false
})

const h1 = () => screen.getByRole('heading', { level: 1 })

function moChiTiet(chiTiet: string) {
  const nut = screen.getByRole('button', { name: /Chi tiết lỗi/ })
  expect(nut.getAttribute('aria-expanded')).toBe('false')
  const khoi = document.getElementById(nut.getAttribute('aria-controls')!)!
  expect(khoi.hidden).toBe(true)
  fireEvent.click(nut)
  expect(nut.getAttribute('aria-expanded')).toBe('true')
  expect(nut.textContent).toBe('Chi tiết lỗi ▴')
  expect(khoi.hidden).toBe(false)
  expect(khoi.textContent).toContain(chiTiet)
}

describe('lỗi một trang', () => {
  it('hiện "Lỗi trang" của F26 trong khung; Tải lại, Chi tiết lỗi', async () => {
    hong.trang = true
    await moTrang('/linh-vuc/scope-management')
    const khung = screen.getByTestId('khung')
    expect(khung.contains(h1())).toBe(true)
    expect(h1().textContent).toBe('Trang này gặp lỗi khi hiển thị.')
    expect(document.title).toBe('Lỗi trang · PMP')
    expect(screen.getByText('Dữ liệu học của bạn không bị ảnh hưởng.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
    expect(taiLai).toHaveBeenCalledTimes(1)
    moChiTiet(`Error: ${LOI_TRANG_THU}`)
  })

  it('trang khác vẫn chạy', async () => {
    hong.trang = true
    await moTrang('/on-tap')
    expect(h1().textContent).toBe('Ôn tập')
  })

  it('không vi phạm axe', async () => {
    hong.trang = true
    const { container } = await moTrang('/linh-vuc/scope-management')
    fireEvent.click(screen.getByRole('button', { name: /Chi tiết lỗi/ }))
    await expectNoAxeViolations(container)
  })
})

describe('khung app hỏng', () => {
  it('trang lỗi không khung, có <main> và H1', async () => {
    hong.khung = true
    await moTrang('/')
    expect(screen.queryByTestId('khung')).toBeNull()
    expect(screen.getByRole('main').id).toBe('noi-dung-chinh')
    expect(h1().textContent).toBe('Trang này gặp lỗi khi hiển thị.')
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
    expect(taiLai).toHaveBeenCalledTimes(1)
    moChiTiet(`Error: ${LOI_KHUNG_THU}`)
  })

  it('không vi phạm axe', async () => {
    hong.khung = true
    const { container } = await moTrang('/')
    await expectNoAxeViolations(container)
  })
})

describe('cây roadmap không nạp được (bất biến 1)', () => {
  it.each(['/', '/hoc/scope-creep', '/linh-vuc/scope-management', '/khong-co'])(
    '%s → "Không đọc được cây roadmap." + Thử lại = tải lại trang',
    async (duongDan) => {
      hong.cay = true
      await moTrang(duongDan)
      expect(screen.queryByTestId('khung')).toBeNull()
      expect(h1().textContent).toBe('Không đọc được cây roadmap.')
      expect(document.title).toBe('Không đọc được cây roadmap · PMP')
      expect(screen.getByText('Dữ liệu học của bạn không bị ảnh hưởng.')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
      expect(taiLai).toHaveBeenCalledTimes(1)
      moChiTiet(`LoiCay: ${LOI_CAY_THU}`)
    },
  )

  it('không vi phạm axe', async () => {
    hong.cay = true
    const { container } = await moTrang('/')
    await expectNoAxeViolations(container)
  })
})
