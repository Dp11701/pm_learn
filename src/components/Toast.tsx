// C33 Toast (F26, F02b, D23): góc dưới trái của vùng nội dung — ≥ 1280 cách mép sidebar, 1024–1279
// cách mép rail (không che chân sidebar / rail: nút Giao diện, "?", đồng hồ), < 1024 cách mép cửa sổ,
// mobile sát lề 16. Toast thường nằm trong một vùng aria-live polite (role=status) luôn có mặt; toast lỗi
// là role=alert như F26, đặt ngoài vùng polite để không bị đọc hai lần.
// Tự đóng sau 5 giây; con trỏ hoặc focus ở trong toast thì dừng đếm, rời ra thì đếm tiếp phần còn lại.
// Có hành động tuỳ chọn (vd. "Hoàn tác", "Thử lại") và nút đóng. Hiện tối đa 2 toast (như F26), mới nhất ở dưới.
// Toast đang giữ focus bị đóng (X, hành động, api.dong, bị toast thứ 3 đẩy ra) thì focus về phần tử có
// focus ngay trước khi vào toast; không còn thì về H1 của trang, rồi <main>.
// Mobile: nằm trên thanh đáy 64px của trang bài, phiên ôn — trang đó gọi useKhoangDayToast(64).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { now } from '../../shared/clock'
import { ID_TIEU_DE_TRANG } from './TieuDeTrang'
import { DONG_THONG_BAO, TEN_VUNG_TOAST } from '../copy/cho-duyet'

export type LoaiToast = 'thuong' | 'loi'

export interface TuyChonToast {
  noiDung: ReactNode
  hanhDong?: { nhan: string; chay: () => void }
  loai?: LoaiToast
  /** ms; mặc định 5000. null = không tự đóng. */
  thoiGian?: number | null
}

export interface ApiToast {
  /** Hiện toast, trả về id để đóng sớm. */
  toast: (tuyChon: TuyChonToast) => string
  dong: (id: string) => void
}

export const THOI_GIAN_TOAST = 5000
export const SO_TOAST_TOI_DA = 2

type MucToast = TuyChonToast & { id: string }

const NguCanhToast = createContext<ApiToast | null>(null)
const NguCanhKhoangDay = createContext<((px: number) => void) | null>(null)

export function useToast(): ApiToast {
  const api = useContext(NguCanhToast)
  if (!api) throw new Error('useToast phải nằm trong <ToastProvider>.')
  return api
}

/** Trang có thanh đáy (mobile) gọi để toast nằm trên thanh đáy; rời trang thì tự trả về 0. */
export function useKhoangDayToast(px: number) {
  const dat = useContext(NguCanhKhoangDay)
  useEffect(() => {
    if (!dat) return
    dat(px)
    return () => dat(0)
  }, [dat, px])
}

// Vị trí khu toast: lề 24 tính từ mép vùng nội dung (sau rail 72 / sidebar 264), mobile lề 16 và
// đẩy lên trên thanh đáy (--day-toast). Bề rộng tối đa trừ cùng phần đó để không tràn mép phải.
const LOP_KHU = [
  'pointer-events-none fixed bottom-6 left-6 z-[60] flex max-w-[calc(100vw-48px)] flex-col items-start',
  'lg:left-[calc(var(--rail-w)+24px)] lg:max-w-[calc(100vw-var(--rail-w)-48px)]',
  'xl:left-[calc(var(--sidebar-w)+24px)] xl:max-w-[calc(100vw-var(--sidebar-w)-48px)]',
  'max-md:right-4 max-md:bottom-[calc(16px+var(--day-toast))] max-md:left-4 max-md:max-w-none max-md:items-stretch',
].join(' ')
const LOP_NHOM = 'flex flex-col items-start max-md:items-stretch'

let demId = 0

/** Có focus được không (còn trong trang, không bị tắt). */
function focusDuoc(el: HTMLElement | null, khu: HTMLElement | null): el is HTMLElement {
  if (!el || !el.isConnected || khu?.contains(el)) return false
  return !(el as HTMLElement & { disabled?: boolean }).disabled
}

export function ToastProvider({
  children,
  khoangDay: khoangDayBanDau = 0,
}: {
  children: ReactNode
  /** Khoảng cách thêm ở đáy (px) trên mobile, vd. 64 khi có thanh đáy. */
  khoangDay?: number
}) {
  const [ds, datDs] = useState<MucToast[]>([])
  const [khoangDay, datKhoangDay] = useState(khoangDayBanDau)
  const khuRef = useRef<HTMLDivElement>(null)
  // Phần tử có focus ngay trước khi focus đi vào khu toast.
  const truocToast = useRef<HTMLElement | null>(null)
  // Một toast đang giữ focus vừa bị gỡ: trả focus sau khi DOM cập nhật.
  const canTraFocus = useRef(false)

  const dong = useCallback((id: string) => {
    datDs((cu) => cu.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((tuyChon: TuyChonToast) => {
    demId += 1
    const id = `toast-${demId}`
    datDs((cu) => [...cu, { ...tuyChon, id }].slice(-SO_TOAST_TOI_DA))
    return id
  }, [])

  const baoMatFocus = useCallback(() => {
    canTraFocus.current = true
  }, [])

  useLayoutEffect(() => {
    if (!canTraFocus.current) return
    canTraFocus.current = false
    // Việc khác (vd. hành động mở dialog) đã nhận focus thì để yên.
    const dangCo = document.activeElement
    if (dangCo && dangCo !== document.body) return
    const khu = khuRef.current
    const ungVien = [
      truocToast.current,
      document.getElementById(ID_TIEU_DE_TRANG),
      document.querySelector('main'),
    ]
    for (const el of ungVien) {
      if (!focusDuoc(el, khu)) continue
      // H1 / <main> chỉ là mốc cho Tab tiếp theo: không kéo trang lên đầu.
      el.focus({ preventScroll: el !== truocToast.current })
      if (document.activeElement === el) break
    }
    truocToast.current = null
  }, [ds])

  function khiFocusVao(e: FocusEvent<HTMLDivElement>) {
    const tu = e.relatedTarget
    if (tu instanceof Node && e.currentTarget.contains(tu)) return
    truocToast.current = tu instanceof HTMLElement ? tu : null
  }

  const api = useMemo(() => ({ toast, dong }), [toast, dong])

  // Toast thường và toast lỗi ở hai nhóm (vùng polite / các role=alert); `order` giữ thứ tự thời gian
  // trên màn hình: nhóm chứa toast mới nhất nằm dưới (đủ cho tối đa 2 toast).
  const dau = ds[0]?.id
  const moiNhatLaLoi = ds.at(-1)?.loai === 'loi'
  const ve = (t: MucToast) => (
    <MotToast
      key={t.id}
      muc={t}
      dau={t.id === dau}
      dong={() => dong(t.id)}
      baoMatFocus={baoMatFocus}
    />
  )

  return (
    <NguCanhToast.Provider value={api}>
      <NguCanhKhoangDay.Provider value={datKhoangDay}>
        {children}
        <div
          ref={khuRef}
          onFocus={khiFocusVao}
          style={{ '--day-toast': `${khoangDay}px` } as CSSProperties}
          className={LOP_KHU}
        >
          <div
            role="status"
            aria-live="polite"
            aria-label={TEN_VUNG_TOAST}
            style={{ order: moiNhatLaLoi ? 0 : 1 }}
            className={LOP_NHOM}
          >
            {ds.filter((t) => t.loai !== 'loi').map(ve)}
          </div>
          <div style={{ order: moiNhatLaLoi ? 1 : 0 }} className={LOP_NHOM}>
            {ds.filter((t) => t.loai === 'loi').map(ve)}
          </div>
        </div>
      </NguCanhKhoangDay.Provider>
    </NguCanhToast.Provider>
  )
}

function MotToast({
  muc,
  dau,
  dong,
  baoMatFocus,
}: {
  muc: MucToast
  /** Toast cũ nhất (trên cùng): không có lề trên. */
  dau: boolean
  dong: () => void
  baoMatFocus: () => void
}) {
  const { noiDung, hanhDong, loai = 'thuong', thoiGian = THOI_GIAN_TOAST } = muc
  const loi = loai === 'loi'
  const [dungHover, datDungHover] = useState(false)
  const [dungFocus, datDungFocus] = useState(false)
  const conLai = useRef(thoiGian ?? 0)
  const dongRef = useRef(dong)
  const hopRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    dongRef.current = dong
  })

  // Dọn layout effect chạy khi toast bị gỡ, trước khi nút DOM bị xoá: lúc đó còn biết focus có ở
  // trong toast không (sau khi xoá, focus rơi về <body>).
  useLayoutEffect(() => {
    const hop = hopRef.current
    return () => {
      if (hop?.contains(document.activeElement)) baoMatFocus()
    }
  }, [baoMatFocus])

  const tamDung = dungHover || dungFocus
  useEffect(() => {
    if (thoiGian == null || tamDung) return
    const batDau = now()
    const hen = setTimeout(() => dongRef.current(), conLai.current)
    return () => {
      clearTimeout(hen)
      conLai.current = Math.max(0, conLai.current - (now() - batDau))
    }
  }, [thoiGian, tamDung])

  // Toast thường: nền mực, chữ on-primary; vòng focus của nút bên trong đổi sang on-primary để còn thấy.
  const lopHop = loi
    ? 'border-[1.5px] border-danger bg-surface text-text'
    : 'bg-primary text-on-primary'
  const lopNut = loi
    ? 'border border-border-input bg-surface text-text hover:bg-surface-2'
    : 'border border-on-primary bg-transparent text-on-primary hover:bg-[color-mix(in_srgb,var(--on-primary)_14%,transparent)] focus-visible:outline-on-primary'
  const lopDong = loi
    ? 'text-text hover:bg-surface-2'
    : 'text-on-primary hover:bg-[color-mix(in_srgb,var(--on-primary)_14%,transparent)] focus-visible:outline-on-primary'

  return (
    <div
      ref={hopRef}
      role={loi ? 'alert' : undefined}
      onMouseEnter={() => datDungHover(true)}
      onMouseLeave={() => datDungHover(false)}
      onFocus={() => datDungFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) datDungFocus(false)
      }}
      className={`pointer-events-auto flex max-w-[560px] items-center gap-4 rounded-[var(--radius-md)] py-3 pr-2 pl-4 shadow-[var(--shadow-2)] animate-[hien-dan_150ms_ease-out] max-md:w-full max-md:max-w-none ${dau ? '' : 'mt-2'} ${lopHop}`}
      data-loai={loai}
    >
      <span className={`min-w-0 flex-1 ${loi ? 'font-semibold text-danger' : ''}`}>{noiDung}</span>
      {hanhDong && (
        <button
          type="button"
          onClick={() => {
            hanhDong.chay()
            dong()
          }}
          className={`h-8 shrink-0 rounded-[var(--radius-sm)] px-2.5 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-semibold transition-colors duration-150 max-md:h-[var(--h-control-touch)] ${lopNut}`}
        >
          {hanhDong.nhan}
        </button>
      )}
      <button
        type="button"
        aria-label={DONG_THONG_BAO}
        onClick={dong}
        className={`-ml-2 inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-150 max-md:size-[var(--h-control-touch)] ${lopDong}`}
      >
        <X size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  )
}
