import type { Stats } from 'node:fs'
import type { TrangThaiNoiDung } from '../../shared/domain/trang-thai.ts'
import type { MucHoc } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import { docCacBanChupHienHanh } from '../du-lieu/ban-chup-duyet.ts'
import { dauTepCua, docTepBai, trangThaiNoiDungCua, type DauTep, type TepBai } from './doc-bai.ts'
import type { PhanHoiTrangThaiNoiDung } from './hop-dong-bai.ts'
import { statTepTrongGoc } from './tep-an-toan.ts'

// GET /api/noi-dung/trang-thai: trạng thái nội dung của mọi mục học (chip nội dung ở pager, Mục liên quan…),
// đúng quy tắc của GET /api/bai/:id (trangThaiNoiDungCua, dauTepCua ở doc-bai.ts — không viết lại).

/** Khoá bộ nhớ đệm: file coi như chưa đổi khi cùng đường dẫn, dev/ino, kích thước, mtime và ctime. */
function khoaStat(duongDan: string, st: Stats): string {
  return [duongDan, st.dev, st.ino, st.size, st.mtimeMs, st.ctimeMs].join('|')
}

export interface BoTrangThaiNoiDung {
  /** { [id mục]: trạng thái } cho mọi mục có bản chụp hiện hành hoặc có file; thiếu khoá = Chưa có. */
  docTatCa(db: Db, cacMuc: Iterable<MucHoc>): Promise<PhanHoiTrangThaiNoiDung>
}

/**
 * Trạng thái nội dung của mọi mục, rẻ cho cả cây: mục có bản chụp hiện hành không đụng đĩa; mục khác chỉ
 * lstat đường dẫn chuẩn (cùng quy tắc an toàn của docTepTrongGoc), đọc + phân tích frontmatter khi file mới
 * hoặc đã đổi (đệm theo dev/ino/size/mtime/ctime), không phân tích thân bài.
 * @param docTep hàm đọc file bài (mặc định docTepBai; test truyền hàm đếm số lần đọc)
 */
export function taoBoTrangThaiNoiDung(
  noiDungDir: string,
  docTep: (noiDungDir: string, muc: MucHoc) => Promise<TepBai | null> = docTepBai,
): BoTrangThaiNoiDung {
  const dem = new Map<string, { khoa: string; dau: DauTep }>()

  async function dauTepMuc(muc: MucHoc): Promise<DauTep | null> {
    const st = await statTepTrongGoc(noiDungDir, muc.duongDanTuongDoi)
    if (!st.ok) {
      dem.delete(muc.id)
      return null
    }
    const khoa = khoaStat(muc.duongDanTuongDoi, st.thongTin)
    const cu = dem.get(muc.id)
    if (cu?.khoa === khoa) return cu.dau
    const tep = await docTep(noiDungDir, muc)
    if (!tep) {
      dem.delete(muc.id)
      return null
    }
    const dau = dauTepCua(muc, tep)
    dem.set(muc.id, { khoa, dau })
    return dau
  }

  return {
    async docTatCa(db, cacMuc) {
      const banChup = docCacBanChupHienHanh(db)
      const cap = await Promise.all(
        [...cacMuc].map(async (muc) => {
          const bc = banChup.get(muc.id)
          const dau = bc ? null : await dauTepMuc(muc)
          return [muc.id, bc || dau ? trangThaiNoiDungCua(dau, bc) : null] as const
        }),
      )
      return Object.fromEntries(cap.filter((x): x is [string, TrangThaiNoiDung] => x[1] !== null))
    },
  }
}
