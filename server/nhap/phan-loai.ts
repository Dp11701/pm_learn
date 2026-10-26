import { dinhDangNgay } from '../../shared/dinh-dang.ts'
import type { Db } from '../db/index.ts'
import type { VaiTep } from '../du-lieu/so-noi-dung.ts'
import {
  duongDanChuan,
  khoaDuongDan,
  viTriChuanCua,
  type CayNoiDung,
} from '../noi-dung/duong-dan.ts'
import { statTepTrongGoc } from '../noi-dung/tep-an-toan.ts'
import {
  danhGia,
  docAnhDb,
  docFrontmatterNhap,
  fileConCua,
  type AnhDb,
  type DanhGia,
} from './danh-gia.ts'
import type { KetQuaFile, KhopTheo, LoaiKetQua, MucNgan, UngVien } from './hop-dong.ts'
import {
  chamDiem,
  dichTheoId,
  ganSanTheoDiem,
  idDocNhe,
  khopTen,
  laTepRieng,
  mucHocTheoId,
  ungVienTheoDiem,
  type DiemDich,
  type Dich,
} from './khop.ts'
import { TB_NHAP } from './thong-bao.ts'

// Phân loại một lô file nhập (đề xuất 1.6, 1.7, 3.8): khớp từng file với mục, mỗi mục tối đa một file trong
// lô (file sau → Không khớp mục), rồi đánh giá với mục đó. Dùng cho kéo thả (kiem-tra) và Quét lại; chạy lại
// y hệt lúc thuc-hien để kiểm "đã đổi từ lúc kiểm tra". Không ghi gì.
//
// Thứ tự giành mục trong lô (nhỏ thắng, cùng bậc theo thứ tự file):
//  0 file đã nhận (Quét lại) · 1 file nằm ở đường dẫn chuẩn của mục (Quét lại) · 2 khớp theo id · 3 khớp theo
//  tên file · sau cùng gán sẵn (?muc=, rồi Dice ≥ 0,7 hơn thứ hai ≥ 0,1).
// File lỗi không giành mục (vẫn hiện mục để "Mở trong trình soạn"), trừ file đã nhận / nằm ở đường dẫn chuẩn
// khi Quét lại — để file khác không ghi đè lên nó.
// Quét lại thêm (1.6 "2 file cùng id"): mục chưa duyệt đã có file đã nhận khác → file ở đường dẫn chuẩn thắng,
// file kia vào Không khớp mục; không gán sẵn theo Dice cho mục như vậy.

/** Một file trong lô. */
export interface TepKiem {
  chiSo: number
  /** basename */
  ten: string
  /** Chữ đã chuẩn hoá (bỏ BOM, NFC, LF); null khi không đọc được (loiDoc) hoặc file không còn */
  noiDung: string | null
  /** Câu lỗi khi không đọc được (quá lớn, không phải UTF-8) */
  loiDoc: string | null
  /** Quét lại: đường dẫn tương đối trên đĩa */
  duongDan?: string
  /** Quét lại: sha256 của byte trên đĩa; null = file không còn */
  hashDia?: string | null
  /** Quét lại: file đã nhận (dòng sổ ở duongDan, hoặc dòng của mục Đã duyệt khi file không còn) */
  dangKy?: { itemId: string; vai: VaiTep } | null
  /** Quét lại: file đã nhận mà id trong file khác mục đang nhận nó (1.6, bảng cuối) */
  xungDot?: { idTrongFile: string } | null
}

export interface NguCanhPhanLoai {
  db: Db
  cay: CayNoiDung
  noiDungDir: string
  nguon: 'tha' | 'quet-lai'
  /** id mục học của ?muc= (chỉ kéo thả) */
  mucMacDinh?: string
}

/** Một dòng kết quả kèm dữ liệu để nhập. */
export interface DongPhanLoai {
  /** khoaBoDem để null (nơi tạo token điền) */
  ketQua: KetQuaFile
  tep: TepKiem
  /** Đích của dòng khi `ketQua.muc` khác null */
  dich: Dich | null
  /** Đánh giá với `dich` */
  dg: DanhGia | null
  /** Dòng ⟳ "file không còn" bị thay bởi một file khác của cùng mục (Quét lại bỏ dòng này) */
  bo: boolean
}

function mucNgan(d: Dich): MucNgan {
  return { id: d.id, slug: d.slug, label: d.label }
}

function ungVien(d: Dich, diem: number): UngVien {
  return { ...mucNgan(d), diem: Math.round(diem * 1000) / 1000 }
}

/** Đường dẫn chuẩn của file sẽ ghi cho đích: mục Đã duyệt → bản sửa (bất biến 5). */
export function dichGhi(
  cay: CayNoiDung,
  dich: Dich,
  daDuyet: boolean,
): { vai: VaiTep; duongDan: string } {
  const vai: VaiTep = dich.vai === 'tong-quan' ? 'tong-quan' : daDuyet ? 'ban-sua' : 'bai'
  return { vai, duongDan: duongDanChuan(cay, dich.id, vai) as string }
}

/**
 * Nhập vào đích sẽ thay file đang có: file đã nhận (bản nháp / bản sửa / tổng quan) ở chỗ khác file này, hoặc
 * (kéo thả) một file đang nằm ở đường dẫn đích.
 */
export async function seThay(
  nc: Pick<NguCanhPhanLoai, 'cay' | 'noiDungDir' | 'nguon'>,
  anh: AnhDb,
  tep: TepKiem,
  dich: Dich,
  daDuyet: boolean,
): Promise<boolean> {
  const { vai, duongDan } = dichGhi(nc.cay, dich, daDuyet)
  const cuaTep = tep.duongDan === undefined ? null : khoaDuongDan(tep.duongDan)
  const dangCo = fileConCua(anh, dich.id, vai)
  if (dangCo && khoaDuongDan(dangCo.path) !== cuaTep) return true
  if (nc.nguon === 'tha') return (await statTepTrongGoc(nc.noiDungDir, duongDan)).ok
  return false
}

interface Khop {
  dich: Dich
  theo: 'id' | 'ten-file' | 'duong-dan'
  bac: number
}

type VaiTro =
  | { kieu: 'khop'; khop: Khop }
  | { kieu: 'thu-hai'; dich: Dich; ghiChu: string }
  | { kieu: 'gan-san'; dich: Dich; theo: 'gan-san' | 'goi-y' }
  | { kieu: 'mat'; khop: Khop }
  | { kieu: 'xung-dot' }
  | { kieu: 'khong' }

interface Tam {
  tep: TepKiem
  ghiChu: string[]
  khop: Khop | null
  /** Không đọc được / frontmatter lỗi (chưa cần biết đích) */
  loiChung: boolean
  diem?: DiemDich[]
  vaiTro: VaiTro
  bo: boolean
}

/** Phân loại cả lô; kết quả theo thứ tự chiSo. */
export async function phanLoaiLo(
  nc: NguCanhPhanLoai,
  ds: readonly TepKiem[],
): Promise<DongPhanLoai[]> {
  const anh = docAnhDb(nc.db)
  const { cay } = nc
  // Đánh giá (đọc cả bài) nhớ theo (file, đích): một file được hỏi nhiều lần trong một lượt
  const nhoDg = new Map<Tam, Map<string, DanhGia>>()
  const dgCua = (t: Tam, d: Dich): DanhGia => {
    let theoDich = nhoDg.get(t)
    if (!theoDich) {
      theoDich = new Map()
      nhoDg.set(t, theoDich)
    }
    let dg = theoDich.get(d.id)
    if (!dg) {
      dg = danhGia(t.tep.noiDung, t.tep.loiDoc, d, anh)
      theoDich.set(d.id, dg)
    }
    return dg
  }
  const diemCua = (t: Tam) => (t.diem ??= chamDiem(cay, t.tep.ten))
  const oChoChuan = (t: Tam, d: Dich) =>
    t.tep.duongDan !== undefined && viTriChuanCua(cay, t.tep.duongDan)?.itemId === d.id

  // ---------- Khớp ----------
  const tam: Tam[] = ds.map((tep) => {
    const ghiChu: string[] = []
    const fm = tep.noiDung === null ? null : docFrontmatterNhap(tep.noiDung)
    const loiChung = fm === null || fm.loi !== null
    let khop: Khop | null = null
    let vaiTro: VaiTro = { kieu: 'khong' }
    if (tep.dangKy) {
      const d = dichTheoId(cay, tep.dangKy.itemId)
      if (tep.xungDot) vaiTro = { kieu: 'xung-dot' }
      else if (d) khop = { dich: d, theo: 'duong-dan', bac: 0 }
      if (khop && tep.hashDia === null) vaiTro = { kieu: 'mat', khop }
    } else {
      const id = fm?.fm?.id ?? (tep.noiDung === null ? undefined : idDocNhe(tep.noiDung))
      const theoId = id === undefined ? undefined : dichTheoId(cay, id)
      if (id !== undefined && !theoId) ghiChu.push(TB_NHAP.idKhongCo)
      const viTri = tep.duongDan === undefined ? undefined : viTriChuanCua(cay, tep.duongDan)
      const theoViTri = viTri ? dichTheoId(cay, viTri.itemId) : undefined
      if (theoId) khop = { dich: theoId, theo: 'id', bac: theoViTri?.id === theoId.id ? 1 : 2 }
      else if (theoViTri) khop = { dich: theoViTri, theo: 'duong-dan', bac: 1 }
      else {
        const theoTen = khopTen(cay, tep.ten, anh.slugCu)
        if (theoTen) khop = { dich: theoTen, theo: 'ten-file', bac: 3 }
        else if (laTepRieng(tep.ten)) ghiChu.push(TB_NHAP.tepRieng)
      }
    }
    return { tep, ghiChu, khop, loiChung, vaiTro, bo: false }
  })

  // ---------- Giành mục ----------
  const daGianh = new Map<string, Tam>()
  const matFile = new Map<string, Tam>()
  for (const t of tam) if (t.vaiTro.kieu === 'mat') matFile.set(t.vaiTro.khop.dich.id, t)

  const canGianh = tam
    .filter((t) => t.khop !== null && t.vaiTro.kieu === 'khong')
    .sort((a, b) => (a.khop as Khop).bac - (b.khop as Khop).bac || a.tep.chiSo - b.tep.chiSo)
  for (const t of canGianh) {
    const khop = t.khop as Khop
    const d = khop.dich
    const dg = dgCua(t, d)
    t.vaiTro = { kieu: 'khop', khop }
    if (dg.loai === 'loi' && !(t.tep.dangKy || oChoChuan(t, d))) continue
    const truoc = daGianh.get(d.id)
    if (truoc) {
      t.vaiTro = { kieu: 'thu-hai', dich: d, ghiChu: TB_NHAP.fileThuHai(truoc.tep.ten) }
      continue
    }
    if (nc.nguon === 'quet-lai' && !t.tep.dangKy && !dg.daDuyet) {
      // Mục đã có file đã nhận khác: file ở đường dẫn chuẩn thắng (1.6)
      const dangCo = fileConCua(anh, d.id, d.vai)
      const chuan = duongDanChuan(cay, d.id, d.vai)
      const dangCoChuan =
        dangCo !== undefined &&
        chuan !== undefined &&
        khoaDuongDan(dangCo.path) === khoaDuongDan(chuan)
      if (
        dangCo &&
        khoaDuongDan(dangCo.path) !== khoaDuongDan(t.tep.duongDan ?? '') &&
        (dangCoChuan || !oChoChuan(t, d))
      ) {
        t.vaiTro = { kieu: 'thu-hai', dich: d, ghiChu: TB_NHAP.mucDaCoFile(dangCo.path) }
        continue
      }
    }
    daGianh.set(d.id, t)
    // Mục Đã duyệt mất file đã nhận mà có file khác của mục: file này thay dòng "không còn file"
    const mat = matFile.get(d.id)
    if (mat) {
      mat.bo = true
      matFile.delete(d.id)
    }
  }
  for (const t of matFile.values()) daGianh.set(t.khop?.dich.id ?? '', t)

  // ---------- Gán sẵn (file chưa khớp) ----------
  for (const t of tam) {
    if (t.vaiTro.kieu !== 'khong' || t.tep.dangKy) continue
    if (nc.nguon === 'tha' && nc.mucMacDinh && !laTepRieng(t.tep.ten)) {
      const d = mucHocTheoId(cay, nc.mucMacDinh)
      if (d && !daGianh.has(d.id)) {
        if (dgCua(t, d).loai !== 'loi') daGianh.set(d.id, t)
        t.vaiTro = { kieu: 'gan-san', dich: d, theo: 'gan-san' }
        continue
      }
    }
    const tot = ganSanTheoDiem(diemCua(t))
    if (!tot || daGianh.has(tot.dich.id)) continue
    if (
      nc.nguon === 'quet-lai' &&
      fileConCua(anh, tot.dich.id, 'bai') &&
      !anh.banChup.has(tot.dich.id)
    ) {
      continue
    }
    if (dgCua(t, tot.dich).loai !== 'loi') daGianh.set(tot.dich.id, t)
    t.vaiTro = { kieu: 'gan-san', dich: tot.dich, theo: 'goi-y' }
  }

  // ---------- Dựng từng dòng ----------
  const kq: DongPhanLoai[] = []
  for (const t of tam) {
    const { tep, vaiTro } = t
    const ghiChu = [...t.ghiChu]
    let loai: LoaiKetQua = 'khong-khop'
    let dich: Dich | null = null
    let dg: DanhGia | null = null
    let ganSan = false
    let khopTheo: KhopTheo = null
    let ds: UngVien[] = []

    switch (vaiTro.kieu) {
      case 'khop':
      case 'mat': {
        dich = vaiTro.khop.dich
        dg = dgCua(t, dich)
        khopTheo = vaiTro.khop.theo
        loai = dg.loai
        const ngay = dg.daDuyet ? dinhDangNgay(dg.daDuyet.ngayDuyet) : ''
        if (vaiTro.kieu === 'mat' && dg.daDuyet) {
          loai = 'trung-da-duyet'
          dg = { ...dg, loai, loi: null }
          ghiChu.push(TB_NHAP.matNgoaiApp(ngay))
        } else if (tep.dangKy && dg.daDuyet) {
          // File Đã duyệt bị sửa ngoài app (kể cả thành file lỗi): luôn ⟳ để Giữ bản cũ được
          loai = 'trung-da-duyet'
          ghiChu.push(TB_NHAP.suaNgoaiApp(ngay))
        } else if (loai === 'trung-da-duyet') {
          ghiChu.push(TB_NHAP.banHienTaiDuyet(ngay))
        }
        break
      }
      case 'gan-san':
        dich = vaiTro.dich
        dg = dgCua(t, dich)
        khopTheo = vaiTro.theo
        if (dg.loai === 'loi') loai = 'loi'
        else {
          ganSan = true
          if (dg.daDuyet) ghiChu.push(TB_NHAP.thanhBanSua)
        }
        break
      case 'thu-hai':
        dg = dgCua(t, vaiTro.dich)
        ghiChu.push(vaiTro.ghiChu)
        if (dg.loai === 'loi') {
          loai = 'loi'
          dich = vaiTro.dich
        } else {
          const them = ungVienTheoDiem(diemCua(t), new Set([vaiTro.dich.id]))
          ds = [ungVien(vaiTro.dich, 1), ...them.map((x) => ungVien(x.dich, x.diem))].slice(0, 3)
        }
        break
      case 'xung-dot': {
        // File đã nhận của Y mà id trong file là X / không có trong cây → Không khớp mục, bạn quyết
        const y = tep.dangKy ? dichTheoId(cay, tep.dangKy.itemId) : undefined
        const idX = tep.xungDot?.idTrongFile
        const x = idX === undefined ? undefined : dichTheoId(cay, idX)
        if (y) {
          ghiChu.push(x ? TB_NHAP.idMucKhac(x.label, y.label) : TB_NHAP.idKhongCoTaiCho(y.label))
          ds = [...(x?.vai === 'bai' ? [ungVien(x, 1)] : []), ungVien(y, 1)]
          // Không đánh giá với Y (file có thể đúng mẫu của X); chỉ lỗi khi không đọc được frontmatter
          if (t.loiChung) {
            dg = dgCua(t, y)
            loai = 'loi'
            dich = y
          }
        }
        break
      }
      case 'khong': {
        ds = ungVienTheoDiem(diemCua(t)).map((x) => ungVien(x.dich, x.diem))
        if (t.loiChung) {
          loai = 'loi'
          const fm = tep.noiDung === null ? null : docFrontmatterNhap(tep.noiDung)
          const loi = fm?.loi ?? { dong: 1, thongBao: tep.loiDoc ?? '' }
          dg = { loai: 'loi', thieu: [], loi, fm: null, daDuyet: undefined, chuyenVeBanNhap: false }
        }
        break
      }
    }

    const coMuc = dich !== null
    const nhapDuoc = dich !== null && dg !== null && loai !== 'loi'
    const ketQua: KetQuaFile = {
      chiSo: tep.chiSo,
      ten: tep.ten,
      loai,
      muc: dich ? mucNgan(dich) : null,
      ganSan,
      ungVien: coMuc ? [] : ds,
      thieu: loai === 'loi' || !dg ? [] : dg.thieu,
      loi: dg?.loi ?? null,
      chuyenVeBanNhap: nhapDuoc && (dg?.chuyenVeBanNhap ?? false),
      thayBanNhap:
        nhapDuoc && dich && dg && vaiTro.kieu !== 'mat'
          ? await seThay(nc, anh, tep, dich, dg.daDuyet !== undefined)
          : false,
      ghiChu: ghiChu.length > 0 ? ghiChu.join(' · ') : null,
      khoaBoDem: null,
      khopTheo: coMuc ? khopTheo : null,
    }
    if (tep.duongDan !== undefined) ketQua.duongDan = tep.duongDan
    kq.push({ ketQua, tep, dich, dg, bo: t.bo })
  }
  return kq.sort((a, b) => a.tep.chiSo - b.tep.chiSo)
}
