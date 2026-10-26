// C30 Vùng thả file (F02b, F22; §8.8; đề xuất 1.7): 4 trạng thái của F02b —
// - thường: viền 1,5px nét đứt border-input ("chờ điền" = chưa có, D20), icon cloud-upload trong vòng 40, câu F22;
// - kéo vào: viền 2px nét đứt màu mực, nền surface-2, "Thả để kiểm tra n file";
// - đang xử lý: viền liền 1px, thanh tiến độ + "9/15"; không nhận thả, nút tắt;
// - lỗi: viền 1,5px nét đứt danger, chữ danger (vd. "Chỉ nhận file .md").
// Bàn phím: hai nút thật trong vùng — "Chọn file…" (nhiều file .md) và "Chọn thư mục…" (<input webkitdirectory>);
// Enter / Space trên nút mở hộp chọn. Thả thư mục: entry lấy ngay trong sự kiện drop (webkitGetAsEntry), đọc
// đệ quy ở nơi dùng (src/components/nhap/doc-tep.ts). Thả trượt ra ngoài vùng không làm trình duyệt mở file.
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as DragEventReact,
  type ReactNode,
  type Ref,
} from 'react'
import { CloudUpload } from 'lucide-react'
import { dinhDangSo } from '../../shared/dinh-dang'
import Nut from './Nut'
import { CHON_THU_MUC, THA_DE_KIEM_TRA } from '../copy/cho-duyet'

export type NguonTha =
  { loai: 'entries'; entries: FileSystemEntry[] } | { loai: 'files'; files: File[] }

export type TrangThaiVung = 'thuong' | 'xu-ly' | 'loi'

export interface PropsVungThaFile {
  trangThai?: TrangThaiVung
  /** Đang xử lý: số đã xong / tổng; không có thì thanh chạy không xác định (đang chờ máy chủ). */
  tienDo?: { xong: number; tong: number } | null
  /** Câu chính khi đang xử lý / lỗi (thường và kéo vào dùng câu F22, F02b). */
  tieuDe?: ReactNode
  /** Dòng phụ khi đang xử lý / lỗi. */
  moTa?: ReactNode
  onNhan: (nguon: NguonTha) => void
  /** Ref của nút "Chọn file…" (nơi dùng đưa focus về đây sau khi nhập / hoàn tác). */
  nutChonRef?: Ref<HTMLButtonElement>
  className?: string
}

const TIEU_DE_THUONG = 'Kéo thả file hoặc thư mục .md vào đây'
const MO_TA_THUONG =
  'Nội dung nhập vào luôn là Bản nháp. Không ghi đè bản Đã duyệt khi chưa xác nhận.'
const DANG_XU_LY = 'Đang xử lý'

/** Kéo có mang file (không phải chữ, link…). */
function coFile(dt: DataTransfer | null): boolean {
  return !!dt && Array.from(dt.types).includes('Files')
}

/** Số file khi kéo vào, chỉ khi chắc không có thư mục (mục nào cũng có kiểu MIME); không chắc → null. */
function soFileKeo(dt: DataTransfer): number | null {
  const items = Array.from(dt.items ?? [])
  if (items.length === 0 || items.some((i) => i.kind !== 'file' || i.type === '')) return null
  return items.length
}

const VIEN: Record<TrangThaiVung | 'keo-vao', string> = {
  thuong: 'border-[1.5px] border-dashed border-border-input bg-surface',
  'keo-vao': 'border-2 border-dashed border-primary bg-surface-2',
  'xu-ly': 'border border-solid border-border bg-surface',
  loi: 'border-[1.5px] border-dashed border-danger bg-surface',
}

// Nút tắt tạm (aria-disabled) trông như disabled của C35 (ghost giữ nền trong suốt).
const LOP_TAT_GHOST = 'aria-disabled:cursor-not-allowed aria-disabled:text-muted'
const LOP_TAT = `${LOP_TAT_GHOST} aria-disabled:border-border aria-disabled:bg-surface-2`

// Thuộc tính chọn thư mục (chưa có trong kiểu của React).
const CHON_THU_MUC_ATTR = { webkitdirectory: '' } as Record<string, string>

export default function VungThaFile({
  trangThai = 'thuong',
  tienDo,
  tieuDe,
  moTa,
  onNhan,
  nutChonRef,
  className = '',
}: PropsVungThaFile) {
  const id = useId()
  const idTieuDe = `${id}td`
  const idMoTa = `${id}mt`
  const vungRef = useRef<HTMLDivElement>(null)
  const oFile = useRef<HTMLInputElement>(null)
  const oThuMuc = useRef<HTMLInputElement>(null)
  const demKeo = useRef(0)
  const [keo, datKeo] = useState<{ so: number | null } | null>(null)
  const xuLy = trangThai === 'xu-ly'
  const hien = keo && !xuLy ? 'keo-vao' : trangThai

  // Thả trượt ra ngoài vùng: chặn trình duyệt mở file (mất trang), con trỏ báo "không thả được".
  useEffect(() => {
    const chan = (e: DragEvent) => {
      if (!coFile(e.dataTransfer)) return
      if (e.target instanceof Node && vungRef.current?.contains(e.target)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'none'
    }
    window.addEventListener('dragover', chan)
    window.addEventListener('drop', chan)
    return () => {
      window.removeEventListener('dragover', chan)
      window.removeEventListener('drop', chan)
    }
  }, [])

  // Đang xử lý thì bỏ trạng thái kéo vào (vd. vừa thả xong).
  useEffect(() => {
    if (xuLy) demKeo.current = 0
  }, [xuLy])

  function khiVao(e: DragEventReact<HTMLDivElement>) {
    if (!coFile(e.dataTransfer)) return
    e.preventDefault()
    demKeo.current += 1
    if (demKeo.current === 1) datKeo({ so: soFileKeo(e.dataTransfer) })
  }

  function khiQua(e: DragEventReact<HTMLDivElement>) {
    if (!coFile(e.dataTransfer)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = xuLy ? 'none' : 'copy'
  }

  function khiRa(e: DragEventReact<HTMLDivElement>) {
    if (!coFile(e.dataTransfer)) return
    demKeo.current = Math.max(0, demKeo.current - 1)
    if (demKeo.current === 0) datKeo(null)
  }

  function khiTha(e: DragEventReact<HTMLDivElement>) {
    if (!coFile(e.dataTransfer)) return
    e.preventDefault()
    demKeo.current = 0
    datKeo(null)
    if (xuLy) return
    // Entry chỉ lấy được ngay trong sự kiện drop.
    const items = Array.from(e.dataTransfer.items ?? []).filter((i) => i.kind === 'file')
    const entries = items.map((i) => i.webkitGetAsEntry?.() ?? null)
    if (entries.length > 0 && entries.every((x): x is FileSystemEntry => x !== null)) {
      onNhan({ loai: 'entries', entries })
    } else {
      onNhan({ loai: 'files', files: Array.from(e.dataTransfer.files) })
    }
  }

  function khiChon(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    // Chọn lại đúng file đó lần sau vẫn có sự kiện change.
    e.target.value = ''
    if (files.length > 0) onNhan({ loai: 'files', files })
  }

  const loi = hien === 'loi'
  const chuChinh =
    hien === 'keo-vao'
      ? keo?.so
        ? `${THA_DE_KIEM_TRA} ${dinhDangSo(keo.so)} file`
        : THA_DE_KIEM_TRA
      : hien === 'thuong'
        ? TIEU_DE_THUONG
        : (tieuDe ?? (xuLy ? DANG_XU_LY : TIEU_DE_THUONG))
  const chuPhu = hien === 'thuong' || hien === 'keo-vao' ? MO_TA_THUONG : moTa

  return (
    <div
      ref={vungRef}
      role="group"
      aria-labelledby={idTieuDe}
      aria-describedby={chuPhu != null ? idMoTa : undefined}
      aria-busy={xuLy || undefined}
      data-trang-thai={hien}
      onDragEnter={khiVao}
      onDragOver={khiQua}
      onDragLeave={khiRa}
      onDrop={khiTha}
      className={`flex min-w-0 items-center gap-4 rounded-[var(--radius-md)] p-5 transition-colors duration-150 max-md:flex-col max-md:items-stretch max-md:gap-3 max-md:p-4 ${VIEN[hien]} ${className}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4 max-md:gap-3">
        <span
          aria-hidden="true"
          className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 ${
            loi ? 'text-danger' : 'text-muted'
          }`}
        >
          <CloudUpload size={20} strokeWidth={1.75} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <strong id={idTieuDe} className={`font-semibold ${loi ? 'text-danger' : ''}`}>
            {chuChinh}
          </strong>
          {xuLy && <ThanhTienDo tienDo={tienDo ?? null} idNhan={idTieuDe} />}
          {chuPhu != null && (
            <span
              id={idMoTa}
              className={`text-[length:var(--fs-meta)] leading-[var(--lh-meta)] ${
                loi ? 'text-danger' : 'text-muted'
              }`}
            >
              {chuPhu}
            </span>
          )}
        </div>
      </div>
      {/* Đang xử lý: nút vẫn giữ focus (aria-disabled, không phải disabled) để focus không rơi về <body>. */}
      <div className="flex shrink-0 flex-wrap gap-2 max-md:flex-col">
        <Nut
          ref={nutChonRef}
          bien="phu"
          aria-disabled={xuLy || undefined}
          onClick={() => !xuLy && oFile.current?.click()}
          className={LOP_TAT}
        >
          Chọn file…
        </Nut>
        <Nut
          bien="ghost"
          aria-disabled={xuLy || undefined}
          onClick={() => !xuLy && oThuMuc.current?.click()}
          className={LOP_TAT_GHOST}
        >
          {CHON_THU_MUC}
        </Nut>
      </div>
      <input
        ref={oFile}
        type="file"
        multiple
        accept=".md,text/markdown"
        hidden
        onChange={khiChon}
        data-chon="file"
      />
      <input
        ref={oThuMuc}
        type="file"
        multiple
        hidden
        onChange={khiChon}
        data-chon="thu-muc"
        {...CHON_THU_MUC_ATTR}
      />
    </div>
  )
}

/** Thanh tiến độ 6px của F02b; không có số thì chạy không xác định. */
function ThanhTienDo({
  tienDo,
  idNhan,
}: {
  tienDo: { xong: number; tong: number } | null
  idNhan: string
}) {
  const phanTram = tienDo && tienDo.tong > 0 ? Math.round((tienDo.xong / tienDo.tong) * 100) : null
  return (
    <span className="flex items-center gap-3">
      <span
        role="progressbar"
        aria-labelledby={idNhan}
        aria-valuemin={tienDo ? 0 : undefined}
        aria-valuemax={tienDo ? tienDo.tong : undefined}
        aria-valuenow={tienDo ? tienDo.xong : undefined}
        className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-[3px] bg-surface-2"
      >
        <span
          className={`rounded-[3px] bg-primary ${
            phanTram === null
              ? 'w-1/3 motion-safe:animate-[nhap-nhay_1.6s_ease-in-out_infinite]'
              : ''
          }`}
          style={phanTram === null ? undefined : { width: `${phanTram}%` }}
        />
      </span>
      {tienDo && (
        <span className="shrink-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted tabular-nums">
          {dinhDangSo(tienDo.xong)}/{dinhDangSo(tienDo.tong)}
        </span>
      )}
    </span>
  )
}
