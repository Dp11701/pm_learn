import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import cayJson from '../fixtures/roadmap-tree.json'
import {
  danhSachFile,
  docCumCam,
  kiemChuoi,
  laTen1Tu,
  moiNut,
  quetMa,
  taoDuLieu,
  type CayTho,
  type QuyTac,
} from '../../scripts/kiem-go-cung'

const cay = cayJson as CayTho
const cumThat = docCumCam(
  readFileSync(new URL('../fixtures/cam-go-cung.txt', import.meta.url), 'utf8'),
)
const duLieu = taoDuLieu(cay, cumThat)

/** Các luật bị vi phạm (không trùng lặp, đã sắp xếp). */
function luat(chuoi: string): QuyTac[] {
  return [...new Set(kiemChuoi(chuoi, duLieu).map((t) => t.quyTac))].sort()
}

function quet(ma: string, file = 'src/a.tsx') {
  return quetMa(ma, file, duLieu).map((v) => ({ luat: v.quyTac, chuoi: v.chuoi, dong: v.dong }))
}

describe('dữ liệu từ cây đóng băng', () => {
  it('236 nút; 52 nút tên 1 từ (51 tên khác nhau, SAFe 2 lần); 13 tên gốc', () => {
    const nut = moiNut(cay)
    expect(nut).toHaveLength(236)
    expect(nut.filter((n) => laTen1Tu(n.label))).toHaveLength(52)
    expect(duLieu.ten1Tu.size).toBe(51)
    expect(nut.filter((n) => n.labelOriginal)).toHaveLength(13)
    expect(duLieu.ids.size).toBe(236)
  })

  it('tên 1 từ gồm cả tên dễ trùng chữ UI tiếng Anh; luật (a) so bằng nên không bắt khi nằm trong câu', () => {
    for (const ten of ['Tools', 'Planning', 'Agile', 'Audit', 'Recognition', 'Retention']) {
      expect(duLieu.ten1Tu.has(ten)).toBe(true)
    }
    for (const ten of ['Closure', 'Execution', 'Inspection', 'Certifications', 'LeSS']) {
      expect(duLieu.ten1Tu.has(ten)).toBe(true)
    }
    expect(luat('Agile Coach')).toEqual([])
    expect(luat('Planning tiếp')).toEqual([])
    expect(luat('Công cụ (Tools)')).toEqual([])
  })
})

describe('luật (a): bằng tên nút 1 từ', () => {
  it('bắt khi bằng đúng tên, sau khi trim', () => {
    expect(luat('Scrum')).toEqual(['a'])
    expect(luat('  Kanban \n')).toEqual(['a'])
    expect(luat('CI/CD')).toEqual(['a'])
    expect(luat('V-model')).toEqual(['a'])
  })

  it('phân biệt hoa/thường, không bắt khi chỉ là một phần chuỗi', () => {
    expect(luat('scrum')).toEqual([])
    expect(luat('SCRUM')).toEqual([])
    expect(luat('Học Scrum mỗi ngày')).toEqual([])
    expect(luat('Scrums')).toEqual([])
  })

  it('"Scrum" trong "Scrum of Scrums" không phạm (a); chuỗi đó phạm (b) vì là tên nút nhiều từ', () => {
    const trung = kiemChuoi('Scrum of Scrums', duLieu)
    expect(trung.some((t) => t.quyTac === 'a')).toBe(false)
    expect(trung).toContainEqual({ quyTac: 'b', chiTiet: 'chứa tên nút “Scrum of Scrums”' })
  })
})

describe('luật (b): chứa tên nút ≥ 2 từ hoặc tên gốc, theo ranh giới từ', () => {
  it('bắt tên nằm trong câu dài, không phân biệt hoa/thường', () => {
    expect(luat('Hôm nay mình đọc Risk Register của dự án.')).toEqual(['b'])
    expect(luat('mở risk register')).toEqual(['b'])
  })

  it('tôn trọng ranh giới từ, kể cả chữ tiếng Việt có dấu', () => {
    expect(luat('Scope Creepy')).toEqual([])
    expect(luat('xScope Creep')).toEqual([])
    expect(luat('Scope Creepđ')).toEqual([])
    expect(luat('ẤScope Creep')).toEqual([])
    expect(luat('(Scope Creep)')).toEqual(['b'])
    expect(luat('Scope Creep — phình to')).toEqual(['b'])
  })

  it('các từ nối bằng dấu ngăn bất kỳ: xuống dòng, nbsp, slug', () => {
    expect(luat('Risk\n      Register')).toEqual(['b'])
    expect(luat('Risk&nbsp;Register')).toEqual(['b'])
    expect(luat('/hoc/risk-register')).toEqual(['b'])
    expect(luat('wbs-wbs-dictionary')).toEqual(['b'])
    expect(luat('lewins-change-management-model')).toEqual(['b'])
  })

  it('tên có ký tự đặc biệt', () => {
    expect(luat("Lewin's Change Management Model")).toEqual(['b'])
    expect(luat('Agile Certified Practitioner (PMI-ACP®)')).toEqual(['b'])
    expect(luat('Alderfer’s ERG Theory')).toEqual(['b'])
    expect(luat('Schedule creation (milestones, phases, critical path)')).toEqual(['b'])
  })

  it('tên gốc (labelOriginal), kể cả tên gốc 1 từ', () => {
    expect(kiemChuoi('Steering Comittee', duLieu)).toContainEqual({
      quyTac: 'b',
      chiTiet: 'chứa tên gốc “Steering Comittee” (của “Steering Committee”)',
    })
    expect(luat('Bước Inititation đầu tiên')).toEqual(['b'])
    expect(luat('Inititations')).toEqual([])
  })

  it('chữ UI không chứa tên nút thì không bị bắt', () => {
    for (const ui of [
      'Chưa có nội dung',
      'Sao chép prompt soạn bài',
      'Học PM A–Z',
      'Theo roadmap.sh',
      'Thử tên tiếng Anh hoặc viết tắt, vd. "test pyramid" hoặc "ccb".',
      'Nói lại bằng lời của bạn',
    ]) {
      expect(luat(ui)).toEqual([])
    }
  })
})

describe('luật (c): cụm trong cam-go-cung.txt', () => {
  it('docCumCam bỏ dòng trống, dòng #, và trim', () => {
    expect(docCumCam('# chú thích\n\n  phình phạm vi  \r\n#x\nR-01\n')).toEqual([
      'phình phạm vi',
      'R-01',
    ])
  })

  it('file thật có các cụm bắt buộc và không có dòng rác', () => {
    for (const c of ['phình phạm vi', 'Cổng đặt lịch nội bộ', '[Nội dung mẫu', 'R-01']) {
      expect(cumThat).toContain(c)
    }
    expect(cumThat.every((c) => c.length >= 4)).toBe(true)
    expect(new Set(cumThat).size).toBe(cumThat.length)
  })

  it('chuỗi con, không phân biệt hoa/thường, chuẩn hoá NFC và khoảng trắng', () => {
    expect(luat('Giải nghĩa: phình phạm vi')).toEqual(['c'])
    expect(luat('PHÌNH PHẠM VI')).toEqual(['c'])
    expect(luat('phình phạm vi'.normalize('NFD'))).toEqual(['c'])
    expect(luat('Cổng đặt\n    lịch nội bộ')).toEqual(['c'])
    expect(luat('[Nội dung mẫu — Tóm tắt] …')).toEqual(['c'])
    expect(luat('Mã r-01')).toEqual(['c'])
  })

  it('không cấm chữ UI thật', () => {
    for (const ui of [
      'Chưa có nội dung',
      'Bản nháp · AI',
      'Bản nháp · Tự viết',
      'Đã duyệt · có bản sửa chưa duyệt',
      'Mục này chưa có nội dung.',
      'Mẫu điền sẵn',
      'Tạo từ mẫu',
      'Khung bài',
      'Tóm tắt',
      'Đang theo dõi',
      'Lộ trình gợi ý: Đề xuất — chờ bạn duyệt',
      'Một câu hành động bắt đầu bằng động từ.',
      'Tên dự án',
      'dd/MM/yyyy',
    ]) {
      expect(luat(ui)).toEqual([])
    }
  })
})

describe('luật (d): chứa id nút', () => {
  it('id đứng riêng hoặc nằm trong chuỗi', () => {
    expect(luat('yq5yoPCrn78ML11RygyDN')).toEqual(['d'])
    expect(luat('/ban-do?muc=yq5yoPCrn78ML11RygyDN')).toEqual(['d'])
    expect(kiemChuoi('id: a66yNuBIMbIdC2nLS6-8-', duLieu)).toContainEqual({
      quyTac: 'd',
      chiTiet: 'chứa id “a66yNuBIMbIdC2nLS6-8-” (SAFe)',
    })
  })

  it('chuỗi ngắn hoặc id sai không bị bắt', () => {
    expect(luat('yq5yoPCrn78ML11Rygy')).toEqual([])
    expect(luat('YQ5YOPCRN78ML11RYGYDN')).toEqual([])
  })
})

describe('quetMa: duyệt AST', () => {
  it('chuỗi nháy đơn, nháy kép, vị trí dòng/cột', () => {
    const v = quetMa("const a = 1\nconst b = 'Risk Register'\n", 'src/x.ts', duLieu)
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({
      file: 'src/x.ts',
      dong: 2,
      cot: 11,
      quyTac: 'b',
      chuoi: 'Risk Register',
    })
  })

  it('template literal: không thay thế, head, middle, tail', () => {
    expect(quet('const a = `Scope Creep`')).toEqual([{ luat: 'b', chuoi: 'Scope Creep', dong: 1 }])
    expect(quet('const a = `Scope Creep ${x}`')).toEqual([
      { luat: 'b', chuoi: 'Scope Creep ', dong: 1 },
    ])
    expect(quet('const a = `${x} Risk Register ${y}!`')).toEqual([
      { luat: 'b', chuoi: ' Risk Register ', dong: 1 },
    ])
    expect(quet('const a = `${x} Scrum`')).toEqual([{ luat: 'a', chuoi: ' Scrum', dong: 1 }])
    expect(quet('const a = tag`phình phạm vi`')).toEqual([
      { luat: 'c', chuoi: 'phình phạm vi', dong: 1 },
    ])
  })

  it('chữ JSX và thuộc tính chuỗi JSX', () => {
    expect(quet('const a = <b>Scrum</b>')).toEqual([{ luat: 'a', chuoi: 'Scrum', dong: 1 }])
    expect(quet('const a = (\n  <p>\n    Risk\n    Register\n  </p>\n)')).toHaveLength(1)
    expect(quet('const a = <X title="Scope Creep" />')).toEqual([
      { luat: 'b', chuoi: 'Scope Creep', dong: 1 },
    ])
    expect(quet('const a = <p>Xin chào {ten}</p>')).toEqual([])
  })

  it('kiểu literal, khoá object, regex literal cũng bị quét', () => {
    expect(quet("type K = 'Kanban'", 'src/a.ts')).toHaveLength(1)
    expect(quet("const o = { 'Risk Register': 1 }", 'src/a.ts')).toHaveLength(1)
    expect(quet('const r = /Scope Creep/i', 'src/a.ts')).toHaveLength(1)
  })

  it('bỏ qua chú thích', () => {
    const ma = [
      '// Risk Register, Scrum, phình phạm vi, yq5yoPCrn78ML11RygyDN',
      '/* Scope Creep */',
      '/** @see Scrum of Scrums */',
      'const a = <p>{/* Scrum */}Xin chào</p>',
    ].join('\n')
    expect(quet(ma)).toEqual([])
  })

  it('file .js, .jsx, .mjs cũng phân tích được', () => {
    expect(quetMa("export default 'Scrum'", 'src/a.mjs', duLieu)).toHaveLength(1)
    expect(quetMa('export const A = () => <i>Scrum</i>', 'src/a.jsx', duLieu)).toHaveLength(1)
  })
})

describe('danhSachFile: chỉ quét src/, server/, shared/', () => {
  const goc = mkdtempSync(path.join(os.tmpdir(), 'kiem-go-cung-'))
  afterAll(() => rmSync(goc, { recursive: true, force: true }))

  it('kể cả src/dev/, bỏ tests/, fixtures/, node_modules/, file không phải mã', () => {
    const tao = (f: string) => {
      mkdirSync(path.dirname(path.join(goc, f)), { recursive: true })
      writeFileSync(path.join(goc, f), "export const a = 'Scrum'\n")
    }
    for (const f of [
      'src/a.ts',
      'src/dev/ThanhPhan.tsx',
      'src/styles/app.css',
      'src/data.json',
      'server/b.mts',
      'server/node_modules/x/index.js',
      'shared/c.ts',
      'shared/d.d.ts',
      'tests/x.test.ts',
      'tests/fixtures/y.ts',
      'fixtures/mau/z.ts',
      'scripts/w.ts',
    ]) {
      tao(f)
    }
    expect(danhSachFile(goc)).toEqual([
      'server/b.mts',
      'shared/c.ts',
      'shared/d.d.ts',
      'src/a.ts',
      'src/dev/ThanhPhan.tsx',
    ])
  })
})
