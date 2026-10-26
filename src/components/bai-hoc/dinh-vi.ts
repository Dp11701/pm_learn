// Hàm thuần cho định vị ở trang bài (§6.2, đề xuất 3.9, D10, D12, D30): đường dẫn của từng loại nút, phân số
// của phần / lĩnh vực / nhóm, Trước / Tiếp bỏ qua mục Bỏ qua và loại ranh giới của pager.
import type { SoTienDo } from '../trang-thai/TienDo'
import type { TraTrangThai } from './kieu'
import {
  conCua,
  mucHocCua,
  mucSau,
  mucTruoc,
  type Cay,
  type MucHoc,
  type Nut,
} from '../../../shared/roadmap'

/**
 * Trang của một nút. Trước phase 10 mọi link tới phần dẫn tới Lộ trình dạng danh sách lọc theo phần
 * (đề xuất 3.9); nhóm không có trang riêng: là điểm neo #slug trên trang cha (§3).
 */
export function duongDanNut(cay: Cay, nut: Nut): string {
  switch (nut.kind) {
    case 'topic':
    case 'document':
      return `/hoc/${nut.slug}`
    case 'area':
      return `/linh-vuc/${nut.slug}`
    case 'part':
      return `/lo-trinh?xem=danh-sach&phan=${nut.slug}`
    case 'group': {
      const cha = nut.chaId ? cay.nutTheoId.get(nut.chaId) : undefined
      return cha ? `${duongDanNut(cay, cha)}#${nut.slug}` : '/lo-trinh'
    }
  }
}

/** "Xem trên bản đồ" (§6.2): bản đồ mở sẵn panel của mục (phase 6; dưới 1024 tự đổi sang danh sách). */
export const duongDanBanDo = (muc: MucHoc) => `/lo-trinh?xem=ban-do&muc=${muc.slug}`
/** Trình soạn (phase 7b). */
export const duongDanSoan = (muc: MucHoc) => `/hoc/${muc.slug}/soan`
/** "Nhập file .md" trên trang chưa có nội dung (đề xuất 3.6): file thả vào được gán sẵn mục này. */
export const duongDanNhap = (muc: MucHoc) => `/noi-dung?tab=nhap&muc=${muc.slug}`
/** "Quét lại" của banner bảo vệ bản Đã duyệt (đề xuất 1.6): tab Nhập (phase 2b), ?quet=1 → quét lại ngay. */
export const DUONG_DAN_QUET_LAI = '/noi-dung?tab=nhap&quet=1'

/** Số đếm tiến độ của mọi mục học trong một nút (phân số ở menu breadcrumb, đề xuất 3.3). */
export function demTienDo(cay: Cay, nutId: string, trangThaiCua: TraTrangThai): SoTienDo {
  const s: SoTienDo = { xong: 0, dangHoc: 0, boQua: 0, tong: 0 }
  for (const m of mucHocCua(cay, nutId)) {
    s.tong += 1
    const tt = trangThaiCua(m.id)
    if (tt === 'da-xong') s.xong += 1
    else if (tt === 'dang-hoc') s.dangHoc += 1
    else if (tt === 'bo-qua') s.boQua += 1
  }
  return s
}

/** Các nút cùng cấp với một nút trên breadcrumb (menu ▾, §6.2): phần → 5 phần; còn lại → con của cha. */
export function cungCap(cay: Cay, nut: Nut): Nut[] {
  return nut.chaId ? conCua(cay, nut.chaId) : [...cay.phan]
}

/** Trước / Tiếp theo thứ tự cây, không dừng ở mục Bỏ qua (§6.2); vẫn dừng ở mục chưa có nội dung. */
export function truocTiep(
  cay: Cay,
  muc: MucHoc,
  trangThaiCua: TraTrangThai,
): { truoc: MucHoc | undefined; tiep: MucHoc | undefined } {
  const boQua = (m: MucHoc) => trangThaiCua(m.id) === 'bo-qua'
  return { truoc: mucTruoc(cay, muc.id, boQua), tiep: mucSau(cay, muc.id, boQua) }
}

export type LoaiRanhGioi = 'phan' | 'linh-vuc' | 'nhom'

export interface RanhGioi {
  loai: LoaiRanhGioi
  /** Phần / lĩnh vực / nhóm của mục đích */
  nut: Nut
}

/**
 * Ranh giới vượt qua khi đi từ `tu` sang `den` (đề xuất 3.9): ưu tiên phần > lĩnh vực > nhóm; tên là của
 * vùng mục đích (D12 "sang lĩnh vực trước: {tên}"). Rời nhóm về mục đứng trực tiếp trong lĩnh vực không phải
 * ranh giới.
 */
export function ranhGioi(tu: MucHoc, den: MucHoc): RanhGioi | null {
  if (tu.phan.id !== den.phan.id) return { loai: 'phan', nut: den.phan }
  if (den.linhVuc && tu.linhVuc?.id !== den.linhVuc.id)
    return { loai: 'linh-vuc', nut: den.linhVuc }
  if (den.nhom && tu.nhom?.id !== den.nhom.id) return { loai: 'nhom', nut: den.nhom }
  return null
}

const TEN_RANH_GIOI: Record<LoaiRanhGioi, string> = {
  phan: 'phần',
  'linh-vuc': 'lĩnh vực',
  nhom: 'nhóm',
}

/**
 * Chữ trước tên vùng trên nhãn pager (D12, §6.2): "Trước — sang lĩnh vực trước:" / "Tiếp — sang lĩnh vực
 * mới:"; phần và nhóm "tương tự" (§6.2). Không vượt ranh giới thì chỉ "Trước" / "Tiếp".
 */
export function nhanPager(huong: 'truoc' | 'tiep', rg: RanhGioi | null): string {
  const dau = huong === 'truoc' ? 'Trước' : 'Tiếp'
  if (!rg) return dau
  const ten = TEN_RANH_GIOI[rg.loai]
  return huong === 'truoc' ? `${dau} — sang ${ten} trước:` : `${dau} — sang ${ten} mới:`
}
