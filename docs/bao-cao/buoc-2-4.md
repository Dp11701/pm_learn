# Báo cáo bước 2–4 + nội dung đợt 2

Ngày 28/10/2026 · không phải điểm dừng (điểm dừng kế tiếp: sau bước 6). Làm gọn theo lời dặn "đừng tập trung quá vào
giao diện, bỏ hẳn mobile, tôi chỉ muốn được học": chỉ máy tính (≥ 1024px), dùng lại component có sẵn, không chỉnh
cho khớp từng pixel với frame.

## Dùng được gì

**Bước 2 — đi lại trong roadmap**
- **Tổng quan** (`/`) gồm:
  - tiến độ (% = Đã xong / (199 − Bỏ qua), mẫu số 0 thì "—") và số mục theo từng trạng thái;
  - thẻ **Học tiếp**: mục Đang học mở gần nhất, nếu chưa có thì mục đầu tiên;
  - "Thẻ cần ôn hôm nay: n" + Bắt đầu ôn;
  - dòng độ phủ nội dung, tiến độ theo từng phần;
  - banner lần đầu khi chưa có dữ liệu học;
  - banner khi có bản ghi thuộc mục không còn trong cây.
- **Lộ trình** (`/lo-trinh`):
  - cây Phần › Lĩnh vực › Nhóm › Mục; mỗi hàng có trạng thái học, loại, trạng thái nội dung, dấu Cần ôn lại;
  - chip lọc ghi vào URL: Trạng thái, Loại, Nội dung, Có ghi chú, Phần, Lĩnh vực; sắp theo cây, A–Z hoặc Mở gần đây;
  - "Đang hiển thị x/199 mục", nút Xoá bộ lọc;
  - link cũ `?muc=` (từ "Xem trong danh sách") cuộn tới, tô nổi và focus đúng hàng; `?phan=` lọc theo phần.
- **Đặt trạng thái hàng loạt**:
  - chọn bằng ô vuông hoặc Space, ↑↓ để đi giữa các mục;
  - "Đặt trạng thái…" chỉ có Chưa học / Đang học / Bỏ qua, **không có Đã xong**;
  - toast có **Hoàn tác** (trả đúng trạng thái cũ; server từ chối hoàn tác giả mạo).
- **Trang Lĩnh vực** (`/linh-vuc/:slug`): tiến độ, độ phủ, "Học tiếp trong lĩnh vực", danh sách mục (chọn nhiều được),
  Lĩnh vực trước / tiếp, link sang Lộ trình đã lọc.

**Bước 3 — Ôn tập**
- `/on-tap`: số thẻ đến hạn, phân bố hộp 1–5, tỉ lệ nhớ 30 ngày, nút Bắt đầu phiên.
- `/on-tap/phien`:
  - Space lật thẻ, **1** Quên / **2** Nhớ (lưu ngay, khoá nút khi đang lưu để không bấm đúp), Esc thoát;
  - Leitner đúng 3.5: Nhớ lên một hộp, Quên về hộp 1; hạn = ngày ôn + 1/2/4/8/16 ngày; thẻ chưa đến hạn bị từ chối (409);
  - cuối phiên có "Ôn lại n thẻ đã quên": vòng luyện thêm, không đổi hộp, không tính vào tỉ lệ nhớ.
- Sidebar: badge **Ôn tập** = số thẻ đến hạn, badge **Nội dung** = số bản nháp; 0 thì ẩn, > 99 thì "99+".

**Bước 4 — Duyệt bài gọn**
- Trên banner bản nháp của bài có nút **Duyệt bài** → hộp "Duyệt bài này?":
  - hộp ghi "Sẽ thành Đã duyệt · dd/MM/yyyy" và liệt kê khối ★ còn thiếu, nhưng vẫn cho duyệt;
  - duyệt xong có toast "Đã duyệt {tên}", không có Hoàn tác (Cần chốt 13);
  - file chỉ đổi 2 dòng frontmatter (`trang_thai_noi_dung`, `ngay_duyet`); ghi nguyên tử qua `file_ops`, có bản chụp.
- Bài đã duyệt có `.ban-sua.md` thì banner có **Duyệt bản sửa** / **Bỏ bản sửa**; bản bị thay vào `.thung-rac`.
- `/noi-dung` có 3 tab, mở mặc định ở **Chờ duyệt (n)**:
  - **Chờ duyệt**: bảng bản nháp + nhóm "Bản sửa chờ duyệt"; dòng có cảnh báo (file tự ghi Đã duyệt mà app chưa xác
    nhận) thì có link Quét lại;
  - **Độ phủ**: số tổng + theo phần / lĩnh vực;
  - **Nhập**: như cũ.

## Nội dung đợt 2

- **Đủ 199/199 mục có bài** (182 bài mới), tất cả là Bản nháp · AI; mỗi bài một agent soạn + một agent soát độc lập.
- Chi tiết, gồm nguồn, chỗ đã sửa và điểm bạn nên tự kiểm của từng bài: [noi-dung-dot-2.md](noi-dung-dot-2.md).
- **Nhận bài vào app:** `npm run dev` → Nội dung → Nhập → **Quét lại**. Rồi học, và duyệt dần từng bài bằng nút Duyệt bài.

## Kiểm tra

| Hạng mục | Kết quả |
|---|---|
| Cổng | tsc, ESLint, Prettier xanh; `npm test` 1980 test (Asia/Ho_Chi_Minh) + 94 test ngày giờ (America/Los_Angeles), chống gõ cứng OK; tương phản 114/114; build + kiểm bundle OK |
| Review | 3 góc (server/an toàn dữ liệu, hành vi web, học trọn vòng): 20 phát hiện, 0 mức cao. Sửa 16 ở vòng 1, 4 điểm còn hở + 1 việc thiếu ở vòng 2; agent độc lập kiểm lại cả hai vòng |
| E2E (agent, bộ mẫu) | Tổng quan → Học tiếp; lọc + Xoá bộ lọc + `?muc=` + `?phan=`; Bỏ qua hàng loạt 3 mục rồi Hoàn tác (Đã xong được trả lại Đã xong); phiên ôn chỉ bằng phím, vòng luyện thêm không đổi hộp; Duyệt bài → Đã duyệt ở mọi nơi, badge giảm |
| Mình tự kiểm, **bài thật** | Bản app tạm (dữ liệu trống + bản sao 199 bài): Quét lại nhận 199 bài; Duyệt bài Earned Value Management → file chỉ đổi 2 dòng frontmatter; Tổng quan "Đã duyệt 1 · Bản nháp 198"; Lộ trình lọc Chưa học + Tài liệu = 15/199; Chờ duyệt (198). Không lỗi console |

Ảnh: `buoc-2-tong-quan.jpg`, `buoc-2-lo-trinh-loc.jpg`, `buoc-4-hop-thoai-duyet.jpg`, `buoc-4-cho-duyet.jpg`.

## Để lại

- Danh sách chưa có ngữ nghĩa `role=tree` / `aria-selected` của đề xuất §5; hiện chỉ báo "Đã chọn" cho trình đọc màn hình.
- Không đọc được nội dung bản sửa trong app (banner chỉ ghi đường dẫn file).
- Cuộn tới `#flashcard` khi tải hẳn trang dựa vào một API "UNSAFE_" của React Router 7.18.4 (đã ghim phiên bản, có test bắt).
- Từ bước 1, vẫn để lại: tick "Checklist chất lượng" của Tài liệu chưa có trên giao diện; câu lỗi 409 lộ mã khoá;
  gói `@codemirror/*` thừa (gỡ ở bước 6).

## Chờ bạn duyệt

1. **Lệch so với đặc tả / frame:**
   - tab Chờ duyệt đứng đầu (là tab mặc định);
   - Độ phủ không có bảng từng mục;
   - không có nhóm "Tổng quan nháp";
   - `/on-tap` chưa có danh sách "Cần ôn lại (n)"; nút trống là "Tạo thẻ"; cuối phiên là "Về Ôn tập"; phiên ôn vẫn giữ
     sidebar;
   - "Học tiếp trong lĩnh vực" chọn mục Đang học mở gần nhất;
   - Bỏ qua hàng loạt không hỏi lý do;
   - trang Lĩnh vực không có chip lọc riêng (dẫn sang Lộ trình đã lọc).
2. **Tên app "PMP"** (bạn đã đổi): đã dùng ở logo, menu, tiêu đề tab. Còn tên cũ "Học PM A–Z" trong chữ của "Sao chép
   prompt soạn bài", gallery F01 và dòng log của server. Đổi nốt không?
3. **Câu chữ mới** ở `src/copy/cho-duyet-lo-trinh.ts`, `cho-duyet-on-tap.ts`, `cho-duyet-duyet.ts` và câu lỗi server ở
   `server/du-lieu/thong-bao-on-tap.ts`, `server/du-lieu/thong-bao-lo-trinh.ts`, `server/noi-dung/thong-bao-duyet.ts`.
   Ví dụ:
   - "Vòng luyện thêm: không đổi hộp, không tính vào tỉ lệ nhớ."
   - "Ngày nhập mới nhất trước. Mở bài, đọc hết rồi bấm “Duyệt bài” trên banner của bài."
   - "{n} bản ghi thuộc mục không còn trong cây roadmap. Dữ liệu vẫn được giữ."
   - "Chọn bằng ô vuông hoặc phím Space trên một mục; ↑ ↓ để đi giữa các mục."
4. **Nội dung đợt 2:** duyệt từng bài trong app khi học. Mỗi bài có mục "Nên tự kiểm lại" trong ghi chú soát.
