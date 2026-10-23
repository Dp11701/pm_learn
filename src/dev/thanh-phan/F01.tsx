// F01 Design system (docs/design-handoff/design/Main.dc.html, bản Tối F01-toi) dựng bằng token thật:
// đổi giao diện là đổi màu toàn trang. Mã màu và tỉ lệ tương phản đọc lúc chạy (getComputedStyle),
// chữ mẫu (tên mục, câu mẫu) nhận qua prop `mau` từ fixtures/mau/thanh-phan.ts.
import type { CSSProperties, ReactNode } from 'react'
import {
  Award,
  BookOpen,
  Briefcase,
  Circle,
  CircleCheck,
  CircleSlash,
  Contrast,
  Cpu,
  FileCheck,
  FilePen,
  FileText,
  FileX,
  Folder,
  Info,
  Layers,
  RotateCcw,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { TEN_GIAO_DIEN, useGiaoDienHieuLuc } from '../../app/giao-dien'
import { dinhDangTiLe, docMau, sangHex, tiLeTuongPhan } from './tuong-phan'

export type IconPhan = 'briefcase' | 'trending-up' | 'cpu' | 'wrench' | 'award'

/** Chữ mẫu F01 cần (fixtures/mau/thanh-phan.ts). */
export type MauF01 = {
  moTa: string
  linhVuc: { ten: string; phanSo: string }
  chuDe: string
  taiLieu: string
  chungChi: string
  nhom: string
  boQua: string
  canOnLai: string
  ngayDuyet: string
  chu: {
    h1: string
    h2: string
    thanBai: string
    thanBaiEn: string
    ui: string
    meta: string
    chip: string
    mono: string
  }
  chuThich: { nhan: string; bienThe: string[]; tieuDe: string; doan: string }
  iconPhan: { icon: IconPhan; nhan: string }[]
}

const ICON_PHAN: Record<IconPhan, LucideIcon> = {
  briefcase: Briefcase,
  'trending-up': TrendingUp,
  cpu: Cpu,
  wrench: Wrench,
  award: Award,
}

const META = 'text-[length:var(--fs-meta)] leading-[var(--lh-meta)]'
const CHIP = 'text-[length:var(--fs-chip)] leading-[var(--lh-chip)] font-semibold'
const H2 = 'm-0 text-[length:var(--fs-h2)] leading-[var(--lh-h2)] font-semibold'
const THE = 'rounded-[var(--radius-md)] border border-border bg-surface'
const NUT = `box-border flex items-center gap-2 rounded-[var(--radius-sm)] border-[1.5px] border-solid ${META} font-semibold`
const NUT_MUC = `${NUT} min-h-10 w-[240px] max-w-full px-3 py-2`
const O_CHIP = `inline-flex h-[var(--h-chip)] items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 ${CHIP}`

type Loai = 'area' | 'topic' | 'doc' | 'group'
const mauLoai = (loai: Loai): CSSProperties => ({
  borderColor: `var(--type-${loai}-bd)`,
  backgroundColor: `var(--type-${loai}-bg)`,
  color: `var(--type-${loai}-fg)`,
})

const TRANG_THAI: { nhan: string; ma: string; Icon: LucideIcon; moTa: string }[] = [
  { nhan: 'Chưa học', ma: 'none', Icon: Circle, moTa: 'Không có vạch trái' },
  { nhan: 'Đang học', ma: 'learning', Icon: Contrast, moTa: 'Vòng tô nửa' },
  { nhan: 'Đã xong', ma: 'done', Icon: CircleCheck, moTa: 'circle-check' },
  { nhan: 'Bỏ qua', ma: 'skip', Icon: CircleSlash, moTa: 'circle-slash + sọc' },
  { nhan: 'Cần ôn lại', ma: 'review', Icon: RotateCcw, moTa: 'Cờ suy ra, tự tắt khi ôn xong' },
]

const KENH: [string, string][] = [
  ['Nền vàng/be/đen/xanh', 'Loại nút. Không dùng cho trạng thái, banner, callout.'],
  [
    'Icon trạng thái + vạch trái 4px + chữ',
    'Trạng thái học. Vạch trái chỉ dành cho trạng thái học; card, banner không dùng.',
  ],
  ['Sọc chéo + circle-slash', 'Bỏ qua. Chồng lên nền loại để vẫn nhận ra loại.'],
  [
    'file-x / file-pen / file-check',
    'Trạng thái nội dung. Trên bản đồ chỉ ở lớp phủ Độ phủ nội dung.',
  ],
  ['Glyph ↺ mòng két', 'Cần ôn lại. Góc phải trên, vòng 16px nền surface.'],
  ['Viền 3px màu mực', 'Đang chọn (thay viền 1,5px).'],
  ['Vòng 2px mực, cách 2px', 'Focus bàn phím. Vừa chọn vừa focus thì có cả hai.'],
  ['Nét đứt', 'Chưa có / chờ điền, và đường dự báo trên biểu đồ.'],
  ['danger đỏ', 'Chỉ lỗi và xoá.'],
  ['Tag hồng C27', 'Lớp chú thích thiết kế, không phải UI app.'],
]

const KICH_THUOC: [string, string][] = [
  ['Nút, ô nhập', '36 (44)'],
  ['Hàng cây', '40 (48)'],
  ['Hàng bảng', '44'],
  ['Chip', '24'],
  ['Padding card', '20 (16)'],
  ['Khoảng giữa card', '24 (16)'],
  ['Khoảng giữa khối bài', '40'],
  ['Sidebar', '264 · rail 72'],
]

const ICON_CO_DINH: { icon: LucideIcon[]; ten: string; nghia: string }[] = [
  { icon: [Layers], ten: 'layers', nghia: 'Lĩnh vực' },
  { icon: [BookOpen], ten: 'book-open', nghia: 'Chủ đề' },
  { icon: [FileText], ten: 'file-text', nghia: 'Tài liệu' },
  { icon: [Award], ten: 'award', nghia: 'Chứng chỉ' },
  { icon: [Folder], ten: 'folder', nghia: 'Nhóm' },
  { icon: [Circle], ten: 'circle', nghia: 'Chưa học' },
  { icon: [Contrast], ten: 'contrast', nghia: 'Đang học' },
  { icon: [CircleCheck], ten: 'circle-check', nghia: 'Đã xong' },
  { icon: [CircleSlash], ten: 'circle-slash', nghia: 'Bỏ qua' },
  { icon: [RotateCcw], ten: 'rotate-ccw', nghia: 'Cần ôn lại' },
  { icon: [FileX, FilePen, FileCheck], ten: 'file-x / pen / check', nghia: 'Nội dung' },
  { icon: [Info], ten: 'info', nghia: 'Banner' },
]

/** Đọc token đang hiệu lực; đọc lại mỗi lần giao diện đổi (hook làm component vẽ lại). */
function useToken() {
  const hieuLuc = useGiaoDienHieuLuc()
  const kieu = getComputedStyle(document.documentElement)
  const giaTri = (ten: string) => kieu.getPropertyValue(ten).trim()
  const mau = (ten: string) => docMau(giaTri(ten))
  const hex = (ten: string) => {
    const m = mau(ten)
    return m ? sangHex(m) : '—'
  }
  /** Tỉ lệ thấp nhất của chữ trên các nền. */
  const tiLe = (chu: string, nen: string[], soLe = 1) => {
    const c = mau(chu)
    const cacNen = nen.map(mau).filter((n) => n !== null)
    if (!c || cacNen.length !== nen.length) return '—'
    return dinhDangTiLe(Math.min(...cacNen.map((n) => tiLeTuongPhan(c, n))), soLe)
  }
  const px = (ten: string) => String(parseFloat(giaTri(ten)) || '—')
  return { hieuLuc, giaTri, mau, hex, tiLe, px }
}

function Muc({ tieuDe, children }: { tieuDe: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className={H2}>{tieuDe}</h2>
      {children}
    </section>
  )
}

export default function F01({ mau }: { mau: MauF01 }) {
  const tk = useToken()
  const khongBong = tk.giaTri('--shadow-1') === 'none'
  const soc = tk.mau('--st-skip-stripe')
  const nhanSoc = soc ? `${sangHex(soc)} ở ${Math.round(soc.a * 100)}%` : '—'
  const vienNhomKhacNen = tk.hex('--type-group-bd') !== tk.hex('--type-group-bg')
  const dialogLaSurface2 = tk.hex('--surface-dialog') === tk.hex('--surface-2')

  const token: { ten: string; bien: string; ghiChu: string }[] = [
    { ten: 'bg', bien: '--bg', ghiChu: 'Nền trang' },
    { ten: 'surface', bien: '--surface', ghiChu: 'Card, sidebar' },
    {
      ten: 'surface-2',
      bien: '--surface-2',
      ghiChu: dialogLaSurface2 ? 'Nền phụ, banner, dialog' : 'Nền phụ, banner',
    },
    { ten: 'border', bien: '--border', ghiChu: 'Viền card, đường kẻ' },
    {
      ten: 'border-input',
      bien: '--border-input',
      ghiChu: `Viền ô nhập · ${tk.tiLe('--border-input', ['--surface'])}`,
    },
    { ten: 'text', bien: '--text', ghiChu: `Chữ chính · ${tk.tiLe('--text', ['--bg'])}` },
    {
      ten: 'text-muted',
      bien: '--text-muted',
      ghiChu: `Chữ phụ · ${tk.tiLe('--text-muted', ['--bg', '--surface'])}`,
    },
    { ten: 'primary (mực)', bien: '--primary', ghiChu: `Chữ trên nút ${tk.hex('--on-primary')}` },
    {
      ten: 'danger',
      bien: '--danger',
      ghiChu: `Chỉ lỗi và xoá · ${tk.tiLe('--danger', ['--surface'])}`,
    },
    { ten: 'link', bien: '--text', ghiChu: 'Màu text + gạch chân' },
  ]

  const chu: { nhan: string; mau: ReactNode; lop: string }[] = [
    {
      nhan: `h1 ${tk.px('--fs-h1')}/${tk.px('--lh-h1')} · 700`,
      mau: mau.chu.h1,
      lop: 'text-[length:var(--fs-h1)] leading-[var(--lh-h1)] font-bold',
    },
    {
      nhan: `h2 ${tk.px('--fs-h2')}/${tk.px('--lh-h2')} · 600`,
      mau: mau.chu.h2,
      lop: 'text-[length:var(--fs-h2)] leading-[var(--lh-h2)] font-semibold',
    },
    {
      nhan: `thân bài ${tk.px('--fs-body')}/${tk.px('--lh-body')}`,
      mau: (
        <>
          {mau.chu.thanBai} — <span lang="en">{mau.chu.thanBaiEn}</span>
        </>
      ),
      lop: 'text-[length:var(--fs-body)] leading-[var(--lh-body)]',
    },
    {
      nhan: `UI ${tk.px('--fs-ui')}/${tk.px('--lh-ui')}`,
      mau: mau.chu.ui,
      lop: 'text-[length:var(--fs-ui)] leading-[var(--lh-ui)]',
    },
    {
      nhan: `meta ${tk.px('--fs-meta')}/${tk.px('--lh-meta')}`,
      mau: mau.chu.meta,
      lop: `${META} text-muted tabular-nums`,
    },
    {
      nhan: `chip ${tk.px('--fs-chip')}/${tk.px('--lh-chip')} · 600`,
      mau: mau.chu.chip,
      lop: CHIP,
    },
    {
      nhan: `mono ${tk.px('--fs-meta')}/${tk.px('--lh-meta')}`,
      mau: mau.chu.mono,
      lop: `font-mono ${META} [overflow-wrap:anywhere]`,
    },
  ]

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8">
        <div className="flex flex-col gap-2">
          <span className={`font-mono ${META} text-muted`}>
            F01 · Design system · {TEN_GIAO_DIEN[tk.hieuLuc]}
          </span>
          <h1 className="m-0 text-[length:var(--fs-h1)] leading-[var(--lh-h1)] font-bold">
            Học PM A–Z
          </h1>
          <p className="m-0 max-w-[720px] text-muted">{mau.moTa}</p>
        </div>
        <div className={`flex flex-wrap gap-2 ${META} text-muted`}>
          <span className="rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1">
            Be Vietnam Pro · JetBrains Mono
          </span>
          <span className="rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1">
            Icon Lucide 1.75
          </span>
        </div>
      </header>

      <Muc tieuDe="1. Token màu">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {token.map((t) => (
            <div key={t.ten} className={`${THE} overflow-hidden shadow-[var(--shadow-1)]`}>
              <div
                className="h-14 border-b border-border"
                style={{ background: `var(${t.bien})` }}
              />
              <div className="flex flex-col gap-0.5 px-4 py-3">
                <span className={`font-mono ${META} font-medium`}>{t.ten}</span>
                <span className={`font-mono ${META} text-muted`}>{tk.hex(t.bien)}</span>
                <span className={`${META} text-muted`}>{t.ghiChu}</span>
              </div>
            </div>
          ))}
        </div>
      </Muc>

      <div className="grid gap-12 lg:grid-cols-2">
        <Muc tieuDe="2. Legend loại nút">
          <p className="m-0 text-muted">
            Nền vàng / be / đen / xanh dương chỉ báo loại nút. Viền mực 1,5px như roadmap.sh. Bốn
            hue này không dùng cho trạng thái, banner hay callout.
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div
                className={`${NUT} h-14 w-[240px] max-w-full justify-between px-3.5`}
                style={mauLoai('area')}
              >
                <span className="flex items-center gap-2">
                  <Layers size={16} strokeWidth={1.75} aria-hidden="true" className="flex-none" />
                  <span lang="en">{mau.linhVuc.ten}</span>
                </span>
                <span className="tabular-nums">{mau.linhVuc.phanSo}</span>
              </div>
              <MoTaLoai
                ten="Lĩnh vực"
                ghiChu={`layers · ${tk.tiLe('--type-area-fg', ['--type-area-bg'])}`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className={NUT_MUC} style={mauLoai('topic')}>
                <span lang="en">{mau.chuDe}</span>
              </div>
              <MoTaLoai
                ten="Chủ đề"
                ghiChu={`book-open (chỉ ở chip) · ${tk.tiLe('--type-topic-fg', ['--type-topic-bg'])}`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className={NUT_MUC} style={mauLoai('doc')}>
                <FileText size={16} strokeWidth={1.75} aria-hidden="true" className="flex-none" />
                <span lang="en">{mau.taiLieu}</span>
              </div>
              <MoTaLoai
                ten="Tài liệu"
                ghiChu={`file-text · ${tk.tiLe('--type-doc-fg', ['--type-doc-bg'])}`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className={NUT_MUC} style={mauLoai('topic')}>
                <Award size={16} strokeWidth={1.75} aria-hidden="true" className="flex-none" />
                <span lang="en">{mau.chungChi}</span>
              </div>
              <MoTaLoai ten="Chứng chỉ" ghiChu="màu Chủ đề + award" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className={`${NUT} h-10 w-full px-3`} style={mauLoai('group')}>
                <Folder size={16} strokeWidth={1.75} aria-hidden="true" className="flex-none" />
                <span lang="en">{mau.nhom}</span>
              </div>
              <span className={`${META} text-muted`}>
                <strong className="text-text">Nhóm</strong> · thanh tiêu đề full-width + folder ·{' '}
                {tk.tiLe('--type-group-fg', ['--type-group-bg'])}
                {vienNhomKhacNen &&
                  ` · viền ${tk.tiLe('--type-group-bd', ['--bg'], 2).replace(':1', '')} so với bg`}
                . Ở giao diện Sáng trùng màu mực với nút chính — phân biệt bằng hình dạng.
              </span>
            </div>
          </div>
        </Muc>

        <Muc tieuDe="3. Trạng thái học">
          <p className="m-0 text-muted">
            Icon + vạch trái 4px + chữ. Hue tách khỏi legend và khỏi màu mực. Chưa học không có
            vạch.
          </p>
          <div className={`${THE} overflow-x-auto`}>
            <div className="min-w-[480px]">
              {TRANG_THAI.map((st) => (
                <div
                  key={st.ma}
                  className="grid grid-cols-[172px_1fr_120px] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <span
                    className={`${O_CHIP} justify-self-start`}
                    style={{ background: `var(--st-${st.ma}-bg)`, color: `var(--st-${st.ma}-fg)` }}
                  >
                    <st.Icon size={14} strokeWidth={1.75} aria-hidden="true" />
                    {st.nhan}
                  </span>
                  <span className={`${META} text-muted`}>
                    {st.moTa} · {tk.tiLe(`--st-${st.ma}-fg`, [`--st-${st.ma}-bg`])}
                  </span>
                  <span
                    className={`flex items-center gap-2 font-mono ${CHIP} font-normal text-muted`}
                  >
                    <span
                      className="size-5 flex-none rounded-[4px] border border-border"
                      style={{ background: `var(--st-${st.ma}-solid)` }}
                    />
                    {st.ma === 'skip' ? 'sọc' : tk.hex(`--st-${st.ma}-solid`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div
              className={NUT_MUC}
              style={{ ...mauLoai('topic'), backgroundImage: 'var(--st-skip-stripe)' }}
            >
              <CircleSlash size={16} strokeWidth={1.75} aria-hidden="true" className="flex-none" />
              <span lang="en">{mau.boQua}</span>
            </div>
            <span className={`min-w-0 flex-1 basis-60 ${META} text-muted`}>
              Bỏ qua = sọc 45°, nét 2px cách 6px, {nhanSoc} chồng lên nền loại. Không giảm opacity,
              không gạch ngang chữ.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div
              className={`${NUT_MUC} relative`}
              style={{
                ...mauLoai('topic'),
                borderLeftWidth: 4,
                borderLeftColor: 'var(--st-done-solid)',
              }}
            >
              <CircleCheck
                size={16}
                strokeWidth={1.75}
                aria-hidden="true"
                className="flex-none"
                style={{ color: 'var(--st-done-solid)' }}
              />
              <span lang="en">{mau.canOnLai}</span>
              <span
                className="absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full border border-border bg-surface"
                style={{ color: 'var(--st-review-solid)' }}
              >
                <RotateCcw size={11} strokeWidth={2.5} aria-hidden="true" />
              </span>
            </div>
            <span className={`min-w-0 flex-1 basis-60 ${META} text-muted`}>
              Cần ôn lại = glyph ↺ ở góc phải trên, vòng 16px nền surface (
              {tk.tiLe('--st-review-solid', ['--surface'])}). Là cờ suy ra, không phải trạng thái
              thứ 5.
            </span>
          </div>
        </Muc>
      </div>

      <div className="grid gap-12 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-12">
          <Muc tieuDe="4. Trạng thái nội dung">
            <p className="m-0 text-muted">
              Màu trung tính, icon + chữ. Nét đứt chỉ có nghĩa "chưa có / chờ điền".
            </p>
            <div className="flex flex-wrap gap-3">
              <span className={`${O_CHIP} border border-dashed border-border-input text-muted`}>
                <FileX size={14} strokeWidth={1.75} aria-hidden="true" />
                Chưa có nội dung
              </span>
              <span className={`${O_CHIP} border border-border bg-surface-2 text-text`}>
                <FilePen size={14} strokeWidth={1.75} aria-hidden="true" />
                Bản nháp · AI
              </span>
              <span className={`${O_CHIP} border border-border bg-surface-2 text-text`}>
                <FilePen size={14} strokeWidth={1.75} aria-hidden="true" />
                Bản nháp · Tự viết
              </span>
              <span className={`${O_CHIP} border border-border bg-surface text-text`}>
                <FileCheck size={14} strokeWidth={1.75} aria-hidden="true" />
                Đã duyệt · <span className="tabular-nums">{mau.ngayDuyet}</span>
              </span>
              <span className={`${O_CHIP} border border-border bg-surface text-text`}>
                <span className="relative inline-flex">
                  <FileCheck size={14} strokeWidth={1.75} aria-hidden="true" />
                  <span className="absolute -top-0.5 -right-[3px] size-1.5 rounded-full bg-text" />
                </span>
                Đã duyệt · có bản sửa chưa duyệt
              </span>
            </div>
          </Muc>

          <Muc tieuDe="5. Chữ">
            <div className={THE}>
              {chu.map((c) => (
                <div
                  key={c.nhan}
                  className="grid items-baseline gap-x-4 gap-y-1 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[140px_1fr]"
                >
                  <span className="font-mono text-[length:var(--fs-chip)] text-muted">
                    {c.nhan}
                  </span>
                  <span className={`min-w-0 ${c.lop}`}>{c.mau}</span>
                </div>
              ))}
            </div>
            <ul className={`m-0 flex flex-col gap-1 pl-5 ${META} text-muted`}>
              <li>
                Line-height: thân bài ≥ 1,6 · UI ≥ 1,5 · tiêu đề ≥ 1,4 — đủ chỗ cho dấu chồng.
              </li>
              <li>Không viết hoa toàn bộ chữ tiếng Việt. Số dùng tabular-nums.</li>
              <li>Thuật ngữ tiếng Anh gắn lang="en"; giải nghĩa sau " — ", màu text-muted.</li>
            </ul>
          </Muc>
        </div>

        <Muc tieuDe="6. Bảng kênh — mỗi kênh một nghĩa">
          <div className={`${THE} overflow-hidden ${META}`}>
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 bg-surface-2 px-4 py-2.5 font-semibold md:grid-cols-[200px_1fr]">
              <span>Kênh</span>
              <span>Nghĩa duy nhất · quy tắc</span>
            </div>
            {KENH.map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 border-t border-border px-4 py-2.5 md:grid-cols-[200px_1fr]"
              >
                <span className="font-semibold">{k}</span>
                <span className="text-muted">{v}</span>
              </div>
            ))}
          </div>
        </Muc>
      </div>

      <div className="grid gap-12 lg:grid-cols-2">
        <Muc tieuDe="7. Khoảng cách, kích thước, hình">
          <div className={`${THE} flex flex-wrap items-end gap-5 p-5`}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div key={n} className="flex flex-col items-center gap-2">
                <div
                  style={{
                    width: `var(--sp-${n})`,
                    height: `var(--sp-${n})`,
                    background: 'var(--st-learning-solid)',
                  }}
                />
                <span className="font-mono text-[length:var(--fs-chip)] text-muted">
                  {tk.px(`--sp-${n}`)}
                </span>
              </div>
            ))}
          </div>
          <div className={`${THE} grid ${META} sm:grid-cols-2`}>
            {KICH_THUOC.map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-3 border-b border-border px-4 py-2.5"
              >
                <span className="text-muted">{k}</span>
                <span className="font-mono tabular-nums">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 sm:gap-6">
            <MauBo
              ghiChu="bo 6 · ô nhập, chip, nút bản đồ"
              lop="rounded-[var(--radius-sm)] border border-border-input bg-surface"
            />
            <MauBo
              ghiChu="bo 10 · card"
              lop="rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-1)]"
            />
            <MauBo
              ghiChu="bo 14 · dialog, sheet, panel"
              lop="rounded-[var(--radius-lg)] border border-border bg-[var(--surface-dialog)] shadow-[var(--shadow-3)]"
            />
          </div>
          <p className={`m-0 ${META} text-muted`}>
            {khongBong
              ? 'Giao diện Tối không dùng bóng: tách lớp bằng surface-2 và viền.'
              : `Bóng chỉ ở giao diện Sáng: ${[1, 2, 3].map((n) => tk.giaTri(`--shadow-${n}`)).join(' / ')}.`}
          </p>
        </Muc>

        <div className="flex min-w-0 flex-col gap-12">
          <Muc tieuDe="8. Chú thích thiết kế">
            <div className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--annotation)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[length:var(--fs-chip)] leading-[var(--lh-chip)] text-[var(--annotation)]">
                <span>Lớp "Chú thích" · ẩn được · không thuộc UI app</span>
                <span>C27</span>
              </div>
              <div className={`${THE} relative p-5`}>
                <span className="absolute top-3 right-3 rounded-[4px] border border-[var(--annotation)] px-1.5 text-[length:var(--fs-chip)] leading-[var(--lh-chip)] font-semibold text-[var(--annotation)]">
                  {mau.chuThich.nhan}
                </span>
                <h3 className="m-0 mb-2 text-[length:var(--fs-body)] leading-[var(--lh-body)] font-semibold">
                  {mau.chuThich.tieuDe}
                </h3>
                <p className="m-0 max-w-[520px] text-[length:var(--fs-body)] leading-[var(--lh-body)]">
                  {mau.chuThich.doan}
                </p>
              </div>
              <ul className={`m-0 flex flex-col gap-1 pl-5 ${META} text-muted`}>
                <li>
                  Tag chữ {tk.hex('--annotation')}, 12/18/600, viền liền 1px cùng màu, góc phải trên
                  mỗi khối chữ mẫu ({tk.tiLe('--annotation', ['--surface'])}).
                </li>
                <li>Biến thể chữ: {mau.chuThich.bienThe.map((b) => `"${b}"`).join(', ')}.</li>
                <li>
                  Không vẽ trạng thái tương tác. App thật báo bản nháp bằng chip nội dung C8 +
                  banner C26.
                </li>
              </ul>
            </div>
          </Muc>

          <Muc tieuDe="9. Icon">
            <div className={`${THE} grid grid-cols-2 overflow-hidden ${META} sm:grid-cols-4`}>
              {[
                ...ICON_CO_DINH,
                ...mau.iconPhan.map((p) => ({
                  icon: [ICON_PHAN[p.icon]],
                  ten: p.icon,
                  nghia: p.nhan,
                })),
              ].map((ic) => (
                <div
                  key={`${ic.ten}-${ic.nghia}`}
                  className="flex flex-col border-b border-border px-3.5 py-2.5"
                >
                  <span className="flex flex-wrap items-center gap-x-1.5 font-mono text-[length:var(--fs-chip)]">
                    <span className="flex gap-1">
                      {ic.icon.map((I, i) => (
                        <I key={i} size={16} strokeWidth={1.75} aria-hidden="true" />
                      ))}
                    </span>
                    {ic.ten}
                  </span>
                  <span className="text-muted">{ic.nghia}</span>
                </div>
              ))}
            </div>
          </Muc>
        </div>
      </div>
    </div>
  )
}

function MoTaLoai({ ten, ghiChu }: { ten: string; ghiChu: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="font-semibold">{ten}</span>
      <span className={`${META} text-muted`}>{ghiChu}</span>
    </div>
  )
}

function MauBo({ ghiChu, lop }: { ghiChu: string; lop: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <div className={`h-16 w-full ${lop}`} />
      <span className={`text-center ${META} text-muted`}>{ghiChu}</span>
    </div>
  )
}
