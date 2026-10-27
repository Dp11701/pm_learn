// Sổ phím tắt dùng chung (§11, đề xuất 5): một bảng cho cả bộ xử lý toàn cục và bảng F27.
// So theo e.code (vị trí phím vật lý) nên Telex/VNI không biến "[" thành "ơ". Bỏ qua khi: đang gõ
// (ô nhập, contenteditable, CodeMirror), IME đang ghép chữ, giữ Alt/Ctrl/⌘ (Shift chỉ cho "?"),
// đang mở dialog modal (Radix tự xử lý Esc) hoặc focus ở menu/listbox/combobox (chúng tự xử lý phím).
// Trang đăng ký phím của mình bằng usePhimTat; cùng một phím thì lớp trên cùng nhận (xem usePhimTat).
// F27 hiện bảng §11 như frame, kể cả phím của màn hình phase sau (cột phase trong sổ ghi lúc có tác dụng) — trừ phím
// của phần đã bỏ khỏi phạm vi (đề xuất mục 10, 27/10/2026): T Đồng hồ, E Soạn (trình soạn trong app), M Bản đồ ↔ Danh
// sách và Enter "Mở panel" (panel của bản đồ).
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
  | 'Space'

/** Phím do component đang focus tự xử lý (cây danh sách: roving tabindex); bộ xử lý toàn cục không nhận. */
export type MaPhimCucBo = 'ArrowLeft' | 'ArrowUp' | 'ArrowDown' | 'ArrowRight'

export type MaPhim = MaPhimToanCuc | MaPhimCucBo

export interface Phim {
  ma: MaPhim
  /** Chữ trên phím ở F27 */
  hienThi: string
}

/** Phạm vi theo bảng §11. */
export type PhamViPhimTat =
  'toan-app' | 'bai-hoc-ban-do' | 'bai-hoc' | 'lo-trinh' | 'ban-do-danh-sach' | 'phien-on'

// Bản đồ đã bỏ (đề xuất mục 10): phạm vi "…, panel bản đồ" / "Bản đồ, danh sách" chỉ còn Bài học / Danh sách.
export const TEN_PHAM_VI: Record<PhamViPhimTat, string> = {
  'toan-app': 'Toàn app',
  'bai-hoc-ban-do': 'Bài học',
  'bai-hoc': 'Bài học',
  'lo-trinh': 'Lộ trình',
  'ban-do-danh-sach': 'Danh sách',
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
  {
    moTa: 'Di chuyển giữa mục',
    phim: [p('ArrowLeft', '←'), p('ArrowUp', '↑'), p('ArrowDown', '↓'), p('ArrowRight', '→')],
    phamVi: 'ban-do-danh-sach',
    phase: '4',
  },
  { moTa: 'Lật thẻ', phim: [p('Space', 'Space')], phamVi: 'phien-on', phase: '8' },
  { moTa: 'Quên', phim: [p('Digit1', '1')], phamVi: 'phien-on', phase: '8' },
  { moTa: 'Nhớ', phim: [p('Digit2', '2')], phamVi: 'phien-on', phase: '8' },
]

export interface NhomBangPhimTat {
  ten: string
  dong: readonly DongPhimTat[]
}

// F27 gom 6 phạm vi thành 4 nhóm; nhóm "Bài học · panel bản đồ" của frame bỏ "panel bản đồ" (bản đồ đã bỏ).
const NHOM_F27: readonly { ten: string; phamVi: readonly PhamViPhimTat[] }[] = [
  { ten: 'Toàn app', phamVi: ['toan-app'] },
  { ten: 'Bài học', phamVi: ['bai-hoc-ban-do', 'bai-hoc'] },
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
  /** Thứ tự lớp: số lớn hơn nằm trên */
  lop: number
  xuLy: { current: XuLyPhim }
}

// Sổ đăng ký ở cấp module: usePhimTat chạy được ở mọi chỗ trong cây, không phụ thuộc thứ tự lồng provider.
const soDangKy = new Map<MaPhimToanCuc, DangKy[]>()

// Bộ đếm lớp: cấp số lúc component render lần đầu. React render cha trước con, anh trước em, nên con
// (panel trong trang) và phần gắn sau (overlay mở sau) luôn có số lớn hơn.
let demLop = 0
function lopMoi(): number {
  return ++demLop
}

/** Đăng ký của lớp trên cùng (lop lớn nhất) cho một phím. */
function dangKyTrenCung(ma: MaPhimToanCuc): DangKy | undefined {
  let tren: DangKy | undefined
  for (const d of soDangKy.get(ma) ?? []) if (!tren || d.lop > tren.lop) tren = d
  return tren
}

function nghePhim(e: KeyboardEvent) {
  const ma = maPhimTuSuKien(e)
  if (!ma) return
  const dangKy = dangKyTrenCung(ma)
  if (!dangKy) return
  e.preventDefault()
  dangKy.xuLy.current(e)
}

/**
 * Đăng ký xử lý một phím tắt khi component đang hiện (vd. trang bài: "[" → mục trước).
 * Cùng phím: lớp trên cùng nhận. Lớp cấp một lần lúc render đầu (con trên cha, gắn sau trên gắn
 * trước), không phụ thuộc thứ tự chạy effect. enabled = false thì tạm nhường cho lớp dưới; bật lại
 * vẫn giữ lớp cũ, nên không đè overlay đang mở phía trên. Overlay luôn gắn sẵn và chỉ bật/tắt bằng
 * enabled thì phải render sau phần nó che (là con, hoặc đứng sau trong cây) để có lớp cao hơn.
 */
export function usePhimTat(
  ma: MaPhimToanCuc,
  xuLy: XuLyPhim,
  { enabled = true }: { enabled?: boolean } = {},
): void {
  const ref = useRef(xuLy)
  const [lop] = useState(lopMoi)
  useEffect(() => {
    ref.current = xuLy
  })
  useEffect(() => {
    if (!enabled) return
    const dangKy: DangKy = { lop, xuLy: ref }
    soDangKy.set(ma, [...(soDangKy.get(ma) ?? []), dangKy])
    return () => {
      const conLai = (soDangKy.get(ma) ?? []).filter((d) => d !== dangKy)
      if (conLai.length > 0) soDangKy.set(ma, conLai)
      else soDangKy.delete(ma)
    }
  }, [ma, enabled, lop])
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
