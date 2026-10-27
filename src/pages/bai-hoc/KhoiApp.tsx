// Khối do app tạo chứa việc của người học (đề xuất 1.5, 3.2; phạm vi rút gọn mục 10):
// - Nói lại bằng lời của bạn (bước Hiểu) → NoiLai: ô tự lưu.
// - Thực hành trên dự án thật (Chủ đề) khi bài thiếu khối / chưa có file → TheThucHanh chỉ có phần làm bài (bước Áp
//   dụng vẫn làm được, thanh 4 bước có neo).
// - Bản của tôi (Tài liệu) và Kế hoạch thi của tôi (Chứng chỉ): app không lưu bản tài liệu / kế hoạch thi, nên ở vị
//   trí này là CÙNG thẻ Thực hành C20 (tên khối theo mẫu): đề bài do app đặt (AP_DUNG_THEO_MAU), "Kết quả của bạn",
//   Xong / Không áp dụng (ghi lý do). Ghi qua PUT /api/hoc/:id/thuc-hanh như Chủ đề. Chứng chỉ không có ô Dự án.
// Không phải khối nội dung: trang bài (ThanBai) và trang chưa có nội dung (ChuaCoNoiDung, trong khung bài) vẽ CÙNG
// một khối, không bao giờ là ô nét đứt "Chưa có" — tài liệu, chứng chỉ nhờ đó xong được bước Áp dụng cả khi chưa có
// file bài.
import type { KhoiMau } from '../../../shared/noi-dung'
import type { MucHoc } from '../../../shared/roadmap'
import NoiLai from '../../components/bai-hoc/NoiLai'
import TheThucHanh from '../../components/bai-hoc/TheThucHanh'
import { AP_DUNG_THEO_MAU } from '../../copy/cho-duyet'

/**
 * Một khối chứa việc của người học mà bài không có (khối do app tạo; Thực hành khi bài thiếu khối / chưa có file →
 * chỉ phần làm bài); kiểu khác (Mục liên quan, P2) → null.
 */
export default function KhoiApp({ khoi, muc }: { khoi: KhoiMau; muc: MucHoc }) {
  switch (khoi.kieu) {
    case 'noi-lai':
      return <NoiLai id={khoi.id} tieuDe={khoi.tieuDe} muc={muc} />
    case 'thuc-hanh':
      return (
        <TheThucHanh
          id={khoi.id}
          tieuDe={khoi.tieuDe}
          muc={muc}
          mucCon={null}
          tieuChi={[]}
          chuaCoDeBai
        />
      )
    case 'ban-cua-toi':
    case 'ke-hoach-thi': {
      const mau = khoi.kieu === 'ban-cua-toi' ? 'tai-lieu' : 'chung-chi'
      return (
        <TheThucHanh
          id={khoi.id}
          tieuDe={khoi.tieuDe}
          muc={muc}
          mucCon={null}
          tieuChi={[]}
          deBai={AP_DUNG_THEO_MAU[mau].deBai}
          goiYKetQua={AP_DUNG_THEO_MAU[mau].goiYKetQua}
          coDuAn={mau === 'tai-lieu'}
        />
      )
    }
    default:
      return null
  }
}
