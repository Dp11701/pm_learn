// Khối "Vừa nhập" sau khi bấm "Nhập n file" (thay cho bảng đã xoá): link tới từng bài vừa nhập để đọc ngay
// (phase 2b: "Claude soạn → kéo thả → đọc bài"), mỗi dòng ghi file vào đâu: Bản nháp, bản sửa (`.ban-sua.md`,
// trang bài vẫn hiện bản Đã duyệt) hay Đã duyệt (◎ "Nhận là Đã duyệt"). Tab Chờ duyệt (phase 7a) sẽ là nơi duyệt
// các bài này. Hoàn tác (toast) hoặc lần thả mới thì khối biến mất.
import type { Ref } from 'react'
import { Link } from 'react-router'
import { layCay } from '../../../shared/roadmap'
import type { PhanHoiThucHien } from '../../app/du-lieu/nhap'
import TenMuc from '../TenMuc'
import { VUA_NHAP, VUA_NHAP_MO_TA, VUA_NHAP_THANH } from '../../copy/cho-duyet'

/** File vừa nhập thành gì. */
export type BanVuaNhap = keyof typeof VUA_NHAP_THANH

export type DongVuaNhap = PhanHoiThucHien['daNhap'][number] & { ban: BanVuaNhap }

/**
 * Suy từ kết quả thuc-hien + dòng kiểm tra: ghi vào `.ban-sua.md` → bản sửa; dòng ◎ (đã tick "Nhận là Đã
 * duyệt") → Đã duyệt; còn lại → Bản nháp (server ép ban-nhap).
 */
export function banCua(duongDan: string, loaiDong: string | undefined): BanVuaNhap {
  if (duongDan.endsWith('.ban-sua.md')) return 'ban-sua'
  return loaiDong === 'chua-chup' ? 'da-duyet' : 'ban-nhap'
}

export default function VuaNhap({
  daNhap,
  tieuDeRef,
}: {
  daNhap: readonly DongVuaNhap[]
  tieuDeRef?: Ref<HTMLHeadingElement>
}) {
  const cay = layCay()
  return (
    <section
      aria-labelledby="vua-nhap"
      className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-surface p-4"
    >
      <h2
        id="vua-nhap"
        ref={tieuDeRef}
        tabIndex={-1}
        className="m-0 text-[17px] leading-7 font-semibold outline-none"
      >
        {VUA_NHAP}
      </h2>
      <p className="m-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
        {VUA_NHAP_MO_TA}
      </p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {daNhap.map((d) => {
          const muc = cay.mucTheoId.get(d.mucId)
          return (
            <li
              key={`${d.chiSo}-${d.mucId}`}
              data-ban={d.ban}
              className="flex min-w-0 flex-wrap items-baseline gap-x-2"
            >
              {muc ? (
                <Link to={`/hoc/${muc.slug}`} className="text-text underline underline-offset-2">
                  <TenMuc>{muc.label}</TenMuc>
                </Link>
              ) : null}
              <span className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)]">
                <span aria-hidden="true" className="text-muted">
                  ·{' '}
                </span>
                {VUA_NHAP_THANH[d.ban]}
              </span>
              <span className="font-mono text-xs break-all text-muted">{d.duongDan}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
