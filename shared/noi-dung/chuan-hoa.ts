// Chuẩn hoá chữ để so tiêu đề khối, câu hỏi, dòng checklist (đề xuất 1.5) và hàm băm ổn định
// dùng chung web + server (không dùng node:crypto để chạy được cả trên trình duyệt).

/**
 * So tiêu đề: NFC, '->' = '→', gộp khoảng trắng (kể cả nbsp), bỏ khoảng trắng hai đầu,
 * không phân biệt hoa thường.
 */
export function chuanHoaTieuDe(s: string): string {
  return s.normalize('NFC').replace(/->/g, '→').replace(/\s+/gu, ' ').trim().toLowerCase()
}

/** Chuẩn hoá câu hỏi / dòng checklist trước khi băm: như tiêu đề, thêm '\|' = '|'. */
export function chuanHoaCau(s: string): string {
  return chuanHoaTieuDe(s.replace(/\\\|/g, '|'))
}

/** Băm 53 bit (cyrb53) → 11 ký tự base36. Ổn định giữa các lần chạy và giữa web/server. */
export function bam(chuoi: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < chuoi.length; i++) {
    const ma = chuoi.charCodeAt(i)
    h1 = Math.imul(h1 ^ ma, 2654435761)
    h2 = Math.imul(h2 ^ ma, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const so = 4294967296 * (2097151 & h2) + (h1 >>> 0)
  return so.toString(36).padStart(11, '0')
}

/**
 * Khoá cho từng câu trong bài: bam(chuẩn hoá); câu trùng trong bài thêm '#n' (lần thứ 2 là '#2').
 * Dùng cho câu Tự kiểm tra, dòng Checklist chất lượng, tiêu chí tự kiểm.
 */
export function taoKhoa(cacCau: readonly string[]): string[] {
  const daGap = new Map<string, number>()
  return cacCau.map((cau) => {
    const goc = bam(chuanHoaCau(cau))
    const lan = (daGap.get(goc) ?? 0) + 1
    daGap.set(goc, lan)
    return lan === 1 ? goc : `${goc}#${lan}`
  })
}
