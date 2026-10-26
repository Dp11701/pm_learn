import { constants, type Stats } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

// Đọc một file trong thư mục nội dung mà không ra ngoài được (đề xuất 1.5 ảnh, 1.6, mục 6 API):
//  - đường dẫn tương đối tính từ gốc, ngăn bằng '/', không có thành phần rỗng / '.' / '..' / '\' / NUL;
//  - mọi thành phần kiểm bằng lstat, gặp symlink thì từ chối (kể cả thư mục ở giữa);
//  - realpath của file phải nằm trong realpath(gốc);
//  - mở bằng O_NOFOLLOW rồi so dev/ino với lstat: file bị tráo giữa lúc kiểm và lúc mở thì từ chối;
//  - có toiDa: không đọc quá toiDa byte (file lớn hơn → 'qua-lon', kể cả khi file lớn lên lúc đang đọc).

export type LyDoTuChoi =
  /** Không có file / thư mục (kể cả gốc chưa tồn tại) */
  | 'khong-co'
  /** Một thành phần của đường dẫn là symlink */
  | 'symlink'
  /** Có nhưng không phải file thường (thư mục, socket…) */
  | 'khong-phai-file'
  /** Đường dẫn không hợp lệ hoặc trỏ ra ngoài gốc */
  | 'ngoai-thu-muc'

export type KetQuaStatTep = { ok: true; thongTin: Stats } | { ok: false; lyDo: LyDoTuChoi }

export type KetQuaDocTep =
  | { ok: true; noiDung: Buffer }
  | { ok: false; lyDo: LyDoTuChoi }
  /** File thường nhưng lớn hơn toiDa byte: không đọc nội dung */
  | { ok: false; lyDo: 'qua-lon'; kichThuoc: number }

const MA_KHONG_CO = new Set(['ENOENT', 'ENOTDIR', 'ENAMETOOLONG'])

function maLoi(loi: unknown): string | undefined {
  return (loi as NodeJS.ErrnoException | null)?.code
}

/** p nằm hẳn bên trong goc (không bằng goc). Cả hai là đường dẫn tuyệt đối đã realpath. */
export function namTrongGoc(goc: string, p: string): boolean {
  const rel = path.relative(goc, p)
  return rel !== '' && !path.isAbsolute(rel) && rel.split(path.sep)[0] !== '..'
}

/** Tách đường dẫn tương đối thành các thành phần; null nếu không hợp lệ. */
function tachThanhPhan(tuongDoi: string): string[] | null {
  const doan = tuongDoi.split('/')
  const hong = (d: string) =>
    d === '' || d === '.' || d === '..' || d.includes('\\') || d.includes('\0')
  return doan.length === 0 || doan.some(hong) ? null : doan
}

type KiemDuongDan =
  { ok: true; gocThat: string; duongDan: string; thongTin: Stats } | { ok: false; lyDo: LyDoTuChoi }

/** Kiểm đường dẫn goc/tuongDoi: realpath gốc, lstat từng thành phần (không symlink), cuối là file thường. */
async function kiemDuongDan(goc: string, tuongDoi: string): Promise<KiemDuongDan> {
  const doan = tachThanhPhan(tuongDoi)
  if (!doan) return { ok: false, lyDo: 'ngoai-thu-muc' }

  let gocThat: string
  try {
    gocThat = await fs.realpath(goc)
  } catch (loi) {
    if (MA_KHONG_CO.has(maLoi(loi) ?? '')) return { ok: false, lyDo: 'khong-co' }
    throw loi
  }

  let hienTai = gocThat
  let thongTin: Stats | undefined
  for (let i = 0; i < doan.length; i++) {
    hienTai = path.join(hienTai, doan[i])
    try {
      thongTin = await fs.lstat(hienTai)
    } catch (loi) {
      if (MA_KHONG_CO.has(maLoi(loi) ?? '')) return { ok: false, lyDo: 'khong-co' }
      throw loi
    }
    if (thongTin.isSymbolicLink()) return { ok: false, lyDo: 'symlink' }
    const laCuoi = i === doan.length - 1
    if (!laCuoi && !thongTin.isDirectory()) return { ok: false, lyDo: 'khong-co' }
    if (laCuoi && !thongTin.isFile()) return { ok: false, lyDo: 'khong-phai-file' }
  }
  if (!thongTin) return { ok: false, lyDo: 'ngoai-thu-muc' }
  return { ok: true, gocThat, duongDan: hienTai, thongTin }
}

/**
 * Chỉ kiểm và stat (không mở, không đọc) file goc/tuongDoi theo cùng quy tắc của docTepTrongGoc: để biết
 * file còn đó và đã đổi chưa (mtime, size, ino) mà không đọc lại. Lỗi khác "không có" ném ra như đọc.
 */
export async function statTepTrongGoc(goc: string, tuongDoi: string): Promise<KetQuaStatTep> {
  const kq = await kiemDuongDan(goc, tuongDoi)
  return kq.ok ? { ok: true, thongTin: kq.thongTin } : kq
}

/** Đọc tối đa toiDa + 1 byte từ đầu file; null nếu file có hơn toiDa byte. */
async function docGioiHan(
  tep: fs.FileHandle,
  kichThuoc: number,
  toiDa: number,
): Promise<Buffer | null> {
  const phan: Buffer[] = []
  let tong = 0
  for (;;) {
    const con = toiDa + 1 - tong
    if (con <= 0) break
    const buf = Buffer.allocUnsafe(Math.min(con, Math.max(kichThuoc - tong + 1, 4096)))
    const { bytesRead } = await tep.read(buf, 0, buf.length, tong)
    if (bytesRead === 0) break
    phan.push(buf.subarray(0, bytesRead))
    tong += bytesRead
  }
  return tong > toiDa ? null : Buffer.concat(phan, tong)
}

/**
 * Đọc toàn bộ file goc/tuongDoi theo các quy tắc ở đầu file. Lỗi "không có" (ENOENT, ENOTDIR,
 * ENAMETOOLONG) và symlink trả lý do; lỗi khác (vd. EACCES) ném ra cho route trả 500.
 * @param tuyChon.toiDa số byte tối đa được đọc; file lớn hơn → { lyDo: 'qua-lon', kichThuoc }
 */
export async function docTepTrongGoc(
  goc: string,
  tuongDoi: string,
  tuyChon: { toiDa?: number } = {},
): Promise<KetQuaDocTep> {
  const kiem = await kiemDuongDan(goc, tuongDoi)
  if (!kiem.ok) return kiem
  const { gocThat, duongDan, thongTin } = kiem

  let tep: fs.FileHandle
  try {
    if (!namTrongGoc(gocThat, await fs.realpath(duongDan))) {
      return { ok: false, lyDo: 'ngoai-thu-muc' }
    }
    tep = await fs.open(duongDan, constants.O_RDONLY | constants.O_NOFOLLOW)
  } catch (loi) {
    const ma = maLoi(loi) ?? ''
    if (MA_KHONG_CO.has(ma)) return { ok: false, lyDo: 'khong-co' }
    if (ma === 'ELOOP') return { ok: false, lyDo: 'symlink' }
    throw loi
  }
  try {
    const moRa = await tep.stat()
    if (!moRa.isFile() || moRa.dev !== thongTin.dev || moRa.ino !== thongTin.ino) {
      return { ok: false, lyDo: 'khong-phai-file' }
    }
    const { toiDa } = tuyChon
    if (toiDa === undefined) return { ok: true, noiDung: await tep.readFile() }
    const quaLon = { ok: false, lyDo: 'qua-lon', kichThuoc: moRa.size } as const
    if (moRa.size > toiDa) return quaLon
    const noiDung = await docGioiHan(tep, moRa.size, toiDa)
    return noiDung
      ? { ok: true, noiDung }
      : { ...quaLon, kichThuoc: Math.max(moRa.size, toiDa + 1) }
  } finally {
    await tep.close()
  }
}
