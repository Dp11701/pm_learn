// Banner bản sửa trên trang bài (bước 4; đề xuất 3.6, 3.7 rút gọn theo mục 10; §8.7 F12): bài Đã duyệt có
// <slug>.ban-sua.md đã nhận → "Có thay đổi chưa duyệt" (trang vẫn hiện bản Đã duyệt; không có "Mở bản sửa" vì đã
// bỏ chế độ duyệt) + hai nút, mỗi nút một dialog xác nhận:
// - "Duyệt bản sửa": "Duyệt bản sửa này?" — "Sẽ thành Đã duyệt · dd/MM/yyyy" (hôm nay của server), khối ★ còn thiếu
//   (vẫn cho duyệt), bản cũ vào thùng rác; gửi kèm hash bản sửa của GET /api/duyet/:id (file đổi ngoài app → 409);
// - "Bỏ bản sửa" (đỏ, focus đầu ở Huỷ): file bản sửa vào thùng rác, bản Đã duyệt giữ nguyên.
// Bản sửa lỗi frontmatter / quá lớn: không duyệt được (nút tắt, câu lỗi ở mô tả), vẫn bỏ được. File bản sửa không
// còn trên đĩa: chỉ "Bỏ bản sửa" (gỡ khỏi sổ). Xong → toast, banner biến mất khi bài tải lại, focus về H1.
import { useRef, useState } from 'react'
import { dinhDangNgay, dinhDangSo } from '../../../shared/dinh-dang'
import type { MucHoc } from '../../../shared/roadmap'
import { useChiTietDuyet, type ChiTietBanSua } from '../../app/du-lieu/duyet'
import {
  BAN_SUA_KHONG_CON,
  BO_BAN_SUA_TIEU_DE,
  DANG_TAI_BAN_SUA,
  DUYET_BAN_SUA_MO_TA,
  DUYET_BAN_SUA_TIEU_DE,
  KHONG_HOAN_TAC_DUYET,
  KHONG_TAI_BAN_SUA,
  banSuaLoi,
  boBanSuaMoTa,
  moTaBanSua,
} from '../../copy/cho-duyet-duyet'
import Banner from '../Banner'
import Nut from '../Nut'
import HopThoaiDuyet from './HopThoaiDuyet'
import { useHanhDongDuyet, type ViecDuyet } from './hanh-dong'
import { cauSeThanh, focusTieuDe } from './NutDuyetBai'

/** Tên file từ đường dẫn tương đối, vd. "scope-creep.ban-sua.md". */
function tenTep(duongDan: string): string {
  return duongDan.split('/').at(-1) ?? duongDan
}

/** Câu lỗi của bộ đọc (viết thường đầu câu) → viết hoa chữ đầu. */
function vietHoaDau(s: string): string {
  return s.charAt(0).toLocaleUpperCase('vi') + s.slice(1)
}

/** Mô tả banner theo chi tiết bản sửa. */
function moTaCua(bs: ChiTietBanSua): string {
  const ten = tenTep(bs.duongDan)
  // File quá 256 KB: không đọc, câu của máy chủ đã đủ
  if (bs.hash === null) return `${ten}: ${bs.loiDoc?.thongBao ?? ''}`
  if (bs.loiDoc) {
    return `${banSuaLoi(ten, dinhDangSo(bs.loiDoc.dong))} ${vietHoaDau(bs.loiDoc.thongBao)}.`
  }
  return moTaBanSua(
    ten,
    dinhDangNgay(bs.ngayNhap),
    dinhDangSo(bs.duKhoi.co),
    dinhDangSo(bs.duKhoi.tong),
  )
}

type Mo = Exclude<ViecDuyet, 'duyet'> | null

export default function BannerBanSua({ muc }: { muc: MucHoc }) {
  const q = useChiTietDuyet(muc.id, true)
  const { dang, chay } = useHanhDongDuyet(muc)
  const [mo, datMo] = useState<Mo>(null)
  // Bản sửa bạn quyết định duyệt = bản của lúc mở dialog (hash + khối thiếu): file đổi ngoài app khi dialog đang
  // mở → máy chủ từ chối (409) thay vì duyệt bản mới chưa xem.
  const [lucMo, datLucMo] = useState<{ hash: string; thieu: string[] } | null>(null)
  const daXong = useRef(false)

  const bs = q.data?.banSua ?? null
  const duyetDuoc = bs !== null && bs.hash !== null && bs.loiDoc === null
  // Chưa tải xong: chưa cho bấm gì; lỗi tải / file không còn: chỉ bỏ được (máy chủ tự kiểm)
  const boDuoc = !q.isPending

  let moTa: string
  if (q.isPending) moTa = DANG_TAI_BAN_SUA
  else if (q.isError) moTa = KHONG_TAI_BAN_SUA
  else if (!bs) moTa = BAN_SUA_KHONG_CON
  else moTa = moTaCua(bs)

  function moDuyet() {
    if (!bs?.hash) return
    datLucMo({ hash: bs.hash, thieu: bs.thieu })
    datMo('duyet-ban-sua')
  }

  async function xacNhan() {
    if (mo === 'duyet-ban-sua') {
      if (!lucMo) return
      daXong.current = await chay('duyet-ban-sua', lucMo.hash)
    } else if (mo === 'bo-ban-sua') {
      daXong.current = await chay('bo-ban-sua')
    }
    datMo(null)
  }

  const tenFileSua = bs ? tenTep(bs.duongDan) : `${muc.slug}.ban-sua.md`
  const khiDongXong = () => {
    if (!daXong.current) return false
    daXong.current = false
    return focusTieuDe()
  }

  return (
    <>
      <Banner
        tieuDe="Có thay đổi chưa duyệt"
        moTa={moTa}
        hanhDong={
          <>
            <Nut bien="phu" disabled={!duyetDuoc} onClick={moDuyet}>
              Duyệt bản sửa
            </Nut>
            <Nut bien="phu" disabled={!boDuoc} onClick={() => datMo('bo-ban-sua')}>
              Bỏ bản sửa
            </Nut>
          </>
        }
      />
      <HopThoaiDuyet
        mo={mo === 'duyet-ban-sua'}
        doiMo={(m) => datMo(m ? 'duyet-ban-sua' : null)}
        muc={muc}
        tieuDe={DUYET_BAN_SUA_TIEU_DE}
        moTa={`${cauSeThanh(q.data?.homNay)}. ${DUYET_BAN_SUA_MO_TA} ${KHONG_HOAN_TAC_DUYET}`}
        thieu={lucMo?.thieu ?? []}
        nhanXacNhan="Duyệt"
        dangXuLy={dang === 'duyet-ban-sua'}
        khiXacNhan={() => void xacNhan()}
        khiDongXong={khiDongXong}
      />
      <HopThoaiDuyet
        mo={mo === 'bo-ban-sua'}
        doiMo={(m) => datMo(m ? 'bo-ban-sua' : null)}
        muc={muc}
        tieuDe={BO_BAN_SUA_TIEU_DE}
        moTa={boBanSuaMoTa(tenFileSua)}
        nhanXacNhan="Bỏ bản sửa"
        nguyHiem
        dangXuLy={dang === 'bo-ban-sua'}
        khiXacNhan={() => void xacNhan()}
        khiDongXong={khiDongXong}
      />
    </>
  )
}
