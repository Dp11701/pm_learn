import {
  Document,
  LineCounter,
  isMap,
  isScalar,
  isSeq,
  parseDocument,
  type Node,
  type Pair,
  type YAMLMap,
} from 'yaml'

// Sửa frontmatter của file nội dung (đề xuất 1.6 "Frontmatter ghi bằng yaml.parseDocument"): dùng vị trí node
// của yaml.parseDocument để thay đúng đoạn chữ của khoá cần đổi — thứ tự khoá, chú thích, khoá lạ, cách viết
// của các khoá khác giữ nguyên từng ký tự; thân bài sau dòng --- đóng giữ nguyên TỪNG BYTE. Kết quả được đọc
// lại để kiểm; không khớp thì dựng lại bằng Document.toString (schema failsafe: giá trị giữ nguyên chữ).

export type GiaTriFrontmatter = string | readonly string[]

export interface SuaFrontmatter {
  /** Đặt giá trị (khoá chưa có thì thêm; `id` thêm lên đầu, khoá khác thêm cuối) */
  dat?: Readonly<Record<string, GiaTriFrontmatter>>
  /** Xoá khoá (không có thì thôi) */
  xoa?: readonly string[]
}

export class LoiSuaFrontmatter extends Error {}

interface TachFile {
  /** Dòng --- mở (kể cả BOM, xuống dòng) */
  mo: string
  yaml: string
  /** Dòng --- / ... đóng kèm xuống dòng của nó (không có nếu là dòng cuối của file) */
  dong: string
  than: string
}

/** Tách file thành dòng mở, YAML, dòng đóng, thân bài — đúng quy tắc của docFrontmatter. */
function tachFile(text: string): TachFile | null {
  const moMau = /^(\uFEFF?---[ \t]*)(\r?\n)/.exec(text)
  if (!moMau) return null
  const mo = moMau[0]
  const dongRe = /^(---|\.\.\.)[ \t]*(\r?\n|$)/gm
  dongRe.lastIndex = mo.length
  const m = dongRe.exec(text)
  if (!m) return null
  return {
    mo,
    yaml: text.slice(mo.length, m.index),
    dong: m[0],
    than: text.slice(m.index + m[0].length),
  }
}

function chuGiaTri(giaTri: GiaTriFrontmatter): string {
  const doc = new Document(typeof giaTri === 'string' ? giaTri : [...giaTri])
  if (isSeq(doc.contents)) doc.contents.flow = true
  return doc.toString({ lineWidth: 0, flowCollectionPadding: false }).replace(/\n$/, '')
}

function giaTriDoc(node: unknown): unknown {
  if (node === null || node === undefined) return null
  if (isScalar(node)) return node.value === null ? null : String(node.value)
  if (isSeq(node)) return node.items.map((x) => giaTriDoc(x))
  return Symbol('khac')
}

function batDauDong(s: string, viTri: number): number {
  return s.lastIndexOf('\n', viTri - 1) + 1
}

function cuoiDong(s: string, viTri: number): number {
  const i = s.indexOf('\n', viTri)
  return i < 0 ? s.length : i + 1
}

/** Sửa bằng cách cắt dán theo vị trí node; null nếu không làm được (để dựng lại). */
function suaTaiCho(yaml: string, sua: SuaFrontmatter): string | null {
  const doc = parseDocument(yaml, { lineCounter: new LineCounter(), schema: 'failsafe' })
  if (doc.errors.length > 0) return null
  const goc = doc.contents
  if (goc !== null && (!isMap(goc) || goc.flow)) return null
  const cap = (goc?.items ?? []) as Pair<Node, Node | null>[]
  type Cat = { tu: number; den: number; chu: string }
  const cat: Cat[] = []
  const xuongDong = yaml.includes('\r\n') ? '\r\n' : '\n'
  const timCap = (khoa: string) =>
    cap.find((c) => isScalar(c.key) && String(c.key.value) === khoa && c.key.range)

  for (const khoa of sua.xoa ?? []) {
    const c = timCap(khoa)
    if (!c?.key.range) continue
    const cuoi = c.value?.range?.[2] ?? c.key.range[2]
    cat.push({ tu: batDauDong(yaml, c.key.range[0]), den: cuoiDong(yaml, cuoi - 1), chu: '' })
  }
  const themDau: string[] = []
  const themCuoi: string[] = []
  for (const [khoa, giaTri] of Object.entries(sua.dat ?? {})) {
    const c = timCap(khoa)
    const chu = chuGiaTri(giaTri)
    if (!c?.key.range) {
      const dong = `${chuGiaTri(khoa)}: ${chu}`
      if (khoa === 'id') themDau.push(dong)
      else themCuoi.push(dong)
      continue
    }
    const keyEnd = c.key.range[1]
    if (c.value?.range) {
      // Giá trị khối (danh sách nhiều dòng…) kết thúc bằng xuống dòng: giữ xuống dòng đó
      const doan = yaml.slice(keyEnd, c.value.range[1])
      const cuoi = /(\r?\n)[ \t]*$/.exec(doan)?.[1] ?? ''
      cat.push({ tu: keyEnd, den: c.value.range[1], chu: `: ${chu}${cuoi}` })
    } else {
      const haiCham = yaml.indexOf(':', keyEnd)
      if (haiCham < 0) return null
      cat.push({ tu: keyEnd, den: haiCham + 1, chu: `: ${chu}` })
    }
  }
  cat.sort((a, b) => b.tu - a.tu)
  for (let i = 1; i < cat.length; i++) if (cat[i].den > cat[i - 1].tu) return null
  let kq = yaml
  for (const c of cat) kq = kq.slice(0, c.tu) + c.chu + kq.slice(c.den)
  if (themDau.length > 0) {
    // Trước cặp khoá đầu tiên (sau chú thích đầu file)
    const dau = goc && cap[0]?.key?.range ? batDauDong(yaml, cap[0].key.range[0]) : kq.length
    const viTri = Math.min(dau, kq.length)
    const truoc = viTri === 0 || kq[viTri - 1] === '\n' ? '' : xuongDong
    kq = kq.slice(0, viTri) + truoc + themDau.map((d) => d + xuongDong).join('') + kq.slice(viTri)
  }
  if (themCuoi.length > 0) {
    const truoc = kq === '' || kq.endsWith('\n') ? '' : xuongDong
    kq += truoc + themCuoi.map((d) => d + xuongDong).join('')
  }
  return kq
}

/** Dựng lại bằng Document (failsafe giữ nguyên chữ của giá trị, chú thích, thứ tự khoá). */
function dungLai(yaml: string, sua: SuaFrontmatter): string {
  const doc: Document = parseDocument(yaml, { schema: 'failsafe' })
  if (doc.errors.length > 0) throw new LoiSuaFrontmatter('frontmatter không đọc được (lỗi YAML)')
  if (doc.contents === null) doc.contents = doc.createNode({})
  if (!isMap(doc.contents)) throw new LoiSuaFrontmatter('frontmatter không phải bảng khoá: giá trị')
  for (const khoa of sua.xoa ?? []) doc.delete(khoa)
  for (const [khoa, giaTri] of Object.entries(sua.dat ?? {})) {
    const nut = doc.createNode(typeof giaTri === 'string' ? giaTri : [...giaTri])
    if (isSeq(nut)) nut.flow = true
    if (khoa === 'id' && !doc.has('id')) {
      const map = doc.contents as YAMLMap
      map.items.unshift(doc.createPair(khoa, nut) as Pair<unknown, unknown>)
    } else doc.set(khoa, nut)
  }
  return doc.toString({ lineWidth: 0, flowCollectionPadding: false })
}

function kiemKetQua(yaml: string, sua: SuaFrontmatter): boolean {
  const doc = parseDocument(yaml, { schema: 'failsafe', uniqueKeys: true })
  if (doc.errors.length > 0) return false
  const goc = doc.contents
  if (goc !== null && !isMap(goc)) return false
  for (const khoa of sua.xoa ?? []) if (doc.has(khoa)) return false
  for (const [khoa, giaTri] of Object.entries(sua.dat ?? {})) {
    const coLa = giaTriDoc(doc.get(khoa, true))
    if (
      JSON.stringify(coLa) !== JSON.stringify(typeof giaTri === 'string' ? giaTri : [...giaTri])
    ) {
      return false
    }
  }
  return true
}

/**
 * Sửa frontmatter của toàn văn file, thân bài giữ nguyên từng byte.
 * @throws LoiSuaFrontmatter khi file không có frontmatter hoặc YAML hỏng
 */
export function suaFrontmatter(text: string, sua: SuaFrontmatter): string {
  const tach = tachFile(text)
  if (!tach) throw new LoiSuaFrontmatter('file không có frontmatter (--- … ---)')
  let yaml = suaTaiCho(tach.yaml, sua)
  if (yaml === null || !kiemKetQua(yaml, sua)) {
    yaml = dungLai(tach.yaml, sua)
    if (!kiemKetQua(yaml, sua)) throw new LoiSuaFrontmatter('không sửa được frontmatter')
  }
  const xuongDong = tach.mo.endsWith('\r\n') ? '\r\n' : '\n'
  const noi = yaml === '' || yaml.endsWith('\n') ? '' : xuongDong
  return tach.mo + yaml + noi + tach.dong + tach.than
}

/**
 * File nhập vào (đề xuất 1.6, 3.6, 3.8): ép `trang_thai_noi_dung: ban-nhap` (bỏ `ngay_duyet`), thêm `id` khi
 * thiếu. Thân bài giữ nguyên từng byte. File đã đúng thì trả nguyên văn.
 */
export function epBanNhap(text: string, itemId: string, coId: boolean): string {
  const sua: SuaFrontmatter = { dat: { trang_thai_noi_dung: 'ban-nhap' }, xoa: ['ngay_duyet'] }
  if (!coId) sua.dat = { id: itemId, ...sua.dat }
  return suaFrontmatter(text, sua)
}
