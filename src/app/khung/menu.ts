// Menu của khung app (§6.1, C34): thứ tự, route, icon như frame; mục đang mở suy từ đường dẫn. Chỉ còn 4 mục:
// Thống kê, Bộ hồ sơ dự án, Chứng chỉ, Thuật ngữ, Ghi chú, Cài đặt (nhóm P1) đã bỏ khỏi phạm vi (đề xuất mục 10).
import { useMemo } from 'react'
import { Copy, LayoutDashboard, Library, Route, type LucideIcon } from 'lucide-react'
import { dinhDangSo } from '../../../shared/dinh-dang'
import { layCay, type Cay } from '../../../shared/roadmap'
import { chuBadge, type KieuBadge } from '../../components/trang-thai/Badge'
import { useTrangThaiNoiDung, type TraNoiDung } from '../du-lieu/noi-dung'
import { useSoTheDenHan } from '../du-lieu/on-tap'
import { TEN_APP } from '../ten-app'
import { useDuLieuKhung, type DuLieuKhung } from './du-lieu-khung'

/** Tên app (logo C34, tooltip rail, top bar khi không có tên trang): định nghĩa ở src/app/ten-app.ts. */
export { TEN_APP }

export type KhoaMenu = 'tong-quan' | 'lo-trinh' | 'on-tap' | 'noi-dung'

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
]

/** "Xem tất cả (n)" của khối Đang học: Danh sách lọc Đang học (§6.3, F08). */
export const DEN_TAT_CA_DANG_HOC = '/lo-trinh?xem=danh-sach&trang-thai=dang-hoc'

export interface MenuDangMo {
  khoa: KhoaMenu
  /** true: đúng trang của mục menu (aria-current="page"); false: trang con của nó ("true"). */
  chinhXac: boolean
}

// Trang thuộc roadmap nhưng không có mục menu riêng → tô Lộ trình (F10, F11): trang bài (mọi mẫu — trang Chứng chỉ
// của F34b đã bỏ) và trang lĩnh vực.
const CON_CUA_LO_TRINH = ['/hoc/', '/linh-vuc/']

/** Mục menu đang mở theo đường dẫn; trang bài, trang lĩnh vực tô "Lộ trình". */
export function menuDangMo(pathname: string): MenuDangMo | null {
  const duong = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  for (const m of MENU) {
    if (duong === m.den) return { khoa: m.khoa, chinhXac: true }
  }
  for (const m of MENU) {
    if (m.den !== '/' && duong.startsWith(`${m.den}/`)) return { khoa: m.khoa, chinhXac: false }
  }
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

/**
 * Số mục học có nội dung Bản nháp (AI · Tự viết) — badge Nội dung (đề xuất 3.3, 3.7: bảng chính Chờ duyệt; bài Đã
 * duyệt có bản sửa vẫn là Đã duyệt nên không tính). undefined khi chưa biết trạng thái nội dung.
 */
export function soBanNhapTrong(cay: Pick<Cay, 'mucHoc'>, tra: TraNoiDung): number | undefined {
  let so = 0
  for (const m of cay.mucHoc) {
    const tt = tra(m.id)
    if (tt === undefined) return undefined
    if (tt.loai === 'ban-nhap') so += 1
  }
  return so
}

/** Số bản nháp theo trạng thái nội dung của server; undefined khi chưa tải (hoặc ngoài máy chủ, cây lỗi). */
export function useSoBanNhap(): number | undefined {
  const tra = useTrangThaiNoiDung()
  return useMemo(() => {
    try {
      return soBanNhapTrong(layCay(), tra)
    } catch {
      // Cây lỗi: trang lỗi cây tự báo, badge coi như chưa có.
      return undefined
    }
  }, [tra])
}

/**
 * Dữ liệu khung cho menu (sidebar, rail): số badge lấy từ dữ liệu thật — thẻ đến hạn (GET /api/on-tap) và bản
 * nháp (trạng thái nội dung) — khi đã tải; chưa có (ngoài QueryClientProvider: gallery, test khung) thì dùng giá
 * trị của khung (DuLieuKhungProvider).
 */
export function useDuLieuMenu(): DuLieuKhung {
  const duLieu = useDuLieuKhung()
  const soTheDenHan = useSoTheDenHan()
  const soBanNhap = useSoBanNhap()
  return useMemo(
    () => ({
      ...duLieu,
      soTheDenHan: soTheDenHan ?? duLieu.soTheDenHan,
      soBanNhap: soBanNhap ?? duLieu.soBanNhap,
    }),
    [duLieu, soTheDenHan, soBanNhap],
  )
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
