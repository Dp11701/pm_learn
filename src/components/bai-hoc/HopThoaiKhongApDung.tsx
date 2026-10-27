// Dialog C32 ghi lý do "Không áp dụng" của bước Áp dụng (§1 "ghi lý do"; đề xuất 3.2, 4.3) — dùng chung cho thẻ
// Thực hành của mọi mẫu (Chủ đề; Tài liệu ở khối Bản của tôi; Chứng chỉ ở khối Kế hoạch thi của tôi): ô C36 bắt buộc,
// Enter = Lưu (TruongNhap bỏ qua Enter khi Telex/VNI đang ghép chữ), Esc / Huỷ đóng. Chữ đang gõ giữ trong bản tạm
// (nhap-tam) tới khi MÁY CHỦ đã nhận lý do (nơi dùng gọi `daNhan` khi lần ghi thành công, kể cả lần "Thử lại"): lưu
// lỗi thì toast "Thử lại" gửi lại đúng lý do đó, và mở lại dialog vẫn còn chữ đã gõ.
// Mỗi lần mở là một lần gắn mới (key ở nơi dùng): ô bắt đầu từ bản tạm, không có thì trống.
import { useRef, useState } from 'react'
import { Minus } from 'lucide-react'
import { TEN_LOAI } from '../../../shared/domain/trang-thai'
import type { MucHoc } from '../../../shared/roadmap'
import { LY_DO_AP_DUNG_TOI_DA } from '../../../server/du-lieu/ap-dung'
import { docNhapTam, luuNhapTam, xoaNhapTam } from '../../app/nhap-tam'
import HopThoai from '../HopThoai'
import Nut from '../Nut'
import TenMuc from '../TenMuc'
import TrangThaiTrong from '../TrangThaiTrong'
import TruongNhap from '../TruongNhap'
import {
  goiYLyDo,
  LOI_THIEU_LY_DO,
  MO_TA_KHONG_AP_DUNG,
  MO_TA_KHONG_AP_DUNG_THEO_MAU,
  NHAN_LY_DO,
  NUT_LUU,
  TIEU_DE_KHONG_AP_DUNG,
} from '../../copy/cho-duyet'

/** Khoá bản tạm (src/app/nhap-tam.ts) của ô lý do; giữ nguyên khoá của phase 2a để bản tạm cũ vẫn đọc được. */
export const khoaNhapLyDo = (id: string) => `ap-dung-ly-do:${id}`

/**
 * Bước Áp dụng đã đánh dấu Không áp dụng (C20 F02b): "Không áp dụng" + `Lý do: "…"`. Lý do dài liền một mạch
 * (tối đa 500 ký tự) vẫn xuống dòng, không đẩy trang cuộn ngang.
 */
export function OKhongApDung({ lyDo }: { lyDo: string }) {
  return (
    <TrangThaiTrong
      icon={Minus}
      cauChinh={<strong className="font-semibold">Không áp dụng</strong>}
      moTa={<span className="[overflow-wrap:anywhere]">{`Lý do: "${lyDo}"`}</span>}
      className="text-[length:var(--fs-ui)] leading-[var(--lh-ui)]"
    />
  )
}

export interface PropsHopThoaiKhongApDung {
  mo: boolean
  doiMo: (mo: boolean) => void
  muc: MucHoc
  /**
   * Lý do đã bỏ khoảng trắng hai đầu, có chữ. Gọi `daNhan` khi máy chủ đã nhận lý do: lúc đó mới xoá bản tạm của ô
   * (lưu lỗi thì bản tạm còn, mở lại dialog vẫn thấy chữ).
   */
  khiLuu: (lyDo: string, daNhan: () => void) => void
}

export default function HopThoaiKhongApDung({ mo, doiMo, muc, khiLuu }: PropsHopThoaiKhongApDung) {
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
    khiLuu(lyDo, () => {
      // Chỉ xoá khi bản tạm vẫn là lý do vừa gửi: lần mở sau đã gõ chữ khác thì giữ chữ đó
      if ((docNhapTam(khoa) ?? '').trim() === lyDo) xoaNhapTam(khoa)
    })
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
      moTa={muc.mau === 'chung-chi' ? MO_TA_KHONG_AP_DUNG : MO_TA_KHONG_AP_DUNG_THEO_MAU[muc.mau]}
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
