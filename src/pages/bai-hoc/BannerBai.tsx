// Banner C26 của trang bài (đề xuất 1.6, 3.6, 3.7; F26, F15; D30), mỗi lúc tối đa một banner:
// - lỗi đọc file (F26, biến thể lỗi D30): "<file>.md: lỗi frontmatter dòng N" + "Bài vẫn hiện trạng thái học và ghi
//   chú." (LOI_DOC_FILE_VAN_HIEN: câu F26 bỏ "đồng hồ" — phạm vi rút gọn) (kèm câu lỗi cụ thể) + "Sao chép dòng lỗi"
//   (đường dẫn file + dòng lỗi; thay "Mở trong trình soạn" của F26 — trình soạn trong app đã bỏ, đề xuất mục 10);
// - file ghi Đã duyệt nhưng app chưa có bản chụp: "File ghi Đã duyệt nhưng app chưa xác nhận" + "Quét lại";
// - bản Đã duyệt bị sửa / xoá ngoài app (đang hiện bản chụp): "File đã đổi ngoài app" + "Quét lại để kiểm tra";
// - bản nháp: "Bản nháp do AI soạn — chưa được bạn duyệt, có thể sai." / "Bản nháp do bạn tự viết — chưa
//   duyệt." ("Vào chế độ duyệt" có ở phase 7a).
// "Quét lại" mở tab Nhập và quét lại ngay (?quet=1, phase 2b).
import Banner from '../../components/Banner'
import { NutLink } from '../../components/Nut'
import NutSaoChepDongLoi from '../../components/NutSaoChepDongLoi'
import { DUONG_DAN_QUET_LAI } from '../../components/bai-hoc/dinh-vi'
import type { MucHoc } from '../../../shared/roadmap'
import { CAU_CANH_BAO_DUYET } from '../../../server/noi-dung/hop-dong-bai'
import { LOI_DOC_FILE_VAN_HIEN } from '../../copy/cho-duyet'
import type { DuLieuBai } from './du-lieu-bai'

/** Tên file bài, vd. "change-log.md" (F26). */
export function tenFile(muc: MucHoc): string {
  return muc.duongDanFile.split('/').at(-1) ?? `${muc.slug}.md`
}

/** Câu lỗi của bộ đọc (viết thường đầu câu) → viết hoa chữ đầu để đứng đầu dòng. */
function vietHoaDau(s: string): string {
  return s.charAt(0).toLocaleUpperCase('vi') + s.slice(1)
}

export default function BannerBai({ muc, duLieu }: { muc: MucHoc; duLieu: DuLieuBai }) {
  const { loiDoc, trangThaiNoiDung } = duLieu
  if (loiDoc) {
    return (
      <Banner
        loai="loi"
        tieuDe={
          <>
            <span className="font-mono">{tenFile(muc)}</span>: lỗi frontmatter dòng {loiDoc.dong}
          </>
        }
        moTa={
          <>
            {vietHoaDau(loiDoc.thongBao)}. {LOI_DOC_FILE_VAN_HIEN}
          </>
        }
        hanhDong={<NutSaoChepDongLoi tenFile={muc.duongDanFile} loi={loiDoc} />}
      />
    )
  }
  if (duLieu.canhBaoDuyet) {
    // Câu nguyên văn đề xuất 1.6 "<thông báo> — <hành động>": thông báo là tiêu đề, hành động là nút.
    const [tieuDe, hanhDong] = CAU_CANH_BAO_DUYET[duLieu.canhBaoDuyet].split(' — ')
    return (
      <Banner
        tieuDe={tieuDe}
        hanhDong={
          <NutLink to={DUONG_DAN_QUET_LAI} bien="phu">
            {hanhDong}
          </NutLink>
        }
      />
    )
  }
  if (trangThaiNoiDung.loai === 'ban-nhap') {
    return (
      <Banner
        tieuDe={
          trangThaiNoiDung.nguon === 'ai'
            ? 'Bản nháp do AI soạn — chưa được bạn duyệt, có thể sai.'
            : 'Bản nháp do bạn tự viết — chưa duyệt.'
        }
      />
    )
  }
  return null
}
