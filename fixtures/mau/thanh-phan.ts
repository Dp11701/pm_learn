// Chữ mẫu cho gallery /_dev/thanh-phan (F01, theo docs/design-handoff/design/Main.dc.html).
// Chỉ nạp bằng import động khi import.meta.env.DEV; code trong src/ không chứa chữ mẫu (đề xuất mục 6).
import type { MauF01 } from '../../src/dev/thanh-phan/F01'

export const mauF01: MauF01 = {
  moTa: 'Sổ tay kỹ thuật cho người tự học Project Management: phẳng, viền mảnh, không minh hoạ, không emoji. Mỗi kênh thị giác chỉ mang một nghĩa; màu không bao giờ là tín hiệu duy nhất.',
  linhVuc: { ten: 'Scope Management', phanSo: '5/16' },
  chuDe: 'Scope Creep',
  taiLieu: 'Risk Register',
  chungChi: 'Project Management Professional (PMP)',
  nhom: 'Prioritization Techniques',
  boQua: 'Use Case Points',
  canOnLai: 'MoSCoW',
  ngayDuyet: '18/10/2026',
  chu: {
    h1: 'Ước lượng chi phí',
    h2: 'Quản lý rủi ro định lượng',
    thanBai: 'Nghiệm thu sản phẩm bàn giao',
    thanBaiEn: 'Acceptance of deliverables',
    ui: 'Đặt trạng thái · Học tiếp trong lĩnh vực',
    meta: '19% · 37/195 · 4 bỏ qua · 22/10/2026 21:42',
    chip: 'Bản nháp · Tự viết',
    mono: 'noi-dung/project-management/scope-management/scope-creep.md',
  },
  chuThich: {
    nhan: 'Nội dung mẫu',
    bienThe: ['liên kết mẫu', 'nhãn mẫu', 'Đề xuất mẫu'],
    tieuDe: 'Tóm tắt',
    doan: 'Scope Creep là khi phạm vi dự án lớn dần vì yêu cầu mới không qua kiểm soát thay đổi.',
  },
  iconPhan: [
    { icon: 'briefcase', nhan: 'Phần PM' },
    { icon: 'trending-up', nhan: 'Business Acumen' },
    { icon: 'cpu', nhan: 'Technical Acumen' },
    { icon: 'wrench', nhan: 'Tools' },
  ],
}
