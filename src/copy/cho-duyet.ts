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

/** Mô tả ô C38 "Có ở phase 11" của khối Kế hoạch thi của tôi (src/pages/bai-hoc/KhoiApp.tsx). */
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

/** Nút phụ khi khối đã đánh dấu Không áp dụng (src/pages/bai-hoc/KhoiApp.tsx, KhoiKeHoachThi). */
export const BO_DANH_DAU = 'Bỏ đánh dấu'

/** Tiêu đề dialog C32 ghi lý do (KhoiApp.tsx, HopThoaiKhongApDung). */
export const TIEU_DE_KHONG_AP_DUNG = 'Đánh dấu Không áp dụng'

/** Đoạn mô tả của dialog (KhoiApp.tsx, HopThoaiKhongApDung). */
export const MO_TA_KHONG_AP_DUNG =
  'Bước Áp dụng của chứng chỉ này được tính là xong mà không cần kế hoạch thi. Bỏ đánh dấu được bất cứ lúc nào.'

/** Nhãn ô C36 lý do (KhoiApp.tsx); F02b ghi "Lý do: …" ở trạng thái đã đánh dấu. */
export const NHAN_LY_DO = 'Lý do'

/** Gợi ý dưới ô lý do (KhoiApp.tsx); `toiDa` = LY_DO_AP_DUNG_TOI_DA của server/du-lieu/ap-dung.ts. */
export const goiYLyDo = (toiDa: number) => `Bắt buộc · tối đa ${toiDa} ký tự`

/** Câu lỗi C36 khi bấm Lưu / Enter mà ô lý do trống (KhoiApp.tsx). */
export const LOI_THIEU_LY_DO = 'Ghi lý do để đánh dấu Không áp dụng.'

/** Nút chính của dialog (KhoiApp.tsx). */
export const NUT_LUU = 'Lưu'

/** Toast sau khi đánh dấu, trước tên mục (src/app/du-lieu/ap-dung.ts): "Đã đánh dấu Không áp dụng: <tên>". */
export const DA_DANH_DAU_KHONG_AP_DUNG = 'Đã đánh dấu Không áp dụng:'

/** Toast sau khi bỏ đánh dấu, trước tên mục (src/app/du-lieu/ap-dung.ts). */
export const DA_BO_DANH_DAU_KHONG_AP_DUNG = 'Đã bỏ đánh dấu Không áp dụng:'

/** Dưới khối Kế hoạch thi khi GET /api/ap-dung hỏng (KhoiApp.tsx); như "Lỗi: không đọc được tiến độ bước" của C10. */
export const LOI_DOC_AP_DUNG = 'Lỗi: không đọc được bước Áp dụng'

// ---------- Phase 2b — trang Nội dung /noi-dung, tab Nhập (src/pages/noi-dung, src/components/nhap, C30) ----------
// Chữ nguyên văn F22 / §8.8 / đề xuất 1.6–1.7, 3.8 ("Kéo thả file hoặc thư mục .md vào đây", "Quét lại thư mục",
// "Gán cho mục…", "Giữ bản cũ", "Nhập n file", "Đã nhập n file", "Có n file chưa nhận — Quét lại"…) nằm tại
// chỗ; dưới đây là câu tự đặt.

/** Mô tả C38 "Có ở phase 7a" của tab Độ phủ (src/pages/noi-dung/TrangNoiDung.tsx). */
export const DO_PHU_SAP_CO =
  'Bảng mọi mục học với trạng thái nội dung và cột Đủ khối, lọc theo trạng thái nội dung.'

/** Mô tả C38 "Có ở phase 7a" của tab Chờ duyệt (TrangNoiDung.tsx). */
export const CHO_DUYET_SAP_CO =
  'Các bản nháp chờ duyệt (kèm bản sửa và tổng quan nháp), nút Duyệt mở chế độ duyệt.'

/** Nút thứ hai của C30: chọn cả một thư mục (src/components/VungThaFile.tsx). */
export const CHON_THU_MUC = 'Chọn thư mục…'

/** C30 lúc kéo vào khi không biết số file (có thư mục); F02b vẽ "Thả để kiểm tra 15 file" khi biết. */
export const THA_DE_KIEM_TRA = 'Thả để kiểm tra'

/** C30 đang chờ máy chủ kiểm tra (src/pages/noi-dung/TabNhap.tsx). */
export const dangKiemTraFile = (tong: string) => `Đang kiểm tra ${tong} file…`

/** C30 đang quét lại thư mục nội dung (TabNhap.tsx). */
export const DANG_QUET_LAI = 'Đang quét lại thư mục nội dung…'

/** Dòng phụ của C30 lỗi khi cả lô bị từ chối (TabNhap.tsx). */
export const THU_LAI_KEO_THA = 'Kéo thả lại hoặc chọn file khác.'

/** Lý do không nhận một file (src/components/nhap/doc-tep.ts); "Chỉ nhận file .md" là chữ đề xuất 1.7. */
export const LY_DO_KHONG_NHAN = {
  quaLon: (kb: number) => `File lớn hơn ${kb} KB`,
  tenQuaDai: (toiDa: number) => `Tên file dài quá ${toiDa} ký tự`,
  khongDocDuoc: 'Không đọc được file theo UTF-8',
} as const

/** Lỗi cả lô (doc-tep.ts, TabNhap.tsx): vượt 250 file, 16 MB mỗi lần (đề xuất 1.7), lô rỗng. */
export const LOI_LO = {
  quaNhieuFile: (toiDa: string, so: string) =>
    `Mỗi lần nhập tối đa ${toiDa} file — lần này có ${so} file .md. Hãy chia thành nhiều lần.`,
  quaDungLuong: (toiDa: string, so: string) =>
    `Mỗi lần nhập tối đa ${toiDa} MB — lần này ${so} MB. Hãy chia thành nhiều lần.`,
  khongCoFile: 'Không tìm thấy file .md nào.',
  khongCoFileNhapDuoc: 'Không có file nào nhập được.',
  quaNhieuMuc: (toiDa: string) => `Thư mục có hơn ${toiDa} mục — hãy chọn thư mục nhỏ hơn.`,
} as const

/** Tiêu đề danh sách file bị bỏ qua ở phía trình duyệt (src/components/nhap/DanhSachKhongNhan.tsx). */
export const khongNhanFile = (so: string) => `Không nhận ${so} file`

/** Dòng cuối danh sách khi còn file không hiện (DanhSachKhongNhan.tsx). */
export const vaFileKhac = (so: string) => `… và ${so} file khác`

/** Dòng dưới C30 khi mở tab với ?muc= (đề xuất 3.6 "Lối vào"): file thả vào được gán sẵn mục này (TabNhap.tsx). */
export const GAN_SAN_CHO = 'File thả vào được gán sẵn cho'

/** Nút bỏ ?muc= khỏi đường dẫn (TabNhap.tsx). */
export const BO_GAN_SAN = 'Bỏ gán sẵn'

/** Giá trị cột "Khớp theo" khi bạn tự gán / khi gán sẵn theo ?muc= (src/components/nhap/ket-qua.ts); "id", "tên file" là chữ F22. */
export const KHOP_THEO_BAN_GAN = 'bạn gán'
export const KHOP_THEO_GAN_SAN = 'gán sẵn'
/** "Khớp theo" của dòng Quét lại mà server khớp theo chỗ của file (file đã nhận / nằm ở đường dẫn chuẩn của mục). */
export const KHOP_THEO_DUONG_DAN = 'đường dẫn'

/** Chữ ẩn ở ô Mục "—" (src/components/nhap/BangKetQua.tsx). */
export const CHUA_GAN_MUC = 'Chưa gán mục'

/** Tên vùng cuộn ngang của bảng kết quả (BangKetQua.tsx), cùng kiểu với nhanBangCuon. */
export const TEN_BANG_KET_QUA = 'Kết quả kiểm tra, cuộn ngang'

/** Ghi chú dòng Hợp lệ khi mục đã có Bản nháp (đề xuất 3.8 "mục có Bản nháp thì thay"; BangKetQua.tsx). */
export const THAY_BAN_NHAP = 'Thay bản nháp đang có (bản cũ vào thùng rác)'

/** Cảnh báo dòng sẽ nhập vào cùng mục với một file khác trong lô (src/components/nhap/BangKetQua.tsx). */
export const cungMucVoi = (ten: string) => `Cùng mục với ${ten} — chỉ nên nhập một file`

/** Ghi chú dòng ⟳ của Quét lại khi chọn Giữ bản cũ (đề xuất 1.6; BangKetQua.tsx). */
export const GIU_BAN_CU_GHI_LAI = 'Ghi lại bản đã duyệt; bản sửa ngoài app vào thùng rác'
/** Như trên khi file Đã duyệt đã bị xoá / chuyển đi ngoài app (không có gì để bỏ vào thùng rác). */
export const GIU_BAN_CU_KHOI_PHUC = 'Ghi lại bản đã duyệt từ bản chụp của app'

/** Hộp chọn chung cho mọi dòng ◎ khi có từ 2 dòng (BangKetQua.tsx). */
export const nhanTatCaDaDuyet = (so: string) => `Nhận là Đã duyệt cả ${so} file ◎`

/** Ghi chú cuối bảng khi có dòng ◎ (BangKetQua.tsx), cạnh câu F22 về file trùng. */
export const CHU_THICH_CHUA_CHUP = 'File ◎ chỉ nhập khi tick "Nhận là Đã duyệt"'

/** Phần thêm của dòng tóm tắt F22 khi có dòng ◎ (ket-qua.ts). */
export const chuaCoBanChup = (so: string) => `${so} chưa có bản chụp`

/** Nút cuối bảng khi Quét lại có dòng ⟳ để Giữ bản cũ (ket-qua.ts); chỉ nhập thì là "Nhập n file" (F22). */
export const nutGiuBanCu = (so: string) => `Giữ ${so} bản cũ`
export const nutNhapVaGiu = (nhap: string, giu: string) => `Nhập ${nhap} file · giữ ${giu} bản cũ`

/** Toast sau khi Giữ bản cũ (src/app/du-lieu/nhap.ts) — không có Hoàn tác (bản ngoài app nằm trong thùng rác). */
export const daGiuBanCu = (so: string) => `Đã giữ ${so} bản cũ`

/** Toast sau Hoàn tác lần nhập (nhap.ts). */
export const daHoanTacNhap = (so: string) => `Đã hoàn tác: ${so} file trở lại như trước khi nhập`

/** Toast khi Quét lại không có gì để nhập (nhap.ts, TabNhap.tsx). */
export const QUET_LAI_KHONG_CO_GI = 'Quét lại xong: không có file nào cần nhập.'

/** Toast lỗi (nhap.ts): câu của máy chủ đứng sau. */
export const LOI_NHAP = {
  kiemTra: 'Không kiểm tra được',
  nhap: 'Không nhập được',
  hoanTac: 'Không hoàn tác được',
  quetLai: 'Không quét lại được',
  giuBanCu: 'Không giữ được bản cũ',
  matKetNoi: 'Mất kết nối với máy chủ cục bộ.',
} as const

/** Nút của banner lỗi khi lô hết hạn (410) — kiểm lại cùng các file (TabNhap.tsx). */
export const KIEM_TRA_LAI = 'Kiểm tra lại'

/** Vùng status đọc kết quả kiểm tra (TabNhap.tsx): `tomTat` là dòng tóm tắt F22. */
export const daKiemTra = (so: string, tomTat: string) => `Kiểm tra xong ${so} file: ${tomTat}.`

/** Khối "Vừa nhập" sau khi nhập: tiêu đề + dòng phụ + link tới từng bài (src/components/nhap/VuaNhap.tsx). */
export const VUA_NHAP = 'Vừa nhập'
export const VUA_NHAP_MO_TA = 'Các bài vừa nhập — mở bài để đọc.'
/** Nhãn từng dòng "Vừa nhập": file vào đâu (bản sửa: trang bài vẫn hiện bản đã duyệt — xem bản sửa ở phase 7a). */
export const VUA_NHAP_THANH = {
  'ban-nhap': 'Bản nháp',
  'ban-sua': 'Bản sửa — bài vẫn hiện bản Đã duyệt tới khi bạn duyệt bản sửa',
  'da-duyet': 'Đã duyệt',
} as const

// ---------- Phase 2b — thay file cây (đề xuất 1.3) ----------

/** Toast lỗi khi tắt banner "Cây roadmap vừa cập nhật…" không được (src/app/khung/BannerThayCay.tsx). */
export const LOI_TAT_THAY_CAY = 'Không tắt được thông báo cây roadmap'

/** Dialog "Gán cho mục…" (C28 trong C32; src/components/nhap/HopThoaiGanMuc.tsx). */
export const GAN_MUC = {
  tieuDe: 'Gán cho mục',
  timMuc: 'Tìm mục để gán',
  goiY: 'Gợi ý theo tên file',
  dangGan: 'Đang gán',
  huongDanTrong: 'Gõ tên mục, tên gốc hoặc viết tắt để tìm.',
  /** "↑ ↓ di chuyển" như chân C28; "Enter gán" thay "Enter mở". */
  huongDanPhim: '↑ ↓ di chuyển · Enter gán',
  ketQua: 'Kết quả',
  boGan: 'Bỏ gán',
  huy: 'Huỷ',
} as const

// ---------- Phase 3 — lớp dữ liệu học (src/app/du-lieu/the.ts, dong-ho.ts) ----------
// Toast lỗi / Thử lại / Hoàn tác nguyên văn 3.1; "Đã đánh dấu / Đã bỏ đánh dấu Không áp dụng:" dùng lại câu 2a ở
// trên cho Thực hành mọi mẫu (src/app/du-lieu/hoc.ts).

/** Toast sau khi xoá một flashcard (kèm Hoàn tác; src/app/du-lieu/the.ts). */
export const DA_XOA_THE = 'Đã xoá thẻ'

/** Toast sau "Chuyển sang mục này" (kèm Hoàn tác) và sau Hoàn tác, trước tên mục (src/app/du-lieu/dong-ho.ts). */
export const DA_CHUYEN_DONG_HO_SANG = 'Đã chuyển đồng hồ sang'

/** Toast sau khi xoá một phiên trong Lịch sử của card đồng hồ (kèm Hoàn tác; dong-ho.ts). */
export const DA_XOA_PHIEN_HOC = 'Đã xoá phiên học'
