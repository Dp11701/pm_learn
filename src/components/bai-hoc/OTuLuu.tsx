// Ô chữ tự lưu của trang bài (§11 "Tự lưu, không tải đè lên ô đang gõ"; C25; đề xuất 3.2, 5): textarea gắn với
// một TuLuu của src/app/du-lieu/hoc.ts (bản tạm nhap-tam, hẹn gửi, chữ mới nhất thắng nằm ở đó).
// - Đang focus: ô giữ chữ của chính nó — dữ liệu tải lại (tab khác, revision mới) không bao giờ đè chữ đang gõ.
// - Rời ô: gửi ngay chữ đang hẹn, ô hiện lại giá trị của lớp dữ liệu (chữ chưa lưu > bản tạm > máy chủ).
// - Chưa tải xong dữ liệu học: ô tắt (không gõ được vào chỗ chưa biết giá trị).
// TrangThaiTuLuu là C25 "Đang lưu…" / "Đã lưu lúc 21:42" / "Lỗi lưu — Thử lại" của cùng ô.
import { useState, type ComponentProps } from 'react'
import type { TuLuu as ApiTuLuu } from '../../app/du-lieu/hoc'
import TuLuu from '../TuLuu'
import { lopO } from '../TruongNhap'

export type PropsOTuLuu = { tuLuu: ApiTuLuu } & Omit<
  ComponentProps<'textarea'>,
  'value' | 'defaultValue' | 'onChange' | 'disabled'
>

export default function OTuLuu({ tuLuu, className = '', onFocus, onBlur, ...khac }: PropsOTuLuu) {
  // Chữ của ô khi đang focus; null = không focus (hiện giá trị của lớp dữ liệu)
  const [dangGo, datDangGo] = useState<string | null>(null)
  const giaTri = tuLuu.giaTri
  return (
    <textarea
      {...khac}
      value={dangGo ?? giaTri ?? ''}
      disabled={giaTri === undefined}
      onFocus={(e) => {
        datDangGo(giaTri ?? '')
        onFocus?.(e)
      }}
      onChange={(e) => {
        datDangGo(e.target.value)
        tuLuu.luu(e.target.value)
      }}
      onBlur={(e) => {
        datDangGo(null)
        tuLuu.xongNgay()
        onBlur?.(e)
      }}
      className={`${lopO()} resize-y px-3 py-2 ${className}`}
    />
  )
}

/** C25 của một ô tự lưu. */
export function TrangThaiTuLuu({ tuLuu, className }: { tuLuu: ApiTuLuu; className?: string }) {
  return (
    <TuLuu
      trangThai={tuLuu.tinhTrang ?? 'nghi'}
      luc={tuLuu.luc}
      thuLai={tuLuu.thuLai}
      className={className}
    />
  )
}
