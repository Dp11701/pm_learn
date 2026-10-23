import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import cayJson from '../fixtures/roadmap-tree.json'
import {
  chuoiHopLe,
  docBundle,
  giaiEscapeJs,
  locChuoiMau,
  napChuoiMau,
  quetBundle,
  tapChuoi,
  thuChuoi,
} from '../../scripts/kiem-bundle'

const file = (ten: string, noiDung: string) => ({ ten, noiDung })

describe('quetBundle', () => {
  it('bundle sạch thì không có vi phạm', () => {
    const files = [file('dist/assets/index.js', 'const a="Chưa có nội dung";fetch("/api/meta")')]
    expect(quetBundle(files, ['phình phạm vi'], [{ chuoi: 'Cổng đặt lịch', nguon: 'x' }])).toEqual(
      [],
    )
  })

  it('bắt "/_dev", kể cả khi viết "\\/_dev"', () => {
    const v = quetBundle(
      [
        file('dist/a.js', 'path:"/_dev/thanh-phan"'),
        file('dist/b.json', '{"p":"\\/_dev\\/frame"}'),
      ],
      [],
      [],
    )
    expect(v.map((x) => [x.file, x.loai])).toEqual([
      ['dist/a.js', 'dev'],
      ['dist/b.json', 'dev'],
    ])
    expect(v[0].nguCanh).toContain('/_dev/thanh-phan')
  })

  it('bắt cụm cấm: không phân biệt hoa/thường, qua escape \\u của trình nén', () => {
    const v = quetBundle(
      [
        file('dist/a.js', 'x="Scope Creep \\u2014 ph\\u00ECnh ph\\u1EA1m vi"'),
        file('dist/b.css', ''),
      ],
      ['PHÌNH PHẠM VI'],
      [],
    )
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ file: 'dist/a.js', loai: 'cum-cam' })
  })

  it('bắt chữ mẫu từ fixtures/mau, ghi rõ nguồn', () => {
    const v = quetBundle(
      [file('dist/a.js', 'children:"Dự án: Cổng đặt   lịch nội bộ"')],
      [],
      [{ chuoi: 'Cổng đặt lịch nội bộ', nguon: 'fixtures/mau/a.ts.duAn.ten' }],
    )
    expect(v).toHaveLength(1)
    expect(v[0].chiTiet).toContain('fixtures/mau/a.ts.duAn.ten')
  })
})

describe('giaiEscapeJs', () => {
  it('\\uXXXX, \\u{…}, \\xNN', () => {
    expect(giaiEscapeJs('ph\\u00ECnh \\u{1F600} \\xE0')).toBe('phình 😀 à')
    expect(giaiEscapeJs('không escape')).toBe('không escape')
  })
})

describe('chuỗi mẫu', () => {
  it('thuChuoi lấy mọi chuỗi trong object, mảng lồng nhau; bỏ hàm, không lặp vô hạn', () => {
    const vong: Record<string, unknown> = { a: 'một hai' }
    vong.chinhNo = vong
    const mod = { default: { ds: ['x y', { z: 'ba bốn' }] }, ham: () => 'không lấy', vong }
    expect(thuChuoi(mod, 'f.ts')).toEqual([
      { chuoi: 'x y', nguon: 'f.ts.default.ds.0' },
      { chuoi: 'ba bốn', nguon: 'f.ts.default.ds.1.z' },
      { chuoi: 'một hai', nguon: 'f.ts.vong.a' },
    ])
  })

  it('locChuoiMau giữ chuỗi ≥ 2 từ; bỏ chuỗi 1 từ, chuỗi không có chữ, chuỗi có trong cây, trùng', () => {
    const trongCay = tapChuoi(cayJson)
    const giu = locChuoiMau(
      [
        { chuoi: 'Cổng đặt lịch nội bộ', nguon: '1' },
        { chuoi: 'learning', nguon: '2' },
        { chuoi: 'scope-creep', nguon: '3' },
        { chuoi: '12 / 34', nguon: '4' },
        { chuoi: 'Risk Register', nguon: '5' },
        { chuoi: 'Project Management', nguon: '6' },
        { chuoi: 'Bohdan Ivakhiv (PM Hood)', nguon: '7' },
        { chuoi: ' Cổng đặt lịch nội bộ ', nguon: '8' },
      ],
      trongCay,
    )
    expect(giu).toEqual([{ chuoi: 'Cổng đặt lịch nội bộ', nguon: '1' }])
  })
})

describe('đọc đĩa', () => {
  const goc = mkdtempSync(path.join(os.tmpdir(), 'kiem-bundle-'))
  afterAll(() => rmSync(goc, { recursive: true, force: true }))
  const tao = (f: string, noiDung: string) => {
    mkdirSync(path.dirname(path.join(goc, f)), { recursive: true })
    writeFileSync(path.join(goc, f), noiDung)
  }

  it('chưa có fixtures/mau → không có chuỗi mẫu', async () => {
    expect(await napChuoiMau(goc)).toEqual([])
  })

  it('nạp module .ts và .json dưới fixtures/mau, bỏ noi-dung/ và .d.ts', async () => {
    tao('fixtures/mau/chu.ts', "export const duAn = { ten: 'Cổng đặt lịch nội bộ' }\n")
    tao('fixtures/mau/so.json', '{"ghiChu": ["một ghi chú mẫu"]}')
    tao('fixtures/mau/kieu.d.ts', 'export declare const x: string\n')
    tao('fixtures/mau/noi-dung/a/b.json', '{"x": "không đọc"}')
    expect(await napChuoiMau(goc)).toEqual([
      { chuoi: 'Cổng đặt lịch nội bộ', nguon: 'fixtures/mau/chu.ts.duAn.ten' },
      { chuoi: 'một ghi chú mẫu', nguon: 'fixtures/mau/so.json.ghiChu.0' },
    ])
  })

  it('chuoiHopLe: chuỗi của cây, JSON và literal production; không tính src/dev/, server/', () => {
    tao('docs/roadmap-tree.json', '{"parts": [{"id": "x", "label": "Tên   nút cây"}]}')
    tao('shared/cau-hinh.json', '{"a": ["Chuỗi trong JSON"]}')
    tao('shared/mau-bai.ts', "export const KHOI = ['Tóm tắt', `Vì sao ${'x'} cần`]\n")
    tao('src/Chip.tsx', 'export const C = () => <p>\n  Bản nháp ·\n  Tự viết\n</p>\n')
    tao('src/dev/Gallery.tsx', "export const g = 'Ước lượng chi phí'\n")
    tao('src/dev/mau.json', '{"x": "Chữ gallery json"}')
    tao('server/a.ts', "export const s = 'Chỉ có ở server'\n")
    const hopLe = chuoiHopLe(goc)
    for (const c of [
      'Tên nút cây',
      'Chuỗi trong JSON',
      'Tóm tắt',
      'Vì sao',
      'Bản nháp · Tự viết',
    ]) {
      expect(hopLe.has(c)).toBe(true)
    }
    for (const c of ['Ước lượng chi phí', 'Chữ gallery json', 'Chỉ có ở server']) {
      expect(hopLe.has(c)).toBe(false)
    }
    const giu = locChuoiMau(
      [
        { chuoi: 'Tóm tắt', nguon: '1' },
        { chuoi: 'Ước lượng chi phí', nguon: '2' },
      ],
      hopLe,
    )
    expect(giu.map((c) => c.nguon)).toEqual(['2'])
  })

  it('docBundle chỉ đọc file text trong dist/', () => {
    tao('dist/index.html', '<div id="root"></div>')
    tao('dist/assets/a.js', 'x')
    tao('dist/assets/a.css', 'y')
    tao('dist/assets/f.woff2', 'nhị phân')
    expect(docBundle(goc).map((f) => f.ten)).toEqual([
      'dist/assets/a.css',
      'dist/assets/a.js',
      'dist/index.html',
    ])
  })
})
