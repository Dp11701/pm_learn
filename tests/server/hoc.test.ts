// API dữ liệu học của một mục (phase 3; đề xuất 2.1, 3.2, Cần chốt 6; bất biến 8): migration 5, GET /api/hoc/:id,
// Nói lại, bài thực hành (mọi mẫu bài), tự kiểm tra, ghi chú, dự án — transaction + revision, câu lỗi tiếng Việt.
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { capNhatSchema, layPhienBan, moKetNoi } from '../../server/db/index.ts'
import { dsMigration } from '../../server/db/migrations.ts'
import { layRevision } from '../../server/db/settings.ts'
import { THUC_HANH_TRONG } from '../../server/du-lieu/hop-dong-hoc.ts'
import { datGio, quaPhut, taoThuMucTam } from './tro-giup.ts'
import { ID_LA, cay, dem, mucSlug, taoMoiTruongHoc, type MoiTruongHoc } from './tro-giup-hoc.ts'

const chuDe = mucSlug('scope-creep')
const taiLieu = mucSlug('risk-register')
const chungChi = mucSlug('project-management-professional-pmp')
const linhVuc = [...cay.nutTheoId.values()].find((n) => n.kind === 'area')!
const K1 = '137t4a52797'
const K2 = '1jwk4lcqzf9'

let mt: MoiTruongHoc
beforeEach(async () => {
  mt = await taoMoiTruongHoc()
})
afterEach(async () => {
  await mt.dong()
  vi.restoreAllMocks()
})

const url = (id: string, duoi = '') => `/api/hoc/${encodeURIComponent(id)}${duoi}`
const thucHanh = (id: string, body: unknown) => mt.put(url(id, '/thuc-hanh'), body)
const gan = (iso: string, moc: string) => Math.abs(Date.parse(iso) - Date.parse(moc)) < 5000

describe('migration 5 — bảng phase 3 (đề xuất 2.1)', () => {
  it('đủ bảng và cột; practice.project_id có khoá ngoài tới projects', () => {
    const { db } = mt
    expect(layPhienBan(db)).toBe(dsMigration.length)
    expect(dsMigration[4]?.ten).toBe('hoc-4-buoc')
    const cot = (bang: string) =>
      db.prepare(`SELECT name FROM pragma_table_info('${bang}')`).pluck().all()
    expect(cot('restatements')).toEqual(['item_id', 'text', 'created_at', 'updated_at'])
    expect(cot('self_check')).toEqual([
      'item_id',
      'question_key',
      'answer',
      'revealed_at',
      'grade',
      'graded_at',
      'created_at',
      'updated_at',
    ])
    expect(cot('projects')).toEqual(['id', 'name', 'role', 'phase', 'created_at', 'updated_at'])
    expect(cot('notes')).toEqual(['item_id', 'body', 'created_at', 'updated_at'])
    expect(cot('flashcards')).toEqual([
      'id',
      'item_id',
      'front',
      'back',
      'box',
      'due_on',
      'source_question_key',
      'created_at',
      'updated_at',
    ])
    expect(cot('flashcard_reviews')).toEqual([
      'id',
      'card_id',
      'reviewed_at',
      'reviewed_on',
      'result',
      'from_box',
      'to_box',
      'created_at',
    ])
    expect(cot('time_entries')).toEqual([
      'id',
      'item_id',
      'date',
      'seconds',
      'started_at',
      'ended_at',
      'created_at',
      'updated_at',
    ])
    expect(cot('active_timer')).toEqual(['id', 'item_id', 'started_at'])
    const fk = db.prepare("SELECT * FROM pragma_foreign_key_list('practice')").all() as {
      table: string
      from: string
      on_delete: string
    }[]
    expect(fk).toEqual([expect.objectContaining({ table: 'projects', from: 'project_id' })])
    expect(fk[0].on_delete).toBe('SET NULL')
  })

  it('CHECK: chữ rỗng, chấm khi chưa xem, Xong thiếu kết quả, hộp ngoài 1–5, phiên < 60 giây, 2 đồng hồ', () => {
    const { db } = mt
    const chay = (sql: string) => () => db.prepare(sql).run()
    expect(chay("INSERT INTO restatements VALUES ('a', '  ', 'x', 'x')")).toThrow(/CHECK/)
    expect(chay("INSERT INTO notes VALUES ('a', '', 'x', 'x')")).toThrow(/CHECK/)
    expect(
      chay("INSERT INTO self_check VALUES ('a', 'k', 'tl', NULL, 'dung', 'x', 'x', 'x')"),
    ).toThrow(/CHECK/)
    expect(
      chay("INSERT INTO self_check VALUES ('a', 'k', 'tl', 'x', 'dung', NULL, 'x', 'x')"),
    ).toThrow(/CHECK/)
    expect(
      chay(
        "INSERT INTO practice (item_id, state, result_md, done_at, created_at, updated_at) VALUES ('a', 'xong', ' ', 'x', 'x', 'x')",
      ),
    ).toThrow(/CHECK/)
    expect(
      chay(
        "INSERT INTO practice (item_id, state, result_md, done_at, created_at, updated_at) VALUES ('a', 'dang-lam', 'kq', 'x', 'x', 'x')",
      ),
    ).toThrow(/CHECK/)
    expect(
      chay(
        "INSERT INTO practice (item_id, state, criteria, created_at, updated_at) VALUES ('a', 'dang-lam', '[1]', 'x', 'x')",
      ),
    ).toThrow(/CHECK/)
    expect(
      chay(
        "INSERT INTO practice (item_id, state, project_id, created_at, updated_at) VALUES ('a', 'dang-lam', 99, 'x', 'x')",
      ),
    ).toThrow(/FOREIGN KEY/)
    expect(
      chay(
        "INSERT INTO flashcards (item_id, front, back, box, due_on, created_at, updated_at) VALUES ('a', 'f', 'b', 6, '2026-10-23', 'x', 'x')",
      ),
    ).toThrow(/CHECK/)
    expect(
      chay(
        "INSERT INTO time_entries (item_id, date, seconds, started_at, ended_at, created_at, updated_at) VALUES ('a', '2026-10-22', 59, 'x', 'x', 'x', 'x')",
      ),
    ).toThrow(/CHECK/)
    expect(chay("INSERT INTO active_timer VALUES (2, 'a', 'x')")).toThrow(/CHECK/)
    db.prepare("INSERT INTO active_timer VALUES (1, 'a', 'x')").run()
    expect(chay("INSERT INTO active_timer VALUES (1, 'b', 'x')")).toThrow(/UNIQUE|PRIMARY/)
  })

  it('nâng DB phase 2b: giữ hàng practice cũ; "xong" thiếu kết quả (nếu có) về "dang-lam"', async () => {
    const tam = taoThuMucTam()
    try {
      const db = moKetNoi(path.join(tam.dataDir, 'cu.db'))
      await capNhatSchema(db, { migrations: dsMigration.slice(0, 4) })
      expect(layPhienBan(db)).toBe(4)
      const them = db.prepare(
        `INSERT INTO practice (item_id, project_id, result_md, criteria, state, na_reason, done_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, 'c', 'u')`,
      )
      them.run('a', null, null, null, 'khong-ap-dung', 'Không thi')
      them.run('b', 7, null, '[1]', 'xong', null)
      expect(await capNhatSchema(db)).toBe(dsMigration.length - 4)
      const ds = db.prepare('SELECT * FROM practice ORDER BY item_id').all()
      expect(ds).toEqual([
        {
          item_id: 'a',
          project_id: null,
          result_md: null,
          criteria: null,
          state: 'khong-ap-dung',
          na_reason: 'Không thi',
          done_at: null,
          created_at: 'c',
          updated_at: 'u',
        },
        {
          item_id: 'b',
          project_id: null,
          result_md: null,
          criteria: null,
          state: 'dang-lam',
          na_reason: null,
          done_at: null,
          created_at: 'c',
          updated_at: 'u',
        },
      ])
      db.close()
    } finally {
      tam.xoa()
    }
  })
})

describe('GET /api/hoc/:id', () => {
  it('mục chưa có gì: giá trị trống; Bản của tôi / kế hoạch thi luôn false ở phase 3', async () => {
    const res = await mt.get(url(chuDe.id))
    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.body).toEqual({
      revision: 0,
      noiLai: null,
      thucHanh: THUC_HANH_TRONG,
      tuKiemTra: {},
      ghiChu: null,
      the: [],
      banCuaToi: { coHoanThanh: false },
      keHoachThi: { coNgayThi: false },
      daHocGiay: 0,
    })
  })

  it('404 (bất biến 8): id không có trong cây, hoặc không phải mục học', async () => {
    for (const id of [ID_LA, linhVuc.id]) {
      const res = await mt.get(url(id))
      expect(res.status).toBe(404)
      expect(res.body.loi).toBe(`Không có mục học id "${id}" trong cây roadmap.`)
    }
  })

  it('gom đủ dữ liệu đã ghi của mục, không lẫn mục khác', async () => {
    datGio('2026-10-22T21:42:00+07:00')
    await mt.put(url(chuDe.id, '/noi-lai'), { text: 'Nói lại' })
    await mt.put(url(chuDe.id, '/ghi-chu'), { text: 'Ghi chú' })
    await thucHanh(chuDe.id, { ketQua: 'Đã làm' })
    await mt.put(url(chuDe.id, `/tu-kiem-tra/${K1}`), { traLoi: 'Trả lời' })
    await mt.post('/api/the', { itemId: chuDe.id, truoc: 'H', sau: 'Đ' })
    await mt.put(url(taiLieu.id, '/ghi-chu'), { text: 'Khác' })
    const { body } = await mt.get(url(chuDe.id))
    expect(body.revision).toBe(6)
    expect(body.noiLai).toEqual({ text: 'Nói lại', capNhat: expect.any(String) })
    expect(gan(body.noiLai.capNhat, '2026-10-22T14:42:00Z')).toBe(true)
    expect(body.ghiChu.text).toBe('Ghi chú')
    expect(body.thucHanh).toMatchObject({ trangThai: 'dang-lam', ketQua: 'Đã làm' })
    expect(body.tuKiemTra).toEqual({
      [K1]: { traLoi: 'Trả lời', daXem: false, cham: null, chamLuc: null },
    })
    expect(body.the).toEqual([
      {
        id: expect.any(Number),
        itemId: chuDe.id,
        truoc: 'H',
        sau: 'Đ',
        hop: 1,
        hanOn: '2026-10-23',
        khoaCau: null,
      },
    ])
  })
})

describe('PUT /api/hoc/:id/noi-lai và /ghi-chu', () => {
  for (const [duoi, truong, toiDa] of [
    ['/noi-lai', 'noiLai', 5000],
    ['/ghi-chu', 'ghiChu', 50_000],
  ] as const) {
    it(`${duoi}: lưu nguyên văn, lúc lưu của server, tăng revision; trùng → không ghi; chỉ khoảng trắng → xoá`, async () => {
      datGio('2026-10-22T21:18:00+07:00')
      const ghi = await mt.put(url(chuDe.id, duoi), { text: '  Hai dòng\nchữ  ' })
      expect(ghi.status).toBe(200)
      expect(ghi.body).toEqual({
        revision: 1,
        daDoi: true,
        [truong]: { text: '  Hai dòng\nchữ  ', capNhat: expect.any(String) },
      })
      expect(gan(ghi.body[truong].capNhat, '2026-10-22T14:18:00Z')).toBe(true)
      const trung = await mt.put(url(chuDe.id, duoi), { text: '  Hai dòng\nchữ  ' })
      expect(trung.body).toMatchObject({ revision: 1, daDoi: false })
      quaPhut(5)
      const sua = await mt.put(url(chuDe.id, duoi), { text: 'Mới' })
      expect(sua.body[truong].text).toBe('Mới')
      expect(Date.parse(sua.body[truong].capNhat)).toBeGreaterThan(
        Date.parse(ghi.body[truong].capNhat),
      )
      const xoa = await mt.put(url(chuDe.id, duoi), { text: ' \n ' })
      expect(xoa.body).toEqual({ revision: 3, daDoi: true, [truong]: null })
      expect((await mt.put(url(chuDe.id, duoi), { text: '' })).body.daDoi).toBe(false)
      expect((await mt.get('/api/meta')).body.revision).toBe(3)
      const toiDaOk = await mt.put(url(chuDe.id, duoi), { text: 'x'.repeat(toiDa) })
      expect(toiDaOk.status).toBe(200)
    })

    it(`${duoi}: 400 tiếng Việt, 404 mục lạ, không ghi gì`, async () => {
      const cases: [unknown, RegExp][] = [
        [{}, /^text phải là chuỗi\.$/],
        ['chu', /^Thân yêu cầu phải là JSON dạng \{ "text": "…" \}\.$/],
        [{ text: 1 }, /^text phải là chuỗi\.$/],
        [{ text: 'x'.repeat(toiDa + 1) }, new RegExp(`^text dài tối đa ${toiDa} ký tự\\.$`)],
        [{ text: 'x', khac: 1 }, /^Trường không được nhận: khac\. Chỉ nhận text\.$/],
        [[], /^Thân yêu cầu phải là JSON dạng/],
      ]
      for (const [body, cau] of cases) {
        const res = await mt.put(url(chuDe.id, duoi), body)
        expect(res.status, JSON.stringify(body)).toBe(400)
        expect(res.body.loi).toMatch(cau)
      }
      expect((await mt.put(url(ID_LA, duoi), { text: 'x' })).status).toBe(404)
      expect(layRevision(mt.db)).toBe(0)
    })
  }

  it('transaction: tăng revision lỗi → không có hàng (500)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mt.db.exec(`
      CREATE TRIGGER chan_them BEFORE INSERT ON settings BEGIN SELECT RAISE(ABORT, 'chặn'); END;
      CREATE TRIGGER chan_sua BEFORE UPDATE ON settings BEGIN SELECT RAISE(ABORT, 'chặn'); END;
    `)
    const res = await mt.put(url(chuDe.id, '/noi-lai'), { text: 'x' })
    expect(res.status).toBe(500)
    expect(dem(mt.db, 'restatements')).toBe(0)
  })
})

describe('PUT /api/hoc/:id/thuc-hanh — Chủ đề (đề xuất 3.2)', () => {
  it('ghi kết quả / dự án / tiêu chí khi chưa làm → Đang làm; Xong cần kết quả; truoc để Hoàn tác', async () => {
    const duAn = (await mt.post('/api/du-an', { ten: 'Dự án A' })).body.duAn
    const ghi = await thucHanh(chuDe.id, { ketQua: 'Bản nháp kết quả' })
    expect(ghi.body).toEqual({
      revision: 2,
      daDoi: true,
      thucHanh: { ...THUC_HANH_TRONG, trangThai: 'dang-lam', ketQua: 'Bản nháp kết quả' },
      truoc: THUC_HANH_TRONG,
    })
    const tick = await thucHanh(chuDe.id, { duAnId: duAn.id, tieuChi: { [K1]: true, [K2]: true } })
    expect(tick.body.thucHanh).toMatchObject({
      duAnId: duAn.id,
      tieuChi: { [K1]: true, [K2]: true },
    })
    const bo = await thucHanh(chuDe.id, { tieuChi: { [K2]: false } })
    expect(bo.body.thucHanh.tieuChi).toEqual({ [K1]: true })

    datGio('2026-10-22T21:00:00+07:00')
    const xong = await thucHanh(chuDe.id, { trangThai: 'xong' })
    expect(xong.body.thucHanh).toMatchObject({ trangThai: 'xong', ketQua: 'Bản nháp kết quả' })
    expect(gan(xong.body.thucHanh.xongLuc, '2026-10-22T14:00:00Z')).toBe(true)
    expect(xong.body.truoc.trangThai).toBe('dang-lam')
    // Sửa kết quả khi đang Xong: giữ lúc Xong
    quaPhut(10)
    const sua = await thucHanh(chuDe.id, { ketQua: 'Kết quả cuối' })
    expect(sua.body.thucHanh.xongLuc).toBe(xong.body.thucHanh.xongLuc)
    // Xoá hết kết quả khi đang Xong → về Đang làm (Xong khi ô Kết quả có chữ)
    const rong = await thucHanh(chuDe.id, { ketQua: '   ' })
    expect(rong.body.thucHanh).toMatchObject({ trangThai: 'dang-lam', xongLuc: null })
    const lai = await thucHanh(chuDe.id, { trangThai: 'xong' })
    expect(lai.status).toBe(409)
    expect(lai.body.loi).toBe('Ghi “Kết quả của bạn” trước khi đánh dấu bài thực hành Xong.')
    const cungLuc = await thucHanh(chuDe.id, { trangThai: 'xong', ketQua: 'Có chữ' })
    expect(cungLuc.body.thucHanh.trangThai).toBe('xong')
    expect(layRevision(mt.db)).toBe(8)
  })

  it('Không áp dụng: cần lý do (gửi kèm hoặc đã có), bỏ khoảng trắng; đổi trạng thái khác thì bỏ lý do', async () => {
    const thieu = await thucHanh(chuDe.id, { trangThai: 'khong-ap-dung' })
    expect(thieu.status).toBe(400)
    expect(thieu.body.loi).toBe('Cần ghi lý do Không áp dụng (không để trống).')
    const ghi = await thucHanh(chuDe.id, { trangThai: 'khong-ap-dung', lyDo: '  Không có dự án  ' })
    expect(ghi.body.thucHanh).toEqual({
      ...THUC_HANH_TRONG,
      trangThai: 'khong-ap-dung',
      lyDo: 'Không có dự án',
    })
    const doiLyDo = await thucHanh(chuDe.id, { lyDo: 'Lý do mới' })
    expect(doiLyDo.body.thucHanh.lyDo).toBe('Lý do mới')
    const trung = await thucHanh(chuDe.id, { trangThai: 'khong-ap-dung' })
    expect(trung.body.daDoi).toBe(false)
    const ve = await thucHanh(chuDe.id, { trangThai: 'dang-lam' })
    expect(ve.body.thucHanh).toMatchObject({ trangThai: 'dang-lam', lyDo: null })
    const lyDoSai = await thucHanh(chuDe.id, { lyDo: 'x' })
    expect(lyDoSai.status).toBe(400)
    expect(lyDoSai.body.loi).toBe('lyDo chỉ dùng khi bước Áp dụng là Không áp dụng.')
  })

  it('trangThai null = về chưa làm: không còn dữ liệu thì xoá hàng; còn dữ liệu thì Đang làm', async () => {
    await thucHanh(chuDe.id, { trangThai: 'khong-ap-dung', lyDo: 'x' })
    const ve = await thucHanh(chuDe.id, { trangThai: null })
    expect(ve.body.thucHanh).toEqual(THUC_HANH_TRONG)
    expect(dem(mt.db, 'practice')).toBe(0)
    await thucHanh(chuDe.id, { ketQua: 'Có chữ' })
    await thucHanh(chuDe.id, { trangThai: 'khong-ap-dung', lyDo: 'x' })
    const conDuLieu = await thucHanh(chuDe.id, { trangThai: null })
    expect(conDuLieu.body.thucHanh).toMatchObject({ trangThai: 'dang-lam', ketQua: 'Có chữ' })
    const trongRong = await thucHanh(taiLieu.id, { trangThai: null })
    expect(trongRong.body).toMatchObject({ daDoi: false, revision: 5 })
  })

  it('dự án phải có (400); duAnId null bỏ chọn', async () => {
    const res = await thucHanh(chuDe.id, { duAnId: 99 })
    expect(res.status).toBe(400)
    expect(res.body.loi).toBe('Không có dự án id 99.')
    const duAn = (await mt.post('/api/du-an', { ten: 'A' })).body.duAn
    await thucHanh(chuDe.id, { duAnId: duAn.id })
    const bo = await thucHanh(chuDe.id, { duAnId: null })
    expect(bo.body.thucHanh).toMatchObject({ trangThai: 'dang-lam', duAnId: null })
  })

  it('400: body rỗng, trường lạ, giá trị sai — câu tiếng Việt, không ghi gì', async () => {
    const cases: [unknown, RegExp][] = [
      [{}, /^Cần ít nhất một trường: trangThai, duAnId, ketQua, tieuChi, lyDo\.$/],
      [{ trangThai: 'done' }, /^trangThai phải là dang-lam, xong, khong-ap-dung hoặc null/],
      [{ duAnId: 0 }, /^duAnId phải là số nguyên dương hoặc null\.$/],
      [{ duAnId: '1' }, /^duAnId phải là/],
      [{ tieuChi: { 'Khoá Sai': true } }, /^tieuChi không hợp lệ: khoá phải là/],
      [{ tieuChi: [true] }, /^tieuChi phải là object/],
      [{ tieuChi: { [K1]: 'co' } }, /^tieuChi phải là object/],
      [
        { tieuChi: Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`k${i}`, true])) },
        /^tieuChi có tối đa 50 khoá\.$/,
      ],
      [{ ketQua: 'x'.repeat(20_001) }, /^ketQua dài tối đa 20000 ký tự\.$/],
      [{ lyDo: '   ', trangThai: 'khong-ap-dung' }, /^Cần ghi lý do Không áp dụng/],
      [{ lyDo: 'x'.repeat(501), trangThai: 'khong-ap-dung' }, /^lyDo dài tối đa 500 ký tự\.$/],
      [{ via: 'x' }, /^Trường không được nhận: via\./],
    ]
    for (const [body, cau] of cases) {
      const res = await thucHanh(chuDe.id, body)
      expect(res.status, JSON.stringify(body)).toBe(400)
      expect(res.body.loi, JSON.stringify(body)).toMatch(cau)
    }
    expect(dem(mt.db, 'practice')).toBe(0)
    expect(layRevision(mt.db)).toBe(0)
  })
})

describe('PUT /api/hoc/:id/thuc-hanh — Tài liệu, Chứng chỉ (mọi mẫu bài nhận Không áp dụng)', () => {
  it('Không áp dụng + lý do và bỏ đánh dấu được; trạng thái / trường khác → 409, không ghi', async () => {
    for (const [m, khoi] of [
      [taiLieu, 'Bản của tôi'],
      [chungChi, 'Kế hoạch thi'],
    ] as const) {
      const ok = await thucHanh(m.id, { trangThai: 'khong-ap-dung', lyDo: 'Không cần' })
      expect(ok.status).toBe(200)
      expect(ok.body.thucHanh).toMatchObject({ trangThai: 'khong-ap-dung', lyDo: 'Không cần' })
      for (const body of [{ trangThai: 'xong' }, { trangThai: 'dang-lam' }, { ketQua: 'x' }]) {
        const res = await thucHanh(m.id, body)
        expect(res.status).toBe(409)
        expect(res.body.loi).toBe(
          `Mục ${m.mau === 'tai-lieu' ? 'Tài liệu' : 'Chứng chỉ'}: bước Áp dụng tính theo khối ${khoi}; ở đây chỉ đánh dấu Không áp dụng (kèm lý do) được.`,
        )
      }
      const bo = await thucHanh(m.id, { trangThai: null })
      expect(bo.body.thucHanh).toEqual(THUC_HANH_TRONG)
    }
    expect(dem(mt.db, 'practice')).toBe(0)
  })

  it('GET /api/ap-dung (bí danh 2a) thấy cùng dữ liệu', async () => {
    await thucHanh(taiLieu.id, { trangThai: 'khong-ap-dung', lyDo: 'Không cần' })
    await thucHanh(chuDe.id, { ketQua: 'x' })
    expect((await mt.get('/api/ap-dung')).body.apDung).toEqual({
      [taiLieu.id]: { trangThai: 'khong-ap-dung', lyDo: 'Không cần' },
      [chuDe.id]: { trangThai: 'dang-lam' },
    })
  })
})

describe('PUT /api/hoc/:id/tu-kiem-tra/:khoa (đề xuất 3.2, quyết định 7)', () => {
  const tk = (body: unknown, khoa = K1) => mt.put(url(chuDe.id, `/tu-kiem-tra/${khoa}`), body)

  it('trả lời → Xem đáp án (chỉ khi có chữ) → tự chấm (chỉ sau khi xem); giữ lần chấm mới nhất', async () => {
    const chuaTraLoi = await tk({ daXem: true })
    expect(chuaTraLoi.status).toBe(409)
    expect(chuaTraLoi.body.loi).toBe('Viết câu trả lời trước khi xem đáp án.')
    expect((await tk({ traLoi: '   ', daXem: true })).status).toBe(409)
    const tl = await tk({ traLoi: 'Hỏi khách trước' })
    expect(tl.body).toEqual({
      revision: 1,
      daDoi: true,
      khoa: K1,
      cau: { traLoi: 'Hỏi khách trước', daXem: false, cham: null, chamLuc: null },
      truoc: null,
    })
    const chamSom = await tk({ cham: 'dung' })
    expect(chamSom.status).toBe(409)
    expect(chamSom.body.loi).toBe('Xem đáp án trước khi tự chấm.')
    expect((await tk({ daXem: true })).body.cau.daXem).toBe(true)
    datGio('2026-10-22T21:42:00+07:00')
    const cham = await tk({ cham: 'mot-phan' })
    expect(cham.body.cau).toMatchObject({ cham: 'mot-phan' })
    expect(gan(cham.body.cau.chamLuc, '2026-10-22T14:42:00Z')).toBe(true)
    expect((await tk({ cham: 'mot-phan' })).body.daDoi).toBe(false)
    quaPhut(3)
    const chamLai = await tk({ cham: 'dung' })
    expect(chamLai.body.cau.cham).toBe('dung')
    expect(chamLai.body.truoc.cham).toBe('mot-phan')
    expect(chamLai.body.cau.chamLuc).not.toBe(cham.body.cau.chamLuc)
    // Xoá câu trả lời sau khi đã xem: vẫn giữ đã xem và lần chấm
    const xoaTl = await tk({ traLoi: '' })
    expect(xoaTl.body.cau).toMatchObject({ traLoi: '', daXem: true, cham: 'dung' })
    expect(layRevision(mt.db)).toBe(5)
  })

  it('trả lời + xem + chấm trong một lần gửi; câu chưa xem bị xoá hết chữ thì xoá hàng', async () => {
    const mot = await tk({ traLoi: 'A', daXem: true, cham: 'sai' }, K2)
    expect(mot.body.cau).toMatchObject({ traLoi: 'A', daXem: true, cham: 'sai' })
    await tk({ traLoi: 'B' })
    const xoa = await tk({ traLoi: '' })
    expect(xoa.body).toMatchObject({ daDoi: true, cau: null })
    expect(dem(mt.db, 'self_check')).toBe(1)
    expect(Object.keys((await mt.get(url(chuDe.id))).body.tuKiemTra)).toEqual([K2])
  })

  it('400: khoá sai dạng, daXem false, cham lạ, body rỗng / trường lạ; 404 mục lạ', async () => {
    expect((await tk({ traLoi: 'x' }, 'Khoá%20Sai')).body.loi).toMatch(/^khoa không hợp lệ/)
    const cases: [unknown, RegExp][] = [
      [{ daXem: false }, /^daXem chỉ nhận true/],
      [{ cham: 'tot' }, /^cham phải là dung, mot-phan hoặc sai\.$/],
      [{}, /^Cần ít nhất một trường: traLoi, daXem, cham\.$/],
      [{ traLoi: 'x', y: 1 }, /^Trường không được nhận: y\./],
      [{ traLoi: 'x'.repeat(5001) }, /^traLoi dài tối đa 5000 ký tự\.$/],
    ]
    for (const [body, cau] of cases) {
      const res = await tk(body)
      expect(res.status, JSON.stringify(body)).toBe(400)
      expect(res.body.loi).toMatch(cau)
    }
    expect((await mt.put(url(ID_LA, `/tu-kiem-tra/${K1}`), { traLoi: 'x' })).status).toBe(404)
    expect(layRevision(mt.db)).toBe(0)
  })
})

describe('GET / POST /api/du-an', () => {
  it('thêm dự án (bỏ khoảng trắng; vai trò / giai đoạn rỗng = null), tăng revision; danh sách cũ trước', async () => {
    expect((await mt.get('/api/du-an')).body).toEqual([])
    const a = await mt.post('/api/du-an', { ten: '  Dự án A ', giaiDoan: 'Execution', vaiTro: '' })
    expect(a.body).toEqual({
      revision: 1,
      daDoi: true,
      duAn: { id: expect.any(Number), ten: 'Dự án A', vaiTro: null, giaiDoan: 'Execution' },
    })
    await mt.post('/api/du-an', { ten: 'Dự án B', vaiTro: 'PM', giaiDoan: null })
    expect((await mt.get('/api/du-an')).body.map((d: { ten: string }) => d.ten)).toEqual([
      'Dự án A',
      'Dự án B',
    ])
    expect((await mt.get('/api/meta')).body.revision).toBe(2)
  })

  it('400 tiếng Việt, không ghi', async () => {
    const cases: [unknown, RegExp][] = [
      [{}, /^Cần tên dự án \(không để trống\)\.$/],
      [{ ten: '   ' }, /^Cần tên dự án/],
      [{ ten: 'x'.repeat(201) }, /^ten dài tối đa 200 ký tự\.$/],
      [{ ten: 'A', vaiTro: 'x'.repeat(201) }, /^vaiTro dài tối đa 200 ký tự\.$/],
      [{ ten: 'A', mau: 1 }, /^Trường không được nhận: mau\. Chỉ nhận ten, vaiTro, giaiDoan\.$/],
    ]
    for (const [body, cau] of cases) {
      const res = await mt.post('/api/du-an', body)
      expect(res.status, JSON.stringify(body)).toBe(400)
      expect(res.body.loi).toMatch(cau)
    }
    expect(dem(mt.db, 'projects')).toBe(0)
  })
})
