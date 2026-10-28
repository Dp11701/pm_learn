// Nút "Duyệt bài" trên banner bản nháp của trang bài (bước 4; đề xuất 3.7 rút gọn: không có chế độ duyệt, không có
// công tắc "Đã soát"): mở dialog "Duyệt bài này?" — "Sẽ thành Đã duyệt · dd/MM/yyyy" (hôm nay của server: hỏi
// GET /api/duyet/:id lúc mở dialog, chưa về thì dùng /api/meta), khối ★ còn thiếu (vẫn cho duyệt), "Duyệt" /
// "Huỷ". Gửi kèm hash của bản đang đọc (hashFile của
// GET /api/bai/:id): file đổi ngoài app từ lúc mở trang → máy chủ từ chối (409), trang tải lại bản mới. Duyệt xong:
// toast "Đã duyệt {tên}" (không Hoàn tác), banner biến mất khi bài tải lại, focus về H1.
import { useMemo, useRef, useState } from 'react'
import { dinhDangNgay } from '../../../shared/dinh-dang'
import type { KetQuaBai } from '../../../shared/noi-dung'
import type { MucHoc } from '../../../shared/roadmap'
import { useChiTietDuyet } from '../../app/du-lieu/duyet'
import { useKetNoi } from '../../app/ket-noi'
import { KHONG_HOAN_TAC_DUYET } from '../../copy/cho-duyet-duyet'
import Nut from '../Nut'
import { ID_TIEU_DE_TRANG } from '../TieuDeTrang'
import HopThoaiDuyet from './HopThoaiDuyet'
import { useHanhDongDuyet } from './hanh-dong'
import { khoiThieuCua } from './khoi-thieu'

/** "Sẽ thành Đã duyệt · dd/MM/yyyy" (chưa biết hôm nay của server thì bỏ ngày). */
export function cauSeThanh(homNay: string | undefined): string {
  return homNay ? `Sẽ thành Đã duyệt · ${dinhDangNgay(homNay)}` : 'Sẽ thành Đã duyệt'
}

/** Sau khi đã xử lý xong (dialog đóng hẳn): đưa focus về H1 — nút mở đã / sắp biến mất. */
export function focusTieuDe(): boolean {
  const h1 = document.getElementById(ID_TIEU_DE_TRANG)
  if (!h1) return false
  h1.focus()
  return true
}

export default function NutDuyetBai({
  muc,
  bai,
  hashNhap,
}: {
  muc: MucHoc
  /** Bài đang hiện (bản nháp); null khi không đọc được */
  bai: KetQuaBai | null
  /** sha256 của file đang đọc; null khi chưa biết (nút tắt) */
  hashNhap: string | null
}) {
  const [mo, datMo] = useState(false)
  // Bản bạn quyết định duyệt = bản đang hiện lúc mở dialog: giữ hash + khối thiếu của lúc đó. File đổi ngoài app
  // khi dialog đang mở (trang tự tải bản mới) → máy chủ từ chối (409), không duyệt nhầm bản chưa đọc.
  const [lucMo, datLucMo] = useState<{ hash: string; thieu: string[] } | null>(null)
  const daDuyet = useRef(false)
  const { dang, chay } = useHanhDongDuyet(muc)
  const homNayMeta = useKetNoi().meta?.homNay
  const homNay = useChiTietDuyet(muc.id, mo).data?.homNay ?? homNayMeta
  const thieu = useMemo(() => (bai ? khoiThieuCua(bai) : []), [bai])

  function moHopThoai() {
    if (!hashNhap) return
    datLucMo({ hash: hashNhap, thieu })
    datMo(true)
  }

  async function duyet() {
    if (!lucMo) return
    daDuyet.current = await chay('duyet', lucMo.hash)
    datMo(false)
  }

  return (
    <>
      <Nut bien="phu" disabled={!hashNhap} onClick={moHopThoai}>
        Duyệt bài
      </Nut>
      <HopThoaiDuyet
        mo={mo}
        doiMo={datMo}
        muc={muc}
        tieuDe="Duyệt bài này?"
        moTa={`${cauSeThanh(homNay)}. ${KHONG_HOAN_TAC_DUYET}`}
        thieu={lucMo?.thieu ?? thieu}
        nhanXacNhan="Duyệt"
        dangXuLy={dang === 'duyet'}
        khiXacNhan={() => void duyet()}
        khiDongXong={() => {
          if (!daDuyet.current) return false
          daDuyet.current = false
          return focusTieuDe()
        }}
      />
    </>
  )
}
