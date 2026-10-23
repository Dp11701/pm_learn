import { createHash } from 'node:crypto'
import fs from 'node:fs'
import type { Db } from './db/index.ts'
import { docSetting, ghiSetting } from './db/settings.ts'

// settings.cay_sha = sha256 của file cây (đề xuất 1.3). Xử lý thay cây làm ở phase sau:
// khi khác, giữ nguyên sha cũ để bước đó còn nhận ra cây đã đổi.

export type KetQuaCay = 'moi' | 'khop' | 'khac'

export function shaCuaTep(duongDan: string): string {
  return createHash('sha256').update(fs.readFileSync(duongDan)).digest('hex')
}

export function kiemShaCay(db: Db, tepCay: string): KetQuaCay {
  const sha = shaCuaTep(tepCay)
  const cu = docSetting(db, 'cay_sha')
  if (cu === null) {
    ghiSetting(db, 'cay_sha', sha)
    return 'moi'
  }
  return cu === sha ? 'khop' : 'khac'
}
