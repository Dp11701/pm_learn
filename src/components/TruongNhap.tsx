// C36 Trường nhập (F02): nhãn + ô + gợi ý + câu lỗi (aria-describedby, aria-invalid). Cao 36, mobile 44
// (D17); viền border-input, hover viền màu chữ; lỗi: viền danger 1,5px + icon + câu hướng dẫn.
// Ngày: ô chữ inputmode=numeric dd/MM/yyyy, không dùng date picker của trình duyệt (đề xuất 5).
// Enter / Esc bỏ qua khi Telex/VNI đang ghép chữ.
import {
  useId,
  useState,
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Calendar, ChevronDown, CircleAlert } from 'lucide-react'
import { dinhDangNgay, docNgay } from '../../shared/dinh-dang'

/** Sự kiện phím đang thuộc một lần ghép chữ của bộ gõ (Telex/VNI, IME). */
export function dangGhepChu(e: KeyboardEvent | globalThis.KeyboardEvent): boolean {
  const goc = 'nativeEvent' in e ? e.nativeEvent : e
  return goc.isComposing || goc.keyCode === 229
}

/** Lớp CSS của ô nhập (input, select, textarea) theo F02. */
export function lopO(coLoi = false) {
  return `w-full rounded-[var(--radius-sm)] bg-surface text-[length:var(--fs-ui)] leading-[var(--lh-ui)] text-text transition-colors duration-150 placeholder:text-muted disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-2 disabled:text-muted ${
    coLoi
      ? 'border-[1.5px] border-danger'
      : 'border border-border-input not-disabled:hover:border-text focus-visible:border-text'
  }`
}

const CAO = 'h-[var(--h-control)] max-md:h-[var(--h-control-touch)]'

export interface PropsKhungTruong {
  nhan: ReactNode
  /** Dòng gợi ý dưới ô (12/18, muted), vd. "dd/MM/yyyy · còn n ngày". Ẩn khi đang có lỗi. */
  goiY?: ReactNode
  /** Câu lỗi: có thì ô aria-invalid và trỏ aria-describedby tới câu này. */
  loi?: ReactNode
  /** Phần tử bên phải nhãn, vd. C25 "Đã lưu lúc 21:42". */
  benPhaiNhan?: ReactNode
  voHieu?: boolean
  className?: string
}

interface ThuocTinhO {
  id: string
  'aria-invalid': true | undefined
  'aria-describedby': string | undefined
}

/** Nhãn + gợi ý + lỗi quanh một ô bất kỳ; `children` nhận id và thuộc tính aria cho ô. */
export function KhungTruong({
  nhan,
  goiY,
  loi,
  benPhaiNhan,
  voHieu,
  className = '',
  id: idNgoai,
  moTaThem,
  children,
}: PropsKhungTruong & {
  id?: string
  /** id phần tử mô tả khác (ngoài gợi ý, lỗi) cũng gắn vào aria-describedby. */
  moTaThem?: string
  children: (o: ThuocTinhO) => ReactNode
}) {
  const idTuDong = useId()
  const id = idNgoai ?? idTuDong
  const idGoiY = `${id}-goi-y`
  const idLoi = `${id}-loi`
  const coLoi = loi != null && loi !== false && loi !== ''
  const moTa = [moTaThem, coLoi ? idLoi : goiY ? idGoiY : undefined].filter(Boolean).join(' ')
  const lopNhan = `text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-semibold ${
    voHieu ? 'text-muted' : ''
  }`
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {benPhaiNhan ? (
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className={lopNhan}>
            {nhan}
          </label>
          {benPhaiNhan}
        </div>
      ) : (
        <label htmlFor={id} className={lopNhan}>
          {nhan}
        </label>
      )}
      {children({
        id,
        'aria-invalid': coLoi || undefined,
        'aria-describedby': moTa || undefined,
      })}
      {coLoi ? (
        <span
          id={idLoi}
          className="flex items-center gap-1.5 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-danger"
        >
          <CircleAlert size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
          {loi}
        </span>
      ) : goiY ? (
        <span
          id={idGoiY}
          className="text-[length:var(--fs-chip)] leading-[var(--lh-chip)] text-muted tabular-nums"
        >
          {goiY}
        </span>
      ) : null}
    </div>
  )
}

type PropsPhim = {
  /** Enter (không giữ Shift/Alt/Ctrl/⌘, không đang ghép chữ). */
  khiEnter?: () => void
  /** Esc (không đang ghép chữ). */
  khiEsc?: () => void
}

function xuLyPhim(
  e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  { khiEnter, khiEsc }: PropsPhim,
  coXuongDong = false,
) {
  if (dangGhepChu(e)) return
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (e.key === 'Enter' && khiEnter && !e.shiftKey && !coXuongDong) {
    e.preventDefault()
    khiEnter()
  } else if (e.key === 'Escape' && khiEsc) {
    e.preventDefault()
    khiEsc()
  }
}

export type PropsTruongNhap = PropsKhungTruong &
  PropsPhim &
  Omit<ComponentProps<'input'>, 'className' | 'disabled'>

export default function TruongNhap({
  nhan,
  goiY,
  loi,
  benPhaiNhan,
  voHieu,
  className,
  id,
  khiEnter,
  khiEsc,
  onKeyDown,
  type = 'text',
  ...khac
}: PropsTruongNhap) {
  return (
    <KhungTruong {...{ nhan, goiY, loi, benPhaiNhan, voHieu, className, id }}>
      {(o) => (
        <input
          {...khac}
          {...o}
          type={type}
          disabled={voHieu}
          onKeyDown={(e) => {
            onKeyDown?.(e)
            if (!e.defaultPrevented) xuLyPhim(e, { khiEnter, khiEsc })
          }}
          className={`${lopO(o['aria-invalid'])} ${CAO} px-3`}
        />
      )}
    </KhungTruong>
  )
}

export type PropsTruongVanBan = PropsKhungTruong &
  PropsPhim &
  Omit<ComponentProps<'textarea'>, 'className' | 'disabled'>

/** Ô nhiều dòng (F02 "Nói lại bằng lời của bạn"). Enter xuống dòng; ⌘/Ctrl+Enter do nơi dùng tự bắt. */
export function TruongVanBan({
  nhan,
  goiY,
  loi,
  benPhaiNhan,
  voHieu,
  className,
  id,
  khiEsc,
  onKeyDown,
  rows = 3,
  ...khac
}: PropsTruongVanBan) {
  return (
    <KhungTruong {...{ nhan, goiY, loi, benPhaiNhan, voHieu, className, id }}>
      {(o) => (
        <textarea
          {...khac}
          {...o}
          rows={rows}
          disabled={voHieu}
          onKeyDown={(e) => {
            onKeyDown?.(e)
            if (!e.defaultPrevented) xuLyPhim(e, { khiEsc }, true)
          }}
          className={`${lopO(o['aria-invalid'])} resize-y px-3 py-2`}
        />
      )}
    </KhungTruong>
  )
}

export type PropsTruongChon = PropsKhungTruong &
  Omit<ComponentProps<'select'>, 'className' | 'disabled'>

/** Ô chọn (F02 "select"): select gốc của trình duyệt, mũi tên chevron-down 16px. */
export function TruongChon({
  nhan,
  goiY,
  loi,
  benPhaiNhan,
  voHieu,
  className,
  id,
  children,
  ...khac
}: PropsTruongChon) {
  return (
    <KhungTruong {...{ nhan, goiY, loi, benPhaiNhan, voHieu, className, id }}>
      {(o) => (
        <div className="relative">
          <select
            {...khac}
            {...o}
            disabled={voHieu}
            className={`${lopO(o['aria-invalid'])} ${CAO} appearance-none pr-9 pl-3`}
          >
            {children}
          </select>
          <ChevronDown
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
          />
        </div>
      )}
    </KhungTruong>
  )
}

export type PropsTruongNgay = Omit<PropsKhungTruong, 'goiY'> &
  Omit<PropsPhim, 'khiEnter'> & {
    /** Ngày đã chốt dạng 'YYYY-MM-DD', null = trống. */
    giaTri: string | null
    /** Gọi khi người dùng chốt một ngày hợp lệ (rời ô hoặc Enter); ô trống → null. */
    khiDoi: (ngay: string | null) => void
    /** Mặc định "dd/MM/yyyy"; vd. "dd/MM/yyyy · còn n ngày". */
    goiY?: ReactNode
    /** Enter sau khi ngày đã hợp lệ (vd. gửi form). */
    khiEnter?: (ngay: string | null) => void
    batBuoc?: boolean
    name?: string
    id?: string
  }

/**
 * C36 ô ngày dd/MM/yyyy (F02 "Ngày thi"): kiểm bằng docNgay khi rời ô hoặc Enter, sai thì giữ chữ đang gõ
 * và báo "Ngày không hợp lệ. Nhập theo dd/MM/yyyy."; đúng thì chuẩn hoá về dd/MM/yyyy.
 */
export function TruongNgay({
  nhan,
  goiY = 'dd/MM/yyyy',
  loi: loiNgoai,
  benPhaiNhan,
  voHieu,
  className,
  id,
  giaTri,
  khiDoi,
  khiEnter,
  khiEsc,
  batBuoc,
  name,
}: PropsTruongNgay) {
  const [chu, datChu] = useState(() => (giaTri ? dinhDangNgay(giaTri) : ''))
  const [loi, datLoi] = useState<string | null>(null)
  const [giaTriTruoc, datGiaTriTruoc] = useState(giaTri)
  // Giá trị bên ngoài đổi (vd. tải lại dữ liệu) → hiện theo giá trị mới.
  if (giaTri !== giaTriTruoc) {
    datGiaTriTruoc(giaTri)
    datChu(giaTri ? dinhDangNgay(giaTri) : '')
    datLoi(null)
  }

  /** Kiểm chữ đang gõ; trả về ngày (hoặc null khi trống) nếu hợp lệ, undefined nếu sai. */
  function chot(): string | null | undefined {
    if (chu.trim() === '') {
      datLoi(null)
      if (giaTri !== null) khiDoi(null)
      return null
    }
    const kq = docNgay(chu)
    if (!kq.ok) {
      datLoi(kq.loi)
      return undefined
    }
    datLoi(null)
    datChu(dinhDangNgay(kq.ngay))
    if (kq.ngay !== giaTri) khiDoi(kq.ngay)
    return kq.ngay
  }

  return (
    <KhungTruong {...{ nhan, goiY, benPhaiNhan, voHieu, className, id }} loi={loi ?? loiNgoai}>
      {(o) => (
        <div className="relative">
          <input
            {...o}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            name={name}
            required={batBuoc}
            disabled={voHieu}
            value={chu}
            onChange={(e) => {
              datChu(e.target.value)
              // Đang báo lỗi mà sửa thành ngày đúng thì gỡ lỗi ngay.
              if (loi && docNgay(e.target.value).ok) datLoi(null)
            }}
            onBlur={(e: FocusEvent<HTMLInputElement>) => {
              if (!e.currentTarget.disabled) chot()
            }}
            onKeyDown={(e) =>
              xuLyPhim(e, {
                khiEnter: () => {
                  const ngay = chot()
                  if (ngay !== undefined) khiEnter?.(ngay)
                },
                khiEsc: khiEsc
                  ? () => {
                      datChu(giaTri ? dinhDangNgay(giaTri) : '')
                      datLoi(null)
                      khiEsc()
                    }
                  : undefined,
              })
            }
            className={`${lopO(o['aria-invalid'])} ${CAO} pr-9 pl-3 tabular-nums`}
          />
          <Calendar
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
          />
        </div>
      )}
    </KhungTruong>
  )
}
