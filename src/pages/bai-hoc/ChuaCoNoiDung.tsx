// Mục chưa có nội dung (F17, F18, §8.7): card icon file-x 20 trong vòng 40 + "Mục này chưa có nội dung." +
// câu §8.7 (+ câu F17, F18 bỏ trên mobile) + 3 nút "Soạn bài" (chính, trình soạn phase 7b) · "Nhập file .md"
// (tab Nhập phase 2b, gán sẵn mục) · "Sao chép prompt soạn bài" (F19 trái, D14). Bên dưới là khung các khối
// của mẫu dạng ô nét đứt "Chưa có" (KhungBaiTrong). Không có câu nào giải thích về mục (§8.7).
// Desktop: nút thụt 56 thẳng chữ; mobile: padding 16, nút full-width cao 44 xếp dọc (F18).
import { FileX } from 'lucide-react'
import type { Cay, MucHoc } from '../../../shared/roadmap'
import HopThoaiPrompt from '../../components/HopThoaiPrompt'
import Nut, { NutLink } from '../../components/Nut'
import KhungBaiTrong from '../../components/bai-hoc/KhungBaiTrong'
import { duongDanNhap, duongDanSoan } from '../../components/bai-hoc/dinh-vi'

export default function ChuaCoNoiDung({ muc, cay }: { muc: MucHoc; cay: Cay }) {
  return (
    <>
      <section
        aria-labelledby="chua-co-noi-dung"
        className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-border bg-surface p-6 max-md:gap-3 max-md:p-4"
      >
        <div className="flex items-start gap-4 max-md:gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <FileX size={20} strokeWidth={1.75} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="chua-co-noi-dung" className="m-0 text-[17px] leading-7 font-semibold">
              Mục này chưa có nội dung.
            </h2>
            <p className="m-0 text-muted max-md:text-[length:var(--fs-ui)] max-md:leading-[var(--lh-ui)]">
              Roadmap gốc chỉ có tên mục — bài học do bạn soạn hoặc duyệt.
              <span className="max-md:hidden">
                {' '}
                Bạn vẫn đổi trạng thái, bấm giờ và ghi chú được.
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pl-14 max-md:flex-col max-md:pl-0">
          <NutLink to={duongDanSoan(muc)} bien="chinh">
            Soạn bài
          </NutLink>
          <NutLink to={duongDanNhap(muc)} bien="phu">
            Nhập file .md
          </NutLink>
          <HopThoaiPrompt
            muc={muc}
            cay={cay}
            nutMo={<Nut bien="phu">Sao chép prompt soạn bài</Nut>}
          />
        </div>
      </section>
      <KhungBaiTrong mau={muc.mau} />
    </>
  )
}
