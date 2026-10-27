// F19 phải "Đã xong khi còn thiếu bước" (§1 "không chặn cứng"; đề xuất 3.1, 3.2; quyết định 10): alertdialog 520
// "Đánh dấu <tên> là Đã xong?" + "Bài còn n bước chưa xong. …" + danh sách 4 bước (chấm C10 + tên + câu 3.2 bên
// phải; bước thiếu chữ 600) + "Vẫn đánh dấu Đã xong" (phụ) / "Quay lại học tiếp" (chính, focus sẵn). Esc = Quay
// lại; bấm ra ngoài không đóng.
// useXacNhanDaXong: trang bài gọi `xacNhan(lam)` ở MỌI đường đặt Đã xong (segmented, phím 3, "Đã xong, sang bài
// tiếp"): còn bước thiếu → mở dialog, chỉ chạy `lam` khi chọn "Vẫn đánh dấu Đã xong"; đủ bước hoặc mục đã Đã xong →
// chạy `lam` ngay. Dữ liệu học (GET /api/hoc/:id) hoặc bài còn đang tải → HOÃN: giữ `lam`, tải xong mới quyết (hồi quy
// review: bấm `]` rồi `3` ngay từng đặt Đã xong mà không qua F19). Tải dữ liệu học lỗi → chạy `lam` ngay (không chặn
// người học vì lỗi tải — lệch đã ghi Chờ duyệt).
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { CAC_BUOC, TEN_BUOC, type Buoc } from '../../../shared/domain/trang-thai'
import type { KetQuaBonBuoc } from '../../../shared/domain/bon-buoc'
import { dinhDangSo } from '../../../shared/dinh-dang'
import type { MucHoc } from '../../../shared/roadmap'
import { useBonBuoc, useHoc } from '../../app/du-lieu/hoc'
import { useTrangThai } from '../../app/du-lieu/trang-thai'
import HopThoai from '../HopThoai'
import Nut from '../Nut'
import TenMuc from '../TenMuc'
import { ChamBuoc } from '../trang-thai/ThanhBonBuoc'

export interface PropsHopThoaiDaXong {
  mo: boolean
  muc: MucHoc
  ketQua: KetQuaBonBuoc
  /** Bước hiện trong danh sách (bỏ Kiểm tra khi chưa biết câu hỏi của bài) */
  cacBuoc: readonly Buoc[]
  /** Bước còn thiếu (n của "Bài còn n bước chưa xong") */
  cacBuocThieu: readonly Buoc[]
  /** "Quay lại học tiếp", Esc */
  khiQuayLai: () => void
  /** "Vẫn đánh dấu Đã xong" */
  khiVanDanhDau: () => void
}

export default function HopThoaiDaXong({
  mo,
  muc,
  ketQua,
  cacBuoc,
  cacBuocThieu,
  khiQuayLai,
  khiVanDanhDau,
}: PropsHopThoaiDaXong) {
  const refQuayLai = useRef<HTMLButtonElement>(null)
  return (
    <HopThoai
      mo={mo}
      doiMo={(m) => {
        if (!m) khiQuayLai()
      }}
      vaiTro="alertdialog"
      tieuDe={
        <>
          Đánh dấu <TenMuc>{muc.label}</TenMuc> là Đã xong?
        </>
      }
      moTa={`Bài còn ${dinhDangSo(cacBuocThieu.length)} bước chưa xong. Bạn vẫn có thể đánh dấu, nhưng tiến độ sẽ không phản ánh đủ những gì bạn đã luyện.`}
      focusDau={refQuayLai}
      chan={
        <>
          <Nut bien="phu" onClick={khiVanDanhDau} className="md:h-10 md:px-4">
            Vẫn đánh dấu Đã xong
          </Nut>
          <Nut ref={refQuayLai} bien="chinh" onClick={khiQuayLai} className="md:h-10 md:px-4">
            Quay lại học tiếp
          </Nut>
        </>
      }
    >
      <ul className="m-0 flex list-none flex-col rounded-[var(--radius-md)] border border-border p-0">
        {cacBuoc.map((b) => {
          const buoc = ketQua.buoc[b]
          const thieu = cacBuocThieu.includes(b)
          return (
            <li
              key={b}
              data-buoc={b}
              className={`flex min-h-11 items-center gap-2.5 px-4 py-2.5 [&+li]:border-t [&+li]:border-border ${
                thieu ? 'font-semibold' : ''
              }`}
            >
              <ChamBuoc tt={buoc.tinhTrang} />
              <span className="min-w-0 flex-1">{TEN_BUOC[b]}</span>
              <span className="text-right text-[length:var(--fs-meta)] leading-[var(--lh-meta)] font-normal text-muted">
                {buoc.nhan}
              </span>
            </li>
          )
        })}
      </ul>
    </HopThoai>
  )
}

export interface XacNhanDaXong {
  /**
   * Gọi thay cho việc đặt Đã xong: còn bước thiếu → mở F19, chỉ chạy `lam` khi người học chọn "Vẫn đánh dấu Đã
   * xong"; không thì chạy `lam` ngay.
   */
  xacNhan: (lam: () => void) => void
  /** Dialog F19 — đặt một lần trong trang (vị trí trong cây không quan trọng: dialog nằm trong portal) */
  hopThoai: ReactNode
}

/**
 * F19 phải cho mục `muc`. `cauHoiKhoa`: khoá các câu Tự kiểm tra của bài (cacKhoaCauHoi của ThanBai); [] = bài
 * không có câu hỏi (Kiểm tra "Không áp dụng"); null = chưa biết (bài đang tải / lỗi đọc file) → bỏ bước Kiểm tra
 * khỏi danh sách. `baiDangTai`: bài (GET /api/bai) còn đang tải — đặt Đã xong lúc đó thì hoãn tới khi biết câu hỏi.
 */
export function useXacNhanDaXong(
  muc: MucHoc,
  cauHoiKhoa: readonly string[] | null,
  { baiDangTai = false }: { baiDangTai?: boolean } = {},
): XacNhanDaXong {
  const ketQua = useBonBuoc(muc.id, muc.mau, cauHoiKhoa ?? [])
  const { dangTai: hocDangTai, loi: hocLoi } = useHoc(muc.id)
  const { trangThaiCua } = useTrangThai()
  // Yêu cầu đặt Đã xong đang chờ: 'hoan' (chờ dữ liệu tải xong) → 'hoi' (F19 mở) hoặc 'chay' (chạy `lam` một lần, ở
  // effect); `lan` để mỗi yêu cầu chỉ chạy một lần.
  const [cho, datCho] = useState<{
    id: string
    lam: () => void
    lan: number
    buoc: 'hoan' | 'hoi' | 'chay'
  } | null>(null)
  const demLan = useRef(0)
  const daChay = useRef(0)

  const cacBuoc = cauHoiKhoa === null ? CAC_BUOC.filter((b) => b !== 'kiem-tra') : CAC_BUOC
  const cacBuocThieu = ketQua ? ketQua.cacBuocThieu.filter((b) => cacBuoc.includes(b)) : []
  const soThieu = cacBuocThieu.length
  const daXong = trangThaiCua(muc.id) === 'da-xong'
  // Chưa đủ dữ liệu để biết còn thiếu bước nào (lỗi tải dữ liệu học thì không chờ)
  const chuaBiet = !hocLoi && (hocDangTai || baiDangTai)

  const xacNhan = useCallback(
    (lam: () => void) => {
      if (daXong) lam()
      else if (chuaBiet) datCho({ id: muc.id, lam, lan: ++demLan.current, buoc: 'hoan' })
      else if (soThieu === 0) lam()
      else datCho({ id: muc.id, lam, lan: ++demLan.current, buoc: 'hoi' })
    },
    [soThieu, daXong, chuaBiet, muc.id],
  )

  // Đang hoãn: dữ liệu tải xong thì quyết như lúc bấm (đủ bước → chạy; còn thiếu → hỏi). Sang mục khác thì bỏ.
  // (Đổi state trong lúc render theo dữ liệu mới — không cần effect.)
  if (cho?.buoc === 'hoan') {
    if (cho.id !== muc.id) datCho(null)
    else if (!chuaBiet) datCho({ ...cho, buoc: soThieu === 0 || daXong ? 'chay' : 'hoi' })
  }
  useEffect(() => {
    if (cho?.buoc !== 'chay' || daChay.current === cho.lan) return
    daChay.current = cho.lan
    cho.lam()
  }, [cho])

  const hopThoai = ketQua ? (
    <HopThoaiDaXong
      mo={cho !== null && cho.buoc === 'hoi' && cho.id === muc.id}
      muc={muc}
      ketQua={ketQua}
      cacBuoc={cacBuoc}
      cacBuocThieu={cacBuocThieu}
      khiQuayLai={() => datCho(null)}
      khiVanDanhDau={() => {
        const lam = cho?.lam
        datCho(null)
        lam?.()
      }}
    />
  ) : null

  return { xacNhan, hopThoai }
}
