// F02 Component phần 1 (docs/design-handoff/design/F02-sang.dc.html, bản Tối F02-toi) dựng bằng component
// thật: C4–C8, C10, C11, C26, C35, C36. C1 (nút bản đồ) chưa dựng → hàng "Có ở phase 6".
// Hover / focus của các ô mẫu được ép bằng <Gia> (gia-trang-thai.tsx); mọi component vẫn bấm, gõ được.
// Chữ mẫu (tên mục, số liệu, ngày) nhận qua prop `mau` từ fixtures/mau/thanh-phan.ts.
import { useState } from 'react'
import { TEN_GIAO_DIEN, useGiaoDienHieuLuc } from '../../app/giao-dien'
import { useMoBangPhimTat } from '../../app/phim-tat'
import Banner from '../../components/Banner'
import Nut from '../../components/Nut'
import TenMuc from '../../components/TenMuc'
import TruongNhap, { TruongChon, TruongNgay, TruongVanBan } from '../../components/TruongNhap'
import TuLuu from '../../components/TuLuu'
import Badge from '../../components/trang-thai/Badge'
import ChipLoai, { type LoaiChip } from '../../components/trang-thai/ChipLoai'
import ChipNoiDung from '../../components/trang-thai/ChipNoiDung'
import PillTrangThai, {
  CoCanOnLai,
  NutPillTrangThai,
} from '../../components/trang-thai/PillTrangThai'
import SegmentedTrangThai from '../../components/trang-thai/SegmentedTrangThai'
import ThanhBonBuoc, {
  BonBuocMini,
  type TinhTrangBonBuoc,
} from '../../components/trang-thai/ThanhBonBuoc'
import {
  ChuGiaiTienDo,
  DongTienDo,
  ThanhNoiDung,
  TienDoDangTai,
  TienDoLoi,
  VongTienDo,
  chuNoiDung,
  type SoNoiDung,
  type SoTienDo,
} from '../../components/trang-thai/TienDo'
import type { TrangThaiHien } from '../../components/trang-thai/mau-trang-thai'
import { homNay } from '../../../shared/clock'
import { LOI_NGAY, dinhDangSo } from '../../../shared/dinh-dang'
import { soNgayGiua } from '../../../shared/lich'
import {
  TEN_LOAI,
  TEN_TRANG_THAI_HOC,
  type Buoc,
  type TrangThaiHoc,
} from '../../../shared/domain/trang-thai'
import { ChoPhase, DauMuc, DauTrang, GHI_CHU, META, O, THE, khongLamGi, timMuc } from './chung'
import { Gia } from './gia-trang-thai'

/** Chữ mẫu F02 cần (fixtures/mau/thanh-phan.ts). */
export type MauF02 = {
  /** Lý do Bỏ qua mẫu (C6 "Bỏ qua kèm lý do"). */
  lyDoBoQua: string
  /** C7: số thẻ đến hạn của cờ Cần ôn lại, badge Ôn tập (đặc) / Nội dung (viền), streak. */
  soTheCanOn: number
  badge: { onTap: number; noiDung: number; vuotMuc: number }
  streak: { ngay: number; kyLuc: number }
  /** C8: tên mục cho chip "Chưa có nội dung" (link tới trang Soạn bài của mục). */
  mucSoan: string
  /** C8: ngày duyệt 'YYYY-MM-DD'. */
  ngayDuyet: string
  /** C8: câu lỗi đọc file. */
  loiFile: string
  /** C11: tiến độ cả roadmap (tổng = số mục học của bộ mẫu). */
  tienDo: SoTienDo
  theoVung: (SoTienDo & { ten: string })[]
  noiDung: SoNoiDung
  /** C36: tên dự án thực hành, chữ gợi ý, ngày thi 'YYYY-MM-DD', ngày sai đang gõ, giờ tự lưu (ISO). */
  duAn: string
  goiYDuAn: string
  ngayThi: string
  ngaySai: string
  luuLuc: string
}

const CAC_LOAI_CHIP: readonly LoaiChip[] = ['linh-vuc', 'chu-de', 'tai-lieu', 'chung-chi', 'nhom']
const CAC_PILL: readonly TrangThaiHien[] = [
  'chua-hoc',
  'dang-hoc',
  'da-xong',
  'bo-qua',
  'can-on-lai',
]

const BON_BUOC: TinhTrangBonBuoc = {
  hieu: 'xong',
  'ap-dung': 'dang-lam',
  'kiem-tra': 'chua-lam',
  'ghi-nho': 'xong',
}
const BON_BUOC_VO_HIEU: TinhTrangBonBuoc = {
  hieu: 'xong',
  'ap-dung': 'khong-ap-dung',
  'kiem-tra': 'chua-lam',
  'ghi-nho': 'chua-lam',
}
const CHUA_LAM: TinhTrangBonBuoc = {
  hieu: 'chua-lam',
  'ap-dung': 'chua-lam',
  'kiem-tra': 'chua-lam',
  'ghi-nho': 'chua-lam',
}
// Neo giả để bước là link (có hover, focus); bấm không cuộn đi đâu.
const NEO_BUOC: Partial<Record<Buoc, string>> = {
  hieu: '#buoc-hieu',
  'ap-dung': '#buoc-ap-dung',
  'kiem-tra': '#buoc-kiem-tra',
  'ghi-nho': '#buoc-ghi-nho',
}

export default function F02({ mau }: { mau: MauF02 }) {
  const hieuLuc = useGiaoDienHieuLuc()
  return (
    <div className="flex flex-col gap-12">
      <DauTrang
        nhan={`F02 · Component phần 1 · ${TEN_GIAO_DIEN[hieuLuc]}`}
        tieuDe="C1 · C4–C8 · C10–C11 · C26 · C35 · C36"
      >
        <p className="m-0 max-w-[880px] text-muted">
          Mỗi component tương tác có đủ: mặc định · hover · focus bàn phím · disabled · lỗi. Focus
          luôn là vòng 2px màu mực, cách mép 2px.
        </p>
        <p className={`${GHI_CHU} max-w-[880px]`}>
          Ô "Hover", "Focus" được vẽ ép (thuộc tính data-gia-*) để đặt cạnh nhau như frame; mọi
          component trên trang là component thật, bấm và gõ được.
        </p>
      </DauTrang>

      <section className="flex flex-col gap-5">
        <DauMuc ma="C1" ten="Nút bản đồ" />
        <p className="m-0 max-w-[880px] text-muted">
          Nút không chứa chữ trạng thái — chữ nằm trong tooltip, aria-label, panel và Chú giải. Icon
          loại chỉ có ở Tài liệu và Chứng chỉ. 200–240 × ≥ 40, chữ 13/600, tối đa 2 dòng.
        </p>
        <ChoPhase
          phase={6}
          moTa="Dựng cùng bản đồ (F06, F06b, F07): ma trận loại × trạng thái, lớp phủ Độ phủ nội dung, nút lĩnh vực."
        />
      </section>

      <div className="grid gap-12 xl:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-4">
          <DauMuc ma="C4" ten="Chip loại" />
          <div className="flex flex-wrap gap-3">
            {CAC_LOAI_CHIP.map((l) => (
              <ChipLoai key={l} loai={l} />
            ))}
          </div>
          <p className={GHI_CHU}>Chip loại chỉ để đọc, không có trạng thái tương tác.</p>
          <div className="flex flex-wrap items-center gap-3">
            {CAC_LOAI_CHIP.map((l) => (
              <ChipLoai key={l} loai={l} chiIcon />
            ))}
            <span className={`${META} text-muted`}>Ô loại 20px · hàng kết quả tìm kiếm (D3)</span>
          </div>

          <DauMuc ma="C5" ten="Status pill" className="mt-4" />
          <div className="flex flex-wrap gap-3">
            {CAC_PILL.map((t) => (
              <PillTrangThai key={t} trangThai={t} />
            ))}
          </div>
          <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 min-[1440px]:grid-cols-5">
            <O nhan="Mặc định">
              <NutPillTrangThai trangThai="dang-hoc" />
            </O>
            <O nhan="Hover · viền 1px">
              <Gia kieu="hover">
                <NutPillTrangThai trangThai="dang-hoc" />
              </Gia>
            </O>
            <O nhan="Focus">
              <Gia kieu="focus">
                <NutPillTrangThai trangThai="dang-hoc" />
              </Gia>
            </O>
            <O nhan="Disabled · đang lưu">
              <NutPillTrangThai trangThai="dang-hoc" dangLuu />
            </O>
            <O nhan="Lỗi lưu — Thử lại" loi>
              <NutPillTrangThai trangThai="dang-hoc" loi />
            </O>
          </div>
        </section>

        <MucSegmented lyDoBoQua={mau.lyDoBoQua} />
      </div>

      <div className="grid gap-12 xl:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-4">
          <DauMuc ma="C7" ten="Cờ, badge" />
          <div className="flex flex-wrap items-center gap-6">
            <CoCanOnLai soThe={mau.soTheCanOn} />
            <span className="inline-flex items-center gap-2">
              Ôn tập
              <Badge
                so={mau.badge.onTap}
                kieu="dac"
                nhan={`${dinhDangSo(mau.badge.onTap)} thẻ đến hạn`}
              />
            </span>
            <span className="inline-flex items-center gap-2">
              Nội dung
              <Badge
                so={mau.badge.noiDung}
                kieu="vien"
                nhan={`${dinhDangSo(mau.badge.noiDung)} bản nháp`}
              />
            </span>
            <span className={`${META} text-muted tabular-nums`}>
              Streak {dinhDangSo(mau.streak.ngay)} ngày · kỷ lục {dinhDangSo(mau.streak.kyLuc)}
            </span>
          </div>
          <p className={GHI_CHU}>
            Badge đặc màu mực = việc cần làm hôm nay (thẻ đến hạn). Badge viền = số đếm thông tin.
            Streak chỉ là một dòng chữ.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <O nhan="Quá 99 · 99+">
              <Badge so={mau.badge.vuotMuc} kieu="dac" />
            </O>
            <O nhan="Bản nhỏ 16px · rail">
              <span className="inline-flex gap-2">
                <Badge so={mau.badge.onTap} kieu="dac" nho />
                <Badge so={mau.badge.noiDung} kieu="vien" nho />
              </span>
            </O>
          </div>

          <DauMuc ma="C8" ten="Chip nội dung" className="mt-4" />
          <MucChipNoiDung mau={mau} />
        </section>

        <MucBonBuoc />
      </div>

      <section className="flex flex-col gap-4">
        <DauMuc ma="C11" ten="Tiến độ — luôn có phân số và số bỏ qua" />
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className={`${THE} flex flex-wrap items-center gap-6 p-5`}>
            <VongTienDo {...mau.tienDo} />
            <ChuGiaiTienDo {...mau.tienDo} />
          </div>
          <div className={`${THE} flex min-w-0 flex-col gap-4 p-5`}>
            {mau.theoVung.map(({ ten, ...s }) => (
              <DongTienDo key={ten} ten={<TenMuc>{ten}</TenMuc>} {...s} />
            ))}
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap justify-between gap-x-3">
                <span>Độ phủ nội dung</span>
                <span className={`${META} text-muted tabular-nums`}>{chuNoiDung(mau.noiDung)}</span>
              </div>
              <ThanhNoiDung {...mau.noiDung} />
            </div>
            <p className={`${GHI_CHU} border-t border-border pt-3`}>
              Độ sâu (bài thực hành, tài liệu, tỉ lệ nhớ) · Có ở phase 5
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <TienDoDangTai />
              <TienDoLoi thuLai={khongLamGi} />
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <DauMuc ma="C26" ten="Banner" />
        <div className="grid gap-4 md:grid-cols-2">
          <Banner
            tieuDe="Bản nháp do AI soạn — chưa được bạn duyệt, có thể sai."
            moTa="Soát từng khối rồi bấm Duyệt bài."
            hanhDong={<Nut bien="phu">Vào chế độ duyệt</Nut>}
          />
          <Banner
            tieuDe="Lộ trình gợi ý: Đề xuất — chờ bạn duyệt"
            moTa="Trước/Tiếp vẫn theo thứ tự cây cho tới khi bạn duyệt."
            hanhDong={
              <Gia kieu="focus">
                <Nut bien="phu">Xem đề xuất</Nut>
              </Gia>
            }
          />
          <Banner
            loai="loi"
            tieuDe="Mất kết nối với máy chủ cục bộ."
            moTa="Tự thử lại sau 5 giây… Nội dung đang gõ được giữ nguyên."
            hanhDong={<Nut bien="phu">Thử ngay</Nut>}
          />
          <Banner
            voHieu
            tieuDe="Có thay đổi chưa duyệt"
            moTa="Disabled · đang mở bản sửa ở tab khác."
            hanhDong={
              <Nut bien="phu" disabled>
                Mở bản sửa
              </Nut>
            }
          />
        </div>
        <p className={GHI_CHU}>
          Nền surface-2, viền 1px border-input, icon info 20px + tiêu đề đậm. Không vạch trái. Biến
          thể lỗi đổi icon và tiêu đề sang danger. Nút thứ 2 đang ở trạng thái focus.
        </p>
      </section>

      <div className="grid gap-12 min-[1440px]:grid-cols-2">
        <MucNut />
        <MucTruongNhap mau={mau} />
      </div>
    </div>
  )
}

function MucSegmented({ lyDoBoQua }: { lyDoBoQua: string }) {
  const [giaTri, datGiaTri] = useState<TrangThaiHoc>('dang-hoc')
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <DauMuc ma="C6" ten="Segmented trạng thái" />
      <Gia
        kieu={[
          { kieu: 'hover', chon: '[data-trang-thai="da-xong"]' },
          { kieu: 'focus', chon: '[data-trang-thai="bo-qua"]' },
        ]}
      >
        <SegmentedTrangThai giaTri={giaTri} khiDoi={datGiaTri} goiYPhim />
      </Gia>
      <p className={GHI_CHU}>
        Đang chọn: {TEN_TRANG_THAI_HOC[giaTri]} (nền pill + viền 1,5px màu trạng thái). Hover: Đã
        xong (nền surface-2). Focus: Bỏ qua.
      </p>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <O nhan="Disabled · đang tải dữ liệu">
          <SegmentedTrangThai
            giaTri="dang-hoc"
            khiDoi={khongLamGi}
            voHieu
            nhan="Trạng thái học (đang tải)"
          />
        </O>
        <SegmentedTrangThai
          giaTri="dang-hoc"
          khiDoi={khongLamGi}
          loi
          thuLai={khongLamGi}
          nhan="Trạng thái học (lỗi lưu)"
        />
      </div>
      <div className={`${THE} flex flex-col items-start gap-2 px-4 py-3`}>
        <span className={`${META} font-semibold`}>Bỏ qua kèm lý do (tuỳ chọn)</span>
        <PillTrangThai trangThai="bo-qua" phu={lyDoBoQua} />
      </div>
    </section>
  )
}

function MucChipNoiDung({ mau }: { mau: MauF02 }) {
  const muc = timMuc(mau.mucSoan)
  const soan = muc ? `/hoc/${muc.slug}/soan` : undefined
  const bai = muc ? `/hoc/${muc.slug}` : undefined
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      <O nhan="Mặc định">
        <ChipNoiDung trangThai={{ loai: 'chua-co' }} den={soan} />
      </O>
      <O nhan="Hover · mở Soạn bài">
        <Gia kieu="hover">
          <ChipNoiDung trangThai={{ loai: 'chua-co' }} den={soan} />
        </Gia>
      </O>
      <O nhan="Focus">
        <Gia kieu="focus">
          <ChipNoiDung trangThai={{ loai: 'ban-nhap', nguon: 'ai' }} den={bai} />
        </Gia>
      </O>
      <O nhan="Disabled · chỉ đọc">
        <ChipNoiDung trangThai={{ loai: 'ban-nhap', nguon: 'tu-viet' }} den={bai} voHieu />
      </O>
      <O nhan="Đã duyệt">
        <ChipNoiDung trangThai={{ loai: 'da-duyet', ngayDuyet: mau.ngayDuyet }} />
      </O>
      <O nhan="Lỗi đọc file">
        <ChipNoiDung trangThai={{ loai: 'ban-nhap', nguon: 'ai' }} loi={mau.loiFile} />
      </O>
      <O nhan="Đã duyệt · có bản sửa chưa duyệt (chấm)" className="sm:col-span-2">
        <ChipNoiDung trangThai={{ loai: 'da-duyet', ngayDuyet: mau.ngayDuyet, coBanSua: true }} />
      </O>
    </div>
  )
}

function MucBonBuoc() {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <DauMuc ma="C10" ten="Thanh 4 bước" />
      <Gia
        kieu={[
          { kieu: 'hover', chon: '[data-buoc="kiem-tra"] a' },
          { kieu: 'focus', chon: '[data-buoc="ghi-nho"] a' },
        ]}
      >
        {/* Như frame: bước Đang làm chỉ có tên (ghi chú mặc định "đang làm" bị cắt ở cột ~150px) */}
        <ThanhBonBuoc
          tinhTrang={BON_BUOC}
          lienKet={NEO_BUOC}
          ghiChu={{ 'ap-dung': '' }}
          khiChon={(_b, e) => e.preventDefault()}
        />
      </Gia>
      <p className={GHI_CHU}>
        Xong = check trên nền mực · Đang làm = vòng có chấm + viền mực · Chưa làm = vòng rỗng.
        Hover: Kiểm tra (surface-2). Focus: Ghi nhớ. Click cuộn tới khối tương ứng. Bước dùng màu
        mực, không dùng xanh lá của "Đã xong" để khỏi lẫn kênh.
      </p>
      <O
        nhan="Kiểm tra · disabled (chưa có câu hỏi) · Áp dụng · Không áp dụng (xếp 2 cột cho đủ chữ)"
        className="w-full"
      >
        <ThanhBonBuoc
          tinhTrang={BON_BUOC_VO_HIEU}
          voHieu={['kiem-tra']}
          ghiChu={{ 'kiem-tra': 'chưa có câu hỏi' }}
          className="w-full md:[&_ol]:grid-cols-2"
        />
      </O>
      <ThanhBonBuoc tinhTrang={BON_BUOC} loi thuLai={khongLamGi} />
      <span className={`${META} mt-2 font-semibold`}>Bản mini (trên thẻ, hàng)</span>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <BonBuocMini tinhTrang={BON_BUOC} />
        <BonBuocMini tinhTrang={CHUA_LAM} />
        <BonBuocMini tinhTrang={BON_BUOC_VO_HIEU} />
      </div>
    </section>
  )
}

function MucNut() {
  const moBangPhimTat = useMoBangPhimTat()
  const hang: { ten: string; bien: 'chinh' | 'phu' | 'ghost' | 'nguy-hiem'; chu: string }[] = [
    { ten: 'Chính', bien: 'chinh', chu: 'Ôn ngay' },
    { ten: 'Phụ', bien: 'phu', chu: 'Soạn bài' },
    { ten: 'Ghost', bien: 'ghost', chu: 'Hoàn tác' },
    { ten: 'Nguy hiểm', bien: 'nguy-hiem', chu: 'Xoá ghi chú' },
  ]
  const cot = 'text-[length:var(--fs-chip)] leading-[var(--lh-chip)] text-muted'
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <DauMuc ma="C35" ten="Nút" />
      <div className={`${THE} overflow-x-auto p-5`}>
        <div className="grid min-w-[560px] grid-cols-[96px_repeat(4,minmax(0,1fr))] items-center gap-3">
          <span />
          <span className={cot}>Mặc định</span>
          <span className={cot}>Hover</span>
          <span className={cot}>Focus</span>
          <span className={cot}>Disabled</span>
          {hang.map((h) => (
            <HangNut key={h.bien} {...h} />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Nut
          bien="chinh"
          style={{ height: 'var(--h-control-touch)', paddingInline: 18 }}
          title="Cỡ dưới 768px"
        >
          Mobile 44px
        </Nut>
        <Nut bien="chinh" dangXuLy>
          Đang lưu…
        </Nut>
        <Nut
          chiIcon
          aria-label="Bảng phím tắt"
          className="font-mono font-semibold"
          onClick={moBangPhimTat}
        >
          ?
        </Nut>
        <Nut co="nho">Thử lại</Nut>
      </div>
      <p className={GHI_CHU}>
        Nút không có trạng thái lỗi riêng: lỗi hiện ở toast, trường nhập hoặc banner. Đang xử lý =
        spinner + chữ, vẫn giữ kích thước. Cỡ nhỏ 32 (trong card, toast) cũng lên 44 trên mobile.
      </p>
    </section>
  )
}

function HangNut({
  ten,
  bien,
  chu,
}: {
  ten: string
  bien: 'chinh' | 'phu' | 'ghost' | 'nguy-hiem'
  chu: string
}) {
  return (
    <>
      <span className={`${META} font-semibold`}>{ten}</span>
      <span className="min-w-0">
        <Nut bien={bien}>{chu}</Nut>
      </span>
      <span className="min-w-0">
        <Gia kieu="hover">
          <Nut bien={bien}>{chu}</Nut>
        </Gia>
      </span>
      <span className="min-w-0">
        <Gia kieu="focus">
          <Nut bien={bien}>{chu}</Nut>
        </Gia>
      </span>
      <span className="min-w-0">
        <Nut bien={bien} disabled>
          {chu}
        </Nut>
      </span>
    </>
  )
}

function MucTruongNhap({ mau }: { mau: MauF02 }) {
  const [ngayThi, datNgayThi] = useState<string | null>(mau.ngayThi)
  const conLai = ngayThi ? soNgayGiua(homNay(), ngayThi) : null
  const goiYNgay =
    conLai !== null && conLai > 0 ? `dd/MM/yyyy · còn ${dinhDangSo(conLai)} ngày` : 'dd/MM/yyyy'
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <DauMuc ma="C36" ten="Trường nhập" />
      <div className={`${THE} grid gap-x-6 gap-y-5 p-5 md:grid-cols-2`}>
        <TruongNhap nhan="Tên dự án · mặc định" placeholder={mau.goiYDuAn} />
        <Gia kieu="hover" chon="input">
          <TruongNhap nhan="Tên dự án · hover" defaultValue={mau.duAn} />
        </Gia>
        <Gia kieu="focus" chon="input">
          <TruongNgay
            nhan="Ngày thi · focus"
            giaTri={ngayThi}
            khiDoi={datNgayThi}
            goiY={goiYNgay}
          />
        </Gia>
        <TruongNhap nhan="Loại · disabled (chỉ đọc)" defaultValue={TEN_LOAI['chu-de']} voHieu />
        <TruongNhap
          nhan="Ngày nhập · lỗi"
          defaultValue={mau.ngaySai}
          inputMode="numeric"
          loi={LOI_NGAY}
          className="tabular-nums"
        />
        <TruongChon nhan="Dự án thực hành · select" defaultValue={mau.duAn}>
          <option value={mau.duAn}>{mau.duAn}</option>
        </TruongChon>
        <TruongVanBan
          nhan="Nói lại bằng lời của bạn · textarea"
          benPhaiNhan={<TuLuu trangThai="da-luu" luc={mau.luuLuc} />}
          placeholder="Viết 1–3 câu, như đang giải thích cho đồng nghiệp."
          className="md:col-span-2"
        />
      </div>
      <p className={GHI_CHU}>
        Cao 36 (mobile 44), viền border-input 3:1 trở lên. Hover viền màu text. Lỗi: viền danger
        1,5px + icon + câu hướng dẫn, gắn aria-describedby. Ô "Ngày thi" kiểm thật khi rời ô hoặc
        Enter.
      </p>
    </section>
  )
}
