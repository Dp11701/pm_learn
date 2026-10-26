// Trang bài học /hoc/:slug — phần vẽ (F11 trừ cột phải, F17, F18; §8.5, §8.6, §8.6b, §8.7; đề xuất 3.6, 3.9,
// 4.4). Dữ liệu (bài, trạng thái học, đặt trạng thái) truyền vào từ TrangMucHoc.
// Bố cục F11: lề 24 40 48 (mobile 16), breadcrumb (≥ 1024; dưới đó top bar "‹ cấp cha") · đầu bài · banner ·
// cột đọc ≤ 720 (cột phải 320 — đồng hồ, mục lục, ghi chú, flashcard — có ở phase 3), chữ thân bài 17/28
// (mobile 16/26), các khối cách 40 · chân bài "Đã xong, sang bài tiếp" + pager.
// Phím (§11, sổ src/app/phim-tat): 1–4 đặt trạng thái, [ ] mục trước / sau (bỏ qua mục Bỏ qua).
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { giaiLienQuan } from '../../../shared/noi-dung'
import { CAC_TRANG_THAI_HOC, type TrangThaiHoc } from '../../../shared/domain/trang-thai'
import { chuoiCha, layCay, type MucHoc } from '../../../shared/roadmap'
import { usePhimTat } from '../../app/phim-tat'
import { LE_NGANG_TRANG } from '../../app/khung/le-trang'
import { useThanhTrenMobile } from '../../app/khung/thanh-tren'
import Nut from '../../components/Nut'
import { DongCho, TrangThaiLoi, VungDangTai } from '../../components/TrangThaiTrong'
import Breadcrumb from '../../components/bai-hoc/Breadcrumb'
import Pager from '../../components/bai-hoc/Pager'
import { duongDanNut, truocTiep } from '../../components/bai-hoc/dinh-vi'
import BannerBai from './BannerBai'
import { cacOHien, neoBonBuoc, soCauHoi } from './bo-cuc'
import ChuaCoNoiDung from './ChuaCoNoiDung'
import DauBai from './DauBai'
import type { TaiBai } from './du-lieu-bai'
import type { DatTrangThaiTrang, TrangThaiTrang } from './kieu-trang'
import ThanBai from './ThanBai'
import { KHONG_TAI_DUOC_BAI } from '../../copy/cho-duyet'

export interface PropsTrangBaiHoc {
  muc: MucHoc
  bai: TaiBai
  hoc: TrangThaiTrang
  /** Không có: trạng thái chỉ đọc (ngoài máy chủ) */
  datHoc?: DatTrangThaiTrang
}

/** Skeleton thân bài (F26): ba khối, mỗi khối tên + 3 dòng. */
function ThanBaiDangTai() {
  return (
    <VungDangTai className="flex flex-col gap-10 max-md:gap-6">
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden="true" className="flex flex-col gap-3">
          <DongCho rong="40%" cao={20} />
          <DongCho rong="100%" />
          <DongCho rong="92%" />
          <DongCho rong="70%" />
        </div>
      ))}
    </VungDangTai>
  )
}

const LOP_COT_DOC =
  'flex w-full max-w-[720px] min-w-0 flex-col text-[length:var(--fs-body)] leading-[var(--lh-body)] max-md:text-[length:var(--fs-body-m)] max-md:leading-[var(--lh-body-m)]'

export default function TrangBaiHoc({ muc, bai, hoc, datHoc }: PropsTrangBaiHoc) {
  const cay = layCay()
  const navigate = useNavigate()
  const { trangThaiCua } = hoc
  const { truoc, tiep } = truocTiep(cay, muc, trangThaiCua)

  // Top bar mobile: "‹ cấp cha" (§6.2, D6).
  const cha = chuoiCha(cay, muc.id).at(-1)
  useThanhTrenMobile({
    capCha: cha ? { ten: cha.label, den: duongDanNut(cay, cha), tiengAnh: true } : undefined,
  })

  const coTheDat = Boolean(datHoc) && !hoc.dangTai && !hoc.loi

  /**
   * Nơi DUY NHẤT trang bài đặt trạng thái học của mục đang mở: segmented C6 (qua DauBai), phím 1–4 và
   * "Đã xong, sang bài tiếp" đều đi qua đây; `sau` chạy khi đã đặt (vd. sang bài tiếp).
   * PHASE 3 (F19 phải "Đã xong khi còn thiếu bước"): khi trangThai === 'da-xong' mà 4 bước còn thiếu thì mở
   * dialog xác nhận tại đây — chỉ gọi datHoc.dat và `sau` khi người dùng đồng ý. Phase 2a chưa có dữ liệu bước
   * nên đặt ngay.
   */
  function datTrangThaiBai(trangThai: TrangThaiHoc, sau?: () => void) {
    if (!coTheDat || !datHoc) return
    datHoc.dat(muc.id, trangThai)
    sau?.()
  }
  // DauBai chỉ thấy bản đi qua datTrangThaiBai (loiLuu / thuLai giữ nguyên: Thử lại gửi lại lần đã qua đây).
  const datHocDauBai: DatTrangThaiTrang | undefined = datHoc && {
    ...datHoc,
    dat: (_id, trangThai) => datTrangThaiBai(trangThai),
  }

  // Phím 1–4: Chưa học / Đang học / Đã xong / Bỏ qua; [ ]: mục trước / sau.
  const datTheoPhim = (i: number) => () => datTrangThaiBai(CAC_TRANG_THAI_HOC[i])
  usePhimTat('Digit1', datTheoPhim(0))
  usePhimTat('Digit2', datTheoPhim(1))
  usePhimTat('Digit3', datTheoPhim(2))
  usePhimTat('Digit4', datTheoPhim(3))
  usePhimTat('BracketLeft', () => {
    if (truoc) void navigate(`/hoc/${truoc.slug}`)
  })
  usePhimTat('BracketRight', () => {
    if (tiep) void navigate(`/hoc/${tiep.slug}`)
  })

  const duLieu = bai.tinhTrang === 'xong' ? bai.duLieu : null
  const ketQua = duLieu && !duLieu.loiDoc ? duLieu.bai : null
  const lienQuan = useMemo(
    () =>
      ketQua?.frontmatter
        ? giaiLienQuan(cay, ketQua.frontmatter.lienQuan, { boId: muc.id }).muc
        : [],
    [cay, ketQua, muc.id],
  )
  const cacO = useMemo(
    () => (ketQua ? cacOHien(ketQua, { coLienQuan: lienQuan.length > 0 }) : []),
    [ketQua, lienQuan.length],
  )
  // Chưa có nội dung → 0 câu (D8); lỗi đọc file → chưa biết (không ghi "Không áp dụng").
  const coCauHoi = duLieu && !duLieu.loiDoc ? soCauHoi(cacO) > 0 : null

  function xongVaTiep() {
    if (!tiep) return
    datTrangThaiBai('da-xong', () => void navigate(`/hoc/${tiep.slug}`))
  }

  const pager = <Pager muc={muc} truoc={truoc} tiep={tiep} />

  let than
  if (bai.tinhTrang === 'dang-tai') {
    than = <ThanBaiDangTai />
  } else if (bai.tinhTrang === 'loi') {
    than = (
      <TrangThaiLoi
        khung
        cauChinh={KHONG_TAI_DUOC_BAI}
        moTa="Dữ liệu học của bạn không bị ảnh hưởng."
        thuLai={bai.thuLai}
        className="bg-surface"
      />
    )
  } else if (!ketQua) {
    // Chưa có file (F17) hoặc lỗi đọc file (F26: chỉ banner, không hiện thân bài).
    than = bai.duLieu.loiDoc ? null : <ChuaCoNoiDung muc={muc} cay={cay} />
  } else {
    than = (
      <ThanBai
        muc={muc}
        cay={cay}
        bai={ketQua}
        cacO={cacO}
        lienQuan={lienQuan}
        trangThaiCua={trangThaiCua}
      />
    )
  }

  const coNoiDung = ketQua !== null
  return (
    <div
      className={`flex min-w-0 flex-col gap-8 pt-6 pb-12 max-md:gap-4 max-md:pt-4 max-md:pb-6 ${LE_NGANG_TRANG}`}
    >
      <Breadcrumb muc={muc} cay={cay} trangThaiCua={trangThaiCua} className="max-lg:hidden" />
      <DauBai
        muc={muc}
        cay={cay}
        noiDung={duLieu?.trangThaiNoiDung ?? null}
        loiDoc={duLieu?.loiDoc ?? null}
        giaiNghia={ketQua?.frontmatter?.giaiNghia}
        hoc={hoc}
        datHoc={datHocDauBai}
        coCauHoi={coCauHoi}
        neoBuoc={neoBonBuoc(cacO)}
      />
      {duLieu && <BannerBai muc={muc} duLieu={duLieu} />}
      {coNoiDung ? (
        <article
          aria-label={`Bài học ${muc.label}`}
          className={`${LOP_COT_DOC} gap-10 max-md:gap-6`}
        >
          {than}
          <footer className="flex flex-col gap-5 border-t border-border pt-8 max-md:pt-6">
            {tiep && (
              <Nut
                bien="chinh"
                onClick={xongVaTiep}
                disabled={!coTheDat}
                className="self-start md:h-11 md:px-5"
              >
                Đã xong, sang bài tiếp
                <ChevronRight size={16} strokeWidth={2} aria-hidden="true" className="shrink-0" />
              </Nut>
            )}
            {pager}
          </footer>
        </article>
      ) : (
        <div className="flex w-full max-w-[720px] min-w-0 flex-col gap-8 max-md:gap-4">
          {than}
          <div className="border-t border-border pt-6">{pager}</div>
        </div>
      )}
    </div>
  )
}
