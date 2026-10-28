// Các route tĩnh chưa làm tới (§6.1 routes P0, đề xuất 4.1, mục 9): tên trang, phase sẽ có, một câu trang sẽ làm gì.
// Phase làm trang thật thay route tương ứng trong src/app/router.tsx. Trang P1 (Lộ trình gợi ý, Thống kê, Bộ hồ sơ,
// Chứng chỉ, Thiết lập lần đầu, Thuật ngữ, Ghi chú, Cài đặt) đã bỏ khỏi phạm vi (đề xuất mục 10): không còn route.
// Từ bước 2 (27–28/10/2026) không còn route nào chờ: Tổng quan, Lộ trình, Lĩnh vực, Ôn tập, Nội dung đều là trang thật.

export interface TrangTinh {
  /** Đường dẫn tương đối trong khung app; '' = trang chủ (index). */
  duongDan: string
  tenTrang: string
  phase: string
  moTa: string
}

export const CAC_TRANG_TINH: readonly TrangTinh[] = []
