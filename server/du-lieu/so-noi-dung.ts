import { homNay } from '../../shared/clock.ts'
import type { Db } from '../db/index.ts'
import { docSetting, ghiSetting } from '../db/settings.ts'

// Sổ nội dung (content_files, đề xuất 1.6, 2.1): file .md nào trong thư mục nội dung là của mục nào. Từ phase
// 2b, bài học chỉ đọc file ĐÃ NHẬN (có dòng trong sổ); file khác là "file chưa nhận" tới khi Nhập / Quét lại.
// Đường dẫn tương đối tính từ gốc thư mục nội dung, ngăn bằng '/'. Mỗi mục tối đa một file mỗi vai.

export const CAC_VAI_TEP = ['bai', 'ban-sua', 'tong-quan', 'lo-trinh'] as const
/** bai = <slug>.md; ban-sua = <slug>.ban-sua.md; tong-quan = _tong-quan.md của lĩnh vực / phần; lo-trinh (P1) */
export type VaiTep = (typeof CAC_VAI_TEP)[number]

export interface DongSo {
  /** Đường dẫn tương đối trong thư mục nội dung (dấu /) */
  path: string
  /** id nút: mục học (bai, ban-sua) hoặc lĩnh vực / phần (tong-quan) */
  itemId: string
  role: VaiTep
  /** sha256 hex của toàn file (lần thấy gần nhất) */
  hash: string
  size: number
  /** mtimeMs lần stat gần nhất; null = chưa stat (vừa ghi qua file_ops) */
  mtime: number | null
  /** YYYY-MM-DD */
  importedOn: string
  /** ISO UTC lúc quét nhẹ thấy file mất; null = file còn */
  missingSince: string | null
}

const COT = `path, item_id AS itemId, role, hash, size, mtime, imported_on AS importedOn,
  missing_since AS missingSince`

export function docSo(db: Db): DongSo[] {
  return db.prepare(`SELECT ${COT} FROM content_files ORDER BY path`).all() as DongSo[]
}

export function docDongSo(db: Db, duongDan: string): DongSo | undefined {
  return db.prepare(`SELECT ${COT} FROM content_files WHERE path = ?`).get(duongDan) as
    DongSo | undefined
}

/** File đã nhận của một mục theo vai (mặc định bài chính). */
export function docTepCuaMuc(db: Db, itemId: string, vai: VaiTep = 'bai'): DongSo | undefined {
  return db
    .prepare(`SELECT ${COT} FROM content_files WHERE item_id = ? AND role = ?`)
    .get(itemId, vai) as DongSo | undefined
}

/** Mọi dòng của một vai, khoá theo id nút. */
export function docSoTheoVai(db: Db, vai: VaiTep): Map<string, DongSo> {
  const ds = db
    .prepare(`SELECT ${COT} FROM content_files WHERE role = ? ORDER BY path`)
    .all(vai) as DongSo[]
  return new Map(ds.map((d) => [d.itemId, d]))
}

/**
 * Ghi (thêm / thay) dòng sổ ở `path`. Dòng khác cùng (item_id, role) ở đường dẫn khác bị gỡ (mỗi mục một
 * file mỗi vai). Gọi trong transaction của thao tác.
 */
export function ghiDongSo(db: Db, dong: DongSo): void {
  db.prepare('DELETE FROM content_files WHERE item_id = ? AND role = ? AND path <> ?').run(
    dong.itemId,
    dong.role,
    dong.path,
  )
  db.prepare(
    `INSERT INTO content_files (path, item_id, role, hash, size, mtime, imported_on, missing_since)
     VALUES (@path, @itemId, @role, @hash, @size, @mtime, @importedOn, @missingSince)
     ON CONFLICT(path) DO UPDATE SET item_id = excluded.item_id, role = excluded.role,
       hash = excluded.hash, size = excluded.size, mtime = excluded.mtime,
       imported_on = excluded.imported_on, missing_since = excluded.missing_since`,
  ).run(dong)
}

export function xoaDongSo(db: Db, duongDan: string): void {
  db.prepare('DELETE FROM content_files WHERE path = ?').run(duongDan)
}

/** Cập nhật hash / size / mtime sau khi stat (file còn: bỏ dấu mất). */
export function capNhatStat(
  db: Db,
  duongDan: string,
  st: { hash: string; size: number; mtime: number | null },
): void {
  db.prepare(
    'UPDATE content_files SET hash = ?, size = ?, mtime = ?, missing_since = NULL WHERE path = ?',
  ).run(st.hash, st.size, st.mtime, duongDan)
}

export function danhDauMat(db: Db, duongDan: string, luc: string): void {
  db.prepare(
    'UPDATE content_files SET missing_since = ? WHERE path = ? AND missing_since IS NULL',
  ).run(luc, duongDan)
}

/** Ngày nhập cho dòng mới: giữ ngày của dòng cũ cùng mục + vai nếu có, không thì hôm nay. */
export function ngayNhapCho(db: Db, itemId: string, vai: VaiTep, duongDan: string): string {
  return (
    docDongSo(db, duongDan)?.importedOn ?? docTepCuaMuc(db, itemId, vai)?.importedOn ?? homNay()
  )
}

// ---------- Revision nội dung ----------
// Tách khỏi `revision` của dữ liệu học (settings.revision): tăng khi sổ, bản chụp duyệt hay file trên đĩa đổi
// (ghi qua app hoặc quét nhẹ thấy đổi). /api/meta trả trong noiDung.revision.

const KHOA_REVISION = 'revision_noi_dung'

export function layRevisionNoiDung(db: Db): number {
  return Number(docSetting(db, KHOA_REVISION) ?? 0)
}

/** Gọi cùng transaction với thay đổi. */
export function tangRevisionNoiDung(db: Db): number {
  const dong = db
    .prepare(
      `INSERT INTO settings (key, value) VALUES ('${KHOA_REVISION}', '1')
       ON CONFLICT(key) DO UPDATE SET value = CAST(value AS INTEGER) + 1
       RETURNING value`,
    )
    .get() as { value: string | number }
  return Number(dong.value)
}

// ---------- Khởi tạo sổ ----------

/** settings.so_noi_dung: 'can-khoi-tao' (DB nâng từ 2a) → lượt quét nhẹ đầu nhận file ở đường dẫn chuẩn */
export type TrangThaiKhoiTao = 'can-khoi-tao' | 'da-khoi-tao' | null

export function docKhoiTao(db: Db): TrangThaiKhoiTao {
  const v = docSetting(db, 'so_noi_dung')
  return v === 'can-khoi-tao' || v === 'da-khoi-tao' ? v : null
}

export function ghiDaKhoiTao(db: Db): void {
  ghiSetting(db, 'so_noi_dung', 'da-khoi-tao')
}
