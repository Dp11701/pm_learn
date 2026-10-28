## quality-metrics

- Kiểm parser: Quality metrics (chu-de) · Đủ khối 9/9
- Nguồn đã mở: [DORA's software delivery performance metrics — DORA (Google Cloud)](https://dora.dev/guides/dora-metrics/); [A history of DORA's software delivery metrics — DORA (Google Cloud)](https://dora.dev/insights/dora-metrics-history/); [Site Reliability Engineering, ch. 4 Service Level Objectives — Google](https://sre.google/sre-book/service-level-objectives/); [Certified Tester Foundation Level Syllabus v4.0.1 — ISTQB](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf); Software metric — Wikipedia (nguồn yếu, đã thay)
- Agent soát đã sửa:
  - lien_quan: bỏ `defect-management`, `ci-cd` (không có trong danh sách slug của roadmap) → thêm `quality-assurance`, `cost-of-quality-coq`.
  - Khái niệm (Product metric): "defect density … trên nghìn dòng code hoặc một module" → "số lỗi trên một đơn vị kích thước của sản phẩm", vì không có nguồn mở được nêu đơn vị KLOC; thêm "thời gian phản hồi" (ISTQB 5.3.1 liệt kê defect density và response time).
  - Tham khảo: Wikipedia "Software metric" → ISTQB CTFL v4.0.1 mục 5.3.1.
  - Đã kiểm, giữ nguyên: DORA nay 5 chỉ số, chia throughput (change lead time, deployment frequency, failed deployment recovery time) và instability (change fail rate, deployment rework rate); deployment rework rate thêm năm 2024; MTTR đổi thành failed deployment recovery time năm 2023 (trang history). DORA nói các chỉ số vừa là leading vừa là lagging; trang hướng dẫn của DORA dẫn thẳng Goodhart's law ở bẫy "Setting metrics as a goal", câu ví dụ "every application must deploy multiple times per day by year's end", bẫy so mobile app với mainframe, gợi ý giảm batch size. SRE: SLI/SLO và ví dụ "average latency < 100 ms" khớp.
- **Nên tự kiểm lại:**
  - Bảng So sánh (quality metric / KPI dự án / quality gate) là cách phân biệt của người viết, không theo một nguồn cụ thể.
  - Gợi ý "khoảng ba đến năm metric" là nhận định của người viết; SRE chỉ nói "a handful of representative indicators".
