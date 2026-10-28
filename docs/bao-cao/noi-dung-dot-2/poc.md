## poc

- Kiểm parser: PoC (chu-de) · Đủ khối 9/9
- Nguồn đã mở: [Your guide to proof of concept (POC) in product development — Atlassian](https://www.atlassian.com/work-management/project-management/proof-of-concept); [Weighing the Options: Project Managers Can Tip the Scales When it Comes to Proof-of-Concept Initiatives (PM Network, 11/2019) — Marat Oyvetsky, PMI; đọc qua bản lưu Internet Archive vì pmi.org trả 403 với curl](https://web.archive.org/web/20221204041413/https://www.pmi.org/learning/library/weighing-options-poc-initiatives-11801); [Create a Spike Solution — Don Wells, ExtremeProgramming.org](http://www.extremeprogramming.org/rules/spike.html); [Spikes — Scaled Agile, Inc.](https://framework.scaledagile.com/spikes); [Proof of concept — Wikipedia](https://en.wikipedia.org/wiki/Proof_of_concept)
- Agent soát đã sửa:
  - Khái niệm cốt lõi, Throwaway code: "XP khuyên mặc định coi code này là sẽ bỏ đi" → "XP nhận xét phần lớn code spike không đủ tốt để giữ, nên hãy dự trù bỏ đi". Câu gốc của XP là "Most spikes are not good enough to keep, so expect to throw it away"; câu cũ nói mạnh hơn nguồn.
  - So sánh, hàng Đầu ra, cột MVP: "Sản phẩm chạy thật với bộ tính năng tối thiểu, phát hành được" → "Bản tối thiểu đưa cho người dùng thật để đo phản ứng, từ sản phẩm mỏng tới chỉ một landing page". Câu cũ theo cách hiểu của Atlassian (MVP là "market-ready"), nhưng lệch với Agile Alliance và Eric Ries, và mâu thuẫn với bài mvp.
  - So sánh, hàng Thời điểm, cột MVP: "Sau khi PoC được duyệt và hướng sản phẩm đã rõ" → "Khi hướng đi đã khả thi và cần kiểm chứng với người dùng thật". MVP dùng chính khi chưa rõ người dùng có cần không (Lean Startup), nên "hướng sản phẩm đã rõ" là sai ý.
- **Nên tự kiểm lại:**
  - Link PMI trả 403 với công cụ dòng lệnh (chặn bot). Bản lưu Internet Archive (12/2022) còn đủ bài: tác giả, số PM Network 11/2019, ý "gặp riêng từng stakeholder rồi gom một bảng success criteria chung". Câu hỏi 5 dựa đúng vào ý này. Link trong bài vẫn để link gốc; bạn mở bằng trình duyệt để chắc.
  - Trang SAFe "Spikes" chỉ mở công khai phần đầu, phần sau cần đăng nhập. Các ý bài dùng (enabler story, bắt nguồn từ XP, được ước lượng, làm và demo như story khác) nằm ở phần công khai.
  - Gọi spike là "dạng PoC nhỏ ở mức story" là cách hiểu của người viết. Nguồn không nói thẳng như vậy, nhưng mục đích của spike (giảm rủi ro kỹ thuật, ước lượng đáng tin hơn) khớp với PoC.
  - Ranh giới PoC / prototype / MVP trong bảng So sánh không có định nghĩa chuẩn chung. Atlassian coi MVP là bước sau khi PoC được duyệt; Agile Alliance thì coi MVP là công cụ để học. Bảng hiện theo cách hiểu thứ hai.
  - Các con số trong Ví dụ thực tế (5 ngày, 2 dev, 50 điểm giao, 3 giây) là giả định để minh hoạ.
