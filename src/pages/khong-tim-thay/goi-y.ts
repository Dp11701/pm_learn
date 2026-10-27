// Gợi ý "Có phải bạn muốn mở …?" của trang 404 (§8.10, đề xuất 5): so từng đoạn của đường dẫn sai với
// tên, tên gốc, slug của các nút có trang (mục học, lĩnh vực; phần → Lộ trình dạng danh sách lọc theo phần vì trang
// Phần đã bỏ — đề xuất mục 10) bằng hệ số Dice trên bigram
// của chữ đã gấp (foldVi). Vd. "risk-registr" → 0,87 (đề xuất 0.1).
import type { Cay, Nut } from '../../../shared/roadmap'
import { foldVi } from '../../../shared/tim-kiem'

export const NGUONG_GOI_Y = 0.5
export const SO_GOI_Y_TOI_DA = 3
/** Chỉ giữ gợi ý không kém gợi ý tốt nhất quá khoảng này (bỏ các tên chỉ giống một nửa). */
export const KHOANG_GOI_Y = 0.15

export interface GoiY {
  nut: Nut
  duongDan: string
  /** Dice 0–1 */
  diem: number
}

/** Trang của một nút (phần: danh sách lọc theo phần, như duongDanNut ở trang bài); nhóm chưa có trang riêng. */
export function duongDanCua(nut: Nut): string | undefined {
  switch (nut.kind) {
    case 'topic':
    case 'document':
      return `/hoc/${nut.slug}`
    case 'area':
      return `/linh-vuc/${nut.slug}`
    case 'part':
      return `/lo-trinh?xem=danh-sach&phan=${nut.slug}`
    default:
      return undefined
  }
}

function demBigram(s: string): Map<string, number> {
  const dem = new Map<string, number>()
  for (let i = 0; i < s.length - 1; i++) {
    const bg = s.slice(i, i + 2)
    dem.set(bg, (dem.get(bg) ?? 0) + 1)
  }
  return dem
}

/** Hệ số Dice trên bigram (đa tập) của hai chuỗi đã gấp. */
export function dice(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return a !== '' && a === b ? 1 : 0
  const da = demBigram(a)
  const db = demBigram(b)
  let chung = 0
  for (const [bg, n] of da) chung += Math.min(n, db.get(bg) ?? 0)
  return (2 * chung) / (a.length - 1 + b.length - 1)
}

interface UngVien {
  nut: Nut
  duongDan: string
  /** tên, tên gốc, slug đã gấp */
  ten: string[]
}

const boNho = new WeakMap<Cay, UngVien[]>()

/** Nút có trang riêng, theo thứ tự cây. */
function ungVien(cay: Cay): UngVien[] {
  const daCo = boNho.get(cay)
  if (daCo) return daCo
  const ds: UngVien[] = []
  const duyet = (nut: Nut) => {
    const duongDan = duongDanCua(nut)
    if (duongDan) {
      const ten = [nut.label, nut.labelOriginal, nut.slug].flatMap((t) =>
        t ? [foldVi(t).folded] : [],
      )
      ds.push({ nut, duongDan, ten })
    }
    for (const id of nut.con) {
      const con = cay.nutTheoId.get(id)
      if (con) duyet(con)
    }
  }
  cay.phan.forEach(duyet)
  boNho.set(cay, ds)
  return ds
}

function giaiMa(doan: string): string {
  try {
    return decodeURIComponent(doan)
  } catch {
    return doan
  }
}

/**
 * Tối đa `toiDa` nút gần nhất với đường dẫn: điểm ≥ ngưỡng và không kém điểm cao nhất quá
 * KHOANG_GOI_Y; điểm cao trước, bằng điểm thì theo thứ tự cây. Đường dẫn ≥ 2 đoạn thì bỏ đoạn đầu
 * (tên route như "hoc", "linh-vuc" không phải tên mục).
 */
export function goiYChoDuongDan(
  cay: Cay,
  duongDan: string,
  toiDa = SO_GOI_Y_TOI_DA,
  nguong = NGUONG_GOI_Y,
): GoiY[] {
  const doanTho = duongDan.split('/').filter((d) => d !== '')
  const cacDoan = (doanTho.length >= 2 ? doanTho.slice(1) : doanTho)
    .map((d) => foldVi(giaiMa(d)).folded)
    .filter((d) => d.length >= 2)
  if (cacDoan.length === 0) return []
  const ketQua: GoiY[] = []
  for (const uv of ungVien(cay)) {
    let diem = 0
    for (const doan of cacDoan) for (const ten of uv.ten) diem = Math.max(diem, dice(doan, ten))
    if (diem >= nguong) ketQua.push({ nut: uv.nut, duongDan: uv.duongDan, diem })
  }
  // sort ổn định: bằng điểm thì giữ thứ tự cây
  ketQua.sort((a, b) => b.diem - a.diem)
  const caoNhat = ketQua[0]?.diem ?? 0
  return ketQua.filter((g) => g.diem >= caoNhat - KHOANG_GOI_Y).slice(0, toiDa)
}
