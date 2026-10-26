import type { TrangThaiNoiDung } from '../../shared/domain/trang-thai.ts'
import type { KetQuaBai, LoiDong } from '../../shared/noi-dung/index.ts'

// Hợp đồng GET /api/bai/:id (đề xuất 1.5, 1.6 "Bảo vệ bản Đã duyệt", 1.10, 2.2 bất biến 7, 3.6
// "Hiện ở bài") — TS thuần, không dùng gì của Node: web import để đọc phản hồi.
//
// Trạng thái nội dung do server quyết (phase 2a chưa có sổ nội dung, đọc thẳng đường dẫn chuẩn
// noi-dung/<muc.duongDanTuongDoi>):
//  - mục có bản chụp duyệt hiện hành: luôn Đã duyệt (ngày = ngày của bản chụp). File trùng hash bản
//    chụp → hiện file; file bị sửa / xoá / không đọc được → hiện BẢN CHỤP + 'doi-ngoai-app';
//  - không có bản chụp, không có file → Chưa có (bai null);
//  - file lỗi frontmatter (kể cả alias YAML vòng / quá nhiều) hoặc lớn hơn 256 KB (đề xuất 1.7, không đọc)
//    → Bản nháp (bất biến 7) + loiDoc (banner F26), bai null;
//  - file ban-nhap → Bản nháp (nguồn theo file);
//  - file da-duyet, không có bản chụp hiện hành → Bản nháp + 'chua-xac-nhan' khi DB không có bản chụp nào
//    của mục (◎, 1.6), + 'doi-ngoai-app' khi DB chỉ còn bản chụp đã bị thay.
//
// GET /api/noi-dung/trang-thai (PhanHoiTrangThaiNoiDung): trạng thái nội dung của mọi mục, cùng quy tắc.

/** Banner C26 bảo vệ bản Đã duyệt (đề xuất 1.6). */
export type CanhBaoDuyet =
  /** File ghi da-duyet nhưng DB không có bản chụp nào của mục → bài hiện là Bản nháp */
  | 'chua-xac-nhan'
  /**
   * Mục Đã duyệt mà file bị sửa / xoá ngoài app → bài hiện bản chụp; hoặc file ghi da-duyet mà DB chỉ còn
   * bản chụp đã bị thay → bài hiện file, tính Bản nháp
   */
  | 'doi-ngoai-app'

/** Câu của banner, nguyên văn đề xuất 1.6 */
export const CAU_CANH_BAO_DUYET: Readonly<Record<CanhBaoDuyet, string>> = {
  'chua-xac-nhan': 'File ghi Đã duyệt nhưng app chưa xác nhận — Quét lại',
  'doi-ngoai-app': 'File đã đổi ngoài app — Quét lại để kiểm tra',
}

/** Bài đang hiện lấy từ đâu: file trên đĩa, hoặc bản chụp lúc duyệt (content_approvals) */
export type BanHien = 'file' | 'ban-chup'

export interface PhanHoiBai {
  /** id nút của mục học */
  muc: string
  trangThaiNoiDung: TrangThaiNoiDung
  /** Bài đã đọc (phanTichBai); null khi Chưa có hoặc khi lỗi đọc file (loiDoc) */
  bai: KetQuaBai | null
  /** Lỗi frontmatter / file quá 256 KB làm không đọc được bài → banner F26 "<file>: lỗi frontmatter dòng N" */
  loiDoc: LoiDong | null
  canhBaoDuyet: CanhBaoDuyet | null
  /** null khi Chưa có */
  banHien: BanHien | null
  /**
   * sha256 (hex) của file trên đĩa; null khi không có file hoặc file quá 256 KB (không đọc) — base_hash cho
   * trình soạn, phase 7b
   */
  hashFile: string | null
}

/**
 * GET /api/noi-dung/trang-thai: { [id mục]: trạng thái nội dung } cho mọi mục học có bản chụp duyệt hiện
 * hành hoặc có file ở đường dẫn chuẩn; mục không có khoá = Chưa có nội dung. Cùng quy tắc với
 * PhanHoiBai.trangThaiNoiDung.
 */
export type PhanHoiTrangThaiNoiDung = Record<string, TrangThaiNoiDung>
