// Rail 72px cho 1024–1279 (§5.2, đề xuất 4.4; không có frame, dựng từ C34): logo, tìm, menu chỉ icon
// (tooltip + aria-label, badge thu nhỏ), chân ghim đáy: đồng hồ (phase 3, có chấm khi chạy), Giao diện, "?".
import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { Tooltip } from 'radix-ui'
import { Search } from 'lucide-react'
import Badge from '../../components/trang-thai/Badge'
import { useTimKiem } from '../../components/tim-kiem/TimKiem'
import { useMoBangPhimTat } from '../phim-tat'
import { useGiaoDien } from '../giao-dien'
import { useDuLieuKhung } from './du-lieu-khung'
import { MENU, TEN_APP, ariaCurrent, badgeCua, type BadgeMenu } from './menu'
import { useMenuDangMo } from './thanh-tren'
import NutGiaoDien, { nhanGiaoDien } from './NutGiaoDien'
import Logo from './Logo'
import { GOI_Y_RAIL_PHIM_TAT, GOI_Y_RAIL_TIM } from '../../copy/cho-duyet'

/** Tooltip bên phải ô rail: nền mực, 13/20 (cùng kiểu nút chính). */
export function GoiYRail({ nhan, children }: { nhan: string; children: ReactElement }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={8}
          className="z-50 rounded-[var(--radius-sm)] bg-primary px-2 py-1 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-medium text-on-primary shadow-[var(--shadow-2)] data-[state=closed]:animate-[an-dan_150ms_ease-in] data-[state=delayed-open]:animate-[hien-dan_150ms_ease-out]"
        >
          {nhan}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

/** Badge C7 bản nhỏ ở góc ô (đề xuất 4.4). Nền surface để không lộ icon phía sau; ô đang mở thì đảo màu. */
function BadgeRail({ badge, dangMo }: { badge: BadgeMenu; dangMo: boolean }) {
  const mau =
    badge.kieu === 'dac'
      ? dangMo
        ? 'bg-on-primary! text-primary!'
        : ''
      : `bg-surface ${dangMo ? 'border-on-primary!' : ''}`
  return (
    <Badge
      so={badge.so}
      kieu={badge.kieu}
      nho
      className={`pointer-events-none absolute -top-1 -right-1 ${mau}`}
    />
  )
}

const O = 'h-[var(--rail-o-h)] w-[var(--rail-o-w)] rounded-[var(--radius-sm)]'

export default function Rail() {
  const duLieu = useDuLieuKhung()
  const { mo: moTimKiem } = useTimKiem()
  const moBangPhimTat = useMoBangPhimTat()
  const [giaoDien] = useGiaoDien()
  const dangMo = useMenuDangMo()

  return (
    <Tooltip.Provider delayDuration={300}>
      {/* 72 = lề 12 + ô 48 + lề 11 + viền phải 1 (không tràn ngang). */}
      <aside
        aria-label="Điều hướng chính"
        className="sticky top-0 flex h-dvh w-[var(--rail-w)] shrink-0 flex-col items-center gap-4 self-start overflow-x-hidden overflow-y-auto border-r border-border bg-surface py-5 pr-[11px] pl-3"
      >
        <GoiYRail nhan={TEN_APP}>
          <Link
            to="/"
            aria-label={TEN_APP}
            className={`flex shrink-0 items-center justify-center ${O}`}
          >
            <Logo />
          </Link>
        </GoiYRail>

        <GoiYRail nhan={GOI_Y_RAIL_TIM}>
          <button
            type="button"
            aria-label="Tìm mục"
            aria-haspopup="dialog"
            aria-keyshortcuts="/"
            onClick={moTimKiem}
            className={`flex shrink-0 items-center justify-center border border-border-input bg-surface text-muted transition-colors duration-150 hover:border-text ${O}`}
          >
            <Search size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </GoiYRail>

        <nav aria-label="Menu" className="shrink-0">
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {MENU.map((m) => {
              const current = ariaCurrent(dangMo, m.khoa)
              const badge = badgeCua(m.khoa, duLieu)
              const ten = badge ? `${m.nhan}, ${badge.moTa}` : m.nhan
              const Icon = m.icon
              return (
                <li key={m.khoa}>
                  <GoiYRail nhan={badge ? `${m.nhan} · ${badge.moTa}` : m.nhan}>
                    <Link
                      to={m.den}
                      aria-label={ten}
                      aria-current={current}
                      className={`relative flex items-center justify-center no-underline transition-colors duration-150 ${O} ${
                        current
                          ? 'bg-primary text-on-primary hover:bg-primary-hover'
                          : 'text-text hover:bg-surface-2'
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                      {badge && <BadgeRail badge={badge} dangMo={current !== undefined} />}
                    </Link>
                  </GoiYRail>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="mt-auto flex w-full shrink-0 flex-col items-center gap-2 border-t border-border pt-4">
          {duLieu.dongHo?.rail}
          <GoiYRail nhan={nhanGiaoDien(giaoDien)}>
            <NutGiaoDien chiIcon className={`shrink-0 ${O}`} />
          </GoiYRail>
          <GoiYRail nhan={GOI_Y_RAIL_PHIM_TAT}>
            <button
              type="button"
              aria-label="Bảng phím tắt"
              aria-haspopup="dialog"
              aria-keyshortcuts="?"
              onClick={moBangPhimTat}
              className={`shrink-0 border border-border-input bg-surface font-mono text-[length:var(--fs-ui)] leading-[var(--lh-ui)] font-semibold text-text transition-colors duration-150 hover:border-text hover:bg-surface-2 ${O}`}
            >
              ?
            </button>
          </GoiYRail>
        </div>
      </aside>
    </Tooltip.Provider>
  )
}
