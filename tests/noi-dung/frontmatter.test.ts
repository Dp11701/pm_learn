import { describe, expect, it } from 'vitest'
import { docFrontmatter, voiDong } from '../../shared/noi-dung'
import { TOI_DA_ALIAS, TOI_DA_SAU } from '../../shared/noi-dung/frontmatter'

const f = (...dong: string[]) => dong.join('\n')

describe('docFrontmatter: hợp lệ', () => {
  it('đọc đủ các khoá của 1.5, giữ dòng của từng khoá, thân bài bắt đầu sau ---', () => {
    const kq = docFrontmatter(
      f(
        '---',
        'id: abc_123-XY',
        'loai: tai-lieu',
        'giai_nghia: sổ đăng ký',
        'trang_thai_noi_dung: da-duyet',
        'nguon: tu-viet',
        'ngay_duyet: 2026-10-18',
        'lien_quan: [a-b, c]',
        'process_group:',
        '  - planning',
        '  - execution',
        '---',
        '## Mục đích',
      ),
    )
    expect(kq.loi).toBeNull()
    expect(kq.canhBao).toEqual([])
    expect(kq.frontmatter).toEqual({
      id: 'abc_123-XY',
      loai: 'tai-lieu',
      giaiNghia: 'sổ đăng ký',
      trangThaiNoiDung: 'da-duyet',
      nguon: 'tu-viet',
      ngayDuyet: '2026-10-18',
      lienQuan: ['a-b', 'c'],
      processGroup: ['planning', 'execution'],
      khoaLa: {},
      dongKhoa: {
        id: 2,
        loai: 3,
        giai_nghia: 4,
        trang_thai_noi_dung: 5,
        nguon: 6,
        ngay_duyet: 7,
        lien_quan: 8,
        process_group: 9,
      },
    })
    expect(kq.dongThan).toEqual(['## Mục đích'])
    expect(kq.dongDauThan).toBe(13)
  })

  it('id dạng số hay có ký tự đặc biệt giữ đúng chữ trong file; ngày không bị đổi kiểu', () => {
    const kq = docFrontmatter(f('---', 'id: 0012e3', 'loai: chu-de', 'nguon: ai', '---'))
    expect(kq.frontmatter?.id).toBe('0012e3')
    const kq2 = docFrontmatter(f('---', 'id: "-Org3ps_-37"', 'loai: chu-de', '---'))
    expect(kq2.frontmatter?.id).toBe('-Org3ps_-37')
  })

  it('BOM và CRLF', () => {
    const kq = docFrontmatter('﻿---\r\nloai: chu-de\r\nnguon: ai\r\n---\r\n## Tóm tắt\r\n')
    expect(kq.loi).toBeNull()
    expect(kq.dongThan).toEqual(['## Tóm tắt', ''])
    expect(kq.dongDauThan).toBe(5)
  })

  it('giá trị trống được coi như không có (giai_nghia:, lien_quan:)', () => {
    const kq = docFrontmatter(
      f(
        '---',
        'loai: chu-de',
        'giai_nghia:',
        'nguon: ai',
        'lien_quan:',
        'trang_thai_noi_dung: ban-nhap',
        '---',
      ),
    )
    expect(kq.loi).toBeNull()
    expect(kq.frontmatter?.giaiNghia).toBeUndefined()
    expect(kq.frontmatter?.lienQuan).toEqual([])
  })

  it('lien_quan một chuỗi đơn được nhận như danh sách 1 phần tử', () => {
    const kq = docFrontmatter(
      f('---', 'loai: chu-de', 'nguon: ai', 'lien_quan: scope-baseline', '---'),
    )
    expect(kq.frontmatter?.lienQuan).toEqual(['scope-baseline'])
  })
})

describe('docFrontmatter: cảnh báo (vẫn đọc được)', () => {
  it('thiếu nguon → ai; thiếu trang_thai_noi_dung → ban-nhap', () => {
    const kq = docFrontmatter(f('---', 'loai: chu-de', '---'))
    expect(kq.loi).toBeNull()
    expect(kq.frontmatter).toMatchObject({ nguon: 'ai', trangThaiNoiDung: 'ban-nhap' })
    expect(kq.canhBao.map(voiDong)).toEqual([
      'Dòng 1: thiếu nguon — coi như ai',
      'Dòng 1: thiếu trang_thai_noi_dung — coi như ban-nhap',
    ])
    expect(kq.canhBao.every((c) => c.muc === 'canh-bao')).toBe(true)
  })

  it('khoá lạ: cảnh báo kèm dòng, giữ nguyên giá trị', () => {
    const kq = docFrontmatter(
      f(
        '---',
        'loai: chu-de',
        'nguon: ai',
        'tac_gia: Tôi',
        'the: [a, 1]',
        'trang_thai_noi_dung: ban-nhap',
        '---',
      ),
    )
    expect(kq.frontmatter?.khoaLa).toEqual({ tac_gia: 'Tôi', the: ['a', '1'] })
    expect(kq.canhBao.map(voiDong)).toEqual([
      'Dòng 4: khoá lạ “tac_gia” — giữ nguyên, app không dùng',
      'Dòng 5: khoá lạ “the” — giữ nguyên, app không dùng',
    ])
  })

  it('process_group ngoài tai-lieu, kiem_tra_lan_cuoi ngoài chung-chi, ngay_duyet khi ban-nhap → bỏ qua + cảnh báo', () => {
    const kq = docFrontmatter(
      f(
        '---',
        'loai: chu-de',
        'nguon: ai',
        'trang_thai_noi_dung: ban-nhap',
        'ngay_duyet: 2026-10-18',
        'process_group: [planning]',
        'kiem_tra_lan_cuoi: 2026-10-20',
        '---',
      ),
    )
    expect(kq.loi).toBeNull()
    expect(kq.frontmatter).toMatchObject({ processGroup: [] })
    expect(kq.frontmatter?.ngayDuyet).toBeUndefined()
    expect(kq.frontmatter?.kiemTraLanCuoi).toBeUndefined()
    expect(kq.canhBao.map(voiDong)).toEqual([
      'Dòng 5: ngay_duyet chỉ dùng khi trang_thai_noi_dung là da-duyet — bỏ qua',
      'Dòng 6: process_group chỉ dùng cho loai tai-lieu — bỏ qua',
      'Dòng 7: kiem_tra_lan_cuoi chỉ dùng cho loai chung-chi — bỏ qua',
    ])
  })

  it('kiem_tra_lan_cuoi của chung-chi được giữ', () => {
    const kq = docFrontmatter(
      f(
        '---',
        'loai: chung-chi',
        'nguon: ai',
        'trang_thai_noi_dung: ban-nhap',
        'kiem_tra_lan_cuoi: 2026-10-20',
        '---',
      ),
    )
    expect(kq.frontmatter?.kiemTraLanCuoi).toBe('2026-10-20')
  })
})

describe('docFrontmatter: lỗi tiếng Việt có số dòng', () => {
  const loi = (...dong: string[]) => {
    const kq = docFrontmatter(f(...dong))
    expect(kq.frontmatter).toBeNull()
    return kq.loi ? voiDong(kq.loi) : null
  }

  it('không mở bằng --- → lỗi dòng 1, cả file là thân bài', () => {
    const kq = docFrontmatter(f('## Tóm tắt', 'chữ'))
    expect(kq.loi && voiDong(kq.loi)).toBe(
      'Dòng 1: thiếu frontmatter: file phải mở đầu bằng dòng ---',
    )
    expect(kq.dongThan).toEqual(['## Tóm tắt', 'chữ'])
    expect(kq.dongDauThan).toBe(1)
  })

  it('không có dòng --- đóng', () => {
    expect(loi('---', 'loai: chu-de', '## Tóm tắt')).toBe(
      'Dòng 1: frontmatter chưa đóng: thiếu dòng --- kết thúc',
    )
  })

  it('YAML hỏng ở dòng 3 (như F26 "lỗi frontmatter dòng 3")', () => {
    expect(loi('---', 'id: x', 'loai: tai-lieu', 'nguon ai', '---')).toBe(
      'Dòng 4: frontmatter không đọc được (lỗi cú pháp YAML)',
    )
    // ngoặc chưa đóng: thư viện yaml báo ở dòng nó nhận ra lỗi (dòng ngay sau)
    expect(loi('---', 'loai: tai-lieu', 'nguon: [ai', 'trang_thai_noi_dung: ban-nhap', '---')).toBe(
      'Dòng 4: frontmatter không đọc được (lỗi cú pháp YAML)',
    )
    expect(loi('---', 'loai: tai-lieu', 'giai_nghia: "chưa đóng', '---')).toBe(
      'Dòng 3: frontmatter không đọc được (lỗi cú pháp YAML)',
    )
  })

  it('khoá lặp', () => {
    expect(loi('---', 'loai: chu-de', 'nguon: ai', 'loai: tai-lieu', '---')).toBe(
      'Dòng 4: khoá loai bị lặp',
    )
  })

  it('frontmatter không phải bảng khoá: giá trị', () => {
    expect(loi('---', '- a', '- b', '---')).toBe(
      'Dòng 2: frontmatter phải gồm các dòng dạng khoá: giá trị',
    )
  })

  it('thiếu loai / loai sai', () => {
    expect(loi('---', 'nguon: ai', '---')).toBe(
      'Dòng 1: thiếu loai (chu-de, tai-lieu, chung-chi, tong-quan hoặc lo-trinh)',
    )
    expect(loi('---', '---')).toBe(
      'Dòng 1: thiếu loai (chu-de, tai-lieu, chung-chi, tong-quan hoặc lo-trinh)',
    )
    expect(loi('---', 'nguon: ai', 'loai: chude', '---')).toBe(
      'Dòng 3: loai “chude” không hợp lệ: dùng chu-de, tai-lieu, chung-chi, tong-quan hoặc lo-trinh',
    )
  })

  it('giá trị sai của trang_thai_noi_dung, nguon, id, giai_nghia', () => {
    expect(loi('---', 'loai: chu-de', 'trang_thai_noi_dung: duyet', '---')).toBe(
      'Dòng 3: trang_thai_noi_dung phải là ban-nhap hoặc da-duyet',
    )
    expect(loi('---', 'loai: chu-de', 'nguon: AI', '---')).toBe(
      'Dòng 3: nguon phải là ai hoặc tu-viet',
    )
    expect(loi('---', 'loai: chu-de', 'id: [a, b]', '---')).toBe('Dòng 3: id phải là một chuỗi')
    expect(loi('---', 'loai: chu-de', 'giai_nghia: {a: 1}', '---')).toBe(
      'Dòng 3: giai_nghia phải là một chuỗi',
    )
  })

  it('da-duyet thiếu ngay_duyet; ngày không có thật', () => {
    expect(loi('---', 'loai: chu-de', 'nguon: ai', 'trang_thai_noi_dung: da-duyet', '---')).toBe(
      'Dòng 4: trang_thai_noi_dung da-duyet cần ngay_duyet dạng YYYY-MM-DD',
    )
    expect(
      loi('---', 'loai: chu-de', 'trang_thai_noi_dung: da-duyet', 'ngay_duyet: 2026-02-30', '---'),
    ).toBe('Dòng 4: ngay_duyet phải là ngày có thật, dạng YYYY-MM-DD')
    expect(loi('---', 'loai: chung-chi', 'kiem_tra_lan_cuoi: 18/10/2026', '---')).toBe(
      'Dòng 3: kiem_tra_lan_cuoi phải là ngày có thật, dạng YYYY-MM-DD',
    )
  })

  it('lien_quan / process_group không phải danh sách chuỗi', () => {
    expect(loi('---', 'loai: chu-de', 'lien_quan: {a: b}', '---')).toBe(
      'Dòng 3: lien_quan phải là danh sách slug hoặc id, vd. [slug-1, slug-2]',
    )
    expect(loi('---', 'loai: tai-lieu', 'process_group: [planning, [x]]', '---')).toBe(
      'Dòng 3: process_group phải là danh sách slug hoặc id, vd. [slug-1, slug-2]',
    )
  })

  it('nhiều lỗi: lỗi đầu tiên theo dòng là loi, lỗi còn lại vào canhBao mức loi', () => {
    const kq = docFrontmatter(f('---', 'nguon: x', 'loai: y', '---'))
    expect(kq.loi && voiDong(kq.loi)).toBe('Dòng 2: nguon phải là ai hoặc tu-viet')
    expect(kq.canhBao).toEqual([expect.objectContaining({ dong: 3, muc: 'loi' })])
  })
})

describe('docFrontmatter: alias YAML (*tên) có giới hạn — lỗi frontmatter, không bao giờ ném / vòng', () => {
  const LOI_ALIAS = `frontmatter có alias YAML (*tên) trỏ vào chính nó hoặc dùng quá ${TOI_DA_ALIAS} lần — viết thẳng giá trị thay cho alias`

  /** Kết quả phải JSON hoá được (API trả nguyên) */
  const docVaJson = (text: string) => {
    const kq = docFrontmatter(text)
    expect(() => JSON.stringify(kq)).not.toThrow()
    return kq
  }

  it('alias vòng ở khoá lạ (danh sách, bảng khoá) → lỗi frontmatter ở dòng của alias', () => {
    for (const giaTri of ['&a [*a]', '&a { b: *a }', '&a [x, [y, *a]]']) {
      const kq = docVaJson(
        f('---', 'loai: chu-de', 'nguon: ai', `la: ${giaTri}`, '---', '## Tóm tắt'),
      )
      expect(kq.frontmatter).toBeNull()
      expect(kq.loi).toEqual({ dong: 4, thongBao: LOI_ALIAS })
      expect(kq.dongThan).toEqual(['## Tóm tắt'])
    }
  })

  it('alias vòng nhiều dòng (block) và ở khoá app hiểu', () => {
    const kq = docVaJson(f('---', 'loai: chu-de', 'lien_quan: &a', '  - x', '  - *a', '---'))
    expect(kq.loi).toEqual({ dong: 5, thongBao: LOI_ALIAS })
  })

  it('alias bomb (mỗi tầng nhân 9) → lỗi, không nổ bộ nhớ', () => {
    const tang = ['a: &a [x, x, x, x, x, x, x, x, x]']
    for (const [truoc, ten] of [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['d', 'e'],
      ['e', 'g'],
      ['g', 'h'],
    ]) {
      tang.push(`${ten}: &${ten} [${Array(9).fill(`*${truoc}`).join(', ')}]`)
    }
    const batDau = performance.now()
    const kq = docVaJson(f('---', 'loai: chu-de', ...tang, '---'))
    expect(performance.now() - batDau).toBeLessThan(200)
    expect(kq.frontmatter).toBeNull()
    expect(kq.loi?.thongBao).toBe(LOI_ALIAS)
    expect(kq.loi?.dong).toBe(4)
  })

  it(`alias hợp lệ, không vòng, tối đa ${TOI_DA_ALIAS} lần: đọc bình thường`, () => {
    const kq = docVaJson(
      f(
        '---',
        'loai: &l chu-de',
        'nguon: ai',
        'x: &ds [scope-creep, wbs]',
        'lien_quan: *ds',
        'y: *l',
        '---',
      ),
    )
    expect(kq.loi).toBeNull()
    expect(kq.frontmatter?.lienQuan).toEqual(['scope-creep', 'wbs'])
    expect(kq.frontmatter?.khoaLa).toEqual({ x: ['scope-creep', 'wbs'], y: 'chu-de' })
    const du = docFrontmatter(
      f(
        '---',
        'loai: chu-de',
        'x: &v 1',
        ...Array.from({ length: TOI_DA_ALIAS }, (_, i) => `k${i}: *v`),
        '---',
      ),
    )
    expect(du.loi).toBeNull()
    const qua = docFrontmatter(
      f(
        '---',
        'loai: chu-de',
        'x: &v 1',
        ...Array.from({ length: TOI_DA_ALIAS + 1 }, (_, i) => `k${i}: *v`),
        '---',
      ),
    )
    expect(qua.loi).toEqual({ dong: 3 + TOI_DA_ALIAS + 1, thongBao: LOI_ALIAS })
  })

  it(`giá trị lồng quá ${TOI_DA_SAU} cấp → lỗi frontmatter (không đệ quy sâu)`, () => {
    const sau = `${'['.repeat(TOI_DA_SAU + 2)}x${']'.repeat(TOI_DA_SAU + 2)}`
    const kq = docVaJson(f('---', 'loai: chu-de', `la: ${sau}`, '---'))
    expect(kq.loi).toEqual({
      dong: 3,
      thongBao: `giá trị trong frontmatter lồng quá ${TOI_DA_SAU} cấp`,
    })
    const vua = docVaJson(
      f('---', 'loai: chu-de', `la: ${'['.repeat(10)}x${']'.repeat(10)}`, '---'),
    )
    expect(vua.loi).toBeNull()
  })

  it('khoá "__proto__" là khoá lạ bình thường, không đổi prototype', () => {
    const kq = docVaJson(f('---', 'loai: chu-de', '__proto__: { polluted: true }', '---'))
    expect(kq.loi).toBeNull()
    expect(Object.getPrototypeOf(kq.frontmatter?.khoaLa)).toBe(Object.prototype)
    expect(Object.keys(kq.frontmatter?.khoaLa ?? {})).toEqual(['__proto__'])
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('lỗi YAML trên dòng 200 KB nhiều khoảng trắng: báo lỗi nhanh (tìm tên khoá không regex lùi)', () => {
    const khoa = `a${' '.repeat(100 * 1024)}b`
    const batDau = performance.now()
    const kq = docFrontmatter(f('---', 'loai: chu-de', `${khoa}: 1`, `${khoa}: 2`, '---'))
    expect(performance.now() - batDau).toBeLessThan(500)
    expect(kq.loi).toEqual({ dong: 3, thongBao: 'frontmatter không đọc được (lỗi cú pháp YAML)' })
  })

  it('khoá lặp: tên khoá lấy trước dấu ":" đầu tiên của dòng', () => {
    const kq = docFrontmatter(f('---', 'loai: chu-de', 'tac_gia   : a', 'tac_gia: b', '---'))
    expect(kq.loi).toEqual({ dong: 4, thongBao: 'khoá tac_gia bị lặp' })
  })
})
