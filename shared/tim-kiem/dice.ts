// Hệ số Dice trên bigram (đa tập) của hai chuỗi đã gấp bằng foldVi (đề xuất 0.1: "risk registr" → "risk register"
// 0,87). Dùng cho khớp file nhập với mục (1.7) và gán lại câu trả lời khi câu hỏi trong bài đổi chữ (1.5).

function demBigram(s: string): Map<string, number> {
  const kq = new Map<string, number>()
  for (let i = 0; i < s.length - 1; i++) {
    const bg = s.slice(i, i + 2)
    kq.set(bg, (kq.get(bg) ?? 0) + 1)
  }
  return kq
}

/** Dice 0–1 của hai chuỗi đã gấp; chuỗi dưới 2 ký tự chỉ được 1 khi giống hệt (và không rỗng). */
export function dice(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return a !== '' && a === b ? 1 : 0
  const da = demBigram(a)
  const db = demBigram(b)
  let chung = 0
  for (const [bg, n] of da) chung += Math.min(n, db.get(bg) ?? 0)
  return (2 * chung) / (a.length - 1 + b.length - 1)
}

/** a ≥ b sau khi làm tròn 1e-9 (để 0,95 − 0,8 không hụt 0,15 vì dấu phẩy động). */
export function khongNhoHon(a: number, b: number): boolean {
  return Math.round(a * 1e9) >= Math.round(b * 1e9)
}
