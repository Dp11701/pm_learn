// Card điều hướng của cột phải (F11, F15): tab [Mục lục | Trong lĩnh vực] (Radix Tabs: role tablist / tab / tabpanel,
// mũi tên trái phải đổi tab) — tablist nền surface-2, viền, bo 8, đệm 3; tab đang chọn nền surface, chữ 600, bóng 1.
// Mục lục: các khối thực sự hiện (D15). Trong lĩnh vực: hàng C9 rút gọn các mục cùng lĩnh vực.
// Dùng ở cột phải (≥ 1280) và trong panel trượt "Mục lục" (< 1280, `khiChonMuc` để panel đóng rồi mới tới khối).
import { useState } from 'react'
import { Tabs } from 'radix-ui'
import type { Cay, MucHoc } from '../../../../shared/roadmap'
import MucLuc, { type DongMucLuc } from '../../../components/bai-hoc/MucLuc'
import TrongLinhVuc from '../../../components/bai-hoc/TrongLinhVuc'
import type { TraTrangThai } from '../../../components/bai-hoc/kieu'

export type TabDieuHuong = 'muc-luc' | 'trong-linh-vuc'

export interface PropsTheDieuHuong {
  muc: MucHoc
  cay: Cay
  /** null: bài đang tải */
  mucLuc: readonly DongMucLuc[] | null
  trangThaiCua: TraTrangThai
  khiChonMuc?: (id: string) => void
}

const LOP_TAB =
  'h-[30px] min-w-0 flex-1 cursor-pointer rounded-[var(--radius-sm)] border-0 bg-transparent px-2 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-medium text-muted transition-colors duration-150 hover:text-text data-[state=active]:bg-surface data-[state=active]:font-semibold data-[state=active]:text-text data-[state=active]:shadow-[var(--shadow-1)]'

export default function TheDieuHuong({
  muc,
  cay,
  mucLuc,
  trangThaiCua,
  khiChonMuc,
}: PropsTheDieuHuong) {
  const [tab, datTab] = useState<TabDieuHuong>('muc-luc')
  return (
    <Tabs.Root
      value={tab}
      onValueChange={(v) => datTab(v as TabDieuHuong)}
      className="flex flex-col gap-3"
    >
      <Tabs.List
        aria-label="Điều hướng trong bài"
        className="flex gap-0.5 rounded-[8px] border border-border bg-surface-2 p-[3px]"
      >
        <Tabs.Trigger value="muc-luc" className={LOP_TAB}>
          Mục lục
        </Tabs.Trigger>
        <Tabs.Trigger value="trong-linh-vuc" className={LOP_TAB}>
          Trong lĩnh vực
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="muc-luc" className="rounded-[var(--radius-sm)]">
        <MucLuc cacDong={mucLuc} khiChon={khiChonMuc} />
      </Tabs.Content>
      <Tabs.Content value="trong-linh-vuc" className="rounded-[var(--radius-sm)]">
        <TrongLinhVuc muc={muc} cay={cay} trangThaiCua={trangThaiCua} />
      </Tabs.Content>
    </Tabs.Root>
  )
}
