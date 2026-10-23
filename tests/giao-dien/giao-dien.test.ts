// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CAC_GIAO_DIEN,
  KHOA_GIAO_DIEN,
  apDungGiaoDien,
  datGiaoDien,
  docGiaoDien,
  giaoDienHieuLuc,
  giaoDienKe,
  useGiaoDien,
  useGiaoDienHieuLuc,
  type GiaoDien,
} from '../../src/app/giao-dien'
import { dungLocalStorageJsdom } from './moi-truong'

dungLocalStorageJsdom()

const html = document.documentElement

/** Giả lập prefers-color-scheme; trả hàm đổi giá trị (bắn sự kiện change). */
function giaMatchMedia(toi: boolean) {
  const nghe = new Set<() => void>()
  const mq = {
    matches: toi,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, f: () => void) => nghe.add(f),
    removeEventListener: (_: string, f: () => void) => nghe.delete(f),
  }
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn(() => mq),
  })
  return (giaTri: boolean) => {
    mq.matches = giaTri
    nghe.forEach((f) => f())
  }
}

beforeEach(() => {
  datGiaoDien('he-thong')
  localStorage.clear()
  html.removeAttribute('data-theme')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Reflect.deleteProperty(window, 'matchMedia')
})

describe('docGiaoDien', () => {
  it('mặc định Theo hệ thống khi chưa lưu', () => {
    expect(docGiaoDien()).toBe('he-thong')
  })

  it.each(CAC_GIAO_DIEN)('đọc lại giá trị đã lưu: %s', (g) => {
    localStorage.setItem(KHOA_GIAO_DIEN, g)
    expect(docGiaoDien()).toBe(g)
  })

  it('giá trị lạ → Theo hệ thống', () => {
    localStorage.setItem(KHOA_GIAO_DIEN, 'dark')
    expect(docGiaoDien()).toBe('he-thong')
  })

  it('trình duyệt chặn localStorage → Theo hệ thống, không ném lỗi', () => {
    vi.spyOn(Object.getPrototypeOf(localStorage), 'getItem').mockImplementation(() => {
      throw new Error('chặn')
    })
    expect(docGiaoDien()).toBe('he-thong')
  })
})

describe('datGiaoDien', () => {
  it.each([
    ['sang', 'light'],
    ['toi', 'dark'],
  ] as const)('%s → lưu và đặt data-theme="%s"', (g, theme) => {
    datGiaoDien(g)
    expect(localStorage.getItem(KHOA_GIAO_DIEN)).toBe(g)
    expect(html.dataset.theme).toBe(theme)
    expect(docGiaoDien()).toBe(g)
  })

  it('Theo hệ thống → bỏ data-theme, vẫn lưu lựa chọn', () => {
    datGiaoDien('toi')
    datGiaoDien('he-thong')
    expect(html.hasAttribute('data-theme')).toBe(false)
    expect(localStorage.getItem(KHOA_GIAO_DIEN)).toBe('he-thong')
  })

  it('không ghi được localStorage vẫn đổi giao diện trong phiên', () => {
    vi.spyOn(Object.getPrototypeOf(localStorage), 'setItem').mockImplementation(() => {
      throw new Error('đầy')
    })
    const { result } = renderHook(() => useGiaoDien())
    act(() => datGiaoDien('toi'))
    expect(html.dataset.theme).toBe('dark')
    expect(result.current[0]).toBe('toi')
  })
})

describe('giaoDienKe', () => {
  it('vòng Sáng → Tối → Theo hệ thống → Sáng', () => {
    expect(giaoDienKe('sang')).toBe('toi')
    expect(giaoDienKe('toi')).toBe('he-thong')
    expect(giaoDienKe('he-thong')).toBe('sang')
  })
})

describe('khớp script chống nháy trong index.html', () => {
  const nguon = readFileSync(fileURLToPath(import.meta.resolve('../../index.html')), 'utf8')
  const script = /<script>([\s\S]*?)<\/script>/.exec(nguon)?.[1]

  it('có script chạy trước React', () => {
    expect(script).toContain(KHOA_GIAO_DIEN)
  })

  it.each([...CAC_GIAO_DIEN, null, 'la'])('giá trị lưu %s cho cùng data-theme', (g) => {
    if (g === null) localStorage.removeItem(KHOA_GIAO_DIEN)
    else localStorage.setItem(KHOA_GIAO_DIEN, g)
    html.removeAttribute('data-theme')
    new Function(script ?? '')()
    const tuScript = html.getAttribute('data-theme')

    html.removeAttribute('data-theme')
    apDungGiaoDien(docGiaoDien())
    expect(html.getAttribute('data-theme')).toBe(tuScript)
  })
})

describe('giao diện hiệu lực', () => {
  it('Sáng / Tối chọn tay không phụ thuộc hệ điều hành', () => {
    giaMatchMedia(true)
    expect(giaoDienHieuLuc('sang')).toBe('sang')
    giaMatchMedia(false)
    expect(giaoDienHieuLuc('toi')).toBe('toi')
  })

  it('Theo hệ thống tra prefers-color-scheme; không có matchMedia thì Sáng', () => {
    giaMatchMedia(true)
    expect(giaoDienHieuLuc('he-thong')).toBe('toi')
    giaMatchMedia(false)
    expect(giaoDienHieuLuc('he-thong')).toBe('sang')
    Reflect.deleteProperty(window, 'matchMedia')
    expect(giaoDienHieuLuc('he-thong')).toBe('sang')
  })

  it('useGiaoDienHieuLuc đổi theo hệ điều hành và theo lựa chọn', () => {
    const doi = giaMatchMedia(false)
    const { result } = renderHook(() => useGiaoDienHieuLuc())
    expect(result.current).toBe('sang')
    act(() => doi(true))
    expect(result.current).toBe('toi')
    act(() => datGiaoDien('sang'))
    expect(result.current).toBe('sang')
  })
})

describe('useGiaoDien', () => {
  it('trả lựa chọn hiện tại và đổi được', () => {
    const { result } = renderHook(() => useGiaoDien())
    expect(result.current[0]).toBe('he-thong')
    act(() => result.current[1]('sang'))
    expect(result.current[0]).toBe('sang')
    expect(html.dataset.theme).toBe('light')
  })

  it('tab khác đổi giao diện → đổi theo', () => {
    const { result } = renderHook(() => useGiaoDien())
    act(() => {
      localStorage.setItem(KHOA_GIAO_DIEN, 'toi' satisfies GiaoDien)
      window.dispatchEvent(new StorageEvent('storage', { key: KHOA_GIAO_DIEN, newValue: 'toi' }))
    })
    expect(result.current[0]).toBe('toi')
    expect(html.dataset.theme).toBe('dark')
  })
})
