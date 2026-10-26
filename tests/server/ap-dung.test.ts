// API bước Áp dụng (đề xuất 2.1 bảng practice, 3.2; §1 "Không áp dụng" kèm lý do; bất biến 8): migration 3,
// GET / PUT / DELETE /api/ap-dung trên DB + thư mục tạm, transaction + revision, câu lỗi tiếng Việt, 409 cho
// mẫu bài chưa được đánh dấu ở phase 2a.
import path from 'node:path'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { datLech } from '../../shared/clock.ts'
import { layCay } from '../../shared/roadmap/index.ts'
import { taoApp } from '../../server/app.ts'
import { docCauHinh } from '../../server/cau-hinh.ts'
import { layPhienBan, moDb, type Db } from '../../server/db/index.ts'
import { dsMigration } from '../../server/db/migrations.ts'
import { layRevision } from '../../server/db/settings.ts'
import { taoSaoLuu, type SaoLuu } from '../../server/sao-luu.ts'
import { buocApDung, lyDoKhongApDung, LY_DO_AP_DUNG_TOI_DA } from '../../server/du-lieu/ap-dung.ts'
import {
  boDanhDauKhongApDung,
  danhDauKhongApDung,
  docMucApDung,
} from '../../server/routes/ap-dung.ts'
import { datGio, HOST, SO_MUC_HOC_GIA, taoThuMucTam, type ThuMucTam } from './tro-giup.ts'

const cay = layCay()
const mucCuaSlug = (slug: string) => {
  const m = cay.mucTheoSlug.get(slug)
  if (!m) throw new Error(`Không có mục "${slug}"`)
  return m
}
const chungChi = mucCuaSlug('project-management-professional-pmp')
const chungChi2 = cay.mucHoc.find((m) => m.mau === 'chung-chi' && m.id !== chungChi.id)!
const chuDe = mucCuaSlug('scope-creep')
const taiLieu = mucCuaSlug('risk-register')
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
  vi.restoreAllMocks()
})

const duongDan = (id: string) => `/api/ap-dung/${encodeURIComponent(id)}`
const get = (url = '/api/ap-dung') => request(app).get(url).set('Host', HOST)
const put = (id: string, body?: unknown) => {
  const r = request(app).put(duongDan(id)).set('Host', HOST)
  return body === undefined ? r : r.send(body as object)
}
const xoa = (id: string) => request(app).delete(duongDan(id)).set('Host', HOST)

interface DongPractice {
  item_id: string
  project_id: number | null
  result_md: string | null
  criteria: string | null
  state: string
  na_reason: string | null
  done_at: string | null
  created_at: string
  updated_at: string
}
const dong = (id: string) =>
  db.prepare('SELECT * FROM practice WHERE item_id = ?').get(id) as DongPractice | undefined
/** Thời điểm ISO đã lưu cách mốc dưới 5 giây (giờ app chạy tiếp sau datGio). */
const gan = (iso: string, moc: string) => Math.abs(Date.parse(iso) - Date.parse(moc)) < 5000
const demPractice = () =>
  (db.prepare('SELECT count(*) AS n FROM practice').get() as { n: number }).n

describe('migration 3 — bảng practice (đề xuất 2.1)', () => {
  it('đúng cột của đề xuất + created_at / updated_at; user_version = số migration', () => {
    expect(layPhienBan(db)).toBe(dsMigration.length)
    expect(dsMigration.at(-1)?.ten).toBe('ap-dung')
    const cot = db.prepare("SELECT name FROM pragma_table_info('practice')").pluck().all()
    expect(cot).toEqual([
      'item_id',
      'project_id',
      'result_md',
      'criteria',
      'state',
      'na_reason',
      'done_at',
      'created_at',
      'updated_at',
    ])
    const khoaChinh = db
      .prepare("SELECT name FROM pragma_table_info('practice') WHERE pk = 1")
      .pluck()
      .all()
    expect(khoaChinh).toEqual(['item_id'])
  })

  it('không tạo bảng nào khác của phase 3', () => {
    const bang = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .pluck()
      .all() as string[]
    for (const ten of [
      'projects',
      'restatements',
      'self_check',
      'doc_versions',
      'doc_checklist',
      'cert_plans',
      'notes',
      'flashcards',
      'time_entries',
    ]) {
      expect(bang).not.toContain(ten)
    }
  })

  it('CHECK: state 3 giá trị; Không áp dụng phải có lý do có chữ; lý do chỉ đi với Không áp dụng', () => {
    const them = (state: string, lyDo: string | null) =>
      db
        .prepare(
          `INSERT INTO practice (item_id, state, na_reason, created_at, updated_at)
           VALUES ('x', ?, ?, 'a', 'a')`,
        )
        .run(state, lyDo)
    for (const sai of ['chua-lam', 'done', 'skip', ''])
      expect(() => them(sai, null)).toThrow(/CHECK/)
    expect(() => them('khong-ap-dung', null)).toThrow(/CHECK/)
    expect(() => them('khong-ap-dung', '   ')).toThrow(/CHECK/)
    expect(() => them('xong', 'lý do')).toThrow(/CHECK/)
    expect(() => them('dang-lam', 'lý do')).toThrow(/CHECK/)
    expect(() => them('khong-ap-dung', 'Không thi chứng chỉ này')).not.toThrow()
    db.prepare("DELETE FROM practice WHERE item_id = 'x'").run()
    expect(() => them('xong', null)).not.toThrow()
  })
})

describe('GET /api/ap-dung', () => {
  it('DB trống: revision 0, không mục nào (không có khoá = chưa làm)', async () => {
    const res = await get()
    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.body).toEqual({ revision: 0, apDung: {} })
  })

  it('bất biến 8: hàng của mục không còn trong cây vẫn giữ trong DB, không vào phản hồi', async () => {
    danhDauKhongApDung(db, { id: ID_LA, lyDo: 'Lý do cũ' })
    danhDauKhongApDung(db, { id: chungChi.id, lyDo: 'Chưa định thi' })
    const res = await get()
    expect(res.body).toEqual({
      revision: 2,
      apDung: { [chungChi.id]: { trangThai: 'khong-ap-dung', lyDo: 'Chưa định thi' } },
    })
    expect(dong(ID_LA)?.state).toBe('khong-ap-dung')
  })
})

describe('PUT /api/ap-dung/:id — Không áp dụng kèm lý do', () => {
  it('Chứng chỉ: ghi hàng (lý do đã bỏ khoảng trắng hai đầu) trong 1 transaction, tăng revision', async () => {
    datGio('2026-10-26T21:42:00+07:00')
    const res = await put(chungChi.id, { khongApDung: true, lyDo: '  Chưa định thi năm nay  ' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      revision: 1,
      id: chungChi.id,
      muc: { trangThai: 'khong-ap-dung', lyDo: 'Chưa định thi năm nay' },
      truoc: null,
      daDoi: true,
    })
    expect(dong(chungChi.id)).toMatchObject({
      state: 'khong-ap-dung',
      na_reason: 'Chưa định thi năm nay',
      project_id: null,
      result_md: null,
      criteria: null,
      done_at: null,
    })
    expect(gan(dong(chungChi.id)!.created_at, '2026-10-26T14:42:00Z')).toBe(true)
    expect(dong(chungChi.id)!.updated_at).toBe(dong(chungChi.id)!.created_at)
    expect((await get('/api/meta')).body.revision).toBe(1)
    expect((await get()).body).toEqual({
      revision: 1,
      apDung: { [chungChi.id]: { trangThai: 'khong-ap-dung', lyDo: 'Chưa định thi năm nay' } },
    })
  })

  it('cùng lý do: không ghi gì, revision giữ nguyên (daDoi false); lý do khác: cập nhật, truoc là lý do cũ', async () => {
    await put(chungChi.id, { khongApDung: true, lyDo: 'Lý do A' })
    const trung = await put(chungChi.id, { khongApDung: true, lyDo: ' Lý do A ' })
    expect(trung.body).toMatchObject({ revision: 1, daDoi: false })
    expect(layRevision(db)).toBe(1)

    datGio('2026-10-27T08:00:00Z')
    const doi = await put(chungChi.id, { khongApDung: true, lyDo: 'Lý do B' })
    expect(doi.body).toEqual({
      revision: 2,
      id: chungChi.id,
      muc: { trangThai: 'khong-ap-dung', lyDo: 'Lý do B' },
      truoc: { trangThai: 'khong-ap-dung', lyDo: 'Lý do A' },
      daDoi: true,
    })
    expect(gan(dong(chungChi.id)!.updated_at, '2026-10-27T08:00:00Z')).toBe(true)
    expect(dong(chungChi.id)?.created_at).not.toBe(dong(chungChi.id)?.updated_at)
  })

  it('lý do đúng 500 ký tự (sau khi bỏ khoảng trắng) được nhận', async () => {
    const lyDo = 'x'.repeat(LY_DO_AP_DUNG_TOI_DA)
    const res = await put(chungChi.id, { khongApDung: true, lyDo: `  ${lyDo}  ` })
    expect(res.status).toBe(200)
    expect(dong(chungChi.id)?.na_reason).toBe(lyDo)
  })

  it('kiểm body — 400 với câu tiếng Việt, không ghi gì', async () => {
    const cases: [unknown, RegExp][] = [
      [{ khongApDung: true }, /^Cần lyDo: lý do Không áp dụng/],
      [{ khongApDung: true, lyDo: '' }, /^Cần ghi lý do Không áp dụng \(không để trống\)\.$/],
      [{ khongApDung: true, lyDo: ' \n\t ' }, /^Cần ghi lý do Không áp dụng/],
      [
        { khongApDung: true, lyDo: 'x'.repeat(501) },
        /^Lý do Không áp dụng dài tối đa 500 ký tự\.$/,
      ],
      [{ khongApDung: true, lyDo: 42 }, /^Cần lyDo: lý do Không áp dụng, dạng chuỗi\.$/],
      [{ khongApDung: false, lyDo: 'x' }, /^khongApDung phải là true\. Bỏ đánh dấu .* DELETE/],
      [{ lyDo: 'x' }, /^khongApDung phải là true/],
      [{ khongApDung: true, lyDo: 'x', via: 'hoan-tac' }, /^Trường không được nhận: via\./],
      [[], /^Thân yêu cầu phải là JSON dạng/],
    ]
    for (const [body, cau] of cases) {
      const res = await put(chungChi.id, body)
      expect(res.status, JSON.stringify(body)).toBe(400)
      expect(res.body.loi, JSON.stringify(body)).toMatch(cau)
    }
    const thieu = await put(chungChi.id)
    expect(thieu.status).toBe(400)
    expect(thieu.body.loi).toMatch(/^Thân yêu cầu phải là JSON dạng/)
    expect(demPractice()).toBe(0)
    expect(layRevision(db)).toBe(0)
  })

  it('404: id không có trong cây, hoặc không phải mục học (bất biến 8)', async () => {
    for (const id of [ID_LA, linhVuc.id]) {
      const res = await put(id, { khongApDung: true, lyDo: 'x' })
      expect(res.status).toBe(404)
      expect(res.body.loi).toBe(`Không có mục học id "${id}" trong cây roadmap.`)
    }
    expect(demPractice()).toBe(0)
  })

  it('409: Chủ đề và Tài liệu chưa đánh dấu được ở phase 2a (câu tiếng Việt), không ghi gì', async () => {
    for (const m of [chuDe, taiLieu]) {
      const res = await put(m.id, { khongApDung: true, lyDo: 'x' })
      expect(res.status).toBe(409)
      expect(res.body.loi).toContain(
        `Mục "${m.label}" là ${m.mau === 'chu-de' ? 'Chủ đề' : 'Tài liệu'}`,
      )
      expect(res.body.loi).toContain('chỉ mục Chứng chỉ đánh dấu Không áp dụng được')
      expect(res.body.loi).toContain('có ở phase 3')
    }
    expect(demPractice()).toBe(0)
    expect(layRevision(db)).toBe(0)
  })

  it('transaction: tăng revision lỗi → không có hàng, revision giữ nguyên (500)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    db.exec(`
      CREATE TRIGGER chan_them BEFORE INSERT ON settings BEGIN SELECT RAISE(ABORT, 'chặn'); END;
      CREATE TRIGGER chan_sua BEFORE UPDATE ON settings BEGIN SELECT RAISE(ABORT, 'chặn'); END;
    `)
    const res = await put(chungChi.id, { khongApDung: true, lyDo: 'x' })
    expect(res.status).toBe(500)
    expect(res.body.loi).toMatch(/^Máy chủ gặp lỗi/)
    expect(demPractice()).toBe(0)
    expect(layRevision(db)).toBe(0)
  })

  it('Origin lạ bị chặn như mọi API', async () => {
    const res = await put(chungChi.id, { khongApDung: true, lyDo: 'x' }).set(
      'Origin',
      'http://evil.example',
    )
    expect(res.status).toBe(403)
    expect(demPractice()).toBe(0)
  })
})

describe('DELETE /api/ap-dung/:id — bỏ đánh dấu (Hoàn tác)', () => {
  it('xoá hàng chỉ có dấu Không áp dụng, tăng revision; gọi lại thì không ghi gì', async () => {
    await put(chungChi.id, { khongApDung: true, lyDo: 'Lý do A' })
    const res = await xoa(chungChi.id)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      revision: 2,
      id: chungChi.id,
      muc: null,
      truoc: { trangThai: 'khong-ap-dung', lyDo: 'Lý do A' },
      daDoi: true,
    })
    expect(dong(chungChi.id)).toBeUndefined()
    expect((await get()).body).toEqual({ revision: 2, apDung: {} })

    const lai = await xoa(chungChi.id)
    expect(lai.body).toEqual({ revision: 2, id: chungChi.id, muc: null, truoc: null, daDoi: false })
    expect(layRevision(db)).toBe(2)
  })

  it('Hoàn tác hai chiều: PUT rồi DELETE về chưa làm; DELETE rồi PUT lý do cũ (truoc) về như cũ', async () => {
    await put(chungChi2.id, { khongApDung: true, lyDo: 'Giữ nguyên' })
    const ghi = await put(chungChi.id, { khongApDung: true, lyDo: 'Lý do A' })
    expect(ghi.body.truoc).toBeNull()
    await xoa(chungChi.id)
    expect(docMucApDung(db, chungChi.id)).toBeUndefined()

    await put(chungChi.id, { khongApDung: true, lyDo: 'Lý do A' })
    const bo = await xoa(chungChi.id)
    const hoanTac = await put(chungChi.id, { khongApDung: true, lyDo: bo.body.truoc.lyDo })
    expect(hoanTac.body.muc).toEqual({ trangThai: 'khong-ap-dung', lyDo: 'Lý do A' })
    expect(Object.keys((await get()).body.apDung).sort()).toEqual(
      [chungChi.id, chungChi2.id].sort(),
    )
    expect(dong(chungChi2.id)?.na_reason).toBe('Giữ nguyên')
  })

  it('404 / 409 như PUT', async () => {
    expect((await xoa(ID_LA)).status).toBe(404)
    const res = await xoa(chuDe.id)
    expect(res.status).toBe(409)
    expect(res.body.loi).toContain('có ở phase 3')
  })

  it('transaction: tăng revision lỗi → hàng còn nguyên (500)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await put(chungChi.id, { khongApDung: true, lyDo: 'Lý do A' })
    db.exec(
      `CREATE TRIGGER chan_sua BEFORE UPDATE ON settings BEGIN SELECT RAISE(ABORT, 'chặn'); END`,
    )
    const res = await xoa(chungChi.id)
    expect(res.status).toBe(500)
    expect(dong(chungChi.id)?.na_reason).toBe('Lý do A')
    expect(layRevision(db)).toBe(1)
  })
})

describe('hàm ghi — giữ dữ liệu bài thực hành của phase 3', () => {
  it('Không áp dụng trên hàng đã có kết quả: giữ dự án / kết quả / tiêu chí; bỏ đánh dấu → dang-lam', () => {
    db.prepare(
      `INSERT INTO practice (item_id, project_id, result_md, criteria, state, done_at, created_at, updated_at)
       VALUES (?, 1, 'Kết quả', '[1]', 'xong', '2026-10-20T00:00:00.000Z', 'a', 'a')`,
    ).run(chuDe.id)
    const ghi = danhDauKhongApDung(db, { id: chuDe.id, lyDo: 'Dự án không có phần này' })
    expect(ghi.truoc).toEqual({ trangThai: 'xong' })
    expect(dong(chuDe.id)).toMatchObject({
      state: 'khong-ap-dung',
      na_reason: 'Dự án không có phần này',
      project_id: 1,
      result_md: 'Kết quả',
      criteria: '[1]',
    })
    const bo = boDanhDauKhongApDung(db, chuDe.id)
    expect(bo.muc).toEqual({ trangThai: 'dang-lam' })
    expect(dong(chuDe.id)).toMatchObject({
      state: 'dang-lam',
      na_reason: null,
      result_md: 'Kết quả',
    })
    expect(layRevision(db)).toBe(2)
  })

  it('lyDoKhongApDung / buocApDung (thanh 4 bước)', () => {
    expect(lyDoKhongApDung({ trangThai: 'khong-ap-dung', lyDo: 'x' })).toBe('x')
    expect(lyDoKhongApDung({ trangThai: 'xong' })).toBeUndefined()
    expect(lyDoKhongApDung(undefined)).toBeUndefined()
    expect(buocApDung(undefined)).toBe('chua-lam')
    expect(buocApDung(null)).toBe('chua-lam')
    expect(buocApDung({ trangThai: 'khong-ap-dung', lyDo: 'x' })).toBe('khong-ap-dung')
    expect(buocApDung({ trangThai: 'dang-lam' })).toBe('dang-lam')
  })
})
