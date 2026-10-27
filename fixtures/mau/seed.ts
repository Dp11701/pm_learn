// Seed DB của bộ dữ liệu mẫu (§7, đề xuất mục 7) cho `npm run dev:mau`. Ghi các bảng đã có tới phase 3:
// settings, item_status + status_events, item_visits, content_approvals, content_files (2a, 2b); projects,
// practice, restatements, self_check, notes, flashcards + flashcard_reviews (3).
// Ghi qua đúng hàm của server (datTrangThai, ghiLuotMo, ghiDongSo, ghiThucHanh, taoThe, ghiLanOn…) với
// thời điểm cố định nên lần chạy nào cũng ra cùng dữ liệu.
// Phạm vi rút gọn 27/10/2026 bỏ đồng hồ học / giờ học: không seed time_entries, active_timer (API đồng hồ của
// server vẫn còn, bộ mẫu không có đồng hồ đang chạy nào, không có phiên giờ nào).
//
// Cách mở rộng: mỗi phase thêm bảng thì thêm một phần vào PHAN_SEED (chỉ ghi bảng của phase đó, đọc số
// liệu từ so-lieu.ts) và gỡ dòng tương ứng khỏi CHUA_SEED.

import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { ngayCua } from '../../shared/clock.ts'
import type { TrangThaiHoc } from '../../shared/domain/trang-thai.ts'
import {
  danhSachTrongBai,
  docFrontmatter,
  phanTichBai,
  DANH_SACH_TRONG_BAI_RONG,
  type DanhSachTrongBai,
} from '../../shared/noi-dung/index.ts'
import type { Cay, MucHoc } from '../../shared/roadmap/index.ts'
import type { Db } from '../../server/db/index.ts'
import { ghiSetting } from '../../server/db/settings.ts'
import { themDuAn } from '../../server/du-lieu/du-an.ts'
import { ghiGhiChu, ghiNoiLai, ghiThucHanh, ghiTuKiemTra } from '../../server/du-lieu/hoc.ts'
import { ghiDongSo } from '../../server/du-lieu/so-noi-dung.ts'
import { ghiLanOn, taoThe } from '../../server/du-lieu/the.ts'
import { datTrangThai, ghiLuotMo } from '../../server/du-lieu/trang-thai.ts'
import {
  CHU_MAU,
  DU_AN_MAU,
  GHI_CHU_MAU,
  GIO_ON,
  LUOT_MO_LAI,
  NOI_LAI_DANG_HOC,
  THE_MAU,
  THUC_HANH_DANG_LAM,
  THUC_HANH_XONG,
} from './so-lieu-hoc.ts'
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
  // Mục Đã xong mở lại sau lúc xong (thêm ghi chú / thẻ, so-lieu-hoc.ts) thì lượt mở cuối là lúc mở lại.
  const moLai = new Map(LUOT_MO_LAI.map((x) => [x.slug, luc(x.luc)]))
  const luot = [
    ...DA_XONG.map((x) => ({ slug: x.slug, ms: moLai.get(x.slug) ?? luc(x.xong) })),
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

// ---------- Phase 3: 4 bước, ghi chú, flashcard (so-lieu-hoc.ts) ----------

const PHUT = 60_000

/** Câu Tự kiểm tra và tiêu chí (khoá + chữ) của bài mẫu trong thư mục nội dung — như server đọc (đề xuất 1.5). */
function trongBaiCua(ng: NguCanhSeed, muc: MucHoc): DanhSachTrongBai {
  const tep = path.join(ng.noiDungDir, muc.duongDanTuongDoi)
  if (!fs.existsSync(tep)) return DANH_SACH_TRONG_BAI_RONG
  return danhSachTrongBai(phanTichBai(fs.readFileSync(tep, 'utf8'), muc))
}

/** id dự án mẫu (seed 'du-an' chạy trước). */
let idDuAnMau = 0

function seedDuAn({ db }: NguCanhSeed): void {
  idDuAnMau = themDuAn(db, {
    ten: DU_AN_MAU.ten,
    giaiDoan: DU_AN_MAU.giaiDoan,
    vaiTro: DU_AN_MAU.vaiTro,
    luc: luc(DU_AN_MAU.tao),
  }).duAn.id
}

/** 7 bài thực hành Xong (mọi tiêu chí tick, 15 phút trước lúc mục xong) + Scope Creep đang làm (F11). */
function seedThucHanh(ng: NguCanhSeed): void {
  const xong = new Map(DA_XONG.map((x) => [x.slug, x.xong]))
  for (const slug of THUC_HANH_XONG) {
    const muc = mucCua(ng.cay, slug)
    const moc = xong.get(slug)
    if (!moc || muc.mau !== 'chu-de')
      throw new Error(`Bài thực hành Xong phải là Chủ đề Đã xong: ${slug}`)
    const tieuChiTrongBai = trongBaiCua(ng, muc).tieuChi
    ghiThucHanh(ng.db, {
      id: muc.id,
      yeuCau: {
        trangThai: 'xong',
        duAnId: idDuAnMau,
        ketQua: CHU_MAU.ketQua,
        tieuChi: Object.fromEntries(tieuChiTrongBai.map((t) => [t.khoa, true])),
      },
      tieuChiTrongBai,
      luc: luc(moc) - 15 * PHUT,
    })
  }
  const sc = mucCua(ng.cay, THUC_HANH_DANG_LAM.slug)
  ghiThucHanh(ng.db, {
    id: sc.id,
    yeuCau: { trangThai: 'dang-lam', duAnId: idDuAnMau },
    tieuChiTrongBai: trongBaiCua(ng, sc).tieuChi,
    luc: luc(THUC_HANH_DANG_LAM.luc),
  })
}

/** Nói lại: mọi mục Đã xong (10 phút trước lúc xong) + Risk Register 21:18, Scope Creep 21:42 (F11, F15). */
function seedNoiLai({ db, cay }: NguCanhSeed): void {
  const ds = [
    ...DA_XONG.map((x) => ({ slug: x.slug, ms: luc(x.xong) - 10 * PHUT })),
    ...NOI_LAI_DANG_HOC.map((x) => ({ slug: x.slug, ms: luc(x.luc) })),
  ].sort((a, b) => a.ms - b.ms)
  for (const x of ds) ghiNoiLai(db, mucCua(cay, x.slug).id, CHU_MAU.noiLai, x.ms)
}

/** Tự kiểm tra: mọi câu của mục Đã xong đã trả lời, xem đáp án, tự chấm (mỗi câu thứ 4 "Một phần"). */
function seedTuKiemTra(ng: NguCanhSeed): void {
  let i = 0
  for (const x of DA_XONG) {
    const muc = mucCua(ng.cay, x.slug)
    for (const cau of trongBaiCua(ng, muc).cauHoi) {
      const id = muc.id
      const khoa = cau.khoa
      ghiTuKiemTra(ng.db, {
        id,
        khoa,
        yeuCau: { traLoi: CHU_MAU.traLoi, daXem: true },
        cauHoi: cau.chu,
        luc: luc(x.xong) - 8 * PHUT,
      })
      ghiTuKiemTra(ng.db, {
        id,
        khoa,
        yeuCau: { cham: ++i % 4 === 0 ? 'mot-phan' : 'dung' },
        cauHoi: cau.chu,
        luc: luc(x.xong) - 7 * PHUT,
      })
    }
  }
}

/** 6 ghi chú (F38). */
function seedGhiChu({ db, cay }: NguCanhSeed): void {
  for (const x of GHI_CHU_MAU) ghiGhiChu(db, mucCua(cay, x.slug).id, CHU_MAU.ghiChu, luc(x.luc))
}

/** "MM-DD HH:mm" (năm 2026) → mốc giờ VN của so-lieu.ts. */
const moc2026 = (s: string) => `2026-${s}`

/**
 * 85 thẻ + lịch sử ôn (THE_MAU), chạy theo thời gian qua đúng hàm của server: taoThe (hộp 1, hạn ngày mai) và
 * ghiLanOn (Leitner 3.5), nên hộp và hạn cuối là kết quả của quy tắc thật.
 */
function seedThe({ db, cay }: NguCanhSeed): void {
  type SuKien = { ms: number; the: number; ketQua?: 'nho' | 'quen' }
  const suKien: SuKien[] = []
  THE_MAU.forEach(([, tao, on], i) => {
    suKien.push({ ms: luc(moc2026(tao)), the: i })
    for (const lan of on ? on.split(', ') : []) {
      const [ngay, kq] = lan.split(' ')
      suKien.push({
        ms: luc(`${moc2026(ngay)} ${GIO_ON}`),
        the: i,
        ketQua: kq === 'N' ? 'nho' : 'quen',
      })
    }
  })
  suKien.sort((a, b) => a.ms - b.ms || a.the - b.the)
  const idThe = new Map<number, number>()
  const soThuTu = new Map<string, number>()
  for (const sk of suKien) {
    const [slug] = THE_MAU[sk.the]
    if (!sk.ketQua) {
      const n = (soThuTu.get(slug) ?? 0) + 1
      soThuTu.set(slug, n)
      const the = taoThe(db, {
        itemId: mucCua(cay, slug).id,
        truoc: CHU_MAU.matTruoc(n),
        sau: CHU_MAU.matSau(n),
        luc: sk.ms,
      }).the
      idThe.set(sk.the, the.id)
      continue
    }
    const id = idThe.get(sk.the)
    if (id === undefined) throw new Error(`Thẻ mẫu ${sk.the} (${slug}) được ôn trước khi tạo`)
    ghiLanOn(db, { theId: id, ketQua: sk.ketQua, luc: sk.ms })
  }
}

/** Các phần seed theo thứ tự chạy (phase 2a, 2b, 3). Phase sau thêm phần của mình vào cuối. */
export const PHAN_SEED: readonly PhanSeed[] = [
  { ten: 'cai-dat', bang: ['settings'], chay: seedCaiDat },
  { ten: 'trang-thai-hoc', bang: ['item_status', 'status_events'], chay: seedTrangThaiHoc },
  { ten: 'luot-mo', bang: ['item_visits'], chay: seedLuotMo },
  { ten: 'ban-chup-duyet', bang: ['content_approvals'], chay: seedBanChupDuyet },
  { ten: 'so-noi-dung', bang: ['content_files'], chay: seedSoNoiDung },
  { ten: 'du-an', bang: ['projects'], chay: seedDuAn },
  { ten: 'thuc-hanh', bang: ['practice'], chay: seedThucHanh },
  { ten: 'noi-lai', bang: ['restatements'], chay: seedNoiLai },
  { ten: 'tu-kiem-tra', bang: ['self_check'], chay: seedTuKiemTra },
  { ten: 'ghi-chu', bang: ['notes'], chay: seedGhiChu },
  { ten: 'the', bang: ['flashcards', 'flashcard_reviews'], chay: seedThe },
]

/** Số liệu §7 chưa seed vì bảng chưa có (phase = phase tạo bảng theo đề xuất mục 9). */
export const CHUA_SEED: readonly { phase: string; bang: string; soLieu: string }[] = [
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
  /** Phase 3 */
  soThe: number
  soLanOn: number
  soGhiChu: number
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
    soThe: dem('SELECT count(*) AS n FROM flashcards'),
    soLanOn: dem('SELECT count(*) AS n FROM flashcard_reviews'),
    soGhiChu: dem('SELECT count(*) AS n FROM notes'),
  }
}
