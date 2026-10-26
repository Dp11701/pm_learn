import { describe, expect, it } from 'vitest'
import {
  bam,
  chuanHoaCau,
  docFrontmatterCuaMuc,
  phanTichBai,
  voiDong,
  type KetQuaBai,
} from '../../shared/noi-dung'
import { file, fmToiThieu, muc } from './ho-tro'

// Thân bài theo đúng quy ước của mẫu Chủ đề, chữ giữ chỗ (§13 quy tắc 6).
const THAN_CHU_DE = [
  '## Tóm tắt',
  '[Nội dung mẫu — Tóm tắt] Một đến hai câu.',
  '## Vì sao PM cần biết',
  '[Nội dung mẫu — Vì sao PM cần biết] Ba đến năm câu.',
  '## Khái niệm cốt lõi',
  '- **[Khái niệm mẫu 1]** — Một câu giải thích.',
  '- **[Khái niệm mẫu 2]** — Một câu giải thích.',
  '## Ví dụ thực tế',
  '[Nội dung mẫu — Ví dụ thực tế] Bốn đến sáu câu.',
  '## Cách áp dụng',
  '1. [Bước mẫu 1] Một câu hành động.',
  '## Góc dev lead → PM',
  '### Bạn đã quen',
  '[Nội dung mẫu — Bạn đã quen]',
  '### Điều cần đổi',
  '[Nội dung mẫu — Điều cần đổi]',
  '## Thực hành trên dự án thật',
  '### Đề bài',
  '[Nội dung mẫu — Đề bài]',
  '### Đầu ra',
  '[Nội dung mẫu — Đầu ra]',
  '### Tiêu chí tự kiểm',
  '- [ ] [Tiêu chí mẫu 1]',
  '- [x] [Tiêu chí mẫu 2]',
  '## Tự kiểm tra',
  '- H: [Câu hỏi mẫu 1] | Đ: [Đáp án mẫu 1]',
  '- H: [Câu hỏi mẫu 2] | Đ: [Đáp án mẫu 2]',
  '## Tham khảo',
  '- [Nguồn giữ chỗ 1]',
]

const chuDe = muc('Salience Model')
const taiLieu = muc('Risk Register')
const chungChi = muc('Project Management Professional (PMP)')

const bai = (than: string[], fm = fmToiThieu(chuDe), m = chuDe) => phanTichBai(file(fm, than), m)
const canhBao = (kq: KetQuaBai) => kq.canhBao.map(voiDong)

describe('phanTichBai: bài đúng mẫu', () => {
  const kq = bai(THAN_CHU_DE)

  it('không lỗi, không cảnh báo, đủ 9/9 khối', () => {
    expect(kq.loi).toBeNull()
    expect(canhBao(kq)).toEqual([])
    expect(kq.duKhoi).toEqual({ co: 9, tong: 9 })
    expect(kq.dauBai).toBeNull()
    expect(kq.khoiBoQua).toEqual([])
  })

  it('số dòng tính từ đầu file (frontmatter 6 dòng)', () => {
    expect(kq.khoi[0]).toMatchObject({ tieuDe: 'Tóm tắt', dong: 7, dongNoiDung: 8 })
    expect(kq.khoi.find((k) => k.mau?.id === 'tu-kiem-tra')?.dong).toBe(31)
  })

  it('bố cục: khối mẫu đúng thứ tự, khối app đúng chỗ, tuỳ chọn trống ẩn', () => {
    expect(kq.boCuc.map((o) => `${o.mau?.tieuDe}:${o.hien}`)).toEqual([
      'Tóm tắt:noi-dung',
      'Vì sao PM cần biết:noi-dung',
      'Khái niệm cốt lõi:noi-dung',
      'Ví dụ thực tế:noi-dung',
      'Cách áp dụng:noi-dung',
      'Góc dev lead → PM:noi-dung',
      'Nói lại bằng lời của bạn:app',
      'So sánh:an',
      'Thực hành trên dự án thật:noi-dung',
      'Tự kiểm tra:noi-dung',
      'Mục liên quan:app',
      'Tham khảo:noi-dung',
    ])
  })

  it('cấu trúc từng khối theo quy ước 1.5', () => {
    const cau = (id: string) => kq.khoi.find((k) => k.mau?.id === id)?.cauTruc
    expect(cau('tom-tat')).toBeNull()
    expect(cau('khai-niem-cot-loi')).toEqual({
      kieu: 'dinh-nghia',
      hopLe: true,
      truoc: null,
      sau: null,
      thua: [],
      dinhNghia: [
        { thuatNgu: '[Khái niệm mẫu 1]', giaiThich: 'Một câu giải thích.', dong: 12 },
        { thuatNgu: '[Khái niệm mẫu 2]', giaiThich: 'Một câu giải thích.', dong: 13 },
      ],
    })
    expect(cau('goc-dev-lead-pm')).toEqual({
      kieu: 'goc-dev-lead',
      hopLe: true,
      truoc: null,
      mucCon: [
        {
          tieuDe: 'Bạn đã quen',
          mauTen: 'Bạn đã quen',
          noiDung: '[Nội dung mẫu — Bạn đã quen]',
          dong: 19,
        },
        {
          tieuDe: 'Điều cần đổi',
          mauTen: 'Điều cần đổi',
          noiDung: '[Nội dung mẫu — Điều cần đổi]',
          dong: 21,
        },
      ],
    })
    const thucHanh = cau('thuc-hanh-tren-du-an-that')
    expect(thucHanh).toMatchObject({ kieu: 'thuc-hanh', hopLe: true })
    expect(thucHanh?.kieu === 'thuc-hanh' && thucHanh.tieuChi).toEqual([
      {
        khoa: bam(chuanHoaCau('[Tiêu chí mẫu 1]')),
        chu: '[Tiêu chí mẫu 1]',
        daTick: false,
        dong: 29,
      },
      {
        khoa: bam(chuanHoaCau('[Tiêu chí mẫu 2]')),
        chu: '[Tiêu chí mẫu 2]',
        daTick: true,
        dong: 30,
      },
    ])
    expect(cau('tu-kiem-tra')).toMatchObject({
      kieu: 'tu-kiem-tra',
      hopLe: true,
      cauHoi: [
        { hoi: '[Câu hỏi mẫu 1]', dap: '[Đáp án mẫu 1]', dong: 32 },
        { hoi: '[Câu hỏi mẫu 2]', dap: '[Đáp án mẫu 2]', dong: 33 },
      ],
    })
  })
})

describe('phanTichBai: tiêu đề khối', () => {
  it('so sau chuẩn hoá: hoa thường, khoảng trắng thừa, "->" = "→"', () => {
    const kq = bai([
      '##   tÓm   TẮT  ',
      'chữ',
      '## Góc dev lead -> PM',
      '### bạn đã quen',
      'a',
      '### Điều  cần đổi',
      'b',
    ])
    expect(kq.khoi.map((k) => [k.tieuDe, k.mau?.id])).toEqual([
      ['tÓm   TẮT', 'tom-tat'],
      ['Góc dev lead -> PM', 'goc-dev-lead-pm'],
    ])
    expect(canhBao(kq)).toEqual([])
  })

  it('tiêu đề NFD (dấu rời) khớp như NFC', () => {
    const kq = bai(['## ' + 'Tóm tắt'.normalize('NFD'), 'chữ'])
    expect(kq.khoi[0].mau?.id).toBe('tom-tat')
  })

  it('D13: "So sánh", "Thuật ngữ", "Thực hành công cụ" đều là khối 7', () => {
    for (const ten of ['So sánh', 'Thuật ngữ', 'Thực hành công cụ']) {
      const kq = bai(['## ' + ten, 'chữ'])
      expect(kq.khoi[0].mau?.id).toBe('so-sanh')
      expect(canhBao(kq)).toEqual([])
      expect(kq.boCuc.find((o) => o.mau?.id === 'so-sanh')?.hien).toBe('noi-dung')
    }
  })

  it('đóng tiêu đề bằng ## và ## trong khối mã không mở khối', () => {
    const kq = bai(['## Tóm tắt ##', '```md', '## Tham khảo', '```', '~~~', '## Lạ', '~~~'])
    expect(kq.khoi).toHaveLength(1)
    expect(kq.khoi[0].noiDung).toBe('```md\n## Tham khảo\n```\n~~~\n## Lạ\n~~~')
  })

  it('### và # không phải khối', () => {
    const kq = bai(['### Tóm tắt', '# Tiêu đề', '## Tóm tắt', 'x'])
    expect(kq.khoi).toHaveLength(1)
    expect(kq.dauBai).toEqual({ noiDung: '### Tóm tắt\n# Tiêu đề', dong: 7 })
  })
})

describe('phanTichBai: không bỏ sót chữ nào', () => {
  it('chữ trước ## đầu tiên → dauBai + cảnh báo', () => {
    const kq = bai(['', 'Lời mở đầu.', '', '## Tóm tắt', 'x'])
    expect(kq.dauBai).toEqual({ noiDung: 'Lời mở đầu.', dong: 8 })
    expect(canhBao(kq)).toEqual(['Dòng 8: chữ trước khối ## đầu tiên — hiện ở đầu bài'])
  })

  it('khối lạ: hiện sau các khối mẫu, theo thứ tự file + cảnh báo', () => {
    const kq = bai(['## Lạ 1', 'a', '## Tham khảo', 'b', '## Lạ 2', 'c', '## Tóm tắt', 'd'])
    expect(kq.khoi.map((k) => k.tieuDe)).toEqual(['Tóm tắt', 'Tham khảo', 'Lạ 1', 'Lạ 2'])
    expect(kq.boCuc.slice(-2)).toEqual([
      { mau: null, khoi: [kq.khoi[2]], hien: 'noi-dung' },
      { mau: null, khoi: [kq.khoi[3]], hien: 'noi-dung' },
    ])
    expect(canhBao(kq)).toEqual([
      'Dòng 7: Khối không có trong mẫu: “Lạ 1”',
      'Dòng 11: Khối không có trong mẫu: “Lạ 2”',
    ])
  })

  it('khối trùng: hiện cả hai, khối sau ngay sau khối đầu + cảnh báo', () => {
    const kq = bai(['## Tóm tắt', 'a', '## Tham khảo', 'b', '## tóm tắt', 'c'])
    expect(kq.khoi.map((k) => [k.tieuDe, k.trung])).toEqual([
      ['Tóm tắt', false],
      ['tóm tắt', true],
      ['Tham khảo', false],
    ])
    expect(kq.boCuc[0].khoi).toHaveLength(2)
    expect(canhBao(kq)).toEqual([
      'Dòng 11: khối “tóm tắt” lặp lại (lần đầu ở dòng 7) — hiện cả hai',
    ])
  })

  it('khối 7 viết bằng 2 tên khác nhau → trùng', () => {
    const kq = bai(['## So sánh', 'a', '## Thuật ngữ', 'b'])
    expect(kq.boCuc.find((o) => o.mau?.id === 'so-sanh')?.khoi).toHaveLength(2)
    expect(canhBao(kq)).toEqual([
      'Dòng 9: khối “Thuật ngữ” trùng với “So sánh” ở dòng 7 (cùng một khối của mẫu) — hiện cả hai',
    ])
  })

  it('khối do app tạo trong file: bỏ qua chữ + cảnh báo, vẫn giữ trong khoiBoQua', () => {
    const kq = bai([
      '## Tóm tắt',
      'a',
      '## Mục liên quan',
      '- x',
      '## Nói lại bằng lời của bạn',
      'b',
      '## Bản của tôi',
      '## Kế hoạch thi của tôi',
      '## Nhật ký thi thử',
    ])
    expect(kq.khoi.map((k) => k.tieuDe)).toEqual(['Tóm tắt'])
    expect(kq.khoiBoQua.map((k) => [k.tieuDe, k.noiDung])).toEqual([
      ['Mục liên quan', '- x'],
      ['Nói lại bằng lời của bạn', 'b'],
      ['Bản của tôi', ''],
      ['Kế hoạch thi của tôi', ''],
      ['Nhật ký thi thử', ''],
    ])
    expect(canhBao(kq)).toEqual([
      'Dòng 9: khối “Mục liên quan” do app tạo — chữ trong file bị bỏ qua',
      'Dòng 11: khối “Nói lại bằng lời của bạn” do app tạo — chữ trong file bị bỏ qua',
      'Dòng 13: khối “Bản của tôi” do app tạo — chữ trong file bị bỏ qua',
      'Dòng 14: khối “Kế hoạch thi của tôi” do app tạo — chữ trong file bị bỏ qua',
      'Dòng 15: khối “Nhật ký thi thử” do app tạo — chữ trong file bị bỏ qua',
    ])
  })
})

describe('phanTichBai: Đủ khối (★ đúng tiêu đề, có chữ, không lỗi)', () => {
  it('Chủ đề chỉ có tiêu đề (như F20) → 0/9; khối ★ trống là "chua-co"', () => {
    const kq = bai(THAN_CHU_DE.filter((d) => d.startsWith('## ')))
    expect(kq.duKhoi).toEqual({ co: 0, tong: 9 })
    expect(kq.boCuc.filter((o) => o.hien === 'chua-co')).toHaveLength(9)
  })

  it('khối chỉ có dòng ### (không có chữ) chưa tính là có chữ', () => {
    const kq = bai(['## Góc dev lead → PM', '### Bạn đã quen', '### Điều cần đổi'])
    expect(kq.khoi[0].coChu).toBe(false)
    expect(kq.duKhoi.co).toBe(0)
    expect(canhBao(kq)).toEqual([])
  })

  it('Tự kiểm tra có câu thiếu " | Đ: " không được tính (F20: 1 lỗi, 0/9)', () => {
    const than = THAN_CHU_DE.map((d) =>
      d.startsWith('- H: [Câu hỏi mẫu 2]') ? '- H: [Câu hỏi mẫu 2]' : d,
    )
    const kq = bai(than)
    expect(kq.duKhoi).toEqual({ co: 8, tong: 9 })
    expect(kq.khoi.find((k) => k.mau?.id === 'tu-kiem-tra')?.coLoi).toBe(true)
    expect(canhBao(kq)).toEqual(["Dòng 33: câu hỏi thiếu ' | Đ: '"])
    expect(kq.canhBao[0]).toMatchObject({ muc: 'loi', khoi: 'tu-kiem-tra' })
  })

  it('cảnh báo quy ước (không phải lỗi) vẫn tính đủ khối', () => {
    const than = THAN_CHU_DE.filter((d) => d !== '### Điều cần đổi')
    const kq = bai(than)
    expect(kq.duKhoi).toEqual({ co: 9, tong: 9 })
    expect(canhBao(kq)).toEqual(['Dòng 19: khối Góc dev lead → PM thiếu “### Điều cần đổi”'])
    expect(kq.canhBao[0].muc).toBe('canh-bao')
    expect(kq.khoi.find((k) => k.mau?.id === 'goc-dev-lead-pm')?.cauTruc?.hopLe).toBe(false)
  })

  it('Tài liệu: khi có file, Bản của tôi tính đủ → frontmatter trống thân bài là 1/8', () => {
    const kq = bai([], fmToiThieu(taiLieu), taiLieu)
    expect(kq.duKhoi).toEqual({ co: 1, tong: 8 })
    expect(kq.boCuc.map((o) => o.hien)).toEqual([
      'chua-co',
      'chua-co',
      'chua-co',
      'app',
      'chua-co',
      'chua-co',
      'an',
      'app',
      'chua-co',
      'app',
      'chua-co',
    ])
  })

  it('Tài liệu đủ 8 khối', () => {
    const kq = bai(
      [
        '## Mục đích',
        'a',
        '## Khi nào lập, ai lập, ai duyệt',
        'b',
        '## Cấu trúc tài liệu',
        '- [Phần mẫu 1] — một dòng',
        '## Mẫu điền sẵn',
        '| A | B |',
        '|---|---|',
        '| 1 | 2 |',
        '## Checklist chất lượng',
        '- [ ] [Tiêu chí mẫu 1]',
        '## Tự kiểm tra',
        '- H: a | Đ: b',
        '## Tham khảo',
        '- x',
      ],
      fmToiThieu(taiLieu),
      taiLieu,
    )
    expect(canhBao(kq)).toEqual([])
    expect(kq.duKhoi).toEqual({ co: 8, tong: 8 })
  })

  it('Chứng chỉ: Kế hoạch thi tính đủ khi có file → 1/7', () => {
    const kq = bai(['## Tóm tắt', ''], fmToiThieu(chungChi), chungChi)
    expect(kq.duKhoi).toEqual({ co: 1, tong: 7 })
  })

  it('Chứng chỉ đủ 7 khối', () => {
    const kq = bai(
      [
        '## Tóm tắt',
        'a',
        '## Dành cho ai',
        'b',
        '## Thông tin kỳ thi',
        '- [Trường 1]: ',
        '- [Trường 2]: [giá trị]',
        '## Phủ roadmap',
        '### [Domain giữ chỗ]',
        '- scope-creep',
        '## Tự kiểm tra',
        '- H: a | Đ: b',
        '## Tham khảo',
        '- x',
      ],
      fmToiThieu(chungChi),
      chungChi,
    )
    expect(canhBao(kq)).toEqual([])
    expect(kq.duKhoi).toEqual({ co: 7, tong: 7 })
    expect(kq.khoi.find((k) => k.mau?.id === 'thong-tin-ky-thi')?.cauTruc).toMatchObject({
      kieu: 'thong-tin-thi',
      truong: [
        { ten: '[Trường 1]', giaTri: '', dong: 12 },
        { ten: '[Trường 2]', giaTri: '[giá trị]', dong: 13 },
      ],
    })
    expect(kq.khoi.find((k) => k.mau?.id === 'phu-roadmap')?.cauTruc).toMatchObject({
      kieu: 'phu-roadmap',
      hopLe: true,
      domain: [{ ten: '[Domain giữ chỗ]', dong: 15, muc: [{ giaTri: 'scope-creep', dong: 16 }] }],
    })
  })
})

describe('phanTichBai: frontmatter theo mục', () => {
  it('loai khác mẫu của mục → lỗi frontmatter (3.8), thân bài vẫn đọc', () => {
    const kq = bai(['## Tóm tắt', 'x'], [`id: ${chuDe.id}`, 'loai: tai-lieu', 'nguon: ai'])
    expect(kq.frontmatter).toBeNull()
    expect(kq.loi && voiDong(kq.loi)).toBe(
      'Dòng 3: loai “tai-lieu” khác mẫu bài của mục này (chu-de)',
    )
    expect(kq.khoi).toHaveLength(1)
  })

  it('frontmatter lỗi vẫn đọc thân bài (banner F26, bài vẫn hiện)', () => {
    const kq = bai(['## Tóm tắt', 'x'], ['loai: chu-de', 'nguon: ['])
    expect(kq.loi).not.toBeNull()
    expect(kq.khoi.map((k) => k.tieuDe)).toEqual(['Tóm tắt'])
  })

  it('id khác id của mục → cảnh báo, không lỗi', () => {
    const kq = bai(
      ['## Tóm tắt', 'x'],
      ['id: khac', `loai: chu-de`, 'nguon: ai', 'trang_thai_noi_dung: ban-nhap'],
    )
    expect(kq.loi).toBeNull()
    expect(canhBao(kq)).toEqual(['Dòng 2: id “khac” khác id của mục này'])
  })

  it('không có id: không cảnh báo (khớp theo tên file)', () => {
    const kq = bai(
      ['## Tóm tắt', 'x'],
      ['loai: chu-de', 'nguon: ai', 'trang_thai_noi_dung: ban-nhap'],
    )
    expect(canhBao(kq)).toEqual([])
  })
})

describe('phanTichBai: Khái niệm cốt lõi như F11 (đoạn mở rồi danh sách)', () => {
  it('đủ 9/9 khối, không cảnh báo, khối hiện theo cấu trúc (không rơi về Markdown thường)', () => {
    const i = THAN_CHU_DE.indexOf('## Khái niệm cốt lõi')
    const than = [
      ...THAN_CHU_DE.slice(0, i + 1),
      '[Nội dung mẫu — Khái niệm cốt lõi] Khối này liệt kê 3–5 khái niệm chính của bài.',
      '',
      ...THAN_CHU_DE.slice(i + 1),
    ]
    const kq = bai(than)
    expect(canhBao(kq)).toEqual([])
    expect(kq.duKhoi).toEqual({ co: 9, tong: 9 })
    const k = kq.khoi.find((x) => x.mau?.id === 'khai-niem-cot-loi')
    expect(k?.cauTruc).toMatchObject({
      kieu: 'dinh-nghia',
      hopLe: true,
      truoc: {
        noiDung: '[Nội dung mẫu — Khái niệm cốt lõi] Khối này liệt kê 3–5 khái niệm chính của bài.',
      },
      sau: null,
    })
    expect(k?.noiDung.startsWith('[Nội dung mẫu — Khái niệm cốt lõi]')).toBe(true)
  })
})

describe('docFrontmatterCuaMuc: frontmatter theo mẫu bài của mục (dùng chung với trạng thái nội dung)', () => {
  it('giống phanTichBai: loai khác mẫu → frontmatter null + lỗi; loai đúng → như docFrontmatter', () => {
    const sai = file([`id: ${chuDe.id}`, 'loai: tai-lieu', 'nguon: tu-viet'], ['## Tóm tắt', 'x'])
    expect(docFrontmatterCuaMuc(sai, chuDe)).toMatchObject({
      frontmatter: null,
      loi: phanTichBai(sai, chuDe).loi,
    })
    const dung = file(fmToiThieu(chuDe), ['## Tóm tắt', 'x'])
    expect(docFrontmatterCuaMuc(dung, chuDe).frontmatter).toEqual(
      phanTichBai(dung, chuDe).frontmatter,
    )
  })
})

describe('phanTichBai: dòng dài nhiều khoảng trắng đọc tuyến tính', () => {
  it('file ~200 KB toàn dòng khoảng trắng dài ở tiêu đề / khối danh sách: dưới 500 ms', () => {
    const kt = ' '.repeat(40 * 1024)
    const than = [
      `## a${kt}b${kt}x`,
      '## Tự kiểm tra',
      `- H:${kt}a${kt}b`,
      '## Góc dev lead → PM',
      `### a${kt}b`,
    ]
    const batDau = performance.now()
    const kq = bai(than)
    expect(performance.now() - batDau).toBeLessThan(500)
    expect(kq.khoi.map((k) => k.dong)).toEqual([10, 8, 7])
  })
})
