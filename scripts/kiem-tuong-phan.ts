// Kiểm tỉ lệ tương phản của token (§5.1, §11 AA) ở cả Sáng lẫn Tối, đọc thẳng từ src/styles/.
// Chạy: npx tsx scripts/kiem-tuong-phan.ts (thoát 1 nếu có cặp không đạt). tests/tuong-phan gọi cùng hàm.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  bangGiaoDien,
  docKhoiCss,
  docMau,
  giaTriToken,
  phuLen,
  tiLeTuongPhan,
  type BaGiaoDien,
  type BangToken,
} from '../src/dev/thanh-phan/tuong-phan'
import { laLenhChinh } from './chay-truc-tiep'

/** Mọi file token app.css import, đúng thứ tự (test giữ hai bên khớp nhau). Token mới chỉ thêm vào
 *  tokens-them.css — file thứ hai trong danh sách. */
export const FILE_TOKEN = ['src/styles/tokens.css', 'src/styles/tokens-them.css']

/**
 * Một cặp chữ / nền cần kiểm. `toiThieu` là số §5.1 ghi (Sáng, Tối); không ghi thì theo AA:
 * chữ 4,5, thành phần UI 3. `soc`: nền là sọc Bỏ qua chồng lên `nen`.
 */
export type CapTuongPhan = {
  ten: string
  chu: string
  nen: string
  toiThieu: [number, number]
  soc?: boolean
}

// Số §5.1 làm tròn 1 chữ số → cho phép thấp hơn 0,1. Ngưỡng AA (4,5 / 3) là sàn cứng, không trừ.
export const SAI_SO = 0.1

export const CHU_AA = 4.5
export const UI_AA = 3

/** Tỉ lệ thấp nhất được tính là đạt cho một ngưỡng. */
export function nguongDat(toiThieu: number): number {
  return toiThieu === CHU_AA || toiThieu === UI_AA ? toiThieu : toiThieu - SAI_SO
}
const CHU: [number, number] = [CHU_AA, CHU_AA]
const UI: [number, number] = [UI_AA, UI_AA]

export const CAP_TUONG_PHAN: CapTuongPhan[] = [
  { ten: 'text trên bg', chu: '--text', nen: '--bg', toiThieu: [17.1, 15.3] },
  { ten: 'text-muted trên bg', chu: '--text-muted', nen: '--bg', toiThieu: [7.2, 6.9] },
  { ten: 'text-muted trên surface', chu: '--text-muted', nen: '--surface', toiThieu: [7.2, 6.9] },
  {
    ten: 'text-muted trên surface-2',
    chu: '--text-muted',
    nen: '--surface-2',
    toiThieu: [CHU_AA, CHU_AA],
  },
  {
    ten: 'border-input trên surface',
    chu: '--border-input',
    nen: '--surface',
    toiThieu: [3.2, 3.7],
  },
  { ten: 'border-input trên bg', chu: '--border-input', nen: '--bg', toiThieu: [UI_AA, UI_AA] },
  // Cũng là chữ đỏ của toast lỗi (C33, nền surface).
  { ten: 'danger trên surface', chu: '--danger', nen: '--surface', toiThieu: [6.5, 9.4] },
  // Cũng phủ: nút chính, toast thường (chữ, viền nút, vòng focus on-primary), badge đặc C34 (cả bản
  // đảo màu trên mục đang mở), mục menu đang mở, viền badge trên mục đang mở.
  {
    ten: 'on-primary trên primary',
    chu: '--on-primary',
    nen: '--primary',
    toiThieu: [CHU_AA, CHU_AA],
  },
  { ten: 'on-danger trên danger', chu: '--on-danger', nen: '--danger', toiThieu: [CHU_AA, CHU_AA] },
  // Legend
  { ten: 'Lĩnh vực', chu: '--type-area-fg', nen: '--type-area-bg', toiThieu: [13.3, 8.1] },
  { ten: 'Chủ đề', chu: '--type-topic-fg', nen: '--type-topic-bg', toiThieu: [14.5, 11.4] },
  { ten: 'Tài liệu', chu: '--type-doc-fg', nen: '--type-doc-bg', toiThieu: [10.3, 8.5] },
  { ten: 'Nhóm', chu: '--type-group-fg', nen: '--type-group-bg', toiThieu: [17.9, 14.0] },
  { ten: 'viền Nhóm trên bg', chu: '--type-group-bd', nen: '--bg', toiThieu: [UI_AA, 3.96] },
  // Bỏ qua: chữ nút trên sọc (Chứng chỉ dùng màu Chủ đề)
  {
    ten: 'Chủ đề trên sọc Bỏ qua',
    chu: '--type-topic-fg',
    nen: '--type-topic-bg',
    toiThieu: [7.8, 5.5],
    soc: true,
  },
  {
    ten: 'Tài liệu trên sọc Bỏ qua',
    chu: '--type-doc-fg',
    nen: '--type-doc-bg',
    toiThieu: [7.8, 5.5],
    soc: true,
  },
  // Pill trạng thái học
  { ten: 'pill Chưa học', chu: '--st-none-fg', nen: '--st-none-bg', toiThieu: [6.9, 9.9] },
  { ten: 'pill Đang học', chu: '--st-learning-fg', nen: '--st-learning-bg', toiThieu: [7.4, 11.0] },
  { ten: 'pill Đã xong', chu: '--st-done-fg', nen: '--st-done-bg', toiThieu: [6.5, 7.5] },
  { ten: 'pill Bỏ qua', chu: '--st-skip-fg', nen: '--st-skip-bg', toiThieu: [7.0, 10.2] },
  { ten: 'pill Cần ôn lại', chu: '--st-review-fg', nen: '--st-review-bg', toiThieu: [6.7, 7.5] },
  {
    ten: 'glyph Cần ôn lại trên surface',
    chu: '--st-review-solid',
    nen: '--surface',
    toiThieu: [5.5, 9.5],
  },
  // Lớp chú thích C27 (chỉ ở gallery) vẫn phải đọc được
  {
    ten: 'chú thích C27 trên surface',
    chu: '--annotation',
    nen: '--surface',
    toiThieu: [CHU_AA, CHU_AA],
  },

  // --- Token màu của tokens-them.css (phase 1) và tổ hợp mới của component phase 1 ---
  // Không có số §5.1 nên theo AA: chữ 4,5; thành phần UI / icon mang nghĩa 3.
  // Icon + chữ trạng thái ở kết quả tìm kiếm C28: chữ 13px cùng màu icon, trên nền dialog và dòng chọn.
  ...(
    [
      ['Đang học', '--st-learning-ic'],
      ['Đã xong', '--st-done-ic'],
      ['Chưa học', '--st-none-ic'],
      ['Bỏ qua', '--st-skip-ic'],
    ] as const
  ).flatMap(([ten, chu]): CapTuongPhan[] => [
    { ten: `chữ ${ten} (C28) trên nền dialog`, chu, nen: '--surface-dialog', toiThieu: CHU },
    { ten: `chữ ${ten} (C28) trên dòng chọn`, chu, nen: '--tim-kiem-chon', toiThieu: CHU },
  ]),
  // Icon trạng thái đứng riêng (sidebar C34 trên surface, mục đang mở surface-2; chú giải trên bg).
  { ten: 'icon Đang học trên surface', chu: '--st-learning-ic', nen: '--surface', toiThieu: UI },
  {
    ten: 'icon Đang học trên surface-2',
    chu: '--st-learning-ic',
    nen: '--surface-2',
    toiThieu: UI,
  },
  { ten: 'icon Đang học trên bg', chu: '--st-learning-ic', nen: '--bg', toiThieu: UI },
  { ten: 'icon Đã xong trên surface', chu: '--st-done-ic', nen: '--surface', toiThieu: UI },
  { ten: 'icon Đã xong trên bg', chu: '--st-done-ic', nen: '--bg', toiThieu: UI },
  { ten: 'icon Cần ôn lại trên surface', chu: '--st-review-ic', nen: '--surface', toiThieu: UI },
  { ten: 'icon Cần ôn lại trên bg', chu: '--st-review-ic', nen: '--bg', toiThieu: UI },
  // Viền 1,5px đoạn đang chọn C6 (khung segmented nền surface) — chỉ báo trạng thái chọn.
  ...(
    [
      ['Chưa học', '--st-none-vien'],
      ['Đang học', '--st-learning-vien'],
      ['Đã xong', '--st-done-vien'],
      ['Bỏ qua', '--st-skip-vien'],
      ['Cần ôn lại', '--st-review-vien'],
    ] as const
  ).map(([ten, chu]): CapTuongPhan => ({
    ten: `viền chọn ${ten} trên surface`,
    chu,
    nen: '--surface',
    toiThieu: UI,
  })),
  // Thanh độ phủ D19: đoạn Đã duyệt trên nền thẻ.
  { ten: 'độ phủ Đã duyệt trên surface', chu: '--noi-dung-duyet', nen: '--surface', toiThieu: UI },
  // Dialog, sheet, popover tìm kiếm (C32, C28): chữ, chữ phụ, ô nhập / nút phụ, lỗi, vòng focus.
  { ten: 'text trên nền dialog', chu: '--text', nen: '--surface-dialog', toiThieu: CHU },
  {
    ten: 'text-muted trên nền dialog',
    chu: '--text-muted',
    nen: '--surface-dialog',
    toiThieu: CHU,
  },
  {
    ten: 'border-input trên nền dialog',
    chu: '--border-input',
    nen: '--surface-dialog',
    toiThieu: UI,
  },
  { ten: 'danger trên nền dialog', chu: '--danger', nen: '--surface-dialog', toiThieu: CHU },
  { ten: 'vòng focus trên nền dialog', chu: '--primary', nen: '--surface-dialog', toiThieu: UI },
  { ten: 'text trên dòng chọn (C28)', chu: '--text', nen: '--tim-kiem-chon', toiThieu: CHU },
  { ten: 'text-muted trên dòng chọn', chu: '--text-muted', nen: '--tim-kiem-chon', toiThieu: CHU },
  { ten: 'viền dòng chọn (primary)', chu: '--primary', nen: '--tim-kiem-chon', toiThieu: UI },
  { ten: 'gợi ý phím trên chân C28', chu: '--text-muted', nen: '--tim-kiem-chan', toiThieu: CHU },
  // Bảng phím tắt F27: chữ trong phím (kbd), ô ghi chú cuối bảng.
  { ten: 'chữ phím (kbd) F27', chu: '--text', nen: '--phim-tat-nen', toiThieu: CHU },
  { ten: 'ghi chú F27 trên nền phím', chu: '--text-muted', nen: '--phim-tat-nen', toiThieu: CHU },
  // Banner lỗi D30 (C26): tiêu đề và icon danger trên nền surface-2.
  { ten: 'banner lỗi: danger trên surface-2', chu: '--danger', nen: '--surface-2', toiThieu: CHU },
  // Mục menu đang mở C34 khi rê chuột (nền primary-hover).
  {
    ten: 'mục menu đang mở (hover)',
    chu: '--on-primary',
    nen: '--primary-hover',
    toiThieu: CHU,
  },
]

/**
 * Token màu của tokens-them.css cố ý KHÔNG có cặp, kèm lý do. Mọi token màu khác của file phải nằm
 * trong một cặp ở trên (test và lệnh này chặn token màu mới chưa được xét).
 */
export const MIEN_KIEM: Record<string, string> = {
  '--st-skip-solid':
    'ô màu mẫu ở gallery F01; trên UI, Bỏ qua luôn vẽ bằng sọc (cặp "… trên sọc Bỏ qua")',
  '--noi-dung-nhap':
    'thanh độ phủ là role=img có aria-label đủ số và đi cùng chữ "n duyệt · n nháp · n chưa có" ' +
    '(F03, F06, F10) nên không thuộc WCAG 1.4.11; màu theo frame (Sáng cạnh nền ≈ 2,6:1, Tối cạnh ' +
    'đoạn Đã duyệt ≈ 2,0:1) — ghi ở "Chờ bạn duyệt"',
  '--scrim': 'lớp phủ sau dialog, không mang chữ hay trạng thái',
  '--border-dialog': 'viền tách lớp dialog ở Tối; dialog đã tách khỏi trang bằng nền và scrim',
  '--shadow-sheet': 'bóng đổ, trang trí',
  '--sheet-handle':
    'thanh kéo bottom sheet aria-hidden, trang trí (đóng bằng X, Esc, bấm ra ngoài)',
  '--skeleton-bg':
    'khối skeleton lúc tải (vùng có aria-busy + nhãn "Đang tải"), không mang thông tin',
  '--phim-tat-vach': 'vạch kẻ giữa các dòng bảng phím tắt, trang trí',
  '--tim-kiem-vien': 'viền popover và vạch kẻ trong tìm kiếm, trang trí',
}

/** Token khai báo ở :root của một file mà giá trị (đã thay var(), Sáng hoặc Tối) là màu. */
export function tokenMauCuaFile(css: string, ba: BaGiaoDien): string[] {
  const ten = docKhoiCss(css)
    .filter((k) => k.boChon === ':root')
    .flatMap((k) => Object.keys(k.khaiBao))
  return [...new Set(ten)].filter((t) =>
    [ba.sang, ba.toi].some((b) => docMau(giaTriToken(b, t) ?? '') !== null),
  )
}

/** Token màu của tokens-them.css chưa có cặp tương phản và cũng không nằm trong MIEN_KIEM. */
export function tokenMauChuaXet(cacFile: string[], cap = CAP_TUONG_PHAN): string[] {
  const coCap = new Set(cap.flatMap((c) => [c.chu, c.nen]))
  return tokenMauCuaFile(cacFile[1], bangGiaoDien(cacFile)).filter(
    (t) => !coCap.has(t) && !(t in MIEN_KIEM),
  )
}

export type KetQuaTuongPhan = {
  ten: string
  giaoDien: 'Sáng' | 'Tối'
  tiLe: number
  toiThieu: number
  dat: boolean
}

function mauToken(bang: BangToken, ten: string) {
  const v = giaTriToken(bang, ten)
  const m = v === undefined ? null : docMau(v)
  if (!m) throw new Error(`Token ${ten} không có màu đọc được (giá trị: ${v ?? 'chưa khai báo'})`)
  return m
}

/** Tính mọi cặp ở hai giao diện. */
export function kiemTuongPhan(ba: BaGiaoDien, cap = CAP_TUONG_PHAN): KetQuaTuongPhan[] {
  const giaoDien = [
    ['Sáng', ba.sang],
    ['Tối', ba.toi],
  ] as const
  return giaoDien.flatMap(([ten, bang], i) =>
    cap.map((c) => {
      let nen = mauToken(bang, c.nen)
      if (c.soc) nen = phuLen(mauToken(bang, '--st-skip-stripe'), nen)
      const tiLe = tiLeTuongPhan(mauToken(bang, c.chu), nen)
      const toiThieu = c.toiThieu[i]
      return { ten: c.ten, giaoDien: ten, tiLe, toiThieu, dat: tiLe >= nguongDat(toiThieu) }
    }),
  )
}

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Đọc các file token (theo thứ tự app.css import) từ thư mục gốc dự án. */
export function docFileToken(goc = GOC): string[] {
  return FILE_TOKEN.map((f) => readFileSync(join(goc, f), 'utf8'))
}

function chay() {
  const cacFile = docFileToken()
  const ketQua = kiemTuongPhan(bangGiaoDien(cacFile))
  for (const k of ketQua) {
    const dau = k.dat ? 'đạt  ' : 'KHÔNG'
    console.log(
      `${dau} ${k.giaoDien.padEnd(4)} ${k.ten.padEnd(32)} ${k.tiLe.toFixed(2).padStart(5)} (≥ ${k.toiThieu})`,
    )
  }
  const truot = ketQua.filter((k) => !k.dat)
  console.log(truot.length ? `${truot.length} cặp không đạt.` : `Đạt cả ${ketQua.length} cặp.`)
  const chuaXet = tokenMauChuaXet(cacFile)
  if (chuaXet.length)
    console.log(
      `Token màu chưa có cặp tương phản (thêm cặp hoặc lý do vào MIEN_KIEM): ${chuaXet.join(', ')}`,
    )
  if (truot.length || chuaXet.length) process.exitCode = 1
}

if (laLenhChinh(import.meta.url)) chay()
