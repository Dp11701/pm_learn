// C32 Dialog / sheet (F19, F27, F13, F28, F01 "bo 14") trên Radix Dialog: giữ focus bên trong, trả focus
// về nơi mở, Esc đóng — trừ khi Telex/VNI đang ghép chữ (Esc lúc đó chỉ huỷ ghép, đề xuất 5).
// Sáng: nền surface-dialog + shadow-3; Tối: nền surface-dialog (= surface-2) + viền border-dialog, không bóng.
// Dạng:
// - giua: dialog giữa màn hình (F19), bo 14, padding 24, cách đỉnh 56;
// - phai: panel trượt 360px từ phải (đề xuất 4.4); dưới 768px thành bottom sheet (F13);
// - duoi: bottom sheet (F13) — bo 14 hai góc trên, thanh kéo 36×4;
// - trai: drawer từ trái, mặc định 312px (F28), không bo góc;
// - toan-man-hinh: sheet phủ kín màn hình (vd. tìm kiếm trên mobile, đề xuất 4.3).
// vaiTro="alertdialog" (F19 phải, xoá): không đóng khi bấm ra ngoài, không có nút X mặc định.
import {
  useRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import Nut from './Nut'
import { dangGhepChu } from './TruongNhap'
import { ID_TIEU_DE_TRANG } from './TieuDeTrang'

export type DangHopThoai = 'giua' | 'phai' | 'duoi' | 'trai' | 'toan-man-hinh'

export interface PropsHopThoai {
  mo: boolean
  doiMo: (mo: boolean) => void
  tieuDe: ReactNode
  /** Ẩn tiêu đề khỏi màn hình (vẫn là tên của dialog cho trình đọc màn hình), vd. drawer "Menu". */
  anTieuDe?: boolean
  /** Dòng phụ dưới tiêu đề, 13/20 muted (F19 "{tên mục} · Chủ đề"). */
  phuDe?: ReactNode
  /** Đoạn mô tả (aria-describedby), 15/24 muted (F19 alertdialog). */
  moTa?: ReactNode
  vaiTro?: 'dialog' | 'alertdialog'
  dang?: DangHopThoai
  /** Bề rộng px: giua mặc định 520 (F19 có 520 và 640), phai 360, trai 312. */
  rong?: number
  /** Nút X "Đóng" ở đầu. Mặc định có, trừ alertdialog và khi anTieuDe. */
  nutDong?: boolean
  /** Phần tử nhận focus khi mở (F19 "Quay lại học tiếp"); không có thì Radix chọn phần tử đầu tiên. */
  focusDau?: RefObject<HTMLElement | null>
  /** Hàng nút cuối (canh phải, cách 8). */
  chan?: ReactNode
  children?: ReactNode
  /** Nút mở (Radix Trigger asChild): focus trả về đây khi đóng. Không có thì trả về phần tử đã focus trước. */
  nutMo?: ReactElement
  className?: string
}

const NOI_DUNG_CHUNG =
  'fixed z-50 flex flex-col bg-[var(--surface-dialog)] text-text outline-none border border-[var(--border-dialog)]'

// Chuyển động: trượt khi motion-safe; reduced-motion chỉ cross-fade (§5.2).
const HIEN =
  'motion-reduce:data-[state=open]:animate-[hien-dan_150ms_ease-out] motion-reduce:data-[state=closed]:animate-[an-dan_150ms_ease-in]'
const TRUOT_DUOI =
  'motion-safe:data-[state=open]:animate-[vao-tu-duoi_200ms_ease-out] motion-safe:data-[state=closed]:animate-[ra-duoi_150ms_ease-in]'

const KIEU_DANG: Record<DangHopThoai, string> = {
  giua: `top-14 left-1/2 max-h-[calc(100dvh-112px)] w-[min(var(--rong),calc(100vw-32px))] -translate-x-1/2 gap-4 overflow-y-auto rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-3)] max-md:top-4 max-md:max-h-[calc(100dvh-32px)] data-[state=open]:animate-[hien-dan_150ms_ease-out] data-[state=closed]:animate-[an-dan_150ms_ease-in]`,
  // < 768: bottom sheet như F13; ≥ 768: panel phải cao hết màn hình, bo 14 hai góc trái (F02b C3).
  phai: `inset-x-0 bottom-0 max-h-[85dvh] gap-2 overflow-y-auto rounded-t-[var(--radius-lg)] px-4 pt-2 pb-6 shadow-[var(--shadow-sheet)] ${TRUOT_DUOI} md:inset-x-auto md:top-0 md:right-0 md:h-dvh md:max-h-none md:w-[min(var(--rong),100vw)] md:gap-4 md:rounded-tr-none md:rounded-bl-[var(--radius-lg)] md:p-6 md:shadow-[var(--shadow-3)] md:motion-safe:data-[state=open]:animate-[vao-tu-phai_200ms_ease-out] md:motion-safe:data-[state=closed]:animate-[ra-phai_150ms_ease-in] ${HIEN}`,
  duoi: `inset-x-0 bottom-0 max-h-[85dvh] gap-2 overflow-y-auto rounded-t-[var(--radius-lg)] px-4 pt-2 pb-6 shadow-[var(--shadow-sheet)] ${TRUOT_DUOI} ${HIEN}`,
  trai: `top-0 bottom-0 left-0 w-[min(var(--rong),100vw)] overflow-y-auto shadow-[var(--shadow-3)] motion-safe:data-[state=open]:animate-[vao-tu-trai_200ms_ease-out] motion-safe:data-[state=closed]:animate-[ra-trai_150ms_ease-in] ${HIEN}`,
  'toan-man-hinh': `inset-0 gap-4 overflow-y-auto p-4 md:p-6 data-[state=open]:animate-[hien-dan_150ms_ease-out] data-[state=closed]:animate-[an-dan_150ms_ease-in]`,
}

const RONG_MAC_DINH: Partial<Record<DangHopThoai, string>> = {
  giua: '520px',
  phai: 'var(--panel-truot-w)',
  trai: '312px',
}

// Tiêu đề: dialog 22/32 (F19, F27); sheet, panel 17/28 (F13).
const LOP_TIEU_DE: Record<DangHopThoai, string> = {
  giua: 'text-[length:var(--fs-h2)] leading-[var(--lh-h2)] max-md:text-[length:var(--fs-h2-m)] max-md:leading-[var(--lh-h2-m)]',
  phai: 'text-[17px] leading-7',
  duoi: 'text-[17px] leading-7',
  trai: 'text-[17px] leading-7',
  'toan-man-hinh': 'text-[17px] leading-7',
}

function ThanhKeo({ chiMobile }: { chiMobile?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mb-2 h-1 w-9 shrink-0 self-center rounded-[2px] bg-[var(--sheet-handle)] ${
        chiMobile ? 'md:hidden' : ''
      }`}
    />
  )
}

export default function HopThoai({
  mo,
  doiMo,
  tieuDe,
  anTieuDe = false,
  phuDe,
  moTa,
  vaiTro = 'dialog',
  dang = 'giua',
  rong,
  nutDong,
  focusDau,
  chan,
  children,
  nutMo,
  className = '',
}: PropsHopThoai) {
  const alert = vaiTro === 'alertdialog'
  const coNutDong = nutDong ?? (!alert && !anTieuDe)
  const coDau = !anTieuDe || coNutDong
  // Mở bằng state (phím tắt, menu) thì Radix không có trigger để trả focus: tự nhớ phần tử đã focus.
  const truocKhiMo = useRef<Element | null>(null)
  const tieuDeEl = (
    <Dialog.Title className={anTieuDe ? 'sr-only' : `m-0 font-semibold ${LOP_TIEU_DE[dang]}`}>
      {tieuDe}
    </Dialog.Title>
  )
  return (
    <Dialog.Root open={mo} onOpenChange={doiMo}>
      {nutMo && <Dialog.Trigger asChild>{nutMo}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--scrim)] data-[state=open]:animate-[hien-dan_150ms_ease-out] data-[state=closed]:animate-[an-dan_150ms_ease-in]" />
        <Dialog.Content
          role={vaiTro}
          aria-modal="true"
          // Không có mô tả: bỏ aria-describedby Radix tự gắn (và tránh cảnh báo thiếu Description).
          {...(moTa == null ? { 'aria-describedby': undefined } : {})}
          style={{ '--rong': rong ? `${rong}px` : RONG_MAC_DINH[dang] } as CSSProperties}
          className={`${NOI_DUNG_CHUNG} ${KIEU_DANG[dang]} ${className}`}
          onEscapeKeyDown={(e) => {
            // Esc lúc đang ghép chữ chỉ huỷ ghép, không đóng.
            if (dangGhepChu(e)) e.preventDefault()
          }}
          onPointerDownOutside={alert ? (e) => e.preventDefault() : undefined}
          onInteractOutside={alert ? (e) => e.preventDefault() : undefined}
          onOpenAutoFocus={(e) => {
            truocKhiMo.current = document.activeElement
            const dich = focusDau?.current
            if (dich) {
              e.preventDefault()
              dich.focus()
            }
          }}
          onCloseAutoFocus={(e) => {
            if (nutMo) return
            e.preventDefault()
            const truoc = truocKhiMo.current
            // Phần tử cũ đã biến mất (vd. mục menu) → về H1 của trang.
            const dich =
              truoc instanceof HTMLElement && truoc.isConnected && truoc !== document.body
                ? truoc
                : document.getElementById(ID_TIEU_DE_TRANG)
            dich?.focus()
          }}
        >
          {(dang === 'duoi' || dang === 'phai') && <ThanhKeo chiMobile={dang === 'phai'} />}
          {anTieuDe && tieuDeEl}
          {coDau && (
            <div className="flex items-start justify-between gap-3">
              {!anTieuDe && (
                <div className="flex min-w-0 flex-col gap-0.5">
                  {tieuDeEl}
                  {phuDe != null && (
                    <span className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
                      {phuDe}
                    </span>
                  )}
                </div>
              )}
              {coNutDong && (
                <Dialog.Close asChild>
                  <Nut bien="ghost" chiIcon icon={X} aria-label="Đóng" className="ml-auto" />
                </Dialog.Close>
              )}
            </div>
          )}
          {moTa != null && (
            <Dialog.Description className="m-0 text-muted">{moTa}</Dialog.Description>
          )}
          {children}
          {chan != null && <div className="flex flex-wrap justify-end gap-2">{chan}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
