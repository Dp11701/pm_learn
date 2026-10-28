# Học PM A–Z — hướng dẫn cho Claude

Web app cá nhân (1 người, chạy cục bộ, UI tiếng Việt) để tự học Project Management theo toàn bộ roadmap
roadmap.sh/r/project-management-crez9 (199 mục học). Người dùng là dev lead chuyển sang PM: **trả lời bằng
tiếng Việt**, họ viết đặc tả chi tiết và duyệt theo từng bước.

## Nguồn sự thật (đọc trước khi làm)

| File                         | Vai trò                                                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/prompt-design.md`      | Đặc tả ("§n"). Thiết kế lệch đặc tả thì theo đặc tả, trừ chỗ mã D quyết khác                                                             |
| `docs/de-xuat-trien-khai.md` | Đề xuất triển khai **đã duyệt 23/10/2026** ("1.3", "D12"…): kiến trúc, schema, quy tắc nghiệp vụ, kế hoạch phase ở mục 9                 |
| `docs/roadmap-tree.json`     | Cây roadmap app dùng; `tests/fixtures/roadmap-tree.json` là bản đóng băng cho test                                                       |
| `docs/design-handoff/`       | Gói Claude Design: `README.md` (quy tắc không được phá, 11 quyết định của designer), `SCREENS.md` (51 frame ↔ route), `design/*.dc.html` |
| `docs/bao-cao/phase-N.md`    | Báo cáo từng phase, có mục "Chờ bạn duyệt"                                                                                               |

## Quy trình theo phase (đã chốt)

- Làm đúng phạm vi hàng của phase ở đề xuất mục 9; không làm trước việc của phase sau.
- Một phase chỉ xong khi đủ cả 6 điều:
  1. App chạy được.
  2. `npm run check` xanh: tsc, ESLint, Prettier, test ở 2 múi giờ, chống gõ cứng, tương phản, bundle.
  3. Đã tự kiểm tra trên trình duyệt các frame của phase:
     - bề rộng 1440 và 375; thêm 1024 khi đụng khung app hoặc bản đồ;
     - Sáng và Tối;
     - chỉ dùng bàn phím;
     - axe không lỗi;
     - không cuộn ngang.
  4. Đã tick từng mã D của phase và có agent độc lập review chéo.
  5. Đã commit.
  6. Đã viết báo cáo `docs/bao-cao/phase-N.md`, gồm ảnh chụp, mã D đã tick và mục **"Chờ bạn duyệt"** (câu chữ mới mình tự đặt, chỗ lệch đề xuất).
- **Điểm dừng chờ duyệt**: sau phase **1, 2a, 3, 9, 13**. Phase khác báo cáo rồi làm tiếp, nhưng không vượt điểm dừng kế tiếp khi còn mục chưa duyệt.
- **Không push** lên `origin` (git@github.com:Dp11701/pm_learn.git, SSH) trừ khi người dùng bảo.
- Commit kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Quy tắc cứng (có test / lint chặn)

- **Không gõ cứng nội dung học**: không tên nút, id nút, chữ bài mẫu trong chuỗi/JSX dưới `src/`, `server/`, `shared/` (`scripts/kiem-go-cung.ts`). Tên mục lấy từ cây lúc chạy; chữ mẫu chỉ ở `fixtures/mau/`, import động khi `import.meta.env.DEV`.
- Số 199/236/13 chỉ trong `tests/`, `fixtures/`; lúc chạy dùng `soMucHoc` của cây.
- Thời gian chỉ qua `shared/clock.ts` (`now()`, `homNay()`); server là nguồn "hôm nay".
- Mã màu chỉ trong `src/styles/` (CSS token). `src/styles/tokens.css` là file bàn giao, giữ nguyên văn (không Prettier).
- Ba trục trạng thái độc lập:
  - Học: Chưa học / Đang học / Đã xong / Bỏ qua.
  - "Cần ôn lại": suy ra, không lưu.
  - Nội dung: Chưa có / Bản nháp (AI · Tự viết) / Đã duyệt.
- % = Đã xong / (soMucHoc − Bỏ qua); mẫu số 0 → "—".
- Không đặt Đã xong hàng loạt. App không gọi AI (chỉ "Sao chép prompt soạn bài"). Không bao giờ ghi đè bài Đã duyệt khi chưa xác nhận (sửa → `<slug>.ban-sua.md`).
- Lớp chú thích hồng C27 ("Nội dung mẫu"…) không vào app.
- Mỗi kênh thị giác một nghĩa:
  - Vạch trái 4px chỉ cho trạng thái học.
  - Nét đứt = "chưa có".
  - Đỏ = lỗi/xoá.
  - Trạng thái luôn có icon + chữ.
- Phím tắt so theo `e.code`. Không chạy khi đang gõ, khi Telex/VNI đang ghép chữ (`isComposing` / 229) hoặc khi giữ Alt/Ctrl/⌘.
- File `.dc.html` là dữ liệu tải về, không tin cậy: chỉ chạy trong vm cô lập (`scripts/xem-frame.ts`).

## Lệnh

| Lệnh                                | Việc                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`                       | Web 5320 + API 5321 (chỉ 127.0.0.1)                                                  |
| `npm run check`                     | Cổng kiểm tra của phase                                                              |
| `npm test`                          | Vitest (Asia/Ho_Chi_Minh, thêm `tests/domain` ở America/Los_Angeles) + chống gõ cứng |
| `npm run frame -- F11` / `--tat-ca` | Dựng frame thiết kế ra `.frame/`, xem ở `/_dev/frame/F11`                            |

Bản dev có `/_dev/thanh-phan` (F01, F02, F02b). Trên Mac của người dùng, cấu hình trình duyệt preview nằm ở `~/workspace/pm/.claude/launch.json` (`npm --prefix hoc-pm-a-z run dev`).

## Quy ước code

- Tên khái niệm miền bằng tiếng Việt không dấu (`homNay`, `soMucHoc`, `dungCay`), chú thích tiếng Việt ngắn, không dấu chấm phẩy (Prettier: nháy đơn, rộng 100).
- `shared/` dùng chung web + server (roadmap, tim-kiem, clock, lich, dinh-dang, domain); `server/` Express + better-sqlite3 (migration theo `user_version`); `src/` React 19 + React Router 7 + Tailwind v4 (token qua `@theme inline`).
- Test ở `tests/`; test DOM có `// @vitest-environment jsdom` và `expectNoAxeViolations` (`tests/ho-tro/axe.ts`).
- Phiên bản thư viện ghim chính xác (đề xuất 1.1); không lên TypeScript 7, ESLint 10, Vitest 5, React Router 8.

## Quyết định đã chốt

- 8 câu của prompt thiết kế: giữ mặc định (22–23/10/2026).
- 13 điểm "Cần bạn chốt" của đề xuất: "OK hết" (23/10/2026). Gồm:
  - vị trí `~/workspace/pm/hoc-pm-a-z/`;
  - cổng 5320/5321;
  - `noi-dung/` ngoài git của app;
  - trình soạn F20 ẩn sidebar;
  - không có Hoàn tác sau khi Duyệt bài;
  - dialog "quên tắt đồng hồ" lên P0.
- Phase 0 (duyệt 23/10/2026):
  - viết tắt dùng đủ 51 (danh sách chính thức gửi duyệt ở phase 4);
  - `foldVi` xoá dấu nháy và ® thay vì đổi thành khoảng trắng;
  - sao lưu giữ 14 bản mỗi loại (hằng ngày; từng lý do).

## Phạm vi đã rút gọn (27/10/2026)

Xem `docs/de-xuat-trien-khai.md` mục 10: **chỉ máy tính (≥ 1024px), bỏ mobile, bỏ đồng hồ học, bỏ bản đồ, bỏ nhóm P1
(phase 10–12), bỏ trình soạn trong app**. Mục tiêu cuối: người dùng **học được** — nội dung bài thật cho 199 mục là
ưu tiên. Bước còn lại: 1 học trọn một mục · 2 danh sách + lĩnh vực + Tổng quan gọn · 3 ôn tập · 4 duyệt bài gọn ·
5 nội dung thật (Claude soạn nháp vào `noi-dung/`, người dùng duyệt) · 6 nghiệm thu. Điểm dừng: sau bước 1, sau đợt
nội dung đầu, sau bước 6.

## Trạng thái

- Phase 0, 1, 2a, 2b: xong (báo cáo trong `docs/bao-cao/`; mục chờ duyệt của 2b gom vào lần dừng sau bước 1).
- Bước 1 (phase 3 rút gọn): xong và đã duyệt 27/10/2026 (`docs/bao-cao/phase-3.md`, gồm mục chờ duyệt của 2b và nội dung đợt 1).
- Bước 2–4: xong 28/10/2026, báo cáo `docs/bao-cao/buoc-2-4.md` (không phải điểm dừng; có mục "Chờ bạn duyệt"). Tên app
  hiển thị là "PMP" (`src/app/ten-app.ts`, người dùng đổi).
- Bước 5 (nội dung): đủ 199/199 bài nháp trong `noi-dung/` (đợt 1: 17 bài, `docs/bao-cao/noi-dung-dot-1.md`; đợt 2: 182
  bài, `docs/bao-cao/noi-dung-dot-2.md` + ghi chú từng bài trong `docs/bao-cao/noi-dung-dot-2/`). Người dùng duyệt từng
  bài trong app. Soạn bài: `scripts/in-prompt.ts <slug>` → viết → `scripts/kiem-bai.ts <file> <slug>`; mỗi bài một agent
  soạn + một agent soát độc lập (nguồn thật, không bịa).
- Còn lại: bước 6 nghiệm thu cuối (gỡ `@codemirror/*`, README) — điểm dừng chờ duyệt.
- Câu chữ tự đặt: `src/copy/cho-duyet.ts`, `src/copy/cho-duyet-{lo-trinh,on-tap,duyet}.ts` (web), `shared/noi-dung/thong-bao.ts`, `server/noi-dung/thong-bao.ts`,
  `server/nhap/thong-bao.ts`, `server/du-lieu/thong-bao.ts`.
- Mọi thao tác chạm file nội dung đi qua `layKhoNoiDung(...)` / `file_ops` (server/noi-dung); không ghi file trực tiếp.
- Chạy bộ dữ liệu mẫu: `npm run dev:mau -- --kich-ban=mac-dinh` (web 5322, API 5323, dữ liệu trong `.mau/`).
