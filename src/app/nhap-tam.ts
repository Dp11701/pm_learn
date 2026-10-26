// Chữ đang gõ giữ tạm trong sessionStorage (đề xuất 5 "Không trắng màn hình"; banner mất kết nối F26 hứa
// "Nội dung đang gõ được giữ nguyên."). Phase 1 chưa có ô nhập nào ghi lên máy chủ; từ phase 2a, MỌI ô nhập
// ghi lên máy chủ (Nói lại, ghi chú, câu trả lời, bản tạm trình soạn…) phải dùng bộ hàm này:
//   - mỗi lần gõ: luuNhapTam(khoa, chu) — khoá riêng từng ô, vd. `ghi-chu:<id mục>`;
//   - khi dựng ô: docNhapTam(khoa) ?? giá trị từ máy chủ (có bản tạm thì bản tạm mới hơn);
//   - máy chủ lưu xong: xoaNhapTam(khoa).
// sessionStorage có thể không có hoặc bị chặn (chế độ riêng tư, hết dung lượng): mọi hàm nuốt lỗi, không bao
// giờ làm hỏng ô nhập.

const TIEN_TO = 'hoc-pm-a-z:nhap-tam:'

function kho(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/** Giữ chữ đang gõ của ô `khoa`; trả false khi không giữ được. */
export function luuNhapTam(khoa: string, chu: string): boolean {
  try {
    const k = kho()
    if (!k) return false
    k.setItem(TIEN_TO + khoa, chu)
    return true
  } catch {
    return false
  }
}

/** Chữ đã giữ của ô `khoa`; không có (hoặc không đọc được) thì null. */
export function docNhapTam(khoa: string): string | null {
  try {
    return kho()?.getItem(TIEN_TO + khoa) ?? null
  } catch {
    return null
  }
}

/** Bỏ chữ đã giữ (sau khi máy chủ lưu xong). */
export function xoaNhapTam(khoa: string): void {
  try {
    kho()?.removeItem(TIEN_TO + khoa)
  } catch {
    // Không xoá được thì thôi: lần dựng sau vẫn so với giá trị máy chủ.
  }
}
