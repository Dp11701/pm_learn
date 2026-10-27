// Bảng "Kiểm tra trước khi nhập" (F22; đề xuất 1.7, 3.8; D21). Cột File · Mục · Khớp theo · Kết quả; cuối bảng
// "a hợp lệ · b cảnh báo · c trùng · d lỗi" + nút "Nhập n file" (số đổi theo lựa chọn của bạn).
// - D21: "Hợp lệ" màu chữ thường + glyph ✓ (không dùng màu Đã xong); chỉ ✕ Lỗi frontmatter màu danger.
// - Dòng ⚠ ⟳ ◎ nền bg như F22 (#F8FAFC = --bg), dòng ✓ ✕ nền surface.
// - Tên mục đầy đủ (TenMuc, lang=en), không tự viết tắt.
// - Bảng là <table> thật: ô đầu mỗi hàng là th scope=row (tên file), nút trong hàng mô tả bằng tên file đó.
// - < 1280 cột hẹp lại; 768–1279 bảng rộng tối thiểu 760px, hẹp hơn thì cuộn ngang trong vùng riêng (Tab tới
//   được), cột File dính bên trái, có bóng đổ khi đã cuộn (quyết định 9 của designer).
// - < 768 mỗi hàng là một thẻ xếp dọc (vẫn là <table>: role table/row/cell ghi rõ vì đổi display làm một số
//   trình duyệt bỏ ngữ nghĩa bảng): File · (Mục, Khớp theo) · Kết quả với mọi việc của dòng — không phải cuộn
//   ngang mới thấy kết quả. Hàng tiêu đề chỉ còn cho trình đọc màn hình; "Mục:", "Khớp theo:" hiện trong thẻ.
// - ⟳ của Quét lại mà file đã nhận không còn trên đĩa: "Nhập thành bản sửa" bị vô hiệu (chỉ Giữ bản cũ được).
// - ✕ Lỗi frontmatter: "Sao chép dòng lỗi" (tên file / đường dẫn + dòng lỗi) để sửa file ở trình soạn bạn quen dùng —
//   thay "Mở trong trình soạn" và "Gán cho mục…" của dòng lỗi (gán chỉ để mở trình soạn đúng bài; trình soạn trong
//   app đã bỏ, đề xuất mục 10).
import { useId, useState, type ReactNode, type Ref, type UIEvent } from 'react'
import { dinhDangNgay, dinhDangSo } from '../../../shared/dinh-dang'
import { voiDong } from '../../../shared/noi-dung'
import type { KetQuaFile, LoaiKetQua, MucNgan, TepGui, XuLyTrung } from '../../app/du-lieu/nhap'
import { useTrangThaiNoiDung } from '../../app/du-lieu/noi-dung'
import Nut from '../Nut'
import NutSaoChepDongLoi from '../NutSaoChepDongLoi'
import TenMuc from '../TenMuc'
import HopThoaiGanMuc from './HopThoaiGanMuc'
import {
  chuTomTat,
  demLoai,
  demViec,
  khongConFile,
  khopTheo,
  mucHieuLuc,
  nhanNutNhap,
  noiDungCua,
  seGiuBanCu,
  seNhap,
  trungMucTrongLo,
  xuLyTrungCua,
  type LuaChon,
  type NguonLo,
} from './ket-qua'
import {
  CHU_THICH_CHUA_CHUP,
  CHUA_GAN_MUC,
  GIU_BAN_CU_GHI_LAI,
  GIU_BAN_CU_KHOI_PHUC,
  TEN_BANG_KET_QUA,
  THAY_BAN_NHAP,
  cungMucVoi,
  nhanTatCaDaDuyet,
} from '../../copy/cho-duyet'

export interface PropsBangKetQua {
  ketQua: readonly KetQuaFile[]
  nguon: NguonLo
  /** Nội dung đã gửi (lô kéo thả), để suy cột "Khớp theo"; lô Quét lại: null. */
  tep: readonly TepGui[] | null
  luaChon: LuaChon
  doiLuaChon: (doi: (lc: LuaChon) => LuaChon) => void
  /** id mục của ?muc= (gán sẵn). */
  mucMacDinh?: string
  dangNhap: boolean
  onNhap: () => void
  /** Id cho H2 (nơi dùng đưa focus / gắn tên). */
  idTieuDe?: string
  nutNhapRef?: Ref<HTMLButtonElement>
}

const GLYPH: Record<LoaiKetQua, string> = {
  'hop-le': '✓',
  'thieu-khoi': '⚠',
  'khong-khop': '⚠',
  'trung-da-duyet': '⟳',
  'chua-chup': '◎',
  loi: '✕',
}

const TEN_LOAI: Record<LoaiKetQua, string> = {
  'hop-le': 'Hợp lệ',
  'thieu-khoi': 'Thiếu khối bắt buộc',
  'khong-khop': 'Không khớp mục',
  'trung-da-duyet': 'Trùng bản đã duyệt',
  'chua-chup': 'Đã duyệt nhưng app chưa có bản chụp',
  loi: 'Lỗi frontmatter',
}

/** Dòng cần bạn để ý (⚠ ⟳ ◎): nền bg như F22. */
const NEN_NHAT = new Set<LoaiKetQua>(['thieu-khoi', 'khong-khop', 'trung-da-duyet', 'chua-chup'])

const COT = ['File', 'Mục', 'Khớp theo', 'Kết quả'] as const

// Ô: ≥ 768 ô bảng (viền trên, đệm); < 768 phần tử của thẻ hàng (lưới 2 cột), không viền / đệm riêng.
const O =
  'text-left align-middle md:border-t md:border-border md:px-3 md:py-2 md:first:pl-4 md:last:pr-4'
const COT_DAU =
  'md:sticky md:left-0 md:z-[1] group-data-[da-cuon=true]:shadow-[6px_0_8px_-6px_color-mix(in_srgb,var(--text)_30%,transparent)]'
const HANG_THE =
  'max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-baseline max-md:gap-x-3 max-md:gap-y-1 max-md:border-t max-md:border-border max-md:px-4 max-md:py-3 max-md:first:border-t-0'
const LOP_PHU = 'text-muted'

/** Tên cột hiện trong thẻ hàng ở < 768 (hàng tiêu đề chỉ còn cho trình đọc màn hình nên ẩn với nó). */
function NhanCotMobile({ cot }: { cot: (typeof COT)[number] }) {
  return (
    <span aria-hidden="true" data-nhan-cot="" className="text-muted md:hidden">
      {cot}:{' '}
    </span>
  )
}

export default function BangKetQua({
  ketQua,
  nguon,
  tep,
  luaChon,
  doiLuaChon,
  mucMacDinh,
  dangNhap,
  onNhap,
  idTieuDe,
  nutNhapRef,
}: PropsBangKetQua) {
  const id = useId()
  const idH2 = idTieuDe ?? `${id}h2`
  const [ganChiSo, datGanChiSo] = useState<number | null>(null)
  const [daCuon, datDaCuon] = useState(false)
  const traNoiDung = useTrangThaiNoiDung()
  const dem = demLoai(ketQua)
  const viec = demViec(ketQua, luaChon, nguon)
  const tongViec = viec.nhap + viec.giu
  const [dauTomTat, ...sauTomTat] = chuTomTat(dem).split(' · ')
  const dongChuaChup = ketQua.filter((kq) => kq.loai === 'chua-chup')
  const trungMuc = trungMucTrongLo(ketQua, luaChon)
  const dangGanDong = ganChiSo === null ? undefined : ketQua.find((k) => k.chiSo === ganChiSo)

  const idTen = (kq: KetQuaFile) => `${id}f${kq.chiSo}`

  function gan(chiSo: number, muc: MucNgan | null) {
    doiLuaChon((lc) => {
      const moi = { ...lc.gan }
      if (muc) moi[chiSo] = muc
      else delete moi[chiSo]
      return { ...lc, gan: moi }
    })
  }

  function datXuLy(chiSo: number, xl: XuLyTrung) {
    doiLuaChon((lc) => ({ ...lc, xuLyTrung: { ...lc.xuLyTrung, [chiSo]: xl } }))
  }

  function datNhan(chiSos: readonly number[], nhan: boolean) {
    doiLuaChon((lc) => {
      const moi = { ...lc.nhanDaDuyet }
      for (const c of chiSos) {
        if (nhan) moi[c] = true
        else delete moi[c]
      }
      return { ...lc, nhanDaDuyet: moi }
    })
  }

  function khiCuon(e: UIEvent<HTMLDivElement>) {
    const cuon = e.currentTarget.scrollLeft > 0
    if (cuon !== daCuon) datDaCuon(cuon)
  }

  /** "Bản hiện tại duyệt dd/MM/yyyy" (F22) khi server không ghi chú. */
  function ghiChuTrung(kq: KetQuaFile): string | null {
    if (kq.ghiChu) return kq.ghiChu
    const tt = kq.muc ? traNoiDung(kq.muc.id) : undefined
    return tt?.loai === 'da-duyet' ? `Bản hiện tại duyệt ${dinhDangNgay(tt.ngayDuyet)}` : null
  }

  return (
    <section aria-labelledby={idH2} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id={idH2}
          tabIndex={-1}
          className="m-0 text-[17px] leading-7 font-semibold outline-none"
        >
          Kiểm tra trước khi nhập · {dinhDangSo(ketQua.length)} file
        </h2>
        <span className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
          Khớp theo id trong frontmatter; không có id thì khớp theo tên file
        </span>
      </div>

      {dongChuaChup.length >= 2 && (
        <ChonTatCaChuaChup
          so={dongChuaChup.length}
          soDaChon={dongChuaChup.filter((kq) => luaChon.nhanDaDuyet[kq.chiSo]).length}
          doi={(nhan) =>
            datNhan(
              dongChuaChup.map((kq) => kq.chiSo),
              nhan,
            )
          }
        />
      )}

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface">
        <div
          role="region"
          aria-label={TEN_BANG_KET_QUA}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          onScroll={khiCuon}
          data-da-cuon={daCuon}
          className="group relative overflow-x-auto"
        >
          {/* eslint-disable jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role -- role ghi rõ: < 768 đổi display (thẻ hàng) mà vẫn là bảng */}
          <table
            role="table"
            aria-labelledby={idH2}
            className="w-full border-separate border-spacing-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] max-md:block md:min-w-[760px] md:table-fixed"
          >
            <colgroup>
              <col className="w-[300px] max-xl:w-[220px] max-md:w-[150px]" />
              <col className="w-[220px] max-xl:w-[180px] max-md:w-[170px]" />
              <col className="w-[100px]" />
              <col />
            </colgroup>
            <thead role="rowgroup" className="max-md:sr-only">
              <tr role="row">
                {COT.map((cot, i) => (
                  <th
                    key={cot}
                    role="columnheader"
                    scope="col"
                    className={`h-10 bg-surface-2 px-3 text-left font-semibold first:pl-4 last:pr-4 ${
                      i === 0 ? `${COT_DAU} md:z-[2]` : ''
                    }`}
                  >
                    {cot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup" className="max-md:block">
              {ketQua.map((kq) => {
                const nen = NEN_NHAT.has(kq.loai) ? 'bg-bg' : 'bg-surface'
                const muc = mucHieuLuc(kq, luaChon)
                return (
                  <tr
                    key={kq.chiSo}
                    role="row"
                    data-loai={kq.loai}
                    className={`${nen} ${HANG_THE}`}
                  >
                    <th
                      role="rowheader"
                      scope="row"
                      id={idTen(kq)}
                      className={`${O} ${COT_DAU} ${nen} font-normal max-md:col-span-2`}
                    >
                      <span
                        className="font-mono text-xs break-all"
                        title={tep?.[kq.chiSo]?.duongDan}
                      >
                        {kq.ten}
                      </span>
                    </th>
                    <td role="cell" className={`${O} min-w-0`}>
                      <NhanCotMobile cot="Mục" />
                      {muc ? (
                        <TenMuc>{muc.label}</TenMuc>
                      ) : (
                        <>
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">{CHUA_GAN_MUC}</span>
                        </>
                      )}
                    </td>
                    <td role="cell" className={`${O} ${LOP_PHU}`}>
                      <NhanCotMobile cot="Khớp theo" />
                      {khopTheo(kq, luaChon, noiDungCua(tep, kq.chiSo), mucMacDinh)}
                    </td>
                    <td role="cell" className={`${O} max-md:col-span-2`}>
                      <OKetQua
                        kq={kq}
                        muc={muc}
                        luaChon={luaChon}
                        nguon={nguon}
                        idTen={idTen(kq)}
                        ghiChuTrung={kq.loai === 'trung-da-duyet' ? ghiChuTrung(kq) : null}
                        cungMucVoi={trungMuc.get(kq.chiSo)}
                        moGan={() => datGanChiSo(kq.chiSo)}
                        datXuLy={(xl) => datXuLy(kq.chiSo, xl)}
                        datNhan={(nhan) => datNhan([kq.chiSo], nhan)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {/* eslint-enable jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role */}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-bg px-4 py-3 max-md:flex-col max-md:items-stretch">
          <span className="min-w-0 flex-1 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] tabular-nums">
            <strong className="font-semibold">{dauTomTat}</strong>
            {sauTomTat.map((p) => ` · ${p}`).join('')}
          </span>
          {dem.trung > 0 && (
            <span className={`text-[length:var(--fs-meta)] leading-[var(--lh-meta)] ${LOP_PHU}`}>
              File trùng chỉ nhập khi chọn &quot;Nhập thành bản sửa&quot;
            </span>
          )}
          {dem.chuaChup > 0 && (
            <span className={`text-[length:var(--fs-meta)] leading-[var(--lh-meta)] ${LOP_PHU}`}>
              {CHU_THICH_CHUA_CHUP}
            </span>
          )}
          <Nut
            ref={nutNhapRef}
            bien="chinh"
            disabled={tongViec === 0}
            dangXuLy={dangNhap}
            onClick={onNhap}
            className="md:h-10 md:px-[18px]"
          >
            {nhanNutNhap(viec)}
          </Nut>
        </div>
      </div>

      {dangGanDong && (
        <HopThoaiGanMuc
          mo
          doiMo={(mo) => !mo && datGanChiSo(null)}
          tenFile={dangGanDong.ten}
          ungVien={dangGanDong.ungVien}
          dangGan={mucHieuLuc(dangGanDong, luaChon)}
          onChon={(m) => gan(dangGanDong.chiSo, m)}
          onBoGan={luaChon.gan[dangGanDong.chiSo] ? () => gan(dangGanDong.chiSo, null) : undefined}
        />
      )}
    </section>
  )
}

/** Ô Kết quả: nhãn (glyph + chữ), dòng phụ, việc của dòng (Gán cho mục…, Giữ bản cũ / Nhập thành bản sửa…). */
function OKetQua({
  kq,
  muc,
  luaChon,
  nguon,
  idTen,
  ghiChuTrung,
  cungMucVoi: tenCungMuc,
  moGan,
  datXuLy,
  datNhan,
}: {
  kq: KetQuaFile
  muc: MucNgan | null
  luaChon: LuaChon
  nguon: NguonLo
  idTen: string
  ghiChuTrung: string | null
  /** Tên file đứng trước sẽ nhập vào cùng mục */
  cungMucVoi?: string
  moGan: () => void
  datXuLy: (xl: XuLyTrung) => void
  datNhan: (nhan: boolean) => void
}) {
  const nhap = seNhap(kq, luaChon)
  const phu: { khoa: string; chu: ReactNode }[] = []
  const coBanGan = luaChon.gan[kq.chiSo] !== undefined

  if (kq.loai === 'loi' && kq.loi) phu.push({ khoa: 'loi', chu: voiDong(kq.loi) })
  if ((kq.loai === 'thieu-khoi' || kq.loai === 'khong-khop') && kq.thieu.length > 0) {
    phu.push({ khoa: 'thieu', chu: `Thiếu: ${kq.thieu.join(', ')} · vẫn nhập được` })
  }
  if (kq.loai === 'khong-khop' && !coBanGan) {
    const goiY = kq.ganSan && kq.muc ? [kq.muc] : muc ? [] : kq.ungVien
    if (goiY.length > 0) {
      phu.push({
        khoa: 'goi-y',
        chu: (
          <>
            Gợi ý:{' '}
            {goiY.map((m, i) => (
              <span key={m.id}>
                {i > 0 && ' · '}
                <TenMuc>{m.label}</TenMuc>
              </span>
            ))}
          </>
        ),
      })
    }
  }
  if (kq.loai === 'trung-da-duyet' && ghiChuTrung) phu.push({ khoa: 'ghi-chu', chu: ghiChuTrung })
  else if (kq.ghiChu) phu.push({ khoa: 'ghi-chu', chu: kq.ghiChu })
  if (nhap && kq.thayBanNhap) phu.push({ khoa: 'thay', chu: THAY_BAN_NHAP })
  if (nhap && kq.chuyenVeBanNhap && kq.loai !== 'chua-chup') {
    phu.push({ khoa: 'chuyen', chu: 'Đã chuyển về Bản nháp' })
  }
  if (seGiuBanCu(kq, luaChon, nguon)) {
    phu.push({ khoa: 'giu', chu: khongConFile(kq) ? GIU_BAN_CU_KHOI_PHUC : GIU_BAN_CU_GHI_LAI })
  }
  if (tenCungMuc) phu.push({ khoa: 'cung-muc', chu: cungMucVoi(tenCungMuc) })

  const loi = kq.loai === 'loi'
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
      <span
        className={`inline-flex items-center gap-1.5 font-semibold ${loi ? 'text-danger' : 'text-text'}`}
      >
        <span aria-hidden="true" className="font-mono">
          {GLYPH[kq.loai]}
        </span>
        {TEN_LOAI[kq.loai]}
      </span>
      {phu.map((p) => (
        <span key={p.khoa} className={LOP_PHU}>
          {p.chu}
        </span>
      ))}
      {kq.loai === 'khong-khop' && (
        <Nut bien="phu" co="nho" onClick={moGan} aria-describedby={idTen}>
          Gán cho mục…
        </Nut>
      )}
      {kq.loai === 'trung-da-duyet' && (
        <ChonXuLyTrung
          ten={`${idTen}-xl`}
          giaTri={xuLyTrungCua(kq, luaChon)}
          doi={datXuLy}
          idTen={idTen}
          chiGiu={khongConFile(kq)}
        />
      )}
      {kq.loai === 'chua-chup' && (
        <label className="inline-flex min-h-8 cursor-pointer items-center gap-2 font-medium max-md:min-h-[var(--h-control-touch)]">
          <input
            type="checkbox"
            checked={luaChon.nhanDaDuyet[kq.chiSo] === true}
            onChange={(e) => datNhan(e.target.checked)}
            aria-describedby={idTen}
            className="size-4 accent-[var(--primary)]"
          />
          Nhận là Đã duyệt
        </label>
      )}
      {loi && kq.loi && (
        <NutSaoChepDongLoi
          tenFile={kq.duongDan ?? kq.ten}
          loi={kq.loi}
          co="nho"
          aria-describedby={idTen}
        />
      )}
    </span>
  )
}

/**
 * "Giữ bản cũ" (mặc định) / "Nhập thành bản sửa": radio thật, vẽ như segmented (F22). `chiGiu`: file không còn
 * trên đĩa → "Nhập thành bản sửa" vô hiệu (ghi chú của server trên dòng nói "chỉ Giữ bản cũ được").
 */
function ChonXuLyTrung({
  ten,
  giaTri,
  doi,
  idTen,
  chiGiu = false,
}: {
  ten: string
  giaTri: XuLyTrung
  doi: (xl: XuLyTrung) => void
  idTen: string
  chiGiu?: boolean
}) {
  const cac: { gt: XuLyTrung; nhan: string }[] = [
    { gt: 'giu-ban-cu', nhan: 'Giữ bản cũ' },
    { gt: 'thanh-ban-sua', nhan: 'Nhập thành bản sửa' },
  ]
  return (
    <span
      role="radiogroup"
      aria-label="Xử lý file trùng"
      aria-describedby={idTen}
      className="inline-flex gap-0.5 rounded-[var(--radius-sm)] border border-border-input bg-surface p-0.5"
    >
      {cac.map(({ gt, nhan }) => (
        <label
          key={gt}
          className="relative cursor-pointer rounded-[4px] px-2.5 leading-6 has-[:checked]:bg-primary has-[:checked]:font-semibold has-[:checked]:text-on-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:text-muted has-[:disabled]:line-through has-[:focus-visible]:[outline:var(--focus-ring)] has-[:focus-visible]:[outline-offset:var(--focus-offset)] max-md:leading-10"
        >
          <input
            type="radio"
            name={ten}
            value={gt}
            checked={giaTri === gt}
            disabled={chiGiu && gt === 'thanh-ban-sua'}
            onChange={() => doi(gt)}
            className="sr-only"
          />
          {nhan}
        </label>
      ))}
    </span>
  )
}

/** Tick một lần cho mọi dòng ◎ (mất DB, chuyển máy: hàng chục file da-duyet). */
function ChonTatCaChuaChup({
  so,
  soDaChon,
  doi,
}: {
  so: number
  soDaChon: number
  doi: (nhan: boolean) => void
}) {
  const motPhan = soDaChon > 0 && soDaChon < so
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 self-start font-medium">
      <input
        ref={(el) => {
          if (el) el.indeterminate = motPhan
        }}
        type="checkbox"
        checked={soDaChon === so}
        onChange={(e) => doi(e.target.checked)}
        className="size-4 accent-[var(--primary)]"
      />
      {nhanTatCaDaDuyet(dinhDangSo(so))}
    </label>
  )
}
