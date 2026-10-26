# Báo cáo phase 1 — Component + khung app

Ngày 26/10/2026 · **điểm dừng chờ duyệt** (theo đề xuất mục 8 điểm 9). Phase 2a chỉ bắt đầu khi bạn duyệt
mục "Chờ bạn duyệt" bên dưới.

## Dùng được gì

- Khung app tiếng Việt đủ 4 bề rộng:
  - ≥ 1280: sidebar C34 264px;
  - 1024–1279: rail 72px;
  - < 1024: top bar mobile + drawer 312px.
- Đi được mọi route của đặc tả (P0 + P1 + route thêm ở 4.1). Trang chưa tới phase hiện "Có ở phase n" kèm
  một nút đi tiếp. Slug sai thì ra 404 có gợi ý mục gần nhất.
- Đổi giao diện Sáng → Tối → Theo hệ thống ở chân sidebar.
- `?` mở bảng phím tắt F27; `/` mở tìm kiếm tối giản (chỉ Mục học, đúng thứ tự F25); Enter mở mục, focus về H1.
- Mất kết nối API: banner dính đầu trang, tự thử lại mỗi 5 giây, có nút "Thử ngay"; kết nối lại thì có toast.
- Gallery dev: `/_dev/thanh-phan` (F01), `/f02`, `/f02b` dựng bằng component thật.
- Component có sẵn cho các phase sau:
  - chung: C25 tự lưu, C26 banner, C32 dialog / sheet, C33 toast, C35 nút, C36 ô nhập + ngày dd/MM/yyyy, C38 trống / lỗi / skeleton;
  - trạng thái: C4 chip loại, C5 pill, C6 segmented, C7 badge, C8 chip nội dung, C10 thanh 4 bước, C11 tiến độ, icon trạng thái.

## Kiểm tra

| Hạng mục | Kết quả |
|---|---|
| `npm run check` | xanh: tsc, ESLint, Prettier, 937 test (Asia/Ho_Chi_Minh) + 46 test ngày giờ (America/Los_Angeles), chống gõ cứng (96 file), tương phản 114 cặp, bundle không có `/_dev` |
| Trình duyệt | 1440 (sidebar), 1100 (rail), 900 (top bar), 375 (mobile + drawer); Sáng và Tối; axe 0 lỗi trên Tổng quan, trang mục, 404, drawer, gallery F02; không cuộn ngang; console sạch |
| Bàn phím | Link "Chuyển tới nội dung chính" là phần tử đầu tiên; `?`, `/`, Esc, ↑/↓/Enter trong tìm kiếm; drawer giữ focus; đóng dialog trả focus; chuyển trang focus về H1 |
| Mất kết nối | Giả lập API lỗi: banner đúng câu F26, kết nối lại có toast "Đã kết nối lại với máy chủ cục bộ." |

Công cụ trình duyệt của mình gửi phím `/` và `?` không kèm `e.code`, nên mình thử hai phím này bằng sự kiện có
`code` thật. Test tự động cũng kiểm phím theo `e.code` và theo trường hợp đang ghép chữ Telex.

## Mã D

| Mã | Đã làm |
|---|---|
| D4 | Chân sidebar ghim đáy; mục đang mở nền mực + `aria-current` |
| D5 | Giao diện Sáng → Tối → Theo hệ thống, mặc định Theo hệ thống |
| D6 | Một top bar mobile: menu trái, tiêu đề hoặc "‹ cấp cha", tìm, chỗ chip đồng hồ |
| D17 | Nút / ô 36 (mobile 44), chip 24, segmented 36/44, H1 28/40 (mobile 24/34) |
| D18 | Vòng focus 2px màu mực cách mép 2px; `.focus-trong` cho hàng full-width |
| D22 | Token mới gộp vào `tokens-them.css`, có giá trị Tối, có trong cổng tương phản; không hex trong TS/TSX |
| D23 | Toast theo F26: 5 giây, dừng đếm khi rê chuột / focus, tối đa 2, không đè sidebar / rail |
| D24 | 404 có H1, trong khung app, nút phụ "Về Tổng quan" |
| D30 | Banner lỗi: nền surface-2, viền 1px danger, icon màu danger, không vạch trái |
| D33 | Chip chứng chỉ: màu Chủ đề + icon award + "Chứng chỉ" |
| D35 | 404 mobile lề 16 |

## Review chéo

- 2 agent độc lập review: 1 lỗi cao, 7 lỗi vừa và khoảng 20 lỗi nhỏ.
- Đã sửa hết; agent thứ 3 kiểm lại từng lỗi, 23/23 có bằng chứng.
- Chính:
  - **Cao — vòng focus trong toast không thấy:** luật focus chung nằm ngoài cascade layer nên thắng mọi tiện ích. Đã chuyển vào `@layer base`, có test dựng CSS thật.
  - **Vừa:**
    - toast đè chân sidebar / rail;
    - thiếu 3 route (`/linh-vuc/:slug/soan`, `/phan/:slug/soan`, `/hoc/:slug/ban-cua-toi/:id`);
    - cổng tương phản bỏ sót token mới;
    - Lùi/Tiến làm mất focus;
    - focus rơi về `body` khi banner kết nối biến mất;
    - badge không giới hạn "99+";
    - câu chữ tự đặt chưa gom một chỗ.
  - **Nhỏ:**
    - toast lỗi thành `role=alert`;
    - banner không lồng vùng live;
    - pill đang lưu không làm mất focus;
    - thứ tự ưu tiên phím tắt cha/con;
    - tìm kiếm báo số kết quả cho trình đọc màn hình;
    - bỏ chữ roadmap gõ cứng trong gợi ý;
    - ngừng hỏi `/api/meta` khi tab ẩn;
    - có helper `src/app/nhap-tam.ts` giữ chữ đang gõ trong sessionStorage cho các phase sau.

## Để lại

- Thứ tự Tab của 2 toast có thể khác thứ tự nhìn khi có 1 toast lỗi và 1 toast thường cùng lúc (tối đa 2 toast, ảnh hưởng nhỏ).
- Trên các trang soạn (ẩn sidebar), toast vẫn lùi vào như khi có sidebar: sửa khi làm trình soạn ở phase 7b.
- `?` và `/` nhận theo vị trí phím vật lý (§11). Trên bàn phím AZERTY / QWERTZ, chữ trên phím khác; bảng F27 đã ghi chú điều này.

## Chờ bạn duyệt

1. **Câu chữ tự đặt** (không có trong đặc tả, frame hay đề xuất): 38 câu, tất cả nằm trong `src/copy/cho-duyet.ts` để sửa một chỗ. Đáng chú ý:
   - "Đã kết nối lại với máy chủ cục bộ." (toast)
   - "Chữ trên phím theo bàn phím kiểu Mỹ; với AZERTY, QWERTZ hãy bấm phím ở cùng vị trí." (câu thứ 3 ở F27)
   - "{n} kết quả." · "Không có kết quả cho "{q}". Thử tên tiếng Anh hoặc viết tắt." · "Enter mở:" (cho trình đọc màn hình)
   - Nút giao diện: "{Giao diện: …}. Bấm để chuyển sang {…}" · tooltip rail "Tìm mục (/)", "Bảng phím tắt (?)"
   - "Về phần", "Về lĩnh vực", "Về {trang cha}" (nút quay về)
   - 19 câu mô tả "trang sẽ làm gì" dưới ô "Có ở phase n" (`MO_TA_SAP_CO`), vd. Tổng quan: "Tiến độ cả roadmap, mục đang học, thẻ cần ôn hôm nay, giờ học và độ phủ nội dung."
2. **Toast có nút X** dù F26 không vẽ. Toast tự đóng sau 5 giây, nên người dùng bàn phím cần cách đóng tay.
3. **Màu "Bản nháp" trên thanh độ phủ** (`--noi-dung-nhap`) giữ theo frame, chỉ đạt khoảng 2,6:1 (Sáng) và 2,0:1 (Tối), dưới 3:1. Mình cho miễn kiểm vì thanh luôn có nhãn đủ số và dòng chữ "n duyệt · n nháp · n chưa có" đi kèm. Nếu bạn muốn đạt 3:1 thì đổi màu đậm hơn.
4. **Lệch frame có chủ ý**:
   - banner lỗi không lồng `aria-live` như markup F26, để trình đọc màn hình không đọc 2 lần;
   - nút giao diện ở "Theo hệ thống" vẫn giữ icon như C34.
5. **Giá trị designer chưa vẽ, mình tự chọn**:
   - toast ở góc dưới trái, cách sidebar / rail 24px (mobile 16), rộng tối đa 560;
   - skeleton nhấp nháy 1,6 giây;
   - panel trượt 360px: padding 24, tiêu đề 17/28;
   - ô "Có ở phase n" dùng icon đồng hồ cát.

## Ảnh chụp

- `phase-1-khung-sang-1440.jpg` (sidebar), `phase-1-rail-1100.jpg`, `phase-1-f27-phim-tat.jpg`, `phase-1-tim-kiem-risk.jpg`
- `phase-1-404-toi-375.jpg`, `phase-1-drawer-toi-375.jpg`, `phase-1-mat-ket-noi-toi.jpg`, `phase-1-gallery-f02.jpg`
