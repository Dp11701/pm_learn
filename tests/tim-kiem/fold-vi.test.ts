import { describe, expect, it } from 'vitest'
import { doanKhop, doiDoan, foldVi, tachDoan, timTrong } from '../../shared/tim-kiem'

const cat = (text: string, doan: [number, number][]) => doan.map(([a, b]) => text.slice(a, b))

describe('foldVi', () => {
  it.each([
    ['Quản lý rủi ro định lượng', 'quan ly rui ro dinh luong'],
    ['ĐỊNH LƯỢNG', 'dinh luong'],
    ['Đ', 'd'],
    ['đường', 'duong'],
    ['Ừ, ỡ, ặ, ệ, ổ, ự, Ỷ', 'u o a e o u y'],
    ['Value/Effort Matrix', 'value effort matrix'],
    [
      'Schedule compression ( crashing, fast tracking)',
      'schedule compression crashing fast tracking',
    ],
    ['  --CI/CD--  ', 'ci cd'],
    ['Automated testing & test pyramid', 'automated testing test pyramid'],
    ['', ''],
    ['— / —', ''],
  ])('%s → %s', (vao, ra) => {
    expect(foldVi(vao).folded).toBe(ra)
  })

  it('dấu nháy và ® bị xoá hẳn như quy tắc slug, không thành khoảng trắng', () => {
    expect(foldVi("Lewin's Change Management Model").folded).toBe('lewins change management model')
    expect(foldVi('Alderfer’s ERG Theory').folded).toBe('alderfers erg theory')
    expect(foldVi('Agile Certified Practitioner (PMI-ACP®)').folded).toBe(
      'agile certified practitioner pmi acp',
    )
  })

  it('chuỗi gốc dạng NFD (dấu rời, dấu chồng) gấp như dạng NFC', () => {
    const nfc = 'Quản lý rủi ro định lượng'
    expect(foldVi(nfc.normalize('NFD')).folded).toBe(foldVi(nfc).folded)
    expect(foldVi('ệ'.normalize('NFD')).folded).toBe('e')
  })

  it('mỗi ký tự gấp trỏ về đúng ký tự gốc của nó', () => {
    for (const text of [
      'Quản lý rủi ro định lượng',
      'Steering Comittee',
      'Kotter’s 8-Step Process',
    ]) {
      const gap = foldVi(text)
      expect(gap.viTri).toHaveLength(gap.folded.length)
      expect(gap.viTriCuoi).toHaveLength(gap.folded.length)
      ;[...gap.folded].forEach((c, i) => {
        const goc = text.slice(gap.viTri[i], gap.viTriCuoi[i])
        // khoảng trắng trỏ về dấu ngăn đầu tiên của cụm
        expect(foldVi(goc).folded).toBe(c === ' ' ? '' : c)
      })
    }
  })
})

describe('doanKhop: in đậm đúng đoạn trên chuỗi gốc', () => {
  const text = 'Quản lý rủi ro định lượng'

  it('truy vấn không dấu khớp đoạn có dấu', () => {
    expect(doanKhop(text, 'rui ro')).toEqual([[8, 14]])
    expect(cat(text, doanKhop(text, 'rui ro'))).toEqual(['rủi ro'])
    expect(cat(text, doanKhop(text, 'DINH LUONG'))).toEqual(['định lượng'])
    expect(cat(text, doanKhop(text, 'định'))).toEqual(['định'])
  })

  it('chuỗi gốc NFD: đoạn khớp gồm cả dấu rời của ký tự cuối', () => {
    const nfd = text.normalize('NFD')
    expect(cat(nfd, doanKhop(nfd, 'quan'))).toEqual(['Quản'.normalize('NFD')])
    expect(cat(nfd, doanKhop(nfd, 'luong'))).toEqual(['lượng'.normalize('NFD')])
  })

  it('đoạn khớp vắt qua dấu câu và dấu nháy', () => {
    expect(cat('Value/Effort Matrix', doanKhop('Value/Effort Matrix', 'value effort'))).toEqual([
      'Value/Effort',
    ])
    expect(cat("Lewin's Model", doanKhop("Lewin's Model", 'lewins'))).toEqual(["Lewin's"])
    expect(cat("Lewin's Model", doanKhop("Lewin's Model", 'lewin'))).toEqual(['Lewin'])
    expect(cat('CI/CD', doanKhop('CI/CD', 'ci/cd'))).toEqual(['CI/CD'])
  })

  it('mọi lần xuất hiện, không chồng nhau', () => {
    expect(doanKhop('Scrum of Scrums', 'scrum')).toEqual([
      [0, 5],
      [9, 14],
    ])
    expect(doanKhop('aaaa', 'aa')).toEqual([
      [0, 2],
      [2, 4],
    ])
  })

  it('không khớp hoặc truy vấn rỗng → []', () => {
    expect(doanKhop(text, 'risk')).toEqual([])
    expect(doanKhop(text, '')).toEqual([])
    expect(doanKhop(text, ' / ')).toEqual([])
  })

  it('timTrong và doiDoan làm việc trên chuỗi đã gấp sẵn (server giữ sẵn bảng vị trí)', () => {
    const gap = foldVi(text)
    expect(timTrong(gap, 'ly rui')).toEqual(doanKhop(text, 'lý rủi'))
    expect(doiDoan(gap, 0, 4)).toEqual([0, 4])
  })
})

describe('tachDoan', () => {
  it('cắt tên thành mảnh thường / khớp', () => {
    const ten = 'Quantitative Risk Assessment'
    expect(tachDoan(ten, doanKhop(ten, 'risk'))).toEqual([
      { chu: 'Quantitative ', khop: false },
      { chu: 'Risk', khop: true },
      { chu: ' Assessment', khop: false },
    ])
    expect(tachDoan('SAFe', [[0, 4]])).toEqual([{ chu: 'SAFe', khop: true }])
    expect(tachDoan('SAFe', [])).toEqual([{ chu: 'SAFe', khop: false }])
  })
})
