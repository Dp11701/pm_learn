// C12 Breadcrumb (F11, F02b, §6.2, D10; đề xuất 4.3 "Breadcrumb ▾ đang mở"): 2–4 cấp, mỗi cấp cha là nút
// ▾ mở menu các nút cùng cấp; cấp cuối là mục đang mở (aria-current="page", 600). Chữ 13/20, nút cao 28,
// padding 0 6, bo 6; dấu "›" giữa các cấp chỉ để nhìn.
// Menu (F02b, Radix DropdownMenu: phím mũi tên, Esc, gõ chữ để nhảy): rộng ≥ 260, padding 6, bo 10, bóng 2.
// D10: mục học có icon trạng thái + chữ trạng thái (D2); phần / lĩnh vực / nhóm có phân số "x/y" (đề xuất 3.3,
// thêm " · n bỏ qua"), nút đang mở thêm " · đang mở" và nền surface-2. Mobile không có breadcrumb (chỉ
// "‹ cấp cha" ở top bar).
import { Fragment } from 'react'
import { Link } from 'react-router'
import { DropdownMenu } from 'radix-ui'
import { ChevronDown } from 'lucide-react'
import { TEN_TRANG_THAI_HOC } from '../../../shared/domain/trang-thai'
import { chuoiCha, type Cay, type MucHoc, type Nut } from '../../../shared/roadmap'
import TenMuc from '../TenMuc'
import IconTrangThai from '../trang-thai/IconTrangThai'
import { chuPhanSo } from '../trang-thai/TienDo'
import { cungCap, demTienDo, duongDanNut } from './dinh-vi'
import type { TraTrangThai } from './kieu'

const LOP_CHU_NHO = 'text-[length:var(--fs-chip)] leading-[var(--lh-chip)] text-muted tabular-nums'

function laMucHoc(nut: Nut): boolean {
  return nut.kind === 'topic' || nut.kind === 'document'
}

function MucMenu({
  nut,
  dangMo,
  cay,
  trangThaiCua,
}: {
  nut: Nut
  dangMo: boolean
  cay: Cay
  trangThaiCua: TraTrangThai
}) {
  const tt = laMucHoc(nut) ? trangThaiCua(nut.id) : null
  const phu = tt
    ? TEN_TRANG_THAI_HOC[tt]
    : chuPhanSo(demTienDo(cay, nut.id, trangThaiCua)) + (dangMo ? ' · đang mở' : '')
  return (
    <DropdownMenu.Item asChild>
      <Link
        to={duongDanNut(cay, nut)}
        aria-current={dangMo ? 'page' : undefined}
        data-nut={nut.id}
        className={`flex min-h-[30px] cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-text no-underline select-none focus-trong data-[highlighted]:bg-surface-2 ${
          dangMo ? 'bg-surface-2 font-semibold' : ''
        }`}
      >
        {tt && <IconTrangThai trangThai={tt} size={16} toMau />}
        <TenMuc className="min-w-0 flex-1">{nut.label}</TenMuc>
        <span className={`shrink-0 font-normal ${LOP_CHU_NHO}`}>{phu}</span>
      </Link>
    </DropdownMenu.Item>
  )
}

function CapCoMenu({ nut, cay, trangThaiCua }: { nut: Nut; cay: Cay; trangThaiCua: TraTrangThai }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-7 max-w-full cursor-pointer items-center gap-0.5 rounded-[var(--radius-sm)] px-1.5 text-left text-text transition-colors duration-150 hover:bg-surface-2 data-[state=open]:bg-surface-2"
        >
          <TenMuc className="min-w-0 truncate">{nut.label}</TenMuc>
          <ChevronDown size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          collisionPadding={16}
          className="z-50 flex max-h-[min(420px,var(--radix-dropdown-menu-content-available-height))] max-w-[min(400px,calc(100vw-32px))] min-w-[260px] flex-col gap-0.5 overflow-y-auto rounded-[var(--radius-md)] border border-border bg-surface p-1.5 text-text shadow-[var(--shadow-2)] data-[state=open]:animate-[hien-dan_150ms_ease-out]"
        >
          {cungCap(cay, nut).map((n) => (
            <MucMenu
              key={n.id}
              nut={n}
              dangMo={n.id === nut.id}
              cay={cay}
              trangThaiCua={trangThaiCua}
            />
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export interface PropsBreadcrumb {
  muc: MucHoc
  cay: Cay
  trangThaiCua: TraTrangThai
  className?: string
}

export default function Breadcrumb({ muc, cay, trangThaiCua, className = '' }: PropsBreadcrumb) {
  const cacCap = chuoiCha(cay, muc.id)
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
        {cacCap.map((nut) => (
          <Fragment key={nut.id}>
            <li className="min-w-0">
              <CapCoMenu nut={nut} cay={cay} trangThaiCua={trangThaiCua} />
            </li>
            <li aria-hidden="true">›</li>
          </Fragment>
        ))}
        <li aria-current="page" className="px-1.5 font-semibold text-text">
          <TenMuc>{muc.label}</TenMuc>
        </li>
      </ol>
    </nav>
  )
}
