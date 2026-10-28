// Tab Độ phủ của /noi-dung (bước 4, rút gọn theo mục 10: không có bảng từng mục — bảng mục có ở Lộ trình dạng danh
// sách với bộ lọc nội dung). Đếm từ trạng thái nội dung của server (GET /api/noi-dung/trang-thai, cùng nguồn với dòng
// đếm ở đầu trang và badge Nội dung; bất biến 7: Đã duyệt + Bản nháp + Chưa có = soMucHoc):
// - "Cả roadmap": ba số kèm % trên soMucHoc;
// - bảng theo phần › lĩnh vực: hàng phần (tổng của phần) rồi các hàng lĩnh vực; phần không có lĩnh vực (mục nằm
//   thẳng trong phần) chỉ có hàng phần. Mỗi hàng còn mục chưa có nội dung có link tới Lộ trình dạng danh sách lọc
//   sẵn (?xem=danh-sach&linh-vuc=<slug>&noi-dung=chua-co; hàng phần: &phan=<slug>).
import { useId, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dinhDangPhanTram, dinhDangSo } from '../../../shared/dinh-dang'
import { THAM_SO_LOC } from '../../../shared/domain/loc-danh-sach'
import { layCay, type Cay, type Nut } from '../../../shared/roadmap'
import { taiTrangThaiNoiDung } from '../../app/du-lieu/api'
import {
  KHOA_TRANG_THAI_NOI_DUNG,
  useTrangThaiNoiDung,
  type TraNoiDung,
} from '../../app/du-lieu/noi-dung'
import { NutLink } from '../../components/Nut'
import TenMuc from '../../components/TenMuc'
import { DongCho, TrangThaiLoi, VungDangTai } from '../../components/TrangThaiTrong'
import {
  LOP_BANG,
  LOP_H2,
  LOP_KHUNG_BANG,
  LOP_O,
  LOP_O_KHUNG,
  LOP_SO,
  LOP_TH,
} from '../../components/duyet/lop-bang'
import {
  COT_PHAN_LINH_VUC,
  COT_TONG,
  KHONG_TAI_DO_PHU,
  THEO_PHAN_LINH_VUC,
  TOAN_ROADMAP,
  XEM_MUC_CHUA_CO,
  XEM_MUC_CHUA_CO_CUA,
} from '../../copy/cho-duyet-duyet'

export interface DemDoPhu {
  daDuyet: number
  banNhap: number
  chuaCo: number
  tong: number
}

export interface HangDoPhu {
  nut: Nut
  dem: DemDoPhu
}

export interface PhanDoPhu extends HangDoPhu {
  linhVuc: HangDoPhu[]
}

export interface KetQuaDoPhu {
  tong: DemDoPhu
  phan: PhanDoPhu[]
}

const demRong = (): DemDoPhu => ({ daDuyet: 0, banNhap: 0, chuaCo: 0, tong: 0 })

/** Đếm theo trạng thái nội dung; undefined khi chưa biết trạng thái của mục nào đó (đang tải). */
export function tinhDoPhu(
  cay: Pick<Cay, 'phan' | 'mucHoc'>,
  tra: TraNoiDung,
): KetQuaDoPhu | undefined {
  const tong = demRong()
  const theoPhan = new Map<string, PhanDoPhu>(
    cay.phan.map((p) => [p.id, { nut: p, dem: demRong(), linhVuc: [] }]),
  )
  const theoLinhVuc = new Map<string, HangDoPhu>()
  for (const m of cay.mucHoc) {
    const tt = tra(m.id)
    if (tt === undefined) return undefined
    const phan = theoPhan.get(m.phan.id)
    if (!phan) continue
    let lv: HangDoPhu | undefined
    if (m.linhVuc) {
      lv = theoLinhVuc.get(m.linhVuc.id)
      if (!lv) {
        lv = { nut: m.linhVuc, dem: demRong() }
        theoLinhVuc.set(m.linhVuc.id, lv)
        phan.linhVuc.push(lv)
      }
    }
    for (const d of [tong, phan.dem, lv?.dem]) {
      if (!d) continue
      d.tong += 1
      if (tt.loai === 'da-duyet') d.daDuyet += 1
      else if (tt.loai === 'ban-nhap') d.banNhap += 1
      else d.chuaCo += 1
    }
  }
  return { tong, phan: [...theoPhan.values()] }
}

/** /lo-trinh dạng danh sách, lọc mục chưa có nội dung của một lĩnh vực / phần. */
export function duongDanChuaCo(nut: Nut): string {
  const q = new URLSearchParams()
  q.set(THAM_SO_LOC.xem, 'danh-sach')
  q.set(nut.kind === 'area' ? THAM_SO_LOC.linhVuc : THAM_SO_LOC.phan, nut.slug)
  q.set(THAM_SO_LOC.noiDung, 'chua-co')
  return `/lo-trinh?${q.toString()}`
}

const NHAN = [
  ['daDuyet', 'Đã duyệt'],
  ['banNhap', 'Bản nháp'],
  ['chuaCo', 'Chưa có'],
] as const

function TongRoadmap({ dem, idTieuDe }: { dem: DemDoPhu; idTieuDe: string }) {
  return (
    <section aria-labelledby={idTieuDe} className="flex flex-col gap-3">
      <h2 id={idTieuDe} className={LOP_H2}>
        {TOAN_ROADMAP} · {dinhDangSo(dem.tong)} mục
      </h2>
      <dl className="m-0 grid max-w-[720px] grid-cols-3 gap-3">
        {NHAN.map(([khoa, nhan]) => (
          <div
            key={khoa}
            className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-surface p-4"
          >
            <dt className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
              {nhan}
            </dt>
            <dd className="m-0 flex items-baseline gap-2 tabular-nums">
              <span className="text-[length:var(--fs-h2)] leading-[var(--lh-h2)] font-bold">
                {dinhDangSo(dem[khoa])}
              </span>
              <span className="text-muted">{dinhDangPhanTram(dem[khoa], dem.tong)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function HangBang({ hang, cap }: { hang: HangDoPhu; cap: 'phan' | 'linh-vuc' }) {
  const { nut, dem } = hang
  const laPhan = cap === 'phan'
  return (
    <tr data-nut={nut.id} className={laPhan ? 'bg-surface-2' : undefined}>
      <th
        scope="row"
        className={`text-left ${laPhan ? `${LOP_O} font-semibold` : `${LOP_O_KHUNG} pr-3 pl-8 font-normal`}`}
      >
        <TenMuc>{nut.label}</TenMuc>
      </th>
      {NHAN.map(([khoa]) => (
        <td key={khoa} className={`${LOP_O} ${LOP_SO}`}>
          {dinhDangSo(dem[khoa])}
        </td>
      ))}
      <td className={`${LOP_O} ${LOP_SO} text-muted`}>{dinhDangSo(dem.tong)}</td>
      <td className={`${LOP_O} text-right`}>
        {dem.chuaCo > 0 && (
          <NutLink to={duongDanChuaCo(nut)} bien="ghost" co="nho">
            {XEM_MUC_CHUA_CO} {/* Khoảng trắng ngoài span: tên truy cập không dính chữ */}
            <span className="sr-only">
              {XEM_MUC_CHUA_CO_CUA} <TenMuc>{nut.label}</TenMuc>
            </span>
          </NutLink>
        )}
      </td>
    </tr>
  )
}

export default function TabDoPhu() {
  const id = useId()
  const cay = layCay()
  const tra = useTrangThaiNoiDung()
  // Cùng khoá với useTrangThaiNoiDung: chỉ để biết lỗi tải và Thử lại.
  const q = useQuery({
    queryKey: KHOA_TRANG_THAI_NOI_DUNG,
    queryFn: () => taiTrangThaiNoiDung(),
    staleTime: Number.POSITIVE_INFINITY,
  })
  const doPhu = useMemo(() => tinhDoPhu(cay, tra), [cay, tra])

  if (!doPhu) {
    if (q.isError) {
      return (
        <TrangThaiLoi
          khung
          cauChinh={KHONG_TAI_DO_PHU}
          thuLai={() => void q.refetch()}
          className="max-w-[720px] bg-surface"
        />
      )
    }
    return (
      <VungDangTai className="flex max-w-[960px] flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <DongCho key={i} rong="100%" cao={20} />
        ))}
      </VungDangTai>
    )
  }

  const idTong = `${id}tong`
  const idBang = `${id}bang`
  return (
    <div className="flex max-w-[1200px] flex-col gap-10">
      <TongRoadmap dem={doPhu.tong} idTieuDe={idTong} />
      <section aria-labelledby={idBang} className="flex flex-col gap-3">
        <h2 id={idBang} className={LOP_H2}>
          {THEO_PHAN_LINH_VUC}
        </h2>
        <div className={LOP_KHUNG_BANG}>
          <table aria-labelledby={idBang} className={LOP_BANG}>
            <thead>
              <tr>
                <th scope="col" className={`${LOP_TH} text-left`}>
                  {COT_PHAN_LINH_VUC}
                </th>
                {NHAN.map(([khoa, nhan]) => (
                  <th key={khoa} scope="col" className={`${LOP_TH} text-right`}>
                    {nhan}
                  </th>
                ))}
                <th scope="col" className={`${LOP_TH} text-right`}>
                  {COT_TONG}
                </th>
                <th scope="col" className={`${LOP_TH} text-left`}>
                  <span className="sr-only">{XEM_MUC_CHUA_CO}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {doPhu.phan.map((p) => [
                <HangBang key={p.nut.id} hang={p} cap="phan" />,
                ...p.linhVuc.map((lv) => <HangBang key={lv.nut.id} hang={lv} cap="linh-vuc" />),
              ])}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
