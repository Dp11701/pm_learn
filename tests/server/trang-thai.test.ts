// API trạng thái học (đề xuất 1.10, 2.1, 2.2 bất biến 2, 3, 8; 3.1): supertest trên DB + thư mục tạm.
import path from 'node:path'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { datLech, homNay, ngayCua, now, nowIso } from '../../shared/clock.ts'
import { layCay } from '../../shared/roadmap/index.ts'
import { taoApp } from '../../server/app.ts'
import { docCauHinh } from '../../server/cau-hinh.ts'
import { layPhienBan, moDb, type Db } from '../../server/db/index.ts'
import { dsMigration } from '../../server/db/migrations.ts'
import { layRevision } from '../../server/db/settings.ts'
import { taoSaoLuu, type SaoLuu } from '../../server/sao-luu.ts'
import {
  coBanChup,
  docBanChupHienHanh,
  docCacBanChupHienHanh,
} from '../../server/du-lieu/ban-chup-duyet.ts'
import {
  giaTriCua,
  mucCua,
  sangDb,
  tuDb,
  LY_DO_TOI_DA,
} from '../../server/du-lieu/hop-dong-trang-thai.ts'
import { datTrangThai, docSuKien, ghiLuotMo } from '../../server/du-lieu/trang-thai.ts'
import { CAC_TRANG_THAI_HOC } from '../../shared/domain/trang-thai.ts'
import { datGio, HOST, SO_MUC_HOC_GIA, taoThuMucTam, type ThuMucTam } from './tro-giup.ts'

const cay = layCay()
const [mucA, mucB, mucC] = cay.mucHoc
const linhVuc = [...cay.nutTheoId.values()].find((n) => n.kind === 'area')!
const ID_LA = 'khong-co-trong-cay-xyz'

let tam: ThuMucTam
let db: Db
let saoLuu: SaoLuu
let app: ReturnType<typeof taoApp>

beforeEach(async () => {
  datLech(0)
  tam = taoThuMucTam()
  db = await moDb(path.join(tam.dataDir, 'hoc.db'))
  saoLuu = taoSaoLuu({ db, dataDir: tam.dataDir, noiDungDir: tam.noiDungDir })
  const cauHinh = docCauHinh({ DATA_DIR: tam.dataDir, NOI_DUNG_DIR: tam.noiDungDir })
  app = taoApp({ cauHinh, db, saoLuu, soMucHoc: SO_MUC_HOC_GIA })
})

afterEach(async () => {
  await saoLuu.choXong()
  db.close()
  tam.xoa()
  datLech(0)
})

const get = (url: string) => request(app).get(url).set('Host', HOST)
const put = (id: string, body?: unknown) => {
  const r = request(app)
    .put(`/api/trang-thai/${encodeURIComponent(id)}`)
    .set('Host', HOST)
  return body === undefined ? r : r.send(body as object)
}
const post = (url: string) => request(app).post(url).set('Host', HOST)

function dongTrangThai(id: string) {
  return db.prepare('SELECT * FROM item_status WHERE item_id = ?').get(id) as
    | { status: string; skip_reason: string | null; created_at: string; updated_at: string }
    | undefined
}
const demBang = (bang: string) =>
  (db.prepare(`SELECT count(*) AS n FROM ${bang}`).get() as { n: number }).n

describe('migration 2 (đề xuất 2.1)', () => {
  it('có đủ 4 bảng, user_version = số migration', () => {
    expect(layPhienBan(db)).toBe(dsMigration.length)
    const bang = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .pluck()
      .all()
    expect(bang).toEqual(
      expect.arrayContaining(['content_approvals', 'item_status', 'item_visits', 'status_events']),
    )
  })

  it('bất biến 2: status chỉ 3 giá trị; lý do chỉ đi với Bỏ qua; không có Cần ôn lại (bất biến 3)', () => {
    const them = (status: string, lyDo: string | null = null) =>
      db
        .prepare(
          "INSERT INTO item_status VALUES ('x', ?, ?, '2026-10-22T00:00:00.000Z', '2026-10-22T00:00:00.000Z')",
        )
        .run(status, lyDo)
    for (const sai of ['chua-hoc', 'dang-hoc', 'can-on-lai', 'review', '']) {
      expect(() => them(sai)).toThrow(/CHECK/)
    }
    expect(() => them('learning', 'lý do')).toThrow(/CHECK/)
    expect(() => them('skip', 'lý do')).not.toThrow()
    // Không bảng / cột / chỉ mục nào lưu "Cần ôn lại" (phase 3 có flashcard_reviews, due_on của thẻ — là dữ
    // liệu gốc để suy ra, không phải cờ).
    const ten = db
      .prepare(
        `SELECT m.name FROM sqlite_master m
         UNION ALL
         SELECT p.name FROM sqlite_master m, pragma_table_info(m.name) p WHERE m.type = 'table'`,
      )
      .pluck()
      .all() as string[]
    expect(ten.length).toBeGreaterThan(10)
    expect(ten.filter((c) => /on.?lai|needs.?review|review.?flag|can.?on/i.test(c))).toEqual([])
  })

  it('status_events: via, ngày, from ≠ to đều có CHECK', () => {
    const them = (tu: string | null, den: string | null, on: string, via: string) =>
      db
        .prepare(
          `INSERT INTO status_events (item_id, from_status, to_status, at, "on", via, created_at)
           VALUES ('x', ?, ?, 'a', ?, ?, 'a')`,
        )
        .run(tu, den, on, via)
    expect(() => them(null, 'learning', '2026-10-22', 'mot-muc')).not.toThrow()
    expect(() => them(null, 'learning', '2026-10-22', 'khac')).toThrow(/CHECK/)
    expect(() => them(null, 'learning', '22/10/2026', 'mot-muc')).toThrow(/CHECK/)
    expect(() => them('done', 'done', '2026-10-22', 'mot-muc')).toThrow(/CHECK/)
    expect(() => them(null, null, '2026-10-22', 'mot-muc')).toThrow(/CHECK/)
    expect(() => them('done', 'dang-hoc', '2026-10-22', 'mot-muc')).toThrow(/CHECK/)
  })

  it('content_approvals: tối đa 1 bản chụp hiện hành mỗi mục', () => {
    const them = (superseded: string | null) =>
      db
        .prepare(
          `INSERT INTO content_approvals (item_id, approved_on, hash, body, superseded_at, created_at, updated_at)
           VALUES ('x', '2026-10-18', 'h', 'b', ?, 'a', 'a')`,
        )
        .run(superseded)
    them('2026-10-19T00:00:00.000Z')
    them(null)
    expect(() => them(null)).toThrow(/UNIQUE/)
  })
})

describe('GET /api/state', () => {
  it('DB trống: revision 0, không mục nào (Chưa học = không có khoá)', async () => {
    const res = await get('/api/state')
    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.body).toEqual({ revision: 0, trangThai: {}, luotMo: {}, canOnLai: [] })
  })

  it('bất biến 8: bản ghi của mục không còn trong cây vẫn giữ trong DB, không vào ảnh chụp', async () => {
    datTrangThai(db, { id: ID_LA, giaTri: { trangThai: 'da-xong' }, via: 'mot-muc' })
    ghiLuotMo(db, ID_LA)
    datTrangThai(db, { id: mucA.id, giaTri: { trangThai: 'dang-hoc' }, via: 'mot-muc' })
    const res = await get('/api/state')
    expect(Object.keys(res.body.trangThai)).toEqual([mucA.id])
    expect(res.body.luotMo).toEqual({})
    expect(dongTrangThai(ID_LA)?.status).toBe('done')
  })
})

describe('PUT /api/trang-thai/:id', () => {
  it('đặt Đang học: ghi hàng + sự kiện (Chưa học → learning) trong 1 transaction, tăng revision', async () => {
    datGio('2026-10-22T21:42:00+07:00')
    const res = await put(mucA.id, { trangThai: 'dang-hoc' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      revision: 1,
      id: mucA.id,
      muc: { status: 'learning' },
      sau: { trangThai: 'dang-hoc' },
      truoc: { trangThai: 'chua-hoc' },
      daDoi: true,
    })
    expect(dongTrangThai(mucA.id)).toMatchObject({ status: 'learning', skip_reason: null })
    const [sk] = docSuKien(db, mucA.id)
    expect(sk).toMatchObject({ itemId: mucA.id, tu: null, den: 'learning', via: 'mot-muc' })
    expect(sk.on).toBe(ngayCua(Date.parse('2026-10-22T21:42:00+07:00')))
    if (process.env.TZ === 'Asia/Ho_Chi_Minh') expect(sk.on).toBe('2026-10-22')
    expect(Math.abs(Date.parse(sk.at) - Date.parse('2026-10-22T14:42:00Z'))).toBeLessThan(5000)
    expect((await get('/api/meta')).body.revision).toBe(1)
    expect((await get('/api/state')).body).toEqual({
      revision: 1,
      trangThai: { [mucA.id]: { status: 'learning' } },
      luotMo: {},
      canOnLai: [],
    })
  })

  it('ngày của sự kiện là ngày server lúc ghi (qua nửa đêm thì sang ngày mới)', async () => {
    datGio('2026-12-31T23:59:50')
    await put(mucA.id, { trangThai: 'dang-hoc' })
    datGio('2027-01-01T00:00:01')
    await put(mucA.id, { trangThai: 'da-xong' })
    expect(docSuKien(db, mucA.id).map((s) => s.on)).toEqual(['2026-12-31', '2027-01-01'])
    expect(homNay()).toBe('2027-01-01')
  })

  it('Chưa học xoá hàng (không có hàng = Chưa học) và ghi sự kiện learning → NULL', async () => {
    await put(mucA.id, { trangThai: 'dang-hoc' })
    const res = await put(mucA.id, { trangThai: 'chua-hoc' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      muc: null,
      sau: { trangThai: 'chua-hoc' },
      truoc: { trangThai: 'dang-hoc' },
      revision: 2,
    })
    expect(dongTrangThai(mucA.id)).toBeUndefined()
    expect(docSuKien(db, mucA.id).map((s) => [s.tu, s.den])).toEqual([
      [null, 'learning'],
      ['learning', null],
    ])
    expect((await get('/api/state')).body.trangThai).toEqual({})
  })

  it('Bỏ qua kèm lý do; chỉ đổi lý do thì cập nhật hàng, không thêm sự kiện; trùng giá trị thì không ghi gì', async () => {
    let res = await put(mucB.id, { trangThai: 'bo-qua', lyDo: '  Không dùng trong công việc ' })
    expect(res.body.muc).toEqual({ status: 'skip', lyDoBoQua: 'Không dùng trong công việc' })
    expect(dongTrangThai(mucB.id)?.skip_reason).toBe('Không dùng trong công việc')

    res = await put(mucB.id, { trangThai: 'bo-qua', lyDo: 'Đã biết' })
    expect(res.body).toMatchObject({
      daDoi: true,
      revision: 2,
      truoc: { trangThai: 'bo-qua', lyDo: 'Không dùng trong công việc' },
      sau: { trangThai: 'bo-qua', lyDo: 'Đã biết' },
    })
    expect(docSuKien(db, mucB.id)).toHaveLength(1)

    res = await put(mucB.id, { trangThai: 'bo-qua', lyDo: 'Đã biết' })
    expect(res.body).toMatchObject({ daDoi: false, revision: 2 })
    expect(layRevision(db)).toBe(2)
    expect(docSuKien(db, mucB.id)).toHaveLength(1)

    // Lý do rỗng = không có lý do.
    res = await put(mucB.id, { trangThai: 'bo-qua', lyDo: '   ' })
    expect(res.body.muc).toEqual({ status: 'skip' })
    expect((await get('/api/state')).body.trangThai[mucB.id]).toEqual({ status: 'skip' })
  })

  it('Hoàn tác (round-trip): gửi lại giá trị `truoc` với via hoan-tac → về đúng giá trị cũ, kể cả lý do', async () => {
    await put(mucC.id, { trangThai: 'bo-qua', lyDo: 'Để sau' })
    const doi = await put(mucC.id, { trangThai: 'da-xong' })
    expect(doi.body.truoc).toEqual({ trangThai: 'bo-qua', lyDo: 'Để sau' })
    expect(dongTrangThai(mucC.id)?.skip_reason).toBeNull()

    const hoanTac = await put(mucC.id, { ...doi.body.truoc, via: 'hoan-tac' })
    expect(hoanTac.status).toBe(200)
    expect(hoanTac.body).toMatchObject({
      sau: { trangThai: 'bo-qua', lyDo: 'Để sau' },
      truoc: { trangThai: 'da-xong' },
    })
    expect((await get('/api/state')).body.trangThai[mucC.id]).toEqual({
      status: 'skip',
      lyDoBoQua: 'Để sau',
    })
    // Hoàn tác ghi sự kiện ngược (3.1).
    expect(docSuKien(db, mucC.id).map((s) => [s.tu, s.den, s.via])).toEqual([
      [null, 'skip', 'mot-muc'],
      ['skip', 'done', 'mot-muc'],
      ['done', 'skip', 'hoan-tac'],
    ])

    // Hoàn tác từ Chưa học: về Chưa học thì xoá hàng.
    const moi = await put(mucA.id, { trangThai: 'dang-hoc' })
    await put(mucA.id, { ...moi.body.truoc, via: 'hoan-tac' })
    expect(dongTrangThai(mucA.id)).toBeUndefined()
  })

  it('giữ created_at, đổi updated_at khi cập nhật hàng', async () => {
    datGio('2026-10-20T08:00:00Z')
    await put(mucA.id, { trangThai: 'dang-hoc' })
    datGio('2026-10-21T08:00:00Z')
    await put(mucA.id, { trangThai: 'da-xong' })
    expect(dongTrangThai(mucA.id)).toMatchObject({
      // Đồng hồ vẫn trôi theo giờ thật sau datGio: so tới giây.
      created_at: expect.stringMatching(/^2026-10-20T08:00:0\d\.\d{3}Z$/),
      updated_at: expect.stringMatching(/^2026-10-21T08:00:0\d\.\d{3}Z$/),
    })
  })

  it('bất biến 8: id không phải mục học của cây → 404 tiếng Việt, không ghi gì', async () => {
    for (const id of [ID_LA, linhVuc.id, cay.phan[0].id]) {
      const res = await put(id, { trangThai: 'dang-hoc' })
      expect(res.status).toBe(404)
      expect(res.body.loi).toBe(`Không có mục học id "${id}" trong cây roadmap.`)
    }
    expect(demBang('item_status')).toBe(0)
    expect(demBang('status_events')).toBe(0)
    expect(layRevision(db)).toBe(0)
  })

  it.each([
    [
      { trangThai: 'can-on-lai' },
      `trangThai không hợp lệ: cần một trong ${CAC_TRANG_THAI_HOC.join(', ')}.`,
    ],
    [{ trangThai: 'learning' }, /^trangThai không hợp lệ/],
    [{}, /^trangThai không hợp lệ/],
    [{ trangThai: 'dang-hoc', lyDo: 'x' }, 'lyDo chỉ dùng khi trangThai là bo-qua.'],
    [{ trangThai: 'bo-qua', lyDo: 3 }, 'lyDo phải là chuỗi.'],
    [
      { trangThai: 'bo-qua', lyDo: 'a'.repeat(LY_DO_TOI_DA + 1) },
      `Lý do Bỏ qua dài tối đa ${LY_DO_TOI_DA} ký tự.`,
    ],
    [{ trangThai: 'da-xong', via: 'hang-loat' }, 'via không hợp lệ: cần mot-muc hoặc hoan-tac.'],
    [
      { trangThai: 'da-xong', ngay: '2026-10-22' },
      'Trường không được nhận: ngay. Chỉ nhận trangThai, lyDo, via.',
    ],
    [['dang-hoc'], /^Thân yêu cầu phải là JSON/],
  ])('body sai %j → 400 tiếng Việt, không ghi gì', async (body, cau) => {
    const res = await put(mucA.id, body)
    expect(res.status).toBe(400)
    if (typeof cau === 'string') expect(res.body.loi).toBe(cau)
    else expect(res.body.loi).toMatch(cau)
    expect(demBang('item_status')).toBe(0)
    expect(demBang('status_events')).toBe(0)
    expect(layRevision(db)).toBe(0)
  })

  it('không có body / body không phải JSON → 400 tiếng Việt', async () => {
    const thieu = await put(mucA.id)
    expect(thieu.status).toBe(400)
    expect(thieu.body.loi).toMatch(/^Thân yêu cầu phải là JSON/)
    const hong = await put(mucA.id).set('Content-Type', 'application/json').send('{"trangThai":')
    expect(hong.status).toBe(400)
    expect(hong.body.loi).toBe('Dữ liệu gửi lên không phải JSON hợp lệ.')
  })

  it('transaction: ghi sự kiện lỗi → hàng trạng thái và revision giữ nguyên (500)', async () => {
    await put(mucA.id, { trangThai: 'dang-hoc' })
    db.exec(
      `CREATE TRIGGER chan BEFORE INSERT ON status_events BEGIN SELECT RAISE(ABORT, 'chặn'); END`,
    )
    const res = await put(mucA.id, { trangThai: 'da-xong' })
    expect(res.status).toBe(500)
    expect(res.body.loi).toMatch(/^Máy chủ gặp lỗi/)
    expect(dongTrangThai(mucA.id)?.status).toBe('learning')
    expect(layRevision(db)).toBe(1)
    expect(docSuKien(db)).toHaveLength(1)
  })

  it('Origin lạ bị chặn như mọi API', async () => {
    const res = await put(mucA.id, { trangThai: 'dang-hoc' }).set('Origin', 'http://evil.example')
    expect(res.status).toBe(403)
    expect(demBang('item_status')).toBe(0)
  })
})

describe('POST /api/luot-mo/:id', () => {
  it('upsert lần mở gần nhất (giờ server), tăng revision; GET /api/state trả luotMo', async () => {
    datGio('2026-10-22T14:00:00Z')
    let res = await post(`/api/luot-mo/${mucA.id}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ revision: 1, id: mucA.id, lanMoCuoi: expect.any(String) })
    expect(res.body.lanMoCuoi).toMatch(/^2026-10-22T14:00:0\d\.\d{3}Z$/)
    datGio('2026-10-22T14:30:00Z')
    res = await post(`/api/luot-mo/${mucA.id}`)
    expect(res.body).toMatchObject({ revision: 2, id: mucA.id })
    const lech = Date.parse(res.body.lanMoCuoi) - Date.parse('2026-10-22T14:30:00Z')
    expect(lech).toBeGreaterThanOrEqual(0)
    expect(lech).toBeLessThan(5000)
    expect(Date.parse(nowIso())).toBeGreaterThanOrEqual(Date.parse(res.body.lanMoCuoi))
    expect(demBang('item_visits')).toBe(1)
    expect((await get('/api/state')).body.luotMo).toEqual({ [mucA.id]: res.body.lanMoCuoi })
    // Lượt mở không đổi trạng thái học (app không tự đổi trạng thái — 3.1).
    expect(demBang('item_status')).toBe(0)
  })

  it('id không phải mục học → 404, không ghi', async () => {
    const res = await post(`/api/luot-mo/${ID_LA}`)
    expect(res.status).toBe(404)
    expect(res.body.loi).toMatch(/^Không có mục học id/)
    expect(demBang('item_visits')).toBe(0)
  })

  it('chỉ nhận POST', async () => {
    const res = await get(`/api/luot-mo/${mucA.id}`)
    expect(res.status).toBe(404)
  })
})

describe('ánh xạ DB ↔ TrangThaiHoc (một nơi)', () => {
  it('đi rồi về giữ nguyên; Chưa học ↔ null', () => {
    for (const tt of CAC_TRANG_THAI_HOC) expect(tuDb(sangDb(tt))).toBe(tt)
    expect(sangDb('chua-hoc')).toBeNull()
    expect(tuDb(undefined)).toBe('chua-hoc')
    expect(mucCua({ trangThai: 'dang-hoc', lyDo: 'x' })).toEqual({ status: 'learning' })
    expect(giaTriCua(null)).toEqual({ trangThai: 'chua-hoc' })
    expect(giaTriCua({ status: 'skip', lyDoBoQua: 'y' })).toEqual({
      trangThai: 'bo-qua',
      lyDo: 'y',
    })
  })
})

describe('bản chụp lúc duyệt (2a chỉ đọc)', () => {
  it('đọc bản chụp hiện hành, bỏ bản đã bị thay', () => {
    const them = db.prepare(
      `INSERT INTO content_approvals (item_id, approved_on, hash, body, superseded_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    them.run(mucA.id, '2026-10-01', 'h1', 'bản 1', '2026-10-18T00:00:00.000Z', 'a', 'a')
    them.run(mucA.id, '2026-10-18', 'h2', 'bản 2', null, 'a', 'a')
    them.run(mucB.id, '2026-10-02', 'h3', 'bản 3', '2026-10-05T00:00:00.000Z', 'a', 'a')
    expect(docBanChupHienHanh(db, mucA.id)).toMatchObject({
      itemId: mucA.id,
      ngayDuyet: '2026-10-18',
      hash: 'h2',
      noiDung: 'bản 2',
    })
    expect(docBanChupHienHanh(db, mucB.id)).toBeUndefined()
    expect(docBanChupHienHanh(db, mucC.id)).toBeUndefined()
    const ds = docCacBanChupHienHanh(db)
    expect([...ds.keys()]).toEqual([mucA.id])
    expect(ds.get(mucA.id)).not.toHaveProperty('noiDung')
    expect(coBanChup(db, mucB.id)).toBe(true)
    expect(coBanChup(db, mucC.id)).toBe(false)
  })
})

describe('đồng hồ', () => {
  it('thời điểm lưu là ISO UTC theo shared/clock', () => {
    const kq = datTrangThai(db, {
      id: mucA.id,
      giaTri: { trangThai: 'dang-hoc' },
      via: 'mot-muc',
      luc: now(),
    })
    expect(kq.daDoi).toBe(true)
    expect(docSuKien(db)[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })
})
