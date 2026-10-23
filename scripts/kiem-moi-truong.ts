// predev: kiểm môi trường trước `npm run dev` (đề xuất 1.1). Chỉ in cảnh báo, luôn thoát 0.
import fs from 'node:fs'
import { docCauHinh } from '../server/cau-hinh.ts'

async function kiemSqlite(): Promise<boolean> {
  try {
    const { default: Database } = await import('better-sqlite3')
    new Database(':memory:').close()
    return true
  } catch (loi) {
    const dong = [
      '',
      '[kiem-moi-truong] Không nạp được better-sqlite3 (module native).',
      `  Lỗi: ${loi instanceof Error ? loi.message.split('\n')[0] : String(loi)}`,
      `  Node ${process.version}, kiến trúc ${process.arch}, ${process.platform}.`,
      '  Cách sửa:',
      '    rm -rf node_modules/better-sqlite3 && npm install',
      '  Kiểm tra `node -p process.arch` phải ra arm64 trên Mac chip Apple;',
      '  đừng chạy Node bản x64 qua Rosetta (cài lại Node bản arm64, vd. qua nvm).',
    ]
    if (process.platform === 'darwin' && process.arch !== 'arm64') {
      dong.push('  Cảnh báo: Node hiện tại KHÔNG phải arm64 — rất có thể đang chạy qua Rosetta.')
    }
    console.warn(dong.join('\n') + '\n')
    return false
  }
}

function taoThuMuc(): void {
  const { dataDir, noiDungDir } = docCauHinh()
  for (const thuMuc of [dataDir, noiDungDir]) {
    if (!fs.existsSync(thuMuc)) {
      fs.mkdirSync(thuMuc, { recursive: true })
      console.log(`[kiem-moi-truong] Đã tạo thư mục ${thuMuc}`)
    }
  }
}

try {
  const sqliteOn = await kiemSqlite()
  taoThuMuc()
  if (sqliteOn) console.log(`[kiem-moi-truong] Ổn: Node ${process.version} ${process.arch}.`)
} catch (loi) {
  const lyDo = loi instanceof Error ? loi.message : String(loi)
  console.warn(`[kiem-moi-truong] Không kiểm tra hết được môi trường: ${lyDo}`)
}
process.exitCode = 0
