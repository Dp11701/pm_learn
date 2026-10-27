// Dòng lỗi trong một khối học khi GET /api/hoc/:id hỏng và chưa có dữ liệu (F26 "lỗi theo từng card"; cùng kiểu
// với "Lỗi: không đọc được tiến độ bước — Thử lại" của C10): icon alert-circle + câu + "Thử lại" tải lại.
import { CircleAlert } from 'lucide-react'
import { useHoc } from '../../app/du-lieu/hoc'
import { LOI_DOC_DU_LIEU_HOC } from '../../copy/cho-duyet'

export const LOP_DONG_LOI =
  'm-0 flex flex-wrap items-center gap-1.5 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-danger'
export const LOP_NUT_THU_LAI =
  'cursor-pointer rounded-[var(--radius-sm)] text-danger underline hover:decoration-2'

/** Dòng lỗi + "Thử lại" (vd. lỗi đọc danh sách dự án). */
export function DongLoi({ cau, thuLai }: { cau: string; thuLai: () => void }) {
  return (
    <p className={LOP_DONG_LOI}>
      <CircleAlert size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      {cau} —
      <button type="button" onClick={thuLai} className={LOP_NUT_THU_LAI}>
        Thử lại
      </button>
    </p>
  )
}

/** Lỗi đọc dữ liệu học của mục `itemId` (không lỗi → không vẽ gì). */
export default function DongLoiHoc({ itemId }: { itemId: string }) {
  const { loi, taiLai } = useHoc(itemId)
  return loi ? <DongLoi cau={LOI_DOC_DU_LIEU_HOC} thuLai={taiLai} /> : null
}
