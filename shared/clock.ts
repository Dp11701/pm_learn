// Nguồn thời gian duy nhất của app (đề xuất 1.10). ESLint cấm Date.now() / new Date() ở nơi khác.
// - Server: lệch = 0, hoặc GIO_MAU − giờ thật lúc khởi động (bộ dữ liệu mẫu).
// - Web: lệch = `now` của /api/meta − giờ máy lúc nhận, đo lại mỗi 5 giây.

let lechMs = 0

/** Thời điểm hiện tại (ms kể từ epoch) đã cộng độ lệch. */
export function now(): number {
  return Date.now() + lechMs
}

/** Đặt độ lệch so với giờ máy (ms). */
export function datLech(ms: number): void {
  lechMs = ms
}

export function layLech(): number {
  return lechMs
}

/** Ngày lịch YYYY-MM-DD của một thời điểm, theo múi giờ của tiến trình. */
export function ngayCua(ms: number): string {
  const d = new Date(ms)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Hôm nay (YYYY-MM-DD) theo múi giờ của tiến trình. */
export function homNay(): string {
  return ngayCua(now())
}

/** Thời điểm hiện tại dạng ISO UTC để lưu DB. */
export function nowIso(): string {
  return new Date(now()).toISOString()
}
