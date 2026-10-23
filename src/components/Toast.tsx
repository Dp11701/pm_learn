// C33 Toast (F26, F02b, D23): góc dưới trái, một vùng aria-live polite (role=status) luôn có mặt.
// Tự đóng sau 5 giây; con trỏ hoặc focus ở trong toast thì dừng đếm, rời ra thì đếm tiếp phần còn lại.
// Có hành động tuỳ chọn (vd. "Hoàn tác", "Thử lại") và nút đóng. Hiện tối đa 2 toast (như F26), mới nhất ở dưới.
// Mobile: nằm trên thanh đáy 64px của trang bài, phiên ôn — trang đó gọi useKhoangDayToast(64).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { now } from '../../shared/clock'

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

let demId = 0

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

  const dong = useCallback((id: string) => {
    datDs((cu) => cu.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((tuyChon: TuyChonToast) => {
    demId += 1
    const id = `toast-${demId}`
    datDs((cu) => [...cu, { ...tuyChon, id }].slice(-SO_TOAST_TOI_DA))
    return id
  }, [])

  const api = useMemo(() => ({ toast, dong }), [toast, dong])

  return (
    <NguCanhToast.Provider value={api}>
      <NguCanhKhoangDay.Provider value={datKhoangDay}>
        {children}
        <div
          role="status"
          aria-live="polite"
          aria-label="Thông báo"
          style={{ '--day-toast': `${khoangDay}px` } as CSSProperties}
          className="pointer-events-none fixed bottom-6 left-6 z-[60] flex max-w-[calc(100vw-48px)] flex-col items-start gap-2 max-md:right-4 max-md:bottom-[calc(16px+var(--day-toast))] max-md:left-4 max-md:max-w-none"
        >
          {ds.map((t) => (
            <MotToast key={t.id} muc={t} dong={() => dong(t.id)} />
          ))}
        </div>
      </NguCanhKhoangDay.Provider>
    </NguCanhToast.Provider>
  )
}

function MotToast({ muc, dong }: { muc: MucToast; dong: () => void }) {
  const { noiDung, hanhDong, loai = 'thuong', thoiGian = THOI_GIAN_TOAST } = muc
  const loi = loai === 'loi'
  const [dungHover, datDungHover] = useState(false)
  const [dungFocus, datDungFocus] = useState(false)
  const conLai = useRef(thoiGian ?? 0)
  const dongRef = useRef(dong)
  useEffect(() => {
    dongRef.current = dong
  })

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
      onMouseEnter={() => datDungHover(true)}
      onMouseLeave={() => datDungHover(false)}
      onFocus={() => datDungFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) datDungFocus(false)
      }}
      className={`pointer-events-auto flex max-w-[560px] items-center gap-4 rounded-[var(--radius-md)] py-3 pr-2 pl-4 shadow-[var(--shadow-2)] animate-[hien-dan_150ms_ease-out] max-md:w-full max-md:max-w-none ${lopHop}`}
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
        aria-label="Đóng thông báo"
        onClick={dong}
        className={`-ml-2 inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-150 max-md:size-[var(--h-control-touch)] ${lopDong}`}
      >
        <X size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  )
}
