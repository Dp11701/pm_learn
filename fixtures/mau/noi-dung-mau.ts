// Bộ dựng file bài mẫu (đề xuất mục 7, §13 quy tắc 6): thân bài TOÀN câu giữ chỗ "[Nội dung mẫu — <khối>] …",
// không có kiến thức PM, công thức, số liệu chuyên môn, tên sách / tác giả / URL thật. Câu giữ chỗ lấy theo
// frame (F11, F12, F15) khi frame có; còn lại tự đặt theo cùng giọng, dài như đoạn thật (3–5 dòng).
// Khối, thứ tự, tiểu mục ### và quy ước trong khối theo shared/noi-dung (mẫu bài 1.5, D13).
// Chạy `npx tsx fixtures/mau/tao-noi-dung.ts` để ghi ra fixtures/mau/noi-dung/.

import {
  MUC_CON_GOC_DEV_LEAD,
  MUC_CON_THUC_HANH,
  khoiTrongFile,
} from '../../shared/noi-dung/index.ts'
import type { KhoiMau } from '../../shared/noi-dung/index.ts'
import type { Cay, MucHoc } from '../../shared/roadmap/index.ts'
import {
  BAI_THEO_FRAME,
  BAN_NHAP,
  DA_DUYET,
  GIAI_NGHIA_FRAME,
  KHOI_7,
  LIEN_QUAN_FRAME,
  PROCESS_GROUP_FRAME,
  SO_CAU_HOI_FRAME,
  SO_COT_MAU_DIEN_SAN,
  SO_KHAI_NIEM_FRAME,
  ngayCuaMoc,
} from './so-lieu.ts'

export interface TuyChonBai {
  trangThai: 'da-duyet' | 'ban-nhap'
  nguon: 'ai' | 'tu-viet'
  /** YYYY-MM-DD; bắt buộc khi da-duyet */
  ngayDuyet?: string
  /** Tên khối ★ không viết trong file (để "Đủ khối" < tối đa) */
  thieuKhoi?: readonly string[]
  /** Đoạn thêm vào cuối một khối (khoá = id khối mẫu), vd. bản sửa */
  themDoan?: Readonly<Record<string, string>>
}

// ---------- Câu giữ chỗ ----------

/** Đoạn đầu của các khối văn bản (khoá = id khối mẫu). */
const DOAN_DAU: Readonly<Record<string, string>> = {
  'tom-tat':
    '[Nội dung mẫu — Tóm tắt] Khối này tóm tắt bài trong 2–3 câu tiếng Việt: mục này là gì, nó giúp gì cho dự án và người đọc cần nhớ điều gì sau khi đọc xong. Câu đầu là định nghĩa ngắn, câu sau nói khi nào cần dùng tới nó.',
  // F11
  'vi-sao-pm-can-biet':
    '[Nội dung mẫu — Vì sao PM cần biết] Khối này giải thích trong 3–5 câu tiếng Việt vì sao người làm PM phải nắm chủ đề này: nó ảnh hưởng tới quyết định nào, rủi ro gì xảy ra nếu bỏ qua, và nó nối với những trách nhiệm hằng ngày của PM ra sao. Đoạn văn thật sẽ dài khoảng bốn dòng ở cột đọc này.',
  // F11
  'vi-du-thuc-te':
    '[Nội dung mẫu — Ví dụ thực tế] Khối này kể một tình huống cụ thể trong dự án phần mềm, 4–6 câu: bối cảnh, điều đã xảy ra, dấu hiệu nhận biết và cách nhóm đã xử lý. Ví dụ nên gần với công việc của một dev lead đang chuyển sang vai trò PM để người đọc nhận ra ngay.',
  // F11
  'cach-ap-dung':
    '[Nội dung mẫu — Cách áp dụng] Khối này là các bước làm theo thứ tự, mỗi bước một câu hành động.',
  // F15
  'muc-dich':
    '[Nội dung mẫu — Mục đích] Khối này nói trong 2–4 câu tài liệu dùng để làm gì, giải quyết vấn đề gì của dự án và ai đọc nó nhiều nhất. Đoạn thật dài khoảng ba dòng ở cột đọc này.',
  // F15
  'khi-nao-lap-ai-lap-ai-duyet':
    '[Nội dung mẫu — Khi nào lập, ai lập, ai duyệt] 2–3 câu: thời điểm tạo tài liệu trong vòng đời dự án, vai trò lập và vai trò duyệt.',
  // F15
  'cau-truc-tai-lieu':
    '[Nội dung mẫu — Cấu trúc tài liệu] Khối này liệt kê các phần của tài liệu, mỗi phần một dòng mô tả.',
  // F15
  'loi-thuong-gap':
    '[Nội dung mẫu — Lỗi thường gặp] 3–4 lỗi hay gặp khi lập tài liệu này, mỗi lỗi một câu kèm cách tránh.',
  'danh-cho-ai':
    '[Nội dung mẫu — Dành cho ai] Khối này nói trong 2–4 câu chứng chỉ hợp với ai, người học cần có kinh nghiệm gì trước khi bắt đầu ôn và chứng chỉ giúp gì cho người đang chuyển sang vai trò PM.',
}

/** Khối 7 của Chủ đề: câu theo tên khối đang dùng (D13). */
const DOAN_KHOI_7: Readonly<Record<string, string>> = {
  'So sánh':
    '[Nội dung mẫu — So sánh] Khối này đặt chủ đề cạnh 1–2 cách làm hoặc khái niệm dễ nhầm, nêu điểm giống và điểm khác trong vài câu ngắn, có thể kèm một bảng nhỏ hai cột.',
  'Thuật ngữ':
    '[Nội dung mẫu — Thuật ngữ] Khối này giải thích các thuật ngữ tiếng Anh hay gặp quanh chủ đề, mỗi thuật ngữ một câu tiếng Việt, xếp theo thứ tự chữ cái.',
  'Thực hành công cụ':
    '[Nội dung mẫu — Thực hành công cụ] Khối này hướng dẫn một bài tập ngắn trên công cụ, mỗi bước một câu, làm xong trong khoảng 15 phút với dữ liệu giả.',
}

/** Đoạn thứ hai (bài không theo frame) để bài dài như bài thật. */
const doanHai = (ten: string) =>
  `[Nội dung mẫu — ${ten}] Đoạn thứ hai giữ chỗ cho phần viết tiếp của khối: thêm một ý phụ, một lưu ý khi áp dụng hoặc một câu chuyển sang khối sau. Câu giữ chỗ dài như đoạn thật để thấy nhịp đọc của bài.`

const KHAI_NIEM = (n: number) =>
  `- **[Khái niệm mẫu ${n}]** — Một đến hai câu tiếng Việt định nghĩa khái niệm, giữ thuật ngữ tiếng Anh khi cần.`
const BUOC = (n: number) => `${n}. [Bước mẫu ${n}] Một câu hành động bắt đầu bằng động từ.`
const PHAN = (n: number) => `- [Phần mẫu ${n}] Một dòng mô tả.`
const TIEU_CHI = (n: number) => `- [ ] [Tiêu chí mẫu ${n}] Một câu kiểm tra được bằng có/không.`
const NGUON = (n: number) => `- Nguồn mẫu ${n} — chưa điền`

const CAU_HOI_THEO_MAU: Readonly<Record<MucHoc['mau'], string>> = {
  'chu-de': 'Một câu hỏi tình huống ngắn về chủ đề, tự trả lời trước rồi mới xem đáp án.',
  // F15
  'tai-lieu': 'Một câu hỏi tình huống về cách dùng tài liệu.',
  'chung-chi': 'Một câu hỏi về cách lên kế hoạch ôn cho kỳ thi.',
}
const CAU_HOI = (mau: MucHoc['mau'], n: number) =>
  `- H: [Nội dung mẫu — Câu hỏi ${n}] ${CAU_HOI_THEO_MAU[mau]} | Đ: [Nội dung mẫu — Đáp án ${n}] Hai đến ba câu tiếng Việt nêu các ý chính mà câu trả lời cần có.`

// F11 / F12
const GOC_DEV_LEAD: Readonly<Record<string, string>> = {
  'Bạn đã quen':
    '[Nội dung mẫu — Bạn đã quen] 2–3 câu nối chủ đề với thói quen của dev lead: code review, sprint, Jira, CI/CD.',
  'Điều cần đổi':
    '[Nội dung mẫu — Điều cần đổi] 2–3 câu về góc nhìn PM khác với góc nhìn kỹ thuật ở chủ đề này.',
}
const THUC_HANH: Readonly<Record<string, string>> = {
  'Đề bài':
    '[Nội dung mẫu — Đề bài] 2–3 câu giao một việc làm được trong 30–60 phút trên dự án đang làm.',
  'Đầu ra': '[Nội dung mẫu — Đầu ra] Một câu mô tả sản phẩm cụ thể cần nộp.',
}

// ---------- Dựng khối ----------

interface NguCanh {
  cay: Cay
  muc: MucHoc
  theoFrame: boolean
}

const lap = <T>(n: number, f: (i: number) => T): T[] =>
  Array.from({ length: n }, (_, i) => f(i + 1))

/** Có thêm đoạn thứ hai cho khối thứ `so` của bài không (đổi theo mục, ổn định giữa các lần chạy). */
function coDoanHai(ng: NguCanh, so: number): boolean {
  return !ng.theoFrame && (ng.muc.index + so) % 2 === 0
}

function bangMau(soCot: number): string {
  const dong = (o: string[]) => `| ${o.join(' | ')} |`
  return [
    dong(lap(soCot, (c) => `[Cột mẫu ${c}]`)),
    dong(lap(soCot, () => '---')),
    ...lap(3, (h) => dong(lap(soCot, (c) => `[Ô mẫu ${h}.${c}]`))),
  ].join('\n')
}

/** Thân khối (Markdown, không gồm dòng ##). */
function thanKhoi(ng: NguCanh, khoi: KhoiMau, tieuDe: string): string {
  const { muc } = ng
  const doan = (dau: string) => (coDoanHai(ng, khoi.so ?? 0) ? `${dau}\n\n${doanHai(tieuDe)}` : dau)
  switch (khoi.kieu) {
    case 'van-ban':
      if (khoi.id === 'so-sanh') return DOAN_KHOI_7[tieuDe]
      if (khoi.id === 'cach-ap-dung') return `${DOAN_DAU[khoi.id]}\n\n${lap(4, BUOC).join('\n')}`
      if (khoi.id === 'cau-truc-tai-lieu')
        return `${DOAN_DAU[khoi.id]}\n\n${lap(3, PHAN).join('\n')}`
      return doan(DOAN_DAU[khoi.id])
    case 'process-group':
      return DOAN_DAU[khoi.id]
    case 'dinh-nghia':
      return lap(SO_KHAI_NIEM_FRAME[muc.slug] ?? 3 + (muc.index % 3), KHAI_NIEM).join('\n')
    case 'goc-dev-lead':
      return MUC_CON_GOC_DEV_LEAD.map((ten) => `### ${ten}\n\n${GOC_DEV_LEAD[ten]}`).join('\n\n')
    case 'thuc-hanh':
      return MUC_CON_THUC_HANH.map((ten) =>
        THUC_HANH[ten]
          ? `### ${ten}\n\n${THUC_HANH[ten]}`
          : `### ${ten}\n\n${lap(3, TIEU_CHI).join('\n')}`,
      ).join('\n\n')
    case 'tu-kiem-tra':
      return lap(SO_CAU_HOI_FRAME[muc.slug] ?? 1 + (muc.index % 3), (n) =>
        CAU_HOI(muc.mau, n),
      ).join('\n')
    case 'tham-khao':
      return lap(ng.theoFrame ? 1 : 1 + (muc.index % 2), NGUON).join('\n')
    case 'mau-dien-san':
      return bangMau(SO_COT_MAU_DIEN_SAN[muc.slug] ?? 4)
    case 'checklist':
      return lap(3, TIEU_CHI).join('\n')
    case 'thong-tin-thi':
      return lap(4, (n) => `- [Trường mẫu ${n}]:`).join('\n')
    case 'phu-roadmap': {
      // Chỉ dùng khi dựng thử mẫu Chứng chỉ (bộ §7 không có bài Chứng chỉ): mục lấy theo thứ tự cây.
      const ds = ng.cay.mucHoc.filter((m) => m.mau === 'chu-de')
      return lap(
        3,
        (n) => `### [Domain mẫu ${n}]\n\n- ${ds[n * 2 - 2].slug}\n- ${ds[n * 2 - 1].slug}`,
      ).join('\n\n')
    }
    default:
      throw new Error(`Khối ${khoi.id} (${khoi.kieu}) không viết trong file`)
  }
}

/** 2 mục kề trong cùng lĩnh vực (không có lĩnh vực thì cùng phần), theo thứ tự cây. */
function lienQuanKe(cay: Cay, muc: MucHoc): string[] {
  const vung = (m: MucHoc) => (m.linhVuc ?? m.phan).id
  const cung = cay.mucHoc.filter((m) => vung(m) === vung(muc))
  const i = cung.indexOf(muc)
  const ung = [cung[i - 1], cung[i + 1], cung[i - 2], cung[i + 2]].filter(
    (m): m is MucHoc => m !== undefined,
  )
  return ung.slice(0, 2).map((m) => m.slug)
}

/** Có khối tuỳ chọn "Lỗi thường gặp" không (Risk Register như F15; tài liệu khác xen kẽ). */
function coLoiThuongGap(muc: MucHoc, theoFrame: boolean): boolean {
  return theoFrame || muc.index % 2 === 0
}

const dsYaml = (ds: readonly string[]) => `[${ds.join(', ')}]`

/** Frontmatter theo thứ tự khoá của 1.5. */
function frontmatter(cay: Cay, muc: MucHoc, tc: TuyChonBai): string {
  const dong = ['---', `id: ${JSON.stringify(muc.id)}`, `loai: ${muc.mau}`]
  const giaiNghia = GIAI_NGHIA_FRAME[muc.slug]
  if (giaiNghia) dong.push(`giai_nghia: ${giaiNghia}`)
  dong.push(`trang_thai_noi_dung: ${tc.trangThai}`, `nguon: ${tc.nguon}`)
  if (tc.trangThai === 'da-duyet') {
    if (!tc.ngayDuyet) throw new Error(`Thiếu ngày duyệt của ${muc.slug}`)
    dong.push(`ngay_duyet: ${tc.ngayDuyet}`)
  }
  dong.push(`lien_quan: ${dsYaml(LIEN_QUAN_FRAME[muc.slug] ?? lienQuanKe(cay, muc))}`)
  const processGroup = PROCESS_GROUP_FRAME[muc.slug]
  if (processGroup && muc.mau === 'tai-lieu') dong.push(`process_group: ${dsYaml(processGroup)}`)
  dong.push('---')
  return dong.join('\n')
}

/** Toàn văn một file bài mẫu (UTF-8, LF, kết thúc bằng xuống dòng). */
export function taoBai(cay: Cay, muc: MucHoc, tc: TuyChonBai): string {
  const theoFrame = BAI_THEO_FRAME.includes(muc.slug)
  const ng: NguCanh = { cay, muc, theoFrame }
  const thieu = new Set(tc.thieuKhoi ?? [])
  const phan = [frontmatter(cay, muc, tc)]
  for (const khoi of khoiTrongFile(muc.mau)) {
    if (thieu.has(khoi.tieuDe)) continue
    let tieuDe = khoi.tieuDe
    if (khoi.id === 'so-sanh') {
      const ten = KHOI_7[muc.slug]
      if (!ten) continue
      tieuDe = ten
    }
    if (khoi.id === 'loi-thuong-gap' && !coLoiThuongGap(muc, theoFrame)) continue
    let than = thanKhoi(ng, khoi, tieuDe)
    const them = tc.themDoan?.[khoi.id]
    if (them) than = `${than}\n\n${them}`
    phan.push(`## ${tieuDe}\n\n${than}`)
  }
  for (const ten of thieu) {
    if (!khoiTrongFile(muc.mau).some((k) => k.tieuDe === ten && k.batBuoc)) {
      throw new Error(`"${ten}" không phải khối ★ viết trong file của mẫu ${muc.mau}`)
    }
  }
  return `${phan.join('\n\n')}\n`
}

function mucTheoSlug(cay: Cay, slug: string): MucHoc {
  const muc = cay.mucTheoSlug.get(slug)
  if (!muc) throw new Error(`Slug mẫu không có trong cây: ${slug}`)
  return muc
}

/**
 * 50 file bài của bộ mẫu §7 (41 Đã duyệt + 9 Bản nháp), khoá = đường dẫn tính từ gốc thư mục nội dung
 * (MucHoc.duongDanTuongDoi), theo thứ tự cây.
 */
export function cacBaiMau(cay: Cay): Map<string, string> {
  const ds: [MucHoc, string][] = []
  for (const bai of DA_DUYET) {
    const muc = mucTheoSlug(cay, bai.slug)
    const ngayDuyet = ngayCuaMoc(bai.duyetLuc)
    ds.push([muc, taoBai(cay, muc, { trangThai: 'da-duyet', nguon: bai.nguon, ngayDuyet })])
  }
  for (const bai of BAN_NHAP) {
    const muc = mucTheoSlug(cay, bai.slug)
    ds.push([
      muc,
      taoBai(cay, muc, { trangThai: 'ban-nhap', nguon: bai.nguon, thieuKhoi: bai.thieuKhoi }),
    ])
  }
  const daCo = new Set<string>()
  for (const [muc] of ds) {
    if (daCo.has(muc.id)) throw new Error(`Mục mẫu bị lặp: ${muc.slug}`)
    daCo.add(muc.id)
  }
  ds.sort((a, b) => a[0].index - b[0].index)
  return new Map(ds.map(([muc, text]) => [muc.duongDanTuongDoi, text]))
}

// ---------- Kịch bản ----------

/** Đoạn thêm ở khối Ví dụ thực tế của bản sửa (để "Mở bản sửa" thấy khác bản đã duyệt). */
export const DOAN_BAN_SUA =
  '[Nội dung mẫu — Ví dụ thực tế, bản sửa] Đoạn mới thêm trong bản sửa: kể tiếp tình huống ở đoạn trên bằng 2–3 câu, nói nhóm đã rút ra điều gì sau sự việc. Đây là câu giữ chỗ để thấy chỗ khác giữa bản sửa và bản đã duyệt.'

/**
 * F12: `scope-creep.ban-sua.md` — bản sửa chưa duyệt của Scope Creep, bỏ `## Tự kiểm tra`, thêm một đoạn ở
 * Ví dụ thực tế. Bản sửa là Bản nháp (chưa duyệt), giữ id, loai, nguồn của bài.
 */
export function taoBanSuaScopeCreep(cay: Cay): { duongDan: string; text: string } {
  const muc = mucTheoSlug(cay, 'scope-creep')
  const goc = DA_DUYET.find((x) => x.slug === muc.slug)
  if (!goc) throw new Error('Scope Creep phải là bài Đã duyệt trong bộ mẫu')
  const text = taoBai(cay, muc, {
    trangThai: 'ban-nhap',
    nguon: goc.nguon,
    thieuKhoi: ['Tự kiểm tra'],
    themDoan: { 'vi-du-thuc-te': DOAN_BAN_SUA },
  })
  return { duongDan: muc.duongDanTuongDoi.replace(/\.md$/, '.ban-sua.md'), text }
}

/** Dòng hỏng của kịch bản loi-file: quên dấu ':' sau khoá loai (lỗi cú pháp YAML ở dòng 3). */
export const DONG_HONG = 'loai tai-lieu'

/** F26: `change-log.md` hỏng frontmatter ở dòng 3 (dòng `loai: …`). */
export function taoChangeLogHong(cay: Cay): { duongDan: string; text: string } {
  const muc = mucTheoSlug(cay, 'change-log')
  const bai = BAN_NHAP.find((x) => x.slug === muc.slug)
  if (!bai) throw new Error('Change log phải là bản nháp trong bộ mẫu')
  const dong = taoBai(cay, muc, {
    trangThai: 'ban-nhap',
    nguon: bai.nguon,
    thieuKhoi: bai.thieuKhoi,
  }).split('\n')
  if (dong[2] !== `loai: ${muc.mau}`) throw new Error('Dòng 3 của change-log.md phải là loai')
  dong[2] = DONG_HONG
  return { duongDan: muc.duongDanTuongDoi, text: dong.join('\n') }
}
