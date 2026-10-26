// Dialog "Sao chép prompt soạn bài" (F19 trái, §8.7, D14): C32 giữa màn hình rộng 640. Tiêu đề + "<tên> ·
// <loại>", nhãn "Xem trước prompt", khối mono 13/20 cuộn được (Tab tới được, tối đa 520px) chứa prompt của
// buildPrompt (shared/noi-dung), chân: "App không tự gọi AI." + Huỷ + Sao chép (nút chính, focus sẵn như F19).
// Sao chép bằng Clipboard API; trình duyệt không cho thì chọn sẵn toàn bộ prompt để tự nhấn ⌘C / Ctrl+C.
// Sao chép xong: đóng dialog, toast. App không gọi AI (§13).
import { useId, useMemo, useRef, useState, type ReactElement } from 'react'
import { Copy, Info } from 'lucide-react'
import { buildPrompt } from '../../shared/noi-dung'
import { TEN_LOAI } from '../../shared/domain/trang-thai'
import type { Cay, MucHoc } from '../../shared/roadmap'
import HopThoai from './HopThoai'
import Nut from './Nut'
import TenMuc from './TenMuc'
import { useToast } from './Toast'
import { DA_SAO_CHEP_PROMPT, KHONG_SAO_CHEP_DUOC } from '../copy/cho-duyet'

/** Ghi chữ vào clipboard; false khi trình duyệt không có Clipboard API hoặc từ chối. */
export async function ghiClipboard(chu: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(chu)
    return true
  } catch {
    return false
  }
}

/** Chọn toàn bộ chữ trong một phần tử (dự phòng khi không ghi được clipboard). */
function chonHet(el: HTMLElement | null) {
  if (!el) return
  el.focus()
  const chon = window.getSelection()
  if (!chon) return
  chon.removeAllRanges()
  const vung = document.createRange()
  vung.selectNodeContents(el)
  chon.addRange(vung)
}

/** Chờ dialog đóng xong (an-dan 150ms) rồi mới hiện toast. */
export const TRE_TOAST = 200

export interface PropsHopThoaiPrompt {
  muc: MucHoc
  cay: Cay
  /** Nút mở (Radix Trigger asChild): focus trả về đây khi đóng. */
  nutMo: ReactElement
}

export default function HopThoaiPrompt({ muc, cay, nutMo }: PropsHopThoaiPrompt) {
  const [mo, datMoThat] = useState(false)
  // Không ghi được clipboard: câu hướng dẫn nằm trong dialog (vùng status), vì lúc dialog mở phần còn lại
  // của trang (kể cả vùng toast) bị Radix ẩn khỏi trình đọc màn hình.
  const [khongChepDuoc, datKhongChepDuoc] = useState(false)
  const { toast } = useToast()
  const idNhan = useId()
  const refKhung = useRef<HTMLPreElement>(null)
  const refSaoChep = useRef<HTMLButtonElement>(null)
  const prompt = useMemo(() => buildPrompt(muc, cay), [muc, cay])

  function datMo(moi: boolean) {
    datMoThat(moi)
    datKhongChepDuoc(false)
  }

  async function saoChep() {
    if (await ghiClipboard(prompt)) {
      datMo(false)
      // Toast sau khi dialog đóng hẳn (hiệu ứng 150ms): trước đó vùng toast còn bị ẩn khỏi trình đọc màn hình.
      window.setTimeout(() => toast({ noiDung: DA_SAO_CHEP_PROMPT }), TRE_TOAST)
      return
    }
    chonHet(refKhung.current)
    datKhongChepDuoc(true)
  }

  return (
    <HopThoai
      mo={mo}
      doiMo={datMo}
      nutMo={nutMo}
      rong={640}
      tieuDe="Sao chép prompt soạn bài"
      phuDe={
        <>
          <TenMuc>{muc.label}</TenMuc> · {TEN_LOAI[muc.mau]}
        </>
      }
      focusDau={refSaoChep}
      chan={
        <>
          <p className="m-0 mr-auto flex min-w-0 flex-[1_1_200px] items-center gap-1.5 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
            <Info size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
            App không tự gọi AI.
          </p>
          <Nut bien="ghost" onClick={() => datMo(false)}>
            Huỷ
          </Nut>
          <Nut ref={refSaoChep} bien="chinh" icon={Copy} onClick={() => void saoChep()}>
            Sao chép
          </Nut>
        </>
      }
    >
      <div className="flex min-h-0 flex-col gap-2">
        <span
          id={idNhan}
          className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-semibold"
        >
          Xem trước prompt
        </span>
        <pre
          ref={refKhung}
          role="region"
          aria-labelledby={idNhan}
          // Khối cuộn được: Tab tới được để cuộn bằng phím (như F19 tabindex="0").
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          className="m-0 max-h-[520px] overflow-auto rounded-[var(--radius-sm)] border border-border bg-bg p-4 font-mono text-[length:var(--fs-meta)] leading-[var(--lh-meta)] whitespace-pre-wrap max-md:max-h-[50dvh] max-md:p-3"
        >
          {prompt}
        </pre>
        <p role="status" className="m-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)]">
          {khongChepDuoc ? KHONG_SAO_CHEP_DUOC : ''}
        </p>
      </div>
    </HopThoai>
  )
}
