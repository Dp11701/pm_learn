import { dice, khongNhoHon } from '../tim-kiem/dice'
import { foldVi } from '../tim-kiem/fold-vi'
import type { KetQuaBai } from './phan-tich'

// Câu Tự kiểm tra và tiêu chí tự kiểm đang có trong bài, và quy tắc gán lại khoá khi bài đổi (đề xuất 1.5):
// khoá = bam(câu chuẩn hoá) nên câu hỏi / tiêu chí đổi chữ thì đổi khoá. Câu trả lời (tick) có khoá không còn
// trong bài được nối sang một câu mới của cùng mục khi Dice(câu cũ đã gấp, câu mới đã gấp) ≥ 0,8 VÀ hơn ứng
// viên thứ hai ≥ 0,15; không nối được thì giữ nguyên ("Câu trả lời cho câu hỏi cũ"), không bao giờ xoá.

/** Một câu hỏi / tiêu chí của bài: khoá lưu dữ liệu + chữ như viết trong bài. */
export interface DongTrongBai {
  khoa: string
  chu: string
}

/** Câu hỏi và tiêu chí đang hiện trong bài (cùng quy tắc với trang bài: chỉ khối viết đúng quy ước). */
export interface DanhSachTrongBai {
  cauHoi: DongTrongBai[]
  /**
   * Dòng tick của bước Áp dụng: tiêu chí tự kiểm (khối Thực hành, Chủ đề) và dòng Checklist chất lượng (Tài liệu —
   * doc_checklist của đề xuất 2.1 chưa có bảng riêng, tick lưu chung practice.criteria).
   */
  tieuChi: DongTrongBai[]
}

/** Bài chưa có nội dung: không có câu hỏi, không có tiêu chí. */
export const DANH_SACH_TRONG_BAI_RONG: DanhSachTrongBai = { cauHoi: [], tieuChi: [] }

/**
 * Câu hỏi của mọi khối Tự kiểm tra viết đúng quy ước, tiêu chí của mọi khối Thực hành và dòng của mọi khối
 * Checklist chất lượng viết đúng quy ước — như trang bài hiện thành C21 / ô tick (khối viết khác quy ước hiện
 * Markdown thường, không có câu / ô nào).
 */
export function danhSachTrongBai(bai: Pick<KetQuaBai, 'khoi'>): DanhSachTrongBai {
  const cauHoi: DongTrongBai[] = []
  const tieuChi: DongTrongBai[] = []
  for (const k of bai.khoi) {
    const ct = k.cauTruc
    if (!ct?.hopLe) continue
    if (ct.kieu === 'tu-kiem-tra') {
      for (const c of ct.cauHoi) cauHoi.push({ khoa: c.khoa, chu: c.hoi })
    } else if (ct.kieu === 'thuc-hanh' || ct.kieu === 'checklist') {
      const dong = ct.kieu === 'thuc-hanh' ? ct.tieuChi : ct.dongTick
      for (const t of dong) tieuChi.push({ khoa: t.khoa, chu: t.chu })
    }
  }
  return { cauHoi, tieuChi }
}

/** Ngưỡng Dice để nối câu trả lời cũ sang câu mới (1.5). */
export const NGUONG_GAN_LAI = 0.8
/** Câu mới tốt nhất phải hơn ứng viên thứ hai ít nhất chừng này (1.5). */
export const CACH_BIET_GAN_LAI = 0.15

/** Dữ liệu dưới một khoá không còn trong bài; chu null = không biết câu lúc trả lời (dữ liệu trước khi lưu chữ). */
export interface DongCu {
  khoa: string
  chu: string | null
}

const gap = (chu: string) => foldVi(chu).folded

/** Điểm cao nhất vượt ngưỡng và hơn điểm kế tiếp đủ xa. */
function vuotRo(nhat: number, nhi: number): boolean {
  return khongNhoHon(nhat, NGUONG_GAN_LAI) && khongNhoHon(nhat - nhi, CACH_BIET_GAN_LAI)
}

/**
 * Gán lại khoá (1.5): `cu` là khoá không còn trong bài (kèm chữ câu lúc lưu), `moi` là câu của bài hiện tại CHƯA có
 * dữ liệu (không bao giờ ghi đè câu đã có câu trả lời). Trả khoá cũ → câu mới.
 * - Mỗi câu cũ chọn câu mới có Dice cao nhất khi ≥ 0,8 và hơn câu mới thứ hai ≥ 0,15;
 * - một câu mới được nhiều câu cũ chọn: chỉ nhận câu cũ điểm cao nhất, và chỉ khi hơn câu cũ kế tiếp ≥ 0,15
 *   (không rõ thì không nối câu nào — giữ cả hai dưới "câu hỏi cũ").
 * Câu cũ không có chữ thì không nối được.
 */
export function ganLaiKhoa(
  cu: readonly DongCu[],
  moi: readonly DongTrongBai[],
): Map<string, DongTrongBai> {
  const kq = new Map<string, DongTrongBai>()
  if (cu.length === 0 || moi.length === 0) return kq
  const moiGap = moi.map((m) => gap(m.chu))
  const chon = new Map<number, { khoa: string; diem: number }[]>()
  for (const c of cu) {
    if (c.chu === null) continue
    const g = gap(c.chu)
    let nhat = -1
    let diemNhat = 0
    let diemNhi = 0
    moiGap.forEach((m, j) => {
      const d = dice(g, m)
      if (d > diemNhat) {
        diemNhi = diemNhat
        diemNhat = d
        nhat = j
      } else if (d > diemNhi) {
        diemNhi = d
      }
    })
    if (nhat < 0 || !vuotRo(diemNhat, diemNhi)) continue
    const ds = chon.get(nhat) ?? []
    ds.push({ khoa: c.khoa, diem: diemNhat })
    chon.set(nhat, ds)
  }
  for (const [j, ds] of chon) {
    ds.sort((a, b) => b.diem - a.diem)
    const [nhat, nhi] = ds
    if (nhi && !khongNhoHon(nhat.diem - nhi.diem, CACH_BIET_GAN_LAI)) continue
    kq.set(nhat.khoa, moi[j])
  }
  return kq
}
