// Hàm thuần của bảng kết quả kiểm tra (đề xuất 1.7, 3.8; F22): lựa chọn của bạn trên từng dòng (Gán cho mục…,
// cách xử lý file trùng, tick ◎), file nào sẽ được nhập, dòng tóm tắt, nhãn nút, yêu cầu gửi thuc-hien, cột
// "Khớp theo".
// - ✓ Hợp lệ, ⚠ Thiếu khối bắt buộc: luôn nhập.
// - ⚠ Không khớp mục: nhập khi đã gán sẵn (server) hoặc bạn "Gán cho mục…" (không chọn sẵn ứng viên).
// - ⟳ Trùng bản đã duyệt: chỉ khi chọn "Nhập thành bản sửa" (mặc định "Giữ bản cũ"). Ở lô của Quét lại, file ⟳
//   là bản Đã duyệt bị sửa ngoài app: "Giữ bản cũ" là một việc phải làm — file đã nhận (khớp theo đường dẫn):
//   ghi lại bản chụp (POST giu-ban-cu/:id); bản chép nằm chỗ khác (chưa nhận): server bỏ vào thùng rác trong
//   POST thuc-hien. Dòng ⟳ mà file đã nhận không còn trên đĩa: chỉ "Giữ bản cũ" được.
// - ◎ Đã duyệt nhưng app chưa có bản chụp: chỉ khi tick "Nhận là Đã duyệt" (mặc định không tick).
// - ✕ Lỗi frontmatter: không nhập; gán mục chỉ để mở trình soạn đúng bài.
import { layCay, taoSlug } from '../../../shared/roadmap'
import { dinhDangSo } from '../../../shared/dinh-dang'
import type {
  KetQuaFile,
  KhopTheo,
  LoaiKetQua,
  MucNgan,
  TepGui,
  XuLyTrung,
  YeuCauThucHien,
} from '../../app/du-lieu/nhap'
import {
  KHOP_THEO_BAN_GAN,
  KHOP_THEO_DUONG_DAN,
  KHOP_THEO_GAN_SAN,
  chuaCoBanChup,
  nutGiuBanCu,
  nutNhapVaGiu,
} from '../../copy/cho-duyet'

/** Lô đang hiện: từ kéo thả / chọn file (có nội dung trong tay) hay từ Quét lại (file đã nằm trên đĩa). */
export type NguonLo = 'tha' | 'quet-lai'

export interface LuaChon {
  /** chiSo → mục bạn gán */
  gan: Readonly<Record<number, MucNgan>>
  /** chiSo → cách xử lý dòng ⟳; không có = Giữ bản cũ */
  xuLyTrung: Readonly<Record<number, XuLyTrung>>
  /** chiSo của dòng ◎ đã tick "Nhận là Đã duyệt" */
  nhanDaDuyet: Readonly<Record<number, boolean>>
}

export const LUA_CHON_TRONG: LuaChon = { gan: {}, xuLyTrung: {}, nhanDaDuyet: {} }

/** Mục của dòng sau lựa chọn của bạn: bạn gán > mục server khớp (Không khớp mục: chỉ khi gán sẵn). */
export function mucHieuLuc(kq: KetQuaFile, lc: LuaChon): MucNgan | null {
  const gan = lc.gan[kq.chiSo]
  if (gan) return gan
  if (kq.loai === 'khong-khop') return kq.ganSan ? kq.muc : null
  return kq.muc
}

/**
 * Dòng ⟳ của Quét lại mà file đã nhận của mục Đã duyệt không còn trên đĩa (bị xoá / chuyển ngoài app): server
 * khớp theo đường dẫn của dòng sổ nhưng không gửi `duongDan` (không có file để đọc). Chỉ "Giữ bản cũ" được —
 * "Nhập thành bản sửa" sẽ bị 409.
 */
export function khongConFile(kq: KetQuaFile): boolean {
  return kq.loai === 'trung-da-duyet' && kq.khopTheo === 'duong-dan' && kq.duongDan === undefined
}

export function xuLyTrungCua(kq: KetQuaFile, lc: LuaChon): XuLyTrung {
  if (khongConFile(kq)) return 'giu-ban-cu'
  return lc.xuLyTrung[kq.chiSo] ?? 'giu-ban-cu'
}

/** Dòng này có được ghi vào thư mục nội dung khi bấm "Nhập n file" không. */
export function seNhap(kq: KetQuaFile, lc: LuaChon): boolean {
  switch (kq.loai) {
    case 'hop-le':
    case 'thieu-khoi':
      return kq.muc !== null || lc.gan[kq.chiSo] !== undefined
    case 'khong-khop':
      return mucHieuLuc(kq, lc) !== null
    case 'trung-da-duyet':
      return xuLyTrungCua(kq, lc) === 'thanh-ban-sua' && mucHieuLuc(kq, lc) !== null
    case 'chua-chup':
      return lc.nhanDaDuyet[kq.chiSo] === true && mucHieuLuc(kq, lc) !== null
    case 'loi':
      return false
  }
}

/** Dòng ⟳ của Quét lại đang để "Giữ bản cũ": phải ghi lại bản chụp đã duyệt (POST giu-ban-cu/:id). */
export function seGiuBanCu(kq: KetQuaFile, lc: LuaChon, nguon: NguonLo): boolean {
  return (
    nguon === 'quet-lai' &&
    kq.loai === 'trung-da-duyet' &&
    kq.muc !== null &&
    xuLyTrungCua(kq, lc) === 'giu-ban-cu'
  )
}

/**
 * Dòng ⟳ Giữ bản cũ của Quét lại là bản chép nằm ngoài chỗ của file đã nhận (vd. Claude ghi bản sửa ở gốc thư
 * mục): chỉ POST thuc-hien mới bỏ nó vào thùng rác (giu-ban-cu/:id chỉ ghi lại <slug>.md). Server không gửi
 * `khopTheo` (bản cũ) thì cũng coi là cần: thuc-hien không có gì để làm trả 422, coi như xong.
 */
export function canBoVaoRac(kq: KetQuaFile, lc: LuaChon, nguon: NguonLo): boolean {
  return seGiuBanCu(kq, lc, nguon) && kq.duongDan !== undefined && kq.khopTheo !== 'duong-dan'
}

export interface SoViec {
  nhap: number
  giu: number
}

export function demViec(ds: readonly KetQuaFile[], lc: LuaChon, nguon: NguonLo): SoViec {
  let nhap = 0
  let giu = 0
  for (const kq of ds) {
    if (seNhap(kq, lc)) nhap += 1
    else if (seGiuBanCu(kq, lc, nguon)) giu += 1
  }
  return { nhap, giu }
}

/**
 * Dòng sẽ nhập vào cùng một mục với một dòng đứng trước trong lô (vd. bạn gán hai file cho một mục): chiSo →
 * tên file đứng trước. Server kiểm lại khi nhập; bảng chỉ cảnh báo.
 */
export function trungMucTrongLo(ds: readonly KetQuaFile[], lc: LuaChon): Map<number, string> {
  const daCo = new Map<string, string>()
  const trung = new Map<number, string>()
  for (const kq of ds) {
    if (!seNhap(kq, lc)) continue
    const muc = mucHieuLuc(kq, lc)
    if (!muc) continue
    const truoc = daCo.get(muc.id)
    if (truoc === undefined) daCo.set(muc.id, kq.ten)
    else trung.set(kq.chiSo, truoc)
  }
  return trung
}

/** Nhãn nút cuối bảng: "Nhập n file" (F22); Quét lại có ⟳ giữ bản cũ thì thêm phần giữ. */
export function nhanNutNhap({ nhap, giu }: SoViec): string {
  if (giu === 0) return `Nhập ${dinhDangSo(nhap)} file`
  if (nhap === 0) return nutGiuBanCu(dinhDangSo(giu))
  return nutNhapVaGiu(dinhDangSo(nhap), dinhDangSo(giu))
}

export interface DemLoai {
  hopLe: number
  canhBao: number
  trung: number
  loi: number
  chuaChup: number
}

/** Đếm theo loại của chính các dòng đang hiện (⚠ = Thiếu khối + Không khớp mục). */
export function demLoai(ds: readonly KetQuaFile[]): DemLoai {
  const d: DemLoai = { hopLe: 0, canhBao: 0, trung: 0, loi: 0, chuaChup: 0 }
  const NHOM: Record<LoaiKetQua, keyof DemLoai> = {
    'hop-le': 'hopLe',
    'thieu-khoi': 'canhBao',
    'khong-khop': 'canhBao',
    'trung-da-duyet': 'trung',
    'chua-chup': 'chuaChup',
    loi: 'loi',
  }
  for (const kq of ds) d[NHOM[kq.loai]] += 1
  return d
}

/** "11 hợp lệ · 2 cảnh báo · 1 trùng · 1 lỗi" (F22, 3.8); có dòng ◎ thì thêm "· n chưa có bản chụp". */
export function chuTomTat(d: DemLoai): string {
  const phan = [
    `${dinhDangSo(d.hopLe)} hợp lệ`,
    `${dinhDangSo(d.canhBao)} cảnh báo`,
    `${dinhDangSo(d.trung)} trùng`,
    `${dinhDangSo(d.loi)} lỗi`,
  ]
  if (d.chuaChup > 0) phan.push(chuaCoBanChup(dinhDangSo(d.chuaChup)))
  return phan.join(' · ')
}

/** Thân POST /api/nhap/thuc-hien: chỉ gửi lựa chọn cho các dòng sẽ nhập. */
export function taoYeuCau(token: string, ds: readonly KetQuaFile[], lc: LuaChon): YeuCauThucHien {
  const gan: Record<string, string> = {}
  const xuLyTrung: Record<string, XuLyTrung> = {}
  const nhanDaDuyet: number[] = []
  for (const kq of ds) {
    if (kq.loai === 'trung-da-duyet') xuLyTrung[kq.chiSo] = xuLyTrungCua(kq, lc)
    if (!seNhap(kq, lc)) continue
    const muc = mucHieuLuc(kq, lc)
    if (muc && (kq.loai === 'khong-khop' || lc.gan[kq.chiSo])) gan[kq.chiSo] = muc.id
    if (kq.loai === 'chua-chup') nhanDaDuyet.push(kq.chiSo)
  }
  return { token, gan, xuLyTrung, nhanDaDuyet }
}

/**
 * Giữ lựa chọn khi kiểm tra lại cùng lô (token hết hạn): chỉ giữ cho dòng cùng chiSo và cùng tên file.
 */
export function giuLuaChon(
  lc: LuaChon,
  dsCu: readonly KetQuaFile[],
  dsMoi: readonly KetQuaFile[],
): LuaChon {
  const tenCu = new Map(dsCu.map((kq) => [kq.chiSo, kq.ten]))
  const conGiu = (chiSo: number) =>
    dsMoi.some((kq) => kq.chiSo === chiSo && kq.ten === tenCu.get(chiSo))
  const loc = <T>(bang: Readonly<Record<number, T>>) =>
    Object.fromEntries(Object.entries(bang).filter(([k]) => conGiu(Number(k)))) as Record<number, T>
  return { gan: loc(lc.gan), xuLyTrung: loc(lc.xuLyTrung), nhanDaDuyet: loc(lc.nhanDaDuyet) }
}

// ---------- Cột "Khớp theo" (F22: "id" / "tên file") ----------

/** Tên file bỏ ".md" và ".ban-sua" (đề xuất 1.7 "Khớp"). */
export function tenGocFile(ten: string): string {
  return ten.replace(/\.md$/, '').replace(/\.ban-sua$/, '')
}

/** id trong frontmatter (đọc nhẹ, không cần bộ đọc YAML): dòng `id: …` giữa hai dòng `---` đầu file. */
export function idTrongFile(noiDung: string): string | undefined {
  const dong = noiDung.replace(/^\uFEFF/, '').split(/\r?\n/)
  if (dong[0]?.trimEnd() !== '---') return undefined
  for (let i = 1; i < dong.length; i++) {
    const d = dong[i].trimEnd()
    if (d === '---' || d === '...') return undefined
    const m = /^id:\s*(.*)$/.exec(d)
    if (m) {
      const gt = m[1].replace(/\s+#.*$/, '').trim()
      return gt.replace(/^(['"])(.*)\1$/, '$2') || undefined
    }
  }
  return undefined
}

/** Tên file trùng slug, slug tên gốc hoặc slug tên của mục. */
function khopTenFile(ten: string, muc: MucNgan): boolean {
  const goc = tenGocFile(ten)
  if (goc === muc.slug || goc === taoSlug(muc.label)) return true
  const tenGoc = layCay().mucTheoId.get(muc.id)?.labelOriginal
  return tenGoc !== undefined && goc === taoSlug(tenGoc)
}

/** Chữ cột "Khớp theo" theo `khopTheo` của server; F22 dùng "id", "tên file" (cả cho gợi ý tên gần đúng). */
const CHU_KHOP_THEO: Record<KhopTheo, string> = {
  id: 'id',
  'ten-file': 'tên file',
  'goi-y': 'tên file',
  'gan-san': KHOP_THEO_GAN_SAN,
  'duong-dan': KHOP_THEO_DUONG_DAN,
}

/**
 * Chữ cột "Khớp theo": bạn gán → "bạn gán"; không có mục → "tên file" (đã thử khớp theo tên, như F22); còn lại
 * theo `khopTheo` của server. Server không gửi trường này (bản cũ) thì suy: id trong file (khi có nội dung) bằng
 * id mục → "id"; tên file khớp slug → "tên file"; gán sẵn theo ?muc= → "gán sẵn"; gán sẵn theo tên gần đúng →
 * "tên file"; lô Quét lại (không có nội dung trong tay) còn lại → "id".
 */
export function khopTheo(
  kq: KetQuaFile,
  lc: LuaChon,
  noiDung: string | undefined,
  mucMacDinh: string | undefined,
): string {
  if (lc.gan[kq.chiSo]) return KHOP_THEO_BAN_GAN
  const muc = mucHieuLuc(kq, lc)
  if (!muc) return 'tên file'
  if (kq.khopTheo) return CHU_KHOP_THEO[kq.khopTheo]
  if (noiDung !== undefined && idTrongFile(noiDung) === muc.id) return 'id'
  if (khopTenFile(kq.ten, muc)) return 'tên file'
  if (mucMacDinh === muc.id) return KHOP_THEO_GAN_SAN
  if (kq.ganSan || noiDung !== undefined) return 'tên file'
  return 'id'
}

/** Nội dung đã gửi của dòng (lô kéo thả); lô Quét lại không có. */
export function noiDungCua(tep: readonly TepGui[] | null, chiSo: number): string | undefined {
  return tep?.[chiSo]?.noiDung
}
