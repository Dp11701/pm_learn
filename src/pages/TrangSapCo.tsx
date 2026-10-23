// Trang của route chưa làm tới (đề xuất 4.1): H1 + C38 "Có ở phase n" + một câu trang sẽ làm gì.
import type { ReactNode } from 'react'
import TieuDeTrang from '../components/TieuDeTrang'
import { SapCo } from '../components/TrangThaiTrong'
import { KhungTrang, LOP_H1 } from './chung'

export interface PropsTrangSapCo {
  /** Chữ thuần cho H1 và document.title. */
  tenTrang: string
  phase: number | string
  /** Một câu: trang sẽ làm gì (§6.1, §8, §9). */
  moTa: ReactNode
  /** H1 có định dạng (vd. tên mục gắn lang="en"); mặc định là tenTrang. */
  tieuDe?: ReactNode
  /** Dòng phía trên H1 (chip loại). */
  truocTieuDe?: ReactNode
  /** Dòng dưới H1 (tên gốc trên roadmap). */
  sauTieuDe?: ReactNode
}

export default function TrangSapCo({
  tenTrang,
  phase,
  moTa,
  tieuDe,
  truocTieuDe,
  sauTieuDe,
}: PropsTrangSapCo) {
  return (
    <KhungTrang>
      <div className="flex flex-col items-start gap-2">
        {truocTieuDe}
        <TieuDeTrang tenTrang={tenTrang} className={LOP_H1}>
          {tieuDe ?? tenTrang}
        </TieuDeTrang>
        {sauTieuDe}
      </div>
      <SapCo phase={phase} moTa={moTa} khung className="max-w-[720px] bg-surface" />
    </KhungTrang>
  )
}
