# Báo cáo bước 1 (phase 3 rút gọn) + nội dung đợt 1

Ngày 27/10/2026 · **điểm dừng chờ duyệt** (sau bước 1 và đợt nội dung đầu, theo mục 10 của đề xuất). Phạm vi đã rút
gọn: chỉ máy tính, không mobile, không đồng hồ, không bản đồ, không nhóm P1, không trình soạn trong app.

## Dùng được gì

**Học trọn một mục trên trang bài** (≥ 1024px):
- Bước **Hiểu**: khối "Nói lại bằng lời của bạn", tự lưu (C25), giữ chữ đang gõ nếu mất kết nối.
- Bước **Áp dụng**: dùng chung thẻ Thực hành cho cả 3 mẫu bài:
  - Chủ đề: "Thực hành trên dự án thật";
  - Tài liệu: ở chỗ khối "Bản của tôi" — tự làm tài liệu cho dự án thật, ghi chỗ lưu;
  - Chứng chỉ: ở chỗ khối "Kế hoạch thi" — ghi kế hoạch ôn thi;
  - mỗi thẻ có: dự án (Chứng chỉ không có), kết quả, tiêu chí tự kiểm, nút Xong / Không áp dụng (kèm lý do).
- Bước **Kiểm tra**: mỗi câu Tự kiểm tra viết câu trả lời → "Xem đáp án" (chỉ bật khi đã viết) → tự chấm Đúng / Một phần / Sai. Câu hỏi đổi chữ thì câu trả lời cũ tự nối sang câu mới khi đủ giống (Dice ≥ 0,8), không thì giữ ở "Câu trả lời cho câu hỏi cũ".
- Bước **Ghi nhớ**: flashcard tạo từ câu hỏi (điền sẵn H/Đ) hoặc "Tạo thẻ" (điền sẵn tên mục); sửa, xoá, Hoàn tác. Thẻ mới vào hộp 1, hạn ôn ngày mai.
- Thanh 4 bước: "x/4 · Tiếp: …". Đặt **Đã xong** khi còn thiếu bước thì hiện hộp F19 liệt kê bước thiếu, focus sẵn "Quay lại học tiếp".
- Chọn **Bỏ qua** có ô lý do tuỳ chọn, gợi ý các lý do đã dùng.

**Cột phải:**
- ≥ 1440: cột đọc 720 + cột phải 320; 1280–1439: 640 + 280.
- 1024–1279: không có cột phải; Mục lục và Ghi chú mở panel trượt 360px, Flashcard xuống cuối bài.
- Nội dung cột: tab Mục lục / Trong lĩnh vực (trạng thái từng mục), Ghi chú tự lưu, Flashcard.

**Đã gỡ phần bị cắt:**
- Sidebar còn 4 mục: Tổng quan · Lộ trình · Ôn tập · Nội dung.
- Không còn đồng hồ, link bản đồ ("Xem trên bản đồ" → "Xem trong danh sách"), trình soạn, trang P1.
- Bảng phím tắt bỏ các phím T / E / M.

## Kiểm tra

| Hạng mục | Kết quả |
|---|---|
| `npm run check` | xanh: 1848 test (Asia/Ho_Chi_Minh) + 72 test ngày giờ (America/Los_Angeles), chống gõ cứng 218 file, tương phản 114 cặp, bundle |
| Trình duyệt, **bài thật** | Bản app tạm (dữ liệu tạm + bản sao 17 bài) → Quét lại nhận 17 bài → Scope Creep, Scope Statement ở 1440: axe 0 lỗi, không cuộn ngang |
| Trình duyệt, bộ mẫu (agent kiểm) | Học trọn Scope Creep 4/4; Risk Register (Tài liệu) 4/4 qua thẻ Thực hành; phím 3 khi thiếu bước → F19; ghi chú còn sau khi tải lại; thẻ sửa / xoá / Hoàn tác |
| Review | 2 review + 2 vòng sửa + 2 lượt kiểm độc lập; đã sửa 24 + 11 điểm |

Trong lúc chạy, 5 test trang bị quá 5 giây do máy tải nặng (load ~9): đã nâng giới hạn thời gian test lên 20 giây.

## Nội dung đợt 1

- **17 bài** trong `noi-dung/` (~30.000 từ): cả lĩnh vực Scope Management (13 Chủ đề + 3 Tài liệu) và PMP.
- Mỗi bài có một agent soạn (tra nguồn thật trên web) và một agent soát độc lập (mở từng nguồn, đối chiếu ý chính,
  sửa tại chỗ). Cả 17 bài đều phải sửa ít nhất một chỗ (tổng cộng 66 chỗ).
- 79 nguồn đã mở kiểm; 1 link hỏng đã thay bằng bản lưu trên Internet Archive.
- Ghi chú soát từng bài: [noi-dung-dot-1.md](noi-dung-dot-1.md). Với mỗi bài có: nguồn, chỗ đã sửa, và **điểm bạn nên
  tự kiểm** (khoảng 4–6 điểm mỗi bài).
- PMP: khối ★ "Thông tin kỳ thi" để trống cho bạn tự điền (đúng prompt đã duyệt), nên bài hiện ô "Chưa có … khối bắt
  buộc".
- **Cách nhận bài vào app:** `npm run dev` → Nội dung → Nhập → **Quét lại**. Bài vào dạng Bản nháp · AI; đọc rồi duyệt
  (nút Duyệt bài có ở bước 4).

## Để lại

- Mục chưa có bài không có khối "Nói lại" (đúng F17), nên tối đa 3/4 bước. Có bài rồi thì đủ 4.
- Dòng "Checklist chất lượng" của Tài liệu được server coi là tiêu chí Áp dụng, nhưng giao diện chưa cho tick ở thẻ thực hành.
- Câu lỗi 409 khi tick tiêu chí đã bị đổi trong bài còn lộ mã khoá nội bộ.
- Nối lại câu trả lời cũ chỉ so với câu mới **chưa có câu trả lời**.
- Các gói `@codemirror/*` không còn dùng (trình soạn đã bỏ): gỡ khỏi `package.json` ở bước 6.
- Bước 2 (danh sách) phải đọc được tham số `?muc=` và `?phan=` mà các link hiện có đang dùng.

## Chờ bạn duyệt

1. **Bước Áp dụng cho Tài liệu và Chứng chỉ** (hệ quả của việc cắt "Bản của tôi" và kế hoạch thi):
   - dùng thẻ Thực hành ở đúng vị trí cũ;
   - đề bài Tài liệu: "Làm tài liệu này cho dự án thật của bạn, bằng công cụ bạn quen dùng."; Chứng chỉ: "Lên kế hoạch ôn và thi chứng chỉ này: ngày thi dự kiến, tài liệu ôn, lịch học mỗi tuần.";
   - Chứng chỉ không có ô Dự án.
2. **Lệch nhỏ so với F11**:
   - nút Xong tắt khi Kết quả còn trống;
   - "Tạo flashcard" tắt trước khi xem đáp án;
   - Sửa / Xoá thẻ dạng icon;
   - ở 1024–1279 nút Mục lục / Ghi chú nằm ở hàng breadcrumb.
3. **Câu chữ mới**, vd.:
   - "Xem trong danh sách", "Sao chép dòng lỗi" (thay "Mở trong trình soạn"), "Câu hỏi đã đổi hoặc không còn trong bài; câu trả lời của bạn vẫn được giữ.";
   - các câu lỗi server mới trong `server/du-lieu/thong-bao.ts`, vd. "Ghi “Kết quả của bạn” trước khi đánh dấu bài thực hành Xong.", "Viết câu trả lời trước khi xem đáp án.";
   - danh sách đầy đủ ở `src/copy/cho-duyet.ts` (phần phase 3).
4. **Thay đổi kỹ thuật ngoài đề xuất 2.1**:
   - bảng `deleted_rows` để Hoàn tác xoá thẻ giữ đúng id;
   - id thẻ không cấp lại sau khi xoá;
   - bảng `practice` có khoá ngoài tới dự án;
   - `self_check` lưu chữ câu hỏi để nối lại câu trả lời.
5. **Nội dung đợt 1**: đọc vài bài (gợi ý Scope Creep, MoSCoW, Scope Statement, PMP) xem giọng văn, độ dài, độ sâu có hợp
   không, rồi bảo mình **soạn tiếp 182 bài còn lại** theo cùng cách (hoặc góp ý để chỉnh prompt / cách soát trước).
6. **Mục chờ duyệt của phase 2b** (gom vào lần dừng này): xem mục "Chờ bạn duyệt" trong [phase-2b.md](phase-2b.md).

## Ảnh chụp

- `buoc-1-bai-that-scope-creep.jpg`, `buoc-1-tu-kiem-tra-cot-phai.jpg`, `buoc-1-tai-lieu-ap-dung.jpg`
