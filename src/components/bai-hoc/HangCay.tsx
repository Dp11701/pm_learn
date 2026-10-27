// C9 Hàng cây — bản rút gọn cho tab "Trong lĩnh vực" ở cột phải trang bài (đề xuất 4.3 "hàng C9 rút gọn"; F02b C9,
// D18). Cả hàng là link tới bài: vạch trái 4px theo trạng thái học (kênh "vạch trái" chỉ dùng cho trạng thái học;
// Chưa học, Bỏ qua trong suốt như F02b), icon trạng thái 14px tô màu + tên mục (lang=en) + chữ trạng thái 12/18
// muted (§11: trạng thái luôn có icon + chữ). Cần ôn lại (cờ suy ra, chỉ khi Đã xong — đề xuất 3.3): glyph ↺ trên
// icon + chữ "Đã xong · Cần ôn lại".
// Mục đang mở: nền surface-2, chữ 600, aria-current="page". Bỏ ô chọn, phân số, cột ghi chú của C9 đầy đủ.
// Focus: vòng 2px lùi vào trong 2px (D18, .focus-trong) để không bị cắt ở mép card.
import { Link } from 'react-router'
import {
  TEN_CAN_ON_LAI,
  TEN_TRANG_THAI_HOC,
  type TrangThaiHoc,
} from '../../../shared/domain/trang-thai'
import type { MucHoc } from '../../../shared/roadmap'
import TenMuc from '../TenMuc'
import IconTrangThai from '../trang-thai/IconTrangThai'

/** Vạch trái 4px (F02b C9): Đang học / Đã xong màu đặc; Chưa học, Bỏ qua không vạch. */
const VACH: Record<TrangThaiHoc, string> = {
  'chua-hoc': 'border-l-transparent',
  'dang-hoc': 'border-l-[var(--st-learning-solid)]',
  'da-xong': 'border-l-[var(--st-done-solid)]',
  'bo-qua': 'border-l-transparent',
}

export interface PropsHangCay {
  muc: MucHoc
  trangThai: TrangThaiHoc
  canOnLai?: boolean
  /** Mục đang mở */
  dangMo?: boolean
}

export default function HangCay({
  muc,
  trangThai,
  canOnLai: coCo = false,
  dangMo = false,
}: PropsHangCay) {
  // Cờ chỉ có nghĩa ở mục Đã xong (cờ cũ của mục vừa đổi trạng thái không hiện)
  const canOnLai = coCo && trangThai === 'da-xong'
  const chu = canOnLai
    ? `${TEN_TRANG_THAI_HOC[trangThai]} · ${TEN_CAN_ON_LAI}`
    : TEN_TRANG_THAI_HOC[trangThai]
  return (
    <Link
      to={`/hoc/${muc.slug}`}
      aria-current={dangMo ? 'page' : undefined}
      data-trang-thai={trangThai}
      className={`focus-trong flex min-h-9 items-center gap-2 rounded-r-[var(--radius-sm)] border-l-4 py-1.5 pr-2 pl-2 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-text no-underline transition-colors duration-150 ${
        VACH[trangThai]
      } ${dangMo ? 'bg-surface-2 font-semibold' : 'hover:bg-surface-2'}`}
    >
      <IconTrangThai trangThai={trangThai} canOnLai={canOnLai} toMau size={14} />
      <TenMuc className="min-w-0 flex-1 [overflow-wrap:anywhere]">{muc.label}</TenMuc>
      <span className="shrink-0 text-right text-[length:var(--fs-chip)] leading-[var(--lh-chip)] font-normal text-muted">
        {chu}
      </span>
    </Link>
  )
}
