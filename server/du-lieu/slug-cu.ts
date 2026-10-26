import type { Db } from '../db/index.ts'

// slug_cu (đề xuất 1.3, 1.5, 2.1): slug cũ của nút đã đổi slug khi thay file cây → id nút, để link cũ và
// lien_quan / process_group cũ vẫn tra được (thứ tự tra: slug hiện tại → slug_cu → slug tên gốc → id).

export function traSlugCu(db: Db, slug: string): string | undefined {
  const dong = db.prepare('SELECT item_id AS id FROM slug_cu WHERE slug = ?').get(slug) as
    { id: string } | undefined
  return dong?.id
}

/** Toàn bộ bảng { slug cũ: id nút } (vài chục dòng). */
export function docSlugCu(db: Db): Record<string, string> {
  const ds = db.prepare('SELECT slug, item_id AS id FROM slug_cu ORDER BY slug').all() as {
    slug: string
    id: string
  }[]
  return Object.fromEntries(ds.map((d) => [d.slug, d.id]))
}

/** Ghi / thay một slug cũ. Gọi trong transaction của thao tác thay cây. */
export function ghiSlugCu(db: Db, slug: string, itemId: string): void {
  db.prepare(
    `INSERT INTO slug_cu (slug, item_id) VALUES (?, ?)
     ON CONFLICT(slug) DO UPDATE SET item_id = excluded.item_id`,
  ).run(slug, itemId)
}

/** Bỏ các slug cũ đã thành slug hiện tại của một nút (slug hiện tại luôn thắng). */
export function boSlugCuDangDung(db: Db, slugHienTai: ReadonlySet<string>): void {
  const xoa = db.prepare('DELETE FROM slug_cu WHERE slug = ?')
  for (const slug of Object.keys(docSlugCu(db))) if (slugHienTai.has(slug)) xoa.run(slug)
}
