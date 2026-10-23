// C8 Chip nội dung (F02, F01 mục 4, §5.1, D1): cao 24, padding 0 10, bo 6, chữ 12/18/600, icon 14,
// màu trung tính, luôn có icon. Chưa có nội dung: viền nét đứt + file-x (bấm được thì mở Soạn bài).
// Bản nháp: file-pen. Đã duyệt: file-check + "dd/MM/yyyy"; có bản sửa: file-check + chấm.
// Lỗi đọc file: viền + chữ danger, icon alert-circle.
import { CircleAlert, FileCheck, FilePen, FileX, type LucideIcon } from 'lucide-react'
import { Link, type To } from 'react-router'
import { dinhDangNgay } from '../../../shared/dinh-dang'
import type { TrangThaiNoiDung } from '../../../shared/domain/trang-thai'
import { LOP_CHU_CHIP, VUNG_CHAM } from './mau-trang-thai'

/** Chữ của chip: "Chưa có nội dung", "Bản nháp · AI", "Đã duyệt · 18/10/2026"… */
export function nhanNoiDung(tt: TrangThaiNoiDung): string {
  switch (tt.loai) {
    case 'chua-co':
      return 'Chưa có nội dung'
    case 'ban-nhap':
      return tt.nguon === 'ai' ? 'Bản nháp · AI' : 'Bản nháp · Tự viết'
    case 'da-duyet':
      return tt.coBanSua
        ? 'Đã duyệt · có bản sửa chưa duyệt'
        : `Đã duyệt · ${dinhDangNgay(tt.ngayDuyet)}`
  }
}

const ICON: Record<TrangThaiNoiDung['loai'], LucideIcon> = {
  'chua-co': FileX,
  'ban-nhap': FilePen,
  'da-duyet': FileCheck,
}

// Viền + nền + chữ theo F02 / F01 (Sáng/Tối qua token).
const MAU: Record<TrangThaiNoiDung['loai'], string> = {
  'chua-co': 'border-dashed border-border-input',
  'ban-nhap': 'border-border bg-surface-2',
  'da-duyet': 'border-border bg-surface',
}
const MAU_CHU: Record<TrangThaiNoiDung['loai'], string> = {
  'chua-co': 'text-muted',
  'ban-nhap': 'text-text',
  'da-duyet': 'text-text',
}

// Hover của chip bấm được: F02 "Hover · mở Soạn bài" (viền màu chữ, nền surface-2, gạch chân).
const MAU_HOVER: Record<TrangThaiNoiDung['loai'], string> = {
  'chua-co': 'hover:border-text hover:bg-surface-2 hover:text-text hover:underline',
  'ban-nhap': 'hover:border-text hover:underline',
  'da-duyet': 'hover:border-text hover:bg-surface-2 hover:underline',
}

export interface PropsChipNoiDung {
  trangThai: TrangThaiNoiDung
  /** Chip là link (react-router), vd. Chưa có nội dung → trang Soạn bài. */
  den?: To
  /** Chỉ đọc: chữ muted, không bấm được (F02 "Disabled · chỉ đọc"). */
  voHieu?: boolean
  /** Lỗi đọc file, vd. "Lỗi frontmatter · dòng 3": thay chữ, viền + chữ danger. */
  loi?: string
  className?: string
}

export default function ChipNoiDung({
  trangThai,
  den,
  voHieu = false,
  loi,
  className = '',
}: PropsChipNoiDung) {
  const coLoi = Boolean(loi)
  const Icon = coLoi ? CircleAlert : ICON[trangThai.loai]
  const coCham = !coLoi && trangThai.loai === 'da-duyet' && trangThai.coBanSua
  const mau = coLoi
    ? 'border-danger bg-surface text-danger'
    : `${MAU[trangThai.loai]} ${voHieu ? 'text-muted' : MAU_CHU[trangThai.loai]}`
  const bamDuoc = den !== undefined && !voHieu
  const lop = `inline-flex h-[var(--h-chip)] shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 whitespace-nowrap no-underline ${LOP_CHU_CHIP} ${mau} ${
    bamDuoc
      ? `relative transition-colors duration-150 ${MAU_HOVER[trangThai.loai]} ${VUNG_CHAM}`
      : ''
  } ${className}`
  const noiDung = (
    <>
      <span className="relative inline-flex shrink-0">
        <Icon size={14} strokeWidth={2} aria-hidden="true" />
        {coCham && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-[3px] size-1.5 rounded-full bg-text"
          />
        )}
      </span>
      {loi ?? nhanNoiDung(trangThai)}
    </>
  )
  if (bamDuoc)
    return (
      <Link to={den} data-noi-dung={trangThai.loai} className={lop}>
        {noiDung}
      </Link>
    )
  return (
    <span data-noi-dung={trangThai.loai} className={lop}>
      {noiDung}
    </span>
  )
}
