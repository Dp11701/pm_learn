import { describe, expect, it } from 'vitest'
import {
  MAU_BAI,
  bam,
  chuanHoaCau,
  taoKhoa,
  tachO,
  timBang,
  voiDong,
  type CanhBao,
  type CauTrucKhoi,
  type KhoiMau,
} from '../../shared/noi-dung'
import { docCauTruc, tieuDeCap, type Dong } from '../../shared/noi-dung/quy-uoc'

const khoi = (mau: keyof typeof MAU_BAI, id: string): KhoiMau => {
  const k = MAU_BAI[mau].khoi.find((x) => x.id === id)
  if (!k) throw new Error(id)
  return k
}
const TU_KIEM_TRA = khoi('chu-de', 'tu-kiem-tra')
const KHAI_NIEM = khoi('chu-de', 'khai-niem-cot-loi')
const GOC_DEV_LEAD = khoi('chu-de', 'goc-dev-lead-pm')
const THUC_HANH = khoi('chu-de', 'thuc-hanh-tren-du-an-that')
const MAU_DIEN_SAN = khoi('tai-lieu', 'mau-dien-san')
const CHECKLIST = khoi('tai-lieu', 'checklist-chat-luong')
const THONG_TIN = khoi('chung-chi', 'thong-tin-ky-thi')
const PHU = khoi('chung-chi', 'phu-roadmap')

/** Các dòng bắt đầu từ dòng 10 */
const dong = (...chu: string[]): Dong[] => chu.map((c, i) => ({ so: 10 + i, chu: c }))

function doc<K extends CauTrucKhoi['kieu']>(k: KhoiMau, chu: string[], kieu: K) {
  const canhBao: CanhBao[] = []
  const cau = docCauTruc(k, dong(...chu), canhBao)
  if (cau?.kieu !== kieu) throw new Error(`kiểu ${cau?.kieu}`)
  return {
    cau: cau as Extract<CauTrucKhoi, { kieu: K }>,
    canhBao: canhBao.map(voiDong),
    muc: canhBao.map((c) => c.muc),
  }
}

describe('Tự kiểm tra: "- H: … | Đ: …" (1.5)', () => {
  it('nhận "-" và "*", "Đ:" và "D:", khoảng trắng tuỳ ý quanh nội dung', () => {
    const { cau, canhBao } = doc(
      TU_KIEM_TRA,
      ['- H: Câu 1? | Đ: Đáp 1', '*   H:Câu 2?   |   D:   Đáp 2  ', '  - H: Câu 3 | Đ: Đáp 3'],
      'tu-kiem-tra',
    )
    expect(canhBao).toEqual([])
    expect(cau.cauHoi.map((c) => [c.hoi, c.dap, c.dong])).toEqual([
      ['Câu 1?', 'Đáp 1', 10],
      ['Câu 2?', 'Đáp 2', 11],
      ['Câu 3', 'Đáp 3', 12],
    ])
    expect(cau.hopLe).toBe(true)
  })

  it('dòng thụt ngay dưới nối vào đáp án; dòng trống kết thúc câu', () => {
    const { cau, canhBao } = doc(
      TU_KIEM_TRA,
      ['- H: Câu? | Đ: Dòng 1', '  dòng 2', '    - ý a', '', '  thụt sau dòng trống'],
      'tu-kiem-tra',
    )
    expect(cau.cauHoi[0].dap).toBe('Dòng 1\ndòng 2\n- ý a')
    expect(cau.thua).toEqual([{ noiDung: '  thụt sau dòng trống', dong: 14 }])
    expect(canhBao).toEqual([
      'Dòng 14: khối Tự kiểm tra: dòng không theo dạng “- H: … | Đ: …” — hiện như Markdown thường',
    ])
    expect(cau.hopLe).toBe(false)
  })

  it('"\\|" là chữ | trong câu hỏi và đáp án (kể cả dòng nối)', () => {
    const { cau, canhBao } = doc(
      TU_KIEM_TRA,
      ['- H: A \\| B nghĩa là gì? | Đ: Chọn A \\| B', '  hoặc C \\| D'],
      'tu-kiem-tra',
    )
    expect(canhBao).toEqual([])
    expect(cau.cauHoi[0]).toMatchObject({
      hoi: 'A | B nghĩa là gì?',
      dap: 'Chọn A | B\nhoặc C | D',
    })
  })

  it('thiếu " | Đ: " → lỗi "Dòng N: câu hỏi thiếu \' | Đ: \'" (mức loi), dòng vẫn giữ', () => {
    const { cau, canhBao, muc } = doc(
      TU_KIEM_TRA,
      [
        '- H: Không có đáp án',
        '  dòng thụt của câu lỗi',
        '- H: Dính|Đ: liền',
        '- H: Có | Đ: đáp',
        '- H: chỉ \\| Đ: thoát',
      ],
      'tu-kiem-tra',
    )
    expect(canhBao).toEqual([
      "Dòng 10: câu hỏi thiếu ' | Đ: '",
      "Dòng 12: câu hỏi thiếu ' | Đ: '",
      "Dòng 14: câu hỏi thiếu ' | Đ: '",
    ])
    expect(muc).toEqual(['loi', 'loi', 'loi'])
    expect(cau.cauHoi.map((c) => c.hoi)).toEqual(['Có'])
    expect(cau.thua.map((t) => t.dong)).toEqual([10, 14])
  })

  it('câu hỏi hoặc đáp án trống → lỗi như thiếu dấu ngăn; dấu ngăn là chỗ " | Đ:" đầu tiên', () => {
    const { cau, canhBao } = doc(
      TU_KIEM_TRA,
      ['- H:     | Đ: đáp', '- H: hỏi | Đ:   ', '- H: hỏi | Đ:', '- H: a | b | Đ: c | Đ: d'],
      'tu-kiem-tra',
    )
    expect(canhBao).toEqual([
      "Dòng 10: câu hỏi thiếu ' | Đ: '",
      "Dòng 11: câu hỏi thiếu ' | Đ: '",
      "Dòng 12: câu hỏi thiếu ' | Đ: '",
    ])
    expect(cau.cauHoi.map((c) => [c.hoi, c.dap])).toEqual([['a | b', 'c | Đ: d']])
  })

  it('khoá câu = băm câu hỏi chuẩn hoá; câu trùng thêm #2, #3', () => {
    const { cau } = doc(
      TU_KIEM_TRA,
      ['- H: Câu A | Đ: 1', '- H:   câu   a  | Đ: 2', '- H: Câu B | Đ: 3', '- H: CÂU A | Đ: 4'],
      'tu-kiem-tra',
    )
    const k = bam(chuanHoaCau('Câu A'))
    expect(cau.cauHoi.map((c) => c.khoa)).toEqual([
      k,
      `${k}#2`,
      bam(chuanHoaCau('Câu B')),
      `${k}#3`,
    ])
    expect(k).toMatch(/^[0-9a-z]{11}$/)
  })

  it('khoá không đổi khi chỉ đổi đáp án, khoảng trắng, hoa thường, NFC/NFD, \\| ↔ |', () => {
    expect(bam(chuanHoaCau('Câu  hỏi \\| x'))).toBe(
      bam(chuanHoaCau('câu hỏi | X'.normalize('NFD'))),
    )
    expect(taoKhoa(['a', 'b', 'a'])).toEqual([bam('a'), bam('b'), `${bam('a')}#2`])
  })

  it('băm ổn định (giá trị cố định để khoá trong DB không đổi giữa các phiên bản)', () => {
    expect(bam('')).toBe('0wvjl67o803')
    expect(bam('câu hỏi')).toBe('04984td7yt2')
    expect(bam(chuanHoaCau('Câu A'))).toBe('2eph9faclsx')
    expect(bam('abc')).not.toBe(bam('abd'))
  })
})

describe('Khái niệm cốt lõi: "- **Thuật ngữ** — giải thích"', () => {
  it('nhận —, – và " - "; dòng thụt nối vào giải thích', () => {
    const { cau, canhBao } = doc(
      KHAI_NIEM,
      [
        '- **A** — giải thích A',
        '* **B** – giải thích B',
        '- **C** - giải thích C',
        '  thêm cho C',
      ],
      'dinh-nghia',
    )
    expect(canhBao).toEqual([])
    expect(cau.dinhNghia).toEqual([
      { thuatNgu: 'A', giaiThich: 'giải thích A', dong: 10 },
      { thuatNgu: 'B', giaiThich: 'giải thích B', dong: 11 },
      { thuatNgu: 'C', giaiThich: 'giải thích C\nthêm cho C', dong: 12 },
    ])
  })

  it('viết khác trong danh sách → Markdown thường + cảnh báo một lần cho mỗi cụm dòng', () => {
    const { cau, canhBao } = doc(
      KHAI_NIEM,
      [
        'Đoạn mở',
        'dòng 2 của đoạn',
        '- **A** — x',
        '- **B**: y',
        '- C — z',
        '',
        '- **D** — w',
        'Chữ chen giữa',
        '',
        '- **E** — v',
      ],
      'dinh-nghia',
    )
    expect(cau.hopLe).toBe(false)
    // Đoạn mở trước danh sách được phép (F11); dòng sai dạng trong vùng danh sách thì không
    expect(cau.truoc).toEqual({ noiDung: 'Đoạn mở\ndòng 2 của đoạn', dong: 10 })
    expect(cau.thua).toEqual([
      { noiDung: '- **B**: y\n- C — z', dong: 13 },
      { noiDung: 'Chữ chen giữa', dong: 17 },
    ])
    expect(canhBao).toEqual([
      'Dòng 13: khối Khái niệm cốt lõi: dòng không theo dạng “- **Thuật ngữ** — giải thích” — hiện như Markdown thường',
      'Dòng 17: khối Khái niệm cốt lõi: dòng không theo dạng “- **Thuật ngữ** — giải thích” — hiện như Markdown thường',
    ])
  })

  it('F11: đoạn mở rồi danh sách → hợp lệ, đoạn mở giữ ở truoc, không cảnh báo', () => {
    const { cau, canhBao } = doc(
      KHAI_NIEM,
      [
        '[Đoạn mở] Khối này liệt kê 3–5 khái niệm.',
        '',
        '- **[Khái niệm 1]** — [giải thích 1]',
        '- **[Khái niệm 2]** — [giải thích 2]',
      ],
      'dinh-nghia',
    )
    expect(canhBao).toEqual([])
    expect(cau.hopLe).toBe(true)
    expect(cau.truoc).toEqual({ noiDung: '[Đoạn mở] Khối này liệt kê 3–5 khái niệm.', dong: 10 })
    expect(cau.dinhNghia.map((d) => [d.thuatNgu, d.dong])).toEqual([
      ['[Khái niệm 1]', 12],
      ['[Khái niệm 2]', 13],
    ])
    expect(cau.sau).toBeNull()
    expect(cau.thua).toEqual([])
  })

  it('đoạn mở liền danh sách (không dòng trống) và đoạn kết sau một dòng trống đều được phép', () => {
    const { cau, canhBao } = doc(
      KHAI_NIEM,
      [
        'Đoạn mở',
        '- **A** — a',
        '  nối cho A',
        '',
        '- **B** — b',
        '',
        'Đoạn kết 1',
        '',
        'Đoạn kết 2',
      ],
      'dinh-nghia',
    )
    expect(canhBao).toEqual([])
    expect(cau.hopLe).toBe(true)
    expect(cau.truoc).toEqual({ noiDung: 'Đoạn mở', dong: 10 })
    expect(cau.dinhNghia.map((d) => d.giaiThich)).toEqual(['a\nnối cho A', 'b'])
    expect(cau.sau).toEqual({ noiDung: 'Đoạn kết 1\n\nĐoạn kết 2', dong: 16 })
  })

  it('chữ không thụt ngay dưới mục cuối (không dòng trống) vẫn thuộc danh sách → sai dạng', () => {
    const { cau, canhBao } = doc(
      KHAI_NIEM,
      ['- **A** — a', 'Dính liền', '', 'Đoạn kết'],
      'dinh-nghia',
    )
    expect(cau.hopLe).toBe(false)
    expect(cau.thua).toEqual([{ noiDung: 'Dính liền', dong: 11 }])
    expect(cau.sau).toEqual({ noiDung: 'Đoạn kết', dong: 13 })
    expect(canhBao).toHaveLength(1)
  })

  it('đoạn mở / kết không được chứa danh sách khác dạng (danh sách đánh số cũng tính)', () => {
    const { cau } = doc(KHAI_NIEM, ['Mở', '', '1. **A** — a', '', '- **B** — b'], 'dinh-nghia')
    expect(cau.hopLe).toBe(false)
    expect(cau.truoc).toEqual({ noiDung: 'Mở', dong: 10 })
    expect(cau.thua).toEqual([{ noiDung: '1. **A** — a', dong: 12 }])
  })

  it('không có danh sách nào → cả khối là Markdown thường + cảnh báo (như trước)', () => {
    const { cau, canhBao } = doc(KHAI_NIEM, ['Chỉ có đoạn văn.', 'Dòng 2.'], 'dinh-nghia')
    expect(cau.hopLe).toBe(false)
    expect(cau.truoc).toBeNull()
    expect(cau.thua).toEqual([{ noiDung: 'Chỉ có đoạn văn.\nDòng 2.', dong: 10 }])
    expect(canhBao).toHaveLength(1)
  })

  it('dòng danh sách trong khối mã của đoạn mở / kết không mở vùng danh sách', () => {
    const { cau, canhBao } = doc(
      KHAI_NIEM,
      [
        'Ví dụ cú pháp:',
        '```md',
        '- **X** — y',
        '- sai dạng',
        '```',
        '',
        '- **A** — a',
        '',
        '~~~',
        '- trong mã',
        '~~~',
      ],
      'dinh-nghia',
    )
    expect(canhBao).toEqual([])
    expect(cau.hopLe).toBe(true)
    expect(cau.truoc?.noiDung).toBe('Ví dụ cú pháp:\n```md\n- **X** — y\n- sai dạng\n```')
    expect(cau.dinhNghia.map((d) => d.thuatNgu)).toEqual(['A'])
    expect(cau.sau?.noiDung).toBe('~~~\n- trong mã\n~~~')
  })
})

describe('Góc dev lead → PM và Thực hành: tiểu mục ###', () => {
  it('đủ tiểu mục theo thứ tự bất kỳ, tên so sau chuẩn hoá', () => {
    const { cau, canhBao } = doc(
      GOC_DEV_LEAD,
      ['### điều cần đổi', 'b', '### Bạn  đã quen ###', 'a'],
      'goc-dev-lead',
    )
    expect(canhBao).toEqual([])
    expect(cau.hopLe).toBe(true)
    expect(cau.mucCon.map((m) => [m.tieuDe, m.mauTen, m.noiDung, m.dong])).toEqual([
      ['điều cần đổi', 'Điều cần đổi', 'b', 10],
      ['Bạn  đã quen', 'Bạn đã quen', 'a', 12],
    ])
  })

  it('chữ trước ###, tiểu mục lạ, tiểu mục lặp, thiếu tiểu mục → cảnh báo, hopLe false', () => {
    const { cau, canhBao, muc } = doc(
      GOC_DEV_LEAD,
      [
        'Mở đầu',
        '### Bạn đã quen',
        'a',
        '### Lạ',
        'x',
        '### bạn đã quen',
        'c',
        '```',
        '### trong mã',
        '```',
      ],
      'goc-dev-lead',
    )
    expect(cau.hopLe).toBe(false)
    expect(cau.truoc).toEqual({ noiDung: 'Mở đầu', dong: 10 })
    expect(cau.mucCon.map((m) => m.mauTen)).toEqual(['Bạn đã quen', null, 'Bạn đã quen'])
    expect(cau.mucCon[2].noiDung).toBe('c\n```\n### trong mã\n```')
    expect(canhBao).toEqual([
      'Dòng 10: khối Góc dev lead → PM: chữ trước “###” đầu tiên — khối hiện như Markdown thường',
      'Dòng 13: khối Góc dev lead → PM: “### Lạ” không có trong mẫu — khối hiện như Markdown thường',
      'Dòng 15: khối Góc dev lead → PM: “### bạn đã quen” lặp lại — khối hiện như Markdown thường',
      // thiếu tiểu mục: báo ở dòng chữ đầu tiên của khối (phanTichBai sắp lại theo dòng)
      'Dòng 10: khối Góc dev lead → PM thiếu “### Điều cần đổi”',
    ])
    expect(muc.every((m) => m === 'canh-bao')).toBe(true)
  })

  it('Thực hành: tiêu chí tự kiểm là task list, khoá theo dòng', () => {
    const { cau, canhBao } = doc(
      THUC_HANH,
      [
        '### Đề bài',
        'a',
        '### Đầu ra',
        'b',
        '### Tiêu chí tự kiểm',
        '- [ ] Một',
        '- [X] Hai',
        '  nối',
        '- [ ] Một',
      ],
      'thuc-hanh',
    )
    expect(canhBao).toEqual([])
    expect(cau.tieuChi.map((t) => [t.chu, t.daTick, t.dong])).toEqual([
      ['Một', false, 15],
      ['Hai nối', true, 16],
      ['Một', false, 18],
    ])
    expect(cau.tieuChi[2].khoa).toBe(`${cau.tieuChi[0].khoa}#2`)
  })

  it('Thực hành: tiêu chí không phải task list → cảnh báo', () => {
    const { canhBao } = doc(
      THUC_HANH,
      ['### Đề bài', 'a', '### Đầu ra', 'b', '### Tiêu chí tự kiểm', '1. Một'],
      'thuc-hanh',
    )
    expect(canhBao).toEqual([
      'Dòng 15: khối Thực hành trên dự án thật: dòng không theo dạng “- [ ] …” — hiện như Markdown thường',
      'Dòng 15: khối Thực hành trên dự án thật chưa có dòng “- [ ] …”',
    ])
  })
})

describe('Mẫu điền sẵn: bảng GFM đầu tiên', () => {
  it('đọc bảng đầu tiên, giữ chữ trước/sau, bỏ qua bảng thứ hai', () => {
    const { cau, canhBao } = doc(
      MAU_DIEN_SAN,
      [
        'Giới thiệu.',
        '',
        '| ID | Mô tả | Ghi chú |',
        '|:---|:---:|---:|',
        '| 1 | a \\| b | x |',
        '| 2 | thiếu ô |',
        '| 3 | c | d | thừa |',
        '',
        '| khác |',
        '| --- |',
      ],
      'mau-dien-san',
    )
    expect(canhBao).toEqual([])
    expect(cau.bang).toEqual({
      cot: ['ID', 'Mô tả', 'Ghi chú'],
      hang: [
        ['1', 'a | b', 'x'],
        ['2', 'thiếu ô', ''],
        ['3', 'c', 'd'],
      ],
      dong: 12,
      dongCuoi: 16,
    })
    expect(cau.truoc).toEqual({ noiDung: 'Giới thiệu.', dong: 10 })
    expect(cau.sau).toEqual({ noiDung: '| khác |\n| --- |', dong: 18 })
  })

  it('bảng không có ống hai đầu; số ô dòng ngăn khác dòng tiêu đề thì không phải bảng', () => {
    expect(timBang(dong('A | B', '--- | ---', '1 | 2'))?.bang.hang).toEqual([['1', '2']])
    expect(timBang(dong('| A | B |', '| --- |', '| 1 | 2 |'))).toBeNull()
    expect(timBang(dong('```', '| A |', '| - |', '```'))).toBeNull()
  })

  it('không có bảng → cảnh báo, hiện như Markdown thường', () => {
    const { cau, canhBao } = doc(MAU_DIEN_SAN, ['- cột 1', '- cột 2'], 'mau-dien-san')
    expect(cau).toMatchObject({
      bang: null,
      hopLe: false,
      truoc: { noiDung: '- cột 1\n- cột 2', dong: 10 },
    })
    expect(canhBao).toEqual([
      'Dòng 10: khối Mẫu điền sẵn chưa có bảng Markdown — hiện như Markdown thường',
    ])
  })

  it('tachO: bỏ | hai đầu, \\| là chữ', () => {
    expect(tachO('| a | b \\| c |  ')).toEqual(['a', 'b | c'])
    expect(tachO('a|b')).toEqual(['a', 'b'])
  })
})

describe('Checklist chất lượng: task list', () => {
  it('đọc dòng tick, khoá theo câu', () => {
    const { cau, canhBao } = doc(CHECKLIST, ['- [ ] Một', '* [x] Hai', '+ [ ] Ba'], 'checklist')
    expect(canhBao).toEqual([])
    expect(cau.dongTick.map((d) => [d.chu, d.daTick, d.khoa])).toEqual([
      ['Một', false, bam(chuanHoaCau('Một'))],
      ['Hai', true, bam(chuanHoaCau('Hai'))],
      ['Ba', false, bam(chuanHoaCau('Ba'))],
    ])
  })

  it('không có dòng tick → cảnh báo', () => {
    const { cau, canhBao } = doc(CHECKLIST, ['- Một'], 'checklist')
    expect(cau.hopLe).toBe(false)
    expect(canhBao).toEqual([
      'Dòng 10: khối Checklist chất lượng: dòng không theo dạng “- [ ] …” — hiện như Markdown thường',
      'Dòng 10: khối Checklist chất lượng chưa có dòng “- [ ] …”',
    ])
  })
})

describe('Chứng chỉ (P1): Thông tin kỳ thi, Phủ roadmap', () => {
  it('Thông tin kỳ thi: "- <Trường>: <giá trị>", giá trị trống giữ ""', () => {
    const { cau, canhBao } = doc(
      THONG_TIN,
      ['- A: 1', '- B:', '- C: x: y', 'chữ lạ'],
      'thong-tin-thi',
    )
    expect(cau.truong).toEqual([
      { ten: 'A', giaTri: '1', dong: 10 },
      { ten: 'B', giaTri: '', dong: 11 },
      { ten: 'C', giaTri: 'x: y', dong: 12 },
    ])
    expect(canhBao).toEqual([
      'Dòng 13: khối Thông tin kỳ thi: dòng không theo dạng “- <Trường>: <giá trị>” — hiện như Markdown thường',
    ])
  })

  it('Phủ roadmap: ### domain + danh sách slug; chữ ngoài quy ước → cảnh báo', () => {
    const { cau, canhBao } = doc(
      PHU,
      ['Mở', '### D1', '- a', '- b', 'lạ', '### D2', '* c'],
      'phu-roadmap',
    )
    expect(cau.domain).toEqual([
      {
        ten: 'D1',
        dong: 11,
        muc: [
          { giaTri: 'a', dong: 12 },
          { giaTri: 'b', dong: 13 },
        ],
      },
      { ten: 'D2', dong: 15, muc: [{ giaTri: 'c', dong: 16 }] },
    ])
    expect(cau.hopLe).toBe(false)
    expect(canhBao).toEqual([
      'Dòng 10: khối Phủ roadmap: chữ trước “###” đầu tiên — khối hiện như Markdown thường',
      'Dòng 14: khối Phủ roadmap: dòng không theo dạng “- <slug>” — hiện như Markdown thường',
    ])
  })
})

describe('khối mã trong khối dạng danh sách (``` / ~~~)', () => {
  it('Tự kiểm tra: dòng "- H: … | Đ: …" trong khối mã không thành câu hỏi; khối mã → Markdown thường', () => {
    const { cau, canhBao } = doc(
      TU_KIEM_TRA,
      [
        '- H: Câu thật? | Đ: Đáp thật',
        '',
        '```',
        '- H: Câu trong mã | Đ: x',
        '',
        '- H: thiếu đáp án',
        '```',
      ],
      'tu-kiem-tra',
    )
    expect(cau.cauHoi.map((c) => c.hoi)).toEqual(['Câu thật?'])
    expect(cau.thua).toEqual([
      { noiDung: '```\n- H: Câu trong mã | Đ: x\n\n- H: thiếu đáp án\n```', dong: 12 },
    ])
    expect(cau.hopLe).toBe(false)
    // một cảnh báo cho cả khối mã, không có lỗi "thiếu ' | Đ: '" cho dòng trong mã
    expect(canhBao).toEqual([
      'Dòng 12: khối Tự kiểm tra: dòng không theo dạng “- H: … | Đ: …” — hiện như Markdown thường',
    ])
  })

  it('khối mã thụt ngay dưới một câu thuộc về đáp án (giữ dòng trống, thụt tương đối)', () => {
    const { cau, canhBao } = doc(
      TU_KIEM_TRA,
      [
        '- H: Lệnh nào? | Đ: Chạy:',
        '  ```sh',
        '  npm test',
        '',
        '    --watch',
        '  ```',
        '- H: Câu 2 | Đ: b',
      ],
      'tu-kiem-tra',
    )
    expect(canhBao).toEqual([])
    expect(cau.hopLe).toBe(true)
    expect(cau.cauHoi.map((c) => c.dap)).toEqual(['Chạy:\n```sh\nnpm test\n\n  --watch\n```', 'b'])
  })

  it('Checklist, Thông tin kỳ thi, Phủ roadmap: dòng trong khối mã không thành mục', () => {
    const tick = doc(CHECKLIST, ['- [ ] Thật', '```', '- [ ] Trong mã', '```'], 'checklist')
    expect(tick.cau.dongTick.map((d) => d.chu)).toEqual(['Thật'])
    expect(tick.cau.hopLe).toBe(false)
    const thi = doc(THONG_TIN, ['- Trường: giá trị', '~~~', '- Giả: x', '~~~'], 'thong-tin-thi')
    expect(thi.cau.truong.map((t) => t.ten)).toEqual(['Trường'])
    expect(thi.cau.hopLe).toBe(false)
    const phu = doc(PHU, ['### D1', '- slug-a', '```', '- slug-trong-ma', '```'], 'phu-roadmap')
    expect(phu.cau.domain[0].muc.map((m) => m.giaTri)).toEqual(['slug-a'])
    expect(phu.cau.hopLe).toBe(false)
  })
})

describe('tieuDeCap: tiêu đề ATX đúng cấp', () => {
  it('như CommonMark: tối đa 3 dấu cách đầu dòng, cần khoảng trắng sau #, bỏ dãy # đóng', () => {
    expect(tieuDeCap('## Tóm tắt', 2)).toBe('Tóm tắt')
    expect(tieuDeCap('   ##\tTóm tắt  ##  ', 2)).toBe('Tóm tắt')
    expect(tieuDeCap('## A#', 2)).toBe('A#')
    expect(tieuDeCap('## C# ##', 2)).toBe('C#')
    expect(tieuDeCap('##', 2)).toBe('')
    expect(tieuDeCap('## ##', 2)).toBe('')
    expect(tieuDeCap('##Tóm tắt', 2)).toBeNull()
    expect(tieuDeCap('### Tóm tắt', 2)).toBeNull()
    expect(tieuDeCap('    ## Mã', 2)).toBeNull()
    expect(tieuDeCap('### Bạn đã quen ###', 3)).toBe('Bạn đã quen')
    expect(tieuDeCap('## Tóm tắt', 3)).toBeNull()
  })
})

describe('đọc tuyến tính: dòng 200 KB nhiều khoảng trắng không làm treo (regex lùi bậc 2–3)', () => {
  const KT = ' '.repeat(100 * 1024)
  const CA: [KhoiMau, string, CauTrucKhoi['kieu']][] = [
    [TU_KIEM_TRA, `- H:${KT}a${KT}b`, 'tu-kiem-tra'],
    [TU_KIEM_TRA, `- H: a${KT}|${KT}x`, 'tu-kiem-tra'],
    [TU_KIEM_TRA, `- H: a ${'| '.repeat(50 * 1024)}`, 'tu-kiem-tra'],
    [KHAI_NIEM, `- **a**${KT}b${KT}`, 'dinh-nghia'],
    [KHAI_NIEM, `- **${'** '.repeat(60 * 1024)}`, 'dinh-nghia'],
    [THONG_TIN, `- a${KT}b${KT}c`, 'thong-tin-thi'],
    [CHECKLIST, `- [ ] a${KT}b${KT}`, 'checklist'],
    [PHU, `### a${KT}b${KT}c\n- a${KT}b${KT}c`, 'phu-roadmap'],
    [GOC_DEV_LEAD, `### a${KT}b${KT}c`, 'goc-dev-lead'],
  ]
  it.each(CA.map(([k, chu, kieu], i) => [i, k, chu, kieu] as const))(
    'ca %i đọc dưới 200 ms',
    (_i, k, chu, kieu) => {
      const batDau = performance.now()
      doc(k, chu.split('\n'), kieu)
      expect(performance.now() - batDau).toBeLessThan(200)
    },
  )

  it('tieuDeCap trên dòng 200 KB', () => {
    const batDau = performance.now()
    expect(tieuDeCap(`## a${KT}b${KT}x`, 2)).toBe(`a${KT}b${KT}x`)
    expect(tieuDeCap(`##${KT}${'#'.repeat(1000)}${KT}`, 2)).toBe('')
    expect(performance.now() - batDau).toBeLessThan(200)
  })
})
