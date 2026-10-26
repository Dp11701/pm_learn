// F02b Component phần 2 (docs/design-handoff/design/F02b-sang.dc.html, bản Tối F02b-toi) dựng bằng component
// thật đã có ở phase 1: C25 Tự lưu, C28 tìm kiếm tối giản, C32 Dialog / sheet, C33 Toast, C34 Sidebar,
// C38 Empty / error / skeleton. Component chưa dựng là hàng C38 "Có ở phase n" theo đề xuất mục 9.
// Chữ mẫu (tên mục, số liệu) nhận qua prop `mau` từ fixtures/mau/thanh-phan.ts.
import { useRef, useState, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { Keyboard, NotebookPen, Search } from 'lucide-react'
import { TEN_GIAO_DIEN, useGiaoDienHieuLuc } from '../../app/giao-dien'
import { useMoBangPhimTat } from '../../app/phim-tat'
import Sidebar from '../../app/khung/Sidebar'
import { useBeRong } from '../../app/khung/be-rong'
import {
  DU_LIEU_KHUNG_TRONG,
  DuLieuKhungProvider,
  type DuLieuKhung,
} from '../../app/khung/du-lieu-khung'
import HopThoai from '../../components/HopThoai'
import Nut, { NutLink } from '../../components/Nut'
import TenMuc from '../../components/TenMuc'
import { useToast } from '../../components/Toast'
import TrangThaiTrong, { TheCho, TrangThaiLoi, VungDangTai } from '../../components/TrangThaiTrong'
import TuLuu from '../../components/TuLuu'
import { useTimKiem } from '../../components/tim-kiem/TimKiem'
import SegmentedTrangThai from '../../components/trang-thai/SegmentedTrangThai'
import { soBuocXong, type TinhTrangBonBuoc } from '../../components/trang-thai/ThanhBonBuoc'
import { homNay } from '../../../shared/clock'
import { dinhDangNgay, dinhDangSo } from '../../../shared/dinh-dang'
import { TEN_LOAI, type TrangThaiHoc } from '../../../shared/domain/trang-thai'
import { ChoPhase, DauTrang, GHI_CHU, META, khongLamGi, timMuc } from './chung'

/** Chữ mẫu F02b cần (fixtures/mau/thanh-phan.ts). */
export type MauF02b = {
  /** C34: tên các mục Đang học (mở gần nhất trước), tổng số, badge Ôn tập / Nội dung. */
  dangHoc: string[]
  tongDangHoc: number
  soTheDenHan: number
  soBanNhap: number
  /** Tên mục cho dialog, toast, panel mẫu. */
  mucMau: string
  /** C32 alertdialog (F19 phải): tiến độ 4 bước của mục mẫu. */
  bonBuoc: TinhTrangBonBuoc
  /** C25: giờ tự lưu (ISO). */
  luuLuc: string
}

function The({
  ma,
  ten,
  className = '',
  children,
}: {
  ma: string
  ten: string
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={`flex min-w-0 flex-col gap-3.5 rounded-[var(--radius-md)] border border-border bg-surface p-6 max-md:p-4 ${className}`}
    >
      <h2 className="m-0 text-[17px] leading-7 font-semibold">
        <span className={`mr-2 font-mono ${META} font-normal text-muted`}>{ma}</span>
        {ten}
      </h2>
      {children}
    </section>
  )
}

export default function F02b({ mau }: { mau: MauF02b }) {
  const hieuLuc = useGiaoDienHieuLuc()
  const muc = timMuc(mau.mucMau)
  const tenMuc = <TenMuc>{mau.mucMau}</TenMuc>
  return (
    <div className="flex flex-col gap-10">
      <DauTrang
        nhan={`F02 · Component phần 2 · ${TEN_GIAO_DIEN[hieuLuc]}`}
        tieuDe="C2 · C3 · C9 · C12–C25 · C28–C34 · C37 · C38"
      >
        <p className="m-0 max-w-[880px] text-muted">
          Mỗi ô: tên component, các trạng thái cạnh nhau. Focus luôn là vòng 2px màu mực cách 2px.
          Component chưa dựng hiện "Có ở phase n" theo kế hoạch phase, không vẽ giả.
        </p>
      </DauTrang>

      <div className="grid gap-8 lg:grid-cols-2">
        <The ma="C2" ten="Khung nhóm">
          <ChoPhase phase={6} moTa="Dựng cùng bản đồ (F06)." />
        </The>
        <The ma="C3" ten="NodePanel · bottom sheet">
          <ChoPhase phase={6} moTa="Panel phải 380px, bottom sheet trên mobile (F06)." />
        </The>
        <The ma="C9" ten="Hàng cây">
          <ChoPhase phase={3} moTa="Mục lục, Trong lĩnh vực; cây Danh sách F08 ở phase 4." />
        </The>
        <The ma="C12" ten="Breadcrumb">
          <ChoPhase phase="2a" moTa="Đầu bài học, menu ▾ cùng cấp (D10)." />
        </The>
        <The ma="C13 · C14" ten="Dải vị trí · Pager">
          <ChoPhase phase="2a" />
        </The>
        <The ma="C15 · C16" ten="Card · Khối bài">
          <ChoPhase phase="2a" moTa="Khối bài, thẻ mục; card Tổng quan ở phase 5." />
        </The>
        <The ma="C17 · C18" ten="Bảng mẫu · Bảng sửa được">
          <ChoPhase phase="7c" ten="Bảng mẫu" />
          <p className={GHI_CHU}>C18 Bảng sửa được là P2, không dựng.</p>
        </The>
        <The ma="C19 · C20" ten="Callout · Thẻ thực hành">
          <ChoPhase phase="2a" ten="Callout" />
          <ChoPhase phase={3} ten="Thẻ thực hành" />
        </The>
        <The ma="C21" ten="Câu tự kiểm tra">
          <ChoPhase phase={3} />
        </The>
        <The ma="C22" ten="Flashcard · hộp Leitner">
          <ChoPhase phase={8} moTa="Phiên ôn, trang Ôn tập." />
        </The>

        <The ma="C23 · C24 · C25" ten="Đồng hồ · Ghi chú · Tự lưu">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <ChoPhase phase={3} ten="Đồng hồ" />
            <ChoPhase phase={3} ten="Ghi chú" />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <TuLuu trangThai="dang-luu" />
            <TuLuu trangThai="da-luu" luc={mau.luuLuc} />
            <TuLuu trangThai="loi" thuLai={khongLamGi} />
          </div>
          <p className={GHI_CHU}>C25: 12/18, aria-live polite, không tải đè lên ô đang gõ.</p>
        </The>

        <MucTimKiem />

        <The ma="C30" ten="Vùng thả file">
          <ChoPhase phase="2b" moTa="Tab Nhập (F22)." />
        </The>

        <The ma="C31 · C32" ten="Trình soạn · Dialog">
          <ChoPhase phase="7b" ten="Trình soạn" moTa="F20." />
          <MucHopThoai tenMuc={tenMuc} bonBuoc={mau.bonBuoc} />
        </The>

        {/* C34 cao (sidebar thật ~900px): cột phải riêng, cột trái xếp C33, C37, C38 cho đỡ trống */}
        <div className="grid min-w-0 items-start gap-8 lg:col-span-2 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-8">
            <The ma="C33" ten="Toast">
              <MucToast tenMuc={tenMuc} />
            </The>

            <The ma="C37" ten="Biểu đồ · burnup">
              <ChoPhase
                phase={11}
                moTa="Thống kê: burnup có dự báo, heatmap, luôn kèm Xem dạng bảng."
              />
            </The>

            <The ma="C38" ten="Empty · error · skeleton">
              <div className="grid gap-2.5 sm:grid-cols-3">
                <TrangThaiTrong
                  icon={NotebookPen}
                  cauChinh="Chưa có ghi chú"
                  nut={
                    muc ? (
                      <NutLink bien="phu" to={`/hoc/${muc.slug}`}>
                        Mở bài đang học
                      </NutLink>
                    ) : undefined
                  }
                  khung
                />
                <TrangThaiLoi cauChinh="Không tải được card này" thuLai={khongLamGi} khung />
                <VungDangTai>
                  <TheCho cao={140} />
                </VungDangTai>
              </div>
              <p className={GHI_CHU}>
                Icon 40 trong vòng surface-2 + một câu + 1–2 nút. Không khung nét đứt. Skeleton đứng
                yên khi bật giảm chuyển động. Các hàng "Có ở phase n" trên trang này cũng là C38.
              </p>
            </The>
          </div>

          <The ma="C34" ten="Sidebar">
            <MucSidebar mau={mau} />
          </The>
        </div>
      </div>
    </div>
  )
}

function MucTimKiem() {
  const { mo } = useTimKiem()
  return (
    <The ma="C28 · C29" ten="Tìm kiếm · Bộ lọc">
      <div className="flex flex-wrap items-center gap-3">
        <Nut icon={Search} onClick={mo} aria-keyshortcuts="/" aria-haspopup="dialog">
          Tìm mục…
        </Nut>
        <span className={`${META} text-muted`}>
          hoặc phím{' '}
          <kbd className="rounded-[4px] border border-border px-1.5 font-mono text-[length:var(--fs-chip)]">
            /
          </kbd>
        </span>
      </div>
      <p className={GHI_CHU}>
        Phase 1 là bản tối giản: chỉ nhóm "Mục học" (tên, tên gốc, viết tắt), ↑/↓ chọn, Enter mở
        bài, Esc đóng. Nhóm khác và tìm trong bài, ghi chú ở phase 4.
      </p>
      <ChoPhase phase={4} ten="Bộ lọc" moTa='Luôn kèm "Xoá bộ lọc" và "Đang hiển thị".' />
    </The>
  )
}

function MucToast({ tenMuc }: { tenMuc: ReactNode }) {
  const { toast } = useToast()
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Nut
          onClick={() =>
            toast({
              noiDung: <>Đã chuyển {tenMuc} sang Đã xong</>,
              hanhDong: { nhan: 'Hoàn tác', chay: khongLamGi },
            })
          }
        >
          Toast thường
        </Nut>
        <Nut
          onClick={() =>
            toast({
              noiDung: 'Lỗi lưu',
              loai: 'loi',
              hanhDong: { nhan: 'Thử lại', chay: khongLamGi },
            })
          }
        >
          Toast lỗi
        </Nut>
      </div>
      <p className={GHI_CHU}>
        Góc dưới trái, tối đa 2 toast, tự đóng sau 5 giây; rê chuột hoặc focus vào toast thì dừng
        đếm (D23). Mobile nằm trên thanh đáy 64px của trang có thanh đáy.
      </p>
    </>
  )
}

function MucHopThoai({ tenMuc, bonBuoc }: { tenMuc: ReactNode; bonBuoc: TinhTrangBonBuoc }) {
  const [moDuyet, datMoDuyet] = useState(false)
  const [moXong, datMoXong] = useState(false)
  const [moPanel, datMoPanel] = useState(false)
  const [trangThai, datTrangThai] = useState<TrangThaiHoc>('dang-hoc')
  const moBangPhimTat = useMoBangPhimTat()
  const quayLai = useRef<HTMLButtonElement>(null)
  const conThieu = 4 - soBuocXong(bonBuoc)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <HopThoai
          mo={moDuyet}
          doiMo={datMoDuyet}
          nutMo={<Nut>Dialog</Nut>}
          tieuDe="Duyệt bài này?"
          phuDe={tenMuc}
          moTa={`Sẽ thành Đã duyệt · ${dinhDangNgay(homNay())}`}
          chan={
            <>
              <Dialog.Close asChild>
                <Nut bien="ghost">Huỷ</Nut>
              </Dialog.Close>
              <Dialog.Close asChild>
                <Nut bien="chinh">Duyệt</Nut>
              </Dialog.Close>
            </>
          }
        />
        <HopThoai
          mo={moXong}
          doiMo={datMoXong}
          vaiTro="alertdialog"
          nutMo={<Nut>Alertdialog</Nut>}
          tieuDe={<>Đánh dấu {tenMuc} là Đã xong?</>}
          moTa={`Bài còn ${dinhDangSo(conThieu)} bước chưa xong. Bạn vẫn có thể đánh dấu, nhưng tiến độ sẽ không phản ánh đủ những gì bạn đã luyện.`}
          focusDau={quayLai}
          chan={
            <>
              <Dialog.Close asChild>
                <Nut bien="phu">Vẫn đánh dấu Đã xong</Nut>
              </Dialog.Close>
              <Dialog.Close asChild>
                <Nut bien="chinh" ref={quayLai}>
                  Quay lại học tiếp
                </Nut>
              </Dialog.Close>
            </>
          }
        />
        <HopThoai
          mo={moPanel}
          doiMo={datMoPanel}
          dang="phai"
          nutMo={<Nut>Panel phải · sheet</Nut>}
          tieuDe={tenMuc}
          phuDe={TEN_LOAI['chu-de']}
        >
          <SegmentedTrangThai giaTri={trangThai} khiDoi={datTrangThai} goiYPhim />
        </HopThoai>
        <Nut icon={Keyboard} onClick={moBangPhimTat} aria-haspopup="dialog" aria-keyshortcuts="?">
          Bảng phím tắt
        </Nut>
      </div>
      <p className={GHI_CHU}>
        Dialog 520 cách đỉnh 56, bo 14; alertdialog không đóng khi bấm ra ngoài, focus đầu ở "Quay
        lại học tiếp"; panel 360 từ phải, dưới 768px thành bottom sheet. Giữ focus bên trong, Esc
        đóng (trừ khi đang ghép chữ), đóng thì focus về nút mở. Bảng phím tắt F27 mở bằng "?".
      </p>
    </div>
  )
}

function MucSidebar({ mau }: { mau: MauF02b }) {
  const [coDuLieu, datCoDuLieu] = useState(true)
  const hep = useBeRong() === 'hep'
  const duLieu: DuLieuKhung = coDuLieu
    ? {
        soTheDenHan: mau.soTheDenHan,
        soBanNhap: mau.soBanNhap,
        dangHoc: mau.dangHoc.flatMap((ten) => timMuc(ten)?.id ?? []),
        tongDangHoc: mau.tongDangHoc,
      }
    : DU_LIEU_KHUNG_TRONG
  return (
    <div className="flex flex-wrap items-start gap-6">
      {/* Như khung thật: dưới 1024 là bản trong drawer (hàng 44, rộng 312) */}
      <div
        className={`${hep ? 'w-[var(--drawer-w)]' : 'w-[var(--sidebar-w)]'} max-w-full shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface`}
      >
        <DuLieuKhungProvider giaTri={duLieu}>
          <Sidebar mobile={hep} />
        </DuLieuKhungProvider>
      </div>
      <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-3">
        <label className={`flex min-h-9 items-center gap-2 ${META} max-md:min-h-11`}>
          <input
            type="checkbox"
            checked={coDuLieu}
            onChange={(e) => datCoDuLieu(e.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
          Có dữ liệu học mẫu
        </label>
        <ul className={`m-0 flex flex-col gap-2 pl-5 ${META} text-muted`}>
          <li>Badge đặc = thẻ đến hạn, badge viền = số bản nháp; trên hàng đang mở thì đảo màu.</li>
          <li>Khối Đang học: 3 mục mở gần nhất, tên lấy từ cây, "Xem tất cả (n)".</li>
          <li>
            Chân ghim đáy (D4): đồng hồ (có ở phase 3), Giao diện Sáng → Tối → Theo hệ thống (D5),
            "?".
          </li>
          <li>
            Dưới 1024px là bản trong drawer 312px (hàng 44). Rail 72px (1024–1279) và top bar mobile
            xem ở khung app thật.
          </li>
        </ul>
      </div>
    </div>
  )
}
