// Bố cục hiện của một bài (đề xuất 3.6 "Hiện ở bài", D15): từ boCuc của phanTichBai ra danh sách ô thực sự
// hiện, theo thứ tự mẫu. Mục lục (D15), neo của thanh 4 bước và Đủ khối đều đọc cùng danh sách này nên không
// trỏ tới khối không hiện.
// - khối có chữ: hiện (khối trùng hiện cả hai, neo thứ hai là "<id>-2");
// - khối ★ chưa có chữ: ô nét đứt "Chưa có …" ở đúng vị trí (neo = id khối); riêng Thực hành vẫn có phần làm bài;
// - khối tuỳ chọn trống: ẩn;
// - khối do app tạo: Nói lại, Bản của tôi, Kế hoạch thi của tôi luôn hiện; Mục liên quan chỉ khi lien_quan tra được
//   mục; Nhật ký thi thử (P2) ẩn;
// - khối không có trong mẫu: hiện sau các khối mẫu, theo thứ tự file.
import {
  cacTen,
  chuanHoaTieuDe,
  type Khoi,
  type KetQuaBai,
  type KhoiMau,
} from '../../../shared/noi-dung'
import type { Buoc } from '../../../shared/domain/trang-thai'
import type { MauBai } from '../../../shared/roadmap'
import { khoiKhungBai, laKhoiCuaNguoiHoc } from '../../components/bai-hoc/KhungBaiTrong'

export type OHien =
  /** Khối viết trong file, có chữ (mau null = khối không có trong mẫu) */
  | { loai: 'khoi'; id: string; ten: string; khoi: Khoi; mau: KhoiMau | null }
  /** Khối ★ chưa có chữ */
  | { loai: 'thieu'; id: string; ten: string; mau: KhoiMau }
  /** Khối do app tạo */
  | { loai: 'app'; id: string; ten: string; mau: KhoiMau }

/** Tên hiện của khối mẫu: tên hợp lệ (D13) khớp tiêu đề trong file, viết đúng như mẫu. */
export function tenKhoi(khoi: Khoi): string {
  if (!khoi.mau) return khoi.tieuDe
  const chuan = chuanHoaTieuDe(khoi.tieuDe)
  return cacTen(khoi.mau).find((t) => chuanHoaTieuDe(t) === chuan) ?? khoi.mau.tieuDe
}

/** Kiểu khối do app tạo luôn hiện: Nói lại (bước Hiểu), Bản của tôi / Kế hoạch thi của tôi (thẻ Thực hành, bước Áp dụng). */
const APP_LUON_HIEN = new Set(['noi-lai', 'ban-cua-toi', 'ke-hoach-thi'])

export function cacOHien(bai: KetQuaBai, { coLienQuan }: { coLienQuan: boolean }): OHien[] {
  const ds: OHien[] = []
  let soKhoiLa = 0
  for (const o of bai.boCuc) {
    const mau = o.mau
    if (o.hien === 'app') {
      if (!mau) continue
      if (APP_LUON_HIEN.has(mau.kieu) || (mau.kieu === 'muc-lien-quan' && coLienQuan)) {
        ds.push({ loai: 'app', id: mau.id, ten: mau.tieuDe, mau })
      }
      continue
    }
    if (o.hien === 'chua-co' && mau) {
      ds.push({ loai: 'thieu', id: mau.id, ten: mau.tieuDe, mau })
      continue
    }
    if (o.hien !== 'noi-dung') continue
    let thu = 0
    for (const khoi of o.khoi) {
      if (!khoi.coChu) continue
      thu += 1
      const id = mau ? (thu === 1 ? mau.id : `${mau.id}-${thu}`) : `khoi-khac-${(soKhoiLa += 1)}`
      ds.push({ loai: 'khoi', id, ten: tenKhoi(khoi), khoi, mau })
    }
  }
  return ds
}

/** Mục lục (D15): mọi ô đang hiện, theo thứ tự trang (cột phải ở phase 3 dùng danh sách này). */
export function mucLuc(cac: readonly OHien[]): { id: string; ten: string }[] {
  return cac.map((o) => ({ id: o.id, ten: o.ten }))
}

/** Số câu Tự kiểm tra trong bài (D8: 0 câu → bước Kiểm tra "Không áp dụng · chưa có câu hỏi"). */
export function soCauHoi(cac: readonly OHien[]): number {
  return cac.reduce(
    (tong, o) =>
      o.loai === 'khoi' && o.khoi.cauTruc?.kieu === 'tu-kiem-tra'
        ? tong + o.khoi.cauTruc.cauHoi.length
        : tong,
    0,
  )
}

const KIEU_AP_DUNG = new Set(['thuc-hanh', 'ban-cua-toi', 'ke-hoach-thi'])

/**
 * Neo của từng bước trên thanh 4 bước: chỉ trỏ tới ô đang hiện có việc của bước đó. Ô "Chưa có" không phải neo, trừ
 * Thực hành (luôn có phần làm bài — ThanBai). Ghi nhớ (card Flashcard) do trang thêm.
 */
export function neoBonBuoc(cac: readonly OHien[]): Partial<Record<Buoc, string>> {
  const neo: Partial<Record<Buoc, string>> = {}
  for (const o of cac) {
    if (!o.mau || (o.loai === 'thieu' && o.mau.kieu !== 'thuc-hanh')) continue
    const kieu = o.mau.kieu
    if (kieu === 'noi-lai') neo.hieu ??= `#${o.id}`
    else if (KIEU_AP_DUNG.has(kieu)) neo['ap-dung'] ??= `#${o.id}`
    else if (kieu === 'tu-kiem-tra' && o.loai === 'khoi') neo['kiem-tra'] ??= `#${o.id}`
  }
  return neo
}

/**
 * Ô chứa việc của người học trên khung bài của mục chưa có nội dung (KhungBaiTrong vẽ chính các khối này: thẻ Thực
 * hành ở Thực hành trên dự án thật / Bản của tôi / Kế hoạch thi của tôi): neo của thanh 4 bước và Mục lục trỏ tới đó
 * như ở trang bài.
 */
export function cacOAppKhungBai(mau: MauBai): OHien[] {
  return khoiKhungBai(mau)
    .filter(laKhoiCuaNguoiHoc)
    .map((k) => ({ loai: 'app', id: k.id, ten: k.tieuDe, mau: k }))
}
