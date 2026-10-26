// C17 Bảng mẫu, bản cơ bản của phase 2a (F15 "Mẫu điền sẵn", F02b, quyết định 9): bảng GFM đầu tiên của
// khối trong vùng cuộn ngang riêng (Tab tới được để cuộn bằng phím), chữ 13/20, hàng tiêu đề nền surface-2,
// cột đầu dính khi cuộn ngang (ô đầu mỗi hàng là th scope="row"). Bóng đổ khi đã cuộn và "Tải .md / .csv"
// có ở phase 7c.
import type { Bang } from '../../../shared/noi-dung'
import type { MucHoc } from '../../../shared/roadmap'
import MarkdownBai from './Markdown'

export interface PropsBangMau {
  bang: Bang
  muc: MucHoc
  tenKhoi: string
}

const O = 'border-b border-border px-3 py-2.5 text-left align-top'
const COT_DAU = 'sticky left-0 border-r border-border'

export default function BangMau({ bang, muc, tenKhoi }: PropsBangMau) {
  const o = (chu: string) => (
    <MarkdownBai muc={muc} tenKhoi={tenKhoi} trongDong>
      {chu}
    </MarkdownBai>
  )
  return (
    <div
      role="region"
      aria-label={`Bảng mẫu ${muc.label}, cuộn ngang`}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="max-w-full overflow-x-auto rounded-[var(--radius-md)] border border-border bg-surface"
    >
      <table className="w-full border-separate border-spacing-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)]">
        <thead>
          <tr>
            {bang.cot.map((cot, i) => (
              <th
                key={i}
                scope="col"
                className={`${O} h-11 bg-surface-2 font-semibold whitespace-nowrap ${
                  i === 0 ? `${COT_DAU} z-[2]` : ''
                }`}
              >
                {o(cot)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bang.hang.map((hang, h) => (
            <tr key={h}>
              {hang.map((chu, i) =>
                i === 0 ? (
                  <th
                    key={i}
                    scope="row"
                    className={`${O} ${COT_DAU} z-[1] bg-surface font-medium`}
                  >
                    {o(chu)}
                  </th>
                ) : (
                  <td key={i} className={`${O} tabular-nums`}>
                    {o(chu)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
