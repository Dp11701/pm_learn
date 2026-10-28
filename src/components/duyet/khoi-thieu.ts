// Khối ★ (viết trong file) còn thiếu của một bài đã đọc: đúng phần bù của KetQuaBai.duKhoi (server có bản cùng quy
// tắc ở server/du-lieu/duyet.ts cho bản sửa). Dialog "Duyệt bài này?" liệt kê để bạn biết, nhưng vẫn cho duyệt.
import type { KetQuaBai } from '../../../shared/noi-dung'

export function khoiThieuCua(bai: KetQuaBai): string[] {
  return bai.boCuc.flatMap((o) =>
    o.mau?.batBuoc && o.mau.nguon === 'file' && !o.khoi.some((k) => k.coChu && !k.coLoi)
      ? [o.mau.tieuDe]
      : [],
  )
}
