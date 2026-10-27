// Mục lục của bài (F11, F12, F15 tab "Mục lục"; D15: sinh từ các khối THỰC SỰ hiện — danh sách mucLuc() của
// src/pages/bai-hoc/bo-cuc.ts). Mỗi khối một hàng 13/20, cao ≥ 32, bo 6, chấm 6px; khối đang đọc (cuộn tới) có
// nền surface-2, chữ 600, chấm màu chữ và aria-current="location" (như frame).
// Bấm một hàng: cuộn tới khối (mượt, trừ khi giảm chuyển động) và đưa focus vào khối (KhoiBai có tabIndex -1),
// không đổi URL — như thanh 4 bước (DauBai). Panel trượt (< 1280) truyền `khiChon` để đóng panel trước.
import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { DongCho, VungDangTai } from '../TrangThaiTrong'
import { MUC_LUC_TRONG } from '../../copy/cho-duyet'

export interface DongMucLuc {
  id: string
  ten: string
}

/** Khối có mép trên ở trong chừng này px tính từ đỉnh cửa sổ thì tính là "đang đọc". */
const LECH_DANG_DOC = 120

/** Cuộn tới khối `id` và đưa focus vào đó; false khi không có khối. */
export function denKhoi(id: string): boolean {
  const khoi = document.getElementById(id)
  if (!khoi) return false
  const giam = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  khoi.scrollIntoView?.({ behavior: giam ? 'auto' : 'smooth', block: 'start' })
  khoi.focus({ preventScroll: true })
  return true
}

/** Khối đang đọc theo vị trí cuộn: khối cuối có mép trên đã qua LECH_DANG_DOC; cuộn hết trang thì khối cuối. */
function tinhKhoiDangDoc(ids: readonly string[]): string | null {
  const cac = ids.flatMap((id) => {
    const el = document.getElementById(id)
    return el ? [{ id, rect: el.getBoundingClientRect() }] : []
  })
  if (cac.length === 0) return null
  // Chưa đo được (chưa bố cục, môi trường không vẽ): khối đầu.
  if (cac.every((k) => k.rect.height === 0)) return cac[0].id
  const goc = document.documentElement
  const cuonHet =
    goc.scrollHeight > window.innerHeight + 4 &&
    window.innerHeight + window.scrollY >= goc.scrollHeight - 4
  if (cuonHet) return cac[cac.length - 1].id
  let dangDoc = cac[0].id
  for (const k of cac) if (k.rect.top <= LECH_DANG_DOC) dangDoc = k.id
  return dangDoc
}

/** Khối đang đọc (cập nhật khi cuộn, đổi cỡ) + hàm đặt ngay khi bấm một hàng. */
export function useKhoiDangDoc(ids: readonly string[]): [string | null, (id: string) => void] {
  const khoa = ids.join('\n')
  const [dangDoc, datDangDoc] = useState<string | null>(null)
  useEffect(() => {
    const ds = khoa ? khoa.split('\n') : []
    let hen = 0
    const tinh = () => {
      hen = 0
      datDangDoc(tinhKhoiDangDoc(ds))
    }
    const khiCuon = () => {
      if (!hen) hen = window.requestAnimationFrame(tinh)
    }
    tinh()
    window.addEventListener('scroll', khiCuon, { passive: true })
    window.addEventListener('resize', khiCuon)
    return () => {
      if (hen) window.cancelAnimationFrame(hen)
      window.removeEventListener('scroll', khiCuon)
      window.removeEventListener('resize', khiCuon)
    }
  }, [khoa])
  const dat = useCallback((id: string) => datDangDoc(id), [])
  return [dangDoc, dat]
}

export interface PropsMucLuc {
  /** null: bài đang tải */
  cacDong: readonly DongMucLuc[] | null
  /** Thay việc mặc định (cuộn + focus), vd. panel trượt đóng rồi mới tới khối. */
  khiChon?: (id: string) => void
}

export default function MucLuc({ cacDong, khiChon }: PropsMucLuc) {
  const [dangDoc, datDangDoc] = useKhoiDangDoc(cacDong?.map((d) => d.id) ?? [])

  if (cacDong === null) {
    return (
      <VungDangTai className="flex flex-col gap-3 py-1.5">
        <DongCho rong="70%" />
        <DongCho rong="85%" />
        <DongCho rong="60%" />
      </VungDangTai>
    )
  }
  if (cacDong.length === 0) {
    return (
      <p className="m-0 px-2 py-1.5 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
        {MUC_LUC_TRONG}
      </p>
    )
  }

  function chon(id: string, e: MouseEvent<HTMLAnchorElement>) {
    if (!document.getElementById(id)) return
    e.preventDefault()
    datDangDoc(id)
    if (khiChon) khiChon(id)
    else denKhoi(id)
  }

  return (
    <ol className="m-0 flex list-none flex-col p-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)]">
      {cacDong.map((d) => {
        const dangMo = d.id === dangDoc
        return (
          <li key={d.id}>
            <a
              href={`#${d.id}`}
              aria-current={dangMo ? 'location' : undefined}
              onClick={(e) => chon(d.id, e)}
              className={`flex min-h-8 items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-text no-underline transition-colors duration-150 ${
                dangMo ? 'bg-surface-2 font-semibold' : 'hover:bg-surface-2'
              }`}
            >
              <span
                aria-hidden="true"
                className={`size-1.5 shrink-0 rounded-full ${dangMo ? 'bg-text' : 'bg-border'}`}
              />
              <span className="min-w-0 [overflow-wrap:anywhere]">{d.ten}</span>
            </a>
          </li>
        )
      })}
    </ol>
  )
}
