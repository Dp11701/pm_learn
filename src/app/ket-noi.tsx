// Kết nối với máy chủ cục bộ (đề xuất 1.10, §5 "Không trắng màn hình", F26): hỏi GET /api/meta mỗi 5 giây,
// đồng bộ đồng hồ (shared/clock) theo giờ server nên qua nửa đêm tự cập nhật; lỗi → banner mất kết nối
// dính đầu trang, vẫn tự thử lại mỗi 5 giây, có nút "Thử ngay".
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { WifiOff } from 'lucide-react'
import { z } from 'zod'
import { datLech, layLech, now } from '../../shared/clock'
import Banner from '../components/Banner'
import Nut from '../components/Nut'
import { useToast } from '../components/Toast'

export type TrangThaiKetNoi = 'dang-ket-noi' | 'on-dinh' | 'mat-ket-noi'

/** Phản hồi GET /api/meta (server/routes/meta.ts). */
export interface Meta {
  revision: number
  now: string
  homNay: string
  soMucHoc: number
}

export interface GiaTriKetNoi {
  trangThai: TrangThaiKetNoi
  meta: Meta | null
  /** Hỏi lại ngay (nút "Thử ngay"); xong thì promise xong. */
  thuNgay: () => Promise<void>
  /** Đang chạy một lần "Thử ngay". */
  dangThu: boolean
}

export const DUONG_DAN_META = '/api/meta'
/** Chu kỳ hỏi /api/meta, cũng là khoảng tự thử lại khi mất kết nối (ms). */
export const CHU_KY_HOI = 5000
/** Quá thời gian này chưa có phản hồi thì coi là mất kết nối (ms). */
export const HET_HAN_HOI = 4000

const LuocDoMeta = z.object({
  revision: z.number(),
  now: z.string(),
  homNay: z.string(),
  soMucHoc: z.number(),
})

export async function hoiMeta(signal?: AbortSignal): Promise<Meta> {
  const phanHoi = await fetch(DUONG_DAN_META, {
    signal,
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!phanHoi.ok) throw new Error(`GET ${DUONG_DAN_META}: ${phanHoi.status}`)
  return LuocDoMeta.parse(await phanHoi.json())
}

/** Đặt độ lệch đồng hồ = giờ server − giờ máy lúc nhận phản hồi. */
export function dongBoDongHo(meta: Meta): void {
  const gioServer = Date.parse(meta.now)
  if (Number.isNaN(gioServer)) return
  const gioMay = now() - layLech()
  datLech(gioServer - gioMay)
}

const MAC_DINH: GiaTriKetNoi = {
  trangThai: 'dang-ket-noi',
  meta: null,
  thuNgay: async () => {},
  dangThu: false,
}

const NguCanhKetNoi = createContext<GiaTriKetNoi>(MAC_DINH)

export function KetNoiProvider({ children }: { children: ReactNode }) {
  const [trangThai, datTrangThai] = useState<TrangThaiKetNoi>('dang-ket-noi')
  const [meta, datMeta] = useState<Meta | null>(null)
  const [dangThu, datDangThu] = useState(false)
  const hoiRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    let daHuy = false
    let hen: ReturnType<typeof setTimeout> | undefined
    let hienTai: AbortController | undefined

    async function hoi() {
      clearTimeout(hen)
      hienTai?.abort()
      const dk = new AbortController()
      hienTai = dk
      const hetHan = setTimeout(() => dk.abort(), HET_HAN_HOI)
      try {
        const m = await hoiMeta(dk.signal)
        if (daHuy || dk !== hienTai) return
        dongBoDongHo(m)
        datMeta(m)
        datTrangThai('on-dinh')
      } catch {
        // Lần hỏi bị thay bằng lần mới ("Thử ngay") thì bỏ qua; quá hạn vẫn tính là mất kết nối.
        if (daHuy || dk !== hienTai) return
        datTrangThai('mat-ket-noi')
      } finally {
        clearTimeout(hetHan)
        if (!daHuy && dk === hienTai) hen = setTimeout(hoi, CHU_KY_HOI)
      }
    }

    function khiHienLai() {
      if (document.visibilityState === 'visible') void hoi()
    }

    hoiRef.current = hoi
    void hoi()
    document.addEventListener('visibilitychange', khiHienLai)
    return () => {
      daHuy = true
      clearTimeout(hen)
      hienTai?.abort()
      document.removeEventListener('visibilitychange', khiHienLai)
    }
  }, [])

  const thuNgay = useCallback(async () => {
    datDangThu(true)
    try {
      await hoiRef.current()
    } finally {
      datDangThu(false)
    }
  }, [])

  const giaTri = useMemo(
    () => ({ trangThai, meta, thuNgay, dangThu }),
    [trangThai, meta, thuNgay, dangThu],
  )
  return <NguCanhKetNoi.Provider value={giaTri}>{children}</NguCanhKetNoi.Provider>
}

/** Ngoài KetNoiProvider trả trạng thái 'dang-ket-noi', meta null (test component riêng lẻ không cần bọc). */
export function useKetNoi(): GiaTriKetNoi {
  return useContext(NguCanhKetNoi)
}

/**
 * Banner dính đầu trang khi mất kết nối (F26, C26 biến thể lỗi D30): role=alert, câu phụ aria-live.
 * Khung app đặt ở đầu cột nội dung; trang ngoài khung (trình soạn) tự đặt.
 */
export function BannerMatKetNoi({ className = '' }: { className?: string }) {
  const { trangThai, thuNgay, dangThu } = useKetNoi()
  if (trangThai !== 'mat-ket-noi') return null
  return (
    <Banner
      loai="loi"
      dinh
      icon={WifiOff}
      tieuDe="Mất kết nối với máy chủ cục bộ."
      moTa="Tự thử lại sau 5 giây… Nội dung đang gõ được giữ nguyên."
      moTaLive
      hanhDong={
        <Nut bien="phu" dangXuLy={dangThu} onClick={() => void thuNgay()}>
          Thử ngay
        </Nut>
      }
      className={className}
    />
  )
}

/** Toast khi kết nối trở lại sau lúc mất (cần ToastProvider phía trên; GocApp đặt sẵn). */
export function ThongBaoKetNoiLai() {
  const { trangThai } = useKetNoi()
  const { toast } = useToast()
  const truoc = useRef(trangThai)
  useEffect(() => {
    if (truoc.current === 'mat-ket-noi' && trangThai === 'on-dinh') {
      toast({ noiDung: 'Đã kết nối lại với máy chủ cục bộ.' })
    }
    truoc.current = trangThai
  }, [trangThai, toast])
  return null
}
