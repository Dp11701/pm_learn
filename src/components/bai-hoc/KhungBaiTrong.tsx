// Khung bài của mục chưa có nội dung (F17, F18, §8.7): "Khung bài · mẫu <loại>" + "0/n khối bắt buộc", mỗi
// khối của mẫu là một ô nét đứt 1,5px (nét đứt = "chưa có", §5.1), cao ≥ 56 (mobile 48), bo 10: tên khối 600
// + " ★" (bắt buộc) hoặc " · tuỳ chọn", bên phải "Chưa có". Khối 7 của Chủ đề ghi đủ 3 tên (D13).
// Gồm các khối viết trong file và khối do app tạo mà bài đọc (Bản của tôi, Kế hoạch thi, Mục liên quan);
// bỏ "Nói lại bằng lời của bạn" (chữ của người học, không thuộc bài) và khối P2.
import { MAU_BAI, cacTen, duKhoiChuaCo, type KhoiMau } from '../../../shared/noi-dung'
import { TEN_LOAI } from '../../../shared/domain/trang-thai'
import type { MauBai } from '../../../shared/roadmap'
import { dinhDangSo } from '../../../shared/dinh-dang'
import { BAT_BUOC } from '../../copy/cho-duyet'

/** Khối hiện trên khung bài trống của một mẫu. */
export function khoiKhungBai(mau: MauBai): KhoiMau[] {
  return MAU_BAI[mau].khoi.filter((k) => k.kieu !== 'noi-lai' && k.uuTien !== 'P2')
}

export default function KhungBaiTrong({ mau }: { mau: MauBai }) {
  const { co, tong } = duKhoiChuaCo(mau)
  return (
    <section aria-labelledby="khung-bai" className="flex flex-col gap-3 max-md:gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id="khung-bai" className="m-0 text-[17px] leading-7 font-semibold">
          Khung bài<span className="max-md:hidden"> · mẫu {TEN_LOAI[mau]}</span>
        </h2>
        <span className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted tabular-nums">
          {dinhDangSo(co)}/{dinhDangSo(tong)} khối bắt buộc
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0 max-md:gap-2">
        {khoiKhungBai(mau).map((k) => (
          <li
            key={k.id}
            data-khoi={k.id}
            className="flex min-h-14 items-center gap-3 rounded-[var(--radius-md)] border-[1.5px] border-dashed border-border-input px-4 py-3 max-md:min-h-12 max-md:gap-2 max-md:px-3.5 max-md:py-2.5 max-md:text-[length:var(--fs-ui)] max-md:leading-[var(--lh-ui)]"
          >
            <span className="min-w-0 flex-1 font-semibold max-md:font-normal">
              {cacTen(k).join(' · ')}
              {k.batBuoc ? (
                <>
                  <span aria-hidden="true" className="font-normal text-muted">
                    {' '}
                    ★
                  </span>
                  <span className="sr-only"> ({BAT_BUOC})</span>
                </>
              ) : (
                <span className="font-normal text-muted"> · tuỳ chọn</span>
              )}
            </span>
            <span className="shrink-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
              Chưa có
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
