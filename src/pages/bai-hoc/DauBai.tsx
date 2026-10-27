// Đầu bài (F11, F17, F18; §8.5, §8.7, D1, D2, D8, D34): chip loại C4 + chip nội dung C8 · H1 tên mục (lang=en)
// + " — giải nghĩa" (muted 500) · dòng "Tên gốc trên roadmap: …" (đề xuất 1.3) · segmented C6 (đổi trạng thái
// có hiệu lực ngay, toast Hoàn tác; đang Bỏ qua thì dòng lý do tuỳ chọn — đề xuất 3.1) + "Xem trong danh sách" (thay
// "Xem trên bản đồ"; không có "Soạn" — bản đồ, trình soạn đã bỏ, đề xuất mục 10) · thanh 4 bước C10 tính từ dữ liệu
// học của mục (shared/domain/bon-buoc.ts qua useBonBuoc, đổi ngay khi gõ / bấm; Kiểm tra "Không áp dụng · chưa có
// câu hỏi" khi bài không có câu hỏi, D8; lỗi đọc → "Lỗi: không đọc được tiến độ bước — Thử lại") · dải vị trí C13.
// Mục chưa có nội dung giữ đủ đầu bài (D8). Không có đồng hồ / "Đã học n phút" (phạm vi rút gọn 27/10/2026).
// Khoảng cách theo F11: các dòng cách 16, đáy 24 + đường kẻ.
import { useRef, type MouseEvent } from 'react'
import { CircleAlert, List as IconDanhSach } from 'lucide-react'
import type { LoiDong } from '../../../shared/noi-dung'
import type { Cay, MucHoc } from '../../../shared/roadmap'
import { DU_LIEU_BON_BUOC_TRONG, tinhBonBuoc } from '../../../shared/domain/bon-buoc'
import type { Buoc, TrangThaiNoiDung } from '../../../shared/domain/trang-thai'
import { useBonBuoc, useHoc } from '../../app/du-lieu/hoc'
import { NutLink } from '../../components/Nut'
import TenMuc from '../../components/TenMuc'
import TieuDeTrang from '../../components/TieuDeTrang'
import { DongCho } from '../../components/TrangThaiTrong'
import DaiViTri from '../../components/bai-hoc/DaiViTri'
import { duongDanDanhSach } from '../../components/bai-hoc/dinh-vi'
import ChipLoai from '../../components/trang-thai/ChipLoai'
import ChipNoiDung from '../../components/trang-thai/ChipNoiDung'
import SegmentedTrangThai from '../../components/trang-thai/SegmentedTrangThai'
import { LyDoBoQua } from '../../components/bai-hoc/HopThoaiBoQua'
import ThanhBonBuoc, { propsTuKetQua } from '../../components/trang-thai/ThanhBonBuoc'
import { LOP_H1 } from '../chung'
import type { DatTrangThaiTrang, TrangThaiTrang } from './kieu-trang'
import { LOI_DOC_TRANG_THAI, XEM_TRONG_DANH_SACH } from '../../copy/cho-duyet'

/**
 * Bấm một bước: cuộn tới khối và đưa focus vào đó (không đổi URL). Khối ở cột phải (card Flashcard, bước Ghi nhớ):
 * cột dính và tự cuộn nên chỉ cuộn vừa đủ thấy card (block 'nearest') — 'start' kéo cả trang xuống ~800px.
 */
function denKhoi(_b: Buoc, e: MouseEvent<HTMLAnchorElement>) {
  const id = e.currentTarget.getAttribute('href')?.slice(1)
  const khoi = id ? document.getElementById(id) : null
  if (!khoi) return
  e.preventDefault()
  const giam = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const trongCotPhai = khoi.closest('aside') !== null
  khoi.scrollIntoView?.({
    behavior: giam ? 'auto' : 'smooth',
    block: trongCotPhai ? 'nearest' : 'start',
  })
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
  /**
   * Khoá các câu Tự kiểm tra hiện thành C21 (cacKhoaCauHoi của ThanBai): [] = bài không có câu hỏi (D8); null =
   * chưa biết (bài đang tải, lỗi đọc file) → bước Kiểm tra "chưa làm", không ghi Không áp dụng.
   */
  cauHoiKhoa: readonly string[] | null
  neoBuoc: Partial<Record<Buoc, string>>
}

/** Thanh 4 bước của mục: dữ liệu học + câu hỏi của bài; chưa có dữ liệu thì mọi bước "chưa làm". */
function BonBuocDauBai({
  muc,
  cauHoiKhoa,
  neoBuoc,
}: {
  muc: MucHoc
  cauHoiKhoa: readonly string[] | null
  neoBuoc: Partial<Record<Buoc, string>>
}) {
  const { loi, taiLai } = useHoc(muc.id)
  const daTai = useBonBuoc(muc.id, muc.mau, cauHoiKhoa ?? [])
  const kq =
    daTai ??
    tinhBonBuoc({ mau: muc.mau, cauHoiKhoa: cauHoiKhoa ?? [], hoc: DU_LIEU_BON_BUOC_TRONG })
  const props = propsTuKetQua(kq)
  if (cauHoiKhoa === null) {
    // Chưa biết câu hỏi của bài: Kiểm tra theo câu trả lời đã có thì không tính được — để "chưa làm"
    props.tinhTrang = { ...props.tinhTrang, 'kiem-tra': 'chua-lam' }
    props.ghiChu = { ...props.ghiChu, 'kiem-tra': undefined }
    props.voHieu = []
  }
  return (
    <ThanhBonBuoc
      {...props}
      lienKet={neoBuoc}
      khiChon={denKhoi}
      loi={loi && daTai === undefined}
      thuLai={taiLai}
    />
  )
}

export default function DauBai({
  muc,
  cay,
  noiDung,
  loiDoc,
  giaiNghia,
  hoc,
  datHoc,
  cauHoiKhoa,
  neoBuoc,
}: PropsDauBai) {
  const boQua = !hoc.dangTai && !hoc.loi && hoc.trangThaiCua(muc.id) === 'bo-qua'
  const refDau = useRef<HTMLElement>(null)
  /** Dòng lý do Bỏ qua mất lúc đang giữ focus (vd. phím 2): focus về đoạn đang chọn của segmented. */
  function focusSegmented() {
    if (document.activeElement && document.activeElement !== document.body) return
    refDau.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus()
  }
  return (
    <header ref={refDau} className="flex flex-col gap-4 border-b border-border pb-6 max-md:pb-4">
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
          {boQua && datHoc && <LyDoBoQua muc={muc} traFocus={focusSegmented} />}
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
        <NutLink to={duongDanDanhSach(muc)} bien="phu" icon={IconDanhSach}>
          {XEM_TRONG_DANH_SACH}
        </NutLink>
      </div>

      <BonBuocDauBai muc={muc} cauHoiKhoa={cauHoiKhoa} neoBuoc={neoBuoc} />

      <DaiViTri muc={muc} cay={cay} trangThaiCua={hoc.trangThaiCua} />
    </header>
  )
}
