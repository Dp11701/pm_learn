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
