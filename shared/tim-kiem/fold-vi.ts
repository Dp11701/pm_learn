// Gấp chữ để tìm không phân biệt dấu, hoa/thường (đề xuất 1.8).
// Giữ bảng vị trí về chuỗi gốc để in đậm đúng đoạn khớp.

export interface ChuoiGap {
  /** đ→d, bỏ dấu, chữ thường; mỗi cụm ký tự khác chữ/số thành 1 khoảng trắng, không có khoảng trắng đầu/cuối */
  folded: string
  /** viTri[i]: vị trí (UTF-16) trong chuỗi gốc nơi ký tự gấp thứ i bắt đầu */
  viTri: number[]
  /** viTriCuoi[i]: vị trí ngay sau ký tự gốc của ký tự gấp thứ i (kể cả dấu rời đi kèm) */
  viTriCuoi: number[]
}

/** Đoạn [đầu, cuối) trong chuỗi gốc */
export type Doan = [dau: number, cuoi: number]

// Xoá hẳn như quy tắc slug, để "Lewin's" gấp thành "lewins"
const BO_HAN = /['‘’ʼ®]/
const DAU = /\p{M}/u
const MOI_DAU = /\p{M}/gu
const CHU_SO = /[\p{L}\p{N}]/u

function laChuSo(c: string): boolean {
  if (c < '\x80') return (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')
  return CHU_SO.test(c)
}

function gapKyTu(kyTu: string): string {
  const thuong = kyTu.toLowerCase()
  if (kyTu < '\x80') return thuong
  return thuong.replace(/đ/g, 'd').normalize('NFD').replace(MOI_DAU, '')
}

export function foldVi(text: string): ChuoiGap {
  let folded = ''
  const viTri: number[] = []
  const viTriCuoi: number[] = []
  // vị trí gốc của dấu ngăn đang chờ thành khoảng trắng (−1: không có)
  let choNgan = -1
  // ký tự gốc vừa đọc có sinh ra chữ/số không (dấu rời theo sau thì thuộc về nó)
  let vuaRaChu = false
  let i = 0
  for (const kyTu of text) {
    const dau = i
    i += kyTu.length
    if (DAU.test(kyTu)) {
      if (vuaRaChu) viTriCuoi[viTriCuoi.length - 1] = i
      continue
    }
    vuaRaChu = false
    if (BO_HAN.test(kyTu)) continue
    for (const c of gapKyTu(kyTu)) {
      if (!laChuSo(c)) {
        if (choNgan < 0 && folded !== '') choNgan = dau
        continue
      }
      if (choNgan >= 0) {
        folded += ' '
        viTri.push(choNgan)
        viTriCuoi.push(choNgan + 1)
        choNgan = -1
      }
      folded += c
      viTri.push(dau)
      viTriCuoi.push(i)
      vuaRaChu = true
    }
  }
  return { folded, viTri, viTriCuoi }
}

/** Đổi đoạn [dau, cuoi) trên chuỗi gấp về đoạn trên chuỗi gốc. */
export function doiDoan(gap: ChuoiGap, dau: number, cuoi: number): Doan {
  return [gap.viTri[dau], gap.viTriCuoi[cuoi - 1]]
}

/** Các đoạn khớp (không chồng nhau) của truy vấn đã gấp trong một chuỗi đã gấp, tính trên chuỗi gốc. */
export function timTrong(gap: ChuoiGap, truyVanGap: string): Doan[] {
  const ketQua: Doan[] = []
  if (truyVanGap === '') return ketQua
  for (
    let k = gap.folded.indexOf(truyVanGap);
    k >= 0;
    k = gap.folded.indexOf(truyVanGap, k + truyVanGap.length)
  ) {
    ketQua.push(doiDoan(gap, k, k + truyVanGap.length))
  }
  return ketQua
}

/** Đoạn khớp của query trong text (không phân biệt dấu, hoa/thường), tính trên text gốc. */
export function doanKhop(text: string, query: string): Doan[] {
  return timTrong(foldVi(text), foldVi(query).folded)
}

/** Cắt text thành các mảnh thường / khớp theo các đoạn (đã sắp, không chồng nhau) để in đậm. */
export function tachDoan(text: string, doan: readonly Doan[]): { chu: string; khop: boolean }[] {
  const ketQua: { chu: string; khop: boolean }[] = []
  let truoc = 0
  for (const [dau, cuoi] of doan) {
    if (dau > truoc) ketQua.push({ chu: text.slice(truoc, dau), khop: false })
    ketQua.push({ chu: text.slice(dau, cuoi), khop: true })
    truoc = cuoi
  }
  if (truoc < text.length) ketQua.push({ chu: text.slice(truoc), khop: false })
  return ketQua
}
