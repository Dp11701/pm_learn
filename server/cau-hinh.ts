import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { datLech, layLech, now } from '../shared/clock.ts'

// Cấu hình server đọc từ biến môi trường (đề xuất 1.1, mục 7).

export const GOC_DU_AN = path.resolve(fileURLToPath(new URL('..', import.meta.url)))

export interface CauHinh {
  dataDir: string
  noiDungDir: string
  congApi: number
  congWeb: number
  /** ISO có múi giờ, vd. 2026-10-22T21:42:00+07:00; chỉ dùng cho bộ dữ liệu mẫu. */
  gioMau: string | null
  /** File cây roadmap mà app dùng (để tính cay_sha). */
  tepCay: string
}

type MoiTruong = Record<string, string | undefined>

function docCong(giaTri: string | undefined, macDinh: number, ten: string): number {
  if (giaTri === undefined || giaTri === '') return macDinh
  const cong = Number(giaTri)
  if (!Number.isInteger(cong) || cong < 1 || cong > 65535) {
    throw new Error(`${ten} không hợp lệ: "${giaTri}" (cần số cổng 1–65535).`)
  }
  return cong
}

export function docCauHinh(env: MoiTruong = process.env): CauHinh {
  return {
    dataDir: path.resolve(GOC_DU_AN, env.DATA_DIR || 'data'),
    noiDungDir: path.resolve(GOC_DU_AN, env.NOI_DUNG_DIR || 'noi-dung'),
    congApi: docCong(env.CONG_API, 5321, 'CONG_API'),
    congWeb: docCong(env.CONG_WEB, 5320, 'CONG_WEB'),
    gioMau: env.GIO_MAU || null,
    tepCay: path.join(GOC_DU_AN, 'docs', 'roadmap-tree.json'),
  }
}

/** Đồng hồ ảo: từ lúc gọi, now() = GIO_MAU + thời gian thực đã trôi. */
export function apDungGioMau(gioMau: string | null): void {
  if (!gioMau) return
  const ms = Date.parse(gioMau)
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(gioMau) || Number.isNaN(ms)) {
    throw new Error(
      `GIO_MAU không hợp lệ: "${gioMau}" (cần ISO có múi giờ, vd. 2026-10-22T21:42:00+07:00).`,
    )
  }
  const gioThat = now() - layLech()
  datLech(ms - gioThat)
}
