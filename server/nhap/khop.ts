import { KHOA_FRONTMATTER, type LoaiFile } from '../../shared/noi-dung/index.ts'
import { taoSlug, type MucHoc, type Nut } from '../../shared/roadmap/index.ts'
import { foldVi } from '../../shared/tim-kiem/index.ts'
import type { CayNoiDung } from '../noi-dung/duong-dan.ts'

// Khớp file nhập với mục (đề xuất 1.7 "Khớp", 0.1 Dice):
//  - id trong frontmatter có trong cây → mục đó (id của phần / lĩnh vực → _tong-quan.md của nút đó);
//  - id lạ → bỏ qua, khớp theo tên, ghi "id không có trong cây";
//  - không id → tên file (bỏ .md, .ban-sua) so với slug, slug tên gốc, slug cũ (sau khi thay cây);
//  - không khớp → Dice bigram (foldVi) với slug và slug tên gốc của mọi mục học: gán sẵn khi cao nhất ≥ 0,7 và
//    hơn ứng viên thứ hai ≥ 0,1; ngược lại tối đa 3 ứng viên ≥ 0,6, không chọn sẵn.
// Chỉ đọc cây lúc chạy (cay.mucTheoId); không có tên / id nút nào trong code.

export const NGUONG_GAN_SAN = 0.7
export const CACH_BIET_GAN_SAN = 0.1
export const NGUONG_UNG_VIEN = 0.6
export const SO_UNG_VIEN = 3

/** Nơi một file nhập có thể vào: bài của mục học, hoặc _tong-quan.md của phần / lĩnh vực. */
export interface Dich {
  id: string
  slug: string
  label: string
  vai: 'bai' | 'tong-quan'
  /** Mục học (vai bai); null với tổng quan */
  muc: MucHoc | null
  /** loai frontmatter mà file của đích phải ghi */
  loaiMau: LoaiFile
  /** Thứ tự cây (để sắp ứng viên cùng điểm) */
  thuTu: number
}

interface BangKhop {
  dichTheoId: Map<string, Dich>
  /** Mục học theo thứ tự cây */
  mucHoc: Dich[]
  /** slug hiện tại / slug tên gốc → mục học (slug tên gốc trùng slug của mục khác thì bỏ) */
  theoSlug: Map<string, Dich>
  /** Tên đã gấp của từng mục học để so Dice: slug, slug tên gốc */
  tenGap: Map<string, string[]>
}

const dem = new WeakMap<object, BangKhop>()

function dichMuc(muc: MucHoc): Dich {
  return {
    id: muc.id,
    slug: muc.slug,
    label: muc.label,
    vai: 'bai',
    muc,
    loaiMau: muc.mau,
    thuTu: muc.index,
  }
}

function dichNut(nut: Nut, thuTu: number): Dich {
  return {
    id: nut.id,
    slug: nut.slug,
    label: nut.label,
    vai: 'tong-quan',
    muc: null,
    loaiMau: 'tong-quan',
    thuTu,
  }
}

function dung(cay: CayNoiDung): BangKhop {
  const dichTheoId = new Map<string, Dich>()
  const mucHoc: Dich[] = []
  for (const muc of cay.mucTheoId.values()) {
    for (const nut of [muc.phan, muc.linhVuc]) {
      if (nut && !dichTheoId.has(nut.id)) dichTheoId.set(nut.id, dichNut(nut, muc.index - 0.5))
    }
    const d = dichMuc(muc)
    dichTheoId.set(muc.id, d)
    mucHoc.push(d)
  }
  mucHoc.sort((a, b) => a.thuTu - b.thuTu)
  const theoSlug = new Map<string, Dich>()
  for (const d of mucHoc) theoSlug.set(d.slug, d)
  const tenGap = new Map<string, string[]>()
  for (const d of mucHoc) {
    const goc = d.muc?.labelOriginal ? taoSlug(d.muc.labelOriginal) : ''
    if (goc && !theoSlug.has(goc)) theoSlug.set(goc, d)
    const ten = [foldVi(d.slug).folded]
    if (goc) ten.push(foldVi(goc).folded)
    tenGap.set(d.id, [...new Set(ten)])
  }
  return { dichTheoId, mucHoc, theoSlug, tenGap }
}

function bang(cay: CayNoiDung): BangKhop {
  let b = dem.get(cay.mucTheoId)
  if (!b) {
    b = dung(cay)
    dem.set(cay.mucTheoId, b)
  }
  return b
}

/** Đích theo id nút (mục học → bai; phần / lĩnh vực → tong-quan). */
export function dichTheoId(cay: CayNoiDung, id: string): Dich | undefined {
  return bang(cay).dichTheoId.get(id)
}

/** Đích là mục học theo id (Gán cho mục…, ?muc=). */
export function mucHocTheoId(cay: CayNoiDung, id: string): Dich | undefined {
  const d = bang(cay).dichTheoId.get(id)
  return d?.vai === 'bai' ? d : undefined
}

/** Tên file bỏ ".md" và ".ban-sua" (1.7). */
export function tenGocTep(ten: string): string {
  return ten.replace(/\.md$/, '').replace(/\.ban-sua$/, '')
}

/** Tên bắt đầu bằng "_": file riêng của app (_tong-quan.md, _lo-trinh-goi-y.md), không khớp theo tên. */
export function laTepRieng(ten: string): boolean {
  return ten.startsWith('_')
}

/**
 * Khớp tên file với mục học: slug, slug tên gốc (`steering-comittee.md`), rồi slug cũ (bảng slug_cu).
 * @param slugCu { slug cũ: id nút }
 */
export function khopTen(
  cay: CayNoiDung,
  ten: string,
  slugCu: Readonly<Record<string, string>>,
): Dich | undefined {
  if (laTepRieng(ten)) return undefined
  const s = taoSlug(tenGocTep(ten))
  if (!s) return undefined
  const b = bang(cay)
  const theoSlug = b.theoSlug.get(s)
  if (theoSlug) return theoSlug
  const id = Object.hasOwn(slugCu, s) ? slugCu[s] : undefined
  return id === undefined ? undefined : mucHocTheoId(cay, id)
}

function demBigram(s: string): Map<string, number> {
  const kq = new Map<string, number>()
  for (let i = 0; i < s.length - 1; i++) {
    const bg = s.slice(i, i + 2)
    kq.set(bg, (kq.get(bg) ?? 0) + 1)
  }
  return kq
}

/** Hệ số Dice trên bigram (đa tập) của hai chuỗi đã gấp (đề xuất 0.1: risk registr → risk register 0,87). */
export function dice(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return a !== '' && a === b ? 1 : 0
  const da = demBigram(a)
  const db = demBigram(b)
  let chung = 0
  for (const [bg, n] of da) chung += Math.min(n, db.get(bg) ?? 0)
  return (2 * chung) / (a.length - 1 + b.length - 1)
}

export interface DiemDich {
  dich: Dich
  diem: number
}

/** Điểm Dice của tên file với mọi mục học (cao → thấp, cùng điểm theo thứ tự cây); bỏ điểm 0. */
export function chamDiem(cay: CayNoiDung, ten: string): DiemDich[] {
  if (laTepRieng(ten)) return []
  const f = foldVi(tenGocTep(ten)).folded
  if (f === '') return []
  const b = bang(cay)
  const kq: DiemDich[] = []
  for (const d of b.mucHoc) {
    let diem = 0
    for (const t of b.tenGap.get(d.id) ?? []) diem = Math.max(diem, dice(f, t))
    if (diem > 0) kq.push({ dich: d, diem })
  }
  return kq.sort((x, y) => y.diem - x.diem || x.dich.thuTu - y.dich.thuTu)
}

/** Gán sẵn khi cao nhất ≥ 0,7 và hơn ứng viên thứ hai ≥ 0,1 (1.7). */
export function ganSanTheoDiem(ds: readonly DiemDich[]): DiemDich | undefined {
  const [nhat, nhi] = ds
  if (!nhat || nhat.diem < NGUONG_GAN_SAN) return undefined
  // So trên số đã làm tròn 1e-9 để 0,7 − 0,6 không hụt vì dấu phẩy động
  if (nhi && Math.round((nhat.diem - nhi.diem) * 1e9) < Math.round(CACH_BIET_GAN_SAN * 1e9)) {
    return undefined
  }
  return nhat
}

/** Tối đa 3 ứng viên ≥ 0,6 (1.7), trừ các id trong `bo`. */
export function ungVienTheoDiem(ds: readonly DiemDich[], bo: ReadonlySet<string> = new Set()) {
  return ds.filter((x) => x.diem >= NGUONG_UNG_VIEN && !bo.has(x.dich.id)).slice(0, SO_UNG_VIEN)
}

/**
 * id trong frontmatter đọc nhẹ (không qua bộ đọc YAML) — cho file lỗi frontmatter: dòng `id: …` giữa hai dòng
 * `---` đầu file.
 */
export function idDocNhe(text: string): string | undefined {
  const dong = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  if (dong[0]?.trimEnd() !== '---') return undefined
  for (let i = 1; i < dong.length; i++) {
    const d = dong[i].trimEnd()
    if (d === '---' || d === '...') return undefined
    const m = /^id:\s*(.*)$/.exec(d)
    if (m) {
      const gt = m[1].replace(/\s+#.*$/, '').trim()
      return gt.replace(/^(['"])(.*)\1$/, '$2') || undefined
    }
  }
  return undefined
}

/**
 * Dòng `khoá giá trị` (quên dấu :) với khoá frontmatter app hiểu → tên khoá; để thay câu "lỗi cú pháp YAML"
 * bằng câu cụ thể của F22 (thiếu dấu ":" sau loai).
 */
export function khoaThieuHaiCham(dong: string | undefined): string | undefined {
  if (dong === undefined || dong.includes(':')) return undefined
  const m = /^([a-z_]+)\s+\S/.exec(dong)
  return m && (KHOA_FRONTMATTER as readonly string[]).includes(m[1]) ? m[1] : undefined
}
