// C19 Callout 2 cột (F11 "Góc dev lead → PM", F02b; đề xuất 1.5): lưới tự xuống hàng khi hẹp
// (minmax(min(240px, 100%), 1fr)), các ô cách nhau 1px trên nền viền, bo 10; ô nền surface-2, padding 20,
// tiêu đề ### 15/24 600, chữ 15/24. Không dùng vạch trái (vạch trái chỉ cho trạng thái học, §5.1).
import type { MucCon } from '../../../shared/noi-dung'
import type { MucHoc } from '../../../shared/roadmap'
import MarkdownBai from './Markdown'

export interface PropsCallout {
  /** Các tiểu mục ### theo thứ tự trong file */
  mucCon: readonly MucCon[]
  muc: MucHoc
  tenKhoi: string
}

export default function Callout({ mucCon, muc, tenKhoi }: PropsCallout) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-px overflow-hidden rounded-[var(--radius-md)] border border-border bg-border">
      {mucCon.map((m) => (
        <div
          key={`${m.dong}-${m.tieuDe}`}
          className="flex min-w-0 flex-col gap-2 bg-surface-2 p-5 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] max-md:p-4"
        >
          <h3 className="m-0 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] font-semibold">
            {m.mauTen ?? m.tieuDe}
          </h3>
          {m.noiDung !== '' && (
            <MarkdownBai muc={muc} tenKhoi={tenKhoi}>
              {m.noiDung}
            </MarkdownBai>
          )}
        </div>
      ))}
    </div>
  )
}
