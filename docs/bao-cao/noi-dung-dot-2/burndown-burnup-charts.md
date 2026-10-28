## burndown-burnup-charts

- Kiểm parser: Burndown/Burnup charts (chu-de) · Đủ khối 9/9
- Nguồn đã mở: [Burndown Chart (Agile Glossary) — Agile Alliance](https://www.agilealliance.org/glossary/burndown-chart/); [Agile Burndown Chart Tutorial — Atlassian](https://www.atlassian.com/agile/tutorials/burndown-charts); [View and understand the Burnup chart — Atlassian Support](https://support.atlassian.com/jira-software-cloud/docs/view-and-understand-the-burnup-chart/); [Velocity (Agile Glossary) — Agile Alliance](https://www.agilealliance.org/glossary/velocity/); [The Scrum Guide (11/2020) — Ken Schwaber, Jeff Sutherland](https://scrumguides.org/scrum-guide.html)
- Agent soát đã sửa:
  - Vì sao PM cần biết: "burndown đi lên có thể do nhóm chậm" sai về logic: nhóm chậm thì đường đi ngang, chỉ thêm việc (hoặc ước lượng lại) mới làm đường đi lên. Sửa thành "burndown nằm trên đường lý tưởng có thể do nhóm chậm, cũng có thể do ai đó thêm việc" (khớp Atlassian: "above ideal … at risk (or scope increased)").
  - Vì sao PM cần biết: "cách nhanh nhất" → "một cách nhanh" (phóng đại, nguồn không nói).
  - Khái niệm Ideal line: "nằm trên … nghĩa là đang chậm" → "là dấu hiệu sprint có rủi ro hoặc phạm vi đã tăng", theo đúng chữ "may be at risk (or scope increased)" của Atlassian.
  - Đã tự tính lại mọi số, đều đúng: ví dụ 40/10 = 4 point/ngày; ngày 5 lý tưởng còn 20; 48 − 16 = 32 còn lại; lệch 12 = 8 do thêm phạm vi + 4 do chậm (16 so với 20). Câu hỏi burnup: 300 − 120 = 180; 30 − 10 = 20/sprint → 9 sprint; chốt phạm vi → 6 sprint.
  - Đã khớp nguồn, không sửa: sprint/product burndown và information radiator, "only provide an indication of trends" (Agile Alliance); đường scope tăng là dấu hiệu scope creep, đường completed là việc đã chuyển sang Done, hai đường gặp nhau khi xong (Jira burnup); task count làm méo, không dùng làm thước đo cá nhân, ideal = tổng việc ÷ số ngày làm việc, epic/release burndown (Atlassian); câu về burn-down/burn-up trong Scrum Guide 2020.
- **Nên tự kiểm lại:**
  - "Đường đỏ nằm trên đường xám" (Góc dev lead): màu của sprint burndown trong Jira, người soát không mở trang tài liệu riêng của báo cáo Burndown để xác nhận màu; giao diện Jira có thể đổi.
  - Ý "mỗi nhóm ước lượng point theo cách riêng nên không so được giữa các nhóm" là hiểu biết phổ biến, các nguồn đã mở không nói nguyên văn.
  - Nguồn Velocity của Agile Alliance ít được dùng trực tiếp trong bài (chỉ liên quan câu hỏi dự báo burnup); có thể bỏ nếu muốn gọn.
