// C20 Thẻ thực hành — bản chỉ đọc của phase 2a (F11 "Thực hành trên dự án thật", đề xuất 1.5).
// Hiện đề bài, đầu ra, tiêu chí tự kiểm từ file (tiêu chí là task list Markdown, ô tick chỉ để đọc). Chọn dự án,
// ô "Kết quả của bạn", nút Xong / Không áp dụng (ghi lý do) và tick tiêu chí cần lưu SQLite → phase 3; tới lúc
// đó là dòng C38 "Có ở phase 3". Dòng phụ "Bước Áp dụng · <tình trạng>" như F11.
import type { MucCon } from '../../../shared/noi-dung'
import type { MucHoc } from '../../../shared/roadmap'
import { TEN_BUOC } from '../../../shared/domain/trang-thai'
import { SapCo } from '../TrangThaiTrong'
import KhoiBai from './KhoiBai'
import MarkdownBai from './Markdown'
import { THUC_HANH_SAP_CO } from '../../copy/cho-duyet'

export interface PropsTheThucHanh {
  id: string
  tieuDe: string
  mucCon: readonly MucCon[]
  muc: MucHoc
  /** Tình trạng bước Áp dụng, vd. "chưa làm" (F11 "đang làm") */
  tinhTrang: string
}

export default function TheThucHanh({ id, tieuDe, mucCon, muc, tinhTrang }: PropsTheThucHanh) {
  return (
    <KhoiBai id={id} tieuDe={tieuDe} phu={`Bước ${TEN_BUOC['ap-dung']} · ${tinhTrang}`} card>
      {mucCon.map((m) => (
        <div key={`${m.dong}-${m.tieuDe}`} className="flex min-w-0 flex-col gap-1">
          <h3 className="m-0 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] font-semibold">
            {m.mauTen ?? m.tieuDe}
          </h3>
          {m.noiDung !== '' && (
            <MarkdownBai muc={muc} tenKhoi={tieuDe}>
              {m.noiDung}
            </MarkdownBai>
          )}
        </div>
      ))}
      <SapCo
        phase="3"
        moTa={THUC_HANH_SAP_CO}
        className="border-t border-border pt-4 text-[length:var(--fs-ui)] leading-[var(--lh-ui)]"
      />
    </KhoiBai>
  )
}
