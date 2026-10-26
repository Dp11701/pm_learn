import { createHash, randomBytes } from 'node:crypto'
import { constants, type Stats } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { now } from '../../shared/clock.ts'
import { namTrongGoc } from './tep-an-toan.ts'
import { TB_ND } from './thong-bao.ts'

// Ghi file trong thư mục nội dung (đề xuất 1.6 "Ghi file"):
//  - đường dẫn tương đối, mọi thành phần kiểm bằng lstat, gặp symlink thì từ chối; thư mục cha tạo khi cần
//    (từng cấp, kiểm lại sau khi tạo); realpath(thư mục cha) phải nằm trong realpath(gốc);
//  - ghi nguyên tử: file tạm `.<tên>.<pid>.<rand>.tmp` CÙNG thư mục → fsync file → rename → fsync thư mục;
//  - so tên không phân biệt hoa thường (APFS): tên chỉ khác hoa/thường được đổi qua tên tạm;
//  - thùng rác `.thung-rac/<YYYYMMDD-HHmmss-SSS>/<đường dẫn tương đối gốc>`, không bao giờ ghi đè trong
//    thùng rác (trùng thì thêm hậu tố -2, -3… vào tên thư mục thời điểm).
// Module này chỉ làm việc với file; ghi gì, khi nào do file_ops (file-ops.ts) quyết.

export const THUNG_RAC = '.thung-rac'

/** Basename client được gửi (đề xuất 1.6): không có / \ NUL, 1–200 ký tự trước `.md`. */
export const MAU_TEN_TEP = /^[^/\\\0]{1,200}\.md$/

export function kiemTenTep(ten: string): boolean {
  return MAU_TEN_TEP.test(ten)
}

/** Lỗi đường dẫn / file không ghi được vì quy tắc an toàn (vĩnh viễn: chạy lại cũng vậy). */
export class LoiTep extends Error {
  constructor(
    readonly lyDo: 'duong-dan' | 'symlink' | 'khong-phai-file' | 'ngoai-thu-muc' | 'hash',
    message: string,
  ) {
    super(message)
  }
}

function maLoi(loi: unknown): string | undefined {
  return (loi as NodeJS.ErrnoException | null)?.code
}

async function lstatHoacNull(p: string): Promise<Stats | null> {
  try {
    return await fs.lstat(p)
  } catch (loi) {
    if (maLoi(loi) === 'ENOENT' || maLoi(loi) === 'ENOTDIR') return null
    throw loi
  }
}

/** Tách đường dẫn tương đối; ném LoiTep nếu có thành phần rỗng / . / .. / \ / NUL hay là đường dẫn tuyệt đối. */
export function tachDuongDan(tuongDoi: string): string[] {
  const doan = tuongDoi.split('/')
  const hong = (d: string) =>
    d === '' || d === '.' || d === '..' || d.includes('\\') || d.includes('\0')
  if (doan.length === 0 || doan.some(hong)) {
    throw new LoiTep('duong-dan', TB_ND.duongDanSai(tuongDoi))
  }
  return doan
}

export interface DuongDanThat {
  /** realpath của gốc */
  goc: string
  /** Đường dẫn tuyệt đối của file (gốc thật + tương đối) */
  tep: string
  thuMuc: string
  ten: string
}

/**
 * Giải đường dẫn để ĐỌC / GHI / CHUYỂN một file: kiểm từng thành phần bằng lstat (không symlink), thư mục cha
 * phải là thư mục thật trong gốc; `taoCha` thì tạo thư mục thiếu (kể cả gốc). File cuối được phép chưa có,
 * có thì phải là file thường (không symlink).
 */
export async function giaiDuongDan(
  gocNoiDung: string,
  tuongDoi: string,
  tuyChon: { taoCha?: boolean } = {},
): Promise<DuongDanThat | null> {
  const doan = tachDuongDan(tuongDoi)
  if (tuyChon.taoCha) await fs.mkdir(gocNoiDung, { recursive: true })
  let goc: string
  try {
    goc = await fs.realpath(gocNoiDung)
  } catch (loi) {
    if (maLoi(loi) === 'ENOENT') return null
    throw loi
  }
  let hienTai = goc
  for (const ten of doan.slice(0, -1)) {
    hienTai = path.join(hienTai, ten)
    let st = await lstatHoacNull(hienTai)
    if (!st) {
      if (!tuyChon.taoCha) return null
      try {
        await fs.mkdir(hienTai)
      } catch (loi) {
        if (maLoi(loi) !== 'EEXIST') throw loi
      }
      st = await lstatHoacNull(hienTai)
      if (!st) return null
    }
    if (st.isSymbolicLink()) {
      throw new LoiTep('symlink', TB_ND.quaSymlink(tuongDoi))
    }
    if (!st.isDirectory()) {
      throw new LoiTep('khong-phai-file', TB_ND.khongPhaiThuMuc(tuongDoi))
    }
  }
  const thuMuc = hienTai
  const that = await fs.realpath(thuMuc)
  if (that !== goc && !namTrongGoc(goc, that)) {
    throw new LoiTep('ngoai-thu-muc', TB_ND.ngoaiThuMuc(tuongDoi))
  }
  const ten = doan[doan.length - 1]
  const tep = path.join(thuMuc, ten)
  const st = await lstatHoacNull(tep)
  if (st?.isSymbolicLink()) {
    throw new LoiTep('symlink', TB_ND.quaSymlink(tuongDoi))
  }
  if (st && !st.isFile()) {
    throw new LoiTep('khong-phai-file', TB_ND.khongPhaiFile(tuongDoi))
  }
  return { goc, tep, thuMuc, ten }
}

/** sha256 hex của toàn file (đọc theo luồng, không giới hạn cỡ); null khi không có file. */
export async function bamTep(tuyetDoi: string): Promise<string | null> {
  let tep: fs.FileHandle
  try {
    tep = await fs.open(tuyetDoi, constants.O_RDONLY | constants.O_NOFOLLOW)
  } catch (loi) {
    const ma = maLoi(loi)
    if (ma === 'ENOENT' || ma === 'ENOTDIR') return null
    if (ma === 'ELOOP') throw new LoiTep('symlink', TB_ND.quaSymlink(path.basename(tuyetDoi)))
    throw loi
  }
  try {
    const st = await tep.stat()
    if (!st.isFile())
      throw new LoiTep('khong-phai-file', TB_ND.khongPhaiFile(path.basename(tuyetDoi)))
    const bam = createHash('sha256')
    const buf = Buffer.allocUnsafe(64 * 1024)
    for (let viTri = 0; ;) {
      const { bytesRead } = await tep.read(buf, 0, buf.length, viTri)
      if (bytesRead === 0) break
      bam.update(buf.subarray(0, bytesRead))
      viTri += bytesRead
    }
    return bam.digest('hex')
  } finally {
    await tep.close()
  }
}

async function fsyncThuMuc(thuMuc: string): Promise<void> {
  let tep: fs.FileHandle | undefined
  try {
    tep = await fs.open(thuMuc, 'r')
    await tep.sync()
  } catch (loi) {
    // Một số hệ tệp không cho fsync thư mục: bỏ qua, rename đã nguyên tử
    if (!['EINVAL', 'EISDIR', 'EPERM', 'EBADF', 'ENOTSUP'].includes(maLoi(loi) ?? '')) throw loi
  } finally {
    await tep?.close()
  }
}

function tenTam(ten: string): string {
  return `.${ten}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`
}

/** File tạm do ghiNguyenTu để lại khi tiến trình chết giữa chừng (cùng thư mục, cùng tên gốc). */
export function laTepTamCua(tenTep: string, ten: string): boolean {
  const dau = `.${ten}.`
  return tenTep.startsWith(dau) && /^\d+\.[0-9a-f]{12}\.tmp$/.test(tenTep.slice(dau.length))
}

/** Dọn file tạm cũ của `ten` trong thư mục (file tạm của chính app, không phải nội dung). */
export async function donTepTam(thuMuc: string, ten: string): Promise<void> {
  let ds: string[]
  try {
    ds = await fs.readdir(thuMuc)
  } catch {
    return
  }
  for (const x of ds) if (laTepTamCua(x, ten)) await fs.rm(path.join(thuMuc, x), { force: true })
}

/**
 * Nếu thư mục có file trùng tên khi bỏ qua hoa/thường nhưng khác tên (vd. `Scope-Creep.md` cho
 * `scope-creep.md`) thì đổi đúng tên, qua một tên tạm (APFS). Trả true nếu đã đổi.
 * @param tenTamDoi tên tạm cố định (để chạy lại sau khi chết giữa chừng vẫn tìm thấy)
 */
export async function chuanTenHoaThuong(
  thuMuc: string,
  ten: string,
  tenTamDoi: string,
): Promise<boolean> {
  const dich = path.join(thuMuc, ten)
  const tam = path.join(thuMuc, tenTamDoi)
  // Đã đổi sang tên tạm ở lần chạy trước mà chưa xong
  if (await lstatHoacNull(tam)) {
    if (!(await coTenChinhXac(thuMuc, ten))) {
      await fs.rename(tam, dich)
      await fsyncThuMuc(thuMuc)
      return true
    }
  }
  let ds: string[]
  try {
    ds = await fs.readdir(thuMuc)
  } catch {
    return false
  }
  if (ds.includes(ten)) return false
  const thuong = ten.normalize('NFC').toLowerCase()
  const khac = ds.find((x) => x.normalize('NFC').toLowerCase() === thuong)
  if (!khac) return false
  const st = await lstatHoacNull(path.join(thuMuc, khac))
  if (!st?.isFile()) return false
  await fs.rename(path.join(thuMuc, khac), tam)
  await fs.rename(tam, dich)
  await fsyncThuMuc(thuMuc)
  return true
}

async function coTenChinhXac(thuMuc: string, ten: string): Promise<boolean> {
  try {
    return (await fs.readdir(thuMuc)).includes(ten)
  } catch {
    return false
  }
}

/**
 * Ghi nguyên tử `noiDung` (byte UTF-8 đúng như truyền vào) vào file tuyệt đối: file tạm cùng thư mục → fsync →
 * rename → fsync thư mục. Không tự chép bản cũ vào thùng rác (file-ops làm trước khi gọi).
 * @param diemDung gọi sau khi ghi xong file tạm, trước rename (test giả lập chết giữa chừng)
 */
export async function ghiNguyenTu(
  tuyetDoi: string,
  noiDung: string | Uint8Array,
  diemDung?: () => void,
): Promise<void> {
  const thuMuc = path.dirname(tuyetDoi)
  const tam = path.join(thuMuc, tenTam(path.basename(tuyetDoi)))
  const tep = await fs.open(tam, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o644)
  try {
    await tep.writeFile(noiDung)
    await tep.sync()
  } finally {
    await tep.close()
  }
  try {
    diemDung?.()
    await fs.rename(tam, tuyetDoi)
  } catch (loi) {
    await fs.rm(tam, { force: true })
    throw loi
  }
  await fsyncThuMuc(thuMuc)
}

/** Tên thư mục thời điểm của thùng rác: YYYYMMDD-HHmmss-SSS theo giờ của tiến trình. */
export function nhanThoiDiem(ms: number = now()): string {
  const d = new Date(ms)
  const s = (n: number, do_ = 2) => String(n).padStart(do_, '0')
  return (
    `${d.getFullYear()}${s(d.getMonth() + 1)}${s(d.getDate())}-` +
    `${s(d.getHours())}${s(d.getMinutes())}${s(d.getSeconds())}-${s(d.getMilliseconds(), 3)}`
  )
}

/** `.thung-rac/<nhãn>[-n]/<tương đối>` */
export function duongDanRac(nhan: string, tuongDoi: string, lan = 1): string {
  return `${THUNG_RAC}/${lan === 1 ? nhan : `${nhan}-${lan}`}/${tuongDoi}`
}

export function laTrongThungRac(tuongDoi: string): boolean {
  return tuongDoi === THUNG_RAC || tuongDoi.startsWith(`${THUNG_RAC}/`)
}

/**
 * Chỗ trong thùng rác cho bản của `tuongDoi` có hash `hash`: chỗ đầu tiên (nhãn, nhãn-2, …) còn trống, hoặc
 * đã có đúng bản đó (lần chạy trước đã chép). Không bao giờ trả chỗ đang chứa bản khác.
 */
export async function choTrongRac(
  goc: string,
  nhan: string,
  tuongDoi: string,
  hash: string | null,
): Promise<{ duongDan: string; daCo: boolean }> {
  for (let lan = 1; ; lan++) {
    const rac = duongDanRac(nhan, tuongDoi, lan)
    const p = await giaiDuongDan(goc, rac)
    const coSan = p ? await bamTep(p.tep) : null
    if (coSan === null) return { duongDan: rac, daCo: false }
    if (hash !== null && coSan === hash) return { duongDan: rac, daCo: true }
  }
}

/**
 * Chép file `tuongDoi` (hash `hash`) vào thùng rác, giữ nguyên file gốc. Ghi nguyên tử, không ghi đè.
 * Trả đường dẫn tương đối trong thùng rác.
 */
export async function chepVaoRac(
  goc: string,
  nhan: string,
  tuongDoi: string,
  hash: string,
): Promise<string> {
  const cho = await choTrongRac(goc, nhan, tuongDoi, hash)
  if (cho.daCo) return cho.duongDan
  const nguon = await giaiDuongDan(goc, tuongDoi)
  if (!nguon) throw new LoiTep('khong-phai-file', TB_ND.nguonMat(tuongDoi, THUNG_RAC))
  const dich = await giaiDuongDan(goc, cho.duongDan, { taoCha: true })
  if (!dich) throw new Error(TB_ND.khongTaoThuMuc(cho.duongDan))
  const noiDung = await fs.readFile(nguon.tep)
  if (createHash('sha256').update(noiDung).digest('hex') !== hash) {
    // File đổi giữa lúc băm và lúc chép: chép bản đang có (vẫn không mất gì)
    const lai = await choTrongRac(goc, nhan, tuongDoi, null)
    const dich2 = await giaiDuongDan(goc, lai.duongDan, { taoCha: true })
    if (!dich2) throw new Error(TB_ND.khongTaoThuMuc(lai.duongDan))
    await ghiNguyenTu(dich2.tep, noiDung)
    return lai.duongDan
  }
  await ghiNguyenTu(dich.tep, noiDung)
  return cho.duongDan
}

/** Chuẩn hoá chữ của một file sắp ghi (đề xuất 1.6): bỏ BOM, NFC, xuống dòng LF. */
export function chuanHoaTep(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
}
