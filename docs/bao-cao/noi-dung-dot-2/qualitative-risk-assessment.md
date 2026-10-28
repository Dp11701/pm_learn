## qualitative-risk-assessment

- Kiểm parser: Qualitative Risk Assessment (chu-de) · Đủ khối 9/9
- Nguồn đã mở: [NIST SP 800-30 Rev. 1 (PDF) — NIST](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-30r1.pdf); [NASA Risk Management Handbook, NASA/SP-2011-3422 v1.0 (trang NTRS mở được; PDF NTRS trả 504, đọc PDF qua Internet Archive) — NASA](https://ntrs.nasa.gov/citations/20120000033); [The Orange Book (5/2023, trang + PDF) — HM Treasury](https://www.gov.uk/government/publications/orange-book); [Risk matrix — Wikipedia](https://en.wikipedia.org/wiki/Risk_matrix) (yếu, đã bỏ)
- Agent soát đã sửa:
  - Tự kiểm tra, câu 1: "Wikipedia tóm tắt phê bình của Tony Cox rằng matrix có thể cho cùng mức cho những rủi ro rất khác nhau" → "NASA Risk Management Handbook nêu rằng matrix 5x5 cố định cách đánh đổi giữa xác suất và hậu quả, không theo bối cảnh của dự án" (mục 4.3.2.6, hạn chế số 4). Bỏ nguồn Wikipedia Risk matrix.
  - Khái niệm cốt lõi, Probability-impact matrix: "NASA xem nó là công cụ truyền đạt bổ sung đơn giản, không phải bản thân phân tích" → "… công cụ truyền đạt bổ sung, đơn giản, và chỉ ra hạn chế: không thể hiện được sự không chắc chắn, tương tác giữa các rủi ro hay tổng rủi ro". Vế "không phải bản thân phân tích" NASA không nói; ba hạn chế lấy từ mục 4.3.2.6.
  - So sánh, ô Hạn chế của Định lượng: "Tốn công và dữ liệu" → "Tốn công chuyên gia và công cụ", đúng chữ NIST ("expert time and effort and… tools").
  - "lập phản ứng" → "lập kế hoạch ứng phó" (2 chỗ).
- **Nên tự kiểm lại:**
  - Đã khớp NIST SP 800-30r1 mục 2.3.2: định tính hỗ trợ truyền đạt cho người ra quyết định, ít mức nên khó so sánh, chuyên gia khác nhau có thể cho kết quả rất khác nếu mức không được định nghĩa rõ; ghi lý do ("this value is high because…") giúp lặp lại được; bán định lượng dùng bins/thang mà giá trị "not maintained in other contexts".
  - Đã khớp NASA mục 4.3.2.3: timeframe near/mid/far-term so thời điểm sớm nhất sự kiện có thể xảy ra với thời gian cần để triển khai biện pháp.
  - Đã khớp Orange Book D6: risk evaluation là so kết quả phân tích với risk appetite.
  - Tình huống giả định: 4×2 = 2×4 = 8 đúng. Câu "matrix thường 5x5" là quy ước phổ biến (NASA nhắc "currently used 5x5 format").
  - Câu trả lời câu 4 (ưu tiên rủi ro vàng sắp xảy ra) là nhận định của người viết, dựa trên logic timeframe của NASA.
