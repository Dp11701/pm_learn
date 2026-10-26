// C15 Card và C16 Khối bài (F11, F12, F02b; §5.0 "khoảng cách giữa các khối bài 40", padding card 20 / 16).
// - KhoiBai: <section id> + h2 22/32 (mobile 20/30) + nội dung; bản `card` có nền surface, viền, bo 10.
//   Section nhận focus bằng code (tabIndex -1) để thanh 4 bước / mục lục đưa focus tới khối sau khi cuộn.
// - OKhoiThieu: khối ★ chưa có chữ → ô nét đứt (nét đứt = "chưa có", §5.1) "Chưa có <khối> — khối bắt buộc,
//   bài vẫn đọc được." + "Thêm" mở trình soạn (đề xuất 3.6, F12).
import type { ReactNode } from 'react'
import { FileX, Plus } from 'lucide-react'
import { NutLink } from '../Nut'

/** h2 tên khối: 22/32 600, mobile 20/30 (§5.2, F11, F13). */
export const LOP_H2_KHOI =
  'm-0 text-[length:var(--fs-h2)] leading-[var(--lh-h2)] font-semibold max-md:text-[length:var(--fs-h2-m)] max-md:leading-[var(--lh-h2-m)]'

/** Dòng phụ 13/20 muted dưới tên khối (F11 "Bước Áp dụng · đang làm"). */
export const LOP_PHU_KHOI = 'text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted'

/** C15: card nền surface, viền 1px, bo 10, padding 20 (mobile 16). */
export const LOP_CARD = 'rounded-[var(--radius-md)] border border-border bg-surface p-5 max-md:p-4'

export interface PropsKhoiBai {
  id: string
  /** Tên khối (h2) */
  tieuDe: ReactNode
  /** Dòng phụ dưới tên khối */
  phu?: ReactNode
  /** Khối dạng card (Tóm tắt, Thực hành, Tự kiểm tra, khối do app tạo) */
  card?: boolean
  /** Cỡ tên khối: 'khoi' 22/32 (mặc định); 'nho' 15/24 như nhãn ô Nói lại của F11 */
  coTieuDe?: 'khoi' | 'nho'
  children?: ReactNode
  className?: string
}

export default function KhoiBai({
  id,
  tieuDe,
  phu,
  card = false,
  coTieuDe = 'khoi',
  children,
  className = '',
}: PropsKhoiBai) {
  const lopTieuDe =
    coTieuDe === 'nho'
      ? 'm-0 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] font-semibold'
      : LOP_H2_KHOI
  return (
    <section
      id={id}
      tabIndex={-1}
      data-khoi={id}
      className={`flex min-w-0 scroll-mt-6 flex-col focus:outline-none ${
        card ? `gap-4 ${LOP_CARD}` : 'gap-3'
      } ${className}`}
    >
      {phu != null ? (
        <div className="flex flex-col gap-1">
          <h2 className={lopTieuDe}>{tieuDe}</h2>
          <span className={LOP_PHU_KHOI}>{phu}</span>
        </div>
      ) : (
        <h2 className={lopTieuDe}>{tieuDe}</h2>
      )}
      {children}
    </section>
  )
}

export interface PropsOKhoiThieu {
  id: string
  /** Tên khối, vd. "Tự kiểm tra" */
  ten: string
  /** Trình soạn ở đúng chỗ (phase 7b) */
  den: string
}

/** Ô "Chưa có <khối>" của khối ★ chưa có chữ (F12): viền nét đứt 1,5px, padding 20, icon file-x 20. */
export function OKhoiThieu({ id, ten, den }: PropsOKhoiThieu) {
  return (
    <section
      id={id}
      tabIndex={-1}
      data-khoi-thieu={id}
      className="flex scroll-mt-6 flex-wrap items-center gap-3 rounded-[var(--radius-md)] border-[1.5px] border-dashed border-border-input p-5 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] focus:outline-none max-md:p-4"
    >
      <FileX size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-muted" />
      <h2 className="m-0 flex-[1_1_280px] text-[length:var(--fs-ui)] leading-[var(--lh-ui)] font-normal">
        <strong className="font-semibold">Chưa có {ten}</strong>
        <span className="text-muted"> — khối bắt buộc, bài vẫn đọc được.</span>
      </h2>
      <NutLink to={den} bien="phu" icon={Plus} aria-label={`Thêm ${ten}`}>
        Thêm
      </NutLink>
    </section>
  )
}
