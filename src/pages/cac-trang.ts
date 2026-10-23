// Các route tĩnh chưa làm tới (§6.1 routes P0 + P1, đề xuất 4.1, mục 9): tên trang, phase sẽ có, một câu
// trang sẽ làm gì. Phase làm trang thật thay route tương ứng trong src/app/router.tsx.

export interface TrangTinh {
  /** Đường dẫn tương đối trong khung app; '' = trang chủ (index). */
  duongDan: string
  tenTrang: string
  phase: string
  moTa: string
}

export const CAC_TRANG_TINH: readonly TrangTinh[] = [
  {
    duongDan: '',
    tenTrang: 'Tổng quan',
    phase: '5',
    moTa: 'Tiến độ cả roadmap, mục đang học, thẻ cần ôn hôm nay, giờ học và độ phủ nội dung.',
  },
  {
    duongDan: 'lo-trinh',
    tenTrang: 'Lộ trình',
    phase: '4',
    moTa: 'Cả roadmap dạng danh sách cây (phase 4) và bản đồ (phase 6), lọc theo trạng thái, loại, phần, lĩnh vực.',
  },
  {
    duongDan: 'noi-dung',
    tenTrang: 'Nội dung',
    phase: '2b',
    moTa: 'Nhập file .md (phase 2b); tab Độ phủ và Chờ duyệt có ở phase 7a.',
  },
  {
    duongDan: 'on-tap',
    tenTrang: 'Ôn tập',
    phase: '8',
    moTa: 'Thẻ đến hạn hôm nay, các hộp Leitner, tỉ lệ nhớ 30 ngày và danh sách Cần ôn lại.',
  },
  {
    duongDan: 'on-tap/phien',
    tenTrang: 'Phiên ôn',
    phase: '8',
    moTa: 'Ôn từng flashcard đến hạn: lật thẻ rồi tự chấm Quên hoặc Nhớ.',
  },
  {
    duongDan: 'lo-trinh-goi-y',
    tenTrang: 'Lộ trình gợi ý',
    phase: '12',
    moTa: 'Thứ tự học đề xuất theo chặng, chỉ có hiệu lực sau khi bạn duyệt; tới lúc đó Trước/Tiếp vẫn theo thứ tự cây.',
  },
  {
    duongDan: 'thong-ke',
    tenTrang: 'Thống kê',
    phase: '11',
    moTa: 'Giờ học, đường burnup kèm dự báo ngày xong, heatmap theo tuần; biểu đồ nào cũng có dạng bảng.',
  },
  {
    duongDan: 'ho-so',
    tenTrang: 'Bộ hồ sơ dự án',
    phase: '11',
    moTa: 'Các tài liệu của dự án thực hành, nhóm theo lĩnh vực: Chưa tạo, Đang viết hay Hoàn thành.',
  },
  {
    duongDan: 'chung-chi',
    tenTrang: 'Chứng chỉ',
    phase: '11',
    moTa: 'Các chứng chỉ trong roadmap, mức theo đuổi và kế hoạch thi của từng chứng chỉ.',
  },
  {
    duongDan: 'chao-mung',
    tenTrang: 'Thiết lập lần đầu',
    phase: '12',
    moTa: 'Thư mục nội dung, dự án thực hành, mục tiêu giờ học mỗi tuần và tự đánh giá đầu vào.',
  },
  {
    duongDan: 'thuat-ngu',
    tenTrang: 'Thuật ngữ',
    phase: '12',
    moTa: 'Giải nghĩa của các mục đã có nội dung và bảng viết tắt có trong cây.',
  },
  {
    duongDan: 'ghi-chu',
    tenTrang: 'Ghi chú',
    phase: '10',
    moTa: 'Mọi ghi chú theo mục, tìm và lọc theo phần, lĩnh vực.',
  },
  {
    duongDan: 'cai-dat',
    tenTrang: 'Cài đặt',
    phase: '10',
    moTa: 'Giao diện, quy tắc Cần ôn lại, thư mục nội dung, mục tiêu giờ, xuất/nhập tiến độ JSON, sao lưu và đặt lại.',
  },
]
