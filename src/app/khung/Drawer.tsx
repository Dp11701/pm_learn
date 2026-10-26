// Drawer menu < 1024px (F28): Radix Dialog từ trái, rộng 312, chứa C34 bản mobile. Giữ focus bên trong,
// Esc / X / bấm ra ngoài thì đóng và trả focus về nút menu; đóng vì chuyển trang thì focus về H1 trang mới;
// đóng để mở tìm kiếm / bảng phím tắt thì để lớp kia giữ focus.
// Không dùng HopThoai vì cần tự quyết nơi trả focus theo lý do đóng.
import type { RefObject } from 'react'
import { Dialog } from 'radix-ui'
import { dangGhepChu } from '../../components/TruongNhap'
import { focusDauTrang } from './focus'
import Sidebar, { type HanhDongSidebar } from './Sidebar'

export type LyDoDongDrawer = HanhDongSidebar | null

export interface PropsDrawer {
  mo: boolean
  /** Đóng drawer, kèm lý do để biết trả focus về đâu (null = Esc, X, bấm ra ngoài). */
  dong: (lyDo: LyDoDongDrawer) => void
  /** Lý do của lần đóng gần nhất; Drawer đọc rồi xoá khi trả focus. */
  lyDoDongRef: RefObject<LyDoDongDrawer>
  nutMenuRef: RefObject<HTMLButtonElement | null>
}

export default function Drawer({ mo, dong, lyDoDongRef, nutMenuRef }: PropsDrawer) {
  return (
    <Dialog.Root open={mo} onOpenChange={(m) => !m && dong(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--scrim)] data-[state=closed]:animate-[an-dan_150ms_ease-in] data-[state=open]:animate-[hien-dan_150ms_ease-out]" />
        <Dialog.Content
          aria-modal="true"
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => {
            // Esc lúc Telex/VNI đang ghép chữ chỉ huỷ ghép (đề xuất 5).
            if (dangGhepChu(e)) e.preventDefault()
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            const lyDo = lyDoDongRef.current
            lyDoDongRef.current = null
            if (lyDo === 'lop-khac') return
            // Nút menu không còn (cửa sổ nới rộng quá 1024 lúc drawer mở) → về H1 như chuyển trang.
            const nutMenu = lyDo === null ? nutMenuRef.current : null
            if (nutMenu?.isConnected) nutMenu.focus()
            else focusDauTrang()
          }}
          className="fixed inset-y-0 left-0 z-50 flex w-[min(var(--drawer-w),100vw)] flex-col overflow-y-auto border-r border-[var(--border-dialog)] bg-surface text-text shadow-[var(--shadow-3)] outline-none motion-safe:data-[state=closed]:animate-[ra-trai_150ms_ease-in] motion-safe:data-[state=open]:animate-[vao-tu-trai_200ms_ease-out] motion-reduce:data-[state=closed]:animate-[an-dan_150ms_ease-in] motion-reduce:data-[state=open]:animate-[hien-dan_150ms_ease-out]"
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <Sidebar mobile khiDong={() => dong(null)} khiChon={(hanhDong) => dong(hanhDong)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
