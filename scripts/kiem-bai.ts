// Kiểm file bài bằng đúng parser của app (phanTichBai): lỗi frontmatter, cảnh báo theo dòng, "Đủ khối".
//   npx tsx scripts/kiem-bai.ts <file.md> [slug]   (không có slug thì lấy theo id trong file hoặc tên file)
// Thoát 1 khi có lỗi chặn đọc bài, thiếu khối ★ hoặc có cảnh báo mức lỗi.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { docFrontmatter, phanTichBai, voiDong } from '../shared/noi-dung/index.ts'
import { layCay } from '../shared/roadmap/index.ts'
import { laLenhChinh } from './chay-truc-tiep'

export function chay(thamSo: string[]): number {
  const [tep, slug] = thamSo
  if (!tep) {
    console.error('Cách dùng: npx tsx scripts/kiem-bai.ts <file.md> [slug]')
    return 1
  }
  const text = readFileSync(tep, 'utf8')
  const cay = layCay()
  const id = docFrontmatter(text).frontmatter?.id
  const muc =
    (slug ? cay.mucTheoSlug.get(slug) : undefined) ??
    (typeof id === 'string' ? cay.mucTheoId.get(id) : undefined) ??
    cay.mucTheoSlug.get(path.basename(tep, '.md'))
  if (!muc) {
    console.error(`Không xác định được mục cho ${tep}: thêm slug vào lệnh.`)
    return 1
  }
  const kq = phanTichBai(text, muc)
  console.log(`${muc.label} (${muc.mau}) · Đủ khối ${kq.duKhoi.co}/${kq.duKhoi.tong}`)
  if (kq.loi) console.log(`LỖI: ${voiDong(kq.loi)}`)
  for (const cb of kq.canhBao)
    console.log(`${cb.muc === 'loi' ? 'LỖI' : 'cảnh báo'}: ${voiDong(cb)}`)
  const thieu = kq.boCuc.filter((o) => o.hien === 'chua-co' && o.mau).map((o) => o.mau?.tieuDe)
  if (thieu.length) console.log(`Thiếu khối ★: ${thieu.join(', ')}`)
  const coLoi = kq.loi !== null || thieu.length > 0 || kq.canhBao.some((cb) => cb.muc === 'loi')
  console.log(coLoi ? 'KẾT QUẢ: chưa đạt' : 'KẾT QUẢ: đạt')
  return coLoi ? 1 : 0
}

if (laLenhChinh(import.meta.url)) process.exitCode = chay(process.argv.slice(2))
