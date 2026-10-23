import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * File có đang được chạy làm lệnh chính (`tsx file.ts`) không. So đường dẫn thật nên vẫn đúng khi
 * gọi qua symlink (vd. /tmp → /private/tmp trên macOS); import file thì không chạy gì.
 */
export function laLenhChinh(importMetaUrl: string): boolean {
  const lenh = process.argv[1]
  if (!lenh) return false
  try {
    return realpathSync(lenh) === realpathSync(fileURLToPath(importMetaUrl))
  } catch {
    return false
  }
}
