// Error boundary từng route, hiện trong khung app (§5 đề xuất "Không trắng màn hình", F26 "Lỗi trang").
import { useRouteError } from 'react-router'
import { LE_NGANG_TRANG } from '../../app/khung/le-trang'
import { NoiDungLoi } from './noi-dung-loi'

export default function LoiTrang() {
  const loi = useRouteError()
  return (
    <div className={`pt-16 pb-12 ${LE_NGANG_TRANG}`}>
      <NoiDungLoi loi={loi} />
    </div>
  )
}
