// Bộ dữ liệu mẫu phase 3 (§7, đề xuất mục 7; F11, F15, F31, F38): flashcard 85 thẻ hộp 34/21/15/9/6, 12 đến
// hạn, nhớ 81% (30 ngày), Cần ôn lại 3 mục; 7 bài thực hành Xong; Nói lại, ghi chú như frame — qua DB và API thật.
// Phạm vi rút gọn 27/10/2026 bỏ đồng hồ học / giờ học: bộ mẫu không có phiên giờ, không có đồng hồ đang chạy.
import Database from 'better-sqlite3'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { datLech, ngayCua } from '../../shared/clock.ts'
import { congNgay } from '../../shared/lich.ts'
import { taoApp } from '../../server/app.ts'
import { docCauHinh } from '../../server/cau-hinh.ts'
import type { Db } from '../../server/db/index.ts'
import { sauKhiOn, theMoi } from '../../server/du-lieu/hop-dong-the.ts'
import { DANG_HOC, GIO_MAU, luc } from '../../fixtures/mau/so-lieu.ts'
import { DICH_HOC, GHI_CHU_MAU, THE_MAU, THUC_HANH_XONG } from '../../fixtures/mau/so-lieu-hoc.ts'
import type { KetQuaChuanBi } from '../../fixtures/mau/kich-ban.ts'
import { cay, dungKichBan, laGioMau, mucSlug, thuMucTam } from './ho-tro.ts'

const HOM_NAY = GIO_MAU.slice(0, 10)

let tam: ReturnType<typeof thuMucTam>
let kq: KetQuaChuanBi
let db: Db

beforeAll(async () => {
  if (!laGioMau) return
  tam = thuMucTam()
  kq = await dungKichBan('mac-dinh', tam.goc)
  db = new Database(kq.tepDb, { readonly: true })
})

afterAll(() => {
  datLech(0)
  if (!laGioMau) return
  db.close()
  tam.xoa()
})

const slugCua = (id: string) => cay.mucTheoId.get(id)?.slug

interface DongThe {
  id: number
  item_id: string
  box: number
  due_on: string
  created_at: string
}

describe.skipIf(!laGioMau)('flashcard §7 / F31', () => {
  it('85 thẻ; hộp 1–5 = 34 / 21 / 15 / 9 / 6; 12 thẻ đến hạn 22/10', () => {
    expect(kq.tomTat?.soThe).toBe(DICH_HOC.soThe)
    const hop = db
      .prepare('SELECT box, count(*) AS n FROM flashcards GROUP BY box ORDER BY box')
      .all()
    expect(hop).toEqual(DICH_HOC.hop.map((n, i) => ({ box: i + 1, n })))
    const denHan = db.prepare('SELECT count(*) AS n FROM flashcards WHERE due_on <= ?').get(HOM_NAY)
    expect(denHan).toEqual({ n: DICH_HOC.denHan })
    // Ôn mỗi ngày trước 22/10 nên không thẻ nào trễ hạn quá hôm nay mà ngoài 12 thẻ đó
    const tenMuc = db
      .prepare('SELECT item_id, count(*) AS n FROM flashcards WHERE due_on <= ? GROUP BY item_id')
      .all(HOM_NAY) as { item_id: string; n: number }[]
    expect(Object.fromEntries(tenMuc.map((x) => [slugCua(x.item_id), x.n]))).toEqual({
      scrum: 5,
      moscow: 4,
      'definition-of-done': 3,
    })
  })

  it('tỉ lệ nhớ 30 ngày = 81% (Nhớ / tổng lần ôn; cửa sổ 23/09–22/10, cả 22/09–22/10)', () => {
    for (const lui of [29, 30]) {
      const tu = congNgay(HOM_NAY, -lui)
      const r = db
        .prepare(
          `SELECT sum(result = 'nho') AS nho, count(*) AS tong FROM flashcard_reviews
           WHERE reviewed_on BETWEEN ? AND ?`,
        )
        .get(tu, HOM_NAY) as { nho: number; tong: number }
      expect(Math.round((r.nho / r.tong) * 100), tu).toBe(DICH_HOC.tiLeNho30Ngay)
    }
  })

  it('mỗi thẻ: hộp và hạn = phát lại lịch sử ôn bằng quy tắc Leitner (3.5); không ôn trước khi tạo, sau GIO_MAU', () => {
    const cacThe = db.prepare('SELECT * FROM flashcards ORDER BY id').all() as DongThe[]
    const lanOn = db.prepare('SELECT * FROM flashcard_reviews WHERE card_id = ? ORDER BY id')
    for (const t of cacThe) {
      let trang = theMoi(ngayCua(Date.parse(t.created_at)))
      for (const l of lanOn.all(t.id) as {
        reviewed_at: string
        reviewed_on: string
        result: 'nho' | 'quen'
        from_box: number
        to_box: number
      }[]) {
        expect(l.reviewed_at > t.created_at).toBe(true)
        expect(l.reviewed_at < new Date(Date.parse(GIO_MAU)).toISOString()).toBe(true)
        expect(l.reviewed_on >= trang.hanOn, `thẻ ${t.id} ôn trước hạn`).toBe(true)
        expect(l.from_box).toBe(trang.hop)
        trang = sauKhiOn(trang.hop, l.result, l.reviewed_on)
        expect(l.to_box).toBe(trang.hop)
      }
      expect({ hop: t.box, hanOn: t.due_on }).toEqual(trang)
    }
    expect(kq.tomTat?.soLanOn).toBe(
      THE_MAU.reduce((n, [, , on]) => n + (on ? on.split(', ').length : 0), 0),
    )
  })

  it('Scope Creep 3 thẻ như F11 (hộp 2 ôn lại 24/10; hộp 1 ôn lại 23/10 ×2); Risk Register không có thẻ (F15)', () => {
    const cua = (slug: string) =>
      db
        .prepare('SELECT box, due_on FROM flashcards WHERE item_id = ? ORDER BY id')
        .all(mucSlug(slug).id)
    expect(cua('scope-creep')).toEqual([
      { box: 2, due_on: '2026-10-24' },
      { box: 1, due_on: '2026-10-23' },
      { box: 1, due_on: '2026-10-23' },
    ])
    expect(cua('risk-register')).toEqual([])
  })
})

describe.skipIf(!laGioMau)('API trên DB mẫu lúc GIO_MAU', () => {
  let rw: Db
  let app: ReturnType<typeof taoApp>
  const get = (url: string) => request(app).get(url).set('Host', '127.0.0.1:5321')

  beforeAll(() => {
    if (!laGioMau) return
    rw = new Database(kq.tepDb)
    app = taoApp({
      cauHinh: docCauHinh({ DATA_DIR: kq.dataDir, NOI_DUNG_DIR: kq.noiDungDir }),
      db: rw,
      soMucHoc: cay.soMucHoc,
    })
  })
  afterAll(() => {
    if (laGioMau) rw.close()
  })
  beforeEach(() => {
    // Đồng hồ ảo của bộ mẫu như dev:mau: now() = GIO_MAU
    datLech(Date.parse(GIO_MAU) - Date.now())
  })

  it('GET /api/state: Cần ôn lại = Scrum, MoSCoW, Definition of Done; lọc Đang học + Cần ôn lại = 9', async () => {
    const st = (await get('/api/state')).body
    expect(st.canOnLai.map(slugCua).sort()).toEqual([...DICH_HOC.canOnLai].sort())
    const dangHoc = Object.keys(st.trangThai).filter((id) => st.trangThai[id].status === 'learning')
    expect(new Set([...dangHoc, ...st.canOnLai]).size).toBe(9)
  })

  it('GET /api/dong-ho: không có đồng hồ đang chạy, không có phiên giờ (bỏ đồng hồ 27/10/2026)', async () => {
    const res = await get('/api/dong-ho')
    expect(res.status).toBe(200)
    expect(res.body.dangChay).toBeNull()
    expect(res.body.lichSu).toEqual([])
  })

  it('GET /api/hoc: Scope Creep (F11) — Nói lại + ghi chú lưu 21:42, Áp dụng đang làm trên dự án mẫu; không có giờ học', async () => {
    const sc = (await get(`/api/hoc/${mucSlug('scope-creep').id}`)).body
    expect(sc.daHocGiay).toBe(0)
    expect(sc.noiLai.capNhat).toBe(new Date(Date.parse(GIO_MAU)).toISOString())
    expect(sc.ghiChu.capNhat).toBe(new Date(Date.parse(GIO_MAU)).toISOString())
    expect(sc.thucHanh).toMatchObject({ trangThai: 'dang-lam', ketQua: '', xongLuc: null })
    const duAn = (await get('/api/du-an')).body
    expect(duAn).toEqual([
      { id: sc.thucHanh.duAnId, ten: 'Cổng đặt lịch nội bộ', vaiTro: null, giaiDoan: 'Execution' },
    ])
    expect(sc.tuKiemTra).toEqual({}) // F19 "chưa tự chấm câu nào"
    expect(sc.the).toHaveLength(3)

    const rr = (await get(`/api/hoc/${mucSlug('risk-register').id}`)).body
    expect(rr.daHocGiay).toBe(0)
    expect(rr.noiLai.capNhat).toBe(new Date(luc('2026-10-22 21:18')).toISOString())
    expect(rr.the).toEqual([])
  })
})

describe.skipIf(!laGioMau)('không seed giờ học (phạm vi rút gọn 27/10/2026)', () => {
  it('time_entries, active_timer rỗng; tóm tắt seed không còn số phiên giờ', () => {
    expect(db.prepare('SELECT count(*) AS n FROM time_entries').get()).toEqual({ n: 0 })
    expect(db.prepare('SELECT count(*) AS n FROM active_timer').get()).toEqual({ n: 0 })
    expect(kq.tomTat).not.toHaveProperty('soPhienGio')
  })
})

describe.skipIf(!laGioMau)('4 bước, ghi chú (§7 độ sâu, F11, F38)', () => {
  it('7 bài thực hành Xong (Chủ đề Đã xong, có kết quả, tiêu chí tick); không có Không áp dụng', () => {
    const xong = db
      .prepare("SELECT item_id, result_md, criteria FROM practice WHERE state = 'xong'")
      .all() as { item_id: string; result_md: string; criteria: string | null }[]
    expect(xong.map((x) => slugCua(x.item_id)).sort()).toEqual([...THUC_HANH_XONG].sort())
    expect(xong).toHaveLength(DICH_HOC.thucHanhXong)
    for (const x of xong) {
      expect(x.result_md.trim()).not.toBe('')
      expect(Object.keys(JSON.parse(x.criteria ?? '{}')).length).toBeGreaterThan(0)
    }
    expect(
      db.prepare("SELECT count(*) AS n FROM practice WHERE state = 'khong-ap-dung'").get(),
    ).toEqual({ n: 0 })
  })

  it('tiêu chí đã tick và câu tự kiểm tra lưu kèm chữ trong bài (đề xuất 1.5: để gán lại khi câu đổi chữ)', () => {
    for (const x of db
      .prepare('SELECT criteria FROM practice WHERE criteria IS NOT NULL')
      .all() as {
      criteria: string
    }[]) {
      for (const chu of Object.values(JSON.parse(x.criteria) as Record<string, unknown>)) {
        expect(typeof chu).toBe('string')
      }
    }
    expect(
      db.prepare('SELECT count(*) AS n FROM self_check WHERE question_text IS NULL').get(),
    ).toEqual({ n: 0 })
    expect(
      (db.prepare('SELECT count(*) AS n FROM self_check').get() as { n: number }).n,
    ).toBeGreaterThan(0)
  })

  it('Nói lại: 37 mục Đã xong + Scope Creep + Risk Register; mục Đã xong đã tự chấm mọi câu', () => {
    expect(db.prepare('SELECT count(*) AS n FROM restatements').get()).toEqual({ n: 39 })
    const chuaCham = db
      .prepare('SELECT count(*) AS n FROM self_check WHERE grade IS NULL OR revealed_at IS NULL')
      .get()
    expect(chuaCham).toEqual({ n: 0 })
    const dangHoc = DANG_HOC.map((x) => mucSlug(x.slug).id)
    const cuaDangHoc = db
      .prepare(
        `SELECT count(*) AS n FROM self_check WHERE item_id IN (${dangHoc.map(() => '?').join(', ')})`,
      )
      .get(...dangHoc)
    expect(cuaDangHoc).toEqual({ n: 0 })
  })

  it('6 ghi chú, ngày như F38 (mới nhất: Scope Creep 22/10/2026)', () => {
    const ds = db
      .prepare('SELECT item_id, updated_at FROM notes ORDER BY updated_at DESC')
      .all() as { item_id: string; updated_at: string }[]
    expect(ds).toHaveLength(DICH_HOC.soGhiChu)
    expect(ds.map((x) => [slugCua(x.item_id), ngayCua(Date.parse(x.updated_at))])).toEqual(
      [...GHI_CHU_MAU].reverse().map((x) => [x.slug, x.luc.slice(0, 10)]),
    )
  })
})
