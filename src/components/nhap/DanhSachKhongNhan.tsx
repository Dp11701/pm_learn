// File bị bỏ ở phía trình duyệt trước khi gửi kiểm tra (đề xuất 1.7 bước 1): không phải .md ("Chỉ nhận file .md"),
// lớn hơn 256 KB, tên quá dài, không đọc được UTF-8. Hiện tối đa 10 dòng, còn lại gộp "… và n file khác".
import { dinhDangSo } from '../../../shared/dinh-dang'
import { LY_DO_KHONG_NHAN, khongNhanFile, vaFileKhac } from '../../copy/cho-duyet'
import { TOI_DA_BYTE_BAI, TOI_DA_TEN, soKb, type LyDoKhongNhan, type TepKhongNhan } from './doc-tep'

export const SO_DONG_HIEN = 10

export function chuLyDo(lyDo: LyDoKhongNhan): string {
  switch (lyDo) {
    case 'khong-phai-md':
      return 'Chỉ nhận file .md'
    case 'qua-lon':
      return LY_DO_KHONG_NHAN.quaLon(soKb(TOI_DA_BYTE_BAI))
    case 'ten-qua-dai':
      return LY_DO_KHONG_NHAN.tenQuaDai(TOI_DA_TEN)
    case 'khong-doc-duoc':
      return LY_DO_KHONG_NHAN.khongDocDuoc
  }
}

export default function DanhSachKhongNhan({ ds }: { ds: readonly TepKhongNhan[] }) {
  if (ds.length === 0) return null
  const hien = ds.slice(0, SO_DONG_HIEN)
  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-[length:var(--fs-meta)] leading-[var(--lh-meta)]">
      <strong className="font-semibold">{khongNhanFile(dinhDangSo(ds.length))}</strong>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {hien.map((t, i) => (
          <li key={`${t.duongDan ?? t.ten}-${i}`} className="min-w-0 break-words">
            <span className="font-mono text-xs break-all">{t.duongDan ?? t.ten}</span>
            <span className="text-muted"> — {chuLyDo(t.lyDo)}</span>
          </li>
        ))}
      </ul>
      {ds.length > hien.length && (
        <span className="text-muted">{vaFileKhac(dinhDangSo(ds.length - hien.length))}</span>
      )}
    </div>
  )
}
