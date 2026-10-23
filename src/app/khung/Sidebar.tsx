// C34 Sidebar 264px (§6.1; F11, F27, F28): logo, ô tìm (/), menu, khối Đang học, chân ghim đáy (D4)
// có đồng hồ, nút Giao diện (D5), nút "?". `mobile` = trong drawer (F28): hàng 44px, có nút "Đóng menu".
import { useId } from 'react'
import { Link, useLocation } from 'react-router'
import { Award, FileText, Search, X } from 'lucide-react'
import IconTrangThai from '../../components/trang-thai/IconTrangThai'
import { useTimKiem } from '../../components/tim-kiem/TimKiem'
import { useMoBangPhimTat } from '../phim-tat'
import { layCay, type MucHoc } from '../../../shared/roadmap'
import { TEN_LOAI } from '../../../shared/domain/trang-thai'
import { dinhDangSo } from '../../../shared/dinh-dang'
import { useDuLieuKhung } from './du-lieu-khung'
import {
  DEN_TAT_CA_DANG_HOC,
  MENU,
  ariaCurrent,
  badgeCua,
  menuDangMo,
  type BadgeMenu,
} from './menu'
import NutGiaoDien from './NutGiaoDien'
import Logo from './Logo'

/** Số mục Đang học hiện ở sidebar (§6.1: 3 mục mở gần nhất). */
export const SO_MUC_DANG_HOC = 3

/** 'dieu-huong': bấm link; 'lop-khac': mở tìm kiếm / bảng phím tắt (drawer đóng, lớp kia giữ focus). */
export type HanhDongSidebar = 'dieu-huong' | 'lop-khac'

export interface PropsSidebar {
  mobile?: boolean
  /** Có thì hiện nút X "Đóng menu" (drawer). */
  khiDong?: () => void
  /** Gọi trước khi điều hướng hoặc mở lớp khác (drawer dùng để tự đóng). */
  khiChon?: (hanhDong: HanhDongSidebar) => void
}

function mucDangHoc(ids: readonly string[]): MucHoc[] {
  try {
    const cay = layCay()
    return ids.flatMap((id) => cay.mucTheoId.get(id) ?? []).slice(0, SO_MUC_DANG_HOC)
  } catch {
    // Cây lỗi: trang lỗi cây tự báo, khối Đang học coi như trống.
    return []
  }
}

/** Badge 20px (C34): đặc nền mực / viền; trên hàng đang mở thì đảo màu. */
export function BadgeSidebar({ badge, dangMo }: { badge: BadgeMenu; dangMo: boolean }) {
  const mau =
    badge.kieu === 'dac'
      ? dangMo
        ? 'bg-on-primary text-primary leading-[var(--badge-h)]'
        : 'bg-primary text-on-primary leading-[var(--badge-h)]'
      : `border leading-[calc(var(--badge-h)-2px)] ${dangMo ? 'border-on-primary' : 'border-border-input'}`
  return (
    <>
      <span
        aria-hidden="true"
        className={`box-border h-[var(--badge-h)] min-w-[var(--badge-h)] rounded-[calc(var(--badge-h)/2)] px-1.5 text-center text-[length:var(--fs-chip)] font-semibold tabular-nums ${mau}`}
      >
        {badge.so}
      </span>
      <span className="sr-only">, {badge.moTa}</span>
    </>
  )
}

export default function Sidebar({ mobile = false, khiDong, khiChon }: PropsSidebar) {
  const { pathname } = useLocation()
  const duLieu = useDuLieuKhung()
  const { mo: moTimKiem } = useTimKiem()
  const moBangPhimTat = useMoBangPhimTat()
  const idDangHoc = useId()
  const dangMo = menuDangMo(pathname)
  const dsDangHoc = mucDangHoc(duLieu.dangHoc)
  const tongDangHoc = duLieu.tongDangHoc ?? duLieu.dangHoc.length
  const dieuHuong = () => khiChon?.('dieu-huong')

  // Cao hàng: 36 (desktop) / 44 (drawer, vùng chạm).
  const hang = mobile ? 'h-11' : 'h-9'
  const vuong = mobile ? 'size-11' : 'size-9'

  return (
    <div className="flex min-h-full flex-col gap-6 px-4 py-5">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/"
          onClick={dieuHuong}
          className="flex items-center gap-2.5 rounded-[var(--radius-sm)] text-text no-underline"
        >
          <Logo />
          <span className="text-[17px] leading-7 font-bold">Học PM A–Z</span>
        </Link>
        {khiDong && (
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={khiDong}
            className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-text transition-colors duration-150 hover:bg-surface-2"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>

      <button
        type="button"
        aria-keyshortcuts="/"
        onClick={() => {
          khiChon?.('lop-khac')
          moTimKiem()
        }}
        className={`flex ${hang} items-center gap-2 rounded-[var(--radius-sm)] border border-border-input bg-surface px-2.5 text-left text-muted transition-colors duration-150 hover:border-text`}
      >
        <Search size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
        <span className="flex-1">Tìm mục…</span>
        <kbd
          aria-hidden="true"
          className="rounded-[4px] border border-border px-1.5 font-mono text-[length:var(--fs-chip)] leading-[var(--lh-chip)] text-muted"
        >
          /
        </kbd>
      </button>

      <nav aria-label="Menu">
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {MENU.map((m) => {
            const current = ariaCurrent(dangMo, m.khoa)
            const badge = badgeCua(m.khoa, duLieu)
            const Icon = m.icon
            return (
              <li key={m.khoa}>
                <Link
                  to={m.den}
                  aria-current={current}
                  onClick={dieuHuong}
                  className={`flex ${hang} items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 no-underline transition-colors duration-150 ${
                    current
                      ? 'bg-primary font-semibold text-on-primary hover:bg-primary-hover'
                      : 'text-text hover:bg-surface-2'
                  }`}
                >
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{m.nhan}</span>
                  {badge && <BadgeSidebar badge={badge} dangMo={current !== undefined} />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <section aria-labelledby={idDangHoc} className="flex flex-col gap-1 border-t border-border pt-4">
        <h2
          id={idDangHoc}
          className="m-0 mb-1 px-2.5 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-semibold text-muted"
        >
          Đang học
        </h2>
        {dsDangHoc.length === 0 ? (
          <p className="m-0 px-2.5 py-1 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
            Chưa có mục đang học
          </p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {dsDangHoc.map((muc) => {
                const den = `/hoc/${muc.slug}`
                const current =
                  pathname === den ? 'page' : pathname.startsWith(`${den}/`) ? 'true' : undefined
                return (
                  <li key={muc.id}>
                    <Link
                      to={den}
                      aria-current={current}
                      onClick={dieuHuong}
                      className={`flex ${mobile ? 'min-h-11' : 'min-h-9'} items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-text no-underline transition-colors duration-150 hover:bg-surface-2 ${
                        current ? 'bg-surface-2 font-semibold' : ''
                      }`}
                    >
                      <IconTrangThai trangThai="dang-hoc" size={16} className="shrink-0" />
                      <span lang="en" className="min-w-0 flex-1 break-words">
                        {muc.label}
                      </span>
                      <IconLoai muc={muc} />
                    </Link>
                  </li>
                )
              })}
            </ul>
            <Link
              to={DEN_TAT_CA_DANG_HOC}
              onClick={dieuHuong}
              className={`self-start rounded-[var(--radius-sm)] px-2.5 py-1 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-text underline hover:text-[var(--primary-hover)] ${
                mobile ? 'flex min-h-11 items-center' : ''
              }`}
            >
              Xem tất cả ({dinhDangSo(tongDangHoc)})
            </Link>
          </>
        )}
      </section>

      <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-surface-2 p-3">
          {duLieu.dongHo?.sidebar ?? (
            // Phase 1 chưa có đồng hồ: trạng thái nghỉ của frame, không có nút Bắt đầu (phase 3 cắm vào).
            <p className="m-0 flex min-h-8 items-center text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
              Chưa bấm giờ
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <NutGiaoDien className={`flex-1 ${hang} px-2`} />
          <button
            type="button"
            aria-label="Bảng phím tắt"
            aria-keyshortcuts="?"
            onClick={() => {
              khiChon?.('lop-khac')
              moBangPhimTat()
            }}
            className={`${vuong} shrink-0 rounded-[var(--radius-sm)] border border-border-input bg-surface font-mono text-[length:var(--fs-ui)] leading-[var(--lh-ui)] font-semibold text-text transition-colors duration-150 hover:border-text hover:bg-surface-2`}
          >
            ?
          </button>
        </div>
      </div>
    </div>
  )
}

/** Icon loại sau tên (C34): chỉ Tài liệu (file-text) và Chứng chỉ (award), như chip loại. */
function IconLoai({ muc }: { muc: MucHoc }) {
  if (muc.mau === 'tai-lieu') {
    return (
      <FileText
        size={14}
        strokeWidth={1.75}
        role="img"
        aria-label={TEN_LOAI['tai-lieu']}
        className="shrink-0 text-muted"
      />
    )
  }
  if (muc.mau === 'chung-chi') {
    return (
      <Award
        size={14}
        strokeWidth={1.75}
        role="img"
        aria-label={TEN_LOAI['chung-chi']}
        className="shrink-0 text-muted"
      />
    )
  }
  return null
}
