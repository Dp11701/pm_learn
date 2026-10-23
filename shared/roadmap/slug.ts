import { LoiCay } from './loi'

// Quy tắc slug (đề xuất 1.3).

/** Slug gốc của một tên: đ→d, bỏ dấu, chữ thường, xoá ' ’ ®, mỗi chuỗi ký tự khác [a-z0-9] thành '-'. */
export function taoSlug(ten: string): string {
  return ten
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’®]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export interface NutCanSlug {
  id: string
  label: string
  /** Tên các nút tổ tiên, cha trực tiếp trước, phần sau cùng */
  toTien: readonly string[]
}

/**
 * Slug duy nhất cho mọi nút (id → slug). Trùng thì mọi nút trong cụm trùng gắn thêm
 * "-<slug cha trực tiếp>", vẫn trùng thì gắn tiếp cấp trên. Hết tổ tiên mà vẫn trùng → LoiCay.
 */
export function ganSlug(cacNut: readonly NutCanSlug[]): Map<string, string> {
  const tam = cacNut.map((nut) => {
    const slug = taoSlug(nut.label)
    if (!slug) throw new LoiCay(`Tên “${nut.label}” không tạo được slug.`)
    return { nut, slug, toTien: nut.toTien.map(taoSlug), daGan: 0 }
  })

  for (;;) {
    const theoSlug = new Map<string, typeof tam>()
    for (const t of tam) {
      const cum = theoSlug.get(t.slug)
      if (cum) cum.push(t)
      else theoSlug.set(t.slug, [t])
    }
    const cacCum = [...theoSlug.values()].filter((cum) => cum.length > 1)
    if (cacCum.length === 0) break

    for (const cum of cacCum) {
      for (const t of cum) {
        if (t.daGan >= t.toTien.length) {
          throw new LoiCay(`Không tạo được slug riêng cho “${t.nut.label}” (trùng “${t.slug}”).`)
        }
        t.slug = `${t.slug}-${t.toTien[t.daGan]}`
        t.daGan++
      }
    }
  }

  return new Map(tam.map((t) => [t.nut.id, t.slug]))
}
