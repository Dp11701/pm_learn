// Chữ mẫu cho gallery /_dev/thanh-phan (F01 theo docs/design-handoff/design/Main.dc.html, F02, F02b).
// Chỉ nạp bằng import động khi import.meta.env.DEV; code trong src/ không chứa chữ mẫu (đề xuất mục 6).
// Tên mục phải có trong docs/roadmap-tree.json: gallery tra cây để lấy id, slug (sidebar, link Soạn bài).
import type { MauF01 } from '../../src/dev/thanh-phan/F01'
import type { MauF02 } from '../../src/dev/thanh-phan/F02'
import type { MauF02b } from '../../src/dev/thanh-phan/F02b'

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

// F02 Component phần 1 (docs/design-handoff/design/F02-sang.dc.html).
export const mauF02: MauF02 = {
  lyDoBoQua: 'Không dùng trong công việc',
  soTheCanOn: 2,
  badge: { onTap: 12, noiDung: 9, vuotMuc: 128 },
  streak: { ngay: 5, kyLuc: 12 },
  mucSoan: 'Scope Creep',
  ngayDuyet: '2026-10-18',
  loiFile: 'Lỗi frontmatter · dòng 3',
  // 37 xong, 6 đang học, 4 bỏ qua trên 199 mục → "19% · 37/195 · 4 bỏ qua"
  tienDo: { xong: 37, dangHoc: 6, boQua: 4, tong: 199 },
  theoVung: [
    { ten: 'PM Framework / Approach', xong: 12, dangHoc: 0, boQua: 0, tong: 22 },
    { ten: 'Schedule Management', xong: 3, dangHoc: 1, boQua: 2, tong: 16 },
    { ten: 'Risk Management', xong: 0, dangHoc: 0, boQua: 0, tong: 10 },
  ],
  noiDung: { daDuyet: 41, banNhap: 9, tong: 199 },
  duAn: 'Cổng đặt lịch nội bộ',
  goiYDuAn: 'Vd. Cổng đặt lịch nội bộ',
  ngayThi: '2027-06-15',
  ngaySai: '31/02/2026',
  // 21:42 giờ Việt Nam
  luuLuc: '2026-10-22T14:42:00.000Z',
}

// F02b Component phần 2 (docs/design-handoff/design/F02b-sang.dc.html, artboard C34).
export const mauF02b: MauF02b = {
  dangHoc: ['Risk Register', 'Scope Creep', 'Power/Interest Grid'],
  tongDangHoc: 6,
  soTheDenHan: 12,
  soBanNhap: 9,
  mucMau: 'Scope Creep',
  bonBuoc: { hieu: 'xong', 'ap-dung': 'dang-lam', 'kiem-tra': 'chua-lam', 'ghi-nho': 'xong' },
  luuLuc: '2026-10-22T14:42:00.000Z',
}
