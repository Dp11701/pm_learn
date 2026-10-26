import { describe, expect, it } from 'vitest'
import { taoSlug } from '../../shared/roadmap'
import {
  MAU_BAI,
  TEN_KHOI_APP,
  duKhoiChuaCo,
  khoiTrongFile,
  type KhoiMau,
} from '../../shared/noi-dung'

const dangDoc = (k: KhoiMau) =>
  `${k.batBuoc ? '★ ' : ''}${[k.tieuDe, ...k.tenKhac].join(' / ')}${k.nguon === 'app' ? ' (app)' : ''}`

describe('danh sách khối của 3 mẫu (§8.5, §8.6, §8.6b, D13, 1.5)', () => {
  it('Chủ đề: 11 khối của §8.5 + "Nói lại" sau khối 6; 9 khối ★', () => {
    expect(MAU_BAI['chu-de'].khoi.map(dangDoc)).toEqual([
      '★ Tóm tắt',
      '★ Vì sao PM cần biết',
      '★ Khái niệm cốt lõi',
      '★ Ví dụ thực tế',
      '★ Cách áp dụng',
      '★ Góc dev lead → PM',
      'Nói lại bằng lời của bạn (app)',
      'So sánh / Thuật ngữ / Thực hành công cụ',
      '★ Thực hành trên dự án thật',
      '★ Tự kiểm tra',
      'Mục liên quan (app)',
      '★ Tham khảo',
    ])
    expect(MAU_BAI['chu-de'].tongBatBuoc).toBe(9)
  })

  it('Tài liệu: 10 khối của §8.6 + "Nói lại" sau khối 3; 8 khối ★ (gồm Bản của tôi)', () => {
    expect(MAU_BAI['tai-lieu'].khoi.map(dangDoc)).toEqual([
      '★ Mục đích',
      '★ Khi nào lập, ai lập, ai duyệt',
      '★ Cấu trúc tài liệu',
      'Nói lại bằng lời của bạn (app)',
      '★ Mẫu điền sẵn',
      '★ Checklist chất lượng',
      'Lỗi thường gặp',
      '★ Bản của tôi (app)',
      '★ Tự kiểm tra',
      'Mục liên quan (app)',
      '★ Tham khảo',
    ])
    expect(MAU_BAI['tai-lieu'].tongBatBuoc).toBe(8)
  })

  it('Chứng chỉ: 9 khối của §8.6b + "Nói lại" sau khối 2; 7 khối ★ (gồm Kế hoạch thi)', () => {
    expect(MAU_BAI['chung-chi'].khoi.map(dangDoc)).toEqual([
      '★ Tóm tắt',
      '★ Dành cho ai',
      'Nói lại bằng lời của bạn (app)',
      '★ Thông tin kỳ thi',
      '★ Phủ roadmap',
      '★ Kế hoạch thi của tôi (app)',
      'Nhật ký thi thử (app)',
      '★ Tự kiểm tra',
      'Mục liên quan (app)',
      '★ Tham khảo',
    ])
    expect(MAU_BAI['chung-chi'].tongBatBuoc).toBe(7)
  })

  it('số thứ tự khối khớp danh sách đánh số của đặc tả', () => {
    expect(MAU_BAI['chu-de'].khoi.map((k) => k.so)).toEqual([
      1,
      2,
      3,
      4,
      5,
      6,
      null,
      7,
      8,
      9,
      10,
      11,
    ])
    expect(MAU_BAI['tai-lieu'].khoi.map((k) => k.so)).toEqual([1, 2, 3, null, 4, 5, 6, 7, 8, 9, 10])
    expect(MAU_BAI['chung-chi'].khoi.map((k) => k.so)).toEqual([1, 2, null, 3, 4, 5, 6, 7, 8, 9])
  })

  it('id khối = slug của tên khối (dùng làm neo, vd. #ban-cua-toi), duy nhất trong mẫu', () => {
    for (const mau of Object.values(MAU_BAI)) {
      for (const k of mau.khoi) expect(k.id).toBe(taoSlug(k.tieuDe))
      expect(new Set(mau.khoi.map((k) => k.id)).size).toBe(mau.khoi.length)
    }
    expect(MAU_BAI['tai-lieu'].khoi.find((k) => k.kieu === 'ban-cua-toi')?.id).toBe('ban-cua-toi')
  })

  it('kiểu khối theo bảng quy ước 1.5', () => {
    const kieu = (mau: keyof typeof MAU_BAI) =>
      Object.fromEntries(MAU_BAI[mau].khoi.map((k) => [k.tieuDe, k.kieu]))
    expect(kieu('chu-de')).toMatchObject({
      'Khái niệm cốt lõi': 'dinh-nghia',
      'Góc dev lead → PM': 'goc-dev-lead',
      'Thực hành trên dự án thật': 'thuc-hanh',
      'Tự kiểm tra': 'tu-kiem-tra',
      'Tham khảo': 'tham-khao',
    })
    expect(kieu('tai-lieu')).toMatchObject({
      'Khi nào lập, ai lập, ai duyệt': 'process-group',
      'Mẫu điền sẵn': 'mau-dien-san',
      'Checklist chất lượng': 'checklist',
    })
    expect(kieu('chung-chi')).toMatchObject({
      'Thông tin kỳ thi': 'thong-tin-thi',
      'Phủ roadmap': 'phu-roadmap',
    })
    const gocDevLead = MAU_BAI['chu-de'].khoi.find((k) => k.kieu === 'goc-dev-lead')
    expect(gocDevLead?.mucCon).toEqual(['Bạn đã quen', 'Điều cần đổi'])
    const thucHanh = MAU_BAI['chu-de'].khoi.find((k) => k.kieu === 'thuc-hanh')
    expect(thucHanh?.mucCon).toEqual(['Đề bài', 'Đầu ra', 'Tiêu chí tự kiểm'])
  })

  it('khối do app tạo và khối trong file', () => {
    expect(TEN_KHOI_APP).toEqual([
      'Nói lại bằng lời của bạn',
      'Mục liên quan',
      'Bản của tôi',
      'Kế hoạch thi của tôi',
      'Nhật ký thi thử',
    ])
    expect(khoiTrongFile('chu-de')).toHaveLength(10)
    expect(khoiTrongFile('tai-lieu')).toHaveLength(8)
    expect(khoiTrongFile('chung-chi')).toHaveLength(6)
  })

  it('Đủ khối khi chưa có file: 0/9, 0/8, 0/7', () => {
    expect(duKhoiChuaCo('chu-de')).toEqual({ co: 0, tong: 9 })
    expect(duKhoiChuaCo('tai-lieu')).toEqual({ co: 0, tong: 8 })
    expect(duKhoiChuaCo('chung-chi')).toEqual({ co: 0, tong: 7 })
  })
})
