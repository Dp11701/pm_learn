// Thân bài có nội dung (F11, F12, F15; đề xuất 1.5, 3.6): chữ trước khối ## đầu tiên, rồi từng ô của bố cục
// (bo-cuc.ts) theo thứ tự mẫu, các khối cách 40 (mobile 24).
// - Khối theo quy ước (cauTruc.hopLe): Khái niệm cốt lõi → danh sách định nghĩa; Góc dev lead → PM → callout 2
//   cột C19; Thực hành → C20 chỉ đọc; Tự kiểm tra → C21 chỉ đọc; Mẫu điền sẵn → C17 cơ bản. Viết khác quy ước
//   (hopLe = false) và mọi khối khác → Markdown thường (đã làm sạch). Tóm tắt là card (F11).
// - Khối ★ chưa có chữ → ô "Chưa có …" + "Thêm"; khối do app tạo → C38 "Có ở phase n" (Nói lại 3, Bản của tôi
//   7c, Kế hoạch thi 11); Mục liên quan → danh sách từ lien_quan.
// - Kế hoạch thi (Chứng chỉ, đề xuất 3.2): C38 "Có ở phase 11" kèm nút phụ "Không áp dụng" → dialog C32 ghi lý
//   do bắt buộc (C36, Enter lưu, bỏ qua khi đang ghép chữ) → khối hiện "Không áp dụng" + lý do và "Bỏ đánh dấu";
//   chứng chỉ nhờ đó xong được bước Áp dụng ngay ở P0. "Không áp dụng" của Bản của tôi có ở phase 3.
import { useRef, useState, type MouseEvent } from 'react'
import { CircleAlert, Minus } from 'lucide-react'
import type { KetQuaBai } from '../../../shared/noi-dung'
import { TEN_BUOC, TEN_LOAI } from '../../../shared/domain/trang-thai'
import type { Cay, MucHoc } from '../../../shared/roadmap'
import { LY_DO_AP_DUNG_TOI_DA, lyDoKhongApDung } from '../../../server/du-lieu/ap-dung'
import { khoaNhapLyDo, useApDung, useGhiApDung } from '../../app/du-lieu/ap-dung'
import { docNhapTam, luuNhapTam } from '../../app/nhap-tam'
import HopThoai from '../../components/HopThoai'
import Nut from '../../components/Nut'
import TenMuc from '../../components/TenMuc'
import TruongNhap from '../../components/TruongNhap'
import TrangThaiTrong, { SapCo } from '../../components/TrangThaiTrong'
import BangMau from '../../components/bai-hoc/BangMau'
import Callout from '../../components/bai-hoc/Callout'
import KhoiTuKiemTra from '../../components/bai-hoc/CauTuKiemTra'
import DanhSachLienQuan from '../../components/bai-hoc/DanhSachLienQuan'
import DanhSachDinhNghia from '../../components/bai-hoc/DinhNghia'
import KhoiBai, { OKhoiThieu } from '../../components/bai-hoc/KhoiBai'
import MarkdownBai from '../../components/bai-hoc/Markdown'
import TheThucHanh from '../../components/bai-hoc/TheThucHanh'
import { duongDanSoan } from '../../components/bai-hoc/dinh-vi'
import type { TraTrangThai } from '../../components/bai-hoc/kieu'
import type { OHien } from './bo-cuc'
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

type OApp = Extract<OHien, { loai: 'app' }>

interface PropsOKhoiApp {
  o: OApp
  muc: MucHoc
  cay: Cay
  trangThaiCua: TraTrangThai
  lienQuan: readonly MucHoc[]
}

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
function KhoiKeHoachThi({ o, muc }: { o: OApp; muc: MucHoc }) {
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
    <KhoiBai id={o.id} tieuDe={o.ten} card>
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

function OKhoiApp({ o, muc, cay, trangThaiCua, lienQuan }: PropsOKhoiApp) {
  switch (o.mau.kieu) {
    case 'noi-lai':
      return (
        <KhoiBai id={o.id} tieuDe={o.ten} coTieuDe="nho" card>
          <SapCoTrongKhoi phase="3" moTa="1–3 câu. Viết xong thì bước Hiểu được đánh dấu." />
        </KhoiBai>
      )
    case 'ban-cua-toi':
      return (
        <KhoiBai
          id={o.id}
          tieuDe={o.ten}
          phu={`Bước ${TEN_BUOC['ap-dung']} · cần ít nhất 1 bản Hoàn thành`}
          card
        >
          <SapCoTrongKhoi phase="7c" moTa={MO_TA_SAP_CO.banCuaToi} />
        </KhoiBai>
      )
    case 'ke-hoach-thi':
      return <KhoiKeHoachThi o={o} muc={muc} />
    case 'muc-lien-quan':
      return (
        <KhoiBai id={o.id} tieuDe={o.ten}>
          <DanhSachLienQuan cacMuc={lienQuan} cay={cay} trangThaiCua={trangThaiCua} />
        </KhoiBai>
      )
    default:
      return null
  }
}

function OKhoi({ o, muc }: { o: Extract<OHien, { loai: 'khoi' }>; muc: MucHoc }) {
  const { khoi, ten, id } = o
  const ct = khoi.cauTruc
  const md = (chu: string) => (
    <MarkdownBai muc={muc} tenKhoi={ten}>
      {chu}
    </MarkdownBai>
  )
  if (ct?.hopLe) {
    switch (ct.kieu) {
      case 'dinh-nghia':
        return (
          <KhoiBai id={id} tieuDe={ten}>
            <DanhSachDinhNghia dinhNghia={ct.dinhNghia} muc={muc} tenKhoi={ten} />
          </KhoiBai>
        )
      case 'goc-dev-lead':
        return (
          <KhoiBai id={id} tieuDe={ten}>
            <Callout mucCon={ct.mucCon} muc={muc} tenKhoi={ten} />
          </KhoiBai>
        )
      case 'thuc-hanh':
        return (
          <TheThucHanh id={id} tieuDe={ten} mucCon={ct.mucCon} muc={muc} tinhTrang="chưa làm" />
        )
      case 'tu-kiem-tra':
        return <KhoiTuKiemTra id={id} tieuDe={ten} cauHoi={ct.cauHoi} muc={muc} />
      case 'mau-dien-san':
        if (!ct.bang) break
        return (
          <KhoiBai id={id} tieuDe={ten}>
            {ct.truoc && md(ct.truoc.noiDung)}
            <BangMau bang={ct.bang} muc={muc} tenKhoi={ten} />
            {ct.sau && md(ct.sau.noiDung)}
          </KhoiBai>
        )
      default:
        break
    }
  }
  return (
    <KhoiBai id={id} tieuDe={ten} card={o.mau?.id === 'tom-tat'}>
      {md(khoi.noiDung)}
    </KhoiBai>
  )
}

export interface PropsThanBai {
  muc: MucHoc
  cay: Cay
  bai: KetQuaBai
  cacO: readonly OHien[]
  lienQuan: readonly MucHoc[]
  trangThaiCua: TraTrangThai
}

export default function ThanBai({ muc, cay, bai, cacO, lienQuan, trangThaiCua }: PropsThanBai) {
  return (
    <>
      {bai.dauBai && (
        <MarkdownBai muc={muc} tenKhoi={muc.label}>
          {bai.dauBai.noiDung}
        </MarkdownBai>
      )}
      {cacO.map((o) => {
        switch (o.loai) {
          case 'thieu':
            return <OKhoiThieu key={o.id} id={o.id} ten={o.ten} den={duongDanSoan(muc)} />
          case 'app':
            return (
              <OKhoiApp
                key={o.id}
                o={o}
                muc={muc}
                cay={cay}
                trangThaiCua={trangThaiCua}
                lienQuan={lienQuan}
              />
            )
          default:
            return <OKhoi key={o.id} o={o} muc={muc} />
        }
      })}
    </>
  )
}
