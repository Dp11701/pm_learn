// Chọn giao diện Sáng / Tối / Theo hệ thống: radiogroup (mũi tên, Home, End), focus đi theo lựa chọn.
// Phase 1 đưa vào sidebar (C34) và Cài đặt.
import { useId, useRef, type KeyboardEvent } from 'react'
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { CAC_GIAO_DIEN, TEN_GIAO_DIEN, useGiaoDien, type GiaoDien } from '../app/giao-dien'

const ICON: Record<GiaoDien, LucideIcon> = { sang: Sun, toi: Moon, 'he-thong': Monitor }

export default function ChonGiaoDien({ className = '' }: { className?: string }) {
  const [giaoDien, datGiaoDien] = useGiaoDien()
  const idNhan = useId()
  const nut = useRef<Partial<Record<GiaoDien, HTMLButtonElement | null>>>({})

  function chon(g: GiaoDien) {
    datGiaoDien(g)
    nut.current[g]?.focus()
  }

  function khiPhim(e: KeyboardEvent, g: GiaoDien) {
    const i = CAC_GIAO_DIEN.indexOf(g)
    const n = CAC_GIAO_DIEN.length
    const dich: Record<string, number> = {
      ArrowRight: (i + 1) % n,
      ArrowDown: (i + 1) % n,
      ArrowLeft: (i - 1 + n) % n,
      ArrowUp: (i - 1 + n) % n,
      Home: 0,
      End: n - 1,
    }
    // Giữ Alt/Ctrl/⌘ là phím tắt của trình duyệt, hệ điều hành (vd. Alt+← để quay lại): không chặn.
    if (e.altKey || e.ctrlKey || e.metaKey || !(e.key in dich)) return
    e.preventDefault()
    chon(CAC_GIAO_DIEN[dich[e.key]])
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      <span
        id={idNhan}
        className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted"
      >
        Giao diện
      </span>
      <div
        role="radiogroup"
        aria-labelledby={idNhan}
        className="inline-flex rounded-[var(--radius-sm)] border border-border-input bg-surface"
      >
        {CAC_GIAO_DIEN.map((g) => {
          const Icon = ICON[g]
          const dangChon = g === giaoDien
          return (
            <button
              key={g}
              ref={(el) => {
                nut.current[g] = el
              }}
              type="button"
              role="radio"
              aria-checked={dangChon}
              tabIndex={dangChon ? 0 : -1}
              onClick={() => chon(g)}
              onKeyDown={(e) => khiPhim(e, g)}
              className={`inline-flex h-[calc(var(--h-control)-2px)] items-center gap-2 px-3 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-medium transition-colors duration-150 not-first:border-l not-first:border-border-input first:rounded-l-[calc(var(--radius-sm)-1px)] last:rounded-r-[calc(var(--radius-sm)-1px)] max-md:h-[calc(var(--h-control-touch)-2px)] ${
                dangChon ? 'bg-primary text-on-primary' : 'text-text hover:bg-surface-2'
              }`}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              {TEN_GIAO_DIEN[g]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
