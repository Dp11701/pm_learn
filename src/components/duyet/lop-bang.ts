// Lớp CSS của các bảng ở trang Nội dung (tab Chờ duyệt, Độ phủ — chỉ máy tính ≥ 1024): khung viền bo góc, hàng
// tiêu đề nền surface-2, ô viền trên — cùng nhịp với bảng kết quả tab Nhập (src/components/nhap/BangKetQua.tsx).

/** Khung bọc bảng. */
export const LOP_KHUNG_BANG =
  'overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface'

/** Thẻ <table>. */
export const LOP_BANG =
  'w-full border-separate border-spacing-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)]'

// Không gộp lớp canh chữ / đệm trái vào hằng chung: hai lớp cùng thuộc tính trên một phần tử thì thứ tự trong CSS
// quyết, không phải thứ tự trong className — nơi dùng tự thêm text-left / text-right, đệm riêng.

/** Ô tiêu đề cột (thêm text-left / text-right). */
export const LOP_TH = 'h-10 bg-surface-2 px-3 font-semibold whitespace-nowrap first:pl-4 last:pr-4'

/** Viền, đệm dọc của ô thân bảng (cả th scope=row), chưa có đệm ngang. */
export const LOP_O_KHUNG = 'border-t border-border py-2 align-middle'

/** Ô thân bảng có đệm ngang thường (thêm text-left / text-right). */
export const LOP_O = `${LOP_O_KHUNG} px-3 first:pl-4 last:pr-4`

/** Ô số: canh phải, chữ số đều. */
export const LOP_SO = 'text-right tabular-nums'

/** Tiêu đề khối (H2) trong tab. */
export const LOP_H2 = 'm-0 text-[17px] leading-7 font-semibold'

/** Dòng phụ dưới tiêu đề. */
export const LOP_PHU = 'm-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted'
