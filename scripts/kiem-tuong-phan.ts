// Kiểm tỉ lệ tương phản của token (§5.1, §11 AA) ở cả Sáng lẫn Tối, đọc thẳng từ src/styles/.
// Chạy: npx tsx scripts/kiem-tuong-phan.ts (thoát 1 nếu có cặp không đạt). tests/tuong-phan gọi cùng hàm.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  bangGiaoDien,
  docMau,
  giaTriToken,
  phuLen,
  tiLeTuongPhan,
  type BaGiaoDien,
  type BangToken,
} from '../src/dev/thanh-phan/tuong-phan'
import { laLenhChinh } from './chay-truc-tiep'

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

// Số §5.1 làm tròn 1 chữ số → cho phép thấp hơn 0,1.
export const SAI_SO = 0.1

const CHU_AA = 4.5
const UI_AA = 3

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
  { ten: 'danger trên surface', chu: '--danger', nen: '--surface', toiThieu: [6.5, 9.4] },
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
]

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
      return { ten: c.ten, giaoDien: ten, tiLe, toiThieu, dat: tiLe >= toiThieu - SAI_SO }
    }),
  )
}

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Đọc các file token (theo thứ tự app.css import) từ thư mục gốc dự án. */
export function docFileToken(goc = GOC): string[] {
  return FILE_TOKEN.map((f) => readFileSync(join(goc, f), 'utf8'))
}

function chay() {
  const ketQua = kiemTuongPhan(bangGiaoDien(docFileToken()))
  for (const k of ketQua) {
    const dau = k.dat ? 'đạt  ' : 'KHÔNG'
    console.log(
      `${dau} ${k.giaoDien.padEnd(4)} ${k.ten.padEnd(32)} ${k.tiLe.toFixed(2).padStart(5)} (≥ ${k.toiThieu})`,
    )
  }
  const truot = ketQua.filter((k) => !k.dat)
  console.log(truot.length ? `${truot.length} cặp không đạt.` : `Đạt cả ${ketQua.length} cặp.`)
  if (truot.length) process.exitCode = 1
}

if (laLenhChinh(import.meta.url)) chay()
