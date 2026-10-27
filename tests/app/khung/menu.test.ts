import { describe, expect, it } from 'vitest'
import {
  MENU,
  TEN_APP,
  ariaCurrent,
  badgeCua,
  laClickRaNgoai,
  menuDangMo,
  tenTrangTuRoute,
  tieuDeMacDinh,
} from '../../../src/app/khung/menu'
import { DU_LIEU_KHUNG_TRONG } from '../../../src/app/khung/du-lieu-khung'
import { chuBadge } from '../../../src/components/trang-thai/Badge'
import { layCay } from '../../../shared/roadmap'

const cay = layCay()
const chuDe = cay.mucHoc.find((m) => m.mau === 'chu-de')!
const chungChi = cay.mucHoc.find((m) => m.mau === 'chung-chi')!

describe('menu khung (§6.1; phạm vi rút gọn — đề xuất mục 10)', () => {
  it('chỉ còn 4 mục theo thứ tự §6.1: Tổng quan · Lộ trình · Ôn tập · Nội dung', () => {
    expect(MENU.map((m) => [m.nhan, m.den])).toEqual([
      ['Tổng quan', '/'],
      ['Lộ trình', '/lo-trinh'],
      ['Ôn tập', '/on-tap'],
      ['Nội dung', '/noi-dung'],
    ])
  })

  it('trang của mục menu → chinhXac; trang con → không', () => {
    expect(menuDangMo('/')).toEqual({ khoa: 'tong-quan', chinhXac: true })
    expect(menuDangMo('/lo-trinh')).toEqual({ khoa: 'lo-trinh', chinhXac: true })
    expect(menuDangMo('/noi-dung/')).toEqual({ khoa: 'noi-dung', chinhXac: true })
    expect(menuDangMo('/on-tap/phien')).toEqual({ khoa: 'on-tap', chinhXac: false })
    expect(menuDangMo('/noi-dung')).toEqual({ khoa: 'noi-dung', chinhXac: true })
  })

  it('bài học mọi mẫu (cả Chứng chỉ — trang Chứng chỉ đã bỏ) và lĩnh vực tô Lộ trình (F11)', () => {
    expect(menuDangMo(`/hoc/${chuDe.slug}`)).toEqual({ khoa: 'lo-trinh', chinhXac: false })
    expect(menuDangMo(`/hoc/${chungChi.slug}`)).toEqual({ khoa: 'lo-trinh', chinhXac: false })
    expect(menuDangMo('/linh-vuc/x')?.khoa).toBe('lo-trinh')
    expect(menuDangMo('/khong-co')).toBeNull()
  })

  it('đường dẫn của trang đã bỏ không tô mục nào (chúng là 404)', () => {
    for (const d of ['/thong-ke', '/ho-so', '/chung-chi', '/thuat-ngu', '/ghi-chu', '/cai-dat']) {
      expect(menuDangMo(d)).toBeNull()
    }
    expect(menuDangMo('/chao-mung')).toBeNull()
    expect(menuDangMo('/lo-trinh-goi-y')).toBeNull()
    expect(menuDangMo('/phan/x')).toBeNull()
  })

  it('aria-current: page / true / không có', () => {
    expect(ariaCurrent({ khoa: 'lo-trinh', chinhXac: true }, 'lo-trinh')).toBe('page')
    expect(ariaCurrent({ khoa: 'lo-trinh', chinhXac: false }, 'lo-trinh')).toBe('true')
    expect(ariaCurrent({ khoa: 'lo-trinh', chinhXac: true }, 'on-tap')).toBeUndefined()
    expect(ariaCurrent(null, 'on-tap')).toBeUndefined()
  })

  it('badge: đặc ở Ôn tập, viền ở Nội dung, 0 (hoặc âm) thì không có; mô tả giữ đủ số', () => {
    expect(badgeCua('on-tap', DU_LIEU_KHUNG_TRONG)).toBeNull()
    expect(badgeCua('noi-dung', DU_LIEU_KHUNG_TRONG)).toBeNull()
    expect(badgeCua('on-tap', { ...DU_LIEU_KHUNG_TRONG, soTheDenHan: -1 })).toBeNull()
    const duLieu = { ...DU_LIEU_KHUNG_TRONG, soTheDenHan: 12, soBanNhap: 1234 }
    expect(badgeCua('on-tap', duLieu)).toEqual({ so: 12, moTa: '12 thẻ đến hạn', kieu: 'dac' })
    expect(badgeCua('noi-dung', duLieu)).toEqual({ so: 1234, moTa: '1.234 bản nháp', kieu: 'vien' })
    expect(badgeCua('lo-trinh', duLieu)).toBeNull()
    expect(badgeCua('tong-quan', duLieu)).toBeNull()
  })

  it('badge > 99: C7 hiện "99+" (đề xuất 3.3)', () => {
    const duLieu = { ...DU_LIEU_KHUNG_TRONG, soTheDenHan: 99, soBanNhap: 100 }
    expect(chuBadge(badgeCua('on-tap', duLieu)!.so)).toBe('99')
    expect(chuBadge(badgeCua('noi-dung', duLieu)!.so)).toBe('99+')
  })

  it('tiêu đề top bar mặc định = tên mục menu, ngoài menu = tên app', () => {
    expect(tieuDeMacDinh('/')).toBe('Tổng quan')
    expect(tieuDeMacDinh('/on-tap/phien')).toBe('Ôn tập')
    expect(tieuDeMacDinh('/khong-co')).toBe('Học PM A–Z')
    expect(TEN_APP).toBe('Học PM A–Z')
  })

  it('tên trang từ handle của route sâu nhất có đặt', () => {
    expect(tenTrangTuRoute([])).toBeUndefined()
    expect(
      tenTrangTuRoute([
        { handle: undefined },
        { handle: { tenTrang: 'Ôn tập' } },
        { handle: { tenTrang: 'Phiên ôn' } },
        { handle: null },
      ]),
    ).toBe('Phiên ôn')
    expect(tenTrangTuRoute([{ handle: { tenTrang: '' } }, { handle: { khac: 1 } }])).toBeUndefined()
  })

  it('click mở tab mới (phím bổ trợ, chuột giữa) không tính là điều hướng trong app', () => {
    const thuong = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }
    expect(laClickRaNgoai(thuong)).toBe(false)
    expect(laClickRaNgoai({ ...thuong, metaKey: true })).toBe(true)
    expect(laClickRaNgoai({ ...thuong, ctrlKey: true })).toBe(true)
    expect(laClickRaNgoai({ ...thuong, shiftKey: true })).toBe(true)
    expect(laClickRaNgoai({ ...thuong, altKey: true })).toBe(true)
    expect(laClickRaNgoai({ ...thuong, button: 1 })).toBe(true)
  })
})
