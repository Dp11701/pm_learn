// Bộ lọc của Lộ trình (đề xuất 3.9, §6.3): mỗi nhóm một hàng chip bật / tắt (nút aria-pressed, bật có dấu ✓ — không
// chỉ dựa vào màu), trong một nhóm HOẶC, giữa các nhóm VÀ (shared/domain/loc-danh-sach.ts). Ô "Sắp xếp" là <select>
// thường; "Mở gần đây" chỉ có khi đã có lượt mở bài. Bộ lọc sống trong URL: component chỉ báo giá trị mới lên trang.
import { useId, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import {
  CAC_LOC_LOAI,
  CAC_LOC_NOI_DUNG,
  CAC_LOC_TRANG_THAI,
  CAC_SAP_XEP,
  cacLinhVuc,
  doiGiaTri,
  type BoLoc,
  type LocTrangThai,
  type NhomLoc,
  type SapXep,
} from '../../../shared/domain/loc-danh-sach'
import { TEN_CAN_ON_LAI, TEN_LOAI, TEN_TRANG_THAI_HOC } from '../../../shared/domain/trang-thai'
import type { Cay } from '../../../shared/roadmap'
import TenMuc from '../../components/TenMuc'
import { LOP_CHU_META } from '../../components/trang-thai/mau-trang-thai'
import {
  BO_LOC,
  SAP_XEP,
  TEN_LOC_NOI_DUNG,
  TEN_NHOM_LOC,
  TEN_SAP_XEP,
} from '../../copy/cho-duyet-lo-trinh'

const tenLocTrangThai = (v: LocTrangThai) =>
  v === 'can-on-lai' ? TEN_CAN_ON_LAI : TEN_TRANG_THAI_HOC[v]

const LOP_CHIP =
  'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 whitespace-nowrap transition-colors duration-150'
const LOP_CHIP_BAT =
  'border-primary bg-primary font-semibold text-on-primary hover:bg-primary-hover'
const LOP_CHIP_TAT = 'border-border-input bg-surface text-text hover:border-text hover:bg-surface-2'

interface GiaTriChip {
  giaTri: string
  nhan: ReactNode
}

function NhomChip({
  ten,
  nhom,
  cacGiaTri,
  boLoc,
  khiDoi,
}: {
  ten: string
  nhom: NhomLoc
  cacGiaTri: readonly GiaTriChip[]
  boLoc: BoLoc
  khiDoi: (b: BoLoc) => void
}) {
  const id = useId()
  const dangChon = boLoc[nhom] as readonly string[]
  return (
    <div role="group" aria-labelledby={id} className="flex items-start gap-3">
      <span id={id} className={`w-24 shrink-0 pt-1.5 font-semibold ${LOP_CHU_META} text-muted`}>
        {ten}
      </span>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {cacGiaTri.map(({ giaTri, nhan }) => {
          const bat = dangChon.includes(giaTri)
          return (
            <button
              key={giaTri}
              type="button"
              aria-pressed={bat}
              onClick={() => khiDoi(doiGiaTri(boLoc, nhom, giaTri))}
              className={`${LOP_CHIP} ${LOP_CHU_META} ${bat ? LOP_CHIP_BAT : LOP_CHIP_TAT}`}
            >
              {bat && (
                <Check size={14} strokeWidth={2.25} aria-hidden="true" className="shrink-0" />
              )}
              {nhan}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export interface PropsBoLocDanhSach {
  cay: Cay
  boLoc: BoLoc
  sapXep: SapXep
  /** Có lượt mở bài nào chưa: không có thì không có lựa chọn "Mở gần đây" */
  coMoGanDay: boolean
  khiDoiBoLoc: (boLoc: BoLoc) => void
  khiDoiSapXep: (sapXep: SapXep) => void
}

export default function BoLocDanhSach({
  cay,
  boLoc,
  sapXep,
  coMoGanDay,
  khiDoiBoLoc,
  khiDoiSapXep,
}: PropsBoLocDanhSach) {
  const idSapXep = useId()
  const cacSapXep = CAC_SAP_XEP.filter((s) => s !== 'mo-gan-day' || coMoGanDay)
  const chung = { boLoc, khiDoi: khiDoiBoLoc }
  return (
    <section
      aria-label={BO_LOC}
      className="flex flex-col gap-2.5 rounded-[var(--radius-md)] border border-border bg-surface p-4"
    >
      <NhomChip
        {...chung}
        ten={TEN_NHOM_LOC.trangThai}
        nhom="trangThai"
        cacGiaTri={CAC_LOC_TRANG_THAI.map((v) => ({ giaTri: v, nhan: tenLocTrangThai(v) }))}
      />
      <NhomChip
        {...chung}
        ten={TEN_NHOM_LOC.loai}
        nhom="loai"
        cacGiaTri={CAC_LOC_LOAI.map((v) => ({ giaTri: v, nhan: TEN_LOAI[v] }))}
      />
      <NhomChip
        {...chung}
        ten={TEN_NHOM_LOC.noiDung}
        nhom="noiDung"
        cacGiaTri={CAC_LOC_NOI_DUNG.map((v) => ({ giaTri: v, nhan: TEN_LOC_NOI_DUNG[v] }))}
      />
      <NhomChip
        {...chung}
        ten={TEN_NHOM_LOC.phan}
        nhom="phan"
        cacGiaTri={cay.phan.map((p) => ({ giaTri: p.slug, nhan: <TenMuc>{p.label}</TenMuc> }))}
      />
      <NhomChip
        {...chung}
        ten={TEN_NHOM_LOC.linhVuc}
        nhom="linhVuc"
        cacGiaTri={cacLinhVuc(cay).map((n) => ({
          giaTri: n.slug,
          nhan: <TenMuc>{n.label}</TenMuc>,
        }))}
      />
      <div className="flex items-center gap-3">
        <label
          htmlFor={idSapXep}
          className={`w-24 shrink-0 font-semibold ${LOP_CHU_META} text-muted`}
        >
          {SAP_XEP}
        </label>
        <select
          id={idSapXep}
          value={sapXep}
          onChange={(e) => khiDoiSapXep(e.target.value as SapXep)}
          className={`h-8 cursor-pointer rounded-[var(--radius-sm)] border border-border-input bg-surface px-2 text-text hover:border-text ${LOP_CHU_META}`}
        >
          {cacSapXep.map((s) => (
            <option key={s} value={s}>
              {TEN_SAP_XEP[s]}
            </option>
          ))}
        </select>
      </div>
    </section>
  )
}
