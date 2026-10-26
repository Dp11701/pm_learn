// @vitest-environment jsdom
// Bản nháp tạm trong sessionStorage (đề xuất 5; banner mất kết nối F26 "Nội dung đang gõ được giữ nguyên.").
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { docNhapTam, luuNhapTam, xoaNhapTam } from '../../../src/app/nhap-tam'

beforeEach(() => sessionStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('nhap-tam', () => {
  it('lưu, đọc, xoá theo khoá của từng ô; giữ nguyên chữ tiếng Việt, xuống dòng', () => {
    const chu = 'Dòng một\nDòng hai có dấu: ă â đ ê ô ơ ư ạ ễ'
    expect(docNhapTam('ghi-chu:a')).toBeNull()
    expect(luuNhapTam('ghi-chu:a', chu)).toBe(true)
    expect(luuNhapTam('ghi-chu:b', 'khác')).toBe(true)
    expect(docNhapTam('ghi-chu:a')).toBe(chu)
    expect(docNhapTam('ghi-chu:b')).toBe('khác')
    xoaNhapTam('ghi-chu:a')
    expect(docNhapTam('ghi-chu:a')).toBeNull()
    expect(docNhapTam('ghi-chu:b')).toBe('khác')
  })

  it('chữ rỗng vẫn là một bản tạm (người dùng xoá hết chữ)', () => {
    luuNhapTam('noi-lai:x', '')
    expect(docNhapTam('noi-lai:x')).toBe('')
  })

  it('có tiền tố riêng: không đụng khoá khác của sessionStorage', () => {
    sessionStorage.setItem('ghi-chu:a', 'của trang khác')
    luuNhapTam('ghi-chu:a', 'của app')
    expect(sessionStorage.getItem('ghi-chu:a')).toBe('của trang khác')
    xoaNhapTam('ghi-chu:a')
    expect(sessionStorage.getItem('ghi-chu:a')).toBe('của trang khác')
  })

  it('sessionStorage hết chỗ / bị chặn: không ném lỗi, báo không lưu được', () => {
    // Prototype của chính sessionStorage đang dùng (Node 25 có Storage riêng, khác Storage của jsdom).
    const proto = Object.getPrototypeOf(window.sessionStorage) as Storage
    vi.spyOn(proto, 'setItem').mockImplementation(() => {
      throw new DOMException('đầy', 'QuotaExceededError')
    })
    vi.spyOn(proto, 'getItem').mockImplementation(() => {
      throw new DOMException('chặn', 'SecurityError')
    })
    vi.spyOn(proto, 'removeItem').mockImplementation(() => {
      throw new DOMException('chặn', 'SecurityError')
    })
    expect(luuNhapTam('k', 'chữ')).toBe(false)
    expect(docNhapTam('k')).toBeNull()
    expect(() => xoaNhapTam('k')).not.toThrow()
  })

  it('không truy cập được sessionStorage (getter ném lỗi): vẫn chạy', () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('chặn', 'SecurityError')
    })
    expect(luuNhapTam('k', 'chữ')).toBe(false)
    expect(docNhapTam('k')).toBeNull()
    expect(() => xoaNhapTam('k')).not.toThrow()
  })
})
