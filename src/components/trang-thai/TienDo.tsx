// C11 Tiến độ (F02, F03, F04; §1 "tiến độ trung thực", đề xuất 3.3, D19).
// % = Đã xong / (tổng − Bỏ qua), làm tròn, không hiện 100% khi chưa đủ, mẫu số 0 → "—"; luôn kèm phân số.
// Vòng: từ 12 giờ theo chiều kim đồng hồ Đã xong → Đang học → Bỏ qua (sọc) → nền; tỉ lệ trên tổng.
// Thanh: cùng thứ tự, Bỏ qua (sọc) dồn phải. Thanh độ phủ nội dung: phần Chưa có là viền nét đứt.
// Sọc: một token --st-skip-stripe cho HTML + một <pattern> SVG (MauSocBoQua) cho vòng, bản đồ.
import { useId, type ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { dinhDangPhanTram, dinhDangSo, tinhPhanTram } from '../../../shared/dinh-dang'
import { DongCho } from '../TrangThaiTrong'
import { LOP_CHU_META } from './mau-trang-thai'

/** Số đếm theo trạng thái học của một tập mục (cả roadmap, một phần, lĩnh vực, nhóm). */
export interface SoTienDo {
  xong: number
  dangHoc: number
  boQua: number
  /** Tổng số mục học của tập (lấy từ cây). */
  tong: number
}

type SoPhanSo = Pick<SoTienDo, 'xong' | 'boQua' | 'tong'>

const so = (n: number) => dinhDangSo(n)
const chuaHocCua = (s: SoTienDo) => Math.max(0, s.tong - s.xong - s.dangHoc - s.boQua)
const tiLe = (n: number, tong: number) => (tong > 0 ? Math.min(Math.max(n, 0) / tong, 1) : 0)

/** "19%", hoặc "—" khi mẫu số (tổng − Bỏ qua) bằng 0. */
export function phanTramTienDo({ xong, boQua, tong }: SoPhanSo): string {
  return dinhDangPhanTram(xong, tong - boQua)
}

/** "37/195 · 4 bỏ qua"; " · n bỏ qua" chỉ hiện khi n > 0, trừ khi `luonHienBoQua`. */
export function chuPhanSo(
  { xong, boQua, tong }: SoPhanSo,
  { luonHienBoQua = false }: { luonHienBoQua?: boolean } = {},
): string {
  const phanSo = `${so(xong)}/${so(tong - boQua)}`
  return boQua > 0 || luonHienBoQua ? `${phanSo} · ${so(boQua)} bỏ qua` : phanSo
}

/** "19% · 37/195 · 4 bỏ qua" (§1). Cả roadmap luôn ghi số bỏ qua, kể cả 0 (F05): `luonHienBoQua`. */
export function chuTienDo(s: SoPhanSo, tuyChon: { luonHienBoQua?: boolean } = {}): string {
  return `${phanTramTienDo(s)} · ${chuPhanSo(s, tuyChon)}`
}

/** "5/16 · Đang học 1 · Chưa học 10" (panel lĩnh vực, F06b/F10); bỏ phần có số 0 (đề xuất 3.3). */
export function chuTienDoChiTiet(s: SoTienDo): string {
  const phan = [chuPhanSo(s)]
  if (s.dangHoc > 0) phan.push(`Đang học ${so(s.dangHoc)}`)
  const chuaHoc = chuaHocCua(s)
  if (chuaHoc > 0) phan.push(`Chưa học ${so(chuaHoc)}`)
  return phan.join(' · ')
}

/** aria của vòng (F03): "Tiến độ 19%, 37 trên 195 mục, 4 bỏ qua". */
export function nhanVongTienDo(s: SoPhanSo): string {
  const p = tinhPhanTram(s.xong, s.tong - s.boQua)
  const dau = p === null ? 'Tiến độ chưa tính được phần trăm' : `Tiến độ ${p}%`
  return `${dau}, ${so(s.xong)} trên ${so(s.tong - s.boQua)} mục, ${so(s.boQua)} bỏ qua`
}

// ---------- Sọc Bỏ qua cho SVG ----------

/** id an toàn cho url(#…) (useId có thể chứa ký tự đặc biệt). */
export function useIdSvg(tienTo: string) {
  return `${tienTo}-${useId().replace(/[^\w-]/g, '')}`
}

/** <pattern> sọc Bỏ qua (F02, F03, F04): ô 6, sọc 2px màu chữ Bỏ qua trên nền Bỏ qua, xoay 45°.
 *  Đặt trong <defs> của từng SVG, tô bằng `url(#id)`. */
export function MauSocBoQua({ id }: { id: string }) {
  return (
    <pattern
      id={id}
      patternUnits="userSpaceOnUse"
      width="6"
      height="6"
      patternTransform="rotate(45)"
    >
      <rect width="6" height="6" className="fill-[var(--st-skip-bg)]" />
      <rect width="2" height="6" className="fill-[var(--st-skip-fg)]" />
    </pattern>
  )
}

// ---------- Vòng ----------

const BAN_KINH = 52
const NET = 14
const CHU_VI = 2 * Math.PI * BAN_KINH

export interface PropsVongTienDo extends SoTienDo {
  /** 'lon' 136px (F02, F03); 'nho' 112px không có dòng "n bỏ qua" ở giữa (F04 ghi bên cạnh). */
  co?: 'lon' | 'nho'
  className?: string
}

export function VongTienDo({ co = 'lon', className = '', ...s }: PropsVongTienDo) {
  const idSoc = useIdSvg('soc-bo-qua')
  const lon = co === 'lon'
  const canh = lon ? 136 : 112
  let batDau = 0
  const doan = [
    { ten: 'xong', n: s.xong, net: 'stroke-[var(--st-done-solid)]' },
    { ten: 'dang-hoc', n: s.dangHoc, net: 'stroke-[var(--st-learning-solid)]' },
    { ten: 'bo-qua', n: s.boQua, net: '' },
  ].map((d) => {
    // Không vẽ vượt một vòng khi số đếm lỗi (tổng các phần > tổng)
    const dai = Math.min(CHU_VI * tiLe(d.n, s.tong), CHU_VI - batDau)
    const kq = { ...d, dai, batDau }
    batDau += dai
    return kq
  })
  return (
    <div className={`relative shrink-0 ${lon ? 'size-[136px]' : 'size-[112px]'} ${className}`}>
      <svg
        width={canh}
        height={canh}
        viewBox="0 0 136 136"
        role="img"
        aria-label={nhanVongTienDo(s)}
      >
        <defs>
          <MauSocBoQua id={idSoc} />
        </defs>
        <circle
          cx="68"
          cy="68"
          r={BAN_KINH}
          fill="none"
          strokeWidth={NET}
          className="stroke-border"
        />
        {doan.map((d) =>
          d.dai > 0 ? (
            <circle
              key={d.ten}
              data-doan={d.ten}
              cx="68"
              cy="68"
              r={BAN_KINH}
              fill="none"
              strokeWidth={NET}
              stroke={d.ten === 'bo-qua' ? `url(#${idSoc})` : undefined}
              strokeDasharray={`${d.dai.toFixed(2)} ${CHU_VI.toFixed(2)}`}
              strokeDashoffset={(-d.batDau).toFixed(2)}
              transform="rotate(-90 68 68)"
              className={d.net}
            />
          ) : null,
        )}
      </svg>
      <div
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center tabular-nums"
      >
        <span
          className={
            lon
              ? 'text-[length:var(--fs-h2)] leading-[var(--lh-h2)] font-bold'
              : 'text-[length:var(--fs-h2-m)] leading-7 font-bold'
          }
        >
          {phanTramTienDo(s)}
        </span>
        <span
          className={lon ? LOP_CHU_META : 'text-[length:var(--fs-chip)] leading-[var(--lh-chip)]'}
        >
          {so(s.xong)}/{so(s.tong - s.boQua)}
        </span>
        {lon && (
          <span className="text-[length:var(--fs-chip)] leading-[var(--lh-chip)] text-muted">
            {so(s.boQua)} bỏ qua
          </span>
        )}
      </div>
    </div>
  )
}

// ---------- Chú giải cạnh vòng ----------

const O_MAU = 'size-2.5 shrink-0 rounded-[2px]'

export function ChuGiaiTienDo({ className = '', ...s }: SoTienDo & { className?: string }) {
  const dong: { ten: string; n: number; o: string }[] = [
    { ten: 'Đã xong', n: s.xong, o: 'bg-[var(--st-done-solid)]' },
    { ten: 'Đang học', n: s.dangHoc, o: 'bg-[var(--st-learning-solid)]' },
    {
      ten: 'Bỏ qua',
      n: s.boQua,
      o: 'border border-border-input bg-[var(--st-skip-bg)] bg-[image:var(--st-skip-stripe)]',
    },
    { ten: 'Chưa học', n: chuaHocCua(s), o: 'border border-border-input bg-border' },
  ]
  return (
    <ul
      className={`m-0 flex list-none flex-col gap-1.5 p-0 tabular-nums ${LOP_CHU_META} ${className}`}
    >
      {dong.map((d) => (
        <li key={d.ten} className="flex items-center gap-2">
          <span aria-hidden="true" className={`${O_MAU} ${d.o}`} />
          {d.ten} {so(d.n)}
        </li>
      ))}
    </ul>
  )
}

// ---------- Thanh ----------

export interface PropsThanhTienDo extends SoTienDo {
  /** Thanh đứng một mình thì cần nhãn (role="img"); cạnh phân số thì để trống (aria-hidden). */
  nhan?: string
  className?: string
}

export function ThanhTienDo({ nhan, className = '', ...s }: PropsThanhTienDo) {
  const rong = (n: number) => `${(tiLe(n, s.tong) * 100).toFixed(2)}%`
  return (
    <span
      role={nhan ? 'img' : undefined}
      aria-label={nhan}
      aria-hidden={nhan ? undefined : true}
      className={`flex h-2 overflow-hidden rounded-[4px] border border-border bg-surface-2 ${className}`}
    >
      {s.xong > 0 && (
        <span
          data-doan="xong"
          style={{ width: rong(s.xong) }}
          className="bg-[var(--st-done-solid)]"
        />
      )}
      {s.dangHoc > 0 && (
        <span
          data-doan="dang-hoc"
          style={{ width: rong(s.dangHoc) }}
          className="bg-[var(--st-learning-solid)]"
        />
      )}
      {s.boQua > 0 && (
        <span
          data-doan="bo-qua"
          style={{ width: rong(s.boQua) }}
          className="ml-auto bg-[var(--st-skip-bg)] bg-[image:var(--st-skip-stripe)]"
        />
      )}
    </span>
  )
}

export interface PropsDongTienDo extends SoTienDo {
  /** Tên tập (bọc <TenMuc> khi là tên mục tiếng Anh). */
  ten: ReactNode
  className?: string
}

/** Tên + phân số "3/14 · 2 bỏ qua" + thanh (F02 C11, F03 "Theo phần"). Chưa bắt đầu thì chữ muted. */
export function DongTienDo({ ten, className = '', ...s }: PropsDongTienDo) {
  const chuaBatDau = s.xong + s.dangHoc + s.boQua === 0
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div
        className={`flex justify-between gap-3 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] ${
          chuaBatDau ? 'text-muted' : ''
        }`}
      >
        <span className="min-w-0">{ten}</span>
        <span className="shrink-0 tabular-nums">{chuPhanSo(s)}</span>
      </div>
      <ThanhTienDo {...s} />
    </div>
  )
}

// ---------- Đang tải / lỗi ----------

export function TienDoDangTai({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-3 ${LOP_CHU_META} ${className}`}>
      <DongCho rong="160px" cao={8} />
      <span className="text-muted">Đang tải…</span>
    </span>
  )
}

export function TienDoLoi({ thuLai, className = '' }: { thuLai?: () => void; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-danger ${LOP_CHU_META} ${className}`}>
      <CircleAlert size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      <span>
        Không tính được tiến độ
        {thuLai && (
          <>
            {' — '}
            <button
              type="button"
              onClick={thuLai}
              className="cursor-pointer rounded-[var(--radius-sm)] text-danger underline hover:decoration-2 max-md:inline-flex max-md:min-h-[var(--h-control-touch)] max-md:items-center"
            >
              Thử lại
            </button>
          </>
        )}
      </span>
    </span>
  )
}

// ---------- Độ phủ nội dung ----------

export interface SoNoiDung {
  daDuyet: number
  banNhap: number
  tong: number
}

const chuaCoCua = (s: SoNoiDung) => Math.max(0, s.tong - s.daDuyet - s.banNhap)

/** "6 duyệt · 1 nháp · 9 chưa có" (F06, F10; giữ cả số 0 như F29). */
export function chuNoiDung(s: SoNoiDung): string {
  return `${so(s.daDuyet)} duyệt · ${so(s.banNhap)} nháp · ${so(chuaCoCua(s))} chưa có`
}

/** aria (F03): "41 đã duyệt, 9 bản nháp, 149 chưa có". */
export function nhanNoiDungTong(s: SoNoiDung): string {
  return `${so(s.daDuyet)} đã duyệt, ${so(s.banNhap)} bản nháp, ${so(chuaCoCua(s))} chưa có`
}

export interface PropsThanhNoiDung extends SoNoiDung {
  /** 'thuong' cao 8 (F03, F10); 'nho' 80×6 trên thanh công cụ bản đồ (F06). */
  co?: 'thuong' | 'nho'
  className?: string
}

/** Thanh độ phủ: Đã duyệt (màu chữ) → Bản nháp → phần Chưa có để trống trong viền nét đứt (D19). */
export function ThanhNoiDung({ co = 'thuong', className = '', ...s }: PropsThanhNoiDung) {
  const rong = (n: number) => `${(tiLe(n, s.tong) * 100).toFixed(2)}%`
  return (
    <span
      role="img"
      aria-label={nhanNoiDungTong(s)}
      className={`flex shrink-0 overflow-hidden border border-dashed border-border-input ${
        co === 'nho' ? 'h-1.5 w-20 rounded-[3px]' : 'h-2 rounded-[4px]'
      } ${className}`}
    >
      {s.daDuyet > 0 && (
        <span
          data-doan="da-duyet"
          style={{ width: rong(s.daDuyet) }}
          className="bg-[var(--noi-dung-duyet)]"
        />
      )}
      {s.banNhap > 0 && (
        <span
          data-doan="ban-nhap"
          style={{ width: rong(s.banNhap) }}
          className="bg-[var(--noi-dung-nhap)]"
        />
      )}
    </span>
  )
}
