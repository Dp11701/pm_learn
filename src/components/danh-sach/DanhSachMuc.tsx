// Danh sách mục học (Lộ trình, trang Lĩnh vực; §8.3, đề xuất 3.3, 3.9):
// - kiểu 'cay': Phần › Lĩnh vực › Nhóm › Mục, giữ cấp cha của mục đang hiện; mỗi phần / lĩnh vực / nhóm có tiêu đề
//   kèm phân số "x/y · n bỏ qua" + thanh, KHÔNG phụ thuộc bộ lọc (đề xuất 3.3). Tiêu đề nhóm có id = slug nhóm (điểm
//   neo #slug của duongDanNut). Lĩnh vực là link tới trang lĩnh vực.
// - kiểu 'phang' (sắp A–Z / Mở gần đây): danh sách phẳng, mỗi hàng có breadcrumb nhỏ.
// Bàn phím (sổ phím tắt: "Di chuyển giữa mục", phạm vi Danh sách): cả danh sách là một điểm Tab (roving tabindex trên
// link của hàng); ↑ ↓ Home End đi giữa các mục; Space chọn / bỏ chọn mục đang focus; Enter mở bài. Không chạy khi
// giữ Alt/Ctrl/⌘ hoặc bộ gõ đang ghép chữ.
import {
  Fragment,
  useMemo,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router'
import type { TrangThaiHoc, TrangThaiNoiDung } from '../../../shared/domain/trang-thai'
import { chuoiCha, type Cay, type MucHoc, type Nut } from '../../../shared/roadmap'
import { dangGhepChu } from '../TruongNhap'
import TenMuc from '../TenMuc'
import { chuPhanSo, ThanhTienDo } from '../trang-thai/TienDo'
import { LOP_CHU_META } from '../trang-thai/mau-trang-thai'
import { demTrongNut, dungCayHien, mucTheoNut, type NhomHien, type PhanTuHien } from './cay-hien'
import HangMuc from './HangMuc'

export type KieuDanhSach =
  | { loai: 'cay'; /** id các nút gốc, theo thứ tự cây */ goc: readonly string[]; capDau: 2 | 3 }
  | { loai: 'phang' }

export interface PropsDanhSachMuc {
  cay: Cay
  /** Mục đang hiện (đã lọc, đã sắp), đúng thứ tự vẽ ở kiểu phẳng */
  cacMuc: readonly MucHoc[]
  kieu: KieuDanhSach
  trangThaiCua: (id: string) => TrangThaiHoc
  canOnLaiCua: (id: string) => boolean
  noiDungCua: (id: string) => TrangThaiNoiDung | undefined
  chon: ReadonlySet<string>
  khiDoiChon: (id: string) => void
  /** id mục được mở tới (?muc=) */
  noiBat?: string
  /** Tên vùng danh sách cho trình đọc màn hình */
  nhan: string
}

const LOP_CHU_NHO = 'text-[length:var(--fs-chip)] leading-[var(--lh-chip)] text-muted'
const LOP_TIEU_DE: Record<number, string> = {
  2: 'text-[length:var(--fs-h2)] leading-[var(--lh-h2)] font-bold',
  3: 'text-[length:var(--fs-ui)] leading-[var(--lh-ui)] font-semibold',
  4: 'text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-semibold',
}

type KhoiHien = { loai: 'muc'; cacMuc: MucHoc[] } | { loai: 'nhom'; nhom: NhomHien }

/** Gom các mục liền nhau (cùng cấp) thành một khối; nhóm đứng riêng. Hàm thuần. */
function gomMucLienNhau(ds: readonly PhanTuHien[]): KhoiHien[] {
  const khoi: KhoiHien[] = []
  for (const pt of ds) {
    const cuoi = khoi.at(-1)
    if (pt.loai === 'nhom') khoi.push({ loai: 'nhom', nhom: pt.nhom })
    else if (cuoi?.loai === 'muc') cuoi.cacMuc.push(pt.muc)
    else khoi.push({ loai: 'muc', cacMuc: [pt.muc] })
  }
  return khoi
}

/** Link của các hàng theo thứ tự DOM. */
function cacLienKet(vung: HTMLElement): HTMLElement[] {
  return [...vung.querySelectorAll<HTMLElement>('[data-lien-ket-muc]')]
}

export default function DanhSachMuc({
  cay,
  cacMuc,
  kieu,
  trangThaiCua,
  canOnLaiCua,
  noiDungCua,
  chon,
  khiDoiChon,
  noiBat,
  nhan,
}: PropsDanhSachMuc) {
  const [viTriFocus, datViTriFocus] = useState<string | undefined>(undefined)
  const hienIds = useMemo(() => new Set(cacMuc.map((m) => m.id)), [cacMuc])
  const theoNut = useMemo(() => mucTheoNut(cay), [cay])
  // Hàng giữ tabindex 0: hàng vừa focus, không thì mục được mở tới, không thì hàng đầu tiên.
  const viTri =
    viTriFocus && hienIds.has(viTriFocus)
      ? viTriFocus
      : noiBat && hienIds.has(noiBat)
        ? noiBat
        : cacMuc[0]?.id

  function khiFocus(e: FocusEvent<HTMLElement>) {
    const id = (e.target as Element).getAttribute('data-lien-ket-muc')
    if (id) datViTriFocus(id)
  }

  function khiPhim(e: KeyboardEvent<HTMLElement>) {
    if (e.altKey || e.ctrlKey || e.metaKey || dangGhepChu(e)) return
    const lienKet = (e.target as Element).closest<HTMLElement>('[data-lien-ket-muc]')
    const id = lienKet?.getAttribute('data-lien-ket-muc')
    if (!lienKet || !id) return
    if (e.code === 'Space') {
      e.preventDefault()
      if (!e.repeat) khiDoiChon(id)
      return
    }
    const ds = cacLienKet(e.currentTarget)
    const i = ds.indexOf(lienKet)
    let toi: number | null = null
    if (e.code === 'ArrowDown') toi = Math.min(i + 1, ds.length - 1)
    else if (e.code === 'ArrowUp') toi = Math.max(i - 1, 0)
    else if (e.code === 'Home') toi = 0
    else if (e.code === 'End') toi = ds.length - 1
    if (toi === null) return
    e.preventDefault()
    ds[toi]?.focus()
  }

  const veHang = (muc: MucHoc, duongDan?: Nut[]) => (
    <li key={muc.id}>
      <HangMuc
        muc={muc}
        trangThai={trangThaiCua(muc.id)}
        canOnLai={canOnLaiCua(muc.id)}
        noiDung={noiDungCua(muc.id)}
        chon={chon.has(muc.id)}
        khiDoiChon={khiDoiChon}
        tabIndex={muc.id === viTri ? 0 : -1}
        noiBat={muc.id === noiBat}
        duongDan={
          duongDan && duongDan.length > 0 ? (
            <span className={LOP_CHU_NHO}>
              {duongDan.map((n, i) => (
                <Fragment key={n.id}>
                  {i > 0 && <span aria-hidden="true"> › </span>}
                  <TenMuc>{n.label}</TenMuc>
                </Fragment>
              ))}
            </span>
          ) : undefined
        }
      />
    </li>
  )

  /** Các phần tử cùng cấp theo thứ tự cây: mục liền nhau gom một <ul>, nhóm là một khối có tiêu đề. */
  function vePhanTu(ds: readonly PhanTuHien[], cap: number): ReactNode[] {
    return gomMucLienNhau(ds).map((k) =>
      k.loai === 'nhom' ? (
        veNhom(k.nhom, cap)
      ) : (
        <ul key={`muc-${k.cacMuc[0].id}`} className="m-0 flex list-none flex-col gap-0.5 p-0">
          {k.cacMuc.map((m) => veHang(m))}
        </ul>
      ),
    )
  }

  function veNhom(nhom: NhomHien, cap: number) {
    const { nut } = nhom
    const so = demTrongNut(theoNut.get(nut.id) ?? [], trangThaiCua)
    const The = `h${Math.min(cap, 6)}` as 'h2' | 'h3' | 'h4'
    const lon = cap <= 2
    return (
      <div
        key={nut.id}
        data-nut={nut.id}
        className={`flex flex-col gap-1 ${lon ? 'mt-8 first:mt-0' : 'mt-3 pl-3'}`}
      >
        <div
          className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${lon ? 'border-b border-border pb-2' : ''}`}
        >
          {/* id = slug: điểm neo #slug (nhóm theo duongDanNut; phần, lĩnh vực cũng mở tới được) */}
          <The id={nut.slug} className={`m-0 min-w-0 scroll-mt-4 ${LOP_TIEU_DE[Math.min(cap, 4)]}`}>
            {nut.kind === 'area' ? (
              <Link
                to={`/linh-vuc/${nut.slug}`}
                className="rounded-[var(--radius-sm)] text-text underline-offset-2 hover:underline"
              >
                <TenMuc>{nut.label}</TenMuc>
              </Link>
            ) : (
              <TenMuc>{nut.label}</TenMuc>
            )}
          </The>
          <span className={`tabular-nums ${LOP_CHU_META} text-muted`}>{chuPhanSo(so)}</span>
          <ThanhTienDo {...so} className="w-24" />
        </div>
        {vePhanTu(nhom.con, cap + 1)}
      </div>
    )
  }

  const noiDung =
    kieu.loai === 'phang' ? (
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {cacMuc.map((m) => veHang(m, chuoiCha(cay, m.id)))}
      </ul>
    ) : (
      vePhanTu(dungCayHien(cay, kieu.goc, hienIds), kieu.capDau)
    )

  return (
    // Nhận phím và focus của các hàng bên trong (ủy quyền sự kiện); bản thân vùng không nhận focus.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section aria-label={nhan} onKeyDown={khiPhim} onFocus={khiFocus} className="flex flex-col">
      {noiDung}
    </section>
  )
}
