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
  {
    // Phase 2a (đề xuất 2.1): trạng thái học, lịch sử đổi trạng thái, lượt mở bài, bản chụp lúc duyệt.
    // - item_status: không có hàng = Chưa học (bất biến 2); lý do chỉ đi với Bỏ qua.
    // - status_events: from/to NULL = Chưa học; `at` ISO UTC, `on` ngày lịch YYYY-MM-DD do server quyết.
    // - content_approvals: mỗi mục tối đa 1 bản chụp hiện hành (superseded_at IS NULL).
    // Không có cột / bảng "Cần ôn lại" (bất biến 3: luôn suy ra).
    ten: 'trang-thai-hoc',
    chay: (db) => {
      db.exec(`
        CREATE TABLE item_status (
          item_id TEXT PRIMARY KEY NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('learning', 'done', 'skip')),
          skip_reason TEXT CHECK (skip_reason IS NULL OR status = 'skip'),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE status_events (
          id INTEGER PRIMARY KEY,
          item_id TEXT NOT NULL,
          from_status TEXT CHECK (from_status IS NULL OR from_status IN ('learning', 'done', 'skip')),
          to_status TEXT CHECK (to_status IS NULL OR to_status IN ('learning', 'done', 'skip')),
          at TEXT NOT NULL,
          "on" TEXT NOT NULL CHECK ("on" GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
          via TEXT NOT NULL
            CHECK (via IN ('mot-muc', 'hang-loat', 'hoan-tac', 'nhap-json', 'tu-danh-gia')),
          created_at TEXT NOT NULL,
          CHECK (from_status IS NOT to_status)
        );
        CREATE INDEX status_events_item ON status_events (item_id, id);
        CREATE INDEX status_events_on ON status_events ("on");

        CREATE TABLE item_visits (
          item_id TEXT PRIMARY KEY NOT NULL,
          last_opened_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE content_approvals (
          id INTEGER PRIMARY KEY,
          item_id TEXT NOT NULL,
          approved_on TEXT NOT NULL
            CHECK (approved_on GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
          hash TEXT NOT NULL,
          body TEXT NOT NULL,
          superseded_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX content_approvals_item ON content_approvals (item_id, id);
        CREATE UNIQUE INDEX content_approvals_hien_hanh
          ON content_approvals (item_id) WHERE superseded_at IS NULL;
      `)
    },
  },
  {
    // Phase 2a (đề xuất 2.1, 3.2): bước Áp dụng, đúng cột của bảng practice. 2a chỉ ghi 'khong-ap-dung' cho
    // Chứng chỉ (khối Kế hoạch thi); phase 3 dùng thêm dự án, kết quả, tiêu chí cho Chủ đề. Không có hàng =
    // chưa làm. "Không áp dụng" luôn kèm lý do (§1); lý do chỉ đi với "Không áp dụng".
    // project_id chưa có khoá ngoài: bảng projects là của phase 3.
    ten: 'ap-dung',
    chay: (db) => {
      db.exec(`
        CREATE TABLE practice (
          item_id TEXT PRIMARY KEY NOT NULL,
          project_id INTEGER,
          result_md TEXT,
          criteria TEXT,
          state TEXT NOT NULL CHECK (state IN ('dang-lam', 'xong', 'khong-ap-dung')),
          na_reason TEXT CHECK (na_reason IS NULL OR state = 'khong-ap-dung'),
          done_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          CHECK (state <> 'khong-ap-dung' OR (na_reason IS NOT NULL AND trim(na_reason) <> ''))
        );
      `)
    },
  },
  {
    // Phase 2b (đề xuất 1.6, 1.3, 2.1): sổ nội dung, nhật ký file, bản tạm trình soạn, slug cũ.
    // - content_files: đường dẫn tương đối trong thư mục nội dung (dấu /). Mỗi mục tối đa 1 file mỗi vai
    //   (content_files_muc). mtime (ms) NULL = chưa stat sau khi ghi; missing_since (ISO UTC) = quét nhẹ
    //   thấy file mất. imported_on = ngày nhập (YYYY-MM-DD, server quyết).
    // - file_ops.steps: JSON mảng các bước {tu, den, hash_moi, …} (server/noi-dung/file-ops.ts).
    // - editor_buffers.item_id NULL được: bản tạm của file nhập lỗi chưa khớp mục (khoá nhap:<token>:<i>).
    // - DB nâng từ phase 2a (đã có cay_sha): đánh dấu để lượt quét nhẹ đầu tiên nhận các file đang nằm ở
    //   đúng đường dẫn chuẩn (2a đã hiện chúng); DB mới thì mọi file phải qua Nhập / Quét lại.
    ten: 'so-noi-dung',
    chay: (db) => {
      db.exec(`
        CREATE TABLE content_files (
          path TEXT PRIMARY KEY NOT NULL,
          item_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('bai', 'ban-sua', 'tong-quan', 'lo-trinh')),
          hash TEXT NOT NULL,
          size INTEGER NOT NULL CHECK (size >= 0),
          mtime REAL,
          imported_on TEXT NOT NULL
            CHECK (imported_on GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
          missing_since TEXT
        );
        CREATE UNIQUE INDEX content_files_muc ON content_files (item_id, role);

        CREATE TABLE file_ops (
          id INTEGER PRIMARY KEY,
          op TEXT NOT NULL,
          steps TEXT NOT NULL CHECK (json_valid(steps) AND json_type(steps) = 'array'),
          state TEXT NOT NULL CHECK (state IN ('du-dinh', 'xong')),
          created_at TEXT NOT NULL
        );
        CREATE INDEX file_ops_du_dinh ON file_ops (id) WHERE state = 'du-dinh';

        CREATE TABLE editor_buffers (
          key TEXT PRIMARY KEY NOT NULL,
          item_id TEXT,
          text TEXT NOT NULL,
          base_hash TEXT,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE slug_cu (
          slug TEXT PRIMARY KEY NOT NULL,
          item_id TEXT NOT NULL
        );

        INSERT INTO settings (key, value)
          SELECT 'so_noi_dung', 'can-khoi-tao' WHERE EXISTS (SELECT 1 FROM settings WHERE key = 'cay_sha');
      `)
    },
  },
]
