// Khối do app tạo chứa việc của người học (đề xuất 3.2, 3.6): Nói lại bằng lời của bạn (C38 "Có ở phase 3"),
// Bản của tôi (C38 "Có ở phase 7c"), Kế hoạch thi của tôi (C38 "Có ở phase 11" + nút "Không áp dụng").
// Không phải khối nội dung: trang bài (ThanBai) và trang chưa có nội dung (ChuaCoNoiDung, trong khung bài) vẽ
// CÙNG một khối, không bao giờ là ô nét đứt "Chưa có" — chứng chỉ nhờ đó xong được bước Áp dụng cả khi chưa có
// file bài.
// - Kế hoạch thi (Chứng chỉ, đề xuất 3.2): nút phụ "Không áp dụng" → dialog C32 ghi lý do bắt buộc (C36, Enter
//   lưu, bỏ qua khi đang ghép chữ) → khối hiện "Không áp dụng" + lý do và "Bỏ đánh dấu". "Không áp dụng" của Bản
//   của tôi có ở phase 3.
import { useRef, useState, type MouseEvent } from 'react'
import { CircleAlert, Minus } from 'lucide-react'
import type { KhoiMau } from '../../../shared/noi-dung'
import { TEN_BUOC, TEN_LOAI } from '../../../shared/domain/trang-thai'
import type { MucHoc } from '../../../shared/roadmap'
import { LY_DO_AP_DUNG_TOI_DA, lyDoKhongApDung } from '../../../server/du-lieu/ap-dung'
import { khoaNhapLyDo, useApDung, useGhiApDung } from '../../app/du-lieu/ap-dung'
import { docNhapTam, luuNhapTam } from '../../app/nhap-tam'
import HopThoai from '../../components/HopThoai'
import Nut from '../../components/Nut'
import TenMuc from '../../components/TenMuc'
import TruongNhap from '../../components/TruongNhap'
import TrangThaiTrong, { SapCo } from '../../components/TrangThaiTrong'
import KhoiBai from '../../components/bai-hoc/KhoiBai'
import {
  BO_DANH_DAU,
  goiYLyDo,
  KE_HOACH_THI_SAP_CO,
  LOI_DOC_AP_DUNG,
  LOI_THIEU_LY_DO,
  MO_TA_KHONG_AP_DUNG,
  MO_TA_SAP_CO,
  NHAN_LY_DO,
  NUT_LUU,
  TIEU_DE_KHONG_AP_DUNG,
} from '../../copy/cho-duyet'

const LOP_CHU_O_APP = 'text-[length:var(--fs-ui)] leading-[var(--lh-ui)]'

/** Ô C38 "Có ở phase n" trong khối do app tạo, nằm trong card của khối (không vẽ khung riêng). */
function SapCoTrongKhoi({ phase, moTa }: { phase: string; moTa: string }) {
  return <SapCo phase={phase} moTa={moTa} className={LOP_CHU_O_APP} />
}

interface PropsHopThoaiKhongApDung {
  mo: boolean
  doiMo: (mo: boolean) => void
  muc: MucHoc
  /** Lý do đã bỏ khoảng trắng hai đầu, có chữ */
  khiLuu: (lyDo: string) => void
}

/**
 * Dialog C32 ghi lý do Không áp dụng (§1 "ghi lý do"): ô C36 bắt buộc, Enter = Lưu (TruongNhap bỏ qua Enter khi
 * Telex/VNI đang ghép chữ), Esc / Huỷ đóng. Chữ đang gõ giữ trong bản tạm (nhap-tam) tới khi máy chủ lưu xong.
 * Mỗi lần mở là một lần gắn mới (key ở nơi dùng): ô bắt đầu từ bản tạm, không có thì trống.
 */
function HopThoaiKhongApDung({ mo, doiMo, muc, khiLuu }: PropsHopThoaiKhongApDung) {
  const khoa = khoaNhapLyDo(muc.id)
  const [chu, datChu] = useState(() => docNhapTam(khoa) ?? '')
  const [loi, datLoi] = useState<string | null>(null)
  const refO = useRef<HTMLInputElement>(null)

  function luu() {
    const lyDo = chu.trim()
    if (lyDo === '') {
      datLoi(LOI_THIEU_LY_DO)
      refO.current?.focus()
      return
    }
    khiLuu(lyDo)
  }

  return (
    <HopThoai
      mo={mo}
      doiMo={doiMo}
      tieuDe={TIEU_DE_KHONG_AP_DUNG}
      phuDe={
        <>
          <TenMuc>{muc.label}</TenMuc> · {TEN_LOAI[muc.mau]}
        </>
      }
      moTa={MO_TA_KHONG_AP_DUNG}
      focusDau={refO}
      chan={
        <>
          <Nut bien="ghost" onClick={() => doiMo(false)}>
            Huỷ
          </Nut>
          <Nut bien="chinh" onClick={luu}>
            {NUT_LUU}
          </Nut>
        </>
      }
    >
      <TruongNhap
        ref={refO}
        nhan={NHAN_LY_DO}
        goiY={goiYLyDo(LY_DO_AP_DUNG_TOI_DA)}
        loi={loi}
        value={chu}
        required
        maxLength={LY_DO_AP_DUNG_TOI_DA}
        autoComplete="off"
        onChange={(e) => {
          const moi = e.target.value
          datChu(moi)
          luuNhapTam(khoa, moi)
          if (loi && moi.trim() !== '') datLoi(null)
        }}
        khiEnter={luu}
      />
    </HopThoai>
  )
}

/**
 * Khối "Kế hoạch thi của tôi" (Chứng chỉ). Kế hoạch thi (ngày thi, đếm ngược) có ở phase 11; trước đó ô C38 kèm
 * nút "Không áp dụng" (đề xuất 3.2). Nút hành động là CÙNG một phần tử ở cả hai trạng thái (vị trí cố định sau
 * ô C38) nên focus không mất: lưu xong dialog trả focus về nút, lúc đó đã thành "Bỏ đánh dấu"; bỏ đánh dấu thì
 * nút thành "Không áp dụng".
 */
function KhoiKeHoachThi({ khoi, muc }: { khoi: KhoiMau; muc: MucHoc }) {
  const apDung = useApDung()
  const ghi = useGhiApDung()
  const [mo, datMo] = useState(false)
  const [lanMo, datLanMo] = useState(0)
  const lyDo = lyDoKhongApDung(apDung.cua(muc.id)) ?? null
  const coTheGhi = apDung.anhChup !== undefined

  function moHopThoai(e: MouseEvent<HTMLButtonElement>) {
    // Safari không focus nút khi bấm chuột: focus trước để dialog nhớ đúng nút mà trả focus về khi đóng.
    e.currentTarget.focus()
    datLanMo((n) => n + 1)
    datMo(true)
  }

  return (
    <KhoiBai id={khoi.id} tieuDe={khoi.tieuDe} card>
      <div
        className="flex flex-col items-start gap-3"
        data-ap-dung={lyDo === null ? 'chua' : 'khong-ap-dung'}
      >
        {lyDo === null ? (
          <SapCo phase="11" moTa={KE_HOACH_THI_SAP_CO} className={LOP_CHU_O_APP} />
        ) : (
          <TrangThaiTrong
            icon={Minus}
            cauChinh={<strong className="font-semibold">Không áp dụng</strong>}
            // Lý do dài liền một mạch (tối đa 500 ký tự) vẫn xuống dòng, không đẩy trang cuộn ngang.
            moTa={<span className="[overflow-wrap:anywhere]">{`Lý do: "${lyDo}"`}</span>}
            className={LOP_CHU_O_APP}
          />
        )}
        <Nut
          bien="phu"
          disabled={!coTheGhi}
          onClick={lyDo === null ? moHopThoai : () => ghi.boDanhDau(muc.id)}
        >
          {lyDo === null ? 'Không áp dụng' : BO_DANH_DAU}
        </Nut>
        {apDung.loi && (
          <p className="m-0 flex flex-wrap items-center gap-1.5 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-danger">
            <CircleAlert size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            {LOI_DOC_AP_DUNG} —
            <button
              type="button"
              onClick={apDung.taiLai}
              className="cursor-pointer rounded-[var(--radius-sm)] text-danger underline hover:decoration-2 max-md:inline-flex max-md:min-h-[var(--h-control-touch)] max-md:items-center"
            >
              Thử lại
            </button>
          </p>
        )}
      </div>
      <HopThoaiKhongApDung
        key={lanMo}
        mo={mo}
        doiMo={datMo}
        muc={muc}
        khiLuu={(lyDoMoi) => {
          ghi.khongApDung(muc.id, lyDoMoi, { treToast: true })
          datMo(false)
        }}
      />
    </KhoiBai>
  )
}

/** Một khối do app tạo chứa việc của người học; kiểu khác (Mục liên quan, P2) → null. */
export default function KhoiApp({ khoi, muc }: { khoi: KhoiMau; muc: MucHoc }) {
  switch (khoi.kieu) {
    case 'noi-lai':
      return (
        <KhoiBai id={khoi.id} tieuDe={khoi.tieuDe} coTieuDe="nho" card>
          <SapCoTrongKhoi phase="3" moTa="1–3 câu. Viết xong thì bước Hiểu được đánh dấu." />
        </KhoiBai>
      )
    case 'ban-cua-toi':
      return (
        <KhoiBai
          id={khoi.id}
          tieuDe={khoi.tieuDe}
          phu={`Bước ${TEN_BUOC['ap-dung']} · cần ít nhất 1 bản Hoàn thành`}
          card
        >
          <SapCoTrongKhoi phase="7c" moTa={MO_TA_SAP_CO.banCuaToi} />
        </KhoiBai>
      )
    case 'ke-hoach-thi':
      return <KhoiKeHoachThi khoi={khoi} muc={muc} />
    default:
      return null
  }
}
