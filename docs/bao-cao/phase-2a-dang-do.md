# Phase 2a — tạm dừng (26/10/2026)

Nhánh `wip/phase-2a` (chỉ commit ở máy, chưa push). Phase 2a = "Bài học (đọc) + trạng thái" (đề xuất mục 9).

## Đã làm

- Bước A + B (workflow): parser + mẫu bài + prompt soạn bài (`shared/noi-dung/`); lưu trạng thái học + API
  `/api/state`, `/api/trang-thai/:id`, `/api/luot-mo/:id` + lớp dữ liệu web (`src/app/du-lieu/`); API đọc bài
  `/api/bai/:id`, ảnh `/api/anh/:id`; trang bài học `/hoc/:slug` (F11 trừ cột phải, F17, F18, F19 trái, banner F26);
  bộ dữ liệu mẫu `npm run dev:mau -- --kich-ban=<mac-dinh|f12|loi-file|trong>`.
- 2 review: mã D1, D2, D8, D10, D12, D13, D14, D15, D30 đều đạt.
- Lead đã sửa: `.gitignore` / `.prettierignore` neo `/data/`, `/noi-dung/` (trước đó bỏ sót mã nguồn trong
  `shared/noi-dung`, `server/noi-dung`…); `vite.config.ts` chặn thư mục dữ liệu theo đường dẫn tuyệt đối; stub
  `server/routes/noi-dung.ts`, `server/routes/ap-dung.ts` đã gắn vào `server/app.ts`.
- 3 nhóm sửa theo review **đã xong** (chưa được kiểm độc lập):
  1. nội dung: API `/api/noi-dung/trang-thai`, YAML alias không còn 500, Khái niệm cốt lõi có đoạn mở đầu,
     prompt (khối Thông tin kỳ thi để người dùng tự điền, nhãn "Loại", "ngoài frontmatter"), regex tuyến tính,
     giới hạn 256 KB, bỏ qua khối mã rào, bản chụp duyệt đã bị thay, test bộ mẫu bỏ qua khi khác múi giờ;
  2. trang bài: test router cũ, chip nội dung ở pager + Mục liên quan, chữ thanh 4 bước không bị cắt, hoàn tác
     khi 2 lần lưu cùng lỗi, không tải lại `/api/state` thừa, màu chấm Đã xong;
  3. Áp dụng: migration 3 bảng `practice`, `PUT/DELETE /api/ap-dung/:id` (phase 2a chỉ cho Chứng chỉ), nút
     "Không áp dụng" + lý do ở khối Kế hoạch thi.

## Còn lại để xong phase 2a

1. Kiểm độc lập 3 nhóm sửa (bước "verify" bị dừng giữa chừng) + chạy `npm run check` đầy đủ.
2. Tự kiểm tra trên trình duyệt với `npm run dev:mau -- --kich-ban=mac-dinh` (F11, F17, F18 375 Tối, F19 trái) và
   `--kich-ban=loi-file` (banner F26): 1440 / 375, Sáng / Tối, bàn phím, axe.
3. Viết `docs/bao-cao/phase-2a.md`: mã D, review, **toàn văn prompt soạn bài** (`tests/noi-dung/__snapshots__/`) và
   câu chữ mới (`shared/noi-dung/thong-bao.ts`, `src/copy/cho-duyet.ts`) vào "Chờ bạn duyệt"; commit; **dừng chờ
   duyệt** (2a là điểm dừng).
