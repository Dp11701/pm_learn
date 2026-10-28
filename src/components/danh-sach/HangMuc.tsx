// Hàng mục học của danh sách (Lộ trình, trang Lĩnh vực; §8.3 rút gọn, đề xuất 3.9): ô chọn · icon + chữ trạng thái
// học (§11: luôn có icon + chữ) · tên (link tới bài, lang=en) · cờ "Cần ôn lại" (chỉ mục Đã xong) · chip loại · chip
// nội dung. Vạch trái 4px là trạng thái học (kênh "vạch trái" chỉ dùng cho trạng thái học, như hàng C9).
// Bàn phím do DanhSachMuc lo: link của hàng là điểm focus (roving tabindex), Space chọn / bỏ chọn; ô chọn không nằm
// trong thứ tự Tab (vẫn bấm chuột và trình đọc màn hình dùng được).
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import {
  TEN_TRANG_THAI_HOC,
  type TrangThaiHoc,
  type TrangThaiNoiDung,
} from '../../../shared/domain/trang-thai'
import type { MucHoc } from '../../../shared/roadmap'
import { CHON_MUC } from '../../copy/cho-duyet-lo-trinh'
import TenMuc from '../TenMuc'
import ChipLoai from '../trang-thai/ChipLoai'
import ChipNoiDung from '../trang-thai/ChipNoiDung'
import IconTrangThai from '../trang-thai/IconTrangThai'
import { CoCanOnLai } from '../trang-thai/PillTrangThai'
import { LOP_CHU_META } from '../trang-thai/mau-trang-thai'

const VACH: Record<TrangThaiHoc, string> = {
  'chua-hoc': 'border-l-transparent',
  'dang-hoc': 'border-l-[var(--st-learning-solid)]',
  'da-xong': 'border-l-[var(--st-done-solid)]',
  'bo-qua': 'border-l-transparent',
}

export interface PropsHangMuc {
  muc: MucHoc
  trangThai: TrangThaiHoc
  /** Cờ Cần ôn lại (chỉ có nghĩa khi Đã xong) */
  canOnLai: boolean
  /** Trạng thái nội dung; undefined = chưa biết (không vẽ chip) */
  noiDung: TrangThaiNoiDung | undefined
  chon: boolean
  khiDoiChon: (id: string) => void
  /** Roving tabindex: 0 cho đúng một hàng của danh sách */
  tabIndex: 0 | -1
  /** Mục được mở tới (?muc=) */
  noiBat?: boolean
  /** Breadcrumb nhỏ dưới tên (danh sách phẳng) */
  duongDan?: ReactNode
}

export default function HangMuc({
  muc,
  trangThai,
  canOnLai: coCo,
  noiDung,
  chon,
  khiDoiChon,
  tabIndex,
  noiBat = false,
  duongDan,
}: PropsHangMuc) {
  const canOnLai = coCo && trangThai === 'da-xong'
  return (
    <div
      data-hang-muc={muc.id}
      data-trang-thai={trangThai}
      data-chon={chon || undefined}
      className={`flex min-h-11 items-center gap-3 rounded-r-[var(--radius-sm)] border-l-4 py-1.5 pr-3 pl-2 ${VACH[trangThai]} ${
        chon ? 'bg-surface-2' : 'hover:bg-surface-2'
      } ${noiBat ? 'shadow-[inset_0_0_0_1.5px_var(--text)]' : ''}`}
    >
      <input
        type="checkbox"
        tabIndex={-1}
        checked={chon}
        onChange={() => khiDoiChon(muc.id)}
        aria-label={`${CHON_MUC} ${muc.label}`}
        className="size-4 shrink-0 cursor-pointer accent-[var(--primary)]"
      />
      <span
        className={`flex w-[7.5rem] shrink-0 items-center gap-1.5 text-muted ${LOP_CHU_META}`}
      >
        <IconTrangThai trangThai={trangThai} canOnLai={canOnLai} toMau size={16} />
        {TEN_TRANG_THAI_HOC[trangThai]}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <Link
          to={`/hoc/${muc.slug}`}
          data-lien-ket-muc={muc.id}
          tabIndex={tabIndex}
          className="focus-trong w-fit max-w-full rounded-[var(--radius-sm)] text-[length:var(--fs-ui)] leading-[var(--lh-ui)] text-text no-underline [overflow-wrap:anywhere] hover:underline"
        >
          <TenMuc>{muc.label}</TenMuc>
        </Link>
        {duongDan}
      </span>
      {canOnLai && <CoCanOnLai />}
      <span className="flex w-[6.5rem] shrink-0 justify-start">
        <ChipLoai loai={muc.mau} />
      </span>
      <span className="flex w-[15rem] shrink-0 justify-start">
        {noiDung && <ChipNoiDung trangThai={noiDung} />}
      </span>
    </div>
  )
}
