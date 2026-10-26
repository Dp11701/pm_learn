// Trang của route chưa làm tới (đề xuất 4.1): H1 + C38 "Có ở phase n" + một câu trang sẽ làm gì + một nút
// phụ đi tiếp (D20, §2 quy tắc 4: trạng thái trống luôn có đường đi tiếp; chỉ trỏ tới route đã có).
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { MENU, menuDangMo } from '../app/khung/menu'
import { veTrangCha } from '../copy/cho-duyet'
import { NutLink } from '../components/Nut'
import TieuDeTrang from '../components/TieuDeTrang'
import { SapCo } from '../components/TrangThaiTrong'
import { KhungTrang, LOP_H1 } from './chung'

export interface NutDiTiep {
  nhan: string
  den: string
}

/**
 * Nút đi tiếp mặc định theo đường dẫn: trang con của một mục menu → về mục đó (bài học → Lộ trình, bài
 * Chứng chỉ → Chứng chỉ, phiên ôn → Ôn tập); trang của mục menu và trang ngoài menu → Tổng quan; Tổng quan
 * → Lộ trình ("Xem lộ trình" như F05, D20).
 */
export function nutDiTiepMacDinh(pathname: string): NutDiTiep {
  const dangMo = menuDangMo(pathname)
  if (dangMo?.khoa === 'tong-quan') return { nhan: 'Xem lộ trình', den: '/lo-trinh' }
  const cha = dangMo && !dangMo.chinhXac ? MENU.find((m) => m.khoa === dangMo.khoa) : undefined
  if (cha) return { nhan: veTrangCha(cha.nhan), den: cha.den }
  return { nhan: 'Về Tổng quan', den: '/' }
}

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
  /** Nút phụ đi tiếp; mặc định theo đường dẫn (nutDiTiepMacDinh). */
  diTiep?: NutDiTiep
}

export default function TrangSapCo({
  tenTrang,
  phase,
  moTa,
  tieuDe,
  truocTieuDe,
  sauTieuDe,
  diTiep,
}: PropsTrangSapCo) {
  const { pathname } = useLocation()
  const nut = diTiep ?? nutDiTiepMacDinh(pathname)
  return (
    <KhungTrang>
      <div className="flex flex-col items-start gap-2">
        {truocTieuDe}
        <TieuDeTrang tenTrang={tenTrang} className={LOP_H1}>
          {tieuDe ?? tenTrang}
        </TieuDeTrang>
        {sauTieuDe}
      </div>
      <SapCo
        phase={phase}
        moTa={moTa}
        khung
        className="max-w-[720px] bg-surface"
        nut={
          <NutLink to={nut.den} bien="phu">
            {nut.nhan}
          </NutLink>
        }
      />
    </KhungTrang>
  )
}
