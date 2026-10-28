// / — Tổng quan gọn (bước 2; §8.1 rút gọn theo đề xuất mục 10, 3.3, 3.9; chỉ máy tính). Không có đồng hồ, giờ học,
// streak, heatmap, card lĩnh vực, lộ trình gợi ý (đã bỏ khỏi phạm vi).
// - Banner lần đầu (F05) khi chưa có dữ liệu học (không mục nào có trạng thái, chưa có flashcard nào): câu F05 +
//   "Bắt đầu với mục đầu tiên" (bài của mục đầu tiên trong cây) + "Xem lộ trình".
// - Tiếp tục học: mục "Học tiếp" (Đang học mở gần nhất, không có thì Chưa học đầu tiên) + nút "Học tiếp".
// - Tiến độ cả roadmap: vòng + chú giải số mục theo trạng thái; % = Đã xong / (soMucHoc − Bỏ qua), làm tròn, không
//   hiện 100% khi chưa đủ, mẫu số 0 → "—" (TienDo.tsx). "Theo phần": phân số + thanh, mỗi phần là link tới Lộ
//   trình lọc theo phần.
// - Thẻ cần ôn hôm nay (server tính "hôm nay"): n > 0 → "Bắt đầu ôn" mở phiên ôn; 0 → link Ôn tập.
// - Nội dung bài học: "Đã duyệt a · Bản nháp b · Chưa có c" + thanh, link tới /noi-dung.
// Mỗi card tự có skeleton khi đang tải và lỗi + "Thử lại" của riêng nó (§8.1 "Trạng thái"), kể cả card Nội dung
// bài học (trạng thái nội dung tải lỗi). Banner F05 không chờ trạng thái nội dung khi nó lỗi (bỏ con số độ phủ).
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Play } from 'lucide-react'
import { dinhDangSo } from '../../../shared/dinh-dang'
import { TEN_TRANG_THAI_HOC } from '../../../shared/domain/trang-thai'
import { layCay, mucHocCua, type Cay } from '../../../shared/roadmap'
import { coTrangThaiHoc, hocTiep } from '../../app/du-lieu/hoc-tiep'
import {
  useLoiTrangThaiNoiDung,
  useTrangThaiNoiDung,
  type TraNoiDung,
} from '../../app/du-lieu/noi-dung'
import { useOnTap, useSoTheDenHan } from '../../app/du-lieu/on-tap'
import { useTrangThai, type DuLieuTrangThai } from '../../app/du-lieu/trang-thai'
import Banner from '../../components/Banner'
import { duongDanNut } from '../../components/bai-hoc/dinh-vi'
import { demTrongNut } from '../../components/danh-sach/cay-hien'
import { NutLink } from '../../components/Nut'
import TenMuc from '../../components/TenMuc'
import TieuDeTrang from '../../components/TieuDeTrang'
import { DongCho, HopCho, TrangThaiLoi } from '../../components/TrangThaiTrong'
import ChipLoai from '../../components/trang-thai/ChipLoai'
import ChipNoiDung from '../../components/trang-thai/ChipNoiDung'
import IconTrangThai from '../../components/trang-thai/IconTrangThai'
import { LOP_CHU_META } from '../../components/trang-thai/mau-trang-thai'
import {
  ChuGiaiTienDo,
  chuTienDo,
  DongTienDo,
  ThanhNoiDung,
  VongTienDo,
  type SoNoiDung,
} from '../../components/trang-thai/TienDo'
import {
  BAT_DAU_MUC_DAU,
  BAT_DAU_ON,
  DO_PHU_NOI_DUNG,
  dongDoPhu,
  KHONG_CO_THE_DEN_HAN,
  KHONG_CON_MUC_HOC_TIEP,
  KHONG_TAI_DUOC_NOI_DUNG,
  KHONG_TAI_DUOC_THE_ON,
  KHONG_TAI_DUOC_TRANG_THAI,
  lanDauKhongSoNoiDung,
  THE_CAN_ON_HOM_NAY,
  THEO_PHAN,
  TIEN_DO,
  XEM_NOI_DUNG,
  XEM_ON_TAP,
} from '../../copy/cho-duyet-lo-trinh'
import { KhungTrang, LOP_H1 } from '../chung'

const TEN_TRANG = 'Tổng quan'
const so = (n: number) => dinhDangSo(n)

const LOP_CARD =
  'flex flex-col gap-4 rounded-[var(--radius-md)] border border-border bg-surface p-5'
const LOP_H2 = 'm-0 text-[length:var(--fs-body)] leading-[var(--lh-body)] font-semibold'

/** Độ phủ nội dung của cả roadmap; undefined khi chưa biết trạng thái nội dung (đang tải). */
function demNoiDung(cay: Cay, noiDungCua: TraNoiDung): SoNoiDung | undefined {
  const s: SoNoiDung = { daDuyet: 0, banNhap: 0, tong: cay.soMucHoc }
  for (const m of cay.mucHoc) {
    const nd = noiDungCua(m.id)
    if (!nd) return undefined
    if (nd.loai === 'da-duyet') s.daDuyet += 1
    else if (nd.loai === 'ban-nhap') s.banNhap += 1
  }
  return s
}

/** Card có tiêu đề h2 (vùng có tên cho trình đọc màn hình). */
function The({ tieuDe, children }: { tieuDe: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={LOP_CARD}>
      <h2 id={id} className={LOP_H2}>
        {tieuDe}
      </h2>
      {children}
    </section>
  )
}

export default function TrangTongQuan() {
  const cay = layCay()
  const hoc = useTrangThai()
  const noiDungCua = useTrangThaiNoiDung()
  const loiNoiDung = useLoiTrangThaiNoiDung()
  const onTap = useOnTap()
  const soNoiDung = demNoiDung(cay, noiDungCua)

  // Lần đầu (F05, đề xuất 3.9): chưa có trạng thái học và chưa có thẻ nào. Ôn tập lỗi thì chỉ xét trạng thái học;
  // trạng thái nội dung lỗi thì vẫn hiện banner, bỏ con số "x/n mục có nội dung".
  const khongCoThe = onTap.duLieu ? onTap.duLieu.tongThe === 0 : onTap.loi
  const bietNoiDung = soNoiDung !== undefined || loiNoiDung.loi
  const lanDau =
    hoc.anhChup !== undefined && !coTrangThaiHoc(cay, hoc.anhChup) && khongCoThe && bietNoiDung

  return (
    <KhungTrang>
      <TieuDeTrang tenTrang={TEN_TRANG} className={LOP_H1}>
        {TEN_TRANG}
      </TieuDeTrang>
      {lanDau && cay.mucHoc.length > 0 && (
        <Banner
          vaiTro="none"
          tieuDe={
            soNoiDung
              ? `Roadmap có ${so(cay.soMucHoc)} mục, hiện ${so(soNoiDung.daDuyet + soNoiDung.banNhap)}/${so(cay.soMucHoc)} mục có nội dung. Bắt đầu từ đâu?`
              : lanDauKhongSoNoiDung(cay.soMucHoc)
          }
          hanhDong={
            <div className="flex flex-wrap gap-2">
              <NutLink to={`/hoc/${cay.mucHoc[0].slug}`} bien="chinh" icon={Play}>
                {BAT_DAU_MUC_DAU}
              </NutLink>
              <NutLink to="/lo-trinh" bien="phu">
                Xem lộ trình
              </NutLink>
            </div>
          }
        />
      )}
      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-4">
        <div className="flex min-w-0 flex-col gap-4">
          <TheHocTiep cay={cay} hoc={hoc} noiDungCua={noiDungCua} />
          <TheTienDo cay={cay} hoc={hoc} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <TheOnTap loi={onTap.loi} taiLai={onTap.taiLai} />
          <TheNoiDung soNoiDung={soNoiDung} loi={loiNoiDung.loi} taiLai={loiNoiDung.taiLai} />
        </div>
      </div>
    </KhungTrang>
  )
}

function TheHocTiep({
  cay,
  hoc,
  noiDungCua,
}: {
  cay: Cay
  hoc: DuLieuTrangThai
  noiDungCua: TraNoiDung
}) {
  const { anhChup, loi, taiLai, trangThaiCua } = hoc
  const muc = hocTiep(cay, anhChup)
  const noiDung = muc ? noiDungCua(muc.id) : undefined
  return (
    <The tieuDe="Tiếp tục học">
      {loi ? (
        <TrangThaiLoi cauChinh={KHONG_TAI_DUOC_TRANG_THAI} thuLai={taiLai} />
      ) : !anhChup ? (
        <div aria-hidden="true" className="flex flex-col gap-2.5">
          <DongCho rong="30%" />
          <DongCho rong="60%" cao={20} />
          <DongCho rong="20%" cao={36} />
        </div>
      ) : muc ? (
        <div className="flex flex-col items-start gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ChipLoai loai={muc.mau} />
            {noiDung && <ChipNoiDung trangThai={noiDung} />}
          </div>
          <p className="m-0 text-[length:var(--fs-h2)] leading-[var(--lh-h2)] font-bold">
            <TenMuc>{muc.label}</TenMuc>
          </p>
          <p className={`m-0 flex items-center gap-1.5 text-muted ${LOP_CHU_META}`}>
            <IconTrangThai trangThai={trangThaiCua(muc.id)} toMau size={16} />
            {TEN_TRANG_THAI_HOC[trangThaiCua(muc.id)]}
            {!coTrangThaiHoc(cay, anhChup) && muc.index === 0 && ' (mục đầu tiên trong cây)'}
          </p>
          <NutLink to={`/hoc/${muc.slug}`} bien="chinh" icon={Play}>
            Học tiếp
          </NutLink>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="m-0 text-muted">{KHONG_CON_MUC_HOC_TIEP}</p>
          <NutLink to="/lo-trinh" bien="phu">
            Xem lộ trình
          </NutLink>
        </div>
      )}
    </The>
  )
}

function TheTienDo({ cay, hoc }: { cay: Cay; hoc: DuLieuTrangThai }) {
  const { anhChup, loi, taiLai, trangThaiCua } = hoc
  const idTheoPhan = useId()
  if (loi) {
    return (
      <The tieuDe={TIEN_DO}>
        <TrangThaiLoi cauChinh={KHONG_TAI_DUOC_TRANG_THAI} thuLai={taiLai} />
      </The>
    )
  }
  if (!anhChup) {
    return (
      <The tieuDe={TIEN_DO}>
        <div aria-hidden="true" className="flex items-center gap-6">
          <HopCho rong="136px" cao={136} tron />
          <div className="flex flex-1 flex-col gap-2.5">
            <DongCho rong="50%" />
            <DongCho rong="40%" />
            <DongCho rong="45%" />
          </div>
        </div>
      </The>
    )
  }
  // Chỉ mục của cây (bản ghi mồ côi không tính — bất biến 8): đếm trên cay.mucHoc
  const s = demTrongNut(cay.mucHoc, trangThaiCua)
  return (
    <The tieuDe={TIEN_DO}>
      <div className="flex flex-wrap items-center gap-6">
        <VongTienDo {...s} />
        <div className="flex flex-col gap-3">
          <p className="m-0 font-semibold tabular-nums">{chuTienDo(s, { luonHienBoQua: true })}</p>
          <ChuGiaiTienDo {...s} />
        </div>
      </div>
      <h3 id={idTheoPhan} className={`m-0 font-semibold ${LOP_CHU_META} text-muted`}>
        {THEO_PHAN}
      </h3>
      <ul aria-labelledby={idTheoPhan} className="m-0 flex list-none flex-col gap-3 p-0">
        {cay.phan.map((p) => (
          <li key={p.id}>
            <DongTienDo
              {...demTrongNut(mucHocCua(cay, p.id), trangThaiCua)}
              ten={
                <Link
                  to={duongDanNut(cay, p)}
                  className="rounded-[var(--radius-sm)] text-inherit underline-offset-2 hover:underline"
                >
                  <TenMuc>{p.label}</TenMuc>
                </Link>
              }
            />
          </li>
        ))}
      </ul>
    </The>
  )
}

function TheOnTap({ loi, taiLai }: { loi: boolean; taiLai: () => void }) {
  const soThe = useSoTheDenHan()
  if (loi) {
    return (
      <The tieuDe={THE_CAN_ON_HOM_NAY}>
        <TrangThaiLoi cauChinh={KHONG_TAI_DUOC_THE_ON} thuLai={taiLai} />
      </The>
    )
  }
  if (soThe === undefined) {
    return (
      <The tieuDe={THE_CAN_ON_HOM_NAY}>
        <div aria-hidden="true" className="flex flex-col gap-2.5">
          <DongCho rong="30%" cao={20} />
          <DongCho rong="40%" cao={32} />
        </div>
      </The>
    )
  }
  return (
    <The
      tieuDe={
        <>
          {THE_CAN_ON_HOM_NAY}: <span className="tabular-nums">{so(soThe)}</span>
        </>
      }
    >
      {soThe > 0 ? (
        <NutLink to="/on-tap/phien" bien="chinh" icon={Play} className="self-start">
          {BAT_DAU_ON}
        </NutLink>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className={`m-0 text-muted ${LOP_CHU_META}`}>{KHONG_CO_THE_DEN_HAN}</p>
          <NutLink to="/on-tap" bien="phu">
            {XEM_ON_TAP}
          </NutLink>
        </div>
      )}
    </The>
  )
}

function TheNoiDung({
  soNoiDung,
  loi,
  taiLai,
}: {
  soNoiDung: SoNoiDung | undefined
  loi: boolean
  taiLai: () => void
}) {
  return (
    <The tieuDe={DO_PHU_NOI_DUNG}>
      {!soNoiDung && loi ? (
        <TrangThaiLoi cauChinh={KHONG_TAI_DUOC_NOI_DUNG} thuLai={taiLai} />
      ) : soNoiDung ? (
        <>
          <p className="m-0 tabular-nums">
            {dongDoPhu(
              soNoiDung.daDuyet,
              soNoiDung.banNhap,
              soNoiDung.tong - soNoiDung.daDuyet - soNoiDung.banNhap,
            )}
          </p>
          <ThanhNoiDung {...soNoiDung} />
          <NutLink to="/noi-dung" bien="phu" className="self-start">
            {XEM_NOI_DUNG}
          </NutLink>
        </>
      ) : (
        <div aria-hidden="true" className="flex flex-col gap-2.5">
          <DongCho rong="70%" />
          <DongCho cao={8} />
        </div>
      )}
    </The>
  )
}
