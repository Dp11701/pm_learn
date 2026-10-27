// Cột phải của trang bài ≥ 1280 (F11 §8.5 "Cột phải (dính khi cuộn)"; phạm vi rút gọn 27/10/2026 bỏ card đồng hồ):
// từ trên xuống: card tab [Mục lục | Trong lĩnh vực] · Ghi chú (C24) · Flashcard (C22, neo #flashcard), cách 24.
// Bề rộng 320 (≥ 1440) / 280 (1280–1439), dính cách đỉnh 24; cao hơn cửa sổ thì cột tự cuộn (thanh cuộn nằm ngoài
// 320 / 280, trong lề trang — be-rong-bai.ts).
import type { Cay, MucHoc } from '../../../../shared/roadmap'
import type { DongMucLuc } from '../../../components/bai-hoc/MucLuc'
import type { TraTrangThai } from '../../../components/bai-hoc/kieu'
import TheGhiChu from '../../../components/ghi-chu/TheGhiChu'
import TheFlashcard from '../../../components/the/TheFlashcard'
import {
  LOP_CARD_COT_PHAI,
  LOP_COT_PHAI,
  LOP_CUON_COT_PHAI,
  LOP_RUOT_COT_PHAI,
} from './be-rong-bai'
import TheDieuHuong from './TheDieuHuong'

export interface PropsCotPhai {
  muc: MucHoc
  cay: Cay
  /** null: bài đang tải */
  mucLuc: readonly DongMucLuc[] | null
  trangThaiCua: TraTrangThai
}

export default function CotPhai({ muc, cay, mucLuc, trangThaiCua }: PropsCotPhai) {
  return (
    <aside aria-label="Công cụ của bài" className={LOP_COT_PHAI}>
      <div className={LOP_CUON_COT_PHAI}>
        <div className={LOP_RUOT_COT_PHAI}>
          <section className={LOP_CARD_COT_PHAI}>
            <TheDieuHuong muc={muc} cay={cay} mucLuc={mucLuc} trangThaiCua={trangThaiCua} />
          </section>
          <TheGhiChu itemId={muc.id} />
          <TheFlashcard muc={muc} />
        </div>
      </div>
    </aside>
  )
}
