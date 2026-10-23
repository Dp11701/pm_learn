// Chạy ở cả Asia/Ho_Chi_Minh và America/Los_Angeles (npm run test:tz).
// Thời điểm cục bộ dựng bằng new Date(y, m, d, h, mi) nên kỳ vọng đúng ở mọi TZ.
import { describe, expect, it } from 'vitest'
import {
  LOI_NGAY,
  dinhDangDongHo,
  dinhDangGioPhut,
  dinhDangNgay,
  dinhDangNgayCoThu,
  dinhDangPhanTram,
  dinhDangSo,
  dinhDangThoiLuong,
  docNgay,
  tenThu,
  tinhPhanTram,
} from '../../shared/dinh-dang'

const gioCucBo = (y: number, m: number, d: number, h = 0, mi = 0) =>
  new Date(y, m - 1, d, h, mi).getTime()

describe('dinhDangNgay', () => {
  it('YYYY-MM-DD → dd/MM/yyyy, không lệch ngày theo múi giờ', () => {
    expect(dinhDangNgay('2026-10-22')).toBe('22/10/2026')
    expect(dinhDangNgay('2027-01-05')).toBe('05/01/2027')
  })

  it('ms và ISO lấy ngày theo múi giờ máy', () => {
    const nuaDem = gioCucBo(2026, 10, 22)
    expect(dinhDangNgay(nuaDem)).toBe('22/10/2026')
    expect(dinhDangNgay(nuaDem - 1)).toBe('21/10/2026')
    expect(dinhDangNgay(new Date(nuaDem).toISOString())).toBe('22/10/2026')
  })

  it('ném lỗi với ngày không có thật', () => {
    expect(() => dinhDangNgay('2026-02-31')).toThrow(RangeError)
    expect(() => dinhDangNgay('abc')).toThrow(RangeError)
  })
})

describe('tenThu, dinhDangNgayCoThu', () => {
  it('22/10/2026 là Thứ Năm', () => {
    expect(tenThu('2026-10-22')).toBe('Thứ Năm')
    expect(dinhDangNgayCoThu('2026-10-22')).toBe('Thứ Năm, 22/10/2026')
  })

  it('đủ tên 7 thứ', () => {
    const tuan = ['19', '20', '21', '22', '23', '24', '25'].map((d) => tenThu(`2026-10-${d}`))
    expect(tuan).toEqual([
      'Thứ Hai',
      'Thứ Ba',
      'Thứ Tư',
      'Thứ Năm',
      'Thứ Sáu',
      'Thứ Bảy',
      'Chủ nhật',
    ])
  })
})

describe('docNgay', () => {
  it('đọc dd/MM/yyyy', () => {
    expect(docNgay('22/10/2026')).toEqual({ ok: true, ngay: '2026-10-22' })
    expect(docNgay('29/02/2028')).toEqual({ ok: true, ngay: '2028-02-29' })
    expect(docNgay('  17/09/2026 ')).toEqual({ ok: true, ngay: '2026-09-17' })
  })

  it('chấp nhận ngày, tháng 1 chữ số', () => {
    expect(docNgay('5/1/2027')).toEqual({ ok: true, ngay: '2027-01-05' })
  })

  it('từ chối với đúng câu lỗi', () => {
    expect(LOI_NGAY).toBe('Ngày không hợp lệ. Nhập theo dd/MM/yyyy.')
    for (const x of [
      '31/02/2027',
      '29/02/2027',
      '2026-10-22',
      '',
      '   ',
      '22/10/26',
      '22-10-2026',
      '22.10.2026',
      '32/01/2027',
      '00/01/2027',
      '22/13/2026',
      '22/00/2026',
      '222/10/2026',
      '22/10/2026x',
      '22/10/0999',
    ]) {
      expect(docNgay(x), x).toEqual({ ok: false, loi: 'Ngày không hợp lệ. Nhập theo dd/MM/yyyy.' })
    }
  })

  it('đọc lại được chuỗi đã định dạng', () => {
    for (const ngay of ['2026-10-22', '2026-12-31', '2027-01-01', '2028-02-29']) {
      expect(docNgay(dinhDangNgay(ngay))).toEqual({ ok: true, ngay })
    }
  })
})

describe('dinhDangGioPhut', () => {
  it('HH:mm 24h theo giờ máy, từ ms hoặc ISO', () => {
    const t = gioCucBo(2026, 10, 22, 21, 42)
    expect(dinhDangGioPhut(t)).toBe('21:42')
    expect(dinhDangGioPhut(new Date(t).toISOString())).toBe('21:42')
    expect(dinhDangGioPhut(gioCucBo(2026, 10, 22, 0, 5))).toBe('00:05')
    expect(dinhDangGioPhut(gioCucBo(2026, 10, 22, 13, 7))).toBe('13:07')
  })

  it('ném lỗi với chuỗi không phải thời điểm', () => {
    expect(() => dinhDangGioPhut('abc')).toThrow(RangeError)
  })
})

describe('dinhDangThoiLuong', () => {
  const phut = (gio: number, p: number) => (gio * 60 + p) * 60

  it('ví dụ của frame', () => {
    expect(dinhDangThoiLuong(phut(4, 35))).toBe('4 giờ 35 phút')
    expect(dinhDangThoiLuong(phut(0, 35))).toBe('35 phút')
    expect(dinhDangThoiLuong(0)).toBe('0 phút')
    expect(dinhDangThoiLuong(phut(1, 5))).toBe('1 giờ 05 phút')
    expect(dinhDangThoiLuong(phut(6, 0))).toBe('6 giờ')
    expect(dinhDangThoiLuong(phut(38, 10))).toBe('38 giờ 10 phút')
    expect(dinhDangThoiLuong(phut(9, 12))).toBe('9 giờ 12 phút')
  })

  it('làm tròn xuống tới phút, không âm', () => {
    expect(dinhDangThoiLuong(59)).toBe('0 phút')
    expect(dinhDangThoiLuong(60)).toBe('1 phút')
    expect(dinhDangThoiLuong(phut(4, 35) + 59)).toBe('4 giờ 35 phút')
    expect(dinhDangThoiLuong(phut(1, 0) - 1)).toBe('59 phút')
    expect(dinhDangThoiLuong(-30)).toBe('0 phút')
  })
})

describe('dinhDangDongHo', () => {
  it('HH:mm:ss, giờ vượt 24 vẫn cộng dồn', () => {
    expect(dinhDangDongHo(24 * 60 + 17)).toBe('00:24:17')
    expect(dinhDangDongHo(0)).toBe('00:00:00')
    expect(dinhDangDongHo(25 * 3600)).toBe('25:00:00')
    expect(dinhDangDongHo(100 * 3600 + 1)).toBe('100:00:01')
    expect(dinhDangDongHo(59.9)).toBe('00:00:59')
    expect(dinhDangDongHo(-5)).toBe('00:00:00')
  })
})

describe('dinhDangSo', () => {
  it('phẩy thập phân, chấm hàng nghìn', () => {
    expect(dinhDangSo(81.5, 1)).toBe('81,5')
    expect(dinhDangSo(1234)).toBe('1.234')
    expect(dinhDangSo(6.25)).toBe('6,25')
    expect(dinhDangSo(0)).toBe('0')
    expect(dinhDangSo(1234567.5, 1)).toBe('1.234.567,5')
  })

  it('soLe cố định số chữ số thập phân', () => {
    expect(dinhDangSo(81, 1)).toBe('81,0')
    expect(dinhDangSo(2 / 3, 2)).toBe('0,67')
    expect(dinhDangSo(6.25, 0)).toBe('6')
  })
})

describe('dinhDangPhanTram', () => {
  it('37/195 → 19% (làm tròn gần nhất)', () => {
    expect(dinhDangPhanTram(37, 195)).toBe('19%')
    expect(tinhPhanTram(37, 195)).toBe(19)
  })

  it('mẫu 0 → —, đủ → 100%, chưa đủ không thành 100%', () => {
    expect(dinhDangPhanTram(0, 0)).toBe('—')
    expect(tinhPhanTram(0, 0)).toBeNull()
    expect(dinhDangPhanTram(0, 199)).toBe('0%')
    expect(dinhDangPhanTram(195, 195)).toBe('100%')
    expect(dinhDangPhanTram(199, 200)).toBe('99%')
    expect(tinhPhanTram(1, 200)).toBe(1)
  })
})
