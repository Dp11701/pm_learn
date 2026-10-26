import { randomBytes } from 'node:crypto'
import { now } from '../../shared/clock.ts'
import type { Db } from '../db/index.ts'
import { docBoDem, dsBoDemNhap, ghiBoDem, khoaBoDemNhap, xoaBoDem } from '../du-lieu/bo-dem-soan.ts'
import type { PhanHoiKiemTra } from './hop-dong.ts'
import type { DongPhanLoai, TepKiem } from './phan-loai.ts'

// Lô kiểm tra (đề xuất 1.7): giữ trong bộ nhớ theo token, hết hạn sau 30 phút. File lỗi đọc được lưu vào
// editor_buffers khoá nhap:<token>:<i> (không ghi ra đĩa) để "Mở trong trình soạn". Lô hết hạn: bản tạm chưa
// sửa gì bị xoá; bản tạm đã sửa được giữ (trình soạn, phase 7b).
// Lô mất cùng tiến trình: token mang thời điểm tạo lô (12 hex đầu, ms) và bản tạm ghi updated_at đúng thời
// điểm đó, nên lúc khởi động biết bản tạm nào chưa sửa (updated_at chưa đổi) để xoá (donBoDemNhapMoCoi).

export const THOI_HAN_LO_MS = 30 * 60 * 1000
/** Số lô giữ cùng lúc (mỗi lô tới 16 MB chữ); quá thì bỏ lô cũ nhất */
export const TOI_DA_LO = 10

export interface Lo {
  token: string
  nguon: 'tha' | 'quet-lai'
  taoLuc: number
  tep: TepKiem[]
  mucMacDinh?: string
  dong: DongPhanLoai[]
  /** khoá bản tạm → chữ lúc tạo */
  boDem: Map<string, string>
  daNhap: boolean
}

export type KetQuaLayLo = { ok: true; lo: Lo } | { ok: false; lyDo: 'het-han' | 'da-nhap' }

export interface BoLo {
  /** Tạo lô + ghi bản tạm cho dòng lỗi; điền khoaBoDem */
  tao(du: Omit<Lo, 'token' | 'taoLuc' | 'boDem' | 'daNhap'>): Lo
  lay(token: string): KetQuaLayLo
  /** Đánh dấu lô đã nhập (dùng lại token → 410) */
  daNhap(lo: Lo): void
  /** Bỏ lô (kiểm lại thấy đã đổi) */
  bo(lo: Lo): void
  phanHoi(lo: Lo): PhanHoiKiemTra
}

/** Token lô: 12 hex thời điểm tạo (ms) + 20 hex ngẫu nhiên (32 hex). */
export function taoToken(luc: number): string {
  return Math.trunc(luc).toString(16).padStart(12, '0').slice(-12) + randomBytes(10).toString('hex')
}

/** Thời điểm tạo lô ghi trong token; null khi token không đúng dạng. */
export function lucTaoCuaToken(token: string): number | null {
  if (!/^[0-9a-f]{32}$/.test(token)) return null
  return parseInt(token.slice(0, 12), 16)
}

/**
 * Lúc khởi động (mọi lô trong bộ nhớ đã mất): xoá bản tạm nhap:<token>:<i> chưa sửa — updated_at vẫn đúng thời
 * điểm tạo lô ghi trong token. Bản tạm đã sửa (trình soạn ghi lại → updated_at đổi) được giữ.
 * @returns số bản tạm đã xoá
 */
export function donBoDemNhapMoCoi(db: Db): number {
  let soXoa = 0
  db.transaction(() => {
    for (const bd of dsBoDemNhap(db)) {
      const luc = lucTaoCuaToken(bd.key.split(':')[1] ?? '')
      if (luc !== null && Date.parse(bd.updatedAt) === luc) {
        xoaBoDem(db, bd.key)
        soXoa++
      }
    }
  })()
  return soXoa
}

export function taoBoLo(db: Db): BoLo {
  const theoToken = new Map<string, Lo>()

  function xoaBoDemChuaSua(lo: Lo) {
    for (const [khoa, chu] of lo.boDem) {
      const bd = docBoDem(db, khoa)
      if (bd && bd.text === chu) xoaBoDem(db, khoa)
    }
  }

  function don() {
    const luc = now()
    for (const lo of theoToken.values()) {
      if (luc - lo.taoLuc > THOI_HAN_LO_MS) {
        theoToken.delete(lo.token)
        xoaBoDemChuaSua(lo)
      }
    }
    while (theoToken.size > TOI_DA_LO) {
      const cu = theoToken.values().next().value as Lo
      theoToken.delete(cu.token)
      xoaBoDemChuaSua(cu)
    }
  }

  return {
    tao(du) {
      don()
      const taoLuc = now()
      const token = taoToken(taoLuc)
      const lo: Lo = { ...du, token, taoLuc, boDem: new Map(), daNhap: false }
      const updatedAt = new Date(taoLuc).toISOString()
      db.transaction(() => {
        for (const d of lo.dong) {
          const { ketQua, tep } = d
          if (ketQua.loai !== 'loi' || tep.noiDung === null) continue
          const khoa = khoaBoDemNhap(token, ketQua.chiSo)
          ghiBoDem(db, {
            key: khoa,
            itemId: ketQua.muc?.id ?? null,
            text: tep.noiDung,
            baseHash: tep.hashDia ?? null,
            updatedAt,
          })
          ketQua.khoaBoDem = khoa
          lo.boDem.set(khoa, tep.noiDung)
        }
      })()
      theoToken.set(token, lo)
      don()
      return lo
    },
    lay(token) {
      don()
      const lo = theoToken.get(token)
      if (!lo) return { ok: false, lyDo: 'het-han' }
      if (lo.daNhap) return { ok: false, lyDo: 'da-nhap' }
      return { ok: true, lo }
    },
    daNhap(lo) {
      lo.daNhap = true
    },
    bo(lo) {
      theoToken.delete(lo.token)
      xoaBoDemChuaSua(lo)
    },
    phanHoi(lo) {
      const ketQua = lo.dong.map((d) => d.ketQua)
      const dem = (loai: string[]) => ketQua.filter((k) => loai.includes(k.loai)).length
      return {
        token: lo.token,
        ketQua,
        tomTat: {
          hopLe: dem(['hop-le']),
          canhBao: dem(['thieu-khoi', 'khong-khop']),
          trung: dem(['trung-da-duyet']),
          loi: dem(['loi']),
        },
        soNhapDuoc: ketQua.filter(
          (k) =>
            k.loai === 'hop-le' || k.loai === 'thieu-khoi' || (k.loai === 'khong-khop' && k.ganSan),
        ).length,
      }
    },
  }
}
