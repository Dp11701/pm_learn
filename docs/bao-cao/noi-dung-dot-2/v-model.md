## v-model

- Kiểm parser: V-model (chu-de) · Đủ khối 9/9
- Nguồn đã mở: [Certified Tester Foundation Level Syllabus v4.0.1 — ISTQB](https://www.istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf); [NASA Systems Engineering Handbook Rev2, mục 2.4 — NASA](https://www.nasa.gov/sites/default/files/atoms/files/nasa_systems_engineering_handbook_0.pdf); [Systems Engineering for ITS: High-level Systems Engineering Overview — FHWA](https://ops.fhwa.dot.gov/seits/sections/intro/6.html); [V-model (software development) — Wikipedia](https://en.wikipedia.org/wiki/V-model_(software_development))
- Agent soát đã sửa:
  - Vì sao PM cần biết, câu 3: "Nếu bỏ qua, việc chuẩn bị test dồn về cuối, thời gian test bị ép ngắn khi các phase trước trễ…" → tách ý ép thời gian test ra: "ngay cả khi theo V-model, thời gian test vẫn hay bị ép ngắn khi các phase trước trễ mà ngày bàn giao không đổi, nên PM phải chủ động bảo vệ nó". Wikipedia ghi đây là lời phê bình thường gặp với chính V-model, nên không thể nói V-model tự tránh được.
  - Khái niệm cốt lõi, Nhánh trái và nhánh phải: bỏ vế "vì V-model không có một định nghĩa duy nhất". Không nguồn nào trong bài nói vậy; giữ "số tầng và tên gọi khác nhau tùy tài liệu" (ISTQB, Wikipedia, FHWA chia khác nhau).
  - Khái niệm cốt lõi, Early testing: "phần mềm chỉ chạy được ở nửa sau dự án" → "thường chỉ chạy được ở các phase sau". ISTQB viết "later phases", không nói "nửa sau".
- **Nên tự kiểm lại:**
  - ISTQB không mô tả cặp tầng của chữ V; cặp tầng (thiết kế chi tiết ↔ unit, kiến trúc ↔ integration…) lấy từ Wikipedia. Wikipedia còn ghi system test plan do "client's business team" soạn, khác với nhiều tài liệu khác; bài không dùng chi tiết này.
  - Link NASA tự chuyển sang https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf; vẫn mở được.
  - Bảng So sánh (cột Waterfall "nhiều dự án dồn vào phase test", hàng "Hợp khi") là nhận định của người viết, không trích từ nguồn.
  - Wikipedia còn nêu phê bình khác: V-model khuyến khích viết test script trước thay vì exploratory testing. Bài chưa nói tới; bạn có thể thêm nếu muốn cân bằng.
