// Seed DB của bộ dữ liệu mẫu (§7, đề xuất mục 7) cho `npm run dev:mau`. Ghi các bảng đã có tới phase 2b:
// settings, item_status + status_events, item_visits, content_approvals, content_files. Ghi qua đúng hàm của
// server (datTrangThai, ghiLuotMo, ghiDongSo) với thời điểm cố định nên lần chạy nào cũng ra cùng dữ liệu.
//
// Cách mở rộng: mỗi phase thêm bảng thì thêm một phần vào PHAN_SEED (chỉ ghi bảng của phase đó, đọc số
// liệu từ so-lieu.ts) và gỡ dòng tương ứng khỏi CHUA_SEED.

import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { ngayCua } from '../../shared/clock.ts'
import type { TrangThaiHoc } from '../../shared/domain/trang-thai.ts'
import { docFrontmatter } from '../../shared/noi-dung/index.ts'
import type { Cay, MucHoc } from '../../shared/roadmap/index.ts'
import type { Db } from '../../server/db/index.ts'
import { ghiSetting } from '../../server/db/settings.ts'
import { ghiDongSo } from '../../server/du-lieu/so-noi-dung.ts'
import { datTrangThai, ghiLuotMo } from '../../server/du-lieu/trang-thai.ts'
import { dsFileMd } from './tao-noi-dung.ts'
import {
  BAN_NHAP,
  BO_QUA,
  DANG_HOC,
  DA_DUYET,
  DA_XONG,
  GIO_MAU,
  LY_DO_BO_QUA,
  MUC_TIEU_GIO_TUAN,
  MUI_GIO_MAU,
  NGAY_BAT_DAU,
  luc,
  ngayCuaMoc,
} from './so-lieu.ts'

export interface NguCanhSeed {
  db: Db
  cay: Cay
  /** Thư mục nội dung đã chép bài mẫu (bản chụp duyệt đọc file ở đây để hash khớp) */
  noiDungDir: string
}

export interface PhanSeed {
  ten: string
  /** Bảng mà phần này ghi */
  bang: readonly string[]
  chay: (ng: NguCanhSeed) => void
}

/** sha256 (hex) của toàn file — hash của bản chụp duyệt (content_approvals.hash, đề xuất 1.6). */
export function bamFile(noiDung: string | Buffer): string {
  return createHash('sha256').update(noiDung).digest('hex')
}

function mucCua(cay: Cay, slug: string): MucHoc {
  const muc = cay.mucTheoSlug.get(slug)
  if (!muc) throw new Error(`Slug mẫu không có trong cây: ${slug}`)
  return muc
}

/** Ngày lịch của bộ mẫu là ngày giờ Việt Nam; múi giờ tiến trình khác thì `on` sẽ lệch → dừng. */
export function kiemMuiGio(): void {
  for (const moc of [GIO_MAU, `${NGAY_BAT_DAU}T00:30:00+07:00`, `${NGAY_BAT_DAU}T23:30:00+07:00`]) {
    const ms = Date.parse(moc)
    if (ngayCua(ms) !== moc.slice(0, 10)) {
      throw new Error(
        `Bộ dữ liệu mẫu cần múi giờ ${MUI_GIO_MAU} (chạy với TZ=${MUI_GIO_MAU}); hiện TZ=${process.env.TZ ?? '(theo máy)'}.`,
      )
    }
  }
}

function seedCaiDat({ db }: NguCanhSeed): void {
  ghiSetting(db, 'ngay_bat_dau', NGAY_BAT_DAU)
  ghiSetting(db, 'muc_tieu_gio_tuan', String(MUC_TIEU_GIO_TUAN))
}

interface DoiTrangThai {
  ms: number
  slug: string
  trangThai: TrangThaiHoc
  lyDo?: string
}

/** Mọi lần đổi trạng thái của §7, theo thời gian (id sự kiện tăng theo thời gian). */
export function lichDoiTrangThai(): DoiTrangThai[] {
  const ds: DoiTrangThai[] = [
    ...DA_XONG.flatMap((x) => [
      { ms: luc(x.batDau), slug: x.slug, trangThai: 'dang-hoc' as const },
      { ms: luc(x.xong), slug: x.slug, trangThai: 'da-xong' as const },
    ]),
    ...DANG_HOC.map((x) => ({ ms: luc(x.batDau), slug: x.slug, trangThai: 'dang-hoc' as const })),
    ...BO_QUA.map((x) => ({
      ms: luc(x.luc),
      slug: x.slug,
      trangThai: 'bo-qua' as const,
      lyDo: LY_DO_BO_QUA,
    })),
  ]
  return ds.sort((a, b) => a.ms - b.ms)
}

function seedTrangThaiHoc({ db, cay }: NguCanhSeed): void {
  for (const doi of lichDoiTrangThai()) {
    const giaTri = doi.lyDo
      ? { trangThai: doi.trangThai, lyDo: doi.lyDo }
      : { trangThai: doi.trangThai }
    datTrangThai(db, { id: mucCua(cay, doi.slug).id, giaTri, via: 'mot-muc', luc: doi.ms })
  }
}

function seedLuotMo({ db, cay }: NguCanhSeed): void {
  const luot = [
    ...DA_XONG.map((x) => ({ slug: x.slug, ms: luc(x.xong) })),
    ...DANG_HOC.map((x) => ({ slug: x.slug, ms: luc(x.moCuoi) })),
  ].sort((a, b) => a.ms - b.ms)
  for (const x of luot) ghiLuotMo(db, mucCua(cay, x.slug).id, x.ms)
}

function seedBanChupDuyet({ db, cay, noiDungDir }: NguCanhSeed): void {
  const them = db.prepare(
    `INSERT INTO content_approvals (item_id, approved_on, hash, body, superseded_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?)`,
  )
  for (const bai of [...DA_DUYET].sort((a, b) => luc(a.duyetLuc) - luc(b.duyetLuc))) {
    const muc = mucCua(cay, bai.slug)
    const tep = path.join(noiDungDir, muc.duongDanTuongDoi)
    if (!fs.existsSync(tep)) throw new Error(`Thiếu file bài đã duyệt: ${muc.duongDanTuongDoi}`)
    const goc = fs.readFileSync(tep)
    const text = goc.toString('utf8')
    const ngay = ngayCuaMoc(bai.duyetLuc)
    const fm = docFrontmatter(text).frontmatter
    if (fm?.trangThaiNoiDung !== 'da-duyet' || fm.ngayDuyet !== ngay) {
      throw new Error(`${muc.duongDanTuongDoi}: frontmatter phải là da-duyet, ngay_duyet ${ngay}`)
    }
    const at = new Date(luc(bai.duyetLuc)).toISOString()
    them.run(muc.id, ngay, bamFile(goc), text, at, at)
  }
}

/**
 * Sổ nội dung (phase 2b): mọi file .md của thư mục nội dung mẫu là file đã nhận (kịch bản f12, loi-file cũng
 * vậy), để bài hiện đúng như phase 2a. Ngày nhập: bản nháp theo F21b (BAN_NHAP.ngayNhap), bài đã duyệt = ngày
 * duyệt, bản sửa (f12) = ngày của GIO_MAU.
 */
function seedSoNoiDung({ db, cay, noiDungDir }: NguCanhSeed): void {
  const ngayNhap = new Map<string, string>([
    ...BAN_NHAP.map((x) => [x.slug, x.ngayNhap] as const),
    ...DA_DUYET.map((x) => [x.slug, ngayCuaMoc(x.duyetLuc)] as const),
  ])
  const theoDuongDan = new Map(cay.mucHoc.map((m) => [m.duongDanTuongDoi, m]))
  for (const tep of dsFileMd(noiDungDir)) {
    const laBanSua = tep.endsWith('.ban-sua.md')
    const muc = theoDuongDan.get(laBanSua ? tep.replace(/\.ban-sua\.md$/, '.md') : tep)
    if (!muc) throw new Error(`File mẫu không thuộc mục nào: ${tep}`)
    const duongDan = path.join(noiDungDir, tep)
    const st = fs.statSync(duongDan)
    ghiDongSo(db, {
      path: tep,
      itemId: muc.id,
      role: laBanSua ? 'ban-sua' : 'bai',
      hash: bamFile(fs.readFileSync(duongDan)),
      size: st.size,
      mtime: st.mtimeMs,
      importedOn: laBanSua
        ? GIO_MAU.slice(0, 10)
        : (ngayNhap.get(muc.slug) ?? GIO_MAU.slice(0, 10)),
      missingSince: null,
    })
  }
}

/** Các phần seed theo thứ tự chạy (phase 2a, 2b). Phase sau thêm phần của mình vào cuối. */
export const PHAN_SEED: readonly PhanSeed[] = [
  { ten: 'cai-dat', bang: ['settings'], chay: seedCaiDat },
  { ten: 'trang-thai-hoc', bang: ['item_status', 'status_events'], chay: seedTrangThaiHoc },
  { ten: 'luot-mo', bang: ['item_visits'], chay: seedLuotMo },
  { ten: 'ban-chup-duyet', bang: ['content_approvals'], chay: seedBanChupDuyet },
  { ten: 'so-noi-dung', bang: ['content_files'], chay: seedSoNoiDung },
]

/** Số liệu §7 chưa seed vì bảng chưa có (phase = phase tạo bảng theo đề xuất mục 9). */
export const CHUA_SEED: readonly { phase: string; bang: string; soLieu: string }[] = [
  {
    phase: '3',
    bang: 'projects, practice',
    soLieu:
      'dự án "Cổng đặt lịch nội bộ" · Execution; 7 bài thực hành Xong; Scope Creep Áp dụng đang làm',
  },
  {
    phase: '3',
    bang: 'restatements, self_check, notes',
    soLieu:
      'Nói lại (Scope Creep 21:42, Risk Register 21:18), câu tự kiểm tra, ghi chú Scope Creep',
  },
  {
    phase: '3',
    bang: 'time_entries, active_timer',
    soLieu:
      'tuần này 4 giờ 35 phút / 6 giờ; tổng 38 giờ 10 phút; streak 5 (kỷ lục 12); Scope Creep 35 phút; Risk Register 1 giờ 05 phút; đồng hồ Risk Register started_at = GIO_MAU − 24 phút 17 giây; heatmap tuần 32–43',
  },
  {
    phase: '3',
    bang: 'flashcards (tạo thẻ)',
    soLieu: 'Scope Creep 3 thẻ (hộp 2 ôn 24/10, hộp 1 ôn 23/10 ×2)',
  },
  {
    phase: '7a',
    bang: 'review_marks',
    soLieu: 'Earned Value Management 7/10 khối Đã soát',
  },
  {
    phase: '7c',
    bang: 'doc_versions, doc_checklist',
    soLieu:
      'tài liệu 1/15: Change Request (CR) v1.0 Hoàn thành; Risk Register v0.2 Đang viết, sửa lần cuối 21/10/2026',
  },
  {
    phase: '8',
    bang: 'flashcards, flashcard_reviews',
    soLieu:
      '85 thẻ, 12 đến hạn, hộp 1–5 = 34/21/15/9/6; tỉ lệ nhớ 30 ngày 81%; Cần ôn lại Scrum, MoSCoW, Definition of Done (lọc Đang học + Cần ôn lại = 9)',
  },
  {
    phase: '11',
    bang: 'cert_plans',
    soLieu: 'PMP "Đang ôn", thi 15/06/2027 (còn 236 ngày); "Kiểm tra lần cuối 22/10/2026"',
  },
  {
    phase: '12',
    bang: 'self_assessment, settings.da_thiet_lap, _lo-trinh-goi-y.md',
    soLieu: 'Tự đánh giá đầu vào; lộ trình gợi ý 3 chặng (Đề xuất mẫu, chưa duyệt)',
  },
]

export interface TomTatSeed {
  trangThai: Record<'learning' | 'done' | 'skip', number>
  suKien: number
  luotMo: number
  banChup: number
  /** Số file trong sổ nội dung */
  soFile: number
}

/** Seed bộ mẫu §7 vào DB đã chạy migration; một transaction. */
export function seedMau(ng: NguCanhSeed): TomTatSeed {
  kiemMuiGio()
  ng.db.transaction(() => {
    for (const phan of PHAN_SEED) phan.chay(ng)
  })()
  const dem = (sql: string) => (ng.db.prepare(sql).get() as { n: number }).n
  const trangThai = { learning: 0, done: 0, skip: 0 }
  for (const dong of ng.db
    .prepare('SELECT status, count(*) AS n FROM item_status GROUP BY status')
    .all() as { status: keyof typeof trangThai; n: number }[]) {
    trangThai[dong.status] = dong.n
  }
  return {
    trangThai,
    suKien: dem('SELECT count(*) AS n FROM status_events'),
    luotMo: dem('SELECT count(*) AS n FROM item_visits'),
    banChup: dem('SELECT count(*) AS n FROM content_approvals WHERE superseded_at IS NULL'),
    soFile: dem('SELECT count(*) AS n FROM content_files'),
  }
}
