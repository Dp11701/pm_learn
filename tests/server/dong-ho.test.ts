// Đồng hồ học + phiên giờ (phase 3; đề xuất 2.2 bất biến 6, 3.4; Cần chốt 12): bắt đầu, chuyển trong 1
// transaction, quên tắt (> 3 giờ / qua nửa đêm, cả 2 múi giờ), phiên < 1 phút bỏ, ngày = ngày bắt đầu, chạy qua
// tắt / mở server, lịch sử 5 phiên, xoá + khôi phục, Hoàn tác chuyển; bất biến 6 khi bấm cùng lúc.
import Database from 'better-sqlite3'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ngayCua } from '../../shared/clock.ts'
import { layRevision } from '../../server/db/settings.ts'
import { batDau } from '../../server/du-lieu/dong-ho.ts'
import {
  canHoiQuenTat,
  giaySeGhi,
  giayTuanNay,
  tinhStreak,
} from '../../server/du-lieu/hop-dong-dong-ho.ts'
import { datGio, quaPhut } from './tro-giup.ts'
import {
  ID_LA,
  MUI_GIO_THU,
  cay,
  dem,
  mucSlug,
  taoMoiTruongHoc,
  trongMuiGio,
  type MoiTruongHoc,
} from './tro-giup-hoc.ts'

const rr = mucSlug('risk-register')
const sc = mucSlug('scope-creep')
const pig = mucSlug('power-interest-grid')

let mt: MoiTruongHoc
beforeEach(async () => {
  mt = await taoMoiTruongHoc()
})
afterEach(async () => {
  await mt.dong()
  vi.restoreAllMocks()
})

const batDauApi = (body: unknown) => mt.post('/api/dong-ho/bat-dau', body)
const dungApi = (body?: unknown) => mt.post('/api/dong-ho/dung', body)
const phien = () =>
  mt.db.prepare('SELECT * FROM time_entries ORDER BY id').all() as {
    id: number
    item_id: string
    date: string
    seconds: number
    started_at: string
    ended_at: string
  }[]

describe('quy tắc thuần (đề xuất 3.4, Cần chốt 12)', () => {
  it('quên tắt: > 3 giờ (đúng 3 giờ thì chưa) hoặc khác ngày lịch', () => {
    const t = Date.parse('2026-10-22T08:00:00Z')
    const cungNgay = () => '2026-10-22'
    expect(canHoiQuenTat(t, t + 3 * 3600_000, cungNgay)).toBe(false)
    expect(canHoiQuenTat(t, t + 3 * 3600_000 + 1000, cungNgay)).toBe(true)
    expect(canHoiQuenTat(t, t + 60_000, (ms) => (ms === t ? '2026-10-22' : '2026-10-23'))).toBe(
      true,
    )
  })

  it('số giây ghi: undefined = giờ thật, null = không ghi, số kẹp [60, giờ thật]; < 60 → 0', () => {
    expect(giaySeGhi(3000, undefined)).toBe(3000)
    expect(giaySeGhi(59, undefined)).toBe(0)
    expect(giaySeGhi(3000, null)).toBe(0)
    expect(giaySeGhi(3000, 0)).toBe(60)
    expect(giaySeGhi(3000, 1200)).toBe(1200)
    expect(giaySeGhi(3000, 99_999)).toBe(3000)
    expect(giaySeGhi(40, 600)).toBe(0)
  })

  it('tuần ISO và streak (tới hôm nay; chưa học hôm nay thì tới hôm qua), kỷ lục; qua năm 2026-W53', () => {
    const p = (ngay: string, giay = 600) => ({ ngay, giay })
    const ds = [
      p('2026-12-26'),
      p('2026-12-27'),
      p('2026-12-28'),
      p('2026-12-29'),
      p('2026-12-31'),
      p('2027-01-01'),
      p('2027-01-02'),
      p('2027-01-03', 59), // < 1 phút: không tính
    ]
    expect(tinhStreak(ds, '2027-01-02')).toEqual({ hienTai: 3, kyLuc: 4 })
    expect(tinhStreak(ds, '2027-01-03')).toEqual({ hienTai: 3, kyLuc: 4 })
    expect(tinhStreak(ds, '2027-01-04')).toEqual({ hienTai: 0, kyLuc: 4 })
    expect(tinhStreak([], '2027-01-04')).toEqual({ hienTai: 0, kyLuc: 0 })
    // 31/12/2026 và 01/01/2027 cùng tuần 2026-W53 (thứ Hai 28/12)
    expect(giayTuanNay(ds, '2027-01-01')).toBe(4 * 600)
    expect(giayTuanNay(ds, '2027-01-04')).toBe(0)
  })
})

describe('GET /api/dong-ho, bắt đầu, dừng', () => {
  it('chưa có gì → { dangChay: null, lichSu: [] }', async () => {
    expect((await mt.get('/api/dong-ho')).body).toEqual({ revision: 0, dangChay: null, lichSu: [] })
  })

  it('bắt đầu: giờ server; bấm lại cùng mục không đổi gì; dừng ghi phiên (ngày = ngày bắt đầu)', async () => {
    datGio('2026-10-22T21:17:43+07:00')
    const bd = await batDauApi({ itemId: rr.id })
    expect(bd.status).toBe(200)
    expect(bd.body).toEqual({
      revision: 1,
      daDoi: true,
      dangChay: { itemId: rr.id, batDau: expect.any(String) },
      dung: null,
      phien: null,
    })
    expect(
      Math.abs(Date.parse(bd.body.dangChay.batDau) - Date.parse('2026-10-22T14:17:43Z')),
    ).toBeLessThan(5000)
    expect((await batDauApi({ itemId: rr.id })).body).toMatchObject({ daDoi: false, revision: 1 })
    quaPhut(24)
    const d = await dungApi()
    expect(d.status).toBe(200)
    expect(d.body).toMatchObject({
      revision: 2,
      daDoi: true,
      dangChay: null,
      dung: { itemId: rr.id, giayThat: expect.any(Number) },
      phien: {
        id: expect.any(Number),
        itemId: rr.id,
        ngay: ngayCua(Date.parse(bd.body.dangChay.batDau)),
      },
    })
    expect(d.body.phien.giay).toBeGreaterThanOrEqual(24 * 60)
    expect(d.body.dung.phien).toEqual(d.body.phien)
    expect((await mt.get(`/api/hoc/${rr.id}`)).body.daHocGiay).toBe(d.body.phien.giay)
    expect((await dungApi({})).body).toMatchObject({ daDoi: false, dung: null, revision: 2 })
  })

  it('phiên < 60 giây không ghi; đúng 60 giây thì ghi', async () => {
    datGio('2026-10-22T10:00:00')
    await batDauApi({ itemId: rr.id })
    quaPhut(59 / 60)
    const ngan = await dungApi()
    expect(ngan.body.phien).toBeNull()
    expect(ngan.body.dung.giayThat).toBeLessThan(60)
    expect(phien()).toHaveLength(0)
    datGio('2026-10-22T11:00:00')
    await batDauApi({ itemId: rr.id })
    datGio('2026-10-22T11:01:00.5')
    expect((await dungApi()).body.phien.giay).toBe(60)
  })

  it('409 khi mục khác đang chạy (thân có dangChay); chuyen: true = dừng + bấm mục mới trong 1 lần', async () => {
    datGio('2026-10-22T20:00:00')
    await batDauApi({ itemId: rr.id })
    quaPhut(30)
    const xd = await batDauApi({ itemId: sc.id })
    expect(xd.status).toBe(409)
    expect(xd.body).toEqual({
      loi: `Đồng hồ đang chạy cho “${rr.label}”. Chỉ 1 đồng hồ chạy một lúc: gửi chuyen: true để dừng đồng hồ đó và bấm giờ mục này.`,
      dangChay: { itemId: rr.id, batDau: expect.any(String) },
    })
    expect(layRevision(mt.db)).toBe(1)
    const ch = await batDauApi({ itemId: sc.id, chuyen: true })
    expect(ch.body).toMatchObject({
      revision: 2,
      daDoi: true,
      dangChay: { itemId: sc.id },
      dung: { itemId: rr.id, phien: { itemId: rr.id } },
      phien: { itemId: rr.id, ngay: '2026-10-22' },
    })
    expect(ch.body.phien.giay).toBeGreaterThanOrEqual(30 * 60)
    expect(dem(mt.db, 'active_timer')).toBe(1)
  })

  it('chuyển là MỘT transaction: bấm mục mới lỗi → đồng hồ cũ vẫn chạy, không ghi phiên (500)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    datGio('2026-10-22T20:00:00')
    await batDauApi({ itemId: rr.id })
    quaPhut(30)
    mt.db.exec(`CREATE TRIGGER chan BEFORE INSERT ON active_timer WHEN NEW.item_id = '${sc.id}'
                BEGIN SELECT RAISE(ABORT, 'chặn'); END`)
    const res = await batDauApi({ itemId: sc.id, chuyen: true })
    expect(res.status).toBe(500)
    expect((await mt.get('/api/dong-ho')).body.dangChay.itemId).toBe(rr.id)
    expect(phien()).toHaveLength(0)
    expect(layRevision(mt.db)).toBe(1)
  })

  it('400 tiếng Việt, 404 mục lạ (bất biến 8)', async () => {
    const cases: [unknown, RegExp][] = [
      [{}, /^itemId phải là chuỗi\.$/],
      [{ itemId: rr.id, chuyen: 'co' }, /^chuyen phải là true hoặc false\.$/],
      [{ itemId: rr.id, ghiGiay: -1 }, /^ghiGiay phải là số giây/],
      [{ itemId: rr.id, ghiGiay: 1.5 }, /^ghiGiay phải là số giây/],
      [{ itemId: rr.id, x: 1 }, /^Trường không được nhận: x\. Chỉ nhận itemId, chuyen, ghiGiay\.$/],
    ]
    for (const [body, cau] of cases) {
      const res = await batDauApi(body)
      expect(res.status, JSON.stringify(body)).toBe(400)
      expect(res.body.loi).toMatch(cau)
    }
    expect((await dungApi({ ghiGiay: '60' })).body.loi).toMatch(/^ghiGiay phải là số giây/)
    const la = await batDauApi({ itemId: ID_LA })
    expect(la.status).toBe(404)
    expect(la.body.loi).toBe(`Không có mục học id "${ID_LA}" trong cây roadmap.`)
    expect(dem(mt.db, 'active_timer')).toBe(0)
  })
})

describe('quên tắt đồng hồ (Cần chốt 12)', () => {
  it('> 3 giờ: Dừng → 409 { canHoi, giay }; ghiGiay số → kẹp [60, giờ thật]; null → không ghi', async () => {
    datGio('2026-10-22T08:00:00')
    await batDauApi({ itemId: rr.id })
    // Mốc dừng lệch +0,5 giây để vài mili-giây trôi giữa datGio và request không đổi số giây làm tròn xuống
    datGio('2026-10-22T17:12:00.5')
    const hoi = await dungApi()
    expect(hoi.status).toBe(409)
    expect(hoi.body).toEqual({
      loi: 'Đồng hồ đã chạy 9 giờ 12 phút (hơn 3 giờ hoặc qua nửa đêm). Gửi lại kèm ghiGiay: số giây muốn ghi, hoặc null để không ghi.',
      canHoi: true,
      giay: 9 * 3600 + 12 * 60,
      dangChay: { itemId: rr.id, batDau: expect.any(String) },
    })
    expect(dem(mt.db, 'active_timer')).toBe(1)
    const ghi = await dungApi({ ghiGiay: 45 * 60 })
    expect(ghi.body.phien).toMatchObject({ giay: 45 * 60, ngay: '2026-10-22' })
    expect(phien()[0].ended_at).toBe(
      new Date(Date.parse(phien()[0].started_at) + 45 * 60_000).toISOString(),
    )

    await batDauApi({ itemId: rr.id })
    datGio('2026-10-22T21:30:00')
    expect((await dungApi({ ghiGiay: 10 })).body.phien.giay).toBe(60)
    await batDauApi({ itemId: rr.id })
    datGio('2026-10-23T01:00:00.5')
    expect((await dungApi({ ghiGiay: 10 ** 9 })).body.phien.giay).toBe(3.5 * 3600)
    await batDauApi({ itemId: rr.id })
    datGio('2026-10-23T05:00:00')
    const khong = await dungApi({ ghiGiay: null })
    expect(khong.body).toMatchObject({ daDoi: true, phien: null, dangChay: null })
    expect(phien()).toHaveLength(3)
  })

  it('đúng 3 giờ trong ngày: không hỏi', async () => {
    datGio('2026-10-22T08:00:00')
    await batDauApi({ itemId: rr.id })
    datGio('2026-10-22T11:00:00.5')
    expect((await dungApi()).body.phien.giay).toBe(3 * 3600)
  })

  it('Chuyển khi quên tắt: 409 canHoi, chưa chuyển; gửi lại kèm ghiGiay thì chuyển', async () => {
    datGio('2026-10-22T08:00:00')
    await batDauApi({ itemId: rr.id })
    datGio('2026-10-22T12:00:01.5')
    const hoi = await batDauApi({ itemId: sc.id, chuyen: true })
    expect(hoi.status).toBe(409)
    expect(hoi.body).toMatchObject({ canHoi: true, giay: 4 * 3600 + 1 })
    expect((await mt.get('/api/dong-ho')).body.dangChay.itemId).toBe(rr.id)
    const ch = await batDauApi({ itemId: sc.id, chuyen: true, ghiGiay: 3600 })
    expect(ch.body).toMatchObject({
      dangChay: { itemId: sc.id },
      phien: { itemId: rr.id, giay: 3600 },
    })
  })

  for (const tz of MUI_GIO_THU) {
    it(`qua nửa đêm theo ngày server (${tz}): hỏi dù mới chạy 15 phút; phiên ghi vào ngày bắt đầu`, async () => {
      await trongMuiGio(tz, async () => {
        datGio('2026-12-31T23:50:00')
        await batDauApi({ itemId: rr.id })
        datGio('2027-01-01T00:05:00.5')
        const hoi = await dungApi()
        expect(hoi.status).toBe(409)
        expect(hoi.body).toMatchObject({ canHoi: true, giay: 15 * 60 })
        const ghi = await dungApi({ ghiGiay: 15 * 60 })
        expect(ghi.body.phien).toMatchObject({ ngay: '2026-12-31', giay: 900 })
        expect(phien()[0].date).toBe('2026-12-31')
      })
    })
  }

  it('cùng một khoảng chạy: ở giờ Việt Nam qua nửa đêm (hỏi), ở Los Angeles thì không', async () => {
    const tu = '2026-10-22T16:50:00Z' // 23:50 VN · 09:50 LA
    const den = '2026-10-22T17:10:00Z' // 00:10 VN · 10:10 LA
    for (const [tz, hoi] of [
      ['Asia/Ho_Chi_Minh', true],
      ['America/Los_Angeles', false],
    ] as const) {
      await trongMuiGio(tz, async () => {
        datGio(tu)
        await batDauApi({ itemId: rr.id })
        datGio(den)
        const res = await dungApi()
        expect(res.status === 409, tz).toBe(hoi)
        if (hoi) await dungApi({ ghiGiay: null })
      })
    }
  })
})

describe('chạy qua tắt / mở server; lịch sử; xoá + khôi phục phiên', () => {
  it('đồng hồ vẫn chạy sau khi mở lại DB (started_at đã lưu), dừng được', async () => {
    datGio('2026-10-22T21:17:43')
    await batDauApi({ itemId: rr.id })
    const truoc = (await mt.get('/api/dong-ho')).body.dangChay
    await mt.moLai()
    quaPhut(10)
    expect((await mt.get('/api/dong-ho')).body.dangChay).toEqual(truoc)
    const d = await dungApi()
    expect(d.body.phien.giay).toBeGreaterThanOrEqual(600)
  })

  it('lịch sử: 5 phiên gần nhất (mới trước); ?itemId= lọc theo mục; phiên của mục không còn trong cây bị ẩn', async () => {
    datGio('2026-10-20T08:00:00')
    for (let i = 0; i < 7; i++) {
      await batDauApi({ itemId: i % 2 ? sc.id : rr.id })
      quaPhut(10 + i)
      await dungApi()
      quaPhut(5)
    }
    mt.db
      .prepare(
        `INSERT INTO time_entries (item_id, date, seconds, started_at, ended_at, created_at, updated_at)
         VALUES (?, '2026-10-21', 600, '2026-10-21T01:00:00.000Z', '2026-10-21T01:10:00.000Z', 'x', 'x')`,
      )
      .run(ID_LA)
    const { lichSu } = (await mt.get('/api/dong-ho')).body
    expect(lichSu.map((p: { giay: number }) => p.giay / 60)).toEqual([16, 15, 14, 13, 12])
    const cuaSc = (await mt.get(`/api/dong-ho?itemId=${sc.id}`)).body.lichSu
    expect(cuaSc.map((p: { giay: number }) => p.giay / 60)).toEqual([15, 13, 11])
    expect((await mt.get(`/api/dong-ho?itemId=${ID_LA}`)).status).toBe(404)
  })

  it('xoá phiên → khôi phục cùng id (Hoàn tác); 404 khi không có', async () => {
    datGio('2026-10-22T08:00:00')
    await batDauApi({ itemId: rr.id })
    quaPhut(20)
    const p = (await dungApi()).body.phien
    const xoa = await mt.del(`/api/phien-gio/${p.id}`)
    expect(xoa.body).toEqual({ revision: 3, daDoi: true, phien: p })
    expect((await mt.get('/api/dong-ho')).body.lichSu).toEqual([])
    expect((await mt.get(`/api/hoc/${rr.id}`)).body.daHocGiay).toBe(0)
    expect((await mt.del(`/api/phien-gio/${p.id}`)).status).toBe(404)
    const kp = await mt.post(`/api/phien-gio/${p.id}/khoi-phuc`)
    expect(kp.body).toEqual({ revision: 4, daDoi: true, phien: p })
    expect((await mt.get('/api/dong-ho')).body.lichSu).toEqual([p])
    expect((await mt.post(`/api/phien-gio/${p.id}/khoi-phuc`)).body.daDoi).toBe(false)
    expect((await mt.post('/api/phien-gio/77/khoi-phuc')).status).toBe(404)
    expect((await mt.del('/api/phien-gio/abc')).body.loi).toBe('Không có phiên giờ id abc.')
  })

  it('mục đang chạy không còn trong cây: dừng không ghi phiên (bất biến 8)', async () => {
    mt.db.prepare("INSERT INTO active_timer VALUES (1, ?, '2026-10-22T01:00:00.000Z')").run(ID_LA)
    datGio('2026-10-22T09:00:00Z')
    const d = await dungApi()
    expect(d.body).toMatchObject({ daDoi: true, phien: null, dangChay: null })
    expect(phien()).toHaveLength(0)
  })
})

describe('POST /api/dong-ho/hoan-tac — Hoàn tác lần dừng / chuyển', () => {
  it('sau Chuyển: chạy lại đồng hồ cũ đúng giờ bắt đầu cũ, xoá phiên vừa ghi, bỏ đồng hồ mới', async () => {
    datGio('2026-10-22T20:00:00')
    const cu = (await batDauApi({ itemId: rr.id })).body.dangChay
    quaPhut(25)
    await batDauApi({ itemId: sc.id, chuyen: true })
    quaPhut(0.1)
    const ht = await mt.post('/api/dong-ho/hoan-tac')
    expect(ht.body).toEqual({ revision: 3, daDoi: true, dangChay: cu, dung: null, phien: null })
    expect(phien()).toHaveLength(0)
    const lai = await mt.post('/api/dong-ho/hoan-tac')
    expect(lai.status).toBe(409)
    expect(lai.body.loi).toBe('Không có lần dừng hay chuyển đồng hồ nào để hoàn tác.')
  })

  it('sau Dừng: chạy lại; đồng hồ đã đổi sau đó hoặc quá 10 phút → 409', async () => {
    datGio('2026-10-22T20:00:00')
    await batDauApi({ itemId: rr.id })
    quaPhut(5)
    await dungApi()
    expect((await mt.post('/api/dong-ho/hoan-tac')).body.dangChay.itemId).toBe(rr.id)

    await batDauApi({ itemId: sc.id, chuyen: true })
    mt.db.prepare('DELETE FROM active_timer').run()
    const doi = await mt.post('/api/dong-ho/hoan-tac')
    expect(doi.status).toBe(409)
    expect(doi.body.loi).toBe('Không hoàn tác được: đồng hồ đã đổi sau lần dừng / chuyển đó.')

    await batDauApi({ itemId: pig.id })
    quaPhut(3)
    await dungApi()
    quaPhut(11)
    const lau = await mt.post('/api/dong-ho/hoan-tac')
    expect(lau.status).toBe(409)
    expect(lau.body.loi).toBe('Không hoàn tác được: lần dừng / chuyển đồng hồ đã qua hơn 10 phút.')
  })
})

describe('bất biến 6 — tối đa 1 đồng hồ, kể cả khi bấm cùng lúc', () => {
  const muc = cay.mucHoc.slice(0, 12)

  it('12 yêu cầu bắt đầu cùng lúc (không chuyen): đúng 1 thắng, 11 nhận 409 trỏ tới đồng hồ thắng', async () => {
    const ds = await Promise.all(muc.map((m) => batDauApi({ itemId: m.id })))
    const thang = ds.filter((r) => r.status === 200)
    expect(thang).toHaveLength(1)
    const dangChay = thang[0].body.dangChay
    for (const r of ds.filter((x) => x.status !== 200)) {
      expect(r.status).toBe(409)
      expect(r.body.dangChay).toEqual(dangChay)
    }
    expect(dem(mt.db, 'active_timer')).toBe(1)
    expect(layRevision(mt.db)).toBe(1)
  })

  it('12 yêu cầu chuyển cùng lúc: mọi yêu cầu xong, luôn đúng 1 đồng hồ, chuỗi dừng nối nhau', async () => {
    datGio('2026-10-22T08:00:00')
    const ds = await Promise.all(muc.map((m) => batDauApi({ itemId: m.id, chuyen: true })))
    expect(ds.every((r) => r.status === 200)).toBe(true)
    expect(dem(mt.db, 'active_timer')).toBe(1)
    const dung = ds.map((r) => r.body.dung?.itemId).filter(Boolean)
    expect(dung).toHaveLength(muc.length - 1)
    expect(new Set(dung).size).toBe(muc.length - 1)
    expect(layRevision(mt.db)).toBe(muc.length)
  })

  it('hai kết nối tới cùng file: kết nối kia đang giữ khoá ghi → bắt đầu lỗi SQLITE_BUSY, không để lại gì', async () => {
    mt.db.pragma('busy_timeout = 0')
    const khac = new Database(path.join(mt.tam.dataDir, 'hoc.db'))
    try {
      khac.exec('BEGIN IMMEDIATE')
      khac.prepare("INSERT INTO active_timer VALUES (1, 'x', 'y')").run()
      expect(() => batDau(mt.db, { itemId: rr.id, tenMuc: () => '' })).toThrow(/busy|locked/i)
      khac.exec('ROLLBACK')
      expect(batDau(mt.db, { itemId: rr.id, tenMuc: () => '' }).daDoi).toBe(true)
      khac.exec('BEGIN IMMEDIATE')
      expect(() => khac.prepare("INSERT INTO active_timer VALUES (1, 'x', 'y')").run()).toThrow(
        /UNIQUE|PRIMARY/,
      )
      khac.exec('ROLLBACK')
    } finally {
      khac.close()
    }
    expect(dem(mt.db, 'active_timer')).toBe(1)
  })
})
