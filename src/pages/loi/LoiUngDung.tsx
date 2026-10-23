// Error boundary toàn app: hiện cả khi khung app hoặc provider hỏng, nên không dùng khung, toast, query.
// Cây roadmap không nạp được (GocApp gọi layCay) cũng rơi vào đây → "Không đọc được cây roadmap".
import { useRouteError } from 'react-router'
import { NoiDungLoi } from './noi-dung-loi'

export default function LoiUngDung() {
  const loi = useRouteError()
  return (
    <main
      id="noi-dung-chinh"
      className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-12 text-text max-md:px-4"
    >
      <NoiDungLoi loi={loi} />
    </main>
  )
}
