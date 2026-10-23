// Định dạng hiển thị theo G4 (§0): dd/MM/yyyy · HH:mm 24h · "4 giờ 35 phút" · đồng hồ 00:24:17
// · số dùng Intl.NumberFormat('vi-VN') (phẩy thập phân, chấm hàng nghìn). Đề xuất 5 "Ngày".
import { ngayCua } from './clock'
import { hopLe, thuTrongTuan } from './lich'

export const LOI_NGAY = 'Ngày không hợp lệ. Nhập theo dd/MM/yyyy.'

const TEN_THU = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật']

const hai = (n: number) => String(n).padStart(2, '0')

// Thời điểm: ms kể từ epoch hoặc chuỗi ISO (vd. '2026-10-22T14:42:00.000Z').
function sangMs(thoiDiem: number | string): number {
  const ms = typeof thoiDiem === 'number' ? thoiDiem : Date.parse(thoiDiem)
  if (!Number.isFinite(ms)) throw new RangeError(`Thời điểm không hợp lệ: '${thoiDiem}'`)
  return ms
}

// 'YYYY-MM-DD' giữ nguyên là ngày lịch (không qua múi giờ); ms / ISO đổi sang ngày theo múi giờ máy.
function sangNgay(ngay: number | string): string {
  if (typeof ngay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ngay)) {
    // Date.parse của V8 nhận cả '2026-02-31' nên phải tự kiểm
    if (!hopLe(ngay)) throw new RangeError(`Ngày không hợp lệ: '${ngay}'`)
    return ngay
  }
  return ngayCua(sangMs(ngay))
}

/** '2026-10-22' → '22/10/2026'. Nhận cả ms / chuỗi ISO (lấy ngày theo múi giờ máy). */
export function dinhDangNgay(ngay: number | string): string {
  const [nam, thang, ngayThang] = sangNgay(ngay).split('-')
  return `${ngayThang}/${thang}/${nam}`
}

/** Tên thứ: 'Thứ Hai' … 'Chủ nhật'. */
export function tenThu(ngay: string): string {
  return TEN_THU[thuTrongTuan(ngay) - 1]
}

/** 'Thứ Năm, 22/10/2026'. */
export function dinhDangNgayCoThu(ngay: string): string {
  return `${tenThu(ngay)}, ${dinhDangNgay(ngay)}`
}

export type KetQuaDocNgay = { ok: true; ngay: string } | { ok: false; loi: string }

/**
 * Đọc ô ngày dd/MM/yyyy → 'YYYY-MM-DD'. Bỏ khoảng trắng hai đầu; chấp nhận ngày, tháng 1 chữ số
 * (5/1/2027); năm phải đủ 4 chữ số. Từ chối ngày không có thật (31/02/2027) và dạng khác.
 */
export function docNgay(chuoi: string): KetQuaDocNgay {
  const k = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(chuoi.trim())
  if (!k) return { ok: false, loi: LOI_NGAY }
  const ngay = `${k[3]}-${k[2].padStart(2, '0')}-${k[1].padStart(2, '0')}`
  return hopLe(ngay) ? { ok: true, ngay } : { ok: false, loi: LOI_NGAY }
}

/** Giờ:phút 24h theo múi giờ máy, vd. '21:42'. */
export function dinhDangGioPhut(thoiDiem: number | string): string {
  const d = new Date(sangMs(thoiDiem))
  return `${hai(d.getHours())}:${hai(d.getMinutes())}`
}

/**
 * Thời lượng từ số giây, làm tròn xuống tới phút: '0 phút', '35 phút', '6 giờ', '1 giờ 05 phút',
 * '4 giờ 35 phút'. Phút có 2 chữ số khi có giờ (như frame F03).
 */
export function dinhDangThoiLuong(giay: number): string {
  const phut = Math.floor(Math.max(0, giay) / 60)
  const gio = Math.floor(phut / 60)
  const du = phut % 60
  if (gio === 0) return `${du} phút`
  if (du === 0) return `${gio} giờ`
  return `${gio} giờ ${hai(du)} phút`
}

/** Đồng hồ HH:mm:ss từ số giây (làm tròn xuống), giờ có thể vượt 24: '00:24:17', '25:00:00'. */
export function dinhDangDongHo(giay: number): string {
  const s = Math.floor(Math.max(0, giay))
  return `${hai(Math.floor(s / 3600))}:${hai(Math.floor(s / 60) % 60)}:${hai(s % 60)}`
}

const boDinhDangSo = new Map<number, Intl.NumberFormat>()

/**
 * Số kiểu Việt Nam: 1234 → '1.234', 6.25 → '6,25'. Có `soLe` thì luôn đúng chừng ấy chữ số thập phân
 * (81.5, 1 → '81,5'; 81, 1 → '81,0'); không có thì tối đa 3 chữ số, bỏ số 0 thừa.
 */
export function dinhDangSo(n: number, soLe?: number): string {
  const khoa = soLe ?? -1
  let bo = boDinhDangSo.get(khoa)
  if (!bo) {
    bo = new Intl.NumberFormat(
      'vi-VN',
      soLe === undefined ? {} : { minimumFractionDigits: soLe, maximumFractionDigits: soLe },
    )
    boDinhDangSo.set(khoa, bo)
  }
  return bo.format(n)
}

/**
 * Phần trăm nguyên của tu/mau, làm tròn gần nhất (37/195 = 18,97 → 19); mau ≤ 0 → null (đề xuất 3.3).
 * Chưa đủ thì không hiện 100 (199/200 → 99), đã có ít nhất 1 thì vẫn có thể là 0 (1/300 → 0).
 */
export function tinhPhanTram(tu: number, mau: number): number | null {
  if (mau <= 0) return null
  const p = Math.round((tu / mau) * 100)
  return p === 100 && tu < mau ? 99 : p
}

/** '19%'; mẫu số 0 (vd. bỏ qua hết) → '—'. */
export function dinhDangPhanTram(tu: number, mau: number): string {
  const p = tinhPhanTram(tu, mau)
  return p === null ? '—' : `${p}%`
}
