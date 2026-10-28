// Lớp dùng chung của danh sách.

/**
 * Nút "tắt" bằng aria-disabled (không dùng `disabled`): nút tự tắt ngay sau khi bấm (Xoá bộ lọc, Đặt trạng thái…
 * khi vừa bỏ chọn) thì focus vẫn ở nút, không rơi về <body>. Nơi dùng tự bỏ qua lần bấm khi đang tắt.
 */
export const LOP_TAT_ARIA =
  'aria-disabled:cursor-not-allowed aria-disabled:border aria-disabled:border-border aria-disabled:bg-surface-2 aria-disabled:text-muted'
