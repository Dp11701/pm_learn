// Flashcard (phase 3; đề xuất 2.1, 3.5, 6 "Qua năm"; bất biến 3, 8): Leitner thuần + ghi một lần ôn (cả
// Asia/Ho_Chi_Minh lẫn America/Los_Angeles), POST / PUT / DELETE / khôi phục /api/the, "Cần ôn lại" của /api/state.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { homNay } from '../../shared/clock.ts'
import { layRevision } from '../../server/db/settings.ts'
import { HOP_TOI_DA, KHOANG_ON_NGAY, sauKhiOn, theMoi } from '../../server/du-lieu/hop-dong-the.ts'
import { ghiLanOn, khoiPhucThe, mucCanOnLai, taoThe } from '../../server/du-lieu/the.ts'
import { datTrangThai } from '../../server/du-lieu/trang-thai.ts'
import { datGio, quaNgay, quaPhut } from './tro-giup.ts'
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
const scopeCreep = mucSlug('scope-creep')
const K1 = '1r8t3p0npiw'

let mt: MoiTruongHoc
beforeEach(async () => {
  mt = await taoMoiTruongHoc()
})
afterEach(async () => {
  await mt.dong()
  vi.restoreAllMocks()
})

describe('Leitner thuần (đề xuất 3.5)', () => {
  it('thẻ mới hộp 1, hạn ngày mai; Nhớ lên 1 hộp (tối đa 5), Quên về hộp 1; hạn + 1/2/4/8/16 ngày lịch', () => {
    expect(theMoi('2026-10-22')).toEqual({ hop: 1, hanOn: '2026-10-23' })
    expect(theMoi('2026-12-31')).toEqual({ hop: 1, hanOn: '2027-01-01' })
    expect(KHOANG_ON_NGAY).toEqual({ 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 })
    expect(sauKhiOn(1, 'nho', '2026-10-22')).toEqual({ hop: 2, hanOn: '2026-10-24' })
    expect(sauKhiOn(3, 'nho', '2026-10-22')).toEqual({ hop: 4, hanOn: '2026-10-30' })
    expect(sauKhiOn(4, 'nho', '2026-10-22')).toEqual({ hop: 5, hanOn: '2026-11-07' })
    expect(sauKhiOn(HOP_TOI_DA, 'nho', '2026-10-22')).toEqual({ hop: 5, hanOn: '2026-11-07' })
    for (const hop of [1, 2, 3, 4, 5]) {
      expect(sauKhiOn(hop, 'quen', '2026-10-22')).toEqual({ hop: 1, hanOn: '2026-10-23' })
    }
    expect(() => sauKhiOn(0, 'nho', '2026-10-22')).toThrow(RangeError)
    expect(() => sauKhiOn(6, 'nho', '2026-10-22')).toThrow(RangeError)
  })

  it('đề xuất 6: hộp 2 Nhớ ngày 30/12/2026 → hộp 3, hạn 03/01/2027 (qua năm)', () => {
    expect(sauKhiOn(2, 'nho', '2026-12-30')).toEqual({ hop: 3, hanOn: '2027-01-03' })
  })

  it('đề xuất 6: hộp 3 Nhớ 23:30 ngày 07/03/2027 ở Los Angeles (DST bắt đầu 14/03) → hộp 4, hạn 15/03/2027', async () => {
    const luc = Date.parse('2027-03-07T23:30:00-08:00')
    const the = taoThe(mt.db, { itemId: scrum.id, truoc: 'H', sau: 'Đ', luc: luc - 86_400_000 }).the
    mt.db.prepare('UPDATE flashcards SET box = 3 WHERE id = ?').run(the.id)
    const kq = await trongMuiGio('America/Los_Angeles', () =>
      ghiLanOn(mt.db, { theId: the.id, ketQua: 'nho', luc }),
    )
    expect(kq?.the).toMatchObject({ hop: 4, hanOn: '2027-03-15' })
    const lanOn = mt.db.prepare('SELECT * FROM flashcard_reviews WHERE card_id = ?').get(the.id)
    expect(lanOn).toMatchObject({
      reviewed_on: '2027-03-07',
      result: 'nho',
      from_box: 3,
      to_box: 4,
      reviewed_at: '2027-03-08T07:30:00.000Z',
    })
    // Cùng thời điểm ở giờ Việt Nam đã là 08/03 → hạn 16/03: ngày lịch do múi giờ server quyết.
    mt.db.prepare('UPDATE flashcards SET box = 3 WHERE id = ?').run(the.id)
    const vn = await trongMuiGio('Asia/Ho_Chi_Minh', () =>
      ghiLanOn(mt.db, { theId: the.id, ketQua: 'nho', luc }),
    )
    expect(vn?.the).toMatchObject({ hop: 4, hanOn: '2027-03-16' })
  })

  it('ghiLanOn: thẻ không có → undefined; mỗi lần ôn tăng revision', () => {
    expect(ghiLanOn(mt.db, { theId: 99, ketQua: 'nho' })).toBeUndefined()
    const the = taoThe(mt.db, { itemId: scrum.id, truoc: 'H', sau: 'Đ' }).the
    const kq = ghiLanOn(mt.db, { theId: the.id, ketQua: 'quen' })
    expect(kq?.revision).toBe(2)
    expect(kq?.truoc).toEqual(the)
  })
})

describe('POST /api/the', () => {
  for (const tz of MUI_GIO_THU) {
    it(`thẻ mới: hộp 1, hạn = ngày mai theo ngày server (${tz}, sát nửa đêm cuối năm)`, async () => {
      await trongMuiGio(tz, async () => {
        datGio('2026-12-31T23:59:30')
        const res = await mt.post('/api/the', {
          itemId: scrum.id,
          truoc: '  Mặt trước  ',
          sau: ' Mặt sau ',
          khoaCau: K1,
        })
        expect(res.status).toBe(200)
        expect(res.body).toEqual({
          revision: 1,
          daDoi: true,
          the: {
            id: expect.any(Number),
            itemId: scrum.id,
            truoc: 'Mặt trước',
            sau: 'Mặt sau',
            hop: 1,
            hanOn: '2027-01-01',
            khoaCau: K1,
          },
        })
        expect(homNay()).toBe('2026-12-31')
      })
    })
  }

  it('404 (bất biến 8) và 400 tiếng Việt, không ghi gì', async () => {
    const la = await mt.post('/api/the', { itemId: ID_LA, truoc: 'H', sau: 'Đ' })
    expect(la.status).toBe(404)
    expect(la.body.loi).toBe(`Không có mục học id "${ID_LA}" trong cây roadmap.`)
    const cases: [unknown, RegExp][] = [
      [{ itemId: scrum.id, truoc: '  ', sau: 'Đ' }, /^Cần mặt trước của thẻ \(không để trống\)\.$/],
      [{ itemId: scrum.id, truoc: 'H' }, /^Cần mặt sau của thẻ/],
      [{ itemId: scrum.id, truoc: 'x'.repeat(2001), sau: 'Đ' }, /^truoc dài tối đa 2000 ký tự\.$/],
      [{ itemId: scrum.id, truoc: 'H', sau: 'Đ', khoaCau: 'Sai Khoá' }, /^khoaCau không hợp lệ/],
      [{ itemId: 5, truoc: 'H', sau: 'Đ' }, /^itemId phải là chuỗi\.$/],
      [{ itemId: scrum.id, truoc: 'H', sau: 'Đ', hop: 3 }, /^Trường không được nhận: hop\./],
    ]
    for (const [body, cau] of cases) {
      const res = await mt.post('/api/the', body)
      expect(res.status, JSON.stringify(body)).toBe(400)
      expect(res.body.loi).toMatch(cau)
    }
    expect(dem(mt.db, 'flashcards')).toBe(0)
    expect(layRevision(mt.db)).toBe(0)
  })
})

describe('PUT / DELETE / khôi phục /api/the/:id', () => {
  async function tao(itemId = scrum.id) {
    return (await mt.post('/api/the', { itemId, truoc: 'H', sau: 'Đ' })).body.the
  }

  it('sửa mặt thẻ, giữ hộp + hạn; trùng → không ghi; truoc là thẻ cũ', async () => {
    const the = await tao()
    mt.db.prepare("UPDATE flashcards SET box = 3, due_on = '2026-11-01' WHERE id = ?").run(the.id)
    const sua = await mt.put(`/api/the/${the.id}`, { sau: ' Đáp án mới ' })
    expect(sua.body).toMatchObject({
      revision: 2,
      daDoi: true,
      the: { id: the.id, truoc: 'H', sau: 'Đáp án mới', hop: 3, hanOn: '2026-11-01' },
      truoc: { sau: 'Đ' },
    })
    expect((await mt.put(`/api/the/${the.id}`, { truoc: 'H' })).body.daDoi).toBe(false)
    expect((await mt.put(`/api/the/${the.id}`, {})).body.loi).toBe(
      'Cần ít nhất một trường: truoc, sau.',
    )
    for (const id of ['999', 'abc', '0', '1.5']) {
      const res = await mt.put(`/api/the/${id}`, { truoc: 'x' })
      expect(res.status, id).toBe(404)
      expect(res.body.loi).toBe(`Không có thẻ id ${id}.`)
    }
  })

  it('xoá → khôi phục: cùng id, giữ hộp, hạn, lịch sử ôn; id đã xoá không bị cấp lại', async () => {
    const the = await tao()
    ghiLanOn(mt.db, { theId: the.id, ketQua: 'nho' })
    ghiLanOn(mt.db, { theId: the.id, ketQua: 'nho' })
    const truocXoa = (await mt.get(`/api/hoc/${scrum.id}`)).body.the[0]
    expect(truocXoa.hop).toBe(3)

    const xoa = await mt.del(`/api/the/${the.id}`)
    expect(xoa.body).toEqual({ revision: 4, daDoi: true, the: truocXoa })
    expect(dem(mt.db, 'flashcards')).toBe(0)
    expect(dem(mt.db, 'flashcard_reviews')).toBe(0) // ON DELETE CASCADE
    expect((await mt.del(`/api/the/${the.id}`)).status).toBe(404)

    const moi = await tao()
    expect(moi.id).toBeGreaterThan(the.id)

    const kp = await mt.post(`/api/the/${the.id}/khoi-phuc`)
    expect(kp.body).toEqual({ revision: 6, daDoi: true, the: truocXoa })
    expect(dem(mt.db, 'flashcard_reviews', `WHERE card_id = ${the.id}`)).toBe(2)
    expect(
      (await mt.get(`/api/hoc/${scrum.id}`)).body.the.map((t: { id: number }) => t.id),
    ).toEqual([the.id, moi.id])
    expect((await mt.post(`/api/the/${the.id}/khoi-phuc`)).body).toMatchObject({
      daDoi: false,
      revision: 6,
    })
    const khong = await mt.post('/api/the/999/khoi-phuc')
    expect(khong.status).toBe(404)
    expect(khong.body.loi).toMatch(/^Không khôi phục được thẻ id 999/)
  })

  it('bản vừa xoá giữ 1 ngày: quá hạn thì lần xoá sau dọn đi, không khôi phục được', async () => {
    const a = await tao()
    const b = await tao()
    await mt.del(`/api/the/${a.id}`)
    quaNgay(1)
    quaPhut(1)
    await mt.del(`/api/the/${b.id}`)
    expect((await mt.post(`/api/the/${a.id}/khoi-phuc`)).status).toBe(404)
    expect((await mt.post(`/api/the/${b.id}/khoi-phuc`)).status).toBe(200)
  })

  it('bất biến 8: khôi phục thẻ của mục đã bỏ khỏi cây → 409 tiếng Việt, không ghi, giữ bản xoá', async () => {
    // Thẻ của một mục mà lần thay cây sau đó đã bỏ (ghi thẳng DB: API không tạo thẻ cho mục ngoài cây)
    const the = taoThe(mt.db, { itemId: ID_LA, truoc: 'H', sau: 'Đ' }).the
    ghiLanOn(mt.db, { theId: the.id, ketQua: 'nho' })
    expect((await mt.del(`/api/the/${the.id}`)).status).toBe(200)
    const rev = layRevision(mt.db)
    for (let lan = 0; lan < 2; lan++) {
      const res = await mt.post(`/api/the/${the.id}/khoi-phuc`)
      expect(res.status).toBe(409)
      expect(res.body.loi).toBe(
        `Không khôi phục được thẻ id ${the.id}: mục học id "${ID_LA}" của thẻ không còn trong cây roadmap.`,
      )
    }
    expect(layRevision(mt.db)).toBe(rev)
    expect(dem(mt.db, 'flashcards')).toBe(0)
    expect(dem(mt.db, 'flashcard_reviews')).toBe(0)
    expect(dem(mt.db, 'deleted_rows', `WHERE tbl = 'flashcards' AND row_id = ${the.id}`)).toBe(1)
    // Mục có lại trong cây trước hạn dọn bản xoá: khôi phục đủ hộp, lịch sử ôn, gỡ bản xoá
    expect(khoiPhucThe(mt.db, the.id, () => true)).toMatchObject({
      daDoi: true,
      the: { id: the.id, itemId: ID_LA, hop: 2 },
    })
    expect(dem(mt.db, 'flashcard_reviews', `WHERE card_id = ${the.id}`)).toBe(1)
    expect(dem(mt.db, 'deleted_rows')).toBe(0)
  })

  it('bất biến 8 ở lớp dữ liệu: thẻ của mục có thật bị xoá, rồi cây bỏ mục đó → { mucKhongCon }, giữ bản xoá', async () => {
    const the = await tao()
    await mt.del(`/api/the/${the.id}`)
    const rev = layRevision(mt.db)
    expect(khoiPhucThe(mt.db, the.id, (id) => id !== scrum.id)).toEqual({ mucKhongCon: scrum.id })
    expect(layRevision(mt.db)).toBe(rev)
    expect(dem(mt.db, 'flashcards')).toBe(0)
    expect(dem(mt.db, 'deleted_rows')).toBe(1)
    expect((await mt.post(`/api/the/${the.id}/khoi-phuc`)).body).toMatchObject({
      daDoi: true,
      the: { id: the.id, itemId: scrum.id },
    })
  })
})

describe('"Cần ôn lại" trong GET /api/state (đề xuất 3.3, bất biến 3)', () => {
  it('chỉ mục Đã xong có thẻ hạn ≤ hôm nay; ôn xong thì tắt; mục không còn trong cây không vào', async () => {
    datGio('2026-10-21T20:00:00')
    datTrangThai(mt.db, { id: scrum.id, giaTri: { trangThai: 'da-xong' }, via: 'mot-muc' })
    datTrangThai(mt.db, { id: scopeCreep.id, giaTri: { trangThai: 'dang-hoc' }, via: 'mot-muc' })
    datTrangThai(mt.db, { id: ID_LA, giaTri: { trangThai: 'da-xong' }, via: 'mot-muc' })
    const the = taoThe(mt.db, { itemId: scrum.id, truoc: 'H', sau: 'Đ' }).the
    taoThe(mt.db, { itemId: scopeCreep.id, truoc: 'H', sau: 'Đ' })
    taoThe(mt.db, { itemId: ID_LA, truoc: 'H', sau: 'Đ' })
    taoThe(mt.db, { itemId: moscow.id, truoc: 'H', sau: 'Đ' })
    expect((await mt.get('/api/state')).body.canOnLai).toEqual([]) // hạn ngày mai

    datGio('2026-10-22T00:00:01')
    expect((await mt.get('/api/state')).body.canOnLai).toEqual([scrum.id])
    expect(mucCanOnLai(mt.db)).toEqual([ID_LA, scrum.id].sort())

    ghiLanOn(mt.db, { theId: the.id, ketQua: 'quen' }) // hạn 23/10
    expect((await mt.get('/api/state')).body.canOnLai).toEqual([])
    datGio('2026-10-23T08:00:00')
    expect((await mt.get('/api/state')).body.canOnLai).toEqual([scrum.id])
    datTrangThai(mt.db, { id: scrum.id, giaTri: { trangThai: 'dang-hoc' }, via: 'mot-muc' })
    expect((await mt.get('/api/state')).body.canOnLai).toEqual([])
    // Không lưu cờ ở đâu cả: chỉ có thẻ và trạng thái
    expect(
      mt.db.prepare("SELECT count(*) AS n FROM settings WHERE key LIKE '%on%lai%'").get(),
    ).toEqual({ n: 0 })
  })

  for (const tz of MUI_GIO_THU) {
    it(`"hôm nay" là ngày lịch của server (${tz})`, async () => {
      await trongMuiGio(tz, async () => {
        datGio('2026-10-21T23:00:00')
        datTrangThai(mt.db, { id: scrum.id, giaTri: { trangThai: 'da-xong' }, via: 'mot-muc' })
        taoThe(mt.db, { itemId: scrum.id, truoc: 'H', sau: 'Đ' }) // hạn 22/10
        datGio('2026-10-21T23:59:59')
        expect((await mt.get('/api/state')).body.canOnLai).toEqual([])
        quaPhut(1)
        expect((await mt.get('/api/state')).body.canOnLai).toEqual([scrum.id])
      })
    })
  }
})
