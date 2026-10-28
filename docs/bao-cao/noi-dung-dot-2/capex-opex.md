## capex-opex

- Kiểm parser: CAPEX / OPEX (chu-de) · Đủ khối 9/9
- Nguồn đã mở: [Understanding CapEx vs. OpEx in Corporate Finance — CFI](https://corporatefinanceinstitute.com/resources/accounting/capex-vs-opex/); [Publication 946, How To Depreciate Property — IRS](https://www.irs.gov/publications/p946); [IAS 38 Intangible Assets (trang tóm tắt) — IFRS Foundation](https://www.ifrs.org/issued-standards/list-of-standards/ias-38-intangible-assets/); [Understanding ASU 2025-06 — Eide Bailly](https://www.eidebailly.com/insights/articles/2025/12/asu-2025-06); [Staff paper AP7, IAS 38 cloud computing, 3/2019 — IFRS Interpretations Committee](https://www.ifrs.org/content/dam/ifrs/meetings/2019/march/ifric/ap7-ias-38-cloud-computing.pdf); [Capitalized Cost — CFI](https://corporatefinanceinstitute.com/resources/accounting/capitalized-cost/) (mở để đối chiếu, không đưa vào bài vì đã đủ 5 nguồn)
- Agent soát đã sửa:
  - Tham khảo: bỏ OpenStax Principles of Financial Accounting mục 11.2 (không mở: điều khoản OpenStax cấm đưa nội dung vào AI) → thay bằng IRS Publication 946, mục "How Do You Treat Repairs and Improvements?" (sửa chữa trừ như chi phí; betterment, restore, adapt → improvement, phải khấu hao). Ý "vốn hoá rồi khấu hao dần" đã có ở trang CFI CapEx vs OpEx.
  - Khái niệm cốt lõi, Sửa chữa và nâng cấp: "nâng cấp làm tăng năng lực hoặc kéo dài thời gian sử dụng thì có thể được vốn hoá" → viết theo ba trường hợp betterment / khôi phục / chuyển công dụng mới của IRS, thêm "ranh giới tuỳ chuẩn mực, luật thuế và chính sách công ty" (nguồn thay là quy tắc thuế Mỹ, không phải chuẩn mực kế toán).
  - Khái niệm cốt lõi, Capitalization: "Mục đích là để chi phí đi cùng kỳ với doanh thu" → "chi phí được rải ra các kỳ tài sản được dùng, thay vì dồn hết vào kỳ chi tiền" (CFI CapEx vs OpEx nói "smoothed over time"; ý matching principle từng dựa vào OpenStax).
  - Khái niệm cốt lõi, ASU 2025-06: thêm ngày hiệu lực "kỳ năm bắt đầu sau 15/12/2027" theo Eide Bailly.
  - Vì sao PM cần biết: 6 câu → 5 câu (prompt cho 3–5), bỏ câu "Việc của PM không phải là tự phân loại thay kế toán…" vì ý này đã có ở "Điều cần đổi".
  - Đã tính lại: 20 triệu × 12 = 240 triệu/năm; 3 năm 720 triệu; 600 / 3 = 200 triệu/năm. Đúng.
- **Nên tự kiểm lại:**
  - IAS 38 chỉ đối chiếu trang tóm tắt (research → chi phí, development đủ tiêu chí → tài sản vô hình); chưa đọc toàn văn chuẩn mực.
  - ASU 2025-06 chỉ qua bài của Eide Bailly (fasb.org chặn 403); chưa đọc văn bản gốc của FASB.
  - Ranh giới sửa chữa / cải tạo dẫn theo luật thuế Mỹ (IRS); kế toán theo IAS 16 hay chuẩn mực Việt Nam có thể diễn đạt khác. Chưa có nguồn chuẩn mực kế toán mở được cho ý này (trang tóm tắt IAS 16 không nói về chi phí bảo trì).
  - Tài liệu IFRIC là staff paper của buổi họp 3/2019, nêu kết luận của Uỷ ban (hợp đồng chỉ cho quyền truy cập phần mềm là hợp đồng dịch vụ); quyết định chính thức (agenda decision) chưa mở riêng.
  - "Nhiều công ty tách ngân sách CAPEX và OPEX với quy trình duyệt riêng" là nhận định của người viết, không có nguồn.
  - Ví dụ máy chủ 600 triệu / cloud 20 triệu mỗi tháng là tình huống giả định.
