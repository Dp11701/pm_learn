// Thanh thao tác hàng loạt của danh sách (§8.3, đề xuất 3.9, bất biến 2): ô chọn tất cả mục đang hiện (ba trạng
// thái) · "Đã chọn n mục" · "Đặt trạng thái…" (menu Radix: chỉ Chưa học / Đang học / Bỏ qua — không có Đã xong) ·
// "Bỏ chọn". Kết quả hiện toast có Hoàn tác (useDatHangLoat). Ghi xong thì bỏ chọn.
// Không có mục nào được chọn: nút "Đặt trạng thái…" là aria-disabled (không `disabled`) để focus không rơi về <body>
// khi vừa ghi xong và bỏ chọn (Radix trả focus về nút sau khi chọn trong menu).
import { useEffect, useRef, useState } from 'react'
import { DropdownMenu } from 'radix-ui'
import { ChevronDown } from 'lucide-react'
import {
  CAC_TRANG_THAI_HANG_LOAT,
  type TrangThaiHangLoat,
} from '../../../server/du-lieu/hop-dong-trang-thai'
import { TEN_TRANG_THAI_HOC } from '../../../shared/domain/trang-thai'
import { useDatHangLoat } from '../../app/du-lieu/trang-thai'
import {
  BO_CHON,
  CHON_TAT_CA,
  DANG_LUU_HANG_LOAT,
  daChon,
  HUONG_DAN_CHON,
} from '../../copy/cho-duyet-lo-trinh'
import Nut from '../Nut'
import IconTrangThai from '../trang-thai/IconTrangThai'
import { LOP_CHU_META } from '../trang-thai/mau-trang-thai'
import type { ChonNhieu } from './chon-nhieu'
import { LOP_TAT_ARIA } from './lop'

export interface PropsThanhHangLoat {
  /** id các mục đang hiện (chọn tất cả chỉ chọn các mục này) */
  hienIds: readonly string[]
  chonNhieu: ChonNhieu
  className?: string
}

export default function ThanhHangLoat({ hienIds, chonNhieu, className = '' }: PropsThanhHangLoat) {
  const { chon, datTatCa, boChon } = chonNhieu
  const { dat, dangLuu } = useDatHangLoat()
  const n = chon.size
  const tatCa = n > 0 && n === hienIds.length
  const oTatCa = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (oTatCa.current) oTatCa.current.indeterminate = n > 0 && !tatCa
  }, [n, tatCa])

  const [moMenu, datMoMenu] = useState(false)
  const khongChon = n === 0

  function datTrangThai(trangThai: TrangThaiHangLoat) {
    // Giữ thứ tự đang hiện (thứ tự của toast / sự kiện)
    dat(
      hienIds.filter((id) => chon.has(id)),
      trangThai,
      boChon,
    )
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 ${className}`}
    >
      <label className={`flex cursor-pointer items-center gap-2 ${LOP_CHU_META}`}>
        <input
          ref={oTatCa}
          type="checkbox"
          checked={tatCa}
          disabled={hienIds.length === 0}
          onChange={() => datTatCa(!tatCa)}
          className="size-4 cursor-pointer accent-[var(--primary)]"
        />
        {CHON_TAT_CA}
      </label>
      <span aria-live="polite" className={`tabular-nums ${LOP_CHU_META} text-muted`}>
        {daChon(n)}
      </span>
      <DropdownMenu.Root open={moMenu && !khongChon} onOpenChange={datMoMenu}>
        <DropdownMenu.Trigger asChild>
          <Nut
            bien="phu"
            co="nho"
            dangXuLy={dangLuu}
            aria-disabled={khongChon || undefined}
            className={LOP_TAT_ARIA}
          >
            Đặt trạng thái…
            {dangLuu ? (
              <span className="sr-only">{DANG_LUU_HANG_LOAT}</span>
            ) : (
              <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
            )}
          </Nut>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            collisionPadding={16}
            className="z-50 flex min-w-[200px] flex-col gap-0.5 rounded-[var(--radius-md)] border border-border bg-surface p-1.5 text-text shadow-[var(--shadow-2)]"
          >
            {CAC_TRANG_THAI_HANG_LOAT.map((tt) => (
              <DropdownMenu.Item
                key={tt}
                onSelect={() => datTrangThai(tt)}
                className={`flex min-h-8 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 outline-none select-none data-[highlighted]:bg-surface-2 ${LOP_CHU_META}`}
              >
                <IconTrangThai trangThai={tt} size={16} toMau />
                {TEN_TRANG_THAI_HOC[tt]}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <Nut
        bien="ghost"
        co="nho"
        disabled={khongChon}
        onClick={() => {
          boChon()
          // Nút tự tắt sau khi bỏ chọn: đưa focus về ô chọn tất cả thay vì để rơi về <body>
          oTatCa.current?.focus()
        }}
      >
        {BO_CHON}
      </Nut>
      <span className={`ml-auto ${LOP_CHU_META} text-muted`}>{HUONG_DAN_CHON}</span>
    </div>
  )
}
