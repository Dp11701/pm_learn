import type { Stats } from 'node:fs'
import type { TrangThaiNoiDung } from '../../shared/domain/trang-thai.ts'
import type { MucHoc } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import { docCacBanChupHienHanh } from '../du-lieu/ban-chup-duyet.ts'
import { docSoTheoVai } from '../du-lieu/so-noi-dung.ts'
import {
  coBanSuaDaNhan,
  dauTepCua,
  docTepTai,
  trangThaiNoiDungCua,
  type DauTep,
  type TepBai,
} from './doc-bai.ts'
import type { PhanHoiTrangThaiNoiDung } from './hop-dong-bai.ts'
import { statTepTrongGoc } from './tep-an-toan.ts'

// GET /api/noi-dung/trang-thai: trạng thái nội dung của mọi mục học (chip nội dung ở pager, Mục liên quan…),
// đúng quy tắc của GET /api/bai/:id (trangThaiNoiDungCua, dauTepCua ở doc-bai.ts — không viết lại). Từ phase
// 2b chỉ xét file ĐÃ NHẬN (sổ content_files), như GET /api/bai/:id.

/** Khoá bộ nhớ đệm: file coi như chưa đổi khi cùng đường dẫn, dev/ino, kích thước, mtime và ctime. */
function khoaStat(duongDan: string, st: Stats): string {
  return [duongDan, st.dev, st.ino, st.size, st.mtimeMs, st.ctimeMs].join('|')
}

export interface BoTrangThaiNoiDung {
  /** { [id mục]: trạng thái } cho mọi mục có bản chụp hiện hành hoặc có file đã nhận; thiếu khoá = Chưa có. */
  docTatCa(db: Db, cacMuc: Iterable<MucHoc>): Promise<PhanHoiTrangThaiNoiDung>
}

/**
 * Trạng thái nội dung của mọi mục, rẻ cho cả cây: mục có bản chụp hiện hành không đụng đĩa; mục khác chỉ
 * lstat file đã nhận (cùng quy tắc an toàn của docTepTrongGoc), đọc + phân tích frontmatter khi file mới
 * hoặc đã đổi (đệm theo dev/ino/size/mtime/ctime), không phân tích thân bài.
 * @param docTep hàm đọc một file theo đường dẫn tương đối (mặc định docTepTai; test truyền hàm đếm số lần đọc)
 */
export function taoBoTrangThaiNoiDung(
  noiDungDir: string,
  docTep: (noiDungDir: string, duongDan: string) => Promise<TepBai | null> = docTepTai,
): BoTrangThaiNoiDung {
  const dem = new Map<string, { khoa: string; dau: DauTep }>()

  async function dauTepMuc(muc: MucHoc, duongDan: string): Promise<DauTep | null> {
    const st = await statTepTrongGoc(noiDungDir, duongDan)
    if (!st.ok) {
      dem.delete(muc.id)
      return null
    }
    const khoa = khoaStat(duongDan, st.thongTin)
    const cu = dem.get(muc.id)
    if (cu?.khoa === khoa) return cu.dau
    const tep = await docTep(noiDungDir, duongDan)
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
      const bai = docSoTheoVai(db, 'bai')
      const banSua = docSoTheoVai(db, 'ban-sua')
      const cap = await Promise.all(
        [...cacMuc].map(async (muc) => {
          const bc = banChup.get(muc.id)
          if (bc) {
            return [
              muc.id,
              trangThaiNoiDungCua(null, bc, coBanSuaDaNhan(banSua.get(muc.id))),
            ] as const
          }
          const dong = bai.get(muc.id)
          const dau = dong ? await dauTepMuc(muc, dong.path) : null
          return [muc.id, dau ? trangThaiNoiDungCua(dau, undefined) : null] as const
        }),
      )
      return Object.fromEntries(cap.filter((x): x is [string, TrangThaiNoiDung] => x[1] !== null))
    },
  }
}
