import {
  LineCounter,
  isAlias,
  isMap,
  isScalar,
  isSeq,
  parseDocument,
  type Document,
  type Node,
} from 'yaml'
import { z } from 'zod'
import type { NguonBanNhap } from '../domain/trang-thai'
import { hopLe } from '../lich'
import { TB, type CanhBao, type LoiDong } from './thong-bao'

// Frontmatter của file nội dung (đề xuất 1.5): đọc bằng yaml.parseDocument để có số dòng,
// kiểm bằng zod, lỗi tiếng Việt kèm dòng. Khoá lạ: cảnh báo, giữ nguyên giá trị.

export const CAC_LOAI_FILE = ['chu-de', 'tai-lieu', 'chung-chi', 'tong-quan', 'lo-trinh'] as const
export type LoaiFile = (typeof CAC_LOAI_FILE)[number]

export const CAC_TRANG_THAI_FILE = ['ban-nhap', 'da-duyet'] as const
export type TrangThaiFile = (typeof CAC_TRANG_THAI_FILE)[number]

export const CAC_NGUON = ['ai', 'tu-viet'] as const satisfies readonly NguonBanNhap[]

/** Khoá frontmatter app hiểu, theo thứ tự của 1.5 */
export const KHOA_FRONTMATTER = [
  'id',
  'loai',
  'giai_nghia',
  'trang_thai_noi_dung',
  'nguon',
  'ngay_duyet',
  'lien_quan',
  'process_group',
  'kiem_tra_lan_cuoi',
] as const
type KhoaBiet = (typeof KHOA_FRONTMATTER)[number]

export interface Frontmatter {
  /** Thiếu thì khớp theo tên file */
  id?: string
  loai: LoaiFile
  giaiNghia?: string
  /** Thiếu → ban-nhap (kèm cảnh báo) */
  trangThaiNoiDung: TrangThaiFile
  /** Thiếu → ai (kèm cảnh báo) */
  nguon: NguonBanNhap
  /** YYYY-MM-DD; chỉ có khi da-duyet */
  ngayDuyet?: string
  /** slug hoặc id, chưa tra (xem traMucLienQuan) */
  lienQuan: string[]
  /** Chỉ tai-lieu */
  processGroup: string[]
  /** Chỉ chung-chi (P1) */
  kiemTraLanCuoi?: string
  /** Khoá lạ → giá trị (giữ nguyên khi ghi lại) */
  khoaLa: Record<string, unknown>
  /** Dòng (đếm từ 1, trong cả file) của từng khoá có trong frontmatter */
  dongKhoa: Record<string, number>
}

export interface KetQuaFrontmatter {
  /** null khi có lỗi (loi khác null) */
  frontmatter: Frontmatter | null
  /** Lỗi đầu tiên làm không đọc được frontmatter; lỗi khác (nếu có) nằm trong canhBao với muc 'loi' */
  loi: LoiDong | null
  canhBao: CanhBao[]
  /** Các dòng của thân bài (sau dòng --- đóng) */
  dongThan: string[]
  /** Số dòng (đếm từ 1) của dòng đầu tiên trong dongThan */
  dongDauThan: number
}

/** Tách dòng (LF hoặc CRLF), bỏ BOM đầu file. */
export function tachDong(text: string): string[] {
  return text.replace(/^\uFEFF/, '').split(/\r?\n/)
}

const ngay = z.string().refine(hopLe)
const danhSach = z.preprocess(
  (x) => (typeof x === 'string' ? [x] : x),
  z.array(z.string().trim().min(1)),
)

const SCHEMA = z.object({
  id: z.string().trim().min(1).optional(),
  loai: z.enum(CAC_LOAI_FILE),
  giai_nghia: z.string().optional(),
  trang_thai_noi_dung: z.enum(CAC_TRANG_THAI_FILE).optional(),
  nguon: z.enum(CAC_NGUON).optional(),
  ngay_duyet: ngay.optional(),
  lien_quan: danhSach.optional(),
  process_group: danhSach.optional(),
  kiem_tra_lan_cuoi: ngay.optional(),
})

function thongBaoKhoa(khoa: KhoaBiet, giaTri: unknown): string {
  switch (khoa) {
    case 'id':
      return TB.idSai
    case 'loai':
      return giaTri === undefined ? TB.thieuLoai : TB.loaiSai(String(giaTri))
    case 'giai_nghia':
      return TB.giaiNghiaSai
    case 'trang_thai_noi_dung':
      return TB.trangThaiSai
    case 'nguon':
      return TB.nguonSai
    case 'ngay_duyet':
    case 'kiem_tra_lan_cuoi':
      return TB.ngaySai(khoa)
    case 'lien_quan':
    case 'process_group':
      return TB.danhSachSai(khoa)
  }
}

function laKhoaBiet(khoa: string): khoa is KhoaBiet {
  return (KHOA_FRONTMATTER as readonly string[]).includes(khoa)
}

/** Số lần thay alias (*tên) tối đa trong một frontmatter (chặn "alias bomb"); như maxAliasCount của yaml */
export const TOI_DA_ALIAS = 10
/** Độ sâu lồng tối đa của một giá trị trong frontmatter */
export const TOI_DA_SAU = 32

/** Alias tự trỏ vào chính nó / dùng quá TOI_DA_ALIAS lần, hoặc giá trị lồng quá TOI_DA_SAU cấp. */
class LoiGiaTri extends Error {
  constructor(
    readonly nut: Node,
    readonly lyDo: 'alias' | 'sau',
  ) {
    super(lyDo)
  }
}

interface NguCanh {
  doc: Document
  soAlias: number
  /** Node đang đọc (tổ tiên của node hiện tại): alias trỏ về một node trong đây là alias vòng */
  dangDoc: Set<Node>
}

/** Gán khoá kể cả "__proto__" (tạo thuộc tính riêng, không đổi prototype). */
function datKhoa<T>(obj: Record<string, T>, khoa: string, giaTri: T): void {
  Object.defineProperty(obj, khoa, {
    value: giaTri,
    enumerable: true,
    writable: true,
    configurable: true,
  })
}

/** Tên khoá của một cặp: scalar → chữ của giá trị; khoá phức (hiếm) → chuỗi của giá trị đã đọc. */
function tenKhoa(nut: Node | null, nc: NguCanh, sau: number): string {
  return isScalar(nut) ? String(nut.value) : String(giaTriNode(nut, nc, sau))
}

/**
 * Giá trị JS của một node. Scalar không phải chuỗi (số, true/false) lấy nguyên chữ trong file,
 * để id kiểu "123" hay ngày không bị đổi; scalar rỗng → null. Tự đọc alias (không dùng toJS): mỗi alias
 * tính một lần thay, alias trỏ về node đang đọc (vòng) hay quá TOI_DA_ALIAS lần, hoặc lồng quá TOI_DA_SAU
 * cấp → LoiGiaTri (lỗi frontmatter, không đọc bài).
 */
function giaTriNode(node: Node | null, nc: NguCanh, sau = 0): unknown {
  if (node === null) return null
  if (sau > TOI_DA_SAU) throw new LoiGiaTri(node, 'sau')
  if (isAlias(node)) {
    nc.soAlias++
    const dich = node.resolve(nc.doc)
    if (dich === undefined || nc.soAlias > TOI_DA_ALIAS || nc.dangDoc.has(dich)) {
      throw new LoiGiaTri(node, 'alias')
    }
    return giaTriNode(dich, nc, sau + 1)
  }
  if (isScalar(node)) {
    const v = node.value
    if (v === null || v === undefined) return null
    if (typeof v === 'string') return v
    return node.source ?? String(v)
  }
  if (isSeq(node) || isMap(node)) {
    nc.dangDoc.add(node)
    try {
      if (isSeq(node)) return node.items.map((x) => giaTriNode(x as Node | null, nc, sau + 1))
      const obj: Record<string, unknown> = {}
      for (const cap of node.items) {
        const khoa = tenKhoa(cap.key as Node | null, nc, sau + 1)
        datKhoa(obj, khoa, giaTriNode(cap.value as Node | null, nc, sau + 1))
      }
      return obj
    } finally {
      nc.dangDoc.delete(node)
    }
  }
  return null
}

/** Tên khoá ở đầu một dòng "khoá: giá trị" (trước dấu : đầu tiên, không có #); tuyến tính. */
function khoaTrenDong(chu: string): string | undefined {
  const i = chu.search(/[:#]/)
  if (i < 0 || chu[i] !== ':') return undefined
  const ten = chu.slice(0, i).trim()
  return ten === '' ? undefined : ten
}

/** Đọc và kiểm frontmatter. Không biết mẫu bài của mục (xem phanTichBai cho loai khác mẫu). */
export function docFrontmatter(text: string): KetQuaFrontmatter {
  const dong = tachDong(text)
  if (dong[0]?.trimEnd() !== '---') {
    return ketQuaLoi({ dong: 1, thongBao: TB.thieuFrontmatter }, dong, 1)
  }
  const cuoi = dong.findIndex((d, i) => i > 0 && (d.trimEnd() === '---' || d.trimEnd() === '...'))
  if (cuoi < 0) {
    return ketQuaLoi({ dong: 1, thongBao: TB.frontmatterChuaDong }, [], dong.length + 1)
  }
  const dongThan = dong.slice(cuoi + 1)
  const dongDauThan = cuoi + 2
  // YAML bắt đầu ở dòng 2 của file
  const lechDong = 1
  const yamlText = dong.slice(1, cuoi).join('\n')
  const demDong = new LineCounter()
  let doc: Document
  try {
    doc = parseDocument(yamlText, { lineCounter: demDong, uniqueKeys: true })
  } catch {
    // yaml tự chặn phần lớn đầu vào quá khổ bằng doc.errors; còn ném ra thì vẫn là lỗi frontmatter, không 500
    return ketQuaLoi({ dong: 2, thongBao: TB.yamlLoi }, dongThan, dongDauThan)
  }

  if (doc.errors.length > 0) {
    const e = doc.errors[0]
    const so = (e.linePos?.[0].line ?? 1) + lechDong
    const khoa = khoaTrenDong(dong[so - 1] ?? '')
    const thongBao = e.code === 'DUPLICATE_KEY' && khoa ? TB.khoaLap(khoa) : TB.yamlLoi
    return ketQuaLoi({ dong: so, thongBao }, dongThan, dongDauThan)
  }

  const goc = doc.contents
  if (goc !== null && !isMap(goc)) {
    return ketQuaLoi({ dong: 2, thongBao: TB.khongPhaiBang }, dongThan, dongDauThan)
  }

  const canhBao: CanhBao[] = []
  const dongKhoa: Record<string, number> = {}
  const tho: Record<string, unknown> = {}
  const khoaLa: Record<string, unknown> = {}
  const dongCuaNut = (nut: Node | null) =>
    (nut?.range ? demDong.linePos(nut.range[0]).line : 1) + lechDong
  const nc: NguCanh = { doc, soAlias: 0, dangDoc: new Set(goc ? [goc] : []) }
  try {
    for (const cap of goc?.items ?? []) {
      const nutKhoa = cap.key as Node | null
      const khoa = tenKhoa(nutKhoa, nc, 1)
      const so = dongCuaNut(nutKhoa)
      datKhoa(dongKhoa, khoa, so)
      const giaTri = giaTriNode(cap.value as Node | null, nc, 1)
      if (laKhoaBiet(khoa)) {
        if (giaTri !== null) tho[khoa] = giaTri
      } else {
        datKhoa(khoaLa, khoa, giaTri)
        canhBao.push({ dong: so, thongBao: TB.khoaLa(khoa), muc: 'canh-bao' })
      }
    }
  } catch (loi) {
    if (!(loi instanceof LoiGiaTri)) throw loi
    const thongBao = loi.lyDo === 'alias' ? TB.aliasYaml(TOI_DA_ALIAS) : TB.longQuaSau(TOI_DA_SAU)
    return ketQuaLoi({ dong: dongCuaNut(loi.nut), thongBao }, dongThan, dongDauThan)
  }

  const dongCua = (khoa: string) => dongKhoa[khoa] ?? 1
  const kq = SCHEMA.safeParse(tho)
  const cacLoi: LoiDong[] = []
  if (!kq.success) {
    for (const van of kq.error.issues) {
      const khoa = String(van.path[0] ?? '')
      if (!laKhoaBiet(khoa)) continue
      cacLoi.push({ dong: dongCua(khoa), thongBao: thongBaoKhoa(khoa, tho[khoa]) })
    }
  } else if (kq.data.trang_thai_noi_dung === 'da-duyet' && kq.data.ngay_duyet === undefined) {
    cacLoi.push({ dong: dongCua('trang_thai_noi_dung'), thongBao: TB.thieuNgayDuyet })
  }

  if (!kq.success || cacLoi.length > 0) {
    cacLoi.sort((a, b) => a.dong - b.dong)
    const [dau, ...con] = cacLoi
    canhBao.push(...con.map((l) => ({ ...l, muc: 'loi' as const })))
    return {
      frontmatter: null,
      loi: dau ?? { dong: 1, thongBao: TB.yamlLoi },
      canhBao: sapTheoDong(canhBao),
      dongThan,
      dongDauThan,
    }
  }

  const d = kq.data
  if (d.nguon === undefined) canhBao.push({ dong: 1, thongBao: TB.thieuNguon, muc: 'canh-bao' })
  if (d.trang_thai_noi_dung === undefined) {
    canhBao.push({ dong: 1, thongBao: TB.thieuTrangThai, muc: 'canh-bao' })
  }
  const trangThai = d.trang_thai_noi_dung ?? 'ban-nhap'
  let ngayDuyet = d.ngay_duyet
  if (ngayDuyet !== undefined && trangThai !== 'da-duyet') {
    canhBao.push({ dong: dongCua('ngay_duyet'), thongBao: TB.ngayDuyetKhiNhap, muc: 'canh-bao' })
    ngayDuyet = undefined
  }
  let processGroup = d.process_group ?? []
  if (d.process_group !== undefined && d.loai !== 'tai-lieu') {
    canhBao.push({
      dong: dongCua('process_group'),
      thongBao: TB.chiChoLoai('process_group', 'tai-lieu'),
      muc: 'canh-bao',
    })
    processGroup = []
  }
  let kiemTraLanCuoi = d.kiem_tra_lan_cuoi
  if (kiemTraLanCuoi !== undefined && d.loai !== 'chung-chi') {
    canhBao.push({
      dong: dongCua('kiem_tra_lan_cuoi'),
      thongBao: TB.chiChoLoai('kiem_tra_lan_cuoi', 'chung-chi'),
      muc: 'canh-bao',
    })
    kiemTraLanCuoi = undefined
  }

  const frontmatter: Frontmatter = {
    loai: d.loai,
    trangThaiNoiDung: trangThai,
    nguon: d.nguon ?? 'ai',
    lienQuan: d.lien_quan ?? [],
    processGroup,
    khoaLa,
    dongKhoa,
  }
  if (d.id !== undefined) frontmatter.id = d.id
  if (d.giai_nghia !== undefined && d.giai_nghia.trim() !== '') {
    frontmatter.giaiNghia = d.giai_nghia.trim()
  }
  if (ngayDuyet !== undefined) frontmatter.ngayDuyet = ngayDuyet
  if (kiemTraLanCuoi !== undefined) frontmatter.kiemTraLanCuoi = kiemTraLanCuoi

  return { frontmatter, loi: null, canhBao: sapTheoDong(canhBao), dongThan, dongDauThan }
}

function ketQuaLoi(loi: LoiDong, dongThan: string[], dongDauThan: number): KetQuaFrontmatter {
  return { frontmatter: null, loi, canhBao: [], dongThan, dongDauThan }
}

export function sapTheoDong<T extends { dong: number }>(ds: T[]): T[] {
  return ds
    .map((x, i) => [x, i] as const)
    .sort((a, b) => a[0].dong - b[0].dong || a[1] - b[1])
    .map(([x]) => x)
}
