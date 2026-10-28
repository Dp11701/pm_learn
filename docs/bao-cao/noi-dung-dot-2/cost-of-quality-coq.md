## cost-of-quality-coq

- Kiểm parser: Cost of Quality (CoQ) (chu-de) · Đủ khối 9/9
- Nguồn đã mở: [Quality Cost Analysis: Benefits and Risks (01/1996) — Cem Kaner](https://kaner.com/pdfs/Quality_Cost_Analysis.pdf); [Quality costs — Wikipedia](https://en.wikipedia.org/wiki/Quality_costs); [What is Cost of Quality (COQ)? — ASQ, bản lưu Internet Archive 23/12/2024](https://web.archive.org/web/20241223011232/https://asq.org/quality-resources/cost-of-quality); [Philip B. Crosby — Wikipedia](https://en.wikipedia.org/wiki/Philip_B._Crosby) (đã bỏ khỏi Tham khảo: đoạn "Quality is Free" trên trang không có trích dẫn, thay bằng ASQ)
- Agent soát đã sửa:
  - So sánh: "Cost of poor quality ... tập trung vào phần mất mát do lỗi" → định nghĩa theo ASQ: COPQ là chi phí gắn với sản phẩm, dịch vụ kém chất lượng, gồm appraisal + internal + external failure (không tính prevention). Bản cũ ngầm hiểu COPQ chỉ gồm failure, lệch với ASQ.
  - So sánh: "Crosby ... đo chất lượng bằng chi phí của sự không phù hợp (cost of nonconformance)" → Crosby gọi thước đo là "price of nonconformance" và cho rằng tổ chức tự chọn trả giá cho chất lượng kém (theo ASQ). Nguồn cũ là đoạn Wikipedia không có trích dẫn.
  - Khái niệm cốt lõi, Prevention cost: "người thiết kế, lập trình và các bộ phận khác" → "người lập trình, thiết kế và marketing", đúng chữ Kaner ("programming, design, and marketing staffs").
  - Khái niệm cốt lõi, Internal failure cost: sửa câu tiếng Việt mơ hồ "thời gian của tester, người viết tài liệu, marketing bị lãng phí" → "thời gian bị lãng phí của tester, người viết tài liệu và marketing" (Kaner, Figure 1).
  - Vì sao PM cần biết: "kế hoạch luôn thiếu thời gian" → "cứ thiếu thời gian" (bỏ chữ "luôn").
  - Tham khảo: thay Wikipedia Philip B. Crosby bằng trang ASQ (bản Internet Archive).
- **Nên tự kiểm lại:**
  - Cách chia conformance/nonconformance chỉ dựa trên Wikipedia (Feigenbaum, HBR 1956); bài gốc HBR không mở được.
  - "Quality Is Free (1979)" là năm xuất bản lấy từ trích dẫn sách trên Wikipedia, chưa đối chiếu với sách.
  - ASQ chỉ còn mở được qua bản Internet Archive (trang gốc trả 403 với curl); nội dung có thể đã đổi trên trang hiện tại.
  - Ví dụ: nói "velocity tụt dần" là do chi phí lỗi. Đó là suy luận của người soạn bài, nguồn không nói.
