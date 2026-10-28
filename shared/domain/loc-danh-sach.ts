// Bộ lọc của Lộ trình dạng danh sách (đề xuất 3.9, §6.3) — hàm thuần, dùng chung web (trang Lộ trình) và test.
// URL: trang-thai (chua-hoc, dang-hoc, da-xong, bo-qua, can-on-lai) · loai (chu-de, tai-lieu, chung-chi) · phan ·
// linh-vuc (slug) · noi-dung (chua-co, ban-nhap, da-duyet) · sap-xep (cay, a-z, mo-gan-day). Một nhóm nhiều giá trị
// thì ngăn bằng dấu phẩy (nhận cả tham số lặp lại). Trong một nhóm HOẶC, giữa các nhóm VÀ. Giá trị lạ, slug không
// có trong cây (hoặc sai loại) bị bỏ qua; ghi lại URL theo thứ tự chuẩn (thứ tự hằng số, slug theo thứ tự cây).
// `xem` (ban-do / danh-sach) chỉ được giữ nguyên: bản đồ đã bỏ (đề xuất mục 10), danh sách là cách xem duy nhất.
// `muc` (mở tới một mục) không phải bộ lọc: đổi bộ lọc thì bỏ nó.
import type { Cay, MauBai, MucHoc, Nut } from '../roadmap/types'
import type { TrangThaiHoc, TrangThaiNoiDung } from './trang-thai'

export const CAC_LOC_TRANG_THAI = [
  'chua-hoc',
  'dang-hoc',
  'da-xong',
  'bo-qua',
  'can-on-lai',
] as const
export type LocTrangThai = (typeof CAC_LOC_TRANG_THAI)[number]

export const CAC_LOC_LOAI: readonly MauBai[] = ['chu-de', 'tai-lieu', 'chung-chi']

export const CAC_LOC_NOI_DUNG = ['chua-co', 'ban-nhap', 'da-duyet'] as const
export type LocNoiDung = (typeof CAC_LOC_NOI_DUNG)[number]

export const CAC_SAP_XEP = ['cay', 'a-z', 'mo-gan-day'] as const
export type SapXep = (typeof CAC_SAP_XEP)[number]

/** Tên tham số URL của từng nhóm (đề xuất 3.9). */
export const THAM_SO_LOC = {
  trangThai: 'trang-thai',
  loai: 'loai',
  phan: 'phan',
  linhVuc: 'linh-vuc',
  noiDung: 'noi-dung',
  sapXep: 'sap-xep',
  muc: 'muc',
  xem: 'xem',
} as const

export interface BoLoc {
  trangThai: readonly LocTrangThai[]
  loai: readonly MauBai[]
  /** slug phần */
  phan: readonly string[]
  /** slug lĩnh vực */
  linhVuc: readonly string[]
  noiDung: readonly LocNoiDung[]
}

export type NhomLoc = keyof BoLoc

export const BO_LOC_TRONG: BoLoc = { trangThai: [], loai: [], phan: [], linhVuc: [], noiDung: [] }

export interface TrangThaiUrl {
  boLoc: BoLoc
  sapXep: SapXep
  /** slug mục cần mở tới (?muc=), chỉ khi là mục học của cây */
  muc?: string
}

type CayDoc = Pick<Cay, 'phan' | 'nutTheoId' | 'nutTheoSlug' | 'mucTheoSlug'>

/** Các lĩnh vực theo thứ tự cây. */
export function cacLinhVuc(cay: Pick<Cay, 'nutTheoId'>): Nut[] {
  return [...cay.nutTheoId.values()].filter((n) => n.kind === 'area')
}

/** Mọi giá trị của một tham số: lặp lại hoặc ngăn bằng dấu phẩy; bỏ khoảng trắng, chuỗi rỗng. */
function giaTriCua(params: URLSearchParams, ten: string): Set<string> {
  return new Set(
    params
      .getAll(ten)
      .flatMap((v) => v.split(','))
      .map((v) => v.trim())
      .filter(Boolean),
  )
}

/** Giữ các giá trị có trong `hopLe`, theo thứ tự của `hopLe`. */
function giuHopLe<T extends string>(co: Set<string>, hopLe: readonly T[]): T[] {
  return hopLe.filter((v) => co.has(v))
}

/** Đọc bộ lọc, cách sắp xếp, mục cần mở tới từ URL. */
export function docUrlDanhSach(params: URLSearchParams, cay: CayDoc): TrangThaiUrl {
  const sx = params.get(THAM_SO_LOC.sapXep)
  const muc = params.get(THAM_SO_LOC.muc) ?? undefined
  const boLoc: BoLoc = {
    trangThai: giuHopLe(giaTriCua(params, THAM_SO_LOC.trangThai), CAC_LOC_TRANG_THAI),
    loai: giuHopLe(giaTriCua(params, THAM_SO_LOC.loai), CAC_LOC_LOAI),
    phan: giuHopLe(
      giaTriCua(params, THAM_SO_LOC.phan),
      cay.phan.map((p) => p.slug),
    ),
    linhVuc: giuHopLe(
      giaTriCua(params, THAM_SO_LOC.linhVuc),
      cacLinhVuc(cay).map((n) => n.slug),
    ),
    noiDung: giuHopLe(giaTriCua(params, THAM_SO_LOC.noiDung), CAC_LOC_NOI_DUNG),
  }
  return {
    boLoc,
    sapXep: (CAC_SAP_XEP as readonly string[]).includes(sx ?? '') ? (sx as SapXep) : 'cay',
    ...(muc && cay.mucTheoSlug.has(muc) ? { muc } : {}),
  }
}

/**
 * Ghi bộ lọc + cách sắp xếp ra URL: chỉ nhóm có giá trị (ngăn bằng dấu phẩy), sap-xep chỉ khi khác 'cay'. Giữ
 * nguyên `xem` của URL cũ (link cũ ?xem=danh-sach); bỏ `muc` và mọi tham số khác.
 */
export function ghiUrlDanhSach(
  { boLoc, sapXep }: Pick<TrangThaiUrl, 'boLoc' | 'sapXep'>,
  cu?: URLSearchParams,
): URLSearchParams {
  const moi = new URLSearchParams()
  const xem = cu?.get(THAM_SO_LOC.xem)
  if (xem) moi.set(THAM_SO_LOC.xem, xem)
  const nhom: [string, readonly string[]][] = [
    [THAM_SO_LOC.trangThai, boLoc.trangThai],
    [THAM_SO_LOC.loai, boLoc.loai],
    [THAM_SO_LOC.phan, boLoc.phan],
    [THAM_SO_LOC.linhVuc, boLoc.linhVuc],
    [THAM_SO_LOC.noiDung, boLoc.noiDung],
  ]
  for (const [ten, ds] of nhom) if (ds.length > 0) moi.set(ten, ds.join(','))
  if (sapXep !== 'cay') moi.set(THAM_SO_LOC.sapXep, sapXep)
  return moi
}

/** Có ít nhất một nhóm đang lọc (cách sắp xếp không phải bộ lọc). */
export function dangLoc(boLoc: BoLoc): boolean {
  return Object.values(boLoc).some((ds: readonly string[]) => ds.length > 0)
}

/** Bật / tắt một giá trị trong một nhóm; giữ thứ tự chuẩn nhờ lần đọc lại URL. */
export function doiGiaTri(boLoc: BoLoc, nhom: NhomLoc, giaTri: string): BoLoc {
  const ds = boLoc[nhom] as readonly string[]
  const moi = ds.includes(giaTri) ? ds.filter((v) => v !== giaTri) : [...ds, giaTri]
  return { ...boLoc, [nhom]: moi }
}

/** Dữ liệu một mục cần để so bộ lọc. */
export interface TraMuc {
  trangThai: (id: string) => TrangThaiHoc
  /** Cờ Cần ôn lại (suy ra; chỉ mục Đã xong) */
  canOnLai: (id: string) => boolean
  /** Trạng thái nội dung; undefined = chưa biết (đang tải) → không khớp khi đang lọc theo nội dung */
  noiDung: (id: string) => TrangThaiNoiDung | undefined
}

/** Mục có khớp bộ lọc không: trong một nhóm HOẶC, giữa các nhóm VÀ; nhóm rỗng = không lọc. */
export function khopBoLoc(muc: MucHoc, boLoc: BoLoc, tra: TraMuc): boolean {
  if (boLoc.trangThai.length > 0) {
    const tt = tra.trangThai(muc.id)
    const khop = boLoc.trangThai.some((v) =>
      v === 'can-on-lai' ? tra.canOnLai(muc.id) : v === tt,
    )
    if (!khop) return false
  }
  if (boLoc.loai.length > 0 && !boLoc.loai.includes(muc.mau)) return false
  if (boLoc.phan.length > 0 && !boLoc.phan.includes(muc.phan.slug)) return false
  if (boLoc.linhVuc.length > 0 && !(muc.linhVuc && boLoc.linhVuc.includes(muc.linhVuc.slug))) {
    return false
  }
  if (boLoc.noiDung.length > 0) {
    const nd = tra.noiDung(muc.id)
    if (!nd || !boLoc.noiDung.includes(nd.loai)) return false
  }
  return true
}

/** Các mục học khớp bộ lọc, theo thứ tự cây. */
export function locMuc(cay: Pick<Cay, 'mucHoc'>, boLoc: BoLoc, tra: TraMuc): MucHoc[] {
  return cay.mucHoc.filter((m) => khopBoLoc(m, boLoc, tra))
}

const soSanhTen = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

/** Lần mở gần nhất (ms); chưa mở / không đọc được → -Infinity. */
function lanMo(luotMo: Readonly<Record<string, string>>, id: string): number {
  const ms = luotMo[id] === undefined ? Number.NaN : Date.parse(luotMo[id])
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms
}

/**
 * Sắp các mục: 'cay' theo thứ tự cây; 'a-z' theo tên (không phân biệt hoa/thường, số theo giá trị), trùng thì theo
 * cây; 'mo-gan-day' mở gần nhất trước, mục chưa mở lần nào đứng sau theo thứ tự cây.
 */
export function sapXepMuc(
  cacMuc: readonly MucHoc[],
  sapXep: SapXep,
  luotMo: Readonly<Record<string, string>> = {},
): MucHoc[] {
  const ds = [...cacMuc]
  if (sapXep === 'a-z') {
    return ds.sort((a, b) => soSanhTen.compare(a.label, b.label) || a.index - b.index)
  }
  if (sapXep === 'mo-gan-day') {
    return ds
      .map((muc) => ({ muc, lan: lanMo(luotMo, muc.id) }))
      .sort((a, b) => (b.lan === a.lan ? a.muc.index - b.muc.index : b.lan - a.lan))
      .map((x) => x.muc)
  }
  return ds.sort((a, b) => a.index - b.index)
}
