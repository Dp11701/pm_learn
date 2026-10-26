import { DUOI_ANH, giaiDuongDanAnh } from '../../shared/noi-dung/index.ts'
import type { MucHoc } from '../../shared/roadmap/index.ts'
import { docTepTrongGoc } from './tep-an-toan.ts'

// Ảnh trong bài (đề xuất 1.5 "Làm sạch"): chỉ file trong thư mục nội dung, đuôi DUOI_ANH, đường dẫn
// viết tương đối so với thư mục của file bài. Server kiểm lại đúng quy tắc web dùng (giaiDuongDanAnh)
// rồi đọc qua docTepTrongGoc (lstat từng thành phần, không symlink, realpath trong gốc).

type DuoiAnh = (typeof DUOI_ANH)[number]

/** Content-Type theo đuôi file */
export const LOAI_ANH: Readonly<Record<DuoiAnh, string>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

/** CSP của mọi phản hồi ảnh (1.5): SVG mở trực tiếp cũng không chạy script, không tải gì thêm */
export const CSP_ANH = "default-src 'none'; style-src 'unsafe-inline'; sandbox"

export type KetQuaAnh =
  | { ok: true; noiDung: Buffer; loai: string }
  /** 'khong-hop-le': đường dẫn bị quy tắc chặn; 'khong-co': không có file thường ở đó (gồm symlink) */
  | { ok: false; lyDo: 'khong-hop-le' | 'khong-co' }

function loaiCua(tuongDoi: string): string | undefined {
  const duoi = tuongDoi.slice(tuongDoi.lastIndexOf('.')).toLowerCase()
  return (LOAI_ANH as Record<string, string | undefined>)[duoi]
}

/**
 * Đọc ảnh mà bài của mục tham chiếu.
 * @param duongDan đường dẫn ảnh như viết trong Markdown (tương đối so với thư mục của file bài)
 */
export async function docAnh(
  noiDungDir: string,
  muc: MucHoc,
  duongDan: string,
): Promise<KetQuaAnh> {
  const tuongDoi = giaiDuongDanAnh(muc.duongDanTuongDoi, duongDan)
  const loai = tuongDoi === null ? undefined : loaiCua(tuongDoi)
  if (tuongDoi === null || loai === undefined) return { ok: false, lyDo: 'khong-hop-le' }
  const kq = await docTepTrongGoc(noiDungDir, tuongDoi)
  if (kq.ok) return { ok: true, noiDung: kq.noiDung, loai }
  return { ok: false, lyDo: kq.lyDo === 'ngoai-thu-muc' ? 'khong-hop-le' : 'khong-co' }
}
