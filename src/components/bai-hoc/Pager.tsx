// C14 Pager (F11, F15, F17, F02b, §6.2, D12, D30): hai card C15 Trước | Tiếp, lưới tự xuống hàng
// (minmax(min(240px, 100%), 1fr)), cách 16, padding 16 20, bo 10. Dòng trên 13/20 muted: "‹ Trước" / "Tiếp ›"
// kèm phím [ ]; vượt ranh giới thì "Trước — sang lĩnh vực trước: {tên}" / "Tiếp — sang lĩnh vực mới: {tên}"
// (ưu tiên phần > lĩnh vực > nhóm). Dòng dưới là tên mục 15/24 600, sau đó chip nội dung khi biết. Hover viền
// màu chữ. Không có mục sau: card viền liền "Đây là mục cuối cùng của roadmap", không phải link (D30).
// Trước / Tiếp đã bỏ qua mục Bỏ qua (truocTiep), nên mục cuối còn học được cũng là điểm dừng. Mục kề chưa có
// nội dung vẫn là điểm dừng, card hiện chip "Chưa có nội dung" (§6.2); chip lấy từ useTrangThaiNoiDung.
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { TrangThaiNoiDung } from '../../../shared/domain/trang-thai'
import type { MucHoc } from '../../../shared/roadmap'
import { useTrangThaiNoiDung, type TraNoiDung } from '../../app/du-lieu/noi-dung'
import TenMuc from '../TenMuc'
import ChipNoiDung from '../trang-thai/ChipNoiDung'
import { nhanPager, ranhGioi } from './dinh-vi'

const LOP_THE =
  'flex min-w-0 flex-col gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface px-5 py-4 text-text no-underline transition-colors duration-150 max-md:px-4'

function ThePager({
  huong,
  tu,
  den,
  noiDung,
}: {
  huong: 'truoc' | 'tiep'
  tu: MucHoc
  den: MucHoc
  noiDung?: TrangThaiNoiDung
}) {
  const rg = ranhGioi(tu, den)
  const nhan = nhanPager(huong, rg)
  const phim = huong === 'truoc' ? '[' : ']'
  const truoc = huong === 'truoc'
  return (
    <Link
      to={`/hoc/${den.slug}`}
      aria-keyshortcuts={phim}
      data-huong={huong}
      className={`${LOP_THE} hover:border-text ${truoc ? '' : 'items-end text-right'}`}
    >
      {/* Dòng chữ chảy liền (icon, phím là phần tử trong dòng) để nhãn dài xuống dòng tự nhiên. */}
      <span className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
        {truoc && (
          <ChevronLeft
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className="mr-1.5 inline-block align-[-2px]"
          />
        )}
        {!truoc && (
          <kbd
            aria-hidden="true"
            className="mr-1.5 font-mono text-[length:var(--fs-chip)] max-md:hidden"
          >
            {phim}
          </kbd>
        )}
        {nhan}
        {rg && (
          <>
            {' '}
            <TenMuc>{rg.nut.label}</TenMuc>
          </>
        )}
        {truoc && (
          <kbd
            aria-hidden="true"
            className="ml-1.5 font-mono text-[length:var(--fs-chip)] max-md:hidden"
          >
            {phim}
          </kbd>
        )}
        {!truoc && (
          <ChevronRight
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className="ml-1.5 inline-block align-[-2px]"
          />
        )}
      </span>
      <TenMuc className="text-[length:var(--fs-ui)] leading-[var(--lh-ui)] font-semibold">
        {den.label}
      </TenMuc>
      {/* Card Trước căn trái: chip không giãn hết bề ngang (F11 align-self: flex-start) */}
      {noiDung && <ChipNoiDung trangThai={noiDung} className={truoc ? 'self-start' : ''} />}
    </Link>
  )
}

export interface PropsPager {
  muc: MucHoc
  truoc: MucHoc | undefined
  tiep: MucHoc | undefined
  /** Trạng thái nội dung của mục kề; mặc định theo máy chủ (useTrangThaiNoiDung), chưa biết thì không
   *  có chip. */
  noiDungCua?: TraNoiDung
  className?: string
}

export default function Pager({ muc, truoc, tiep, noiDungCua, className = '' }: PropsPager) {
  const theoMayChu = useTrangThaiNoiDung()
  const traNoiDung = noiDungCua ?? theoMayChu
  return (
    <nav
      aria-label="Mục trước và tiếp"
      className={`grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4 ${className}`}
    >
      {truoc ? (
        <ThePager huong="truoc" tu={muc} den={truoc} noiDung={traNoiDung(truoc.id)} />
      ) : (
        // Giữ card Tiếp ở cột phải khi không có mục trước.
        <div aria-hidden="true" className="max-md:hidden" />
      )}
      {tiep ? (
        <ThePager huong="tiep" tu={muc} den={tiep} noiDung={traNoiDung(tiep.id)} />
      ) : (
        <p
          data-muc-cuoi=""
          className={`${LOP_THE} m-0 items-end justify-center text-right text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted`}
        >
          Đây là mục cuối cùng của roadmap
        </p>
      )}
    </nav>
  )
}
