// C21 Câu tự kiểm tra — bản chỉ đọc của phase 2a (F11 "Tự kiểm tra", F02b; §1, đề xuất 3.2).
// Trạng thái 0 của frame: hiện câu hỏi, nút "Xem đáp án" tắt. Đáp án KHÔNG có trong trang (chỉ hiện sau khi tự
// trả lời — "tự trả lời trước, rồi mới xem đáp án"); ô trả lời, Xem đáp án, tự chấm Đúng / Một phần / Sai và
// "Tạo flashcard" cần lưu SQLite → phase 3.
import type { CauHoi } from '../../../shared/noi-dung'
import type { MucHoc } from '../../../shared/roadmap'
import { dinhDangSo } from '../../../shared/dinh-dang'
import Nut from '../Nut'
import KhoiBai from './KhoiBai'
import MarkdownBai from './Markdown'
import { CAU_HOI_SAP_CO } from '../../copy/cho-duyet'

export interface PropsCauTuKiemTra {
  cau: CauHoi
  thu: number
  tong: number
  muc: MucHoc
  tenKhoi: string
}

/** Một câu: "Câu i/n", câu hỏi 17/28 500, "Xem đáp án" tắt + câu "Có ở phase 3". */
export function CauTuKiemTra({ cau, thu, tong, muc, tenKhoi }: PropsCauTuKiemTra) {
  return (
    <li data-khoa-cau={cau.khoa} className="flex min-w-0 flex-col gap-3">
      <span className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted tabular-nums">
        Câu {dinhDangSo(thu)}/{dinhDangSo(tong)}
      </span>
      <div className="font-medium [text-wrap:pretty]">
        <MarkdownBai muc={muc} tenKhoi={tenKhoi} trongDong>
          {cau.hoi}
        </MarkdownBai>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Nut bien="phu" disabled>
          Xem đáp án
        </Nut>
        <span className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
          {CAU_HOI_SAP_CO}
        </span>
      </div>
    </li>
  )
}

export interface PropsKhoiTuKiemTra {
  id: string
  tieuDe: string
  cauHoi: readonly CauHoi[]
  muc: MucHoc
}

/** Khối Tự kiểm tra theo quy ước "- H: … | Đ: …": card, mỗi câu một C21, các câu cách nhau bằng đường kẻ. */
export default function KhoiTuKiemTra({ id, tieuDe, cauHoi, muc }: PropsKhoiTuKiemTra) {
  return (
    <KhoiBai id={id} tieuDe={tieuDe} phu="Tự trả lời trước, rồi mới xem đáp án." card>
      <ol className="m-0 flex list-none flex-col gap-4 p-0 [&>li+li]:border-t [&>li+li]:border-border [&>li+li]:pt-4">
        {cauHoi.map((cau, i) => (
          <CauTuKiemTra
            key={cau.khoa}
            cau={cau}
            thu={i + 1}
            tong={cauHoi.length}
            muc={muc}
            tenKhoi={tieuDe}
          />
        ))}
      </ol>
    </KhoiBai>
  )
}
