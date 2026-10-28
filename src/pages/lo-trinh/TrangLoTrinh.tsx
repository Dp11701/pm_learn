// /lo-trinh — Lộ trình dạng danh sách (bước 2; §8.3, §6.3, đề xuất 3.3, 3.9; chỉ máy tính, bản đồ đã bỏ):
// - Bộ lọc trong URL (shared/domain/loc-danh-sach.ts): trang-thai, loai, phan, linh-vuc, noi-dung, sap-xep. `xem`
//   được giữ nguyên nhưng không có tác dụng (danh sách là cách xem duy nhất). Đổi bộ lọc thay URL (replace, không
//   cuộn về đầu) và bỏ ?muc=.
// - Sắp theo cây: Phần › Lĩnh vực › Nhóm › Mục, phân số của phần / lĩnh vực / nhóm không phụ thuộc bộ lọc; A–Z,
//   Mở gần đây: danh sách phẳng có breadcrumb nhỏ. "Mở gần đây" chỉ có khi đã có lượt mở bài (/api/luot-mo).
// - "Đang hiển thị x/{soMucHoc} mục" + "Xoá bộ lọc" (tắt khi chưa lọc — aria-disabled để focus không rơi mất).
// - Lọc theo Nội dung mà không tải được trạng thái nội dung: lỗi + "Thử lại" (không để skeleton mãi).
// - ?muc=<slug> (link "Xem trong danh sách" của trang bài): khi danh sách đã dựng, cuộn tới hàng của mục, viền nổi
//   bật và focus link của hàng — một lần cho mỗi lần vào URL. Mục bị bộ lọc ẩn thì báo một dòng. #<slug> (link tới
//   nhóm nằm thẳng trong phần) cuộn tới tiêu đề đó.
// - Hàng loạt: DanhSachChon (ô chọn / Space, "Đặt trạng thái…" chỉ Chưa học / Đang học / Bỏ qua, toast Hoàn tác).
import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { X } from 'lucide-react'
import { dinhDangSo } from '../../../shared/dinh-dang'
import {
  BO_LOC_TRONG,
  dangLoc,
  docUrlDanhSach,
  ghiUrlDanhSach,
  locMuc,
  sapXepMuc,
  type BoLoc,
  type SapXep,
} from '../../../shared/domain/loc-danh-sach'
import { layCay } from '../../../shared/roadmap'
import { coLuotMo } from '../../app/du-lieu/hoc-tiep'
import { useLoiTrangThaiNoiDung, useTrangThaiNoiDung } from '../../app/du-lieu/noi-dung'
import { useTrangThai } from '../../app/du-lieu/trang-thai'
import { useCuonToiNeo } from '../../components/danh-sach/cuon-toi-neo'
import DanhSachChon from '../../components/danh-sach/DanhSachChon'
import { LOP_TAT_ARIA } from '../../components/danh-sach/lop'
import Nut from '../../components/Nut'
import TenMuc from '../../components/TenMuc'
import TieuDeTrang from '../../components/TieuDeTrang'
import { TheCho, TrangThaiLoi, VungDangTai } from '../../components/TrangThaiTrong'
import { LOP_CHU_META } from '../../components/trang-thai/mau-trang-thai'
import {
  KHONG_TAI_DUOC_NOI_DUNG,
  KHONG_TAI_DUOC_TRANG_THAI,
  MUC_BI_AN,
  TEN_DANH_SACH,
} from '../../copy/cho-duyet-lo-trinh'
import { KhungTrang, LOP_H1 } from '../chung'
import BoLocDanhSach from './BoLocDanhSach'

const TEN_TRANG = 'Lộ trình'

/**
 * Mở tới hàng của mục `id` (?muc=) một lần cho mỗi lần vào URL (location.key), khi `sanSang` (danh sách đã dựng có
 * hàng đó). Chạy sau một nhịp: khung app đưa focus về H1 trong effect của nó (chạy sau effect của trang) khi vừa
 * chuyển trang. Đánh dấu "đã mở" trong lần chạy thật (StrictMode huỷ lần đầu bằng cleanup).
 */
function useMoToiMuc(id: string | undefined, sanSang: boolean): void {
  const { key } = useLocation()
  const daMo = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!id || !sanSang) return
    const khoa = `${key}|${id}`
    if (daMo.current === khoa) return
    const hen = window.setTimeout(() => {
      daMo.current = khoa
      const lienKet = [...document.querySelectorAll<HTMLElement>('[data-lien-ket-muc]')].find(
        (el) => el.getAttribute('data-lien-ket-muc') === id,
      )
      if (!lienKet) return
      lienKet.closest('[data-hang-muc]')?.scrollIntoView?.({ block: 'center' })
      lienKet.focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(hen)
  }, [id, sanSang, key])
}

export default function TrangLoTrinh() {
  const cay = layCay()
  const [params, datParams] = useSearchParams()
  const url = useMemo(() => docUrlDanhSach(params, cay), [params, cay])
  const { anhChup, dangTai, loi, taiLai, trangThaiCua, canOnLaiCua } = useTrangThai()
  const noiDungCua = useTrangThaiNoiDung()
  const loiNoiDung = useLoiTrangThaiNoiDung()

  const coMoGanDay = coLuotMo(cay, anhChup)
  // URL hỏi "Mở gần đây" khi chưa có lượt mở nào: sắp theo cây (không có lựa chọn đó trong ô sắp xếp).
  const sapXep: SapXep = url.sapXep === 'mo-gan-day' && !coMoGanDay ? 'cay' : url.sapXep
  const luotMo = anhChup?.luotMo
  const cacMuc = useMemo(
    () =>
      sapXepMuc(
        locMuc(cay, url.boLoc, {
          trangThai: trangThaiCua,
          canOnLai: canOnLaiCua,
          noiDung: noiDungCua,
        }),
        sapXep,
        luotMo,
      ),
    [cay, url.boLoc, trangThaiCua, canOnLaiCua, noiDungCua, sapXep, luotMo],
  )

  // Lọc theo nội dung khi bảng trạng thái nội dung chưa tải: chờ (không báo 0 mục khớp); tải lỗi thì báo lỗi +
  // "Thử lại" thay cho skeleton.
  const choNoiDung =
    url.boLoc.noiDung.length > 0 &&
    cay.mucHoc.length > 0 &&
    noiDungCua(cay.mucHoc[0].id) === undefined
  const loiLocNoiDung = choNoiDung && loiNoiDung.loi
  const sanSang = !dangTai && !loi && !choNoiDung
  const mucMo = url.muc ? cay.mucTheoSlug.get(url.muc) : undefined
  const mucMoHien = mucMo !== undefined && cacMuc.includes(mucMo)
  useMoToiMuc(mucMo?.id, sanSang && mucMoHien)
  useCuonToiNeo(sanSang)

  const coLoc = dangLoc(url.boLoc)
  const ghiUrl = (boLoc: BoLoc, sx: SapXep) =>
    datParams(ghiUrlDanhSach({ boLoc, sapXep: sx }, params), {
      replace: true,
      preventScrollReset: true,
    })

  return (
    <KhungTrang>
      <TieuDeTrang tenTrang={TEN_TRANG} className={LOP_H1}>
        {TEN_TRANG}
      </TieuDeTrang>
      <BoLocDanhSach
        cay={cay}
        boLoc={url.boLoc}
        sapXep={sapXep}
        coMoGanDay={coMoGanDay}
        khiDoiBoLoc={(boLoc) => ghiUrl(boLoc, url.sapXep)}
        khiDoiSapXep={(sx) => ghiUrl(url.boLoc, sx)}
      />
      <div className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p aria-live="polite" className={`m-0 tabular-nums ${LOP_CHU_META}`}>
          {sanSang && `Đang hiển thị ${dinhDangSo(cacMuc.length)}/${dinhDangSo(cay.soMucHoc)} mục`}
        </p>
        <Nut
          bien="phu"
          co="nho"
          icon={X}
          aria-disabled={!coLoc || undefined}
          className={LOP_TAT_ARIA}
          onClick={() => {
            if (coLoc) ghiUrl(BO_LOC_TRONG, url.sapXep)
          }}
        >
          Xoá bộ lọc
        </Nut>
      </div>
      {sanSang && mucMo && !mucMoHien && (
        <p className={`m-0 ${LOP_CHU_META} text-muted`}>
          <TenMuc>{mucMo.label}</TenMuc> {MUC_BI_AN}
        </p>
      )}
      {loi ? (
        <TrangThaiLoi cauChinh={KHONG_TAI_DUOC_TRANG_THAI} thuLai={taiLai} khung />
      ) : loiLocNoiDung ? (
        <TrangThaiLoi cauChinh={KHONG_TAI_DUOC_NOI_DUNG} thuLai={loiNoiDung.taiLai} khung />
      ) : !sanSang ? (
        <VungDangTai className="flex flex-col gap-4">
          <TheCho cao={56} />
          <TheCho cao={320} />
        </VungDangTai>
      ) : (
        <DanhSachChon
          cay={cay}
          cacMuc={cacMuc}
          kieu={
            sapXep === 'cay'
              ? { loai: 'cay', goc: cay.phan.map((p) => p.id), capDau: 2 }
              : { loai: 'phang' }
          }
          trangThaiCua={trangThaiCua}
          canOnLaiCua={canOnLaiCua}
          noiDungCua={noiDungCua}
          noiBat={mucMo?.id}
          nhan={TEN_DANH_SACH}
        />
      )}
    </KhungTrang>
  )
}
