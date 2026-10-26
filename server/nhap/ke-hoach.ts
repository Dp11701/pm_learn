import { homNay } from '../../shared/clock.ts'
import type { Db } from '../db/index.ts'
import { chupBanDuyet, type ChupBan } from '../du-lieu/ban-chup-duyet.ts'
import { LoiApi } from '../loi.ts'
import { bamNoiDung } from '../noi-dung/bam.ts'
import { duongDanChuan, khoaDuongDan, type CayNoiDung } from '../noi-dung/duong-dan.ts'
import type { BuocFile } from '../noi-dung/file-ops.ts'
import { LoiTep, giaiDuongDan, laTrongThungRac } from '../noi-dung/ghi-tep.ts'
import { LoiSuaFrontmatter, fileConCua, noiDungGhi, type AnhDb, type DanhGia } from './danh-gia.ts'
import type { Dich } from './khop.ts'
import { dichGhi, type TepKiem } from './phan-loai.ts'

// Từ các việc nhập đã quyết → các bước file_ops (đề xuất 1.6) cho MỘT thao tác 'nhap' / 'nhap-quet-lai' (Hoàn
// tác được qua POST /api/nhap/hoan-tac):
//  1. file nguồn của Quét lại không nằm ở đích → vào thùng rác (trước mọi lần ghi, để không ghi đè lên nguồn
//     của file khác trong lô);
//  2. file đã nhận đang có của mục ở chỗ khác đích (bản nháp / bản sửa bị thay) → thùng rác;
//  3. ghi nội dung đã chuẩn bị (ép ban-nhap, id của mục) vào đường dẫn chuẩn (file đang có ở đó được file_ops
//     chép vào thùng rác trước); nguồn đã nằm đúng chỗ và không đổi chữ → chỉ ghi sổ tại chỗ.
// Quét lại, "Nhập thành bản sửa": <slug>.md của mục Đã duyệt phải về đúng bản chụp. Việc đó KHÔNG nằm trong
// thao tác nhập (Hoàn tác lần nhập sẽ phải ghi lại bản ngoài app vào bài Đã duyệt — bất biến 5 chặn): kế hoạch
// chỉ trả danh sách mục `giuBanCu`, nơi gọi chạy "Giữ bản cũ" (thao tác 'giu-ban-cu' riêng) sau khi nhập xong.
// Ngày nhập: hôm nay (server); ◎ nhận tại chỗ của file đã nhận giữ ngày cũ.

export type CachNhap =
  /** Bản nháp ở đường dẫn chuẩn (bai / tong-quan) */
  | 'ban-nhap'
  /** Mục Đã duyệt → <slug>.ban-sua.md */
  | 'ban-sua'
  /** ◎ Nhận là Đã duyệt: giữ da-duyet + ngay_duyet, chụp bản */
  | 'nhan-da-duyet'
  /** ⟳ Giữ bản cũ với file ngoài (Quét lại, không phải file đã nhận): file vào thùng rác */
  | 'bo-vao-rac'

export interface ViecNhap {
  chiSo: number
  tep: TepKiem
  dich: Dich
  dg: DanhGia
  cach: CachNhap
}

export interface KeHoachNhap {
  buoc: BuocFile[]
  thayDoiDb: () => void
  /** chỉ số bước ghi → dòng đã nhập */
  daNhapTheoBuoc: Map<number, { chiSo: number; mucId: string; duongDan: string }>
  /** Mục Đã duyệt (Quét lại, Nhập thành bản sửa) cần "Giữ bản cũ" sau khi nhập bản sửa thành công */
  giuBanCu: string[]
}

interface NguCanhKeHoach {
  db: Db
  cay: CayNoiDung
  nguon: 'tha' | 'quet-lai'
  anh: AnhDb
}

export async function lapKeHoach(
  nc: NguCanhKeHoach,
  ds: readonly ViecNhap[],
): Promise<KeHoachNhap> {
  const { cay, anh } = nc
  const racNguon: BuocFile[] = []
  const racThay: BuocFile[] = []
  const ghi: { buoc: BuocFile; daNhap?: { chiSo: number; mucId: string; duongDan: string } }[] = []
  const giuBanCu: string[] = []
  const chup: ChupBan[] = []
  const daVaoRac = new Set<string>()
  const vaoRac = (dich: BuocFile[], tu: string, hash: string) => {
    const k = khoaDuongDan(tu)
    if (daVaoRac.has(k)) return
    daVaoRac.add(k)
    dich.push({ tu, den: null, hashMoi: hash })
  }

  for (const v of ds) {
    const { tep, dich, dg, cach } = v
    const nguon = tep.duongDan !== undefined && tep.hashDia ? tep.duongDan : null
    if (cach === 'bo-vao-rac') {
      if (nguon && tep.hashDia) vaoRac(racNguon, nguon, tep.hashDia)
      continue
    }
    if (tep.noiDung === null || !dg.fm) continue
    const daDuyet = cach === 'ban-sua'
    const { vai, duongDan: den } = dichGhi(cay, dich, daDuyet)
    let noiDung: string
    try {
      noiDung = noiDungGhi(tep.noiDung, dg.fm, dich.id, cach === 'nhan-da-duyet')
    } catch (loi) {
      if (loi instanceof LoiSuaFrontmatter) throw new LoiApi(409, `“${tep.ten}”: ${loi.message}.`)
      throw loi
    }
    const hashMoi = bamNoiDung(noiDung)
    const ngayNhap =
      cach === 'nhan-da-duyet' && tep.dangKy
        ? (anh.soTheoDuongDan.get(tep.duongDan ?? '')?.importedOn ?? homNay())
        : homNay()
    const so = { itemId: dich.id, vai, ngayNhap }
    const daNhap = { chiSo: v.chiSo, mucId: dich.id, duongDan: den }

    // Nguồn (Quét lại): cùng chỗ đích → ghi / nhận tại chỗ; khác chỗ → thùng rác (trừ bài Đã duyệt của mục:
    // "Giữ bản cũ" sau khi nhập đưa bản ngoài app vào thùng rác)
    const cungCho = nguon !== null && khoaDuongDan(nguon) === khoaDuongDan(den)
    if (cungCho && tep.hashDia === hashMoi) {
      ghi.push({ buoc: { tu: nguon, den, hashMoi, so }, daNhap })
    } else {
      ghi.push({ buoc: { tu: null, den, hashMoi, noiDung, so }, daNhap })
      const baiDaDuyet = dg.daDuyet ? duongDanChuan(cay, dich.id, 'bai') : undefined
      const laBaiDaDuyet =
        baiDaDuyet !== undefined &&
        nguon !== null &&
        khoaDuongDan(nguon) === khoaDuongDan(baiDaDuyet)
      if (nguon && tep.hashDia && !cungCho && !laBaiDaDuyet) vaoRac(racNguon, nguon, tep.hashDia)
    }

    // File đã nhận đang có của mục ở chỗ khác → thùng rác
    const dangCo = fileConCua(anh, dich.id, vai)
    if (
      dangCo &&
      khoaDuongDan(dangCo.path) !== khoaDuongDan(den) &&
      (nguon === null || khoaDuongDan(dangCo.path) !== khoaDuongDan(nguon)) &&
      !laTrongThungRac(dangCo.path)
    ) {
      vaoRac(racThay, dangCo.path, dangCo.hash)
    }

    if (cach === 'nhan-da-duyet') chup.push({ itemId: dich.id, noiDung })

    // Quét lại + bản sửa: bài Đã duyệt phải về đúng bản chụp — Giữ bản cũ sau khi nhập (ngoài thao tác nhập)
    if (cach === 'ban-sua' && nc.nguon === 'quet-lai' && dich.muc) giuBanCu.push(dich.id)
  }

  const buoc: BuocFile[] = [...racNguon, ...racThay]
  const daNhapTheoBuoc = new Map<number, { chiSo: number; mucId: string; duongDan: string }>()
  for (const g of ghi) {
    if (g.daNhap) daNhapTheoBuoc.set(buoc.length, g.daNhap)
    buoc.push(g.buoc)
  }
  return {
    buoc,
    daNhapTheoBuoc,
    giuBanCu,
    thayDoiDb: () => {
      for (const c of chup) chupBanDuyet(nc.db, c)
    },
  }
}

/**
 * Kiểm trước mọi đường dẫn của các bước (symlink, đi ra ngoài thư mục nội dung…): có lỗi → 409, chưa làm gì.
 */
export async function kiemDuongDanTruoc(goc: string, buoc: readonly BuocFile[]): Promise<void> {
  for (const b of buoc) {
    for (const p of [b.tu, b.den]) {
      if (p === null) continue
      try {
        await giaiDuongDan(goc, p)
      } catch (loi) {
        if (loi instanceof LoiTep) throw new LoiApi(409, loi.message)
        throw loi
      }
    }
  }
}
