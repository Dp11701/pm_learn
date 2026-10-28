// API duyệt bài gọn — các quy tắc an toàn dữ liệu bổ sung cho tests/server/duyet.test.ts (bước 4; đề xuất 1.6, 3.6;
// bất biến 5, 7; Cần chốt 13):
// - không có Hoàn tác: /api/nhap/hoan-tac từ chối file_op duyệt / duyệt bản sửa / bỏ bản sửa, file giữ nguyên;
// - duyệt hai lần (nối tiếp hoặc cùng lúc): đúng một lần thành công, lần kia 409, một bản chụp;
// - ngay_duyet cũ còn sót trong bản nháp được thay bằng hôm nay của server (giữ chỗ trong frontmatter);
// - quét nhẹ (/api/meta) sau khi duyệt không coi file vừa ghi là "đổi ngoài app";
// - bản sửa lỗi frontmatter: GET /api/duyet/:id báo loiDoc, duyệt bản sửa 409, bỏ bản sửa vẫn được;
// - GET /api/duyet/:id của mục Bản nháp / Chưa có: chỉ có hôm nay của server, không có bản sửa.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { datLech } from '../../shared/clock.ts'
import { layCay, type MucHoc } from '../../shared/roadmap/index.ts'
import { chupBanDuyet, docBanChupHienHanh } from '../../server/du-lieu/ban-chup-duyet.ts'
import { docTepCuaMuc } from '../../server/du-lieu/so-noi-dung.ts'
import { bamNoiDung } from '../../server/noi-dung/bam.ts'
import { duongDanCuaMuc } from '../../server/noi-dung/duong-dan.ts'
import { nhanTepCoSanDongBo } from '../../server/noi-dung/quet.ts'
import { TB_DUYET } from '../../server/noi-dung/thong-bao-duyet.ts'
import { datGio, ghiTep, taoMoiTruong, type MoiTruong } from './tro-giup.ts'

const cay = layCay()
const muc = (slug: string): MucHoc => {
  const m = cay.mucTheoSlug.get(slug)
  if (!m) throw new Error(slug)
  return m
}
const sc = muc('scope-creep')
const pestle = muc('pestle')

const banNhap = (m: MucHoc, them = '') =>
  `---\nid: ${m.id}\nloai: ${m.mau}\ntrang_thai_noi_dung: ban-nhap\nnguon: ai\n${them}---\n## Tóm tắt\n\nBản nháp.\n`

const banDaDuyet = (m: MucHoc) =>
  `---\nid: ${m.id}\nloai: ${m.mau}\ntrang_thai_noi_dung: da-duyet\nngay_duyet: 2026-10-18\nnguon: ai\n---\n## Tóm tắt\n\nBản đã duyệt.\n`

let mt: MoiTruong
let goc: string

beforeEach(async () => {
  datGio('2026-10-26T10:00:00')
  mt = await taoMoiTruong()
  goc = mt.tam.noiDungDir
  fs.mkdirSync(goc, { recursive: true })
})

afterEach(async () => {
  await mt.dong()
  datLech(0)
})

function docFile(tuongDoi: string): string | undefined {
  const p = path.join(goc, tuongDoi)
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : undefined
}

function nhan(m: MucHoc, text: string, vai: 'bai' | 'ban-sua' = 'bai') {
  const duongDan = duongDanCuaMuc(m, vai)
  ghiTep(goc, duongDan, text)
  nhanTepCoSanDongBo(mt.db, goc, { duongDan, itemId: m.id, vai, ngayNhap: '2026-10-20' })
}

function daDuyetSan(m: MucHoc) {
  const text = banDaDuyet(m)
  nhan(m, text)
  mt.db.transaction(() => chupBanDuyet(mt.db, { itemId: m.id, noiDung: text }))()
}

const fileOpCuoi = () =>
  (mt.db.prepare('SELECT id FROM file_ops ORDER BY id DESC LIMIT 1').get() as { id: number }).id
const soBanChup = () =>
  (mt.db.prepare('SELECT COUNT(*) AS n FROM content_approvals').get() as { n: number }).n

describe('không có Hoàn tác sau khi duyệt (Cần chốt 13)', () => {
  it('POST /api/nhap/hoan-tac từ chối file_op duyet, duyet-ban-sua, bo-ban-sua — file, bản chụp giữ nguyên', async () => {
    const text = banNhap(pestle)
    nhan(pestle, text)
    await mt
      .post(`/api/duyet/${pestle.id}`)
      .send({ hashNhap: bamNoiDung(text) })
      .expect(200)
    const sauDuyet = docFile(pestle.duongDanTuongDoi)
    let res = await mt.post('/api/nhap/hoan-tac').send({ fileOp: fileOpCuoi() }).expect(409)
    expect(typeof res.body.loi).toBe('string')
    expect(docFile(pestle.duongDanTuongDoi)).toBe(sauDuyet)
    expect(docBanChupHienHanh(mt.db, pestle.id)).toBeDefined()

    daDuyetSan(sc)
    const sua = banNhap(sc)
    nhan(sc, sua, 'ban-sua')
    await mt
      .post(`/api/duyet/${sc.id}/ban-sua`)
      .send({ hashNhap: bamNoiDung(sua) })
      .expect(200)
    const moi = docFile(sc.duongDanTuongDoi)
    res = await mt.post('/api/nhap/hoan-tac').send({ fileOp: fileOpCuoi() }).expect(409)
    expect(docFile(sc.duongDanTuongDoi)).toBe(moi)

    nhan(sc, banNhap(sc, 'giai_nghia: lần hai\n'), 'ban-sua')
    await mt.post(`/api/duyet/${sc.id}/bo-ban-sua`).expect(200)
    await mt.post('/api/nhap/hoan-tac').send({ fileOp: fileOpCuoi() }).expect(409)
    expect(docFile(duongDanCuaMuc(sc, 'ban-sua'))).toBeUndefined()
  })
})

describe('duyệt hai lần', () => {
  it('nối tiếp: lần hai 409 "đã duyệt rồi", file không bị ghi lại', async () => {
    const text = banNhap(pestle)
    nhan(pestle, text)
    await mt
      .post(`/api/duyet/${pestle.id}`)
      .send({ hashNhap: bamNoiDung(text) })
      .expect(200)
    const sau = docFile(pestle.duongDanTuongDoi)
    datGio('2026-10-27T10:00:00')
    const res = await mt
      .post(`/api/duyet/${pestle.id}`)
      .send({ hashNhap: bamNoiDung(text) })
      .expect(409)
    expect(res.body.loi).toBe(TB_DUYET.daDuyetRoi)
    expect(docFile(pestle.duongDanTuongDoi)).toBe(sau)
    expect(soBanChup()).toBe(1)
  })

  it('cùng lúc (hai tab): khoá của kho nội dung cho đúng một lần thành công, một bản chụp', async () => {
    const text = banNhap(pestle)
    nhan(pestle, text)
    const gui = () => mt.post(`/api/duyet/${pestle.id}`).send({ hashNhap: bamNoiDung(text) })
    const [a, b] = await Promise.all([gui(), gui()])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    expect(soBanChup()).toBe(1)
    const fileOps = mt.db.prepare('SELECT op, state FROM file_ops').all()
    expect(fileOps).toEqual([{ op: 'duyet', state: 'xong' }])
  })
})

describe('frontmatter khi duyệt', () => {
  it('ngay_duyet cũ còn sót trong bản nháp → thay tại chỗ bằng hôm nay của server', async () => {
    const text = banNhap(pestle, 'ngay_duyet: 2020-01-01\n')
    nhan(pestle, text)
    const res = await mt
      .post(`/api/duyet/${pestle.id}`)
      .send({ hashNhap: bamNoiDung(text) })
      .expect(200)
    expect(res.body.ngayDuyet).toBe('2026-10-26')
    expect(docFile(pestle.duongDanTuongDoi)).toBe(
      text
        .replace('trang_thai_noi_dung: ban-nhap', 'trang_thai_noi_dung: da-duyet')
        .replace('ngay_duyet: 2020-01-01', 'ngay_duyet: 2026-10-26'),
    )
  })

  it('hôm nay theo đồng hồ server (23:30 giờ máy → vẫn là ngày đó)', async () => {
    datGio('2026-10-26T23:30:00')
    const text = banNhap(pestle)
    nhan(pestle, text)
    const ct = await mt.get(`/api/duyet/${pestle.id}`).expect(200)
    expect(ct.body).toEqual({ homNay: '2026-10-26', banSua: null })
    const res = await mt
      .post(`/api/duyet/${pestle.id}`)
      .send({ hashNhap: bamNoiDung(text) })
      .expect(200)
    expect(res.body.ngayDuyet).toBe('2026-10-26')
  })
})

describe('sau khi duyệt, quét nhẹ (/api/meta) không coi file vừa ghi là đổi ngoài app', () => {
  it('bài hiện file, không cảnh báo; trạng thái Đã duyệt giữ nguyên qua nhiều lượt meta', async () => {
    const text = banNhap(pestle)
    nhan(pestle, text)
    const res = await mt
      .post(`/api/duyet/${pestle.id}`)
      .send({ hashNhap: bamNoiDung(text) })
      .expect(200)
    const meta1 = await mt.get('/api/meta').expect(200)
    const meta2 = await mt.get('/api/meta').expect(200)
    expect(meta2.body.noiDung.revision).toBe(meta1.body.noiDung.revision)
    expect(meta1.body.noiDung.revision).toBeGreaterThanOrEqual(res.body.revision)
    expect(meta2.body.noiDung.chuaNhan).toBe(0)
    const bai = await mt.get(`/api/bai/${pestle.id}`).expect(200)
    expect(bai.body).toMatchObject({
      trangThaiNoiDung: { loai: 'da-duyet', ngayDuyet: '2026-10-26' },
      banHien: 'file',
      canhBaoDuyet: null,
      hashFile: bamNoiDung(docFile(pestle.duongDanTuongDoi)!),
    })
  })
})

describe('bản sửa lỗi frontmatter', () => {
  it('GET /api/duyet/:id báo loiDoc; duyệt bản sửa 409 (bài Đã duyệt giữ nguyên); bỏ bản sửa vẫn được', async () => {
    daDuyetSan(sc)
    const cu = docFile(sc.duongDanTuongDoi)
    const sua = banNhap(sc).replace(`loai: ${sc.mau}`, 'loai: tai-lieu')
    nhan(sc, sua, 'ban-sua')

    const ct = await mt.get(`/api/duyet/${sc.id}`).expect(200)
    expect(ct.body.banSua).toMatchObject({
      hash: bamNoiDung(sua),
      loiDoc: { dong: expect.any(Number), thongBao: expect.any(String) },
    })

    const res = await mt
      .post(`/api/duyet/${sc.id}/ban-sua`)
      .send({ hashNhap: bamNoiDung(sua) })
      .expect(409)
    expect(res.body.loi).toMatch(/^File bản sửa có lỗi frontmatter dòng \d+/)
    expect(docFile(sc.duongDanTuongDoi)).toBe(cu)
    expect(docFile(duongDanCuaMuc(sc, 'ban-sua'))).toBe(sua)
    expect(soBanChup()).toBe(1)

    await mt.post(`/api/duyet/${sc.id}/bo-ban-sua`).expect(200)
    expect(docFile(duongDanCuaMuc(sc, 'ban-sua'))).toBeUndefined()
    expect(docFile(sc.duongDanTuongDoi)).toBe(cu)
    expect(docTepCuaMuc(mt.db, sc.id, 'ban-sua')).toBeUndefined()
  })
})
