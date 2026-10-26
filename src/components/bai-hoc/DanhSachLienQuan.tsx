// Danh sách "Mục liên quan" (F11, F12, F15; Cần chốt 5: chỉ từ lien_quan của frontmatter, giá trị không tra
// được thì bỏ qua). Mỗi hàng là link tới bài: icon trạng thái 16 + tên (600, lang=en), dòng dưới "<trạng
// thái> · <breadcrumb>" 13/20 (D2: trạng thái luôn có icon + chữ), bên phải chip nội dung (khi biết) + chip
// loại (F11 vẽ "Chưa có nội dung"; chip lấy từ useTrangThaiNoiDung). Khung: viền 1px, bo 10, hàng cao ≥ 44,
// các hàng cách nhau bằng đường kẻ.
import { Link } from 'react-router'
import { TEN_TRANG_THAI_HOC } from '../../../shared/domain/trang-thai'
import { chuoiCha, type Cay, type MucHoc } from '../../../shared/roadmap'
import { useTrangThaiNoiDung, type TraNoiDung } from '../../app/du-lieu/noi-dung'
import TenMuc from '../TenMuc'
import ChipLoai from '../trang-thai/ChipLoai'
import ChipNoiDung from '../trang-thai/ChipNoiDung'
import IconTrangThai from '../trang-thai/IconTrangThai'
import type { TraTrangThai } from './kieu'

export interface PropsDanhSachLienQuan {
  cacMuc: readonly MucHoc[]
  cay: Cay
  trangThaiCua: TraTrangThai
  /** Trạng thái nội dung của từng mục; mặc định theo máy chủ (useTrangThaiNoiDung), chưa biết thì không có
   *  chip nội dung. */
  noiDungCua?: TraNoiDung
}

export default function DanhSachLienQuan({
  cacMuc,
  cay,
  trangThaiCua,
  noiDungCua,
}: PropsDanhSachLienQuan) {
  const theoMayChu = useTrangThaiNoiDung()
  const traNoiDung = noiDungCua ?? theoMayChu
  return (
    <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface p-0">
      {cacMuc.map((m) => {
        const tt = trangThaiCua(m.id)
        const noiDung = traNoiDung(m.id)
        const duongCha = chuoiCha(cay, m.id)
          .map((n) => n.label)
          .join(' › ')
        return (
          <li key={m.id} className="border-b border-border last:border-b-0">
            <Link
              to={`/hoc/${m.slug}`}
              className="flex min-h-11 items-center gap-3 px-4 py-2.5 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] text-text no-underline transition-colors duration-150 hover:bg-surface-2 focus-trong max-md:flex-wrap"
            >
              <IconTrangThai trangThai={tt} size={16} toMau />
              <span className="flex min-w-0 flex-1 flex-col">
                <TenMuc className="font-semibold">{m.label}</TenMuc>
                <span className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
                  {TEN_TRANG_THAI_HOC[tt]} · <TenMuc>{duongCha}</TenMuc>
                </span>
              </span>
              <span className="flex shrink-0 flex-wrap items-center gap-2 max-md:basis-full max-md:pl-7">
                {noiDung && <ChipNoiDung trangThai={noiDung} />}
                <ChipLoai loai={m.mau} />
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
