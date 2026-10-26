# Báo cáo phase 2b — Đưa nội dung vào

Ngày 26/10/2026 · không phải điểm dừng (điểm dừng kế tiếp: sau phase 3).

## Dùng được gì

- **Luồng chính:**
  1. Nhờ Claude soạn bài bằng prompt (phase 2a); Claude ghi file `.md` vào `noi-dung/` (hoặc bạn lưu tay).
  2. Mở **Nội dung → Nhập**: app báo "Có n file chưa nhận", bấm **Quét lại**.
  3. Bài hiện thành **Bản nháp · AI**, kèm banner "Bản nháp do AI soạn — chưa được bạn duyệt, có thể sai."
  4. Có toast "Đã nhập n file" + **Hoàn tác**.
- **Kéo thả** file hoặc cả thư mục `.md` (hoặc "Chọn file…" / "Chọn thư mục…"). App kiểm tra trước khi ghi, rồi hiện bảng kết quả F22:
  - ✓ Hợp lệ · ⚠ Thiếu khối bắt buộc · ⚠ Không khớp mục (có "Gán cho mục…") · ⟳ Trùng bản đã duyệt ("Giữ bản cũ" / "Nhập thành bản sửa") · ◎ Đã duyệt nhưng app chưa có bản chụp (tick "Nhận là Đã duyệt") · ✕ Lỗi frontmatter;
  - dòng tóm tắt "a hợp lệ · b cảnh báo · c trùng · d lỗi" và nút "Nhập n file".
- **Khớp file với mục:**
  - theo `id`;
  - theo tên file (kể cả tên gốc gõ sai, vd. `steering-comittee.md`);
  - theo độ giống: chỉ gán sẵn khi chắc chắn (≥ 0,7 và hơn ứng viên thứ hai 0,1), không thì gợi ý tối đa 3.
- **An toàn dữ liệu:**
  - ghi file nguyên tử, có nhật ký `file_ops`: tắt ngang giữa chừng thì khởi động lại chạy tiếp, không hỏng;
  - mọi bản bị thay đều vào `noi-dung/.thung-rac/`, không xoá hẳn;
  - **không bao giờ ghi đè bài Đã duyệt**: sửa thì thành `<slug>.ban-sua.md`;
  - tự sao lưu trước mỗi lần nhập.
- **App tự nhận ra thay đổi ngoài app** (quét nhẹ mỗi 5 giây):
  - file mới chưa nhận;
  - bản nháp bị xoá;
  - bài đã duyệt bị sửa ngoài app (hiện bản đã duyệt + banner);
  - file bị đổi tên hoặc chuyển chỗ (Quét lại nhận ra theo nội dung, tự đưa về đúng chỗ).
- **Thay file cây roadmap** (bản mới từ roadmap.sh), khi khởi động:
  - tự sao lưu;
  - chuyển file sang đường dẫn mới;
  - giữ link cũ (`slug_cu`);
  - mục bị bỏ thành mồ côi, dữ liệu giữ nguyên;
  - báo "+a mục, −b mục, c mục đổi tên".

## Kiểm tra

| Hạng mục | Kết quả |
|---|---|
| `npm run check` | xanh: tsc, ESLint, Prettier, 1595 test (Asia/Ho_Chi_Minh) + 46 test ngày giờ (America/Los_Angeles), chống gõ cứng 184 file, tương phản 114 cặp, bundle |
| Luồng thật (bộ mẫu) | Ghi `risk-appetite.md` (không `id`) vào thư mục nội dung → meta `chuaNhan: 1` → banner "Có 1 file chưa nhận" → Quét lại → toast "Đã nhập 1 file" + Hoàn tác → bài hiện Bản nháp · AI, khối thiếu "Tự kiểm tra" là ô nét đứt |
| Trình duyệt | Tab Nhập 1440 Sáng, 375 Tối: axe 0 lỗi, không cuộn ngang |
| Lô F22 (test) | 15 file → 11 hợp lệ · 2 cảnh báo · 1 trùng · 1 lỗi → "Nhập 13 file"; `risk-registr` gán sẵn Risk Register (0,87); `risk-assessment` không gán sẵn (0,700 / 0,683) |
| Độ bền | Ngắt tiến trình ở hơn 11 điểm trong `file_ops` rồi chạy tiếp → kết quả như chạy một mạch. Path traversal, symlink, tên lạ, giới hạn 256 KB / 250 file / 16 MB, token hết hạn, nhập đồng thời: có test |

**Mã D:** D21 — chữ "Hợp lệ" màu chữ thường + glyph (không dùng màu Đã xong), tên lĩnh vực đầy đủ.

## Review

- 2 agent review độc lập: 23 phát hiện (4 cao), đã sửa hết. Agent kiểm độc lập xác nhận 22/23; mục còn lại là viết báo cáo này. Lỗi cao:
  - web bỏ mất trường `noiDung` của `/api/meta`, nên banner "Có n file chưa nhận" không hiện;
  - **Hoàn tác** một lần nhập có nội dung trùng file đã có lại chuyển file có sẵn vào thùng rác (mất bản nháp cũ);
  - test router cũ.
- Lỗi vừa, đã sửa:
  - Hoàn tác lô có "Nhập thành bản sửa" bị từ chối;
  - dòng ⟳ hiện lại mãi khi chỉ chọn "Giữ bản cũ";
  - Quét lại chỉ tin mtime + size, bỏ lỡ sửa giữ nguyên kích thước.
- Còn 1 lỗi nhỏ để lại: một bản sửa `<slug>.ban-sua.md` viết tay, không có `id`, khớp theo đường dẫn, thì "Giữ bản cũ" không chuyển nó vào thùng rác. Sẽ sửa ở phase 7a, khi làm bản sửa đầy đủ.

## Chờ bạn duyệt

1. **Lệch so với F22 / đề xuất**:
   - (a) Nhập xong, trang hiện khung "Vừa nhập" ngay tại tab Nhập thay vì chuyển sang tab Chờ duyệt (đề xuất 1.7 bước 4), vì tab Chờ duyệt có ở phase 7a.
   - (b) Dòng Không khớp mục đã được gán sẵn thì cột Mục hiện tên mục; F22 vẽ "—".
   - (c) Thêm nút "Chọn thư mục…" cạnh "Chọn file…".
   - (d) `/noi-dung` không có `?tab=` thì mở tab Nhập, cho tới phase 7a.
   - (e) ◎ dùng ô tick "Nhận là Đã duyệt" ở từng dòng + nút "Nhập n file".
   - (f) "Mở trong trình soạn" (file lỗi) dẫn tới trang chờ của phase 7b; nội dung file được giữ trong bộ đệm.
   - (g) Banner "Quét lại để kiểm tra" ở trang bài mở tab Nhập và **tự chạy Quét lại** (`?quet=1`).
2. **Quyết định đề xuất chưa nói rõ**:
   - Quét lại tối đa 3 cấp thư mục và 2.000 file, vượt thì báo lỗi.
   - Chỉ quét đuôi `.md` viết thường.
   - Hoàn tác một lần nhập cũng gỡ các bản chụp "Nhận là Đã duyệt" mà lần đó tạo.
   - File mới ghi lấy ngày nhập hôm nay; file chỉ chuyển chỗ giữ ngày cũ.
   - DB nâng cấp từ 2a tự nhận các file đang nằm đúng chỗ; DB mới tinh thì phải Nhập / Quét lại.
3. **Câu chữ mới**:
   - 26 thông báo nhập trong `server/nhap/thong-bao.ts`;
   - 25 thông báo nội dung trong `server/noi-dung/thong-bao.ts`, vd. "Không ghi đè bài Đã duyệt “…”: sửa bài đã duyệt phải ghi vào bản sửa (.ban-sua.md).", "Thư mục nội dung có hơn 2.000 file .md — Quét lại dừng…", "Không hoàn tác được: file đã được đổi bởi một thao tác sau.";
   - khoảng 35 câu UI trong `src/copy/cho-duyet.ts` (phần phase 2b): vùng thả file, lý do không nhận file, ghi chú trên bảng, toast "Đã nhập n file", "Vừa nhập", hộp "Gán cho mục…".

## Ảnh chụp

- `phase-2b-f22-co-file-chua-nhan.jpg`, `phase-2b-sau-quet-lai-ban-nhap.jpg`, `phase-2b-f22-375-toi.jpg`
