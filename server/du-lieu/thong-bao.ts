// Câu báo lỗi của API phase 3 (đề xuất 3.2–3.5, Cần chốt 6, 12): 4 bước, dự án, flashcard, đồng hồ, phiên giờ.
// Đều là câu mới (đề xuất không có câu chữ cho lỗi API), gửi duyệt ở báo cáo phase 3. API trả qua { loi }.

export const TB_HOC = {
  // ---------- Chung ----------
  khongCoMuc: (id: string) => `Không có mục học id "${id}" trong cây roadmap.`,
  thanBody: (mau: string) => `Thân yêu cầu phải là JSON dạng ${mau}.`,
  truongLa: (khoa: readonly string[], chiNhan: readonly string[]) =>
    `Trường không được nhận: ${khoa.join(', ')}. Chỉ nhận ${chiNhan.join(', ')}.`,
  canMotTruong: (chiNhan: readonly string[]) => `Cần ít nhất một trường: ${chiNhan.join(', ')}.`,
  phaiLaChuoi: (truong: string) => `${truong} phải là chuỗi.`,
  quaDai: (truong: string, toiDa: number) => `${truong} dài tối đa ${toiDa} ký tự.`,
  khongDeTrong: (truong: string) => `${truong} không được để trống.`,

  // ---------- Áp dụng (bài thực hành) ----------
  trangThaiThucHanh: 'trangThai phải là dang-lam, xong, khong-ap-dung hoặc null (chưa làm).',
  canLyDo: 'Cần ghi lý do Không áp dụng (không để trống).',
  lyDoChiKhiKhongApDung: 'lyDo chỉ dùng khi bước Áp dụng là Không áp dụng.',
  canKetQua: 'Ghi “Kết quả của bạn” trước khi đánh dấu bài thực hành Xong.',
  /** Tài liệu / Chứng chỉ: bước Áp dụng tính theo khối khác, ở đây chỉ đánh dấu Không áp dụng */
  chiKhongApDung: (loai: string, khoi: string) =>
    `Mục ${loai}: bước Áp dụng tính theo khối ${khoi}; ở đây chỉ đánh dấu Không áp dụng (kèm lý do) được.`,
  duAnId: 'duAnId phải là số nguyên dương hoặc null.',
  khongCoDuAn: (id: number) => `Không có dự án id ${id}.`,
  tieuChi: 'tieuChi phải là object { "<khoá tiêu chí>": true | false }.',
  quaNhieuTieuChi: (toiDa: number) => `tieuChi có tối đa ${toiDa} khoá.`,
  khoaSai: (truong: string) =>
    `${truong} không hợp lệ: khoá phải là chữ thường a–z, số, có thể thêm #n (tối đa 40 ký tự).`,

  // ---------- Kiểm tra (tự kiểm tra) ----------
  daXem: 'daXem chỉ nhận true (đã xem đáp án thì không ẩn lại).',
  cham: 'cham phải là dung, mot-phan hoặc sai.',
  traLoiTruoc: 'Viết câu trả lời trước khi xem đáp án.',
  xemTruocKhiCham: 'Xem đáp án trước khi tự chấm.',

  // ---------- Dự án ----------
  tenDuAn: 'Cần tên dự án (không để trống).',

  // ---------- Flashcard ----------
  khongCoThe: (id: string) => `Không có thẻ id ${id}.`,
  matTruoc: 'Cần mặt trước của thẻ (không để trống).',
  matSau: 'Cần mặt sau của thẻ (không để trống).',
  theKhongKhoiPhuc: (id: string) =>
    `Không khôi phục được thẻ id ${id}: thẻ không nằm trong danh sách vừa xoá (đã quá 1 ngày hoặc chưa từng xoá).`,

  // ---------- Đồng hồ ----------
  dangChayMucKhac: (ten: string) =>
    `Đồng hồ đang chạy cho “${ten}”. Chỉ 1 đồng hồ chạy một lúc: gửi chuyen: true để dừng đồng hồ đó và bấm giờ mục này.`,
  canHoiGhi: (thoiLuong: string) =>
    `Đồng hồ đã chạy ${thoiLuong} (hơn 3 giờ hoặc qua nửa đêm). Gửi lại kèm ghiGiay: số giây muốn ghi, hoặc null để không ghi.`,
  ghiGiay: 'ghiGiay phải là số giây (số nguyên ≥ 0) hoặc null (không ghi).',
  chuyen: 'chuyen phải là true hoặc false.',
  khongHoanTac: 'Không có lần dừng hay chuyển đồng hồ nào để hoàn tác.',
  hoanTacDaDoi: 'Không hoàn tác được: đồng hồ đã đổi sau lần dừng / chuyển đó.',
  hoanTacQuaLau: (phut: number) =>
    `Không hoàn tác được: lần dừng / chuyển đồng hồ đã qua hơn ${phut} phút.`,

  // ---------- Phiên giờ ----------
  khongCoPhien: (id: string) => `Không có phiên giờ id ${id}.`,
  phienKhongKhoiPhuc: (id: string) =>
    `Không khôi phục được phiên giờ id ${id}: phiên không nằm trong danh sách vừa xoá (đã quá 1 ngày hoặc chưa từng xoá).`,
} as const
