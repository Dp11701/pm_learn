// F27 Bảng phím tắt ("?"): dialog 720px cách đỉnh 72, nhóm theo phạm vi thành lưới 2 cột (mobile 1 cột),
// phím kiểu JetBrains Mono, ô ghi chú cuối bảng. Mọi dòng lấy từ sổ phím (src/app/phim-tat.tsx).
// Nút đóng "Esc Đóng" của frame thay cho nút X mặc định của C32; nhận focus đầu tiên khi mở.
// Hiện đủ bảng §11 như frame, kể cả phím của màn hình chưa có (sổ ghi phase có tác dụng).
import { Dialog } from 'radix-ui'
import { Info } from 'lucide-react'
import HopThoai from './HopThoai'
import type { NhomBangPhimTat } from '../app/phim-tat'

export interface PropsBangPhimTat {
  mo: boolean
  doiMo: (mo: boolean) => void
  nhom: readonly NhomBangPhimTat[]
}

const LOP_PHIM =
  'inline-flex h-6 min-w-6 items-center justify-center rounded-[4px] border border-b-2 border-border-input bg-[var(--phim-tat-nen)] px-1.5 font-mono text-xs leading-[18px] text-text'

export default function BangPhimTat({ mo, doiMo, nhom }: PropsBangPhimTat) {
  return (
    <HopThoai
      mo={mo}
      doiMo={doiMo}
      tieuDe="Phím tắt"
      rong={720}
      nutDong={false}
      className="gap-5! md:top-[72px]"
    >
      <Dialog.Close asChild>
        <button
          type="button"
          aria-label="Đóng (Esc)"
          className="absolute top-[22px] right-6 inline-flex h-[var(--h-control)] items-center gap-2 rounded-[var(--radius-sm)] border border-border-input bg-transparent px-2.5 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-medium text-text transition-colors duration-150 hover:border-text hover:bg-[var(--phim-tat-nen)] max-md:top-[17px] max-md:h-[var(--h-control-touch)]"
        >
          <kbd className="font-mono text-[12px]">Esc</kbd>
          Đóng
        </button>
      </Dialog.Close>
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
        {nhom.map((n) => (
          <section key={n.ten} className="flex flex-col gap-1">
            <h3 className="m-0 mb-1 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-semibold text-muted">
              {n.ten}
            </h3>
            <dl className="m-0 flex flex-col">
              {n.dong.map((d) => (
                <div
                  key={`${d.phamVi}:${d.moTa}`}
                  className="flex min-h-9 items-center justify-between gap-3 border-b border-[var(--phim-tat-vach)]"
                >
                  <dt>{d.moTa}</dt>
                  <dd className="m-0 flex gap-1">
                    {d.phim.map((k) => (
                      <kbd key={k.ma} className={LOP_PHIM}>
                        {k.hienThi}
                      </kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <div className="flex gap-2.5 rounded-[var(--radius-md)] border border-border-input bg-[var(--phim-tat-nen)] px-3.5 py-3 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
        <Info
          size={18}
          strokeWidth={1.75}
          aria-hidden="true"
          className="mt-px shrink-0 text-text"
        />
        <span>
          Phím tắt không chạy khi bạn đang gõ, kể cả lúc Telex/VNI đang ghép chữ. Phím được nhận
          theo vị trí vật lý trên bàn phím.
        </span>
      </div>
    </HopThoai>
  )
}
