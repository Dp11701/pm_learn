// Câu chữ bước 2 (Lộ trình dạng danh sách, trang Lĩnh vực, Tổng quan gọn) tự đặt, chưa có nguyên văn trong đặc tả
// (docs/prompt-design.md), frame hay đề xuất. Gom ở đây để bạn duyệt và sửa một chỗ (cùng cách với cho-duyet.ts).
// Chữ lấy nguyên văn từ đặc tả / đề xuất ("Xoá bộ lọc", "Đang hiển thị x/199 mục", "Đặt trạng thái…", "Hoàn tác",
// "Tiếp tục học", "Học tiếp trong lĩnh vực", câu F05 "Roadmap có … Bắt đầu từ đâu?") vẫn nằm tại chỗ.
import { dinhDangSo } from '../../shared/dinh-dang'

const so = (n: number) => dinhDangSo(n)

// ---------- Đặt trạng thái hàng loạt (src/app/du-lieu/trang-thai.tsx, src/components/danh-sach) ----------

/** Toast sau khi đặt hàng loạt, vd. "Đã chuyển 5 mục sang Đang học" (kèm "Hoàn tác"). */
export const daChuyenHangLoat = (n: number, tenTrangThai: string) =>
  `Đã chuyển ${so(n)} mục sang ${tenTrangThai}`

/** Toast khi mọi mục đã chọn đã ở trạng thái đó (không ghi gì). */
export const khongMucNaoDoi = (tenTrangThai: string) =>
  `Các mục đã chọn đều đang ở ${tenTrangThai}.`

/** Toast sau khi Hoàn tác một lần đặt hàng loạt; `giuNguyen` = số mục đã đổi sau đó nên không trả về. */
export function daHoanTacHangLoat(n: number, giuNguyen: number): string {
  const dau = `Đã hoàn tác ${so(n)} mục`
  return giuNguyen > 0 ? `${dau} · ${so(giuNguyen)} mục đã đổi sau đó nên giữ nguyên` : dau
}

/** Thanh hàng loạt: số mục đang chọn. */
export const daChon = (n: number) => `Đã chọn ${so(n)} mục`

/** Ô chọn tất cả của thanh hàng loạt (chỉ các mục đang hiển thị). */
export const CHON_TAT_CA = 'Chọn tất cả mục đang hiển thị'

/** Nút bỏ chọn của thanh hàng loạt. */
export const BO_CHON = 'Bỏ chọn'

/** Dòng hướng dẫn chọn bằng bàn phím cạnh thanh hàng loạt. */
export const HUONG_DAN_CHON =
  'Chọn bằng ô vuông hoặc phím Space trên một mục; ↑ ↓ để đi giữa các mục.'

/** Tên ô chọn của một hàng, vd. "Chọn Scope Creep" (tên mục gắn lang="en" ở nơi dùng). */
export const CHON_MUC = 'Chọn'

/** Mô tả (aria-describedby) của link một hàng đang được chọn, đọc khi focus vào hàng. */
export const DA_CHON_MUC = 'Đã chọn'

/** Tên menu "Đặt trạng thái…" khi đang lưu (cho trình đọc màn hình). */
export const DANG_LUU_HANG_LOAT = 'Đang lưu…'

// ---------- Lộ trình — bộ lọc (src/pages/lo-trinh) ----------

/** Tên vùng các nhóm chip lọc + ô sắp xếp (cho trình đọc màn hình). */
export const BO_LOC = 'Bộ lọc'

/** Tên các nhóm chip lọc. */
export const TEN_NHOM_LOC = {
  trangThai: 'Trạng thái',
  loai: 'Loại',
  noiDung: 'Nội dung',
  phan: 'Phần',
  linhVuc: 'Lĩnh vực',
} as const

/** Chip lọc theo trạng thái nội dung (ngắn hơn chip C8 của hàng). */
export const TEN_LOC_NOI_DUNG = {
  'chua-co': 'Chưa có',
  'ban-nhap': 'Bản nháp',
  'da-duyet': 'Đã duyệt',
} as const

/** Ô chọn cách sắp xếp và 3 lựa chọn. */
export const SAP_XEP = 'Sắp xếp'
export const TEN_SAP_XEP = {
  cay: 'Theo thứ tự cây',
  'a-z': 'A–Z',
  'mo-gan-day': 'Mở gần đây',
} as const

/** Không mục nào khớp bộ lọc. */
export const KHONG_MUC_NAO_KHOP = 'Không có mục nào khớp bộ lọc.'

/** Mục của ?muc= đang bị bộ lọc ẩn (tên mục đứng trước, gắn lang="en" ở nơi dùng). */
export const MUC_BI_AN = 'không khớp bộ lọc đang chọn nên đang bị ẩn.'

/** Tên vùng danh sách cây / danh sách phẳng. */
export const TEN_DANH_SACH = 'Các mục học'

/** Không tải được trạng thái học (thay bảng danh sách). */
export const KHONG_TAI_DUOC_TRANG_THAI = 'Không tải được trạng thái học.'

/**
 * Không tải được trạng thái nội dung (thay bảng danh sách khi đang lọc theo Nội dung; thay card "Nội dung bài học"
 * của Tổng quan). Kèm "Thử lại".
 */
export const KHONG_TAI_DUOC_NOI_DUNG = 'Không tải được trạng thái nội dung.'

// ---------- Trang Lĩnh vực (src/pages/TrangLinhVuc.tsx) ----------

/** Dòng dưới H1, vd. "Phần Project Management · 16 mục · 13 chủ đề · 3 tài liệu · 2 nhóm" (§8.4; tên phần lang=en). */
export const PHAN_CUA = 'Phần'

/** Link về Lộ trình lọc theo lĩnh vực này. */
export const XEM_TRONG_LO_TRINH = 'Xem trong Lộ trình'

/** Khi mọi mục của lĩnh vực đã Đã xong hoặc Bỏ qua (không còn mục để học tiếp). */
export const HET_MUC_TRONG_LINH_VUC = 'Đã học hết các mục của lĩnh vực này.'

/** Tên vùng pager lĩnh vực + nhãn hai hướng. */
export const PAGER_LINH_VUC = 'Lĩnh vực trước và tiếp'
export const LINH_VUC_TRUOC = 'Lĩnh vực trước'
export const LINH_VUC_TIEP = 'Lĩnh vực tiếp'

/** Tiêu đề khối các mục đứng trực tiếp trong lĩnh vực (không thuộc nhóm nào), khi lĩnh vực có nhóm. */
export const MUC_KHAC = 'Mục khác'

// ---------- Tổng quan (src/pages/tong-quan) ----------

/** Nút của banner lần đầu (F05) → bài của mục đầu tiên trong cây. */
export const BAT_DAU_MUC_DAU = 'Bắt đầu với mục đầu tiên'

/**
 * Câu banner lần đầu (F05) khi không tải được trạng thái nội dung: câu F05 bỏ vế "hiện x/n mục có nội dung", vd.
 * "Roadmap có 199 mục. Bắt đầu từ đâu?".
 */
export const lanDauKhongSoNoiDung = (soMuc: number) =>
  `Roadmap có ${so(soMuc)} mục. Bắt đầu từ đâu?`

/** Card Tiếp tục học khi không còn mục Đang học / Chưa học. */
export const KHONG_CON_MUC_HOC_TIEP = 'Không còn mục Đang học hay Chưa học.'

/** Card thẻ ôn: "Thẻ cần ôn hôm nay: n" và nút. */
export const THE_CAN_ON_HOM_NAY = 'Thẻ cần ôn hôm nay'
export const BAT_DAU_ON = 'Bắt đầu ôn'
export const KHONG_CO_THE_DEN_HAN = 'Hôm nay không có thẻ đến hạn.'
export const XEM_ON_TAP = 'Xem Ôn tập'
/** Card thẻ ôn khi không tải được dữ liệu Ôn tập (kèm "Thử lại"). */
export const KHONG_TAI_DUOC_THE_ON = 'Không tải được số thẻ cần ôn.'

/** Card độ phủ nội dung: tiêu đề + link sang /noi-dung. */
export const DO_PHU_NOI_DUNG = 'Nội dung bài học'
export const XEM_NOI_DUNG = 'Xem Nội dung'

/** Dòng độ phủ, vd. "Đã duyệt 41 · Bản nháp 9 · Chưa có 149". */
export const dongDoPhu = (daDuyet: number, banNhap: number, chuaCo: number) =>
  `Đã duyệt ${so(daDuyet)} · Bản nháp ${so(banNhap)} · Chưa có ${so(chuaCo)}`

/** Tiêu đề card tiến độ cả roadmap và khối theo phần. */
export const TIEN_DO = 'Tiến độ'
export const THEO_PHAN = 'Theo phần'
