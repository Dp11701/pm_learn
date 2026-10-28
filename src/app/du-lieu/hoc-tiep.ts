// Hàm thuần trên ảnh chụp dữ liệu học (đề xuất 3.9, §6.2): trạng thái của một mục, "Học tiếp", danh sách
// Đang học mở gần nhất. Chỉ duyệt mục học của cây, nên bản ghi mồ côi (id không còn trong cây) không bao giờ
// lọt vào (bất biến 8). Không gõ cứng mục nào: "lần đầu OPA" là mục đầu tiên của cây lúc chạy.
import type { TrangThaiHoc } from '../../../shared/domain/trang-thai'
import type { Cay, MucHoc } from '../../../shared/roadmap'
import { tuDb, type AnhChupHoc } from '../../../server/du-lieu/hop-dong-trang-thai'

/** Số mục Đang học mở gần nhất hiện ở sidebar, card Tiếp tục học (§6.1, đề xuất 3.9). */
export const SO_DANG_HOC_GAN_DAY = 3

/** Trạng thái học của mục; chưa có ảnh chụp hoặc không có khoá = Chưa học. */
export function trangThaiTrong(anhChup: AnhChupHoc | undefined, id: string): TrangThaiHoc {
  return tuDb(anhChup?.trangThai[id]?.status)
}

/** Lý do Bỏ qua (nếu mục đang Bỏ qua và có lý do). */
export function lyDoBoQuaTrong(anhChup: AnhChupHoc | undefined, id: string): string | undefined {
  const muc = anhChup?.trangThai[id]
  return muc?.status === 'skip' ? muc.lyDoBoQua : undefined
}

/** Lần mở gần nhất (ms); chưa mở / không đọc được → -Infinity. */
function lanMo(anhChup: AnhChupHoc, id: string): number {
  const iso = anhChup.luotMo[id]
  const ms = iso === undefined ? Number.NaN : Date.parse(iso)
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms
}

/**
 * Mọi mục Đang học, mở gần nhất trước; mục chưa mở lần nào (vd. đặt từ danh sách) đứng sau, theo thứ tự
 * cây. Cùng thời điểm mở thì theo thứ tự cây.
 */
export function cacMucDangHoc(cay: Cay, anhChup: AnhChupHoc): MucHoc[] {
  return xepDangHoc(cay.mucHoc, anhChup)
}

/** Mục Đang học trong `cacMuc` (theo thứ tự cây), mở gần nhất trước — như cacMucDangHoc. */
function xepDangHoc(cacMuc: readonly MucHoc[], anhChup: AnhChupHoc): MucHoc[] {
  return cacMuc
    .filter((m) => anhChup.trangThai[m.id]?.status === 'learning')
    .map((muc) => ({ muc, lan: lanMo(anhChup, muc.id) }))
    .sort((a, b) => (b.lan === a.lan ? a.muc.index - b.muc.index : b.lan - a.lan))
    .map((x) => x.muc)
}

/**
 * "Học tiếp" (§6.2, đề xuất 3.9): mục Đang học mở gần nhất; không có thì mục Chưa học đầu tiên theo thứ tự
 * cây (lần đầu là mục đầu tiên của cây). Chưa có ảnh chụp, hoặc không còn mục Đang học / Chưa học → undefined.
 */
export function hocTiep(cay: Cay, anhChup: AnhChupHoc | undefined): MucHoc | undefined {
  return hocTiepTrong(cay.mucHoc, anhChup)
}

/**
 * "Học tiếp" giới hạn trong một tập mục theo thứ tự cây (vd. các mục của một lĩnh vực — "Học tiếp trong lĩnh vực",
 * §8.4): mục Đang học mở gần nhất của tập, không có thì mục Chưa học đầu tiên của tập.
 */
export function hocTiepTrong(
  cacMuc: readonly MucHoc[],
  anhChup: AnhChupHoc | undefined,
): MucHoc | undefined {
  if (!anhChup) return undefined
  return xepDangHoc(cacMuc, anhChup)[0] ?? cacMuc.find((m) => anhChup.trangThai[m.id] === undefined)
}

/** Đã có dữ liệu học chưa: ít nhất một mục của cây có trạng thái khác Chưa học (banner lần đầu F05). */
export function coTrangThaiHoc(cay: Pick<Cay, 'mucHoc'>, anhChup: AnhChupHoc): boolean {
  return cay.mucHoc.some((m) => anhChup.trangThai[m.id] !== undefined)
}

/** Có lượt mở bài nào của mục trong cây không (sắp "Mở gần đây" chỉ có nghĩa khi có). */
export function coLuotMo(cay: Pick<Cay, 'mucHoc'>, anhChup: AnhChupHoc | undefined): boolean {
  return anhChup !== undefined && cay.mucHoc.some((m) => anhChup.luotMo[m.id] !== undefined)
}

export interface DanhSachDangHoc {
  /** Tối đa `toiDa` mục Đang học, mở gần nhất trước */
  cacMuc: MucHoc[]
  /** Tổng số mục Đang học (cho "Xem tất cả (n)") */
  tong: number
}

/** Khối "Đang học": n mục mở gần nhất + tổng (đề xuất 3.9). */
export function danhSachDangHoc(
  cay: Cay,
  anhChup: AnhChupHoc | undefined,
  toiDa = SO_DANG_HOC_GAN_DAY,
): DanhSachDangHoc {
  if (!anhChup) return { cacMuc: [], tong: 0 }
  const tatCa = cacMucDangHoc(cay, anhChup)
  return { cacMuc: tatCa.slice(0, toiDa), tong: tatCa.length }
}
