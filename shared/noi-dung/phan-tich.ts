import type { MucHoc } from '../roadmap/types'
import { chuanHoaTieuDe } from './chuan-hoa'
import {
  docFrontmatter,
  sapTheoDong,
  type Frontmatter,
  type KetQuaFrontmatter,
} from './frontmatter'
import { MAU_BAI, TEN_KHOI_APP, cacTen, type KhoiMau } from './mau-bai'
import {
  docCauTruc,
  ghepDoan,
  quaRao,
  tieuDeCap,
  type CauTrucKhoi,
  type DoanTho,
  type Dong,
} from './quy-uoc'
import { TB, type CanhBao, type LoiDong } from './thong-bao'

// Đọc một file bài của mục học (đề xuất 1.5): frontmatter + các khối ## theo mẫu của mục.
// Không bỏ sót chữ nào: khối lạ, khối trùng, chữ trước ## đầu tiên đều được giữ kèm cảnh báo;
// chữ trong khối do app tạo bị bỏ qua nhưng có cảnh báo và nằm trong khoiBoQua.

export interface Khoi {
  /** Khối mẫu khớp tiêu đề; null = khối không có trong mẫu */
  mau: KhoiMau | null
  /** Tiêu đề như viết trong file (đã bỏ khoảng trắng hai đầu) */
  tieuDe: string
  /** Dòng tiêu đề ## */
  dong: number
  /** Markdown của khối (sau dòng ##, bỏ dòng trống hai đầu) */
  noiDung: string
  /** Dòng đầu của noiDung (khối trống: dòng ngay dưới tiêu đề) */
  dongNoiDung: number
  /** Lần thứ 2 trở đi của cùng một khối mẫu */
  trung: boolean
  /** Có chữ ngoài các dòng tiêu đề */
  coChu: boolean
  /** Có cảnh báo mức 'loi' trong khối (không tính vào Đủ khối) */
  coLoi: boolean
  /** Cấu trúc theo quy ước của khối; null với khối văn bản thường, khối lạ, khối trống */
  cauTruc: CauTrucKhoi | null
}

/**
 * Một ô trong bố cục bài, theo thứ tự hiện: các khối của mẫu (gồm khối do app tạo, đúng vị trí),
 * sau đó từng khối lạ.
 *  - 'noi-dung': có chữ → hiện khoi (khối trùng hiện cả hai)
 *  - 'chua-co': khối ★ chưa có chữ → ô nét đứt "Chưa có …"
 *  - 'an': khối tuỳ chọn trống → ẩn
 *  - 'app': khối do app tạo (Nói lại, Bản của tôi, Kế hoạch thi, Mục liên quan…)
 */
export interface OBoCuc {
  mau: KhoiMau | null
  khoi: Khoi[]
  hien: 'noi-dung' | 'chua-co' | 'an' | 'app'
}

export interface KetQuaBai {
  /** null khi frontmatter lỗi (loi khác null) */
  frontmatter: Frontmatter | null
  /** Khối của file: theo thứ tự mẫu (khối trùng ngay sau khối đầu), rồi khối lạ theo thứ tự file */
  khoi: Khoi[]
  boCuc: OBoCuc[]
  /** Khối mang tên khối do app tạo: chữ bị bỏ qua (có cảnh báo) */
  khoiBoQua: Khoi[]
  /** Chữ trước ## đầu tiên (hiện ở đầu bài, có cảnh báo) */
  dauBai: DoanTho | null
  /** Cảnh báo và lỗi không chặn, theo thứ tự dòng */
  canhBao: CanhBao[]
  /** Lỗi frontmatter: bài vẫn hiện trạng thái học, đồng hồ, ghi chú + banner lỗi đọc file (F26) */
  loi: LoiDong | null
  /** Khối ★ đúng tiêu đề, có chữ, không lỗi / số khối ★ của mẫu (9 / 8 / 7) */
  duKhoi: { co: number; tong: number }
}

const TIEU_DE_BAT_KY = /^ {0,3}#{1,6}(?:[ \t]|$)/
const DONG_TRONG = /^\s*$/

interface PhanTho {
  tieuDe: string
  dong: number
  than: Dong[]
}

/** Tách thân bài theo dòng ## (bỏ qua ## trong khối mã). */
function tachKhoi(dong: readonly Dong[]): { truoc: Dong[]; phan: PhanTho[] } {
  const truoc: Dong[] = []
  const phan: PhanTho[] = []
  let rao: string | null = null
  for (const d of dong) {
    const dangMo = rao
    rao = quaRao(d.chu, rao)
    const tieuDe = dangMo === null && rao === null ? tieuDeCap(d.chu, 2) : null
    if (tieuDe !== null) {
      phan.push({ tieuDe, dong: d.so, than: [] })
      continue
    }
    const cuoi = phan.at(-1)
    if (cuoi) cuoi.than.push(d)
    else truoc.push(d)
  }
  return { truoc, phan }
}

function coChuThat(dong: readonly Dong[]): boolean {
  return dong.some((d) => !DONG_TRONG.test(d.chu) && !TIEU_DE_BAT_KY.test(d.chu))
}

const KHOA_APP = new Set(TEN_KHOI_APP.map(chuanHoaTieuDe))

/**
 * Frontmatter của file bài theo mẫu bài của mục: như docFrontmatter, thêm lỗi khi loai khác mẫu (frontmatter
 * thành null). Dùng chung cho phanTichBai và chỗ chỉ cần trạng thái nội dung (không đọc thân bài).
 */
export function docFrontmatterCuaMuc(text: string, muc: MucHoc): KetQuaFrontmatter {
  const fm = docFrontmatter(text)
  const loaiMau = MAU_BAI[muc.mau].loai
  if (fm.frontmatter && fm.frontmatter.loai !== loaiMau) {
    const loi = {
      dong: fm.frontmatter.dongKhoa.loai ?? 1,
      thongBao: TB.loaiKhacMau(fm.frontmatter.loai, loaiMau),
    }
    return { ...fm, frontmatter: null, loi }
  }
  return fm
}

/** Đọc file bài của một mục học theo mẫu bài của mục. */
export function phanTichBai(text: string, muc: MucHoc): KetQuaBai {
  const mau = MAU_BAI[muc.mau]
  const fm = docFrontmatterCuaMuc(text, muc)
  const canhBao: CanhBao[] = [...fm.canhBao]
  const { loi, frontmatter } = fm
  if (frontmatter?.id !== undefined && frontmatter.id !== muc.id) {
    canhBao.push({
      dong: frontmatter.dongKhoa.id ?? 1,
      thongBao: TB.idKhacMuc(frontmatter.id),
      muc: 'canh-bao',
    })
  }

  const dong = fm.dongThan.map((chu, i) => ({ so: fm.dongDauThan + i, chu }))
  const { truoc, phan } = tachKhoi(dong)

  const dauBai = ghepDoan(truoc)
  if (dauBai) canhBao.push({ dong: dauBai.dong, thongBao: TB.chuTruocKhoiDau, muc: 'canh-bao' })

  const khoiTheoChuan = new Map<string, KhoiMau>()
  for (const k of mau.khoi) {
    if (k.nguon === 'file') for (const ten of cacTen(k)) khoiTheoChuan.set(chuanHoaTieuDe(ten), k)
  }
  const thuTu = new Map(mau.khoi.map((k, i) => [k.id, i]))

  const khoi: Khoi[] = []
  const khoiBoQua: Khoi[] = []
  const dauTien = new Map<string, Khoi>()
  for (const p of phan) {
    const chuan = chuanHoaTieuDe(p.tieuDe)
    const doan = ghepDoan(p.than)
    const coChu = coChuThat(p.than)
    const k: Khoi = {
      mau: null,
      tieuDe: p.tieuDe,
      dong: p.dong,
      noiDung: doan?.noiDung ?? '',
      dongNoiDung: doan?.dong ?? p.dong + 1,
      trung: false,
      coChu,
      coLoi: false,
      cauTruc: null,
    }
    if (KHOA_APP.has(chuan)) {
      canhBao.push({ dong: p.dong, thongBao: TB.khoiApp(p.tieuDe), muc: 'canh-bao' })
      khoiBoQua.push(k)
      continue
    }
    const km = khoiTheoChuan.get(chuan)
    if (!km) {
      canhBao.push({ dong: p.dong, thongBao: TB.khoiLa(p.tieuDe), muc: 'canh-bao' })
      khoi.push(k)
      continue
    }
    k.mau = km
    const dau = dauTien.get(km.id)
    if (dau) {
      k.trung = true
      canhBao.push({
        dong: p.dong,
        thongBao: TB.khoiTrung(
          p.tieuDe,
          dau.tieuDe,
          dau.dong,
          chuanHoaTieuDe(dau.tieuDe) === chuan,
        ),
        muc: 'canh-bao',
        khoi: km.id,
      })
    } else {
      dauTien.set(km.id, k)
    }
    if (coChu) {
      const cuaKhoi: CanhBao[] = []
      k.cauTruc = docCauTruc(km, p.than, cuaKhoi)
      k.coLoi = cuaKhoi.some((c) => c.muc === 'loi')
      canhBao.push(...cuaKhoi)
    }
    khoi.push(k)
  }

  const viTri = (k: Khoi) => (k.mau ? (thuTu.get(k.mau.id) ?? Infinity) : Infinity)
  const khoiSap = khoi
    .map((k, i) => [k, i] as const)
    .sort((a, b) => viTri(a[0]) - viTri(b[0]) || a[1] - b[1])
    .map(([k]) => k)

  const boCuc: OBoCuc[] = mau.khoi.map((km) => {
    if (km.nguon === 'app') return { mau: km, khoi: [], hien: 'app' }
    const cua = khoiSap.filter((k) => k.mau?.id === km.id)
    const hien = cua.some((k) => k.coChu) ? 'noi-dung' : km.batBuoc ? 'chua-co' : 'an'
    return { mau: km, khoi: cua, hien }
  })
  for (const k of khoiSap) {
    if (!k.mau) boCuc.push({ mau: null, khoi: [k], hien: k.coChu ? 'noi-dung' : 'an' })
  }

  const co = mau.khoi.filter(
    (km) =>
      km.batBuoc &&
      (km.nguon === 'app' || khoiSap.some((k) => k.mau?.id === km.id && k.coChu && !k.coLoi)),
  ).length

  return {
    frontmatter,
    khoi: khoiSap,
    boCuc,
    khoiBoQua,
    dauBai,
    canhBao: sapTheoDong(canhBao),
    loi,
    duKhoi: { co, tong: mau.tongBatBuoc },
  }
}
