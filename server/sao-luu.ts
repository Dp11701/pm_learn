import fs from 'node:fs'
import path from 'node:path'
import { homNay, now } from '../shared/clock.ts'
import type { Db } from './db/index.ts'
import { docSetting, ghiSetting } from './db/settings.ts'

// Sao lưu DB + thư mục nội dung (đề xuất 2.3): mỗi ngày một lần khi có /api/meta,
// thêm một lần trước migration / nhập / đặt lại / thay cây. Giữ `giu` bản mỗi loại (hằng ngày, từng lý do).

export const GIU_MAC_DINH = 14
const THU_LAI_SAU_LOI_MS = 10 * 60 * 1000
const TIEN_TO_TAM = '.tam-'
const THUNG_RAC = '.thung-rac'
const MAU_DB = /^hoc-(\d{4}-\d{2}-\d{2})(-[a-z0-9-]+)?\.db$/
const MAU_NOI_DUNG = /^noi-dung-(\d{4}-\d{2}-\d{2})(-[a-z0-9-]+)?$/

export interface SaoLuu {
  /** Sao lưu ngay; lyDo (vd. 'truoc-migration') thành hậu tố tên file. */
  saoLuuNgay(lyDo?: string): Promise<void>
  /** Bắt đầu bản sao lưu hằng ngày nếu hôm nay chưa có; null nếu không cần. Không ném lỗi. */
  saoLuuHangNgayNeuCan(): Promise<void> | null
  /** Chờ mọi lượt sao lưu đang xếp hàng xong. */
  choXong(): Promise<void>
  dangChay(): boolean
}

export interface TuyChonSaoLuu {
  db: Db
  dataDir: string
  noiDungDir: string
  giu?: number
}

export function taoSaoLuu({ db, dataDir, noiDungDir, giu = GIU_MAC_DINH }: TuyChonSaoLuu): SaoLuu {
  const thuMuc = path.join(dataDir, 'backups')
  // Mọi lượt sao lưu chạy nối tiếp qua một hàng đợi, không bao giờ hai lượt cùng lúc.
  let hangDoi: Promise<void> = Promise.resolve()
  let soDangCho = 0
  let hangNgay: Promise<void> | null = null
  let thuLaiSau = 0

  function xepHang(viec: () => Promise<void>): Promise<void> {
    soDangCho++
    const p = hangDoi.then(viec).finally(() => {
      soDangCho--
    })
    hangDoi = p.catch(() => {})
    return p
  }

  async function thucHien(ngay: string, lyDo?: string): Promise<void> {
    await fs.promises.mkdir(thuMuc, { recursive: true })
    await donTepTam()
    const hauTo = timHauTo(ngay, lyDo)
    try {
      const dbTam = path.join(thuMuc, `${TIEN_TO_TAM}hoc-${ngay}${hauTo}.db`)
      await db.backup(dbTam)
      await fs.promises.rename(dbTam, path.join(thuMuc, `hoc-${ngay}${hauTo}.db`))
      const goc = await thuMucThat(noiDungDir)
      if (goc) {
        const ndTam = path.join(thuMuc, `${TIEN_TO_TAM}noi-dung-${ngay}${hauTo}`)
        await fs.promises.cp(goc, ndTam, {
          recursive: true,
          filter: async (nguon) => !(await boQua(goc, nguon)),
        })
        await fs.promises.rename(ndTam, path.join(thuMuc, `noi-dung-${ngay}${hauTo}`))
      }
    } finally {
      await donTepTam()
    }
    await donBanCu()
  }

  /** Hậu tố chưa dùng trong ngày: không bao giờ ghi đè bản sao lưu cũ. */
  function timHauTo(ngay: string, lyDo?: string): string {
    const ten = (lyDo ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const goc = ten ? `-${ten}` : ''
    for (let i = 1; ; i++) {
      const hauTo = i === 1 ? goc : `${goc}-${i}`
      const daCo =
        fs.existsSync(path.join(thuMuc, `hoc-${ngay}${hauTo}.db`)) ||
        fs.existsSync(path.join(thuMuc, `noi-dung-${ngay}${hauTo}`))
      if (!daCo) return hauTo
    }
  }

  async function donTepTam(): Promise<void> {
    for (const ten of await fs.promises.readdir(thuMuc)) {
      if (ten.startsWith(TIEN_TO_TAM)) {
        await fs.promises.rm(path.join(thuMuc, ten), { recursive: true, force: true })
      }
    }
  }

  async function donBanCu(): Promise<void> {
    const ds = await fs.promises.readdir(thuMuc, { withFileTypes: true })
    const donLoai = async (mau: RegExp, laDb: boolean) => {
      // Mỗi loại giữ riêng: bản hằng ngày, và từng lý do (truoc-migration, nhap-json…), để một loạt
      // bản sao lưu theo sự kiện không đẩy mất lịch sử hằng ngày.
      const theoLyDo = new Map<string, { duongDan: string; ngay: string; mtime: number }[]>()
      for (const muc of ds) {
        const khop = mau.exec(muc.name)
        if (!khop || muc.isDirectory() === laDb) continue
        const duongDan = path.join(thuMuc, muc.name)
        const lyDo = (khop[2] ?? '').replace(/-\d+$/, '')
        const nhom = theoLyDo.get(lyDo) ?? []
        nhom.push({
          duongDan,
          ngay: khop[1] ?? '',
          mtime: (await fs.promises.stat(duongDan)).mtimeMs,
        })
        theoLyDo.set(lyDo, nhom)
      }
      for (const nhom of theoLyDo.values()) {
        // Mới nhất trước: theo ngày trong tên (ngày của app), rồi theo giờ ghi file.
        nhom.sort((a, b) => (a.ngay === b.ngay ? b.mtime - a.mtime : a.ngay < b.ngay ? 1 : -1))
        for (const cu of nhom.slice(giu)) {
          await fs.promises.rm(cu.duongDan, { recursive: true, force: true })
          if (laDb) {
            await fs.promises.rm(`${cu.duongDan}-wal`, { force: true })
            await fs.promises.rm(`${cu.duongDan}-shm`, { force: true })
          }
        }
      }
    }
    await donLoai(MAU_DB, true)
    await donLoai(MAU_NOI_DUNG, false)
  }

  return {
    saoLuuNgay: (lyDo) => xepHang(() => thucHien(homNay(), lyDo)),

    saoLuuHangNgayNeuCan() {
      if (hangNgay) return hangNgay
      if (now() < thuLaiSau) return null
      const daSaoLuu = docSetting(db, 'ngay_sao_luu')
      if (daSaoLuu !== null && daSaoLuu >= homNay()) return null
      hangNgay = xepHang(async () => {
        try {
          const ngay = homNay()
          await thucHien(ngay)
          ghiSetting(db, 'ngay_sao_luu', ngay)
        } catch (loi) {
          thuLaiSau = now() + THU_LAI_SAU_LOI_MS
          console.error('Sao lưu hằng ngày thất bại, sẽ thử lại sau 10 phút:', loi)
        } finally {
          hangNgay = null
        }
      })
      return hangNgay
    },

    choXong: async () => {
      while (soDangCho > 0) await hangDoi
    },

    dangChay: () => soDangCho > 0,
  }
}

/** Đường dẫn thật của thư mục nội dung (theo symlink ở gốc); null nếu chưa có. */
async function thuMucThat(duongDan: string): Promise<string | null> {
  try {
    const that = await fs.promises.realpath(duongDan)
    return (await fs.promises.stat(that)).isDirectory() ? that : null
  } catch {
    return null
  }
}

/** Bỏ thùng rác và symlink bên trong thư mục nội dung. */
async function boQua(goc: string, nguon: string): Promise<boolean> {
  const tuongDoi = path.relative(goc, nguon)
  if (tuongDoi === '') return false
  if (tuongDoi.split(path.sep).includes(THUNG_RAC)) return true
  return (await fs.promises.lstat(nguon)).isSymbolicLink()
}
