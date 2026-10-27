// In prompt soạn bài (buildPrompt, đã duyệt ở phase 2a) của một mục, để Claude soạn bài nháp ngoài app.
//   npx tsx scripts/in-prompt.ts <slug>                  → in ra màn hình
//   npx tsx scripts/in-prompt.ts --tat-ca --ra <thư mục> → mỗi mục một file <slug>.txt
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildPrompt } from '../shared/noi-dung/index.ts'
import { layCay } from '../shared/roadmap/index.ts'
import { laLenhChinh } from './chay-truc-tiep'

export function chay(thamSo: string[]): number {
  const cay = layCay()
  if (thamSo[0] === '--tat-ca') {
    const iRa = thamSo.indexOf('--ra')
    const thuMuc = iRa >= 0 ? thamSo[iRa + 1] : undefined
    if (!thuMuc) {
      console.error('Thiếu --ra <thư mục>.')
      return 1
    }
    mkdirSync(thuMuc, { recursive: true })
    for (const muc of cay.mucHoc)
      writeFileSync(path.join(thuMuc, `${muc.slug}.txt`), buildPrompt(muc, cay))
    console.log(`Đã ghi ${cay.mucHoc.length} prompt vào ${thuMuc}`)
    return 0
  }
  const muc = thamSo[0] ? cay.mucTheoSlug.get(thamSo[0]) : undefined
  if (!muc) {
    console.error('Cách dùng: npx tsx scripts/in-prompt.ts <slug> | --tat-ca --ra <thư mục>')
    return 1
  }
  process.stdout.write(buildPrompt(muc, cay))
  return 0
}

if (laLenhChinh(import.meta.url)) process.exitCode = chay(process.argv.slice(2))
