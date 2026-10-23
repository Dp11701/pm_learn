// Khối "Lỗi trang" của F26: icon alert-circle 40px (vòng surface-2, màu danger), H1, câu muted, nút chính
// + "Chi tiết lỗi ▾/▴" mở khối chữ mono. Dùng cho lỗi trang trong khung, lỗi toàn app, lỗi đọc cây.
// Không dùng provider nào (toast, query…) để vẫn hiện được khi khung app hỏng.
import { useId, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import Nut from '../../components/Nut'
import TieuDeTrang from '../../components/TieuDeTrang'
import { LOP_H1 } from '../chung'

/** Tải lại trang; gom vào object để test thay được. */
export const dieuHuongTrinhDuyet = {
  taiLai: () => window.location.reload(),
}

export interface PropsKhoiLoi {
  /** H1, vd. "Trang này gặp lỗi khi hiển thị." */
  tieuDe: string
  /** Chữ thuần cho document.title. */
  tenTrang: string
  moTa?: string
  /** Nút chính (màu mực), vd. "Tải lại", "Thử lại". */
  nhanNut: string
  khiBam: () => void
  /** Chi tiết kỹ thuật, 1–3 dòng; rỗng thì không có nút "Chi tiết lỗi". */
  chiTiet?: string
}

export default function KhoiLoi({
  tieuDe,
  tenTrang,
  moTa,
  nhanNut,
  khiBam,
  chiTiet,
}: PropsKhoiLoi) {
  const [moChiTiet, datMoChiTiet] = useState(false)
  const idChiTiet = useId()
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-danger"
      >
        <CircleAlert size={20} strokeWidth={1.75} />
      </span>
      <TieuDeTrang tenTrang={tenTrang} className={LOP_H1}>
        {tieuDe}
      </TieuDeTrang>
      {moTa && <p className="m-0 text-muted">{moTa}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <Nut bien="chinh" onClick={khiBam}>
          {nhanNut}
        </Nut>
        {chiTiet && (
          <Nut
            bien="phu"
            aria-expanded={moChiTiet}
            aria-controls={idChiTiet}
            onClick={() => datMoChiTiet((m) => !m)}
          >
            Chi tiết lỗi <span aria-hidden="true">{moChiTiet ? '▴' : '▾'}</span>
          </Nut>
        )}
      </div>
      {chiTiet && (
        <pre
          id={idChiTiet}
          hidden={!moChiTiet}
          className="m-0 w-full max-w-[440px] rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5 text-left font-mono text-[length:var(--fs-chip)] leading-[var(--lh-chip)] whitespace-pre-wrap text-muted"
        >
          {chiTiet}
        </pre>
      )}
    </div>
  )
}
