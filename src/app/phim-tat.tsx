// Sổ phím tắt dùng chung (§11, đề xuất 5): một bảng cho cả bộ xử lý toàn cục và bảng F27.
// So theo e.code (vị trí phím vật lý) nên Telex/VNI không biến "[" thành "ơ". Bỏ qua khi: đang gõ
// (ô nhập, contenteditable, CodeMirror), IME đang ghép chữ, giữ Alt/Ctrl/⌘ (Shift chỉ cho "?"),
// đang mở dialog modal (Radix tự xử lý Esc) hoặc focus ở menu/listbox/combobox (chúng tự xử lý phím).
// Trang đăng ký phím của mình bằng usePhimTat; cùng một phím thì nơi đăng ký sau cùng (lớp trên cùng) nhận.
// F27 hiện đủ bảng §11 như frame, kể cả phím của màn hình phase sau (cột phase trong sổ ghi lúc có tác dụng).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import BangPhimTat from '../components/BangPhimTat'
import { CAC_TRANG_THAI_HOC, TEN_TRANG_THAI_HOC } from '../../shared/domain/trang-thai'

/** Phím bộ xử lý toàn cục nhận: e.code, riêng "?" là Shift + Slash. */
export type MaPhimToanCuc =
  | 'Shift+Slash'
  | 'Slash'
  | 'Escape'
  | 'BracketLeft'
  | 'BracketRight'
  | 'Digit1'
  | 'Digit2'
  | 'Digit3'
  | 'Digit4'
  | 'KeyT'
  | 'KeyE'
  | 'KeyM'
  | 'Space'

/** Phím do component đang focus tự xử lý (cây, bản đồ: roving tabindex); bộ xử lý toàn cục không nhận. */
export type MaPhimCucBo = 'ArrowLeft' | 'ArrowUp' | 'ArrowDown' | 'ArrowRight' | 'Enter'

export type MaPhim = MaPhimToanCuc | MaPhimCucBo

export interface Phim {
  ma: MaPhim
  /** Chữ trên phím ở F27 */
  hienThi: string
}

/** Phạm vi theo bảng §11. */
export type PhamViPhimTat =
  'toan-app' | 'bai-hoc-ban-do' | 'bai-hoc' | 'lo-trinh' | 'ban-do-danh-sach' | 'phien-on'

export const TEN_PHAM_VI: Record<PhamViPhimTat, string> = {
  'toan-app': 'Toàn app',
  'bai-hoc-ban-do': 'Bài học, panel bản đồ',
  'bai-hoc': 'Bài học',
  'lo-trinh': 'Lộ trình',
  'ban-do-danh-sach': 'Bản đồ, danh sách',
  'phien-on': 'Chỉ trong phiên ôn',
}

/** Phase (đề xuất mục 9). */
export type PhaseApp = '1' | '2a' | '2b' | '3' | '4' | '5' | '6' | '7a' | '7b' | '7c' | '8'

export interface DongPhimTat {
  /** Chữ của dòng ở F27 */
  moTa: string
  phim: readonly Phim[]
  phamVi: PhamViPhimTat
  /** Phase phím bắt đầu có tác dụng (màn hình dùng nó có từ phase này) */
  phase: PhaseApp
}

const p = (ma: MaPhim, hienThi: string): Phim => ({ ma, hienThi })

/** Sổ phím tắt — nguồn duy nhất; thứ tự = thứ tự dòng ở F27. Không thêm phím ngoài §11. */
export const SO_PHIM_TAT: readonly DongPhimTat[] = [
  { moTa: 'Bảng phím tắt', phim: [p('Shift+Slash', '?')], phamVi: 'toan-app', phase: '1' },
  { moTa: 'Tìm kiếm', phim: [p('Slash', '/')], phamVi: 'toan-app', phase: '1' },
  { moTa: 'Đóng', phim: [p('Escape', 'Esc')], phamVi: 'toan-app', phase: '1' },
  {
    moTa: 'Mục trước / sau',
    phim: [p('BracketLeft', '['), p('BracketRight', ']')],
    phamVi: 'bai-hoc-ban-do',
    phase: '2a',
  },
  {
    moTa: CAC_TRANG_THAI_HOC.map((t) => TEN_TRANG_THAI_HOC[t]).join(' · '),
    phim: [p('Digit1', '1'), p('Digit2', '2'), p('Digit3', '3'), p('Digit4', '4')],
    phamVi: 'bai-hoc-ban-do',
    phase: '2a',
  },
  { moTa: 'Đồng hồ', phim: [p('KeyT', 'T')], phamVi: 'bai-hoc', phase: '3' },
  { moTa: 'Soạn', phim: [p('KeyE', 'E')], phamVi: 'bai-hoc', phase: '7b' },
  { moTa: 'Bản đồ ↔ Danh sách', phim: [p('KeyM', 'M')], phamVi: 'lo-trinh', phase: '4' },
  {
    moTa: 'Di chuyển giữa mục',
    phim: [p('ArrowLeft', '←'), p('ArrowUp', '↑'), p('ArrowDown', '↓'), p('ArrowRight', '→')],
    phamVi: 'ban-do-danh-sach',
    phase: '4',
  },
  { moTa: 'Mở panel', phim: [p('Enter', 'Enter')], phamVi: 'ban-do-danh-sach', phase: '4' },
  { moTa: 'Lật thẻ', phim: [p('Space', 'Space')], phamVi: 'phien-on', phase: '8' },
  { moTa: 'Quên', phim: [p('Digit1', '1')], phamVi: 'phien-on', phase: '8' },
  { moTa: 'Nhớ', phim: [p('Digit2', '2')], phamVi: 'phien-on', phase: '8' },
]

export interface NhomBangPhimTat {
  ten: string
  dong: readonly DongPhimTat[]
}

// F27 gom 6 phạm vi thành 4 nhóm (T, E vào "Bài học · panel bản đồ"; M, mũi tên, Enter vào "Lộ trình").
const NHOM_F27: readonly { ten: string; phamVi: readonly PhamViPhimTat[] }[] = [
  { ten: 'Toàn app', phamVi: ['toan-app'] },
  { ten: 'Bài học · panel bản đồ', phamVi: ['bai-hoc-ban-do', 'bai-hoc'] },
  { ten: 'Lộ trình', phamVi: ['lo-trinh', 'ban-do-danh-sach'] },
  { ten: 'Chỉ trong phiên ôn', phamVi: ['phien-on'] },
]

/** Các nhóm của bảng F27, giữ thứ tự dòng của sổ. */
export function nhomBangPhimTat(so: readonly DongPhimTat[] = SO_PHIM_TAT): NhomBangPhimTat[] {
  return NHOM_F27.map(({ ten, phamVi }) => ({
    ten,
    dong: so.filter((d) => phamVi.includes(d.phamVi)),
  })).filter((n) => n.dong.length > 0)
}

const MA_TOAN_CUC: ReadonlySet<string> = new Set<MaPhimToanCuc>([
  'Slash',
  'Escape',
  'BracketLeft',
  'BracketRight',
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'KeyT',
  'KeyE',
  'KeyM',
  'Space',
])

const O_GO =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], .cm-editor'
// input không nhận chữ: phím tắt vẫn chạy
const INPUT_KHONG_GO = new Set([
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'image',
  'file',
  'range',
  'color',
])
// Vùng tự xử lý phím (typeahead, mũi tên, Space)
const VUNG_TU_XU_LY =
  '[role="alertdialog"], [role="menu"], [role="menubar"], [role="listbox"], [role="combobox"]'
// Space trên các phần tử này là "bấm", không phải phím tắt
const PHAN_TU_BAM =
  'button, a[href], summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="option"], [role="menuitem"], [role="treeitem"]'

/** Phần tử (hoặc tổ tiên) là chỗ gõ chữ: ô nhập chữ, textarea, select, contenteditable, CodeMirror. */
export function laChoGo(phanTu: Element | null): boolean {
  const o = phanTu?.closest(O_GO)
  if (!o) return false
  return !(o instanceof HTMLInputElement && INPUT_KHONG_GO.has(o.type))
}

/** Mã phím tắt của sự kiện keydown, hoặc null nếu bộ xử lý toàn cục phải bỏ qua. */
export function maPhimTuSuKien(e: KeyboardEvent): MaPhimToanCuc | null {
  if (e.defaultPrevented || e.repeat) return null
  if (e.isComposing || e.keyCode === 229) return null
  if (e.altKey || e.ctrlKey || e.metaKey) return null
  let ma: MaPhimToanCuc | null = null
  if (e.code === 'Slash' && e.shiftKey) ma = 'Shift+Slash'
  else if (!e.shiftKey && MA_TOAN_CUC.has(e.code)) ma = e.code as MaPhimToanCuc
  if (!ma) return null
  const dich = e.target instanceof Element ? e.target : null
  if (laChoGo(dich) || dich?.closest(VUNG_TU_XU_LY)) return null
  if (ma === 'Space' && dich?.closest(PHAN_TU_BAM)) return null
  // Dialog modal đang mở (kể cả lúc focus lọt ra body): phím tắt của trang nằm dưới không chạy.
  // Dialog đang chạy hiệu ứng đóng (Radix data-state="closed") không tính.
  if (document.querySelector('[aria-modal="true"]:not([data-state="closed"])')) return null
  return ma
}

type XuLyPhim = (e: KeyboardEvent) => void
interface DangKy {
  xuLy: { current: XuLyPhim }
}

// Sổ đăng ký ở cấp module: usePhimTat chạy được ở mọi chỗ trong cây, không phụ thuộc thứ tự lồng provider.
const soDangKy = new Map<MaPhimToanCuc, DangKy[]>()

function nghePhim(e: KeyboardEvent) {
  const ma = maPhimTuSuKien(e)
  if (!ma) return
  const dangKy = soDangKy.get(ma)?.at(-1)
  if (!dangKy) return
  e.preventDefault()
  dangKy.xuLy.current(e)
}

/**
 * Đăng ký xử lý một phím tắt khi component đang hiện (vd. trang bài: "[" → mục trước).
 * enabled = false thì tạm bỏ đăng ký. Cùng phím: nơi đăng ký sau cùng nhận (overlay trên cùng).
 */
export function usePhimTat(
  ma: MaPhimToanCuc,
  xuLy: XuLyPhim,
  { enabled = true }: { enabled?: boolean } = {},
): void {
  const ref = useRef(xuLy)
  useEffect(() => {
    ref.current = xuLy
  })
  useEffect(() => {
    if (!enabled) return
    const dangKy: DangKy = { xuLy: ref }
    soDangKy.set(ma, [...(soDangKy.get(ma) ?? []), dangKy])
    return () => {
      const conLai = (soDangKy.get(ma) ?? []).filter((d) => d !== dangKy)
      if (conLai.length > 0) soDangKy.set(ma, conLai)
      else soDangKy.delete(ma)
    }
  }, [ma, enabled])
}

// Đếm số provider đang gắn: lỡ gắn hai lần thì gỡ một cái không làm mất bộ nghe chung.
let soProvider = 0

const NHOM_BANG = nhomBangPhimTat()
const NguCanhMoBang = createContext<() => void>(() => {})

/** Gắn bộ xử lý phím toàn cục và bảng F27 ("?" mở). Đặt một lần trong khung app. */
export function PhimTatProvider({ children }: { children: ReactNode }) {
  const [mo, datMo] = useState(false)
  const moBang = useCallback(() => datMo(true), [])
  useEffect(() => {
    if (soProvider++ === 0) document.addEventListener('keydown', nghePhim)
    return () => {
      if (--soProvider === 0) document.removeEventListener('keydown', nghePhim)
    }
  }, [])
  usePhimTat('Shift+Slash', moBang)
  return (
    <NguCanhMoBang.Provider value={moBang}>
      {children}
      <BangPhimTat mo={mo} doiMo={datMo} nhom={NHOM_BANG} />
    </NguCanhMoBang.Provider>
  )
}

/** Trả về hàm mở bảng phím tắt (F27). */
export function useMoBangPhimTat(): () => void {
  return useContext(NguCanhMoBang)
}
