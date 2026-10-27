// C21 Câu tự kiểm tra — bước Kiểm tra (F11 #b-tu-kiem-tra, F02b C21; §1 "tự trả lời trước, rồi mới Xem đáp án và
// tự chấm"; đề xuất 1.5, 3.2, 3.5; quyết định 7). Mỗi câu:
// - "Câu i/n", câu hỏi 17/28 500;
// - "Câu trả lời của bạn": ô tự lưu (C25, bản tạm);
// - "Xem đáp án" chỉ bật khi ô trả lời có chữ (kèm câu F11 "Viết câu trả lời để mở đáp án."); xem rồi thì nút
//   nhường chỗ cho ô "Đáp án:" (nền surface-2, F02b) và focus vào đó. Đáp án KHÔNG có trong trang trước khi xem;
// - "Tự chấm sau khi xem đáp án:" Đúng / Một phần / Sai — nút trung tính (đỏ chỉ cho lỗi và xoá), bật sau khi
//   xem; lần chấm mới nhất có viền mực 1,5px, nền surface-2, chữ 600 + ✓ (aria-pressed);
// - "Tạo flashcard" mở hộp thoại thẻ điền sẵn H/Đ + khoá câu (đề xuất 3.5). Tự đặt: chỉ bật sau khi xem đáp án,
//   vì thẻ điền sẵn đáp án (F11 vẽ bật sẵn).
// Câu trả lời có khoá không còn hiện thành C21 (câu hỏi đổi / bị bỏ, hoặc khối Tự kiểm tra viết khác quy ước) giữ
// dưới tiêu đề thu gọn "Câu trả lời cho câu hỏi cũ (n)", không bao giờ xoá (đề xuất 1.5). Danh sách này luôn có chỗ
// hiện: khối Tự kiểm tra hợp lệ đầu tiên, không có thì khối viết khác quy ước / ô "Chưa có Tự kiểm tra" (ThanBai).
// Nối lại câu cũ sang câu mới (Dice ≥ 0,8, đề xuất 1.5) do server làm khi trả GET /api/hoc/:id: khoá ở đây đã là
// khoá sau khi nối, câu còn "cũ" là câu không nối được.
import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'
import { Plus } from 'lucide-react'
import type { MucCham } from '../../../shared/domain/bon-buoc'
import type { CauHoi } from '../../../shared/noi-dung'
import type { MucHoc } from '../../../shared/roadmap'
import { dinhDangSo } from '../../../shared/dinh-dang'
import { TRA_LOI_TOI_DA } from '../../../server/du-lieu/hop-dong-hoc'
import { useHoc, useLuuTuKiemTra, type CauTraLoi } from '../../app/du-lieu/hoc'
import Nut from '../Nut'
import HopThoaiThe, { type PropsHopThoaiThe } from '../the/HopThoaiThe'
import DongLoiHoc from './DongLoiHoc'
import KhoiBai from './KhoiBai'
import MarkdownBai from './Markdown'
import OTuLuu, { TrangThaiTuLuu } from './OTuLuu'
import { CAU_TRA_LOI_CU_MO_TA, lanTuChamCuoi } from '../../copy/cho-duyet'

/** Tên mức tự chấm (§1). */
export const TEN_MUC_CHAM: Record<MucCham, string> = {
  dung: 'Đúng',
  'mot-phan': 'Một phần',
  sai: 'Sai',
}
const CAC_MUC: readonly MucCham[] = ['dung', 'mot-phan', 'sai']

const LOP_META = 'text-[length:var(--fs-meta)] leading-[var(--lh-meta)]'

export interface PropsCauTuKiemTra {
  cau: CauHoi
  thu: number
  tong: number
  muc: MucHoc
  tenKhoi: string
  /** "Tạo flashcard" từ câu này (nút đã được focus trước khi gọi) */
  taoThe: (cau: CauHoi) => void
}

/** Một câu C21. */
export function CauTuKiemTra({ cau, thu, tong, muc, tenKhoi, taoThe }: PropsCauTuKiemTra) {
  const { hoc } = useHoc(muc.id)
  const api = useLuuTuKiemTra(muc.id, cau.khoa)
  const dl = hoc?.tuKiemTra[cau.khoa]
  const coDuLieu = hoc !== undefined
  const daXem = dl?.daXem === true
  const cham = dl?.cham ?? null
  const coTraLoi = (api.traLoi.giaTri ?? '').trim() !== ''
  const idTraLoi = useId()
  const idGoiY = useId()
  const refDapAn = useRef<HTMLDivElement>(null)
  // Vừa bấm "Xem đáp án": đáp án hiện ra thì focus vào đó (nút đã biến mất)
  const choFocus = useRef(false)

  useEffect(() => {
    if (daXem && choFocus.current) {
      choFocus.current = false
      refDapAn.current?.focus()
    }
  }, [daXem])

  return (
    <li data-khoa-cau={cau.khoa} className="flex min-w-0 flex-col gap-3">
      <span className={`${LOP_META} text-muted tabular-nums`}>
        Câu {dinhDangSo(thu)}/{dinhDangSo(tong)}
      </span>
      <div className="font-medium [text-wrap:pretty]">
        <MarkdownBai muc={muc} tenKhoi={tenKhoi} trongDong>
          {cau.hoi}
        </MarkdownBai>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <label htmlFor={idTraLoi} className={`${LOP_META} font-semibold`}>
            Câu trả lời của bạn
          </label>
          <TrangThaiTuLuu tuLuu={api.traLoi} />
        </div>
        <OTuLuu id={idTraLoi} tuLuu={api.traLoi} rows={3} maxLength={TRA_LOI_TOI_DA} />
      </div>

      {daXem ? (
        <div
          ref={refDapAn}
          tabIndex={-1}
          data-dap-an=""
          className="flex min-w-0 flex-col gap-1 rounded-[var(--radius-sm)] bg-surface-2 px-3 py-2"
        >
          <strong className={`${LOP_META} font-semibold`}>Đáp án:</strong>
          <MarkdownBai muc={muc} tenKhoi={tenKhoi}>
            {cau.dap}
          </MarkdownBai>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Nut
            bien="phu"
            disabled={!coDuLieu || !coTraLoi}
            aria-describedby={coTraLoi ? undefined : idGoiY}
            onClick={() => {
              choFocus.current = true
              api.xemDapAn()
            }}
          >
            Xem đáp án
          </Nut>
          {!coTraLoi && (
            <span id={idGoiY} className={`${LOP_META} text-muted`}>
              Viết câu trả lời để mở đáp án.
            </span>
          )}
        </div>
      )}

      <div
        role="group"
        aria-label="Tự chấm"
        className="flex flex-wrap items-center gap-2 border-t border-border pt-4"
      >
        <span className={`mr-1 ${LOP_META} text-muted`}>Tự chấm sau khi xem đáp án:</span>
        {CAC_MUC.map((m) => {
          const chon = cham === m
          return (
            <Nut
              key={m}
              co="nho"
              bien="phu"
              disabled={!daXem}
              aria-pressed={chon}
              onClick={() => api.cham(m)}
              // F11: nút tự chấm đệm ngang 12 (nút nhỏ mặc định 10)
              className={`px-3! ${chon ? 'border-[1.5px] border-text bg-surface-2 font-semibold' : ''}`}
            >
              {TEN_MUC_CHAM[m]}
              {chon && <span aria-hidden="true">✓</span>}
            </Nut>
          )
        })}
        <Nut
          co="nho"
          bien="ghost"
          icon={Plus}
          disabled={!daXem}
          className="ml-auto"
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.focus()
            taoThe(cau)
          }}
        >
          Tạo flashcard
        </Nut>
      </div>
    </li>
  )
}

/** Câu trả lời có khoá không còn trong bài: thu gọn, chỉ đọc; có chữ câu hỏi lúc lưu (server ghi) thì hiện trên. */
function CauTraLoiCu({ cacCau, muc }: { cacCau: readonly [string, CauTraLoi][]; muc: MucHoc }) {
  return (
    <details className="group border-t border-border pt-4">
      <summary
        className={`cursor-pointer rounded-[var(--radius-sm)] ${LOP_META} font-semibold tabular-nums`}
      >
        Câu trả lời cho câu hỏi cũ ({dinhDangSo(cacCau.length)})
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className={`m-0 ${LOP_META} text-muted`}>{CAU_TRA_LOI_CU_MO_TA}</p>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {cacCau.map(([khoa, c]) => (
            <li
              key={khoa}
              className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-border px-3 py-2"
            >
              {c.cauHoi && (
                <div
                  data-cau-hoi-cu=""
                  className={`${LOP_META} font-semibold [overflow-wrap:anywhere]`}
                >
                  <MarkdownBai muc={muc} tenKhoi={muc.label} trongDong>
                    {c.cauHoi}
                  </MarkdownBai>
                </div>
              )}
              <p className="m-0 [overflow-wrap:anywhere] whitespace-pre-wrap">
                {c.traLoi.trim() === '' ? '—' : c.traLoi}
              </p>
              {c.cham && (
                <span className={`${LOP_META} text-muted`}>
                  {lanTuChamCuoi(TEN_MUC_CHAM[c.cham])}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}

/**
 * "Câu trả lời cho câu hỏi cũ (n)" của mục: câu trả lời có chữ hoặc đã chấm mà khoá không nằm trong `khoaTrongBai`
 * (khoá các câu đang hiện thành C21). Không có câu nào → không vẽ gì.
 */
export function CauTraLoiCuCuaMuc({
  muc,
  khoaTrongBai,
}: {
  muc: MucHoc
  khoaTrongBai: readonly string[]
}) {
  const { hoc } = useHoc(muc.id)
  if (!hoc) return null
  const trongBai = new Set(khoaTrongBai)
  const cauCu: [string, CauTraLoi][] = []
  for (const [khoa, c] of Object.entries(hoc.tuKiemTra)) {
    if (!trongBai.has(khoa) && (c.traLoi.trim() !== '' || c.cham)) cauCu.push([khoa, c])
  }
  return cauCu.length > 0 ? <CauTraLoiCu cacCau={cauCu} muc={muc} /> : null
}

export interface PropsKhoiTuKiemTra {
  id: string
  tieuDe: string
  cauHoi: readonly CauHoi[]
  muc: MucHoc
  /**
   * Khoá các câu đang hiện thành C21 (mọi khối Tự kiểm tra hợp lệ); có thì khối hiện "Câu trả lời cho câu hỏi cũ
   * (n)" cho câu trả lời có khoá ngoài danh sách này. Chỉ một khối của bài nhận prop này.
   */
  khoaTrongBai?: readonly string[]
}

/** Khối Tự kiểm tra theo quy ước "- H: … | Đ: …": card, mỗi câu một C21, các câu cách nhau bằng đường kẻ. */
export default function KhoiTuKiemTra({
  id,
  tieuDe,
  cauHoi,
  muc,
  khoaTrongBai,
}: PropsKhoiTuKiemTra) {
  const [the, datThe] = useState<{ lan: number; giaTriDau: PropsHopThoaiThe['giaTriDau'] }>({
    lan: 0,
    giaTriDau: undefined,
  })
  const [moThe, datMoThe] = useState(false)

  return (
    <KhoiBai id={id} tieuDe={tieuDe} phu="Tự trả lời trước, rồi mới xem đáp án." card>
      <ol className="m-0 flex list-none flex-col gap-4 p-0 [&>li+li]:border-t [&>li+li]:border-border [&>li+li]:pt-4">
        {cauHoi.map((cau, i) => (
          <CauTuKiemTra
            key={cau.khoa}
            cau={cau}
            thu={i + 1}
            tong={cauHoi.length}
            muc={muc}
            tenKhoi={tieuDe}
            taoThe={(c) => {
              datThe((t) => ({
                lan: t.lan + 1,
                giaTriDau: { truoc: c.hoi, sau: c.dap, khoaCau: c.khoa },
              }))
              datMoThe(true)
            }}
          />
        ))}
      </ol>
      {khoaTrongBai && <CauTraLoiCuCuaMuc muc={muc} khoaTrongBai={khoaTrongBai} />}
      <DongLoiHoc itemId={muc.id} />
      <HopThoaiThe
        key={the.lan}
        mo={moThe}
        doiMo={datMoThe}
        itemId={muc.id}
        giaTriDau={the.giaTriDau}
      />
    </KhoiBai>
  )
}
