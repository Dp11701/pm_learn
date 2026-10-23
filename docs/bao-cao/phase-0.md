# Báo cáo phase 0 — Nền móng

Ngày 23/10/2026 · commit `aeb047d` · không phải điểm dừng chờ duyệt (điểm dừng kế tiếp: sau phase 1).

## Dùng được gì

- `npm install && npm run dev` → web http://127.0.0.1:5320 (trang tạm), API http://127.0.0.1:5321.
- `/_dev/thanh-phan`: design system F01 dựng bằng token thật, đổi Sáng / Tối / Theo hệ thống không nháy.
- `/_dev/frame/<mã>`: xem 51 frame thiết kế (dựng bằng `npm run frame -- --tat-ca`, 51/51 đủ).
- `GET /api/meta` → `{ revision, now, homNay, soMucHoc: 199 }`; DB `data/hoc.db` tự tạo, tự sao lưu mỗi ngày.

## Kiểm tra

| Hạng mục | Kết quả |
|---|---|
| `npm run check` | xanh: tsc, ESLint, Prettier, 417 test (Asia/Ho_Chi_Minh) + 46 test ngày giờ (America/Los_Angeles), chống gõ cứng, 46 cặp tương phản, bundle |
| Chống gõ cứng | 35 file, 236 nút, 52 cụm cấm: 0 vi phạm |
| Bundle production | không có `/_dev`, không có chữ mẫu |
| Trình duyệt F01 | 1440, 1024 và 375, Sáng và Tối; đổi giao diện bằng phím mũi tên; axe 0 lỗi cả 2 giao diện; không cuộn ngang; console sạch; tải lại giữ giao diện |
| Mã D | phase 0 không có mã D |

## Review chéo (2 agent độc lập) — đã sửa

| Mức | Vấn đề | Đã làm |
|---|---|---|
| Cao | `xem-frame` chạy mã của file thiết kế (tải về) trong `node:vm` nhưng thoát ra được tới `process` | Ngữ cảnh global nguyên mẫu null, cấm eval/Function, microtask chịu giới hạn thời gian, dữ liệu chỉ qua JSON; test thử 5 cách thoát |
| Trung bình | Vite dev server phục vụ `data/hoc.db`, `noi-dung/` từ thư mục gốc, CORS mở cho localhost | `server.fs.deny` cho `data/`, `noi-dung/`, `.mau/`, `*.db`; tắt CORS; đã kiểm bằng curl (403) |
| Trung bình | Trang frame dựng ra giữ `<script>`, `on*`, chạy trong iframe cùng origin | Bỏ script/iframe/object/embed/base, thuộc tính `on*`, URL `javascript:`; iframe `sandbox` không cho chạy script |
| Trung bình | `npm run check` đỏ vì Prettier; `tokens.css` bàn giao bị định dạng lại | `tokens.css` giữ nguyên văn bản bàn giao (bỏ qua Prettier) |
| Trung bình | Mẫu số 0 hiện "0%" (đề xuất 3.3 là "—") | Hiện "—" |
| Trung bình | Kiểm bundle chưa nằm trong cổng kiểm tra | `npm run test:bundle`, gắn vào `npm run check` |
| Nhỏ | Sao lưu theo sự kiện đẩy mất bản hằng ngày; parser 1 MB chặn `/api/nhap` 16 MB sau này; ghi `cay_sha` trước khi kiểm cây; lệnh chạy qua symlink không chạy; `Date()` lọt lint; `congNgay(NaN)`; Alt/Ctrl/⌘ + mũi tên bị nuốt ở nút Giao diện; cảnh báo HydrateFallback | Đã sửa, có test |

## Để lại cho phase sau

- Trang "Không đọc được cây roadmap" + "Thử lại" (bất biến 1): làm cùng error boundary ở phase 1. Cây nằm trong bundle nên "Thử lại" là tải lại trang.
- Token thêm còn lại của 1.2 (~13 token): thêm theo component ở phase 1 trở đi (D22).
- Máy quét chống gõ cứng không bắt chuỗi ghép bằng `+` hay `join` — giới hạn có chủ đích, đã ghi trong script.

## Chờ bạn duyệt

1. **Danh sách viết tắt**: quy tắc ở 1.8 áp lên cây cho **51** viết tắt, không phải 20 như đề xuất liệt kê. 31 cái thêm là tên vốn là viết tắt (OPA, PMIS, SDLC, PDLC, EEF, MVP, PESTLE, VUCA, BANI, RFP, RFQ, RFI, NDA, MSA, SOW, SLA, ROI, CI/CD, ITIL) và dạng "Tên (VIẾT TẮT)" (CCB, CR, GPM, COGS, TQM, NPV, IRR, PSM, CAPM, PSPO, PMP, PSK). Mình giữ đủ 51 vì §6.3 cần gõ "ccb" ra Change Control Board. Danh sách chính thức gửi duyệt ở phase 4 như kế hoạch.
2. **`foldVi`** xoá dấu nháy `'` `’` và `®` thay vì đổi thành khoảng trắng như 1.8 ghi, để "Lewin's" khớp "lewins" giống quy tắc slug.
3. **Sao lưu "14 bản mỗi loại"**: hiểu là 14 bản hằng ngày, và 14 bản riêng cho từng lý do (trước migration, nhập JSON, đặt lại, thay cây).
4. **Câu chữ mới** (thông báo API và log server):
   - "Địa chỉ máy chủ (Host) không được phép." · "Trang gửi yêu cầu (Origin) không được phép."
   - "Dữ liệu gửi lên quá lớn (tối đa N MB)." · "Dữ liệu gửi lên không phải JSON hợp lệ." · "Yêu cầu không hợp lệ."
   - "Không có API {phương thức} {đường dẫn}." · "Không tìm thấy trang này trên máy chủ API."
   - "Máy chủ gặp lỗi. Thử lại sau; nếu vẫn lỗi, xem log của server."
   - "Cổng {n} đang bận. Tắt tiến trình đang dùng cổng (lsof -i :{n}) hoặc đặt CONG_API khác."
   - "DB ở phiên bản {a}, mới hơn app ({b}). Hãy cập nhật app trước khi mở DB này."
   - Trang tạm: "Đang dựng nền móng (phase 0). Khung app có từ phase 1." (thay ở phase 1).
5. **Token thêm**: `--surface-dialog` (Sáng #FFFFFF / Tối #1E293B) và `--st-skip-solid` (chỉ cho ô màu mẫu ở F01; trên UI Bỏ qua luôn là sọc).
6. **Sửa số liệu đề xuất**: có 11 tên chứa `'` `’` `®` `&` (10 mục học + nhóm "Wiki & Others"), đề xuất ghi 10.

## Ngoài repo

- Tạo `~/workspace/pm/.claude/launch.json` để trình duyệt trong Claude chạy được `npm run dev` của app.

## Ảnh chụp

- `phase-0-f01-toi-1440.jpg`, `phase-0-f01-sang-1024.jpg`, `phase-0-f01-toi-375.jpg`
