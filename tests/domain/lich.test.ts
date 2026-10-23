// Chạy ở cả Asia/Ho_Chi_Minh và America/Los_Angeles (npm run test:tz): kết quả không được phụ thuộc TZ.
import { describe, expect, it } from 'vitest'
import {
  congNgay,
  danhSachTuanIso,
  dauTuanIso,
  hopLe,
  soNgayGiua,
  soTuanIso,
  thuTrongTuan,
  tuanHocThu,
  tuanIso,
} from '../../shared/lich'

describe('hopLe', () => {
  it('nhận ngày có thật dạng YYYY-MM-DD', () => {
    expect(hopLe('2026-10-22')).toBe(true)
    expect(hopLe('2028-02-29')).toBe(true)
    expect(hopLe('2000-02-29')).toBe(true)
  })

  it('từ chối ngày không có thật và dạng khác', () => {
    for (const x of [
      '2027-02-29',
      '1900-02-29',
      '2026-13-01',
      '2026-00-10',
      '2026-10-32',
      '2026-04-31',
      '2026-1-5',
      '22/10/2026',
      '2026-10-22T00:00',
      '0999-01-01',
      '',
    ]) {
      expect(hopLe(x), x).toBe(false)
    }
  })
})

describe('congNgay, soNgayGiua', () => {
  it('ví dụ trong đề xuất', () => {
    expect(soNgayGiua('2026-10-22', '2027-06-15')).toBe(236)
    expect(soNgayGiua('2027-06-15', '2026-10-22')).toBe(-236)
    expect(congNgay('2026-10-22', 177)).toBe('2027-04-17')
  })

  it('qua ngày DST bắt đầu ở Mỹ vẫn đúng số ngày', () => {
    expect(congNgay('2027-03-07', 8)).toBe('2027-03-15')
    expect(soNgayGiua('2027-03-13', '2027-03-15')).toBe(2)
    // DST kết thúc 07/11/2027
    expect(congNgay('2027-11-06', 1)).toBe('2027-11-07')
    expect(congNgay('2027-11-07', 1)).toBe('2027-11-08')
  })

  it('qua tháng, năm, năm nhuận, số âm', () => {
    expect(congNgay('2026-12-31', 1)).toBe('2027-01-01')
    expect(congNgay('2027-01-01', -1)).toBe('2026-12-31')
    expect(congNgay('2027-02-28', 1)).toBe('2027-03-01')
    expect(congNgay('2028-02-28', 1)).toBe('2028-02-29')
    expect(congNgay('2026-10-22', 0)).toBe('2026-10-22')
    expect(soNgayGiua('2028-01-01', '2029-01-01')).toBe(366)
  })

  it('ném lỗi khi ngày không hợp lệ', () => {
    expect(() => congNgay('2027-02-30', 1)).toThrow(RangeError)
    expect(() => soNgayGiua('22/10/2026', '2026-10-22')).toThrow(RangeError)
  })
})

describe('thuTrongTuan, dauTuanIso', () => {
  it('22/10/2026 là thứ Năm, tuần bắt đầu 19/10/2026', () => {
    expect(thuTrongTuan('2026-10-22')).toBe(4)
    expect(dauTuanIso('2026-10-22')).toBe('2026-10-19')
  })

  it('đủ 7 thứ, Chủ nhật = 7 và thuộc tuần trước đó', () => {
    const tuan = ['19', '20', '21', '22', '23', '24', '25'].map((d) => `2026-10-${d}`)
    expect(tuan.map(thuTrongTuan)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(tuan.map(dauTuanIso)).toEqual(Array(7).fill('2026-10-19'))
    expect(dauTuanIso('2027-01-03')).toBe('2026-12-28')
  })

  it('khớp getUTCDay trên 3 năm liền', () => {
    let ngay = '2026-01-01'
    while (ngay <= '2028-12-31') {
      const [y, m, d] = ngay.split('-').map(Number)
      const utc = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
      expect(thuTrongTuan(ngay), ngay).toBe(utc === 0 ? 7 : utc)
      expect(thuTrongTuan(dauTuanIso(ngay))).toBe(1)
      expect(tuanIso(dauTuanIso(ngay))).toBe(tuanIso(ngay))
      ngay = congNgay(ngay, 1)
    }
  })
})

describe('tuanIso', () => {
  it('ví dụ trong đặc tả', () => {
    expect(tuanIso('2026-10-22')).toBe('2026-W43')
    expect(tuanIso('2026-09-17')).toBe('2026-W38')
  })

  it('qua năm: 2026 có tuần 53', () => {
    expect(tuanIso('2026-12-28')).toBe('2026-W53')
    expect(tuanIso('2026-12-31')).toBe('2026-W53')
    expect(tuanIso('2027-01-01')).toBe('2026-W53')
    expect(tuanIso('2027-01-03')).toBe('2026-W53')
    expect(tuanIso('2027-01-04')).toBe('2027-W01')
    expect(soTuanIso(2026)).toBe(53)
    expect(soTuanIso(2027)).toBe(52)
  })

  it('các ca qua năm đã biết', () => {
    expect(tuanIso('2024-12-30')).toBe('2025-W01')
    expect(tuanIso('2021-01-03')).toBe('2020-W53')
    expect(tuanIso('2021-01-04')).toBe('2021-W01')
    expect(tuanIso('2008-12-29')).toBe('2009-W01')
    expect(tuanIso('2010-01-03')).toBe('2009-W53')
    expect(soTuanIso(2020)).toBe(53)
    expect(soTuanIso(2015)).toBe(53)
    expect(soTuanIso(2025)).toBe(52)
  })
})

describe('tuanHocThu', () => {
  it('bắt đầu 17/09/2026', () => {
    expect(tuanHocThu('2026-09-17', '2026-10-22')).toBe(6)
    expect(tuanHocThu('2026-09-17', '2027-01-05')).toBe(17)
  })

  it('tuần đầu là 1, đổi vào thứ Hai', () => {
    expect(tuanHocThu('2026-09-17', '2026-09-17')).toBe(1)
    expect(tuanHocThu('2026-09-17', '2026-09-20')).toBe(1)
    expect(tuanHocThu('2026-09-17', '2026-09-21')).toBe(2)
  })

  it('không nhỏ hơn 1 khi hôm nay trước ngày bắt đầu', () => {
    expect(tuanHocThu('2026-10-22', '2026-09-17')).toBe(1)
  })
})

describe('danhSachTuanIso', () => {
  it('heatmap qua năm: 2026-W43 … W53 rồi 2027-W01', () => {
    const tuan = danhSachTuanIso('2026-10-22', '2027-01-05')
    const mong = [43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53].map((w) => `2026-W${w}`)
    expect(tuan).toEqual([...mong, '2027-W01'])
  })

  it('cùng tuần → 1 khoá; den trước tu → rỗng', () => {
    expect(danhSachTuanIso('2026-10-19', '2026-10-25')).toEqual(['2026-W43'])
    expect(danhSachTuanIso('2026-10-22', '2026-10-22')).toEqual(['2026-W43'])
    expect(danhSachTuanIso('2026-10-26', '2026-10-25')).toEqual([])
  })

  it('12 tuần của heatmap kết thúc tuần 43', () => {
    const tuan = danhSachTuanIso(congNgay('2026-10-22', -11 * 7), '2026-10-22')
    expect(tuan).toHaveLength(12)
    expect(tuan[0]).toBe('2026-W32')
    expect(tuan.at(-1)).toBe('2026-W43')
  })
})

describe('congNgay kiểm tham số', () => {
  it('n không nguyên hoặc kết quả ngoài 1000–9999 → RangeError', () => {
    expect(() => congNgay('2026-10-22', Number.NaN)).toThrow(RangeError)
    expect(() => congNgay('2026-10-22', 1.5)).toThrow(RangeError)
    expect(() => congNgay('1000-01-01', -1)).toThrow(RangeError)
    expect(() => congNgay('9999-12-31', 1)).toThrow(RangeError)
  })
})
