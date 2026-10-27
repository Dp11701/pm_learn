// Gán lại khoá câu hỏi / tiêu chí khi bài đổi (đề xuất 1.5): Dice(câu cũ đã gấp, câu mới đã gấp) ≥ 0,8 và hơn ứng
// viên thứ hai ≥ 0,15; không rõ thì giữ dưới khoá cũ. Câu / tiêu chí trong bài chỉ lấy từ khối viết đúng quy ước.
import { describe, expect, it } from 'vitest'
import {
  CACH_BIET_GAN_LAI,
  NGUONG_GAN_LAI,
  danhSachTrongBai,
  ganLaiKhoa,
  phanTichBai,
  taoKhoa,
  type DongTrongBai,
} from '../../shared/noi-dung/index'
import { dice, foldVi, khongNhoHon } from '../../shared/tim-kiem/index'
import { layCay } from '../../shared/roadmap/index'

const moi = (...cau: string[]): DongTrongBai[] => {
  const khoa = taoKhoa(cau)
  return cau.map((chu, i) => ({ khoa: khoa[i], chu }))
}
const gan = (cu: Record<string, string | null>, ds: DongTrongBai[]) =>
  Object.fromEntries(
    [
      ...ganLaiKhoa(
        Object.entries(cu).map(([khoa, chu]) => ({ khoa, chu })),
        ds,
      ),
    ].map(([k, m]) => [k, m.chu]),
  )
const diem = (a: string, b: string) => dice(foldVi(a).folded, foldVi(b).folded)

describe('ngưỡng (đề xuất 1.5)', () => {
  it('0,8 và 0,15; so sau khi làm tròn (0,95 − 0,8 không hụt 0,15)', () => {
    expect(NGUONG_GAN_LAI).toBe(0.8)
    expect(CACH_BIET_GAN_LAI).toBe(0.15)
    expect(0.95 - 0.8 < 0.15).toBe(true)
    expect(khongNhoHon(0.95 - 0.8, 0.15)).toBe(true)
    expect(khongNhoHon(0.799999, 0.8)).toBe(false)
  })
})

describe('ganLaiKhoa', () => {
  it('câu sửa nhẹ (Dice ≥ 0,8, không có ứng viên thứ hai) → nối sang câu mới', () => {
    expect(diem('Phạm vi dự án là gì?', 'Phạm vi của dự án là gì?')).toBeGreaterThanOrEqual(0.8)
    expect(gan({ k1: 'Phạm vi dự án là gì?' }, moi('Phạm vi của dự án là gì?'))).toEqual({
      k1: 'Phạm vi của dự án là gì?',
    })
  })

  it('so trên chữ đã gấp: chỉ đổi dấu / hoa thường / dấu câu → Dice 1', () => {
    expect(diem('Phạm vi dự án là gì?', 'pham vi du an la gi')).toBe(1)
    expect(gan({ k1: 'Phạm vi dự án là gì?' }, moi('pham vi du an la gi'))).toEqual({
      k1: 'pham vi du an la gi',
    })
  })

  it('câu đổi hẳn (Dice < 0,8) → không nối', () => {
    expect(diem('Phạm vi dự án là gì?', 'Ai duyệt yêu cầu thay đổi?')).toBeLessThan(0.8)
    expect(gan({ k1: 'Phạm vi dự án là gì?' }, moi('Ai duyệt yêu cầu thay đổi?'))).toEqual({})
  })

  it('hai câu mới cùng giống (hơn nhau < 0,15) → không nối câu nào', () => {
    const cu = 'Liệt kê ba dấu hiệu phạm vi phình to.'
    const a = 'Liệt kê ba dấu hiệu phạm vi phình ra.'
    const b = 'Liệt kê bốn dấu hiệu phạm vi phình to.'
    expect(diem(cu, a)).toBeGreaterThanOrEqual(0.8)
    expect(diem(cu, b)).toBeGreaterThanOrEqual(0.8)
    expect(gan({ k1: cu }, moi(a, b))).toEqual({})
  })

  it('ứng viên thứ hai kém xa (≥ 0,15) → nối câu tốt nhất', () => {
    const cu = 'Có danh sách rủi ro cập nhật'
    expect(
      gan(
        { k1: cu },
        moi('Có người phụ trách cho mỗi rủi ro', 'Có danh sách rủi ro được cập nhật'),
      ),
    ).toEqual({
      k1: 'Có danh sách rủi ro được cập nhật',
    })
  })

  it('hai câu cũ cùng chọn một câu mới mà không rõ hơn → không nối câu nào (không đè câu trả lời)', () => {
    const ds = moi('Khi nào cần mở một yêu cầu thay đổi?')
    const hai = gan(
      { k1: 'Khi nào cần mở yêu cầu thay đổi?', k2: 'Khi nào cần mở yêu cầu thay đổi nhỏ?' },
      ds,
    )
    expect(hai).toEqual({})
    // Câu cũ thứ hai kém xa → câu cũ tốt nhất nhận
    const mot = gan({ k1: 'Khi nào cần mở yêu cầu thay đổi?', k2: 'Phạm vi dự án là gì?' }, ds)
    expect(mot).toEqual({ k1: 'Khi nào cần mở một yêu cầu thay đổi?' })
  })

  it('câu cũ không có chữ (dữ liệu trước migration 6) không nối được; danh sách rỗng → không có gì', () => {
    expect(gan({ k1: null }, moi('Phạm vi dự án là gì?'))).toEqual({})
    expect(gan({}, moi('Phạm vi dự án là gì?'))).toEqual({})
    expect(gan({ k1: 'Phạm vi dự án là gì?' }, [])).toEqual({})
  })
})

describe('danhSachTrongBai', () => {
  const muc = layCay().mucTheoSlug.get('scope-creep')!
  const bai = (than: string) => phanTichBai(`---\nloai: chu-de\nnguon: ai\n---\n\n${than}`, muc)

  it('câu Tự kiểm tra và tiêu chí của khối viết đúng quy ước, khoá = taoKhoa', () => {
    const ds = danhSachTrongBai(
      bai(
        [
          '## Thực hành trên dự án thật',
          '### Đề bài',
          'x',
          '### Đầu ra',
          'y',
          '### Tiêu chí tự kiểm',
          '- [ ] Tiêu chí A',
          '- [x] Tiêu chí B',
          '',
          '## Tự kiểm tra',
          '- H: Câu một? | Đ: Một',
          '- H: Câu một? | Đ: Lặp lại',
        ].join('\n'),
      ),
    )
    const [a, b] = taoKhoa(['Tiêu chí A', 'Tiêu chí B'])
    const [c1, c2] = taoKhoa(['Câu một?', 'Câu một?'])
    expect(ds).toEqual({
      tieuChi: [
        { khoa: a, chu: 'Tiêu chí A' },
        { khoa: b, chu: 'Tiêu chí B' },
      ],
      cauHoi: [
        { khoa: c1, chu: 'Câu một?' },
        { khoa: c2, chu: 'Câu một?' },
      ],
    })
    expect(c2).toBe(`${c1}#2`)
  })

  it('Tài liệu: dòng Checklist chất lượng là tiêu chí (doc_checklist dùng chung practice.criteria)', () => {
    const taiLieu = layCay().mucTheoSlug.get('risk-register')!
    const ds = danhSachTrongBai(
      phanTichBai(
        '---\nloai: tai-lieu\nnguon: ai\n---\n\n## Checklist chất lượng\n\n- [ ] Dòng một\n- [x] Dòng hai\n',
        taiLieu,
      ),
    )
    const [a, b] = taoKhoa(['Dòng một', 'Dòng hai'])
    expect(ds).toEqual({
      cauHoi: [],
      tieuChi: [
        { khoa: a, chu: 'Dòng một' },
        { khoa: b, chu: 'Dòng hai' },
      ],
    })
  })

  it('khối viết khác quy ước (hiện Markdown thường, không có ô) → không có câu / tiêu chí', () => {
    const ds = danhSachTrongBai(
      bai(
        ['## Thực hành trên dự án thật', 'Làm gì đó', '', '## Tự kiểm tra', 'Câu hỏi tự do?'].join(
          '\n',
        ),
      ),
    )
    expect(ds).toEqual({ cauHoi: [], tieuChi: [] })
  })
})
