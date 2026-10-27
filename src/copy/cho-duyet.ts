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

// ---------- Trang "Có ở phase n" (C38) ----------

/** Nút quay về mục menu cha trên trang "Có ở phase n" (src/pages/TrangSapCo.tsx), vd. "Về Lộ trình". */
export const veTrangCha = (nhan: string) => `Về ${nhan}`

/**
 * Câu "trang sẽ làm gì" dưới C38 của từng route chưa làm tới. Trang của phần đã bỏ khỏi phạm vi (đề xuất mục 10:
 * P1, bản đồ, trình soạn, "Bản của tôi") không còn route nên không còn câu.
 */
export const MO_TA_SAP_CO = {
  /** `/` (src/pages/cac-trang.ts) */
  tongQuan: 'Tiến độ cả roadmap, mục đang học và thẻ cần ôn hôm nay.',
  /** `/lo-trinh` (cac-trang.ts) */
  loTrinh: 'Cả roadmap dạng danh sách cây, lọc theo trạng thái, loại, phần, lĩnh vực.',
  /** `/on-tap` (cac-trang.ts) */
  onTap: 'Thẻ đến hạn hôm nay, các hộp Leitner, tỉ lệ nhớ 30 ngày và danh sách Cần ôn lại.',
  /** `/on-tap/phien` (cac-trang.ts) */
  phienOn: 'Ôn từng flashcard đến hạn: lật thẻ rồi tự chấm Quên hoặc Nhớ.',
  /** `/linh-vuc/:slug` (src/pages/TrangLinhVuc.tsx) */
  linhVuc:
    'Tiến độ của lĩnh vực, các nhóm và mục học dạng cây, kệ tài liệu và chuyển sang lĩnh vực kề.',
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

/** Tên vùng cuộn ngang của bảng Markdown trong bài (src/components/bai-hoc/Markdown.tsx); C17 dùng câu F15. */
export const nhanBangCuon = (tenKhoi: string) => `Bảng trong khối ${tenKhoi}, cuộn ngang`

/** Chữ ẩn sau link ngoài trong bài (Markdown.tsx), cùng cụm với NHAN_LINK_ROADMAP_SH. */
export const MO_TAB_MOI = '(mở tab mới)'

/**
 * Nút ở đầu bài thay "Xem trên bản đồ" (bản đồ đã bỏ — đề xuất mục 10): mở Lộ trình dạng danh sách tới đúng mục
 * (src/pages/bai-hoc/DauBai.tsx).
 */
export const XEM_TRONG_DANH_SACH = 'Xem trong danh sách'

/**
 * Nút thay "Mở trong trình soạn" (trình soạn trong app đã bỏ — đề xuất mục 10) ở banner lỗi đọc file của trang bài
 * (src/pages/bai-hoc/BannerBai.tsx) và dòng ✕ Lỗi frontmatter của tab Nhập (src/components/nhap/BangKetQua.tsx):
 * sao chép tên file + dòng lỗi để sửa file ở trình soạn bạn quen dùng.
 */
export const SAO_CHEP_DONG_LOI = 'Sao chép dòng lỗi'

/** Chữ được sao chép, vd. "vuca.md · Dòng 3: thiếu dấu ":" sau loai" (`dongLoi` = voiDong của shared/noi-dung). */
export const chuDongLoi = (tenFile: string, dongLoi: string) => `${tenFile} · ${dongLoi}`

/** Toast sau khi sao chép dòng lỗi (src/components/NutSaoChepDongLoi.tsx). */
export const DA_SAO_CHEP_DONG_LOI = 'Đã sao chép dòng lỗi.'

/** Toast lỗi khi trình duyệt không cho ghi clipboard (NutSaoChepDongLoi.tsx). */
export const KHONG_SAO_CHEP_DUOC_DONG_LOI =
  'Không sao chép tự động được — hãy chọn dòng lỗi rồi nhấn ⌘C hoặc Ctrl+C.'

/** Chữ ẩn đọc thay dấu ★ ở khung bài (src/components/bai-hoc/KhungBaiTrong.tsx). */
export const BAT_BUOC = 'bắt buộc'

// ---------- Phase 2a — "Không áp dụng" của bước Áp dụng (mọi mẫu từ phase 3; đề xuất 3.2) ----------
// Nhãn "Không áp dụng" là chữ của §1 / 3.2; trạng thái đã đánh dấu "Không áp dụng" + `Lý do: "…"` theo C20 ở
// F02b; "Huỷ" theo F19; toast lỗi / Thử lại / Hoàn tác nguyên văn 3.1 — các chữ đó nằm tại chỗ.

/** Nút phụ khi bước Áp dụng đã đánh dấu Không áp dụng (src/components/bai-hoc/TheThucHanh.tsx). */
export const BO_DANH_DAU = 'Bỏ đánh dấu'

/** Tiêu đề dialog C32 ghi lý do (src/components/bai-hoc/HopThoaiKhongApDung.tsx). */
export const TIEU_DE_KHONG_AP_DUNG = 'Đánh dấu Không áp dụng'

/** Đoạn mô tả của dialog cho Chứng chỉ (HopThoaiKhongApDung.tsx); Chủ đề, Tài liệu: MO_TA_KHONG_AP_DUNG_THEO_MAU. */
export const MO_TA_KHONG_AP_DUNG =
  'Bước Áp dụng của chứng chỉ này được tính là xong mà không cần kế hoạch thi. Bỏ đánh dấu được bất cứ lúc nào.'

/** Nhãn ô C36 lý do (HopThoaiKhongApDung.tsx, HopThoaiBoQua.tsx); F02b ghi "Lý do: …" ở trạng thái đã đánh dấu. */
export const NHAN_LY_DO = 'Lý do'

/** Gợi ý dưới ô lý do (HopThoaiKhongApDung.tsx); `toiDa` = LY_DO_AP_DUNG_TOI_DA của server/du-lieu/ap-dung.ts. */
export const goiYLyDo = (toiDa: number) => `Bắt buộc · tối đa ${toiDa} ký tự`

/** Câu lỗi C36 khi bấm Lưu / Enter mà ô lý do trống (HopThoaiKhongApDung.tsx). */
export const LOI_THIEU_LY_DO = 'Ghi lý do để đánh dấu Không áp dụng.'

/** Nút chính của dialog lý do (HopThoaiKhongApDung.tsx, HopThoaiBoQua.tsx). */
export const NUT_LUU = 'Lưu'

/** Toast sau khi đánh dấu, trước tên mục (src/app/du-lieu/hoc.ts): "Đã đánh dấu Không áp dụng: <tên>". */
export const DA_DANH_DAU_KHONG_AP_DUNG = 'Đã đánh dấu Không áp dụng:'

/** Toast sau khi bỏ đánh dấu, trước tên mục (src/app/du-lieu/hoc.ts). */
export const DA_BO_DANH_DAU_KHONG_AP_DUNG = 'Đã bỏ đánh dấu Không áp dụng:'

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

// ---------- Phase 3 — lớp dữ liệu học (src/app/du-lieu/the.ts) ----------
// Toast lỗi / Thử lại / Hoàn tác nguyên văn 3.1; "Đã đánh dấu / Đã bỏ đánh dấu Không áp dụng:" dùng lại câu 2a ở
// trên cho Thực hành mọi mẫu (src/app/du-lieu/hoc.ts). Đồng hồ học đã bỏ khỏi phạm vi (đề xuất mục 10): không còn
// câu nào của đồng hồ.

/** Toast sau khi xoá một flashcard (kèm Hoàn tác; src/app/du-lieu/the.ts). */
export const DA_XOA_THE = 'Đã xoá thẻ'

// ---------- Phase 3 (bước 1) — câu của designer sửa theo phạm vi rút gọn (bỏ đồng hồ) ----------

/** F17: câu thứ hai của card "Mục này chưa có nội dung." (src/pages/bai-hoc/ChuaCoNoiDung.tsx); frame: "…, bấm giờ và…". */
export const CHUA_CO_NOI_DUNG_VAN_HOC_DUOC = 'Bạn vẫn đổi trạng thái và ghi chú được.'

/** F26: câu sau lỗi đọc file của banner trang bài (src/pages/bai-hoc/BannerBai.tsx); frame: "…, đồng hồ và ghi chú.". */
export const LOI_DOC_FILE_VAN_HIEN = 'Bài vẫn hiện trạng thái học và ghi chú.'

// ---------- Phase 3 — vòng 4 bước trên trang bài (src/components/bai-hoc, src/pages/bai-hoc) ----------
// Chữ nguyên văn F11 / F19 / F02b / §1 / đề xuất 1.5, 3.2 ("1–3 câu. Viết xong thì bước Hiểu được đánh dấu.",
// "Kết quả của bạn", "Không áp dụng (ghi lý do)", "Kết quả đã lưu · sửa được", "Câu trả lời của bạn", "Viết câu
// trả lời để mở đáp án.", "Tự chấm sau khi xem đáp án:", "Đáp án:", "Câu trả lời cho câu hỏi cũ (n)", "Quay lại học
// tiếp", "Vẫn đánh dấu Đã xong"…) nằm tại chỗ; dưới đây là câu tự đặt.

/** Dòng lỗi trong khối học khi GET /api/hoc/:id hỏng (src/components/bai-hoc/DongLoiHoc.tsx), như LOI_DOC_TRANG_THAI. */
export const LOI_DOC_DU_LIEU_HOC = 'Lỗi: không đọc được dữ liệu học'

/** Lựa chọn trống của ô Dự án (src/components/bai-hoc/TheThucHanh.tsx). */
export const CHUA_CHON_DU_AN = 'Chưa chọn dự án'

/** Nút cạnh ô Dự án và tiêu đề dialog C32 thêm dự án (TheThucHanh.tsx, HopThoaiThemDuAn.tsx; đề xuất 4.3). */
export const THEM_DU_AN = 'Thêm dự án'

/** Dialog thêm dự án (src/components/bai-hoc/HopThoaiThemDuAn.tsx). */
export const DU_AN = {
  moTa: 'Dự án thật bạn đang làm, để gắn với các bài thực hành.',
  ten: 'Tên dự án',
  vaiTro: 'Vai trò của bạn',
  giaiDoan: 'Giai đoạn',
  tuyChon: 'Tuỳ chọn',
  thieuTen: 'Ghi tên dự án.',
} as const

/** Dòng lỗi dưới ô Dự án khi GET /api/du-an hỏng (TheThucHanh.tsx). */
export const LOI_DOC_DU_AN = 'Lỗi: không đọc được danh sách dự án'

/** Cạnh nút "Xong" đang tắt vì ô Kết quả trống (TheThucHanh.tsx; đề xuất 3.2), cùng kiểu câu F11 "Viết câu trả lời để mở đáp án." */
export const XONG_CAN_KET_QUA = 'Ghi kết quả của bạn để bật Xong.'

/** Nút thay "Xong" khi bài thực hành đã Xong (TheThucHanh.tsx); C20 F02b chỉ vẽ "Kết quả đã lưu · sửa được". */
export const BO_DANH_DAU_XONG = 'Bỏ đánh dấu Xong'

/**
 * Ô nét đứt thay đề bài khi bài Chủ đề thiếu khối "Thực hành trên dự án thật" hoặc chưa có file (TheThucHanh.tsx,
 * KhoiApp.tsx): phần làm bài của bước Áp dụng vẫn có.
 */
export const THUC_HANH_CHUA_CO_DE_BAI =
  'Chưa có đề bài thực hành — bạn vẫn ghi kết quả đã làm hoặc đánh dấu Không áp dụng.'

/**
 * Đoạn mô tả của dialog Không áp dụng theo mẫu bài (src/components/bai-hoc/HopThoaiKhongApDung.tsx); Chứng chỉ
 * dùng MO_TA_KHONG_AP_DUNG của phase 2a.
 */
export const MO_TA_KHONG_AP_DUNG_THEO_MAU = {
  'chu-de':
    'Bước Áp dụng của mục này được tính là xong mà không cần bài thực hành. Bỏ đánh dấu được bất cứ lúc nào.',
  'tai-lieu':
    'Bước Áp dụng của tài liệu này được tính là xong mà không cần bản của bạn. Bỏ đánh dấu được bất cứ lúc nào.',
} as const

/**
 * Thẻ Thực hành (C20) ở vị trí bước Áp dụng của Tài liệu (khối "Bản của tôi") và Chứng chỉ (khối "Kế hoạch thi của
 * tôi"): app không lưu bản tài liệu / kế hoạch thi (đề xuất mục 10), bạn làm ở ngoài rồi ghi kết quả như bài thực hành
 * Chủ đề. `deBai` hiện dưới "Đề bài", `goiYKetQua` là placeholder ô "Kết quả của bạn" (src/pages/bai-hoc/KhoiApp.tsx,
 * TheThucHanh.tsx).
 */
export const AP_DUNG_THEO_MAU = {
  'tai-lieu': {
    deBai: 'Làm tài liệu này cho dự án thật của bạn, bằng công cụ bạn quen dùng.',
    goiYKetQua: 'Ghi tài liệu để ở đâu (link, thư mục) và bạn rút ra được gì.',
  },
  'chung-chi': {
    deBai:
      'Lên kế hoạch ôn và thi chứng chỉ này: ngày thi dự kiến, tài liệu ôn, lịch học mỗi tuần.',
    goiYKetQua: 'Ghi kế hoạch ôn thi của bạn, hoặc dán link tới nơi bạn lưu kế hoạch.',
  },
} as const

/**
 * Mô tả dưới tiêu đề thu gọn "Câu trả lời cho câu hỏi cũ (n)" (src/components/bai-hoc/CauTuKiemTra.tsx): câu đổi chữ
 * ít đã được server nối lại sang câu mới; còn ở đây là câu không nối được.
 */
export const CAU_TRA_LOI_CU_MO_TA =
  'Câu hỏi đã đổi hoặc không còn trong bài; câu trả lời của bạn vẫn được giữ.'

/** Dòng lần tự chấm của một câu trả lời cũ (CauTuKiemTra.tsx); `muc` là "Đúng" / "Một phần" / "Sai". */
export const lanTuChamCuoi = (muc: string) => `Lần tự chấm cuối: ${muc}`

/** Lý do Bỏ qua dưới segmented (src/components/bai-hoc/HopThoaiBoQua.tsx; §1, đề xuất 3.1, F02 "Bỏ qua kèm lý do (tuỳ chọn)"). */
export const LY_DO_BO_QUA = {
  chuaCo: 'Chưa ghi lý do bỏ qua.',
  ghi: 'Ghi lý do (tuỳ chọn)',
  sua: 'Sửa lý do',
  tieuDe: 'Lý do bỏ qua',
  moTa: 'Tuỳ chọn. Mục Bỏ qua không tính vào tiến độ; lý do giúp bạn nhớ vì sao đã bỏ qua.',
  daDung: 'Lý do đã dùng',
} as const

/**
 * Toast khi mục đang Bỏ qua chỉ đổi lý do (kèm Hoàn tác), trước tên mục (src/app/du-lieu/trang-thai.tsx); đổi trạng
 * thái thì vẫn là "Đã chuyển … sang …" (3.1).
 */
export const DA_LUU_LY_DO_BO_QUA = 'Đã lưu lý do bỏ qua:'

/** Gợi ý dưới ô lý do Bỏ qua (HopThoaiBoQua.tsx); `toiDa` = LY_DO_TOI_DA của hop-dong-trang-thai.ts. */
export const goiYLyDoTuyChon = (toiDa: number) => `Tuỳ chọn · tối đa ${toiDa} ký tự`

// ---------- Phase 3 (bước 1) — cột phải trang bài: mục lục, ghi chú, flashcard (src/pages/bai-hoc/cot-phai,
// src/components/bai-hoc/MucLuc.tsx, src/components/ghi-chu, src/components/the) ----------
// Chữ của frame (F11, F15, F02b C22) nằm tại chỗ: "Mục lục", "Trong lĩnh vực", "Điều hướng trong bài", "Công cụ của
// bài", "Ghi chú riêng cho mục này", "Flashcard · n thẻ", "Hộp n · ôn lại dd/MM/yyyy", "Chưa có thẻ cho mục này.
// Bước Ghi nhớ cần ít nhất 1 thẻ.", "Tạo thẻ", "Mặt trước", "Mặt sau".

/** Tab Mục lục khi bài không có khối nào hiện (chưa có nội dung, lỗi đọc file; D15; MucLuc.tsx). */
export const MUC_LUC_TRONG = 'Bài chưa có khối nào nên chưa có mục lục.'

/** Card Ghi chú không tải được dữ liệu học của mục (kèm "Thử lại"; src/components/ghi-chu/TheGhiChu.tsx). */
export const LOI_DOC_GHI_CHU = 'Lỗi: không đọc được ghi chú'

/** Card Flashcard không tải được thẻ của mục (kèm "Thử lại"; src/components/the/TheFlashcard.tsx). */
export const LOI_DOC_THE = 'Lỗi: không đọc được flashcard'

/** Nút bút chì trên mỗi thẻ (tên truy cập, mô tả = mặt trước) và tiêu đề hộp thoại sửa (HopThoaiThe.tsx). */
export const SUA_THE = 'Sửa thẻ'

/** Nút thùng rác trên mỗi thẻ và nút xác nhận (nguy hiểm) của alertdialog xoá (TheFlashcard.tsx). */
export const NUT_XOA_THE = 'Xoá thẻ'

/** Tiêu đề alertdialog xoá thẻ; dòng phụ là mặt trước của thẻ (TheFlashcard.tsx). */
export const TIEU_DE_XOA_THE = 'Xoá thẻ này?'

/** Mô tả alertdialog xoá thẻ (TheFlashcard.tsx). */
export const MO_TA_XOA_THE = 'Sau khi xoá, bạn có 5 giây để bấm Hoàn tác.'

/** Lỗi ô "Mặt trước" / "Mặt sau" để trống khi lưu thẻ (HopThoaiThe.tsx). */
export const LOI_THIEU_MAT_TRUOC = 'Ghi mặt trước của thẻ.'
export const LOI_THIEU_MAT_SAU = 'Ghi mặt sau của thẻ.'

/** Toast sau khi tạo thẻ (từ card Flashcard hoặc "Tạo flashcard" của câu Tự kiểm tra; HopThoaiThe.tsx). */
export const DA_TAO_THE = 'Đã tạo thẻ'
