// C25 Tự lưu (F02b, §10): "Đang lưu…" / "Đã lưu lúc 21:42" / "Lỗi lưu — Thử lại", 12/18, aria-live polite.
// Vùng live luôn có mặt (kể cả khi chưa lưu gì) để trình đọc màn hình đọc được thay đổi đầu tiên.
import { dinhDangGioPhut } from '../../shared/dinh-dang'

export type TrangThaiTuLuu = 'nghi' | 'dang-luu' | 'da-luu' | 'loi'

export interface PropsTuLuu {
  trangThai: TrangThaiTuLuu
  /** Thời điểm lưu xong gần nhất (ms hoặc ISO), cho "Đã lưu lúc HH:mm". */
  luc?: number | string | null
  /** Bấm "Thử lại" khi lỗi lưu. */
  thuLai?: () => void
  className?: string
}

export default function TuLuu({ trangThai, luc, thuLai, className = '' }: PropsTuLuu) {
  return (
    <span
      aria-live="polite"
      className={`text-[length:var(--fs-chip)] leading-[var(--lh-chip)] text-muted tabular-nums ${className}`}
    >
      {trangThai === 'dang-luu' && 'Đang lưu…'}
      {trangThai === 'da-luu' && luc != null && `Đã lưu lúc ${dinhDangGioPhut(luc)}`}
      {trangThai === 'loi' && (
        <span className="text-danger">
          Lỗi lưu
          {thuLai && (
            <>
              {' — '}
              <button
                type="button"
                onClick={thuLai}
                className="cursor-pointer rounded-[var(--radius-sm)] text-danger underline hover:decoration-2 max-md:inline-flex max-md:min-h-[var(--h-control-touch)] max-md:items-center"
              >
                Thử lại
              </button>
            </>
          )}
        </span>
      )}
    </span>
  )
}
