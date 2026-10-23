// Tỉ lệ tương phản WCAG 2.x và đọc file token CSS. Hàm thuần: gallery F01 (trình duyệt)
// và scripts/kiem-tuong-phan.ts (Node) dùng chung.

/** Màu sRGB 0–255, alpha 0–1. */
export type Mau = { r: number; g: number; b: number; a: number }

const MAU_HEX = /#([0-9a-f]{3,8})\b/i
const MAU_RGB = /rgba?\(([^)]*)\)/i

/** Đọc màu đầu tiên trong chuỗi: #rgb, #rrggbb, #rrggbbaa, rgb()/rgba() (dấu phẩy hoặc khoảng trắng). */
export function docMau(chuoi: string): Mau | null {
  const hex = MAU_HEX.exec(chuoi)
  const rgb = MAU_RGB.exec(chuoi)
  if (hex && (!rgb || hex.index < rgb.index)) {
    let h = hex[1]
    if (h.length === 3 || h.length === 4) h = [...h].map((k) => k + k).join('')
    if (h.length !== 6 && h.length !== 8) return null
    const so = (i: number) => parseInt(h.slice(i, i + 2), 16)
    return { r: so(0), g: so(2), b: so(4), a: h.length === 8 ? so(6) / 255 : 1 }
  }
  if (rgb) {
    const phan = rgb[1].split(/[\s,/]+/).filter(Boolean)
    if (phan.length < 3) return null
    const kenh = (s: string) => (s.endsWith('%') ? (parseFloat(s) * 255) / 100 : parseFloat(s))
    const a =
      phan[3] === undefined
        ? 1
        : phan[3].endsWith('%')
          ? parseFloat(phan[3]) / 100
          : parseFloat(phan[3])
    const m = { r: kenh(phan[0]), g: kenh(phan[1]), b: kenh(phan[2]), a }
    return Object.values(m).every(Number.isFinite) ? m : null
  }
  return null
}

/** Phủ màu (có alpha) lên nền. */
export function phuLen(tren: Mau, duoi: Mau): Mau {
  const a = tren.a + duoi.a * (1 - tren.a)
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }
  const tron = (x: number, y: number) => (x * tren.a + y * duoi.a * (1 - tren.a)) / a
  return { r: tron(tren.r, duoi.r), g: tron(tren.g, duoi.g), b: tron(tren.b, duoi.b), a }
}

/** Độ sáng tương đối (WCAG 2.x). */
export function doSang(m: Mau): number {
  const tuyenTinh = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * tuyenTinh(m.r) + 0.7152 * tuyenTinh(m.g) + 0.0722 * tuyenTinh(m.b)
}

/** Tỉ lệ tương phản 1–21. Chữ có alpha thì phủ lên nền trước. */
export function tiLeTuongPhan(chu: Mau, nen: Mau): number {
  const a = doSang(chu.a < 1 ? phuLen(chu, nen) : chu)
  const b = doSang(nen)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** '#57534E' (bỏ alpha). */
export function sangHex(m: Mau): string {
  const hai = (x: number) => Math.round(x).toString(16).padStart(2, '0')
  return `#${hai(m.r)}${hai(m.g)}${hai(m.b)}`.toUpperCase()
}

const dinhDang = (so: number) =>
  new Intl.NumberFormat('vi-VN', { minimumFractionDigits: so, maximumFractionDigits: so })

/** 13.266 → '13,3:1' (dấu phẩy thập phân). */
export function dinhDangTiLe(tiLe: number, soLe = 1): string {
  return `${dinhDang(soLe).format(tiLe)}:1`
}

// --- Đọc file token CSS ---

export type KhoiCss = { boChon: string; khaiBao: Record<string, string> }

/** Tách CSS thành các khối (selector lồng trong @media nối bằng dấu cách) với khai báo custom property. */
export function docKhoiCss(css: string): KhoiCss[] {
  const sach = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const ketQua: KhoiCss[] = []
  const ngan: KhoiCss[] = []
  let dem = ''
  let ngoac = 0
  const ghi = () => {
    const k = /^\s*(--[\w-]+)\s*:\s*([\s\S]*?)\s*$/.exec(dem)
    if (k && ngan.length) ngan[ngan.length - 1].khaiBao[k[1]] = k[2]
    dem = ''
  }
  for (const kt of sach) {
    if (kt === '(') ngoac++
    else if (kt === ')') ngoac--
    if (kt === '{') {
      const cha = ngan[ngan.length - 1]
      const khoi = { boChon: [cha?.boChon, dem.trim()].filter(Boolean).join(' '), khaiBao: {} }
      khoi.boChon = khoi.boChon.replace(/\s+/g, ' ').replace(/"/g, "'")
      ketQua.push(khoi)
      ngan.push(khoi)
      dem = ''
    } else if (kt === '}') {
      ghi()
      ngan.pop()
    } else if (kt === ';' && ngoac === 0) ghi()
    else dem += kt
  }
  return ketQua
}

export type BangToken = Record<string, string>
export type BaGiaoDien = { sang: BangToken; toi: BangToken; toiHeThong: BangToken }

const BO_CHON_SANG = ':root'
const BO_CHON_TOI = ":root[data-theme='dark']"
const BO_CHON_TOI_HE_THONG =
  /^@media \(prefers-color-scheme: ?dark\) :root:not\(\[data-theme='light'\]\)$/

/** Gộp các file token (theo thứ tự import) thành bảng Sáng, Tối (chọn tay) và Tối (theo hệ thống). */
export function bangGiaoDien(cacFile: string[]): BaGiaoDien {
  const khoi = cacFile.flatMap(docKhoiCss)
  const gop = (loc: (b: string) => boolean) =>
    Object.assign({}, ...khoi.filter((k) => loc(k.boChon)).map((k) => k.khaiBao)) as BangToken
  const sang = gop((b) => b === BO_CHON_SANG)
  return {
    sang,
    toi: { ...sang, ...gop((b) => b === BO_CHON_TOI) },
    toiHeThong: { ...sang, ...gop((b) => BO_CHON_TOI_HE_THONG.test(b)) },
  }
}

/** Giá trị token, đã thay var(--x) (có giá trị dự phòng). */
export function giaTriToken(bang: BangToken, ten: string, sau = 0): string | undefined {
  const v = bang[ten]
  if (v === undefined || sau > 10) return undefined
  return v.replace(/var\((--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (_, ten2: string, duPhong?: string) => {
    return giaTriToken(bang, ten2, sau + 1) ?? duPhong ?? ''
  })
}
