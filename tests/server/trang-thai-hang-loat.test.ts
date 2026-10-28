// API đặt trạng thái hàng loạt + Hoàn tác (bước 2; đề xuất 3.9, bất biến 2, 8): supertest trên DB + thư mục tạm.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { datLech } from '../../shared/clock.ts'
import { layCay } from '../../shared/roadmap/index.ts'
import { layRevision } from '../../server/db/settings.ts'
import { datTrangThai, docSuKien } from '../../server/du-lieu/trang-thai.ts'
import { taoMoiTruong, type MoiTruong } from './tro-giup.ts'

const cay = layCay()
const [mucA, mucB, mucC, mucD] = cay.mucHoc
const ID_LA = 'khong-co-trong-cay-xyz'

let mt: MoiTruong

beforeEach(async () => {
  datLech(0)
  mt = await taoMoiTruong()
})

afterEach(async () => {
  await mt.dong()
  datLech(0)
})

const hangLoat = (body: unknown) => mt.post('/api/trang-thai/hang-loat').send(body as object)
const hoanTac = (body: unknown) =>
  mt.post('/api/trang-thai/hang-loat/hoan-tac').send(body as object)

function dong(id: string) {
  return mt.db.prepare('SELECT status, skip_reason FROM item_status WHERE item_id = ?').get(id) as
    { status: string; skip_reason: string | null } | undefined
}

function dat(id: string, trangThai: 'dang-hoc' | 'da-xong' | 'bo-qua', lyDo?: string) {
  datTrangThai(mt.db, {
    id,
    giaTri: lyDo === undefined ? { trangThai } : { trangThai, lyDo },
    via: 'mot-muc',
  })
}

describe('POST /api/trang-thai/hang-loat', () => {
  it('đặt Đang học cho nhiều mục: một transaction, revision +1, sự kiện via hang-loat, trả truoc', async () => {
    dat(mucB.id, 'da-xong')
    dat(mucC.id, 'dang-hoc')
    const revTruoc = layRevision(mt.db)
    const res = await hangLoat({ ids: [mucA.id, mucB.id, mucC.id], trangThai: 'dang-hoc' })
    expect(res.status).toBe(200)
    // mucC đã Đang học: giữ nguyên, không vào daDoi
    expect(res.body).toEqual({
      revision: revTruoc + 1,
      trangThai: 'dang-hoc',
      daDoi: [mucA.id, mucB.id],
      truoc: { [mucA.id]: { trangThai: 'chua-hoc' }, [mucB.id]: { trangThai: 'da-xong' } },
    })
    expect(layRevision(mt.db)).toBe(revTruoc + 1)
    expect(dong(mucA.id)?.status).toBe('learning')
    expect(dong(mucB.id)?.status).toBe('learning')
    const suKien = docSuKien(mt.db).filter((s) => s.via === 'hang-loat')
    expect(suKien.map((s) => [s.itemId, s.tu, s.den])).toEqual([
      [mucA.id, null, 'learning'],
      [mucB.id, 'done', 'learning'],
    ])
    const state = await mt.get('/api/state')
    expect(state.body.revision).toBe(revTruoc + 1)
    expect(state.body.trangThai[mucA.id]).toEqual({ status: 'learning' })
  })

  it('Bỏ qua giữ lý do của mục đang Bỏ qua; Chưa học xoá hàng', async () => {
    dat(mucA.id, 'bo-qua', 'Không dùng')
    dat(mucB.id, 'dang-hoc')
    const res = await hangLoat({ ids: [mucA.id, mucB.id], trangThai: 'bo-qua' })
    expect(res.body.daDoi).toEqual([mucB.id])
    expect(dong(mucA.id)).toEqual({ status: 'skip', skip_reason: 'Không dùng' })
    expect(dong(mucB.id)).toEqual({ status: 'skip', skip_reason: null })

    const xoa = await hangLoat({ ids: [mucA.id, mucB.id], trangThai: 'chua-hoc' })
    expect(xoa.body.daDoi).toEqual([mucA.id, mucB.id])
    expect(xoa.body.truoc[mucA.id]).toEqual({ trangThai: 'bo-qua', lyDo: 'Không dùng' })
    expect(dong(mucA.id)).toBeUndefined()
    expect(dong(mucB.id)).toBeUndefined()
  })

  it('không mục nào đổi: không ghi gì, revision giữ nguyên', async () => {
    dat(mucA.id, 'dang-hoc')
    const rev = layRevision(mt.db)
    const res = await hangLoat({ ids: [mucA.id], trangThai: 'dang-hoc' })
    expect(res.body).toEqual({ revision: rev, trangThai: 'dang-hoc', daDoi: [], truoc: {} })
    expect(layRevision(mt.db)).toBe(rev)
  })

  it('bất biến 2: từ chối Đã xong (400, câu riêng), không ghi gì', async () => {
    const res = await hangLoat({ ids: [mucA.id], trangThai: 'da-xong' })
    expect(res.status).toBe(400)
    expect(res.body.loi).toMatch(/^Không đặt Đã xong hàng loạt/)
    expect(dong(mucA.id)).toBeUndefined()
    expect(layRevision(mt.db)).toBe(0)
  })

  it.each([
    ['trangThai lạ', { ids: ['x'], trangThai: 'done' }, /^trangThai không hợp lệ/],
    ['thiếu trangThai', { ids: ['x'] }, /^trangThai không hợp lệ/],
    ['ids rỗng', { ids: [], trangThai: 'dang-hoc' }, /^ids phải là danh sách/],
    ['ids không phải mảng', { ids: 'x', trangThai: 'dang-hoc' }, /^ids phải là danh sách/],
    ['id rỗng', { ids: [''], trangThai: 'dang-hoc' }, /^ids phải là danh sách/],
    ['trường lạ', { ids: ['x'], trangThai: 'dang-hoc', via: 'x' }, /^Trường không được nhận: via/],
    ['body không phải object', [1], /^Thân yêu cầu phải là JSON/],
  ])('400 khi %s', async (_ten, body, cau) => {
    const res = await hangLoat(body)
    expect(res.status).toBe(400)
    expect(res.body.loi).toMatch(cau)
  })

  it('400 khi id lặp lại hoặc quá soMucHoc mục', async () => {
    const trung = await hangLoat({ ids: [mucA.id, mucA.id], trangThai: 'dang-hoc' })
    expect(trung.status).toBe(400)
    expect(trung.body.loi).toContain(`"${mucA.id}" lặp lại`)
    const qua = await hangLoat({
      ids: [...cay.mucHoc.map((m) => m.id), 'them-mot'],
      trangThai: 'dang-hoc',
    })
    expect(qua.status).toBe(400)
    expect(qua.body.loi).toContain(`tới ${cay.soMucHoc} mục`)
    // Đúng soMucHoc mục thì được
    const du = await hangLoat({ ids: cay.mucHoc.map((m) => m.id), trangThai: 'dang-hoc' })
    expect(du.status).toBe(200)
    expect(du.body.daDoi).toHaveLength(cay.soMucHoc)
  })

  it('bất biến 8: một id không có trong cây → 404, không mục nào bị ghi', async () => {
    const res = await hangLoat({ ids: [mucA.id, ID_LA], trangThai: 'dang-hoc' })
    expect(res.status).toBe(404)
    expect(res.body.loi).toBe(`Không có mục học id "${ID_LA}" trong cây roadmap.`)
    expect(dong(mucA.id)).toBeUndefined()
    expect(layRevision(mt.db)).toBe(0)
  })
})

describe('POST /api/trang-thai/hang-loat/hoan-tac', () => {
  it('trả từng mục về đúng giá trị cũ (kể cả Đã xong, lý do Bỏ qua); mục đã đổi sau đó giữ nguyên', async () => {
    dat(mucA.id, 'da-xong')
    dat(mucB.id, 'bo-qua', 'Không dùng')
    const lan = await hangLoat({ ids: [mucA.id, mucB.id, mucC.id, mucD.id], trangThai: 'dang-hoc' })
    expect(lan.body.daDoi).toHaveLength(4)
    // Sau lần đặt hàng loạt, mucD đổi tiếp sang Bỏ qua → Hoàn tác không đụng tới
    dat(mucD.id, 'bo-qua')
    const rev = layRevision(mt.db)

    const res = await hoanTac({ trangThai: 'dang-hoc', truoc: lan.body.truoc })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      revision: rev + 1,
      daKhoiPhuc: [mucA.id, mucB.id, mucC.id],
      giuNguyen: [mucD.id],
    })
    expect(dong(mucA.id)).toEqual({ status: 'done', skip_reason: null })
    expect(dong(mucB.id)).toEqual({ status: 'skip', skip_reason: 'Không dùng' })
    expect(dong(mucC.id)).toBeUndefined()
    expect(dong(mucD.id)).toEqual({ status: 'skip', skip_reason: null })
    const suKien = docSuKien(mt.db).filter((s) => s.via === 'hoan-tac')
    expect(suKien.map((s) => [s.itemId, s.tu, s.den])).toEqual([
      [mucA.id, 'learning', 'done'],
      [mucB.id, 'learning', 'skip'],
      [mucC.id, 'learning', null],
    ])
  })

  it('không mục nào còn trạng thái đã đặt: không ghi gì, revision giữ nguyên', async () => {
    const lan = await hangLoat({ ids: [mucA.id], trangThai: 'bo-qua' })
    dat(mucA.id, 'dang-hoc')
    const rev = layRevision(mt.db)
    const res = await hoanTac({ trangThai: 'bo-qua', truoc: lan.body.truoc })
    expect(res.body).toEqual({ revision: rev, daKhoiPhuc: [], giuNguyen: [mucA.id] })
    expect(layRevision(mt.db)).toBe(rev)
  })

  it.each([
    ['trangThai Đã xong', { trangThai: 'da-xong', truoc: {} }, /^Không đặt Đã xong hàng loạt/],
    ['thiếu truoc', { trangThai: 'dang-hoc' }, /^truoc phải là object/],
    ['truoc rỗng', { trangThai: 'dang-hoc', truoc: {} }, /^truoc phải là object/],
    [
      'giá trị cũ sai',
      { trangThai: 'dang-hoc', truoc: { x: { trangThai: 'xong' } } },
      /^truoc\["x"\] không hợp lệ/,
    ],
    [
      'lý do đi với trạng thái khác Bỏ qua',
      { trangThai: 'dang-hoc', truoc: { x: { trangThai: 'da-xong', lyDo: 'a' } } },
      /^truoc\["x"\] không hợp lệ/,
    ],
    ['trường lạ', { trangThai: 'dang-hoc', truoc: {}, ids: [] }, /^Trường không được nhận: ids/],
  ])('400 khi %s', async (_ten, body, cau) => {
    const res = await hoanTac(body)
    expect(res.status).toBe(400)
    expect(res.body.loi).toMatch(cau)
  })

  it('bất biến 2: truoc giả (không có lần đặt hàng loạt nào) không đặt được Đã xong', async () => {
    // Đặt Đang học từng mục (PUT), không qua hàng loạt
    dat(mucA.id, 'dang-hoc')
    dat(mucB.id, 'dang-hoc')
    dat(mucC.id, 'dang-hoc')
    const rev = layRevision(mt.db)
    const daXong = { trangThai: 'da-xong' }
    const res = await hoanTac({
      trangThai: 'dang-hoc',
      truoc: { [mucA.id]: daXong, [mucB.id]: daXong, [mucC.id]: daXong },
    })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      revision: rev,
      daKhoiPhuc: [],
      giuNguyen: [mucA.id, mucB.id, mucC.id],
    })
    for (const m of [mucA, mucB, mucC]) expect(dong(m.id)?.status).toBe('learning')
    expect(docSuKien(mt.db).filter((s) => s.via === 'hoan-tac')).toEqual([])
    expect(layRevision(mt.db)).toBe(rev)
  })

  it('bất biến 2: truoc khác giá trị cũ mà lần hàng loạt đã ghi → giữ nguyên, chỉ khôi phục giá trị thật', async () => {
    dat(mucB.id, 'bo-qua', 'Không dùng')
    const lan = await hangLoat({ ids: [mucA.id, mucB.id], trangThai: 'dang-hoc' })
    expect(lan.body.truoc).toEqual({
      [mucA.id]: { trangThai: 'chua-hoc' },
      [mucB.id]: { trangThai: 'bo-qua', lyDo: 'Không dùng' },
    })
    // mucA trước đó Chưa học: không trả thành Đã xong; mucB trước đó Bỏ qua: không trả thành Đã xong
    const gia = await hoanTac({
      trangThai: 'dang-hoc',
      truoc: { [mucA.id]: { trangThai: 'da-xong' }, [mucB.id]: { trangThai: 'da-xong' } },
    })
    expect(gia.body).toMatchObject({ daKhoiPhuc: [], giuNguyen: [mucA.id, mucB.id] })
    expect(dong(mucA.id)?.status).toBe('learning')
    expect(dong(mucB.id)?.status).toBe('learning')
    // trangThai sai (lần hàng loạt đặt Đang học, không phải Bỏ qua) cũng không khôi phục gì
    const sai = await hoanTac({ trangThai: 'bo-qua', truoc: lan.body.truoc })
    expect(sai.body).toMatchObject({ daKhoiPhuc: [], giuNguyen: [mucA.id, mucB.id] })
    // Đúng giá trị cũ thì vẫn hoàn tác được
    const that = await hoanTac({ trangThai: 'dang-hoc', truoc: lan.body.truoc })
    expect(that.body).toMatchObject({ daKhoiPhuc: [mucA.id, mucB.id], giuNguyen: [] })
    expect(dong(mucA.id)).toBeUndefined()
    expect(dong(mucB.id)).toEqual({ status: 'skip', skip_reason: 'Không dùng' })
  })

  it('không hoàn tác lại lần nữa, không hoàn tác mục đã đổi sau đó (kể cả về lại đúng trạng thái đó)', async () => {
    dat(mucA.id, 'da-xong')
    dat(mucB.id, 'da-xong')
    const lan = await hangLoat({ ids: [mucA.id, mucB.id, mucC.id], trangThai: 'bo-qua' })
    expect(lan.body.daDoi).toEqual([mucA.id, mucB.id, mucC.id])
    // mucB: đổi sang Đang học rồi về lại Bỏ qua; mucC: chỉ thêm lý do Bỏ qua (không có sự kiện)
    dat(mucB.id, 'dang-hoc')
    dat(mucB.id, 'bo-qua')
    dat(mucC.id, 'bo-qua', 'Để sau')
    const res = await hoanTac({ trangThai: 'bo-qua', truoc: lan.body.truoc })
    expect(res.body).toMatchObject({ daKhoiPhuc: [mucA.id], giuNguyen: [mucB.id, mucC.id] })
    expect(dong(mucA.id)?.status).toBe('done')
    expect(dong(mucB.id)?.status).toBe('skip')
    expect(dong(mucC.id)).toEqual({ status: 'skip', skip_reason: 'Để sau' })

    // Gửi lại đúng body đó sau khi mucA bị đặt lại Bỏ qua từng mục: sự kiện cuối không còn là hàng loạt
    dat(mucA.id, 'bo-qua')
    const lai = await hoanTac({ trangThai: 'bo-qua', truoc: lan.body.truoc })
    expect(lai.body).toMatchObject({ daKhoiPhuc: [], giuNguyen: [mucA.id, mucB.id, mucC.id] })
    expect(dong(mucA.id)?.status).toBe('skip')
  })

  it('bất biến 8: id không có trong cây → 404, không mục nào bị ghi', async () => {
    const lan = await hangLoat({ ids: [mucA.id], trangThai: 'dang-hoc' })
    const res = await hoanTac({
      trangThai: 'dang-hoc',
      truoc: { ...lan.body.truoc, [ID_LA]: { trangThai: 'chua-hoc' } },
    })
    expect(res.status).toBe(404)
    expect(dong(mucA.id)?.status).toBe('learning')
  })
})
