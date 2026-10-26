// C28 Tìm kiếm (§6.3, đề xuất 1.8; frame C28, F25, F25b) — phase 1 tối giản: chỉ nhóm "Mục học", khớp
// tên, tên gốc, viết tắt, giải nghĩa (nếu có). Nhóm "Phần · Lĩnh vực · Nhóm", "Trong bài và ghi chú",
// /api/tim có ở phase 4. ≥ 768: popover 560px cách đỉnh 80, giữa vùng nội dung bên phải sidebar/rail;
// < 768: sheet toàn màn hình (đề xuất 4.3). Combobox + listbox aria-activedescendant, mặc định chọn kết
// quả đầu; ↑/↓ di chuyển, Enter mở /hoc/:slug, Esc đóng — bỏ qua khi Telex/VNI đang ghép chữ.
import {
  Fragment,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { useNavigate } from 'react-router'
import { Dialog } from 'radix-ui'
import { Search, X } from 'lucide-react'
import { layCay, type MucHoc } from '../../../shared/roadmap'
import {
  foldVi,
  tachDoan,
  taoChiMuc,
  timKiem,
  type ChiMuc,
  type Doan,
  type KetQuaKhop,
} from '../../../shared/tim-kiem'
import {
  TEN_CAN_ON_LAI,
  TEN_TRANG_THAI_HOC,
  type TrangThaiHoc,
  type TrangThaiNoiDung,
} from '../../../shared/domain/trang-thai'
import Nut from '../Nut'
import { dangGhepChu } from '../TruongNhap'
import { ID_TIEU_DE_TRANG } from '../TieuDeTrang'
import IconTrangThai from '../trang-thai/IconTrangThai'
import ChipLoai from '../trang-thai/ChipLoai'
import ChipNoiDung from '../trang-thai/ChipNoiDung'
import { LOP_ICON } from '../trang-thai/mau-trang-thai'

/** Dữ liệu học của một mục cho hàng kết quả. Không có (phase 1) → Chưa học, không chip nội dung. */
export interface ThongTinMucTim {
  trangThai?: TrangThaiHoc
  canOnLai?: boolean
  /** Chỉ "Chưa có nội dung" mới hiện chip (§6.3) */
  noiDung?: TrangThaiNoiDung
}

export interface DuLieuTimKiem {
  /** Tra dữ liệu học theo id nút roadmap (phase 2a trở đi) */
  traMuc?: (id: string) => ThongTinMucTim | undefined
  /** id → giải nghĩa của mục đã có nội dung, để tìm theo giải nghĩa */
  giaiNghia?: ReadonlyMap<string, string>
}

export interface PropsHopTimKiem extends DuLieuTimKiem {
  mo: boolean
  doiMo: (mo: boolean) => void
}

// Chỉ mục dựng một lần từ cây; giải nghĩa đổi (map mới) thì dựng lại.
let chiMucDaDung: { giaiNghia?: ReadonlyMap<string, string>; chiMuc: ChiMuc } | undefined
function layChiMuc(giaiNghia?: ReadonlyMap<string, string>): ChiMuc {
  if (!chiMucDaDung || chiMucDaDung.giaiNghia !== giaiNghia) {
    chiMucDaDung = { giaiNghia, chiMuc: taoChiMuc(layCay(), giaiNghia) }
  }
  return chiMucDaDung.chiMuc
}

const LOP_KHUNG = [
  'fixed z-50 flex flex-col overflow-hidden bg-[var(--surface-dialog)] text-text outline-none',
  'inset-0',
  'md:inset-auto md:top-20 md:left-1/2 md:max-h-[calc(100dvh-120px)] md:w-[min(560px,calc(100vw-32px))] md:-translate-x-1/2 md:rounded-[var(--radius-lg)] md:border md:border-[var(--tim-kiem-vien)] md:shadow-[var(--shadow-3)]',
  'lg:left-[calc(50%_+_var(--rail-w)_/_2)] xl:left-[calc(50%_+_var(--sidebar-w)_/_2)]',
  'data-[state=open]:animate-[hien-dan_150ms_ease-out] data-[state=closed]:animate-[an-dan_150ms_ease-in]',
].join(' ')

const LOP_GOI_Y = 'text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted'
const LOP_CHU_NHO = 'text-xs leading-[18px] text-muted'

export default function HopTimKiem({ mo, doiMo, ...duLieu }: PropsHopTimKiem) {
  const navigate = useNavigate()
  const oNhap = useRef<HTMLInputElement>(null)
  const truocKhiMo = useRef<Element | null>(null)
  const daMoMuc = useRef(false)

  function moMuc(muc: MucHoc) {
    daMoMuc.current = true
    doiMo(false)
    void navigate(`/hoc/${muc.slug}`)
  }

  return (
    <Dialog.Root open={mo} onOpenChange={doiMo}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--scrim)] data-[state=open]:animate-[hien-dan_150ms_ease-out] data-[state=closed]:animate-[an-dan_150ms_ease-in]" />
        <Dialog.Content
          aria-modal="true"
          aria-describedby={undefined}
          className={LOP_KHUNG}
          onOpenAutoFocus={(e) => {
            truocKhiMo.current = document.activeElement
            daMoMuc.current = false
            e.preventDefault()
            oNhap.current?.focus()
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            const truoc = truocKhiMo.current
            const h1 = document.getElementById(ID_TIEU_DE_TRANG)
            // Đã mở một mục: focus về H1 của trang (khung app cũng làm khi đổi route), không về chỗ cũ.
            const dich =
              !daMoMuc.current &&
              truoc instanceof HTMLElement &&
              truoc.isConnected &&
              truoc !== document.body
                ? truoc
                : h1
            dich?.focus()
          }}
          onEscapeKeyDown={(e) => {
            // Esc lúc đang ghép chữ chỉ huỷ ghép, không đóng.
            if (dangGhepChu(e)) e.preventDefault()
          }}
        >
          <Dialog.Title className="sr-only">Tìm kiếm</Dialog.Title>
          <NoiDungTim oNhap={oNhap} moMuc={moMuc} {...duLieu} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function NoiDungTim({
  oNhap,
  moMuc,
  traMuc,
  giaiNghia,
}: DuLieuTimKiem & {
  oNhap: RefObject<HTMLInputElement | null>
  moMuc: (muc: MucHoc) => void
}) {
  const id = useId()
  const idO = `${id}o`
  const idDs = `${id}ds`
  const idNhom = `${id}nhom`
  const idHuongDan = `${id}hd`
  const [truyVan, datTruyVan] = useState('')
  const [chon, datChon] = useState(0)
  const chiMuc = useMemo(() => layChiMuc(giaiNghia), [giaiNghia])
  const ketQua = useMemo(() => timKiem(chiMuc, truyVan).mucHoc, [chiMuc, truyVan])
  const coTruyVan = foldVi(truyVan).folded !== ''
  const dangChon = ketQua.length > 0 ? Math.min(chon, ketQua.length - 1) : -1
  const idKetQua = (i: number) => `${id}kq${i}`
  const idDangChon = dangChon >= 0 ? `${id}kq${dangChon}` : undefined

  useEffect(() => {
    if (idDangChon) document.getElementById(idDangChon)?.scrollIntoView?.({ block: 'nearest' })
  }, [idDangChon])

  function khiPhim(e: KeyboardEvent<HTMLInputElement>) {
    if (dangGhepChu(e) || e.altKey || e.ctrlKey || e.metaKey) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (ketQua.length === 0) return
      const buoc = e.key === 'ArrowDown' ? 1 : -1
      datChon((dangChon + buoc + ketQua.length) % ketQua.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (dangChon >= 0) moMuc(ketQua[dangChon].nut)
    }
  }

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-[var(--tim-kiem-vien)] px-4">
        <Search size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-muted" />
        <label htmlFor={idO} className="sr-only">
          Tìm mục
        </label>
        <input
          ref={oNhap}
          id={idO}
          type="text"
          role="combobox"
          aria-expanded={ketQua.length > 0}
          aria-controls={ketQua.length > 0 ? idDs : undefined}
          aria-autocomplete="list"
          aria-activedescendant={idDangChon}
          aria-describedby={idHuongDan}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Tìm mục…"
          value={truyVan}
          onChange={(e) => {
            datTruyVan(e.target.value)
            datChon(0)
          }}
          onKeyDown={khiPhim}
          // Frame vẽ ô không viền focus; đặc tả §11 thắng: giữ vòng focus chung (bo góc cho gọn).
          className="h-10 min-w-0 flex-1 rounded-[var(--radius-sm)] border-0 bg-transparent p-0 text-[17px] leading-7 font-medium text-text placeholder:font-normal placeholder:text-muted"
        />
        <kbd
          aria-hidden="true"
          className="rounded-[4px] border border-[var(--tim-kiem-vien)] px-1.5 font-mono text-[12px] text-muted max-md:hidden"
        >
          Esc
        </kbd>
        <Dialog.Close asChild>
          <Nut bien="ghost" chiIcon icon={X} aria-label="Đóng" className="-mr-2 md:hidden" />
        </Dialog.Close>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {ketQua.length > 0 && (
          <div role="listbox" id={idDs} aria-label="Kết quả tìm kiếm" className="py-2">
            <div role="group" aria-labelledby={idNhom}>
              <div
                role="presentation"
                id={idNhom}
                className="px-4 pt-2.5 pb-1.5 text-xs leading-[18px] font-semibold text-muted"
              >
                Mục học · {ketQua.length}
              </div>
              {ketQua.map((kq, i) => (
                <HangKetQua
                  key={kq.nut.id}
                  id={idKetQua(i)}
                  kq={kq}
                  chon={i === dangChon}
                  thongTin={traMuc?.(kq.nut.id)}
                  khiBam={() => moMuc(kq.nut)}
                />
              ))}
            </div>
          </div>
        )}
        {coTruyVan && ketQua.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
            <strong className="font-semibold">{`Không có kết quả cho "${truyVan.trim()}"`}</strong>
            <span className={LOP_GOI_Y}>
              {'Thử tên tiếng Anh hoặc viết tắt, vd. "test pyramid" hoặc "ccb".'}
            </span>
          </div>
        )}
      </div>

      <div
        id={idHuongDan}
        className={`flex shrink-0 gap-4 border-t border-[var(--tim-kiem-vien)] bg-[var(--tim-kiem-chan)] px-4 py-2 ${LOP_CHU_NHO}`}
      >
        <span className="max-md:hidden">↑ ↓ di chuyển</span>
        <span className="max-md:hidden">Enter mở</span>
        <span className="max-md:hidden">Esc đóng</span>
        <span className="ml-auto">Không phân biệt dấu, hoa/thường</span>
      </div>
    </>
  )
}

function TenKhop({ ten, doan }: { ten: string; doan: readonly Doan[] }) {
  return (
    <>
      {tachDoan(ten, doan).map((m, i) =>
        m.khop ? <strong key={i}>{m.chu}</strong> : <Fragment key={i}>{m.chu}</Fragment>,
      )}
    </>
  )
}

function HangKetQua({
  id,
  kq,
  chon,
  thongTin,
  khiBam,
}: {
  id: string
  kq: KetQuaKhop<MucHoc>
  chon: boolean
  thongTin?: ThongTinMucTim
  khiBam: () => void
}) {
  const muc = kq.nut
  const trangThai = thongTin?.trangThai ?? 'chua-hoc'
  const canOnLai = thongTin?.canOnLai ?? false
  return (
    // Các mục không nhận focus (focus ở ô tìm, mục đang chọn qua aria-activedescendant); bàn phím
    // do ô tìm xử lý, chuột bấm để mở. Giữ focus ở ô tìm khi bấm.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      role="option"
      id={id}
      aria-selected={chon}
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onClick={khiBam}
      className={`flex min-h-[52px] cursor-pointer items-center gap-2.5 px-4 py-1.5 hover:bg-[var(--tim-kiem-chon)] ${
        chon ? 'bg-[var(--tim-kiem-chon)] shadow-[inset_0_0_0_2px_var(--primary)]' : ''
      }`}
    >
      <ChipLoai loai={muc.mau} chiIcon />
      <span className="flex min-w-0 flex-1 flex-col">
        <span lang="en">
          <TenKhop ten={muc.label} doan={kq.doanTen} />
        </span>
        <span lang="en" className={LOP_CHU_NHO}>
          {kq.chuoiCha.map((n) => n.label).join(' › ')}
        </span>
        {kq.truong === 'tenGoc' && muc.labelOriginal && (
          <span className={LOP_CHU_NHO}>
            Khớp tên gốc trên roadmap: <span lang="en">{muc.labelOriginal}</span>
          </span>
        )}
      </span>
      {thongTin?.noiDung?.loai === 'chua-co' && <ChipNoiDung trangThai={thongTin.noiDung} />}
      <span
        className={`flex shrink-0 items-center gap-1.5 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] ${LOP_ICON[trangThai]}`}
      >
        <IconTrangThai trangThai={trangThai} canOnLai={canOnLai} size={16} />
        {canOnLai
          ? `${TEN_TRANG_THAI_HOC[trangThai]} · ${TEN_CAN_ON_LAI}`
          : TEN_TRANG_THAI_HOC[trangThai]}
      </span>
    </div>
  )
}
