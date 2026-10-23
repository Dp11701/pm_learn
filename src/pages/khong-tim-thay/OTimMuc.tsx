// Ô tìm của trang 404 (F26, F26b): tìm ngay trong trang theo tên mục học (shared/tim-kiem, như C28 tối
// giản của phase 1). Enter mở kết quả đầu, Esc xoá chữ; bỏ qua khi Telex/VNI đang ghép chữ.
import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Search } from 'lucide-react'
import type { Cay } from '../../../shared/roadmap'
import { dinhDangSo } from '../../../shared/dinh-dang'
import { tachDoan, taoChiMuc, timKiem, type ChiMuc } from '../../../shared/tim-kiem'
import TenMuc from '../../components/TenMuc'
import { dangGhepChu } from '../../components/TruongNhap'

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
  const ketQua = useMemo(
    () => timKiem(chiMucCua(cay), truyVan, { toiDaCauTruc: 0, toiDaMucHoc: SO_KET_QUA }).mucHoc,
    [cay, truyVan],
  )
  const coTruyVan = truyVan.trim() !== ''

  function khiPhim(e: KeyboardEvent<HTMLInputElement>) {
    if (dangGhepChu(e) || e.altKey || e.ctrlKey || e.metaKey) return
    if (e.key === 'Enter' && ketQua[0]) {
      e.preventDefault()
      dieuHuong(`/hoc/${ketQua[0].nut.slug}`)
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
          className="min-w-0 flex-1 border-0 bg-transparent text-[length:var(--fs-ui)] leading-[var(--lh-ui)] text-text placeholder:text-muted focus-visible:outline-none! max-md:text-[length:var(--fs-body-m)] max-md:leading-[var(--lh-body-m)]"
        />
      </label>
      {coTruyVan &&
        (ketQua.length > 0 ? (
          <ul
            id={idKetQua}
            aria-label="Kết quả tìm mục"
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
        ) : (
          <p
            id={idKetQua}
            className="m-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted"
          >
            Không có kết quả. Thử tên tiếng Anh hoặc viết tắt.
          </p>
        ))}
    </div>
  )
}
