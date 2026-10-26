// Phần dùng chung của gallery F02, F02b: đầu mục, ô mẫu có chú thích, tra mục mẫu trong cây.
import type { ReactNode } from 'react'
import { SapCo } from '../../components/TrangThaiTrong'
import { layCay, type MucHoc } from '../../../shared/roadmap'

export const META = 'text-[length:var(--fs-meta)] leading-[var(--lh-meta)]'
/** Câu chú thích dưới mỗi nhóm mẫu (13/20 muted như frame). */
export const GHI_CHU = `m-0 ${META} text-muted`
export const THE = 'rounded-[var(--radius-md)] border border-border bg-surface'

/** Hàm rỗng cho nút mẫu (Thử lại, đổi trạng thái…) chỉ để thấy trạng thái. */
export const khongLamGi = () => {}

/** Mục học có tên này trong cây (tên mẫu ở fixtures); không có thì undefined. */
export function timMuc(ten: string): MucHoc | undefined {
  try {
    return layCay().mucHoc.find((m) => m.label === ten)
  } catch {
    return undefined
  }
}

/** Đầu trang gallery: nhãn frame mono, H1, đoạn mô tả (F02 / F02b). */
export function DauTrang({
  nhan,
  tieuDe,
  children,
}: {
  nhan: string
  tieuDe: string
  children: ReactNode
}) {
  return (
    <header className="flex flex-col gap-2 border-b border-border pb-8">
      <span className={`font-mono ${META} text-muted`}>{nhan}</span>
      <h1 className="m-0 text-[length:var(--fs-h1)] leading-[var(--lh-h1)] font-bold max-md:text-[length:var(--fs-h1-m)] max-md:leading-[var(--lh-h1-m)]">
        {tieuDe}
      </h1>
      {children}
    </header>
  )
}

/** Đầu mục F02: mã component mono 13 + H2 22/32. */
export function DauMuc({
  ma,
  ten,
  className = '',
}: {
  ma: string
  ten: string
  className?: string
}) {
  return (
    <div className={`flex items-baseline gap-3 ${className}`}>
      <span className={`shrink-0 font-mono ${META} text-muted`}>{ma}</span>
      <h2 className="m-0 text-[length:var(--fs-h2)] leading-[var(--lh-h2)] font-semibold max-md:text-[length:var(--fs-h2-m)] max-md:leading-[var(--lh-h2-m)]">
        {ten}
      </h2>
    </div>
  )
}

/** Ô mẫu: component rồi chú thích 12/18 bên dưới (đỏ khi là trạng thái lỗi, như frame). */
export function O({
  nhan,
  loi = false,
  className = '',
  children,
}: {
  nhan: ReactNode
  loi?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`flex min-w-0 flex-col items-start gap-1.5 ${className}`}>
      {children}
      <span
        className={`text-[length:var(--fs-chip)] leading-[var(--lh-chip)] ${loi ? 'text-danger' : 'text-muted'}`}
      >
        {nhan}
      </span>
    </div>
  )
}

/** Hàng giữ chỗ cho component chưa dựng (C38 "Có ở phase n"); không vẽ giả component. */
export function ChoPhase({
  phase,
  ten,
  moTa,
}: {
  phase: number | string
  ten?: string
  moTa?: ReactNode
}) {
  return <SapCo phase={phase} tieuDe={ten} moTa={moTa} khung className="w-full" />
}
