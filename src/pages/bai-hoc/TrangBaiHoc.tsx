// Trang bài học /hoc/:slug — phần vẽ (F11, F15, F17, F18, F19; §1, §8.5, §8.6, §8.6b, §8.7; đề xuất 3.1, 3.2, 3.6,
// 3.9, 4.4). Dữ liệu (bài, trạng thái học, đặt trạng thái) truyền vào từ TrangMucHoc; vòng 4 bước (thanh ở DauBai,
// F19) tính từ dữ liệu học của mục + khoá các câu Tự kiểm tra của bài (cacKhoaCauHoi).
// Bố cục F11 (chỉ máy tính ≥ 1024, phạm vi rút gọn 27/10/2026; bề rộng ở cot-phai/be-rong-bai.ts): lề 24 40 48 ·
// breadcrumb · đầu bài · banner · hàng [cột đọc | cột phải]:
// - ≥ 1280: cột đọc ≤ 720 (1280–1439: ≤ 640), cột phải 320 / 280 dính khi cuộn — Mục lục / Trong lĩnh vực, Ghi chú,
//   Flashcard (không có đồng hồ);
// - 1024–1279: chỉ cột đọc ≤ 720; "Mục lục" / "Ghi chú" ở hàng breadcrumb mở panel trượt 360px; card Flashcard ở
//   cuối bài (trước chân bài), giữ neo #flashcard.
// Chữ thân bài 17/28, các khối cách 40 · chân bài "Đã xong, sang bài tiếp" + pager.
// Phím (§11, sổ src/app/phim-tat): 1–4 đặt trạng thái, [ ] mục trước / sau (bỏ qua mục Bỏ qua).
// Vào bằng #flashcard (vd. "Tạo thẻ" của Ôn tập): cuộn tới card Flashcard và focus nó khi trang dựng xong.
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { giaiLienQuan } from '../../../shared/noi-dung'
import { CAC_TRANG_THAI_HOC, type TrangThaiHoc } from '../../../shared/domain/trang-thai'
import { chuoiCha, layCay, type MucHoc } from '../../../shared/roadmap'
import { useHoc } from '../../app/du-lieu/hoc'
import { useSlugCu } from '../../app/du-lieu/thay-cay'
import { usePhimTat } from '../../app/phim-tat'
import { LE_NGANG_TRANG } from '../../app/khung/le-trang'
import { useThanhTrenMobile } from '../../app/khung/thanh-tren'
import Nut from '../../components/Nut'
import { DongCho, TrangThaiLoi, VungDangTai } from '../../components/TrangThaiTrong'
import Breadcrumb from '../../components/bai-hoc/Breadcrumb'
import Pager from '../../components/bai-hoc/Pager'
import { duongDanNut, truocTiep } from '../../components/bai-hoc/dinh-vi'
import BannerBai from './BannerBai'
import { cacOAppKhungBai, cacOHien, mucLuc, neoBonBuoc } from './bo-cuc'
import ChuaCoNoiDung from './ChuaCoNoiDung'
import { useMoToiFlashcard } from './mo-toi-flashcard'
import DauBai from './DauBai'
import type { TaiBai } from './du-lieu-bai'
import type { DatTrangThaiTrang, TrangThaiTrang } from './kieu-trang'
import ThanBai, { cacKhoaCauHoi } from './ThanBai'
import { LOP_HANG_BAI, LOP_RONG_COT_DOC, useCoCotPhai } from './cot-phai/be-rong-bai'
import CongCuGon from './cot-phai/CongCuGon'
import CotPhai from './cot-phai/CotPhai'
import TheFlashcard, { ID_FLASHCARD } from '../../components/the/TheFlashcard'
import { useXacNhanDaXong } from '../../components/bai-hoc/HopThoaiDaXong'
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

const LOP_COT_DOC = `flex w-full min-w-0 flex-1 flex-col ${LOP_RONG_COT_DOC}`
const LOP_CHU_THAN_BAI =
  'text-[length:var(--fs-body)] leading-[var(--lh-body)] max-md:text-[length:var(--fs-body-m)] max-md:leading-[var(--lh-body-m)]'

export default function TrangBaiHoc({ muc, bai, hoc, datHoc }: PropsTrangBaiHoc) {
  const cay = layCay()
  const navigate = useNavigate()
  const { trangThaiCua } = hoc
  const { truoc, tiep } = truocTiep(cay, muc, trangThaiCua)
  const coCotPhai = useCoCotPhai()
  // #flashcard: chờ bài và dữ liệu học (Ghi chú, Flashcard) tải xong rồi mới cuộn tới card.
  const dangTaiHoc = useHoc(muc.id).dangTai
  useMoToiFlashcard(bai.tinhTrang !== 'dang-tai' && !dangTaiHoc)

  // Top bar mobile: "‹ cấp cha" (§6.2, D6).
  const cha = chuoiCha(cay, muc.id).at(-1)
  useThanhTrenMobile({
    capCha: cha ? { ten: cha.label, den: duongDanNut(cay, cha), tiengAnh: true } : undefined,
  })

  const duLieu = bai.tinhTrang === 'xong' ? bai.duLieu : null
  const ketQua = duLieu && !duLieu.loiDoc ? duLieu.bai : null
  // lien_quan tra theo slug hiện tại → slug cũ (sau khi thay cây, đề xuất 1.3, 1.5) → tên gốc → id; bảng slug cũ
  // chỉ tải khi có giá trị tra trượt theo cây hiện tại.
  const dsLienQuan = ketQua?.frontmatter?.lienQuan
  const canSlugCu = useMemo(
    () => (dsLienQuan ? giaiLienQuan(cay, dsLienQuan).khongThay.length > 0 : false),
    [cay, dsLienQuan],
  )
  const traSlugCu = useSlugCu(canSlugCu).tra
  const lienQuan = useMemo(
    () => (dsLienQuan ? giaiLienQuan(cay, dsLienQuan, { boId: muc.id, traSlugCu }).muc : []),
    [cay, dsLienQuan, muc.id, traSlugCu],
  )
  const cacO = useMemo(
    () => (ketQua ? cacOHien(ketQua, { coLienQuan: lienQuan.length > 0 }) : []),
    [ketQua, lienQuan.length],
  )
  // Câu Tự kiểm tra của bài — nguồn của bước Kiểm tra (thanh 4 bước, F19). Chưa có nội dung → [] (D8: "Không áp
  // dụng · chưa có câu hỏi"); bài đang tải / lỗi đọc file → null (chưa biết, không ghi "Không áp dụng").
  const cauHoiKhoa = useMemo(
    () => (duLieu && !duLieu.loiDoc ? cacKhoaCauHoi(cacO) : null),
    [duLieu, cacO],
  )
  // Ô đang hiện trên trang: của bài; chưa có file thì khối chứa việc của người học trên khung bài (Kế hoạch thi, Bản
  // của tôi, phần làm bài Thực hành) — nguồn chung của neo thanh 4 bước và Mục lục (D15).
  const oTrenTrang = useMemo(
    () => (duLieu && !duLieu.loiDoc && !ketQua ? cacOAppKhungBai(muc.mau) : cacO),
    [duLieu, ketQua, muc.mau, cacO],
  )
  // Ghi nhớ trỏ tới card Flashcard (cột phải hoặc cuối bài — luôn có đúng một card).
  const neoBuoc = useMemo(
    () => ({ ...neoBonBuoc(oTrenTrang), 'ghi-nho': `#${ID_FLASHCARD}` }),
    [oTrenTrang],
  )
  // Mục lục (D15): đúng các khối đang hiện; null khi bài đang tải.
  const dongMucLuc = useMemo(
    () => (bai.tinhTrang === 'dang-tai' ? null : mucLuc(oTrenTrang)),
    [bai.tinhTrang, oTrenTrang],
  )

  const coTheDat = Boolean(datHoc) && !hoc.dangTai && !hoc.loi

  // F19 phải "Đã xong khi còn thiếu bước" (§1 không chặn cứng; quyết định 10).
  const { xacNhan: xacNhanDaXong, hopThoai: hopThoaiDaXong } = useXacNhanDaXong(muc, cauHoiKhoa, {
    baiDangTai: bai.tinhTrang === 'dang-tai',
  })

  /**
   * Nơi DUY NHẤT trang bài đặt trạng thái học của mục đang mở: segmented C6 (qua DauBai), phím 1–4 và
   * "Đã xong, sang bài tiếp" đều đi qua đây; `sau` chạy khi đã đặt (vd. sang bài tiếp). Đặt Đã xong khi 4 bước
   * còn thiếu → F19: chỉ đặt (và chạy `sau`) khi người học chọn "Vẫn đánh dấu Đã xong".
   */
  function datTrangThaiBai(trangThai: TrangThaiHoc, sau?: () => void) {
    if (!coTheDat || !datHoc) return
    const lam = () => {
      datHoc.dat(muc.id, trangThai)
      sau?.()
    }
    if (trangThai === 'da-xong') xacNhanDaXong(lam)
    else lam()
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
  // < 1280: card Flashcard ở cuối bài, trước chân bài.
  const flashcardCuoiBai = coCotPhai ? null : <TheFlashcard muc={muc} />
  return (
    <div
      className={`flex min-w-0 flex-col gap-8 pt-6 pb-12 max-md:gap-4 max-md:pt-4 max-md:pb-6 ${LE_NGANG_TRANG}`}
    >
      {coCotPhai ? (
        <Breadcrumb muc={muc} cay={cay} trangThaiCua={trangThaiCua} className="max-lg:hidden" />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Breadcrumb muc={muc} cay={cay} trangThaiCua={trangThaiCua} className="max-lg:hidden" />
          <CongCuGon
            muc={muc}
            cay={cay}
            mucLuc={dongMucLuc}
            trangThaiCua={trangThaiCua}
            className="ml-auto"
          />
        </div>
      )}
      <DauBai
        muc={muc}
        cay={cay}
        noiDung={duLieu?.trangThaiNoiDung ?? null}
        loiDoc={duLieu?.loiDoc ?? null}
        giaiNghia={ketQua?.frontmatter?.giaiNghia}
        hoc={hoc}
        datHoc={datHocDauBai}
        cauHoiKhoa={cauHoiKhoa}
        neoBuoc={neoBuoc}
      />
      {duLieu && <BannerBai muc={muc} duLieu={duLieu} />}
      <div className={LOP_HANG_BAI}>
        {coNoiDung ? (
          <article
            aria-label={`Bài học ${muc.label}`}
            className={`${LOP_COT_DOC} ${LOP_CHU_THAN_BAI} gap-10 max-md:gap-6`}
          >
            {than}
            {flashcardCuoiBai}
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
          <div className={`${LOP_COT_DOC} gap-8 max-md:gap-4`}>
            {than}
            {flashcardCuoiBai}
            <div className="border-t border-border pt-6">{pager}</div>
          </div>
        )}
        {coCotPhai && (
          <CotPhai muc={muc} cay={cay} mucLuc={dongMucLuc} trangThaiCua={trangThaiCua} />
        )}
      </div>
      {hopThoaiDaXong}
    </div>
  )
}
