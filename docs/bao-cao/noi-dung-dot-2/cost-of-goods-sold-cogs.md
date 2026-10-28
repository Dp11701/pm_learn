## cost-of-goods-sold-cogs

- Kiểm parser: Cost of Goods Sold (COGS) (chu-de) · Đủ khối 9/9
- Nguồn đã mở: [Cost of goods sold definition — AccountingTools](https://www.accountingtools.com/articles/cost-of-goods-sold); [Cost of Goods Sold (COGS) — Corporate Finance Institute](https://corporatefinanceinstitute.com/resources/accounting/cost-of-goods-sold/); [IAS 2 Inventories (tóm tắt) — IFRS Foundation](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/); [Publication 334, Tax Guide for Small Business — IRS](https://www.irs.gov/publications/p334)
- Agent soát đã sửa:
  - Ví dụ thực tế: bản cũ nói "hai developer chia thời gian cho cả hai" rồi "dự án A có 4 developer... COGS của A là 13.000", không rõ 13.000 là số đúng hay số sai, và không nói công ty tính những gì vào COGS. Đã viết lại câu 1–2: nói rõ đây là chính sách của công ty giả định (nhân sự theo timesheet, thầu phụ, hạ tầng riêng), 13.000 là số theo timesheet ghi sai. Câu 4 thêm số đã sửa: ghi đúng thì COGS của A là 10.200 USD, còn 2.800 USD thuộc về B (2 người × 50% × 2.800).
  - Đã tự tính lại: 4 × 2.800 + 1.500 + 300 = 13.000; 13.000 − 2.800 = 10.200; câu tồn kho 5.000 + 12.000 − 3.000 = 14.000. Đều đúng.
- **Nên tự kiểm lại:**
  - License và staging dùng riêng cho khách được tính vào COGS là giả định về chính sách công ty, không có nguồn trực tiếp. Bài capex-opex.md xếp license vào OPEX; hai bài không mâu thuẫn (OPEX là cách chia theo chi tiêu, còn COGS hay SG&A là dòng nằm trên P&L), nhưng người mới dễ nhầm hai cách chia này.
  - "Cost of services" theo AccountingTools là lương, thuế tiền lương và phúc lợi của người tạo giờ billable; khớp với nguồn. Câu "khấu hao có thể vào COGS hoặc không, tuỳ chính sách" khớp với CFI.
  - Bảng So sánh, dòng "thay đổi theo khối lượng dự án", là nhận định chung của người viết.
  - IRS Pub 334 là hướng dẫn thuế của Mỹ, chỉ dùng để đỡ công thức tồn kho; quy định ở Việt Nam có thể khác.
