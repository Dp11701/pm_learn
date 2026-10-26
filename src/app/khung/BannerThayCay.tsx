// Banner một lần sau khi thay file cây (đề xuất 1.3 bước 4): C26 thông tin "Cây roadmap vừa cập nhật: +a mục,
// −b mục, c mục đổi tên" ở đầu <main> của khung app, mọi trang, tới khi bạn bấm đóng (X) → POST
// /api/noi-dung/thay-cay/da-xem rồi hỏi lại /api/meta. Ẩn ngay khi bấm; gửi lỗi thì hiện lại + toast lỗi.
// Đóng bằng bàn phím: focus về H1 / <main> trước khi banner gỡ khỏi DOM (không rơi về <body>).
import { useRef, useState } from 'react'
import { dinhDangSo } from '../../../shared/dinh-dang'
import Banner from '../../components/Banner'
import { useToast } from '../../components/Toast'
import { LOI_NHAP, LOI_TAT_THAY_CAY } from '../../copy/cho-duyet'
import { cauLoi, useNoiDungMeta } from '../du-lieu/nhap'
import { guiDaXemThayCay } from '../du-lieu/thay-cay'
import { useKetNoi, type BannerThayCay as DuLieuBanner } from '../ket-noi'
import { focusDauTrang } from './focus'
import { LE_NGANG_TRANG } from './le-trang'

/** Câu nguyên văn đề xuất 1.3: "Cây roadmap vừa cập nhật: +a mục, −b mục, c mục đổi tên". */
export function cauThayCay({ them, bo, doiTen }: Pick<DuLieuBanner, 'them' | 'bo' | 'doiTen'>) {
  return `Cây roadmap vừa cập nhật: +${dinhDangSo(them)} mục, −${dinhDangSo(bo)} mục, ${dinhDangSo(doiTen)} mục đổi tên`
}

export default function BannerThayCay() {
  const thayCay = useNoiDungMeta()?.thayCay ?? null
  // Phần có banner tách riêng: không có banner thì khung không cần ToastProvider (test khung, gallery).
  return thayCay ? <BannerCo thayCay={thayCay} /> : null
}

function BannerCo({ thayCay }: { thayCay: DuLieuBanner }) {
  const { thuNgay } = useKetNoi()
  const { toast } = useToast()
  /** `luc` của banner vừa bấm đóng (ẩn ngay, không chờ /api/meta). */
  const [daDong, datDaDong] = useState<string | null>(null)
  const vungRef = useRef<HTMLDivElement>(null)

  if (daDong === thayCay.luc) return null

  async function dong(luc: string) {
    if (vungRef.current?.contains(document.activeElement)) focusDauTrang()
    datDaDong(luc)
    try {
      await guiDaXemThayCay()
      void thuNgay()
    } catch (e) {
      datDaDong(null)
      toast({ loai: 'loi', noiDung: `${LOI_TAT_THAY_CAY}: ${cauLoi(e, LOI_NHAP.matKetNoi)}` })
    }
  }

  return (
    <div ref={vungRef} data-banner-thay-cay="" className={`${LE_NGANG_TRANG} pt-6 max-md:pt-4`}>
      <Banner tieuDe={cauThayCay(thayCay)} khiDong={() => void dong(thayCay.luc)} />
    </div>
  )
}
