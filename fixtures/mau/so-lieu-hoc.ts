// Số liệu phase 3 của bộ dữ liệu mẫu (§7, đề xuất mục 7): dự án, bài thực hành, Nói lại, tự kiểm tra, ghi chú,
// flashcard + lịch sử ôn, phiên giờ, đồng hồ đang chạy. Chỉ dùng cho `npm run dev:mau` và test; app thật không
// bao giờ nạp file này. Mốc giờ viết theo giờ Việt Nam như so-lieu.ts; chữ đều là câu giữ chỗ (§13 quy tắc 6).

/** Dự án thực hành (§7 "Dự án thực hành: Cổng đặt lịch nội bộ, Execution"); vai trò để trống (F33 là C27). */
export const DU_AN_MAU = {
  ten: 'Cổng đặt lịch nội bộ',
  giaiDoan: 'Execution',
  vaiTro: null,
  tao: '2026-09-17 19:20',
} as const

/** Câu giữ chỗ (§13 quy tắc 6; F11). */
export const CHU_MAU = {
  noiLai: '[Nội dung mẫu — câu tự diễn đạt của người học, 1–3 câu tiếng Việt.]',
  ghiChu: '[Nội dung mẫu — ghi chú cá nhân 2–4 dòng về bài này.]',
  ketQua: '[Nội dung mẫu — kết quả bài thực hành trên dự án thật.]',
  traLoi: '[Nội dung mẫu — câu trả lời của người học.]',
  matTruoc: (n: number) => `[Nội dung mẫu — mặt trước thẻ ${n}]`,
  matSau: (n: number) => `[Nội dung mẫu — mặt sau thẻ ${n}]`,
} as const

/**
 * 7 bài thực hành Xong (§7 "7 bài thực hành xong"; tự đặt mục nào), mọi tiêu chí tick, dự án mẫu; lúc Xong =
 * 15 phút trước khi mục Đã xong. Scope Creep: Áp dụng đang làm, đã chọn dự án, chưa có kết quả (F11).
 */
export const THUC_HANH_XONG: readonly string[] = [
  'scrum',
  'kanban',
  'definition-of-done',
  'moscow',
  't-shirt-sizing',
  'execution',
  'change-control-board-ccb',
]
export const THUC_HANH_DANG_LAM = { slug: 'scope-creep', luc: '2026-10-18 20:50' } as const

/**
 * Nói lại: mọi mục Đã xong (10 phút trước lúc xong, tự đặt) + Scope Creep 21:42 (F11 "Đã lưu lúc 21:42") +
 * Risk Register 21:18 (F15).
 */
export const NOI_LAI_DANG_HOC: readonly { slug: string; luc: string }[] = [
  { slug: 'risk-register', luc: '2026-10-22 21:18' },
  { slug: 'scope-creep', luc: '2026-10-22 21:42' },
]

/** 6 ghi chú (F38, ngày theo frame; giờ tự đặt; Scope Creep 21:42 như F11). */
export const GHI_CHU_MAU: readonly { slug: string; luc: string }[] = [
  { slug: 'ci-cd', luc: '2026-09-28 21:40' },
  { slug: 'scrum', luc: '2026-10-05 21:35' },
  { slug: 'moscow', luc: '2026-10-12 21:30' },
  { slug: 'power-interest-grid', luc: '2026-10-19 21:00' },
  { slug: 'risk-register', luc: '2026-10-21 22:30' },
  { slug: 'scope-creep', luc: '2026-10-22 21:42' },
]

/**
 * Mục Đã xong được mở lại sau lúc xong (thêm ghi chú / thẻ): lượt mở cuối = mốc này thay cho lúc xong.
 * Scrum, MoSCoW thêm thẻ tối 21/10 (thẻ đến hạn 22/10 → Cần ôn lại); CI/CD thêm ghi chú 28/09.
 */
export const LUOT_MO_LAI: readonly { slug: string; luc: string }[] = [
  { slug: 'ci-cd', luc: '2026-09-28 21:38' },
  { slug: 'scrum', luc: '2026-10-21 19:29' },
  { slug: 'moscow', luc: '2026-10-21 19:33' },
]

/**
 * Phiên giờ [ngày, slug, giờ bắt đầu, số phút] — mỗi phiên trong một ngày, không chồng nhau, nằm trong lúc học
 * mục đó (so-lieu.ts). Cộng lại (§7): tổng 38 giờ 10 phút; tuần 43 = 4 giờ 35 phút; Scope Creep 35 phút (F11);
 * Risk Register 1 giờ 05 phút (F03, F15). Ngày có học: 17–28/09 (12 ngày = kỷ lục), 30/09–08/10, 10–16/10,
 * 18–22/10 (5 ngày = streak); 29/09, 09/10, 17/10 không học.
 */
export const PHIEN_GIO: readonly (readonly [string, string, string, number])[] = [
  // Tuần 38: 300 phút
  ['2026-09-17', 'sdlc', '19:30', 50],
  ['2026-09-17', 'pdlc', '20:25', 45],
  ['2026-09-17', 'scrum', '21:15', 20],
  ['2026-09-18', 'scrum', '20:00', 40],
  ['2026-09-18', 'kanban', '20:45', 30],
  ['2026-09-18', 'agile', '21:20', 20],
  ['2026-09-19', 'kanban', '20:00', 25],
  ['2026-09-19', 'agile', '20:30', 30],
  ['2026-09-20', 'ci-cd', '09:50', 40],
  // Tuần 39: 470 phút
  ['2026-09-21', 'waterfall', '20:00', 55],
  ['2026-09-21', 'iterative-approach', '21:10', 25],
  ['2026-09-22', 'iterative-approach', '20:00', 35],
  ['2026-09-22', 'incremental-approach', '20:45', 40],
  ['2026-09-23', 'code-review', '20:30', 60],
  ['2026-09-24', 'code-review', '20:00', 45],
  ['2026-09-24', 'branching-strategy', '21:10', 20],
  ['2026-09-25', 'branching-strategy', '20:00', 40],
  ['2026-09-26', 'tech-debt', '15:00', 90],
  ['2026-09-27', 'tech-debt', '15:00', 60],
  // Tuần 40: 400 phút (29/09 không học)
  ['2026-09-28', 'lean-principles', '20:00', 60],
  ['2026-09-28', 'v-model', '21:10', 15],
  ['2026-09-30', 'poc', '19:30', 40],
  ['2026-09-30', 'mvp', '20:15', 40],
  ['2026-09-30', 'test-strategy-test-plan', '21:20', 15],
  ['2026-10-01', 'test-strategy-test-plan', '20:00', 60],
  ['2026-10-01', 'confluence', '21:20', 20],
  ['2026-10-02', 'confluence', '20:00', 35],
  ['2026-10-03', 'definition-of-done', '15:00', 60],
  ['2026-10-04', 'definition-of-done', '15:00', 55],
  // Tuần 41: 420 phút (09/10 không học)
  ['2026-10-05', 'definition-of-ready', '20:00', 55],
  ['2026-10-05', 'functional-requirements', '21:10', 20],
  ['2026-10-06', 'functional-requirements', '19:45', 40],
  ['2026-10-06', 'non-functional-requirements', '20:30', 45],
  ['2026-10-07', 'moscow', '20:00', 55],
  ['2026-10-07', 't-shirt-sizing', '21:10', 15],
  ['2026-10-08', 't-shirt-sizing', '20:00', 40],
  ['2026-10-08', 'story-points-estimation-planning-poker', '20:50', 25],
  ['2026-10-10', 'burndown-burnup-charts', '14:30', 55],
  ['2026-10-10', 'project-sponsor', '15:40', 30],
  ['2026-10-11', 'project-sponsor', '15:00', 40],
  // Tuần 42: 425 phút (17/10 không học)
  ['2026-10-12', 'initiation', '20:00', 55],
  ['2026-10-12', 'planning', '21:10', 15],
  ['2026-10-13', 'planning', '20:00', 60],
  ['2026-10-13', 'execution', '21:10', 20],
  ['2026-10-14', 'execution', '20:00', 45],
  ['2026-10-14', 'meeting-notes', '21:00', 20],
  ['2026-10-15', 'meeting-notes', '20:00', 65],
  ['2026-10-15', 'decision-log', '21:20', 15],
  ['2026-10-16', 'decision-log', '20:00', 40],
  ['2026-10-16', 'presales', '20:50', 40],
  ['2026-10-18', 'change-control-board-ccb', '20:00', 9],
  ['2026-10-18', 'change-request-cr', '20:10', 18],
  ['2026-10-18', 'scope-creep', '20:30', 23],
  // Tuần 43: 275 phút = 4 giờ 35 phút
  ['2026-10-19', 'change-control-board-ccb', '19:15', 45],
  ['2026-10-19', 'schedule-creation-milestones-phases-critical-path', '20:10', 5],
  ['2026-10-19', 'change-request-cr', '20:20', 5],
  ['2026-10-20', 'change-request-cr', '20:05', 60],
  ['2026-10-20', 'qualitative-risk-assessment', '21:25', 5],
  ['2026-10-21', 'dedicated-team', '19:45', 30],
  ['2026-10-21', 'risk-register', '20:30', 45],
  ['2026-10-21', 'jira', '21:30', 30],
  ['2026-10-21', 'risk-register', '22:15', 20],
  ['2026-10-22', 'power-interest-grid', '20:40', 18],
  ['2026-10-22', 'scope-creep', '21:05', 12],
]

/** Đồng hồ đang chạy (§7, F03 "00:24:17"): Risk Register, bắt đầu GIO_MAU − 24 phút 17 giây. */
export const DONG_HO_MAU = { slug: 'risk-register', batDau: '2026-10-22 21:17:43' } as const

/** Giờ ôn thẻ mỗi sáng (tự đặt). */
export const GIO_ON = '07:30'

/**
 * 85 flashcard [slug, lúc tạo "MM-DD HH:mm" năm 2026, các lần ôn "MM-DD N|Q" (Nhớ / Quên) lúc GIO_ON], tìm bằng
 * máy để khớp §7 / F31 khi chạy quy tắc Leitner thật (3.5): hộp 1–5 = 34 / 21 / 15 / 9 / 6; 12 thẻ đến hạn
 * 22/10 (Scrum 5, MoSCoW 4, Definition of Done 3 → Cần ôn lại đúng 3 mục); tỉ lệ nhớ 30 ngày 81% (cửa sổ
 * 23/09–22/10, cả 22/09–22/10). Scope Creep 3 thẻ như F11 (hộp 2 hạn 24/10; hộp 1 hạn 23/10 ×2); Risk Register
 * không có thẻ (F15). Thẻ được tạo trong phiên học của mục; ôn có thể trễ hạn vài ngày.
 */
export const THE_MAU: readonly (readonly [string, string, string])[] = [
  ['sdlc', '09-17 19:33', '09-19 N, 09-21 Q, 09-22 N, 09-24 N, 09-28 N, 10-06 N, 10-22 Q'],
  ['sdlc', '09-17 19:35', '09-21 N, 09-23 N, 09-28 N, 10-06 N, 10-22 Q'],
  ['pdlc', '09-17 20:28', '09-18 N, 09-20 N, 09-24 N, 10-03 N, 10-19 Q, 10-21 N'],
  [
    'scrum',
    '09-17 21:18',
    '09-19 N, 09-21 Q, 09-24 N, 09-28 N, 10-02 N, 10-12 Q, 10-13 N, 10-18 N',
  ],
  ['scrum', '09-18 20:03', '09-19 N, 09-21 N, 09-25 N, 10-03 N, 10-19 Q, 10-20 N'],
  ['scrum', '10-21 19:30', ''],
  ['scrum', '09-18 20:05', '09-22 N, 09-24 N, 09-28 N, 10-06 N'],
  ['scrum', '09-17 21:20', '09-19 Q, 09-21 N, 09-24 N, 10-01 N, 10-11 Q, 10-12 N, 10-17 N'],
  ['scrum', '09-17 21:22', '09-19 N, 09-23 N, 09-28 N, 10-06 N, 10-22 Q'],
  ['kanban', '09-19 20:03', '09-20 Q, 09-22 N, 09-24 N, 09-28 N, 10-06 N, 10-22 N'],
  [
    'kanban',
    '09-18 20:48',
    '09-19 N, 09-21 N, 09-25 N, 10-03 Q, 10-05 N, 10-09 N, 10-13 N, 10-21 Q, 10-22 N',
  ],
  ['agile', '09-18 21:23', '09-19 N, 09-22 N, 09-26 N, 10-04 N, 10-20 Q, 10-22 Q'],
  ['ci-cd', '09-20 09:53', '09-21 Q, 09-25 N, 09-28 N, 10-02 N, 10-12 N'],
  ['waterfall', '09-21 20:03', '09-24 N, 09-26 N, 10-01 N, 10-10 Q, 10-11 N, 10-14 N, 10-18 N'],
  [
    'iterative-approach',
    '09-22 20:03',
    '09-24 N, 09-28 N, 10-05 N, 10-13 Q, 10-14 N, 10-16 N, 10-20 Q, 10-21 N',
  ],
  [
    'incremental-approach',
    '09-22 20:48',
    '09-25 N, 09-28 N, 10-04 N, 10-12 Q, 10-13 N, 10-15 N, 10-19 N',
  ],
  ['code-review', '09-23 20:33', '09-27 N, 10-02 N, 10-09 N, 10-17 Q, 10-19 N, 10-21 N'],
  ['code-review', '09-23 20:35', '09-26 N, 09-28 N, 10-02 Q, 10-05 N, 10-07 N, 10-14 N, 10-22 Q'],
  [
    'branching-strategy',
    '09-24 21:13',
    '09-26 N, 09-29 N, 10-03 N, 10-11 Q, 10-12 N, 10-15 N, 10-19 N',
  ],
  ['tech-debt', '09-27 15:03', '09-30 N, 10-02 N, 10-06 N, 10-14 Q, 10-15 N, 10-20 N'],
  ['tech-debt', '09-26 15:03', '09-29 N, 10-04 N, 10-11 N, 10-19 Q, 10-20 N, 10-22 N'],
  ['lean-principles', '09-28 20:03', '09-29 N, 10-01 N, 10-07 N, 10-15 N'],
  ['v-model', '09-28 21:13', '09-29 N, 10-01 N, 10-05 N, 10-13 Q, 10-15 N, 10-18 N, 10-22 Q'],
  ['poc', '09-30 19:33', '10-02 N, 10-04 N, 10-08 N, 10-17 Q, 10-19 N, 10-21 N'],
  ['poc', '09-30 19:35', '10-02 N, 10-04 N, 10-08 N, 10-17 Q, 10-19 N, 10-21 N'],
  ['mvp', '09-30 20:18', '10-02 N, 10-05 Q, 10-06 N, 10-10 N, 10-14 N, 10-22 Q'],
  ['test-strategy-test-plan', '10-01 20:03', '10-03 N, 10-06 N, 10-10 N, 10-18 N'],
  ['confluence', '10-01 21:23', '10-02 N, 10-07 N, 10-12 N, 10-21 Q, 10-22 N'],
  ['definition-of-done', '10-03 15:03', '10-04 N, 10-07 N, 10-11 N, 10-19 Q'],
  ['definition-of-done', '10-04 15:03', '10-05 N, 10-07 N, 10-11 N, 10-21 Q'],
  ['definition-of-done', '10-04 15:05', '10-05 N, 10-09 N, 10-14 N'],
  ['definition-of-done', '10-04 15:07', '10-05 N, 10-07 N, 10-13 N, 10-21 Q, 10-22 N'],
  ['definition-of-ready', '10-05 20:03', '10-06 N, 10-08 N, 10-12 N, 10-20 N'],
  ['functional-requirements', '10-05 21:13', '10-06 N, 10-08 N, 10-14 N, 10-22 Q'],
  ['functional-requirements', '10-05 21:15', '10-07 N, 10-09 N, 10-13 N, 10-22 Q'],
  ['non-functional-requirements', '10-06 20:33', '10-07 N, 10-11 N, 10-16 N'],
  ['moscow', '10-07 20:03', '10-10 N, 10-12 N, 10-17 Q, 10-18 N'],
  ['moscow', '10-21 19:34', ''],
  ['moscow', '10-21 19:36', ''],
  ['moscow', '10-07 20:05', '10-08 N, 10-10 N, 10-14 N'],
  ['moscow', '10-07 20:07', '10-09 N, 10-11 N, 10-17 Q, 10-21 N'],
  ['t-shirt-sizing', '10-07 21:13', '10-10 N, 10-13 N, 10-18 N'],
  ['story-points-estimation-planning-poker', '10-08 20:53', '10-12 N, 10-14 N, 10-18 Q, 10-21 N'],
  ['burndown-burnup-charts', '10-10 14:33', '10-14 N, 10-16 N, 10-22 Q'],
  ['project-sponsor', '10-11 15:03', '10-12 N, 10-16 N, 10-22 Q'],
  ['initiation', '10-12 20:03', '10-13 N, 10-17 N, 10-21 N'],
  ['planning', '10-13 20:03', '10-14 N, 10-16 N, 10-22 Q'],
  ['execution', '10-13 21:13', '10-14 N, 10-16 N, 10-20 N'],
  ['execution', '10-13 21:15', '10-16 N, 10-18 N, 10-22 Q'],
  ['meeting-notes', '10-14 21:03', '10-16 N, 10-18 N, 10-22 Q'],
  ['meeting-notes', '10-15 20:03', '10-16 N, 10-18 Q, 10-19 N, 10-21 N'],
  ['decision-log', '10-16 20:03', '10-17 N, 10-21 N'],
  ['decision-log', '10-16 20:05', '10-17 N, 10-19 N'],
  ['presales', '10-16 20:53', '10-18 N, 10-21 N'],
  ['presales', '10-16 20:55', '10-18 N, 10-20 Q, 10-21 N'],
  ['change-control-board-ccb', '10-19 19:18', '10-20 N, 10-22 Q'],
  ['change-control-board-ccb', '10-18 20:03', '10-19 N, 10-22 N'],
  ['change-control-board-ccb', '10-18 20:05', '10-19 N, 10-22 Q'],
  ['change-request-cr', '10-18 20:13', '10-19 N, 10-22 Q'],
  ['change-request-cr', '10-18 20:15', '10-19 Q, 10-20 N, 10-22 N'],
  ['change-request-cr', '10-20 20:08', '10-21 N'],
  ['dedicated-team', '10-21 19:48', '10-22 N'],
  ['dedicated-team', '10-21 19:50', '10-22 N'],
  ['dedicated-team', '10-21 19:52', '10-22 N'],
  ['staff-augmentation', '10-21 21:10', '10-22 N'],
  ['staff-augmentation', '10-21 21:12', '10-22 N'],
  ['staff-augmentation', '10-21 21:14', '10-22 N'],
  ['jira', '10-21 21:33', '10-22 N'],
  ['jira', '10-21 21:35', '10-22 N'],
  ['jira', '10-21 21:37', '10-22 N'],
  ['qualitative-risk-assessment', '10-20 21:28', '10-22 Q'],
  ['qualitative-risk-assessment', '10-20 21:29', '10-22 Q'],
  ['schedule-creation-milestones-phases-critical-path', '10-19 20:13', '10-20 N, 10-22 N'],
  ['schedule-creation-milestones-phases-critical-path', '10-19 20:14', '10-20 N, 10-22 N'],
  ['scope-creep', '10-18 20:45', '10-22 N'],
  ['scope-creep', '10-22 21:10', ''],
  ['scope-creep', '10-22 21:12', ''],
  ['power-interest-grid', '10-22 20:43', ''],
  ['power-interest-grid', '10-22 20:45', ''],
  ['power-interest-grid', '10-22 20:47', ''],
  ['power-interest-grid', '10-22 20:49', ''],
  ['power-interest-grid', '10-22 20:51', ''],
  ['power-interest-grid', '10-22 20:53', ''],
  ['power-interest-grid', '10-22 20:55', ''],
  ['power-interest-grid', '10-22 20:57', ''],
]

/** Số liệu đích (§7, F03, F11, F15, F31, F32) mà seed phải ra — test đối chiếu. */
export const DICH_HOC = {
  soThe: 85,
  hop: [34, 21, 15, 9, 6],
  denHan: 12,
  tiLeNho30Ngay: 81,
  canOnLai: ['scrum', 'moscow', 'definition-of-done'],
  thucHanhXong: 7,
  phutTuanNay: 4 * 60 + 35,
  phutTong: 38 * 60 + 10,
  streak: 5,
  kyLuc: 12,
  phutScopeCreep: 35,
  phutRiskRegister: 65,
  dongHoGiay: 24 * 60 + 17,
  soGhiChu: 6,
} as const
