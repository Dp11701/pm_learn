## risk-and-issue-reports

- Kiểm parser: Risk and Issue Reports (chu-de) · Đủ khối 9/9
- Nguồn đã mở: [Templates for programmes or projects (Highlight Report, Exception Report, Risk Log, Issue Log) — NICS Centre of Expertise for Programme and Project Management, Department of Finance Bắc Ireland](https://www.finance-ni.gov.uk/publications/templates-programmes-or-projects) (tải và đọc 4 file .DOC của mẫu); [The Orange Book: Management of Risk – Principles and Concepts (May 2023) — HM Treasury](https://assets.publishing.service.gov.uk/media/6453acadc33b460012f5e6b8/HMT_Orange_Book_May_2023.pdf)
- Agent soát đã sửa:
  - Khái niệm cốt lõi, Exception report: "báo cáo PM gửi Project Board" → "gửi cấp quản lý ngay trên (thường là Project Board)". Mẫu Bắc Ireland: "the next higher level of management (usually the Project Board)"; cũng khớp hơn với ví dụ gửi cho sponsor.
  - Khái niệm cốt lõi, Escalation: nói rõ Orange Book viết cho quản trị rủi ro cấp tổ chức (board), và tách hai ý đúng nguồn: báo lên "based on agreed criteria" (C2) và "agreed triggers" để vấn đề lớn tới board "more rapidly when required" (A5). Bản cũ "nhanh hơn kỳ báo cáo thường" là diễn giải thêm.
  - Thực hành công cụ, bước 4: "gadget đếm số mục mới và đã đóng" → gọi đúng tên gadget Created vs. Resolved Chart của Jira.
- **Nên tự kiểm lại:**
  - Đã khớp nguồn: issue là "here and now", loại issue RFC/Off-Spec/General, cột của risk log và issue log, tiêu chí owner "relevant authority ... agreed and understood their responsibilities", nội dung exception report (mẫu Bắc Ireland, theo PRINCE2).
  - "Risk xảy ra thật thì chuyển thành issue" là cách hiểu phổ biến, nguồn đã mở chỉ nói "risks may occur, issues have already happened".
  - Các bước Jira (Thực hành công cụ) chưa có nguồn: tạo issue type mới cần quyền Jira admin (team-managed project thì project admin làm được), trường proximity/xác suất phải tự tạo custom field. Nên thử trên Jira của bạn.
  - Đầu ra "tối đa 5 risk và 5 issue" là gợi ý của người viết.
  - Ví dụ chuyển cổng thanh toán là giả định.
