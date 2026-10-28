// Nút "Duyệt bài" trên banner bản nháp của trang bài (bước 4; đề xuất 3.7 rút gọn: không có chế độ duyệt, không có
// công tắc "Đã soát"): mở dialog "Duyệt bài này?" — "Sẽ thành Đã duyệt · dd/MM/yyyy" (hôm nay theo /api/meta của
// server), khối ★ còn thiếu (vẫn cho duyệt), "Duyệt" / "Huỷ". Gửi kèm hash của bản đang đọc (hashFile của
// GET /api/bai/:id): file đổi ngoài app từ lúc mở trang → máy chủ từ chối (409), trang tải lại bản mới. Duyệt xong:
// toast "Đã duyệt {tên}" (không Hoàn tác), banner biến mất khi bài tải lại, focus về H1.
import { useMemo, useRef, useState } from 'react'
import { dinhDangNgay } from '../../../shared/dinh-dang'
import type { KetQuaBai } from '../../../shared/noi-dung'
import type { MucHoc } from '../../../shared/roadmap'
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
  const daDuyet = useRef(false)
  const { dang, chay } = useHanhDongDuyet(muc)
  const homNay = useKetNoi().meta?.homNay
  const thieu = useMemo(() => (bai ? khoiThieuCua(bai) : []), [bai])

  async function duyet() {
    if (!hashNhap) return
    daDuyet.current = await chay('duyet', hashNhap)
    datMo(false)
  }

  return (
    <>
      <Nut bien="phu" disabled={!hashNhap} onClick={() => datMo(true)}>
        Duyệt bài
      </Nut>
      <HopThoaiDuyet
        mo={mo}
        doiMo={datMo}
        muc={muc}
        tieuDe="Duyệt bài này?"
        moTa={`${cauSeThanh(homNay)}. ${KHONG_HOAN_TAC_DUYET}`}
        thieu={thieu}
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
