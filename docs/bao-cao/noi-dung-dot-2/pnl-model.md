## pnl-model

- Kiểm parser: PnL model (chu-de) · Đủ khối 9/9
- Nguồn đã mở: [Income Statement — Corporate Finance Institute](https://corporatefinanceinstitute.com/resources/accounting/income-statement/); [Profit and Loss Statement (P&L) — Corporate Finance Institute](https://corporatefinanceinstitute.com/resources/accounting/profit-and-loss-statement-pl/); [Variance Analysis — Corporate Finance Institute](https://corporatefinanceinstitute.com/resources/accounting/variance-analysis/); [Mastering Professional Services KPIs (PDF) — Kantata](https://www.kantata.com/pdf/CriticalMetrics.pdf); [Glossary of Terms — Ruddr](https://help.ruddr.io/getting-started/glossary-of-terms) (nguồn yếu, đã thay); [About utilization rates (Dynamics AX 2012) — Microsoft Learn](https://learn.microsoft.com/en-us/previous-versions/dynamicsax-2012/appuser-itpro/about-utilization-rates)
- Agent soát đã sửa:
  - Tham khảo: thay glossary của Ruddr (trang trợ giúp của hãng phần mềm PSA) bằng trang định nghĩa utilization của Microsoft Learn: "billable hours / working hours", ví dụ 30/40 = 75%. Trang này khớp với định nghĩa trong bài.
  - Đã tự tính lại: tháng kế hoạch 20.000 − 14.000 = 6.000 (30%), chi phí chung 2.000, đóng góp 4.000; tháng 3: 16.000 − 14.000 = 2.000 (12,5%), chi phí chung 1.600, đóng góp 400; cả dự án 5 × 20.000 + 16.000 = 116.000, COGS 84.000, lợi nhuận gộp 32.000 (27,59% ≈ 27,6%); câu hỏi 1: 112.000 − 84.000 = 28.000 (25%); câu hỏi 4: 6.000 − 3.000 = 3.000; câu hỏi 5: 80.000. Đều đúng. Số liệu khớp với ví dụ ở bài GPM.
  - Đã đối chiếu: CFI có đúng các ý tô màu ô nhập tay (xanh cho số nhập, đen cho công thức), "forecast COGS... rather than gross profit directly", P&L lập theo dồn tích; CFI Variance Analysis có ý "chỉ chú ý chênh lệch bất thường hoặc đáng kể". Không cần sửa.
- **Nên tự kiểm lại:**
  - Kantata vẫn là tài liệu tiếp thị của hãng phần mềm (nguồn yếu). Mình giữ vì đây là nguồn duy nhất mở được đỡ cho ý "quản lý mỗi dự án như một P&L riêng" và "biên lợi nhuận EAC (Estimate at Complete)". Mình chưa tìm được nguồn trung lập thay thế.
  - Phân bổ chi phí chung 10% doanh thu và khái niệm "phần đóng góp của dự án" là giả định minh hoạ. Mỗi công ty phân bổ theo cách riêng.
  - Thuật ngữ Estimate at Completion trong PMBOK/EVM dùng cho chi phí. Bài dùng nó cho số ước tính lãi lỗ khi kết thúc dự án, giống cách Kantata gọi "EAC margin". Cần nhất quán với bài earned-value-management khi soạn.
  - Phần "Thực hành công cụ" (protected range, định dạng có điều kiện) là thao tác chung trên Google Sheets/Excel, không dẫn nguồn.
