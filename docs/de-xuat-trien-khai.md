# Đề xuất triển khai — Học PM A–Z (web tự học Project Management theo roadmap.sh)

Trạng thái: **đã duyệt 23/10/2026** ("OK hết" 13 điểm ở mục 8). Phase 0–2b xong; phạm vi rút gọn 27/10/2026 (mục 10); bước 1 xong, chờ duyệt. Đã qua 2 vòng phản biện độc lập (độ phủ đặc tả + thiết kế; kỹ thuật) và đã sửa theo cả hai.

## Tóm tắt để duyệt

- **Ở đâu, cổng**: `~/workspace/pm/hoc-pm-a-z/` (package và git riêng, không đụng app 24 tuần); web 5320, API 5321, chỉ nghe `127.0.0.1`; bộ dữ liệu mẫu chạy riêng ở 5322/5323.
- **Stack** như app 24 tuần: Vite + React 19 + TypeScript + Tailwind v4, React Router 7, Express 5 + better-sqlite3 13, Vitest, ESLint + Prettier; thêm CodeMirror 6 (trình soạn), Radix (dialog, menu), `yaml`. Mọi phiên bản được ghim, đã cài thử sạch trên Node 25.9.
- **Dữ liệu chia 2 nơi**: bài học là file Markdown trong `noi-dung/`, trạng thái Bản nháp / Đã duyệt nằm trong frontmatter, bạn hoặc Claude sửa bằng editor nào cũng được. Dữ liệu học (trạng thái, 4 bước, giờ, flashcard, ghi chú, dự án…) nằm trong SQLite `data/hoc.db`, khoá theo id nút roadmap.sh. Mỗi ngày tự sao lưu cả hai.
- **Bốn quyết định kỹ thuật chính**:
  1. App không soạn, không duyệt nội dung học: bài do bạn viết, hoặc Claude soạn theo prompt app đưa rồi bạn duyệt; test chặn gõ cứng nội dung học vào code.
  2. Bản Đã duyệt không bị ghi đè: sửa sau khi duyệt thành `<slug>.ban-sua.md`; app giữ bản chụp mỗi lần duyệt; thao tác file có nhật ký nên tắt ngang không hỏng.
  3. Không gõ cứng cây: số 199 và id nút chỉ có trong test và một file cấu hình; thay `roadmap-tree.json` bản mới thì app tự chuyển file, không mất dữ liệu.
  4. Một nguồn "hôm nay" ở server; tuần ISO qua năm (2026 có tuần 53) có test ở 2 múi giờ.
- **Kế hoạch**: 17 phase (0 → 13; phase 2 và 7 tách nhỏ). Hết phase 9 (nghiệm thu P0) bạn dùng hằng ngày được: đặt trạng thái cả roadmap trên bản đồ hoặc danh sách, sao chép prompt để Claude soạn bài, nhập / Quét lại, soát và duyệt, học đủ 4 bước, bấm giờ, ghi chú, ôn flashcard, tìm kiếm, Tổng quan. Phase 10–12 là P1, 13 là nghiệm thu cuối. Mình dừng chờ bạn duyệt sau phase 1, 2a, 3, 9 và 13.
- **Cần bạn chốt**: 13 điểm ở mục 8. Trả lời "OK hết" là mình làm theo cột Mặc định.

## 0. Đầu vào & kiểm tra

### 0.1 Đầu vào và những gì đã kiểm tra

"§n" là mục của đặc tả, "1.4" là mục của đề xuất này. Nguồn sự thật: `docs/pm-roadmap/prompt-design.md` (thiết kế lệch thì theo đặc tả, trừ vài chỗ có lý do ở 0.2). Cây chuẩn: `roadmap-tree.json`. Gói `design-handoff/`: `tokens.css`, `SCREENS.md`, 51 frame `.dc.html` (thiếu `support.js`, chỉ đọc giá trị inline), `README.md` (theo cả 11 quyết định thiết kế; 7 câu hỏi mở ở 4.2). Cách làm như đề xuất app 24 tuần.

- **Cây**: 236 nút = 5 phần + 11 lĩnh vực + 21 nhóm + 184 chủ đề + 15 tài liệu → 199 mục học, khớp §3; 10 chứng chỉ có `kind: topic` nên mẫu Chứng chỉ chọn theo phần (1.3); 13 nút có `labelOriginal`.
- **Slug**: chỉ trùng `safe` → `safe-scaled-agile` (`a66yNuBIMbIdC2nLS6-8-`) và `safe-certifications` (`avvjiXod6h_oM8kfFSjvM`), đối chiếu thẳng trong file vì một bản tóm tắt frame ghi ngược; 10 tên chứa `'` `’` `®` `&`.
- **Số liệu §7 tự khớp** (đều thành test): 37/195 = 19%; Đã duyệt 41 = 30+3+5+3; lọc Đang học + Cần ôn lại = 9; dải vị trí Scope Creep 3/16, Risk Register 1/10, Salience Model 2/9, PMP 6/10; Trước của Risk Register là Wideband Delphi (Function Point Analysis Bỏ qua); 22/10/2026 là Thứ Năm `2026-W43`, bắt đầu 17/09/2026 (`W38`) → tuần học thứ 6; tới 15/06/2027 còn 236 ngày; 158 ÷ 6,25 → 177 ngày → 17/04/2027; tìm "risk" đúng thứ tự F25; Dice `risk-registr` → Risk Register 0,87, `risk-assessment` → Qualitative 0,700 / Quantitative 0,683.
- **Khác**: frame còn ~15 giá trị ngoài token (1.2); README ghi đặc tả ở `spec/…`, thực tế ở `docs/pm-roadmap/`; bản mới nhất ngày 23/10/2026 của TypeScript, ESLint, Vitest, jsdom, React Router đều không hợp (1.1).

### 0.2 Thiết kế lệch đặc tả → cách xử lý

Mỗi mã D gắn với phase ở cột "Sửa lệch" (mục 9); báo cáo phase tick từng mã.

| # | Lệch | Cách làm |
|---|---|---|
| D1 | Chip thiếu icon, "Đã duyệt" thiếu ngày (13 frame) | Một C4, một C8, luôn có icon; "Đã duyệt · dd/MM/yyyy"; cột chip 180px |
| D2 | Trạng thái chỉ có icon hoặc chỉ có chữ | Icon + chữ mọi nơi trừ nút bản đồ; C28 thêm chữ 13px |
| D3 | Ô loại ở C28 không icon, màu cứng | Ô màu + icon loại, màu token, chip C8 24px |
| D4 | C34 không ghim chân, không tô mục đang mở | Theo F11 |
| D5 | Giao diện chỉ 2 trạng thái | Sáng → Tối → Theo hệ thống (mặc định) |
| D6 | Top bar mobile mỗi frame một kiểu | Một MobileTopBar: menu trái, tiêu đề hoặc "‹ cấp cha", tìm, chip đồng hồ |
| D7 | Bài mobile thiếu thanh đáy, đảo khối (F13, F16, F35) | Luôn có thanh đáy; thứ tự theo mẫu; giữ "Đánh dấu Hoàn thành" |
| D8 | F17/F18 bỏ 4 bước, "Soạn (E)" | Giữ đủ đầu bài; Kiểm tra dùng biến thể "chưa có câu hỏi" |
| D9 | F14 ẩn "Xem trên bản đồ" | Giữ C12 + "Xem trên bản đồ"; vẫn ẩn segmented, 4 bước, dải vị trí, cột phải, chân bài |
| D10 | Breadcrumb 3 kiểu; chấm sai | Một C12; menu: mục dùng icon trạng thái, lĩnh vực/nhóm dùng phân số; chấm C13 là icon trạng thái 14px |
| D11 | F15 dùng bản rút gọn, in ghi chú thiết kế | Component của F11, có dòng nguồn; không in ghi chú |
| D12 | Nhãn pager 3 kiểu | "‹ Trước — sang lĩnh vực trước: {tên}" / "Tiếp — sang lĩnh vực mới: {tên} ›", dòng dưới là tên mục |
| D13 | Khối 7 có 3 tên | `## So sánh`, `## Thuật ngữ`, `## Thực hành công cụ` đều hợp lệ |
| D14 | Prompt F19 đòi `## Mục liên quan`, thiếu `id`/`loai` | Chỉ `lien_quan` (Cần chốt 5); prompt mới có khung frontmatter + quy ước `###` (1.5) |
| D15 | Mục lục F12 trỏ khối không hiện | Sinh từ khối thực sự hiện |
| D16 | Pill đang chọn 2 kiểu viền | Viền màu trạng thái (quyết định 2) |
| D17 | Cỡ control, H1 lệch thang | Nút/ô 36 (mobile 44), chip 24, chip lọc 28 (chạm 44 trên mobile), hàng bảng 44; H1 28/40 (mobile 24/34) mọi nơi, kể cả bản đồ và mặt thẻ; tiêu đề card 17/28, 13/20 |
| D18 | Focus hàng C9 lùi vào 3px | Vòng 2px cách mép 2px; hàng full-width lùi vào 2px để không bị cắt |
| D19 | Sọc Bỏ qua, thanh tiến độ, thanh nội dung mỗi nơi một kiểu | Một token `--st-skip-stripe` + một `<pattern>` SVG; thanh = Đã xong + Đang học + Bỏ qua (sọc, dồn phải); phần Chưa có nét đứt |
| D20 | Trống vẽ khung nét đứt; ô Ôn tập F05 không nút | C38 (icon 40, câu của frame, 1–2 nút); F05 thêm "Xem lộ trình" |
| D21 | "Hợp lệ" màu Đã xong; tên lĩnh vực tự viết tắt; mọi phần icon `briefcase` | Màu chữ thường + glyph; tên đầy đủ; icon phần §5.2 qua `cau-hinh-cay.json` |
| D22 | Mã màu ngoài token | Token mới (1.2); lint chặn hex |
| D23 | Toast 2 kiểu | Theo F26; 5 giây, hover/focus thì dừng đếm; mobile nằm trên thanh đáy |
| D24 | 404 dùng h2, ngoài khung app | H1, trong khung app, nút phụ |
| D25 | F21 ghi Nguồn "xem file", có phân trang; F10, F29 thiếu thanh lọc | Nguồn AI / Tự viết / —; thanh lọc chung có "Xoá bộ lọc" và "Đang hiển thị"; cuộn liền |
| D26 | Thanh phiên ôn khi trống; `aria-live` trên đồng hồ | Trống thì không có thanh; max = số thẻ phiên; đồng hồ chỉ báo lúc bắt đầu, dừng |
| D27 | F20 bỏ sidebar | Giữ như F20 (Cần chốt 10) |
| D28 | `?vung=` mở panel (SCREENS) hay zoom (§6.1) | Làm cả hai |
| D29 | P1: Streak là ô KPI, heatmap không bảng (F32); PMP thiếu khung bài, có "Duyệt khung" (F34b/F35); "Chưa chọn" (F34); gộp RFI/RFP/RFQ (F37); lời bình (F29); chú thích ngày bắt đầu khi chưa có (F05) | Streak là dòng chữ; heatmap có "Xem dạng bảng"; PMP trên khung F11, khối chưa có là ô "Chưa có"; không "Duyệt khung" (Cần chốt 4); không có bản ghi = "Không theo"; viết tắt theo `vietTat` (1.8); bỏ lời bình; F05 ẩn chú thích |
| D30 | Thẻ mục cuối nét đứt; banner lỗi F26 chưa có biến thể | Viền liền `border`; C26 thêm biến thể lỗi (`surface-2`, viền 1px và icon `alert-circle` màu `danger`) |
| D31 | Câu đồng hồ 2 kiểu (C34, C23) | Sidebar "Đang bấm giờ · {tên}"; card ở mục khác dùng câu F11 "Đồng hồ đang chạy cho {tên} (hh:mm:ss). Chỉ 1 đồng hồ chạy một lúc." |
| D32 | Bản đồ: thanh nhóm 3 cỡ, icon lệch, F07 không phóng to như §12, panel thiếu gợi ý phím | Thanh nhóm theo F06 (34, chữ 13, folder 16); nút lĩnh vực không icon layers; icon trạng thái trái, icon loại phải; F07 so ở khung F06, không mở panel; panel dùng C6 có gợi ý 1–4 |
| D33 | Chip chứng chỉ 3 kiểu; F37 gắn `lang=en` cho "Chưa điền", chữ cái trống tương phản ~2,6:1 | Chip màu Chủ đề + icon `award` + "Chứng chỉ"; "Chưa điền" không gắn lang; chữ cái trống là span `aria-disabled` màu `text-muted` |
| D34 | aria 4 bước mini 2 kiểu | "4 bước: Hiểu xong, Áp dụng đang làm, Kiểm tra chưa làm, Ghi nhớ xong" |
| D35 | Hero F31 viền mực; F26b lề 24; card F03 16/16 | Viền 1px `border`; lề mobile 16; card desktop padding 20, cách 24 |

Lớp chú thích hồng C27, câu `[Nội dung mẫu — …]` và "[vai trò của bạn]" **không vào app**.

## 1. Kiến trúc

### 1.1 Vị trí, stack, phiên bản, cổng

**Vị trí** (Cần chốt 1): `~/workspace/pm/hoc-pm-a-z/`, package và git riêng; khi dựng app 24 tuần ở gốc `pm/` thì bỏ qua thư mục này (`.gitignore`, ESLint, Vitest). Phase 0 chép `docs/pm-roadmap/` vào `hoc-pm-a-z/docs/` (sha256 ghi ở README); từ đó app dùng bản trong repo.

**Stack** như app 24 tuần (React Router dùng data router vì trình soạn cần `useBlocker`), thêm zod, TanStack Query (vai trò nhỏ), react-markdown + remark-gfm, `yaml` (lỗi có số dòng; ghi lại giữ khoá lạ), CodeMirror 6 (F20: số dòng, gạch sóng, "Đi tới dòng"; chỉ tải ở `/soan`), Radix (focus, Esc, phím chuẩn ARIA; không style), lucide-react, font tự host `@fontsource`, axe-core. Không dùng thư viện biểu đồ, thư viện ngày giờ, state manager, Playwright.

**Phiên bản ghim**: một lệnh `npm install --save-exact`, commit `package-lock.json`; bộ này đã chạy `npm install --dry-run` trên Node 25.9.0, không EBADENGINE, không ERESOLVE. `.nvmrc` 25.9.0; `engines.node` ">=22.12".
- Runtime: react, react-dom 19.3.1; react-router 7.18.4; express 5.3.0; better-sqlite3 13.0.3; zod 4.6.7; yaml 2.9.1; react-markdown 10.1.0; remark-gfm 4.0.1; @tanstack/react-query 5.104.5; radix-ui 1.8.1; lucide-react 1.61.0; @codemirror/view 6.43.15, state 6.7.6, commands 6.11.1, lang-markdown 6.5.2, lint 6.9.7; @fontsource/be-vietnam-pro, jetbrains-mono 5.3.0.
- Dev: vite 8.3.5; @vitejs/plugin-react 6.1.2; tailwindcss, @tailwindcss/vite 4.3.3; typescript 6.0.3; typescript-eslint 8.72.0; eslint 9.39.5; eslint-plugin-jsx-a11y 6.10.2; eslint-plugin-react-hooks 7.1.1; vitest 4.1.12; jsdom 29.1.1; axe-core 4.14.0; @testing-library/react 16.3.3, dom 10.4.2; tsx 4.23.15; concurrently 10.0.6; supertest 7.3.1, @types/supertest 7.2.1; prettier 3.9.10.
- Không lên TypeScript 7 (mất compiler API mà script chống gõ cứng cần), ESLint 10 (jsx-a11y chưa hỗ trợ), Vitest 5 / jsdom 30 (engines loại Node 25), React Router 8.

**Cổng, lệnh**: Vite 5320, API 5321 (chỉ `127.0.0.1`, `strictPort`, đổi qua biến môi trường); bộ mẫu 5322/5323. `npm run dev` = concurrently Vite + `tsx watch server`. `predev` không chặn app: kiểm better-sqlite3 nạp được (lỗi thì in hướng dẫn `rm -rf node_modules/better-sqlite3 && npm install`, kiểm `node -p process.arch` = arm64, không chạy Node x64 qua Rosetta); tạo `data/`, `noi-dung/` nếu chưa có.

### 1.2 Cây thư mục và token

```
hoc-pm-a-z/
├─ docs/            # bản chép spec + gói bàn giao + roadmap-tree.json
├─ shared/          # TS thuần dùng chung: roadmap/ (cây, cau-hinh-cay.json, slug, thứ tự), noi-dung/ (mau-bai.ts, parser,
│                   #   kiểm tra nhập, prompt), domain/, tim-kiem/ (foldVi, vietTat), ban-do/, clock.ts, schemas.ts
├─ server/          # Express: db/, noi-dung/ (quét, sổ, file_ops), routes/
├─ src/             # React: app/, pages/, components/ (C1–C38), copy/, styles/, dev/ (chỉ bản dev)
├─ scripts/         # xem-frame.ts (dev)
├─ tests/fixtures/  # cây đóng băng, .md đúng/lỗi, lô F22, file giữ chỗ cho nghiệm thu, cam-go-cung.txt
├─ fixtures/mau/    # bộ mẫu §7: seed, nội dung giữ chỗ, chữ mẫu cho gallery
├─ noi-dung/        # nội dung thật (.gitignore)
└─ data/            # hoc.db, backups/ (.gitignore)
```

**Token**: `tokens.css` là file bàn giao, chỉ bỏ `@import` Google Fonts. `tokens-them.css` thêm ~15 token Sáng/Tối cho giá trị frame đang dùng ngoài token (icon Đang học/Đã xong ở Tối #D8B4FE/#86EFAC, hover thanh nhóm, scrim, dialog, thanh nháp, heatmap 5 mức, nền dòng lỗi, trục, cỡ chữ mobile 24/34, 20/30, 16/26…); giá trị Tối frame không cho thì mình đề xuất, gửi ảnh duyệt. Bo góc chỉ 6/10/14 (§5.2): segmented C6 bo 6 cả khung lẫn đoạn, cao 36. Tailwind v4 `@theme inline` ánh xạ sang biến CSS; lint chặn hex ngoài `src/styles/`. Giao diện lưu `localStorage`; script trong `index.html` đặt `data-theme` trước khi React chạy; "Theo hệ thống" = không đặt.

### 1.3 Cây roadmap → dữ liệu app

- **Nạp**: `roadmap-tree.json` import lúc build vào server và web. `shared/roadmap` dựng danh sách phẳng mục học theo thứ tự cây (OPA … SAFe của Certifications), chỉ mục theo id/slug. Lúc chạy dùng `soMucHoc = cay.mucHoc.length`; **mọi chỗ ghi 199 trong đề xuất là `soMucHoc`**, các số 199/236/13 chỉ nằm trong test (bất biến 1).
- **Tên gốc**: mục có `labelOriginal` hiện dưới H1 (và trong panel C3) dòng 13/20 `text-muted` "Tên gốc trên roadmap: <tên gốc, lang=en>" (§3), vd. Steering Committee → "Steering Comittee".
- **Slug**: `đ`→`d`, NFD bỏ dấu, chữ thường, **xoá** `'` `’` `®`, chuỗi ngoài `[a-z0-9]` → `-`, gộp, cắt hai đầu (`power-interest-grid`, `wbs-wbs-dictionary`, `ci-cd`). Trùng thì gắn `-<slug cha trực tiếp>` cho **mọi** nút trong cụm trùng, vẫn trùng thì gắn tiếp cấp cha kế; cây hiện tại cho `safe-scaled-agile`, `safe-certifications`. Phần, lĩnh vực, nhóm cùng quy tắc.
- **Khoá**: dữ liệu người dùng khoá theo **id nút**; slug chỉ cho URL và tên file. File `noi-dung/<phần>/<lĩnh vực>/<slug>.md` (không thuộc lĩnh vực: `noi-dung/<phần>/<slug>.md`).
- **Cấu hình cây** `shared/roadmap/cau-hinh-cay.json`: `{ "iconPhan": { "<id phần>": "briefcase", … }, "phanChungChi": "<id>", "nhomProcessGroup": "<id>" }`; lúc nạp kiểm id tồn tại và đúng kind, sai → trang lỗi cây. Code TS không chứa id nút nào.
- **Thay file cây** (bản mới từ roadmap.sh; không có UI sửa cây, §13): server lưu sha256 cây ở `settings.cay_sha`; khác thì (1) sao lưu; (2) file có đường dẫn chuẩn đổi được chuyển qua `file_ops` (1.6), lưu `slug_cu(slug, item_id)` để link cũ và `lien_quan` cũ vẫn tra được; (3) mục bị bỏ thành mồ côi (bất biến 8); (4) banner một lần "Cây roadmap vừa cập nhật: +a mục, −b mục, c mục đổi tên".

### 1.4 Bản đồ (F06, F06b, F07)

- **Bố cục**: hàm thuần `layoutMap(cây, đoChữ)`, tất định, có test. Hằng số lấy nguyên từ F06; tên không vừa 2 dòng ở 200px thì nút rộng 240 (đo `measureText` sau khi font nạp). Theo thứ tự cây; mỗi phần là nhãn trên trục (frame chưa vẽ: nền `surface`, viền mực 1,5px, icon phần, phân số; gửi ảnh duyệt); mỗi lĩnh vực một cụm; phần không có lĩnh vực thì mỗi nhóm một cụm, 3 chủ đề lẻ của Business Acumen là cụm đứng trước, Certifications là cụm 2×5. Cụm luân phiên phải/trái, cụm sau bắt đầu dưới đáy cụm trước 24px (bản đồ cao ~7.500px ở 100%); trong cụm, mục trực tiếp trước rồi từng nhóm, cột trong trước; tiêu đề nhóm canh về phía trục (quyết định 5).
- **Hiển thị**: khung là vùng cuộn thật (`overflow: auto`), nội dung là một lớp dùng CSS `zoom` (không `transform`), nên bánh xe, phím, `scrollIntoView`, cuộn khi focus đều là cuộn gốc; kéo để cuộn chỉ đặt `scrollLeft/scrollTop`. Nút là `<button>`, trục và đường nối là SVG. Vòng focus `outline-width` và `outline-offset` = `calc(2px / var(--zoom))`, trên màn hình luôn 2px.
- **Zoom** 50/75/100/125/150%. "Vừa màn hình" = vừa **chiều ngang** (kẹp 50–100%), cuộn dọc giữ nút đang chọn trong khung. Ctrl/⌘ + lăn và pinch trackpad: listener `wheel` `{ passive: false }` + `preventDefault`, gộp delta thành 1 bậc mỗi 150ms, zoom quanh con trỏ. Bấm thanh nhóm = zoom vừa khung nhóm. Panel 380px cạnh khung nhìn; mở panel thì khung hẹp lại, căn lại nút.
- **URL**: `?muc=` căn giữa, chọn, mở panel; `?vung=` (D28); `?lop=do-phu`; zoom không vào URL. **Phím**: roving tabindex; ↑/↓ theo thứ tự đọc; ←/→ sang cột bên (nút lĩnh vực ↔ cột trong); Home/End; Enter/Space mở panel (thanh nhóm: zoom vừa khung); Esc đóng, trả focus; nút focus luôn cuộn vào khung; 1–4, `[` `]` khi panel mở.
- **Khác**: "Đi tới…" mở C28, chọn thì căn tới nút. "Chú giải" và nút thu gọn chung một trạng thái (`localStorage`). Dưới 1024px không có bản đồ: `?xem=ban-do` đổi sang `danh-sach`, giữ `muc`.

### 1.5 Markdown

```yaml
id: <id nút roadmap.sh>          # thiếu thì khớp theo tên file
loai: chu-de                     # chu-de | tai-lieu | chung-chi | tong-quan | lo-trinh
giai_nghia: <chuỗi>              # tuỳ chọn
trang_thai_noi_dung: ban-nhap    # ban-nhap | da-duyet
nguon: ai                        # ai | tu-viet; thiếu → cảnh báo, coi như ai
ngay_duyet: 2026-10-18           # bắt buộc khi da-duyet
lien_quan: [slug hoặc id, …]     # nguồn duy nhất của "Mục liên quan" (Cần chốt 5)
process_group: [slug hoặc id, …] # chỉ tai-lieu
kiem_tra_lan_cuoi: 2026-10-22    # chỉ chung-chi (P1)
```

- **Frontmatter**: zod, lỗi tiếng Việt có số dòng. Khoá lạ: cảnh báo, giữ nguyên khi ghi lại. `lien_quan`/`process_group` tra lần lượt slug hiện tại → `slug_cu` → slug tên gốc → id; không tra được thì trình soạn cảnh báo "Liên quan: không tìm thấy <x>" và bỏ qua giá trị đó, không lỗi trang.
- **Khối**: mở bằng `##`, so tiêu đề sau chuẩn hoá (NFC, gộp khoảng trắng, không phân biệt hoa thường, `->` = `→`). Danh sách khối của 3 mẫu ở `mau-bai.ts` (cấu trúc §8, không phải nội dung học). `##` lạ hiện sau các khối mẫu + cảnh báo "Khối không có trong mẫu"; `##` trùng hiện cả hai + cảnh báo; chữ trước `##` đầu hiện ở đầu bài + cảnh báo; không bỏ sót chữ nào.
- **Khối do app tạo**: "Nói lại bằng lời của bạn" (sau khối 6 Chủ đề, khối 3 Tài liệu, khối 2 Chứng chỉ), "Bản của tôi", "Kế hoạch thi của tôi", "Mục liên quan". File có các khối này thì bỏ qua + cảnh báo. Khi đã có file, hai khối "…của tôi" tính đủ trong "Đủ khối".

**Quy ước trong khối** (ghi vào prompt; viết khác thì hiện Markdown thường + cảnh báo trong trình soạn):

| Khối | Viết trong file | Hiện thành |
|---|---|---|
| Góc dev lead → PM | `### Bạn đã quen`, `### Điều cần đổi` | callout 2 cột C19 |
| Thực hành trên dự án thật | `### Đề bài`, `### Đầu ra`, `### Tiêu chí tự kiểm` (task list) | C20 + chọn dự án, ô kết quả, Xong / Không áp dụng |
| Tự kiểm tra | mỗi câu `- H: … \| Đ: …` | mỗi câu một C21 |
| Khái niệm cốt lõi | `- **Thuật ngữ** — giải thích` | danh sách định nghĩa |
| Mẫu điền sẵn | bảng GFM đầu tiên | C17 + "Tải .md / .csv"; mobile: cột đầu dính, bóng đổ khi đã cuộn ngang (quyết định 9) |
| Checklist chất lượng | task list `- [ ]` | checkbox, tick lưu SQLite |
| Phủ roadmap (P1) | `### <tên domain>` + danh sách slug | domain + mục kèm trạng thái học |
| Thông tin kỳ thi (P1) | `- <Trường>: <giá trị>` | nhãn/giá trị; trống → "Chưa có thông tin" |

- **H/Đ**: dòng khớp `^\s*[-*]\s+H:\s*(.+?)\s+\|\s+Đ:\s*(.+)$` (nhận cả `D:`); dòng thụt ngay dưới nối vào đáp án; `|` trong câu viết `\|`; thiếu ` | Đ: ` → "Dòng N: câu hỏi thiếu ' | Đ: '". Khoá câu = hash(câu hỏi chuẩn hoá), thêm `#n` nếu trùng trong bài. Khi bài đổi, câu trả lời có khoá không còn được nối sang câu mới cùng mục nếu Dice ≥ 0,8 và hơn ứng viên thứ hai ≥ 0,15; không nối được thì giữ dưới tiêu đề thu gọn "Câu trả lời cho câu hỏi cũ (n)", không bao giờ xoá. Cùng quy tắc cho `doc_checklist` và tiêu chí tự kiểm.
- **Làm sạch**: không HTML thô (hiện thành chữ), không iframe, không script. Link chỉ `http(s)`, `mailto`, đường dẫn trong app; link ngoài mở tab mới `rel="noopener noreferrer"`. Ảnh chỉ khi nằm trong thư mục nội dung, đuôi `.png .jpg .jpeg .gif .webp .svg`, phục vụ qua API kèm `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox` và `nosniff`; ảnh ngoài thành link. "Tải .csv": ô bắt đầu bằng `=`, `+`, `-`, `@` hoặc tab được thêm tiền tố `'`.

### 1.6 File nội dung: ghi, đồng bộ, bảo vệ bản Đã duyệt

**Ghi file**
- Chỉ `.md`, UTF-8, NFC, LF. Đích do server tính từ id mục; client chỉ gửi basename để khớp, server kiểm `^[^/\\\0]{1,200}\.md$`, bỏ qua mọi đường dẫn tương đối. `realpath(thư mục cha)` phải nằm trong `realpath(NOI_DUNG_DIR)`; mọi thành phần kiểm bằng `lstat`, gặp symlink thì từ chối (trình quét cũng bỏ qua symlink).
- Ghi nguyên tử: file tạm `.<tên>.<pid>.<rand>.tmp` **cùng thư mục** → `fsync` file → `rename` → `fsync` thư mục. So tên file không phân biệt hoa thường (APFS); đổi tên chỉ khác hoa/thường thì qua tên tạm.
- Frontmatter ghi bằng `yaml.parseDocument` (giữ thứ tự khoá, chú thích, khoá lạ); thân bài sau `---` giữ nguyên từng byte; hash tính trên toàn file sau khi ghi. Mỗi lần ghi đè một `.md` đã có (kể cả "Lưu bản nháp"), bản cũ được chép vào thùng rác trước.
- **Nhật ký `file_ops`** cho mọi thao tác chạm file (lưu, duyệt, duyệt bản sửa, Giữ bản cũ, nhập, chuyển chỗ, thay cây): (1) 1 transaction ghi `file_ops` = `du-dinh` **cùng** mọi thay đổi SQLite; (2) làm từng bước file, mỗi bước idempotent (đích đã đúng hash thì bỏ qua); (3) đặt `xong`. Server khởi động thì chạy tiếp mọi `du-dinh`.
- **Thùng rác** `noi-dung/.thung-rac/<YYYYMMDD-HHmmss-SSS>/<đường dẫn tương đối gốc>`, không bao giờ ghi đè trong thùng rác.

**Đồng bộ**
- Không dùng `fs.watch` (macOS ngừng báo sau khi file bị thay bằng rename); sổ nội dung là bảng `content_files`.
- **Quét nhẹ** khi server khởi động và mỗi lần `/api/meta` (5 giây/lần, và khi tab focus lại): `readdir` thư mục gốc và thư mục của mọi phần, lĩnh vực (17 với cây hiện tại), `stat` các `.md`, không đệ quy sâu hơn; mtime/size đổi mới đọc hash; có đổi thì tăng `contentRevision`.
- **Quét lại** (nút): chỉ `.md`; bỏ file/thư mục bắt đầu bằng `.` hoặc `~`; tối đa 3 cấp, 2.000 file, vượt thì báo lỗi và dừng. Thư mục nội dung đặt qua biến môi trường hoặc Cài đặt phải trống hoặc chỉ chứa `.md` theo cấu trúc §4.
- **File chưa nhận** (mới chép, Claude ghi thẳng, đặt sai chỗ) không hiện trong bài tới khi Quét lại (§4, đường 3); tab Nhập hiện "Có n file chưa nhận — Quét lại" (câu mới). Quét lại **nhập thẳng** file Hợp lệ và Thiếu khối bắt buộc vào Chờ duyệt, toast "Đã nhập n file" + Hoàn tác (đảo qua `file_ops`); chỉ dừng ở bảng kiểm tra (3.8) khi có Không khớp mục, Trùng bản đã duyệt, ◎ hoặc Lỗi frontmatter. Khi nhập: ép `ban-nhap`, thêm `id` nếu thiếu, chuyển về đúng đường dẫn, ghi ngày nhập. Bản nháp đã nhận bị sửa ngoài app: đọc thẳng bản mới.

**Bảo vệ bản Đã duyệt**
- Lúc duyệt, app chụp nội dung + hash vào `content_approvals`; file `da-duyet` chỉ được tin khi hash khớp bản chụp. Bị sửa/xoá ngoài app: bài hiện bản chụp + banner C26 "File đã đổi ngoài app — Quét lại để kiểm tra"; Quét lại xếp vào "⟳ Trùng bản đã duyệt": "Giữ bản cũ" (ghi lại bản chụp, bản ngoài vào thùng rác) hoặc "Nhập thành bản sửa" (thành `<slug>.ban-sua.md`).
- File `da-duyet` mà DB **không có bản chụp nào** cho mục (mất DB, khôi phục bản sao lưu cũ, chuyển máy chỉ mang `noi-dung/`, Claude tự ghi `da-duyet`): bài hiện là Bản nháp với banner "File ghi Đã duyệt nhưng app chưa xác nhận — Quét lại"; Quét lại xếp vào "◎ Đã duyệt nhưng app chưa có bản chụp", mặc định không chọn; tick + "Nhận là Đã duyệt" thì app chụp bản hiện tại, giữ `ngay_duyet` trong file.

| Sự kiện khác ngoài app | Quét nhẹ (tự động) | Sau Quét lại |
|---|---|---|
| Bản nháp đã nhận bị xoá | mục về Chưa có nội dung, dòng sổ đánh dấu "mất"; trạng thái học, ghi chú, giờ giữ nguyên | gỡ dòng sổ |
| File đã nhận bị đổi tên/chuyển chỗ (cùng hash) | như bị xoá (bài đã duyệt hiện bản chụp) + "Có n file chưa nhận" | nhận ra cùng hash → cập nhật sổ, đưa về đường dẫn chuẩn, không hỏi |
| Bản nháp sửa thành frontmatter lỗi | banner lỗi đọc file (F26), vẫn tính Bản nháp | như cột trước |
| `id` trong file thuộc mục khác hoặc không có trong cây | giữ nguyên, cảnh báo ở tab Nhập | "Không khớp mục": "id trong file thuộc mục X, file nằm ở chỗ của mục Y" |
| 2 file cùng id | file ở đường dẫn chuẩn thắng | file kia vào "Không khớp mục" |

### 1.7 Nhập file .md (F22)

1. Client đọc file kéo thả (thư mục qua `webkitGetAsEntry`). Chỉ `.md` (khác → C30 "Chỉ nhận file .md"); tối đa 256 KB/file, 250 file và 16 MB mỗi lần; `express.json({ limit: '16mb' })` chỉ ở `/api/nhap/*`, nơi khác 1 MB.
2. `POST /api/nhap/kiem-tra` (không ghi): parse, khớp, trả kết quả (3.8) + token lô.
3. Bạn "Gán cho mục…" (C28 trong C32), chọn cách xử lý file trùng.
4. `POST /api/nhap/thuc-hien` + token: kiểm lại, ghi qua `file_ops`, toast, chuyển sang Chờ duyệt.

**Khớp**: `id` có trong cây → theo id; `id` lạ → bỏ qua, khớp theo tên, ghi "id không có trong cây". Không `id` → tên file (bỏ `.md`, `.ban-sua`) so với slug và slug tên gốc (`steering-comittee.md` → Steering Committee). Không khớp → Dice bigram (foldVi) với slug và slug tên gốc mọi mục; chỉ **gán sẵn** khi cao nhất ≥ 0,7 **và** hơn ứng viên thứ hai ≥ 0,1; ngược lại "Gán cho mục…" hiện tối đa 3 ứng viên ≥ 0,6, không chọn sẵn, không đếm vào nút Nhập. File lỗi: "Mở trong trình soạn" lưu vào `editor_buffers` khoá `nhap:<token>:<i>`, không ghi ra đĩa; sửa xong thì kiểm lại.

### 1.8 Tìm kiếm (C28, F25)

- **`foldVi`**: `đ`→`d`, NFD bỏ dấu, chữ thường, ký tự không phải chữ/số thành khoảng trắng; giữ bảng vị trí để in đậm đúng đoạn khớp.
- **`vietTat(nhãn)`** (dùng chung cho tìm kiếm và F37): (1) chữ trong ngoặc cuối tên, nếu cũng thoả (2) (bỏ `®`); (2) tách tên theo khoảng trắng và " / " (có khoảng trắng hai bên; `CI/CD` giữ nguyên), lấy token có ≥ 2 chữ hoa và không có 2 chữ thường liền nhau. Trên cây hiện tại: bắt WBS, RICE, ICE, RACI, ADKAR, PnL, MoSCoW, PoC, CoQ, SAFe, LeSS, LLMs, MS, ERG, PRINCE, CAPEX, OPEX, EBIT, EBITDA, PMI-ACP; loại McKinsey, McGregor, McClelland’s, DevOps, GenAI, Top-Down, "crashing, fast tracking". Danh sách đóng băng trong test.
- **Chỉ mục trên web**: tên, tên gốc, viết tắt, giải nghĩa (mục có nội dung), tên phần/lĩnh vực/nhóm. **Thân bài, ghi chú**: `GET /api/tim?q=`, debounce 150ms; server giữ trong bộ nhớ thân bài bản đang hiện (đã duyệt, không có thì nháp) và ghi chú, đã `foldVi` kèm bảng vị trí, làm mới theo revision; không đọc đĩa, không FTS5, không tìm trong bản sửa chưa duyệt. Nhóm "Trong bài và ghi chú" mặc định thu gọn, "Xem thêm" tối đa 20 đoạn trích.
- **Xếp hạng** (§6.3): nguyên viết tắt/tên → đầu tên → giữa tên → tên gốc/giải nghĩa → thân bài/ghi chú; cùng bậc theo thứ tự cây; tối đa 8 kết quả cấu trúc, 30 mục học. Combobox + listbox `aria-activedescendant`, nhóm `role=group`; mặc định chọn Mục học đầu tiên. Enter: mục → `/hoc/:slug`, lĩnh vực → `/linh-vuc/:slug`, phần → `/phan/:slug` (trước phase 10 xem 3.9), nhóm → trang cha `#slug`. Mobile: sheet toàn màn hình.

### 1.9 Xuất/nhập tiến độ JSON (P1, F38b)

```json
{ "app": "hoc-pm-a-z", "schemaVersion": 1, "roadmap": "project-management-crez9",
  "exportedAt": "2026-10-23T09:00:00Z",
  "progress": { "<id nút>": "Learning | Done | Skip" },
  "skipReasons": { "<id nút>": "Không dùng trong công việc" } }
```

Khoá theo id nút, giá trị theo bảng F38b, Chưa học = không có khoá. Nhập: zod → xem trước "x mục đổi trạng thái · y mục về Chưa học · z id lạ (bỏ qua)" → xác nhận → tự sao lưu → thay toàn bộ trạng thái học trong 1 transaction, `via='nhap-json'`.

### 1.10 API, thời gian, an toàn

- **API**: `GET /api/meta` (revision, `now`, `homNay`), `GET /api/state` (ảnh chụp dữ liệu học), `GET /api/bai/:id` (bài đã parse + cảnh báo), API ghi theo thực thể. Số tổng hợp tính bằng `shared/domain` ở web; server kiểm lại bất biến 2, 5, 6.
- **Một nguồn thời gian**: `shared/clock.ts` có `now()`, `homNay()` (YYYY-MM-DD theo TZ của tiến trình server, cùng máy với trình duyệt). Server quyết định ngày lịch của mọi bản ghi (`due_on`, ngày phiên giờ, ngày bắt đầu, `ngay_duyet`, ngày sự kiện); client không gửi ngày, hiển thị `now` từ `/api/meta` cộng độ lệch đo được, hỏi lại mỗi 5 giây nên qua nửa đêm tự cập nhật. ESLint cấm `new Date()` không tham số và `Date.now()` ngoài `clock.ts`. Thời điểm lưu ISO UTC.
- **An toàn**: chỉ `127.0.0.1`; kiểm `Host` (DNS rebinding) và `Origin`; giới hạn body (1.7); nhập, đặt lại cần mã xác nhận trong body; mọi phản hồi có `X-Content-Type-Options: nosniff`.

## 2. Dữ liệu

### 2.1 Schema SQLite

Ngoài dữ liệu học, DB có các bảng chỉ để giữ bất biến (sổ nội dung, bản chụp, dấu Đã soát, bản tạm, nhật ký file). `localStorage` chỉ giữ giao diện, chú giải thu gọn, tab cột phải (không sao lưu). WAL, `foreign_keys = ON`, migration theo `PRAGMA user_version`; test dùng DB tạm.

```sql
settings(key PRIMARY KEY, value)  -- muc_tieu_gio_tuan=6, ngay_bat_dau, on_lai_khi_sai=0, thu_tu_truoc_tiep, da_thiet_lap, cay_sha, ngay_sao_luu
item_status(item_id PRIMARY KEY, status CHECK(status IN ('learning','done','skip')), skip_reason, updated_at)  -- không có hàng = Chưa học
status_events(id, item_id, from_status, to_status, at /* UTC */, on /* YYYY-MM-DD */,
              via CHECK(via IN ('mot-muc','hang-loat','hoan-tac','nhap-json','tu-danh-gia')))
item_visits(item_id PRIMARY KEY, last_opened_at)
restatements(item_id PRIMARY KEY, text, updated_at)                                   -- Hiểu
practice(item_id PRIMARY KEY, project_id, result_md, criteria, state CHECK(state IN ('dang-lam','xong','khong-ap-dung')),
         na_reason, done_at)                          -- Áp dụng; Tài liệu/Chứng chỉ chỉ dùng 'khong-ap-dung'
self_check(item_id, question_key, answer, revealed_at, grade CHECK(grade IN ('dung','mot-phan','sai')), graded_at)
projects(id, name NOT NULL, role, phase)
doc_versions(id, item_id, project_id, version_label, status CHECK(status IN ('dang-viet','hoan-thanh')), body_md)  -- Bản của tôi
doc_checklist(item_id, line_key, checked)
cert_plans(item_id PRIMARY KEY, pursuit CHECK(pursuit IN ('dang-can-nhac','dang-on','da-dang-ky','da-dat')), exam_date)  -- P1
notes(item_id PRIMARY KEY, body, updated_at)
flashcards(id, item_id, front NOT NULL, back NOT NULL, box CHECK(box BETWEEN 1 AND 5) DEFAULT 1, due_on, source_question_key)
flashcard_reviews(id, card_id REFERENCES flashcards ON DELETE CASCADE, reviewed_at, reviewed_on, result CHECK(result IN ('nho','quen')), from_box, to_box)
time_entries(id, item_id, date, seconds CHECK(seconds >= 60), started_at, ended_at)
active_timer(id PRIMARY KEY CHECK(id = 1), item_id, started_at)
content_files(path PRIMARY KEY, item_id, role CHECK(role IN ('bai','ban-sua','tong-quan','lo-trinh')), hash, size, mtime, imported_on, missing_since)
content_approvals(id, item_id, approved_on, hash, body, superseded_at)               -- bản chụp mỗi lần duyệt
review_marks(item_id, target CHECK(target IN ('bai','ban-sua')), block_key, block_hash, marked_at)
editor_buffers(key PRIMARY KEY /* đường dẫn | nhap:<token>:<i> */, item_id, text, base_hash, updated_at)
file_ops(id, op, steps /* JSON [{tu, den, hash_moi}] */, state CHECK(state IN ('du-dinh','xong')), created_at)
slug_cu(slug PRIMARY KEY, item_id)
self_assessment(row_id PRIMARY KEY, level CHECK(level IN ('chua-biet','biet-so','da-lam')), answered_on)  -- P1
```

Bảng ghi của người dùng có `created_at`, `updated_at`; khoá chính ghép: (item_id, question_key), (item_id, line_key), (item_id, target, block_key).

### 2.2 Bất biến (mỗi điều có test)

1. Cây nạp được; id, slug duy nhất; mỗi mục học có đúng 1 cha hợp lệ; nạp lỗi → trang "Không đọc được cây roadmap" + "Thử lại". 199/236/13 chỉ kiểm trong unit test trên bản đóng băng `tests/fixtures/roadmap-tree.json`; ESLint cấm literal 199, 236 ngoài `tests/`, `fixtures/`.
2. Chưa học = không có hàng; `status` 3 giá trị. Không màn hình chọn nhiều nào (Danh sách, Tự đánh giá) có Đã xong; API hàng loạt từ chối `done`. Ngoại lệ có chủ đích: nhập JSON tiến độ (khôi phục, có xem trước + xác nhận, `via='nhap-json'`) và Hoàn tác hàng loạt (trả từng mục về giá trị cũ).
3. Không lưu "Cần ôn lại"; luôn tính từ trạng thái học + thẻ đến hạn (+ cài đặt).
4. % = Đã xong / (soMucHoc − Bỏ qua); Bỏ qua không bao giờ vào tử số.
5. Chỉ 2 đường được ghi đè `<slug>.md` đang `da-duyet`: duyệt bản sửa; "Giữ bản cũ" (ghi lại chính bản chụp). Duyệt không có Hoàn tác (Cần chốt 13). Test API thử mọi đường ghi khác: phải ra `.ban-sua.md` hoặc bị từ chối.
6. Tối đa 1 đồng hồ; chuyển đồng hồ là 1 transaction.
7. Đã duyệt + Bản nháp + Chưa có nội dung = soMucHoc; file lỗi đọc tính là Bản nháp; bài đã duyệt mất file vẫn là Đã duyệt (hiện bản chụp).
8. Bản ghi mới phải có `item_id` trong cây. Bản ghi cũ có `item_id` không còn trong cây được giữ, không tính tiến độ; P0 hiện banner Tổng quan "n bản ghi thuộc mục không còn trong cây", P1 liệt kê ở Cài đặt.

### 2.3 Sao lưu, đặt lại

- **Tự động**: mỗi lần `/api/meta`, nếu `settings.ngay_sao_luu` < `homNay()` thì chạy `db.backup()` (không chặn request) và chép `noi-dung/` (bỏ `.thung-rac/`) sang `data/backups/noi-dung-<YYYY-MM-DD>/` (~6 MB); thêm một lần trước migration, nhập JSON, đặt lại, thay cây; giữ 14 bản mỗi loại. Có thể `git init` riêng `noi-dung/` (README hướng dẫn).
- **P1 ở Cài đặt** (Cần chốt 8): "Xuất JSON" (1.9); "Sao lưu toàn bộ" mọi bảng (đọc danh sách từ `sqlite_master`), nhập lại có kiểm tra.
- **Đặt lại (P1)** (Cần chốt 11): xoá đúng 4 nhóm câu F38b ghi: trạng thái học (+ lịch sử), giờ học, flashcard (+ lịch sử ôn), ghi chú. Giữ Nói lại, bài thực hành, câu tự kiểm tra, cài đặt, dự án, Bản của tôi, kế hoạch thi, tự đánh giá, `content_files`, `content_approvals`, dấu Đã soát, file nội dung. Gõ "đặt lại" (nhận "dat lai") để xác nhận; tự sao lưu trước.

## 3. Quy tắc nghiệp vụ

Chỉ ghi quyết định thêm vào đặc tả (§1, §6, §8); phần đặc tả đã nói rõ thì làm đúng như đặc tả.

### 3.1 Trạng thái học

Đổi trạng thái có hiệu lực ngay, toast + Hoàn tác 5 giây; lưu lỗi thì giữ trạng thái cũ, "Lỗi lưu — đã giữ trạng thái cũ. Thử lại". Lý do Bỏ qua tuỳ chọn, app gợi ý lý do đã dùng. Đã xong khi còn bước thiếu → F19, focus sẵn "Quay lại học tiếp" (quyết định 10). App không tự đổi trạng thái học. Mọi thay đổi ghi `status_events` ngay từ P0; Hoàn tác ghi sự kiện ngược.

### 3.2 Vòng 4 bước (Cần chốt 6)

| Bước | Xong khi | Câu ở F19 khi thiếu |
|---|---|---|
| Hiểu | ô "Nói lại bằng lời của bạn" có chữ | "Thiếu · chưa nói lại bằng lời" |
| Áp dụng | Chủ đề: "Xong" (ô Kết quả có chữ; dự án, tiêu chí không bắt buộc). Tài liệu: ≥ 1 Bản của tôi "Hoàn thành". Chứng chỉ: kế hoạch thi có ngày thi. **Mọi mẫu**: hoặc "Không áp dụng" kèm lý do (§1) | "Thiếu · đang làm bài thực hành" / "chưa làm bài thực hành" / "chưa có bản Hoàn thành" / "chưa có kế hoạch thi" |
| Kiểm tra | mọi câu trong khối Tự kiểm tra đã tự chấm ≥ 1 lần; không có câu → "Không áp dụng · chưa có câu hỏi", không tính thiếu | "Thiếu · chưa tự chấm câu nào" / "đã chấm x/y câu" |
| Ghi nhớ | ≥ 1 flashcard | "Thiếu · chưa có flashcard" |

Nút "Không áp dụng" của Tài liệu ở khối Bản của tôi, của Chứng chỉ ở khối Kế hoạch thi (trước phase 11 là ô C38 "Có ở phase 11" kèm nút này), nên chứng chỉ xong được bước Áp dụng ngay ở P0. x/4 đếm bước xong và Không áp dụng; "Tiếp: <bước>" là bước chưa xong đầu tiên; màu mực (quyết định 1). "Xem đáp án" chỉ bật khi ô trả lời có chữ; Đúng/Một phần/Sai bật sau khi xem, trung tính (quyết định 7); lưu lần chấm mới nhất.

### 3.3 Cần ôn lại, tiến độ, độ sâu

- **Cần ôn lại** bật khi mục Đã xong có ≥ 1 thẻ `due_on ≤ homNay()`, tắt khi các thẻ đó đã ôn. P1 (Cài đặt) thêm điều kiện "lần chấm mới nhất của câu tự kiểm tra là Sai", tắt khi chấm lại Đúng/Một phần.
- **%** làm tròn, không hiện 100% khi chưa đủ, mẫu số 0 → "—". Phân số phần/lĩnh vực/nhóm (Cần chốt 3) không phụ thuộc bộ lọc, thêm " · n bỏ qua" khi n > 0; dòng "x/y · Đang học a · Chưa học b" bỏ số 0.
- **Vòng C11** tỉ lệ trên 199, từ 12 giờ theo chiều kim đồng hồ Đã xong → Đang học → Bỏ qua (sọc) → nền; thanh cùng thứ tự, Bỏ qua dồn phải. Bài có bản sửa vẫn tính Đã duyệt.
- **Độ sâu** không tính bài thực hành Không áp dụng; chưa ôn → "Chưa có tỉ lệ nhớ". **Đủ khối** = khối ★ đúng tiêu đề, có chữ, không lỗi, chia 9/8/7; không có file → 0/n.
- **Badge sidebar**: Ôn tập = thẻ đến hạn (đặc); Nội dung = số Bản nháp ở bảng chính Chờ duyệt (viền, 3.7); 0 thì ẩn; > 99 → "99+".

### 3.4 Giờ học, đồng hồ, tuần, streak

- **Đồng hồ**: 1 cái. Bấm giờ mục B khi A đang chạy = "Chuyển sang mục này" (1 transaction, toast Hoàn tác). Phím T = nút chính của card. "Bắt đầu" ở sidebar: trang bài → mục đó, nơi khác → Học tiếp. Phiên < 1 phút bỏ; ngày ghi = ngày bắt đầu; chạy qua tắt/mở server (`started_at` đã lưu).
- **Quên tắt** (Cần chốt 12): Dừng hoặc Chuyển khi đã chạy > 3 giờ hoặc qua nửa đêm → C32 "Đồng hồ đã chạy 9 giờ 12 phút. Ghi bao nhiêu phút?" (ô số, mặc định và tối đa = thời lượng thật; "Ghi" / "Không ghi"). Card đồng hồ có "Lịch sử" 5 phiên gần nhất, mỗi phiên có Xoá + toast Hoàn tác.
- **Tuần**: ISO, thứ Hai – Chủ nhật; mọi khoá tuần dạng `YYYY-Www` theo năm ISO (`2026-W53`). Mục tiêu mặc định 6 giờ. Ngày bắt đầu = ngày có hoạt động học đầu tiên. "Tuần học thứ N" = (thứ Hai tuần hiện tại − thứ Hai tuần bắt đầu) / 7 + 1 trên ngày lịch; không trừ số tuần ISO, không dùng mili-giây.
- **Streak**: ngày liên tiếp có ≥ 1 phút học tới hôm nay (chưa học thì tới hôm qua), kèm kỷ lục. **Heatmap**: 12 tuần; mức 0, 1–29, 30–59, 60–119, ≥ 120 phút; ngày trước ngày bắt đầu là ô viền rỗng; "Xem dạng bảng".

### 3.5 Flashcard và phiên ôn

Thẻ là dữ liệu học (Cần chốt 5): "Tạo flashcard" từ câu Tự kiểm tra điền sẵn H/Đ, "Tạo thẻ" điền sẵn tên mục; sửa, xoá trong card của bài. **Leitner**: thẻ mới hộp 1, hạn ngày mai; Nhớ lên 1 hộp (tối đa 5), Quên về hộp 1; hạn = ngày ôn + 1/2/4/8/16 ngày theo hộp mới, cộng theo ngày lịch. **Phiên**: mọi thẻ đến hạn, xếp hạn → hộp → ngày tạo; lưu từng câu ngay; Esc/"Thoát phiên" không hỏi; "Ôn lại n thẻ đã quên" là vòng luyện thêm, không đổi hộp, không tính tỉ lệ nhớ. Hết thẻ: "Tạo thẻ" mở bài Đang học mở gần nhất ở `#flashcard`.

### 3.6 Trạng thái nội dung và trình soạn

| Từ | Sự kiện | Sang | File |
|---|---|---|---|
| Chưa có | "Lưu bản nháp" | Bản nháp · Tự viết | tạo `<slug>.md` |
| Chưa có / Bản nháp | Nhập, Quét lại (1.6) | Bản nháp (nguồn theo file) | ghi/thay `<slug>.md`, ép `ban-nhap` |
| Bản nháp | "Lưu bản nháp" | Bản nháp (giữ nguồn, đổi được ở form) | ghi `<slug>.md` |
| Bản nháp | soát đủ → "Duyệt bài" → xác nhận | Đã duyệt · hôm nay | `da-duyet` + `ngay_duyet`; chụp bản |
| Đã duyệt | "Lưu bản nháp", hoặc nhập trùng → "Nhập thành bản sửa" | Đã duyệt · có bản sửa | ghi `<slug>.ban-sua.md` |
| Đã duyệt có bản sửa | duyệt bản sửa | Đã duyệt · hôm nay | thay `<slug>.md`; bản chụp cũ đặt `superseded_at`; `.ban-sua.md` vào thùng rác |
| Đã duyệt có bản sửa | "Bỏ bản sửa" → xác nhận | Đã duyệt | `.ban-sua.md` vào thùng rác |
| bất kỳ | frontmatter lỗi | giữ trạng thái học, đồng hồ, ghi chú + banner lỗi đọc file (F26) | — |

- **Hiện ở bài**: luôn là bản đã duyệt, bản sửa chỉ khi "Mở bản sửa". Khối tuỳ chọn trống thì ẩn. Khối ★ thiếu → ô nét đứt "Chưa có <khối> — khối bắt buộc, bài vẫn đọc được." + "Thêm" (mở trình soạn ở đúng chỗ).
- **Trình soạn** (Cần chốt 7): tự lưu vào `editor_buffers`; chỉ ghi `.md` khi "Lưu bản nháp", gửi kèm `base_hash`. Hash file khác `base_hash` → không ghi, mở C32 "File đã đổi ngoài app từ lúc bạn mở trình soạn": "Xem bản trên đĩa" / "Ghi đè bằng bản của tôi" (bản trên đĩa vào thùng rác) / "Bỏ bản của tôi" (bản tạm vào thùng rác). Mở trình soạn khi bản tạm có `base_hash` khác file → banner "Bản tạm dựa trên phiên bản cũ của file" + 2 nút như trên. Rời trang khi bản tạm khác file → hộp thoại ở 4.3.
- **Lối vào**: "Nhập file .md" trên trang chưa có nội dung → `/noi-dung?tab=nhap&muc=<slug>` (file thả vào được gán sẵn mục đó). "Soạn bài đầu tiên" (F05) → `/hoc/<slug Học tiếp>/soan` (lần đầu: OPA).
- **Bản của tôi** (phase 7c): `/hoc/:slug/ban-cua-toi/:id`, CodeMirror như F20, không có form frontmatter, tự lưu vào `doc_versions`. "Tạo từ mẫu" tạo v0.1 · Đang viết (chép bảng Mẫu điền sẵn). "Lưu thành phiên bản mới" gợi ý nhãn tăng 0.1, sửa được. "Đánh dấu Hoàn thành" đảo lại được. Tải về `<slug>-<dự án>-<phiên bản>.md|.csv`.

### 3.7 Chế độ duyệt (F14) và tab Chờ duyệt

- `/hoc/:slug?che-do=duyet` (bản sửa thêm `&ban=sua`); vào từ banner "Vào chế độ duyệt", nút Duyệt ở Chờ duyệt, "Mở bản sửa".
- Mỗi khối có nội dung có công tắc "Đã soát" (trừ Mục liên quan, khối do app tạo), lưu theo hash khối nên tự mất khi khối đổi. Khối chưa soát viền 1,5px `border-input`, đã soát 1px `border`, không nét đứt (quyết định 8).
- "Duyệt bài" chỉ bật khi soát đủ ("Còn N khối chưa soát · đã soát x/y"); dialog "Duyệt bài này?" (4.3) ghi rõ khối ★ thiếu nhưng vẫn cho duyệt (như F12). Duyệt xong: `da-duyet`, `ngay_duyet`, chụp bản, xoá dấu soát, toast "Đã duyệt {tên}" **không có Hoàn tác** (Cần chốt 13).
- Banner bản nháp: AI "Bản nháp do AI soạn — chưa được bạn duyệt, có thể sai."; Tự viết "Bản nháp do bạn tự viết — chưa duyệt." (câu mới).
- **Tab Chờ duyệt**: bảng chính là các mục Bản nháp (đếm vào "(n)" và badge Nội dung); bên dưới 2 nhóm phụ "Bản sửa chờ duyệt (m)" và "Tổng quan nháp (k)", không đếm vào badge. Sắp theo ngày nhập mới nhất, cùng ngày theo thứ tự cây. Nút Duyệt của bản sửa mở `?che-do=duyet&ban=sua`. "Đủ khối", "Ngày nhập" tính từ file và sổ nội dung.

### 3.8 Nhập: kết quả kiểm tra

| Kết quả | Khi nào | Có được nhập? |
|---|---|---|
| ✓ Hợp lệ | khớp mục, frontmatter đọc được, đủ khối ★ | Có; mục có Bản nháp thì thay (bản cũ vào thùng rác) |
| ⚠ Thiếu khối bắt buộc | thiếu khối ★ ("Thiếu: Tự kiểm tra, Tham khảo · vẫn nhập được") | Có |
| ⚠ Không khớp mục | không khớp id hay tên; file thứ hai của cùng mục; các ca ở bảng cuối 1.6 | Có, khi đã gán sẵn (1.7) hoặc bạn "Gán cho mục…" |
| ⟳ Trùng bản đã duyệt | mục đang Đã duyệt | Chỉ khi chọn "Nhập thành bản sửa" (mặc định "Giữ bản cũ") |
| ◎ Đã duyệt nhưng app chưa có bản chụp | file `da-duyet`, DB không có bản chụp (1.6) | Chỉ khi tick + "Nhận là Đã duyệt" |
| ✕ Lỗi frontmatter | YAML hỏng; thiếu/sai `loai`; `loai` khác mẫu của mục | Không; "Mở trong trình soạn" (1.7) |

Mọi file nhập (trừ ◎ đã nhận) bị ép `ban-nhap`, cột Kết quả ghi "Đã chuyển về Bản nháp" nếu file ghi `da-duyet`. Tóm tắt "a hợp lệ · b cảnh báo · c trùng · d lỗi"; nút "Nhập n file" (lô F22: 11 + 2 = 13).

### 3.9 Điều hướng, bộ lọc, hàng loạt

- **Trước/Tiếp**: bỏ qua mục Bỏ qua, vẫn dừng ở mục chưa có nội dung; nhãn ranh giới ưu tiên phần > lĩnh vực > nhóm (D12); mục cuối "Đây là mục cuối cùng của roadmap" (D30). Theo Lộ trình gợi ý chỉ khi đã duyệt lộ trình (P1). **Dải vị trí** gồm mục cùng lĩnh vực (kể cả trong nhóm), không có lĩnh vực thì cùng phần. **Học tiếp** = mục Đang học mở gần nhất, không có thì mục Chưa học đầu tiên (lần đầu OPA). Sidebar "Đang học": 3 mục mở gần nhất + "Xem tất cả (n)".
- **Trước phase 10**, mọi link tới `/phan/:slug` (breadcrumb, Theo phần, pager, tìm kiếm) dẫn tới `/lo-trinh?xem=danh-sach&phan=<slug>`. **Lần đầu (F05)** khi chưa có trạng thái học, giờ, thẻ nào; banner tắt khi có dữ liệu học đầu tiên hoặc hoàn tất thiết lập.
- **URL lọc**: `xem` (ban-do, danh-sach); `trang-thai` (chua-hoc, dang-hoc, da-xong, bo-qua, can-on-lai); `loai` (chu-de, tai-lieu, chung-chi); `phan`, `linh-vuc`; `noi-dung` (chua-co, ban-nhap, da-duyet); `co-ghi-chu=1`; `sap-xep` (cay, a-z, mo-gan-day); `lop`, `muc`, `vung`. Trong một chip HOẶC, giữa các chip VÀ; dùng chung ở Lộ trình, Lĩnh vực, Phần, tab Độ phủ. Luôn có "Xoá bộ lọc" (disabled khi chưa lọc, quyết định 6) và "Đang hiển thị x/199 mục". Sắp A–Z/Mở gần đây: danh sách phẳng có breadcrumb nhỏ.
- **Hàng loạt**: checkbox hoặc Space; "Đặt trạng thái…" chỉ Chưa học/Đang học/Bỏ qua (bất biến 2); toast + Hoàn tác; đổi bộ lọc thì bỏ chọn mục bị ẩn.

### 3.10 P1: burnup, chứng chỉ, bộ hồ sơ, viết tắt, lộ trình gợi ý

- **Burnup (F32)**: mỗi tuần (`YYYY-Www`, theo cột `on` của `status_events`) lấy Đã xong cộng dồn và Phạm vi = 199 − Bỏ qua tại cuối tuần. Nhịp = (Đã xong hiện tại − Đã xong 4 tuần trước) / 4, ít hơn 4 tuần thì chia số tuần đang có; dưới 2 tuần → "Cần ít nhất 2 tuần dữ liệu"; nhịp 0 → không vẽ dự báo. Ngày dự kiến xong = hôm nay + ⌈(Phạm vi − Đã xong) / nhịp × 7⌉ ngày.
- **Chứng chỉ**: không có bản ghi Mức theo đuổi = "Không theo"; "còn N ngày" = số ngày lịch tới ngày thi; thiếu `kiem_tra_lan_cuoi` → "Kiểm tra lần cuối: chưa có".
- **Bộ hồ sơ**: ô Chưa tạo / Đang viết · vX / Hoàn thành · vX (bản Hoàn thành mới nhất, không có thì bản mới nhất); bấm ô mở `/hoc/:slug#ban-cua-toi`.
- **Viết tắt (F37)**: sinh bằng `vietTat` (1.8); mỗi viết tắt một dòng (CAPEX và OPEX là 2 dòng cùng trỏ về "CAPEX / OPEX"); trùng thì gộp 1 dòng trỏ về mục có cả tên là viết tắt đó, không có hoặc có nhiều mục như vậy (SAFe, MS, PRINCE) thì liệt kê mọi mục chứa nó. Tên đầy đủ lấy từ 14 mục dạng "Tên (VIẾT TẮT)", còn lại "Chưa điền". Danh sách gửi duyệt ở phase 4.
- **Lộ trình gợi ý**: `noi-dung/_lo-trinh-goi-y.md`, `loai: lo-trinh`, khối `## Chặng n` là danh sách slug. "Duyệt và áp dụng" ghi `da-duyet`, bật Trước/Tiếp theo lộ trình; "Không dùng" ẩn banner. Không có file: trang hiện C38, Tổng quan không có banner.

## 4. Màn hình ↔ frame ↔ route

### 4.1 Đủ 51 frame

Số thứ tự và tên file theo `SCREENS.md`; kịch bản bộ mẫu ở mục 7. Frame 1–39 là P0, 40–51 là P1.

| # | Frame | Route / vị trí | Phase |
|---|---|---|---|
| 1–2 | F01 Design system Sáng/Tối | `/_dev/thanh-phan` | 0 |
| 3–4 | F02 Component phần 1 Sáng/Tối | gallery + mọi trang | 1 |
| 5 | F11 Scope Creep | `/hoc/scope-creep` | 2a–3 |
| 6–8 | F03 Tổng quan; F05 Lần đầu (kịch bản `trong`); F04 375 | `/` | 5 |
| 9–11 | F06 Bản đồ; F06b Panel lĩnh vực; F07 Độ phủ Tối (khung F06, D32) | `/lo-trinh?xem=ban-do` + `&muc=scope-creep` / `&vung=scope-management` / `&lop=do-phu` | 6 |
| 12–13 | F08 Danh sách lọc 9 mục; F09 375 | `/lo-trinh?xem=danh-sach&trang-thai=dang-hoc,can-on-lai` | 4 |
| 14 | F10 Scope Management | `/linh-vuc/scope-management` | 4 |
| 15–17 | F27 Phím tắt Tối; F28 Drawer 375; C34 Sidebar | dialog `?`, khung app | 1 |
| 18 | F12 Có bản sửa, thiếu Tự kiểm tra | `/hoc/scope-creep` (kịch bản `f12`) | 7a |
| 19, 24 | F15 Risk Register; F16 375 | `/hoc/risk-register` | 7c |
| 20 | F14 EVM chế độ duyệt | `/hoc/earned-value-management?che-do=duyet` | 7a |
| 21, 25 | F17 Salience Model chưa có nội dung; F18 375 Tối | `/hoc/salience-model` | 2a |
| 22 | F19 Sao chép prompt / Đã xong khi thiếu bước | dialog trên `/hoc/:slug` | 2a, 3 |
| 23 | F13 Scope Creep 375 + sheet | `/hoc/scope-creep` | 3 |
| 26–27 | F02b Component phần 2 Sáng/Tối | gallery (C2, C3, C9, C12–C25 trừ C18, C28–C34, C37, C38) | 1 + mỗi phase |
| 28 | F20 Trình soạn | `/hoc/salience-model/soan` | 7b |
| 29–30 | F21 Độ phủ; F21b Chờ duyệt | `/noi-dung?tab=do-phu`, `?tab=cho-duyet` | 7a |
| 31 | F22 Nhập | `/noi-dung?tab=nhap` | 2b |
| 32–34 | F23 mặt sau; F23b cuối phiên / hết thẻ; F24 375 Tối | `/on-tap/phien` | 8 |
| 35–36 | F25 tìm "risk"; F25b "comittee", "safe", không kết quả | popover `/` | 4 |
| 37–38 | F26 Trạng thái hệ thống; F26b 404 375 | 404, lỗi, mất kết nối, skeleton, toast; lỗi đọc file (kịch bản `loi-file`) | 1; lỗi đọc file 2a |
| 39 | C28 Tìm kiếm | popover | 4 (tối giản từ 1) |
| 40 | F29 Phần Business Acumen | `/phan/business-acumen` | 10 |
| 41 | F30 Lộ trình gợi ý | `/lo-trinh-goi-y` | 12 |
| 42 | F31 Ôn tập | `/on-tap` | 8 |
| 43 | F32 Thống kê | `/thong-ke` | 11 |
| 44 | F33 Bộ hồ sơ | `/ho-so` | 11 |
| 45 | F34 Chứng chỉ | `/chung-chi` | 11 |
| 46–47 | F34b PMP; F35 375 | `/hoc/project-management-professional-pmp` | 11 |
| 48 | F36 Tự đánh giá | `/chao-mung` bước 5 | 12 |
| 49 | F37 Viết tắt | `/thuat-ngu?tab=viet-tat` | 12 |
| 50–51 | F38 Ghi chú; F38b Cài đặt | `/ghi-chu`, `/cai-dat` | 10 |

Route thêm: `/linh-vuc/:slug/soan`, `/phan/:slug/soan` (soạn `_tong-quan.md`), `/hoc/:slug/ban-cua-toi/:id`, `/_dev/*`. C18 "Bảng sửa được" là P2 (F02b ghi "C18 (P2)"), không dựng. Route chưa làm tới hiện C38 "Có ở phase n".

### 4.2 Bảy câu hỏi mở của designer (Cần chốt 3)

| # | Câu hỏi → mặc định |
|---|---|
| 1 | Phân số cho nhóm? → Có, như lĩnh vực; nhóm vẫn không có trạng thái học |
| 2 | Tên cấp cha dài trên top bar mobile → cắt 1 dòng + "…", tên đủ trong `aria-label`, `title` (giữ top bar 56px) |
| 3 | Màu bước liên quan trong dải process group → màu mực + chữ "liên quan"; bước tô khai báo bằng `process_group` |
| 4 | Tab Độ phủ phân trang hay cuộn liền → cuộn liền, đầu bảng và thanh lọc dính |
| 5 | Lọc trạng thái nội dung → tab Độ phủ: 4 chip có số + thanh lọc chung; nơi khác chip "Nội dung ▾" |
| 6 | 4 frame còn thiếu → dựng từ component có sẵn (4.3), ảnh vào "Chờ bạn duyệt" của phase |
| 7 | Đổi tên domain chứng chỉ → tên domain nằm trong file bài, sửa bài; không thêm UI |

### 4.3 Frame thiếu → dựng từ component có sẵn

| Thiếu | Dựng bằng | Phase |
|---|---|---|
| Rời trình soạn chưa lưu | C32 alertdialog "Rời trình soạn?" · "Thay đổi đã lưu tạm nhưng chưa ghi ra file .md." · Ở lại / Rời trang (giữ bản tạm) / Lưu bản nháp và rời | 7b |
| Xung đột `base_hash` | C32 theo 3.6 | 7b |
| Dialog Duyệt bài | C32 theo phác F02b: "Duyệt bài này?" + tên bài + "Sẽ thành Đã duyệt · dd/MM/yyyy"; Huỷ / Duyệt | 7a |
| Thiết lập lần đầu bước 1–4 | Khung F36: B1 câu §8.7 "Roadmap gốc chỉ có tên mục — bài học do bạn soạn hoặc duyệt."; B2 thư mục nội dung; B3 dự án (bỏ qua được); B4 mục tiêu giờ/tuần | 12 |
| Tab Thuật ngữ (giải nghĩa) | Bảng như F37, chỉ mục có `giai_nghia`, trống → C38 | 12 |
| Menu trạng thái 1 mục, menu chip lọc | Menu như F08 (thêm Đã xong; chip lọc có checkbox + số) | 4 |
| Lý do Bỏ qua, tạo/sửa thẻ, thêm dự án, quên tắt đồng hồ | C32 + C36 | 3 |
| Breadcrumb ▾ đang mở | Menu F02b C12 theo D10 | 2a |
| "Gán cho mục…" | C28 trong C32 | 2b |
| Panel bản đồ cho mục chưa có nội dung, tài liệu, chứng chỉ | C3 + C38 "Chưa có nội dung" + "Soạn bài" | 6 |
| Tab "Trong lĩnh vực"; sheet Ghi chú, Mục lục | Hàng C9 rút gọn; C32 sheet + C24 | 3 |
| Tìm kiếm mobile | Sheet toàn màn hình chứa C28 | 4 |
| Đặt lại, xem trước nhập JSON, sửa kế hoạch thi | C32 + C36 (Đặt lại nút danger) | 10–11 |

### 4.4 Bề rộng chưa có frame

**Khung app**: ≥ 1280 sidebar 264px; 1024–1279 rail 72px (icon nav có tooltip, `aria-label`, badge thu nhỏ; tìm; đồng hồ có chấm khi chạy; Giao diện; `?`); 768–1023 top bar mobile + drawer 312px; < 768 theo frame 375. **Trang bài**: ≥ 1440 cột đọc ≤ 720 + cột phải 320; 1280–1439 ≤ 640 + 280; < 1280 bỏ cột phải, đầu bài thêm Đồng hồ / Mục lục / Ghi chú mở panel trượt 360px, card Flashcard xuống cuối bài (giữ neo `#flashcard`).

## 5. Accessibility, phím tắt, IME, định dạng

Theo §11; quyết định riêng:
- Tên mục, thuật ngữ gắn `lang="en"` qua component `<TenMuc>`; chữ người dùng nhập không gắn. Focus ngoại lệ ở D18 và bản đồ (1.4); "Đang chọn" là viền 3px riêng, bù padding. Đổi route → focus H1, `document.title` = "{trang} · Học PM A–Z".
- Danh sách là `role=tree` (`aria-level`, `aria-expanded`, `aria-selected`, `aria-multiselectable`), là cách xem tương đương bản đồ. Dialog, sheet, drawer dùng Radix; F19 và xoá dùng `alertdialog`. `aria-live` chỉ cho tự lưu, toast, "Đang hiển thị x/199 mục", kết quả nhập.
- **Phím tắt**: một bộ xử lý toàn cục + một sổ phím dùng chung với F27. So theo `e.code` (Slash, BracketLeft/Right, Digit1–4, KeyT, KeyE, KeyM, Space) nên Telex không biến `[` thành `ơ`. Không chạy khi focus ở ô nhập/CodeMirror hoặc giữ Ctrl/⌘/Alt. ⌘K là P1.
- **IME (Telex/VNI)**: bộ xử lý toàn cục **và** mọi xử lý Enter/Esc/mũi tên trong ô nhập (C28, ô tìm ở 404, "Lọc theo tên mục…", dialog có ô nhập, form metadata trình soạn) bỏ qua sự kiện khi `e.nativeEvent.isComposing` hoặc `keyCode === 229`. Esc lúc đang ghép chữ chỉ huỷ ghép, không đóng dialog (chặn trong `onEscapeKeyDown` của Radix).
- **Ngày**: ô chữ `inputmode=numeric` dd/MM/yyyy có kiểm tra ("Ngày không hợp lệ. Nhập theo dd/MM/yyyy."), không dùng date picker của trình duyệt (theo locale máy). Số dùng `Intl.NumberFormat('vi-VN')`, `tabular-nums`.
- **Không trắng màn hình**: error boundary từng route và toàn app (F26); skeleton, lỗi theo từng card; mất kết nối → banner dính đầu trang, tự thử lại sau 5 giây, chữ đang gõ giữ trong `sessionStorage`; 404 có gợi ý mục gần nhất và ô tìm.

## 6. Kiểm thử & chất lượng

Mỗi bất biến (2.2), mỗi số ở 0.1 và mỗi ví dụ cụ thể trong đề xuất (slug, câu lỗi, câu F19, Dice, `vietTat`, tìm "risk"/"comittee"/"safe"/"kiểm thử tự động") là một test. Thêm:
- **Unit**: mọi số liệu mẫu ở §7 (vòng, thanh, nội dung theo phần, độ sâu, burnup) và ca burnup dưới 2 tuần; đúng 13 mục có dòng tên gốc, 186 mục không có; thay cây (thêm, bỏ, đổi tên → chuyển file, `slug_cu`, mồ côi); bản nguồn F20 cho 0/9 + lỗi dòng 25; ghi frontmatter giữ khoá lạ và thân bài từng byte; lô 15 file F22 → 11/2/1/1, "Nhập 13 file", `risk-assessment.md` không gán sẵn; bản đồ tất định, không 2 hộp chồng nhau, mỗi mục 1 lần, láng giềng bàn phím, snapshot kích thước tổng; snapshot `buildPrompt(Salience Model)` theo D14.
- **Qua năm**: 31/12/2026, 01/01/2027 → `2026-W53`; 04/01/2027 → `2027-W01`; bắt đầu 17/09/2026, hôm nay 05/01/2027 → tuần học thứ 17; heatmap gồm `2026-W43`…`W53` và `2027-W01`; burnup có cột `2026-W53`. Leitner: hộp 2 Nhớ ngày 30/12/2026 → hộp 3, hạn 03/01/2027; hộp 3 Nhớ 23:30 ngày 07/03/2027 ở Los Angeles (DST bắt đầu 14/03) → hộp 4, hạn 15/03/2027. `test:tz` = `TZ=Asia/Ho_Chi_Minh vitest run tests/domain && TZ=America/Los_Angeles vitest run tests/domain`; `npm test` gọi cả hai.
- **API** (supertest, DB và thư mục nội dung tạm): lưu với `base_hash` cũ → 409, file không đổi; `file_ops`: giết tiến trình sau từng bước, khởi động lại → như chạy một mạch; DB trống + 41 file `da-duyet` → 41 dòng ◎, xác nhận → 41 Đã duyệt, Đặt lại không đổi số Đã duyệt; các ca ở bảng cuối 1.6; path traversal, symlink, basename lạ, `Host`/`Origin` lạ; file `.md` chứa `<script>`, `<img onerror>`, `[x](javascript:alert(1))`, `![](../../data/hoc.db)`, `![](x.svg)` → không chạy script, không đọc file ngoài thư mục nội dung; P1: JSON, sao lưu round-trip, đặt lại giữ đúng danh sách 2.3.
- **Component** (Testing Library + jsdom): segmented + phím 1–4; F19 focus đúng nút; `role=tree`; tự lưu không đè ô đang focus. IME: compositionstart → gõ "vieetj" → Enter khi `isComposing` → không chọn kết quả, không gửi form, không đóng dialog. Helper `expectNoAxeViolations(container)` gọi `axe.run`, tắt rule `color-contrast` trong jsdom (không tính layout; tương phản đã có script token kiểm).
- **Chống gõ cứng nội dung học**: script dùng TypeScript compiler API quét mọi chuỗi, template literal, chữ JSX trong `src/` (kể cả `src/dev/`, không ngoại lệ), `server/`, `shared/`; chỉ trừ `tests/`, `fixtures/`. Báo lỗi khi chuỗi (a) bằng tên một nút 1 từ; (b) **chứa**, theo ranh giới từ, tên một nút ≥ 2 từ hoặc một tên gốc; (c) chứa câu trong `tests/fixtures/cam-go-cung.txt` (câu mẫu của frame và §7: "phình phạm vi", "Cổng đặt lịch nội bộ", "[Nội dung mẫu", "R-01"…); (d) chứa id nút. Chữ UI và tên khối của 3 mẫu được phép. Gallery và trang so frame lấy mọi chữ mẫu từ `fixtures/mau/` bằng import động, chỉ khi `import.meta.env.DEV`. Test build: bundle production không chứa `/_dev` và không chứa tên mẫu nào lấy từ `fixtures/mau`.
- **Lint, build**: `tsc --noEmit`; ESLint (typescript, react-hooks, jsx-a11y, cấm hex ngoài `src/styles/`, cấm literal 199/236, cấm `new Date()`/`Date.now()` ngoài `clock.ts`); `prettier --check` (bỏ `docs/`, `noi-dung/`, `data/`, nội dung mẫu).
- **Đối chiếu hình ảnh**: `/_dev/thanh-phan` dựng lại F01, F02, F02b bằng component thật. `npm run frame -- F11` dựng frame thành HTML tĩnh (`renderVals()` trong `node:vm`, xử lý `{{…}}`, `<sc-for>`, `<sc-if>`, `<dc-import>`), mở `/_dev/frame/F11` cạnh trang thật chạy bộ mẫu cùng bề rộng để chụp và so. Script làm tối đa nửa ngày ở phase 0; không kịp thì so theo số đo inline, ghi bảng kiểm trong báo cáo.

## 7. Dữ liệu mẫu

- **`npm run dev:mau -- --kich-ban=<tên>`**: `DATA_DIR=.mau/data`, `NOI_DUNG_DIR` là bản chép tạm của `fixtures/mau/noi-dung`, cổng 5322/5323, DB dựng lại từ `fixtures/mau/seed.ts` mỗi lần chạy. Đồng hồ ảo `GIO_MAU=2026-10-22T21:42:00+07:00`: `now()` = GIO_MAU + thời gian thực đã trôi từ lúc server khởi động.
- **Kịch bản**: `mac-dinh` (§7); `f12` (thêm `scope-creep.ban-sua.md`, bản sửa bỏ `## Tự kiểm tra`); `loi-file` (`change-log.md` hỏng ở dòng 3, chỉ để so F26); `trong` (DB và thư mục nội dung trống, so F05).
- **Seed `mac-dinh`**: đúng mọi số của §7 (trạng thái, thẻ, giờ, streak, lịch sử trạng thái cho burnup, lượt mở, PMP, dự án, 41 Đã duyệt kèm bản chụp + 9 Bản nháp); đồng hồ Risk Register `started_at` = GIO_MAU − 24 phút 17 giây. Thêm dữ liệu frame cần: 7 bài thực hành Xong; Bản của tôi Change Request v1.0 Hoàn thành + Risk Register v0.2 Đang viết; lịch sử ôn 30 ngày cho ra 81%; 7/10 dấu Đã soát cho EVM; `_lo-trinh-goi-y.md` gồm 3 chặng của §9 (Đề xuất mẫu, chưa duyệt). Thân bài toàn câu giữ chỗ "[Nội dung mẫu — <khối>] …" (§13 quy tắc 6), không có kiến thức PM nào. Lô F22 nằm trong `tests/fixtures/`.
- **Dữ liệu tự đặt trong frame** (README; chỉ có trong seed, đánh dấu tự đặt): bước mini; heatmap từng ngày; "Đủ khối" và "Ngày nhập" ở Chờ duyệt (app thật tính từ file và sổ nội dung); "sửa lần cuối 21/10/2026" của Risk Register v0.2; ghi chú; câu trả lời Tự đánh giá; mức "Chưa chọn" của 9 chứng chỉ (app hiện "Không theo"); "Kiểm tra lần cuối 22/10/2026" ở trang PMP.
- **Tách khỏi dữ liệu thật**: dữ liệu mẫu không bao giờ chạm `data/` và `noi-dung/` thật; app thật không có cờ hay code nạp dữ liệu mẫu. Lần chạy thật đầu tiên → F05: "0% · 0/199 · 0 bỏ qua", Học tiếp OPA.

## 8. Cần bạn chốt

Trả lời "OK hết" là mình làm theo cột *Mặc định*. Muốn đổi điểm nào thì ghi số của điểm đó.

| # | Vấn đề | Mặc định của mình |
|---|---|---|
| 1 | Vị trí dự án và cổng | `~/workspace/pm/hoc-pm-a-z/`, package và git riêng; chép `docs/pm-roadmap/` vào `hoc-pm-a-z/docs/`. Web 5320, API 5321 (bộ mẫu 5322/5323) |
| 2 | Thư mục nội dung | `hoc-pm-a-z/noi-dung/`, ngoài git của app (bạn tự git riêng nếu muốn); đổi qua `NOI_DUNG_DIR`, P1 có thêm ở Cài đặt |
| 3 | 7 câu hỏi mở của designer | Theo mặc định ở 4.2 |
| 4 | Khung bài Chứng chỉ và Lộ trình gợi ý (đang là "Đề xuất mẫu") | Duyệt khung 7 khối ★ của §8.6b qua đề xuất này, không làm "Duyệt khung" trong app. Lộ trình gợi ý là file `_lo-trinh-goi-y.md` do bạn hoặc Claude viết, bạn duyệt trong app (F30) |
| 5 | Nguồn "Mục liên quan" và flashcard | Mục liên quan chỉ từ `lien_quan`. Flashcard là dữ liệu học trong SQLite, tạo từ câu Tự kiểm tra hoặc tự gõ; app không đọc thẻ từ file |
| 6 | Khi nào mỗi bước tính là xong | Như bảng 3.2; bài không có câu hỏi thì Kiểm tra là "Không áp dụng"; Áp dụng của mọi mẫu nhận "Không áp dụng" kèm lý do |
| 7 | Trình soạn tự lưu vào đâu | Bản tạm trong SQLite; chỉ ghi `.md` khi "Lưu bản nháp"; file đổi ngoài app từ lúc mở thì hỏi lại, không ghi đè lặng lẽ |
| 8 | Sao lưu | Mỗi ngày tự sao lưu DB + `noi-dung/`, thêm trước migration / nhập / đặt lại / thay cây; giữ 14 bản. P1 có "Sao lưu toàn bộ" ngoài file JSON tiến độ của spec |
| 9 | Điểm dừng chờ duyệt | Dừng sau phase 1 (design system trên code), 2a (prompt soạn bài, vì bạn sẽ dùng nó để nhờ Claude soạn bài thật), 3 (bài học), 9 (nghiệm thu P0), 13. Phase khác vẫn báo cáo; mục cần duyệt gom vào "Chờ bạn duyệt", mình làm tiếp nhưng không qua điểm dừng kế tiếp khi còn mục chưa duyệt; câu chữ mới nằm trong `src/copy/cho-duyet.ts` để sửa một chỗ |
| 10 | Trình soạn F20 ẩn sidebar (D27) | Giữ như F20: màn tập trung, có nút "‹ Về bài" |
| 11 | Phạm vi Đặt lại | Đúng 4 nhóm câu F38b ghi (trạng thái học, giờ học, flashcard, ghi chú); giữ Nói lại, bài thực hành, câu tự kiểm tra và mọi thứ khác ở 2.3 |
| 12 | Dialog "quên tắt đồng hồ" | Đưa từ P2 lên P0 (phase 3), ngưỡng 3 giờ hoặc qua nửa đêm như app 24 tuần; thêm Lịch sử phiên có Xoá |
| 13 | Hoàn tác sau khi Duyệt bài | Không có; dialog "Duyệt bài này?" đã là bước xác nhận. Muốn đổi lại thì sửa bài → bản sửa |

## 9. Kế hoạch theo phase

**Mỗi phase chỉ xong khi**: (1) app chạy được; (2) test (cả `test:tz` và chống gõ cứng), lint, `tsc` xanh; (3) mình tự kiểm tra trên trình duyệt các frame của phase ở 1440 và 375 (thêm 1024 khi phase đụng khung app hoặc bản đồ; đủ 5 bề rộng 375/768/1024/1280/1440 chỉ ở phase 9 và 13), Sáng và Tối, chỉ bàn phím, axe, không cuộn ngang; (4) tick từng mã D của phase, agent độc lập review chéo; (5) commit git với message rõ ràng; (6) báo bạn: ảnh chụp, mã D đã tick, mục **"Chờ bạn duyệt"** gồm câu chữ mới mình đặt, ảnh frame tự dựng (4.3) và câu chữ designer thêm ngoài đặc tả của các frame trong phase (vd. F23 "Tự nhớ lại đáp án trước khi lật", "Ôn lại n thẻ đã quên"; F26 "Dữ liệu học của bạn không bị ảnh hưởng.", "Bài vẫn hiện trạng thái học, đồng hồ và ghi chú."; F21 "Lọc theo tên mục…"). Câu designer thêm được dùng như frame tới khi bạn đổi.

Thứ tự theo gợi ý của designer, hết P0 rồi tới P1, trừ: tab Nhập lên phase 2b để bạn có bài thật học sớm; F31 Ôn tập ở phase 8 vì sidebar và "Bắt đầu phiên" cần trang đích.

| Phase | Nội dung | Frame | Sửa lệch | Bạn dùng được gì |
|---|---|---|---|---|
| **0. Nền móng** | Tạo `hoc-pm-a-z/`, git init, chép docs. Stack + phiên bản ghim (1.1); migrations, sao lưu hằng ngày. Token, font, đổi giao diện không nháy (1.2). `shared/`: roadmap + `cau-hinh-cay.json`, `clock.ts`, định dạng, tuần ISO + `test:tz`, `tim-kiem` (foldVi, chỉ mục tên, `vietTat`), đều có test. Chống gõ cứng. `xem-frame.ts`. Gallery F01 | F01 | — | `npm install && npm run dev` mở gallery token Sáng/Tối; test cây xanh |
| **1. Component + khung app** | C4–C8, C10, C11, C25, C26, C32, C33, C35, C36, C38, icon trạng thái; C34, rail, top bar mobile, drawer (4.4); skip link, focus H1; sổ phím tắt + F27; error boundary, 404 có gợi ý, mất kết nối, skeleton; ô tìm sidebar và phím `/` mở C28 tối giản (chỉ Mục học) tới phase 4; mọi route có trang | F02, F02b (phần đã có), C34, F27, F28, F26 (trừ lỗi đọc file), F26b | D4, D5, D6, D17 (nút/ô/chip), D18, D22, D23, D24, D30 (C26 lỗi), D33 (chip), D35 (F26b) | Đi khắp khung app tiếng Việt, đổi giao diện, bảng `?`, tìm tên mục |
| **2a. Bài học (đọc) + trạng thái** | Schema lõi (trạng thái, lịch sử, lượt mở); parser (1.5). Bộ dựng bài dùng danh sách khối của cả 3 mẫu (Đủ khối, mục lục, ô "Chưa có", vị trí Nói lại đúng mẫu; khối đặc biệt hiện Markdown thường; "Bản của tôi", "Kế hoạch thi" là C38 "Có ở phase n", Kế hoạch thi kèm nút Không áp dụng). Đầu bài: C12 + menu, chip, H1 + dòng tên gốc, C6 + toast Hoàn tác, dải vị trí, "Xem trên bản đồ"; khối Chủ đề, Mục liên quan, pager, chân bài, dòng nguồn. Chưa có nội dung + dialog Sao chép prompt (D14). Banner lỗi đọc file. Seed mẫu + kịch bản (mục 7) | F11 (trừ cột phải), F17, F18, F19 (trái), F26 (lỗi đọc file) | D1, D2 (pill/chip trong bài), D8, D10, D12, D13, D14, D15, D30 (thẻ mục cuối) | Đặt trạng thái mọi mục; sao chép prompt; đọc bài bộ mẫu |
| **2b. Đưa nội dung vào** | 1.6 (sổ, quét, ghi nguyên tử + `file_ops`, thùng rác, bảo vệ bản Đã duyệt cả ◎, sự kiện ngoài app) + test API trên fixture. Tab Nhập (1.7, 3.8): kéo thả file/thư mục, Quét lại, bảng kết quả, Gán cho mục | F22 | D21 (Hợp lệ F22) | Claude soạn → Quét lại / kéo thả → đọc bài (Bản nháp) |
| **3. 4 bước, cột phải, mobile** | 3.2 (Nói lại, Thực hành + dự án, Tự kiểm tra, thanh 4 bước + mini, F19 phải), lý do Bỏ qua. Đồng hồ 3.4 (sidebar, card, chip mobile, phím T, chuyển mục, quên tắt, lịch sử phiên). Ghi chú. Tạo/sửa/xoá thẻ. C9; tab Mục lục / Trong lĩnh vực. Bố cục < 1440 (4.4). Mobile: pill + sheet, thanh đáy, mục lục nổi, sheet Ghi chú | F11 đủ, F13, F19 (phải) | D7 (F13), D16, D26 (đồng hồ), D31 | Học trọn 4 bước một mục, bấm giờ, ghi chú, tạo thẻ |
| **4. Danh sách, Lĩnh vực, Tìm kiếm** | F08 (cây, bộ lọc 3.9, chọn nhiều, hàng loạt, menu 1 mục); F09 (accordion, chạm giữ mở sheet); F10 (tổng quan lĩnh vực, kệ tài liệu, pager lĩnh vực). C28 đầy đủ + `/api/tim` (1.8), tìm trên mobile. Gửi duyệt danh sách viết tắt | F08, F09, F10, F25, F25b, C28 | D2 (C28, F09), D3, D21 (icon phần F08), D25 (F10), D34 | Xem cả roadmap dạng cây, lọc, đặt Đang học / Bỏ qua hàng loạt, tìm bằng `/` |
| **5. Tổng quan** | F03 đủ các card (3.3, 3.4), banner mồ côi (bất biến 8); F05, F04; skeleton, lỗi từng card | F03, F04, F05 | D19, D20 (F05), D21 (tên lĩnh vực F03), D29 (F05), D35 (card F03) | Mở app là biết đang ở đâu, hôm nay học gì |
| **6. Bản đồ** | 1.4 trọn vẹn + test bố cục; C1 đủ trạng thái, khung nhóm C2, nhãn phần, chú giải, lớp phủ Độ phủ; panel mục, panel lĩnh vực C3 (+ dòng tên gốc); làm nhạt theo bộ lọc | F06, F06b, F07 | D17 (H1 bản đồ), D28, D32 | Toàn cảnh roadmap kiểu roadmap.sh; đổi trạng thái trên bản đồ |
| **7a. Duyệt và bản sửa** | 3.7: chế độ duyệt, dialog Duyệt, tab Độ phủ + Chờ duyệt, banner bản sửa, Mở/Bỏ bản sửa, ô khối thiếu | F12, F14, F21, F21b | D9, D20 (F21b), D25 (F21) | Soát, duyệt bài; quản lý độ phủ |
| **7b. Trình soạn** | 3.6: CodeMirror, form frontmatter, khung bài, lỗi theo dòng, xem trước, bản tạm + xung đột `base_hash` + rời trang, chọn Liên quan, soạn tổng quan | F20 | D27 | Tự soạn, sửa bài trong app |
| **7c. Mẫu Tài liệu** | Dải process group, bảng cột cố định + tải .md/.csv, checklist, Bản của tôi + "Tạo từ mẫu" (3.6) | F15, F16 | D7 (F16), D11 | Học bài Tài liệu đầy đủ, làm bản của mình |
| **8. Ôn tập** | Phiên ôn 3.5 (thanh đáy mobile, cuối phiên, hết thẻ); trang Ôn tập F31 | F23, F23b, F24, F31 | D17 (mặt thẻ), D20 (F31), D26 (F23), D35 (F31) | Ôn flashcard hằng ngày; Cần ôn lại chạy với dữ liệu thật |
| **9. Nghiệm thu P0** | Rà trạng thái trống, lỗi, đang tải; 5 bề rộng, Sáng/Tối, chỉ bàn phím, axe. README (chạy, thư mục nội dung, quy ước file, prompt, sao lưu, thay cây). Tự chạy kịch bản trên thư mục tạm (`DATA_DIR`, `NOI_DUNG_DIR` = `mktemp -d`, xoá sau khi chạy; không bao giờ chạm `data/`, `noi-dung/` thật): lần đầu trống → mở dialog Sao chép prompt (chỉ kiểm văn bản prompt, không gửi cho AI) → chép 1 file giữ chỗ `[Nội dung mẫu — …]` từ `tests/fixtures/` vào thư mục → Quét lại → duyệt → học đủ 4 bước → ôn thẻ → tắt/mở server, dữ liệu còn → sửa file đã duyệt ngoài app, bản duyệt không bị đè. Mình không soạn và không duyệt bài thật nào; bài thật đầu tiên do bạn duyệt | Toàn bộ frame P0 | tick lại D1–D35 phần P0 | Báo cáo nghiệm thu P0; dùng hằng ngày được |
| **10. P1-a** | Cài đặt F38b (giao diện, quy tắc Cần ôn lại, thư mục nội dung, mục tiêu giờ, JSON có xem trước, sao lưu toàn bộ, đặt lại, bản ghi mồ côi); Ghi chú F38; Phần F29, link phần đổi sang `/phan/:slug`; ⌘K | F38b, F38, F29 | D20 (F38), D29 (F29) | Sao lưu, khôi phục tiến độ; xem mọi ghi chú; có trang phần |
| **11. P1-b** | Chứng chỉ (mẫu 7 khối trên khung F11, mức theo đuổi, kế hoạch thi, Phủ roadmap, Thông tin kỳ thi); Bộ hồ sơ + tab Dự án; Thống kê (KPI, burnup + dự báo, heatmap, đều có bảng) | F32, F33, F34, F34b, F35 | D20 (F32), D29 (F32, F34, F34b/F35) | Theo dõi chứng chỉ, 15 tài liệu của dự án, burnup việc học |
| **12. P1-c** | Thiết lập lần đầu (bước 1–4 + F36); Thuật ngữ + Viết tắt; Lộ trình gợi ý + Trước/Tiếp theo lộ trình; đường nối mục liên quan trên bản đồ | F30, F36, F37 | D29 (F37), D33 (F37) | Đủ toàn bộ P1 |
| **13. Nghiệm thu cuối** | Lặp lại phase 9 cho toàn app, cùng quy tắc thư mục tạm; thêm round-trip sao lưu toàn bộ, nhập JSON vào DB trống, đặt lại giữ đúng danh sách 2.3, thay cây thử. Báo cáo đối chiếu đủ 51 frame | Đủ 51 frame | tick lại D1–D35 | Báo cáo nghiệm thu |

## 10. Điều chỉnh phạm vi (27/10/2026, người dùng đã duyệt)

Người dùng: "lược bỏ bớt, tập trung vào nội dung, cuối cùng chỉ muốn được học; bỏ hẳn mobile". Kế hoạch còn lại thay
mục 9 từ phase 3 trở đi:

| Bước | Làm | Bỏ |
|---|---|---|
| 1. Học trọn một mục | Nói lại, Thực hành, Tự kiểm tra, F19 phải, lý do Bỏ qua; cột phải: Mục lục, Ghi chú, Flashcard | Mobile F13; đồng hồ học, giờ học, streak |
| 2. Đi lại trong roadmap (gộp 4 + 5) | Danh sách cây có bộ lọc, trang Lĩnh vực, Tổng quan gọn (tiến độ, Học tiếp, thẻ cần ôn) | Bản đồ (phase 6) |
| 3. Ôn tập (phase 8) | Phiên ôn Leitner | — |
| 4. Duyệt bài gọn (thay 7a–7c) | Nút "Duyệt bài" trên trang bài, danh sách bản nháp chờ duyệt | Trình soạn trong app, "Bản của tôi", tải CSV |
| 5. Nội dung thật | Claude soạn bài nháp cho 199 mục bằng prompt đã duyệt, có agent soát độc lập; người dùng duyệt trong app | — |
| 6. Nghiệm thu cuối (gộp 9 + 13) | Kiểm toàn app trên máy tính | — |

- Chỉ máy tính (≥ 1024px). Không làm thêm, không kiểm thêm giao diện < 1024px; phần mobile đã có từ phase 1–2b để nguyên.
- Bỏ toàn bộ P1 (phase 10–12): Thống kê, Chứng chỉ, Bộ hồ sơ, Thiết lập lần đầu, Thuật ngữ, Lộ trình gợi ý, trang Phần,
  Cài đặt nâng cao. Sao lưu tự động hằng ngày giữ nguyên.
- Đồng hồ: API server đã viết ở phase 3 bước A để nguyên, không làm giao diện; bỏ khu đồng hồ ở sidebar / rail.
- Điểm dừng chờ duyệt mới: sau bước 1, sau đợt nội dung đầu tiên, sau bước 6.
