// /linh-vuc/:slug — trang lĩnh vực (bước 2; §8.4 rút gọn, đề xuất 3.3, 3.9; chỉ máy tính). Slug phải là lĩnh vực trong
// cây; không có → slug cũ thì chuyển, còn lại 404 có gợi ý (SlugCuHoac404).
// - Đầu trang: chip Lĩnh vực, H1 tên lĩnh vực (lang=en), dòng "Phần … · n mục · a chủ đề · b tài liệu · c nhóm" (bỏ
//   loại có số 0), tiến độ "x/y · Đang học a · Chưa học b" + thanh, độ phủ nội dung khi đã biết.
// - "Học tiếp trong lĩnh vực: {mục}" = mục Đang học mở gần nhất của lĩnh vực, không có thì mục Chưa học đầu tiên;
//   "Xem trong Lộ trình" = danh sách lọc theo lĩnh vực này.
// - Danh sách cây các mục của lĩnh vực (nhóm là tiêu đề h2) có chọn nhiều + "Đặt trạng thái…" như Lộ trình.
// - Pager lĩnh vực trước / tiếp theo thứ tự cây (lĩnh vực đầu / cuối chỉ có một chiều).
// - #<slug nhóm> (link tới nhóm): cuộn tới tiêu đề nhóm khi danh sách đã dựng.
import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { ChevronLeft, ChevronRight, ListFilter } from 'lucide-react'
import { dinhDangSo } from '../../shared/dinh-dang'
import { cacLinhVuc } from '../../shared/domain/loc-danh-sach'
import { TEN_LOAI } from '../../shared/domain/trang-thai'
import { layCay, type Cay, type MauBai, type MucHoc, type Nut } from '../../shared/roadmap'
import { hocTiepTrong } from '../app/du-lieu/hoc-tiep'
import { useTrangThaiNoiDung } from '../app/du-lieu/noi-dung'
import { useTrangThai } from '../app/du-lieu/trang-thai'
import { demTrongNut } from '../components/danh-sach/cay-hien'
import { useCuonToiNeo } from '../components/danh-sach/cuon-toi-neo'
import DanhSachChon from '../components/danh-sach/DanhSachChon'
import { NutLink } from '../components/Nut'
import TenMuc from '../components/TenMuc'
import TieuDeTrang from '../components/TieuDeTrang'
import { TheCho, TrangThaiLoi, VungDangTai } from '../components/TrangThaiTrong'
import ChipLoai from '../components/trang-thai/ChipLoai'
import { LOP_CHU_META } from '../components/trang-thai/mau-trang-thai'
import {
  chuNoiDung,
  chuTienDoChiTiet,
  ThanhNoiDung,
  ThanhTienDo,
  TienDoDangTai,
  TienDoLoi,
} from '../components/trang-thai/TienDo'
import {
  HET_MUC_TRONG_LINH_VUC,
  KHONG_TAI_DUOC_TRANG_THAI,
  LINH_VUC_TIEP,
  LINH_VUC_TRUOC,
  PAGER_LINH_VUC,
  PHAN_CUA,
  TEN_DANH_SACH,
  XEM_TRONG_LO_TRINH,
} from '../copy/cho-duyet-lo-trinh'
import { KhungTrang, LOP_H1, timNut } from './chung'
import SlugCuHoac404 from './khong-tim-thay/SlugCuHoac404'

const THU_TU_MAU: readonly MauBai[] = ['chu-de', 'tai-lieu', 'chung-chi']

/** "n mục · a chủ đề · b tài liệu · c nhóm" (§8.4): bỏ loại có số 0. */
function chuThanhPhan(cay: Cay, linhVuc: Nut, cacMuc: readonly MucHoc[]): string {
  const so = (n: number) => dinhDangSo(n)
  const phan = [`${so(cacMuc.length)} mục`]
  for (const mau of THU_TU_MAU) {
    const n = cacMuc.filter((m) => m.mau === mau).length
    if (n > 0) phan.push(`${so(n)} ${TEN_LOAI[mau].toLowerCase()}`)
  }
  const soNhom = linhVuc.con.filter((id) => cay.nutTheoId.get(id)?.kind === 'group').length
  if (soNhom > 0) phan.push(`${so(soNhom)} ${TEN_LOAI.nhom.toLowerCase()}`)
  return phan.join(' · ')
}

export default function TrangLinhVuc() {
  const { slug } = useParams()
  const linhVuc = timNut(slug, 'area')
  if (!linhVuc) return <SlugCuHoac404 slug={slug} loai="area" />
  // key: sang lĩnh vực khác (pager) thì bỏ chọn của lĩnh vực cũ
  return <NoiDungLinhVuc key={linhVuc.id} linhVuc={linhVuc} />
}

function NoiDungLinhVuc({ linhVuc }: { linhVuc: Nut }) {
  const cay = layCay()
  const { anhChup, dangTai, loi, taiLai, trangThaiCua, canOnLaiCua } = useTrangThai()
  const noiDungCua = useTrangThaiNoiDung()
  const cacMuc = useMemo(
    () => cay.mucHoc.filter((m) => m.linhVuc?.id === linhVuc.id),
    [cay, linhVuc.id],
  )
  const phan = linhVuc.chaId ? cay.nutTheoId.get(linhVuc.chaId) : undefined
  const so = demTrongNut(cacMuc, trangThaiCua)
  const tiep = hocTiepTrong(cacMuc, anhChup)
  // Link tới nhóm: /linh-vuc/<slug>#<slug nhóm>
  useCuonToiNeo(!dangTai && !loi)

  // Độ phủ nội dung: chỉ khi đã biết trạng thái nội dung của mọi mục
  const cacNoiDung = cacMuc.map((m) => noiDungCua(m.id))
  const soNoiDung = cacNoiDung.every((nd) => nd !== undefined)
    ? {
        daDuyet: cacNoiDung.filter((nd) => nd?.loai === 'da-duyet').length,
        banNhap: cacNoiDung.filter((nd) => nd?.loai === 'ban-nhap').length,
        tong: cacMuc.length,
      }
    : undefined

  const tatCaLinhVuc = cacLinhVuc(cay)
  const viTri = tatCaLinhVuc.findIndex((n) => n.id === linhVuc.id)
  const truoc = viTri > 0 ? tatCaLinhVuc[viTri - 1] : undefined
  const sau = viTri >= 0 ? tatCaLinhVuc[viTri + 1] : undefined

  return (
    <KhungTrang>
      <header className="flex flex-col items-start gap-2">
        <ChipLoai loai="linh-vuc" />
        <TieuDeTrang tenTrang={linhVuc.label} className={LOP_H1}>
          <TenMuc>{linhVuc.label}</TenMuc>
        </TieuDeTrang>
        <p className={`m-0 text-muted ${LOP_CHU_META}`}>
          {phan && (
            <>
              {PHAN_CUA} <TenMuc>{phan.label}</TenMuc> ·{' '}
            </>
          )}
          {chuThanhPhan(cay, linhVuc, cacMuc)}
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-4">
        {loi ? (
          <TienDoLoi thuLai={taiLai} />
        ) : dangTai ? (
          <TienDoDangTai />
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="tabular-nums">{chuTienDoChiTiet(so)}</span>
            <ThanhTienDo {...so} className="w-48" />
          </div>
        )}
        {soNoiDung && (
          <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${LOP_CHU_META}`}>
            <span className="text-muted tabular-nums">{chuNoiDung(soNoiDung)}</span>
            <ThanhNoiDung {...soNoiDung} className="w-48" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {!dangTai && !loi && tiep && (
            <NutLink to={`/hoc/${tiep.slug}`} bien="chinh" icon={ChevronRight}>
              {/* Một phần tử con: nút là flex có gap, chữ và tên tách rời sẽ cách quá xa */}
              <span>
                Học tiếp trong lĩnh vực: <TenMuc>{tiep.label}</TenMuc>
              </span>
            </NutLink>
          )}
          {!dangTai && !loi && !tiep && anhChup && (
            <span className={`text-muted ${LOP_CHU_META}`}>{HET_MUC_TRONG_LINH_VUC}</span>
          )}
          <NutLink
            to={`/lo-trinh?xem=danh-sach&linh-vuc=${linhVuc.slug}`}
            bien="phu"
            icon={ListFilter}
          >
            {XEM_TRONG_LO_TRINH}
          </NutLink>
        </div>
      </section>

      {loi ? (
        <TrangThaiLoi cauChinh={KHONG_TAI_DUOC_TRANG_THAI} thuLai={taiLai} khung />
      ) : dangTai ? (
        <VungDangTai>
          <TheCho cao={240} />
        </VungDangTai>
      ) : (
        <DanhSachChon
          cay={cay}
          cacMuc={cacMuc}
          kieu={{ loai: 'cay', goc: linhVuc.con, capDau: 2 }}
          trangThaiCua={trangThaiCua}
          canOnLaiCua={canOnLaiCua}
          noiDungCua={noiDungCua}
          nhan={TEN_DANH_SACH}
        />
      )}

      {(truoc || sau) && (
        <nav aria-label={PAGER_LINH_VUC} className="grid grid-cols-2 gap-4">
          {truoc ? <ThePagerLinhVuc huong="truoc" nut={truoc} /> : <div aria-hidden="true" />}
          {sau && <ThePagerLinhVuc huong="tiep" nut={sau} />}
        </nav>
      )}
    </KhungTrang>
  )
}

function ThePagerLinhVuc({ huong, nut }: { huong: 'truoc' | 'tiep'; nut: Nut }) {
  const truoc = huong === 'truoc'
  return (
    <Link
      to={`/linh-vuc/${nut.slug}`}
      className={`flex min-w-0 flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-surface px-5 py-4 text-text no-underline transition-colors duration-150 hover:border-text ${
        truoc ? '' : 'items-end text-right'
      }`}
    >
      <span className={`inline-flex items-center gap-1 text-muted ${LOP_CHU_META}`}>
        {truoc && <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />}
        {truoc ? LINH_VUC_TRUOC : LINH_VUC_TIEP}
        {!truoc && <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />}
      </span>
      <TenMuc className="text-[length:var(--fs-ui)] leading-[var(--lh-ui)] font-semibold">
        {nut.label}
      </TenMuc>
    </Link>
  )
}
