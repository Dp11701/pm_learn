## traceability-matrix

- Kiểm parser: Traceability Matrix (tai-lieu) · Đủ khối 8/8
- Nguồn đã mở: [CDC UP Practice Guide: Requirements Traceability (11/30/06, bản Internet Archive) — Centers for Disease Control and Prevention](https://web.archive.org/web/20220116043431/https://www2.cdc.gov/cdcup/library/practices_guides/CDC_UP_Requirements_Traceability_Practice_Guide.pdf); [SWE-059 Bidirectional Traceability Between Software Requirements and Software Design — NASA Software Engineering Handbook](https://swehb.nasa.gov/spaces/7150/pages/16449675/SWE-059+-+Bidirectional+Traceability+Between+Software+Requirements+and+Software+Design); [NASA Systems Engineering Handbook, mục 6.2 Requirements Management — NASA](https://www.nasa.gov/reference/6-2-requirements-management/); [Free PMP Exam Sample Question 12420 — The PM PrepCast](https://www.project-management-prepcast.com/kunena/free-pmp-exam-questions/12420-free-pmp-exam-sample-question); [PMBOK Guide Sixth Edition, Errata (Fourth Printing) — Project Management Institute](https://www.pmi.org/-/media/pmi/documents/public/pdf/pmbok-standards/pmbok-guide-6th-edition-errata-4th-printing.pdf)
- Agent soát đã sửa:
  - Cấu trúc tài liệu, câu dẫn: "Theo các tài liệu ôn thi dẫn PMBOK Guide bản 6" → "Theo một tài liệu ôn thi PMP dẫn PMBOK Guide bản 6 (trang 148–149)". Bài chỉ dẫn một nguồn ôn thi (PrepCast), nên không nói số nhiều.
- **Nên tự kiểm lại:**
  - Danh sách thuộc tính RTM (unique identifier, description, rationale for inclusion, owner, source, priority, version, current status, status date) và định nghĩa "links product requirements from their origin to the deliverables that satisfy them" chỉ có nguồn thứ cấp (PrepCast, dẫn PMBOK 6 trang 148–149); chưa đối chiếu được với bản PMBOK đầy đủ.
  - "RTM là đầu ra của Collect Requirements" khớp Hình 5-4 trong PDF errata của PMI (trang sửa của mục 5.2 Collect Requirements).
  - Các ý NASA khớp nguyên văn: rà ma trận "at major phases/key reviews", quan hệ "not required to be one-to-one" (SWE-059); requirement không có cha thì hoặc truy vết sai, hoặc là "gold plating" (NASA 6.2) — dùng cho câu Tự kiểm tra về TC-140.
  - "Thường không có bước ký duyệt riêng cho ma trận" là nhận định của người viết, không nguồn nào nói thẳng.
  - Mã REQ-021/034/035 khớp CR-012, CR-014 ở bài Change Request và Change log (xem ghi chú change-request-cr).
  - Nguồn CDC chỉ còn trên Internet Archive. Bài hơi ngắn (~1.600 từ) nhưng đủ khối; không bổ sung.
