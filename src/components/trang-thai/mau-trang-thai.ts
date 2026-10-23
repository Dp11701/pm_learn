// Lớp Tailwind theo trạng thái học (§5.1). Viết đủ chuỗi để Tailwind quét được, không ghép động.
import type { TrangThaiHoc } from '../../../shared/domain/trang-thai'

/** Trạng thái học + cờ Cần ôn lại (cờ suy ra, không phải trạng thái thứ 5 — chỉ để vẽ pill). */
export type TrangThaiHien = TrangThaiHoc | 'can-on-lai'

/** Nền + chữ pill (C5, đoạn đang chọn C6). */
export const LOP_PILL: Record<TrangThaiHien, string> = {
  'chua-hoc': 'bg-[var(--st-none-bg)] text-[var(--st-none-fg)]',
  'dang-hoc': 'bg-[var(--st-learning-bg)] text-[var(--st-learning-fg)]',
  'da-xong': 'bg-[var(--st-done-bg)] text-[var(--st-done-fg)]',
  'bo-qua': 'bg-[var(--st-skip-bg)] text-[var(--st-skip-fg)]',
  'can-on-lai': 'bg-[var(--st-review-bg)] text-[var(--st-review-fg)]',
}

/** Viền 1,5px trong của đoạn đang chọn (C6, quyết định 2). */
export const LOP_VIEN_CHON: Record<TrangThaiHoc, string> = {
  'chua-hoc': 'shadow-[inset_0_0_0_1.5px_var(--st-none-vien)]',
  'dang-hoc': 'shadow-[inset_0_0_0_1.5px_var(--st-learning-vien)]',
  'da-xong': 'shadow-[inset_0_0_0_1.5px_var(--st-done-vien)]',
  'bo-qua': 'shadow-[inset_0_0_0_1.5px_var(--st-skip-vien)]',
}

/** Viền 1px khi hover pill bấm được (F02 C5 "Hover · viền 1px"). */
export const LOP_VIEN_HOVER: Record<TrangThaiHoc, string> = {
  'chua-hoc': 'hover:shadow-[inset_0_0_0_1px_var(--st-none-vien)]',
  'dang-hoc': 'hover:shadow-[inset_0_0_0_1px_var(--st-learning-vien)]',
  'da-xong': 'hover:shadow-[inset_0_0_0_1px_var(--st-done-vien)]',
  'bo-qua': 'hover:shadow-[inset_0_0_0_1px_var(--st-skip-vien)]',
}

/** Màu icon đứng riêng (hàng, danh sách, chú giải). */
export const LOP_ICON: Record<TrangThaiHien, string> = {
  'chua-hoc': 'text-[var(--st-none-ic)]',
  'dang-hoc': 'text-[var(--st-learning-ic)]',
  'da-xong': 'text-[var(--st-done-ic)]',
  'bo-qua': 'text-[var(--st-skip-ic)]',
  'can-on-lai': 'text-[var(--st-review-ic)]',
}

/** Chữ chip 12/18/600 (§5.2). */
export const LOP_CHU_CHIP = 'text-[length:var(--fs-chip)] leading-[var(--lh-chip)] font-semibold'
/** Chữ meta 13/20. */
export const LOP_CHU_META = 'text-[length:var(--fs-meta)] leading-[var(--lh-meta)]'

/** Mobile (< 768): chip/pill bấm được giữ cao 24 nhưng vùng chạm 44 — lớp ::before trong suốt phủ
 *  ra 10px trên dưới (phần tử cần `relative`). */
export const VUNG_CHAM =
  'max-md:before:absolute max-md:before:inset-x-0 max-md:before:-inset-y-2.5 max-md:before:content-[""]'
