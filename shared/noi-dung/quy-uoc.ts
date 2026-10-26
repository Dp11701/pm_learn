import { chuanHoaTieuDe, taoKhoa } from './chuan-hoa'
import { MUC_CON_TIEU_CHI, type KhoiMau } from './mau-bai'
import { DANG, TB, type CanhBao } from './thong-bao'

// Quy ước trong khối (bảng ở đề xuất 1.5). Mỗi hàm đọc các dòng của một khối, trả cấu trúc +
// phần không theo quy ước (thua) để không bỏ sót chữ nào; viết khác quy ước → cảnh báo, và
// hopLe = false để trang bài hiện khối đó như Markdown thường.

/** Một dòng của file kèm số dòng (đếm từ 1) */
export interface Dong {
  so: number
  chu: string
}

/** Đoạn Markdown thô kèm dòng đầu */
export interface DoanTho {
  noiDung: string
  dong: number
}

export interface CauHoi {
  /** Khoá lưu câu trả lời: băm câu hỏi chuẩn hoá, trùng thì thêm #n */
  khoa: string
  hoi: string
  /** Đáp án; dòng thụt ngay dưới được nối vào bằng xuống dòng */
  dap: string
  dong: number
}

export interface DinhNghia {
  thuatNgu: string
  giaiThich: string
  dong: number
}

export interface DongTick {
  /** Khoá lưu dấu tick (doc_checklist, tiêu chí): như khoá câu hỏi */
  khoa: string
  chu: string
  /** Dấu [x] trong file (app lưu tick riêng trong SQLite) */
  daTick: boolean
  dong: number
}

export interface Bang {
  cot: string[]
  /** Mỗi hàng đủ số cột của dòng tiêu đề (thiếu thì '', thừa thì bỏ như GFM) */
  hang: string[][]
  /** Dòng tiêu đề bảng */
  dong: number
  /** Dòng cuối của bảng */
  dongCuoi: number
}

export interface MucCon {
  tieuDe: string
  /** Tên tiểu mục của mẫu khớp được; null = tiểu mục lạ */
  mauTen: string | null
  noiDung: string
  dong: number
}

export interface TruongThi {
  ten: string
  /** '' → app hiện "Chưa có thông tin" */
  giaTri: string
  dong: number
}

export interface DomainPhu {
  ten: string
  dong: number
  /** slug hoặc id như viết trong file, chưa tra */
  muc: { giaTri: string; dong: number }[]
}

interface Chung {
  /** true: hiện theo cấu trúc; false: hiện cả khối như Markdown thường */
  hopLe: boolean
}

export type CauTrucKhoi =
  | (Chung & { kieu: 'tu-kiem-tra'; cauHoi: CauHoi[]; thua: DoanTho[] })
  | (Chung & {
      kieu: 'dinh-nghia'
      /** Đoạn mở trước danh sách (F11: một đoạn rồi danh sách) */
      truoc: DoanTho | null
      dinhNghia: DinhNghia[]
      /** Đoạn kết sau danh sách (cách danh sách một dòng trống) */
      sau: DoanTho | null
      thua: DoanTho[]
    })
  | (Chung & { kieu: 'checklist'; dongTick: DongTick[]; thua: DoanTho[] })
  | (Chung & {
      kieu: 'mau-dien-san'
      bang: Bang | null
      truoc: DoanTho | null
      sau: DoanTho | null
    })
  | (Chung & { kieu: 'goc-dev-lead'; truoc: DoanTho | null; mucCon: MucCon[] })
  | (Chung & {
      kieu: 'thuc-hanh'
      truoc: DoanTho | null
      mucCon: MucCon[]
      /** Task list trong "### Tiêu chí tự kiểm" */
      tieuChi: DongTick[]
    })
  | (Chung & { kieu: 'thong-tin-thi'; truong: TruongThi[]; thua: DoanTho[] })
  | (Chung & { kieu: 'phu-roadmap'; truoc: DoanTho | null; domain: DomainPhu[]; thua: DoanTho[] })

// ---------- Tiện ích dòng ----------

const DONG_TRONG = /^\s*$/
const THUT_VAO = /^\s+\S/
const RAO_MO = /^ {0,3}(`{3,}|~{3,})/

/** Ghép các dòng thành đoạn, bỏ dòng trống hai đầu; null nếu không có chữ. */
export function ghepDoan(dong: readonly Dong[]): DoanTho | null {
  let dau = 0
  let cuoi = dong.length
  while (dau < cuoi && DONG_TRONG.test(dong[dau].chu)) dau++
  while (cuoi > dau && DONG_TRONG.test(dong[cuoi - 1].chu)) cuoi--
  if (dau === cuoi) return null
  return {
    noiDung: dong
      .slice(dau, cuoi)
      .map((d) => d.chu)
      .join('\n'),
    dong: dong[dau].so,
  }
}

/** Cập nhật trạng thái rào ``` / ~~~; trả rào đang mở (null nếu không trong khối mã). */
export function quaRao(chu: string, dangMo: string | null): string | null {
  const m = RAO_MO.exec(chu)
  if (dangMo === null) return m ? m[1] : null
  if (
    m &&
    m[1][0] === dangMo[0] &&
    m[1].length >= dangMo.length &&
    /^\s*$/.test(chu.slice(m[0].length))
  ) {
    return null
  }
  return dangMo
}

/**
 * Tiêu đề ATX đúng cấp (2 = "##", 3 = "###"): chữ tiêu đề đã bỏ dãy # đóng và khoảng trắng hai đầu;
 * null nếu dòng không phải tiêu đề cấp đó. Viết tay, tuyến tính theo độ dài dòng (không regex lùi).
 */
export function tieuDeCap(chu: string, cap: number): string | null {
  let i = 0
  while (i < 3 && chu[i] === ' ') i++
  let soThang = 0
  while (chu[i + soThang] === '#') soThang++
  if (soThang !== cap) return null
  i += soThang
  if (i < chu.length && chu[i] !== ' ' && chu[i] !== '\t') return null
  let cuoi = chu.length
  while (cuoi > i && (chu[cuoi - 1] === ' ' || chu[cuoi - 1] === '\t')) cuoi--
  // Dãy # đóng: các # ở cuối, đứng sau khoảng trắng hoặc chiếm cả tiêu đề
  let j = cuoi
  while (j > i && chu[j - 1] === '#') j--
  if (j < cuoi && (j === i || chu[j - 1] === ' ' || chu[j - 1] === '\t')) cuoi = j
  return chu.slice(i, cuoi).trim()
}

const laKhoangTrang = (c: string | undefined): boolean => c !== undefined && c.trim() === ''

/**
 * Phần sau dấu đầu dòng danh sách ("- ", "* ", "+ "; có thể thụt vào), đã bỏ khoảng trắng đầu;
 * null nếu dòng không mở bằng dấu đó và ít nhất một khoảng trắng. Tuyến tính (trimStart).
 */
function sauDauDong(chu: string, dau = '-*+'): string | null {
  const s = chu.trimStart()
  if (s === '' || !dau.includes(s[0])) return null
  const sau = s.slice(1)
  const con = sau.trimStart()
  return con.length < sau.length ? con : null
}

const DAU_DS_SO = /^\s*\d{1,9}[.)](?:\s|$)/

/** Dòng mở một mục danh sách (gạch đầu dòng hoặc đánh số), dù có theo quy ước của khối hay không. */
function laDongDanhSach(chu: string): boolean {
  return sauDauDong(chu) !== null || DAU_DS_SO.test(chu)
}

// Chữ \| trong câu: thay tạm bằng ký tự riêng để không bị coi là dấu ngăn.
const TAM = '\uE000'
const anGachDung = (s: string) => s.replace(/\\\|/g, TAM)
const traGachDung = (s: string) => s.split(TAM).join('|')

interface MucDanhSach<T> {
  muc: T
  /** dòng nối thêm (thụt vào, ngay dưới) */
  noi: string[]
}

/**
 * Đọc khối dạng danh sách: mỗi dòng khớp `doc` mở một mục; dòng thụt vào ngay dưới nối vào mục;
 * dòng khác (không trống) vào `thua`. `doc` trả 'loi' để báo dòng sai dạng (vẫn vào thua).
 * Dòng trong khối mã (``` / ~~~) không bao giờ được đọc thành mục: khối mã thụt ngay dưới một mục thì
 * nối vào mục đó (cả dòng trống bên trong), không thì vào thua.
 */
function docDanhSach<T>(
  dong: readonly Dong[],
  doc: (chu: string, so: number) => T | 'loi' | null,
): { ds: MucDanhSach<T>[]; thua: DoanTho[]; dongLoi: number[]; dongThua: number[] } {
  const ds: MucDanhSach<T>[] = []
  const thua: Dong[][] = []
  const dongLoi: number[] = []
  const dongThua: number[] = []
  let dangNoi: MucDanhSach<T> | null = null
  // dòng thụt ngay dưới một dòng sai dạng thuộc về dòng đó (đã báo lỗi), không báo thêm
  let sauDongLoi = false
  // cụm dòng thua đang mở (dòng trống không cắt cụm; gặp mục mới thì đóng)
  let cumThua: Dong[] | null = null
  const cum = (): Dong[] => {
    const c = cumThua ?? []
    if (c !== cumThua) thua.push(c)
    cumThua = c
    return c
  }
  // khối mã đang mở: rào, thuộc mục nào (null = vào thua), số khoảng trắng thụt của dòng rào mở
  let rao: string | null = null
  let raoCuaMuc: MucDanhSach<T> | null = null
  let thutRao = 0
  for (const d of dong) {
    const dangMo = rao
    rao = quaRao(d.chu, rao)
    if (dangMo !== null || rao !== null) {
      if (dangMo === null) {
        raoCuaMuc = dangNoi && THUT_VAO.test(d.chu) ? dangNoi : null
        thutRao = d.chu.length - d.chu.trimStart().length
        if (!raoCuaMuc) {
          if (!(sauDongLoi && THUT_VAO.test(d.chu))) dongThua.push(d.so)
          sauDongLoi = sauDongLoi && THUT_VAO.test(d.chu)
          dangNoi = null
        }
      }
      if (raoCuaMuc) {
        const thut = Math.min(thutRao, d.chu.length - d.chu.trimStart().length)
        raoCuaMuc.noi.push(d.chu.slice(thut).trimEnd())
      } else {
        if (dangMo !== null && !sauDongLoi) dongThua.push(d.so)
        cum().push(d)
      }
      continue
    }
    if (DONG_TRONG.test(d.chu)) {
      dangNoi = null
      sauDongLoi = false
      if (cumThua !== null) cum().push(d)
      continue
    }
    const kq = doc(d.chu, d.so)
    if (kq !== null && kq !== 'loi') {
      dangNoi = { muc: kq, noi: [] }
      ds.push(dangNoi)
      sauDongLoi = false
      cumThua = null
      continue
    }
    if (kq === null && dangNoi && THUT_VAO.test(d.chu)) {
      dangNoi.noi.push(d.chu.trim())
      continue
    }
    dangNoi = null
    if (kq === 'loi') dongLoi.push(d.so)
    else if (!(sauDongLoi && THUT_VAO.test(d.chu))) dongThua.push(d.so)
    sauDongLoi = kq === 'loi' || (sauDongLoi && THUT_VAO.test(d.chu))
    cum().push(d)
  }
  return { ds, thua: thua.flatMap((c) => ghepDoan(c) ?? []), dongLoi, dongThua }
}

// ---------- Từng quy ước ----------

/**
 * Một dòng "- H: <câu hỏi> | Đ: <đáp án>" (nhận "*" và "D:"; `\|` là chữ |): null nếu không mở bằng "- H:",
 * 'loi' nếu thiếu dấu ngăn " | Đ: " hoặc câu hỏi / đáp án trống. Dấu ngăn là chỗ đầu tiên có khoảng trắng
 * hai bên "|" và "Đ:" ngay sau. Viết tay, tuyến tính (regex cũ lùi bậc ba trên dòng dài nhiều khoảng trắng).
 */
function tachCauHoi(chu: string): { hoi: string; dap: string } | 'loi' | null {
  const sau = sauDauDong(chu, '-*')
  if (sau === null || !sau.startsWith('H:')) return null
  const s = anGachDung(sau.slice(2))
  for (let p = s.indexOf('|'); p >= 0; p = s.indexOf('|', p + 1)) {
    if (!laKhoangTrang(s[p - 1])) continue
    let q = p + 1
    while (laKhoangTrang(s[q])) q++
    if (q === p + 1 || (s[q] !== 'Đ' && s[q] !== 'D') || s[q + 1] !== ':') continue
    const hoi = s.slice(0, p).trim()
    const dap = s.slice(q + 2).trim()
    return hoi === '' || dap === '' ? 'loi' : { hoi: traGachDung(hoi), dap: traGachDung(dap) }
  }
  return 'loi'
}

/** "- H: … | Đ: …" (nhận cả "D:"); `\|` là chữ |; dòng thụt ngay dưới nối vào đáp án. */
export function docCauHoi(
  dong: readonly Dong[],
  khoi: KhoiMau,
  canhBao: CanhBao[],
): Extract<CauTrucKhoi, { kieu: 'tu-kiem-tra' }> {
  const { ds, thua, dongLoi, dongThua } = docDanhSach(dong, (chu, so) => {
    const kq = tachCauHoi(chu)
    return kq === null || kq === 'loi' ? kq : { ...kq, dong: so }
  })
  for (const so of dongLoi) {
    canhBao.push({ dong: so, thongBao: TB.cauHoiThieuDapAn, muc: 'loi', khoi: khoi.id })
  }
  baoThua(dongThua, khoi, DANG.cauHoi, canhBao)
  const khoa = taoKhoa(ds.map((x) => x.muc.hoi))
  const cauHoi = ds.map((x, i) => ({
    khoa: khoa[i],
    hoi: x.muc.hoi,
    dap: [x.muc.dap, ...x.noi.map(traGachDungTho)].join('\n'),
    dong: x.muc.dong,
  }))
  return {
    kieu: 'tu-kiem-tra',
    cauHoi,
    thua,
    hopLe: cauHoi.length > 0 && thua.length === 0,
  }
}

const traGachDungTho = (s: string) => s.replace(/\\\|/g, '|')

/**
 * "- **Thuật ngữ** — giải thích" (nhận cả "–", và " -" có khoảng trắng trước): null nếu không đúng dạng.
 * Thuật ngữ kết thúc ở "**" đầu tiên có dấu ngăn ngay sau. Viết tay, tuyến tính.
 */
function tachDinhNghia(chu: string): { thuatNgu: string; giaiThich: string } | null {
  const sau = sauDauDong(chu)
  if (sau === null || !sau.startsWith('**')) return null
  for (let c = sau.indexOf('**', 3); c >= 0; c = sau.indexOf('**', c + 1)) {
    let q = c + 2
    while (laKhoangTrang(sau[q])) q++
    const ngan = sau[q] === '—' || sau[q] === '–' || (sau[q] === '-' && q > c + 2)
    if (!ngan || q + 1 >= sau.length) continue
    return { thuatNgu: sau.slice(2, c).trim(), giaiThich: sau.slice(q + 1).trim() }
  }
  return null
}

/**
 * Vùng danh sách của khối: từ dòng danh sách đầu tiên tới hết dòng danh sách cuối cùng, kèm các dòng
 * ngay dưới nó (tới dòng trống đầu tiên ngoài khối mã). Dòng trong khối mã không tính. null = không có
 * dòng danh sách nào.
 */
function vungDanhSach(dong: readonly Dong[]): { dau: number; cuoi: number } | null {
  let rao: string | null = null
  let dau = -1
  let cuoiDs = -1
  dong.forEach((d, i) => {
    const dangMo = rao
    rao = quaRao(d.chu, rao)
    if (dangMo === null && rao === null && laDongDanhSach(d.chu)) {
      if (dau < 0) dau = i
      cuoiDs = i
    }
  })
  if (dau < 0) return null
  let cuoi = cuoiDs + 1
  rao = null
  for (; cuoi < dong.length; cuoi++) {
    const dangMo = rao
    rao = quaRao(dong[cuoi].chu, rao)
    if (dangMo === null && rao === null && DONG_TRONG.test(dong[cuoi].chu)) break
  }
  return { dau, cuoi }
}

/**
 * Khái niệm cốt lõi: đoạn mở (tuỳ chọn) + danh sách "- **Thuật ngữ** — giải thích" + đoạn kết (tuỳ chọn,
 * cách danh sách một dòng trống). Trong vùng danh sách mỗi dòng phải đúng dạng (dòng thụt ngay dưới nối
 * vào giải thích); dòng khác → thua, khối hiện như Markdown thường.
 */
export function docDinhNghia(
  dong: readonly Dong[],
  khoi: KhoiMau,
  canhBao: CanhBao[],
): Extract<CauTrucKhoi, { kieu: 'dinh-nghia' }> {
  const vung = vungDanhSach(dong) ?? { dau: 0, cuoi: dong.length }
  const { ds, thua, dongThua } = docDanhSach(dong.slice(vung.dau, vung.cuoi), (chu, so) => {
    const kq = tachDinhNghia(chu)
    return kq ? { ...kq, dong: so } : null
  })
  baoThua(dongThua, khoi, DANG.dinhNghia, canhBao)
  const dinhNghia = ds.map((x) => ({
    ...x.muc,
    giaiThich: [x.muc.giaiThich, ...x.noi].join('\n'),
  }))
  return {
    kieu: 'dinh-nghia',
    truoc: ghepDoan(dong.slice(0, vung.dau)),
    dinhNghia,
    sau: ghepDoan(dong.slice(vung.cuoi)),
    thua,
    hopLe: dinhNghia.length > 0 && thua.length === 0,
  }
}

/** "- [ ] …" / "- [x] …": null nếu không đúng dạng. Viết tay, tuyến tính. */
function tachDongTick(chu: string): { chu: string; daTick: boolean } | null {
  const sau = sauDauDong(chu)
  if (sau === null || sau[0] !== '[' || sau[2] !== ']' || !laKhoangTrang(sau[3])) return null
  if (sau[1] !== ' ' && sau[1] !== 'x' && sau[1] !== 'X') return null
  const noiDung = sau.slice(4).trim()
  return noiDung === '' ? null : { chu: noiDung, daTick: sau[1] !== ' ' }
}

/** Task list "- [ ] …"; khoá dòng như khoá câu hỏi. */
export function docDongTick(
  dong: readonly Dong[],
  khoi: KhoiMau,
  canhBao: CanhBao[],
): { dongTick: DongTick[]; thua: DoanTho[] } {
  const { ds, thua, dongThua } = docDanhSach(dong, (chu, so) => {
    const kq = tachDongTick(chu)
    return kq ? { ...kq, dong: so } : null
  })
  baoThua(dongThua, khoi, DANG.dongTick, canhBao)
  if (ds.length === 0) {
    canhBao.push({
      dong: dong[0]?.so ?? 1,
      thongBao: TB.khongCoDongTick(khoi.tieuDe),
      muc: 'canh-bao',
      khoi: khoi.id,
    })
  }
  const chu = ds.map((x) => [x.muc.chu, ...x.noi].join(' '))
  const khoa = taoKhoa(chu)
  return {
    dongTick: ds.map((x, i) => ({
      khoa: khoa[i],
      chu: chu[i],
      daTick: x.muc.daTick,
      dong: x.muc.dong,
    })),
    thua,
  }
}

export function docChecklist(
  dong: readonly Dong[],
  khoi: KhoiMau,
  canhBao: CanhBao[],
): Extract<CauTrucKhoi, { kieu: 'checklist' }> {
  const { dongTick, thua } = docDongTick(dong, khoi, canhBao)
  return { kieu: 'checklist', dongTick, thua, hopLe: dongTick.length > 0 && thua.length === 0 }
}

/** "- <Trường>: <giá trị>" (tên trước dấu ":" đầu tiên, không trống): null nếu không đúng dạng. Tuyến tính. */
function tachTruong(chu: string): { ten: string; giaTri: string } | null {
  const sau = sauDauDong(chu)
  const i = sau?.indexOf(':') ?? -1
  if (sau === null || i <= 0) return null
  const ten = sau.slice(0, i).trim()
  return ten === '' ? null : { ten, giaTri: sau.slice(i + 1).trim() }
}

/** "- <Trường>: <giá trị>" (P1); giá trị trống → "Chưa có thông tin" khi hiện. */
export function docThongTinThi(
  dong: readonly Dong[],
  khoi: KhoiMau,
  canhBao: CanhBao[],
): Extract<CauTrucKhoi, { kieu: 'thong-tin-thi' }> {
  const { ds, thua, dongThua } = docDanhSach(dong, (chu, so) => {
    const kq = tachTruong(chu)
    return kq ? { ...kq, dong: so } : null
  })
  baoThua(dongThua, khoi, DANG.truong, canhBao)
  const truong = ds.map((x) => ({ ...x.muc, giaTri: [x.muc.giaTri, ...x.noi].join(' ').trim() }))
  return { kieu: 'thong-tin-thi', truong, thua, hopLe: truong.length > 0 && thua.length === 0 }
}

// ---------- Bảng GFM ----------

/** Tách ô của một dòng bảng: bỏ | hai đầu, '\|' là chữ |. */
export function tachO(chu: string): string[] {
  let s = anGachDung(chu.trim())
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|')) s = s.slice(0, -1)
  return s.split('|').map((o) => traGachDung(o.trim()))
}

const O_NGAN = /^:?-+:?$/

function laDongNgan(chu: string): number {
  if (!chu.includes('-')) return 0
  const o = tachO(chu)
  if (!o.every((x) => O_NGAN.test(x))) return 0
  if (o.length === 1 && !chu.includes('|')) return 0
  return o.length
}

/** Bảng GFM đầu tiên trong các dòng (ngoài khối mã); trả kèm vị trí để tách chữ trước/sau. */
export function timBang(dong: readonly Dong[]): { bang: Bang; dau: number; cuoi: number } | null {
  let rao: string | null = null
  for (let i = 0; i + 1 < dong.length; i++) {
    const truoc = rao
    rao = quaRao(dong[i].chu, rao)
    if (truoc !== null || rao !== null) continue
    const tieuDe = dong[i].chu
    if (!tieuDe.includes('|')) continue
    const cot = tachO(tieuDe)
    if (laDongNgan(dong[i + 1].chu) !== cot.length) continue
    const hang: string[][] = []
    let j = i + 2
    for (; j < dong.length; j++) {
      const chu = dong[j].chu
      if (DONG_TRONG.test(chu) || !chu.includes('|')) break
      const o = tachO(chu)
      hang.push(cot.map((_, c) => o[c] ?? ''))
    }
    return { bang: { cot, hang, dong: dong[i].so, dongCuoi: dong[j - 1].so }, dau: i, cuoi: j }
  }
  return null
}

export function docMauDienSan(
  dong: readonly Dong[],
  khoi: KhoiMau,
  canhBao: CanhBao[],
): Extract<CauTrucKhoi, { kieu: 'mau-dien-san' }> {
  const tim = timBang(dong)
  if (!tim) {
    canhBao.push({
      dong: dong[0]?.so ?? 1,
      thongBao: TB.khongCoBang(khoi.tieuDe),
      muc: 'canh-bao',
      khoi: khoi.id,
    })
    return { kieu: 'mau-dien-san', bang: null, truoc: ghepDoan(dong), sau: null, hopLe: false }
  }
  return {
    kieu: 'mau-dien-san',
    bang: tim.bang,
    truoc: ghepDoan(dong.slice(0, tim.dau)),
    sau: ghepDoan(dong.slice(tim.cuoi)),
    hopLe: true,
  }
}

// ---------- Tiểu mục ### ----------

interface PhanMucCon {
  truoc: Dong[]
  muc: { tieuDe: string; dong: number; than: Dong[] }[]
}

/** Tách khối theo dòng ### (bỏ qua ### trong khối mã). */
export function tachMucCon(dong: readonly Dong[]): PhanMucCon {
  const kq: PhanMucCon = { truoc: [], muc: [] }
  let rao: string | null = null
  for (const d of dong) {
    const truoc = rao
    rao = quaRao(d.chu, rao)
    const tieuDe = truoc === null && rao === null ? tieuDeCap(d.chu, 3) : null
    if (tieuDe !== null) {
      kq.muc.push({ tieuDe, dong: d.so, than: [] })
      continue
    }
    const cuoi = kq.muc.at(-1)
    if (cuoi) cuoi.than.push(d)
    else kq.truoc.push(d)
  }
  return kq
}

/** Đọc các tiểu mục ### theo danh sách tên của mẫu (Góc dev lead → PM, Thực hành). */
function docMucConMau(
  dong: readonly Dong[],
  khoi: KhoiMau,
  canhBao: CanhBao[],
): { truoc: DoanTho | null; mucCon: MucCon[]; hopLe: boolean; than: Map<string, Dong[]> } {
  const phan = tachMucCon(dong)
  const truoc = ghepDoan(phan.truoc)
  let hopLe = true
  const bao = (so: number, thongBao: string) =>
    canhBao.push({ dong: so, thongBao, muc: 'canh-bao', khoi: khoi.id })
  if (truoc) {
    hopLe = false
    bao(truoc.dong, TB.chuTruocMucCon(khoi.tieuDe))
  }
  const theoChuan = new Map(khoi.mucCon.map((ten) => [chuanHoaTieuDe(ten), ten]))
  const daGap = new Set<string>()
  const than = new Map<string, Dong[]>()
  const mucCon: MucCon[] = phan.muc.map((m) => {
    const mauTen = theoChuan.get(chuanHoaTieuDe(m.tieuDe)) ?? null
    if (mauTen === null) {
      hopLe = false
      bao(m.dong, TB.mucConLa(khoi.tieuDe, m.tieuDe))
    } else if (daGap.has(mauTen)) {
      hopLe = false
      bao(m.dong, TB.mucConTrung(khoi.tieuDe, m.tieuDe))
    } else {
      daGap.add(mauTen)
      than.set(mauTen, m.than)
    }
    return {
      tieuDe: m.tieuDe,
      mauTen,
      noiDung: ghepDoan(m.than)?.noiDung ?? '',
      dong: m.dong,
    }
  })
  for (const ten of khoi.mucCon) {
    if (!daGap.has(ten)) {
      hopLe = false
      bao(dong.find((d) => !DONG_TRONG.test(d.chu))?.so ?? 1, TB.thieuMucCon(khoi.tieuDe, ten))
    }
  }
  return { truoc, mucCon, hopLe, than }
}

export function docGocDevLead(
  dong: readonly Dong[],
  khoi: KhoiMau,
  canhBao: CanhBao[],
): Extract<CauTrucKhoi, { kieu: 'goc-dev-lead' }> {
  const { truoc, mucCon, hopLe } = docMucConMau(dong, khoi, canhBao)
  return { kieu: 'goc-dev-lead', truoc, mucCon, hopLe }
}

export function docThucHanh(
  dong: readonly Dong[],
  khoi: KhoiMau,
  canhBao: CanhBao[],
): Extract<CauTrucKhoi, { kieu: 'thuc-hanh' }> {
  const { truoc, mucCon, hopLe, than } = docMucConMau(dong, khoi, canhBao)
  const dongTieuChi = than.get(MUC_CON_TIEU_CHI)
  const tieuChi = dongTieuChi ? docDongTick(dongTieuChi, khoi, canhBao).dongTick : []
  return { kieu: 'thuc-hanh', truoc, mucCon, tieuChi, hopLe }
}

/** "### <tên domain>" + danh sách "- <slug>" (P1). */
export function docPhuRoadmap(
  dong: readonly Dong[],
  khoi: KhoiMau,
  canhBao: CanhBao[],
): Extract<CauTrucKhoi, { kieu: 'phu-roadmap' }> {
  const phan = tachMucCon(dong)
  const truoc = ghepDoan(phan.truoc)
  if (truoc) {
    canhBao.push({
      dong: truoc.dong,
      thongBao: TB.chuTruocMucCon(khoi.tieuDe),
      muc: 'canh-bao',
      khoi: khoi.id,
    })
  }
  const thua: DoanTho[] = []
  const domain = phan.muc.map((m) => {
    const ds = docDanhSach(m.than, (chu, so) => {
      const giaTri = sauDauDong(chu)?.trimEnd()
      return giaTri ? { giaTri, dong: so } : null
    })
    baoThua(ds.dongThua, khoi, DANG.danhSach, canhBao)
    thua.push(...ds.thua)
    return { ten: m.tieuDe, dong: m.dong, muc: ds.ds.map((x) => x.muc) }
  })
  return {
    kieu: 'phu-roadmap',
    truoc,
    domain,
    thua,
    hopLe: domain.length > 0 && !truoc && thua.length === 0,
  }
}

/** Một cảnh báo cho mỗi cụm dòng liền nhau không theo quy ước. */
function baoThua(dongThua: number[], khoi: KhoiMau, dang: string, canhBao: CanhBao[]) {
  dongThua.forEach((so, i) => {
    if (i > 0 && dongThua[i - 1] === so - 1) return
    canhBao.push({
      dong: so,
      thongBao: TB.khongTheoDang(khoi.tieuDe, dang),
      muc: 'canh-bao',
      khoi: khoi.id,
    })
  })
}

/** Cấu trúc của một khối theo kiểu khối mẫu; null với khối văn bản thường. */
export function docCauTruc(
  khoi: KhoiMau,
  dong: readonly Dong[],
  canhBao: CanhBao[],
): CauTrucKhoi | null {
  switch (khoi.kieu) {
    case 'tu-kiem-tra':
      return docCauHoi(dong, khoi, canhBao)
    case 'dinh-nghia':
      return docDinhNghia(dong, khoi, canhBao)
    case 'checklist':
      return docChecklist(dong, khoi, canhBao)
    case 'mau-dien-san':
      return docMauDienSan(dong, khoi, canhBao)
    case 'goc-dev-lead':
      return docGocDevLead(dong, khoi, canhBao)
    case 'thuc-hanh':
      return docThucHanh(dong, khoi, canhBao)
    case 'thong-tin-thi':
      return docThongTinThi(dong, khoi, canhBao)
    case 'phu-roadmap':
      return docPhuRoadmap(dong, khoi, canhBao)
    default:
      return null
  }
}
