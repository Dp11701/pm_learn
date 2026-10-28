// API duyệt bài gọn (bước 4; đề xuất 1.6, 3.6, 3.7 rút gọn theo mục 10; bất biến 5, 7, 8; Cần chốt 13) trên app thật,
// DB + thư mục nội dung tạm:
// - Duyệt bản nháp: chỉ đổi frontmatter (trang_thai_noi_dung, ngay_duyet = hôm nay của server), phần còn lại giữ
//   nguyên từng byte; bản chụp content_approvals; bản nháp cũ trong thùng rác; trạng thái nội dung thành Đã duyệt.
// - 409: file đổi so với hashNhap, mục đã duyệt (bất biến 5), không có bản nháp, lỗi frontmatter; 404 mục lạ; 400
//   body sai — không đổi gì.
// - Bản sửa: duyệt (bản đã duyệt cũ + bản sửa vào thùng rác, bản chụp mới thay bản cũ) / bỏ (chỉ bản sửa vào thùng
//   rác); 409 khi không có, file đã đổi.
// - GET /api/duyet/cho-duyet: sắp ngày nhập mới nhất trước, cùng ngày theo thứ tự cây; Đủ khối; bản sửa.
// - Giết tiến trình ở mọi điểm của file_op duyệt / duyệt bản sửa → chạy tiếp → như chạy một mạch.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { datLech } from '../../shared/clock.ts'
import { docFrontmatter } from '../../shared/noi-dung/index.ts'
import { layCay, type MucHoc } from '../../shared/roadmap/index.ts'
import { moDb, type Db } from '../../server/db/index.ts'
import { chupBanDuyet, docBanChupHienHanh } from '../../server/du-lieu/ban-chup-duyet.ts'
import {
  keHoachDuyetBai,
  keHoachDuyetBanSua,
  type KeHoachDuyet,
} from '../../server/du-lieu/duyet.ts'
import { docSo, docTepCuaMuc } from '../../server/du-lieu/so-noi-dung.ts'
import { bamNoiDung } from '../../server/noi-dung/bam.ts'
import { duongDanCuaMuc } from '../../server/noi-dung/duong-dan.ts'
import {
  chayFileOp,
  dsFileOpDuDinh,
  taoFileOp,
  thucHienFileOp,
  tiepTucFileOps,
  type DiemDung,
} from '../../server/noi-dung/file-ops.ts'
import { nhanTepCoSanDongBo } from '../../server/noi-dung/quet.ts'
import { TB_DUYET } from '../../server/noi-dung/thong-bao-duyet.ts'
import { fileChuDe } from '../pages/bai-hoc/ho-tro.ts'
import { datGio, ghiTep, taoMoiTruong, taoThuMucTam, type MoiTruong } from './tro-giup.ts'

const cay = layCay()
const muc = (slug: string): MucHoc => {
  const m = cay.mucTheoSlug.get(slug)
  if (!m) throw new Error(slug)
  return m
}
const sc = muc('scope-creep')
const pestle = muc('pestle')
const bani = muc('bani')
const riskRegister = muc('risk-register')

/** Bản nháp có chú thích, khoá lạ, giá trị có nháy — để thấy frontmatter được sửa tại chỗ. */
const banNhap = (m: MucHoc, nguon = 'tu-viet') =>
  [
    '---',
    '# chú thích đầu frontmatter',
    `id: "${m.id}"`,
    `loai: ${m.mau}`,
    "giai_nghia: 'phạm vi: trôi dần'",
    'trang_thai_noi_dung: ban-nhap  # sẽ đổi',
    `nguon: ${nguon}`,
    'khoa_la: [a, b]',
    '---',
    '## Tóm tắt',
    '',
    'Thân bài   giữ nguyên  từng byte,\ttab, khoảng trắng cuối dòng   ',
    '',
    '---',
    'trang_thai_noi_dung: ban-nhap (chữ trong thân, không phải frontmatter)',
    '',
  ].join('\n')

const banDaDuyet = (m: MucHoc, ngay = '2026-10-18') =>
  `---\nid: ${m.id}\nloai: ${m.mau}\ntrang_thai_noi_dung: da-duyet\nngay_duyet: ${ngay}\nnguon: ai\n---\n## Tóm tắt\n\nBản đã duyệt.\n`

const banSuaCua = (m: MucHoc) =>
  `---\nid: ${m.id}\nloai: ${m.mau}\ntrang_thai_noi_dung: ban-nhap\nnguon: tu-viet\n---\n## Tóm tắt\n\nBản sửa mới.\n`

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

/** Mọi file trong thùng rác: đường dẫn gốc (bỏ nhãn thời điểm) → nội dung. */
function thungRac(thuMuc = goc): Record<string, string> {
  const rac = path.join(thuMuc, '.thung-rac')
  const kq: Record<string, string> = {}
  if (!fs.existsSync(rac)) return kq
  for (const ten of fs.readdirSync(rac, { recursive: true, encoding: 'utf8' })) {
    const p = path.join(rac, ten)
    if (!fs.lstatSync(p).isFile()) continue
    kq[ten.split(path.sep).slice(1).join('/')] = fs.readFileSync(p, 'utf8')
  }
  return kq
}

function nhan(m: MucHoc, text: string, vai: 'bai' | 'ban-sua' = 'bai', ngayNhap = '2026-10-20') {
  const duongDan = duongDanCuaMuc(m, vai)
  ghiTep(goc, duongDan, text)
  nhanTepCoSanDongBo(mt.db, goc, { duongDan, itemId: m.id, vai, ngayNhap })
}

/** Mục đã duyệt sẵn (file da-duyet + bản chụp, như sau một lần duyệt cũ). */
function daDuyetSan(db: Db, thuMuc: string, m: MucHoc) {
  const text = banDaDuyet(m)
  ghiTep(thuMuc, m.duongDanTuongDoi, text)
  nhanTepCoSanDongBo(db, thuMuc, {
    duongDan: m.duongDanTuongDoi,
    itemId: m.id,
    vai: 'bai',
    ngayNhap: '2026-10-10',
  })
  db.transaction(() => chupBanDuyet(db, { itemId: m.id, noiDung: text }))()
}

const soFileOp = () =>
  (mt.db.prepare('SELECT COUNT(*) AS n FROM file_ops').get() as { n: number }).n
const soBanChup = () =>
  (mt.db.prepare('SELECT COUNT(*) AS n FROM content_approvals').get() as { n: number }).n

describe('POST /api/duyet/:id — duyệt bản nháp', () => {
  it('chỉ đổi trang_thai_noi_dung + thêm ngay_duyet (hôm nay của server); thân bài, chú thích, khoá lạ giữ nguyên từng byte', async () => {
    const text = banNhap(sc)
    nhan(sc, text)
    const bai = await mt.get(`/api/bai/${sc.id}`).expect(200)
    expect(bai.body.trangThaiNoiDung).toEqual({ loai: 'ban-nhap', nguon: 'tu-viet' })

    const res = await mt
      .post(`/api/duyet/${sc.id}`)
      .send({ hashNhap: bai.body.hashFile })
      .expect(200)
    expect(res.body).toEqual({ revision: expect.any(Number), ngayDuyet: '2026-10-26' })

    const sau = docFile(sc.duongDanTuongDoi)
    expect(sau).toBe(
      text
        .replace(
          'trang_thai_noi_dung: ban-nhap  # sẽ đổi',
          'trang_thai_noi_dung: da-duyet  # sẽ đổi',
        )
        .replace('khoa_la: [a, b]\n---', 'khoa_la: [a, b]\nngay_duyet: 2026-10-26\n---'),
    )
    const fm = docFrontmatter(sau!).frontmatter
    expect(fm).toMatchObject({
      trangThaiNoiDung: 'da-duyet',
      ngayDuyet: '2026-10-26',
      nguon: 'tu-viet',
    })

    // Bản chụp = đúng file trên đĩa; sổ khớp, giữ ngày nhập
    const bc = docBanChupHienHanh(mt.db, sc.id)
    expect(bc).toMatchObject({ ngayDuyet: '2026-10-26', noiDung: sau, hash: bamNoiDung(sau!) })
    expect(docTepCuaMuc(mt.db, sc.id)).toMatchObject({
      path: sc.duongDanTuongDoi,
      hash: bamNoiDung(sau!),
      importedOn: '2026-10-20',
    })
    // Bản nháp cũ vào thùng rác (chép trước khi ghi đè)
    expect(thungRac()).toEqual({ [sc.duongDanTuongDoi]: text })
    // Một file_op 'duyet' đã xong
    const op = mt.db.prepare('SELECT op, state FROM file_ops').all()
    expect(op).toEqual([{ op: 'duyet', state: 'xong' }])

    // Trạng thái nội dung ở mọi nơi
    const bai2 = await mt.get(`/api/bai/${sc.id}`).expect(200)
    expect(bai2.body).toMatchObject({
      trangThaiNoiDung: { loai: 'da-duyet', ngayDuyet: '2026-10-26' },
      banHien: 'file',
      canhBaoDuyet: null,
    })
    const tt = await mt.get('/api/noi-dung/trang-thai').expect(200)
    expect(tt.body[sc.id]).toEqual({ loai: 'da-duyet', ngayDuyet: '2026-10-26' })
    const cho = await mt.get('/api/duyet/cho-duyet').expect(200)
    expect(cho.body).toEqual({ banNhap: [], banSua: [] })
    // revision nội dung trong /api/meta cùng số
    const meta = await mt.get('/api/meta').expect(200)
    expect(meta.body.noiDung.revision).toBeGreaterThanOrEqual(res.body.revision)
  })

  it('409 khi file đã đổi so với hashNhap (sửa ngoài app) — không đổi gì', async () => {
    const text = banNhap(sc)
    nhan(sc, text)
    const hashCu = bamNoiDung(text)
    ghiTep(goc, sc.duongDanTuongDoi, text.replace('Thân bài', 'Thân bài đã sửa'))
    const res = await mt.post(`/api/duyet/${sc.id}`).send({ hashNhap: hashCu }).expect(409)
    expect(res.body.loi).toBe(TB_DUYET.banNhapDaDoi)
    expect(docFile(sc.duongDanTuongDoi)).toContain('Thân bài đã sửa')
    expect(docBanChupHienHanh(mt.db, sc.id)).toBeUndefined()
    expect(soFileOp()).toBe(0)
    expect(thungRac()).toEqual({})
  })

  it('409 khi không phải bản nháp: đã duyệt (bất biến 5: không ghi đè bài Đã duyệt), chưa có file, file đã bị xoá', async () => {
    daDuyetSan(mt.db, goc, sc)
    const truoc = docFile(sc.duongDanTuongDoi)
    let res = await mt
      .post(`/api/duyet/${sc.id}`)
      .send({ hashNhap: bamNoiDung(truoc!) })
      .expect(409)
    expect(res.body.loi).toBe(TB_DUYET.daDuyetRoi)
    expect(docFile(sc.duongDanTuongDoi)).toBe(truoc)

    res = await mt
      .post(`/api/duyet/${pestle.id}`)
      .send({ hashNhap: 'a'.repeat(64) })
      .expect(409)
    expect(res.body.loi).toBe(TB_DUYET.khongCoBanNhap)

    nhan(bani, banNhap(bani))
    fs.rmSync(path.join(goc, bani.duongDanTuongDoi))
    res = await mt
      .post(`/api/duyet/${bani.id}`)
      .send({ hashNhap: bamNoiDung(banNhap(bani)) })
      .expect(409)
    expect(res.body.loi).toBe(TB_DUYET.khongCoBanNhap)
    expect(soFileOp()).toBe(0)
    expect(soBanChup()).toBe(1)
  })

  it('409 khi file đã ghi da-duyet mà app chưa có bản chụp hiện hành (◎ / đổi ngoài app): giữ ngay_duyet của file', async () => {
    // ◎: DB không có bản chụp nào của mục → chỉ "Quét lại" + "Nhận là Đã duyệt" (giữ ngay_duyet trong file)
    const text = banDaDuyet(sc, '2026-09-01')
    nhan(sc, text)
    const bai = await mt.get(`/api/bai/${sc.id}`).expect(200)
    expect(bai.body.canhBaoDuyet).toBe('chua-xac-nhan')
    let res = await mt.post(`/api/duyet/${sc.id}`).send({ hashNhap: bai.body.hashFile }).expect(409)
    expect(res.body.loi).toBe(TB_DUYET.fileGhiDaDuyet)
    expect(docFile(sc.duongDanTuongDoi)).toBe(text)
    expect(docBanChupHienHanh(mt.db, sc.id)).toBeUndefined()

    // Đổi ngoài app: DB chỉ còn bản chụp đã bị thay
    const textPestle = banDaDuyet(pestle, '2026-09-02')
    nhan(pestle, textPestle)
    mt.db.transaction(() =>
      chupBanDuyet(mt.db, { itemId: pestle.id, noiDung: 'bản cũ', ngayDuyet: '2026-08-01' }),
    )()
    mt.db
      .prepare('UPDATE content_approvals SET superseded_at = ? WHERE item_id = ?')
      .run('2026-10-01T00:00:00.000Z', pestle.id)
    const baiPestle = await mt.get(`/api/bai/${pestle.id}`).expect(200)
    expect(baiPestle.body.canhBaoDuyet).toBe('doi-ngoai-app')
    res = await mt
      .post(`/api/duyet/${pestle.id}`)
      .send({ hashNhap: baiPestle.body.hashFile })
      .expect(409)
    expect(res.body.loi).toBe(TB_DUYET.fileGhiDaDuyet)
    expect(docFile(pestle.duongDanTuongDoi)).toBe(textPestle)

    expect(soFileOp()).toBe(0)
    expect(thungRac()).toEqual({})

    // Tab Chờ duyệt vẫn liệt kê (là Bản nháp, bất biến 7) nhưng gắn cờ để không mời "Duyệt"
    const cho = await mt.get('/api/duyet/cho-duyet').expect(200)
    expect(
      cho.body.banNhap.map((d: { id: string; canhBaoDuyet: string | null }) => [
        d.id,
        d.canhBaoDuyet,
      ]),
    ).toEqual(
      [
        [sc.id, 'chua-xac-nhan'],
        [pestle.id, 'doi-ngoai-app'],
      ].sort((a, b) => cay.mucTheoId.get(a[0])!.index - cay.mucTheoId.get(b[0])!.index),
    )
  })

  it('409 khi frontmatter lỗi (loai khác mẫu) — file giữ nguyên', async () => {
    const text = banNhap(sc).replace('loai: chu-de', 'loai: tai-lieu')
    nhan(sc, text)
    const res = await mt
      .post(`/api/duyet/${sc.id}`)
      .send({ hashNhap: bamNoiDung(text) })
      .expect(409)
    expect(res.body.loi).toMatch(/^File bài có lỗi frontmatter dòng \d+/)
    expect(docFile(sc.duongDanTuongDoi)).toBe(text)
    expect(soFileOp()).toBe(0)
  })

  it('404 mục không có trong cây (bất biến 8); 400 body sai', async () => {
    let res = await mt
      .post('/api/duyet/khong-co-muc-nay')
      .send({ hashNhap: 'a'.repeat(64) })
      .expect(404)
    expect(res.body.loi).toContain('khong-co-muc-nay')
    await mt.get('/api/duyet/khong-co-muc-nay').expect(404)
    await mt
      .post('/api/duyet/khong-co-muc-nay/ban-sua')
      .send({ hashNhap: 'a'.repeat(64) })
      .expect(404)
    await mt.post('/api/duyet/khong-co-muc-nay/bo-ban-sua').expect(404)

    res = await mt.post(`/api/duyet/${sc.id}`).send({ hashNhap: 'abc' }).expect(400)
    expect(res.body.loi).toBe(TB_DUYET.hashNhap)
    res = await mt.post(`/api/duyet/${sc.id}`).send({}).expect(400)
    expect(res.body.loi).toBe(TB_DUYET.hashNhap)
    res = await mt
      .post(`/api/duyet/${sc.id}`)
      .send({ hashNhap: 'a'.repeat(64), ngayDuyet: '2026-01-01' })
      .expect(400)
    expect(res.body.loi).toContain('ngayDuyet')
  })
})

describe('bản sửa (<slug>.ban-sua.md, bất biến 5)', () => {
  it('GET /api/duyet/:id → hash + khối ★ thiếu; duyệt bản sửa: thay bài đã duyệt, bản cũ + bản sửa vào thùng rác, bản chụp mới', async () => {
    daDuyetSan(mt.db, goc, sc)
    const cu = docFile(sc.duongDanTuongDoi)!
    const sua = fileChuDe(sc, { bo: ['Ví dụ thực tế'] })
    nhan(sc, sua, 'ban-sua', '2026-10-24')
    datGio('2026-10-27T09:00:00')

    const ct = await mt.get(`/api/duyet/${sc.id}`).expect(200)
    expect(ct.body).toEqual({
      homNay: '2026-10-27',
      banSua: {
        hash: bamNoiDung(sua),
        duongDan: duongDanCuaMuc(sc, 'ban-sua'),
        ngayNhap: '2026-10-24',
        duKhoi: { co: 8, tong: 9 },
        thieu: ['Ví dụ thực tế'],
        loiDoc: null,
      },
    })
    const tt = await mt.get('/api/noi-dung/trang-thai').expect(200)
    expect(tt.body[sc.id]).toEqual({ loai: 'da-duyet', ngayDuyet: '2026-10-18', coBanSua: true })
    const cho = await mt.get('/api/duyet/cho-duyet').expect(200)
    expect(cho.body).toEqual({ banNhap: [], banSua: [{ id: sc.id, ngayNhap: '2026-10-24' }] })

    // Bài đã duyệt không bao giờ bị đường duyệt bản nháp ghi đè
    await mt
      .post(`/api/duyet/${sc.id}`)
      .send({ hashNhap: bamNoiDung(sua) })
      .expect(409)

    const res = await mt
      .post(`/api/duyet/${sc.id}/ban-sua`)
      .send({ hashNhap: ct.body.banSua.hash })
      .expect(200)
    expect(res.body).toEqual({ revision: expect.any(Number), ngayDuyet: '2026-10-27' })

    const moi = docFile(sc.duongDanTuongDoi)!
    expect(moi).toBe(
      sua
        .replace('trang_thai_noi_dung: ban-nhap', 'trang_thai_noi_dung: da-duyet')
        .replace('nguon: ai\n---', 'nguon: ai\nngay_duyet: 2026-10-27\n---'),
    )
    expect(docFile(duongDanCuaMuc(sc, 'ban-sua'))).toBeUndefined()
    expect(thungRac()).toEqual({
      [sc.duongDanTuongDoi]: cu,
      [duongDanCuaMuc(sc, 'ban-sua')]: sua,
    })
    // Bản chụp: bản cũ superseded, bản mới hiện hành = file
    const ds = mt.db
      .prepare(
        'SELECT approved_on AS ngay, hash, superseded_at IS NOT NULL AS thay FROM content_approvals ORDER BY id',
      )
      .all()
    expect(ds).toEqual([
      { ngay: '2026-10-18', hash: bamNoiDung(cu), thay: 1 },
      { ngay: '2026-10-27', hash: bamNoiDung(moi), thay: 0 },
    ])
    expect(docTepCuaMuc(mt.db, sc.id, 'ban-sua')).toBeUndefined()
    expect(docTepCuaMuc(mt.db, sc.id)).toMatchObject({ hash: bamNoiDung(moi) })
    const op = mt.db.prepare('SELECT op, state FROM file_ops').all()
    expect(op).toEqual([{ op: 'duyet-ban-sua', state: 'xong' }])

    const bai = await mt.get(`/api/bai/${sc.id}`).expect(200)
    expect(bai.body).toMatchObject({
      trangThaiNoiDung: { loai: 'da-duyet', ngayDuyet: '2026-10-27' },
      banHien: 'file',
      canhBaoDuyet: null,
    })
    expect((await mt.get(`/api/duyet/${sc.id}`).expect(200)).body.banSua).toBeNull()
  })

  it('409: bản sửa đã đổi so với hashNhap; mục chưa duyệt; không có bản sửa — không đổi gì', async () => {
    daDuyetSan(mt.db, goc, sc)
    const sua = banSuaCua(sc)
    nhan(sc, sua, 'ban-sua')
    ghiTep(goc, duongDanCuaMuc(sc, 'ban-sua'), sua + '\nthêm dòng\n')
    let res = await mt
      .post(`/api/duyet/${sc.id}/ban-sua`)
      .send({ hashNhap: bamNoiDung(sua) })
      .expect(409)
    expect(res.body.loi).toBe(TB_DUYET.banSuaDaDoi)

    nhan(pestle, banNhap(pestle))
    res = await mt
      .post(`/api/duyet/${pestle.id}/ban-sua`)
      .send({ hashNhap: 'a'.repeat(64) })
      .expect(409)
    expect(res.body.loi).toBe(TB_DUYET.chuaDuyet)

    daDuyetSan(mt.db, goc, bani)
    res = await mt
      .post(`/api/duyet/${bani.id}/ban-sua`)
      .send({ hashNhap: 'a'.repeat(64) })
      .expect(409)
    expect(res.body.loi).toBe(TB_DUYET.khongCoBanSua)
    res = await mt.post(`/api/duyet/${bani.id}/bo-ban-sua`).expect(409)
    expect(res.body.loi).toBe(TB_DUYET.khongCoBanSua)

    expect(soFileOp()).toBe(0)
    expect(docFile(sc.duongDanTuongDoi)).toBe(banDaDuyet(sc))
    expect(thungRac()).toEqual({})
  })

  it('bỏ bản sửa: chỉ bản sửa vào thùng rác; bài Đã duyệt, bản chụp giữ nguyên', async () => {
    daDuyetSan(mt.db, goc, sc)
    const sua = banSuaCua(sc)
    nhan(sc, sua, 'ban-sua')
    const bcTruoc = docBanChupHienHanh(mt.db, sc.id)

    const res = await mt.post(`/api/duyet/${sc.id}/bo-ban-sua`).expect(200)
    expect(res.body).toEqual({ revision: expect.any(Number) })
    expect(docFile(duongDanCuaMuc(sc, 'ban-sua'))).toBeUndefined()
    expect(thungRac()).toEqual({ [duongDanCuaMuc(sc, 'ban-sua')]: sua })
    expect(docFile(sc.duongDanTuongDoi)).toBe(banDaDuyet(sc))
    expect(docBanChupHienHanh(mt.db, sc.id)).toEqual(bcTruoc)
    expect(docTepCuaMuc(mt.db, sc.id, 'ban-sua')).toBeUndefined()
    const tt = await mt.get('/api/noi-dung/trang-thai').expect(200)
    expect(tt.body[sc.id]).toEqual({ loai: 'da-duyet', ngayDuyet: '2026-10-18' })
  })

  it('bỏ bản sửa đã bị xoá ngoài app: chỉ gỡ dòng sổ, không lỗi', async () => {
    daDuyetSan(mt.db, goc, sc)
    nhan(sc, banSuaCua(sc), 'ban-sua')
    fs.rmSync(path.join(goc, duongDanCuaMuc(sc, 'ban-sua')))
    await mt.post(`/api/duyet/${sc.id}/bo-ban-sua`).expect(200)
    expect(docTepCuaMuc(mt.db, sc.id, 'ban-sua')).toBeUndefined()
    expect(thungRac()).toEqual({})
  })
})

describe('GET /api/duyet/cho-duyet', () => {
  it('ngày nhập mới nhất trước, cùng ngày theo thứ tự cây; nguồn, Đủ khối, file lỗi', async () => {
    // pestle (index nhỏ hơn bani) và bani cùng ngày; risk-register mới hơn; scope-creep cũ nhất
    nhan(bani, fileChuDe(bani, { nguon: 'tu-viet' }), 'bai', '2026-10-22')
    nhan(pestle, fileChuDe(pestle, { bo: ['Tóm tắt', 'Tự kiểm tra'] }), 'bai', '2026-10-22')
    nhan(riskRegister, banNhap(riskRegister, 'ai'), 'bai', '2026-10-25')
    nhan(sc, banNhap(sc).replace('loai: chu-de', 'loai chu-de'), 'bai', '2026-10-01')
    expect(pestle.index).toBeLessThan(bani.index)

    const res = await mt.get('/api/duyet/cho-duyet').expect(200)
    expect(res.body.banSua).toEqual([])
    expect(res.body.banNhap).toEqual([
      {
        id: riskRegister.id,
        nguon: 'ai',
        ngayNhap: '2026-10-25',
        duKhoi: { co: expect.any(Number), tong: expect.any(Number) },
        coLoi: false,
        canhBaoDuyet: null,
      },
      {
        id: pestle.id,
        nguon: 'ai',
        ngayNhap: '2026-10-22',
        duKhoi: { co: 7, tong: 9 },
        coLoi: false,
        canhBaoDuyet: null,
      },
      {
        id: bani.id,
        nguon: 'tu-viet',
        ngayNhap: '2026-10-22',
        duKhoi: { co: 9, tong: 9 },
        coLoi: false,
        canhBaoDuyet: null,
      },
      {
        id: sc.id,
        nguon: 'ai',
        ngayNhap: '2026-10-01',
        duKhoi: { co: expect.any(Number), tong: 9 },
        coLoi: true,
        canhBaoDuyet: null,
      },
    ])
    // Cùng tập với "Bản nháp" của GET /api/noi-dung/trang-thai
    const tt = await mt.get('/api/noi-dung/trang-thai').expect(200)
    const nhap = Object.entries(tt.body as Record<string, { loai: string }>)
      .filter(([, v]) => v.loai === 'ban-nhap')
      .map(([k]) => k)
      .sort()
    expect(res.body.banNhap.map((d: { id: string }) => d.id).sort()).toEqual(nhap)
  })
})

describe('giết tiến trình giữa file_op duyệt → chạy tiếp → như chạy một mạch', () => {
  interface MtNhe {
    db: Db
    goc: string
    xoa(): void
  }
  async function taoNhe(): Promise<MtNhe> {
    const tam = taoThuMucTam()
    const db = await moDb(path.join(tam.dataDir, 'hoc.db'))
    fs.mkdirSync(tam.noiDungDir, { recursive: true })
    return {
      db,
      goc: tam.noiDungDir,
      xoa() {
        db.close()
        tam.xoa()
      },
    }
  }

  /** Bối cảnh: sc đã duyệt + có bản sửa; pestle có bản nháp. */
  function boiCanh(m: MtNhe) {
    daDuyetSan(m.db, m.goc, sc)
    for (const [mm, text, vai] of [
      [sc, banSuaCua(sc), 'ban-sua'],
      [pestle, banNhap(pestle), 'bai'],
    ] as const) {
      const duongDan = duongDanCuaMuc(mm, vai)
      ghiTep(m.goc, duongDan, text)
      nhanTepCoSanDongBo(m.db, m.goc, { duongDan, itemId: mm.id, vai, ngayNhap: '2026-10-20' })
    }
  }

  function anh(m: MtNhe) {
    const files: Record<string, string> = {}
    for (const ten of fs.readdirSync(m.goc, { recursive: true, encoding: 'utf8' })) {
      const p = path.join(m.goc, ten)
      if (!fs.lstatSync(p).isFile()) continue
      files[
        ten
          .split(path.sep)
          .join('/')
          .replace(/\.thung-rac\/[^/]+/, '.thung-rac/<nhan>')
      ] = fs.readFileSync(p, 'utf8')
    }
    const so = docSo(m.db).map(({ mtime: _m, ...d }) => d)
    const duyet = m.db
      .prepare(
        'SELECT item_id, approved_on, hash, superseded_at IS NOT NULL AS thay FROM content_approvals ORDER BY id',
      )
      .all()
    return { files, so, duyet }
  }

  const cacKeHoach: [string, (m: MtNhe) => Promise<KeHoachDuyet>][] = [
    ['duyệt bản nháp', (m) => keHoachDuyetBai(m.db, m.goc, pestle, bamNoiDung(banNhap(pestle)))],
    ['duyệt bản sửa', (m) => keHoachDuyetBanSua(m.db, m.goc, sc, bamNoiDung(banSuaCua(sc)))],
  ]

  for (const [ten, lap] of cacKeHoach) {
    it(ten, async () => {
      const mot = await taoNhe()
      let mong: ReturnType<typeof anh>
      const diem: [Parameters<DiemDung>[0], number][] = []
      try {
        boiCanh(mot)
        const { yc } = await lap(mot)
        await thucHienFileOp(mot.db, cay, mot.goc, yc, {
          diemDung: (t, i) => void diem.push([t, i]),
        })
        mong = anh(mot)
      } finally {
        mot.xoa()
      }
      expect(diem.length).toBeGreaterThanOrEqual(3)

      for (const [tenDung, iDung] of [['truoc-buoc-dau', -1] as const, ...diem]) {
        const m2 = await taoNhe()
        try {
          boiCanh(m2)
          const { yc } = await lap(m2)
          const id = taoFileOp(m2.db, cay, yc)
          if (tenDung !== 'truoc-buoc-dau') {
            await expect(
              chayFileOp(m2.db, m2.goc, id, {
                diemDung: (t, i) => {
                  if (t === tenDung && i === iDung) throw new Error('chết')
                },
              }),
            ).rejects.toThrow('chết')
          }
          expect(dsFileOpDuDinh(m2.db)).toEqual([id])
          await tiepTucFileOps(m2.db, m2.goc)
          expect(anh(m2), `${tenDung} #${iDung}`).toEqual(mong)
        } finally {
          m2.xoa()
        }
      }
    })
  }
})
