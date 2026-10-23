// Chống gõ cứng nội dung học (đề xuất mục 6, bất biến 1 ở 2.2).
// Quét mọi chuỗi, template literal, chữ JSX trong src/ (kể cả src/dev/), server/, shared/ bằng
// TypeScript compiler API. Bỏ qua chú thích. Một chuỗi vi phạm khi:
//   (a) sau khi trim, BẰNG đúng (phân biệt hoa/thường) tên một nút 1 từ;
//   (b) CHỨA, theo ranh giới từ và không phân biệt hoa/thường, tên một nút ≥ 2 từ hoặc một tên gốc;
//       các từ của tên được nối bằng bất kỳ dấu ngăn nào, nên bắt được cả xuống dòng trong JSX và slug;
//   (c) chứa một cụm trong tests/fixtures/cam-go-cung.txt (không phân biệt hoa/thường);
//   (d) chứa id một nút.
// Tên và id nút đọc từ docs/roadmap-tree.json lúc chạy. Chạy: npm run test:go-cung.

import { readFileSync, readdirSync, type Dirent } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { laLenhChinh } from './chay-truc-tiep'

export type QuyTac = 'a' | 'b' | 'c' | 'd'

export interface NutTho {
  id: string
  label: string
  labelOriginal?: string
  children?: NutTho[]
}

export interface CayTho {
  parts: NutTho[]
}

export interface Trung {
  quyTac: QuyTac
  chiTiet: string
}

export interface ViPham extends Trung {
  file: string
  dong: number
  cot: number
  chuoi: string
}

interface MauTen {
  regex: RegExp
  /** Token đầu viết thường, để lọc nhanh trước khi chạy regex */
  dau: string
  moTa: string
}

export interface DuLieuQuet {
  /** tên 1 từ (luật a) */
  ten1Tu: Set<string>
  /** tên ≥ 2 từ và mọi tên gốc (luật b) */
  mauTen: MauTen[]
  /** cụm cấm đã chuẩn hoá (luật c) */
  cumCam: { goc: string; chuan: string }[]
  /** id → tên (luật d) */
  ids: Map<string, string>
  doDaiIdNganNhat: number
  soNut: number
}

export const THU_MUC_QUET = ['src', 'server', 'shared']
const DUOI_FILE = /\.(?:[cm]?[jt]sx?)$/
const KY_TU_TU = '\\p{L}\\p{M}\\p{N}'

/** Bỏ dấu nháy đơn và ®, như quy tắc slug (đề xuất 1.3). */
function boNhay(s: string): string {
  return s.normalize('NFC').replace(/['‘’ʼ®]/g, '')
}

function chuanCum(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase()
}

const THUC_THE: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  apos: "'",
  quot: '"',
  lt: '<',
  gt: '>',
  lsquo: '‘',
  rsquo: '’',
  ndash: '–',
  mdash: '—',
}

/** Giải thực thể HTML hay gặp trong chữ JSX (vd. &nbsp;) để không lọt luật. */
export function giaiThucThe(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (toanBo: string, ma: string) => {
    if (ma[0] === '#') {
      const so = ma[1] === 'x' || ma[1] === 'X' ? parseInt(ma.slice(2), 16) : Number(ma.slice(1))
      return Number.isFinite(so) && so <= 0x10ffff ? String.fromCodePoint(so) : toanBo
    }
    return THUC_THE[ma.toLowerCase()] ?? toanBo
  })
}

/** Regex khớp dãy từ của tên, ranh giới từ Unicode, dấu ngăn tuỳ ý giữa các từ. */
function taoMauTen(ten: string, moTa: string): MauTen | null {
  // Các từ chỉ gồm chữ, dấu, số nên không cần escape khi ghép vào regex.
  const tu = boNhay(ten)
    .split(new RegExp(`[^${KY_TU_TU}]+`, 'u'))
    .filter(Boolean)
  if (tu.length === 0) return null
  const than = tu.join(`[^${KY_TU_TU}]+`)
  return {
    regex: new RegExp(`(?<![${KY_TU_TU}])${than}(?![${KY_TU_TU}])`, 'iu'),
    dau: tu[0].toLowerCase(),
    moTa,
  }
}

/** Đọc tests/fixtures/cam-go-cung.txt: mỗi dòng một cụm, bỏ dòng trống và dòng bắt đầu bằng #. */
export function docCumCam(noiDung: string): string[] {
  return noiDung
    .split(/\r?\n/)
    .map((d) => d.trim())
    .filter((d) => d !== '' && !d.startsWith('#'))
}

export function moiNut(cay: CayTho): NutTho[] {
  const ketQua: NutTho[] = []
  const di = (ds: NutTho[] | undefined) => {
    for (const n of ds ?? []) {
      ketQua.push(n)
      di(n.children)
    }
  }
  di(cay.parts)
  return ketQua
}

export function laTen1Tu(ten: string): boolean {
  return ten.trim().split(/\s+/).length === 1
}

export function taoDuLieu(cay: CayTho, cumCam: string[]): DuLieuQuet {
  const nut = moiNut(cay)
  const ten1Tu = new Set<string>()
  const mauTen = new Map<string, MauTen>()
  const ids = new Map<string, string>()
  const them = (ten: string, moTa: string) => {
    const mau = taoMauTen(ten, moTa)
    if (mau && !mauTen.has(mau.regex.source)) mauTen.set(mau.regex.source, mau)
  }
  for (const n of nut) {
    const ten = n.label.normalize('NFC').trim()
    if (laTen1Tu(ten)) ten1Tu.add(ten)
    else them(ten, `tên nút “${ten}”`)
    if (n.labelOriginal) them(n.labelOriginal, `tên gốc “${n.labelOriginal}” (của “${ten}”)`)
    ids.set(n.id, ten)
  }
  return {
    ten1Tu,
    mauTen: [...mauTen.values()],
    cumCam: cumCam.map((goc) => ({ goc, chuan: chuanCum(goc) })).filter((c) => c.chuan !== ''),
    ids,
    doDaiIdNganNhat: Math.min(...[...ids.keys()].map((id) => id.length)),
    soNut: nut.length,
  }
}

/** Kiểm một chuỗi theo 4 luật; trả mọi lần trùng. */
export function kiemChuoi(chuoiGoc: string, duLieu: DuLieuQuet): Trung[] {
  const chuoi = giaiThucThe(chuoiGoc).normalize('NFC')
  const ketQua: Trung[] = []

  const gon = chuoi.trim()
  if (duLieu.ten1Tu.has(gon)) ketQua.push({ quyTac: 'a', chiTiet: `bằng tên nút 1 từ “${gon}”` })

  const khongNhay = boNhay(chuoi)
  const thuong = khongNhay.toLowerCase()
  for (const m of duLieu.mauTen) {
    if (thuong.includes(m.dau) && m.regex.test(khongNhay)) {
      ketQua.push({ quyTac: 'b', chiTiet: `chứa ${m.moTa}` })
    }
  }

  const chuan = chuanCum(chuoi)
  for (const c of duLieu.cumCam) {
    if (chuan.includes(c.chuan)) ketQua.push({ quyTac: 'c', chiTiet: `chứa cụm cấm “${c.goc}”` })
  }

  if (chuoi.length >= duLieu.doDaiIdNganNhat) {
    for (const [id, tenNut] of duLieu.ids) {
      if (chuoi.includes(id)) ketQua.push({ quyTac: 'd', chiTiet: `chứa id “${id}” (${tenNut})` })
    }
  }
  return ketQua
}

function loaiScript(tenFile: string): ts.ScriptKind {
  if (/\.tsx$/.test(tenFile)) return ts.ScriptKind.TSX
  if (/\.jsx$/.test(tenFile)) return ts.ScriptKind.JSX
  if (/\.[cm]?js$/.test(tenFile)) return ts.ScriptKind.JS
  return ts.ScriptKind.TS
}

/** Chuỗi trong mã nguồn mà luật áp dụng; chú thích không phải node nên tự bị bỏ qua. */
function layChuoi(node: ts.Node): string | null {
  switch (node.kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
    case ts.SyntaxKind.TemplateHead:
    case ts.SyntaxKind.TemplateMiddle:
    case ts.SyntaxKind.TemplateTail:
      return (node as ts.LiteralLikeNode).text
    case ts.SyntaxKind.RegularExpressionLiteral:
      return (node as ts.RegularExpressionLiteral).text
    case ts.SyntaxKind.JsxText: {
      const jsx = node as ts.JsxText
      return jsx.containsOnlyTriviaWhiteSpaces ? null : jsx.text
    }
    default:
      return null
  }
}

export interface ChuoiMa {
  chuoi: string
  /** vị trí node, đếm từ 0 */
  viTri: number
}

/** Mọi chuỗi luật áp dụng trong một file mã nguồn, theo thứ tự trong file. */
export function cacChuoi(maNguon: string, tenFile: string): { sf: ts.SourceFile; ds: ChuoiMa[] } {
  const sf = ts.createSourceFile(
    tenFile,
    maNguon,
    ts.ScriptTarget.Latest,
    false,
    loaiScript(tenFile),
  )
  const ds: ChuoiMa[] = []
  const di = (node: ts.Node) => {
    const chuoi = layChuoi(node)
    if (chuoi !== null) ds.push({ chuoi, viTri: node.getStart(sf) })
    ts.forEachChild(node, di)
  }
  di(sf)
  return { sf, ds }
}

/** Quét một file mã nguồn; trả các vi phạm theo thứ tự trong file. */
export function quetMa(maNguon: string, tenFile: string, duLieu: DuLieuQuet): ViPham[] {
  const { sf, ds } = cacChuoi(maNguon, tenFile)
  const ketQua: ViPham[] = []
  for (const { chuoi, viTri } of ds) {
    const trung = kiemChuoi(chuoi, duLieu)
    if (trung.length === 0) continue
    const { line, character } = sf.getLineAndCharacterOfPosition(viTri)
    for (const t of trung) {
      ketQua.push({ file: tenFile, dong: line + 1, cot: character + 1, chuoi, ...t })
    }
  }
  return ketQua
}

/** Mọi file .ts/.tsx/.js… dưới src/, server/, shared/ (đường dẫn tương đối, dấu /). */
export function danhSachFile(goc: string): string[] {
  const ketQua: string[] = []
  const di = (tuongDoi: string) => {
    let muc: Dirent[]
    try {
      muc = readdirSync(path.join(goc, tuongDoi), { withFileTypes: true })
    } catch {
      return
    }
    for (const m of muc) {
      const con = `${tuongDoi}/${m.name}`
      if (m.isDirectory()) {
        if (m.name !== 'node_modules') di(con)
      } else if (m.isFile() && DUOI_FILE.test(m.name)) {
        ketQua.push(con)
      }
    }
  }
  THU_MUC_QUET.forEach(di)
  return ketQua.sort()
}

export const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const FILE_CAY = 'docs/roadmap-tree.json'
export const FILE_CUM_CAM = 'tests/fixtures/cam-go-cung.txt'

export function napDuLieu(goc: string): DuLieuQuet {
  const cay = JSON.parse(readFileSync(path.join(goc, FILE_CAY), 'utf8')) as CayTho
  const cum = docCumCam(readFileSync(path.join(goc, FILE_CUM_CAM), 'utf8'))
  return taoDuLieu(cay, cum)
}

function catNgan(s: string): string {
  const mot = s.replace(/\s+/g, ' ').trim()
  return mot.length > 100 ? `${mot.slice(0, 97)}…` : mot
}

export function chay(goc: string): number {
  const duLieu = napDuLieu(goc)
  const files = danhSachFile(goc)
  const viPham: ViPham[] = []
  for (const f of files) viPham.push(...quetMa(readFileSync(path.join(goc, f), 'utf8'), f, duLieu))

  if (viPham.length > 0) {
    for (const v of viPham) {
      console.error(
        `${v.file}:${v.dong}:${v.cot}  (${v.quyTac}) ${v.chiTiet}  «${catNgan(v.chuoi)}»`,
      )
    }
    const soFile = new Set(viPham.map((v) => v.file)).size
    console.error(`\nChống gõ cứng: ${viPham.length} vi phạm trong ${soFile} file.`)
    console.error('Lấy tên, id nút từ cây lúc chạy; chữ mẫu đặt trong fixtures/mau/.')
    return 1
  }
  console.log(
    `Chống gõ cứng: OK · ${files.length} file (${THU_MUC_QUET.join('/, ')}/) · ${duLieu.soNut} nút: ` +
      `${duLieu.ten1Tu.size} tên 1 từ, ${duLieu.mauTen.length} tên nhiều từ + tên gốc · ` +
      `${duLieu.cumCam.length} cụm cấm`,
  )
  return 0
}

if (laLenhChinh(import.meta.url)) {
  process.exitCode = chay(GOC)
}
