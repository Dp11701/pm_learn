// Khái niệm cốt lõi theo quy ước "- **Thuật ngữ** — giải thích" (đề xuất 1.5) → danh sách định nghĩa như F11:
// dt 600, dd màu muted, các mục cách 12.
import type { DinhNghia } from '../../../shared/noi-dung'
import type { MucHoc } from '../../../shared/roadmap'
import MarkdownBai from './Markdown'

export interface PropsDanhSachDinhNghia {
  dinhNghia: readonly DinhNghia[]
  muc: MucHoc
  tenKhoi: string
}

export default function DanhSachDinhNghia({ dinhNghia, muc, tenKhoi }: PropsDanhSachDinhNghia) {
  return (
    <dl className="m-0 flex flex-col gap-3">
      {dinhNghia.map((d) => (
        <div key={`${d.dong}-${d.thuatNgu}`} className="flex min-w-0 flex-col gap-0.5">
          <dt className="font-semibold">
            <MarkdownBai muc={muc} tenKhoi={tenKhoi} trongDong>
              {d.thuatNgu}
            </MarkdownBai>
          </dt>
          <dd className="m-0 text-muted">
            <MarkdownBai muc={muc} tenKhoi={tenKhoi} trongDong>
              {d.giaiThich}
            </MarkdownBai>
          </dd>
        </div>
      ))}
    </dl>
  )
}
