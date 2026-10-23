// Chỉ mục tên trên web và xếp hạng kết quả tìm kiếm (đề xuất 1.8, §6.3).
// Thân bài và ghi chú do server tìm (GET /api/tim), không nằm ở đây.

import { chuoiCha, type Cay, type MucHoc, type Nut } from '../roadmap'
import { doiDoan, foldVi, timTrong, type ChuoiGap, type Doan } from './fold-vi'
import { vietTat } from './viet-tat'

export const TOI_DA_CAU_TRUC = 8
export const TOI_DA_MUC_HOC = 30

export interface MucChiMuc {
  nut: Nut
  /** Thứ tự cây (duyệt trước, mọi nút), từ 0 */
  thuTu: number
  laMucHoc: boolean
  /** Phần › lĩnh vực › nhóm phía trên nút (breadcrumb) */
  chuoiCha: Nut[]
  ten: ChuoiGap
  tenGoc?: ChuoiGap
  vietTat: string[]
  /** Khoá tra viết tắt (dạng gấp, và dạng gấp bỏ khoảng trắng: "ci cd", "cicd") → viết tắt đã gấp */
  khoaVietTat: Map<string, string>
  giaiNghia?: string
  giaiNghiaGap?: ChuoiGap
}

export interface ChiMuc {
  cacMuc: readonly MucChiMuc[]
}

/** 0 nguyên viết tắt / nguyên tên · 1 đầu tên · 2 giữa tên · 3 tên gốc hoặc giải nghĩa */
export type BacKhop = 0 | 1 | 2 | 3
export type TruongKhop = 'ten' | 'vietTat' | 'tenGoc' | 'giaiNghia'

export interface KetQuaKhop<N extends Nut = Nut> {
  nut: N
  chuoiCha: Nut[]
  bac: BacKhop
  truong: TruongKhop
  /** Đoạn khớp trong chuỗi gốc của trường khớp (vietTat: trên tên; tenGoc: trên labelOriginal; giaiNghia: trên giải nghĩa) */
  doan: Doan[]
  /** Đoạn in đậm trên tên hiển thị; khớp tên gốc thì in đậm các từ tương ứng của tên đã sửa */
  doanTen: Doan[]
}

export interface KetQuaTimKiem {
  /** Nhóm "Phần · Lĩnh vực · Nhóm" */
  cauTruc: KetQuaKhop[]
  /** Nhóm "Mục học" */
  mucHoc: KetQuaKhop<MucHoc>[]
}

export interface TuyChonTim {
  toiDaCauTruc?: number
  toiDaMucHoc?: number
}

/**
 * Dựng chỉ mục cho mọi nút của cây. giaiNghia: id → giải nghĩa (chỉ mục đã có nội dung);
 * nội dung đổi thì dựng lại (rẻ, vài trăm nút).
 */
export function taoChiMuc(cay: Cay, giaiNghia?: ReadonlyMap<string, string>): ChiMuc {
  const cacMuc: MucChiMuc[] = []
  const duyet = (nut: Nut) => {
    const cacVietTat = vietTat(nut.label)
    const khoaVietTat = new Map<string, string>()
    for (const v of cacVietTat) {
      const gap = foldVi(v).folded
      khoaVietTat.set(gap, gap).set(gap.replace(/ /g, ''), gap)
    }
    const gn = giaiNghia?.get(nut.id)?.trim()
    cacMuc.push({
      nut,
      thuTu: cacMuc.length,
      laMucHoc: nut.kind === 'topic' || nut.kind === 'document',
      chuoiCha: chuoiCha(cay, nut.id),
      ten: foldVi(nut.label),
      ...(nut.labelOriginal ? { tenGoc: foldVi(nut.labelOriginal) } : {}),
      vietTat: cacVietTat,
      khoaVietTat,
      ...(gn ? { giaiNghia: gn, giaiNghiaGap: foldVi(gn) } : {}),
    })
    for (const id of nut.con) {
      const con = cay.nutTheoId.get(id)
      if (con) duyet(con)
    }
  }
  cay.phan.forEach(duyet)
  return { cacMuc }
}

/** Ranh giới [đầu, cuối) của từng từ trong chuỗi đã gấp. */
function cacTu(folded: string): [number, number][] {
  const ketQua: [number, number][] = []
  let dau = 0
  for (const tu of folded.split(' ')) {
    ketQua.push([dau, dau + tu.length])
    dau += tu.length + 1
  }
  return ketQua
}

/**
 * Khớp tên gốc → in đậm cả những từ cùng thứ tự trong tên đã sửa
 * (tên sửa chính tả giữ gần như nguyên số từ; từ vượt quá tên đã sửa thì bỏ).
 */
function doanTheoTu(goc: ChuoiGap, q: string, dich: ChuoiGap): Doan[] {
  const tuGoc = cacTu(goc.folded)
  const tuDich = cacTu(dich.folded)
  const ketQua: Doan[] = []
  let tuDaDung = -1
  for (let k = goc.folded.indexOf(q); k >= 0; k = goc.folded.indexOf(q, k + q.length)) {
    const dau = Math.max(
      tuGoc.findIndex(([, cuoi]) => cuoi > k),
      tuDaDung + 1,
    )
    const cuoi = Math.min(
      tuGoc.findIndex(([, c]) => c >= k + q.length),
      tuDich.length - 1,
    )
    if (dau > cuoi) continue
    ketQua.push(doiDoan(dich, tuDich[dau][0], tuDich[cuoi][1]))
    tuDaDung = cuoi
  }
  return ketQua
}

function khop(muc: MucChiMuc, q: string): Omit<KetQuaKhop, 'nut' | 'chuoiCha'> | undefined {
  const { ten, tenGoc, giaiNghiaGap } = muc
  if (ten.folded === q) {
    const doan = timTrong(ten, q)
    return { bac: 0, truong: 'ten', doan, doanTen: doan }
  }
  const vietTatGap = muc.khoaVietTat.get(q)
  if (vietTatGap !== undefined) {
    const doan = timTrong(ten, vietTatGap)
    return { bac: 0, truong: 'vietTat', doan, doanTen: doan }
  }
  const viTri = ten.folded.indexOf(q)
  if (viTri >= 0) {
    const doan = timTrong(ten, q)
    return { bac: viTri === 0 ? 1 : 2, truong: 'ten', doan, doanTen: doan }
  }
  if (tenGoc?.folded.includes(q)) {
    return {
      bac: 3,
      truong: 'tenGoc',
      doan: timTrong(tenGoc, q),
      doanTen: doanTheoTu(tenGoc, q, ten),
    }
  }
  if (giaiNghiaGap?.folded.includes(q)) {
    return { bac: 3, truong: 'giaiNghia', doan: timTrong(giaiNghiaGap, q), doanTen: [] }
  }
  return undefined
}

/**
 * Tìm theo tên, tên gốc, viết tắt, giải nghĩa; không phân biệt dấu, hoa/thường.
 * Xếp theo bậc khớp rồi thứ tự cây; tối đa 8 kết quả cấu trúc, 30 mục học.
 */
export function timKiem(chiMuc: ChiMuc, query: string, tuyChon: TuyChonTim = {}): KetQuaTimKiem {
  const ketQua: KetQuaTimKiem = { cauTruc: [], mucHoc: [] }
  const q = foldVi(query).folded
  if (q === '') return ketQua

  const tim = chiMuc.cacMuc.flatMap((muc) => {
    const k = khop(muc, q)
    return k ? [{ muc, ...k }] : []
  })
  tim.sort((a, b) => a.bac - b.bac || a.muc.thuTu - b.muc.thuTu)

  const toiDaCauTruc = tuyChon.toiDaCauTruc ?? TOI_DA_CAU_TRUC
  const toiDaMucHoc = tuyChon.toiDaMucHoc ?? TOI_DA_MUC_HOC
  for (const { muc, ...k } of tim) {
    const kq = { nut: muc.nut, chuoiCha: muc.chuoiCha, ...k }
    if (muc.laMucHoc) {
      if (ketQua.mucHoc.length < toiDaMucHoc) ketQua.mucHoc.push(kq as KetQuaKhop<MucHoc>)
    } else if (ketQua.cauTruc.length < toiDaCauTruc) {
      ketQua.cauTruc.push(kq)
    }
  }
  return ketQua
}
