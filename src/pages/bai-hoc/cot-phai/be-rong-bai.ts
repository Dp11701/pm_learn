// Bề rộng trang bài trên máy tính (đề xuất 4.4; phạm vi rút gọn 27/10/2026: chỉ ≥ 1024px):
// - ≥ 1600 (người dùng xin tận dụng màn rộng, 28/10/2026): cột đọc ≤ 960 + cột phải 360, cách 48;
// - 1440–1599: cột đọc ≤ 720 + cột phải 320 (dính khi cuộn), cách 48 (F11);
// - 1280–1439: cột đọc ≤ 640 + cột phải 280, cách 32 (1280 − sidebar 264 − lề 80 = 936 = 624 + 32 + 280);
// - 1024–1279: không có cột phải; đầu trang có "Mục lục" / "Ghi chú" mở panel trượt 360px (C32 dạng phải), card
//   Flashcard xuống cuối bài, giữ neo #flashcard.
// Cột phải có hay không quyết bằng JS (useBeRong, cùng mốc 1280 với sidebar) để mỗi phần (ô ghi chú, neo
// #flashcard) chỉ dựng ĐÚNG MỘT lần; cỡ cột trong từng khoảng thì CSS lo (xl = 1280, min-[1440px]).
import { useBeRong } from '../../../app/khung/be-rong'

/** Có cột phải (≥ 1280, cùng mốc sidebar 264). */
export function useCoCotPhai(): boolean {
  return useBeRong() === 'day-du'
}

/** Hàng chứa cột đọc + cột phải; khoảng cách giữa hai cột là lề trái của cột phải (LOP_COT_PHAI). */
export const LOP_HANG_BAI = 'flex min-w-0 items-start'

/**
 * Bề rộng tối đa của cột đọc: 720, riêng 1280–1439 là 640. Viết bằng khoảng (xl + max-[1440px]) vì Tailwind xếp
 * biến thể min-[1440px] TRƯỚC xl nên "xl:… min-[1440px]:…" để xl thắng cả ở ≥ 1440.
 */
export const LOP_RONG_COT_DOC =
  'max-w-[720px] xl:max-[1440px]:max-w-[640px] min-[1600px]:max-w-[960px]'

/**
 * Cột phải (F11): đúng 280 (1280–1439) / 320 (≥ 1440) — thanh cuộn của cột KHÔNG tính vào bề rộng này (xem
 * LOP_CUON_COT_PHAI) nên cột đọc không bị thanh cuộn kiểu cổ điển ăn bớt. Cách cột đọc 32 (1280–1439) / 48 (≥ 1440).
 * Ở ≥ 1440 khoảng cách co về tối thiểu 32 khi hàng hẹp hơn 720 + 48 + 320 (thanh cuộn cổ điển của cửa sổ lấy ~15px:
 * 1440 − 15 − sidebar 264 − lề 80 = 1081) để cột đọc vẫn đủ 720 (hồi quy review: còn 698 khi có thanh cuộn cổ điển).
 * `100%` của lề trái = bề rộng hàng (khối chứa của cột).
 */
export const LOP_COT_PHAI =
  'sticky top-6 ml-8 w-[280px] shrink-0 self-start min-[1440px]:ml-[clamp(32px,calc(100%_-_1040px),48px)] min-[1440px]:w-80 min-[1600px]:ml-12 min-[1600px]:w-[360px]'

/**
 * Vùng cuộn của cột phải: dính đầu trang, cuộn riêng khi cao hơn cửa sổ (F11 chỉ vẽ "dính khi cuộn"; cột cao hơn cửa
 * sổ thì cuộn riêng là lệch đã ghi Chờ duyệt). Vùng này rộng hơn cột 20px về bên phải (nằm trong lề trang 40) nên
 * thanh cuộn kiểu cổ điển (15–17px) đứng trong phần thêm đó: card giữ đủ 280 / 320 (hồi quy review: 309 / 269) mà
 * hàng không rộng thêm. Không dùng scrollbar-gutter.
 */
export const LOP_CUON_COT_PHAI =
  '-mr-5 max-h-[calc(100dvh-48px)] overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-width:thin]'

/** Ruột cột phải: đúng 280 (1280–1439) / 320 (≥ 1440) như F11, các card cách 24. */
export const LOP_RUOT_COT_PHAI =
  'flex w-[280px] flex-col gap-6 min-[1440px]:w-80 min-[1600px]:w-[360px]'

/** Card C15 của cột phải (F11: nền surface, viền, bo 10, padding 20). */
export const LOP_CARD_COT_PHAI =
  'flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-5'
