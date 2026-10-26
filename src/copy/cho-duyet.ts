// Câu chữ phase 1 tự đặt, chưa có nguyên văn trong đặc tả (docs/prompt-design.md), frame
// (docs/design-handoff/design/*.dc.html) hay đề xuất (docs/de-xuat-trien-khai.md). Gom ở đây để bạn duyệt
// và sửa một chỗ (đề xuất mục 9, điểm dừng chờ duyệt). Chữ lấy nguyên văn từ ba nguồn đó vẫn nằm tại chỗ.
// Mỗi mục ghi nơi dùng; hàm dùng cho câu có biến.

// ---------- Dùng chung ----------

/** Tên nút X: nhãn mặc định của Banner (C26, src/components/Banner.tsx) và nút đóng Toast (C33). */
export const DONG_THONG_BAO = 'Đóng thông báo'

// ---------- Toast (C33) ----------

/** Tên vùng status chứa các toast thường (src/components/Toast.tsx). */
export const TEN_VUNG_TOAST = 'Thông báo'

// ---------- Kết nối máy chủ (F26) ----------

/** Toast khi có lại kết nối sau lúc mất (src/app/ket-noi.tsx, ThongBaoKetNoiLai). */
export const DA_KET_NOI_LAI = 'Đã kết nối lại với máy chủ cục bộ.'

// ---------- Khung app (C34, rail, chân trang) ----------

/** aria-label của link roadmap.sh ở chân trang (src/app/khung/ChanTrang.tsx). */
export const NHAN_LINK_ROADMAP_SH = 'roadmap.sh (mở tab mới)'

/**
 * Tên truy cập nút Giao diện (src/app/khung/NutGiaoDien.tsx): nhãn đang hiện ("Giao diện: Sáng") + giao
 * diện sẽ chuyển sang khi bấm.
 */
export function tenNutGiaoDien(nhan: string, tenKe: string): string {
  return `${nhan}. Bấm để chuyển sang ${tenKe}`
}

/** Tooltip nút tìm ở rail (src/app/khung/Rail.tsx). */
export const GOI_Y_RAIL_TIM = 'Tìm mục (/)'

/** Tooltip nút "?" ở rail (src/app/khung/Rail.tsx). */
export const GOI_Y_RAIL_PHIM_TAT = 'Bảng phím tắt (?)'

// ---------- Bảng phím tắt (F27) ----------

/** Câu thứ ba của ô ghi chú (src/components/BangPhimTat.tsx); hai câu đầu là chữ của F27. */
export const GHI_CHU_BO_CUC_PHIM =
  'Chữ trên phím theo bàn phím kiểu Mỹ; với AZERTY, QWERTZ hãy bấm phím ở cùng vị trí.'

// ---------- Tìm kiếm (C28) và ô tìm trang 404 (F26) ----------

/** Vùng status đọc số kết quả khi ngừng gõ (src/components/tim-kiem/ThongBaoKetQua.tsx); `so` đã định dạng. */
export function chuSoKetQua(so: string): string {
  return `${so} kết quả.`
}

/**
 * Đứng trước tên mục Enter sẽ mở: vùng status (ThongBaoKetQua, "7 kết quả. Enter mở: <tên>.") và dòng dưới
 * danh sách ô tìm 404 (src/pages/khong-tim-thay/OTimMuc.tsx).
 */
export const ENTER_MO = 'Enter mở:'

/** Vùng status khi không có kết quả (ThongBaoKetQua); `goiY` = GOI_Y_KHONG_CO_KET_QUA (§6.3). */
export function khongCoKetQuaCho(truyVan: string, goiY: string): string {
  return `Không có kết quả cho "${truyVan}". ${goiY}.`
}

/** Tên danh sách kết quả của ô tìm 404 (src/pages/khong-tim-thay/OTimMuc.tsx). */
export const TEN_DS_KET_QUA_404 = 'Kết quả tìm mục'

/** Dòng hiện ở ô tìm 404 khi không có kết quả (OTimMuc); `goiY` = GOI_Y_KHONG_CO_KET_QUA (§6.3). */
export function khongCoKetQua404(goiY: string): string {
  return `Không có kết quả. ${goiY}.`
}

// ---------- Trạng thái (C5, C10) ----------

/** Chữ cho trình đọc màn hình sau tên trạng thái của pill khi đang lưu (src/components/trang-thai/PillTrangThai.tsx). */
export const PILL_DANG_LUU = ', đang lưu'

/** Như trên, khi lưu lỗi (PillTrangThai.tsx). */
export const PILL_LOI_LUU = ', lỗi lưu'

/** aria của vòng tiến độ khi mẫu số bằng 0, thay "Tiến độ n%" (src/components/trang-thai/TienDo.tsx). */
export const TIEN_DO_CHUA_TINH_DUOC = 'Tiến độ chưa tính được phần trăm'

// ---------- Trình soạn (F20) ----------

/** Link "‹ Về …" của trình soạn tổng quan phần (src/pages/TrangSoan.tsx); soạn bài dùng "Về bài" (đề xuất). */
/** Nút quay về trang cha trên trang "Có ở phase n" (TrangSapCo). */
export const veTrangCha = (nhan: string) => `Về ${nhan}`

export const VE_PHAN = 'Về phần'

/** Link "‹ Về …" của trình soạn tổng quan lĩnh vực (src/pages/TrangSoan.tsx). */
export const VE_LINH_VUC = 'Về lĩnh vực'

// ---------- Trang "Có ở phase n" (C38) ----------

/** Câu "trang sẽ làm gì" dưới C38 của từng route chưa làm tới. */
export const MO_TA_SAP_CO = {
  /** `/` (src/pages/cac-trang.ts) */
  tongQuan: 'Tiến độ cả roadmap, mục đang học, thẻ cần ôn hôm nay, giờ học và độ phủ nội dung.',
  /** `/lo-trinh` (cac-trang.ts) */
  loTrinh:
    'Cả roadmap dạng danh sách cây (phase 4) và bản đồ (phase 6), lọc theo trạng thái, loại, phần, lĩnh vực.',
  /** `/noi-dung` (cac-trang.ts) */
  noiDung: 'Nhập file .md (phase 2b); tab Độ phủ và Chờ duyệt có ở phase 7a.',
  /** `/on-tap` (cac-trang.ts) */
  onTap: 'Thẻ đến hạn hôm nay, các hộp Leitner, tỉ lệ nhớ 30 ngày và danh sách Cần ôn lại.',
  /** `/on-tap/phien` (cac-trang.ts) */
  phienOn: 'Ôn từng flashcard đến hạn: lật thẻ rồi tự chấm Quên hoặc Nhớ.',
  /** `/lo-trinh-goi-y` (cac-trang.ts) */
  loTrinhGoiY:
    'Thứ tự học đề xuất theo chặng, chỉ có hiệu lực sau khi bạn duyệt; tới lúc đó Trước/Tiếp vẫn theo thứ tự cây.',
  /** `/thong-ke` (cac-trang.ts) */
  thongKe:
    'Giờ học, đường burnup kèm dự báo ngày xong, heatmap theo tuần; biểu đồ nào cũng có dạng bảng.',
  /** `/ho-so` (cac-trang.ts) */
  hoSo: 'Các tài liệu của dự án thực hành, nhóm theo lĩnh vực: Chưa tạo, Đang viết hay Hoàn thành.',
  /** `/chung-chi` (cac-trang.ts) */
  chungChi: 'Các chứng chỉ trong roadmap, mức theo đuổi và kế hoạch thi của từng chứng chỉ.',
  /** `/chao-mung` (cac-trang.ts) */
  chaoMung: 'Thư mục nội dung, dự án thực hành, mục tiêu giờ học mỗi tuần và tự đánh giá đầu vào.',
  /** `/thuat-ngu` (cac-trang.ts) */
  thuatNgu: 'Giải nghĩa của các mục đã có nội dung và bảng viết tắt có trong cây.',
  /** `/ghi-chu` (cac-trang.ts) */
  ghiChu: 'Mọi ghi chú theo mục, tìm và lọc theo phần, lĩnh vực.',
  /** `/cai-dat` (cac-trang.ts) */
  caiDat:
    'Giao diện, quy tắc Cần ôn lại, thư mục nội dung, mục tiêu giờ, xuất/nhập tiến độ JSON, sao lưu và đặt lại.',
  /** `/linh-vuc/:slug` (src/pages/TrangLinhVuc.tsx) */
  linhVuc:
    'Tiến độ của lĩnh vực, các nhóm và mục học dạng cây, kệ tài liệu và chuyển sang lĩnh vực kề.',
  /** `/hoc/:slug` (src/pages/TrangMucHoc.tsx) */
  mucHoc: 'Bài học, trạng thái học, vị trí trong lĩnh vực và Trước/Tiếp theo thứ tự cây.',
  /** `/phan/:slug` (src/pages/TrangPhan.tsx) */
  phan: 'Tiến độ và độ phủ nội dung của phần, các nhóm và mục học, phần tổng quan do bạn soạn.',
  /** `/hoc/:slug/ban-cua-toi/:id` (src/pages/TrangBanCuaToi.tsx) */
  banCuaToi:
    'Bản tài liệu của bạn cho dự án thực hành: tạo từ mẫu, lưu từng phiên bản, đánh dấu Hoàn thành và tải về .md / .csv.',
  /** `/hoc/:slug/soan` (src/pages/TrangSoan.tsx) */
  soanBai: 'Trình soạn Markdown: khung bài theo mẫu, báo lỗi theo dòng, xem trước và lưu bản nháp.',
  /** `/linh-vuc/:slug/soan`, `/phan/:slug/soan` (src/pages/TrangSoan.tsx) */
  soanTongQuan:
    'Trình soạn Markdown cho phần tổng quan (_tong-quan.md): xem trước và lưu bản nháp.',
} as const

// ---------- Phase 2a — trang bài học /hoc/:slug (src/pages/bai-hoc, src/components/bai-hoc) ----------

/** Card lỗi khi GET /api/bai hỏng (C38 lỗi, src/pages/bai-hoc/TrangBaiHoc.tsx); dòng phụ là câu F26. */
export const KHONG_TAI_DUOC_BAI = 'Không tải được bài học.'

/** Dưới segmented khi GET /api/state hỏng (src/pages/bai-hoc/DauBai.tsx); như "Lỗi: không đọc được tiến độ bước" của C10. */
export const LOI_DOC_TRANG_THAI = 'Lỗi: không đọc được trạng thái học'

/** Toast sau khi sao chép prompt (src/components/HopThoaiPrompt.tsx). */
export const DA_SAO_CHEP_PROMPT = 'Đã sao chép prompt soạn bài.'

/** Dòng status trong dialog khi trình duyệt không cho ghi clipboard: prompt được chọn sẵn để tự sao chép (HopThoaiPrompt.tsx). */
export const KHONG_SAO_CHEP_DUOC =
  'Không sao chép tự động được — prompt đã được chọn sẵn, nhấn ⌘C hoặc Ctrl+C để sao chép.'

/** Dòng "Có ở phase 3" trong thẻ Thực hành (C20 chỉ đọc, src/components/bai-hoc/TheThucHanh.tsx). */
export const THUC_HANH_SAP_CO = 'Chọn dự án, ghi kết quả, đánh dấu Xong hoặc Không áp dụng.'

/** Dưới nút "Xem đáp án" đang tắt của câu tự kiểm tra (C21 chỉ đọc, src/components/bai-hoc/CauTuKiemTra.tsx). */
export const CAU_HOI_SAP_CO = 'Ô trả lời, Xem đáp án và tự chấm có ở phase 3.'

/** Mô tả ô C38 "Có ở phase 11" của khối Kế hoạch thi của tôi (src/pages/bai-hoc/ThanBai.tsx). */
export const KE_HOACH_THI_SAP_CO =
  'Ngày thi dự kiến và số ngày còn lại; có ngày thi thì bước Áp dụng được tính là xong.'

/** Tên vùng cuộn ngang của bảng Markdown trong bài (src/components/bai-hoc/Markdown.tsx); C17 dùng câu F15. */
export const nhanBangCuon = (tenKhoi: string) => `Bảng trong khối ${tenKhoi}, cuộn ngang`

/** Chữ ẩn sau link ngoài trong bài (Markdown.tsx), cùng cụm với NHAN_LINK_ROADMAP_SH. */
export const MO_TAB_MOI = '(mở tab mới)'

/** Chữ ẩn đọc thay dấu ★ ở khung bài (src/components/bai-hoc/KhungBaiTrong.tsx). */
export const BAT_BUOC = 'bắt buộc'

// ---------- Phase 2a — "Không áp dụng" của khối Kế hoạch thi (Chứng chỉ; đề xuất 3.2) ----------
// Nhãn "Không áp dụng" là chữ của §1 / 3.2; trạng thái đã đánh dấu "Không áp dụng" + `Lý do: "…"` theo C20 ở
// F02b; "Huỷ" theo F19; toast lỗi / Thử lại / Hoàn tác nguyên văn 3.1 — các chữ đó nằm tại chỗ.

/** Nút phụ khi khối đã đánh dấu Không áp dụng (src/pages/bai-hoc/ThanBai.tsx, KhoiKeHoachThi). */
export const BO_DANH_DAU = 'Bỏ đánh dấu'

/** Tiêu đề dialog C32 ghi lý do (ThanBai.tsx, HopThoaiKhongApDung). */
export const TIEU_DE_KHONG_AP_DUNG = 'Đánh dấu Không áp dụng'

/** Đoạn mô tả của dialog (ThanBai.tsx, HopThoaiKhongApDung). */
export const MO_TA_KHONG_AP_DUNG =
  'Bước Áp dụng của chứng chỉ này được tính là xong mà không cần kế hoạch thi. Bỏ đánh dấu được bất cứ lúc nào.'

/** Nhãn ô C36 lý do (ThanBai.tsx); F02b ghi "Lý do: …" ở trạng thái đã đánh dấu. */
export const NHAN_LY_DO = 'Lý do'

/** Gợi ý dưới ô lý do (ThanBai.tsx); `toiDa` = LY_DO_AP_DUNG_TOI_DA của server/du-lieu/ap-dung.ts. */
export const goiYLyDo = (toiDa: number) => `Bắt buộc · tối đa ${toiDa} ký tự`

/** Câu lỗi C36 khi bấm Lưu / Enter mà ô lý do trống (ThanBai.tsx). */
export const LOI_THIEU_LY_DO = 'Ghi lý do để đánh dấu Không áp dụng.'

/** Nút chính của dialog (ThanBai.tsx). */
export const NUT_LUU = 'Lưu'

/** Toast sau khi đánh dấu, trước tên mục (src/app/du-lieu/ap-dung.ts): "Đã đánh dấu Không áp dụng: <tên>". */
export const DA_DANH_DAU_KHONG_AP_DUNG = 'Đã đánh dấu Không áp dụng:'

/** Toast sau khi bỏ đánh dấu, trước tên mục (src/app/du-lieu/ap-dung.ts). */
export const DA_BO_DANH_DAU_KHONG_AP_DUNG = 'Đã bỏ đánh dấu Không áp dụng:'

/** Dưới khối Kế hoạch thi khi GET /api/ap-dung hỏng (ThanBai.tsx); như "Lỗi: không đọc được tiến độ bước" của C10. */
export const LOI_DOC_AP_DUNG = 'Lỗi: không đọc được bước Áp dụng'
