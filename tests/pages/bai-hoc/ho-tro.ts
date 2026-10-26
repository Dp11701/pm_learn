// Hỗ trợ test trang bài (phase 2a): cây của app, file bài giữ chỗ theo §13 quy tắc 6 ("[Nội dung mẫu — …]"),
// phản hồi GET /api/bai/:id dựng bằng chính quyetDinhBai của server (đúng hợp đồng hop-dong-bai.ts).
import { layCay, type MucHoc } from '../../../shared/roadmap'
import { quyetDinhBai } from '../../../server/noi-dung/doc-bai'
import type { PhanHoiBai } from '../../../server/noi-dung/hop-dong-bai'

export const cay = layCay()

export function muc(slug: string): MucHoc {
  const m = cay.mucTheoSlug.get(slug)
  if (!m) throw new Error(`Không có mục "${slug}"`)
  return m
}

/** Một đoạn giữ chỗ cho khối (không có kiến thức PM). */
export const giuCho = (khoi: string) =>
  `[Nội dung mẫu — ${khoi}] Câu giữ chỗ mô tả khối này, dài như đoạn thật để thấy nhịp chữ.`

export interface TuyChonBai {
  trangThai?: 'ban-nhap' | 'da-duyet'
  nguon?: 'ai' | 'tu-viet'
  giaiNghia?: string
  lienQuan?: string[]
  /** Bỏ các khối này khỏi file (theo tên ##) */
  bo?: string[]
  /** Khối thêm vào cuối, mỗi phần tử là [tiêu đề, thân] */
  them?: [string, string][]
  /** Thay thân một khối */
  thay?: Record<string, string>
}

const THAN_CHU_DE: [string, string][] = [
  ['Tóm tắt', giuCho('Tóm tắt')],
  ['Vì sao PM cần biết', giuCho('Vì sao PM cần biết')],
  [
    'Khái niệm cốt lõi',
    [
      `- **[Khái niệm mẫu 1]** — ${giuCho('Khái niệm 1')}`,
      `- **[Khái niệm mẫu 2]** — ${giuCho('Khái niệm 2')}`,
    ].join('\n'),
  ],
  ['Ví dụ thực tế', giuCho('Ví dụ thực tế')],
  [
    'Cách áp dụng',
    ['1. [Bước mẫu 1] Một câu hành động.', '2. [Bước mẫu 2] Một câu hành động.'].join('\n'),
  ],
  [
    'Góc dev lead → PM',
    ['### Bạn đã quen', giuCho('Bạn đã quen'), '', '### Điều cần đổi', giuCho('Điều cần đổi')].join(
      '\n',
    ),
  ],
  [
    'Thực hành trên dự án thật',
    [
      '### Đề bài',
      giuCho('Đề bài'),
      '',
      '### Đầu ra',
      giuCho('Đầu ra'),
      '',
      '### Tiêu chí tự kiểm',
      '- [ ] [Tiêu chí mẫu 1] Một câu kiểm tra được bằng có/không.',
      '- [ ] [Tiêu chí mẫu 2] Một câu kiểm tra được bằng có/không.',
    ].join('\n'),
  ],
  [
    'Tự kiểm tra',
    [
      '- H: [Nội dung mẫu — Câu hỏi 1] Câu hỏi giữ chỗ? | Đ: [Nội dung mẫu — Đáp án 1] Đáp án giữ chỗ.',
      '- H: [Nội dung mẫu — Câu hỏi 2] Câu hỏi giữ chỗ? | Đ: [Nội dung mẫu — Đáp án 2] Đáp án giữ chỗ.',
    ].join('\n'),
  ],
  ['Tham khảo', '- Nguồn mẫu 1 — chưa điền'],
]

/** File bài mẫu Chủ đề, đủ 9 khối ★ (bỏ / thêm / thay khối theo tuỳ chọn). */
export function fileChuDe(m: MucHoc, tc: TuyChonBai = {}): string {
  const fm = [
    '---',
    `id: "${m.id}"`,
    'loai: chu-de',
    ...(tc.giaiNghia ? [`giai_nghia: ${tc.giaiNghia}`] : []),
    `trang_thai_noi_dung: ${tc.trangThai ?? 'ban-nhap'}`,
    `nguon: ${tc.nguon ?? 'ai'}`,
    ...(tc.trangThai === 'da-duyet' ? ['ngay_duyet: 2026-10-18'] : []),
    ...(tc.lienQuan ? [`lien_quan: [${tc.lienQuan.join(', ')}]`] : []),
    '---',
  ]
  const than = THAN_CHU_DE.filter(([t]) => !tc.bo?.includes(t))
    .map(([t, noiDung]): [string, string] => [t, tc.thay?.[t] ?? noiDung])
    .concat(tc.them ?? [])
    .flatMap(([t, noiDung]) => [`## ${t}`, '', noiDung, ''])
  return [...fm, '', ...than].join('\n')
}

/** Phản hồi GET /api/bai như server: file trên đĩa (+ bản chụp nếu đã duyệt). */
export function phanHoi(
  m: MucHoc,
  text: string | null,
  { banChup }: { banChup?: { ngayDuyet: string; noiDung: string; khop: boolean } } = {},
): PhanHoiBai {
  const tep = text === null ? null : { noiDung: text, hash: 'hash-file' }
  return quyetDinhBai(
    m,
    tep,
    banChup && {
      id: 1,
      itemId: m.id,
      ngayDuyet: banChup.ngayDuyet,
      hash: banChup.khop ? 'hash-file' : 'hash-khac',
      noiDung: banChup.noiDung,
    },
  )
}
