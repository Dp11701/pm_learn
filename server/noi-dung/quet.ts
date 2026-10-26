import fsSync, { type Dirent } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { homNay, nowIso } from '../../shared/clock.ts'
import type { Db } from '../db/index.ts'
import {
  capNhatStat,
  danhDauMat,
  docKhoiTao,
  docSo,
  docTepCuaMuc,
  ghiDaKhoiTao,
  ghiDongSo,
  type DongSo,
  type VaiTep,
} from '../du-lieu/so-noi-dung.ts'
import { bamNoiDung } from './bam.ts'
import { khoaDuongDan, thuMucQuetNhe, viTriChuanCua, type CayNoiDung } from './duong-dan.ts'
import { LoiTep, bamTep, giaiDuongDan, tachDuongDan } from './ghi-tep.ts'
import { TB_ND } from './thong-bao.ts'

// Đồng bộ thư mục nội dung với sổ (đề xuất 1.6 "Đồng bộ"). Không dùng fs.watch.
//  - Quét nhẹ (quetNhe): readdir gốc + thư mục mọi phần / lĩnh vực, lstat các .md (không đệ quy sâu hơn,
//    bỏ tên bắt đầu bằng . hoặc ~, bỏ symlink); file đã nhận đổi mtime / size mới băm lại (Quét lại: băm lại
//    hết — bamLai); file đã nhận không còn → đánh dấu mất (mục về Chưa có nếu là bản nháp; bài đã duyệt hiện
//    bản chụp); file khác = chưa nhận.
//  - Quét sâu (quetSau, cho Quét lại): mọi .md tới 3 cấp thư mục, tối đa 2.000 file, vượt thì báo lỗi.
//  - Gốc (thư mục nội dung) không có / không đọc được: không đánh dấu gì (ổ ngoài chưa gắn ≠ mọi file bị xoá).
// So tên không phân biệt hoa thường (APFS).

export const TOI_DA_CAP_QUET = 3
export const TOI_DA_FILE_QUET = 2000

/** Tên bỏ qua khi quét (đề xuất 1.6): file / thư mục bắt đầu bằng . hoặc ~ (gồm .thung-rac) */
export function boQuaTen(ten: string): boolean {
  return ten.startsWith('.') || ten.startsWith('~')
}

export function laTepMd(ten: string): boolean {
  return ten.endsWith('.md') && !boQuaTen(ten)
}

function maLoi(loi: unknown): string | undefined {
  return (loi as NodeJS.ErrnoException | null)?.code
}

/**
 * Thư mục nội dung có dùng được không: 'khong-co' khi không có / không phải thư mục (đổi tên, ổ ngoài chưa gắn,
 * NOI_DUNG_DIR sai), 'khong-doc-duoc' khi thiếu quyền đọc / duyệt.
 */
export async function trangThaiGoc(goc: string): Promise<'co' | 'khong-co' | 'khong-doc-duoc'> {
  try {
    const that = await fs.realpath(goc)
    if (!(await fs.stat(that)).isDirectory()) return 'khong-co'
    await fs.access(that, fsSync.constants.R_OK | fsSync.constants.X_OK)
    return 'co'
  } catch (loi) {
    const ma = maLoi(loi)
    if (ma === 'ENOENT' || ma === 'ENOTDIR') return 'khong-co'
    if (ma === 'EACCES' || ma === 'EPERM') return 'khong-doc-duoc'
    throw loi
  }
}

/** readdir một thư mục trong gốc mà không đi qua symlink; null khi không có / không phải thư mục thật. */
async function docThuMuc(goc: string, tuongDoi: string): Promise<Dirent[] | null> {
  let hienTai: string
  try {
    hienTai = await fs.realpath(goc)
  } catch {
    return null
  }
  for (const ten of tuongDoi === '' ? [] : tuongDoi.split('/')) {
    hienTai = path.join(hienTai, ten)
    try {
      const st = await fs.lstat(hienTai)
      if (!st.isDirectory()) return null
    } catch (loi) {
      if (maLoi(loi) === 'ENOENT' || maLoi(loi) === 'ENOTDIR') return null
      throw loi
    }
  }
  try {
    return await fs.readdir(hienTai, { withFileTypes: true })
  } catch (loi) {
    if (maLoi(loi) === 'ENOENT' || maLoi(loi) === 'ENOTDIR') return null
    throw loi
  }
}

interface StatTep {
  size: number
  mtime: number
}

async function statTep(goc: string, tuongDoi: string): Promise<StatTep | null> {
  try {
    const p = await giaiDuongDan(goc, tuongDoi)
    if (!p) return null
    const st = await fs.lstat(p.tep)
    return st.isFile() ? { size: st.size, mtime: st.mtimeMs } : null
  } catch (loi) {
    if (loi instanceof LoiTep || maLoi(loi) === 'ENOENT' || maLoi(loi) === 'ENOTDIR') return null
    throw loi
  }
}

async function bamTuongDoi(goc: string, tuongDoi: string): Promise<string | null> {
  try {
    const p = await giaiDuongDan(goc, tuongDoi)
    return p ? await bamTep(p.tep) : null
  } catch (loi) {
    if (loi instanceof LoiTep) return null
    throw loi
  }
}

export interface KetQuaQuetNhe {
  /** Gốc khác 'co' → lượt quét bỏ qua, sổ không đổi, chuaNhan rỗng */
  goc: 'co' | 'khong-co' | 'khong-doc-duoc'
  /** Sổ hoặc danh sách file chưa nhận đã đổi so với trước lượt quét */
  doiSo: boolean
  /** File .md chưa nhận trong gốc + thư mục phần / lĩnh vực (đường dẫn tương đối), sắp theo tên */
  chuaNhan: string[]
}

/**
 * Quét nhẹ: cập nhật sổ theo đĩa (một transaction) và trả danh sách file chưa nhận. Lần đầu sau khi nâng từ
 * phase 2a (settings.so_noi_dung = can-khoi-tao) nhận luôn các file đang ở đúng đường dẫn chuẩn.
 * Không tăng revision (nơi gọi quyết theo doiSo + danh sách chưa nhận).
 * @param tuyChon.bamLai băm lại mọi file đã nhận dù mtime + size như sổ (Quét lại; sửa giữ nguyên cỡ và mtime —
 *   cp -p, rsync -a, ổ có mtime thô — vẫn được thấy)
 */
export async function quetNhe(
  db: Db,
  goc: string,
  cay: CayNoiDung,
  tuyChon: { bamLai?: boolean } = {},
): Promise<KetQuaQuetNhe> {
  const trangThai = await trangThaiGoc(goc)
  if (trangThai !== 'co') return { goc: trangThai, doiSo: false, chuaNhan: [] }
  const bamLai = tuyChon.bamLai === true
  const so = docSo(db)
  const theoKhoa = new Map(so.map((d) => [khoaDuongDan(d.path), d]))
  const daThay = new Set<string>()
  const capNhat: { path: string; hash: string; size: number; mtime: number }[] = []
  const chuaNhan: { duongDan: string; st: StatTep }[] = []

  for (const dir of thuMucQuetNhe(cay)) {
    const ds = await docThuMuc(goc, dir)
    if (!ds) continue
    for (const muc of ds) {
      if (!muc.isFile() || !laTepMd(muc.name)) continue
      const tuongDoi = dir === '' ? muc.name : `${dir}/${muc.name}`
      const st = await statTep(goc, tuongDoi)
      if (!st) continue
      const dong = theoKhoa.get(khoaDuongDan(tuongDoi))
      if (!dong) {
        chuaNhan.push({ duongDan: tuongDoi, st })
        continue
      }
      daThay.add(dong.path)
      if (
        !bamLai &&
        dong.missingSince === null &&
        dong.mtime === st.mtime &&
        dong.size === st.size
      ) {
        continue
      }
      const hash = await bamTuongDoi(goc, tuongDoi)
      if (hash !== null) capNhat.push({ path: dong.path, hash, ...st })
    }
  }

  // Dòng sổ không thấy trong các thư mục trên (mất, hoặc nằm chỗ khác): kiểm thẳng đường dẫn của dòng
  const mat: string[] = []
  for (const dong of so) {
    if (daThay.has(dong.path)) continue
    const st = await statTep(goc, dong.path)
    if (!st) {
      if (dong.missingSince === null) mat.push(dong.path)
      continue
    }
    if (!bamLai && dong.missingSince === null && dong.mtime === st.mtime && dong.size === st.size) {
      continue
    }
    const hash = await bamTuongDoi(goc, dong.path)
    if (hash === null) {
      if (dong.missingSince === null) mat.push(dong.path)
    } else capNhat.push({ path: dong.path, hash, ...st })
  }

  // Khởi tạo sổ (nâng từ 2a): nhận file chưa nhận ở đúng đường dẫn chuẩn
  const nhanMoi: DongSo[] = []
  if (docKhoiTao(db) === 'can-khoi-tao') {
    for (const tep of chuaNhan) {
      const viTri = viTriChuanCua(cay, tep.duongDan)
      if (!viTri || docTepCuaMuc(db, viTri.itemId, viTri.vai)) continue
      if (nhanMoi.some((d) => d.itemId === viTri.itemId && d.role === viTri.vai)) continue
      const hash = await bamTuongDoi(goc, tep.duongDan)
      if (hash === null) continue
      nhanMoi.push({
        path: tep.duongDan,
        itemId: viTri.itemId,
        role: viTri.vai,
        hash,
        size: tep.st.size,
        mtime: tep.st.mtime,
        importedOn: homNay(),
        missingSince: null,
      })
    }
  }

  // Gốc biến mất giữa lượt quét: không đánh dấu mất, không ghi gì
  if (mat.length > 0) {
    const lai = await trangThaiGoc(goc)
    if (lai !== 'co') return { goc: lai, doiSo: false, chuaNhan: [] }
  }

  let doiSo = mat.length > 0 || nhanMoi.length > 0
  const cu = new Map(so.map((d) => [d.path, d]))
  db.transaction(() => {
    for (const c of capNhat) {
      const truoc = cu.get(c.path)
      if (truoc && (truoc.hash !== c.hash || truoc.missingSince !== null)) doiSo = true
      capNhatStat(db, c.path, c)
    }
    const luc = nowIso()
    for (const p of mat) danhDauMat(db, p, luc)
    for (const d of nhanMoi) ghiDongSo(db, d)
    if (docKhoiTao(db) === 'can-khoi-tao') ghiDaKhoiTao(db)
  })()

  const daNhan = new Set(nhanMoi.map((d) => d.path))
  return {
    goc: 'co',
    doiSo,
    chuaNhan: chuaNhan
      .map((t) => t.duongDan)
      .filter((p) => !daNhan.has(p))
      .sort(),
  }
}

export class LoiQuetSau extends Error {}

export interface TepQuet {
  duongDan: string
  size: number
  mtime: number
}

/**
 * Quét lại (đề xuất 1.6): mọi .md tới TOI_DA_CAP_QUET cấp thư mục dưới gốc, bỏ tên bắt đầu bằng . / ~ và
 * symlink. Thư mục sâu hơn hoặc quá TOI_DA_FILE_QUET file → LoiQuetSau (câu tiếng Việt), dừng.
 */
export async function quetSau(goc: string): Promise<TepQuet[]> {
  const kq: TepQuet[] = []
  const duyet = async (dir: string, cap: number): Promise<void> => {
    const ds = await docThuMuc(goc, dir)
    if (!ds) return
    for (const muc of [...ds].sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (boQuaTen(muc.name)) continue
      const tuongDoi = dir === '' ? muc.name : `${dir}/${muc.name}`
      if (muc.isDirectory()) {
        if (cap + 1 > TOI_DA_CAP_QUET) {
          throw new LoiQuetSau(TB_ND.quaSau(tuongDoi, TOI_DA_CAP_QUET))
        }
        await duyet(tuongDoi, cap + 1)
      } else if (muc.isFile() && laTepMd(muc.name)) {
        const st = await statTep(goc, tuongDoi)
        if (!st) continue
        kq.push({ duongDan: tuongDoi, ...st })
        if (kq.length > TOI_DA_FILE_QUET) {
          throw new LoiQuetSau(TB_ND.quaNhieu('2.000'))
        }
      }
    }
  }
  await duyet('', 0)
  return kq
}

/**
 * Nhận ngay một file đang có trên đĩa vào sổ (đồng bộ, không qua file_ops): cho seed bộ mẫu và test. Thao tác
 * của người dùng (Nhập, Quét lại, ◎ Nhận là Đã duyệt) phải đi qua file_ops để Hoàn tác được.
 * @throws LoiTep khi đường dẫn sai / đi qua symlink; Error khi không có file
 */
export function nhanTepCoSanDongBo(
  db: Db,
  goc: string,
  tep: { duongDan: string; itemId: string; vai: VaiTep; ngayNhap?: string },
): DongSo {
  const doan = tachDuongDan(tep.duongDan)
  let hienTai = fsSync.realpathSync(goc)
  for (const ten of doan) {
    hienTai = path.join(hienTai, ten)
    if (fsSync.lstatSync(hienTai).isSymbolicLink()) {
      throw new LoiTep('symlink', TB_ND.quaSymlink(tep.duongDan))
    }
  }
  const noiDung = fsSync.readFileSync(hienTai)
  const st = fsSync.lstatSync(hienTai)
  const dong: DongSo = {
    path: tep.duongDan,
    itemId: tep.itemId,
    role: tep.vai,
    hash: bamNoiDung(noiDung),
    size: st.size,
    mtime: st.mtimeMs,
    importedOn: tep.ngayNhap ?? homNay(),
    missingSince: null,
  }
  ghiDongSo(db, dong)
  return dong
}
