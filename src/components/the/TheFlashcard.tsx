// C22 card Flashcard của một mục (F11 cột phải, F15; đề xuất 3.5): neo #flashcard (bước Ghi nhớ của thanh 4 bước
// trỏ tới đây), tiêu đề "Flashcard · n thẻ" (chưa có thẻ: "Flashcard" + câu của F15), mỗi thẻ: mặt trước 13/20
// 500 + "Hộp 2 · ôn lại 24/10/2026" 12/18 muted, nút Sửa / Xoá; cuối card nút phụ "Tạo thẻ" (điền sẵn tên mục).
// - Tạo / sửa: HopThoaiThe. Xoá: alertdialog xác nhận (đề xuất 5: xoá dùng alertdialog) rồi xoá ngay, toast
//   "Đã xoá thẻ" + Hoàn tác 5 giây (useXoaThe: cùng id, giữ hộp và hạn). Xoá chạy khi alertdialog đã đóng hẳn
//   (HopThoai khiDongXong); nút Xoá mất theo thẻ nên focus về nút "Tạo thẻ" (có vòng focus, luôn còn trong card).
// - Phiên ôn (Nhớ / Quên) ở bước Ôn tập; card này không đổi hộp.
// Ngoài QueryClientProvider (gallery, test khung app): khung card đang tải, "Tạo thẻ" khoá.
import { useContext, useId, useRef, useState, type MouseEvent } from 'react'
import { QueryClientContext } from '@tanstack/react-query'
import { CircleAlert, Pencil, Plus, Trash2 } from 'lucide-react'
import { dinhDangNgay, dinhDangSo } from '../../../shared/dinh-dang'
import type { MucHoc } from '../../../shared/roadmap'
import { useHoc } from '../../app/du-lieu/hoc'
import { useXoaThe, type The } from '../../app/du-lieu/the'
import HopThoai from '../HopThoai'
import Nut from '../Nut'
import { DongCho, VungDangTai } from '../TrangThaiTrong'
import HopThoaiThe, { TAO_THE } from './HopThoaiThe'
import {
  LOI_DOC_THE,
  MO_TA_XOA_THE,
  NUT_XOA_THE,
  SUA_THE,
  TIEU_DE_XOA_THE,
} from '../../copy/cho-duyet'

/** id neo của card (thanh 4 bước, bước Ghi nhớ). */
export const ID_FLASHCARD = 'flashcard'

const LOP_CARD =
  'flex scroll-mt-6 flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-5 focus:outline-none'
const LOP_TIEU_DE = 'm-0 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] font-semibold'
const LOP_META = 'text-[length:var(--fs-chip)] leading-[var(--lh-chip)] text-muted tabular-nums'

/** "Hộp 2 · ôn lại 24/10/2026" (F11). */
export function dongHopHan(the: Pick<The, 'hop' | 'hanOn'>): string {
  return `Hộp ${dinhDangSo(the.hop)} · ôn lại ${dinhDangNgay(the.hanOn)}`
}

function TieuDe({ id, so }: { id: string; so: number | null }) {
  return (
    <h2 id={id} className={LOP_TIEU_DE}>
      Flashcard{so ? ` · ${dinhDangSo(so)} thẻ` : ''}
    </h2>
  )
}

function DongThe({
  the,
  khiSua,
  khiXoa,
}: {
  the: The
  khiSua: (e: MouseEvent<HTMLElement>) => void
  khiXoa: (e: MouseEvent<HTMLElement>) => void
}) {
  const idTruoc = useId()
  return (
    <li
      data-the-id={the.id}
      className="flex items-start gap-1 rounded-[var(--radius-sm)] border border-border bg-bg py-2.5 pr-1.5 pl-3"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          id={idTruoc}
          className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-medium whitespace-pre-line [overflow-wrap:anywhere]"
        >
          {the.truoc}
        </span>
        <span className={LOP_META}>{dongHopHan(the)}</span>
      </div>
      <Nut
        bien="ghost"
        co="nho"
        chiIcon
        icon={Pencil}
        aria-label={SUA_THE}
        aria-describedby={idTruoc}
        aria-haspopup="dialog"
        onClick={khiSua}
      />
      <Nut
        bien="ghost"
        co="nho"
        chiIcon
        icon={Trash2}
        aria-label={NUT_XOA_THE}
        aria-describedby={idTruoc}
        aria-haspopup="dialog"
        onClick={khiXoa}
      />
    </li>
  )
}

function FlashcardCoMayChu({ muc }: { muc: MucHoc }) {
  const idTieuDe = useId()
  const { hoc, loi, taiLai } = useHoc(muc.id)
  const xoa = useXoaThe(muc.id)
  const refTaoThe = useRef<HTMLButtonElement>(null)
  // Thẻ đã xác nhận xoá, chờ alertdialog đóng hẳn
  const choXoa = useRef<The | null>(null)
  // Hộp thoại tạo / sửa: undefined = đóng; null = tạo mới; số = sửa thẻ đó.
  const [dangSua, datDangSua] = useState<number | null | undefined>(undefined)
  const [lanMo, datLanMo] = useState(0)
  const [dangXoa, datDangXoa] = useState<The | null>(null)
  const refHuy = useRef<HTMLButtonElement>(null)
  const cacThe = hoc?.the ?? []

  /** Safari không focus nút khi bấm chuột: focus trước để dialog trả focus về đúng nút khi đóng. */
  function focusNutMo(e: MouseEvent<HTMLElement>) {
    e.currentTarget.focus()
  }

  function moSua(id: number | null, e: MouseEvent<HTMLElement>) {
    focusNutMo(e)
    datLanMo((n) => n + 1)
    datDangSua(id)
  }

  function xacNhanXoa() {
    choXoa.current = dangXoa
    datDangXoa(null)
  }

  /** alertdialog xoá đã đóng hẳn: xoá (nếu đã xác nhận) rồi đưa focus về "Tạo thẻ" thay cho nút Xoá sắp mất. */
  function sauKhiDongXoa(): boolean {
    const the = choXoa.current
    choXoa.current = null
    if (!the) return false
    xoa(the.id)
    refTaoThe.current?.focus({ preventScroll: true })
    return true
  }

  let than
  if (hoc === undefined) {
    than = loi ? (
      <p className="m-0 flex flex-wrap items-center gap-1.5 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-danger">
        <CircleAlert size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
        {LOI_DOC_THE} —
        <button
          type="button"
          onClick={taiLai}
          className="cursor-pointer rounded-[var(--radius-sm)] text-danger underline hover:decoration-2"
        >
          Thử lại
        </button>
      </p>
    ) : (
      <DangTai />
    )
  } else if (cacThe.length === 0) {
    than = (
      <p className={`m-0 ${LOP_META}`}>Chưa có thẻ cho mục này. Bước Ghi nhớ cần ít nhất 1 thẻ.</p>
    )
  } else {
    than = (
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {cacThe.map((t) => (
          <DongThe
            key={t.id}
            the={t}
            khiSua={(e) => moSua(t.id, e)}
            khiXoa={(e) => {
              focusNutMo(e)
              datDangXoa(t)
            }}
          />
        ))}
      </ul>
    )
  }

  return (
    <section id={ID_FLASHCARD} tabIndex={-1} aria-labelledby={idTieuDe} className={LOP_CARD}>
      <TieuDe id={idTieuDe} so={hoc ? cacThe.length : null} />
      {than}
      <Nut
        ref={refTaoThe}
        bien="phu"
        icon={Plus}
        disabled={hoc === undefined}
        aria-haspopup="dialog"
        onClick={(e) => moSua(null, e)}
        className="w-full"
      >
        {TAO_THE}
      </Nut>
      <HopThoaiThe
        key={lanMo}
        mo={dangSua !== undefined}
        doiMo={(m) => {
          if (!m) datDangSua(undefined)
        }}
        itemId={muc.id}
        theId={dangSua ?? undefined}
        giaTriDau={dangSua === null ? { truoc: muc.label, sau: '' } : undefined}
      />
      <HopThoai
        mo={dangXoa !== null}
        doiMo={(m) => {
          if (!m) datDangXoa(null)
        }}
        vaiTro="alertdialog"
        khiDongXong={sauKhiDongXoa}
        tieuDe={TIEU_DE_XOA_THE}
        phuDe={
          dangXoa && (
            <span className="whitespace-pre-line [overflow-wrap:anywhere]">{dangXoa.truoc}</span>
          )
        }
        moTa={MO_TA_XOA_THE}
        focusDau={refHuy}
        chan={
          <>
            <Nut ref={refHuy} bien="phu" onClick={() => datDangXoa(null)}>
              Huỷ
            </Nut>
            <Nut bien="nguy-hiem" icon={Trash2} onClick={xacNhanXoa}>
              {NUT_XOA_THE}
            </Nut>
          </>
        }
      />
    </section>
  )
}

function DangTai() {
  return (
    <VungDangTai className="flex flex-col gap-2">
      <DongCho rong="80%" />
      <DongCho rong="50%" />
    </VungDangTai>
  )
}

function FlashcardKhongMayChu() {
  const idTieuDe = useId()
  return (
    <section id={ID_FLASHCARD} tabIndex={-1} aria-labelledby={idTieuDe} className={LOP_CARD}>
      <TieuDe id={idTieuDe} so={null} />
      <DangTai />
      <Nut bien="phu" icon={Plus} disabled className="w-full">
        {TAO_THE}
      </Nut>
    </section>
  )
}

export default function TheFlashcard({ muc }: { muc: MucHoc }) {
  const coMayChu = useContext(QueryClientContext) !== undefined
  return coMayChu ? <FlashcardCoMayChu muc={muc} /> : <FlashcardKhongMayChu />
}
