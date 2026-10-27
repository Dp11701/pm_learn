// Bố cục hiện của bài (đề xuất 3.6 "Hiện ở bài", D8, D13, D15): khối có chữ hiện theo thứ tự mẫu, khối ★
// trống → ô "Chưa có", khối tuỳ chọn trống ẩn, khối do app tạo đúng chỗ, khối lạ sau cùng; mục lục, số câu
// hỏi, neo thanh 4 bước đọc cùng danh sách.
import { describe, expect, it } from 'vitest'
import { phanTichBai } from '../../../shared/noi-dung'
import { cacOHien, mucLuc, neoBonBuoc, soCauHoi, tenKhoi } from '../../../src/pages/bai-hoc/bo-cuc'
import { fileChuDe, giuCho, muc } from './ho-tro'

const sc = muc('scope-creep')

describe('cacOHien', () => {
  it('bài Chủ đề đủ khối: theo thứ tự mẫu, Nói lại sau Góc dev lead, không có khối tuỳ chọn trống', () => {
    const bai = phanTichBai(fileChuDe(sc), sc)
    const cac = cacOHien(bai, { coLienQuan: false })
    expect(cac.map((o) => `${o.loai}:${o.id}`)).toEqual([
      'khoi:tom-tat',
      'khoi:vi-sao-pm-can-biet',
      'khoi:khai-niem-cot-loi',
      'khoi:vi-du-thuc-te',
      'khoi:cach-ap-dung',
      'khoi:goc-dev-lead-pm',
      'app:noi-lai-bang-loi-cua-ban',
      'khoi:thuc-hanh-tren-du-an-that',
      'khoi:tu-kiem-tra',
      'khoi:tham-khao',
    ])
  })

  it('khối ★ thiếu → ô "thieu" đúng chỗ; Mục liên quan chỉ khi lien_quan tra được mục', () => {
    const bai = phanTichBai(fileChuDe(sc, { bo: ['Tự kiểm tra'] }), sc)
    const cac = cacOHien(bai, { coLienQuan: true })
    const i = cac.findIndex((o) => o.id === 'tu-kiem-tra')
    expect(cac[i]).toMatchObject({ loai: 'thieu', ten: 'Tự kiểm tra' })
    expect(cac[i + 1]).toMatchObject({ loai: 'app', id: 'muc-lien-quan' })
    expect(cac.at(-1)?.id).toBe('tham-khao')
  })

  it('khối 7 (tuỳ chọn, D13): có chữ thì hiện với tên viết trong file; khối trùng hiện cả hai; khối lạ sau cùng', () => {
    const bai = phanTichBai(
      fileChuDe(sc, {
        them: [
          ['thuật ngữ', giuCho('Thuật ngữ')],
          ['Tóm tắt', giuCho('Tóm tắt lần hai')],
          ['Khối riêng của tôi', giuCho('Khối lạ')],
        ],
      }),
      sc,
    )
    const cac = cacOHien(bai, { coLienQuan: false })
    expect(cac.find((o) => o.id === 'so-sanh')).toMatchObject({ loai: 'khoi', ten: 'Thuật ngữ' })
    expect(cac.slice(0, 2).map((o) => o.id)).toEqual(['tom-tat', 'tom-tat-2'])
    expect(cac.at(-1)).toMatchObject({
      loai: 'khoi',
      id: 'khoi-khac-1',
      ten: 'Khối riêng của tôi',
      mau: null,
    })
  })

  it('Tài liệu: Bản của tôi là khối do app tạo đúng vị trí; Chứng chỉ: Kế hoạch thi; Nhật ký thi thử (P2) ẩn', () => {
    const rr = muc('risk-register')
    const bai = phanTichBai(
      ['---', `id: ${rr.id}`, 'loai: tai-lieu', '---', '', '## Mục đích', giuCho('Mục đích')].join(
        '\n',
      ),
      rr,
    )
    const cac = cacOHien(bai, { coLienQuan: false })
    expect(cac.filter((o) => o.loai === 'app').map((o) => o.id)).toEqual([
      'noi-lai-bang-loi-cua-ban',
      'ban-cua-toi',
    ])
    const pmp = muc('project-management-professional-pmp')
    const baiCc = phanTichBai(
      ['---', `id: ${pmp.id}`, 'loai: chung-chi', '---', '', '## Tóm tắt', giuCho('Tóm tắt')].join(
        '\n',
      ),
      pmp,
    )
    const cacCc = cacOHien(baiCc, { coLienQuan: false })
    expect(cacCc.filter((o) => o.loai === 'app').map((o) => o.id)).toEqual([
      'noi-lai-bang-loi-cua-ban',
      'ke-hoach-thi-cua-toi',
    ])
    expect(cacCc.some((o) => o.id === 'nhat-ky-thi-thu')).toBe(false)
  })
})

describe('mucLuc (D15), soCauHoi (D8), neoBonBuoc', () => {
  it('mục lục chỉ gồm ô đang hiện, đúng thứ tự trang', () => {
    const bai = phanTichBai(fileChuDe(sc, { bo: ['Ví dụ thực tế'] }), sc)
    const cac = cacOHien(bai, { coLienQuan: false })
    const ml = mucLuc(cac)
    expect(ml.map((m) => m.id)).toEqual(cac.map((o) => o.id))
    expect(ml.some((m) => m.id === 'so-sanh' || m.id === 'muc-lien-quan')).toBe(false)
    expect(ml.find((m) => m.id === 'vi-du-thuc-te')?.ten).toBe('Ví dụ thực tế')
  })

  it('đếm câu Tự kiểm tra; không có câu → 0', () => {
    expect(soCauHoi(cacOHien(phanTichBai(fileChuDe(sc), sc), { coLienQuan: false }))).toBe(2)
    const khong = phanTichBai(fileChuDe(sc, { bo: ['Tự kiểm tra'] }), sc)
    expect(soCauHoi(cacOHien(khong, { coLienQuan: false }))).toBe(0)
  })

  it('neo 4 bước trỏ tới ô đang hiện: Hiểu → Nói lại, Áp dụng → Thực hành, Kiểm tra → Tự kiểm tra', () => {
    const cac = cacOHien(phanTichBai(fileChuDe(sc), sc), { coLienQuan: false })
    expect(neoBonBuoc(cac)).toEqual({
      hieu: '#noi-lai-bang-loi-cua-ban',
      'ap-dung': '#thuc-hanh-tren-du-an-that',
      'kiem-tra': '#tu-kiem-tra',
    })
    const thieu = cacOHien(
      phanTichBai(fileChuDe(sc, { bo: ['Tự kiểm tra', 'Thực hành trên dự án thật'] }), sc),
      {
        coLienQuan: false,
      },
    )
    // Ô "Chưa có" không phải neo — trừ Thực hành: phần làm bài luôn có (hồi quy review: bước Áp dụng không có neo)
    expect(neoBonBuoc(thieu)).toEqual({
      hieu: '#noi-lai-bang-loi-cua-ban',
      'ap-dung': '#thuc-hanh-tren-du-an-that',
    })
  })

  it('tenKhoi: tên viết hoa / thường khác vẫn hiện đúng tên của mẫu', () => {
    const bai = phanTichBai(
      fileChuDe(sc, { bo: ['Tóm tắt'], them: [['TÓM TẮT', giuCho('Tóm tắt')]] }),
      sc,
    )
    expect(tenKhoi(bai.khoi.find((k) => k.mau?.id === 'tom-tat')!)).toBe('Tóm tắt')
  })
})
