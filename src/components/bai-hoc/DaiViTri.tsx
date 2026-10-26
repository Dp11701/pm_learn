// C13 Dải vị trí (F11, F17, F02b, §6.2, D10): mỗi chấm là icon trạng thái 14px của một mục cùng lĩnh vực
// (không có lĩnh vực thì cùng phần), theo thứ tự cây; mục đang mở là icon 22px màu chữ. Ô bấm 24×24 bo 6,
// cách 2; màu như F11: Chưa học border-input, Đang học / Đã xong màu đặc (solid) của trạng thái, Bỏ qua (F11
// không vẽ) theo màu icon. Mỗi chấm là link tới bài, tên truy cập "Mục 3/16: <tên>, <trạng thái>[, đang
// mở]" (F11), tooltip "<tên> · <trạng thái>" (F02b).
// Bên phải "Mục 3/16 · <vùng>". Mobile (F18) chỉ có dòng chữ.
import { Link } from 'react-router'
import { Tooltip } from 'radix-ui'
import { dinhDangSo } from '../../../shared/dinh-dang'
import { TEN_TRANG_THAI_HOC, type TrangThaiHoc } from '../../../shared/domain/trang-thai'
import { viTriTrongVung, type Cay, type MucHoc } from '../../../shared/roadmap'
import TenMuc from '../TenMuc'
import IconTrangThai from '../trang-thai/IconTrangThai'
import { LOP_ICON } from '../trang-thai/mau-trang-thai'
import type { TraTrangThai } from './kieu'

/** Màu chấm theo trạng thái; F11 vẽ Đã xong / Đang học bằng đúng màu --st-done-solid / --st-learning-solid. */
const MAU_CHAM: Record<TrangThaiHoc, string> = {
  'chua-hoc': 'text-border-input',
  'dang-hoc': 'text-[var(--st-learning-solid)]',
  'da-xong': 'text-[var(--st-done-solid)]',
  'bo-qua': LOP_ICON['bo-qua'],
}

export interface PropsDaiViTri {
  muc: MucHoc
  cay: Cay
  trangThaiCua: TraTrangThai
  className?: string
}

export default function DaiViTri({ muc, cay, trangThaiCua, className = '' }: PropsDaiViTri) {
  const { thuTu, tong, vung, cacMuc } = viTriTrongVung(cay, muc.id)
  const so = (n: number) => dinhDangSo(n)
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-3 ${className}`}>
      <Tooltip.Provider delayDuration={300}>
        <nav
          aria-label={`Các mục trong ${vung.label}`}
          className="flex flex-wrap items-center gap-0.5 max-md:hidden"
        >
          {cacMuc.map((m, i) => {
            const tt = trangThaiCua(m.id)
            const dangMo = m.id === muc.id
            const ten = TEN_TRANG_THAI_HOC[tt]
            return (
              <Tooltip.Root key={m.id}>
                <Tooltip.Trigger asChild>
                  <Link
                    to={`/hoc/${m.slug}`}
                    aria-label={`Mục ${so(i + 1)}/${so(tong)}: ${m.label}, ${ten}${dangMo ? ', đang mở' : ''}`}
                    aria-current={dangMo ? 'page' : undefined}
                    data-trang-thai={tt}
                    className={`flex size-6 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-150 hover:bg-surface-2 ${
                      dangMo ? 'text-text' : MAU_CHAM[tt]
                    }`}
                  >
                    <IconTrangThai trangThai={tt} size={dangMo ? 22 : 14} />
                  </Link>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="top"
                    sideOffset={6}
                    className="z-50 rounded-[var(--radius-sm)] bg-primary px-2 py-1 text-[length:var(--fs-chip)] leading-[var(--lh-chip)] text-on-primary shadow-[var(--shadow-2)] data-[state=closed]:animate-[an-dan_150ms_ease-in] data-[state=delayed-open]:animate-[hien-dan_150ms_ease-out]"
                  >
                    <TenMuc>{m.label}</TenMuc> · {ten}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            )
          })}
        </nav>
      </Tooltip.Provider>
      <span className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted tabular-nums">
        Mục {so(thuTu)}/{so(tong)} · <TenMuc>{vung.label}</TenMuc>
      </span>
    </div>
  )
}
