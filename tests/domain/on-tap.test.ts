// Quy tắc thuần của phiên ôn (bước 3; đề xuất 3.5, 6 "Qua năm"): thứ tự thẻ đến hạn, cửa sổ tỉ lệ nhớ 30 ngày,
// đến hạn, Leitner theo ngày lịch của giờ máy. Chạy ở cả Asia/Ho_Chi_Minh và America/Los_Angeles (npm run test:tz):
// thời điểm dựng theo giờ địa phương nên kết quả không được phụ thuộc múi giờ.
import { describe, expect, it } from 'vitest'
import { ngayCua } from '../../shared/clock'
import {
  denHan,
  ngayDauTiLeNho,
  sauKhiOn,
  soThuTuOn,
  theMoi,
  type TheOn,
} from '../../server/du-lieu/hop-dong-the'

function the(id: number, hanOn: string, hop: number, taoLuc: string): TheOn {
  return { id, itemId: 'x', truoc: 'H', sau: 'Đ', hop, hanOn, taoLuc }
}

/** Ms của một giờ địa phương (tháng tính từ 1). */
const gioDiaPhuong = (y: number, m: number, d: number, h: number, phut: number) =>
  new Date(y, m - 1, d, h, phut).getTime()

describe('thứ tự phiên ôn: hạn → hộp → lúc tạo → id', () => {
  it('xếp đúng từng khoá', () => {
    const cac = [
      the(1, '2026-10-27', 2, '2026-10-01T00:00:00.000Z'),
      the(2, '2026-10-27', 1, '2026-10-05T00:00:00.000Z'),
      the(3, '2026-10-20', 3, '2026-10-09T00:00:00.000Z'),
      the(4, '2026-10-27', 1, '2026-10-02T00:00:00.000Z'),
      the(6, '2026-10-27', 1, '2026-10-02T00:00:00.000Z'),
      the(5, '2026-10-27', 1, '2026-10-02T00:00:00.000Z'),
    ]
    expect([...cac].sort(soThuTuOn).map((t) => t.id)).toEqual([3, 4, 5, 6, 2, 1])
  })
})

describe('đến hạn và cửa sổ tỉ lệ nhớ', () => {
  it('đến hạn khi hạn ≤ hôm nay', () => {
    expect(denHan({ hanOn: '2026-10-27' }, '2026-10-27')).toBe(true)
    expect(denHan({ hanOn: '2026-10-01' }, '2026-10-27')).toBe(true)
    expect(denHan({ hanOn: '2026-10-28' }, '2026-10-27')).toBe(false)
    // Qua năm: so chuỗi YYYY-MM-DD
    expect(denHan({ hanOn: '2026-12-31' }, '2027-01-01')).toBe(true)
  })

  it('30 ngày gồm cả hôm nay, qua tháng / năm / 29-2', () => {
    expect(ngayDauTiLeNho('2026-10-27')).toBe('2026-09-28')
    expect(ngayDauTiLeNho('2027-01-15')).toBe('2026-12-17')
    expect(ngayDauTiLeNho('2028-03-01')).toBe('2028-02-01')
    expect(ngayDauTiLeNho('2027-03-01')).toBe('2027-01-31')
  })
})

describe('Leitner theo ngày lịch địa phương', () => {
  it('thẻ tạo 23:50 ngày 31/12 hạn 01/01 năm sau', () => {
    expect(theMoi(ngayCua(gioDiaPhuong(2026, 12, 31, 23, 50)))).toEqual({
      hop: 1,
      hanOn: '2027-01-01',
    })
  })

  it('hộp 2 Nhớ 23:30 ngày 30/12/2026 → hộp 3, hạn 03/01/2027', () => {
    const ngayOn = ngayCua(gioDiaPhuong(2026, 12, 30, 23, 30))
    expect(ngayOn).toBe('2026-12-30')
    expect(sauKhiOn(2, 'nho', ngayOn)).toEqual({ hop: 3, hanOn: '2027-01-03' })
  })

  it('qua ngày đổi giờ (DST Los Angeles 14/03/2027): cộng ngày lịch, không cộng mili-giây', () => {
    const ngayOn = ngayCua(gioDiaPhuong(2027, 3, 7, 23, 30))
    expect(ngayOn).toBe('2027-03-07')
    expect(sauKhiOn(3, 'nho', ngayOn)).toEqual({ hop: 4, hanOn: '2027-03-15' })
    // Ôn đúng ngày đổi giờ, sát nửa đêm
    const ngayDoiGio = ngayCua(gioDiaPhuong(2027, 3, 14, 0, 30))
    expect(ngayDoiGio).toBe('2027-03-14')
    expect(sauKhiOn(4, 'nho', ngayDoiGio)).toEqual({ hop: 5, hanOn: '2027-03-30' })
    expect(sauKhiOn(5, 'quen', ngayDoiGio)).toEqual({ hop: 1, hanOn: '2027-03-15' })
    // DST kết thúc (07/11/2027)
    expect(sauKhiOn(1, 'nho', ngayCua(gioDiaPhuong(2027, 11, 6, 23, 59)))).toEqual({
      hop: 2,
      hanOn: '2027-11-08',
    })
  })
})
