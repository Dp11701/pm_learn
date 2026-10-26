// Tương phản token §5.1 ở Sáng và Tối, đọc thẳng src/styles/tokens.css + tokens-them.css.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  bangGiaoDien,
  docKhoiCss,
  docMau,
  giaTriToken,
  phuLen,
  sangHex,
  tiLeTuongPhan,
  dinhDangTiLe,
} from '../../src/dev/thanh-phan/tuong-phan'
import {
  CAP_TUONG_PHAN,
  CHU_AA,
  FILE_TOKEN,
  MIEN_KIEM,
  SAI_SO,
  UI_AA,
  docFileToken,
  kiemTuongPhan,
  nguongDat,
  tokenMauChuaXet,
  tokenMauCuaFile,
} from '../../scripts/kiem-tuong-phan'

const mau = (s: string) => {
  const m = docMau(s)
  if (!m) throw new Error(`không đọc được màu ${s}`)
  return m
}

describe('đọc màu', () => {
  it('hex 3, 6, 8 chữ số, không phân biệt hoa thường', () => {
    expect(docMau('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(docMau('#0F172A')).toEqual({ r: 15, g: 23, b: 42, a: 1 })
    expect(docMau('#0f172a')).toEqual(docMau('#0F172A'))
    expect(docMau('#00000080')?.a).toBeCloseTo(128 / 255)
  })

  it('rgb()/rgba() dạng phẩy và dạng khoảng trắng', () => {
    expect(docMau('rgba(87,83,78,.2)')).toEqual({ r: 87, g: 83, b: 78, a: 0.2 })
    expect(docMau('rgb(0 0 0 / 50%)')).toEqual({ r: 0, g: 0, b: 0, a: 0.5 })
  })

  it('lấy màu đầu tiên trong gradient; không có màu thì null', () => {
    const soc = 'repeating-linear-gradient(45deg, rgba(214,211,209,.2) 0 2px, transparent 2px 8px)'
    expect(docMau(soc)).toEqual({ r: 214, g: 211, b: 209, a: 0.2 })
    expect(docMau('none')).toBeNull()
  })

  it('sangHex in hoa, bỏ alpha', () => {
    expect(sangHex(mau('rgba(87,83,78,.2)'))).toBe('#57534E')
  })
})

describe('tỉ lệ tương phản WCAG', () => {
  it('đen / trắng = 21, cùng màu = 1', () => {
    expect(tiLeTuongPhan(mau('#000'), mau('#fff'))).toBeCloseTo(21, 5)
    expect(tiLeTuongPhan(mau('#fff'), mau('#000'))).toBeCloseTo(21, 5)
    expect(tiLeTuongPhan(mau('#475569'), mau('#475569'))).toBe(1)
  })

  it('#777 trên trắng ≈ 4,48 (dưới AA)', () => {
    expect(tiLeTuongPhan(mau('#777777'), mau('#ffffff'))).toBeCloseTo(4.48, 2)
  })

  it('màu có alpha được phủ lên nền trước', () => {
    expect(phuLen(mau('rgba(0,0,0,.5)'), mau('#fff'))).toEqual({
      r: 127.5,
      g: 127.5,
      b: 127.5,
      a: 1,
    })
    expect(tiLeTuongPhan(mau('rgba(0,0,0,.5)'), mau('#fff'))).toBeCloseTo(
      tiLeTuongPhan(mau('rgb(127.5,127.5,127.5)'), mau('#fff')),
    )
  })

  it('định dạng kiểu Việt Nam', () => {
    expect(dinhDangTiLe(13.266)).toBe('13,3:1')
    expect(dinhDangTiLe(3.957, 2)).toBe('3,96:1')
  })
})

describe('đọc file token', () => {
  it('tách khối lồng trong @media, bỏ chú thích, thay var()', () => {
    const css = `/* x { --a: 1 } */
      :root { --a: #fff; --b: var(--a); --c: var(--khong, #000) }
      :root[data-theme="dark"] { --a: #111 }
      @media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { --a: #111; } }`
    expect(docKhoiCss(css).map((k) => k.boChon)).toEqual([
      ':root',
      ":root[data-theme='dark']",
      '@media (prefers-color-scheme: dark)',
      "@media (prefers-color-scheme: dark) :root:not([data-theme='light'])",
    ])
    const ba = bangGiaoDien([css])
    expect(giaTriToken(ba.sang, '--b')).toBe('#fff')
    expect(giaTriToken(ba.toi, '--b')).toBe('#111')
    expect(giaTriToken(ba.sang, '--c')).toBe('#000')
    expect(ba.toiHeThong).toEqual(ba.toi)
  })

  const cacFile = docFileToken()
  const ba = bangGiaoDien(cacFile)

  it('Tối theo hệ thống giống hệt Tối chọn tay (từng file)', () => {
    for (const f of cacFile) {
      const b = bangGiaoDien([f])
      expect(b.toiHeThong).toEqual(b.toi)
    }
  })

  it('mỗi token màu của tokens-them.css có giá trị Tối riêng', () => {
    const them = docKhoiCss(cacFile[1])
    const sang = Object.assign(
      {},
      ...them.filter((k) => k.boChon === ':root').map((k) => k.khaiBao),
    )
    const toi = bangGiaoDien([cacFile[1]]).toi
    for (const [ten, v] of Object.entries<string>(sang)) {
      if (docMau(v)) expect(toi[ten], ten).not.toBe(v)
    }
  })

  it('cổng đọc đúng mọi file token app.css import; src/styles không có file token nào khác', () => {
    const goc = join(import.meta.dirname, '../..')
    const app = readFileSync(join(goc, 'src/styles/app.css'), 'utf8')
    const daImport = [...app.matchAll(/@import '\.\/([^']+\.css)'/g)].map(
      (m) => `src/styles/${m[1]}`,
    )
    expect(daImport).toEqual(FILE_TOKEN)
    const trongThuMuc = readdirSync(join(goc, 'src/styles'))
      .filter((f) => f.endsWith('.css') && f !== 'app.css')
      .map((f) => `src/styles/${f}`)
      .sort()
    expect(trongThuMuc).toEqual([...FILE_TOKEN].sort())
  })

  it('đã gộp token phase 1 (trạng thái, khung, phím tắt) vào tokens-them.css', () => {
    for (const ten of [
      '--st-learning-ic',
      '--st-done-vien',
      '--noi-dung-nhap',
      '--drawer-w',
      '--badge-h',
      '--phim-tat-nen',
      '--tim-kiem-chon',
    ])
      expect(giaTriToken(ba.sang, ten), ten).toBeDefined()
  })

  it('mọi token màu của tokens-them.css có cặp tương phản hoặc lý do miễn', () => {
    expect(tokenMauChuaXet(cacFile)).toEqual([])
    const mau = tokenMauCuaFile(cacFile[1], ba)
    // Đủ token màu phase 1 (alias var() cũng tính): danh sách không rỗng do đọc sai file.
    expect(mau).toEqual(
      expect.arrayContaining(['--st-learning-ic', '--st-none-ic', '--tim-kiem-chon']),
    )
    // Lý do miễn chỉ cho token màu có thật, không trùng token đã có cặp.
    const coCap = new Set(CAP_TUONG_PHAN.flatMap((c) => [c.chu, c.nen]))
    for (const ten of Object.keys(MIEN_KIEM)) {
      expect(mau, ten).toContain(ten)
      expect(coCap.has(ten), ten).toBe(false)
    }
  })

  it('token màu mới chưa xét thì cổng báo', () => {
    const them = `${cacFile[1]}\n:root { --mau-moi: #123456 }\n:root[data-theme='dark'] { --mau-moi: #654321 }`
    expect(tokenMauChuaXet([cacFile[0], them])).toEqual(['--mau-moi'])
  })

  it('đọc được màu của mọi token trong danh sách cặp', () => {
    for (const c of CAP_TUONG_PHAN) {
      for (const ten of [c.chu, c.nen]) {
        expect(docMau(giaTriToken(ba.sang, ten) ?? ''), ten).not.toBeNull()
        expect(docMau(giaTriToken(ba.toi, ten) ?? ''), ten).not.toBeNull()
      }
    }
  })
})

describe('tương phản theo §5.1 (cho phép thấp hơn số làm tròn 0,1)', () => {
  const ketQua = kiemTuongPhan(bangGiaoDien(docFileToken()))

  it('kiểm đủ mọi cặp ở cả hai giao diện, ngưỡng không dưới AA', () => {
    expect(ketQua).toHaveLength(CAP_TUONG_PHAN.length * 2)
    for (const c of CAP_TUONG_PHAN) for (const t of c.toiThieu) expect(t).toBeGreaterThanOrEqual(3)
  })

  it('ngưỡng AA là sàn cứng; chỉ số §5.1 làm tròn mới được trừ sai số', () => {
    expect(nguongDat(CHU_AA)).toBe(4.5)
    expect(nguongDat(UI_AA)).toBe(3)
    expect(nguongDat(7.2)).toBeCloseTo(7.2 - SAI_SO)
    const [k] = kiemTuongPhan(
      bangGiaoDien([
        ':root { --c: #777777; --n: #ffffff } :root[data-theme="dark"] { --c: #777777 }',
      ]),
      [{ ten: 'x', chu: '--c', nen: '--n', toiThieu: [CHU_AA, CHU_AA] }],
    )
    expect(k.tiLe).toBeGreaterThan(CHU_AA - SAI_SO)
    expect(k.dat).toBe(false)
  })

  it.each(ketQua.map((k) => [k.giaoDien, k.ten, k] as const))('%s · %s', (_g, _t, k) => {
    expect(k.tiLe).toBeGreaterThanOrEqual(nguongDat(k.toiThieu))
    expect(k.dat).toBe(true)
  })
})
