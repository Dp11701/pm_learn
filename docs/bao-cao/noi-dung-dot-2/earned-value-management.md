## earned-value-management

- Kiểm parser: Earned Value Management (chu-de) · Đủ khối 9/9
- Nguồn đã mở: [Cost Estimating and Assessment Guide (GAO-20-195G) — U.S. Government Accountability Office](https://www.gao.gov/products/gao-20-195g) (trang gao.gov trả 403 cho cả người soát; đã đọc PDF qua bản lưu https://web.archive.org/web/2024id_/https://www.gao.gov/assets/gao-20-195g.pdf); [Earned value management — Wikipedia](https://en.wikipedia.org/wiki/Earned_value_management) (mở được nhưng là nguồn yếu, đã thay); [Earned Value Management (EVM) Implementation Handbook — NASA](https://www.nasa.gov/wp-content/uploads/2018/06/evmimplementationhandbook-1-1.pdf) (nguồn thay Wikipedia; bản trong file ghi tháng 4/2026); [Earned Schedule — Walt Lipke](https://www.earnedschedule.com/)
- Agent soát đã sửa:
  - Tham khảo: Wikipedia → NASA EVM Implementation Handbook. Handbook có định nghĩa TCPI theo BAC và theo EAC (đúng hai công thức bài dùng), PMB là "time-phased budget plan", EAC = ACWP + ETC, và thuật ngữ earned value technique.
  - Khái niệm Earning rule: thêm "(GAO và NASA gọi là phương pháp đo, hay earned value technique)", vì hai nguồn chính không dùng chữ "earning rule" (chữ này có ở Wikipedia).
  - Cách áp dụng bước 2: "ưu tiên 0/100 cho gói ngắn" → "dùng 0/100 cho gói bắt đầu và kết thúc trong cùng một kỳ báo cáo". GAO-20-195G bảng 21 ghi 0/100 "should only be used on work packages planned to start and end within one reporting period".
  - Cách áp dụng bước 7: "Lập ít nhất hai đến ba EAC" (câu lủng củng) → "Lập nhiều EAC (ví dụ hai đến ba)"; GAO: "it is a best practice to develop more than one EAC".
  - Đã tự tính lại mọi số, đều đúng, không phải sửa: ví dụ GAO đường ray (4 dặm/4 tuần/4 triệu; 3 tuần chi 2 triệu, xong 1 dặm → 8 triệu, 12 tuần) khớp nguyên văn GAO; ví dụ module thanh toán CPI = 240/320 = 0,75, SPI = 240/300 = 0,8, EV = 40% BAC, EAC = 320 + 360 = 680, EAC = 600/0,75 = 800, EAC = 320 + 360/(0,75 × 0,8) = 920, TCPI = 360/280 ≈ 1,29; câu hỏi CPI = 0,8, EAC = 250, ETC = 150, VAC = −50. Quy tắc "TCPI cao hơn CPI quá 5 điểm phần trăm" và ví dụ TCPI 1,2 / CPI 0,9 khớp nguyên văn GAO trang 258. Ý SV về 0, SPI về 1 khi xong khớp GAO và trang earnedschedule.com.
- **Nên tự kiểm lại:**
  - Công thức EAC với chỉ số = 1 ("phần còn lại chạy đúng kế hoạch") là dạng chung đặt chỉ số bằng 1; GAO chỉ nêu dạng chung và các chỉ số CPI, SPI, CPI × SPI, không liệt kê riêng trường hợp này (PMBOK có, nhưng người soát không mở được bản PMI).
  - GAO còn nhận xét EAC theo CPI tích luỹ "tends to generate a best-case EAC"; bài không nói, có thể thêm nếu bạn muốn nhấn rằng 800 triệu chưa phải mức xấu nhất.
  - Cách áp dụng bước 4 (giờ log theo epic nhân đơn giá) và phần Góc dev lead → PM là nhận định của người viết, không có trong nguồn.
  - Link GAO trong Tham khảo trỏ trang sản phẩm gao.gov (403 với công cụ tự động); nên tự mở bằng trình duyệt.
