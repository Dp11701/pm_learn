// C10 Thanh 4 bước (F02, F11, §1, đề xuất 3.2; quyết định 1: màu mực, không dùng xanh lá).
// Bản đầy đủ ở đầu bài: lưới 4 cột cách 8 (mobile 2×2 — frame không vẽ, tự đặt để không cắt chữ),
// mỗi bước cao 40 (mobile 44), viền 1px, bo 6, chữ 15/24,
// chấm 20px — Xong: check trên nền mực · Đang làm: vòng mực 2px có chấm 8px, viền bước 1,5px mực,
// chữ 600, aria-current="step" · Chưa làm: vòng rỗng viền border-input · Không áp dụng: vòng rỗng có
// gạch ngang. Bấm bước cuộn tới khối tương ứng (link #neo).
// Bản mini trên thẻ, hàng: 4 ô 14×6 cách 3 + "2/4 · Tiếp: Áp dụng"; aria theo D34.
import type { MouseEvent } from 'react'
import { Check, CircleAlert, Minus } from 'lucide-react'
import {
  CAC_BUOC,
  TEN_BUOC,
  type Buoc,
  type TinhTrangBuoc,
} from '../../../shared/domain/trang-thai'
import { LOP_CHU_META } from './mau-trang-thai'

export type TinhTrangBonBuoc = Record<Buoc, TinhTrangBuoc>

const CHU_TINH_TRANG: Record<TinhTrangBuoc, string> = {
  xong: 'xong',
  'dang-lam': 'đang làm',
  'chua-lam': 'chưa làm',
  'khong-ap-dung': 'không áp dụng',
}

// Chữ cho trình đọc màn hình ở bản đầy đủ khi không có chữ hiện ra (F11 "— đã xong").
const CHU_DOC: Record<TinhTrangBuoc, string> = { ...CHU_TINH_TRANG, xong: 'đã xong' }

/** Bước tính là đã qua (x/4 đếm cả Không áp dụng — đề xuất 3.2). */
function daQua(tt: TinhTrangBuoc) {
  return tt === 'xong' || tt === 'khong-ap-dung'
}

/** Số bước đã qua (xong + không áp dụng). */
export function soBuocXong(tinhTrang: TinhTrangBonBuoc): number {
  return CAC_BUOC.filter((b) => daQua(tinhTrang[b])).length
}

/** Bước chưa qua đầu tiên ("Tiếp: <bước>"); null khi đủ 4. */
export function buocTiep(tinhTrang: TinhTrangBonBuoc): Buoc | null {
  return CAC_BUOC.find((b) => !daQua(tinhTrang[b])) ?? null
}

/** aria của bản mini (D34): "4 bước: Hiểu xong, Áp dụng đang làm, Kiểm tra chưa làm, Ghi nhớ xong". */
export function nhanBonBuoc(tinhTrang: TinhTrangBonBuoc): string {
  return `4 bước: ${CAC_BUOC.map((b) => `${TEN_BUOC[b]} ${CHU_TINH_TRANG[tinhTrang[b]]}`).join(', ')}`
}

/** Chữ cạnh bản mini: "2/4 · Tiếp: Áp dụng"; chưa bắt đầu hoặc đủ 4 thì chỉ "x/4" (F02). */
export function chuBonBuoc(tinhTrang: TinhTrangBonBuoc): string {
  const xong = soBuocXong(tinhTrang)
  const tiep = buocTiep(tinhTrang)
  return xong > 0 && tiep ? `${xong}/4 · Tiếp: ${TEN_BUOC[tiep]}` : `${xong}/4`
}

// ---------- Bản đầy đủ ----------

function ChamBuoc({ tt, voHieu }: { tt: TinhTrangBuoc; voHieu: boolean }) {
  const nen = 'flex size-5 shrink-0 items-center justify-center rounded-full'
  if (voHieu) return <span aria-hidden="true" className={`${nen} border-[1.5px] border-border`} />
  switch (tt) {
    case 'xong':
      return (
        <span aria-hidden="true" className={`${nen} bg-primary text-on-primary`}>
          <Check size={12} strokeWidth={3} />
        </span>
      )
    case 'dang-lam':
      return (
        <span aria-hidden="true" className={`${nen} border-2 border-primary`}>
          <span className="size-2 rounded-full bg-primary" />
        </span>
      )
    case 'khong-ap-dung':
      return (
        <span aria-hidden="true" className={`${nen} border-[1.5px] border-border-input text-muted`}>
          <Minus size={12} strokeWidth={2.5} />
        </span>
      )
    default:
      return <span aria-hidden="true" className={`${nen} border-[1.5px] border-border-input`} />
  }
}

export interface PropsThanhBonBuoc {
  tinhTrang: TinhTrangBonBuoc
  /** Neo của khối từng bước (vd. { hieu: '#b-noi-lai' }); bước không có neo thì không bấm được. */
  lienKet?: Partial<Record<Buoc, string>>
  /** Gọi khi bấm một bước (vd. đưa focus vào khối sau khi cuộn). */
  khiChon?: (buoc: Buoc, e: MouseEvent<HTMLAnchorElement>) => void
  /** Chữ sau tên bước, vd. { 'kiem-tra': 'Không áp dụng · chưa có câu hỏi' }. Mặc định: Đang làm →
   *  "đang làm", Không áp dụng → "Không áp dụng". */
  ghiChu?: Partial<Record<Buoc, string>>
  /** Bước không bấm được (vd. Kiểm tra chưa có câu hỏi — D8): nền surface-2, chữ muted. */
  voHieu?: readonly Buoc[]
  /** Không đọc được tiến độ bước. */
  loi?: boolean
  thuLai?: () => void
  className?: string
}

const GHI_CHU_MAC_DINH: Partial<Record<TinhTrangBuoc, string>> = {
  'dang-lam': 'đang làm',
  'khong-ap-dung': 'Không áp dụng',
}

export default function ThanhBonBuoc({
  tinhTrang,
  lienKet = {},
  khiChon,
  ghiChu = {},
  voHieu = [],
  loi = false,
  thuLai,
  className = '',
}: PropsThanhBonBuoc) {
  if (loi)
    return (
      <p className={`m-0 flex items-center gap-3 text-danger ${LOP_CHU_META} ${className}`}>
        <CircleAlert size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
        <span>
          Lỗi: không đọc được tiến độ bước
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
      </p>
    )
  // Có bước bấm được thì là <nav> (F11); không có link thì chỉ là nhóm có nhãn.
  const coLink = CAC_BUOC.some((b) => lienKet[b] && !voHieu.includes(b))
  const Khung = coLink ? 'nav' : 'div'
  return (
    <Khung role={coLink ? undefined : 'group'} aria-label="Bốn bước học" className={className}>
      <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0 md:grid-cols-4">
        {CAC_BUOC.map((b) => {
          const tt = tinhTrang[b]
          const tat = voHieu.includes(b)
          const dangLam = tt === 'dang-lam' && !tat
          const chu = ghiChu[b] ?? GHI_CHU_MAC_DINH[tt]
          const href = tat ? undefined : lienKet[b]
          const lop = `flex h-10 min-w-0 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] no-underline max-md:h-[var(--h-control-touch)] ${
            dangLam ? 'border-[1.5px] border-primary font-semibold' : 'border border-border'
          } ${tat ? 'bg-surface-2 text-muted' : 'bg-surface text-text'} ${
            href ? 'transition-colors duration-150 hover:bg-surface-2' : ''
          }`
          const noiDung = (
            <>
              <ChamBuoc tt={tt} voHieu={tat} />
              {/* Ghi chú dài bị cắt "…" khi cột hẹp (F11 ở 720 đã tràn 8px): title giữ đủ chữ khi rê chuột */}
              <span
                className="min-w-0 truncate"
                title={chu ? `${TEN_BUOC[b]} · ${chu}` : undefined}
              >
                {/* Khoảng trắng nằm ngoài span để tên truy cập không dính chữ ("Hiểu — đã xong") */}
                {TEN_BUOC[b]}{' '}
                {chu ? (
                  <span className={`font-normal ${LOP_CHU_META} ${tat ? '' : 'text-muted'}`}>
                    · {chu}
                  </span>
                ) : (
                  <span className="sr-only">— {CHU_DOC[tt]}</span>
                )}
              </span>
            </>
          )
          return (
            <li key={b} className="min-w-0" data-buoc={b} data-tinh-trang={tt}>
              {href ? (
                <a
                  href={href}
                  aria-current={dangLam ? 'step' : undefined}
                  onClick={khiChon ? (e) => khiChon(b, e) : undefined}
                  className={lop}
                >
                  {noiDung}
                </a>
              ) : (
                <div aria-current={dangLam ? 'step' : undefined} className={lop}>
                  {noiDung}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </Khung>
  )
}

// ---------- Bản mini ----------

const O_MINI: Record<TinhTrangBuoc, string> = {
  xong: 'bg-primary',
  'dang-lam':
    'border-[1.5px] border-primary bg-[linear-gradient(90deg,var(--primary)_50%,transparent_50%)]',
  'chua-lam': 'border border-border-input',
  // Tự đặt (frame không vẽ): ô rỗng có gạch giữa, như chấm "Không áp dụng" của bản đầy đủ.
  'khong-ap-dung':
    'border border-border-input bg-[linear-gradient(var(--text-muted),var(--text-muted))] bg-[length:8px_1px] bg-center bg-no-repeat',
}

export interface PropsBonBuocMini {
  tinhTrang: TinhTrangBonBuoc
  /** Hiện "2/4 · Tiếp: Áp dụng" bên phải (mặc định có). */
  coChu?: boolean
  className?: string
}

export function BonBuocMini({ tinhTrang, coChu = true, className = '' }: PropsBonBuocMini) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span role="img" aria-label={nhanBonBuoc(tinhTrang)} className="flex shrink-0 gap-[3px]">
        {CAC_BUOC.map((b) => (
          <span
            key={b}
            data-tinh-trang={tinhTrang[b]}
            className={`h-1.5 w-3.5 rounded-[2px] ${O_MINI[tinhTrang[b]]}`}
          />
        ))}
      </span>
      {coChu && (
        <span className={`text-muted tabular-nums ${LOP_CHU_META}`}>{chuBonBuoc(tinhTrang)}</span>
      )}
    </span>
  )
}
