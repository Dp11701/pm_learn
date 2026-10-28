// Tab Chờ duyệt của /noi-dung (bước 4; §8.8; đề xuất 3.7 rút gọn theo mục 10: không có chế độ duyệt — duyệt bằng
// nút "Duyệt bài" trên banner của bài). Dữ liệu: GET /api/duyet/cho-duyet (ngày nhập mới nhất trước, cùng ngày theo
// thứ tự cây — server sắp).
// - Bảng chính "Bản nháp chờ duyệt": tên mục (link /hoc/:slug, lang=en) · lĩnh vực (mục nằm thẳng trong phần thì là
//   phần) · nguồn AI / Tự viết · Đủ khối co/tong (file lỗi: "Lỗi frontmatter") · ngày nhập dd/MM/yyyy · "Mở bài để
//   duyệt". Trống: "Không có bản nháp nào chờ duyệt" + "Nhập file .md" (§8.8).
// - Nhóm phụ "Bản sửa chờ duyệt (m)" (chỉ khi có): bài Đã duyệt có <slug>.ban-sua.md, mở bài để duyệt / bỏ.
// Tải lại mỗi lần mở tab và sau mọi lần ghi nội dung (khoá dưới tiền tố 'noi-dung').
import { useId } from 'react'
import { Link } from 'react-router'
import { CircleAlert, FileCheck } from 'lucide-react'
import { dinhDangNgay, dinhDangSo } from '../../../shared/dinh-dang'
import { layCay, type MucHoc } from '../../../shared/roadmap'
import { useChoDuyet, type DongBanNhapCho, type DongBanSuaCho } from '../../app/du-lieu/duyet'
import { NutLink } from '../../components/Nut'
import TenMuc from '../../components/TenMuc'
import TrangThaiTrong, { DongCho, TrangThaiLoi, VungDangTai } from '../../components/TrangThaiTrong'
import {
  LOP_BANG,
  LOP_H2,
  LOP_KHUNG_BANG,
  LOP_O,
  LOP_PHU,
  LOP_TH,
} from '../../components/duyet/lop-bang'
import {
  BAN_NHAP_CHO_DUYET,
  COT_CHO_DUYET,
  COT_MO_BAI,
  KHONG_TAI_CHO_DUYET,
  LOI_FILE_NHAP,
  MO_TA_BAN_SUA_CHO,
  MO_TA_CHO_DUYET,
} from '../../copy/cho-duyet-duyet'

/** Lĩnh vực của mục; mục nằm thẳng trong phần (không có lĩnh vực) thì là phần. */
function noiCua(m: MucHoc): string {
  return (m.linhVuc ?? m.phan).label
}

function OMuc({ muc }: { muc: MucHoc }) {
  return (
    <Link to={`/hoc/${muc.slug}`} className="font-medium text-text underline underline-offset-2">
      <TenMuc>{muc.label}</TenMuc>
    </Link>
  )
}

function NutMoBai({ muc }: { muc: MucHoc }) {
  return (
    <NutLink to={`/hoc/${muc.slug}`} bien="phu" co="nho">
      Mở bài để duyệt
      <span className="sr-only">
        {': '}
        <TenMuc>{muc.label}</TenMuc>
      </span>
    </NutLink>
  )
}

/** Dòng đã ghép với mục của cây (dòng có id không còn trong cây bị bỏ — server chỉ trả mục của cây). */
function ghepMuc<T extends { id: string }>(ds: readonly T[]): (T & { muc: MucHoc })[] {
  const cay = layCay()
  return ds.flatMap((d) => {
    const muc = cay.mucTheoId.get(d.id)
    return muc ? [{ ...d, muc }] : []
  })
}

function BangBanNhap({ ds, idTieuDe }: { ds: readonly DongBanNhapCho[]; idTieuDe: string }) {
  return (
    <div className={LOP_KHUNG_BANG}>
      <table aria-labelledby={idTieuDe} className={LOP_BANG}>
        <thead>
          <tr>
            <th scope="col" className={`${LOP_TH} text-left`}>
              {COT_CHO_DUYET.muc}
            </th>
            <th scope="col" className={`${LOP_TH} text-left`}>
              {COT_CHO_DUYET.linhVuc}
            </th>
            <th scope="col" className={`${LOP_TH} text-left`}>
              {COT_CHO_DUYET.nguon}
            </th>
            <th scope="col" className={`${LOP_TH} text-left`}>
              Đủ khối
            </th>
            <th scope="col" className={`${LOP_TH} text-left`}>
              Ngày nhập
            </th>
            <th scope="col" className={`${LOP_TH} text-left`}>
              <span className="sr-only">{COT_MO_BAI}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {ghepMuc(ds).map((d) => (
            <tr key={d.id} data-id={d.id}>
              <th scope="row" className={`${LOP_O} text-left font-normal`}>
                <OMuc muc={d.muc} />
              </th>
              <td className={`${LOP_O} text-left text-muted`}>
                <TenMuc>{noiCua(d.muc)}</TenMuc>
              </td>
              <td className={`${LOP_O} text-left`}>{d.nguon === 'ai' ? 'AI' : 'Tự viết'}</td>
              <td className={`${LOP_O} text-left tabular-nums`}>
                {d.coLoi ? (
                  <span className="inline-flex items-center gap-1 text-danger">
                    <CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" />
                    {LOI_FILE_NHAP}
                  </span>
                ) : (
                  `${dinhDangSo(d.duKhoi.co)}/${dinhDangSo(d.duKhoi.tong)}`
                )}
              </td>
              <td className={`${LOP_O} text-left tabular-nums`}>{dinhDangNgay(d.ngayNhap)}</td>
              <td className={`${LOP_O} text-right`}>
                <NutMoBai muc={d.muc} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BangBanSua({ ds, idTieuDe }: { ds: readonly DongBanSuaCho[]; idTieuDe: string }) {
  return (
    <div className={LOP_KHUNG_BANG}>
      <table aria-labelledby={idTieuDe} className={LOP_BANG}>
        <thead>
          <tr>
            <th scope="col" className={`${LOP_TH} text-left`}>
              {COT_CHO_DUYET.muc}
            </th>
            <th scope="col" className={`${LOP_TH} text-left`}>
              {COT_CHO_DUYET.linhVuc}
            </th>
            <th scope="col" className={`${LOP_TH} text-left`}>
              Ngày nhập
            </th>
            <th scope="col" className={`${LOP_TH} text-left`}>
              <span className="sr-only">{COT_MO_BAI}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {ghepMuc(ds).map((d) => (
            <tr key={d.id} data-id={d.id}>
              <th scope="row" className={`${LOP_O} text-left font-normal`}>
                <OMuc muc={d.muc} />
              </th>
              <td className={`${LOP_O} text-left text-muted`}>
                <TenMuc>{noiCua(d.muc)}</TenMuc>
              </td>
              <td className={`${LOP_O} text-left tabular-nums`}>{dinhDangNgay(d.ngayNhap)}</td>
              <td className={`${LOP_O} text-right`}>
                <NutMoBai muc={d.muc} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DangTai() {
  return (
    <VungDangTai className="flex max-w-[960px] flex-col gap-3">
      {[0, 1, 2, 3].map((i) => (
        <DongCho key={i} rong="100%" cao={20} />
      ))}
    </VungDangTai>
  )
}

export default function TabChoDuyet() {
  const id = useId()
  const q = useChoDuyet()

  if (q.isPending) return <DangTai />
  if (q.isError) {
    return (
      <TrangThaiLoi
        khung
        cauChinh={KHONG_TAI_CHO_DUYET}
        thuLai={() => void q.refetch()}
        className="max-w-[720px] bg-surface"
      />
    )
  }

  const { banNhap, banSua } = q.data
  const idNhap = `${id}ban-nhap`
  const idSua = `${id}ban-sua`
  return (
    <div className="flex max-w-[1200px] flex-col gap-10">
      <section aria-labelledby={idNhap} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={idNhap} className={LOP_H2}>
            {BAN_NHAP_CHO_DUYET} ({dinhDangSo(banNhap.length)})
          </h2>
          {banNhap.length > 0 && <p className={LOP_PHU}>{MO_TA_CHO_DUYET}</p>}
        </div>
        {banNhap.length === 0 ? (
          <TrangThaiTrong
            icon={FileCheck}
            cauChinh="Không có bản nháp nào chờ duyệt"
            khung
            className="max-w-[720px] bg-surface"
            nut={
              <NutLink to={{ search: '?tab=nhap' }} replace bien="phu">
                Nhập file .md
              </NutLink>
            }
          />
        ) : (
          <BangBanNhap ds={banNhap} idTieuDe={idNhap} />
        )}
      </section>

      {banSua.length > 0 && (
        <section aria-labelledby={idSua} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id={idSua} className={LOP_H2}>
              Bản sửa chờ duyệt ({dinhDangSo(banSua.length)})
            </h2>
            <p className={LOP_PHU}>{MO_TA_BAN_SUA_CHO}</p>
          </div>
          <BangBanSua ds={banSua} idTieuDe={idSua} />
        </section>
      )}
    </div>
  )
}
