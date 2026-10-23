// Viết tắt trong tên mục, dùng chung cho tìm kiếm và trang Thuật ngữ F37 (đề xuất 1.8).

const NGOAC_CUOI = /\(([^()]*)\)\s*$/
const CHU_HOA = /\p{Lu}/gu
const HAI_CHU_THUONG = /\p{Ll}\p{Ll}/u
const NGAN_HAI_DAU = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu

/** ≥ 2 chữ hoa và không có 2 chữ thường liền nhau. */
function laVietTat(chu: string): boolean {
  return (chu.match(CHU_HOA)?.length ?? 0) >= 2 && !HAI_CHU_THUONG.test(chu)
}

/**
 * Viết tắt trong một tên, theo thứ tự xuất hiện, không trùng:
 * (2) tách phần tên ngoài ngoặc cuối theo khoảng trắng (nên " / " cũng tách, "CI/CD" giữ nguyên),
 * bỏ dấu câu hai đầu token, lấy token thoả laVietTat;
 * (1) chữ trong ngoặc cuối tên (bỏ ®) nếu cũng thoả laVietTat.
 */
export function vietTat(nhan: string): string[] {
  const ketQua: string[] = []
  const them = (chu: string) => {
    if (laVietTat(chu) && !ketQua.includes(chu)) ketQua.push(chu)
  }
  const ngoac = NGOAC_CUOI.exec(nhan)
  const than = ngoac ? nhan.slice(0, ngoac.index) : nhan
  for (const token of than.split(/\s+/)) them(token.replace(NGAN_HAI_DAU, ''))
  if (ngoac) them(ngoac[1].replace(/®/g, '').trim())
  return ketQua
}
