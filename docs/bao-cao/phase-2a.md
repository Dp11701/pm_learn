# Báo cáo phase 2a — Bài học (đọc) + trạng thái

Ngày 26/10/2026 · **điểm dừng chờ duyệt** (đề xuất mục 8 điểm 9). Mục chính cần duyệt là **prompt soạn bài**, vì
bạn sẽ dùng nó để nhờ Claude soạn bài thật. Phase 2b chỉ bắt đầu khi bạn duyệt.

## Dùng được gì

- Trang bài `/hoc/:slug` cho cả 3 mẫu (Chủ đề, Tài liệu, Chứng chỉ). Phần đầu bài gồm:
  - breadcrumb có menu ▾, chip loại, chip nội dung;
  - H1 kèm giải nghĩa, dòng "Tên gốc trên roadmap" khi mục có tên gốc;
  - segmented trạng thái học (phím `1`–`4`, toast Hoàn tác);
  - dải vị trí "Mục 3/16 · …", "Xem trên bản đồ", "Soạn";
  - thanh 4 bước ở trạng thái ban đầu.
- Thân bài:
  - các khối theo đúng thứ tự mẫu;
  - khối bắt buộc còn thiếu hiện ô nét đứt "Chưa có … — khối bắt buộc, bài vẫn đọc được.";
  - callout "Góc dev lead → PM", thẻ thực hành, câu tự kiểm tra (chỉ đọc), khái niệm có đoạn mở;
  - "Mục liên quan" lấy từ `lien_quan`;
  - pager Trước/Tiếp (phím `[` `]`) bỏ qua mục Bỏ qua, ghi rõ ranh giới khi sang lĩnh vực / phần khác; mục cuối ghi "Đây là mục cuối cùng của roadmap";
  - pager và Mục liên quan đều có chip trạng thái nội dung của mục đích.
- **Mục chưa có nội dung** (F17, F18): giữ đủ phần đầu bài, khung các khối của mẫu ở dạng nét đứt, 3 nút "Soạn bài" / "Nhập file .md" / **"Sao chép prompt soạn bài"** (F19).
- **Chứng chỉ:** khối "Kế hoạch thi của tôi" có nút **"Không áp dụng"** kèm lý do, thanh 4 bước cập nhật ngay (đề xuất yêu cầu ở 2a). Chứng chỉ chưa có bài cũng đánh dấu được.
- **Bảo vệ bài Đã duyệt khi đọc** (1.6):
  - bài Đã duyệt chỉ hiện "Đã duyệt" khi file khớp bản chụp lúc duyệt;
  - file đổi ngoài app → hiện bản chụp + banner;
  - file ghi Đã duyệt mà app chưa có bản chụp → hiện là Bản nháp + banner;
  - frontmatter lỗi → banner F26 có số dòng, bài vẫn đổi được trạng thái.
- Sidebar "Đang học", tìm kiếm và breadcrumb dùng trạng thái học thật.
- Bộ dữ liệu mẫu: `npm run dev:mau -- --kich-ban=mac-dinh | f12 | loi-file | trong` (web 5322, API 5323, dữ liệu trong `.mau/`, không đụng dữ liệu thật).
- API mới:
  - `GET /api/state`, `PUT /api/trang-thai/:id`, `POST /api/luot-mo/:id`;
  - `GET /api/bai/:id`, `GET /api/anh/:id`, `GET /api/noi-dung/trang-thai`;
  - `GET/PUT/DELETE /api/ap-dung/:id`.

## Kiểm tra

| Hạng mục | Kết quả |
|---|---|
| `npm run check` | xanh: tsc, ESLint, Prettier, 1403 test (Asia/Ho_Chi_Minh) + 46 test ngày giờ (America/Los_Angeles), chống gõ cứng 151 file, tương phản 114 cặp, bundle không có `/_dev` hay chữ mẫu |
| Trình duyệt (bộ mẫu) | F11 Scope Creep 1440 Sáng; F17 + F19 Salience Model 1440; F18 375 Tối; F26 (`loi-file`) Change log. axe 0 lỗi, không cuộn ngang. Đổi trạng thái → toast → Hoàn tác, server đúng |
| An toàn | path traversal, symlink, `.md` chứa `<script>` / `javascript:` / ảnh ngoài thư mục, YAML alias, file > 256 KB, dòng 200 KB toàn khoảng trắng: có test |

## Mã D

| Mã | Đã làm |
|---|---|
| D1 | Chip nội dung luôn có icon; "Đã duyệt · dd/MM/yyyy" |
| D2 | Pill / chip trong bài: icon + chữ |
| D8 | F17/F18 giữ đủ phần đầu bài; Kiểm tra dùng biến thể "không áp dụng · chưa có câu hỏi" (chữ không bị cắt) |
| D10 | Một breadcrumb C12; menu: mục có icon trạng thái, lĩnh vực/nhóm có phân số; chấm dải vị trí là icon 14px |
| D12 | Nhãn pager "‹ Trước — sang lĩnh vực trước: …" / "Tiếp — sang lĩnh vực mới: … ›" |
| D13 | Khối 7 nhận "So sánh" / "Thuật ngữ" / "Thực hành công cụ" |
| D14 | Prompt mới: khung frontmatter, chỉ `lien_quan`, quy ước `###`; snapshot cho Salience Model, Risk Register, PMP |
| D15 | Mục lục dựng từ các khối thực sự hiện (dữ liệu sẵn cho cột phải ở phase 3) |
| D30 | Thẻ mục cuối viền liền; C26 biến thể lỗi |

## Review

- 2 agent review độc lập. 2 lỗi chặn đều đã sửa:
  - `.gitignore` từ phase 0 ghi `noi-dung/`, `data/` không có `/` đầu, nên bỏ sót cả mã nguồn trong `shared/noi-dung`, `server/noi-dung`…; `.prettierignore` và `fs.deny` của Vite mắc cùng lỗi;
  - test router cũ còn chờ trang giữ chỗ.
- 5 lỗi vừa, đã sửa:
  - pager / Mục liên quan thiếu chip nội dung;
  - thiếu nút "Không áp dụng" cho Kế hoạch thi;
  - prompt bảo AI tự điền "Thông tin kỳ thi";
  - khái niệm có đoạn mở bị coi là sai quy ước;
  - YAML alias làm API lỗi 500.
- Lỗi nhỏ, đã sửa:
  - chữ thanh 4 bước bị cắt;
  - hoàn tác sai khi 2 lần lưu liên tiếp cùng lỗi;
  - tải lại `/api/state` thừa;
  - regex chậm trên dòng dài;
  - giới hạn 256 KB;
  - khối mã rào trong danh sách;
  - test bộ mẫu theo múi giờ.
- 2 lượt kiểm độc lập sau khi sửa: 18/20 rồi 5/5; mỗi lỗi có test hồi quy đỏ trên mã cũ.

## Để lại

- Khung bài trống của Chứng chỉ / Tài liệu ghi "0/7", "0/8 khối bắt buộc", có tính cả khối do app tạo.
- Trang Chứng chỉ tải lại `/api/ap-dung` sau mỗi lần chính tab ghi trạng thái học (thừa, không sai).
- Chứng chỉ có file lỗi frontmatter thì chỉ hiện banner F26, chưa đánh dấu "Không áp dụng" được tới khi sửa file (theo F26).
- Chip nội dung chưa tự cập nhật khi file đổi trên đĩa: phase 2b có lượt quét nhẹ.
- "Đã xong, sang bài tiếp" và phím `3` đặt Đã xong ngay; hộp xác nhận F19 phải ("Đã xong khi còn thiếu bước") ở phase 3. Nút "Soạn" chưa có gợi ý phím `E` (phím chạy từ phase 7b).
- Bundle JS 904 kB (Vite cảnh báo > 500 kB): tách chunk khi có trang nặng (bản đồ, trình soạn).

## Chờ bạn duyệt

1. **Prompt soạn bài** — toàn văn ở `tests/noi-dung/__snapshots__/prompt-salience-model.txt` (Chủ đề), `prompt-risk-register.txt` (Tài liệu), `prompt-pmp.txt` (Chứng chỉ). Nội dung chính:
   - **Bối cảnh:** người học là dev lead chuyển sang PM, có dự án thật; bài là bản nháp, người học tự soát và duyệt.
   - **Mục cần soạn:** tên, tên gốc (nếu có), vị trí, loại, đường dẫn file.
   - **Frontmatter:** `id`, `loai`, `trang_thai_noi_dung: ban-nhap`, `nguon: ai`, `giai_nghia`, `lien_quan` (2–5 slug); Tài liệu thêm `process_group`.
   - **Khối `##`:** đúng danh sách và thứ tự của mẫu, ★ là bắt buộc, mỗi khối có gợi ý độ dài / cách viết.
   - **Quy ước viết:** `H: … | Đ: …`, `**Thuật ngữ** — …`, `- [ ]`, `###` đúng tên.
   - **Yêu cầu:**
     - tiếng Việt, giữ thuật ngữ tiếng Anh;
     - **không bịa sự kiện, số liệu, trích dẫn, tên người, nguồn**;
     - chỉ ghi nguồn có thật ở Tham khảo;
     - ví dụ là giả định;
     - không HTML / ảnh.
   - **Cuối prompt:** danh sách slug mọi mục, để `lien_quan` đúng chính tả.
   - **Quyết định của mình:**
     - câu mở đầu ghi "roadmap quản lý dự án (PM) của roadmap.sh", vì máy quét chặn tên nút "Project Management" trong code;
     - không yêu cầu flashcard, vì flashcard là dữ liệu học (Cần chốt 5);
     - Chứng chỉ: khối "Thông tin kỳ thi" để bạn tự điền, AI không đặt trường hay giá trị;
     - Tài liệu: "Mẫu điền sẵn" xin 3 hàng ví dụ giả định;
     - prompt dài khoảng 9–10 KB (riêng danh sách slug khoảng 5 KB).
2. **Quy tắc đọc file bài** (chỗ đề xuất chưa nói rõ):
   - Thiếu `trang_thai_noi_dung`: cảnh báo, coi như Bản nháp. Thiếu `nguon`: coi như AI.
   - Lỗi chặn đọc bài:
     - YAML hỏng;
     - khoá lặp;
     - thiếu / sai `loai`, hoặc `loai` khác mẫu của mục;
     - `da-duyet` thiếu `ngay_duyet`;
     - alias YAML trỏ vòng hoặc dùng quá 10 lần;
     - file > 256 KB.
   - `id` khác mục chỉ là cảnh báo.
   - Chỉ câu hỏi sai dạng `H:|Đ:` làm khối không tính vào "Đủ khối". Các sai quy ước khác chỉ cảnh báo và hiện như Markdown thường.
   - "Nhật ký thi thử" (P2) xếp là khối do app tạo, vì là dữ liệu của người học.
   - Khái niệm nhận cả `—`, `–` và ` - `. CSV thêm tiền tố `'` cho cả ô bắt đầu bằng CR. Ảnh nằm trong thư mục bắt đầu bằng `.` hoặc `~` bị chặn.
   - Mục chỉ còn bản chụp duyệt cũ (đã bị thay) mà file vẫn ghi `da-duyet`: hiện Bản nháp + banner "File đã đổi ngoài app — Quét lại để kiểm tra".
3. **Làm sớm hơn kế hoạch:** bảng `practice` (migration 3) và API "Không áp dụng". Ở 2a chỉ Chứng chỉ dùng được; phase 3 mở cho Chủ đề / Tài liệu.
4. **Câu chữ mới:**
   - 48 thông báo của parser trong `shared/noi-dung/thong-bao.ts`, vd. "frontmatter không đọc được (lỗi cú pháp YAML)", "khối … thiếu “### …”", "Liên quan: không tìm thấy …", "file … KB, vượt giới hạn 256 KB của một bài — app không đọc file này".
   - Khoảng 22 câu UI mới trong `src/copy/cho-duyet.ts`, vd. "Đã sao chép prompt soạn bài.", "Không sao chép tự động được — prompt đã được chọn sẵn, nhấn ⌘C hoặc Ctrl+C để sao chép.", "Ô trả lời, Xem đáp án và tự chấm có ở phase 3.", "Đánh dấu Không áp dụng", "Bước Áp dụng của chứng chỉ này được tính là xong mà không cần kế hoạch thi. Bỏ đánh dấu được bất cứ lúc nào.", "Ghi lý do để đánh dấu Không áp dụng."

## Ảnh chụp

- `phase-2a-f11-scope-creep.jpg`, `phase-2a-f11-lien-quan-pager.jpg`, `phase-2a-f19-prompt.jpg`
- `phase-2a-f18-375-toi.jpg`, `phase-2a-f26-loi-file.jpg`
