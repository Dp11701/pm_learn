// C38 Empty / error / skeleton (F02b, F26, §5.2, D20): icon 40px trong vòng surface-2 + 1 câu + 1–2 nút.
// Không vẽ khung nét đứt (nét đứt chỉ nghĩa "chưa có / chờ điền", D20). Skeleton từng card; card lỗi chỉ
// card đó báo lỗi + Thử lại; prefers-reduced-motion thì skeleton đứng yên (F26).
import { useId, useState, type CSSProperties, type ReactNode } from 'react'
import { CircleAlert, Hourglass, type LucideIcon } from 'lucide-react'
import Nut from './Nut'

type ThePhan = 'p' | 'h2' | 'h3'

export interface PropsTrangThaiTrong {
  icon: LucideIcon
  /** Câu chính (câu của frame). */
  cauChinh: ReactNode
  /** Dòng phụ 13/20 muted (tuỳ chọn). */
  moTa?: ReactNode
  /** 1–2 nút (C35 / NutLink). */
  nut?: ReactNode
  /** Canh giữa, cỡ cả trang (F26 "Lỗi trang"); mặc định canh trái trong card (F02b). */
  canGiua?: boolean
  /** Tự vẽ khung card (viền 1px, bo 10, padding 16). */
  khung?: boolean
  /** Thẻ của câu chính; trang lỗi dùng h2 (F26). */
  cauChinhLa?: ThePhan
  /** Màu icon; lỗi dùng danger. */
  mauIcon?: 'thuong' | 'loi'
  className?: string
  children?: ReactNode
}

export default function TrangThaiTrong({
  icon: Icon,
  cauChinh,
  moTa,
  nut,
  canGiua = false,
  khung = false,
  cauChinhLa: The = 'p',
  mauIcon = 'thuong',
  className = '',
  children,
}: PropsTrangThaiTrong) {
  const loi = mauIcon === 'loi'
  const lopKhung = khung
    ? `rounded-[var(--radius-md)] border p-4 ${loi ? 'border-danger' : 'border-border'}`
    : ''
  const lopCau = canGiua
    ? 'text-[length:var(--fs-h2)] leading-[var(--lh-h2)] font-bold max-md:text-[length:var(--fs-h2-m)] max-md:leading-[var(--lh-h2-m)]'
    : ''
  return (
    <div
      className={`flex flex-col ${
        canGiua ? 'items-center gap-4 text-center' : 'items-start gap-3'
      } ${lopKhung} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 ${
          loi ? 'text-danger' : 'text-muted'
        }`}
      >
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <div className={`flex flex-col gap-1 ${canGiua ? 'items-center' : ''}`}>
        <The className={`m-0 ${lopCau}`}>{cauChinh}</The>
        {moTa != null && (
          <p
            className={`m-0 text-muted ${
              canGiua ? '' : 'text-[length:var(--fs-meta)] leading-[var(--lh-meta)]'
            }`}
          >
            {moTa}
          </p>
        )}
      </div>
      {nut != null && <div className="flex flex-wrap gap-2">{nut}</div>}
      {children}
    </div>
  )
}

export interface PropsTrangThaiLoi extends Omit<PropsTrangThaiTrong, 'icon' | 'mauIcon'> {
  icon?: LucideIcon
  /** Có thì hiện nút phụ "Thử lại" (đứng trước các nút trong `nut`). */
  thuLai?: () => void
  /** Chi tiết kỹ thuật: nút "Chi tiết lỗi" mở/đóng khối chữ mono (F26 "Lỗi trang"). */
  chiTiet?: string
}

/** C38 lỗi: icon alert-circle màu danger; card lỗi có viền danger (F02b). */
export function TrangThaiLoi({
  icon = CircleAlert,
  thuLai,
  chiTiet,
  nut,
  ...khac
}: PropsTrangThaiLoi) {
  const [moChiTiet, datMoChiTiet] = useState(false)
  const idChiTiet = useId()
  const cacNut =
    thuLai || chiTiet || nut ? (
      <>
        {thuLai && (
          <Nut bien="phu" onClick={thuLai}>
            Thử lại
          </Nut>
        )}
        {nut}
        {chiTiet && (
          <Nut
            bien="phu"
            aria-expanded={moChiTiet}
            aria-controls={idChiTiet}
            onClick={() => datMoChiTiet((m) => !m)}
          >
            Chi tiết lỗi <span aria-hidden="true">{moChiTiet ? '▴' : '▾'}</span>
          </Nut>
        )}
      </>
    ) : undefined
  return (
    <TrangThaiTrong {...khac} icon={icon} mauIcon="loi" nut={cacNut}>
      {chiTiet && (
        <pre
          id={idChiTiet}
          hidden={!moChiTiet}
          className="m-0 w-full max-w-[440px] rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5 text-left font-mono text-[length:var(--fs-chip)] leading-[var(--lh-chip)] whitespace-pre-wrap text-muted"
        >
          {chiTiet}
        </pre>
      )}
    </TrangThaiTrong>
  )
}

export interface PropsSapCo extends Omit<PropsTrangThaiTrong, 'icon' | 'cauChinh' | 'mauIcon'> {
  /** Phase sẽ có tính năng, vd. 3, '7b'. */
  phase: number | string
  /** Tên phần sắp có (vd. tên khối, tên trang); không có thì câu chính là "Có ở phase n". */
  tieuDe?: ReactNode
  icon?: LucideIcon
}

/** C38 "Có ở phase n" (đề xuất 4.1): route, khối, tính năng chưa làm tới. */
export function SapCo({ phase, tieuDe, moTa, icon = Hourglass, ...khac }: PropsSapCo) {
  const cau = `Có ở phase ${phase}`
  return (
    <TrangThaiTrong
      {...khac}
      icon={icon}
      cauChinh={tieuDe ?? cau}
      moTa={
        tieuDe != null ? (
          <>
            {cau}
            {moTa != null && <> · {moTa}</>}
          </>
        ) : (
          moTa
        )
      }
    />
  )
}

// --- Skeleton ---

const NHAP_NHAY = 'motion-safe:animate-[nhap-nhay_1.6s_ease-in-out_infinite]'

/** Một dòng skeleton (F26: cao 12, chữ to 20), bo 4. */
export function DongCho({
  rong = '100%',
  cao = 12,
  className = '',
}: {
  rong?: string
  cao?: number
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      style={{ width: rong, height: cao } as CSSProperties}
      className={`block shrink-0 rounded-[4px] bg-[var(--skeleton-bg)] ${NHAP_NHAY} ${className}`}
    />
  )
}

/** Khối skeleton tuỳ cỡ (ảnh, biểu đồ, vòng tiến độ…). */
export function HopCho({
  rong = '100%',
  cao,
  tron = false,
  className = '',
}: {
  rong?: string
  cao: number
  tron?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      style={{ width: rong, height: cao } as CSSProperties}
      className={`block shrink-0 bg-[var(--skeleton-bg)] ${
        tron ? 'rounded-full' : 'rounded-[var(--radius-sm)]'
      } ${NHAP_NHAY} ${className}`}
    />
  )
}

/** Card skeleton của F26: padding 16, cách 10; dòng 40% · 70% (cao 20) · 90% · 60%. */
export function TheCho({ cao = 180, className = '' }: { cao?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      style={{ height: cao } as CSSProperties}
      className={`flex flex-col gap-2.5 rounded-[var(--radius-md)] border border-border bg-surface p-4 ${className}`}
    >
      <DongCho rong="40%" />
      <DongCho rong="70%" cao={20} />
      <DongCho rong="90%" />
      <DongCho rong="60%" />
    </div>
  )
}

/**
 * Vùng đang tải: aria-busy + chữ "Đang tải…" chỉ cho trình đọc màn hình; các khối skeleton bên trong đều
 * aria-hidden. Tải xong thì thay cả vùng bằng nội dung thật (đừng giữ vùng với aria-busy="false" rỗng).
 */
export function VungDangTai({
  nhan = 'Đang tải…',
  children,
  className = '',
}: {
  nhan?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div aria-busy="true" className={className}>
      <span className="sr-only">{nhan}</span>
      {children}
    </div>
  )
}
