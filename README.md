# Học PM A–Z

Web app cá nhân để tự học Project Management theo toàn bộ roadmap
[roadmap.sh/r/project-management-crez9](https://roadmap.sh/r/project-management-crez9). Chạy cục bộ,
một người dùng, giao diện tiếng Việt.

> Đang dựng theo `docs/de-xuat-trien-khai.md` (đã duyệt 23/10/2026). README đầy đủ (thư mục nội dung,
> quy ước file, prompt soạn bài, sao lưu, thay cây) hoàn thiện ở phase 9.

## Cần có

- Node 25.9 (xem `.nvmrc`), bản arm64 trên Mac Apple Silicon (`node -p process.arch` phải ra `arm64`).

## Chạy

```bash
npm install
npm run dev
```

- Web: http://127.0.0.1:5320 · API: http://127.0.0.1:5321 (chỉ nghe `127.0.0.1`).
- Bản dev có thêm `/_dev/thanh-phan` (design system F01) và `/_dev/frame/<mã>` (xem frame thiết kế,
  dựng bằng `npm run frame -- <mã>` hoặc `npm run frame -- --tat-ca`).

## Lệnh

| Lệnh                   | Việc                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `npm run dev`          | Web (Vite) + API (Express)                                                                 |
| `npm test`             | Test ở 2 múi giờ (Asia/Ho_Chi_Minh, America/Los_Angeles) + quét chống gõ cứng nội dung học |
| `npm run check`        | `tsc` + ESLint + Prettier + test                                                           |
| `npm run frame -- F11` | Dựng frame thiết kế thành HTML tĩnh trong `.frame/`                                        |

## Thư mục

| Đường dẫn            | Nội dung                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `docs/`              | Đặc tả (`prompt-design.md`, nguồn sự thật), đề xuất triển khai, cây roadmap, gói bàn giao thiết kế |
| `shared/`            | TypeScript dùng chung web + server: cây roadmap, thời gian, định dạng, tìm kiếm                    |
| `server/`            | Express + SQLite (`data/hoc.db`)                                                                   |
| `src/`               | React                                                                                              |
| `scripts/`           | Script dev: kiểm môi trường, chống gõ cứng, xem frame, tương phản màu                              |
| `tests/`             | Test; `tests/fixtures/roadmap-tree.json` là bản cây đóng băng                                      |
| `fixtures/mau/`      | Dữ liệu mẫu chỉ dùng ở bản dev                                                                     |
| `data/`, `noi-dung/` | Dữ liệu học và bài học thật của bạn (không vào git của app)                                        |

## Bản chép tài liệu đầu vào (sha256)

Chép từ `~/workspace/pm/docs/pm-roadmap/` ngày 23/10/2026.

```
c2d91f549695b10e596bd85faf0da5cb9d76ce36907e55b90a178a0017aaa3ca docs/prompt-design.md
260961dcb354f907c45bda07ae2418957707cc9fdb3aa93a2c479c88ed8c2cbd docs/roadmap-tree.json
32c53c749102c3ac4ab3b3c6305747e1c91e2568571182768a9abce9a907a290 docs/roadmap-tree.md
60850cc1c0098c0d6a066515026b253aeea346e6f774503de5056231dc9b8aba docs/prompt-design-ngan.md
dab80f33a2037eb5f863fa41ff58352373f8cd1b5a9f32ae28033db2b46834b0 docs/design-handoff/tokens.css
4c777681cf38847aeaa55369da4fb9caf73802a8c4298020adc966d13e8f638d docs/design-handoff/README.md
de038550374a9dfbece7769e5247742fee5d2ba197cca2e09ce680b00118b2ca docs/design-handoff/SCREENS.md
```

`docs/de-xuat-trien-khai.md` được cập nhật dòng trạng thái theo từng phase nên không ghi sha.
