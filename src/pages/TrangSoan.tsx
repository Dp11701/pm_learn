// Trình soạn (phase 7b): màn tập trung không có sidebar (D27, F20), thanh trên 64px có "‹ Về …", H1 và tên
// mục / lĩnh vực / phần. Ba route (đề xuất 4.1):
// - /hoc/:slug/soan — soạn bài (slug là mục học), "‹ Về bài";
// - /linh-vuc/:slug/soan, /phan/:slug/soan — soạn tổng quan `_tong-quan.md` (§4), "‹ Về lĩnh vực / phần".
// Nằm ngoài khung app nên tự có link bỏ qua (dùng chung với khung), <main>, banner mất kết nối và đưa focus
// về H1 khi vào bằng điều hướng phía client (kể cả Lùi / Tiến), như khung.
// Slug sai → 404 trong khung app như mọi trang (D24): dựng KhungApp, <Outlet/> của khung hiện route con
// index của route này (KhongTimThay, src/app/router.tsx).
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { BannerMatKetNoi } from '../app/ket-noi'
import { ID_NOI_DUNG_CHINH, useFocusSauDieuHuong } from '../app/khung/focus'
import KhungApp from '../app/khung/KhungApp'
import LinkBoQua from '../app/khung/LinkBoQua'
import TenMuc from '../components/TenMuc'
import TieuDeTrang from '../components/TieuDeTrang'
import { SapCo } from '../components/TrangThaiTrong'
import { timMucHoc, timNut } from './chung'
import { MO_TA_SAP_CO, VE_LINH_VUC, VE_PHAN } from '../copy/cho-duyet'

interface PropsManSoan {
  /** Link "‹ Về …" ở đầu thanh trên. */
  ve: { nhan: string; den: string }
  /** H1, vd. "Soạn bài". */
  tieuDe: string
  /** Tên mục / lĩnh vực / phần đang soạn (có TenMuc), sau H1. */
  ten: ReactNode
  /** `ten` dạng chữ thuần cho document.title. */
  tenThuan: string
  moTa: string
}

function ManSoanSapCo({ ve, tieuDe, ten, tenThuan, moTa }: PropsManSoan) {
  useFocusSauDieuHuong()
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <LinkBoQua />
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-6 max-md:h-14 max-md:gap-2 max-md:px-1.5">
        <Link
          to={ve.den}
          className="inline-flex h-[var(--h-control)] shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-text no-underline transition-colors duration-150 hover:bg-surface-2 max-md:h-[var(--h-control-touch)]"
        >
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          {ve.nhan}
        </Link>
        <TieuDeTrang
          tenTrang={`${tieuDe} · ${tenThuan}`}
          className="m-0 shrink-0 text-[length:var(--fs-h2-m)] leading-[var(--lh-h2-m)] font-bold outline-none"
        >
          {tieuDe}
        </TieuDeTrang>
        <span className="min-w-0 truncate text-muted">{ten}</span>
      </header>
      <BannerMatKetNoi
        className="sticky top-0 z-30 bg-bg px-6 pt-4 max-md:px-4"
        lopBanner="mx-auto w-full max-w-[720px]"
      />
      <main id={ID_NOI_DUNG_CHINH} tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <div className="flex flex-col items-center gap-4 px-6 py-12 max-md:px-4 max-md:py-6">
          <SapCo phase="7b" moTa={moTa} khung className="w-full max-w-[720px] bg-surface" />
        </div>
      </main>
    </div>
  )
}

/** /hoc/:slug/soan */
export default function TrangSoan() {
  const muc = timMucHoc(useParams().slug)
  if (!muc) return <KhungApp />
  return (
    <ManSoanSapCo
      ve={{ nhan: 'Về bài', den: `/hoc/${muc.slug}` }}
      tieuDe="Soạn bài"
      ten={<TenMuc>{muc.label}</TenMuc>}
      tenThuan={muc.label}
      moTa={MO_TA_SAP_CO.soanBai}
    />
  )
}

/** /linh-vuc/:slug/soan (loai 'area') và /phan/:slug/soan (loai 'part'): soạn `_tong-quan.md`. */
export function TrangSoanTongQuan({ loai }: { loai: 'area' | 'part' }) {
  const nut = timNut(useParams().slug, loai)
  if (!nut) return <KhungApp />
  const laPhan = loai === 'part'
  return (
    <ManSoanSapCo
      ve={
        laPhan
          ? { nhan: VE_PHAN, den: `/phan/${nut.slug}` }
          : { nhan: VE_LINH_VUC, den: `/linh-vuc/${nut.slug}` }
      }
      tieuDe="Soạn tổng quan"
      ten={
        laPhan ? (
          <>
            Phần <TenMuc>{nut.label}</TenMuc>
          </>
        ) : (
          <TenMuc>{nut.label}</TenMuc>
        )
      }
      tenThuan={laPhan ? `Phần ${nut.label}` : nut.label}
      moTa={MO_TA_SAP_CO.soanTongQuan}
    />
  )
}
