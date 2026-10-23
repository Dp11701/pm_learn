// Nội dung trang lỗi theo loại lỗi: cây roadmap không nạp được (bất biến 1) hoặc lỗi hiển thị (F26).
import { isRouteErrorResponse } from 'react-router'
import { LoiCay } from '../../../shared/roadmap'
import KhoiLoi, { dieuHuongTrinhDuyet } from './KhoiLoi'

export function laLoiCay(loi: unknown): boolean {
  return loi instanceof LoiCay || (loi instanceof Error && loi.name === 'LoiCay')
}

/** Chi tiết kỹ thuật ngắn cho "Chi tiết lỗi". */
export function moTaLoi(loi: unknown): string {
  if (isRouteErrorResponse(loi)) {
    const du = typeof loi.data === 'string' && loi.data !== '' ? `\n${loi.data}` : ''
    return `${loi.status} ${loi.statusText}${du}`.trim()
  }
  if (loi instanceof Error) return `${loi.name}: ${loi.message}`
  return String(loi)
}

/**
 * "Không đọc được cây roadmap" + "Thử lại" (bất biến 1). Cây được bundle cùng app nên Thử lại = tải lại
 * trang (sau khi sửa docs/roadmap-tree.json hoặc cau-hinh-cay.json).
 */
export function NoiDungLoiCay({ loi }: { loi: unknown }) {
  return (
    <KhoiLoi
      tieuDe="Không đọc được cây roadmap."
      tenTrang="Không đọc được cây roadmap"
      moTa="Dữ liệu học của bạn không bị ảnh hưởng."
      nhanNut="Thử lại"
      khiBam={dieuHuongTrinhDuyet.taiLai}
      chiTiet={moTaLoi(loi)}
    />
  )
}

/** F26 "Lỗi trang": "Trang này gặp lỗi khi hiển thị." + "Tải lại" + "Chi tiết lỗi". */
export function NoiDungLoiTrang({ loi }: { loi: unknown }) {
  return (
    <KhoiLoi
      tieuDe="Trang này gặp lỗi khi hiển thị."
      tenTrang="Lỗi trang"
      moTa="Dữ liệu học của bạn không bị ảnh hưởng."
      nhanNut="Tải lại"
      khiBam={dieuHuongTrinhDuyet.taiLai}
      chiTiet={moTaLoi(loi)}
    />
  )
}

export function NoiDungLoi({ loi }: { loi: unknown }) {
  return laLoiCay(loi) ? <NoiDungLoiCay loi={loi} /> : <NoiDungLoiTrang loi={loi} />
}
