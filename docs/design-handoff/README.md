# Học PM A–Z — gói bàn giao thiết kế cho Claude Code

Web app cá nhân để tự học Project Management theo **toàn bộ** roadmap roadmap.sh (199 mục). Gói này là đầu vào để dựng UI; **không có backend**.

## Đọc theo thứ tự

1. `spec/prompt-design.md` — đặc tả gốc. **Nguồn sự thật** cho dữ liệu, quy tắc, cây chủ đề (Phụ lục A). Có xung đột thì đặc tả thắng thiết kế.
2. `tokens.css` — design token Sáng/Tối, sẵn để import.
3. `SCREENS.md` — 51 frame ↔ route ↔ file.
4. `design/*.dc.html` — mã nguồn từng frame (xem mục "Định dạng file thiết kế").
5. Mục "Quyết định đã chốt khi thiết kế" bên dưới.

## Định dạng file thiết kế

Mỗi `design/*.dc.html` là một artboard của canvas Claude Design, **không phải trang HTML chạy độc lập**:

- Markup nằm trong `<x-dc>…</x-dc>`. Toàn bộ style viết inline, nên giá trị px, màu và font là chính xác.
- Logic nằm trong `<script type="text/x-dc">` (`class Component extends DCLogic`). `renderVals()` trả về dữ liệu mẫu, còn markup đọc qua `{{hole}}`. Lặp dùng `<sc-for>`, điều kiện dùng `<sc-if>`.
- `<dc-import name="X" prop="…">` nhúng file `X.dc.html`. Thuộc tính viết kebab-case sẽ thành prop camelCase.
- `canvas.json` chứa tiêu đề và kích thước từng frame.

Hãy dùng các file này làm **đặc tả hình ảnh + dữ liệu mẫu**. Dựng lại bằng stack của dự án; không cần runtime `support.js`.

Component tái dùng nhiều nhất:

| File | Vai trò | Prop |
|---|---|---|
| `C34-sidebar` | Sidebar 264px | `active`, `firstRun`, `mobile`, `theme` |
| `C28-tim-kiem` | Popover tìm kiếm 560px | `query` |
| `F06-ban-do` | Bản đồ | `theme`, `overlay` = progress \| content, `panel` = topic \| area \| none |
| `F03-tong-quan` | Tổng quan | `firstRun` |
| `F11-scope-creep` | Bài Chủ đề | `variant` = default \| revised |
| `F21-noi-dung-do-phu` | Trang Nội dung | `tab` = do-phu \| cho-duyet \| nhap |
| `F23-phien-on` | Phiên ôn | `state` = front \| back \| end \| empty, `theme`, `mobile` |
| `F02-sang`, `F02b-sang`, `Main` (F01) | Bảng component / design system | `theme` |

## Quy tắc không được phá (tóm tắt đặc tả)

- **Mỗi kênh thị giác một nghĩa.**
  - Nền vàng / be / đen / xanh dương = loại nút.
  - Icon + vạch trái 4px + chữ = trạng thái học. Vạch trái chỉ dành cho trạng thái học, không dùng cho card hay banner.
  - Sọc chéo + `circle-slash` = Bỏ qua.
  - `file-x` / `file-pen` / `file-check` = trạng thái nội dung.
  - Glyph ↺ màu mòng két = Cần ôn lại.
  - Nét đứt = "chưa có / chờ điền".
  - Đỏ chỉ dùng cho lỗi và xoá.
- **Ba trục trạng thái độc lập:**
  - Học: Chưa học / Đang học / Đã xong / Bỏ qua.
  - Cờ Cần ôn lại: suy ra, không lưu.
  - Nội dung: Chưa có / Bản nháp (AI · Tự viết) / Đã duyệt.
- **Tiến độ trung thực:** % = Đã xong / (199 − Bỏ qua), luôn kèm phân số và số bỏ qua, vd. "19% · 37/195 · 4 bỏ qua". Không có điểm, huy hiệu hay confetti.
- **Không đặt Đã xong hàng loạt.** Thao tác hàng loạt chỉ có Chưa học / Đang học / Bỏ qua (kèm lý do).
- **App không gọi AI.** Chỉ có nút "Sao chép prompt soạn bài".
- **Không ghi đè bản Đã duyệt** khi chưa xác nhận. Bản sửa lưu thành `<slug>.ban-sua.md`.
- **Tiếng Việt và định dạng:** UI tiếng Việt, tên mục tiếng Anh có `lang="en"`. Ngày dd/MM/yyyy, giờ 24h, dấu phẩy thập phân, `tabular-nums`.
- **WCAG 2.2 AA:** focus là vòng 2px màu mực cách mép 2px. Bản đồ dùng roving tabindex và có Danh sách làm cách xem tương đương. Phím tắt không chạy khi đang gõ hoặc khi Telex/VNI đang ghép chữ.

## Lớp chú thích hồng — KHÔNG đưa vào app

Tag hồng **"Nội dung mẫu" / "liên kết mẫu" / "nhãn mẫu" / "Đề xuất mẫu"** (C27, `--annotation`) chỉ là chú thích thiết kế.

- Chữ trong ngoặc vuông như `[Nội dung mẫu — …]` là câu giữ chỗ, sẽ được thay bằng nội dung từ file `.md`.
- Trong app thật, bản nháp được báo bằng chip nội dung (C8) + banner (C26).

## Quyết định đã chốt khi thiết kế (ngoài đặc tả)

1. **Màu thanh 4 bước:** dùng màu mực, không dùng xanh lá, để khỏi lẫn với trạng thái "Đã xong".
2. **Đoạn đang chọn của segmented trạng thái:** dùng nền pill của trạng thái + viền 1,5px màu trạng thái.
3. **Đồng hồ:** chỉ một đồng hồ chạy. Trang của mục khác hiện "Đang chạy cho … · Chuyển sang mục này".
4. **Badge sidebar:**
   - Badge đặc = việc cần làm hôm nay (Ôn tập 12).
   - Badge viền = số đếm thông tin (Nội dung 9).
5. **Bản đồ ở zoom 100%:**
   - Trục dọc đặt lệch trái. Cụm lĩnh vực xếp luân phiên trái/phải. Cụm trái chỉ lộ cột trong.
   - Nhóm ở bên trái có tiêu đề canh phải, sát trục.
   - Ở lớp phủ Độ phủ nội dung, nút lĩnh vực ghi "x duyệt · y nháp" thay cho phân số tiến độ.
6. **"Xoá bộ lọc":** luôn hiện, disabled khi chưa lọc.
7. **Tự chấm Đúng / Một phần / Sai:** nút trung tính, "Sai" không dùng màu đỏ.
8. **Khối chưa soát (chế độ duyệt):** viền đậm hơn khối đã soát, không dùng nét đứt.
9. **Bảng mẫu trên mobile:** cột ID cố định, có bóng đổ khi đã cuộn.
10. **Dialog "Đã xong khi còn thiếu bước":** nút chính là "Quay lại học tiếp".
11. **Trục burnup:** 2026 có 53 tuần ISO. Dự báo "17/04/2027" = 158 mục ÷ 6,25 mục/tuần.

## Dữ liệu tự đặt (cần thay bằng dữ liệu thật)

- Bước mini của các mục Đang học; mức đậm nhạt heatmap từng ngày.
- Ngày nhập và số "Đủ khối" ở tab Chờ duyệt; "sửa lần cuối 21/10/2026" của Risk Register v0.2.
- Danh sách và ngày của ghi chú; câu trả lời mẫu ở Tự đánh giá đầu vào.
- Mức theo đuổi "Chưa chọn" của 9 chứng chỉ ngoài PMP; "Kiểm tra lần cuối 22/10/2026" ở trang PMP.

## Câu hỏi còn mở (chưa chốt với chủ sản phẩm)

- Phân số cho nhóm (vd. Prioritization Techniques 1/6): có hiện không?
- Tên cấp cha dài trên top bar mobile: cắt 1 dòng hay xuống 2 dòng?
- Màu tô bước liên quan trong dải process group (F15): màu mực hay surface-2 + viền?
- Tab Độ phủ: phân trang hay cuộn liền?
- Kiểu bộ lọc trạng thái nội dung: chip có số đếm hay dropdown?
- Frame còn thiếu: hộp thoại "rời trang chưa lưu" của Trình soạn, bước 1–4 của Thiết lập lần đầu, tab Thuật ngữ (giải nghĩa), dialog xác nhận Duyệt bài.
- Domain của chứng chỉ có cho người dùng đổi tên không?

## Gợi ý thứ tự dựng

1. Token + font.
2. Component trạng thái (C4–C8, C10, C11).
3. Khung app (C34, top bar mobile, drawer).
4. Trang bài học F11 — màn quan trọng nhất.
5. Danh sách / Lĩnh vực.
6. Tổng quan.
7. Bản đồ.
8. Nội dung (trình soạn, nhập).
9. Ôn tập.
10. Các trang P1.

Mỗi bước nên đối chiếu với frame tương ứng trong `SCREENS.md`.
