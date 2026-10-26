// Menu của khung app (§6.1, C34): thứ tự, route, icon như frame; mục đang mở suy từ đường dẫn.
import {
  Award,
  BookA,
  ChartColumn,
  Copy,
  Files,
  LayoutDashboard,
  Library,
  Route,
  SlidersHorizontal,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'
import { layCay } from '../../../shared/roadmap'
import { dinhDangSo } from '../../../shared/dinh-dang'
import { chuBadge, type KieuBadge } from '../../components/trang-thai/Badge'
import type { DuLieuKhung } from './du-lieu-khung'

/** Tên app (logo C34, tooltip rail, top bar khi không có tên trang). */
export const TEN_APP = 'Học PM A–Z'

export type KhoaMenu =
  | 'tong-quan'
  | 'lo-trinh'
  | 'on-tap'
  | 'noi-dung'
  | 'thong-ke'
  | 'ho-so'
  | 'chung-chi'
  | 'thuat-ngu'
  | 'ghi-chu'
  | 'cai-dat'

export interface MucMenu {
  khoa: KhoaMenu
  nhan: string
  den: string
  icon: LucideIcon
}

export const MENU: readonly MucMenu[] = [
  { khoa: 'tong-quan', nhan: 'Tổng quan', den: '/', icon: LayoutDashboard },
  { khoa: 'lo-trinh', nhan: 'Lộ trình', den: '/lo-trinh', icon: Route },
  { khoa: 'on-tap', nhan: 'Ôn tập', den: '/on-tap', icon: Copy },
  { khoa: 'noi-dung', nhan: 'Nội dung', den: '/noi-dung', icon: Library },
  { khoa: 'thong-ke', nhan: 'Thống kê', den: '/thong-ke', icon: ChartColumn },
  { khoa: 'ho-so', nhan: 'Bộ hồ sơ dự án', den: '/ho-so', icon: Files },
  { khoa: 'chung-chi', nhan: 'Chứng chỉ', den: '/chung-chi', icon: Award },
  { khoa: 'thuat-ngu', nhan: 'Thuật ngữ', den: '/thuat-ngu', icon: BookA },
  { khoa: 'ghi-chu', nhan: 'Ghi chú', den: '/ghi-chu', icon: StickyNote },
  { khoa: 'cai-dat', nhan: 'Cài đặt', den: '/cai-dat', icon: SlidersHorizontal },
]

/** "Xem tất cả (n)" của khối Đang học: Danh sách lọc Đang học (§6.3, F08). */
export const DEN_TAT_CA_DANG_HOC = '/lo-trinh?xem=danh-sach&trang-thai=dang-hoc'

export interface MenuDangMo {
  khoa: KhoaMenu
  /** true: đúng trang của mục menu (aria-current="page"); false: trang con của nó ("true"). */
  chinhXac: boolean
}

// Trang thuộc roadmap nhưng không có mục menu riêng → tô Lộ trình (F10, F11, F29, F30).
const CON_CUA_LO_TRINH = ['/linh-vuc/', '/phan/', '/lo-trinh-goi-y']

function laMucChungChi(slug: string): boolean {
  try {
    return layCay().mucTheoSlug.get(decodeURIComponent(slug))?.mau === 'chung-chi'
  } catch {
    // Cây lỗi: trang lỗi cây tự báo; menu vẫn tô Lộ trình.
    return false
  }
}

/** Mục menu đang mở theo đường dẫn; bài Chứng chỉ tô "Chứng chỉ" (F34b), bài khác tô "Lộ trình". */
export function menuDangMo(pathname: string): MenuDangMo | null {
  const duong = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  for (const m of MENU) {
    if (duong === m.den) return { khoa: m.khoa, chinhXac: true }
  }
  for (const m of MENU) {
    if (m.den !== '/' && duong.startsWith(`${m.den}/`)) return { khoa: m.khoa, chinhXac: false }
  }
  const bai = /^\/hoc\/([^/]+)/.exec(duong)
  if (bai) return { khoa: laMucChungChi(bai[1]) ? 'chung-chi' : 'lo-trinh', chinhXac: false }
  if (CON_CUA_LO_TRINH.some((dau) => duong.startsWith(dau))) {
    return { khoa: 'lo-trinh', chinhXac: false }
  }
  return null
}

export function ariaCurrent(
  dangMo: MenuDangMo | null,
  khoa: KhoaMenu,
): 'page' | 'true' | undefined {
  if (dangMo?.khoa !== khoa) return undefined
  return dangMo.chinhXac ? 'page' : 'true'
}

export interface BadgeMenu {
  /** Số đếm; badge C7 tự hiện "99+" khi > 99 (đề xuất 3.3). */
  so: number
  /** Chữ cho trình đọc màn hình, đủ số, vd. "12 thẻ đến hạn", "150 bản nháp". */
  moTa: string
  /** Đặc = việc cần làm hôm nay; viền = số đếm thông tin (quyết định 4 của designer). */
  kieu: KieuBadge
}

function taoBadge(so: number, donVi: string, kieu: KieuBadge): BadgeMenu | null {
  if (chuBadge(so) === null) return null
  return { so, moTa: `${dinhDangSo(so)} ${donVi}`, kieu }
}

/** Badge của Ôn tập (thẻ đến hạn) và Nội dung (bản nháp); 0 thì không hiện (đề xuất 3.3). */
export function badgeCua(khoa: KhoaMenu, duLieu: DuLieuKhung): BadgeMenu | null {
  if (khoa === 'on-tap') return taoBadge(duLieu.soTheDenHan, 'thẻ đến hạn', 'dac')
  if (khoa === 'noi-dung') return taoBadge(duLieu.soBanNhap, 'bản nháp', 'vien')
  return null
}

/** Tiêu đề top bar mobile khi trang không tự đặt và route không có tên: tên mục menu đang mở. */
export function tieuDeMacDinh(pathname: string): string {
  const dangMo = menuDangMo(pathname)
  return MENU.find((m) => m.khoa === dangMo?.khoa)?.nhan ?? TEN_APP
}

/** `handle.tenTrang` của route sâu nhất có đặt (router.tsx), vd. "Phiên ôn" cho /on-tap/phien. */
export function tenTrangTuRoute(cacRoute: readonly { handle: unknown }[]): string | undefined {
  for (let i = cacRoute.length - 1; i >= 0; i--) {
    const handle = cacRoute[i].handle
    if (typeof handle === 'object' && handle !== null && 'tenTrang' in handle) {
      const ten = handle.tenTrang
      if (typeof ten === 'string' && ten !== '') return ten
    }
  }
  return undefined
}

/** Click mở tab / cửa sổ mới (⌘, Ctrl, Shift, Alt, chuột giữa): không phải điều hướng trong app. */
export function laClickRaNgoai(e: {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}): boolean {
  return e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
}
