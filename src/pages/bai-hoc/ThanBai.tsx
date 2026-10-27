// Thân bài có nội dung (F11, F12, F15; đề xuất 1.5, 3.6): chữ trước khối ## đầu tiên, rồi từng ô của bố cục
// (bo-cuc.ts) theo thứ tự mẫu, các khối cách 40 (mobile 24).
// - Khối theo quy ước (cauTruc.hopLe): Khái niệm cốt lõi → đoạn mở + danh sách định nghĩa + đoạn kết; Góc dev
//   lead → PM → callout 2 cột C19; Tự kiểm tra → mỗi câu một C21 (trả lời, Xem đáp án, tự chấm, Tạo flashcard);
//   Mẫu điền sẵn → C17 cơ bản. Viết khác quy ước (hopLe = false) và mọi khối khác → Markdown thường (đã làm
//   sạch). Tóm tắt là card (F11).
// - Thực hành trên dự án thật → C20 luôn có phần làm bài (dự án, kết quả, Xong / Không áp dụng) để bước Áp dụng
//   làm được; khối viết khác quy ước thì thân khối là Markdown thường, không có ô tick tiêu chí.
// - Khối ★ chưa có chữ → ô "Chưa có …" (không có "Thêm": trình soạn đã bỏ; riêng Thực hành → KhoiApp: phần làm bài +
//   ô "Chưa có đề bài"); khối do app tạo → KhoiApp (Nói lại; Bản của tôi, Kế hoạch thi của tôi là thẻ Thực hành của
//   bước Áp dụng); Mục liên quan → danh sách từ lien_quan.
// - cacKhoaCauHoi: khoá các câu hiện thành C21 — nguồn duy nhất cho bước Kiểm tra (thanh 4 bước ở DauBai, F19).
import { Fragment, useMemo } from 'react'
import type { KetQuaBai } from '../../../shared/noi-dung'
import type { Cay, MucHoc } from '../../../shared/roadmap'
import BangMau from '../../components/bai-hoc/BangMau'
import Callout from '../../components/bai-hoc/Callout'
import KhoiTuKiemTra, { CauTraLoiCuCuaMuc } from '../../components/bai-hoc/CauTuKiemTra'
import DanhSachLienQuan from '../../components/bai-hoc/DanhSachLienQuan'
import DanhSachDinhNghia from '../../components/bai-hoc/DinhNghia'
import KhoiBai, { OKhoiThieu } from '../../components/bai-hoc/KhoiBai'
import MarkdownBai from '../../components/bai-hoc/Markdown'
import TheThucHanh from '../../components/bai-hoc/TheThucHanh'
import type { TraTrangThai } from '../../components/bai-hoc/kieu'
import type { OHien } from './bo-cuc'
import KhoiApp from './KhoiApp'

type OApp = Extract<OHien, { loai: 'app' }>

interface PropsOKhoiApp {
  o: OApp
  muc: MucHoc
  cay: Cay
  trangThaiCua: TraTrangThai
  lienQuan: readonly MucHoc[]
}

function OKhoiApp({ o, muc, cay, trangThaiCua, lienQuan }: PropsOKhoiApp) {
  if (o.mau.kieu === 'muc-lien-quan') {
    return (
      <KhoiBai id={o.id} tieuDe={o.ten}>
        <DanhSachLienQuan cacMuc={lienQuan} cay={cay} trangThaiCua={trangThaiCua} />
      </KhoiBai>
    )
  }
  return <KhoiApp khoi={o.mau} muc={muc} />
}

/** Khoá các câu Tự kiểm tra hiện thành C21 (khối theo quy ước), theo thứ tự bài; [] khi bài không có câu nào. */
export function cacKhoaCauHoi(cac: readonly OHien[]): string[] {
  return cac.flatMap((o) =>
    o.loai === 'khoi' && o.khoi.cauTruc?.kieu === 'tu-kiem-tra' && o.khoi.cauTruc.hopLe
      ? o.khoi.cauTruc.cauHoi.map((c) => c.khoa)
      : [],
  )
}

/**
 * Ô nhận "Câu trả lời cho câu hỏi cũ (n)": khối Tự kiểm tra hợp lệ đầu tiên; không có thì khối Tự kiểm tra viết khác
 * quy ước (vẽ Markdown thường — câu trả lời của nó không còn chỗ hiện), rồi ô "Chưa có Tự kiểm tra".
 */
function oNhanCauCu(cac: readonly OHien[]): string | undefined {
  const laTuKiemTra = (o: OHien) =>
    o.loai === 'khoi' ? o.khoi.cauTruc?.kieu === 'tu-kiem-tra' : o.mau.kieu === 'tu-kiem-tra'
  return (
    cac.find((o) => o.loai === 'khoi' && laTuKiemTra(o) && o.khoi.cauTruc?.hopLe)?.id ??
    cac.find((o) => o.loai !== 'app' && laTuKiemTra(o))?.id
  )
}

function OKhoi({
  o,
  muc,
  khoaTrongBai,
}: {
  o: Extract<OHien, { loai: 'khoi' }>
  muc: MucHoc
  /** Chỉ ô nhận câu cũ (oNhanCauCu) nhận: khoá các câu đang hiện thành C21 → "Câu trả lời cho câu hỏi cũ (n)" */
  khoaTrongBai?: readonly string[]
}) {
  const { khoi, ten, id } = o
  const ct = khoi.cauTruc
  const md = (chu: string) => (
    <MarkdownBai muc={muc} tenKhoi={ten}>
      {chu}
    </MarkdownBai>
  )
  const cauCu = khoaTrongBai && <CauTraLoiCuCuaMuc muc={muc} khoaTrongBai={khoaTrongBai} />
  if (ct?.hopLe) {
    switch (ct.kieu) {
      case 'dinh-nghia':
        // F11: đoạn mở rồi danh sách; đoạn kết (nếu có) sau danh sách — không bỏ sót chữ nào của khối.
        return (
          <KhoiBai id={id} tieuDe={ten}>
            {ct.truoc && md(ct.truoc.noiDung)}
            <DanhSachDinhNghia dinhNghia={ct.dinhNghia} muc={muc} tenKhoi={ten} />
            {ct.sau && md(ct.sau.noiDung)}
          </KhoiBai>
        )
      case 'goc-dev-lead':
        return (
          <KhoiBai id={id} tieuDe={ten}>
            <Callout mucCon={ct.mucCon} muc={muc} tenKhoi={ten} />
          </KhoiBai>
        )
      case 'thuc-hanh':
        return (
          <TheThucHanh id={id} tieuDe={ten} muc={muc} mucCon={ct.mucCon} tieuChi={ct.tieuChi} />
        )
      case 'tu-kiem-tra':
        return (
          <KhoiTuKiemTra
            id={id}
            tieuDe={ten}
            cauHoi={ct.cauHoi}
            muc={muc}
            khoaTrongBai={khoaTrongBai}
          />
        )
      case 'mau-dien-san':
        if (!ct.bang) break
        return (
          <KhoiBai id={id} tieuDe={ten}>
            {ct.truoc && md(ct.truoc.noiDung)}
            <BangMau bang={ct.bang} muc={muc} tenKhoi={ten} />
            {ct.sau && md(ct.sau.noiDung)}
          </KhoiBai>
        )
      default:
        break
    }
  }
  // Thực hành viết khác quy ước: vẫn có phần làm bài, thân khối là Markdown thường
  if (o.mau?.kieu === 'thuc-hanh') {
    return (
      <TheThucHanh
        id={id}
        tieuDe={ten}
        muc={muc}
        mucCon={null}
        tieuChi={[]}
        noiDung={khoi.noiDung}
      />
    )
  }
  return (
    <KhoiBai id={id} tieuDe={ten} card={o.mau?.id === 'tom-tat'}>
      {md(khoi.noiDung)}
      {cauCu}
    </KhoiBai>
  )
}

export interface PropsThanBai {
  muc: MucHoc
  cay: Cay
  bai: KetQuaBai
  cacO: readonly OHien[]
  lienQuan: readonly MucHoc[]
  trangThaiCua: TraTrangThai
}

export default function ThanBai({ muc, cay, bai, cacO, lienQuan, trangThaiCua }: PropsThanBai) {
  // Câu nào không hiện thành C21 (đổi chữ, bị bỏ, khối viết khác quy ước) là "câu cũ": luôn có một chỗ hiện
  const khoaTrongBai = useMemo(() => cacKhoaCauHoi(cacO), [cacO])
  const idNhanCauCu = oNhanCauCu(cacO)
  return (
    <>
      {bai.dauBai && (
        <MarkdownBai muc={muc} tenKhoi={muc.label}>
          {bai.dauBai.noiDung}
        </MarkdownBai>
      )}
      {cacO.map((o) => {
        switch (o.loai) {
          case 'thieu':
            // Thực hành thiếu: vẫn có phần làm bài (bước Áp dụng), thay đề bài bằng ô "Chưa có"
            return o.mau.kieu === 'thuc-hanh' ? (
              <KhoiApp key={o.id} khoi={o.mau} muc={muc} />
            ) : (
              <Fragment key={o.id}>
                <OKhoiThieu id={o.id} ten={o.ten} />
                {o.id === idNhanCauCu && (
                  <CauTraLoiCuCuaMuc muc={muc} khoaTrongBai={khoaTrongBai} />
                )}
              </Fragment>
            )
          case 'app':
            return (
              <OKhoiApp
                key={o.id}
                o={o}
                muc={muc}
                cay={cay}
                trangThaiCua={trangThaiCua}
                lienQuan={lienQuan}
              />
            )
          default:
            return (
              <OKhoi
                key={o.id}
                o={o}
                muc={muc}
                khoaTrongBai={o.id === idNhanCauCu ? khoaTrongBai : undefined}
              />
            )
        }
      })}
    </>
  )
}
