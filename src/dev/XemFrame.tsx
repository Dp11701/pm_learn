// Trang dev /_dev/frame/:ma — xem frame thiết kế đã dựng bằng "npm run frame -- <mã>" ở đúng kích thước
// gốc, để đặt cạnh trang thật mà so (đề xuất mục 6). Tiêu đề, kích thước lấy từ canvas.json lúc chạy.
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

export interface Frame {
  ma: string
  tep: string
  tieuDe: string
  rong: number
  cao: number
}

const DUONG_CANVAS = '/docs/design-handoff/design/canvas.json'
const DUOI = '.dc.html'
const RE_MA = /^([A-Z]\d+[a-z]?)(?=-|$)/
const RE_TEN_TEP = /^[A-Za-z0-9_-]+$/
const RE_MA_TIEU_DE = /^([A-Z]\d+[a-z]?)\b/

const laDoiTuong = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x)

/** Cùng quy tắc với dsFrame() của scripts/xem-frame.ts (tests/xem-frame so khớp hai bản). */
export function dsFrame(canvas: unknown): Frame[] {
  if (!laDoiTuong(canvas) || !laDoiTuong(canvas.boards)) return []
  const boards = canvas.boards
  const thuTu = Array.isArray(canvas.order) ? canvas.order : Object.keys(boards)
  const daDung = new Set<string>()
  const ds: Frame[] = []
  for (const tep of thuTu) {
    const b = typeof tep === 'string' ? boards[tep] : undefined
    if (typeof tep !== 'string' || !laDoiTuong(b) || !tep.endsWith(DUOI)) continue
    const goc = tep.slice(0, -DUOI.length)
    if (!RE_TEN_TEP.test(goc)) continue
    const tieuDe = typeof b.title === 'string' ? b.title : tep
    const ma = RE_MA.exec(goc)?.[1] ?? RE_MA_TIEU_DE.exec(tieuDe)?.[1] ?? goc
    const maDung = daDung.has(ma.toLowerCase()) ? goc : ma
    daDung.add(maDung.toLowerCase())
    ds.push({ ma: maDung, tep, tieuDe, rong: Number(b.w) || 0, cao: Number(b.h) || 0 })
  }
  return ds
}

export function timFrame(ds: Frame[], khoa: string): Frame | undefined {
  const k = khoa
    .trim()
    .toLowerCase()
    .replace(/\.dc\.html$/, '')
  return (
    ds.find((f) => f.ma.toLowerCase() === k) ??
    ds.find((f) => f.tep.toLowerCase().slice(0, -DUOI.length) === k)
  )
}

interface BanDung {
  khoa: string
  daDung: boolean
  thieu: string[]
}

/** Đọc thẻ meta do script ghi; không có thì là trang SPA dự phòng của Vite, tức frame chưa dựng. */
function docBanDung(khoa: string, html: string): BanDung {
  const tl = new DOMParser().parseFromString(html, 'text/html')
  if (!tl.querySelector('meta[name="xem-frame"]')) return { khoa, daDung: false, thieu: [] }
  let thieu: string[] = []
  try {
    const v: unknown = JSON.parse(
      tl.querySelector('meta[name="xem-frame-thieu"]')?.getAttribute('content') ?? '[]',
    )
    if (Array.isArray(v)) thieu = v.map(String)
  } catch {
    thieu = ['Không đọc được danh sách chỗ chưa dựng']
  }
  return { khoa, daDung: true, thieu }
}

const nutLienKet = 'rounded-[6px] px-2 py-1 underline underline-offset-2 hover:bg-surface-2'
const nutBam =
  'h-8 rounded-[6px] border border-border-input bg-surface px-3 text-[13px] leading-5 font-medium'

export default function XemFrame() {
  const { ma = '' } = useParams()
  const [timKiem, datTimKiem] = useSearchParams()
  const vua = timKiem.get('vua') === '1'
  const [ds, datDs] = useState<Frame[] | 'loi' | null>(null)
  const [lan, datLan] = useState(0)
  const [ban, datBan] = useState<BanDung | null>(null)
  const [rongKhung, datRongKhung] = useState(0)

  useEffect(() => {
    let huy = false
    fetch(DUONG_CANVAS, { cache: 'no-store' })
      .then((r) =>
        r.ok ? (r.json() as Promise<unknown>) : Promise.reject(new Error(r.statusText)),
      )
      .then((j) => {
        if (!huy) datDs(dsFrame(j))
      })
      .catch(() => {
        if (!huy) datDs('loi')
      })
    return () => {
      huy = true
    }
  }, [])

  const frame = Array.isArray(ds) ? timFrame(ds, ma) : undefined
  const maFrame = frame?.ma
  const khoa = `${maFrame ?? ''}#${lan}`

  useEffect(() => {
    if (!maFrame) return
    const ctrl = new AbortController()
    const k = `${maFrame}#${lan}`
    fetch(`/.frame/${encodeURIComponent(maFrame)}.html`, { cache: 'no-store', signal: ctrl.signal })
      .then((r) => (r.ok ? r.text() : ''))
      .then((html) => datBan(docBanDung(k, html)))
      .catch(() => {
        if (!ctrl.signal.aborted) datBan({ khoa: k, daDung: false, thieu: [] })
      })
    return () => ctrl.abort()
  }, [maFrame, lan])

  useEffect(() => {
    if (maFrame) document.title = `Frame ${maFrame} · Học PM A–Z`
  }, [maFrame])

  const khungRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const ro = new ResizeObserver(([muc]) => datRongKhung(muc?.contentRect.width ?? 0))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const den = (m: string) => `/_dev/frame/${encodeURIComponent(m)}${vua ? '?vua=1' : ''}`
  const doiVua = () => {
    const moi = new URLSearchParams(timKiem)
    if (vua) moi.delete('vua')
    else moi.set('vua', '1')
    datTimKiem(moi, { replace: true })
  }

  if (ds === null) return <p className="p-4">Đang tải danh sách frame…</p>
  if (ds === 'loi')
    return (
      <p className="p-4">
        Không đọc được <code className="font-mono">{DUONG_CANVAS}</code>.
      </p>
    )

  const tatCa = (
    <details className="relative">
      <summary className="cursor-pointer rounded-[6px] px-2 py-1 hover:bg-surface-2">
        Tất cả frame ({ds.length})
      </summary>
      <ul className="absolute left-0 z-20 mt-1 max-h-[70vh] w-[480px] max-w-[calc(100vw-32px)] overflow-y-auto rounded-[10px] border border-border bg-surface p-2 shadow-[var(--shadow-2)]">
        {ds.map((f) => (
          <li key={f.ma}>
            <Link
              to={den(f.ma)}
              aria-current={f.ma === maFrame ? 'page' : undefined}
              className="flex gap-3 rounded-[6px] px-2 py-1 hover:bg-surface-2 aria-[current=page]:font-semibold"
            >
              <span className="w-[72px] flex-none font-mono text-[13px]">{f.ma}</span>
              <span>{f.tieuDe}</span>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  )

  if (!frame)
    return (
      <main className="p-4">
        <h1 className="text-[length:var(--fs-h2)] leading-[var(--lh-h2)] font-semibold">
          Không có frame “{ma}”
        </h1>
        <div className="mt-4">{tatCa}</div>
      </main>
    )

  const viTri = ds.indexOf(frame)
  const truoc = ds[viTri - 1]
  const sau = ds[viTri + 1]
  const tiLe = vua && rongKhung > 0 ? Math.min(1, rongKhung / frame.rong) : 1
  const dangTai = ban?.khoa !== khoa

  return (
    <div className="min-h-screen bg-surface-2 text-text">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-surface px-4 py-2 text-[13px] leading-5">
        <h1 className="text-[15px] leading-6 font-semibold">{frame.tieuDe}</h1>
        <span className="font-mono text-muted tabular-nums">
          {frame.rong}×{frame.cao} px{tiLe < 1 ? ` · thu còn ${Math.round(tiLe * 100)}%` : ''}
        </span>
        <nav aria-label="Chuyển frame" className="flex flex-wrap items-center gap-1">
          {truoc && (
            <Link to={den(truoc.ma)} className={nutLienKet}>
              ‹ {truoc.ma}
            </Link>
          )}
          {tatCa}
          {sau && (
            <Link to={den(sau.ma)} className={nutLienKet}>
              {sau.ma} ›
            </Link>
          )}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" aria-pressed={vua} onClick={doiVua} className={nutBam}>
            Vừa bề rộng
          </button>
          <button type="button" onClick={() => datLan((l) => l + 1)} className={nutBam}>
            Tải lại
          </button>
          <a
            href={`/.frame/${encodeURIComponent(frame.ma)}.html`}
            target="_blank"
            rel="noreferrer"
            className={nutLienKet}
          >
            Mở riêng
          </a>
        </div>
      </header>

      {!dangTai && ban.daDung && ban.thieu.length > 0 && (
        <section
          aria-label="Chỗ chưa dựng được"
          className="border-b border-border bg-surface px-4 py-2 text-[13px] leading-5"
        >
          <p className="font-semibold">Còn {ban.thieu.length} chỗ chưa dựng được:</p>
          <ul className="list-disc pl-5">
            {ban.thieu.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      <main ref={khungRef} className="overflow-x-auto">
        {dangTai ? (
          <p className="p-4">Đang tải frame…</p>
        ) : !ban.daDung ? (
          <div className="p-4">
            <p>Frame này chưa được dựng. Chạy lệnh dưới đây rồi bấm Tải lại:</p>
            <pre className="mt-2 font-mono text-[13px]">npm run frame -- {frame.ma}</pre>
          </div>
        ) : (
          <div
            className="overflow-hidden bg-surface"
            style={{ width: frame.rong * tiLe, height: frame.cao * tiLe }}
          >
            <iframe
              key={khoa}
              title={`Frame ${frame.tieuDe}`}
              src={`/.frame/${encodeURIComponent(frame.ma)}.html`}
              // Không có allow-scripts: mọi script trong trang dựng từ file thiết kế (dữ liệu tải về)
              // đều không chạy; allow-same-origin chỉ để trang hiện như thường khi chụp so sánh.
              sandbox="allow-same-origin"
              className="block border-0"
              style={{
                width: frame.rong,
                height: frame.cao,
                transform: tiLe < 1 ? `scale(${tiLe})` : undefined,
                transformOrigin: '0 0',
              }}
            />
          </div>
        )}
      </main>
    </div>
  )
}
