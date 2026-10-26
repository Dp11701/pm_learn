// /hoc/:slug/ban-cua-toi/:id — "Bản của tôi" của bài Tài liệu (phase 7c, đề xuất 3.6, §8.6 khối 7). Slug phải
// là mục học mẫu Tài liệu (chỉ mẫu này có khối Bản của tôi); không phải → 404 có gợi ý. `id` là bản trong
// doc_versions, phase 7c mới kiểm (phase 1 chưa có dữ liệu). Phase 1: H1 + tên bài + "Có ở phase 7c".
import { useParams } from 'react-router'
import type { MucHoc } from '../../shared/roadmap'
import { useThanhTrenMobile } from '../app/khung/thanh-tren'
import ChipLoai from '../components/trang-thai/ChipLoai'
import TenMuc from '../components/TenMuc'
import { timMucHoc } from './chung'
import KhongTimThay from './KhongTimThay'
import TrangSapCo from './TrangSapCo'
import { MO_TA_SAP_CO } from '../copy/cho-duyet'

function BanCuaToiSapCo({ muc }: { muc: MucHoc }) {
  const den = `/hoc/${muc.slug}`
  // Top bar mobile: "‹ tên bài" (D6).
  useThanhTrenMobile({ capCha: { ten: muc.label, den, tiengAnh: true } })
  return (
    <TrangSapCo
      tenTrang={`Bản của tôi · ${muc.label}`}
      tieuDe="Bản của tôi"
      truocTieuDe={<ChipLoai loai="tai-lieu" />}
      sauTieuDe={
        <p className="m-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
          <TenMuc>{muc.label}</TenMuc>
        </p>
      }
      phase="7c"
      moTa={MO_TA_SAP_CO.banCuaToi}
      diTiep={{ nhan: 'Về bài', den }}
    />
  )
}

export default function TrangBanCuaToi() {
  const muc = timMucHoc(useParams().slug)
  if (muc?.mau !== 'tai-lieu') return <KhongTimThay />
  return <BanCuaToiSapCo muc={muc} />
}
