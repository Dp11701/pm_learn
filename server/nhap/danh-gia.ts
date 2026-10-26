import {
  MAU_BAI,
  TB,
  docFrontmatter,
  phanTichBai,
  tachDong,
  type Frontmatter,
  type LoiDong,
} from '../../shared/noi-dung/index.ts'
import type { Db } from '../db/index.ts'
import { coBanChup, docCacBanChupHienHanh, type TomTatBanChup } from '../du-lieu/ban-chup-duyet.ts'
import { docSlugCu } from '../du-lieu/slug-cu.ts'
import { docSo, type DongSo, type VaiTep } from '../du-lieu/so-noi-dung.ts'
import {
  LoiSuaFrontmatter,
  suaFrontmatter,
  type SuaFrontmatter,
} from '../noi-dung/sua-frontmatter.ts'
import { khoaThieuHaiCham, type Dich } from './khop.ts'
import { TB_NHAP } from './thong-bao.ts'

// Đánh giá một file nhập với một đích (đề xuất 3.8): lỗi frontmatter / loai khác mẫu → ✕; mục Đã duyệt → ⟳;
// file ghi da-duyet mà DB chưa có bản chụp nào của mục → ◎; thiếu khối ★ → ⚠ Thiếu khối; còn lại ✓.
// Và chuẩn bị nội dung ghi (1.6): ép ban-nhap (trừ ◎ được nhận), id của đích (thêm khi thiếu, thay khi khác).

/** Ảnh trạng thái DB cho một lượt phân loại (đọc một lần cho cả lô). */
export interface AnhDb {
  /** Bản chụp duyệt hiện hành theo id nút */
  banChup: Map<string, TomTatBanChup>
  /** Nút có bản chụp nào (kể cả đã bị thay) */
  coBanChup(id: string): boolean
  /** Dòng sổ CÒN FILE (missing_since NULL) theo `${id}|${vai}` */
  soCon: Map<string, DongSo>
  /** Dòng sổ theo đường dẫn */
  soTheoDuongDan: Map<string, DongSo>
  slugCu: Record<string, string>
}

export function docAnhDb(db: Db): AnhDb {
  const banChup = docCacBanChupHienHanh(db)
  const dem = new Map<string, boolean>()
  const so = docSo(db)
  return {
    banChup,
    coBanChup(id) {
      let v = dem.get(id)
      if (v === undefined) {
        v = banChup.has(id) || coBanChup(db, id)
        dem.set(id, v)
      }
      return v
    },
    soCon: new Map(
      so.filter((d) => d.missingSince === null).map((d) => [`${d.itemId}|${d.role}`, d]),
    ),
    soTheoDuongDan: new Map(so.map((d) => [d.path, d])),
    slugCu: docSlugCu(db),
  }
}

export function fileConCua(anh: AnhDb, id: string, vai: VaiTep): DongSo | undefined {
  return anh.soCon.get(`${id}|${vai}`)
}

export type LoaiDanhGia = 'hop-le' | 'thieu-khoi' | 'trung-da-duyet' | 'chua-chup' | 'loi'

export interface DanhGia {
  loai: LoaiDanhGia
  /** Tên khối ★ thiếu (mục học) */
  thieu: string[]
  loi: LoiDong | null
  /** null khi lỗi */
  fm: Frontmatter | null
  /** Bản chụp hiện hành của đích (mục Đã duyệt) */
  daDuyet: TomTatBanChup | undefined
  /** File ghi da-duyet và sẽ được nhập thành bản nháp (không phải ◎) */
  chuyenVeBanNhap: boolean
}

/** Lỗi đọc frontmatter, thay câu chung "lỗi cú pháp YAML" bằng câu cụ thể khi dòng lỗi quên dấu ":" (F22). */
function loiCuThe(text: string, loi: LoiDong): LoiDong {
  if (loi.thongBao !== TB.yamlLoi) return loi
  const khoa = khoaThieuHaiCham(tachDong(text)[loi.dong - 1])
  return khoa ? { dong: loi.dong, thongBao: TB_NHAP.thieuHaiCham(khoa) } : loi
}

/** Frontmatter đọc chung (chưa biết đích); lỗi đã đổi sang câu cụ thể. */
export function docFrontmatterNhap(text: string): { fm: Frontmatter | null; loi: LoiDong | null } {
  const kq = docFrontmatter(text)
  return { fm: kq.frontmatter, loi: kq.loi ? loiCuThe(text, kq.loi) : null }
}

/**
 * @param noiDung chữ đã chuẩn hoá; null khi không đọc được (loiDoc)
 */
export function danhGia(
  noiDung: string | null,
  loiDoc: string | null,
  dich: Dich,
  anh: AnhDb,
): DanhGia {
  const daDuyet = anh.banChup.get(dich.id)
  const loiTep = (loi: LoiDong): DanhGia => ({
    loai: 'loi',
    thieu: [],
    loi,
    fm: null,
    daDuyet,
    chuyenVeBanNhap: false,
  })
  if (noiDung === null) return loiTep({ dong: 1, thongBao: loiDoc ?? TB.yamlLoi })

  let fm: Frontmatter | null
  let thieu: string[] = []
  if (dich.muc) {
    const bai = phanTichBai(noiDung, dich.muc)
    if (bai.loi || !bai.frontmatter)
      return loiTep(loiCuThe(noiDung, bai.loi ?? { dong: 1, thongBao: TB.yamlLoi }))
    fm = bai.frontmatter
    thieu = MAU_BAI[dich.muc.mau].khoi
      .filter(
        (km) =>
          km.batBuoc &&
          km.nguon === 'file' &&
          !bai.khoi.some((k) => k.mau?.id === km.id && k.coChu && !k.coLoi),
      )
      .map((km) => km.tieuDe)
  } else {
    const kq = docFrontmatterNhap(noiDung)
    if (kq.loi || !kq.fm) return loiTep(kq.loi ?? { dong: 1, thongBao: TB.yamlLoi })
    if (kq.fm.loai !== dich.loaiMau) {
      return loiTep({
        dong: kq.fm.dongKhoa.loai ?? 1,
        thongBao: TB.loaiKhacMau(kq.fm.loai, dich.loaiMau),
      })
    }
    fm = kq.fm
  }

  const ghiDaDuyet = fm.trangThaiNoiDung === 'da-duyet'
  let loai: LoaiDanhGia
  if (daDuyet) loai = 'trung-da-duyet'
  else if (ghiDaDuyet && !anh.coBanChup(dich.id)) loai = 'chua-chup'
  else loai = thieu.length > 0 ? 'thieu-khoi' : 'hop-le'
  return {
    loai,
    thieu,
    loi: null,
    fm,
    daDuyet,
    chuyenVeBanNhap: ghiDaDuyet && loai !== 'chua-chup',
  }
}

/**
 * Nội dung sẽ ghi cho đích (1.6, 3.8): `id` của đích (thêm lên đầu khi thiếu, thay khi khác — để không bị cảnh
 * báo "id khác mục" mãi về sau); ép `trang_thai_noi_dung: ban-nhap` và bỏ `ngay_duyet` trừ khi `giuDaDuyet`
 * (◎ Nhận là Đã duyệt). Khoá khác, chú thích, thân bài giữ nguyên từng byte; file đã đúng thì trả nguyên văn.
 * @throws LoiSuaFrontmatter
 */
export function noiDungGhi(
  text: string,
  fm: Frontmatter,
  idDich: string,
  giuDaDuyet: boolean,
): string {
  const dat: Record<string, string> = {}
  const xoa: string[] = []
  if (fm.id !== idDich) dat.id = idDich
  if (!giuDaDuyet) {
    if (!Object.hasOwn(fm.dongKhoa, 'trang_thai_noi_dung') || fm.trangThaiNoiDung !== 'ban-nhap') {
      dat.trang_thai_noi_dung = 'ban-nhap'
    }
    if (Object.hasOwn(fm.dongKhoa, 'ngay_duyet')) xoa.push('ngay_duyet')
  }
  if (Object.keys(dat).length === 0 && xoa.length === 0) return text
  const sua: SuaFrontmatter = { dat, xoa }
  return suaFrontmatter(text, sua)
}

export { LoiSuaFrontmatter }
