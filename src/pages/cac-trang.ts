// Các route tĩnh chưa làm tới (§6.1 routes P0 + P1, đề xuất 4.1, mục 9): tên trang, phase sẽ có, một câu
// trang sẽ làm gì. Phase làm trang thật thay route tương ứng trong src/app/router.tsx.
import { MO_TA_SAP_CO } from '../copy/cho-duyet'

export interface TrangTinh {
  /** Đường dẫn tương đối trong khung app; '' = trang chủ (index). */
  duongDan: string
  tenTrang: string
  phase: string
  moTa: string
}

export const CAC_TRANG_TINH: readonly TrangTinh[] = [
  {
    duongDan: '',
    tenTrang: 'Tổng quan',
    phase: '5',
    moTa: MO_TA_SAP_CO.tongQuan,
  },
  {
    duongDan: 'lo-trinh',
    tenTrang: 'Lộ trình',
    phase: '4',
    moTa: MO_TA_SAP_CO.loTrinh,
  },
  {
    duongDan: 'noi-dung',
    tenTrang: 'Nội dung',
    phase: '2b',
    moTa: MO_TA_SAP_CO.noiDung,
  },
  {
    duongDan: 'on-tap',
    tenTrang: 'Ôn tập',
    phase: '8',
    moTa: MO_TA_SAP_CO.onTap,
  },
  {
    duongDan: 'on-tap/phien',
    tenTrang: 'Phiên ôn',
    phase: '8',
    moTa: MO_TA_SAP_CO.phienOn,
  },
  {
    duongDan: 'lo-trinh-goi-y',
    tenTrang: 'Lộ trình gợi ý',
    phase: '12',
    moTa: MO_TA_SAP_CO.loTrinhGoiY,
  },
  {
    duongDan: 'thong-ke',
    tenTrang: 'Thống kê',
    phase: '11',
    moTa: MO_TA_SAP_CO.thongKe,
  },
  {
    duongDan: 'ho-so',
    tenTrang: 'Bộ hồ sơ dự án',
    phase: '11',
    moTa: MO_TA_SAP_CO.hoSo,
  },
  {
    duongDan: 'chung-chi',
    tenTrang: 'Chứng chỉ',
    phase: '11',
    moTa: MO_TA_SAP_CO.chungChi,
  },
  {
    duongDan: 'chao-mung',
    tenTrang: 'Thiết lập lần đầu',
    phase: '12',
    moTa: MO_TA_SAP_CO.chaoMung,
  },
  {
    duongDan: 'thuat-ngu',
    tenTrang: 'Thuật ngữ',
    phase: '12',
    moTa: MO_TA_SAP_CO.thuatNgu,
  },
  {
    duongDan: 'ghi-chu',
    tenTrang: 'Ghi chú',
    phase: '10',
    moTa: MO_TA_SAP_CO.ghiChu,
  },
  {
    duongDan: 'cai-dat',
    tenTrang: 'Cài đặt',
    phase: '10',
    moTa: MO_TA_SAP_CO.caiDat,
  },
]
