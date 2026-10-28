## quantitative-risk-assessment

- Kiểm parser: Quantitative Risk Assessment (chu-de) · Đủ khối 9/9
- Nguồn đã mở: [Cost Estimating and Assessment Guide, GAO-20-195G (gao.gov trả 403; đọc trang và PDF qua Internet Archive, giữ link gao.gov) — U.S. GAO](https://www.gao.gov/products/gao-20-195g); [Decisions, decisions (PMI Global Congress 2005, bản Internet Archive) — Michael Stefanovic, Ingrid Leman Stefanovic](https://web.archive.org/web/20210925211740/https://www.pmi.org/learning/library/decisions-quantitative-making-process-7466); [NIST SP 800-30 Rev. 1 (PDF) — NIST](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-30r1.pdf); [Risk register (bản Internet Archive) — Praxis Framework](https://web.archive.org/web/20250115231535/https://www.praxisframework.org/en/method/risk-register)
- Agent soát đã sửa:
  - Vì sao PM cần biết: "nếu dữ liệu đầu vào chỉ là phán đoán chủ quan thì độ chặt chẽ giảm đi nhiều" → "khi phán đoán chủ quan bị giấu trong các con số thì…", đúng ý NIST ("when subjective determinations are buried within the quantitative assessments").
  - Tham khảo GAO: "chương 12: Conduct…" → "chương 12, Step 9: Conduct Risk and Uncertainty Analysis" cho khớp mục lục.
  - "phản ứng" → "ứng phó" (3 chỗ), thống nhất với các bài cùng thư mục.
- **Nên tự kiểm lại:**
  - Đã tự chạy lại Monte Carlo bằng python (1.000.000 lần, 3 phân phối tam giác 4–5–9, 6–8–14, 3–4–8, độc lập): P(≤ 17 ngày) ≈ 6,4%, P50 ≈ 20,2, P80 ≈ 22,3, trung bình ≈ 20,33 (khớp công thức (a+m+b)/3 cộng lại = 20,33). Các số trong bài (≈ 6%, P50 ≈ 20, P80 ≈ 22) đúng.
  - EMV: 0,3 × 200 = 60; sau ứng phó 25 + 0,1 × 200 = 45 < 60: đúng. Ý "tổ chức ngại rủi ro còn xét trường hợp xấu nhất" khớp bài PMI (risk averse chọn "best worst").
  - Đã khớp GAO: "Correlation should never be ignored… understating the probability distribution, resulting in a false sense of confidence"; contingency = chênh giữa point estimate và ước lượng ở percentile mong muốn; "Decision-makers choose the level of confidence". GAO viết cho chi phí, bài áp dụng cho cả lịch; đây là suy rộng hợp lý nhưng không phải nguyên văn.
  - Đã khớp PMI: EMV = tổng kết quả × xác suất; decision tree = EMV + xác suất nối tiếp (joint probability là tích). Quy ước threat mang dấu âm, opportunity dấu dương không có trong các nguồn đã mở (quy ước phổ biến kiểu PMBOK).
  - Đã khớp Praxis: chi phí ứng phó không nên vượt expected value của rủi ro.
  - lien_quan: three-point-estimation và schedule-forecasting đều có nói về Monte Carlo/P80 (đã kiểm hai bài đó), nên giữ.
