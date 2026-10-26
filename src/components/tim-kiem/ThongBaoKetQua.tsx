// Vùng thông báo kết quả tìm cho trình đọc màn hình (role="status" = aria-live polite), dùng ở C28 và ô
// tìm trang 404. Chỉ báo khi người dùng ngừng gõ TRE_THONG_BAO ms, không đọc theo từng phím; gõ tiếp thì
// vùng trống lại đến lần ngừng sau, ô trống thì im lặng. Vùng luôn có trong DOM để trình đọc nghe được.
import { useEffect, useState } from 'react'
import { dinhDangSo } from '../../../shared/dinh-dang'
import TenMuc from '../TenMuc'
import { chuSoKetQua, ENTER_MO, khongCoKetQuaCho } from '../../copy/cho-duyet'

export const TRE_THONG_BAO = 500

/** Gợi ý khi không có kết quả (§6.3) */
export const GOI_Y_KHONG_CO_KET_QUA = 'Thử tên tiếng Anh hoặc viết tắt'

export interface PropsThongBaoKetQua {
  /** Chữ người dùng gõ */
  truyVan: string
  soKetQua: number
  /** Tên mục Enter sẽ mở, cho ô tìm không có aria-activedescendant */
  tenEnterMo?: string
}

interface DaBao {
  truyVan: string
  soKetQua: number
  tenEnterMo?: string
}

export default function ThongBaoKetQua({ truyVan, soKetQua, tenEnterMo }: PropsThongBaoKetQua) {
  const q = truyVan.trim()
  const [daBao, datDaBao] = useState<DaBao | null>(null)
  useEffect(() => {
    if (q === '') return
    const hen = setTimeout(() => datDaBao({ truyVan: q, soKetQua, tenEnterMo }), TRE_THONG_BAO)
    return () => clearTimeout(hen)
  }, [q, soKetQua, tenEnterMo])
  // Chỉ hiện thông báo của đúng chữ đang có trong ô: đang gõ dở thì để trống
  const hien = daBao && daBao.truyVan === q ? daBao : null

  return (
    <p role="status" className="sr-only">
      {hien &&
        (hien.soKetQua > 0 ? (
          <>
            {chuSoKetQua(dinhDangSo(hien.soKetQua))}
            {hien.tenEnterMo && (
              <>
                {` ${ENTER_MO} `}
                <TenMuc>{hien.tenEnterMo}</TenMuc>.
              </>
            )}
          </>
        ) : (
          khongCoKetQuaCho(hien.truyVan, GOI_Y_KHONG_CO_KET_QUA)
        ))}
    </p>
  )
}
