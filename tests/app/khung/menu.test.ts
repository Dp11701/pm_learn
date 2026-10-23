import { describe, expect, it } from 'vitest'
import {
  MENU,
  ariaCurrent,
  badgeCua,
  menuDangMo,
  tieuDeMacDinh,
} from '../../../src/app/khung/menu'
import { DU_LIEU_KHUNG_TRONG } from '../../../src/app/khung/du-lieu-khung'
import { layCay } from '../../../shared/roadmap'

const cay = layCay()
const chuDe = cay.mucHoc.find((m) => m.mau === 'chu-de')!
const chungChi = cay.mucHoc.find((m) => m.mau === 'chung-chi')!

describe('menu khung (§6.1)', () => {
  it('đúng thứ tự và route của §6.1', () => {
    expect(MENU.map((m) => [m.nhan, m.den])).toEqual([
      ['Tổng quan', '/'],
      ['Lộ trình', '/lo-trinh'],
      ['Ôn tập', '/on-tap'],
      ['Nội dung', '/noi-dung'],
      ['Thống kê', '/thong-ke'],
      ['Bộ hồ sơ dự án', '/ho-so'],
      ['Chứng chỉ', '/chung-chi'],
      ['Thuật ngữ', '/thuat-ngu'],
      ['Ghi chú', '/ghi-chu'],
      ['Cài đặt', '/cai-dat'],
    ])
  })

  it('trang của mục menu → chinhXac; trang con → không', () => {
    expect(menuDangMo('/')).toEqual({ khoa: 'tong-quan', chinhXac: true })
    expect(menuDangMo('/lo-trinh')).toEqual({ khoa: 'lo-trinh', chinhXac: true })
    expect(menuDangMo('/cai-dat/')).toEqual({ khoa: 'cai-dat', chinhXac: true })
    expect(menuDangMo('/on-tap/phien')).toEqual({ khoa: 'on-tap', chinhXac: false })
    expect(menuDangMo('/noi-dung')).toEqual({ khoa: 'noi-dung', chinhXac: true })
  })

  it('bài học tô Lộ trình, bài Chứng chỉ tô Chứng chỉ (F11, F34b); lĩnh vực, phần, lộ trình gợi ý tô Lộ trình', () => {
    expect(menuDangMo(`/hoc/${chuDe.slug}`)).toEqual({ khoa: 'lo-trinh', chinhXac: false })
    expect(menuDangMo(`/hoc/${chuDe.slug}/soan`)).toEqual({ khoa: 'lo-trinh', chinhXac: false })
    expect(menuDangMo(`/hoc/${chungChi.slug}`)).toEqual({ khoa: 'chung-chi', chinhXac: false })
    expect(menuDangMo('/linh-vuc/x')?.khoa).toBe('lo-trinh')
    expect(menuDangMo('/phan/x')?.khoa).toBe('lo-trinh')
    expect(menuDangMo('/lo-trinh-goi-y')?.khoa).toBe('lo-trinh')
    expect(menuDangMo('/khong-co')).toBeNull()
    expect(menuDangMo('/chao-mung')).toBeNull()
  })

  it('aria-current: page / true / không có', () => {
    expect(ariaCurrent({ khoa: 'lo-trinh', chinhXac: true }, 'lo-trinh')).toBe('page')
    expect(ariaCurrent({ khoa: 'lo-trinh', chinhXac: false }, 'lo-trinh')).toBe('true')
    expect(ariaCurrent({ khoa: 'lo-trinh', chinhXac: true }, 'on-tap')).toBeUndefined()
    expect(ariaCurrent(null, 'on-tap')).toBeUndefined()
  })

  it('badge: đặc ở Ôn tập, viền ở Nội dung, 0 thì không có', () => {
    expect(badgeCua('on-tap', DU_LIEU_KHUNG_TRONG)).toBeNull()
    expect(badgeCua('noi-dung', DU_LIEU_KHUNG_TRONG)).toBeNull()
    const duLieu = { ...DU_LIEU_KHUNG_TRONG, soTheDenHan: 12, soBanNhap: 1234 }
    expect(badgeCua('on-tap', duLieu)).toEqual({ so: '12', moTa: '12 thẻ đến hạn', kieu: 'dac' })
    expect(badgeCua('noi-dung', duLieu)).toEqual({
      so: '1.234',
      moTa: '1.234 bản nháp',
      kieu: 'vien',
    })
    expect(badgeCua('thong-ke', duLieu)).toBeNull()
  })

  it('tiêu đề top bar mặc định = tên mục menu, ngoài menu = tên app', () => {
    expect(tieuDeMacDinh('/')).toBe('Tổng quan')
    expect(tieuDeMacDinh('/on-tap/phien')).toBe('Ôn tập')
    expect(tieuDeMacDinh('/khong-co')).toBe('Học PM A–Z')
  })
})
