import { congNgay, dauTuanIso } from '../../shared/lich.ts'

// Hợp đồng API đồng hồ học + phiên giờ (phase 3; đề xuất 2.1, 2.2 bất biến 6, 3.4; Cần chốt 12) và quy tắc thuần
// (quên tắt, số giây ghi, tuần, streak) — TS thuần, không phụ thuộc Node: server và web cùng import.
// - GET    /api/dong-ho[?itemId=]          TrangThaiDongHo (lichSu: 5 phiên gần nhất, của mục đó nếu có itemId)
// - POST   /api/dong-ho/bat-dau            { itemId, chuyen?, ghiGiay? } → KetQuaDongHo
//     409 { loi, dangChay }                   mục khác đang chạy và chuyen không phải true;
//     409 { loi, canHoi: true, giay, dangChay } đồng hồ đang chạy cần hỏi "Ghi bao nhiêu phút?" (quên tắt) và
//                                             chưa gửi ghiGiay → hỏi xong gửi lại kèm ghiGiay.
//     Chuyển (chuyen: true) = dừng đồng hồ cũ + bấm giờ mục mới trong MỘT transaction (bất biến 6).
// - POST   /api/dong-ho/dung               { ghiGiay? } → KetQuaDongHo (cùng quy tắc quên tắt)
// - POST   /api/dong-ho/hoan-tac           Hoàn tác lần dừng / chuyển gần nhất (toast "Hoàn tác" của Chuyển):
//                                         xoá phiên vừa ghi, chạy lại đồng hồ cũ đúng giờ bắt đầu cũ → KetQuaDongHo
// - DELETE /api/phien-gio/:id              → KetQuaGhiPhien (phien = phiên vừa xoá)
// - POST   /api/phien-gio/:id/khoi-phuc    Hoàn tác xoá phiên (cùng id) → KetQuaGhiPhien
// ghiGiay: undefined = theo giờ thật; null = "Không ghi"; số = số giây muốn ghi, kẹp trong [60, thời lượng thật].
// Phiên < 60 giây không ghi. Ngày của phiên = ngày bắt đầu (server quyết). Đồng hồ còn chạy qua tắt / mở server.

/** Đồng hồ đang chạy. */
export interface DongHoChay {
  itemId: string
  /** ISO UTC */
  batDau: string
}

/** Một phiên giờ đã ghi (bảng time_entries). */
export interface PhienGio {
  id: number
  itemId: string
  /** Ngày bắt đầu phiên, YYYY-MM-DD */
  ngay: string
  giay: number
}

/** GET /api/dong-ho */
export interface TrangThaiDongHo {
  revision: number
  dangChay: DongHoChay | null
  /** 5 phiên gần nhất (mới trước) */
  lichSu: PhienGio[]
}

export interface YeuCauBatDau {
  itemId: string
  chuyen?: boolean
  ghiGiay?: number | null
}

export interface YeuCauDung {
  ghiGiay?: number | null
}

/** Đồng hồ vừa dừng (khi Dừng, hoặc khi Chuyển) — cho toast Hoàn tác. */
export interface DongHoVuaDung {
  itemId: string
  batDau: string
  /** Thời lượng thật (giây) */
  giayThat: number
  /** Phiên đã ghi; null = không ghi (< 60 giây, "Không ghi", hoặc mục không còn trong cây) */
  phien: PhienGio | null
}

/** Phản hồi bat-dau / dung / hoan-tac. */
export interface KetQuaDongHo {
  revision: number
  daDoi: boolean
  dangChay: DongHoChay | null
  /** Đồng hồ vừa dừng trong lần gọi này; null nếu không dừng gì */
  dung: DongHoVuaDung | null
  /** = dung?.phien ?? null: phiên vừa ghi (đưa vào "Lịch sử" ngay, không cần tải lại) */
  phien: PhienGio | null
}

/** Thân 409 khi mục khác đang chạy (chưa gửi chuyen: true). */
export interface XungDotDangChay {
  loi: string
  dangChay: DongHoChay
}

/** Thân 409 khi cần hỏi "Ghi bao nhiêu phút?" trước khi dừng / chuyển. */
export interface XungDotCanHoi {
  loi: string
  canHoi: true
  /** Thời lượng thật (giây) — mặc định và tối đa của ô số */
  giay: number
  dangChay: DongHoChay
}

export interface KetQuaGhiPhien {
  revision: number
  daDoi: boolean
  phien: PhienGio
}

// ---------- Quy tắc (đề xuất 3.4, Cần chốt 12) ----------

/** Phiên ngắn hơn số giây này không ghi. */
export const GIAY_TOI_THIEU = 60
/** Chạy quá số giây này thì hỏi trước khi Dừng / Chuyển. */
export const HOI_SAU_GIAY = 3 * 60 * 60
/** Số phiên trong "Lịch sử" của card đồng hồ. */
export const SO_PHIEN_LICH_SU = 5

/** Thời lượng thật (giây, làm tròn xuống) từ batDau tới luc (ms). */
export function giayGiua(batDauMs: number, lucMs: number): number {
  return Math.max(0, Math.floor((lucMs - batDauMs) / 1000))
}

/**
 * Cần hỏi "Ghi bao nhiêu phút?" khi Dừng / Chuyển: đã chạy hơn 3 giờ, hoặc ngày lịch lúc dừng khác ngày bắt đầu
 * (qua nửa đêm). `ngayCua` là hàm ngày lịch theo múi giờ server (shared/clock).
 */
export function canHoiQuenTat(
  batDauMs: number,
  lucMs: number,
  ngayCua: (ms: number) => string,
): boolean {
  return giayGiua(batDauMs, lucMs) > HOI_SAU_GIAY || ngayCua(batDauMs) !== ngayCua(lucMs)
}

/**
 * Số giây sẽ ghi: undefined → giờ thật; null → 0 (Không ghi); số → kẹp trong [60, giờ thật]. Kết quả < 60 thì
 * không ghi phiên (trả 0).
 */
export function giaySeGhi(giayThat: number, ghiGiay: number | null | undefined): number {
  if (ghiGiay === null) return 0
  const giay =
    ghiGiay === undefined ? giayThat : Math.min(Math.max(ghiGiay, GIAY_TOI_THIEU), giayThat)
  return giay >= GIAY_TOI_THIEU ? Math.floor(giay) : 0
}

/** Tổng giây theo ngày (YYYY-MM-DD) từ các phiên. */
export function giayTheoNgay(
  phien: readonly Pick<PhienGio, 'ngay' | 'giay'>[],
): Map<string, number> {
  const kq = new Map<string, number>()
  for (const p of phien) kq.set(p.ngay, (kq.get(p.ngay) ?? 0) + p.giay)
  return kq
}

/** Tổng giây của tuần ISO chứa homNay (thứ Hai → homNay). */
export function giayTuanNay(
  phien: readonly Pick<PhienGio, 'ngay' | 'giay'>[],
  homNay: string,
): number {
  const dau = dauTuanIso(homNay)
  return phien.reduce((tong, p) => (p.ngay >= dau && p.ngay <= homNay ? tong + p.giay : tong), 0)
}

/**
 * Streak (đề xuất 3.4): số ngày liên tiếp có ≥ 1 phút học, tính tới hôm nay; hôm nay chưa học thì tính tới hôm
 * qua. Kỷ lục = chuỗi dài nhất từng có (gồm cả chuỗi hiện tại).
 */
export function tinhStreak(
  phien: readonly Pick<PhienGio, 'ngay' | 'giay'>[],
  homNay: string,
): { hienTai: number; kyLuc: number } {
  const ngayHoc = new Set(
    [...giayTheoNgay(phien)].filter(([, giay]) => giay >= GIAY_TOI_THIEU).map(([ngay]) => ngay),
  )
  let hienTai = 0
  for (let ngay = ngayHoc.has(homNay) ? homNay : congNgay(homNay, -1); ngayHoc.has(ngay);) {
    hienTai++
    ngay = congNgay(ngay, -1)
  }
  let kyLuc = 0
  for (const ngay of ngayHoc) {
    if (ngayHoc.has(congNgay(ngay, -1))) continue // không phải ngày đầu chuỗi
    let dai = 0
    for (let d = ngay; ngayHoc.has(d); d = congNgay(d, 1)) dai++
    kyLuc = Math.max(kyLuc, dai)
  }
  return { hienTai, kyLuc: Math.max(kyLuc, hienTai) }
}
