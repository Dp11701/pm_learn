// /_dev/thanh-phan — gallery design system dựng bằng token và component thật. Chỉ có ở bản dev.
// /_dev/thanh-phan = F01 (token) · /f02 = F02 (component phần 1) · /f02b = F02b (component phần 2).
import { Suspense, use } from 'react'
import { NavLink, useParams } from 'react-router'
import ChonGiaoDien from '../components/ChonGiaoDien'
import { lopNut } from '../components/Nut'
import F01 from './thanh-phan/F01'
import F02 from './thanh-phan/F02'
import F02b from './thanh-phan/F02b'
import { useGiaTrangThai } from './thanh-phan/gia-trang-thai'

type BoMau = typeof import('../../fixtures/mau/thanh-phan')

// Chữ mẫu (tên mục, câu mẫu, số liệu) chỉ nằm trong fixtures/mau, nạp động ở bản dev (đề xuất mục 6).
const taiMau: Promise<BoMau | null> = import.meta.env.DEV
  ? import('../../fixtures/mau/thanh-phan')
  : Promise.resolve(null)

const DUONG_DAN = '/_dev/thanh-phan'

type MaTrang = 'f01' | 'f02' | 'f02b'

const TRANG: { ma: MaTrang; den: string; nhan: string; ten: string }[] = [
  { ma: 'f01', den: DUONG_DAN, nhan: 'F01', ten: 'Design system' },
  { ma: 'f02', den: `${DUONG_DAN}/f02`, nhan: 'F02', ten: 'Component phần 1' },
  { ma: 'f02b', den: `${DUONG_DAN}/f02b`, nhan: 'F02b', ten: 'Component phần 2' },
]

function maTrang(phan: string | undefined): MaTrang | null {
  if (phan === undefined) return 'f01'
  const ma = phan.toLowerCase()
  return ma === 'f02' || ma === 'f02b' ? ma : null
}

function NoiDung({ ma }: { ma: MaTrang | null }) {
  const mau = use(taiMau)
  if (!mau) return <p className="text-muted">Gallery chỉ có ở bản dev.</p>
  if (ma === 'f02') return <F02 mau={mau.mauF02} />
  if (ma === 'f02b') return <F02b mau={mau.mauF02b} />
  if (ma === 'f01') return <F01 mau={mau.mauF01} />
  return (
    <p className="m-0 text-muted">Không có trang gallery này. Chọn F01, F02 hoặc F02b ở trên.</p>
  )
}

export default function ThanhPhan() {
  const { phan } = useParams()
  const ma = maTrang(phan)
  const trang = TRANG.find((t) => t.ma === ma)
  useGiaTrangThai()
  return (
    <div className="min-h-screen bg-bg text-text">
      <title>{`${trang?.ten ?? 'Gallery'} · Học PM A–Z`}</title>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-6 md:px-10 md:py-10 xl:px-20 xl:pt-10 xl:pb-16">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
              /_dev/thanh-phan · chỉ có ở bản dev
            </span>
            <nav aria-label="Trang gallery">
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {TRANG.map((t) => (
                  <li key={t.ma}>
                    <NavLink
                      to={t.den}
                      end
                      aria-label={`${t.nhan} · ${t.ten}`}
                      className={({ isActive }) => lopNut({ bien: isActive ? 'chinh' : 'phu' })}
                    >
                      <span>{t.nhan}</span>
                      <span className="max-sm:hidden">· {t.ten}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <ChonGiaoDien />
        </header>
        <main>
          <Suspense fallback={<p className="text-muted">Đang tải chữ mẫu…</p>}>
            <NoiDung ma={ma} />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
