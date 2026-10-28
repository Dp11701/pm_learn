## decision-log

- Kiểm parser: Decision Log (chu-de) · Đủ khối 9/9
- Nguồn đã mở: [Documenting Architecture Decisions (15/11/2011) — Michael Nygard, Cognitect](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions); [Architectural Decision Records (ADRs) — ADR GitHub organization](https://adr.github.io/); [Decisions Blueprint — Atlassian](https://confluence.atlassian.com/doc/decisions-blueprint-339739406.html); [DACI: A Decision-Making Framework — Atlassian Team Playbook](https://www.atlassian.com/team-playbook/plays/daci)
- Agent soát đã sửa:
  - So sánh, dòng "Phạm vi" của Change log: "Chỉ thay đổi so với baseline đã duyệt" → "Các thay đổi được đề xuất qua quy trình kiểm soát thay đổi". Change log ghi mọi change request đã gửi và trạng thái của chúng, kể cả cái bị từ chối, không chỉ thay đổi baseline (khớp với bài change-log và dòng "Ghi gì" ngay trên).
- **Nên tự kiểm lại:**
  - Đã khớp nguồn: người mới chỉ còn "blind acceptance" hoặc "blind reversal", và cả hai đều có thể hại dự án; mỗi ADR một quyết định; ghi mọi hệ quả, không chỉ hệ quả tốt; trạng thái proposed / accepted / deprecated / superseded, quyết định bị đảo thì giữ bản cũ và đánh dấu superseded (Nygard). Tập ADR của dự án là decision log của dự án (adr.github.io). Index của Decisions blueprint đóng vai Decision Log của space (Atlassian). Approver là "the one person" ra quyết định, Informed là người bị ảnh hưởng, cần được báo (DACI).
  - Mẫu ADR của Nygard chỉ có Title, Context, Decision, Status, Consequences, không có mục "các phương án đã xét". Bài viết "thường gồm… các phương án đã xét" là theo các mẫu ADR sau này, không gán cho Nygard, nên vẫn đúng.
  - "Rationale là phần khó tìm lại nhất" diễn ý câu của Nygard ("one of the hardest things to track… is the motivation behind certain decisions"); chữ "nhất" là nhấn mạnh của người viết.
  - Tiêu chí "quyết định đủ quan trọng để ghi" (phạm vi, kiến trúc, chi phí, mốc, nhiều đội) là gợi ý của người viết, không lấy từ nguồn.
