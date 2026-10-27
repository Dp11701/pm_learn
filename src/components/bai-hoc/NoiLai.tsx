// Khối "Nói lại bằng lời của bạn" — bước Hiểu (F11 #b-noi-lai; §1; đề xuất 1.5, 3.2): card padding 20, cách 8;
// hàng đầu là tên khối 15/24 600 + C25 bên phải, dòng gợi ý 13/20 muted của F11, ô 3 dòng tự lưu (OTuLuu).
// Ô có chữ thì bước Hiểu xong ngay (lớp dữ liệu đưa chữ chưa lưu vào vòng 4 bước), không chờ lưu.
import { useId } from 'react'
import type { MucHoc } from '../../../shared/roadmap'
import { useLuuNoiLai } from '../../app/du-lieu/hoc'
import { NOI_LAI_TOI_DA } from '../../../server/du-lieu/hop-dong-hoc'
import DongLoiHoc from './DongLoiHoc'
import { LOP_CARD } from './KhoiBai'
import OTuLuu, { TrangThaiTuLuu } from './OTuLuu'

export interface PropsNoiLai {
  id: string
  tieuDe: string
  muc: MucHoc
}

export default function NoiLai({ id, tieuDe, muc }: PropsNoiLai) {
  const tuLuu = useLuuNoiLai(muc.id)
  const idTen = useId()
  const idGoiY = useId()
  return (
    <section
      id={id}
      tabIndex={-1}
      data-khoi={id}
      aria-labelledby={idTen}
      className={`flex min-w-0 scroll-mt-6 flex-col gap-2 focus:outline-none ${LOP_CARD}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2
          id={idTen}
          className="m-0 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] font-semibold"
        >
          {tieuDe}
        </h2>
        <TrangThaiTuLuu tuLuu={tuLuu} />
      </div>
      <span
        id={idGoiY}
        className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted"
      >
        1–3 câu. Viết xong thì bước Hiểu được đánh dấu.
      </span>
      <OTuLuu
        tuLuu={tuLuu}
        rows={3}
        maxLength={NOI_LAI_TOI_DA}
        aria-labelledby={idTen}
        aria-describedby={idGoiY}
      />
      <DongLoiHoc itemId={muc.id} />
    </section>
  )
}
