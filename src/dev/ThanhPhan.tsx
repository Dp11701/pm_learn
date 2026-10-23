// /_dev/thanh-phan — gallery design system (F01; F02, F02b thêm ở phase 1). Chỉ có ở bản dev.
import { Suspense, use } from 'react'
import ChonGiaoDien from '../components/ChonGiaoDien'
import F01, { type MauF01 } from './thanh-phan/F01'

// Chữ mẫu (tên mục, câu mẫu) chỉ nằm trong fixtures/mau, nạp động ở bản dev (đề xuất mục 6).
const taiMau: Promise<MauF01 | null> = import.meta.env.DEV
  ? import('../../fixtures/mau/thanh-phan').then((m) => m.mauF01)
  : Promise.resolve(null)

function NoiDung() {
  const mau = use(taiMau)
  if (!mau) return <p className="text-muted">Gallery chỉ có ở bản dev.</p>
  return <F01 mau={mau} />
}

export default function ThanhPhan() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <title>Design system · Học PM A–Z</title>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-6 md:px-10 md:py-10 xl:px-20 xl:pt-10 xl:pb-16">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
            /_dev/thanh-phan · chỉ có ở bản dev
          </span>
          <ChonGiaoDien />
        </header>
        <main>
          <Suspense fallback={<p className="text-muted">Đang tải chữ mẫu…</p>}>
            <NoiDung />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
