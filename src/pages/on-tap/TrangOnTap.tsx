// /on-tap — trang Ôn tập (bước 3; đặc tả §9 F31, đề xuất 3.3, 3.5; chỉ máy tính, bố cục gọn từ component có sẵn):
// số thẻ đến hạn hôm nay + "Bắt đầu phiên" (khoá khi 0), số thẻ theo 5 hộp Leitner kèm khoảng ôn, tỉ lệ nhớ 30
// ngày ("Chưa có tỉ lệ nhớ" khi chưa ôn lần nào). Chưa có thẻ nào: "Chưa có flashcard nào" + "Tạo thẻ" mở bài
// Đang học mở gần nhất ở #flashcard (chưa có mục Đang học → Lộ trình).
import { useId } from 'react'
import { useNavigate } from 'react-router'
import { Copy, Play } from 'lucide-react'
import { dinhDangPhanTram, dinhDangSo } from '../../../shared/dinh-dang'
import { KHOANG_ON_NGAY, type AnhChupOnTap } from '../../../server/du-lieu/hop-dong-the'
import { useOnTap } from '../../app/du-lieu/on-tap'
import { useDanhSachDangHoc } from '../../app/du-lieu/trang-thai'
import Nut, { NutLink } from '../../components/Nut'
import TieuDeTrang from '../../components/TieuDeTrang'
import TrangThaiTrong, { TheCho, TrangThaiLoi, VungDangTai } from '../../components/TrangThaiTrong'
import {
  LOI_TAI_ON_TAP,
  MO_TA_CHUA_CO_THE,
  chuLanOn30,
  lanOnKeTiep,
} from '../../copy/cho-duyet-on-tap'
import { KhungTrang, LOP_H1 } from '../chung'

const HOP = [1, 2, 3, 4, 5] as const

const LOP_CARD =
  'flex flex-col gap-4 rounded-[var(--radius-md)] border border-border bg-surface p-5'
const LOP_H2 = 'm-0 text-[length:var(--fs-body)] leading-[var(--lh-body)] font-semibold'
const LOP_META = 'm-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted'
const LOP_SO_LON = 'text-[length:var(--fs-h1)] leading-[var(--lh-h1)] font-bold tabular-nums'

/** Đích của "Tạo thẻ": bài Đang học mở gần nhất ở card Flashcard; chưa có thì Lộ trình. */
export function useDichTaoThe(): string {
  const { cacMuc } = useDanhSachDangHoc(1)
  const muc = cacMuc[0]
  return muc ? `/hoc/${muc.slug}#flashcard` : '/lo-trinh'
}

export default function TrangOnTap() {
  const { duLieu, dangTai, loi, taiLai } = useOnTap({ taiKhiMo: true })
  return (
    <KhungTrang className="max-w-[960px]">
      <div className="flex flex-col gap-1">
        <TieuDeTrang tenTrang="Ôn tập" className={LOP_H1}>
          Ôn tập
        </TieuDeTrang>
        {duLieu && duLieu.tongThe > 0 && (
          <p className={LOP_META}>{dinhDangSo(duLieu.tongThe)} thẻ · Leitner 5 hộp</p>
        )}
      </div>
      {duLieu ? (
        <NoiDung duLieu={duLieu} />
      ) : loi ? (
        <TrangThaiLoi cauChinh={LOI_TAI_ON_TAP} thuLai={taiLai} khung />
      ) : dangTai ? (
        <VungDangTai className="flex flex-col gap-4">
          <TheCho cao={140} />
          <TheCho cao={160} />
        </VungDangTai>
      ) : null}
    </KhungTrang>
  )
}

function NoiDung({ duLieu }: { duLieu: AnhChupOnTap }) {
  const dichTaoThe = useDichTaoThe()
  if (duLieu.tongThe === 0) {
    return (
      <TrangThaiTrong
        icon={Copy}
        khung
        className="bg-surface"
        cauChinh="Chưa có flashcard nào"
        moTa={MO_TA_CHUA_CO_THE}
        nut={
          <NutLink to={dichTaoThe} bien="chinh">
            Tạo thẻ
          </NutLink>
        }
      />
    )
  }
  return (
    <>
      <TheDenHan duLieu={duLieu} />
      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <CacHop duLieu={duLieu} />
        <TiLeNho duLieu={duLieu} />
      </div>
    </>
  )
}

function TheDenHan({ duLieu }: { duLieu: AnhChupOnTap }) {
  const navigate = useNavigate()
  const id = useId()
  const so = duLieu.denHan.length
  return (
    <section aria-labelledby={id} className={`${LOP_CARD} flex-row items-center justify-between`}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="m-0 text-[length:var(--fs-h2)] leading-[var(--lh-h2)] font-bold">
          <span className="tabular-nums">{dinhDangSo(so)}</span> thẻ đến hạn hôm nay
        </h2>
        <p className={LOP_META}>
          {so === 0 && duLieu.hanKeTiep
            ? lanOnKeTiep(duLieu.hanKeTiep)
            : 'Nhớ → lên 1 hộp · Quên → về hộp 1'}
        </p>
      </div>
      <Nut bien="chinh" icon={Play} disabled={so === 0} onClick={() => navigate('/on-tap/phien')}>
        Bắt đầu phiên
      </Nut>
    </section>
  )
}

function CacHop({ duLieu }: { duLieu: AnhChupOnTap }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={LOP_CARD}>
      <h2 id={id} className={LOP_H2}>
        Hộp Leitner
      </h2>
      <ul className="m-0 grid list-none grid-cols-5 gap-3 p-0">
        {HOP.map((h) => (
          <li
            key={h}
            className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-border bg-bg p-3"
          >
            <span className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-semibold">
              Hộp {h}
            </span>
            <span className={LOP_SO_LON}>{dinhDangSo(duLieu.hop[h])}</span>
            <span className={LOP_META}>ôn sau {dinhDangSo(KHOANG_ON_NGAY[h])} ngày</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TiLeNho({ duLieu }: { duLieu: AnhChupOnTap }) {
  const id = useId()
  const { nho, tong } = duLieu.lanOn30
  return (
    <section aria-labelledby={id} className={LOP_CARD}>
      <h2 id={id} className={LOP_H2}>
        Tỉ lệ nhớ 30 ngày
      </h2>
      {duLieu.tiLeNho30 === null ? (
        <p className="m-0 text-muted">Chưa có tỉ lệ nhớ</p>
      ) : (
        <div className="flex flex-col gap-1">
          <span className={LOP_SO_LON}>{dinhDangPhanTram(nho, tong)}</span>
          <p className={LOP_META}>Số lần Nhớ / tổng lần ôn trong 30 ngày</p>
          <p className={LOP_META}>{chuLanOn30(nho, tong)}</p>
        </div>
      )}
    </section>
  )
}
