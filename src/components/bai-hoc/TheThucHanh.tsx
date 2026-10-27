// C20 Thẻ thực hành — bước Áp dụng của MỌI mẫu (F11 #b-thuc-hanh, F02b C20; §1, §8.5; đề xuất 1.5, 3.2, 4.3; phạm
// vi rút gọn mục 10): khối "Thực hành trên dự án thật" của Chủ đề, và ở vị trí khối "Bản của tôi" (Tài liệu) / "Kế
// hoạch thi của tôi" (Chứng chỉ) với đề bài do app đặt (`deBai`, KhoiApp). Từ trên xuống như F11:
// - tên khối + "Bước Áp dụng · <tình trạng>";
// - đề bài, đầu ra (### theo quy ước); khối viết khác quy ước thì cả khối là Markdown thường (không có ô tick);
// - "Tiêu chí tự kiểm": ô tick lưu SQLite ngay khi bấm (dấu [x] trong file không dùng);
// - ô Dự án (chọn là lưu) + "Thêm dự án" (dialog C32 + C36, thêm xong thì chọn luôn);
// - "Kết quả của bạn": ô tự lưu (C25, bản tạm);
// - "Xong" (bật khi ô Kết quả có chữ — 3.2) / "Không áp dụng (ghi lý do)" (dialog lý do bắt buộc).
// Đã Xong: dòng "Đã xong · Kết quả đã lưu · sửa được" (F02b), nút Xong thành "Bỏ đánh dấu Xong". Không áp dụng:
// "Không áp dụng" + `Lý do: "…"` (F02b), các ô nhập ẩn, nút thành "Bỏ đánh dấu" (toast + Hoàn tác ở lớp dữ liệu).
// Hai nút hành động giữ nguyên phần tử khi đổi chữ nên focus không mất (dialog đóng trả focus về đúng nút).
// Đã Xong thì không có "Không áp dụng" (bài đã làm thì không thể "không áp dụng"; hồi quy review: Xong → Không áp
// dụng → Bỏ đánh dấu từng về Đang làm, mất Xong) — muốn đánh dấu thì Bỏ đánh dấu Xong trước.
// `chuaCoDeBai`: bài thiếu khối này (hoặc chưa có file bài) — thay đề bài bằng ô nét đứt THUC_HANH_CHUA_CO_DE_BAI,
// phần làm bài vẫn đủ để bước Áp dụng làm được (đề xuất 3.2). Lý do Không áp dụng đang gõ (bản tạm) chỉ xoá khi máy
// chủ đã nhận (HopThoaiKhongApDung).
import { useId, useState, type MouseEvent } from 'react'
import { Check, FileX, Plus } from 'lucide-react'
import { DU_LIEU_BON_BUOC_TRONG, tinhBonBuoc } from '../../../shared/domain/bon-buoc'
import { TEN_BUOC, type TinhTrangBuoc } from '../../../shared/domain/trang-thai'
import {
  MUC_CON_THUC_HANH,
  MUC_CON_TIEU_CHI,
  type DongTick,
  type MucCon,
} from '../../../shared/noi-dung'
import type { MucHoc } from '../../../shared/roadmap'
import { KET_QUA_TOI_DA } from '../../../server/du-lieu/hop-dong-hoc'
import { useDuAn } from '../../app/du-lieu/du-an'
import { useHoc, useLuuThucHanh } from '../../app/du-lieu/hoc'
import Nut from '../Nut'
import { TruongChon } from '../TruongNhap'
import DongLoiHoc, { DongLoi } from './DongLoiHoc'
import HopThoaiKhongApDung, { OKhongApDung } from './HopThoaiKhongApDung'
import HopThoaiThemDuAn from './HopThoaiThemDuAn'
import KhoiBai from './KhoiBai'
import MarkdownBai from './Markdown'
import OTuLuu, { TrangThaiTuLuu } from './OTuLuu'
import {
  BO_DANH_DAU,
  BO_DANH_DAU_XONG,
  CHUA_CHON_DU_AN,
  LOI_DOC_DU_AN,
  THEM_DU_AN,
  THUC_HANH_CHUA_CO_DE_BAI,
  XONG_CAN_KET_QUA,
} from '../../copy/cho-duyet'

/** Chữ tình trạng bước Áp dụng ở dòng phụ "Bước Áp dụng · …" (F11 "đang làm"). */
export const CHU_BUOC_AP_DUNG: Record<TinhTrangBuoc, string> = {
  'chua-lam': 'chưa làm',
  'dang-lam': 'đang làm',
  xong: 'đã xong',
  'khong-ap-dung': 'Không áp dụng',
}

const LOP_H3 = 'm-0 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] font-semibold'
const LOP_META = 'text-[length:var(--fs-meta)] leading-[var(--lh-meta)]'

export interface PropsTheThucHanh {
  id: string
  tieuDe: string
  muc: MucHoc
  /** Tiểu mục theo quy ước (Đề bài, Đầu ra, Tiêu chí tự kiểm); null = khối viết khác quy ước */
  mucCon: readonly MucCon[] | null
  /** Tiêu chí tự kiểm (task list) — chỉ khi theo quy ước */
  tieuChi: readonly DongTick[]
  /** Cả thân khối (Markdown) khi viết khác quy ước */
  noiDung?: string
  /** Bài chưa có khối này (hoặc chưa có file): chỉ có phần làm bài */
  chuaCoDeBai?: boolean
  /** Đề bài do app đặt (Tài liệu, Chứng chỉ — khối do app tạo), hiện dưới "Đề bài" */
  deBai?: string
  /** Placeholder của ô "Kết quả của bạn"; mặc định câu của F11 */
  goiYKetQua?: string
  /** Có ô Dự án + "Thêm dự án" (Chứng chỉ: kế hoạch thi không gắn dự án) */
  coDuAn?: boolean
}

/** Placeholder ô Kết quả (F11). */
const GOI_Y_KET_QUA = 'Dán link, ghi chú hoặc mô tả bạn đã làm gì trên dự án.'

export default function TheThucHanh({
  id,
  tieuDe,
  muc,
  mucCon,
  tieuChi,
  noiDung,
  chuaCoDeBai = false,
  deBai,
  goiYKetQua = GOI_Y_KET_QUA,
  coDuAn = true,
}: PropsTheThucHanh) {
  const { hoc } = useHoc(muc.id)
  const api = useLuuThucHanh(muc.id)
  const duAn = useDuAn()
  const [moKhongApDung, datMoKhongApDung] = useState(false)
  const [lanMoKad, datLanMoKad] = useState(0)
  const [moThemDuAn, datMoThemDuAn] = useState(false)
  const [lanMoDuAn, datLanMoDuAn] = useState(0)
  const idKetQua = useId()
  const idGoiYXong = useId()

  const th = hoc?.thucHanh
  const coDuLieu = hoc !== undefined
  const buoc = tinhBonBuoc({ mau: muc.mau, cauHoiKhoa: [], hoc: hoc ?? DU_LIEU_BON_BUOC_TRONG })
  const tinhTrang = buoc.tinhTrang['ap-dung']
  const khongApDung = th?.trangThai === 'khong-ap-dung'
  const daXong = th?.trangThai === 'xong'
  const coKetQua = (api.ketQua.giaTri ?? '').trim() !== ''

  /** Safari không focus nút khi bấm chuột: focus trước để dialog trả focus về đúng nút khi đóng. */
  function moDialog(e: MouseEvent<HTMLButtonElement>, mo: () => void) {
    e.currentTarget.focus()
    mo()
  }

  const md = (chu: string) => (
    <MarkdownBai muc={muc} tenKhoi={tieuDe}>
      {chu}
    </MarkdownBai>
  )

  return (
    <KhoiBai
      id={id}
      tieuDe={tieuDe}
      phu={`Bước ${TEN_BUOC['ap-dung']} · ${CHU_BUOC_AP_DUNG[tinhTrang]}`}
      card
    >
      {chuaCoDeBai && (
        <p className="m-0 flex items-start gap-2 rounded-[var(--radius-sm)] border-[1.5px] border-dashed border-border-input px-3 py-2 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] text-muted">
          <FileX size={16} strokeWidth={1.75} aria-hidden="true" className="mt-1 shrink-0" />
          {THUC_HANH_CHUA_CO_DE_BAI}
        </p>
      )}
      {deBai && (
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className={LOP_H3}>{MUC_CON_THUC_HANH[0]}</h3>
          <p className="m-0">{deBai}</p>
        </div>
      )}
      {mucCon
        ? mucCon
            .filter((m) => m.mauTen !== MUC_CON_TIEU_CHI)
            .map((m) => (
              <div key={`${m.dong}-${m.tieuDe}`} className="flex min-w-0 flex-col gap-1">
                <h3 className={LOP_H3}>{m.mauTen ?? m.tieuDe}</h3>
                {m.noiDung !== '' && md(m.noiDung)}
              </div>
            ))
        : noiDung && md(noiDung)}

      {khongApDung ? (
        <OKhongApDung lyDo={th?.lyDo ?? ''} />
      ) : (
        <>
          {tieuChi.length > 0 && (
            <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
              <legend className={`mb-1 p-0 ${LOP_H3}`}>{MUC_CON_TIEU_CHI}</legend>
              {tieuChi.map((t) => (
                // Chữ tiêu chí là Markdown trong dòng (component), lint không thấy được chữ của nhãn
                // eslint-disable-next-line jsx-a11y/label-has-associated-control
                <label
                  key={t.khoa}
                  className="flex cursor-pointer items-start gap-2.5 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] has-disabled:cursor-not-allowed"
                >
                  <input
                    type="checkbox"
                    checked={th?.tieuChi[t.khoa] === true}
                    disabled={!coDuLieu}
                    onChange={(e) => api.datTieuChi(t.khoa, e.target.checked)}
                    className="mt-[3px] size-[18px] shrink-0 accent-[var(--primary)]"
                  />
                  <span className="min-w-0">
                    <MarkdownBai muc={muc} tenKhoi={tieuDe} trongDong>
                      {t.chu}
                    </MarkdownBai>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {coDuAn && (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-end gap-2">
                <TruongChon
                  nhan="Dự án"
                  className="min-w-0 flex-[1_1_240px]"
                  value={th?.duAnId == null ? '' : String(th.duAnId)}
                  voHieu={!coDuLieu || duAn.duAn === undefined}
                  onChange={(e) =>
                    api.dat({ duAnId: e.target.value === '' ? null : Number(e.target.value) })
                  }
                >
                  <option value="">{CHUA_CHON_DU_AN}</option>
                  {duAn.duAn?.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.giaiDoan ? `${d.ten} · ${d.giaiDoan}` : d.ten}
                    </option>
                  ))}
                </TruongChon>
                <Nut
                  bien="phu"
                  icon={Plus}
                  disabled={!coDuLieu}
                  onClick={(e) =>
                    moDialog(e, () => {
                      datLanMoDuAn((n) => n + 1)
                      datMoThemDuAn(true)
                    })
                  }
                >
                  {THEM_DU_AN}
                </Nut>
              </div>
              {duAn.loi && <DongLoi cau={LOI_DOC_DU_AN} thuLai={duAn.taiLai} />}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <label htmlFor={idKetQua} className={`${LOP_META} font-semibold`}>
                Kết quả của bạn
              </label>
              <TrangThaiTuLuu tuLuu={api.ketQua} />
            </div>
            <OTuLuu
              id={idKetQua}
              tuLuu={api.ketQua}
              rows={4}
              maxLength={KET_QUA_TOI_DA}
              placeholder={goiYKetQua}
            />
          </div>

          {daXong && (
            <p className={`m-0 flex items-center gap-1.5 ${LOP_META}`}>
              <Check size={14} strokeWidth={2.5} aria-hidden="true" className="shrink-0" />
              <strong className="font-semibold">Đã xong</strong>
              <span className="text-muted">· Kết quả đã lưu · sửa được</span>
            </p>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!khongApDung && (
          <Nut
            key="xong"
            bien={daXong ? 'phu' : 'chinh'}
            disabled={!coDuLieu || (!daXong && !coKetQua)}
            aria-describedby={!daXong && !coKetQua ? idGoiYXong : undefined}
            onClick={() => api.dat({ trangThai: daXong ? 'dang-lam' : 'xong' })}
          >
            {daXong ? BO_DANH_DAU_XONG : 'Xong'}
          </Nut>
        )}
        {!daXong && (
          <Nut
            key="khong-ap-dung"
            bien={khongApDung ? 'phu' : 'ghost'}
            disabled={!coDuLieu}
            className={khongApDung ? '' : 'underline'}
            onClick={(e) =>
              khongApDung
                ? api.dat({ trangThai: null })
                : moDialog(e, () => {
                    datLanMoKad((n) => n + 1)
                    datMoKhongApDung(true)
                  })
            }
          >
            {khongApDung ? BO_DANH_DAU : 'Không áp dụng (ghi lý do)'}
          </Nut>
        )}
        {!khongApDung && !daXong && !coKetQua && coDuLieu && (
          <span id={idGoiYXong} className={`${LOP_META} text-muted`}>
            {XONG_CAN_KET_QUA}
          </span>
        )}
      </div>
      <DongLoiHoc itemId={muc.id} />

      <HopThoaiKhongApDung
        key={`kad-${lanMoKad}`}
        mo={moKhongApDung}
        doiMo={datMoKhongApDung}
        muc={muc}
        khiLuu={(lyDo, daNhan) => {
          api.dat({ trangThai: 'khong-ap-dung', lyDo }, { treToast: true, khiXong: daNhan })
          datMoKhongApDung(false)
        }}
      />
      <HopThoaiThemDuAn
        key={`du-an-${lanMoDuAn}`}
        mo={moThemDuAn}
        doiMo={datMoThemDuAn}
        khiThem={(moi) => {
          datMoThemDuAn(false)
          if (moi) api.dat({ duAnId: moi.id })
        }}
      />
    </KhoiBai>
  )
}
