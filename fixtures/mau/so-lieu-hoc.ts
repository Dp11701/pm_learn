// Số liệu phase 3 của bộ dữ liệu mẫu (§7, đề xuất mục 7): dự án, bài thực hành, Nói lại, tự kiểm tra, ghi chú,
// flashcard + lịch sử ôn. Chỉ dùng cho `npm run dev:mau` và test; app thật không bao giờ nạp file này. Mốc giờ viết
// theo giờ Việt Nam như so-lieu.ts; chữ đều là câu giữ chỗ (§13 quy tắc 6). Phạm vi rút gọn 27/10/2026 bỏ đồng hồ
// học / giờ học: không còn phiên giờ, đồng hồ đang chạy (số §7 "giờ học", F03 "00:24:17" không dựng nữa).

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

/** Số liệu đích (§7, F11, F31) mà seed phải ra — test đối chiếu. */
export const DICH_HOC = {
  soThe: 85,
  hop: [34, 21, 15, 9, 6],
  denHan: 12,
  tiLeNho30Ngay: 81,
  canOnLai: ['scrum', 'moscow', 'definition-of-done'],
  thucHanhXong: 7,
  soGhiChu: 6,
} as const
