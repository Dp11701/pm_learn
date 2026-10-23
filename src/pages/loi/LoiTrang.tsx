// Error boundary từng route, hiện trong khung app (§5 đề xuất "Không trắng màn hình", F26 "Lỗi trang").
import { useRouteError } from 'react-router'
import { NoiDungLoi } from './noi-dung-loi'

export default function LoiTrang() {
  const loi = useRouteError()
  return (
    <div className="px-10 pt-16 pb-12 max-lg:px-6 max-md:px-4">
      <NoiDungLoi loi={loi} />
    </div>
  )
}
