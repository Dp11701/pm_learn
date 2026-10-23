# Phase 1 — đang dở (tạm dừng 23/10/2026)

Nhánh `wip/phase-1`. Phase 1 = "Component + khung app" (đề xuất mục 9). Code dưới đây **chưa review, chưa
kiểm tra trên trình duyệt**; lúc dừng: `tsc -b` 0 lỗi, `vitest` 35 file / 536 test xanh. Chưa chạy
`npm run check` đầy đủ (Prettier, chống gõ cứng, bundle).

Kế hoạch gốc và yêu cầu chi tiết cho từng phần nằm trong `phase-1-workflow.js` (đường dẫn tuyệt đối trong
file là của máy công ty `/Users/teddy/workspace/pm/hoc-pm-a-z`).

## Đã làm

| Phần | File | Tình trạng |
|---|---|---|
| Hợp đồng chung | `shared/domain/trang-thai.ts`, `src/components/TenMuc.tsx`, `src/components/TieuDeTrang.tsx`, token mobile trong `tokens-them.css` | Xong (commit `c37475f`) |
| Component chung | `src/components/{Nut,TruongNhap,HopThoai,Toast,Banner,TrangThaiTrong,TuLuu}.tsx` (C35, C36, C32, C33, C26, C38, C25) + `tests/components/core/` | Agent báo xong |
| Component trạng thái | `src/components/trang-thai/*` (C4–C8, C10, C11, icon) | Đang làm dở |
| Khung app | `src/app/khung/*` (C34 sidebar, rail, top bar mobile, drawer, skip link, focus H1, chân trang) | Đang làm dở |
| Phím tắt + tìm kiếm | `src/app/phim-tat.tsx`, `src/components/BangPhimTat.tsx` (F27), `src/components/tim-kiem/*` (C28 tối giản) | Đang làm dở |
| Route + hệ thống | `src/app/router.tsx`, `src/app/GocApp.tsx`, `src/app/ket-noi.tsx`, `src/pages/*` (404, trang lỗi, trang "Có ở phase n") | Đang làm dở |

## Còn lại để xong phase 1

1. Rà và hoàn thiện 4 phần đang dở theo yêu cầu trong `phase-1-workflow.js` (mỗi phần một danh sách file riêng).
2. Gallery `/_dev/thanh-phan/f02`, `/f02b` dựng bằng component thật (F02, F02b).
3. Gộp các file `src/styles/tokens-{trang-thai,khung,he-thong,phim-tat}.css` vào `tokens-them.css`; mở rộng kiểm tương phản cho token mới.
4. Hai review độc lập: (a) bám đặc tả + frame, tick mã D4, D5, D6, D17, D18, D22, D23, D24, D30, D33, D35; (b) lỗi, a11y, độ bền.
5. Sửa theo review; `npm run check` xanh.
6. Tự kiểm tra trên trình duyệt: frame F02, F02b, C34, F27, F28, F26, F26b ở 1440 / 1024 / 375, Sáng và Tối, chỉ bàn phím, axe, không cuộn ngang.
7. Commit, viết `docs/bao-cao/phase-1.md` (có "Chờ bạn duyệt"), cập nhật trạng thái trong `CLAUDE.md`, **dừng chờ duyệt** (phase 1 là điểm dừng).
