import { TEN_LOAI } from '../domain/trang-thai'
import { chuoiCha, conCua } from '../roadmap/tra-cuu'
import type { Cay, MauBai, MucHoc } from '../roadmap/types'
import { MAU_BAI, cacTen, type KhoiMau } from './mau-bai'

// Prompt "Sao chép prompt soạn bài" (§8.7, D14, đề xuất 1.5): người dùng dán cho Claude (ngoài app)
// để soạn bản nháp một bài. App không gọi AI. Mọi câu chữ dưới đây là câu chữ app, gửi duyệt ở
// phase 2a; tên mục, đường dẫn, id, slug lấy từ cây lúc chạy.

/** Gợi ý cho từng khối viết trong file, theo mẫu bài và id khối (mau-bai.ts). */
export const GOI_Y_KHOI: Readonly<Record<MauBai, Readonly<Record<string, string>>>> = {
  'chu-de': {
    'tom-tat': '1–2 câu nói chủ đề là gì.',
    'vi-sao-pm-can-biet':
      '3–5 câu: chủ đề ảnh hưởng tới quyết định nào của PM, rủi ro gì nếu bỏ qua, nối với việc hằng ngày của PM ra sao.',
    'khai-niem-cot-loi':
      '3–5 khái niệm chính, mỗi khái niệm một dòng "- **Thuật ngữ** — giải thích 1–2 câu".',
    'vi-du-thuc-te':
      'một tình huống giả định trong dự án phần mềm, 4–6 câu: bối cảnh, điều đã xảy ra, dấu hiệu nhận biết, cách nhóm xử lý.',
    'cach-ap-dung': 'các bước làm theo thứ tự, mỗi bước một câu hành động bắt đầu bằng động từ.',
    'goc-dev-lead-pm': 'đúng 2 tiểu mục:',
    'so-sanh': 'đặt chủ đề cạnh 1–2 khái niệm dễ nhầm, dạng bảng ngắn hoặc 3–4 câu.',
    'thuc-hanh-tren-du-an-that': 'đúng 3 tiểu mục:',
    'tu-kiem-tra': '3–5 câu hỏi tình huống, mỗi câu một dòng "- H: <câu hỏi> | Đ: <đáp án>".',
    'tham-khao':
      '2–5 nguồn, mỗi nguồn một dòng "- <tên nguồn> — <tác giả hoặc tổ chức>, <URL nếu có>".',
  },
  'tai-lieu': {
    'muc-dich':
      '2–4 câu: tài liệu dùng để làm gì, giải quyết vấn đề gì của dự án, ai đọc nó nhiều nhất.',
    'khi-nao-lap-ai-lap-ai-duyet':
      '2–3 câu: thời điểm lập trong vòng đời dự án, vai trò lập, vai trò duyệt. Các giai đoạn liên quan ghi ở process_group của frontmatter.',
    'cau-truc-tai-lieu':
      'các phần của tài liệu, mỗi phần một dòng "- <tên phần> — <mô tả một dòng>".',
    'mau-dien-san':
      'một bảng Markdown: hàng tiêu đề là các cột của tài liệu, thêm 3 hàng ví dụ giả định cho một dự án phần mềm. Người học tải bảng này về dạng .md / .csv để dùng.',
    'checklist-chat-luong': '4–6 dòng "- [ ] …", mỗi dòng một câu kiểm tra được bằng có/không.',
    'loi-thuong-gap': '3–4 lỗi hay gặp khi lập tài liệu này, mỗi lỗi một câu kèm cách tránh.',
    'tu-kiem-tra':
      '3–5 câu hỏi tình huống về cách lập và dùng tài liệu, mỗi câu một dòng "- H: <câu hỏi> | Đ: <đáp án>".',
    'tham-khao':
      '2–5 nguồn, mỗi nguồn một dòng "- <tên nguồn> — <tác giả hoặc tổ chức>, <URL nếu có>".',
  },
  'chung-chi': {
    'tom-tat': '1–2 câu: chứng chỉ là gì, do tổ chức nào cấp.',
    'danh-cho-ai':
      '2–4 câu: chứng chỉ hợp với ai, ở giai đoạn nghề nghiệp nào, có hợp với dev lead đang chuyển sang PM không.',
    'thong-tin-ky-thi':
      'người học tự điền khối này sau khi kiểm tra nguồn chính thức — bạn chỉ ghi dòng tiêu đề, để trống phần bên dưới, không tự đặt trường hay giá trị nào.',
    'phu-roadmap':
      'mỗi domain của đề thi một tiểu mục "### <tên domain>", dưới đó các dòng "- <slug>" của mục roadmap liên quan. Chỉ dùng tên domain có trong nguồn chính thức; không chắc thì chỉ ghi tiêu đề khối, người học tự điền.',
    'tu-kiem-tra':
      '3–5 câu hỏi về đối tượng phù hợp và cách ôn cho kỳ thi, không hỏi về thông tin kỳ thi (người học tự điền), mỗi câu một dòng "- H: <câu hỏi> | Đ: <đáp án>".',
    'tham-khao':
      '2–5 nguồn, ưu tiên trang chính thức của tổ chức cấp chứng chỉ, mỗi nguồn một dòng "- <tên nguồn> — <tác giả hoặc tổ chức>, <URL nếu có>".',
  },
}

/** Gợi ý cho tên khác của khối (D13: khối 7 của Chủ đề) */
export const GOI_Y_TEN_KHAC: Readonly<Record<string, string>> = {
  'Thuật ngữ': 'thuật ngữ đi kèm chủ đề, mỗi dòng "- **Thuật ngữ** — giải thích".',
  'Thực hành công cụ':
    'các bước làm chủ đề này trên một công cụ quen dùng (Jira, bảng tính…), mỗi bước một câu.',
}

/** Gợi ý cho tiểu mục ### */
export const GOI_Y_MUC_CON: Readonly<Record<string, string>> = {
  'Bạn đã quen':
    '2–3 câu nối chủ đề với điều dev lead đã quen (sprint, review code, CI/CD, Jira…).',
  'Điều cần đổi': '2–3 câu về góc nhìn PM khác góc nhìn kỹ thuật ở chủ đề này.',
  'Đề bài': '2–3 câu giao một việc làm được trong 30–60 phút trên dự án đang làm.',
  'Đầu ra': 'một câu mô tả sản phẩm cụ thể cần nộp.',
  'Tiêu chí tự kiểm': '3–5 dòng "- [ ] …", mỗi dòng một câu kiểm tra được bằng có/không.',
}

/** Quy ước viết, chỉ đưa dòng mà mẫu bài có dùng */
const QUY_UOC = {
  cauHoi:
    '- Câu hỏi Tự kiểm tra: mỗi câu đúng một dòng "- H: <câu hỏi> | Đ: <đáp án>", có dấu cách hai bên dấu |. Đáp án dài thì viết tiếp ở các dòng thụt vào 2 dấu cách ngay bên dưới. Cần chữ | trong câu hỏi hay đáp án thì viết \\|.',
  dinhNghia: '- Khái niệm: mỗi dòng "- **<Thuật ngữ>** — <giải thích>".',
  dongTick: '- Danh sách tick: mỗi dòng "- [ ] <tiêu chí>".',
  mucCon: '- Tiểu mục: dòng "### <tên>" đúng tên đã ghi ở trên, không thêm tiểu mục khác.',
  bang: '- Mẫu điền sẵn: bảng Markdown (GFM) đầu tiên của khối là mẫu người học tải về; mọi hàng có đủ số cột.',
  domain: '- Phủ roadmap: "### <tên domain>", dưới đó mỗi dòng "- <slug>".',
} as const

const NGUOI_HOC =
  'Người học là dev lead đang chuyển sang làm PM: đã quen vòng đời phát triển phần mềm, Scrum/Kanban, CI/CD, review code và Jira; có một dự án phần mềm thật để thực hành. Roadmap gốc chỉ có tên mục, không có nội dung; bài bạn soạn là bản nháp, người học sẽ tự soát và duyệt trong app.'

const YEU_CAU = [
  '- Viết tiếng Việt có dấu, câu ngắn, rõ ý; gọi người học là "bạn".',
  '- Giữ nguyên tên mục và thuật ngữ PM bằng tiếng Anh, không dịch, không phiên âm; lần đầu nhắc một thuật ngữ có thể ghi nghĩa tiếng Việt trong ngoặc.',
  '- Chỉ viết điều bạn chắc chắn. Không bịa sự kiện, số liệu, trích dẫn, tên người hay nguồn tham khảo; điều gì không chắc thì bỏ, hoặc ghi rõ là chưa chắc.',
  '- Ghi nguồn ở khối Tham khảo; chỉ ghi nguồn có thật, ưu tiên nguồn chính thức và tài liệu gốc.',
  '- Ví dụ, tình huống và hàng ví dụ trong bảng là giả định để minh hoạ: không gán cho công ty hay người có thật.',
  '- Chỉ dùng Markdown thường: không HTML, không chèn ảnh; không viết chữ nào trước dòng "## " đầu tiên ngoài frontmatter; không thêm tiêu đề ## nào ngoài danh sách trên.',
  '- Đây là bản nháp: giữ trang_thai_noi_dung: ban-nhap và nguon: ai, không thêm ngay_duyet; chỉ người học duyệt bài trong app.',
] as const

/** Khoá frontmatter riêng của từng mẫu, kèm dòng giải thích */
function frontmatterRieng(muc: MucHoc, cay: Cay): { khoa: string[]; giaiThich: string[] } {
  if (muc.mau === 'tai-lieu') {
    const giaiDoan = conCua(cay, cay.nhomProcessGroup.id).map((n) => n.slug)
    return {
      khoa: ['process_group: [<slug giai đoạn>, …]'],
      giaiThich: [
        `- process_group: các giai đoạn quản lý dự án mà tài liệu được lập hoặc cập nhật, chọn trong: ${giaiDoan.join(', ')}.`,
      ],
    }
  }
  if (muc.mau === 'chung-chi') {
    return {
      khoa: [],
      giaiThich: [
        '- Không ghi kiem_tra_lan_cuoi: người học tự ghi ngày sau khi kiểm tra lại thông tin kỳ thi.',
      ],
    }
  }
  return { khoa: [], giaiThich: [] }
}

function dongKhoi(mau: MauBai, k: KhoiMau): string[] {
  const goiY = GOI_Y_KHOI[mau][k.id] ?? ''
  if (k.tenKhac.length > 0) {
    return [
      `- Tuỳ chọn, chọn tối đa một trong ${cacTen(k).length} tên, bỏ hẳn nếu không cần:`,
      ...cacTen(k).map(
        (ten) => `  - "## ${ten}": ${ten === k.tieuDe ? goiY : (GOI_Y_TEN_KHAC[ten] ?? '')}`,
      ),
    ]
  }
  const nhan = k.batBuoc ? ' ★' : ' (tuỳ chọn)'
  return [
    `- "## ${k.tieuDe}"${nhan}: ${goiY}`,
    ...k.mucCon.map((ten) => `  - "### ${ten}": ${GOI_Y_MUC_CON[ten] ?? ''}`),
  ]
}

/** Slug mọi mục học, gom theo lĩnh vực (mục không thuộc lĩnh vực: theo phần), theo thứ tự cây. */
function danhSachSlug(cay: Cay): string[] {
  const nhom: { ten: string; slug: string[] }[] = []
  let vungTruoc = ''
  for (const m of cay.mucHoc) {
    const vung = m.linhVuc ?? m.phan
    if (vung.id !== vungTruoc) {
      vungTruoc = vung.id
      nhom.push({
        ten: m.linhVuc ? `${m.phan.label} › ${m.linhVuc.label}` : m.phan.label,
        slug: [],
      })
    }
    nhom[nhom.length - 1].slug.push(m.slug)
  }
  return nhom.map((n) => `- ${n.ten}: ${n.slug.join(', ')}`)
}

/** Prompt soạn bài cho một mục học (D14). */
export function buildPrompt(muc: MucHoc, cay: Cay): string {
  const mau = MAU_BAI[muc.mau]
  const viTri = [...chuoiCha(cay, muc.id).map((n) => n.label), muc.label].join(' › ')
  const rieng = frontmatterRieng(muc, cay)
  const khoiFile = mau.khoi.filter((k) => k.nguon === 'file')
  const khoiApp = mau.khoi.filter((k) => k.nguon === 'app').map((k) => `"${k.tieuDe}"`)
  const kieu = new Set(khoiFile.map((k) => k.kieu))

  const quyUoc = [
    QUY_UOC.cauHoi,
    ...(kieu.has('dinh-nghia') ? [QUY_UOC.dinhNghia] : []),
    ...(kieu.has('thuc-hanh') || kieu.has('checklist') ? [QUY_UOC.dongTick] : []),
    ...(khoiFile.some((k) => k.mucCon.length > 0) ? [QUY_UOC.mucCon] : []),
    ...(kieu.has('mau-dien-san') ? [QUY_UOC.bang] : []),
    ...(kieu.has('phu-roadmap') ? [QUY_UOC.domain] : []),
  ]

  const dong = [
    `Soạn bài học cho mục "${muc.label}" trong roadmap quản lý dự án (PM) của roadmap.sh, dùng trong app tự học "Học PM A–Z".`,
    '',
    NGUOI_HOC,
    '',
    'Mục cần soạn',
    `- Tên: ${muc.label}`,
    ...(muc.labelOriginal ? [`- Tên gốc trên roadmap: ${muc.labelOriginal}`] : []),
    `- Vị trí: ${viTri}`,
    `- Loại: ${TEN_LOAI[muc.mau]}`,
    `- File: ${muc.duongDanFile}`,
    '',
    'Frontmatter: đặt ở đầu file, đúng các khoá sau.',
    '---',
    `id: ${JSON.stringify(muc.id)}`,
    `loai: ${mau.loai}`,
    'trang_thai_noi_dung: ban-nhap',
    'nguon: ai',
    'giai_nghia: <cụm tiếng Việt ngắn>',
    'lien_quan: [<slug>, <slug>]',
    ...rieng.khoa,
    '---',
    '- id, loai, trang_thai_noi_dung, nguon: giữ nguyên như trên.',
    '- giai_nghia: cụm tiếng Việt 2–6 chữ giải nghĩa tên mục; bỏ trống nếu tên không cần dịch.',
    '- lien_quan: 2–5 slug của các mục liên quan, lấy đúng chính tả trong "Slug các mục của roadmap" ở cuối. Đây là chỗ duy nhất ghi mục liên quan.',
    ...rieng.giaiThich,
    '',
    `Thân bài: dùng đúng các tiêu đề ## sau, theo đúng thứ tự từ trên xuống. ★ là khối bắt buộc. Dòng tiêu đề trong file chỉ gồm "## " và tên khối, không ghi ★ hay phần mô tả.`,
    ...khoiFile.flatMap((k) => dongKhoi(muc.mau, k)),
    `App tự tạo các khối ${khoiApp.join(', ')}: không viết các khối này.`,
    '',
    'Quy ước viết (app đọc đúng theo dạng này):',
    ...quyUoc,
    '',
    'Yêu cầu:',
    ...YEU_CAU,
    '',
    `Trả về toàn bộ nội dung file (frontmatter + thân bài). Ghi được file thì lưu đúng đường dẫn ${muc.duongDanFile}; không thì đặt cả file trong một khối mã markdown để người học tự lưu.`,
    '',
    'Slug các mục của roadmap (chỉ dùng slug có trong danh sách, không tự đặt):',
    ...danhSachSlug(cay),
  ]
  return dong.join('\n')
}
