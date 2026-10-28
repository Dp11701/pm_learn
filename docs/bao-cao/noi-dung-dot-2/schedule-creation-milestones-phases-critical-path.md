## schedule-creation-milestones-phases-critical-path

- Kiểm parser: Schedule creation (milestones, phases, critical path) (chu-de) · Đủ khối 9/9
- Nguồn đã mở: [Schedule Assessment Guide (GAO-16-89G), Capturing All Effort — U.S. Government Accountability Office](https://gaoinnovations.gov/schedule-guide/capturing-all-effort.html) (link gốc trả 403 với truy cập tự động; đọc bản https://web.archive.org/web/20250201212701/https://gaoinnovations.gov/schedule-guide/capturing-all-effort.html); [Schedule Assessment Guide (GAO-16-89G), The Critical Path Method — U.S. Government Accountability Office](https://gaoinnovations.gov/schedule-guide/the-critical-path-method.html) (như trên, bản https://web.archive.org/web/20250201210612/https://gaoinnovations.gov/schedule-guide/the-critical-path-method.html); [NASA Schedule Management Handbook (NASA/SP-2010-3403, Rev. 1, 2020) — NASA OCFO](https://www.nasa.gov/wp-content/uploads/2020/11/nasa_schedule_management_hand_book.pdf); [The Scrum Guide (11/2020) — Ken Schwaber, Jeff Sutherland](https://scrumguides.org/scrum-guide.html)
- Agent soát đã sửa:
  - Khái niệm cốt lõi, Total float: "Hoạt động có float bằng 0 hoặc âm được coi là critical" → "Hoạt động critical là hoạt động có float thấp nhất (thường bằng 0, hoặc âm khi lịch đã trễ)". GAO định nghĩa critical activities là "have the least amount of float"; mốc 0 chỉ là quy ước thường gặp.
  - Khái niệm cốt lõi, Dependency: câu cũ ngầm hiểu chỉ có FS và SS → thêm FF, SF là hai loại ít gặp hơn (kiến thức chung về CPM), để không thiếu.
  - Đã đối chiếu: milestone thời lượng 0, không tốn nguồn lực, cần một milestone bắt đầu và một kết thúc, có điều kiện hoàn thành rõ, quá nhiều milestone che chuỗi việc; summary activity lấy ngày từ việc con và không được nối phụ thuộc (GAO, Capturing All Effort). Lịch thiếu việc hoặc thiếu logic thì công cụ báo critical path sai; near-critical (GAO, The Critical Path Method). Sprint "one month or less" (Scrum Guide).
  - Đã tự tính lại: A-B-D = 5+10+4 = 19, A-C-D = 5+8+4 = 17, float C = 2; C trễ 3 → float −1, kết thúc ngày 20. Tự kiểm tra 1 (15+2 = 17) và 2 (14+3 = 17, đường 14 có 1 ngày float) đúng.
- **Nên tự kiểm lại:**
  - Link gaoinnovations.gov trả 403 khi gọi tự động; mở thử trong trình duyệt, không được thì dùng link Internet Archive ở trên.
  - NASA Handbook được trích chung, bài không gán ý cụ thể nào cho nó.
  - Cách bù trong Ví dụ ("chuyển một phần việc giao diện cho dev đã xong việc khác") và Tự kiểm tra 4 (critical path chỉ gồm "Phase Xây dựng" do nối phụ thuộc vào summary activity) là suy luận của người viết từ nguyên tắc GAO; nguyên nhân khác có thể là LOE dài nằm trên đường găng.
  - Liên kết "blocks / is blocked by" của Jira là kiến thức chung.
