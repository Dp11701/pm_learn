import { taoSlug } from '../roadmap/slug'
import type { Cay, MucHoc } from '../roadmap/types'

// Tra giá trị của lien_quan / process_group / Phủ roadmap sang mục học (đề xuất 1.5):
// slug hiện tại → slug cũ (bảng slug_cu, do server cung cấp) → slug của tên gốc → id.

/** Tra slug cũ (slug_cu) → id mục; không có thì undefined. */
export type TraSlugCu = (slug: string) => string | undefined

const slugTenGocCuaCay = new WeakMap<Cay, Map<string, MucHoc>>()

function slugTenGoc(cay: Cay): Map<string, MucHoc> {
  let bang = slugTenGocCuaCay.get(cay)
  if (!bang) {
    bang = new Map()
    for (const m of cay.mucHoc) if (m.labelOriginal) bang.set(taoSlug(m.labelOriginal), m)
    slugTenGocCuaCay.set(cay, bang)
  }
  return bang
}

/** Một giá trị (slug hoặc id) → mục học; không tra được thì undefined. */
export function traMucLienQuan(
  cay: Cay,
  giaTri: string,
  traSlugCu?: TraSlugCu,
): MucHoc | undefined {
  const x = giaTri.trim()
  if (x === '') return undefined
  const theoSlug = cay.mucTheoSlug.get(x) ?? cay.mucTheoSlug.get(x.toLowerCase())
  if (theoSlug) return theoSlug
  const idCu = traSlugCu?.(x)
  if (idCu !== undefined) {
    const m = cay.mucTheoId.get(idCu)
    if (m) return m
  }
  return slugTenGoc(cay).get(x.toLowerCase()) ?? cay.mucTheoId.get(x)
}

/**
 * Cả danh sách: mục tra được (bỏ trùng, giữ thứ tự, bỏ chính mục đang xem nếu có) và giá trị
 * không tra được (trình soạn báo TB.lienQuanKhongThay, trang bài bỏ qua).
 */
export function giaiLienQuan(
  cay: Cay,
  ds: readonly string[],
  tuyChon: { traSlugCu?: TraSlugCu; boId?: string } = {},
): { muc: MucHoc[]; khongThay: string[] } {
  const muc: MucHoc[] = []
  const khongThay: string[] = []
  const daCo = new Set<string>()
  for (const giaTri of ds) {
    const m = traMucLienQuan(cay, giaTri, tuyChon.traSlugCu)
    if (!m) {
      khongThay.push(giaTri)
      continue
    }
    if (m.id === tuyChon.boId || daCo.has(m.id)) continue
    daCo.add(m.id)
    muc.push(m)
  }
  return { muc, khongThay }
}
