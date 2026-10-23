// Phép tính lịch trên ngày dạng 'YYYY-MM-DD' (đề xuất 3.4, 6 "Qua năm").
// Chỉ làm việc với ngày lịch, tính theo UTC nên kết quả như nhau ở mọi múi giờ (kể cả ngày đổi DST).
// Tuần theo ISO 8601: thứ Hai – Chủ nhật, khoá tuần 'YYYY-Www' theo năm ISO (vd. '2026-W53').

const MS_NGAY = 86_400_000
const MAU_NGAY = /^(\d{4})-(\d{2})-(\d{2})$/

function laNamNhuan(nam: number): boolean {
  return (nam % 4 === 0 && nam % 100 !== 0) || nam % 400 === 0
}

function soNgayTrongThang(nam: number, thang: number): number {
  if (thang === 2) return laNamNhuan(nam) ? 29 : 28
  return [4, 6, 9, 11].includes(thang) ? 30 : 31
}

/** Chuỗi có đúng dạng 'YYYY-MM-DD' và là ngày có thật (năm 1000–9999). */
export function hopLe(ngay: string): boolean {
  const k = MAU_NGAY.exec(ngay)
  if (!k) return false
  const nam = Number(k[1])
  const thang = Number(k[2])
  const ngayThang = Number(k[3])
  if (nam < 1000 || thang < 1 || thang > 12) return false
  return ngayThang >= 1 && ngayThang <= soNgayTrongThang(nam, thang)
}

// Số thứ tự ngày kể từ 1970-01-01 (có thể âm).
function sangSo(ngay: string): number {
  if (!hopLe(ngay)) throw new RangeError(`Ngày không hợp lệ: '${ngay}'`)
  const [nam, thang, ngayThang] = ngay.split('-').map(Number)
  return Date.UTC(nam, thang - 1, ngayThang) / MS_NGAY
}

function tuSo(so: number): string {
  const d = new Date(so * MS_NGAY)
  const thang = String(d.getUTCMonth() + 1).padStart(2, '0')
  const ngayThang = String(d.getUTCDate()).padStart(2, '0')
  return `${d.getUTCFullYear()}-${thang}-${ngayThang}`
}

/** Cộng n ngày (n nguyên, âm để lùi). Kết quả phải là ngày hợp lệ (năm 1000–9999). */
export function congNgay(ngay: string, n: number): string {
  if (!Number.isInteger(n)) throw new RangeError(`Số ngày không hợp lệ: ${n}`)
  const kq = tuSo(sangSo(ngay) + n)
  if (!hopLe(kq)) throw new RangeError(`Ngày ngoài phạm vi: ${ngay} + ${n}`)
  return kq
}

/** Số ngày từ a tới b (b − a, âm nếu b trước a). */
export function soNgayGiua(a: string, b: string): number {
  return sangSo(b) - sangSo(a)
}

/** Thứ trong tuần theo ISO: 1 = thứ Hai … 7 = Chủ nhật. */
export function thuTrongTuan(ngay: string): number {
  // 1970-01-01 là thứ Năm (4)
  return ((((sangSo(ngay) + 3) % 7) + 7) % 7) + 1
}

/** Thứ Hai của tuần ISO chứa ngày. */
export function dauTuanIso(ngay: string): string {
  return congNgay(ngay, 1 - thuTrongTuan(ngay))
}

/** Khoá tuần ISO, vd. '2026-W43'. Năm ISO là năm của thứ Năm trong tuần. */
export function tuanIso(ngay: string): string {
  const thuNam = congNgay(ngay, 4 - thuTrongTuan(ngay))
  const nam = thuNam.slice(0, 4)
  const tuan = Math.floor(soNgayGiua(`${nam}-01-01`, thuNam) / 7) + 1
  return `${nam}-W${String(tuan).padStart(2, '0')}`
}

/** Số tuần ISO của một năm (52 hoặc 53). 28/12 luôn nằm trong tuần cuối năm ISO. */
export function soTuanIso(nam: number): number {
  return Number(tuanIso(`${nam}-12-28`).slice(-2))
}

/**
 * "Tuần học thứ N" = (thứ Hai tuần của hômNay − thứ Hai tuần của ngàyBắtĐầu) / 7 + 1, tối thiểu 1.
 * Tính trên ngày lịch, không trừ số tuần ISO (đúng cả khi qua năm).
 */
export function tuanHocThu(ngayBatDau: string, homNay: string): number {
  const n = soNgayGiua(dauTuanIso(ngayBatDau), dauTuanIso(homNay)) / 7 + 1
  return Math.max(1, n)
}

/** Các khoá tuần ISO từ tuần chứa `tu` tới tuần chứa `den`, gồm cả hai đầu. Rỗng nếu den trước tu. */
export function danhSachTuanIso(tu: string, den: string): string[] {
  const ketQua: string[] = []
  const cuoi = dauTuanIso(den)
  for (let thuHai = dauTuanIso(tu); soNgayGiua(thuHai, cuoi) >= 0; thuHai = congNgay(thuHai, 7)) {
    ketQua.push(tuanIso(thuHai))
  }
  return ketQua
}
