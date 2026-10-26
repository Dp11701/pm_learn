// Bản giả cho test router. Khung app, phím tắt, tìm kiếm là module của agent khác: test chỉ kiểm bảng
// route, trang và trang lỗi của he-thong nên thay chúng bằng bản giả ở đây (không import router để
// vi.mock nạp được file này mà không vòng; vì thế cũng import thẳng file con của shared/roadmap).
import { createElement, type ComponentType, type ReactNode } from 'react'
import { Outlet } from 'react-router'
import { dungCay } from '../../../shared/roadmap/dung-cay'
import { LoiCay } from '../../../shared/roadmap/loi'
import cauHinhJson from '../../../shared/roadmap/cau-hinh-cay.json'
import cayJson from '../../fixtures/roadmap-tree.json'

/** Bật để làm hỏng: cây (layCay ném LoiCay), khung app, một trang trong khung. */
export const hong = { cay: false, khung: false, trang: false }

export const LOI_TRANG_THU = 'Trang thử ném lỗi khi dựng'
export const LOI_KHUNG_THU = 'Khung thử ném lỗi khi dựng'
export const LOI_CAY_THU = 'Nút “x” có kind không hợp lệ.'

/** Cây đóng băng tests/fixtures/roadmap-tree.json. */
export const cayMau = dungCay(cayJson, cauHinhJson)

export function layCayGia() {
  if (hong.cay) throw new LoiCay(LOI_CAY_THU)
  return cayMau
}

export function KhungGia() {
  if (hong.khung) throw new Error(LOI_KHUNG_THU)
  return (
    <div data-testid="khung">
      <main id="noi-dung-chinh">
        <Outlet />
      </main>
    </div>
  )
}

export function QuaMat({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/** Bọc một trang thật: hong.trang thì ném lỗi khi dựng. */
export function trangCoTheHong(Trang: ComponentType) {
  return function TrangCoTheHong() {
    if (hong.trang) throw new Error(LOI_TRANG_THU)
    return createElement(Trang)
  }
}
