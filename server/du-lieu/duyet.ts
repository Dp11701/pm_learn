import { homNay } from '../../shared/clock.ts'
import type { NguonBanNhap, TrangThaiNoiDung } from '../../shared/domain/trang-thai.ts'
import {
  docFrontmatterCuaMuc,
  duKhoiChuaCo,
  phanTichBai,
  type KetQuaBai,
  type LoiDong,
} from '../../shared/noi-dung/index.ts'
import type { MucHoc } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import { LoiApi } from '../loi.ts'
import { kiemDuongDanTruoc } from '../nhap/ke-hoach.ts'
import { bamNoiDung } from '../noi-dung/bam.ts'
import { docTepTai } from '../noi-dung/doc-bai.ts'
import { duongDanCuaMuc } from '../noi-dung/duong-dan.ts'
import type { YeuCauFileOp } from '../noi-dung/file-ops.ts'
import type { CanhBaoDuyet } from '../noi-dung/hop-dong-bai.ts'
import type { KhoNoiDung } from '../noi-dung/kho-noi-dung.ts'
import { LoiSuaFrontmatter, suaFrontmatter } from '../noi-dung/sua-frontmatter.ts'
import { TB_DUYET } from '../noi-dung/thong-bao-duyet.ts'
import { chupBanDuyet, coBanChup, docBanChupHienHanh } from './ban-chup-duyet.ts'
import { docSoTheoVai, docTepCuaMuc } from './so-noi-dung.ts'

// Duyệt bài gọn (bước 4; đề xuất 1.6, 3.6, 3.7 rút gọn theo mục 10; bất biến 5, 7; Cần chốt 13 — không Hoàn tác):
// - Duyệt bản nháp: frontmatter trang_thai_noi_dung → da-duyet, ngay_duyet → hôm nay (server); phần còn lại của
//   file giữ nguyên từng byte (sua-frontmatter.ts). Một file_op 'duyet' (bản nháp cũ được file_ops chép vào thùng
//   rác trước khi ghi) + bản chụp content_approvals trong cùng transaction → Đã duyệt.
// - Duyệt bản sửa: <slug>.ban-sua.md (ghi da-duyet + ngay_duyet) thay <slug>.md (bản đã duyệt cũ vào thùng rác),
//   bản sửa vào thùng rác, bản chụp mới thay bản cũ (superseded_at) — một file_op 'duyet-ban-sua', đường thứ hai
//   duy nhất được ghi đè bài Đã duyệt (bất biến 5, kiểm trong file-ops.ts).
// - Bỏ bản sửa: <slug>.ban-sua.md vào thùng rác (file_op 'bo-ban-sua'); bài Đã duyệt không đổi.
// hashNhap = sha256 của file người dùng đang đọc (hashFile của GET /api/bai/:id; bản sửa: hash của
// GET /api/duyet/:id): file trên đĩa khác → 409, không đổi gì. Mọi thao tác chạy trong khoá của kho nội dung
// (nối tiếp với quét / nhập), chạy tiếp file_op dở dang trước. Hoàn tác qua /api/nhap/hoan-tac chỉ nhận thao tác
// nhập, nên lần duyệt không đảo được.

// ---------- Hợp đồng (web khai lại bằng zod ở src/app/du-lieu/duyet.ts) ----------

export interface DuKhoi {
  co: number
  tong: number
}

/** Một bản nháp chờ duyệt (bảng chính tab Chờ duyệt). */
export interface DongBanNhapCho {
  id: string
  nguon: NguonBanNhap
  /** YYYY-MM-DD: ngày nhập của file (sổ nội dung) */
  ngayNhap: string
  duKhoi: DuKhoi
  /** File lỗi frontmatter / quá 256 KB: chưa duyệt được tới khi sửa file */
  coLoi: boolean
  /**
   * File đã ghi da-duyet mà app chưa có bản chụp hiện hành — cùng giá trị với canhBaoDuyet của GET /api/bai/:id:
   * không duyệt được ở đây (409), chỉ "Quét lại" rồi "Nhận là Đã duyệt"; null = bản nháp thường
   */
  canhBaoDuyet: CanhBaoDuyet | null
}

/** Một bản sửa chờ duyệt (nhóm phụ "Bản sửa chờ duyệt"). */
export interface DongBanSuaCho {
  id: string
  ngayNhap: string
}

/** GET /api/duyet/cho-duyet — sắp theo ngày nhập mới nhất, cùng ngày theo thứ tự cây. */
export interface PhanHoiChoDuyet {
  banNhap: DongBanNhapCho[]
  banSua: DongBanSuaCho[]
}

/** Bản sửa của một mục (banner bản sửa trên trang bài). */
export interface ChiTietBanSua {
  /** sha256 của file bản sửa — gửi lại làm hashNhap; null khi file quá 256 KB (không đọc) */
  hash: string | null
  /** Đường dẫn tương đối trong thư mục nội dung */
  duongDan: string
  ngayNhap: string
  duKhoi: DuKhoi
  /** Tên các khối ★ còn thiếu (theo mẫu bài của mục) */
  thieu: string[]
  /** Lỗi frontmatter / file quá lớn: không duyệt được tới khi sửa file */
  loiDoc: LoiDong | null
}

/** GET /api/duyet/:id */
export interface PhanHoiChiTietDuyet {
  /** YYYY-MM-DD theo server: ngày sẽ ghi vào ngay_duyet nếu duyệt hôm nay */
  homNay: string
  /** null khi mục không có bản sửa đã nhận (hoặc chưa Đã duyệt) */
  banSua: ChiTietBanSua | null
}

/** POST /api/duyet/:id, POST /api/duyet/:id/ban-sua */
export interface KetQuaDuyet {
  /** Revision nội dung (cùng số với /api/meta noiDung.revision) */
  revision: number
  /** YYYY-MM-DD đã ghi vào ngay_duyet */
  ngayDuyet: string
}

/** POST /api/duyet/:id/bo-ban-sua */
export interface KetQuaBoBanSua {
  revision: number
}

// ---------- Khối ★ ----------

/** Tên khối ★ (viết trong file) chưa có chữ hợp lệ — đúng phần bù của KetQuaBai.duKhoi. */
export function khoiThieu(kq: KetQuaBai): string[] {
  return kq.boCuc.flatMap((o) =>
    o.mau?.batBuoc && o.mau.nguon === 'file' && !o.khoi.some((k) => k.coChu && !k.coLoi)
      ? [o.mau.tieuDe]
      : [],
  )
}

// ---------- Kế hoạch (tách để test giết tiến trình giữa chừng qua file_ops) ----------

export interface KeHoachDuyet {
  yc: YeuCauFileOp
  ngayDuyet: string
}

type LoaiBan = 'bai' | 'ban-sua'

/**
 * Ghi da-duyet + ngay_duyet vào frontmatter; file lỗi frontmatter → 409. Bản nháp mà file đã ghi da-duyet (app chưa
 * có bản chụp hiện hành: ◎ / đổi ngoài app, đề xuất 1.6) → 409: chỉ "Quét lại" + "Nhận là Đã duyệt" (giữ ngay_duyet
 * của file) mới nhận được, duyệt ở đây sẽ ghi đè ngày đó.
 */
function ghiDaDuyet(text: string, muc: MucHoc, ngay: string, ban: LoaiBan): string {
  const cauLoi = ban === 'bai' ? TB_DUYET.loiFrontmatter : TB_DUYET.loiFrontmatterBanSua
  const fm = docFrontmatterCuaMuc(text, muc)
  if (!fm.frontmatter) {
    const loi = fm.loi ?? { dong: 1, thongBao: 'không đọc được frontmatter' }
    throw new LoiApi(409, cauLoi(loi.dong, loi.thongBao))
  }
  if (ban === 'bai' && fm.frontmatter.trangThaiNoiDung === 'da-duyet') {
    throw new LoiApi(409, TB_DUYET.fileGhiDaDuyet)
  }
  try {
    return suaFrontmatter(text, { dat: { trang_thai_noi_dung: 'da-duyet', ngay_duyet: ngay } })
  } catch (loi) {
    if (loi instanceof LoiSuaFrontmatter) throw new LoiApi(409, cauLoi(1, loi.message))
    throw loi
  }
}

/** Đọc file đã nhận của mục theo vai, kiểm hashNhap; trả nội dung đã ghi da-duyet. */
async function docVaKiem(db: Db, noiDungDir: string, muc: MucHoc, ban: LoaiBan, hashNhap: string) {
  const dong = docTepCuaMuc(db, muc.id, ban)
  const tep = dong ? await docTepTai(noiDungDir, dong.path) : null
  if (!dong || !tep) {
    throw new LoiApi(409, ban === 'bai' ? TB_DUYET.khongCoBanNhap : TB_DUYET.khongCoBanSua)
  }
  if ('quaLon' in tep) {
    throw new LoiApi(409, ban === 'bai' ? TB_DUYET.quaLon : TB_DUYET.quaLonBanSua)
  }
  if (tep.hash !== hashNhap) {
    throw new LoiApi(409, ban === 'bai' ? TB_DUYET.banNhapDaDoi : TB_DUYET.banSuaDaDoi)
  }
  const ngayDuyet = homNay()
  const noiDung = ghiDaDuyet(tep.noiDung, muc, ngayDuyet, ban)
  return { dong, tep, ngayDuyet, noiDung, hashMoi: bamNoiDung(noiDung) }
}

/**
 * Kế hoạch "Duyệt bài" cho bản nháp của mục (đọc đĩa + DB, chưa ghi gì). 409: mục đã duyệt, không có bản
 * nháp, file đã đổi so với hashNhap, file lỗi frontmatter / quá lớn, file đã ghi da-duyet (◎ / đổi ngoài app).
 */
export async function keHoachDuyetBai(
  db: Db,
  noiDungDir: string,
  muc: MucHoc,
  hashNhap: string,
): Promise<KeHoachDuyet> {
  if (docBanChupHienHanh(db, muc.id)) throw new LoiApi(409, TB_DUYET.daDuyetRoi)
  const { dong, ngayDuyet, noiDung, hashMoi } = await docVaKiem(
    db,
    noiDungDir,
    muc,
    'bai',
    hashNhap,
  )
  return {
    ngayDuyet,
    yc: {
      op: 'duyet',
      buoc: [
        {
          tu: null,
          den: dong.path,
          hashMoi,
          noiDung,
          // Duyệt không phải lần nhập mới: giữ ngày nhập
          so: { itemId: muc.id, vai: 'bai', ngayNhap: dong.importedOn },
        },
      ],
      thayDoiDb: () => {
        chupBanDuyet(db, { itemId: muc.id, noiDung, ngayDuyet })
      },
    },
  }
}

/**
 * Kế hoạch "Duyệt bản sửa": bản sửa (ghi da-duyet + ngay_duyet) thay bài Đã duyệt, bản sửa vào thùng rác, bản
 * chụp mới. 409: mục chưa duyệt, không có bản sửa, file bản sửa đã đổi so với hashNhap, lỗi frontmatter.
 */
export async function keHoachDuyetBanSua(
  db: Db,
  noiDungDir: string,
  muc: MucHoc,
  hashNhap: string,
): Promise<KeHoachDuyet> {
  if (!docBanChupHienHanh(db, muc.id)) throw new LoiApi(409, TB_DUYET.chuaDuyet)
  const { dong, tep, ngayDuyet, noiDung, hashMoi } = await docVaKiem(
    db,
    noiDungDir,
    muc,
    'ban-sua',
    hashNhap,
  )
  const den = docTepCuaMuc(db, muc.id, 'bai')?.path ?? duongDanCuaMuc(muc, 'bai')
  return {
    ngayDuyet,
    yc: {
      op: 'duyet-ban-sua',
      buoc: [
        // Bài Đã duyệt cũ: file_ops chép vào thùng rác trước khi ghi đè
        {
          tu: null,
          den,
          hashMoi,
          noiDung,
          so: { itemId: muc.id, vai: 'bai', ngayNhap: dong.importedOn },
        },
        // Bản sửa vào thùng rác (dòng sổ ban-sua được gỡ)
        { tu: dong.path, den: null, hashMoi: tep.hash },
      ],
      thayDoiDb: () => {
        chupBanDuyet(db, { itemId: muc.id, noiDung, ngayDuyet })
      },
    },
  }
}

/** Kế hoạch "Bỏ bản sửa": file bản sửa vào thùng rác (đã mất trên đĩa thì chỉ gỡ dòng sổ). 409: không có. */
export async function keHoachBoBanSua(
  db: Db,
  noiDungDir: string,
  muc: MucHoc,
): Promise<YeuCauFileOp> {
  const dong = docTepCuaMuc(db, muc.id, 'ban-sua')
  if (!dong) throw new LoiApi(409, TB_DUYET.khongCoBanSua)
  const tep = await docTepTai(noiDungDir, dong.path)
  const hash = tep && !('quaLon' in tep) ? tep.hash : dong.hash
  return { op: 'bo-ban-sua', buoc: [{ tu: dong.path, den: null, hashMoi: hash }] }
}

// ---------- Thao tác (trong khoá của kho nội dung) ----------

async function chay(kho: KhoNoiDung, lap: () => Promise<YeuCauFileOp>) {
  await kho.chayTiepOpDo()
  const yc = await lap()
  // Symlink, đường dẫn ra ngoài thư mục nội dung… → 409 trước khi ghi gì (bước lỗi không được nửa vời)
  await kiemDuongDanTruoc(kho.noiDungDir, yc.buoc)
  return kho.thucHien(yc)
}

/** POST /api/duyet/:id */
export function duyetBai(kho: KhoNoiDung, muc: MucHoc, hashNhap: string): Promise<KetQuaDuyet> {
  return kho.khoa(async () => {
    let ngayDuyet = ''
    const kq = await chay(kho, async () => {
      const kh = await keHoachDuyetBai(kho.db, kho.noiDungDir, muc, hashNhap)
      ngayDuyet = kh.ngayDuyet
      return kh.yc
    })
    return { revision: kq.revision, ngayDuyet }
  })
}

/** POST /api/duyet/:id/ban-sua */
export function duyetBanSua(kho: KhoNoiDung, muc: MucHoc, hashNhap: string): Promise<KetQuaDuyet> {
  return kho.khoa(async () => {
    let ngayDuyet = ''
    const kq = await chay(kho, async () => {
      const kh = await keHoachDuyetBanSua(kho.db, kho.noiDungDir, muc, hashNhap)
      ngayDuyet = kh.ngayDuyet
      return kh.yc
    })
    return { revision: kq.revision, ngayDuyet }
  })
}

/** POST /api/duyet/:id/bo-ban-sua */
export function boBanSua(kho: KhoNoiDung, muc: MucHoc): Promise<KetQuaBoBanSua> {
  return kho.khoa(async () => {
    const kq = await chay(kho, () => keHoachBoBanSua(kho.db, kho.noiDungDir, muc))
    return { revision: kq.revision }
  })
}

// ---------- Đọc ----------

/** Đủ khối theo hash file (phân tích lại chỉ khi file đổi), riêng mỗi kho. */
const demDuKhoi = new WeakMap<KhoNoiDung, Map<string, { hash: string; duKhoi: DuKhoi }>>()

async function duKhoiTep(
  kho: KhoNoiDung,
  muc: MucHoc,
  duongDan: string,
): Promise<{ duKhoi: DuKhoi; coLoi: boolean; ghiDaDuyet: boolean }> {
  const tep = await docTepTai(kho.noiDungDir, duongDan)
  if (!tep) return { duKhoi: duKhoiChuaCo(muc.mau), coLoi: false, ghiDaDuyet: false }
  if ('quaLon' in tep) return { duKhoi: duKhoiChuaCo(muc.mau), coLoi: true, ghiDaDuyet: false }
  let dem = demDuKhoi.get(kho)
  if (!dem) {
    dem = new Map()
    demDuKhoi.set(kho, dem)
  }
  const fm = docFrontmatterCuaMuc(tep.noiDung, muc).frontmatter
  const coLoi = fm === null
  const ghiDaDuyet = fm?.trangThaiNoiDung === 'da-duyet'
  const cu = dem.get(muc.id)
  if (cu?.hash === tep.hash) return { duKhoi: cu.duKhoi, coLoi, ghiDaDuyet }
  const { duKhoi } = phanTichBai(tep.noiDung, muc)
  dem.set(muc.id, { hash: tep.hash, duKhoi })
  return { duKhoi, coLoi, ghiDaDuyet }
}

/** Ngày nhập mới nhất trước; cùng ngày giữ thứ tự cây (sort ổn định trên danh sách đã theo thứ tự cây). */
function sapMoiTruoc<T extends { ngayNhap: string }>(ds: T[]): T[] {
  return ds.sort((a, b) => (a.ngayNhap < b.ngayNhap ? 1 : a.ngayNhap > b.ngayNhap ? -1 : 0))
}

/**
 * GET /api/duyet/cho-duyet: mọi mục Bản nháp (cùng quy tắc với GET /api/noi-dung/trang-thai, nên khớp badge Nội
 * dung) + bản sửa. Bản nháp mà file đã ghi da-duyet (◎ / đổi ngoài app) vẫn liệt kê nhưng có canhBaoDuyet (cùng quy
 * tắc với quyetDinhBai ở doc-bai.ts) để tab mời "Quét lại" thay vì "Duyệt".
 */
export async function dsChoDuyet(kho: KhoNoiDung): Promise<PhanHoiChoDuyet> {
  const trangThai = await kho.trangThaiTatCa()
  const soBai = docSoTheoVai(kho.db, 'bai')
  const soSua = docSoTheoVai(kho.db, 'ban-sua')
  const banNhap: DongBanNhapCho[] = []
  const banSua: DongBanSuaCho[] = []
  // cay.mucTheoId giữ thứ tự cây
  for (const muc of kho.cay.mucTheoId.values()) {
    const tt: TrangThaiNoiDung | undefined = trangThai[muc.id]
    if (tt?.loai === 'ban-nhap') {
      const dong = soBai.get(muc.id)
      if (!dong) continue
      const { duKhoi, coLoi, ghiDaDuyet } = await duKhoiTep(kho, muc, dong.path)
      const canhBaoDuyet: CanhBaoDuyet | null = ghiDaDuyet
        ? coBanChup(kho.db, muc.id)
          ? 'doi-ngoai-app'
          : 'chua-xac-nhan'
        : null
      banNhap.push({
        id: muc.id,
        nguon: tt.nguon,
        ngayNhap: dong.importedOn,
        duKhoi,
        coLoi,
        canhBaoDuyet,
      })
    } else if (tt?.loai === 'da-duyet' && tt.coBanSua) {
      const dong = soSua.get(muc.id)
      if (dong) banSua.push({ id: muc.id, ngayNhap: dong.importedOn })
    }
  }
  return { banNhap: sapMoiTruoc(banNhap), banSua: sapMoiTruoc(banSua) }
}

/** GET /api/duyet/:id: hôm nay theo server + bản sửa của mục Đã duyệt (hash để duyệt, khối ★ thiếu). */
export async function chiTietDuyet(kho: KhoNoiDung, muc: MucHoc): Promise<PhanHoiChiTietDuyet> {
  const db = kho.db
  const dong = docBanChupHienHanh(db, muc.id) ? docTepCuaMuc(db, muc.id, 'ban-sua') : undefined
  const tep = dong && dong.missingSince === null ? await docTepTai(kho.noiDungDir, dong.path) : null
  if (!dong || !tep) return { homNay: homNay(), banSua: null }
  const chung = { duongDan: dong.path, ngayNhap: dong.importedOn }
  if ('quaLon' in tep) {
    return {
      homNay: homNay(),
      banSua: {
        ...chung,
        hash: null,
        duKhoi: duKhoiChuaCo(muc.mau),
        thieu: [],
        loiDoc: { dong: 1, thongBao: TB_DUYET.quaLonBanSua },
      },
    }
  }
  const kq = phanTichBai(tep.noiDung, muc)
  return {
    homNay: homNay(),
    banSua: { ...chung, hash: tep.hash, duKhoi: kq.duKhoi, thieu: khoiThieu(kq), loiDoc: kq.loi },
  }
}
