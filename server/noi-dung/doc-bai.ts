import type { TrangThaiNoiDung } from '../../shared/domain/trang-thai.ts'
import {
  TB,
  TOI_DA_BYTE_BAI,
  docFrontmatterCuaMuc,
  phanTichBai,
  soKb,
  type Frontmatter,
} from '../../shared/noi-dung/index.ts'
import type { MucHoc } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import {
  coBanChup,
  docBanChupHienHanh,
  type BanChupDuyet,
  type TomTatBanChup,
} from '../du-lieu/ban-chup-duyet.ts'
import { docTepCuaMuc, type DongSo } from '../du-lieu/so-noi-dung.ts'
import { bamNoiDung } from './bam.ts'
import type { CanhBaoDuyet, PhanHoiBai } from './hop-dong-bai.ts'
import { docTepTrongGoc } from './tep-an-toan.ts'

// Đọc bài của một mục học cho GET /api/bai/:id (quy tắc ở hop-dong-bai.ts) và quy tắc trạng thái nội dung
// dùng chung với GET /api/noi-dung/trang-thai (trang-thai-noi-dung.ts). Chỉ đọc: không ghi file, không ghi
// DB (bất biến 5). Từ phase 2b chỉ đọc file ĐÃ NHẬN (dòng 'bai' của mục trong sổ content_files, đề xuất 1.6):
// file chưa nhận không hiện trong bài tới khi Quét lại; bản nháp đã nhận bị sửa ngoài app thì đọc thẳng bản
// mới; file đã nhận bị xoá → như không có file (bài đã duyệt hiện bản chụp).

/** File bài trên đĩa: chữ (UTF-8) + sha256 của toàn bộ byte; hoặc file quá TOI_DA_BYTE_BAI (không đọc). */
export type TepBai = { noiDung: string; hash: string } | { quaLon: true; kichThuoc: number }

/** Đọc một file bài (tối đa 256 KB, đề xuất 1.7); null khi không có, symlink, không phải file thường. */
export async function docTepTai(noiDungDir: string, duongDan: string): Promise<TepBai | null> {
  const kq = await docTepTrongGoc(noiDungDir, duongDan, { toiDa: TOI_DA_BYTE_BAI })
  if (kq.ok) return { noiDung: kq.noiDung.toString('utf8'), hash: bamNoiDung(kq.noiDung) }
  if (kq.lyDo === 'qua-lon') return { quaLon: true, kichThuoc: kq.kichThuoc }
  return null
}

/** Đọc file ở đường dẫn chuẩn của mục (không qua sổ) — cho test và công cụ. */
export function docTepBai(noiDungDir: string, muc: MucHoc): Promise<TepBai | null> {
  return docTepTai(noiDungDir, muc.duongDanTuongDoi)
}

/** Bản sửa đã nhận và còn trên đĩa (theo lượt quét nhẹ gần nhất) → chip "Đã duyệt · có bản sửa chưa duyệt". */
export function coBanSuaDaNhan(dong: DongSo | undefined): boolean {
  return dong !== undefined && dong.missingSince === null
}

/** Phần đầu file đủ để quyết định trạng thái nội dung (không cần thân bài). */
export interface DauTep {
  /** Frontmatter đã kiểm theo mẫu bài của mục; null khi lỗi đọc file (frontmatter lỗi, file quá lớn) */
  frontmatter: Frontmatter | null
}

/** Đầu file của file bài: cùng docFrontmatterCuaMuc mà phanTichBai dùng (loai khác mẫu → null). */
export function dauTepCua(muc: MucHoc, tep: TepBai): DauTep {
  if ('quaLon' in tep) return { frontmatter: null }
  return { frontmatter: docFrontmatterCuaMuc(tep.noiDung, muc).frontmatter }
}

/**
 * Quy tắc trạng thái nội dung (đề xuất 1.6, 3.6, bất biến 7) — dùng chung cho GET /api/bai/:id và
 * GET /api/noi-dung/trang-thai:
 *  - có bản chụp duyệt hiện hành → Đã duyệt (ngày của bản chụp), dù file bị sửa / xoá / lỗi;
 *  - không bản chụp, không file → Chưa có;
 *  - có file → Bản nháp; nguồn theo frontmatter, không đọc được (lỗi frontmatter, loai khác mẫu, file quá
 *    lớn) → ai (1.5). File ghi da-duyet mà không có bản chụp hiện hành vẫn là Bản nháp.
 * @param dau đầu file ở đường dẫn chuẩn; null = không có file
 * @param banChup bản chụp duyệt HIỆN HÀNH (superseded_at IS NULL); undefined = không có
 * @param coBanSua mục đã duyệt có bản sửa đã nhận (chỉ xét khi có bản chụp)
 */
export function trangThaiNoiDungCua(
  dau: DauTep | null,
  banChup: Pick<TomTatBanChup, 'ngayDuyet'> | undefined,
  coBanSua = false,
): TrangThaiNoiDung {
  if (banChup) {
    return coBanSua
      ? { loai: 'da-duyet', ngayDuyet: banChup.ngayDuyet, coBanSua: true }
      : { loai: 'da-duyet', ngayDuyet: banChup.ngayDuyet }
  }
  if (!dau) return { loai: 'chua-co' }
  return { loai: 'ban-nhap', nguon: dau.frontmatter?.nguon ?? 'ai' }
}

/**
 * Quyết định trạng thái nội dung + bài hiện, từ file trên đĩa và bản chụp duyệt.
 * @param coBanChupCu mục có bản chụp nào (kể cả đã bị thay) — chỉ xét khi không có bản chụp hiện hành
 * @param coBanSua mục có bản sửa đã nhận (chỉ xét khi có bản chụp hiện hành)
 *
 * File ghi da-duyet mà không có bản chụp hiện hành (đề xuất 1.6):
 *  - DB không có bản chụp nào của mục → 'chua-xac-nhan' (◎ "app chưa xác nhận");
 *  - DB chỉ còn bản chụp đã bị thay (superseded) → 'doi-ngoai-app': file là một bản khác bản app đang giữ
 *    (vd. bản đã duyệt cũ được chép lại), dù hash có trùng một bản chụp cũ hay không. Không có bản chụp hiện
 *    hành để hiện nên vẫn hiện file, tính Bản nháp; Quét lại (2b) xếp loại.
 */
export function quyetDinhBai(
  muc: MucHoc,
  tep: TepBai | null,
  banChup: BanChupDuyet | undefined,
  coBanChupCu = false,
  coBanSua = false,
): PhanHoiBai {
  const hashFile = tep && !('quaLon' in tep) ? tep.hash : null

  if (banChup) {
    // Mục đã duyệt: chỉ tin file khi hash khớp bản chụp (1.6); không thì hiện bản chụp (bất biến 7).
    const tepTin = tep && !('quaLon' in tep) && tep.hash === banChup.hash ? tep : null
    const kq = phanTichBai(tepTin ? tepTin.noiDung : banChup.noiDung, muc)
    return {
      muc: muc.id,
      trangThaiNoiDung: trangThaiNoiDungCua(null, banChup, coBanSua),
      bai: kq.loi ? null : kq,
      loiDoc: kq.loi,
      canhBaoDuyet: tepTin ? null : 'doi-ngoai-app',
      banHien: tepTin ? 'file' : 'ban-chup',
      hashFile,
    }
  }

  if (!tep) {
    return {
      muc: muc.id,
      trangThaiNoiDung: trangThaiNoiDungCua(null, undefined),
      bai: null,
      loiDoc: null,
      canhBaoDuyet: null,
      banHien: null,
      hashFile,
    }
  }

  if ('quaLon' in tep) {
    // File quá lớn: lỗi đọc file (F26), vẫn tính Bản nháp (bất biến 7).
    return {
      muc: muc.id,
      trangThaiNoiDung: trangThaiNoiDungCua(dauTepCua(muc, tep), undefined),
      bai: null,
      loiDoc: { dong: 1, thongBao: TB.fileQuaLon(soKb(tep.kichThuoc), soKb(TOI_DA_BYTE_BAI)) },
      canhBaoDuyet: null,
      banHien: 'file',
      hashFile,
    }
  }

  const kq = phanTichBai(tep.noiDung, muc)
  const ghiDaDuyet = kq.frontmatter?.trangThaiNoiDung === 'da-duyet'
  const canhBaoDuyet: CanhBaoDuyet | null = ghiDaDuyet
    ? coBanChupCu
      ? 'doi-ngoai-app'
      : 'chua-xac-nhan'
    : null
  return {
    muc: muc.id,
    // cùng quy tắc với GET /api/noi-dung/trang-thai: kq.frontmatter là docFrontmatterCuaMuc của file
    trangThaiNoiDung: trangThaiNoiDungCua({ frontmatter: kq.frontmatter }, undefined),
    bai: kq.loi ? null : kq,
    loiDoc: kq.loi,
    canhBaoDuyet,
    banHien: 'file',
    hashFile,
  }
}

/** Bài của mục: đọc file đã nhận + bản chụp hiện hành (+ có bản chụp cũ không) rồi quyết định. */
export async function docBai(db: Db, noiDungDir: string, muc: MucHoc): Promise<PhanHoiBai> {
  const dong = docTepCuaMuc(db, muc.id, 'bai')
  const tep = dong ? await docTepTai(noiDungDir, dong.path) : null
  const banChup = docBanChupHienHanh(db, muc.id)
  return quyetDinhBai(
    muc,
    tep,
    banChup,
    banChup === undefined && coBanChup(db, muc.id),
    banChup !== undefined && coBanSuaDaNhan(docTepCuaMuc(db, muc.id, 'ban-sua')),
  )
}
