// Khoá câu hỏi / tiêu chí theo bài HIỆN TẠI (đề xuất 1.5 "Khi bài đổi"; migration 6): câu trả lời / tick lưu kèm
// chữ; GET /api/hoc/:id gán lại khoá không còn trong bài sang câu mới đủ giống (Dice ≥ 0,8, hơn thứ hai ≥ 0,15),
// không được thì giữ dưới khoá cũ (không xoá); tick cũ không tính vào bước Áp dụng; chỉ tick được tiêu chí có trong
// bài. Bài đổi tên câu, đổi thứ tự, sửa hẳn câu — trên app thật (DB + thư mục nội dung tạm).
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { tinhBonBuoc } from '../../shared/domain/bon-buoc.ts'
import { capNhatSchema, layPhienBan, moKetNoi } from '../../server/db/index.ts'
import { dsMigration } from '../../server/db/migrations.ts'
import { layRevision } from '../../server/db/settings.ts'
import { THUC_HANH_TRONG, type DuLieuHoc } from '../../server/du-lieu/hop-dong-hoc.ts'
import { taoThuMucTam } from './tro-giup.ts'
import { ghiBaiHoc, mucSlug, taoMoiTruongHoc, vietBai, type MoiTruongHoc } from './tro-giup-hoc.ts'

const chuDe = mucSlug('scope-creep')
const taiLieu = mucSlug('risk-register')

let mt: MoiTruongHoc
beforeEach(async () => {
  mt = await taoMoiTruongHoc()
})
afterEach(async () => {
  await mt.dong()
})

const url = (id: string, duoi = '') => `/api/hoc/${encodeURIComponent(id)}${duoi}`
const layHoc = async (id = chuDe.id): Promise<DuLieuHoc> => {
  const res = await mt.get(url(id))
  expect(res.status).toBe(200)
  return res.body as DuLieuHoc
}
const tk = (khoa: string, body: unknown, id = chuDe.id) =>
  mt.put(url(id, `/tu-kiem-tra/${khoa}`), body)
const thucHanh = (body: unknown, id = chuDe.id) => mt.put(url(id, '/thuc-hanh'), body)
/** Trả lời + xem + chấm một câu */
const lamCau = (khoa: string, traLoi: string, cham = 'dung') =>
  tk(khoa, { traLoi, daXem: true, cham })
const cotSelfCheck = () =>
  mt.db
    .prepare('SELECT question_key, question_text, answer FROM self_check ORDER BY question_key')
    .all()
const criteria = (id = chuDe.id) =>
  (
    mt.db.prepare('SELECT criteria FROM practice WHERE item_id = ?').get(id) as
      { criteria: string | null } | undefined
  )?.criteria

const Q1 = 'Phạm vi dự án là gì?'
const Q1_SUA = 'Phạm vi của dự án là gì?'
const Q2 = 'Ai duyệt yêu cầu thay đổi?'
const Q3 = 'Liệt kê ba dấu hiệu phạm vi phình to.'

describe('migration 6 — lưu chữ câu hỏi / tiêu chí (đề xuất 1.5)', () => {
  it('nâng DB từ migration 5: self_check.question_text NULL; criteria { k: true } → { k: null }', async () => {
    const tam = taoThuMucTam()
    try {
      const db = moKetNoi(path.join(tam.dataDir, 'cu.db'))
      await capNhatSchema(db, { migrations: dsMigration.slice(0, 5) })
      db.prepare(
        `INSERT INTO self_check (item_id, question_key, answer, created_at, updated_at)
         VALUES ('a', 'k1', 'Trả lời', 'c', 'u')`,
      ).run()
      const them = db.prepare(
        `INSERT INTO practice (item_id, criteria, state, created_at, updated_at)
         VALUES (?, ?, 'dang-lam', 'c', 'u')`,
      )
      them.run('a', '{"k1":true,"k2":true}')
      them.run('b', null)
      expect(await capNhatSchema(db)).toBe(dsMigration.length - 5)
      expect(layPhienBan(db)).toBe(dsMigration.length)
      expect(dsMigration[5]?.ten).toBe('chu-cau-hoi')
      expect(
        db.prepare('SELECT question_key, question_text, answer FROM self_check').all(),
      ).toEqual([{ question_key: 'k1', question_text: null, answer: 'Trả lời' }])
      expect(db.prepare('SELECT item_id, criteria FROM practice ORDER BY item_id').all()).toEqual([
        { item_id: 'a', criteria: '{"k1":null,"k2":null}' },
        { item_id: 'b', criteria: null },
      ])
      db.close()
    } finally {
      tam.xoa()
    }
  })
})

describe('Tự kiểm tra: lưu chữ câu hỏi, gán lại khi bài đổi', () => {
  it('PUT lưu chữ câu của khoá trong bài; khoá không có trong bài vẫn lưu (chữ null)', async () => {
    const {
      cau: [k1],
    } = ghiBaiHoc(mt, chuDe, { cauHoi: [Q1] })
    const ghi = await tk(k1, { traLoi: 'Ranh giới công việc' })
    expect(ghi.body.cau).toMatchObject({ traLoi: 'Ranh giới công việc', cauHoi: Q1 })
    const la = await tk('khoacu', { traLoi: 'Câu cũ' })
    expect(la.status).toBe(200)
    expect(la.body.cau.cauHoi).toBeNull()
    expect(cotSelfCheck()).toEqual([
      { question_key: k1, question_text: Q1, answer: 'Ranh giới công việc' },
      { question_key: 'khoacu', question_text: null, answer: 'Câu cũ' },
    ])
  })

  it('câu đổi chữ nhẹ → GET nối câu trả lời (cả lần chấm, thẻ tạo từ câu) sang khoá mới; tăng revision một lần', async () => {
    const {
      cau: [k1, k2],
    } = ghiBaiHoc(mt, chuDe, { cauHoi: [Q1, Q2] })
    await lamCau(k1, 'Ranh giới công việc', 'mot-phan')
    const the = await mt.post('/api/the', {
      itemId: chuDe.id,
      truoc: 'Mặt trước',
      sau: 'Mặt sau',
      khoaCau: k1,
    })
    expect(the.status).toBe(200)

    const {
      cau: [k1Moi, k2Moi],
    } = ghiBaiHoc(mt, chuDe, { cauHoi: [Q1_SUA, Q2] })
    expect(k1Moi).not.toBe(k1)
    expect(k2Moi).toBe(k2)
    const truoc = layRevision(mt.db)
    const hoc = await layHoc()
    expect(hoc.revision).toBe(truoc + 1)
    expect(Object.keys(hoc.tuKiemTra)).toEqual([k1Moi])
    expect(hoc.tuKiemTra[k1Moi]).toMatchObject({
      traLoi: 'Ranh giới công việc',
      daXem: true,
      cham: 'mot-phan',
      cauHoi: Q1_SUA,
    })
    expect(hoc.the[0]?.khoaCau).toBe(k1Moi)
    // Bước Kiểm tra theo khoá của bài: 1/2 câu đã chấm
    const buoc = tinhBonBuoc({ mau: chuDe.mau, cauHoiKhoa: [k1Moi, k2Moi], hoc })
    expect(buoc.buoc['kiem-tra'].thieu).toBe('Thiếu · đã chấm 1/2 câu')

    // Gán xong thì GET lại không đổi gì
    const lai = await layHoc()
    expect(lai.revision).toBe(truoc + 1)
    expect(lai.tuKiemTra).toEqual(hoc.tuKiemTra)
  })

  it('đổi thứ tự câu → khoá không đổi, không gán, không tăng revision', async () => {
    const { cau } = ghiBaiHoc(mt, chuDe, { cauHoi: [Q1, Q2, Q3] })
    for (const k of cau) await lamCau(k, `Trả lời ${k}`)
    const truoc = layRevision(mt.db)
    const daoNguoc = ghiBaiHoc(mt, chuDe, { cauHoi: [Q3, Q1, Q2] }).cau
    expect([...daoNguoc].sort()).toEqual([...cau].sort())
    const hoc = await layHoc()
    expect(hoc.revision).toBe(truoc)
    expect(Object.keys(hoc.tuKiemTra).sort()).toEqual([...cau].sort())
    for (const k of cau) expect(hoc.tuKiemTra[k]?.traLoi).toBe(`Trả lời ${k}`)
  })

  it('câu sửa hẳn (Dice < 0,8) → giữ dưới khoá cũ kèm chữ câu cũ ("câu hỏi cũ"), không tính vào Kiểm tra', async () => {
    const {
      cau: [k1],
    } = ghiBaiHoc(mt, chuDe, { cauHoi: [Q1] })
    await lamCau(k1, 'Ranh giới công việc')
    const {
      cau: [kMoi],
    } = ghiBaiHoc(mt, chuDe, { cauHoi: ['Nêu hai cách kiểm soát thay đổi.'] })
    const truoc = layRevision(mt.db)
    const hoc = await layHoc()
    expect(hoc.revision).toBe(truoc)
    expect(hoc.tuKiemTra).toEqual({
      [k1]: expect.objectContaining({ traLoi: 'Ranh giới công việc', cham: 'dung', cauHoi: Q1 }),
    })
    const buoc = tinhBonBuoc({ mau: chuDe.mau, cauHoiKhoa: [kMoi], hoc })
    expect(buoc.buoc['kiem-tra'].thieu).toBe('Thiếu · chưa tự chấm câu nào')
  })

  it('hai câu mới giống ngang nhau → không gán (không đoán)', async () => {
    const {
      cau: [k1],
    } = ghiBaiHoc(mt, chuDe, { cauHoi: [Q3] })
    await lamCau(k1, 'Ba dấu hiệu')
    ghiBaiHoc(mt, chuDe, {
      cauHoi: ['Liệt kê ba dấu hiệu phạm vi phình ra.', 'Liệt kê bốn dấu hiệu phạm vi phình to.'],
    })
    const hoc = await layHoc()
    expect(Object.keys(hoc.tuKiemTra)).toEqual([k1])
  })

  it('câu mới đã có câu trả lời → không bị đè; câu cũ giữ dưới khoá cũ', async () => {
    const {
      cau: [k1],
    } = ghiBaiHoc(mt, chuDe, { cauHoi: [Q1] })
    await lamCau(k1, 'Câu trả lời cũ')
    const {
      cau: [kMoi],
    } = ghiBaiHoc(mt, chuDe, { cauHoi: [Q1_SUA] })
    // Trang đang mở bản bài mới mà dữ liệu học chưa tải lại: người học trả lời câu mới trước
    await tk(kMoi, { traLoi: 'Câu trả lời mới' })
    const hoc = await layHoc()
    expect(hoc.tuKiemTra[kMoi]?.traLoi).toBe('Câu trả lời mới')
    expect(hoc.tuKiemTra[k1]?.traLoi).toBe('Câu trả lời cũ')
  })

  it('hàng trước migration 6 (chữ NULL): khoá còn trong bài → GET điền chữ, không tăng revision; khoá mất → giữ, không gán', async () => {
    const {
      cau: [k1, k2],
    } = ghiBaiHoc(mt, chuDe, { cauHoi: [Q1, Q2] })
    const them = mt.db.prepare(
      `INSERT INTO self_check (item_id, question_key, answer, created_at, updated_at)
       VALUES (?, ?, ?, 'c', 'u')`,
    )
    them.run(chuDe.id, k1, 'Còn trong bài')
    them.run(chuDe.id, 'khoamat', 'Không biết câu')
    const truoc = layRevision(mt.db)
    const hoc = await layHoc()
    expect(hoc.revision).toBe(truoc)
    expect(hoc.tuKiemTra[k1]?.cauHoi).toBe(Q1)
    expect(hoc.tuKiemTra.khoamat).toMatchObject({ traLoi: 'Không biết câu', cauHoi: null })
    expect(hoc.tuKiemTra[k2]).toBeUndefined()
  })
})

describe('Tiêu chí tự kiểm: lưu chữ, gán lại, tick cũ không tính vào Áp dụng', () => {
  const T1 = 'Có danh sách rủi ro cập nhật'
  const T1_SUA = 'Có danh sách rủi ro được cập nhật'
  const T2 = 'Có người phụ trách cho mỗi rủi ro'

  it('tick lưu kèm chữ tiêu chí; tick tiêu chí không có trong bài → 409, không ghi; bỏ tick khoá lạ được', async () => {
    const {
      tc: [t1],
    } = ghiBaiHoc(mt, chuDe, { tieuChi: [T1, T2] })
    const ok = await thucHanh({ tieuChi: { [t1]: true } })
    expect(ok.body.thucHanh).toMatchObject({ trangThai: 'dang-lam', tieuChi: { [t1]: true } })
    expect(JSON.parse(criteria() ?? '{}')).toEqual({ [t1]: T1 })
    const truoc = layRevision(mt.db)
    const la = await thucHanh({ tieuChi: { khoala: true } })
    expect(la.status).toBe(409)
    expect(la.body.loi).toBe(
      'Tiêu chí "khoala" không có trong bài hiện tại (bài vừa được sửa?). Tải lại trang rồi tick lại.',
    )
    expect(layRevision(mt.db)).toBe(truoc)
    expect((await thucHanh({ tieuChi: { khoala: false } })).status).toBe(200)
  })

  it('tiêu chí đổi chữ nhẹ → GET chuyển tick sang khoá mới', async () => {
    const {
      tc: [t1, t2],
    } = ghiBaiHoc(mt, chuDe, { tieuChi: [T1, T2] })
    await thucHanh({ tieuChi: { [t1]: true } })
    const {
      tc: [t1Moi, t2Moi],
    } = ghiBaiHoc(mt, chuDe, { tieuChi: [T1_SUA, T2] })
    expect(t2Moi).toBe(t2)
    const truoc = layRevision(mt.db)
    const hoc = await layHoc()
    expect(hoc.revision).toBe(truoc + 1)
    expect(hoc.thucHanh.tieuChi).toEqual({ [t1Moi]: true })
    expect(hoc.tieuChiCu).toEqual([])
    expect(JSON.parse(criteria() ?? '{}')).toEqual({ [t1Moi]: T1_SUA })
  })

  it('tiêu chí bị bỏ khỏi bài: tick giữ ở tieuChiCu, không hiện, không tính — chỉ còn nó thì Áp dụng "chưa làm"', async () => {
    const {
      tc: [t1],
    } = ghiBaiHoc(mt, chuDe, { tieuChi: [T1, T2] })
    await thucHanh({ tieuChi: { [t1]: true } })
    expect(
      tinhBonBuoc({ mau: 'chu-de', cauHoiKhoa: [], hoc: await layHoc() }).tinhTrang['ap-dung'],
    ).toBe('dang-lam')
    ghiBaiHoc(mt, chuDe, { tieuChi: ['Có kế hoạch truyền thông cho bên liên quan'] })
    const hoc = await layHoc()
    expect(hoc.thucHanh).toEqual(THUC_HANH_TRONG)
    expect(hoc.tieuChiCu).toEqual([{ khoa: t1, chu: T1 }])
    const buoc = tinhBonBuoc({ mau: 'chu-de', cauHoiKhoa: [], hoc })
    expect(buoc.buoc['ap-dung']).toMatchObject({
      tinhTrang: 'chua-lam',
      thieu: 'Thiếu · chưa làm bài thực hành',
    })
    // Không bao giờ xoá: về chưa làm vẫn giữ hàng với tick cũ
    expect((await thucHanh({ trangThai: null })).body.daDoi).toBe(false)
    expect(JSON.parse(criteria() ?? '{}')).toEqual({ [t1]: T1 })
    // Trang còn dữ liệu cũ gửi lại cả bảng tick (có khoá cũ đã tick sẵn): nhận, khoá cũ vẫn không tính
    const caBang = await thucHanh({ tieuChi: { [t1]: true } })
    expect(caBang.status).toBe(200)
    expect(caBang.body).toMatchObject({ daDoi: false, thucHanh: THUC_HANH_TRONG })
    // Làm tiếp bài mới: tick cũ vẫn giữ, không lẫn vào tiêu chí của bài
    const kq = await thucHanh({ ketQua: 'Kết quả' })
    expect(kq.body.thucHanh).toMatchObject({ trangThai: 'dang-lam', tieuChi: {} })
    expect(JSON.parse(criteria() ?? '{}')).toEqual({ [t1]: T1 })
  })

  it('Tài liệu: dòng Checklist chất lượng là tiêu chí của bước Áp dụng (tick lưu kèm chữ); khoá lạ → 409; Xong được', async () => {
    const {
      cl: [c1],
    } = ghiBaiHoc(mt, taiLieu, {
      cauHoi: [Q1],
      checklist: ['Mỗi rủi ro có người phụ trách', 'Có ngày rà soát'],
    })
    expect((await thucHanh({ tieuChi: { abc: true } }, taiLieu.id)).status).toBe(409)
    const tick = await thucHanh({ tieuChi: { [c1]: true } }, taiLieu.id)
    expect(tick.body.thucHanh).toMatchObject({ trangThai: 'dang-lam', tieuChi: { [c1]: true } })
    expect(JSON.parse(criteria(taiLieu.id) ?? '{}')).toEqual({
      [c1]: 'Mỗi rủi ro có người phụ trách',
    })
    await thucHanh({ ketQua: 'Bản rủi ro của dự án' }, taiLieu.id)
    expect((await thucHanh({ trangThai: 'xong' }, taiLieu.id)).status).toBe(200)
    const hoc = await layHoc(taiLieu.id)
    expect(tinhBonBuoc({ mau: taiLieu.mau, cauHoiKhoa: [], hoc }).tinhTrang['ap-dung']).toBe('xong')
  })

  it('lỗi đọc file bài → chưa biết bài: không gán, không lọc tick, không kiểm khoá', async () => {
    const {
      tc: [t1],
    } = ghiBaiHoc(mt, chuDe, { tieuChi: [T1] })
    await thucHanh({ tieuChi: { [t1]: true } })
    ghiBaiHoc(mt, chuDe, { tieuChi: [T2], loiFrontmatter: true })
    expect(vietBai(chuDe, { loiFrontmatter: true })).toContain('loai: [hỏng')
    expect((await mt.get(`/api/bai/${chuDe.id}`)).body.loiDoc).not.toBeNull()
    const hoc = await layHoc()
    expect(hoc.thucHanh.tieuChi).toEqual({ [t1]: true })
    expect(hoc.tieuChiCu).toEqual([])
    expect((await thucHanh({ tieuChi: { khac: true } })).status).toBe(200)
  })
})
