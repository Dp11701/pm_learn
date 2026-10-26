import fs from 'node:fs/promises'
import path from 'node:path'
import { nowIso } from '../../shared/clock.ts'
import type { Cay } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import { docSetting, ghiSetting } from '../db/settings.ts'
import { boSlugCuDangDung, ghiSlugCu } from '../du-lieu/slug-cu.ts'
import { docSo, tangRevisionNoiDung } from '../du-lieu/so-noi-dung.ts'
import { duongDanChuan } from './duong-dan.ts'
import { chayFileOp, taoFileOp, type BuocFile } from './file-ops.ts'
import { giaiDuongDan, nhanThoiDiem } from './ghi-tep.ts'

// Thay file cây (đề xuất 1.3): settings.cay_sha = sha256 của file cây; khác lần trước thì
//  (1) sao lưu (lý do 'thay-cay');
//  (2) file đã nhận có đường dẫn chuẩn đổi (theo id nút) được chuyển qua file_ops (op 'thay-cay', đi qua một
//      thư mục tạm ẩn để đổi chỗ cho nhau cũng được), lưu slug_cu(slug cũ → id) cho mọi nút đổi slug;
//  (3) mục bị bỏ thành mồ côi: dữ liệu và file giữ nguyên, không tính (bất biến 8);
//  (4) banner một lần "Cây roadmap vừa cập nhật: +a mục, −b mục, c mục đổi tên" (settings.thay_cay, web đọc
//      qua /api/meta noiDung.thayCay, tắt bằng POST /api/noi-dung/thay-cay/da-xem).
// Để đếm được, mỗi lần nhận cây app lưu ảnh nút của cây (settings.cay_nut: id → [slug, tên, kind]).

export type AnhCay = Record<string, [slug: string, label: string, kind: string]>

export interface BannerThayCay {
  /** Mục học mới */
  them: number
  /** Mục học bị bỏ (thành mồ côi) */
  bo: number
  /** Mục học còn trong cây nhưng đổi tên */
  doiTen: number
  /** ISO UTC lúc nhận cây mới */
  luc: string
}

export interface KetQuaThayCay {
  ketQua: 'moi' | 'khop' | 'khac'
  banner?: BannerThayCay
  /** Số file đã chuyển chỗ */
  soFileChuyen?: number
  fileOp?: number | null
}

const KHOA_ANH = 'cay_nut'
const KHOA_BANNER = 'thay_cay'
/** Thư mục tạm (ẩn, quét bỏ qua) khi chuyển file lúc thay cây */
export const THU_MUC_TAM_THAY_CAY = '.thay-cay'

const laMucHoc = (kind: string) => kind === 'topic' || kind === 'document'

export function anhCay(cay: Pick<Cay, 'nutTheoId'>): AnhCay {
  const kq: AnhCay = {}
  for (const n of cay.nutTheoId.values()) kq[n.id] = [n.slug, n.label, n.kind]
  return kq
}

function docAnh(db: Db): AnhCay | null {
  const tho = docSetting(db, KHOA_ANH)
  if (!tho) return null
  try {
    return JSON.parse(tho) as AnhCay
  } catch {
    return null
  }
}

export function docBannerThayCay(db: Db): BannerThayCay | null {
  const tho = docSetting(db, KHOA_BANNER)
  if (!tho) return null
  try {
    return JSON.parse(tho) as BannerThayCay
  } catch {
    return null
  }
}

/** Web đã hiện banner: tắt (một lần). */
export function tatBannerThayCay(db: Db): void {
  db.prepare('DELETE FROM settings WHERE key = ?').run(KHOA_BANNER)
}

/** Đếm cho banner. Không có ảnh cây cũ (DB từ phase 2a): đếm theo dữ liệu đang có. */
function demBanner(db: Db, cu: AnhCay | null, cay: Cay): Omit<BannerThayCay, 'luc'> {
  if (cu) {
    const cuMuc = Object.entries(cu).filter(([, v]) => laMucHoc(v[2]))
    const cuId = new Set(cuMuc.map(([id]) => id))
    return {
      them: [...cay.mucTheoId.keys()].filter((id) => !cuId.has(id)).length,
      bo: cuMuc.filter(([id]) => !cay.mucTheoId.has(id)).length,
      doiTen: cuMuc.filter(([id, v]) => {
        const m = cay.mucTheoId.get(id)
        return m !== undefined && m.label !== v[1]
      }).length,
    }
  }
  const idDuLieu = db
    .prepare(
      `SELECT item_id AS id FROM content_files UNION SELECT item_id FROM item_status
       UNION SELECT item_id FROM content_approvals`,
    )
    .all() as { id: string }[]
  const doiTen = docSo(db).filter((d) => {
    const m = d.role === 'bai' ? cay.mucTheoId.get(d.itemId) : undefined
    return m !== undefined && path.posix.basename(d.path, '.md') !== m.slug
  }).length
  return { them: 0, bo: idDuLieu.filter((d) => !cay.nutTheoId.has(d.id)).length, doiTen }
}

/** slug cũ → id cho mọi nút còn trong cây mà đổi slug. */
function slugCuMoi(db: Db, cu: AnhCay | null, cay: Cay): [string, string][] {
  const kq: [string, string][] = []
  if (cu) {
    for (const [id, [slug]] of Object.entries(cu)) {
      const n = cay.nutTheoId.get(id)
      if (n && n.slug !== slug) kq.push([slug, id])
    }
    return kq
  }
  for (const d of docSo(db)) {
    if (d.role !== 'bai') continue
    const m = cay.mucTheoId.get(d.itemId)
    const slug = path.posix.basename(d.path, '.md')
    if (m && slug !== m.slug) kq.push([slug, d.itemId])
  }
  return kq
}

export interface TuyChonThayCay {
  noiDungDir: string
  cay: Cay
  /** sha256 của file cây đang dùng */
  sha: string
  /** Sao lưu trước khi thay (đề xuất 2.3) */
  saoLuuNgay?: (lyDo: string) => Promise<void>
}

/**
 * Kiểm cây lúc khởi động và xử lý thay cây (đề xuất 1.3). Lần đầu: ghi cay_sha + ảnh cây. Cây khớp: chỉ bổ
 * sung ảnh cây nếu thiếu (DB từ 2a). Cây khác: sao lưu → một file_op 'thay-cay' (sổ, slug_cu, settings trong
 * cùng transaction) → chuyển file.
 */
export async function xuLyThayCay(db: Db, tc: TuyChonThayCay): Promise<KetQuaThayCay> {
  const shaCu = docSetting(db, 'cay_sha')
  if (shaCu === null || shaCu === tc.sha) {
    db.transaction(() => {
      if (shaCu === null) ghiSetting(db, 'cay_sha', tc.sha)
      if (shaCu === null || docAnh(db) === null)
        ghiSetting(db, KHOA_ANH, JSON.stringify(anhCay(tc.cay)))
    })()
    return { ketQua: shaCu === null ? 'moi' : 'khop' }
  }

  await tc.saoLuuNgay?.('thay-cay')
  const cu = docAnh(db)
  const luc = nowIso()
  const banner: BannerThayCay = { ...demBanner(db, cu, tc.cay), luc }
  const nhan = nhanThoiDiem()

  const chuyen: { tu: string; den: string; hash: string }[] = []
  const doiDongMat: { tu: string; den: string }[] = []
  for (const d of docSo(db)) {
    if (!tc.cay.nutTheoId.has(d.itemId)) continue // mồ côi: giữ nguyên
    const den = duongDanChuan(tc.cay, d.itemId, d.role)
    if (!den || den === d.path) continue
    if (d.missingSince !== null) doiDongMat.push({ tu: d.path, den })
    else chuyen.push({ tu: d.path, den, hash: d.hash })
  }
  const tam = (i: number) => `${THU_MUC_TAM_THAY_CAY}/${nhan}/${i}.md`
  const buoc: BuocFile[] = [
    ...chuyen.map((c, i) => ({ tu: c.tu, den: tam(i), hashMoi: c.hash })),
    ...chuyen.map((c, i) => ({ tu: tam(i), den: c.den, hashMoi: c.hash })),
  ]
  const thayDoiDb = () => {
    for (const [slug, id] of slugCuMoi(db, cu, tc.cay)) ghiSlugCu(db, slug, id)
    boSlugCuDangDung(db, new Set([...tc.cay.nutTheoId.values()].map((n) => n.slug)))
    const doiDuong = db.prepare('UPDATE OR IGNORE content_files SET path = ? WHERE path = ?')
    for (const x of doiDongMat) doiDuong.run(x.den, x.tu)
    ghiSetting(db, 'cay_sha', tc.sha)
    ghiSetting(db, KHOA_ANH, JSON.stringify(anhCay(tc.cay)))
    ghiSetting(db, KHOA_BANNER, JSON.stringify(banner))
  }

  if (buoc.length === 0) {
    db.transaction(() => {
      thayDoiDb()
      tangRevisionNoiDung(db)
    })()
    return { ketQua: 'khac', banner, soFileChuyen: 0, fileOp: null }
  }
  const id = taoFileOp(db, tc.cay, { op: 'thay-cay', buoc, thayDoiDb })
  await chayFileOp(db, tc.noiDungDir, id)
  await donThuMucTam(tc.noiDungDir, nhan)
  return { ketQua: 'khac', banner, soFileChuyen: chuyen.length, fileOp: id }
}

/** Gỡ thư mục tạm rỗng của lần thay cây (chỉ khi rỗng; không xoá file nào). */
async function donThuMucTam(goc: string, nhan: string): Promise<void> {
  for (const tuongDoi of [`${THU_MUC_TAM_THAY_CAY}/${nhan}`, THU_MUC_TAM_THAY_CAY]) {
    try {
      const p = await giaiDuongDan(goc, `${tuongDoi}/x.md`)
      if (p) await fs.rmdir(p.thuMuc)
    } catch {
      // còn file hoặc không có: để nguyên
    }
  }
}
