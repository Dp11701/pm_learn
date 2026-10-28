## quality-gates

- Kiểm parser: Quality Gates (chu-de) · Đủ khối 9/9
- Nguồn đã mở: [Understanding quality gates (SonarQube Server) — Sonar](https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates); [The Stage-Gate Model: An Overview — Stage-Gate International](https://www.stage-gate.com/blog/the-stage-gate-model-an-overview/); [Stage-Gate Innovation Management Guidelines v1.3 — U.S. Department of Energy](https://www.energy.gov/sites/prod/files/2015/05/f22/itp_stage_gate_overview.pdf); [Phase-gate process — Wikipedia](https://en.wikipedia.org/wiki/Phase%E2%80%93gate_model) (nguồn yếu, bị gắn cờ thiếu nguồn, đã thay)
- Agent soát đã sửa:
  - lien_quan: bỏ `ci-cd` (không có trong danh sách slug) → thêm `decision-log` (bước 8 của Cách áp dụng dùng decision log).
  - Khái niệm Gate criteria: bỏ "Wikipedia về phase-gate mô tả…" → tiêu chí rõ, biết trước để gatekeeper quyết khách quan, kịp thời (DOE); cách chia "must meet"/"should meet" viết mềm thành "một cách chia hay gặp", thêm gate scorecard (DOE nhắc gate scorecard).
  - Khái niệm Gate decision: thêm bộ quyết định Go Forward / Stop / Hold / Return của DOE để có nguồn độc lập ngoài công ty sở hữu mô hình.
  - Tự kiểm tra câu 2: tách đúng hai ngưỡng fudge factor theo Sonar: coverage bỏ qua khi "number of new lines to cover" < 20, duplication bỏ qua khi "number of new lines" < 20; ghi rõ cơ chế bật sẵn, project admin có thể tắt.
  - Vì sao PM cần biết: "khi sửa đắt nhất" → "khi việc sửa thường tốn kém hơn nhiều" (bớt tuyệt đối).
  - Tham khảo: Wikipedia → hướng dẫn Stage-Gate của DOE (2007).
  - Đã kiểm, giữ nguyên: Sonar way có 4 điều kiện (không có issue mới, review hết Security Hotspot mới, coverage code mới ≥ 80%, duplication ≤ 3%); trạng thái gate dùng chặn merge PR / làm fail CI; trang Summary. Stage-Gate: gate nhìn về phía trước, không phải status review; Go/Kill/Hold/Recycle; với Go chốt nguồn lực và ngày gate kế tiếp; deliverables định trước.
- **Nên tự kiểm lại:**
  - "Must meet / should meet" chỉ thấy ở Wikipedia và tài liệu thứ cấp; chưa mở được văn bản gốc của Cooper.
  - Trang Stage-Gate là blog của chính công ty sở hữu nhãn hiệu Stage-Gate: đúng cho định nghĩa của mô hình, nhưng có giọng quảng bá (các số liệu khảo sát trên trang không được dùng trong bài).
  - Hướng dẫn DOE (2007) dành cho dự án R&D; chỉ dùng cho ý chung về tiêu chí và quyết định ở gate.
  - Bảng So sánh (gate dự án / gate CI / DoD) là cách phân biệt của người viết.
