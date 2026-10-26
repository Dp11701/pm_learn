// Đầu bài (F11, F17, F18; §8.5, §8.7, D1, D2, D8): chip loại C4 + chip nội dung C8 · H1 tên mục (lang=en)
// + " — giải nghĩa" (muted 500) · dòng "Tên gốc trên roadmap: …" (đề xuất 1.3) · segmented C6 (đổi trạng thái
// có hiệu lực ngay, toast Hoàn tác) + "Xem trên bản đồ", "Soạn" · thanh 4 bước C10 (phase 2a: trạng thái 0;
// Kiểm tra "Không áp dụng · chưa có câu hỏi" khi bài không có câu hỏi, D8) · dải vị trí C13.
// Mục chưa có nội dung giữ đủ đầu bài (D8). "Đã học n phút" / đồng hồ (T) có ở phase 3; phím E ở phase 7b.
// Khoảng cách theo F11: các dòng cách 16, đáy 24 + đường kẻ.
import type { MouseEvent } from 'react'
import { CircleAlert, Map as IconBanDo, Pencil } from 'lucide-react'
import type { LoiDong } from '../../../shared/noi-dung'
import type { Cay, MucHoc } from '../../../shared/roadmap'
import { CAC_BUOC, type Buoc, type TrangThaiNoiDung } from '../../../shared/domain/trang-thai'
import { NutLink } from '../../components/Nut'
import TenMuc from '../../components/TenMuc'
import TieuDeTrang from '../../components/TieuDeTrang'
import { DongCho } from '../../components/TrangThaiTrong'
import DaiViTri from '../../components/bai-hoc/DaiViTri'
import { duongDanBanDo, duongDanSoan } from '../../components/bai-hoc/dinh-vi'
import ChipLoai from '../../components/trang-thai/ChipLoai'
import ChipNoiDung from '../../components/trang-thai/ChipNoiDung'
import SegmentedTrangThai from '../../components/trang-thai/SegmentedTrangThai'
import ThanhBonBuoc, { type TinhTrangBonBuoc } from '../../components/trang-thai/ThanhBonBuoc'
import { LOP_H1 } from '../chung'
import type { DatTrangThaiTrang, TrangThaiTrang } from './kieu-trang'
import { LOI_DOC_TRANG_THAI } from '../../copy/cho-duyet'

/** Thanh 4 bước trước khi có dữ liệu bước (phase 3): mọi bước chưa làm; không có câu hỏi → Không áp dụng. */
export function bonBuocBanDau(coCauHoi: boolean): TinhTrangBonBuoc {
  const tt = Object.fromEntries(CAC_BUOC.map((b) => [b, 'chua-lam'])) as TinhTrangBonBuoc
  if (!coCauHoi) tt['kiem-tra'] = 'khong-ap-dung'
  return tt
}

/** Bấm một bước: cuộn tới khối và đưa focus vào đó (không đổi URL). */
function denKhoi(_b: Buoc, e: MouseEvent<HTMLAnchorElement>) {
  const id = e.currentTarget.getAttribute('href')?.slice(1)
  const khoi = id ? document.getElementById(id) : null
  if (!khoi) return
  e.preventDefault()
  const giam = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  khoi.scrollIntoView?.({ behavior: giam ? 'auto' : 'smooth', block: 'start' })
  khoi.focus({ preventScroll: true })
}

export interface PropsDauBai {
  muc: MucHoc
  cay: Cay
  /** null khi bài đang tải */
  noiDung: TrangThaiNoiDung | null
  loiDoc: LoiDong | null
  giaiNghia?: string
  hoc: TrangThaiTrang
  datHoc?: DatTrangThaiTrang
  /** null khi chưa biết (bài đang tải, lỗi) */
  coCauHoi: boolean | null
  neoBuoc: Partial<Record<Buoc, string>>
}

export default function DauBai({
  muc,
  cay,
  noiDung,
  loiDoc,
  giaiNghia,
  hoc,
  datHoc,
  coCauHoi,
  neoBuoc,
}: PropsDauBai) {
  const khongCau = coCauHoi === false
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 max-md:pb-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <ChipLoai loai={muc.mau} />
        {noiDung === null ? (
          <DongCho rong="120px" cao={24} />
        ) : (
          <ChipNoiDung
            trangThai={noiDung}
            loi={loiDoc ? `Lỗi frontmatter · dòng ${loiDoc.dong}` : undefined}
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <TieuDeTrang tenTrang={muc.label} className={LOP_H1}>
          <TenMuc>{muc.label}</TenMuc>
          {giaiNghia && <span className="font-medium text-muted"> — {giaiNghia}</span>}
        </TieuDeTrang>
        {muc.labelOriginal && (
          <p className="m-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
            Tên gốc trên roadmap: <TenMuc>{muc.labelOriginal}</TenMuc>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex max-w-full flex-col gap-1.5 max-md:w-full">
          <SegmentedTrangThai
            giaTri={hoc.dangTai || hoc.loi ? null : hoc.trangThaiCua(muc.id)}
            khiDoi={(tt) => datHoc?.dat(muc.id, tt)}
            voHieu={hoc.dangTai || hoc.loi || !datHoc}
            loi={datHoc?.loiLuu(muc.id) ?? false}
            thuLai={datHoc ? () => datHoc.thuLai(muc.id) : undefined}
          />
          {hoc.loi && (
            <p className="m-0 flex flex-wrap items-center gap-1.5 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-danger">
              <CircleAlert size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
              {LOI_DOC_TRANG_THAI} —
              <button
                type="button"
                onClick={hoc.taiLai}
                className="cursor-pointer rounded-[var(--radius-sm)] text-danger underline hover:decoration-2 max-md:inline-flex max-md:min-h-[var(--h-control-touch)] max-md:items-center"
              >
                Thử lại
              </button>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <NutLink to={duongDanBanDo(muc)} bien="phu" icon={IconBanDo}>
            Xem trên bản đồ
          </NutLink>
          <NutLink to={duongDanSoan(muc)} bien="phu" icon={Pencil}>
            Soạn
          </NutLink>
        </div>
      </div>

      <ThanhBonBuoc
        tinhTrang={bonBuocBanDau(!khongCau)}
        lienKet={neoBuoc}
        khiChon={denKhoi}
        ghiChu={khongCau ? { 'kiem-tra': 'Không áp dụng · chưa có câu hỏi' } : {}}
        voHieu={khongCau ? ['kiem-tra'] : []}
      />

      <DaiViTri muc={muc} cay={cay} trangThaiCua={hoc.trangThaiCua} />
    </header>
  )
}
