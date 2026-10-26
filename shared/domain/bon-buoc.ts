// Vòng 4 bước của một mục (§1; đề xuất 3.2 — Cần chốt 6): tình trạng từng bước tính từ dữ liệu học của mục
// (GET /api/hoc/:id) và các câu Tự kiểm tra của bài. Dùng chung cho thanh 4 bước C10 (đầu bài, bản mini), câu
// F19 "Đã xong khi còn thiếu bước" (quyết định 10) và "x/4 · Tiếp: <bước>" (x/4 đếm bước xong và Không áp
// dụng; Tiếp là bước chưa qua đầu tiên).
// Câu F19 lấy nguyên văn bảng 3.2 (đề xuất), chữ "Đã xong" của dòng bước xong lấy nguyên văn frame F19.
import type { MauBai } from '../roadmap/types'
import { CAC_BUOC, type Buoc, type TinhTrangBuoc } from './trang-thai'

export type TrangThaiThucHanh = 'dang-lam' | 'xong' | 'khong-ap-dung'
export const CAC_TRANG_THAI_THUC_HANH: readonly TrangThaiThucHanh[] = [
  'dang-lam',
  'xong',
  'khong-ap-dung',
]

/** Lần tự chấm một câu Tự kiểm tra (quyết định 7: nút trung tính). */
export type MucCham = 'dung' | 'mot-phan' | 'sai'
export const CAC_MUC_CHAM: readonly MucCham[] = ['dung', 'mot-phan', 'sai']

/** Phần dữ liệu học của một mục (GET /api/hoc/:id) mà vòng 4 bước cần. */
export interface DuLieuBonBuoc {
  noiLai: { text: string } | null
  thucHanh: {
    trangThai: TrangThaiThucHanh | null
    duAnId: number | null
    ketQua: string
    tieuChi: Readonly<Record<string, boolean>>
  }
  tuKiemTra: Readonly<Record<string, { traLoi: string; daXem: boolean; cham: MucCham | null }>>
  the: readonly unknown[]
  /** Tài liệu: có ≥ 1 Bản của tôi "Hoàn thành" (phase 7c; trước đó luôn false) */
  banCuaToi: { coHoanThanh: boolean }
  /** Chứng chỉ: kế hoạch thi có ngày thi (P1; trước đó luôn false) */
  keHoachThi: { coNgayThi: boolean }
}

/** Dữ liệu học trống (mục chưa có gì): dùng khi chưa tải xong. */
export const DU_LIEU_BON_BUOC_TRONG: DuLieuBonBuoc = {
  noiLai: null,
  thucHanh: { trangThai: null, duAnId: null, ketQua: '', tieuChi: {} },
  tuKiemTra: {},
  the: [],
  banCuaToi: { coHoanThanh: false },
  keHoachThi: { coNgayThi: false },
}

// Câu ở F19 khi bước còn thiếu (đề xuất 3.2, nguyên văn).
export const CAU_THIEU = {
  hieu: 'Thiếu · chưa nói lại bằng lời',
  apDungDangLam: 'Thiếu · đang làm bài thực hành',
  apDungChuaLam: 'Thiếu · chưa làm bài thực hành',
  apDungTaiLieu: 'Thiếu · chưa có bản Hoàn thành',
  apDungChungChi: 'Thiếu · chưa có kế hoạch thi',
  kiemTraChuaCham: 'Thiếu · chưa tự chấm câu nào',
  kiemTraDaCham: (daCham: number, tong: number) => `Thiếu · đã chấm ${daCham}/${tong} câu`,
  ghiNho: 'Thiếu · chưa có flashcard',
} as const

/** Bước Kiểm tra của bài không có câu hỏi (đề xuất 3.2, D8): không tính thiếu. */
export const KHONG_AP_DUNG_CHUA_CO_CAU_HOI = 'Không áp dụng · chưa có câu hỏi'
/** Chữ của dòng bước đã xong ở F19 (frame). */
export const CAU_DA_XONG = 'Đã xong'
/** Chữ của dòng bước Không áp dụng ở F19 (§1 "Không áp dụng"). */
export const CAU_KHONG_AP_DUNG = 'Không áp dụng'

export interface KetQuaBuoc {
  tinhTrang: TinhTrangBuoc
  /** Câu F19 khi bước còn thiếu (chưa làm / đang làm); null khi xong hoặc Không áp dụng */
  thieu: string | null
  /** Chữ bên phải tên bước ở F19: "Đã xong", câu thiếu, "Không áp dụng" (+ " · chưa có câu hỏi") */
  nhan: string
  /** Chữ sau tên bước trên thanh C10 thay cho mặc định của thanh (chỉ Kiểm tra không có câu hỏi — D8) */
  ghiChu: string | null
}

export interface KetQuaBonBuoc {
  buoc: Record<Buoc, KetQuaBuoc>
  /** Tình trạng từng bước — đưa thẳng vào ThanhBonBuoc (C10) */
  tinhTrang: Record<Buoc, TinhTrangBuoc>
  /** Số bước đã qua: xong + Không áp dụng (x/4) */
  soXong: number
  /** Bước chưa qua đầu tiên ("Tiếp: <bước>"); null khi đủ 4 */
  tiep: Buoc | null
  /** Các bước còn thiếu theo thứ tự — danh sách của F19; rỗng thì "Đã xong" không cần hỏi */
  cacBuocThieu: Buoc[]
  /** Bước không bấm được trên thanh C10 (Kiểm tra khi bài không có câu hỏi — D8) */
  voHieu: Buoc[]
}

export interface DauVaoBonBuoc {
  mau: MauBai
  /** Khoá các câu Tự kiểm tra đang có trong bài (CauHoi.khoa); bài không có câu hỏi → [] */
  cauHoiKhoa: readonly string[]
  hoc: DuLieuBonBuoc
}

const coChu = (s: string | null | undefined) => (s ?? '').trim() !== ''

function xong(): KetQuaBuoc {
  return { tinhTrang: 'xong', thieu: null, nhan: CAU_DA_XONG, ghiChu: null }
}

function thieu(tinhTrang: 'chua-lam' | 'dang-lam', cau: string): KetQuaBuoc {
  return { tinhTrang, thieu: cau, nhan: cau, ghiChu: null }
}

function buocHieu(hoc: DuLieuBonBuoc): KetQuaBuoc {
  return coChu(hoc.noiLai?.text) ? xong() : thieu('chua-lam', CAU_THIEU.hieu)
}

function buocApDung(mau: MauBai, hoc: DuLieuBonBuoc): KetQuaBuoc {
  const th = hoc.thucHanh
  // Mọi mẫu: "Không áp dụng" kèm lý do (§1)
  if (th.trangThai === 'khong-ap-dung') {
    return { tinhTrang: 'khong-ap-dung', thieu: null, nhan: CAU_KHONG_AP_DUNG, ghiChu: null }
  }
  switch (mau) {
    case 'tai-lieu':
      return hoc.banCuaToi.coHoanThanh ? xong() : thieu('chua-lam', CAU_THIEU.apDungTaiLieu)
    case 'chung-chi':
      return hoc.keHoachThi.coNgayThi ? xong() : thieu('chua-lam', CAU_THIEU.apDungChungChi)
    default: {
      // Chủ đề: "Xong" và ô Kết quả có chữ; dự án, tiêu chí không bắt buộc
      if (th.trangThai === 'xong' && coChu(th.ketQua)) return xong()
      const dangLam =
        th.trangThai !== null ||
        coChu(th.ketQua) ||
        th.duAnId !== null ||
        Object.values(th.tieuChi).some(Boolean)
      return dangLam
        ? thieu('dang-lam', CAU_THIEU.apDungDangLam)
        : thieu('chua-lam', CAU_THIEU.apDungChuaLam)
    }
  }
}

function buocKiemTra(cauHoiKhoa: readonly string[], hoc: DuLieuBonBuoc): KetQuaBuoc {
  const cac = [...new Set(cauHoiKhoa)]
  if (cac.length === 0) {
    return {
      tinhTrang: 'khong-ap-dung',
      thieu: null,
      nhan: KHONG_AP_DUNG_CHUA_CO_CAU_HOI,
      ghiChu: KHONG_AP_DUNG_CHUA_CO_CAU_HOI,
    }
  }
  // Chỉ tính câu đang có trong bài; câu đã bị xoá khỏi bài (còn trong DB) không tính
  const daCham = cac.filter((k) => hoc.tuKiemTra[k]?.cham != null).length
  if (daCham === cac.length) return xong()
  if (daCham > 0) return thieu('dang-lam', CAU_THIEU.kiemTraDaCham(daCham, cac.length))
  const daBatDau = cac.some((k) => {
    const cau = hoc.tuKiemTra[k]
    return cau !== undefined && (cau.daXem || coChu(cau.traLoi))
  })
  return thieu(daBatDau ? 'dang-lam' : 'chua-lam', CAU_THIEU.kiemTraChuaCham)
}

function buocGhiNho(hoc: DuLieuBonBuoc): KetQuaBuoc {
  return hoc.the.length > 0 ? xong() : thieu('chua-lam', CAU_THIEU.ghiNho)
}

/** Bước đã qua: xong hoặc Không áp dụng. */
export function daQua(tinhTrang: TinhTrangBuoc): boolean {
  return tinhTrang === 'xong' || tinhTrang === 'khong-ap-dung'
}

/** Tình trạng 4 bước của một mục (đề xuất 3.2). */
export function tinhBonBuoc({ mau, cauHoiKhoa, hoc }: DauVaoBonBuoc): KetQuaBonBuoc {
  const buoc: Record<Buoc, KetQuaBuoc> = {
    hieu: buocHieu(hoc),
    'ap-dung': buocApDung(mau, hoc),
    'kiem-tra': buocKiemTra(cauHoiKhoa, hoc),
    'ghi-nho': buocGhiNho(hoc),
  }
  const tinhTrang = Object.fromEntries(CAC_BUOC.map((b) => [b, buoc[b].tinhTrang])) as Record<
    Buoc,
    TinhTrangBuoc
  >
  return {
    buoc,
    tinhTrang,
    soXong: CAC_BUOC.filter((b) => daQua(tinhTrang[b])).length,
    tiep: CAC_BUOC.find((b) => !daQua(tinhTrang[b])) ?? null,
    cacBuocThieu: CAC_BUOC.filter((b) => buoc[b].thieu !== null),
    voHieu: cauHoiKhoa.length === 0 ? ['kiem-tra'] : [],
  }
}
