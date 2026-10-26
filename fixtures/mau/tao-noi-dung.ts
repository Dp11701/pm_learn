// Ghi 50 file bài mẫu ra fixtures/mau/noi-dung/ (đường dẫn chuẩn của từng mục, MucHoc.duongDanTuongDoi).
// Chạy: `npx tsx fixtures/mau/tao-noi-dung.ts` (ghi lại toàn bộ) hoặc thêm `--kiem` (chỉ so, lệch thì thoát 1).
// Output được commit; tests/mau kiểm output khớp bộ dựng.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { layCay } from '../../shared/roadmap/index.ts'
import { laLenhChinh } from '../../scripts/chay-truc-tiep.ts'
import { cacBaiMau } from './noi-dung-mau.ts'

/** Thư mục nội dung mẫu đã commit (nguồn để chép sang thư mục tạm của dev:mau). */
export const THU_MUC_NOI_DUNG_MAU = path.resolve(
  fileURLToPath(new URL('./noi-dung', import.meta.url)),
)

/** Mọi file .md dưới một thư mục (đường dẫn tương đối, dấu /), sắp theo tên. */
export function dsFileMd(goc: string): string[] {
  if (!fs.existsSync(goc)) return []
  const kq: string[] = []
  const duyet = (thuMuc: string) => {
    for (const muc of fs.readdirSync(thuMuc, { withFileTypes: true })) {
      const day = path.join(thuMuc, muc.name)
      if (muc.isDirectory()) duyet(day)
      else if (muc.isFile() && muc.name.endsWith('.md')) {
        kq.push(path.relative(goc, day).split(path.sep).join('/'))
      }
    }
  }
  duyet(goc)
  return kq.sort()
}

export interface KetQuaSo {
  thieu: string[]
  thua: string[]
  khac: string[]
}

/** So thư mục với output của bộ dựng. */
export function soVoiBoDung(goc: string = THU_MUC_NOI_DUNG_MAU): KetQuaSo {
  const bai = cacBaiMau(layCay())
  const coSan = new Set(dsFileMd(goc))
  const kq: KetQuaSo = { thieu: [], thua: [], khac: [] }
  for (const [tuongDoi, text] of bai) {
    if (!coSan.has(tuongDoi)) kq.thieu.push(tuongDoi)
    else if (fs.readFileSync(path.join(goc, tuongDoi), 'utf8') !== text) kq.khac.push(tuongDoi)
  }
  for (const tuongDoi of coSan) if (!bai.has(tuongDoi)) kq.thua.push(tuongDoi)
  return kq
}

/** Xoá thư mục rồi ghi lại toàn bộ file bài mẫu; trả số file. */
export function ghiNoiDungMau(goc: string = THU_MUC_NOI_DUNG_MAU): number {
  fs.rmSync(goc, { recursive: true, force: true })
  const bai = cacBaiMau(layCay())
  for (const [tuongDoi, text] of bai) {
    const dich = path.join(goc, tuongDoi)
    fs.mkdirSync(path.dirname(dich), { recursive: true })
    fs.writeFileSync(dich, text, 'utf8')
  }
  return bai.size
}

if (laLenhChinh(import.meta.url)) {
  if (process.argv.includes('--kiem')) {
    const { thieu, thua, khac } = soVoiBoDung()
    const loi = [
      ...thieu.map((x) => `thiếu ${x}`),
      ...thua.map((x) => `thừa ${x}`),
      ...khac.map((x) => `khác ${x}`),
    ]
    if (loi.length > 0) {
      console.error(`fixtures/mau/noi-dung lệch bộ dựng:\n  ${loi.join('\n  ')}`)
      process.exit(1)
    }
    console.log('fixtures/mau/noi-dung khớp bộ dựng.')
  } else {
    const so = ghiNoiDungMau()
    console.log(`Đã ghi ${so} file vào ${THU_MUC_NOI_DUNG_MAU}`)
  }
}
