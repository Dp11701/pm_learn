// Hợp đồng API nhập file .md (đề xuất 1.6, 1.7, 3.8; F22) — TS thuần, không dùng gì của Node.
//  - POST /api/nhap/kiem-tra   YeuCauKiemTra → PhanHoiKiemTra (không ghi file; ghi bản tạm của file lỗi)
//  - POST /api/nhap/thuc-hien  YeuCauThucHien → PhanHoiThucHien (kiểm lại; token quá 30 phút → 410)
//  - POST /api/nhap/hoan-tac   { fileOp } → { revision }
//  - POST /api/nhap/quet-lai   → PhanHoiQuetLai
// Mọi `revision` là revision nội dung (cùng số với /api/meta noiDung.revision).

export const CAC_LOAI_KET_QUA = [
  'hop-le',
  'thieu-khoi',
  'khong-khop',
  'trung-da-duyet',
  'chua-chup',
  'loi',
] as const
/** ✓ Hợp lệ · ⚠ Thiếu khối bắt buộc · ⚠ Không khớp mục · ⟳ Trùng bản đã duyệt · ◎ chưa có bản chụp · ✕ Lỗi */
export type LoaiKetQua = (typeof CAC_LOAI_KET_QUA)[number]

export interface MucNgan {
  id: string
  slug: string
  label: string
}

export interface UngVien extends MucNgan {
  /** Dice 0–1 (làm tròn 3 chữ số); 1 = ứng viên theo id / chỗ đặt file */
  diem: number
}

/**
 * Cách server khớp file với `muc` (ngoài hợp đồng gốc, thêm cho cột "Khớp theo" của F22): id trong
 * frontmatter, tên file, đường dẫn (Quét lại: file đã nhận / nằm ở chỗ chuẩn của mục), gán sẵn theo ?muc=,
 * gợi ý theo tên gần đúng (Dice); null khi không có mục.
 */
export type KhopTheo = 'id' | 'ten-file' | 'duong-dan' | 'gan-san' | 'goi-y' | null

export interface KetQuaFile {
  /** Vị trí trong mảng files đã gửi (kiem-tra) hoặc trong các dòng cần quyết của Quét lại */
  chiSo: number
  /** Tên file (basename) */
  ten: string
  loai: LoaiKetQua
  /** Mục khớp; với 'khong-khop' chỉ có khi gán sẵn (ganSan) */
  muc: MucNgan | null
  /** Không khớp mục nhưng đã gán sẵn (?muc= hoặc Dice ≥ 0,7, hơn thứ hai ≥ 0,1): đếm vào "Nhập n file" */
  ganSan: boolean
  /** Tối đa 3 ứng viên ≥ 0,6, chỉ khi không gán sẵn */
  ungVien: UngVien[]
  /** Tên các khối ★ thiếu (theo mẫu bài của mục) */
  thieu: string[]
  loi: { dong: number; thongBao: string } | null
  /** File ghi da-duyet, sẽ bị ép ban-nhap khi nhập */
  chuyenVeBanNhap: boolean
  /** Nhập sẽ thay file đang có của mục (bản nháp / bản sửa / file chưa nhận ở đúng chỗ): bản cũ vào thùng rác */
  thayBanNhap: boolean
  ghiChu: string | null
  /** Khoá editor_buffers nhap:<token>:<i> của file lỗi đọc được, cho "Mở trong trình soạn" */
  khoaBoDem: string | null
  /** Thêm ngoài hợp đồng gốc */
  khopTheo: KhopTheo
  /** Thêm ngoài hợp đồng gốc, chỉ ở lô Quét lại: đường dẫn tương đối của file trong thư mục nội dung */
  duongDan?: string
}

export interface TomTatKiemTra {
  /** ✓ */
  hopLe: number
  /** ⚠ Thiếu khối + Không khớp mục */
  canhBao: number
  /** ⟳ */
  trung: number
  /** ✕ */
  loi: number
}

export interface PhanHoiKiemTra {
  token: string
  ketQua: KetQuaFile[]
  /** "a hợp lệ · b cảnh báo · c trùng · d lỗi" (◎ không vào 4 số này) */
  tomTat: TomTatKiemTra
  /** Số file nhập khi giữ mặc định: Hợp lệ + Thiếu khối + Không khớp đã gán sẵn (F22: 13) */
  soNhapDuoc: number
}

export interface TepGui {
  /** basename, `^[^/\\\0]{1,200}\.md$` */
  ten: string
  noiDung: string
  /** Đường dẫn tương đối trong thư mục được thả — server bỏ qua (đích luôn tính từ id mục) */
  duongDan?: string
}

export interface YeuCauKiemTra {
  files: TepGui[]
  /** id mục của ?muc= — file không khớp id / tên được gán sẵn mục này */
  mucMacDinh?: string
}

export type XuLyTrung = 'giu-ban-cu' | 'thanh-ban-sua'

export interface YeuCauThucHien {
  token: string
  /** chiSo → id mục học: dòng Không khớp mục sẽ nhập (cả dòng gán sẵn), hoặc gán lại dòng khác */
  gan: Record<string, string>
  /** chiSo → cách xử lý dòng ⟳ (không có = Giữ bản cũ) */
  xuLyTrung: Record<string, XuLyTrung>
  /** chiSo của dòng ◎ đã tick "Nhận là Đã duyệt" */
  nhanDaDuyet: number[]
}

export interface PhanHoiThucHien {
  daNhap: { chiSo: number; mucId: string; duongDan: string }[]
  fileOp: number
  revision: number
}

export interface PhanHoiRevision {
  revision: number
}

export interface PhanHoiQuetLai {
  /** Số file Hợp lệ / Thiếu khối được nhập thẳng (toast "Đã nhập n file" + Hoàn tác qua fileOp) */
  daNhap: number
  /** file_op của lần nhập thẳng; null khi không nhập gì */
  fileOp: number | null
  /** Chỉ khi có file cần bạn quyết (Không khớp mục, ⟳, ◎, Lỗi frontmatter) */
  kiemTra: PhanHoiKiemTra | null
  /** File .md chưa nhận còn lại sau Quét lại */
  chuaNhan: number
  /** Thêm ngoài hợp đồng gốc: số file đã nhận bị đổi tên / chuyển chỗ được đưa về đường dẫn chuẩn (không hỏi) */
  daChuyen: number
}
