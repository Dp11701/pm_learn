# Prompt thiết kế — Web học Project Management theo roadmap.sh

**Cách dùng (dành cho bạn — không dán phần này)**
1. 8 câu hỏi bên dưới đã chốt ngày 23/10/2026: giữ toàn bộ mặc định.
2. Dán từ đường kẻ `---` ngay dưới 8 câu hỏi (dòng 21) đến hết Phụ lục A.
3. Công cụ dạng canvas (Claude Design, Figma Make, Stitch) vẽ frame; công cụ sinh code (v0, Lovable) coi mỗi frame là một trang, có nút đổi Sáng/Tối.
4. Có 5 lượt (mục 12). Nếu công cụ không tự dừng, mỗi lần chỉ gửi yêu cầu của một lượt, vd. "Làm Lượt 2 theo mục 12, giữ nguyên design system đã duyệt."
5. Sau mỗi lượt, đọc danh sách công cụ trả về (frame đã làm, giả định mới, chỗ mơ hồ), duyệt xong mới sang lượt tiếp.
6. Công cụ giới hạn độ dài prompt (phần cần dán của bản này khoảng 63.000 ký tự): dùng bản rút gọn `prompt-design-ngan.md` (khoảng 6.000 ký tự, không có Phụ lục A).

**8 câu đã chốt (23/10/2026) — giữ toàn bộ mặc định**
1. **Dùng công cụ thiết kế nào?** Mặc định: prompt trung lập, chia 5 lượt; công cụ giới hạn độ dài thì dùng bản rút gọn.
2. **Tên sản phẩm?** Mặc định "Học PM A–Z".
3. **Quy tắc Cần ôn lại?** Mặc định: Đã xong + có thẻ đến hạn. Có thể thêm "lần tự kiểm tra gần nhất có câu Sai".
4. **Chứng chỉ, Bộ hồ sơ (chỉ lưới 15 tài liệu), Thống kê để P1?** Mặc định: có. Trình soạn tài liệu dạng bảng, Nhật ký thi thử, Tổng kết tuần, Tự đánh giá lại định kỳ để P2.
5. **Có cho đặt Đã xong hàng loạt không** (ở Danh sách và bước Tự đánh giá đầu vào)? Mặc định: không; chỉ cho Bỏ qua hàng loạt kèm lý do.
6. **Dùng chung màu với app 24 tuần?** Mặc định: chung font và bố cục, màu theo prompt này.
7. **Mobile chỉ có Danh sách, bản đồ để P2?** Mặc định: có.
8. **Lộ trình gợi ý (3 chặng) và khung khối của mẫu Chứng chỉ (8.6b) giữ dạng "Đề xuất mẫu" chờ duyệt?** Mặc định: có.

---

## 0. Vai trò và mục tiêu

Bạn là product designer senior chuyên về sản phẩm học tập. Hãy thiết kế **design system và bộ màn hình hi-fi** cho **"Học PM A–Z"**. Mặc định mỗi màn vẽ ở desktop 1440px, giao diện Sáng; bản mobile 375px và bản Tối chỉ vẽ cho các frame ghi rõ ở mục 12.

"Học PM A–Z" là web app cá nhân để tự học Project Management từ A đến Z theo **toàn bộ** roadmap cộng đồng https://roadmap.sh/r/project-management-crez9 (tác giả Bohdan Ivakhiv, PM Hood). Mỗi lần mở app, người học phải biết ngay: mình đang ở đâu trong 199 mục, hôm nay học gì, và mình thật sự nhớ được gì.

Roadmap gốc **chỉ có tên mục**, không có nội dung. Vì vậy app vừa là nơi học, vừa là nơi chứa bài học. Người dùng tự soạn bài, hoặc nhờ AI soạn nháp bên ngoài app rồi tự duyệt. Giao diện luôn phải cho thấy mục nào chưa có nội dung, mục nào là bản nháp, mục nào đã duyệt.

Chỉ thiết kế UI, không thiết kế backend.

### Giả định (sửa được)

| # | Giả định | Mặc định |
|---|---|---|
| G1 | Người dùng | 1 người, chạy cục bộ trên máy cá nhân. Không đăng nhập, không mạng xã hội, không thanh toán |
| G2 | Thiết bị | Desktop-first 1440, responsive tới 375, không cuộn ngang trang. Giao diện Sáng / Tối / Theo hệ thống |
| G3 | Ngôn ngữ | UI tiếng Việt, tên mục giữ tiếng Anh. Giải nghĩa tiếng Việt chỉ hiện khi file nội dung có, vd. "Scope Creep — phình phạm vi" |
| G4 | Định dạng | dd/MM/yyyy · HH:mm 24h · "4 giờ 35 phút" · đồng hồ 00:24:17 · số thập phân dùng dấu phẩy |
| G5 | Thứ tự học | Theo thứ tự cây ở Phụ lục A (roadmap không quy định thứ tự học). "Lộ trình gợi ý" chỉ là đề xuất, chỉ có hiệu lực khi bạn duyệt |
| G6 | Nội dung | Mỗi mục là 1 file Markdown. App không gọi AI; chỉ có nút "Sao chép prompt soạn bài" |
| G7 | Người học | Dev lead chuyển sang PM, đã quen SDLC, Scrum/Kanban, CI/CD, code review, Jira. Có 1 dự án thật để thực hành |
| G8 | Họ sản phẩm | Cùng ngôn ngữ thị giác với app tự học BA/PM 24 tuần: sidebar → drawer, đồng hồ học, streak, flashcard Leitner, tự lưu, bảng phím tắt `?`. Là app riêng |
| G9 | Tên | "Học PM A–Z" (tạm) |

## 1. Mô hình học và trạng thái

**Vòng 4 bước cho mỗi mục: Hiểu → Áp dụng → Kiểm tra → Ghi nhớ**
- **Hiểu:** đọc bài, rồi viết 1–3 câu vào ô "Nói lại bằng lời của bạn".
- **Áp dụng:**
  - Chủ đề: làm bài thực hành trên dự án thật.
  - Tài liệu: có ít nhất 1 bản Hoàn thành.
  - Chứng chỉ: có kế hoạch thi.
  - Hoặc chọn "Không áp dụng" và ghi lý do.
- **Kiểm tra:** tự trả lời trước, rồi mới "Xem đáp án" và tự chấm Đúng / Một phần / Sai.
- **Ghi nhớ:** mục có ít nhất 1 flashcard.

Thanh 4 bước (C10) nằm ở đầu bài; bản mini nằm trên thẻ và hàng. Nếu bấm "Đã xong" khi còn thiếu bước, hiện hộp xác nhận liệt kê các bước thiếu, với 2 nút "Quay lại học tiếp" / "Vẫn đánh dấu Đã xong". Không chặn cứng.

**Ba trục trạng thái độc lập**
1. **Trạng thái học** (lưu theo id nút roadmap.sh, khớp 1:1): Chưa học · Đang học · Đã xong · Bỏ qua (có thể kèm lý do). Xuất JSON: Learning / Done / Skip; Chưa học không có bản ghi.
2. **Cờ "Cần ôn lại"** (suy ra, không lưu, không phải trạng thái thứ 5): bật khi mục Đã xong có ít nhất 1 flashcard đến hạn; ôn xong thì tự tắt.
3. **Trạng thái nội dung** (lưu trong frontmatter): Chưa có nội dung · Bản nháp (AI / Tự viết) · Đã duyệt (kèm ngày). Mục chưa có nội dung vẫn đặt trạng thái, ghi chú, bấm giờ được.

Chứng chỉ có thêm trường "Mức theo đuổi" riêng, không thay cho trạng thái học.

**Tiến độ trung thực**
- % = **Đã xong / (199 − Bỏ qua)**.
- Luôn kèm phân số và số Bỏ qua, vd. "19% · 37/195 · 4 bỏ qua". Mục Bỏ qua không bao giờ được tính là xong.
- Cạnh % luôn có chỉ số độ sâu: bài thực hành đã xong, tài liệu hoàn thành x/15, tỉ lệ nhớ 30 ngày.
- Không có điểm, huy hiệu, cấp độ, bảng xếp hạng hay confetti. Streak chỉ là một dòng chữ.

## 2. Nguyên tắc (thứ tự ưu tiên khi xung đột)
1. **Trung thực về nội dung:** chữ mẫu luôn có nhãn C27; trạng thái nội dung luôn thấy được.
2. **Luôn biết mình ở đâu:** breadcrumb, dải vị trí, "Xem trên bản đồ", tiến độ có phân số.
3. **Mỗi kênh thị giác một nghĩa** (5.1); màu không bao giờ là tín hiệu duy nhất.
4. **Không bao giờ trắng màn hình:** trống, đang tải, lỗi, 404, mất kết nối đều có câu hướng dẫn và nút.
5. **Ít ma sát:** thao tác chính 1 bước, có Hoàn tác.
6. **Đọc tiếng Việt thoải mái**, WCAG 2.2 AA.
7. **Phong cách công cụ làm việc** (5.0): phẳng, viền mảnh, không minh hoạ, không emoji; riêng Bản đồ mang dáng roadmap.sh.

## 3. Dữ liệu roadmap (cố định)

**Loại nút**
- **Phần** (Part) — 5 phần, trang `/phan/:slug`.
- **Lĩnh vực** (Knowledge Area, vàng) — 11 lĩnh vực, đều thuộc phần Project Management; trang `/linh-vuc/:slug`.
- **Nhóm** (Topic Group Title, đen) — 21 nhóm. Chỉ là điểm neo `#slug` trên trang cha, không phải mục học, không tính tiến độ.
- **Chủ đề** (Topic, be/cam nhạt) — 184: 174 dùng mẫu Chủ đề (8.5), 10 dùng mẫu Chứng chỉ (8.6b).
- **Tài liệu** (Document, xanh dương) — 15, dùng mẫu Tài liệu (8.6).

**Tổng: 199 mục học.** Mọi mục học (Chủ đề, Chứng chỉ, Tài liệu) đều có trang `/hoc/:slug`. Link đọc thêm trong bài gọi là "Tham khảo", không gọi là "tài liệu".

**Phần:** Project Management 144 mục (11 lĩnh vực, 10 nhóm; 129 chủ đề + 15 tài liệu) · Business Acumen 17 (3 chủ đề lẻ đứng trước 2 nhóm) · Technical Acumen 16 (5 nhóm) · Tools 12 (4 nhóm) · Certifications 10 (không có nhóm).

**Lĩnh vực** (mục · tài liệu · nhóm): PM Framework / Approach 22·0·1 · Project Governance 18·2·3 · Scope Management 16·3·2 · Change Management 8·3·0 · Schedule Management 16·1·1 · Risk Management 10·1·0 · Cost Management 10·1·0 · Quality Management 10·1·0 · People Management 14·0·1 · Stakeholder and Communication Management 9·3·0 · Procurement Management 11·0·2.

**Trường hợp khó**
- **Breadcrumb 2–4 cấp**, ví dụ:
  - Project Management › Scope Management › Prioritization Techniques › MoSCoW
  - Business Acumen › Project Selection Method › Net Present Value (NPV)
  - Certifications › Project Management Professional (PMP)
- **"SAFe" xuất hiện 2 lần:** slug `safe-scaled-agile` và `safe-certifications`. Kết quả tìm kiếm, chip và pager luôn kèm breadcrumb để phân biệt.
- **Phần trùng tên với roadmap:** khi đứng riêng thì ghi "Phần Project Management".
- **Tên dài nhất 53 ký tự** ("Schedule creation (milestones, phases, critical path)"): tối đa 2 dòng, không cắt chữ.
- **13 tên đã sửa chính tả** (vd. tên gốc "Steering Comittee"): hiện tên đã sửa, kèm dòng nhỏ "Tên gốc trên roadmap: …". Tên gốc vẫn tìm kiếm được.
- **Cây không có toạ độ:** bản đồ dựng *theo tinh thần* roadmap.sh, không sao chép vị trí nút.

## 4. Quy ước nội dung

**File**
- Đường dẫn: `noi-dung/<phan>/<linh-vuc>/<slug>.md`; mục không thuộc lĩnh vực: `noi-dung/<phan>/<slug>.md`, vd. `noi-dung/certifications/project-management-professional-pmp.md`.
- Tổng quan lĩnh vực / phần: `_tong-quan.md` trong thư mục tương ứng (`loai: tong-quan`).
- Bản sửa của bài đã duyệt lưu thành `<slug>.ban-sua.md` cho tới khi được duyệt.
- Thân bài dùng đúng các tiêu đề `##` của mẫu (Chủ đề 8.5, Tài liệu 8.6, Chứng chỉ 8.6b).
- Câu hỏi và flashcard viết theo dạng `- H: … | Đ: …`.

```
---
id: <id nút roadmap.sh>
loai: chu-de                    # chu-de | tai-lieu | chung-chi | tong-quan
giai_nghia: phình phạm vi       # Nội dung mẫu
trang_thai_noi_dung: da-duyet   # ban-nhap | da-duyet
nguon: ai                       # ai | tu-viet
ngay_duyet: 2026-10-18          # chỉ có khi da-duyet; UI hiện 18/10/2026
lien_quan: [change-request-cr, change-control-board-ccb, scope-baseline]
---
```

**Ba đường đưa nội dung vào**
1. Soạn trong app.
2. Kéo thả file hoặc thư mục `.md`, có bảng kiểm tra trước khi nhập.
3. File được ghi thẳng vào thư mục nội dung (vd. do Claude soạn); bấm "Quét lại" thì file vào tab Chờ duyệt.

Nội dung nhập vào mặc định là Bản nháp. Không bao giờ ghi đè bản Đã duyệt khi chưa có xác nhận.

## 5. Design system

### 5.0 Hướng thị giác
- Cảm giác: bình tĩnh, tập trung, như sổ tay kỹ thuật của người làm nghề; không vui nhộn, không kiểu edtech sặc sỡ.
- Tham chiếu: Linear (độ gọn của sidebar, danh sách), Notion / Obsidian (trang đọc dài), roadmap.sh (chỉ cho Bản đồ).
- Mật độ vừa. Thang khoảng cách 4 · 8 · 12 · 16 · 24 · 32 · 48.
- Kích thước (mobile trong ngoặc): nút và ô nhập cao 36 (44); hàng cây 40 (48); hàng bảng 44; chip 24; padding card 20 (16); khoảng cách giữa các card 24 (16); khoảng cách giữa các khối bài 40.

### 5.1 Màu

**Mỗi kênh chỉ một nghĩa** (áp dụng cho nút bản đồ, chip, hàng, thẻ):
- **Nền vàng / be / đen / xanh dương:** chỉ báo loại nút. Bốn hue này không dùng cho trạng thái, banner hay callout.
- **Icon trạng thái + vạch 4px cạnh trái + chữ:** trạng thái học. Vạch trái 4px (màu đặc của trạng thái) chỉ dùng cho trạng thái học; Chưa học không có vạch; card, banner hay loại nút không dùng vạch trái.
- **Sọc chéo + `circle-slash` + chữ "Bỏ qua":** Bỏ qua. Sọc 45°, nét 2px cách 6px, màu #57534E ở 20% (tối: #D6D3D1 ở 20%), chồng lên nền loại để vẫn nhận ra loại. Không giảm opacity cả nút, không gạch ngang chữ.
- **Icon `file-x` / `file-pen` / `file-check` + chữ:** trạng thái nội dung (trên bản đồ chỉ hiện ở lớp phủ Độ phủ nội dung).
- **Glyph ↺ (`rotate-ccw`) xanh mòng két ở góc phải trên, trong vòng tròn 16px nền `surface`:** Cần ôn lại (#0F766E / #2DD4BF; 5.5 / 9.5 trên `surface`).
- **Đang chọn:** viền 3px màu mực (thay viền 1.5px). **Focus bàn phím:** vòng 2px màu mực, cách mép 2px (outline-offset 2px). Mục vừa chọn vừa focus thì có cả hai.
- **Nét đứt:** chỉ có nghĩa "chưa có / chờ điền" (chip Chưa có nội dung, khung khối Chưa có, vùng thả file) và đường dự báo trên biểu đồ.
- **`danger` đỏ:** chỉ dùng cho lỗi và xoá.
- **Tag hồng C27:** lớp chú thích thiết kế, không phải UI của app (cuối 5.1).

**Token** (sáng / tối; số trong ngoặc là tỉ lệ tương phản)
- `bg` #F8FAFC / #0B1120
- `surface` #FFFFFF / #111827
- `surface-2` #F1F5F9 / #1E293B
- `border` #E2E8F0 / #1F2937
- `border-input` #8492A6 / #64748B (3.2 / 3.7)
- `text` #0F172A / #E2E8F0 (17.1 / 15.3)
- `text-muted` #475569 / #94A3B8 (7.2 / 6.9)
- `primary` là màu mực: #0F172A chữ trắng / #E2E8F0 chữ #0B1120. Dùng cho nút chính, nav đang chọn, focus, viền đang chọn. Ở giao diện sáng, màu mực trùng màu thanh Nhóm; phân biệt bằng hình dạng: Nhóm luôn là thanh tiêu đề full-width có icon `folder`.
- `danger` #B91C1C / #FCA5A5 (6.5 / 9.4)
- Link dùng màu `text` + gạch chân.

**Legend** (viền mực 1.5px như roadmap.sh)

| Loại | Sáng: nền / chữ | Tối: nền / chữ / viền | Icon | Tương phản S / T |
|---|---|---|---|---|
| Lĩnh vực | #FDE047 / #1C1917 | #713F12 / #FEF9C3 / #EAB308 | `layers` | 13.3 / 8.1 |
| Chủ đề | #FDE7C7 / #1C1917 | #3B2A16 / #FDE7C7 / #B45309 | `book-open` | 14.5 / 11.4 |
| Tài liệu | #BFDBFE / #172554 | #1E3A8A / #DBEAFE / #3B82F6 | `file-text` | 10.3 / 8.5 |
| Nhóm | thanh #0F172A / #FFF | thanh #1E293B / #F8FAFC / #64748B (viền 3.96 so với `bg`) | `folder` | 17.9 / 14.0 |

Chứng chỉ dùng màu của Chủ đề, kèm icon `award`.

**Trạng thái học** (hue tách khỏi legend và khỏi `primary`)

| Trạng thái | Icon | Pill sáng: chữ / nền | Pill tối: chữ / nền | Màu đặc S / T |
|---|---|---|---|---|
| Chưa học | `circle` | #475569 / #F1F5F9 (6.9) | #CBD5E1 / #1E293B (9.9) | #E2E8F0 / #334155 |
| Đang học | `contrast` (vòng tô nửa) | #6B21A8 / #F3E8FF (7.4) | #E9D5FF / #3B0764 (11.0) | #7E22CE / #C084FC |
| Đã xong | `circle-check` | #166534 / #DCFCE7 (6.5) | #BBF7D0 / #14532D (7.5) | #15803D / #4ADE80 |
| Bỏ qua | `circle-slash` | #57534E / #F5F5F4 (7.0) | #D6D3D1 / #292524 (10.2) | sọc (chữ nút trên sọc ≥ 7.8 / ≥ 5.5) |
| Cần ôn lại | `rotate-ccw` | #115E59 / #CCFBF1 (6.7) | #99F6E4 / #134E4A (7.5) | #0F766E / #2DD4BF |

**Nội dung** (màu trung tính)
- Chưa có nội dung: `file-x`, chip viền nét đứt. Chip luôn ghi "Chưa có nội dung"; chữ "Chưa có" chỉ dùng trong ô khối nét đứt.
- Bản nháp: `file-pen`, "Bản nháp · AI" hoặc "Bản nháp · Tự viết".
- Đã duyệt: `file-check`, "Đã duyệt · dd/MM/yyyy".
- Đã duyệt có bản sửa: `file-check` + chấm, "Đã duyệt · có bản sửa chưa duyệt".

**Banner:** nền `surface-2`, viền 1px `border-input`, icon `info` 20px màu `text` + tiêu đề đậm; không dùng vạch trái.

**Biểu đồ:** dùng màu đặc của trạng thái; dự báo vẽ nét đứt; heatmap theo thang slate; luôn có "Xem dạng bảng".

**C27 — chú thích "Nội dung mẫu"** (lớp chú thích thiết kế, không phải component của app): tag chữ #BE185D / #F472B6, 12/18/600, viền liền 1px cùng màu, đặt ở góc phải trên của mỗi khối chữ mẫu, nằm trên lớp riêng tên "Chú thích" để ẩn được. Không vẽ trạng thái tương tác cho C27. App thật báo bản nháp bằng C8 + C26.

### 5.2 Chữ, lưới, hình

**Font:** Be Vietnam Pro (subset `vietnamese`, 400–700), fallback Inter / system-ui. JetBrains Mono cho phím tắt, đường dẫn, frontmatter.

**Cỡ chữ** (desktop, mobile trong ngoặc): h1 28/40 (24/34) · h2 22/32 (20/30) · thân bài 17/28 (16/26) · UI 15/24 · meta và nhãn nút bản đồ 13/20 · chip 12/18/600.

**Quy tắc chữ:** line-height: thân bài ≥ 1.6, chữ UI ≥ 1.5, tiêu đề ≥ 1.4 (đủ chỗ cho dấu chồng); không viết hoa toàn bộ chữ tiếng Việt; số dùng `tabular-nums`; thuật ngữ tiếng Anh gắn `lang="en"`; giải nghĩa đặt sau " — ", màu `text-muted`. Câu kiểm tra dấu: "Ước lượng chi phí · Quản lý rủi ro định lượng · Nghiệm thu sản phẩm bàn giao".

**Lưới:** khoảng cách theo thang ở 5.0. ≥ 1280 đầy đủ · 1024–1279 sidebar thành rail 72px · 768–1023 drawer · < 768 mobile. Desktop: sidebar 264px, 12 cột, gutter 24. Trang bài: ≥ 1440 cột đọc ≤ 720 + cột phải 320 (dính khi cuộn); 1280–1439 cột đọc ≤ 640 + cột phải 280; < 1280 bỏ cột phải, đồng hồ, mục lục và ghi chú thành nút trên thanh đầu bài, mở panel trượt 360px. Mobile: lề 16, top bar 56, vùng chạm ≥ 44px. Thanh đáy 64px chỉ có ở trang bài học (8.5) và phiên ôn (8.9); các trang khác không có tab bar, điều hướng qua drawer.

**Hình:** bo góc 6 (ô nhập, chip, nút bản đồ) · 10 (card) · 14 (dialog, sheet, panel). Bóng chỉ ở giao diện sáng (`0 1px 2px` / `0 8px 24px` / `0 24px 48px`, rgba(15,23,42, .06 / .12 / .18)); giao diện tối tách lớp bằng `surface-2` và viền. Icon Lucide nét 1.75; icon phần: `briefcase`, `trending-up`, `cpu`, `wrench`, `award`. Empty state: icon 40px trong vòng `surface-2` + 1 câu + 1–2 nút. Chuyển động 150–250ms; với `prefers-reduced-motion` chỉ cross-fade; không có hiệu ứng ăn mừng.

## 6. Điều hướng

### 6.1 Khung app và routes

**Sidebar 264px**
- Logo, ô tìm kiếm (`/`).
- Menu: Tổng quan · Lộ trình · Ôn tập (badge thẻ đến hạn) · Nội dung (badge bản nháp) · Thống kê · Bộ hồ sơ dự án · Chứng chỉ · Thuật ngữ · Ghi chú · Cài đặt.
- Khối "Đang học": 3 mục mở gần nhất (Risk Register, Scope Creep, Power/Interest Grid) + "Xem tất cả (6)"; trống: "Chưa có mục đang học".
- Chân sidebar: đồng hồ (tên mục + 00:24:17 + nút Dừng, hoặc "Chưa bấm giờ" + nút Bắt đầu), nút Giao diện (Sáng / Tối / Theo hệ thống), nút `?`.

**Mobile:** top bar gồm menu mở drawer, tiêu đề, nút tìm kiếm, chip đồng hồ. Không có tab bar toàn cục.

**Routes P0**
- `/` — Tổng quan.
- `/lo-trinh?xem=ban-do|danh-sach` — bộ lọc nằm trong query; `?muc=` mở sẵn panel của một mục, `?vung=` zoom tới một lĩnh vực.
- `/linh-vuc/:slug`
- `/hoc/:slug` (mọi mục học: Chủ đề, Tài liệu, Chứng chỉ) và `/hoc/:slug/soan`
- `/noi-dung?tab=do-phu|cho-duyet|nhap`
- `/on-tap/phien`
- `*` (404)

**Routes P1:** `/phan/:slug`, `/lo-trinh-goi-y`, `/on-tap`, `/thong-ke`, `/ho-so`, `/chung-chi` (danh sách 10 chứng chỉ; mỗi dòng trỏ về `/hoc/:slug`), `/chao-mung`, `/thuat-ngu`, `/ghi-chu`, `/cai-dat`.

**Slug:** tên đã sửa, kebab-case. Tiến độ lưu theo id nút, nên đổi slug không làm mất dữ liệu.

**Chân trang:** "Cấu trúc theo roadmap Project Management của Bohdan Ivakhiv (PM Hood) trên roadmap.sh · cập nhật 22/08/2026 · dữ liệu lấy ngày 22/10/2026".

### 6.2 Định vị

**Breadcrumb:** mỗi cấp có ▾ mở danh sách mục cùng cấp kèm trạng thái. Nhóm trỏ tới điểm neo. Mobile chỉ hiện "‹ cấp cha".

**Dải vị trí** ở đầu bài
- Mỗi chấm là một mục cùng lĩnh vực (nếu mục không có lĩnh vực thì lấy cùng phần).
- Hình chấm theo trạng thái: rỗng / nửa / check / gạch chéo.
- Chấm hiện tại to hơn, kèm chữ "Mục 3/16 · Scope Management". Click chấm để mở mục.

**"Xem trên bản đồ"** có trên mọi trang bài và trang lĩnh vực.

**Trước / Tiếp** (phím `[` `]`)
- Mặc định theo thứ tự trong cây (Phụ lục A — dựng lại từ roadmap.sh; roadmap không quy định thứ tự học). Chế độ theo lộ trình gợi ý chỉ bật được sau khi lộ trình đã duyệt, và luôn quay lại được thứ tự cây.
- Không dừng ở mục có trạng thái Bỏ qua.
- Vẫn dừng ở mục chưa có nội dung; hiện chip "Chưa có nội dung" cho mục đó.
- Khi vượt ranh giới, ghi rõ loại ranh giới, vd. "Tiếp — sang lĩnh vực mới: Change Management ›" (tương tự với nhóm mới, phần mới).
- Ở mục cuối: "Đây là mục cuối cùng của roadmap".

**"Học tiếp"** = mục Đang học mở gần nhất. Nếu không có thì là mục Chưa học đầu tiên theo thứ tự cây.

### 6.3 Lọc và tìm kiếm

**Bộ lọc** nằm trong URL, dùng chung cho Bản đồ, Danh sách, trang Phần/Lĩnh vực, Tìm kiếm và Nội dung.
- Các chip: Trạng thái (4 + Cần ôn lại) · Loại · Phần · Lĩnh vực · Nội dung · Có ghi chú.
- Luôn có nút "Xoá bộ lọc" và dòng "Đang hiển thị 9/199 mục".
- Danh sách giữ lại cấp cha của mục khớp, hiện bằng chữ `text-muted`.
- Bản đồ làm nhạt mục không khớp: nền chuyển `surface-2`, bỏ màu loại, chữ giữ `text-muted` (6.9 / 5.7), viền `border`; hover hoặc focus thì trở lại bình thường; vẫn bấm được. Không giảm opacity cả nút.

**Tìm kiếm** (phím `/`, popover rộng 560px)
- Không phân biệt dấu và hoa/thường.
- Khớp trên: tên tiếng Anh, tên gốc ("comittee" → Steering Committee), giải nghĩa (chỉ mục có nội dung), viết tắt ("ccb" → Change Control Board (CCB)), thân bài, ghi chú.
- Xếp hạng: khớp viết tắt hoặc nguyên tên > khớp đầu tên > khớp giữa tên > khớp tên gốc hoặc giải nghĩa > khớp thân bài hoặc ghi chú. Cùng bậc thì theo thứ tự cây.
- Kết quả chia 3 nhóm: "Phần · Lĩnh vực · Nhóm" (icon loại + phân số, không có icon trạng thái) · "Mục học" · "Trong bài và ghi chú" (thu gọn, nút "Xem thêm").
- Mỗi kết quả mục học có: icon loại, tên (phần khớp in đậm), breadcrumb, icon trạng thái, chip "Chưa có nội dung" nếu có.
- Không có kết quả: gợi ý "Thử tên tiếng Anh hoặc viết tắt".
- `⌘K` là P1.

## 7. Dữ liệu mẫu (mọi frame dùng chung)

**Thời điểm:** hôm nay Thứ Năm, 22/10/2026 (tuần ISO 43). Bắt đầu học 17/09/2026, đang ở tuần học thứ 6. Frame có số liệu ghi "Dữ liệu mẫu" ở tên frame, vd. "F03 Tổng quan · Dữ liệu mẫu", không đặt nhãn này trong UI.

**Trạng thái 199 mục:** Đã xong 37 · Đang học 6 · Bỏ qua 4 · Chưa học 152 → **19% · 37/195 · 4 bỏ qua**.

**Đã xong**
- PM Framework / Approach (12): SDLC, PDLC, Scrum, Kanban, Waterfall, Iterative approach, Incremental approach, Agile, Lean Principles, V-model, PoC, MVP.
- Project Governance (6): Project Sponsor, Meeting Notes, Decision Log, Initiation, Planning, Execution.
- Scope Management (5): Definition of Ready, Definition of Done, Functional Requirements, Non-Functional Requirements, MoSCoW.
- Change Management (2): Change Control Board (CCB), Change Request (CR).
- Schedule Management (3): T-shirt Sizing, Story Points Estimation / Planning Poker, Burndown/Burnup charts.
- Business Acumen (3): Presales, Dedicated Team, Staff Augmentation.
- Technical Acumen (5): CI/CD, Test strategy/Test plan, Branching strategy, Code review, Tech debt.
- Tools (1): Confluence.

**Đang học** (theo thứ tự mở gần nhất): Risk Register, Scope Creep, Power/Interest Grid, Jira, Qualitative Risk Assessment, Schedule creation (milestones, phases, critical path). Sidebar hiện 3 mục đầu + "Xem tất cả (6)"; card Tiếp tục học hiện Risk Register, bên dưới là Scope Creep và Power/Interest Grid.

**Bỏ qua** (lý do "Không dùng trong công việc"): Use Case Points, Function Point Analysis, Mural, Primavera P6 Oracle.

**Cần ôn lại:** Scrum, MoSCoW, Definition of Done. Lọc "Đang học + Cần ôn lại" cho ra 9 mục.

**Theo phần:** Project Management 28/142 (2 bỏ qua) · Business Acumen 3/17 · Technical Acumen 5/16 · Tools 1/10 (2 bỏ qua) · Certifications 0/10.

**Theo lĩnh vực:** PM Framework / Approach 12/22 · Project Governance 6/18 · Scope Management 5/16 · Change Management 2/8 · Schedule Management 3/14 (2 bỏ qua) · 6 lĩnh vực còn lại 0.

**Nội dung:** 41 Đã duyệt · 9 Bản nháp · 149 Chưa có.
- Đã duyệt (41) = toàn bộ 37 mục Đã xong + Scope Creep + Feasibility Study + Miro + Trello. Theo phần: Project Management 30, Business Acumen 3, Technical Acumen 5, Tools 3.
- 9 bản nháp: WBS + WBS dictionary, Project Charter, Change log, Schedule creation (milestones, phases, critical path), Earned Value Management, Three-Point Estimation, Risk Register, Qualitative Risk Assessment, Power/Interest Grid. Project Charter và Change log là "Tự viết"; các bản còn lại là AI.
- Scope Creep duyệt ngày 18/10/2026. Salience Model và Jira chưa có nội dung.

**Giờ học:** tuần này 4 giờ 35 phút / 6 giờ; tổng 38 giờ 10 phút; streak 5 ngày (kỷ lục 12); đồng hồ đang chạy Risk Register 00:24:17. Heatmap 12 tuần (tuần 32–43): 6 tuần trước 17/09/2026 là ô trống viền mảnh, có ghi chú "Bắt đầu 17/09/2026".

**Flashcard:** 85 thẻ, 12 thẻ đến hạn. Hộp 1–5: 34 / 21 / 15 / 9 / 6. Tỉ lệ nhớ 30 ngày 81%.

**Độ sâu:** 7 bài thực hành xong; tài liệu 1/15 (Change Request (CR) v1.0 · Hoàn thành); Risk Register v0.2 · Đang viết.

**Khác**
- Dự án thực hành: "Cổng đặt lịch nội bộ", Execution.
- PMP: "Đang ôn", thi 15/06/2027, còn 236 ngày.
- Burnup cộng dồn tuần 38–43: 6 · 12 · 19 · 27 · 33 · 37. Phạm vi giảm từ 199 xuống 195 ở tuần 40.
- Lộ trình gợi ý: chưa duyệt.

## 8. Màn hình P0

### 8.1 Tổng quan `/`

**Card "Tiếp tục học" — Risk Register:** chip Tài liệu, chip "Bản nháp · AI", 4 bước mini, "Tiếp: Áp dụng", "Đã học 1 giờ 05 phút". Bên dưới: Scope Creep và Power/Interest Grid (Đang học).

**Card "Tiến độ":** vòng chia đoạn theo trạng thái (đoạn Bỏ qua vẽ sọc). Giữa vòng: "19%", "37/195", "4 bỏ qua". Kèm độ sâu: 7 bài thực hành · 1/15 tài liệu · nhớ 81%.

**Theo phần:** 5 thanh có phân số.

**11 card lĩnh vực:** icon `layers` trong ô 24px nền #FDE047 (tối #713F12) ở đầu card, tên lĩnh vực, phân số, thanh tiến độ. Không dùng vạch trái — vạch trái 4px chỉ dành cho trạng thái học.

**Cột phải**
- Ôn tập hôm nay: 12 thẻ, nút "Ôn ngay", danh sách Cần ôn lại.
- Giờ học, streak, heatmap 12 tuần.
- Nội dung: 41 · 9 · 149 + "Duyệt 9 bản nháp".

**Banner:** "Lộ trình gợi ý: Đề xuất — chờ bạn duyệt".

**Lần đầu (F05):** "Roadmap có 199 mục, hiện 0/199 mục có nội dung. Bắt đầu từ đâu?" với 3 nút "Thiết lập lần đầu" · "Xem lộ trình" · "Soạn bài đầu tiên". F05 không dùng dữ liệu mục 7: tiến độ "0% · 0/199 · 0 bỏ qua"; nội dung 0 · 0 · 199; "Chưa có flashcard"; streak 0, heatmap trống; card Tiếp tục học: "Học tiếp: OPA (mục đầu tiên trong cây)"; sidebar: "Chưa có mục đang học", đồng hồ "Chưa bấm giờ".

**Trạng thái:** đang tải thì hiện skeleton từng card; lỗi thì chỉ card đó báo lỗi + nút "Thử lại".

**Mobile:** 1 cột, thứ tự Tiếp tục học → Ôn tập → Tiến độ → các phần còn lại.

### 8.2 Lộ trình — Bản đồ

**Thanh công cụ:** segmented **Bản đồ | Danh sách** (phím `M`) · chip lọc · lớp phủ **Tiến độ học | Độ phủ nội dung** · "Đi tới…" · "Chú giải" · dòng "Theo roadmap.sh · cập nhật 22/08/2026".

**Bố cục:** trục dọc nối 5 phần theo thứ tự Phụ lục A. Phần Project Management có 11 nút lĩnh vực vàng (240×56, ghi phân số) trên trục; mục của mỗi lĩnh vực xếp thành cụm 2 cột, luân phiên trái/phải. Nhóm là khung có thanh tiêu đề đen. Business Acumen: 3 chủ đề lẻ đặt trước các nhóm. Certifications: lưới 2×5.

**Nút mục** (200–240 × ≥ 40, chữ 13/600, ≤ 2 dòng; kênh theo 5.1)
- Lớp phủ **Tiến độ học** (mặc định): nền loại + icon trạng thái + vạch trái + ↺ Cần ôn lại; icon loại chỉ cho Tài liệu và Chứng chỉ; không hiện kênh nội dung.
- Lớp phủ **Độ phủ nội dung**: ẩn kênh trạng thái học; ở vị trí icon trạng thái hiện `file-x` / `file-pen` / `file-check`; thêm thanh "41 duyệt · 9 nháp · 149 chưa có".
- Nút không chứa chữ trạng thái; chữ trạng thái nằm trong tooltip, aria-label, panel và Chú giải.

**Click hoặc Enter** mở panel phải rộng 380px, không rời bản đồ và không dùng popover hover chứa nút. Panel gồm:
- tên + giải nghĩa (nếu có), breadcrumb;
- 4 trạng thái (phím 1–4), 4 bước, trạng thái nội dung;
- tóm tắt (chữ mẫu, gắn C27), hoặc "Chưa có nội dung" + "Soạn bài";
- mục liên quan ("liên kết mẫu");
- nút "Mở bài học";
- ‹ › sang mục kế bên.

**Nút lĩnh vực** mở panel lĩnh vực: tên, tiến độ có phân số, nội dung "duyệt · nháp · chưa có", danh sách nhóm, nút "Mở trang lĩnh vực" và "Học tiếp trong lĩnh vực". Mẫu: Scope Management — "5/16 · Đang học 1 · Chưa học 10", "6 duyệt · 1 nháp · 9 chưa có", nhóm Types of Requirements và Prioritization Techniques. **Tiêu đề nhóm** zoom vừa khung. **Hover** chỉ hiện tooltip.

**Điều khiển:** zoom − / 100% / + / vừa màn hình; chú giải thu gọn được. Đường nối mục liên quan là P1.

**Trạng thái**
- Skeleton khi tải.
- Lỗi: "Không đọc được cây roadmap" + "Thử lại".
- Lọc rỗng: "Không có mục nào khớp bộ lọc" + "Xoá bộ lọc".

**Mobile:** mặc định mở Danh sách (bản đồ mobile là P2).

### 8.3 Lộ trình — Danh sách
- Cây Phần › Lĩnh vực › Nhóm › Mục (role `tree`). Hàng cha có phân số và thanh tiến độ.
- Hàng mục gồm: checkbox · icon loại · tên + giải nghĩa · status pill (bấm để mở menu) · chip nội dung · 4 bước mini.
- Sắp xếp: theo thứ tự cây / A–Z / mở gần đây.
- Chọn nhiều → "Đặt trạng thái…" chỉ có Chưa học / Đang học / Bỏ qua (kèm lý do). Đã xong phải đặt từng mục. Kết quả hiện toast có Hoàn tác.
- Mobile: accordion; chạm giữ để mở sheet trạng thái.

### 8.4 Lĩnh vực `/linh-vuc/scope-management`

**Đầu trang**
- "Scope Management".
- "Phần Project Management · 16 mục · 13 chủ đề · 3 tài liệu · 2 nhóm".
- Tiến độ "5/16 · Đang học 1 · Chưa học 10"; nội dung "6 duyệt · 1 nháp · 9 chưa có".
- Nút "Học tiếp trong lĩnh vực: Scope Creep", "Xem trên bản đồ".
- Chưa có tổng quan thì hiện "Chưa có phần tổng quan" + "Soạn tổng quan" (tạo `_tong-quan.md`).

**Kệ tài liệu:** WBS + WBS dictionary, Scope Statement, Scope Baseline.

**Danh sách theo cây** (không ghi trạng thái học = Chưa học)
- Definition of Ready — Đã xong · Đã duyệt
- WBS + WBS dictionary — Bản nháp · AI
- Scope Creep — Đang học · Đã duyệt
- Scope Statement — Chưa có nội dung
- Definition of Done — Đã xong · Cần ôn lại · Đã duyệt
- Acceptance of deliverables — Chưa có nội dung
- Scope Baseline — Chưa có nội dung
- Nhóm Types of Requirements:
  - Functional Requirements — Đã xong · Đã duyệt
  - Transition Requirements — Chưa có nội dung
  - Non-Functional Requirements — Đã xong · Đã duyệt
- Nhóm Prioritization Techniques:
  - MoSCoW — Đã xong · Cần ôn lại · Đã duyệt
  - RICE Score, ICE Score, Value/Effort Matrix, 100 Dollar Test, Eisenhower Matrix — Chưa có nội dung

**Pager:** "‹ Project Governance · Change Management ›".

### 8.5 Bài học — Chủ đề `/hoc/scope-creep`

**Đầu bài**
- Breadcrumb, chip Chủ đề.
- H1 "Scope Creep — phình phạm vi" (C27).
- "Đã duyệt · 18/10/2026" · "Đã học 35 phút".
- Segmented 4 trạng thái, đang chọn Đang học.
- 4 bước: Hiểu ✓ · Áp dụng (đang làm) · Kiểm tra · Ghi nhớ ✓.
- "Mục 3/16 · Scope Management".
- "Xem trên bản đồ", "Soạn (E)", đồng hồ (T).

**Các khối cố định** — chính là các `##` của file; ★ = bắt buộc (9 khối); khối tuỳ chọn trống thì ẩn khi đọc:
1. ★ Tóm tắt
2. ★ Vì sao PM cần biết
3. ★ Khái niệm cốt lõi
4. ★ Ví dụ thực tế
5. ★ Cách áp dụng
6. ★ Góc dev lead → PM — callout 2 cột "Bạn đã quen" / "Điều cần đổi"
7. Tuỳ chọn: So sánh / Thuật ngữ / Thực hành công cụ
8. ★ Thực hành trên dự án thật — đề bài, đầu ra, tiêu chí tự kiểm, chọn dự án, ô kết quả; nút "Xong" / "Không áp dụng (ghi lý do)"
9. ★ Tự kiểm tra — ô trả lời → "Xem đáp án" → Đúng / Một phần / Sai; "Tạo flashcard"
10. Mục liên quan
11. ★ Tham khảo

Sau khối 6 có ô "Nói lại bằng lời của bạn".

**Chữ mẫu** (gắn C27)
- Tóm tắt: "Scope Creep là khi phạm vi dự án lớn dần vì yêu cầu mới không qua kiểm soát thay đổi."
- Tự kiểm tra: "Khách xin thêm nút xuất Excel ở tuần cuối sprint. Bạn làm gì trước tiên?"
- Liên quan ("liên kết mẫu"): Change Request (CR), Change Control Board (CCB), Scope Baseline.
- Các khối còn lại, kể cả callout "Góc dev lead → PM", dùng câu giữ chỗ (mục 13, quy tắc 6). Tham khảo chỉ ghi "Nguồn mẫu 1 — chưa điền".

**Cột phải** (dính khi cuộn), từ trên xuống: Đồng hồ của mục · tab [Mục lục | Trong lĩnh vực] · Ghi chú · Flashcard (3 thẻ) + "Tạo thẻ".

**Chân bài:** nút chính "Đã xong, sang bài tiếp"; pager "‹ WBS + WBS dictionary" (Bản nháp · AI) | "Scope Statement ›" (Chưa có nội dung).

**Mobile:** trạng thái là 1 pill mở sheet; thanh đáy 64px [‹] [Trạng thái] [Đồng hồ] [Ghi chú] [›]; mục lục là nút nổi.

### 8.6 Bài học — Tài liệu `/hoc/risk-register`

**Khác với Chủ đề**
- Chip xanh "Tài liệu", "Mục 1/10 · Risk Management".
- Áp dụng đang làm (v0.2 · Đang viết).
- Banner "Bản nháp do AI soạn — chưa được bạn duyệt, có thể sai." + "Vào chế độ duyệt".
- Bản tài liệu của người học có trạng thái "Đang viết" / "Hoàn thành"; không dùng chữ "Nháp", vì "Bản nháp" là trạng thái nội dung bài.

**Các khối** (★ = bắt buộc, 8 khối)
1. ★ Mục đích
2. ★ Khi nào lập, ai lập, ai duyệt — dải 5 process group, tô bước liên quan
3. ★ Cấu trúc tài liệu
4. ★ Mẫu điền sẵn — bảng có cột đầu cố định, cuộn ngang trên mobile. Cột: ID · Mô tả rủi ro · Xác suất · Tác động · Điểm · Chiến lược phản hồi · Người phụ trách · Trạng thái. Đúng 3 hàng mẫu:
   - R-01 · [Rủi ro mẫu 1] · 4 · 3 · 12 · [Chiến lược mẫu] · Tôi · Đang theo dõi
   - R-02 · [Rủi ro mẫu 2] · 2 · 5 · 10 · [Chiến lược mẫu] · Tôi · Đang theo dõi
   - R-03 · [Rủi ro mẫu 3] · 3 · 2 · 6 · [Chiến lược mẫu] · Tôi · Đã đóng

   Nút "Tải .md / .csv".
5. ★ Checklist chất lượng
6. Lỗi thường gặp
7. ★ **Bản của tôi** — dự án · phiên bản · ngày · Đang viết / Hoàn thành; nút "Tạo từ mẫu" (mở trình soạn Markdown C31 với mẫu điền sẵn; trình soạn dạng bảng là P2). Mẫu: "Cổng đặt lịch nội bộ · v0.2 · Đang viết"
8. ★ Tự kiểm tra
9. Mục liên quan
10. ★ Tham khảo

Sau khối 3 có ô "Nói lại bằng lời của bạn" (bước Hiểu). Cột phải, chân bài và bản mobile giống Chủ đề.

Toàn bộ chữ trong khối 1–6 và 8, kể cả tên cột, 3 hàng mẫu và process group được tô, là chữ mẫu, gắn C27; khối chưa có chữ mẫu dùng câu giữ chỗ (mục 13, quy tắc 6).

**Pager:** "‹ Wideband Delphi (lĩnh vực trước: Schedule Management)" | "PESTLE ›". Function Point Analysis không hiện vì đang Bỏ qua.

### 8.6b Mẫu bài Chứng chỉ `/hoc/project-management-professional-pmp`

Dùng cho 10 mục Certifications. Danh sách khối là **Đề xuất mẫu**, chờ người dùng duyệt. Frame vẽ ở P1 (F34–F35), nhưng trình soạn và tab Độ phủ (P0) đã dùng mẫu này.

**Khác với Chủ đề**
- Chip Chủ đề + icon `award`; breadcrumb "Certifications › Project Management Professional (PMP)".
- Trường "Mức theo đuổi" (Không theo / Đang cân nhắc / Đang ôn / Đã đăng ký thi / Đã đạt) đặt cạnh segmented trạng thái; mẫu: "Đang ôn".
- Bước Áp dụng = có kế hoạch thi.

**Các khối** (★ = bắt buộc, 7 khối)
1. ★ Tóm tắt
2. ★ Dành cho ai
3. ★ Thông tin kỳ thi — người dùng tự nhập; trường trống ghi "Chưa có thông tin"; luôn hiện "Kiểm tra lần cuối dd/MM/yyyy"
4. ★ Phủ roadmap — "Domain 1 / 2 / 3" (nhãn mẫu) gắn với các mục roadmap ("liên kết mẫu"), mỗi mục kèm icon trạng thái
5. ★ Kế hoạch thi của tôi — ngày thi 15/06/2027, đếm ngược "còn 236 ngày"
6. Nhật ký thi thử (P2)
7. ★ Tự kiểm tra
8. Mục liên quan
9. ★ Tham khảo

Sau khối 2 có ô "Nói lại bằng lời của bạn". Không ghi domain, tỉ trọng, phí hay thời lượng thi thật.

### 8.7 Ba trạng thái nội dung

**Chưa có nội dung — `/hoc/salience-model`**
- Giữ đầu bài; H1 chỉ có tên tiếng Anh.
- Thẻ `file-x`: "**Mục này chưa có nội dung.** Roadmap gốc chỉ có tên mục — bài học do bạn soạn hoặc duyệt." Nút: "Soạn bài" · "Nhập file .md" · "Sao chép prompt soạn bài".
- Bên dưới: khung các khối dạng ô nét đứt "Chưa có".
- Vẫn đổi trạng thái, bấm giờ, ghi chú được.
- Pager: "‹ Power/Interest Grid" | "Expectations Management ›".
- **Không** có câu nào giải thích về Salience Model.

**Dialog "Sao chép prompt soạn bài"**
- Xem trước prompt: tên, breadcrumb, loại, các `##`, đường dẫn file.
- Yêu cầu trong prompt: viết tiếng Việt, giữ thuật ngữ tiếng Anh, ghi nguồn, đánh dấu bản nháp.
- Nút "Sao chép". Dòng chú thích "App không tự gọi AI."

**Bản nháp ở chế độ duyệt — Earned Value Management**
- Bài có 10 khối có nội dung (9 bắt buộc + So sánh). Mỗi khối có công tắc "Đã soát".
- Nút "Duyệt bài" chỉ bật khi đã soát đủ mọi khối có nội dung; nếu chưa thì ghi "Còn 3 khối chưa soát · đã soát 7/10".
- Bấm Duyệt → dialog xác nhận → "Đã duyệt · 22/10/2026".
- Chữ trong mọi khối là câu giữ chỗ (mục 13, quy tắc 6), gắn C27 cạnh công tắc "Đã soát"; không viết công thức hay số liệu EVM.

**Đã duyệt — biến thể (F12, vẽ trên bài Scope Creep)**
- Khi sửa bài đã duyệt: bản sửa lưu thành `<slug>.ban-sua.md`; chip C8 đổi thành "Đã duyệt · có bản sửa chưa duyệt"; banner "Có thay đổi chưa duyệt" + "Mở bản sửa". So sánh khác biệt là P2.
- Thiếu khối bắt buộc: ô nét đứt "Chưa có Tự kiểm tra — Thêm".

### 8.8 Nội dung

**Trình soạn `/hoc/salience-model/soan`**
- 3 cột: Khung bài ("0/9 khối bắt buộc") · Markdown (điền sẵn các `##`) · Xem trước.
- Form: id, tên gốc, loại (chỉ đọc); giải nghĩa, nguồn, liên quan.
- Panel cú pháp.
- Cảnh báo theo dòng, vd. "Dòng 14: câu hỏi thiếu ' | Đ: '".
- Tự lưu; hỏi lại khi rời trang mà chưa lưu.

**`/noi-dung`**
- Tab **Độ phủ:** bảng 199 mục, cột "Đủ khối" theo mẫu: x/9 (Chủ đề), x/8 (Tài liệu), x/7 (Chứng chỉ); lọc theo trạng thái nội dung.
- Tab **Chờ duyệt (9):** bảng 9 hàng: tên + breadcrumb · loại · nguồn AI / Tự viết · ngày nhập (trong khoảng 17/09–22/10/2026) · đủ khối · nút "Duyệt". Trống: "Không có bản nháp nào chờ duyệt" + "Nhập file .md".
- Tab **Nhập:** vùng kéo thả (thường / kéo vào / xử lý / lỗi) và nút "Quét lại thư mục". Bảng kiểm tra khớp theo `id`, không có thì theo tên file. 5 kết quả:
  - ✓ Hợp lệ
  - ⚠ Thiếu khối bắt buộc
  - ✕ Lỗi frontmatter (kèm số dòng)
  - ⚠ Không khớp mục ("Gán cho mục…", gợi ý `risk-registr.md` → Risk Register)
  - ⟳ Trùng bản đã duyệt (Giữ bản cũ / Nhập thành bản sửa)
- Cuối bảng: "11 hợp lệ · 2 cảnh báo · 1 trùng · 1 lỗi" và nút "Nhập 13 file"; file trùng chỉ nhập khi chọn "Nhập thành bản sửa".

### 8.9 Phiên ôn `/on-tap/phien`
- Màn tập trung, ẩn sidebar, tiến độ "3/12".
- Mặt trước: "MoSCoW" + chip "Scope Management › Prioritization Techniques". Mặt sau: "[Nội dung mẫu — đáp án 1–2 câu]", gắn C27.
- "Lật (Space)", sau đó "Quên (1)" (nút phụ, không đỏ) / "Nhớ (2)".
- Cuối phiên: "Nhớ 9 · Quên 3 · Lần ôn kế tiếp 23/10/2026".
- Không còn thẻ: "Hôm nay không còn thẻ nào cần ôn" + "Tạo thẻ".
- Mobile: thanh đáy 64px chứa Lật / Quên / Nhớ.

### 8.10 Trạng thái hệ thống
- **404** (`/hoc/scope-creap`): "Không tìm thấy trang này. Có phải bạn muốn mở Scope Creep?" + ô tìm kiếm.
- **Lỗi trang:** "Tải lại" + "Chi tiết lỗi".
- **Lỗi đọc file:** "change-log.md: lỗi frontmatter dòng 3" + "Mở trong trình soạn".
- **Mất kết nối máy chủ cục bộ:** "Mất kết nối với máy chủ cục bộ. Tự thử lại sau 5 giây…" + "Thử ngay"; nội dung đang gõ được giữ nguyên.
- **Skeleton.**
- **Toast:** "Đã chuyển Scope Creep sang Đã xong · Hoàn tác"; "Lỗi lưu — Thử lại".

## 9. Màn P1 và P2

### P1

**Phần `/phan/business-acumen` (F29)**
- "Phần Business Acumen · 17 mục · 2 nhóm"; tiến độ "3/17"; nội dung "3 duyệt · 0 nháp · 14 chưa có".
- 3 chủ đề lẻ (Sales Process, Presales, Business Model Canvas) đặt trước 2 nhóm Project Selection Method (9) và Client Engagement models (5), dạng hàng cây C9.
- "Chưa có phần tổng quan" + "Soạn tổng quan".
- Pager "‹ Phần Project Management · Phần Technical Acumen ›".

**Lộ trình gợi ý `/lo-trinh-goi-y` (F30)**
- Banner "Đề xuất — chờ bạn duyệt. Trước/Tiếp vẫn theo thứ tự cây".
- Đổi thứ tự chặng bằng nút ↑ ↓ (kéo thả là P2).
- Dữ liệu "Đề xuất mẫu":
  - Chặng 1: Agile, Scrum, Kanban, Waterfall, SDLC.
  - Chặng 2: Project Charter, Scope Statement, WBS + WBS dictionary, Scope Creep.
  - Chặng 3: Three-Point Estimation, Risk Register, RACI Matrix.
- Nút "Duyệt và áp dụng" / "Sửa" / "Không dùng".

**Ôn tập `/on-tap` (F31)**
- "12 thẻ đến hạn hôm nay" + "Bắt đầu phiên".
- 5 hộp Leitner 34 / 21 / 15 / 9 / 6, kèm khoảng ôn 1 / 2 / 4 / 8 / 16 ngày (như app 24 tuần).
- Tỉ lệ nhớ 30 ngày 81%; danh sách Cần ôn lại: Scrum, MoSCoW, Definition of Done.
- Trống: "Chưa có flashcard nào" + "Mở bài đang học".

**Thống kê `/thong-ke` (F32, chỉ vẽ Sáng)**
- Hàng KPI.
- Burnup: đường Phạm vi, đường Đã xong, đường dự báo nét đứt "Dự kiến xong 17/04/2027 nếu giữ nhịp 4 tuần gần nhất (6,25 mục/tuần)", kèm cách tính.
- Ghi chú: "Đây chính là mục Burndown/Burnup charts trong roadmap".
- Dưới 2 tuần dữ liệu: "Cần ít nhất 2 tuần dữ liệu".

**Bộ hồ sơ dự án `/ho-so` (F33)**
- Lưới 15 tài liệu nhóm theo lĩnh vực; mỗi ô là Chưa tạo / Đang viết vX / Hoàn thành; dòng "1/15 hoàn thành". Mỗi ô mở bài Tài liệu tương ứng ở khối "Bản của tôi".
- Tab Dự án: tên, vai trò, giai đoạn của dự án thực hành.

**Chứng chỉ `/chung-chi` (F34–F35)**
- `/chung-chi` là danh sách 10 chứng chỉ; mỗi dòng có Mức theo đuổi (Không theo / Đang cân nhắc / Đang ôn / Đã đăng ký thi / Đã đạt) và trỏ về `/hoc/:slug`.
- Trang PMP (`/hoc/project-management-professional-pmp`) dùng mẫu 8.6b.
- Không ghi domain, tỉ trọng, phí hay thời lượng thi thật.

**Thiết lập lần đầu `/chao-mung`**
- Các bước (đề xuất): 1. Giới thiệu — roadmap chỉ có tên mục · 2. Chọn thư mục nội dung · 3. Dự án thực hành (bỏ qua được) · 4. Mục tiêu giờ/tuần (mặc định 6 giờ) · 5. Tự đánh giá đầu vào.
- **Bước Tự đánh giá đầu vào (F36):** 15 dòng (11 lĩnh vực + 4 phần), mỗi dòng: Chưa biết / Biết sơ / Đã làm thực tế.
- "Đã làm thực tế" cho phép chọn Bỏ qua hàng loạt kèm lý do. **Không** cho Đã xong hàng loạt.
- Frame mẫu: Tools, Bỏ qua Mural và Primavera P6 Oracle.

**Thuật ngữ `/thuat-ngu` (F37)**
- Giải nghĩa chỉ có ở mục đã có nội dung.
- Tab Viết tắt chỉ gồm viết tắt có trong cây (OPA, PMIS, EEF, WBS, CCB, RFP, NDA, SOW, NPV, IRR, COGS, CoQ, VUCA, BANI…). Tên đầy đủ không có trong cây thì ghi "Chưa điền".

**Ghi chú `/ghi-chu` và Cài đặt `/cai-dat` (F38)**
- Ghi chú: danh sách theo mục (tên + breadcrumb + dd/MM/yyyy + 2 dòng đầu, chữ giữ chỗ gắn C27), tìm và lọc theo phần / lĩnh vực; trống: "Chưa có ghi chú" + "Mở bài đang học".
- Cài đặt: giao diện, quy tắc Cần ôn lại, thư mục nội dung, xuất/nhập JSON kèm bảng ánh xạ trạng thái, đặt lại có xác nhận.

**Khác:** `⌘K`; đường nối mục liên quan trên bản đồ.

### P2
Tổng kết tuần · Tự đánh giá lại định kỳ (cùng 15 dòng, so với lần đầu) · Giới hạn WIP · Kanban · Trình soạn tài liệu dạng bảng (register / matrix, RACI dùng R/A/C/I; dạng nhiều phần cho plan / charter; lưu phiên bản, xuất .md / .csv) · Nhật ký thi thử · Kéo thả chặng ở Lộ trình gợi ý · Mini-map, xuất PNG, bản đồ mobile · So sánh phiên bản · In A4 · Tablet · Dialog quên tắt đồng hồ.

## 10. Component

- **Bản đồ:** C1 Nút bản đồ — ma trận đại diện: 3 loại mục học (Chủ đề, Tài liệu, Chứng chỉ) × 4 trạng thái học (lớp phủ Tiến độ học); 3 trạng thái nội dung (lớp phủ Độ phủ); trên nút Chủ đề thêm Cần ôn lại / đang chọn / focus / không khớp bộ lọc; nút lĩnh vực (phân số) · C2 Khung nhóm · C3 NodePanel / bottom sheet · C9 Hàng cây.
- **Trạng thái:** C4 Chip loại · C5 Status pill · C6 Segmented trạng thái · C7 Cờ, badge · C8 Chip nội dung (Chưa có nội dung / Bản nháp / Đã duyệt / Đã duyệt có bản sửa) · C10 Thanh 4 bước · C11 Tiến độ (vòng, thanh, phân số + "n bỏ qua").
- **Điều hướng:** C12 Breadcrumb · C13 Dải vị trí · C14 Pager có nhãn ranh giới · C28 Tìm kiếm · C29 Bộ lọc · C34 Sidebar.
- **Bài học:** C15 Card · C16 Khối bài (ô nét đứt khi trống, công tắc "Đã soát") · C17 Bảng mẫu · C18 Bảng sửa được · C19 Callout · C20 Thẻ thực hành · C21 Câu tự kiểm tra · C22 Flashcard + hộp Leitner · C23 Đồng hồ · C24 Ghi chú.
- **Chung:** C25 Tự lưu ("Đang lưu…" / "Đã lưu lúc 21:42" / "Lỗi lưu — Thử lại") · C26 Banner · C30 Vùng thả file · C31 Trình soạn · C32 Dialog / sheet · C33 Toast · C35 Nút (chính màu mực / phụ / ghost / nguy hiểm) · C36 Trường nhập (ngày dd/MM/yyyy) · C37 Biểu đồ · C38 Empty / error / skeleton.
- **Chú thích thiết kế (không thuộc UI app):** C27 Nhãn "Nội dung mẫu" — vẽ trong khung riêng "Chú thích thiết kế" ở F01. App thật báo bản nháp bằng C8 + C26.

Mỗi component tương tác có đủ trạng thái hover, focus, disabled và lỗi (C27 không có).

## 11. Phím tắt và accessibility

| Phím | Tác dụng | Phạm vi |
|---|---|---|
| `?` · `/` · `Esc` | Bảng phím tắt · Tìm kiếm · Đóng | Toàn app |
| `[` `]` | Mục trước / sau | Bài học, panel bản đồ |
| `1`–`4` | Chưa học / Đang học / Đã xong / Bỏ qua | Bài học, panel bản đồ |
| `T` · `E` · `M` | Đồng hồ · Soạn · Bản đồ ↔ Danh sách | Bài học / Lộ trình |
| Mũi tên · `Enter` | Di chuyển · Mở panel | Bản đồ, danh sách |
| `Space` · `1` `2` | Lật thẻ · Quên / Nhớ | Chỉ trong phiên ôn |

**Phím tắt**
- Không chạy khi đang gõ hoặc khi Telex/VNI đang ghép chữ.
- Nhận theo vị trí phím vật lý.

**Tương tác**
- Đổi trạng thái có hiệu lực ngay, kèm toast Hoàn tác 5 giây.
- Chỉ 1 đồng hồ chạy tại một thời điểm.
- Leitner: nhớ thì lên 1 hộp, quên thì về hộp 1.
- Tự lưu, không tải đè lên ô đang gõ.

**Accessibility (AA)**
- Chữ ≥ 4.5:1; thành phần UI ≥ 3:1.
- Trạng thái luôn có icon + chữ. Ngoại lệ duy nhất là nút bản đồ (chỉ icon + vạch); khi đó chữ trạng thái nằm trong tooltip, aria-label, panel và Chú giải.
- Focus là vòng 2px màu mực, cách mép 2px (outline-offset 2px) để vẫn thấy trên nút chính và thanh Nhóm. Có link "Chuyển tới nội dung chính". Sau khi chuyển trang, focus về H1.
- Bản đồ:
  - roving tabindex;
  - aria-label đầy đủ, vd. "Scope Creep, chủ đề, Scope Management, Đang học, đã có nội dung";
  - có Danh sách làm cách xem tương đương.
- Dialog giữ focus bên trong.
- Dùng `aria-live` cho tự lưu và toast.
- `lang="vi"` cho trang; `lang="en"` cho thuật ngữ.

## 12. Frame và cách chia lượt

**Ký hiệu:** không ghi gì = 1440px, Sáng · "375" = mobile 375px · "T" = giao diện Tối · "S+T" = vẽ cả Sáng và Tối. Bản Tối chỉ vẽ ở F01, F02, F07, F18, F24, F27. Frame có số liệu thêm "· Dữ liệu mẫu" vào tên frame.

**Ba màn quyết định chất lượng, làm kỹ nhất:** F11 Bài học, F06 Bản đồ, F03 Tổng quan.

**Chia lượt** (dừng sau mỗi lượt để người dùng duyệt). P0 = F01–F28, P1 = F29–F38. Không vẽ P2; P2 chỉ để biết hướng mở rộng (mục 9).

**Lượt 1 — Nền**
- F01 Design system S+T: token, legend, bảng kênh (5.1), tỉ lệ tương phản, chữ, khoảng cách (5.0), khung "Chú thích thiết kế" có C27.
- F02 (phần 1) Component S+T: C1, C4–C8, C10–C11, C26, C35, C36, mỗi cái đủ hover / focus / disabled / lỗi.
- F11 Scope Creep — để kiểm chứng design system trên màn thật.

**Lượt 2 — Khung và lộ trình**
- F03 Tổng quan · F04 Tổng quan 375 · F05 Lần đầu
- F06 Bản đồ ở zoom 100%, khung nhìn từ Project Governance tới Change Management, Scope Management ở giữa, Scope Creep đang chọn, panel phải mở; thêm biến thể panel lĩnh vực Scope Management
- F07 Bản đồ Scope Management, lớp phủ Độ phủ nội dung, T
- F08 Danh sách lọc ra 9 mục, chọn nhiều · F09 Danh sách 375
- F10 Lĩnh vực Scope Management
- F27 Bảng phím tắt `?` T · F28 Drawer 375

**Lượt 3 — Bài học**
- F12 Scope Creep — biến thể Đã duyệt: "Đã duyệt · có bản sửa chưa duyệt" + ô "Chưa có Tự kiểm tra — Thêm" (8.7) · F13 Scope Creep 375 có sheet trạng thái
- F14 EVM ở chế độ duyệt
- F15 Risk Register · F16 Risk Register 375 (bảng cuộn ngang, cột đầu cố định)
- F17 Salience Model · F18 Salience Model 375 T
- F19 2 dialog: Sao chép prompt soạn bài / Đã xong khi còn thiếu bước

**Lượt 4 — Nội dung, ôn tập, hệ thống**
- F02 (phần 2) Component còn lại S+T: C2, C3, C9, C12–C25, C28–C34, C37, C38
- F20 Trình soạn · F21 Nội dung: tab Độ phủ và tab Chờ duyệt · F22 Nhập (đủ 5 kết quả)
- F23 Phiên ôn · F24 Phiên ôn 375 T
- F25 Tìm kiếm "risk": nhóm Lĩnh vực — Risk Management (0/10); nhóm Mục học 7 kết quả: Risk and Issue Reports, Risk Register, Risk Identification Process, Risk and Opportunity Response Strategies, Risk Appetite, Quantitative Risk Assessment, Qualitative Risk Assessment; nhóm "Trong bài và ghi chú" thu gọn. Thêm các truy vấn "comittee" và "safe".
- F26 Hệ thống: 404, lỗi trang, lỗi đọc file, mất kết nối, skeleton, 2 toast; 404 bản 375

**Lượt 5 — P1**
- F29 Phần Business Acumen · F30 Lộ trình gợi ý · F31 Ôn tập · F32 Thống kê
- F33 Bộ hồ sơ (lưới 15 tài liệu) · F34 Chứng chỉ: danh sách 10 + trang PMP · F35 PMP 375
- F36 Tự đánh giá đầu vào · F37 Thuật ngữ · F38 Ghi chú + Cài đặt

## 13. Ngoài phạm vi và quy tắc

**Ngoài phạm vi:** đăng nhập; mạng xã hội; thanh toán; AI trong app; đồng bộ trực tiếp với roadmap.sh (chỉ xuất/nhập JSON); sửa cây; gamification; nội dung thi có bản quyền; app native; thông báo đẩy; gộp với app 24 tuần; backend.

**Quy tắc cho công cụ thiết kế**
1. Chỉ dùng tên mục có trong Phụ lục A, đúng thứ tự và đúng cấp. Các tiêu đề `##` trong Phụ lục A là 5 Phần của cây, không phải mục hướng dẫn của prompt.
2. Toàn bộ UI viết tiếng Việt, trừ tên mục và thuật ngữ PM.
3. Gắn C27 (hoặc "liên kết mẫu", "nhãn mẫu", "Đề xuất mẫu") cho mọi đoạn bài, ví dụ, câu hỏi, flashcard, giải nghĩa, chặng lộ trình, domain chứng chỉ, liên kết giữa các mục, tên cột và hàng của bảng Mẫu điền sẵn, checklist, và mục Tham khảo. Tham khảo chỉ ghi "Nguồn mẫu 1 — chưa điền", không ghi tên sách, tác giả, số trang hay URL có thật.
4. Chỉ dùng dữ liệu ở mục 7, trừ: F05 Lần đầu (0 mục đã học, 0/199 mục có nội dung), F12 (biến thể trạng thái), F36 Tự đánh giá đầu vào và các trạng thái trống hoặc lỗi; các frame này dùng đúng số ghi trong mô tả của chúng.
5. Sau mỗi lượt, liệt kê: frame đã làm, giả định mới, chỗ còn mơ hồ.
6. Khối nào ở mục 8 chưa có chữ mẫu thì dùng câu giữ chỗ mô tả khối đó, không viết kiến thức PM, không công thức, không số liệu chuyên môn. Mẫu: "[Nội dung mẫu — Khái niệm cốt lõi] Khối này liệt kê 3–5 khái niệm chính của bài, mỗi khái niệm 1–2 câu tiếng Việt." Độ dài câu giữ chỗ bằng độ dài thật dự kiến (đoạn 3–5 dòng) để thấy nhịp chữ.

## Phụ lục A — Cây chủ đề (dữ liệu thật từ roadmap.sh)

Đây là dữ liệu chuẩn duy nhất về tên mục, thứ tự và cấp bậc; chỗ nào trong prompt khác với phụ lục này thì theo phụ lục.

Nguồn: https://roadmap.sh/r/project-management-crez9 · tác giả: Bohdan Ivakhiv (PM Hood) · cập nhật roadmap: 2026-08-22 · lấy ngày 2026-10-22

> Roadmap gốc **chỉ có tên node**, không có nội dung/tài liệu cho từng chủ đề (đã kiểm tra API nội dung của cả 240 node: đều rỗng). Nội dung bài học phải tự soạn.

Ký hiệu: **[KA]** knowledge area · **[Nhóm]** topic group title · **[Tài liệu]** document/artifact · còn lại là topic. Tên sửa lỗi chính tả có ghi tên gốc trong ngoặc vuông.

## Project Management (144 mục)

- **[KA] PM Framework / Approach** (22 mục)
  - OPA
  - PMIS
  - SDLC
  - PDLC
  - EEF
  - Scrum
  - Kanban
  - Waterfall
  - Iterative approach
  - Incremental approach
  - Agile
  - Lean Principles
  - V-model
  - Discovery Phase
  - PoC
  - Feasibility Study
  - MVP
  - [Nhóm] Scaled Agile
    - Scrum of Scrums
    - SAFe
    - Nexus
    - Spotify Model
    - LeSS
- **[KA] Project Governance** (18 mục)
  - [Tài liệu] Project Charter
  - [Tài liệu] Project Management Plan
  - Project Sponsor
  - Steering Committee [gốc: “Steering Comittee”]
  - [Nhóm] PMO Types
    - Supportive
    - Controlling
    - Directive
    - Strategic
  - [Nhóm] Project Reporting
    - Project Status Report
    - Project Health report
    - Risk and Issue Reports
    - Meeting Notes
    - Decision Log
  - [Nhóm] Project Process Groups
    - Initiation [gốc: “Inititation”]
    - Planning
    - Execution
    - Monitoring and Control
    - Closure
- **[KA] Scope Management** (16 mục)
  - Definition of Ready
  - [Tài liệu] WBS + WBS dictionary
  - Scope Creep
  - [Tài liệu] Scope Statement
  - Definition of Done
  - Acceptance of deliverables
  - [Tài liệu] Scope Baseline
  - [Nhóm] Types of Requirements
    - Functional Requirements
    - Transition Requirements
    - Non-Functional Requirements
  - [Nhóm] Prioritization Techniques
    - MoSCoW
    - RICE Score
    - ICE Score
    - Value/Effort Matrix [gốc: “Value/ Effort Matrix”]
    - 100 Dollar Test
    - Eisenhower Matrix
- **[KA] Change Management** (8 mục)
  - Change Control Board (CCB)
  - [Tài liệu] Traceability Matrix
  - [Tài liệu] Change Request (CR)
  - [Tài liệu] Change log
  - Lewin's Change Management Model
  - ADKAR Model
  - Kotter's 8-Step Process
  - McKinsey 7S Framework
- **[KA] Schedule Management** (16 mục)
  - [Tài liệu] Schedule Baseline
  - Earned Value Management
  - Schedule compression (crashing, fast tracking) [gốc: “Schedule compression ( crashing, fast tracking)”]
  - Monitoring schedule performance
  - Schedule forecasting
  - Schedule creation (milestones, phases, critical path) [gốc: “Schedule creation ( milestones, phases, critical path)”]
  - Burndown/Burnup charts
  - [Nhóm] Estimation approaches
    - Use Case Points
    - T-shirt Sizing
    - Story Points Estimation / Planning Poker [gốc: “Story Points Estimation/ Planning Poker”]
    - Analogous Estimation
    - Bottom-Up / Top-Down Estimation
    - Three-Point Estimation
    - Expert Judgment
    - Wideband Delphi
    - Function Point Analysis
- **[KA] Risk Management** (10 mục)
  - [Tài liệu] Risk Register
  - PESTLE
  - Quantitative Risk Assessment
  - Risk Identification Process
  - Qualitative Risk Assessment
  - Risk and Opportunity Response Strategies
  - Risk Appetite
  - Contingency / Management Reserve Allocation
  - VUCA
  - BANI
- **[KA] Cost Management** (10 mục)
  - [Tài liệu] Cost Baseline
  - Gross Profit Margin (GPM)
  - Purchase Order / Invoice
  - How to develop project budget [gốc: “How to develope project budget”]
  - Cashflow / Revenue / Profit
  - Cost of Goods Sold (COGS)
  - CAPEX / OPEX
  - EBIT / EBITDA
  - Depreciation / Amortization
  - PnL model
- **[KA] Quality Management** (10 mục)
  - Quality metrics
  - Inspection
  - Quality control
  - Quality assurance
  - Audit
  - Cost of Quality (CoQ)
  - Six Sigma methodology
  - Total Quality Management (TQM)
  - Quality Gates [gốc: “Qaulity Gates”]
  - [Tài liệu] Quality Management Plan [gốc: “Qaulity Management Plan”]
- **[KA] People Management** (14 mục)
  - Carrying Interviews
  - Retention
  - Mentoring and professional development
  - Recognition
  - Onboarding and adaptation
  - Staffing process
  - Tuckman's Model
  - Thomas-Kilmann Conflict Management Model [gốc: “Thomas Kilmann Conflict Management Model Model”]
  - [Nhóm] Theories of Motivation
    - Alderfer’s ERG Theory
    - Maslow's Hierarchy of Needs
    - McGregor Theory
    - Herzberg's Motivation-Hygiene theory
    - Vroom’s Theory of Expectancy
    - McClelland’s Theory of Needs
- **[KA] Stakeholder and Communication Management** (9 mục)
  - Power/Interest Grid
  - Salience Model
  - Expectations Management
  - Communication Channels Matrix
  - Communication Channels Calculation
  - Stakeholder Engagement Assessment Matrix
  - [Tài liệu] Communication Management Plan
  - [Tài liệu] Stakeholder Register
  - [Tài liệu] RACI Matrix
- **[KA] Procurement Management** (11 mục)
  - Make or buy decision making
  - RFP
  - RFQ
  - RFI
  - [Nhóm] Legal Documents
    - NDA
    - MSA
    - SOW
    - SLA
  - [Nhóm] Contract Types
    - Time and Material
    - Fixed Price
    - Cost Reimbursable

## Business Acumen (17 mục)

- Sales Process
- Presales
- Business Model Canvas
- [Nhóm] Project Selection Method
  - Net Present Value (NPV)
  - Internal Rate of Return (IRR)
  - Payback Period
  - Benefit-Cost Ratio
  - Opportunity Cost Analysis
  - Strategic Alignment Matrix
  - Portfolio Balancing
  - Scoring Models
  - ROI
- [Nhóm] Client Engagement models
  - Project-Based Engagement
  - Managed Services
  - Hybrid Model
  - Dedicated Team
  - Staff Augmentation

## Technical Acumen (16 mục)

- [Nhóm] Systems engineering
  - CI/CD
  - Infrastructure management
  - Cloud overview
- [Nhóm] Data management
  - Data quality
  - Data security
- [Nhóm] QA overview
  - Test strategy/Test plan
  - Test Case management
  - Defect management
  - Automated testing & test pyramid
- [Nhóm] AI overview
  - LLMs overview [gốc: “LLMs overviwev”]
  - Prompt engineering [gốc: “Prompt engeniering”]
  - GenAI / GenAI for SDLC [gốc: “GenAI/ GenAI for SDLC”]
- [Nhóm] Development overview
  - Branching strategy
  - Code review
  - Tech debt
  - Architectural principles

## Tools (12 mục)

- [Nhóm] Interactive Boards
  - Miro
  - Mural
  - Figjam
- [Nhóm] Project Management Tools
  - MS Project
  - Primavera P6 Oracle
- [Nhóm] Task Management
  - Asana
  - Trello
  - Azure DevOps
  - Jira
- [Nhóm] Wiki & Others
  - Confluence
  - MS suite
  - Google suite

## Certifications (10 mục)

- Professional Scrum Master (PSM)
- PRINCE 2 Foundation
- Certified Associate in Project Management (CAPM)
- Professional Scrum Product Owner (PSPO)
- PRINCE 2 Practitioner
- Project Management Professional (PMP)
- Professional Scrum with Kanban (PSK)
- ITIL
- Agile Certified Practitioner (PMI-ACP®)
- SAFe

**Tổng:** 5 phần · 11 knowledge area · 21 nhóm · 184 topic · 15 tài liệu → 199 mục học (+32 node tiêu đề).
