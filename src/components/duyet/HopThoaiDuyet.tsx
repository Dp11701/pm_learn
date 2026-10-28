// Dialog xác nhận của duyệt bài gọn (bước 4; đề xuất 3.7 rút gọn, F12 chỉ để tham khảo): alertdialog (bấm ra ngoài
// không đóng, Esc = Huỷ), tên mục ở dòng phụ, câu mô tả (vd. "Sẽ thành Đã duyệt · dd/MM/yyyy"), danh sách khối ★
// còn thiếu (vẫn cho duyệt), nút Huỷ + nút xác nhận (chính, hoặc đỏ khi bỏ). Đang gửi: nút xác nhận có spinner, không
// đóng được. Focus đầu: nút xác nhận; với thao tác bỏ (đỏ) là Huỷ.
import { useRef, type ReactNode } from 'react'
import { dinhDangSo } from '../../../shared/dinh-dang'
import type { MucHoc } from '../../../shared/roadmap'
import { conThieuKhoi } from '../../copy/cho-duyet-duyet'
import HopThoai from '../HopThoai'
import Nut from '../Nut'
import TenMuc from '../TenMuc'

export interface PropsHopThoaiDuyet {
  mo: boolean
  doiMo: (mo: boolean) => void
  muc: MucHoc
  tieuDe: string
  moTa: ReactNode
  /** Tên các khối ★ còn thiếu */
  thieu?: readonly string[]
  nhanXacNhan: string
  /** Thao tác bỏ (đỏ, focus đầu ở Huỷ) */
  nguyHiem?: boolean
  dangXuLy: boolean
  khiXacNhan: () => void
  /** Như HopThoai.khiDongXong: trả true khi đã tự đặt focus */
  khiDongXong?: () => boolean
}

export default function HopThoaiDuyet({
  mo,
  doiMo,
  muc,
  tieuDe,
  moTa,
  thieu = [],
  nhanXacNhan,
  nguyHiem = false,
  dangXuLy,
  khiXacNhan,
  khiDongXong,
}: PropsHopThoaiDuyet) {
  const refXacNhan = useRef<HTMLButtonElement>(null)
  const refHuy = useRef<HTMLButtonElement>(null)
  return (
    <HopThoai
      mo={mo}
      doiMo={(m) => {
        if (!dangXuLy) doiMo(m)
      }}
      vaiTro="alertdialog"
      tieuDe={tieuDe}
      phuDe={<TenMuc>{muc.label}</TenMuc>}
      moTa={moTa}
      focusDau={nguyHiem ? refHuy : refXacNhan}
      khiDongXong={khiDongXong}
      chan={
        <>
          <Nut ref={refHuy} bien="phu" onClick={() => doiMo(false)} disabled={dangXuLy}>
            Huỷ
          </Nut>
          <Nut
            ref={refXacNhan}
            bien={nguyHiem ? 'nguy-hiem' : 'chinh'}
            dangXuLy={dangXuLy}
            onClick={khiXacNhan}
          >
            {nhanXacNhan}
          </Nut>
        </>
      }
    >
      {thieu.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="m-0">{conThieuKhoi(dinhDangSo(thieu.length))}</p>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-6">
            {thieu.map((ten) => (
              <li key={ten}>{ten}</li>
            ))}
          </ul>
        </div>
      )}
    </HopThoai>
  )
}
