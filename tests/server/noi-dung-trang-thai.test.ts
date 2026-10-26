// GET /api/noi-dung/trang-thai (đề xuất 1.6, 3.6, 2.2 bất biến 7): trạng thái nội dung của mọi mục, cùng quy
// tắc với GET /api/bai/:id; rẻ cho cả cây (mục có bản chụp không đụng đĩa, mục khác stat + đệm theo
// mtime/size). Từ phase 2b chỉ xét file ĐÃ NHẬN (sổ content_files). supertest trên DB + thư mục nội dung tạm,
// cây đóng băng, file mẫu ở tests/fixtures/noi-dung.
import fs from 'node:fs'
import path from 'node:path'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import cayJson from '../fixtures/roadmap-tree.json'
import cauHinhJson from '../../shared/roadmap/cau-hinh-cay.json'
import { datLech, nowIso } from '../../shared/clock.ts'
import type { TrangThaiNoiDung } from '../../shared/domain/trang-thai.ts'
import { dungCay, type MucHoc } from '../../shared/roadmap/index.ts'
import { taoApp } from '../../server/app.ts'
import { docCauHinh } from '../../server/cau-hinh.ts'
import { moDb, type Db } from '../../server/db/index.ts'
import { bamNoiDung } from '../../server/noi-dung/bam.ts'
import { ghiDongSo } from '../../server/du-lieu/so-noi-dung.ts'
import { docTepTai } from '../../server/noi-dung/doc-bai.ts'
import { nhanTepCoSanDongBo } from '../../server/noi-dung/quet.ts'
import type { PhanHoiBai, PhanHoiTrangThaiNoiDung } from '../../server/noi-dung/hop-dong-bai.ts'
import { taoBoTrangThaiNoiDung } from '../../server/noi-dung/trang-thai-noi-dung.ts'
import { taoSaoLuu, type SaoLuu } from '../../server/sao-luu.ts'
import { HOST, taoThuMucTam, type ThuMucTam } from './tro-giup.ts'

const cay = dungCay(cayJson, cauHinhJson)
const FIXTURE = path.resolve(import.meta.dirname, '../fixtures/noi-dung')

function muc(label: string): MucHoc {
  const ds = cay.mucHoc.filter((m) => m.label === label)
  if (ds.length !== 1) throw new Error(`Không có đúng 1 mục “${label}”`)
  return ds[0]
}

const scopeCreep = muc('Scope Creep')
const changeLog = muc('Change log')
const salience = muc('Salience Model')
const riskRegister = muc('Risk Register')
const chungChi = cay.mucHoc.find((m) => m.mau === 'chung-chi')!

const docFixture = (ten: string) => fs.readFileSync(path.join(FIXTURE, ten), 'utf8')
const BAN_NHAP = docFixture('chu-de-ban-nhap.md')
const DA_DUYET = docFixture('chu-de-da-duyet.md')
const LOI_FM = docFixture('tai-lieu-loi-frontmatter.md')
const fm = (m: MucHoc, them = '') =>
  `---\nloai: ${m.mau}\ntrang_thai_noi_dung: ban-nhap\n${them}---\n## Tóm tắt\nx\n`

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
  app = taoApp({ cauHinh, db, saoLuu, soMucHoc: cay.soMucHoc, cay })
})

afterEach(async () => {
  await saoLuu.choXong()
  db.close()
  tam.xoa()
})

const get = (url: string) => request(app).get(url).set('Host', HOST)

async function layTrangThai(): Promise<PhanHoiTrangThaiNoiDung> {
  const res = await get('/api/noi-dung/trang-thai')
  expect(res.status).toBe(200)
  expect(res.headers['content-type']).toMatch(/^application\/json/)
  return res.body as PhanHoiTrangThaiNoiDung
}

/** Ghi file ở đường dẫn chuẩn; mặc định nhận luôn vào sổ (như sau Nhập / Quét lại). */
function ghiBai(m: MucHoc, noiDung: string | Buffer, nhan = true): string {
  const p = path.join(tam.noiDungDir, m.duongDanTuongDoi)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, noiDung)
  if (nhan) {
    nhanTepCoSanDongBo(db, tam.noiDungDir, {
      duongDan: m.duongDanTuongDoi,
      itemId: m.id,
      vai: 'bai',
    })
  }
  return p
}

/** Dòng sổ trỏ vào đường dẫn chuẩn của mục mà không đọc file (để thử file bị thay bằng symlink / thư mục). */
function dongSoGia(m: MucHoc): void {
  ghiDongSo(db, {
    path: m.duongDanTuongDoi,
    itemId: m.id,
    role: 'bai',
    hash: '0'.repeat(64),
    size: 0,
    mtime: null,
    importedOn: '2026-10-26',
    missingSince: null,
  })
}

function chenBanChup(
  itemId: string,
  noiDung: string,
  tuyChon: { ngay?: string; thayLuc?: string | null } = {},
): void {
  const luc = nowIso()
  db.prepare(
    `INSERT INTO content_approvals (item_id, approved_on, hash, body, superseded_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    itemId,
    tuyChon.ngay ?? '2026-10-18',
    bamNoiDung(noiDung),
    noiDung,
    tuyChon.thayLuc ?? null,
    luc,
    luc,
  )
}

/** Trạng thái mà GET /api/bai/:id trả cho từng mục (để so với API danh sách). */
async function theoTungBai(): Promise<Record<string, TrangThaiNoiDung>> {
  const kq: Record<string, TrangThaiNoiDung> = {}
  for (const m of cay.mucHoc) {
    const res = await get(`/api/bai/${encodeURIComponent(m.id)}`)
    kq[m.id] = (res.body as PhanHoiBai).trangThaiNoiDung
  }
  return kq
}

describe('GET /api/noi-dung/trang-thai', () => {
  it('chưa có thư mục nội dung, chưa có bản chụp → {} (mọi mục Chưa có)', async () => {
    expect(fs.existsSync(tam.noiDungDir)).toBe(false)
    expect(await layTrangThai()).toEqual({})
  })

  it('đủ các trường hợp, khoá theo id mục; mục Chưa có không có khoá', async () => {
    ghiBai(scopeCreep, DA_DUYET)
    chenBanChup(scopeCreep.id, DA_DUYET, { ngay: '2026-10-18' }) // Đã duyệt, file khớp
    chenBanChup(salience.id, DA_DUYET, { ngay: '2026-10-05' }) // Đã duyệt, mất file
    ghiBai(riskRegister, fm(riskRegister, 'nguon: tu-viet\n')) // Bản nháp · Tự viết
    ghiBai(changeLog, LOI_FM) // frontmatter lỗi → Bản nháp · AI
    ghiBai(
      chungChi,
      `---\nloai: chung-chi\ntrang_thai_noi_dung: da-duyet\nngay_duyet: 2026-10-01\n---\n`,
    )
    expect(await layTrangThai()).toEqual({
      [scopeCreep.id]: { loai: 'da-duyet', ngayDuyet: '2026-10-18' },
      [salience.id]: { loai: 'da-duyet', ngayDuyet: '2026-10-05' },
      [riskRegister.id]: { loai: 'ban-nhap', nguon: 'tu-viet' },
      [changeLog.id]: { loai: 'ban-nhap', nguon: 'ai' },
      // file ghi da-duyet mà không có bản chụp: Bản nháp (banner chỉ ở bài)
      [chungChi.id]: { loai: 'ban-nhap', nguon: 'ai' },
    })
  })

  it('cùng quy tắc với GET /api/bai/:id cho MỌI mục (kể cả loai khác mẫu, alias, file quá lớn, symlink, bản chụp cũ)', async () => {
    const [a, b, c, d, e, g, h] = cay.mucHoc.filter((m) => m.mau === 'chu-de').slice(10)
    ghiBai(a, fm(a, 'nguon: tu-viet\n').replace(`loai: ${a.mau}`, 'loai: tai-lieu')) // loai khác mẫu
    ghiBai(b, fm(b, 'nguon: tu-viet\nvong: &v [*v]\n')) // alias vòng
    ghiBai(c, fm(c, 'nguon: tu-viet\n') + 'x'.repeat(260 * 1024)) // quá 256 KB
    const that = ghiBai(d, fm(d, 'nguon: tu-viet\n'))
    const lienKet = path.join(tam.noiDungDir, e.duongDanTuongDoi)
    fs.mkdirSync(path.dirname(lienKet), { recursive: true })
    fs.symlinkSync(that, lienKet) // file đã nhận bị thay bằng symlink → Chưa có
    dongSoGia(e)
    fs.mkdirSync(path.join(tam.noiDungDir, g.duongDanTuongDoi), { recursive: true }) // thư mục → Chưa có
    dongSoGia(g)
    ghiBai(h, DA_DUYET.replace(scopeCreep.id, h.id))
    chenBanChup(h.id, DA_DUYET, { thayLuc: '2026-10-20T00:00:00.000Z' }) // chỉ bản chụp đã thay
    chenBanChup('id-khong-co-trong-cay', DA_DUYET) // bỏ qua (bất biến 8)
    ghiBai(scopeCreep, BAN_NHAP)

    const tatCa = await layTrangThai()
    const tungBai = await theoTungBai()
    for (const m of cay.mucHoc) {
      expect(tatCa[m.id] ?? { loai: 'chua-co' }, m.label).toEqual(tungBai[m.id])
    }
    expect(tatCa[a.id]).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
    expect(tatCa[b.id]).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
    expect(tatCa[c.id]).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
    expect(tatCa[d.id]).toEqual({ loai: 'ban-nhap', nguon: 'tu-viet' })
    expect(tatCa[e.id]).toBeUndefined()
    expect(tatCa[g.id]).toBeUndefined()
    expect(tatCa[h.id]).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
    expect(Object.keys(tatCa)).not.toContain('id-khong-co-trong-cay')
    expect(Object.keys(tatCa).every((id) => cay.mucTheoId.has(id))).toBe(true)
  })

  it('bất biến 7: Đã duyệt + Bản nháp + Chưa có = soMucHoc', async () => {
    ghiBai(scopeCreep, DA_DUYET)
    chenBanChup(scopeCreep.id, DA_DUYET)
    chenBanChup(salience.id, DA_DUYET)
    ghiBai(riskRegister, fm(riskRegister))
    ghiBai(changeLog, LOI_FM)
    const tatCa = await layTrangThai()
    const dem = { 'da-duyet': 0, 'ban-nhap': 0, 'chua-co': 0 }
    for (const m of cay.mucHoc) dem[(tatCa[m.id] ?? { loai: 'chua-co' }).loai]++
    expect(dem).toEqual({ 'da-duyet': 2, 'ban-nhap': 2, 'chua-co': cay.soMucHoc - 4 })
  })

  it('file sửa / xoá ngoài app: lần gọi sau thấy ngay (đệm theo mtime/size, không theo thời gian)', async () => {
    ghiBai(riskRegister, fm(riskRegister, 'nguon: ai\n'))
    expect((await layTrangThai())[riskRegister.id]).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
    ghiBai(riskRegister, fm(riskRegister, 'nguon: tu-viet\n'))
    expect((await layTrangThai())[riskRegister.id]).toEqual({ loai: 'ban-nhap', nguon: 'tu-viet' })
    fs.rmSync(path.join(tam.noiDungDir, riskRegister.duongDanTuongDoi))
    expect((await layTrangThai())[riskRegister.id]).toBeUndefined()
  })

  it('file CHƯA NHẬN ở đường dẫn chuẩn không tính (1.6, đường 3): Chưa có tới khi Nhập / Quét lại', async () => {
    ghiBai(riskRegister, fm(riskRegister, 'nguon: tu-viet\n'), false)
    expect(await layTrangThai()).toEqual({})
    expect((await theoTungBai())[riskRegister.id]).toEqual({ loai: 'chua-co' })
    nhanTepCoSanDongBo(db, tam.noiDungDir, {
      duongDan: riskRegister.duongDanTuongDoi,
      itemId: riskRegister.id,
      vai: 'bai',
    })
    expect((await layTrangThai())[riskRegister.id]).toEqual({ loai: 'ban-nhap', nguon: 'tu-viet' })
  })

  it('Đã duyệt có bản sửa đã nhận → coBanSua (chip "Đã duyệt · có bản sửa chưa duyệt"), cùng ở /api/bai', async () => {
    ghiBai(scopeCreep, DA_DUYET)
    chenBanChup(scopeCreep.id, DA_DUYET)
    const banSua = scopeCreep.duongDanTuongDoi.replace(/\.md$/, '.ban-sua.md')
    fs.writeFileSync(path.join(tam.noiDungDir, banSua), BAN_NHAP)
    // chưa nhận → chưa tính
    expect((await layTrangThai())[scopeCreep.id]).toEqual({
      loai: 'da-duyet',
      ngayDuyet: '2026-10-18',
    })
    nhanTepCoSanDongBo(db, tam.noiDungDir, {
      duongDan: banSua,
      itemId: scopeCreep.id,
      vai: 'ban-sua',
    })
    const mong = { loai: 'da-duyet', ngayDuyet: '2026-10-18', coBanSua: true }
    expect((await layTrangThai())[scopeCreep.id]).toEqual(mong)
    expect((await theoTungBai())[scopeCreep.id]).toEqual(mong)
    // bản sửa của mục chưa duyệt không đổi trạng thái
    const rr = riskRegister.duongDanTuongDoi.replace(/\.md$/, '.ban-sua.md')
    ghiBai(riskRegister, fm(riskRegister))
    fs.writeFileSync(path.join(tam.noiDungDir, rr), fm(riskRegister))
    nhanTepCoSanDongBo(db, tam.noiDungDir, {
      duongDan: rr,
      itemId: riskRegister.id,
      vai: 'ban-sua',
    })
    expect((await layTrangThai())[riskRegister.id]).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
  })

  it('chỉ đọc; phương thức khác → 404; Host lạ → 403', async () => {
    for (const phuongThuc of ['put', 'post', 'delete', 'patch'] as const) {
      const goi = request(app)
      const res = await goi[phuongThuc]('/api/noi-dung/trang-thai').set('Host', HOST).send({})
      expect(res.status).toBe(404)
    }
    expect(
      (await request(app).get('/api/noi-dung/trang-thai').set('Host', 'evil.test:5321')).status,
    ).toBe(403)
  })
})

describe('bộ trạng thái nội dung: rẻ cho cả cây', () => {
  it('mục có bản chụp hiện hành không đọc đĩa; lần sau chỉ stat, không đọc lại file chưa đổi', async () => {
    const cacMuc = cay.mucHoc
    for (const m of cacMuc) ghiBai(m, fm(m, 'nguon: tu-viet\n'))
    chenBanChup(scopeCreep.id, DA_DUYET)
    const daDoc: string[] = []
    const bo = taoBoTrangThaiNoiDung(tam.noiDungDir, async (dir, duongDan) => {
      daDoc.push(duongDan)
      return docTepTai(dir, duongDan)
    })

    const lan1 = await bo.docTatCa(db, cacMuc)
    expect(Object.keys(lan1)).toHaveLength(cay.soMucHoc)
    expect(daDoc).toHaveLength(cay.soMucHoc - 1)
    expect(daDoc).not.toContain(scopeCreep.duongDanTuongDoi)

    daDoc.length = 0
    const batDau = performance.now()
    expect(await bo.docTatCa(db, cacMuc)).toEqual(lan1)
    expect(daDoc).toEqual([])
    expect(performance.now() - batDau).toBeLessThan(1000)

    // file đổi kích thước → chỉ đọc lại đúng file đó
    ghiBai(salience, fm(salience, 'nguon: ai\n'))
    const lan3 = await bo.docTatCa(db, cacMuc)
    expect(daDoc).toEqual([salience.duongDanTuongDoi])
    expect(lan3[salience.id]).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
  })
})
