# Prompt thiết kế (rút gọn) — Học PM A–Z

Bản đầy đủ: `prompt-design.md`. Dán từ đường kẻ.

---

**Vai trò.** Bạn là product designer senior. Thiết kế design system + màn hi-fi cho "Học PM A–Z": web app cá nhân tự học Project Management theo toàn bộ roadmap https://roadmap.sh/r/project-management-crez9. Roadmap chỉ có tên mục; mỗi mục có 1 file Markdown do người dùng soạn hoặc duyệt. Mặc định 1440px, Sáng; bản 375 / Tối chỉ khi frame ghi rõ.

**Giả định:** 1 người, chạy cục bộ; không đăng nhập, mạng xã hội, thanh toán, AI trong app · Sáng / Tối / Theo hệ thống · UI tiếng Việt, tên mục giữ tiếng Anh · dd/MM/yyyy · thứ tự theo cây; "Lộ trình gợi ý" chỉ là đề xuất chờ duyệt · người học: dev lead sang PM · không điểm, huy hiệu, confetti.

**Roadmap:** 5 phần: Project Management, Business Acumen, Technical Acumen, Tools, Certifications. 11 lĩnh vực (thuộc Project Management): PM Framework / Approach, Project Governance, Scope Management, Change Management, Schedule Management, Risk Management, Cost Management, Quality Management, People Management, Stakeholder and Communication Management, Procurement Management. 21 nhóm, 184 chủ đề (10 là chứng chỉ), 15 tài liệu → 199 mục học. Chỉ dùng tên mục thật, vd.: Scrum, Scope Creep, MoSCoW, WBS + WBS dictionary, Project Charter, Change Control Board (CCB), Earned Value Management, Three-Point Estimation, Risk Register, Qualitative Risk Assessment, Power/Interest Grid, Salience Model, RACI Matrix, Net Present Value (NPV), Project Management Professional (PMP).

**Trạng thái:** học: Chưa học · Đang học · Đã xong · Bỏ qua, cộng cờ suy ra "Cần ôn lại". Nội dung: Chưa có nội dung · Bản nháp (AI / Tự viết) · Đã duyệt. Tiến độ kèm phân số: "19% · 37/195 · 4 bỏ qua". 4 bước: Hiểu → Áp dụng → Kiểm tra → Ghi nhớ.

**Thị giác:** bình tĩnh như sổ tay kỹ thuật; phẳng, viền mảnh, không minh hoạ, không emoji; tham chiếu Linear, Notion; Bản đồ mang dáng roadmap.sh. Be Vietnam Pro; h1 28/40, thân bài 17/28, UI 15/24. Khoảng cách 4·8·12·16·24·32·48; nút cao 36 (mobile 44). Mỗi kênh một nghĩa:
- Nền = loại (viền mực 1.5px): Lĩnh vực #FDE047, Chủ đề #FDE7C7 (Chứng chỉ + `award`), Tài liệu #BFDBFE, Nhóm là thanh #0F172A.
- Trạng thái học = icon + vạch trái 4px + chữ: Đang học #7E22CE, Đã xong #15803D, Bỏ qua = sọc chéo, Cần ôn lại = ↺ #0F766E; Chưa học không vạch.
- Nội dung = icon `file-x` / `file-pen` / `file-check` + chữ. Nét đứt chỉ nghĩa "chưa có".
- Token sáng/tối: bg #F8FAFC/#0B1120 · surface #FFFFFF/#111827 · text #0F172A/#E2E8F0 · muted #475569/#94A3B8 · primary = màu mực · danger #B91C1C chỉ cho lỗi, xoá. WCAG AA.

**Sitemap P0:** `/` Tổng quan · `/lo-trinh` Bản đồ | Danh sách · `/linh-vuc/:slug` · `/hoc/:slug` (+ `/soan`) · `/noi-dung` Độ phủ | Chờ duyệt | Nhập · `/on-tap/phien` · 404. Sidebar: tìm kiếm, menu, Đang học, đồng hồ, Giao diện, `?`. Mobile: top bar + drawer.

**Màn P0** (dữ liệu mẫu, ngày 22/10/2026)
- Tổng quan: Tiếp tục học Risk Register; vòng tiến độ; 5 thanh phần; 11 card lĩnh vực; 12 thẻ cần ôn; nội dung 41 duyệt · 9 nháp · 149 chưa có. Lần đầu: "0/199 mục có nội dung" + 3 nút.
- Bản đồ: trục 5 phần; lớp phủ Tiến độ học | Độ phủ nội dung; click mở panel (trạng thái, 4 bước, tóm tắt hoặc "Chưa có nội dung").
- Danh sách: cây có phân số, status pill, chip nội dung, chọn nhiều.
- Bài Chủ đề (Scope Creep): breadcrumb, segmented trạng thái, 4 bước; khối Tóm tắt · Vì sao PM cần biết · Khái niệm cốt lõi · Ví dụ · Cách áp dụng · Góc dev lead → PM · Thực hành · Tự kiểm tra · Liên quan · Tham khảo; cột phải đồng hồ, mục lục, ghi chú, flashcard.
- Bài Tài liệu (Risk Register): thêm Mẫu điền sẵn (3 hàng [Rủi ro mẫu]) và Bản của tôi (v0.2 · Đang viết); banner Bản nháp · AI.
- Chưa có nội dung (Salience Model): Soạn bài / Nhập file .md / Sao chép prompt soạn bài; khung khối nét đứt.
- Duyệt bản nháp (EVM): công tắc "Đã soát" từng khối, nút "Duyệt bài".
- Nội dung: trình soạn 3 cột; bảng nhập 5 kết quả.
- Phiên ôn: lật thẻ, Quên / Nhớ, Leitner 5 hộp.
- Hệ thống: 404, lỗi, mất kết nối, skeleton, toast có Hoàn tác. Trống hoặc lỗi luôn có 1 câu + nút.

**Frame** (375 = mobile, T = Tối; dừng sau mỗi lượt, liệt kê frame đã làm, chỗ mơ hồ)
- Lượt 1: F01 Design system S+T · F02 component chính S+T · F11 Scope Creep.
- Lượt 2: F03 Tổng quan · F04 Tổng quan 375 · F05 Lần đầu · F06 Bản đồ + panel · F07 Bản đồ lớp phủ nội dung T · F08 Danh sách lọc · F09 Danh sách 375 · F10 Lĩnh vực · F27 Phím tắt T · F28 Drawer 375.
- Lượt 3: F12 Đã duyệt có bản sửa · F13 Scope Creep 375 · F14 EVM duyệt · F15 Risk Register · F16 Risk Register 375 · F17 Salience Model · F18 Salience 375 T · F19 dialog.
- Lượt 4: F20 Trình soạn · F21 Độ phủ + Chờ duyệt · F22 Nhập · F23 Phiên ôn · F24 Phiên ôn 375 T · F25 Tìm kiếm "risk" · F26 Hệ thống.

**Quy tắc nội dung:** không viết kiến thức PM thật. Mọi đoạn bài, ví dụ, câu hỏi, flashcard, bảng mẫu, Tham khảo là chữ mẫu, gắn tag hồng "Nội dung mẫu" (lớp chú thích, không phải UI app). Khối chưa có chữ dùng câu giữ chỗ "[Nội dung mẫu — <tên khối>] Khối này …"; Tham khảo ghi "Nguồn mẫu 1 — chưa điền".
