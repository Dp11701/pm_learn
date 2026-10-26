// Ô tìm của trang 404 (F26, F26b): tìm ngay trong trang theo tên mục học (shared/tim-kiem, như C28 tối
// giản của phase 1). Enter mở kết quả đầu, Esc xoá chữ; bỏ qua khi Telex/VNI đang ghép chữ.
// Danh sách là link thường (không phải listbox), nên dòng "Enter mở: …" (aria-describedby của ô) nói rõ
// Enter mở mục nào; số kết quả / "Không có kết quả" báo qua vùng status khi ngừng gõ (ThongBaoKetQua).
import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Search } from 'lucide-react'
import type { Cay } from '../../../shared/roadmap'
import { dinhDangSo } from '../../../shared/dinh-dang'
import { tachDoan, taoChiMuc, timKiem, type ChiMuc } from '../../../shared/tim-kiem'
import TenMuc from '../../components/TenMuc'
import { dangGhepChu } from '../../components/TruongNhap'
import ThongBaoKetQua, { GOI_Y_KHONG_CO_KET_QUA } from '../../components/tim-kiem/ThongBaoKetQua'
import { ENTER_MO, khongCoKetQua404, TEN_DS_KET_QUA_404 } from '../../copy/cho-duyet'

const SO_KET_QUA = 6

const boNho = new WeakMap<Cay, ChiMuc>()
function chiMucCua(cay: Cay): ChiMuc {
  let cm = boNho.get(cay)
  if (!cm) {
    cm = taoChiMuc(cay)
    boNho.set(cay, cm)
  }
  return cm
}

export default function OTimMuc({ cay }: { cay: Cay }) {
  const [truyVan, datTruyVan] = useState('')
  const dieuHuong = useNavigate()
  const idKetQua = useId()
  const idEnterMo = useId()
  // Đếm mọi kết quả để báo đúng số (như popover tìm kiếm), chỉ hiện SO_KET_QUA kết quả đầu.
  const tatCa = useMemo(
    () =>
      timKiem(chiMucCua(cay), truyVan, {
        toiDaCauTruc: 0,
        toiDaMucHoc: Number.MAX_SAFE_INTEGER,
      }).mucHoc,
    [cay, truyVan],
  )
  const ketQua = tatCa.slice(0, SO_KET_QUA)
  const coTruyVan = truyVan.trim() !== ''
  const dau = ketQua[0]?.nut

  function khiPhim(e: KeyboardEvent<HTMLInputElement>) {
    if (dangGhepChu(e) || e.altKey || e.ctrlKey || e.metaKey) return
    if (e.key === 'Enter' && dau) {
      e.preventDefault()
      dieuHuong(`/hoc/${dau.slug}`)
    } else if (e.key === 'Escape' && truyVan !== '') {
      e.preventDefault()
      datTruyVan('')
    }
  }

  return (
    <div role="search" className="flex w-full max-w-[400px] flex-col gap-2 max-md:max-w-none">
      <label className="flex h-[var(--h-control)] items-center gap-2 rounded-[var(--radius-sm)] border border-border-input bg-surface px-3 text-muted transition-colors duration-150 hover:border-text has-[input:focus-visible]:border-text has-[input:focus-visible]:[outline-offset:var(--focus-offset)] has-[input:focus-visible]:[outline:var(--focus-ring)] max-md:h-[var(--h-control-touch)]">
        <Search size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
        <span className="sr-only">Tìm mục</span>
        <input
          type="text"
          value={truyVan}
          onChange={(e) => datTruyVan(e.target.value)}
          onKeyDown={khiPhim}
          placeholder={`Tìm trong ${dinhDangSo(cay.soMucHoc)} mục…`}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-controls={coTruyVan ? idKetQua : undefined}
          aria-describedby={coTruyVan && dau ? idEnterMo : undefined}
          className="min-w-0 flex-1 border-0 bg-transparent text-[length:var(--fs-ui)] leading-[var(--lh-ui)] text-text placeholder:text-muted focus-visible:outline-none! max-md:text-[length:var(--fs-body-m)] max-md:leading-[var(--lh-body-m)]"
        />
      </label>
      {coTruyVan &&
        (dau ? (
          <>
            <ul
              id={idKetQua}
              aria-label={TEN_DS_KET_QUA_404}
              className="m-0 flex list-none flex-col rounded-[var(--radius-md)] border border-border bg-surface p-1 text-left"
            >
              {ketQua.map((kq) => (
                <li key={kq.nut.id}>
                  <Link
                    to={`/hoc/${kq.nut.slug}`}
                    className="flex flex-col rounded-[var(--radius-sm)] px-3 py-2 text-text no-underline transition-colors duration-150 hover:bg-surface-2 max-md:min-h-[var(--h-control-touch)]"
                  >
                    <TenMuc>
                      {tachDoan(kq.nut.label, kq.doanTen).map((m, i) =>
                        m.khop ? (
                          <strong key={i} className="font-bold">
                            {m.chu}
                          </strong>
                        ) : (
                          <span key={i}>{m.chu}</span>
                        ),
                      )}
                    </TenMuc>
                    <TenMuc className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
                      {kq.chuoiCha.map((n) => n.label).join(' › ')}
                    </TenMuc>
                  </Link>
                </li>
              ))}
            </ul>
            <p
              id={idEnterMo}
              // Như chân C28: gợi ý phím cứng chỉ hiện từ 768; mobile vẫn là mô tả của ô cho trình đọc
              className="m-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted max-md:sr-only"
            >
              {ENTER_MO} <TenMuc>{dau.label}</TenMuc>
            </p>
          </>
        ) : (
          <p
            id={idKetQua}
            className="m-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted"
          >
            {khongCoKetQua404(GOI_Y_KHONG_CO_KET_QUA)}
          </p>
        ))}
      <ThongBaoKetQua truyVan={truyVan} soKetQua={tatCa.length} tenEnterMo={dau?.label} />
    </div>
  )
}
