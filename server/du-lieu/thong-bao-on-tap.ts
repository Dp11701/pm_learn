// Câu báo lỗi của API phiên ôn (bước 3; đề xuất 3.5). Đều là câu mới (đề xuất không có câu chữ cho lỗi API), gửi
// duyệt cùng báo cáo bước 3. API trả qua { loi }.
import { dinhDangNgay } from '../../shared/dinh-dang.ts'

export const TB_ON_TAP = {
  ket: 'ket phải là nho hoặc quen.',
  luyenThem: 'luyenThem phải là true hoặc false.',
  /** Thẻ có nhưng mục của nó đã bỏ khỏi cây (bất biến 8: không ghi bản ghi mới cho mục ngoài cây) */
  theMucKhongCon: (id: string, itemId: string) =>
    `Không ôn được thẻ id ${id}: mục học id "${itemId}" của thẻ không còn trong cây roadmap.`,
  /** 409: lần ôn thật cho thẻ chưa đến hạn (thường là bấm hai lần, hoặc đã ôn ở tab khác) */
  chuaDenHan: (id: string, hanOn: string) =>
    `Thẻ id ${id} chưa đến hạn ôn (hạn ${dinhDangNgay(hanOn)}): có thể thẻ vừa được ôn rồi. Tải lại danh sách thẻ đến hạn.`,
} as const
