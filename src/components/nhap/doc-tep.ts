// Đọc file kéo thả / chọn ở trình duyệt trước khi gửi kiểm tra (đề xuất 1.7 bước 1): thư mục đọc đệ quy qua
// webkitGetAsEntry (readEntries gọi tới khi trả mảng rỗng), chọn thư mục qua <input webkitdirectory>
// (webkitRelativePath). Chỉ nhận .md (khác → "Chỉ nhận file .md"); tối đa 256 KB/file, 250 file và 16 MB mỗi
// lần; đọc UTF-8 (sai mã → không nhận). Trong thư mục bỏ qua file/thư mục bắt đầu bằng "." hoặc "~" (như Quét
// lại, đề xuất 1.6); file thả trực tiếp thì không bỏ.
import { TOI_DA_BYTE_BAI, soKb } from '../../../shared/noi-dung'
import type { TepGui } from '../../app/du-lieu/nhap'

/** Số file .md tối đa mỗi lần nhập. */
export const TOI_DA_FILE = 250
/** Số byte tối đa mỗi lần nhập (khớp express.json({ limit: '16mb' }) ở /api/nhap/*). */
export const TOI_DA_BYTE_LO = 16 * 1024 * 1024
/** Độ dài basename tối đa (server kiểm ^[^/\\\0]{1,200}\.md$). */
export const TOI_DA_TEN = 200
/** Số mục (file + thư mục) tối đa duyệt khi đọc thư mục được thả, để không treo với thư mục rất lớn. */
export const TOI_DA_MUC_DUYET = 5000
/** Độ sâu thư mục tối đa đọc khi thả (Quét lại chỉ 3 cấp; ở đây rộng hơn cho thư mục chứa cả noi-dung/). */
export const TOI_DA_DO_SAU = 8

export { TOI_DA_BYTE_BAI }

export type LyDoKhongNhan = 'khong-phai-md' | 'qua-lon' | 'ten-qua-dai' | 'khong-doc-duoc'

export interface TepKhongNhan {
  ten: string
  duongDan?: string
  lyDo: LyDoKhongNhan
}

/** File đã nhận (chưa đọc nội dung). */
export interface TepNguon {
  ten: string
  duongDan?: string
  file: File
}

export type LoiLo =
  | { loai: 'qua-nhieu-file'; so: number }
  | { loai: 'qua-dung-luong'; soByte: number }
  | { loai: 'qua-nhieu-muc' }
  | { loai: 'khong-co-file' }

export interface KetQuaThu {
  /** File .md nhận được, theo thứ tự gặp */
  nhan: TepNguon[]
  khongNhan: TepKhongNhan[]
  /** Lỗi làm cả lô bị từ chối */
  loiLo: LoiLo | null
}

/** Ứng viên trước khi phân loại. */
interface UngVienTep {
  ten: string
  duongDan?: string
  file: File
}

/** Tên ẩn / tạm (".DS_Store", "~$x.md", ".thung-rac"): bỏ qua khi nằm trong thư mục được thả. */
export function laTenAn(ten: string): boolean {
  return ten.startsWith('.') || ten.startsWith('~')
}

/** Phân loại từng file và kiểm giới hạn cả lô (chưa đọc nội dung). */
export function phanLoai(ds: readonly UngVienTep[], loiDuyet: LoiLo | null = null): KetQuaThu {
  const nhan: TepNguon[] = []
  const khongNhan: TepKhongNhan[] = []
  for (const t of ds) {
    const goc = t.duongDan ? { ten: t.ten, duongDan: t.duongDan } : { ten: t.ten }
    if (!t.ten.endsWith('.md')) khongNhan.push({ ...goc, lyDo: 'khong-phai-md' })
    else if (t.ten.length > TOI_DA_TEN) khongNhan.push({ ...goc, lyDo: 'ten-qua-dai' })
    else if (t.file.size > TOI_DA_BYTE_BAI) khongNhan.push({ ...goc, lyDo: 'qua-lon' })
    else nhan.push({ ...goc, file: t.file })
  }
  return { nhan, khongNhan, loiLo: loiDuyet ?? kiemLo(nhan, khongNhan) }
}

/** Lỗi cả lô: quá số file, quá dung lượng, không có file nào. */
export function kiemLo(
  nhan: readonly TepNguon[],
  khongNhan: readonly TepKhongNhan[],
): LoiLo | null {
  if (nhan.length > TOI_DA_FILE) return { loai: 'qua-nhieu-file', so: nhan.length }
  const soByte = nhan.reduce((tong, t) => tong + t.file.size, 0)
  if (soByte > TOI_DA_BYTE_LO) return { loai: 'qua-dung-luong', soByte }
  if (nhan.length === 0 && khongNhan.length === 0) return { loai: 'khong-co-file' }
  return null
}

/** File chọn bằng <input type=file> (nhiều file, hoặc cả thư mục qua webkitdirectory). */
export function thuTuDanhSach(files: readonly File[]): KetQuaThu {
  const ds: UngVienTep[] = []
  for (const file of files) {
    const duongDan = file.webkitRelativePath || undefined
    // Chọn thư mục: bỏ qua mọi thứ nằm dưới một thư mục / file ẩn (trừ thư mục gốc được chọn).
    if (duongDan && duongDan.split('/').slice(1).some(laTenAn)) continue
    ds.push(duongDan ? { ten: file.name, duongDan, file } : { ten: file.name, file })
  }
  return phanLoai(ds)
}

function docThuMuc(thuMuc: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const doc = thuMuc.createReader()
  const tatCa: FileSystemEntry[] = []
  return new Promise((xong, loi) => {
    const lanDoc = () =>
      doc.readEntries((ds) => {
        if (ds.length === 0) xong(tatCa)
        else {
          tatCa.push(...ds)
          lanDoc()
        }
      }, loi)
    lanDoc()
  })
}

function layFile(tep: FileSystemFileEntry): Promise<File> {
  return new Promise((xong, loi) => tep.file(xong, loi))
}

/**
 * File kéo thả: entry lấy từ DataTransferItem.webkitGetAsEntry() (phải lấy ngay trong sự kiện drop). Thư mục
 * đọc đệ quy; đường dẫn tương đối = fullPath bỏ "/" đầu. Dừng sớm khi đã vượt giới hạn số file / số mục.
 */
export async function thuTuEntry(entries: readonly FileSystemEntry[]): Promise<KetQuaThu> {
  const ds: UngVienTep[] = []
  let soMuc = 0
  let soMd = 0
  let loiDuyet: LoiLo | null = null

  async function duyet(entry: FileSystemEntry, doSau: number, trongThuMuc: boolean) {
    if (loiDuyet) return
    soMuc += 1
    if (soMuc > TOI_DA_MUC_DUYET) {
      loiDuyet = { loai: 'qua-nhieu-muc' }
      return
    }
    if (trongThuMuc && laTenAn(entry.name)) return
    if (entry.isFile) {
      const file = await layFile(entry as FileSystemFileEntry)
      const duongDan = trongThuMuc ? entry.fullPath.replace(/^\/+/, '') : undefined
      ds.push(duongDan ? { ten: file.name, duongDan, file } : { ten: file.name, file })
      if (file.name.endsWith('.md')) soMd += 1
      // Đã chắc chắn quá số file: không đọc tiếp.
      if (soMd > TOI_DA_FILE) loiDuyet = { loai: 'qua-nhieu-file', so: soMd }
      return
    }
    if (entry.isDirectory && doSau < TOI_DA_DO_SAU) {
      for (const con of await docThuMuc(entry as FileSystemDirectoryEntry)) {
        await duyet(con, doSau + 1, true)
      }
    }
  }

  for (const e of entries) await duyet(e, 0, false)
  return phanLoai(ds, loiDuyet)
}

const giaiMa = () => new TextDecoder('utf-8', { fatal: true })

/** Đọc toàn bộ file thành ArrayBuffer (Blob.arrayBuffer, không có thì FileReader). */
function docBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer()
  return new Promise((xong, loi) => {
    const r = new FileReader()
    r.onload = () => xong(r.result as ArrayBuffer)
    r.onerror = () => loi(r.error)
    r.readAsArrayBuffer(file)
  })
}

/**
 * Đọc nội dung UTF-8 (bỏ BOM) của các file đã nhận, báo tiến độ sau mỗi file. File không đọc được hoặc sai
 * UTF-8 chuyển sang không nhận.
 */
export async function docNoiDung(
  nhan: readonly TepNguon[],
  baoTienDo?: (xong: number, tong: number) => void,
): Promise<{ gui: TepGui[]; khongNhan: TepKhongNhan[] }> {
  const gui: TepGui[] = []
  const khongNhan: TepKhongNhan[] = []
  for (const [i, t] of nhan.entries()) {
    try {
      const noiDung = giaiMa().decode(await docBuffer(t.file))
      gui.push(t.duongDan ? { ten: t.ten, noiDung, duongDan: t.duongDan } : { ten: t.ten, noiDung })
    } catch {
      khongNhan.push(
        t.duongDan
          ? { ten: t.ten, duongDan: t.duongDan, lyDo: 'khong-doc-duoc' }
          : { ten: t.ten, lyDo: 'khong-doc-duoc' },
      )
    }
    baoTienDo?.(i + 1, nhan.length)
  }
  return { gui, khongNhan }
}

/** Số byte của thân yêu cầu JSON (chữ có dấu, \n thoát… làm thân lớn hơn tổng kích thước file). */
export function soByteYeuCau(body: unknown): number {
  return new TextEncoder().encode(JSON.stringify(body)).length
}

/** Số MB (1 chữ số thập phân, làm tròn lên) để ghi trong thông báo. */
export function soMb(soByte: number): number {
  return Math.ceil((soByte / (1024 * 1024)) * 10) / 10
}

export { soKb }
