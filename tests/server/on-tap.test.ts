// Phiên ôn (bước 3; đề xuất 3.3, 3.5; bất biến 3, 8): GET /api/on-tap (thứ tự hạn → hộp → lúc tạo, số hộp, tỉ lệ
// nhớ 30 ngày, thẻ mồ côi bị bỏ), POST /api/on-tap/:theId (Leitner theo ngày server ở cả hai múi giờ, 409 khi chưa
// đến hạn — bấm hai lần, vòng luyện thêm không đổi gì, 404 / 400), "Cần ôn lại" của /api/state theo lần ôn.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { layRevision } from '../../server/db/settings.ts'
import { ngayDauTiLeNho } from '../../server/du-lieu/hop-dong-the.ts'
import { docOnTap } from '../../server/du-lieu/on-tap.ts'
import { ghiLanOn, taoThe } from '../../server/du-lieu/the.ts'
import { datTrangThai } from '../../server/du-lieu/trang-thai.ts'
import { datGio, quaNgay } from './tro-giup.ts'
import {
  ID_LA,
  MUI_GIO_THU,
  dem,
  mucSlug,
  taoMoiTruongHoc,
  trongMuiGio,
  type MoiTruongHoc,
} from './tro-giup-hoc.ts'

const scrum = mucSlug('scrum')
const moscow = mucSlug('moscow')

let mt: MoiTruongHoc
beforeEach(async () => {
  mt = await taoMoiTruongHoc()
})
afterEach(async () => {
  await mt.dong()
})

/** Tạo thẻ rồi đặt thẳng hộp / hạn / lúc tạo (dữ liệu dựng sẵn cho test). */
function the(itemId: string, dat: { hop?: number; han?: string; tao?: string } = {}): number {
  const id = taoThe(mt.db, { itemId, truoc: `H${itemId}`, sau: 'Đ' }).the.id
  if (dat.hop !== undefined) {
    mt.db.prepare('UPDATE flashcards SET box = ? WHERE id = ?').run(dat.hop, id)
  }
  if (dat.han !== undefined) {
    mt.db.prepare('UPDATE flashcards SET due_on = ? WHERE id = ?').run(dat.han, id)
  }
  if (dat.tao !== undefined) {
    mt.db.prepare('UPDATE flashcards SET created_at = ? WHERE id = ?').run(dat.tao, id)
  }
  return id
}

describe('GET /api/on-tap', () => {
  it('chưa có thẻ: danh sách rỗng, mọi hộp 0, chưa có tỉ lệ nhớ', async () => {
    datGio('2026-10-27T09:00:00')
    const res = await mt.get('/api/on-tap')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      revision: 0,
      homNay: '2026-10-27',
      denHan: [],
      hop: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      tongThe: 0,
      tiLeNho30: null,
      lanOn30: { nho: 0, tong: 0 },
      hanKeTiep: null,
    })
  })

  it('mọi thẻ hạn ≤ hôm nay, xếp hạn → hộp → lúc tạo; số hộp đếm mọi thẻ; hạn kế tiếp', async () => {
    datGio('2026-10-27T09:00:00')
    const a = the(scrum.id, { hop: 2, han: '2026-10-27', tao: '2026-10-01T00:00:00.000Z' })
    const b = the(scrum.id, { hop: 1, han: '2026-10-27', tao: '2026-10-05T00:00:00.000Z' })
    const c = the(moscow.id, { hop: 3, han: '2026-10-20', tao: '2026-10-09T00:00:00.000Z' })
    const d = the(moscow.id, { hop: 1, han: '2026-10-27', tao: '2026-10-02T00:00:00.000Z' })
    the(moscow.id, { hop: 5, han: '2026-11-03' })
    the(scrum.id, { hop: 1, han: '2026-10-28' }) // thẻ mới hôm nay: hạn ngày mai
    const res = await mt.get('/api/on-tap')
    expect(res.body.denHan.map((t: { id: number }) => t.id)).toEqual([c, d, b, a])
    expect(res.body.denHan[0]).toEqual({
      id: c,
      itemId: moscow.id,
      truoc: `H${moscow.id}`,
      sau: 'Đ',
      hop: 3,
      hanOn: '2026-10-20',
      taoLuc: '2026-10-09T00:00:00.000Z',
    })
    expect(res.body.hop).toEqual({ 1: 3, 2: 1, 3: 1, 4: 0, 5: 1 })
    expect(res.body.tongThe).toBe(6)
    expect(res.body.hanKeTiep).toBe('2026-10-28')
  })

  it('bất biến 8: thẻ của mục không còn trong cây không vào danh sách, số hộp, tỉ lệ nhớ', async () => {
    datGio('2026-10-27T09:00:00')
    const mo = the(scrum.id, { han: '2026-10-27' })
    mt.db.prepare('UPDATE flashcards SET item_id = ? WHERE id = ?').run(ID_LA, mo)
    ghiLanOn(mt.db, { theId: mo, ketQua: 'quen' })
    the(scrum.id, { han: '2026-10-27' })
    const res = await mt.get('/api/on-tap')
    expect(res.body.denHan).toHaveLength(1)
    expect(res.body.tongThe).toBe(1)
    expect(res.body.tiLeNho30).toBeNull()
  })

  it('tỉ lệ nhớ: chỉ lần ôn thật trong 30 ngày gồm cả hôm nay', async () => {
    expect(ngayDauTiLeNho('2026-10-27')).toBe('2026-09-28')
    datGio('2026-10-27T09:00:00')
    const id = the(scrum.id)
    const ghi = (ngay: string, ket: 'nho' | 'quen') =>
      ghiLanOn(mt.db, { theId: id, ketQua: ket, luc: Date.parse(`${ngay}T10:00:00`) })
    ghi('2026-09-27', 'quen') // ngoài cửa sổ
    ghi('2026-09-28', 'nho')
    ghi('2026-10-10', 'nho')
    ghi('2026-10-20', 'quen')
    ghi('2026-10-27', 'nho')
    const kq = docOnTap(mt.db, () => true, '2026-10-27')
    expect(kq.lanOn30).toEqual({ nho: 3, tong: 4 })
    expect(kq.tiLeNho30).toBe(0.75)
  })
})

describe('POST /api/on-tap/:theId', () => {
  for (const tz of MUI_GIO_THU) {
    it(`Nhớ / Quên theo ngày ôn = hôm nay của server, hạn + 1/2/4/8/16 ngày lịch (${tz})`, async () => {
      await trongMuiGio(tz, async () => {
        datGio('2026-12-30T23:50:00')
        const id = the(scrum.id, { hop: 2, han: '2026-12-30' })
        const rev = layRevision(mt.db)
        const res = await mt.post(`/api/on-tap/${id}`, { ket: 'nho' })
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({
          revision: rev + 1,
          daDoi: true,
          luyenThem: false,
          ket: 'nho',
          the: { id, hop: 3, hanOn: '2027-01-03' },
          truoc: { id, hop: 2, hanOn: '2026-12-30' },
        })
        expect(mt.db.prepare('SELECT * FROM flashcard_reviews').get()).toMatchObject({
          card_id: id,
          reviewed_on: '2026-12-30',
          result: 'nho',
          from_box: 2,
          to_box: 3,
        })

        // Qua nửa đêm: ngày ôn là ngày mới
        datGio('2027-01-03T00:05:00')
        const quen = await mt.post(`/api/on-tap/${id}`, { ket: 'quen' })
        expect(quen.body.the).toMatchObject({ hop: 1, hanOn: '2027-01-04' })
        expect((await mt.get('/api/on-tap')).body).toMatchObject({
          homNay: '2027-01-03',
          denHan: [],
          lanOn30: { nho: 1, tong: 2 },
          tiLeNho30: 0.5,
        })
      })
    })
  }

  it('hộp 5 Nhớ vẫn hộp 5, hạn + 16 ngày', async () => {
    datGio('2026-10-27T09:00:00')
    const id = the(scrum.id, { hop: 5, han: '2026-10-27' })
    const res = await mt.post(`/api/on-tap/${id}`, { ket: 'nho' })
    expect(res.body.the).toMatchObject({ hop: 5, hanOn: '2026-11-12' })
  })

  it('bấm hai lần: lần sau 409 (chưa đến hạn), hộp chỉ lên một lần, không ghi lịch sử thừa', async () => {
    datGio('2026-10-27T09:00:00')
    const id = the(scrum.id, { hop: 1, han: '2026-10-27' })
    const [mot, hai] = await Promise.all([
      mt.post(`/api/on-tap/${id}`, { ket: 'nho' }),
      mt.post(`/api/on-tap/${id}`, { ket: 'nho' }),
    ])
    expect([mot.status, hai.status].sort()).toEqual([200, 409])
    const loi = mot.status === 409 ? mot : hai
    expect(loi.body.loi).toBe(
      `Thẻ id ${id} chưa đến hạn ôn (hạn 29/10/2026): có thể thẻ vừa được ôn rồi. Tải lại danh sách thẻ đến hạn.`,
    )
    expect(dem(mt.db, 'flashcard_reviews')).toBe(1)
    expect(mt.db.prepare('SELECT box, due_on FROM flashcards WHERE id = ?').get(id)).toEqual({
      box: 2,
      due_on: '2026-10-29',
    })
    // Thẻ mới (hạn ngày mai) cũng chưa ôn thật được
    const moi = the(moscow.id)
    expect((await mt.post(`/api/on-tap/${moi}`, { ket: 'quen' })).status).toBe(409)
  })

  it('vòng luyện thêm: không đổi hộp / hạn, không ghi lịch sử, không tăng revision, không tính tỉ lệ', async () => {
    datGio('2026-10-27T09:00:00')
    const id = the(scrum.id, { hop: 3, han: '2026-10-27' })
    await mt.post(`/api/on-tap/${id}`, { ket: 'quen' })
    const rev = layRevision(mt.db)
    const truoc = mt.db.prepare('SELECT box, due_on FROM flashcards WHERE id = ?').get(id)
    for (const ket of ['nho', 'quen', 'nho'] as const) {
      const res = await mt.post(`/api/on-tap/${id}`, { ket, luyenThem: true })
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        revision: rev,
        daDoi: false,
        luyenThem: true,
        ket,
        the: { id, hop: 1, hanOn: '2026-10-28' },
      })
      expect(res.body.truoc).toEqual(res.body.the)
    }
    expect(mt.db.prepare('SELECT box, due_on FROM flashcards WHERE id = ?').get(id)).toEqual(truoc)
    expect(dem(mt.db, 'flashcard_reviews')).toBe(1)
    expect(layRevision(mt.db)).toBe(rev)
    expect((await mt.get('/api/on-tap')).body.lanOn30).toEqual({ nho: 0, tong: 1 })
    // luyenThem: false là lần ôn thật
    quaNgay(1)
    const that = await mt.post(`/api/on-tap/${id}`, { ket: 'nho', luyenThem: false })
    expect(that.body).toMatchObject({ daDoi: true, the: { hop: 2 } })
  })

  it('404: thẻ không có / id sai / mục của thẻ không còn trong cây; 400 tiếng Việt; không ghi gì', async () => {
    datGio('2026-10-27T09:00:00')
    for (const id of ['999', 'abc', '0', '1.5']) {
      const res = await mt.post(`/api/on-tap/${id}`, { ket: 'nho' })
      expect(res.status, id).toBe(404)
      expect(res.body.loi).toBe(`Không có thẻ id ${id}.`)
    }
    const mo = the(scrum.id, { han: '2026-10-27' })
    mt.db.prepare('UPDATE flashcards SET item_id = ? WHERE id = ?').run(ID_LA, mo)
    const moCoi = await mt.post(`/api/on-tap/${mo}`, { ket: 'nho' })
    expect(moCoi.status).toBe(404)
    expect(moCoi.body.loi).toBe(
      `Không ôn được thẻ id ${mo}: mục học id "${ID_LA}" của thẻ không còn trong cây roadmap.`,
    )

    const id = the(scrum.id, { han: '2026-10-27' })
    const cases: [unknown, string][] = [
      [{}, 'ket phải là nho hoặc quen.'],
      [{ ket: 'sai' }, 'ket phải là nho hoặc quen.'],
      [{ ket: 'nho', luyenThem: 'co' }, 'luyenThem phải là true hoặc false.'],
      [{ ket: 'nho', hop: 3 }, 'Trường không được nhận: hop. Chỉ nhận ket, luyenThem.'],
    ]
    for (const [body, cau] of cases) {
      const res = await mt.post(`/api/on-tap/${id}`, body)
      expect(res.status, JSON.stringify(body)).toBe(400)
      expect(res.body.loi).toBe(cau)
    }
    expect(dem(mt.db, 'flashcard_reviews')).toBe(0)
  })

  it('"Cần ôn lại" của /api/state tắt sau khi ôn thẻ đến hạn (bất biến 3), revision tăng', async () => {
    datGio('2026-10-27T09:00:00')
    datTrangThai(mt.db, { id: scrum.id, giaTri: { trangThai: 'da-xong' }, via: 'mot-muc' })
    const id = the(scrum.id, { han: '2026-10-26' })
    const truoc = await mt.get('/api/state')
    expect(truoc.body.canOnLai).toEqual([scrum.id])
    const on = await mt.post(`/api/on-tap/${id}`, { ket: 'quen' })
    const sau = await mt.get('/api/state')
    expect(sau.body.canOnLai).toEqual([])
    expect(sau.body.revision).toBe(on.body.revision)
    expect(on.body.revision).toBeGreaterThan(truoc.body.revision)
  })
})
