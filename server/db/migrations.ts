import type { Db } from './index.ts'

// Danh sách migration theo thứ tự; phần tử thứ i đưa user_version từ i lên i + 1.
// Chỉ thêm vào cuối, không sửa migration đã phát hành.

export interface Migration {
  ten: string
  chay: (db: Db) => void
}

export const dsMigration: Migration[] = [
  {
    ten: 'settings',
    chay: (db) => {
      db.exec('CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)')
    },
  },
]
