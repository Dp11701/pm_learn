// C24 Ghi chú của một mục (F11 cột phải, F15; §10): nhãn "Ghi chú" 15/24 600 + C25 tự lưu bên phải ("Đang lưu…" /
// "Đã lưu lúc 21:42" / "Lỗi lưu — Thử lại"), ô nhiều dòng 15/24. Mục chưa có nội dung vẫn ghi chú được (§1).
// Tự lưu qua useLuuGhiChu (src/app/du-lieu/hoc.ts: chờ ngừng gõ rồi gửi, bản tạm nhap-tam, lỗi giữ chữ). Đang focus
// thì ô giữ đúng chữ người dùng đang thấy: tải lại / revision mới không bao giờ đè ô đang gõ (§11).
// Dạng:
// - 'card': card ở cột phải (≥ 1280);
// - 'panel': trong panel trượt "Ghi chú" (< 1280) — panel đã có tiêu đề "Ghi chú" nên nhãn chỉ cho trình đọc
//   màn hình, C25 nằm trên ô.
// Ngoài QueryClientProvider (gallery, test khung app): ô khoá, không gọi API.
import { useContext, useId, useState, type ReactNode, type Ref } from 'react'
import { QueryClientContext } from '@tanstack/react-query'
import { CircleAlert } from 'lucide-react'
import { GHI_CHU_TOI_DA } from '../../../server/du-lieu/hop-dong-hoc'
import { useHoc, useLuuGhiChu } from '../../app/du-lieu/hoc'
import { lopO } from '../TruongNhap'
import TuLuu from '../TuLuu'
import { LOI_DOC_GHI_CHU } from '../../copy/cho-duyet'

/** Chữ gợi ý của ô (F15). */
const GOI_Y_GHI_CHU = 'Ghi chú riêng cho mục này'

export type DangGhiChu = 'card' | 'panel'

export interface PropsTheGhiChu {
  itemId: string
  dang?: DangGhiChu
  /** Ô nhập (panel đưa focus vào ô khi mở) */
  refO?: Ref<HTMLTextAreaElement>
}

const LOP_CARD = 'rounded-[var(--radius-md)] border border-border bg-surface p-5'
/** Số dòng của ô: card 5 (F11); panel cao hết màn hình nên ô cao hơn. */
const SO_DONG_CARD = 5
const SO_DONG_PANEL = 12
const LOP_NHAN = 'text-[length:var(--fs-ui)] leading-[var(--lh-ui)] font-semibold'

interface PropsKhung {
  dang: DangGhiChu
  idO: string
  trangThai?: ReactNode
  children: ReactNode
}

function Khung({ dang, idO, trangThai, children }: PropsKhung) {
  const idNhan = `${idO}-nhan`
  return (
    <section
      aria-labelledby={idNhan}
      data-the="ghi-chu"
      className={`flex flex-col gap-2 ${dang === 'card' ? LOP_CARD : ''}`}
    >
      <div className="flex min-h-6 items-center justify-between gap-3">
        <label id={idNhan} htmlFor={idO} className={dang === 'panel' ? 'sr-only' : LOP_NHAN}>
          Ghi chú
        </label>
        {trangThai}
      </div>
      {children}
    </section>
  )
}

/** Ô khoá khi không có máy chủ. */
function GhiChuKhongMayChu({ dang }: { dang: DangGhiChu }) {
  const idO = useId()
  return (
    <Khung dang={dang} idO={idO}>
      <textarea
        id={idO}
        rows={dang === 'panel' ? SO_DONG_PANEL : SO_DONG_CARD}
        disabled
        placeholder={GOI_Y_GHI_CHU}
        className={`${lopO()} resize-y px-3 py-2`}
      />
    </Khung>
  )
}

function GhiChuCoMayChu({
  itemId,
  dang,
  refO,
}: Required<Omit<PropsTheGhiChu, 'refO'>> & {
  refO?: Ref<HTMLTextAreaElement>
}) {
  const idO = useId()
  const { hoc, loi, taiLai } = useHoc(itemId)
  const tuLuu = useLuuGhiChu(itemId)
  // Chữ trong ô lúc đang focus: chỉ đổi theo người gõ, không theo dữ liệu tải lại.
  const [chuDangGo, datChuDangGo] = useState<string | null>(null)
  const chuaCo = tuLuu.giaTri === undefined
  const giaTri = chuDangGo ?? tuLuu.giaTri ?? ''

  return (
    <Khung
      dang={dang}
      idO={idO}
      trangThai={
        <TuLuu
          trangThai={tuLuu.tinhTrang ?? 'nghi'}
          luc={tuLuu.luc}
          thuLai={tuLuu.thuLai}
          className="text-right"
        />
      }
    >
      <textarea
        ref={refO}
        id={idO}
        rows={dang === 'panel' ? SO_DONG_PANEL : SO_DONG_CARD}
        value={giaTri}
        disabled={chuaCo}
        maxLength={GHI_CHU_TOI_DA}
        placeholder={GOI_Y_GHI_CHU}
        onFocus={() => datChuDangGo(tuLuu.giaTri ?? '')}
        onChange={(e) => {
          datChuDangGo(e.target.value)
          tuLuu.luu(e.target.value)
        }}
        onBlur={() => {
          datChuDangGo(null)
          tuLuu.xongNgay()
        }}
        className={`${lopO(tuLuu.tinhTrang === 'loi')} resize-y px-3 py-2`}
      />
      {loi && hoc === undefined && (
        <p className="m-0 flex flex-wrap items-center gap-1.5 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-danger">
          <CircleAlert size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
          {LOI_DOC_GHI_CHU} —
          <button
            type="button"
            onClick={taiLai}
            className="cursor-pointer rounded-[var(--radius-sm)] text-danger underline hover:decoration-2"
          >
            Thử lại
          </button>
        </p>
      )}
    </Khung>
  )
}

export default function TheGhiChu({ itemId, dang = 'card', refO }: PropsTheGhiChu) {
  const coMayChu = useContext(QueryClientContext) !== undefined
  return coMayChu ? (
    <GhiChuCoMayChu itemId={itemId} dang={dang} refO={refO} />
  ) : (
    <GhiChuKhongMayChu dang={dang} />
  )
}
