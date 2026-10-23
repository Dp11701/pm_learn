// Từ vựng trạng thái dùng chung web + server (§1, §5.1). Ba trục độc lập:
// trạng thái học (lưu), cờ Cần ôn lại (suy ra, không lưu), trạng thái nội dung (frontmatter).

export type TrangThaiHoc = 'chua-hoc' | 'dang-hoc' | 'da-xong' | 'bo-qua'
export const CAC_TRANG_THAI_HOC: readonly TrangThaiHoc[] = [
  'chua-hoc',
  'dang-hoc',
  'da-xong',
  'bo-qua',
]
export const TEN_TRANG_THAI_HOC: Record<TrangThaiHoc, string> = {
  'chua-hoc': 'Chưa học',
  'dang-hoc': 'Đang học',
  'da-xong': 'Đã xong',
  'bo-qua': 'Bỏ qua',
}
export const TEN_CAN_ON_LAI = 'Cần ôn lại'

export type NguonBanNhap = 'ai' | 'tu-viet'
export type TrangThaiNoiDung =
  | { loai: 'chua-co' }
  | { loai: 'ban-nhap'; nguon: NguonBanNhap }
  | { loai: 'da-duyet'; ngayDuyet: string; coBanSua?: boolean }

/** Loại hiển thị của một nút: theo kind của cây, chứng chỉ là chủ đề thuộc phần Chứng chỉ. */
export type LoaiHienThi = 'linh-vuc' | 'chu-de' | 'tai-lieu' | 'chung-chi' | 'nhom' | 'phan'
export const TEN_LOAI: Record<LoaiHienThi, string> = {
  'linh-vuc': 'Lĩnh vực',
  'chu-de': 'Chủ đề',
  'tai-lieu': 'Tài liệu',
  'chung-chi': 'Chứng chỉ',
  nhom: 'Nhóm',
  phan: 'Phần',
}

/** 4 bước của vòng học (§1). */
export type Buoc = 'hieu' | 'ap-dung' | 'kiem-tra' | 'ghi-nho'
export const CAC_BUOC: readonly Buoc[] = ['hieu', 'ap-dung', 'kiem-tra', 'ghi-nho']
export const TEN_BUOC: Record<Buoc, string> = {
  hieu: 'Hiểu',
  'ap-dung': 'Áp dụng',
  'kiem-tra': 'Kiểm tra',
  'ghi-nho': 'Ghi nhớ',
}
export type TinhTrangBuoc = 'chua-lam' | 'dang-lam' | 'xong' | 'khong-ap-dung'
