// Dựng artboard Claude Design (docs/design-handoff/design/*.dc.html) thành HTML tĩnh trong .frame/
// để so với trang thật ở /_dev/frame/:ma (đề xuất mục 6 "Đối chiếu hình ảnh").
//   npm run frame -- F11 F02b      dựng vài frame (mã, tên file hoặc tên file bỏ .dc.html)
//   npm run frame -- --tat-ca      dựng mọi frame trong canvas.json
// Hỗ trợ: {{đường.dẫn}} (và biểu thức JS đơn giản), <sc-for list as>, <sc-if value>, <dc-import name …>,
// <helmet>. Chỗ không dựng được thì ghi vào danh sách "thiếu", không bịa.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { laLenhChinh } from './chay-truc-tiep'

// ---------- Danh sách frame (canvas.json) ----------

export interface Frame {
  /** Mã duy nhất: F11, F02b, C34…; frame trùng mã (bản Tối) dùng tên file, vd. F01-toi. */
  ma: string
  tep: string
  tieuDe: string
  rong: number
  cao: number
}

interface Bang {
  w: number
  h: number
  title: string
}

export interface Canvas {
  boards: Record<string, Bang>
  order?: string[]
}

const DUOI = '.dc.html'
const RE_MA = /^([A-Z]\d+[a-z]?)(?=-|$)/
// Tên file thiết kế hợp lệ: chặn tên lạ trong canvas.json / <dc-import> đi ra ngoài thư mục.
const RE_TEN_TEP = /^[A-Za-z0-9_-]+$/
const RE_MA_TIEU_DE = /^([A-Z]\d+[a-z]?)\b/

/** Frame theo thứ tự canvas. Mã lấy từ tên file, không có thì từ đầu tiêu đề (Main → F01). */
export function dsFrame(canvas: Canvas): Frame[] {
  const thuTu = canvas.order ?? Object.keys(canvas.boards)
  const daDung = new Set<string>()
  const ds: Frame[] = []
  for (const tep of thuTu) {
    const b = canvas.boards[tep]
    if (!b || !tep.endsWith(DUOI)) continue
    const goc = tep.slice(0, -DUOI.length)
    if (!RE_TEN_TEP.test(goc)) continue
    const ma = RE_MA.exec(goc)?.[1] ?? RE_MA_TIEU_DE.exec(b.title)?.[1] ?? goc
    const maDung = daDung.has(ma.toLowerCase()) ? goc : ma
    daDung.add(maDung.toLowerCase())
    ds.push({ ma: maDung, tep, tieuDe: b.title, rong: b.w, cao: b.h })
  }
  return ds
}

/** Tìm frame theo mã, tên file có hoặc không có đuôi .dc.html (không phân biệt hoa thường). */
export function timFrame(ds: Frame[], khoa: string): Frame | undefined {
  const k = khoa
    .trim()
    .toLowerCase()
    .replace(/\.dc\.html$/, '')
  return (
    ds.find((f) => f.ma.toLowerCase() === k) ??
    ds.find((f) => f.tep.toLowerCase().slice(0, -DUOI.length) === k)
  )
}

// ---------- Phân tích markup ----------

interface VanBan {
  loai: 'chu'
  noiDung: string
}
interface Tho {
  loai: 'tho'
  noiDung: string
}
interface ThuocTinh {
  ten: string
  giaTri: string | null
  nhay: string
}
interface PhanTu {
  loai: 'the'
  ten: string
  thuocTinh: ThuocTinh[]
  con: Nut[]
  tuDong: boolean
}
type Nut = VanBan | Tho | PhanTu

const THE_RONG = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
])
const THE_THO = new Set(['script', 'style', 'textarea', 'title'])

const RE_MO = /<([A-Za-z][\w:.-]*)/y
const RE_DONG = /<\/([A-Za-z][\w:.-]*)\s*>/y
const RE_THUOC_TINH = /\s*([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/y
const RE_HET_THE = /\s*(\/?)>/y

/** Tách markup thành cây. Không theo luật sửa lỗi của HTML (để <sc-for> trong <tr> giữ nguyên chỗ). */
function phanTich(html: string, baoThieu: (s: string) => void): Nut[] {
  const goc: PhanTu = { loai: 'the', ten: '#goc', thuocTinh: [], con: [], tuDong: false }
  const ngan: PhanTu[] = [goc]
  const dinh = () => ngan[ngan.length - 1] ?? goc
  const themChu = (s: string) => {
    if (s) dinh().con.push({ loai: 'chu', noiDung: s })
  }
  let i = 0
  while (i < html.length) {
    const lt = html.indexOf('<', i)
    if (lt === -1) {
      themChu(html.slice(i))
      break
    }
    themChu(html.slice(i, lt))
    i = lt
    if (html.startsWith('<!--', i)) {
      const het = html.indexOf('-->', i + 4)
      const cuoi = het === -1 ? html.length : het + 3
      dinh().con.push({ loai: 'tho', noiDung: html.slice(i, cuoi) })
      i = cuoi
      continue
    }
    if (html.startsWith('<!', i) || html.startsWith('<?', i)) {
      const het = html.indexOf('>', i)
      const cuoi = het === -1 ? html.length : het + 1
      dinh().con.push({ loai: 'tho', noiDung: html.slice(i, cuoi) })
      i = cuoi
      continue
    }
    RE_DONG.lastIndex = i
    const dong = RE_DONG.exec(html)
    if (dong) {
      const ten = (dong[1] ?? '').toLowerCase()
      const viTri = ngan.findLastIndex((pt) => pt.ten.toLowerCase() === ten)
      if (viTri > 0) ngan.length = viTri
      else baoThieu(`Thẻ đóng </${ten}> không có thẻ mở`)
      i = RE_DONG.lastIndex
      continue
    }
    RE_MO.lastIndex = i
    const mo = RE_MO.exec(html)
    if (!mo) {
      themChu('<')
      i += 1
      continue
    }
    const ten = mo[1] ?? ''
    const thuocTinh: ThuocTinh[] = []
    let j = RE_MO.lastIndex
    let tuDong = false
    for (;;) {
      RE_HET_THE.lastIndex = j
      const het = RE_HET_THE.exec(html)
      if (het) {
        tuDong = het[1] === '/'
        j = RE_HET_THE.lastIndex
        break
      }
      RE_THUOC_TINH.lastIndex = j
      const tt = RE_THUOC_TINH.exec(html)
      if (!tt || RE_THUOC_TINH.lastIndex === j) {
        if (j >= html.length) break
        j += 1
        continue
      }
      const [, tenTT = '', kep, don, tron] = tt
      thuocTinh.push({
        ten: tenTT,
        giaTri: kep ?? don ?? tron ?? null,
        nhay: kep !== undefined ? '"' : don !== undefined ? "'" : '',
      })
      j = RE_THUOC_TINH.lastIndex
    }
    const pt: PhanTu = { loai: 'the', ten, thuocTinh, con: [], tuDong }
    dinh().con.push(pt)
    const tenThuong = ten.toLowerCase()
    if (tuDong || THE_RONG.has(tenThuong)) {
      i = j
    } else if (THE_THO.has(tenThuong)) {
      const reDong = new RegExp(`</${tenThuong}\\s*>`, 'gi')
      reDong.lastIndex = j
      const k = reDong.exec(html)
      const cuoi = k ? k.index : html.length
      if (cuoi > j) pt.con.push({ loai: 'chu', noiDung: html.slice(j, cuoi) })
      i = k ? reDong.lastIndex : html.length
    } else {
      ngan.push(pt)
      i = j
    }
  }
  return goc.con
}

function timThe(ds: Nut[], dk: (pt: PhanTu) => boolean): PhanTu | undefined {
  for (const n of ds) {
    if (n.loai !== 'the') continue
    if (dk(n)) return n
    const con = timThe(n.con, dk)
    if (con) return con
  }
  return undefined
}

function layThuocTinh(pt: PhanTu, ten: string): ThuocTinh | undefined {
  return pt.thuocTinh.find((t) => t.ten.toLowerCase() === ten)
}

function vanBanCua(pt: PhanTu): string {
  return pt.con.map((n) => (n.loai === 'the' ? vanBanCua(n) : n.noiDung)).join('')
}

// ---------- Thoát / giải mã ----------

const escChu = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escThuocTinh = (s: string) => escChu(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function giaiMa(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, m: string) => {
    const k = m.toLowerCase()
    if (k.startsWith('#x')) return String.fromCodePoint(parseInt(k.slice(2), 16))
    if (k.startsWith('#')) return String.fromCodePoint(parseInt(k.slice(1), 10))
    const bang: Record<string, string> = {
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'",
      nbsp: '\u00a0',
    }
    return bang[k] ?? `&${m};`
  })
}

// ---------- Thành phần (một file .dc.html) ----------

type PhamVi = Record<string, unknown>

interface BanDich {
  xdc: Nut[]
  macDinh: PhamVi
  ngCanh: vm.Context | null
}

// Lớp nền tối thiểu thay cho support.js.
const DC_LOGIC = `class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {} }
  setState(s) { Object.assign(this.state, s) }
  renderVals() { return {} }
}`

const HET_GIO = 2000

// Mã trong file thiết kế là dữ liệu tải về, không tin cậy. Chạy trong vm cô lập: global nguyên
// mẫu null (không có đối tượng nào của tiến trình chính để lần ra `process`), cấm sinh mã từ chuỗi,
// microtask cũng chịu giới hạn thời gian; dữ liệu vào và ra chỉ đi qua chuỗi JSON.
function taoNgCanh(): vm.Context {
  return vm.createContext(Object.create(null) as object, {
    codeGeneration: { strings: false, wasm: false },
    microtaskMode: 'afterEvaluate',
  })
}

/** Chuỗi JSON của `v` viết thành literal JS để nhúng vào mã chạy trong vm. */
const literalJson = (v: unknown) => JSON.stringify(JSON.stringify(v ?? null))

/** Chạy thân hàm `ma` trong ngữ cảnh, nhận kết quả qua JSON (không mang đối tượng vm ra ngoài). */
function chayTrongNgCanh(ma: string, ngCanh: vm.Context, hetGio = HET_GIO): unknown {
  const ra: unknown = vm.runInContext(
    `JSON.stringify((function () { ${ma}\n})() ?? null)`,
    ngCanh,
    { timeout: hetGio },
  )
  return typeof ra === 'string' ? (JSON.parse(ra) as unknown) : undefined
}

function dich(ten: string, nguon: string, baoThieu: (s: string) => void): BanDich {
  const cay = phanTich(nguon, baoThieu)
  const xdc = timThe(cay, (pt) => pt.ten.toLowerCase() === 'x-dc')
  if (!xdc) baoThieu('Không có <x-dc>')
  const script = timThe(
    cay,
    (pt) => pt.ten.toLowerCase() === 'script' && layThuocTinh(pt, 'type')?.giaTri === 'text/x-dc',
  )
  const macDinh: PhamVi = {}
  const props = script && layThuocTinh(script, 'data-props')?.giaTri
  if (props) {
    try {
      const khai = JSON.parse(giaiMa(props)) as Record<string, unknown>
      for (const [k, v] of Object.entries(khai)) {
        if (k === '$preview') macDinh[k] = v
        else if (v && typeof v === 'object' && 'default' in v) macDinh[k] = v.default
      }
    } catch (e) {
      baoThieu(`data-props không đọc được: ${(e as Error).message}`)
    }
  }
  let ngCanh: vm.Context | null = null
  const ma = script ? vanBanCua(script) : ''
  if (ma.trim()) {
    try {
      ngCanh = taoNgCanh()
      vm.runInContext(`${DC_LOGIC}\n${ma}\n;globalThis.__Lop = Component;undefined`, ngCanh, {
        filename: `${ten}${DUOI}`,
        timeout: HET_GIO,
      })
    } catch (e) {
      baoThieu(`Script lỗi: ${(e as Error).message}`)
      ngCanh = null
    }
  }
  return { xdc: xdc?.con ?? [], macDinh, ngCanh }
}

function chayRenderVals(bd: BanDich, props: PhamVi, baoThieu: (s: string) => void): PhamVi {
  if (!bd.ngCanh) return {}
  try {
    const kq = chayTrongNgCanh(
      `return new __Lop(JSON.parse(${literalJson(props)})).renderVals()`,
      bd.ngCanh,
    )
    return kq && typeof kq === 'object' ? (kq as PhamVi) : {}
  } catch (e) {
    baoThieu(`renderVals() lỗi: ${(e as Error).message}`)
    return {}
  }
}

// ---------- Tính {{biểu thức}} ----------

const RE_LO = /\{\{\s*([\s\S]+?)\s*\}\}/g
const RE_CA_LO = /^\{\{\s*([^{}]+?)\s*\}\}$/
const RE_DUONG = /^[A-Za-z_$][\w$]*(?:\.[\w$]+)*$/
const RE_HANG = /^(?:true|false|null|-?\d+(?:\.\d+)?)$/
const RE_TEN_BIEN = /^[A-Za-z_$][\w$]*$/
const THE_BO = new Set(['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'base'])
const THUOC_TINH_URL = new Set(['href', 'src', 'action', 'formaction', 'xlink:href', 'poster'])

function laUrlNguyHiem(tenThuocTinh: string, giaTri: string): boolean {
  if (!THUOC_TINH_URL.has(tenThuocTinh)) return false
  // eslint-disable-next-line no-control-regex
  const url = giaTri.replace(/[\u0000- ]/g, '').toLowerCase()
  return (
    url.startsWith('javascript:') || url.startsWith('vbscript:') || url.startsWith('data:text/html')
  )
}
const THUOC_TINH_BOOL = new Set([
  'checked',
  'disabled',
  'selected',
  'hidden',
  'open',
  'readonly',
  'required',
  'multiple',
  'autofocus',
])

function tinh(bt: string, pv: PhamVi, baoThieu: (s: string) => void): unknown {
  if (RE_DUONG.test(bt)) {
    const [dau = '', ...sau] = bt.split('.')
    if (dau in pv) {
      let v: unknown = pv[dau]
      for (const k of sau) {
        if (v === null || v === undefined) return undefined
        v = (v as PhamVi)[k]
      }
      return v
    }
  }
  if (RE_HANG.test(bt)) return JSON.parse(bt) as unknown
  // Biểu thức khác: chạy trong vm cô lập, biến của phạm vi hiện tại truyền vào qua JSON.
  try {
    const bien: PhamVi = {}
    for (const k in pv) if (RE_TEN_BIEN.test(k)) bien[k] = pv[k]
    return chayTrongNgCanh(
      `Object.assign(globalThis, JSON.parse(${literalJson(bien)}));\nreturn (${bt})`,
      taoNgCanh(),
      200,
    )
  } catch (e) {
    baoThieu(`Không tính được {{${bt}}}: ${(e as Error).message}`)
    return undefined
  }
}

function thanhChuoi(v: unknown, bt: string, baoThieu: (s: string) => void): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v)
  baoThieu(`{{${bt}}} là ${Array.isArray(v) ? 'mảng' : 'đối tượng'}, không chèn được vào chữ`)
  return ''
}

function chen(
  s: string,
  pv: PhamVi,
  thoat: (s: string) => string,
  baoThieu: (s: string) => void,
): string {
  return s.replace(RE_LO, (_, bt: string) =>
    thoat(thanhChuoi(tinh(bt, pv, baoThieu), bt, baoThieu)),
  )
}

/** Giá trị của thuộc tính: nguyên một {{lỗ}} thì giữ kiểu, còn lại là chuỗi đã chèn. */
function giaTri(tt: ThuocTinh | undefined, pv: PhamVi, baoThieu: (s: string) => void): unknown {
  if (!tt) return undefined
  if (tt.giaTri === null) return true
  const ca = RE_CA_LO.exec(tt.giaTri)
  if (ca) return tinh(ca[1] ?? '', pv, baoThieu)
  return chen(giaiMa(tt.giaTri), pv, (x) => x, baoThieu)
}

const kebabSangCamel = (s: string) => s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())

// ---------- Dựng ----------

export interface KetQuaDung {
  /** Markup thân trang (nội dung <x-dc> đã dựng, không có <helmet>). */
  than: string
  /** Nội dung <helmet> của frame và mọi thành phần nhúng, bỏ trùng, theo thứ tự gặp. */
  helmet: string[]
  /** Chỗ chưa dựng được, mỗi dòng có tên file nguồn. */
  thieu: string[]
}

export type DocNguon = (ten: string) => string | undefined

const SAU_TOI_DA = 12

/** Dựng thành phần `ten` (tên file bỏ .dc.html) với props; `docNguon` trả mã nguồn theo tên. */
export function dungThanhPhan(ten: string, props: PhamVi, docNguon: DocNguon): KetQuaDung {
  const thieu = new Set<string>()
  const helmet: string[] = []
  const banDich = new Map<string, BanDich | null>()

  function lay(tenTP: string, bao: (s: string) => void): BanDich | null {
    if (!banDich.has(tenTP)) {
      const nguon = docNguon(tenTP)
      banDich.set(tenTP, nguon === undefined ? null : dich(tenTP, nguon, bao))
    }
    return banDich.get(tenTP) ?? null
  }

  function dung(tenTP: string, propsTP: PhamVi, sau: number): string {
    const bao = (s: string) => thieu.add(`[${tenTP}] ${s}`)
    if (sau > SAU_TOI_DA) {
      bao(`Nhúng lồng quá ${SAU_TOI_DA} tầng`)
      return ''
    }
    const bd = lay(tenTP, bao)
    if (!bd) {
      bao(`Không có file ${tenTP}${DUOI}`)
      return ''
    }
    const pv = chayRenderVals(bd, { ...bd.macDinh, ...propsTP }, bao)
    return dungDs(bd.xdc, pv, sau, bao).trim()
  }

  function dungDs(ds: Nut[], pv: PhamVi, sau: number, bao: (s: string) => void): string {
    return ds.map((n) => dungNut(n, pv, sau, bao)).join('')
  }

  function dungNut(n: Nut, pv: PhamVi, sau: number, bao: (s: string) => void): string {
    if (n.loai === 'tho') return n.noiDung
    if (n.loai === 'chu') return chen(n.noiDung, pv, escChu, bao)
    const ten = n.ten.toLowerCase()
    if (ten === 'sc-for') {
      const ds = giaTri(layThuocTinh(n, 'list'), pv, bao)
      const bien = layThuocTinh(n, 'as')?.giaTri ?? 'item'
      if (ds === null || ds === undefined) return ''
      if (!Array.isArray(ds)) {
        bao(`<sc-for list> không phải mảng`)
        return ''
      }
      return ds
        .map((muc: unknown) => {
          const con = Object.create(pv) as PhamVi
          con[bien] = muc
          return dungDs(n.con, con, sau, bao)
        })
        .join('')
    }
    if (ten === 'sc-if') {
      return giaTri(layThuocTinh(n, 'value'), pv, bao) ? dungDs(n.con, pv, sau, bao) : ''
    }
    if (ten === 'dc-import') {
      const tenTP = layThuocTinh(n, 'name')?.giaTri
      if (!tenTP) {
        bao('<dc-import> thiếu name')
        return ''
      }
      const propsTP: PhamVi = {}
      for (const tt of n.thuocTinh) {
        const k = tt.ten.toLowerCase()
        if (k === 'name' || k.startsWith('hint-')) continue
        propsTP[kebabSangCamel(k)] = giaTri(tt, pv, bao)
      }
      return dung(tenTP, propsTP, sau + 1)
    }
    if (ten === 'helmet') {
      for (const con of n.con) {
        const s = dungNut(con, pv, sau, bao).trim()
        if (s && !helmet.includes(s)) helmet.push(s)
      }
      return ''
    }
    if (/^(sc|dc|x)-/.test(ten)) {
      bao(`Thẻ <${ten}> chưa hỗ trợ (chỉ dựng phần bên trong)`)
      return dungDs(n.con, pv, sau, bao)
    }
    // Trang dựng ra chỉ để nhìn: bỏ mọi thứ chạy được mã hoặc nhúng trang khác.
    if (THE_BO.has(ten)) return ''
    const tt = n.thuocTinh.map((a) => dungThuocTinh(a, pv, bao)).join('')
    if (n.tuDong) return `<${n.ten}${tt} />`
    if (THE_RONG.has(ten)) return `<${n.ten}${tt}>`
    return `<${n.ten}${tt}>${dungDs(n.con, pv, sau, bao)}</${n.ten}>`
  }

  function dungThuocTinh(a: ThuocTinh, pv: PhamVi, bao: (s: string) => void): string {
    const tenTT = a.ten.toLowerCase()
    if (tenTT.startsWith('on') || tenTT === 'srcdoc') return ''
    if (a.giaTri === null) return ` ${a.ten}`
    const ca = RE_CA_LO.exec(a.giaTri)
    if (ca) {
      const bt = ca[1] ?? ''
      const v = tinh(bt, pv, bao)
      const bool = THUOC_TINH_BOOL.has(tenTT)
      if (v === null || v === undefined || (bool && v === false)) return ''
      if (bool && v === true) return ` ${a.ten}`
      const s = thanhChuoi(v, bt, bao)
      return laUrlNguyHiem(tenTT, s) ? '' : ` ${a.ten}="${escThuocTinh(s)}"`
    }
    const q = a.nhay || '"'
    const s = chen(a.giaTri, pv, escThuocTinh, bao)
    return laUrlNguyHiem(tenTT, giaiMa(s)) ? '' : ` ${a.ten}=${q}${s}${q}`
  }

  const than = dung(ten, props, 0)
  return { than, helmet, thieu: [...thieu] }
}

/** Trang HTML hoàn chỉnh của một frame. Thẻ meta "xem-frame" để trang /_dev/frame nhận ra. */
export function taoTrang(frame: Frame, kq: KetQuaDung): string {
  return [
    '<!doctype html>',
    `<!-- Dựng bởi "npm run frame" từ docs/design-handoff/design/${frame.tep}. Không sửa tay. -->`,
    '<html lang="vi">',
    '<head>',
    '<meta charset="utf-8">',
    `<meta name="xem-frame" content="${escThuocTinh(frame.ma)}">`,
    `<meta name="xem-frame-thieu" content="${escThuocTinh(JSON.stringify(kq.thieu))}">`,
    `<title>${escChu(frame.tieuDe)}</title>`,
    ...kq.helmet,
    '</head>',
    '<body>',
    kq.than,
    '</body>',
    '</html>',
    '',
  ].join('\n')
}

export function docTuThuMuc(thuMuc: string): DocNguon {
  return (ten) => {
    if (!RE_TEN_TEP.test(ten)) return undefined
    const p = path.join(thuMuc, `${ten}${DUOI}`)
    return existsSync(p) ? readFileSync(p, 'utf8') : undefined
  }
}

/** Dựng một frame thành trang HTML (chưa ghi file). */
export function dungFrame(frame: Frame, thuMuc: string): { html: string; thieu: string[] } {
  const kq = dungThanhPhan(frame.tep.slice(0, -DUOI.length), {}, docTuThuMuc(thuMuc))
  return { html: taoTrang(frame, kq), thieu: kq.thieu }
}

// ---------- Dòng lệnh ----------

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const THU_MUC_THIET_KE = path.join(GOC, 'docs', 'design-handoff', 'design')
const THU_MUC_RA = path.join(GOC, '.frame')

function main(thamSo: string[]): number {
  const canvas = JSON.parse(
    readFileSync(path.join(THU_MUC_THIET_KE, 'canvas.json'), 'utf8'),
  ) as Canvas
  const ds = dsFrame(canvas)
  const congWeb = process.env.CONG_WEB ?? '5320'

  if (thamSo.length === 0) {
    console.log('Cách dùng: npm run frame -- <mã…> | --tat-ca   (vd. npm run frame -- F11 F02b)')
    console.log('Mã có thể là mã frame, tên file hoặc tên file bỏ .dc.html:')
    for (const f of ds) console.log(`  ${f.ma.padEnd(9)} ${f.tep}`)
    return 1
  }

  let chon: Frame[]
  if (thamSo.includes('--tat-ca')) {
    chon = ds
  } else {
    chon = []
    const khongCo: string[] = []
    for (const k of thamSo) {
      const f = timFrame(ds, k)
      if (f) chon.push(f)
      else khongCo.push(k)
    }
    if (khongCo.length) {
      console.error(
        `Không tìm thấy frame: ${khongCo.join(', ')}. Chạy "npm run frame" để xem danh sách mã.`,
      )
      return 1
    }
  }

  mkdirSync(THU_MUC_RA, { recursive: true })
  let du = 0
  let loi = 0
  console.log(`Dựng ${chon.length} frame vào .frame/`)
  for (const f of chon) {
    try {
      const { html, thieu } = dungFrame(f, THU_MUC_THIET_KE)
      writeFileSync(path.join(THU_MUC_RA, `${f.ma}.html`), html)
      const kichThuoc = `${f.rong}×${f.cao}`
      if (thieu.length === 0) {
        du += 1
        console.log(`  đủ    ${f.ma.padEnd(9)} ${kichThuoc.padEnd(10)} ${f.tep}`)
      } else {
        console.log(
          `  thiếu ${f.ma.padEnd(9)} ${kichThuoc.padEnd(10)} ${f.tep} — ${thieu.length} chỗ:`,
        )
        for (const s of thieu) console.log(`          - ${s}`)
      }
    } catch (e) {
      loi += 1
      console.log(`  lỗi   ${f.ma.padEnd(9)} ${f.tep}: ${(e as Error).message}`)
    }
  }
  const thieu = chon.length - du - loi
  console.log(`Kết quả: ${du} dựng đủ, ${thieu} còn chỗ chưa hỗ trợ, ${loi} lỗi.`)
  const dau = chon[0]
  if (dau) console.log(`Xem khi chạy npm run dev: http://127.0.0.1:${congWeb}/_dev/frame/${dau.ma}`)
  return loi > 0 ? 1 : 0
}

if (laLenhChinh(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2))
}
