// API bài học chỉ đọc (đề xuất 1.5, 1.6 "Bảo vệ bản Đã duyệt", 1.10, 2.2 bất biến 5, 7, 8; 3.6 "Hiện ở
// bài"; F26 lỗi đọc file): supertest trên DB + thư mục nội dung tạm, cây đóng băng, file mẫu ở
// tests/fixtures/noi-dung (chữ giữ chỗ).
import fs from 'node:fs'
import path from 'node:path'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import cayJson from '../fixtures/roadmap-tree.json'
import cauHinhJson from '../../shared/roadmap/cau-hinh-cay.json'
import { datLech, nowIso } from '../../shared/clock.ts'
import { dungCay, type MucHoc } from '../../shared/roadmap/index.ts'
import { taoApp } from '../../server/app.ts'
import { docCauHinh } from '../../server/cau-hinh.ts'
import { moDb, type Db } from '../../server/db/index.ts'
import { layRevision } from '../../server/db/settings.ts'
import { bamNoiDung } from '../../server/noi-dung/bam.ts'
import { nhanTepCoSanDongBo } from '../../server/noi-dung/quet.ts'
import { quyetDinhBai } from '../../server/noi-dung/doc-bai.ts'
import { CAU_CANH_BAO_DUYET, type PhanHoiBai } from '../../server/noi-dung/hop-dong-bai.ts'
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

async function layBai(m: MucHoc): Promise<PhanHoiBai> {
  const res = await get(`/api/bai/${encodeURIComponent(m.id)}`)
  expect(res.status).toBe(200)
  expect(res.headers['content-type']).toMatch(/^application\/json/)
  return res.body as PhanHoiBai
}

/**
 * Ghi file bài vào đúng đường dẫn chuẩn của mục (noi-dung/<phần>/<lĩnh vực>/<slug>.md) rồi nhận vào sổ nội
 * dung (từ phase 2b bài chỉ đọc file đã nhận — như sau Nhập / Quét lại).
 */
function ghiBai(m: MucHoc, noiDung: string | Buffer): string {
  const p = path.join(tam.noiDungDir, m.duongDanTuongDoi)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, noiDung)
  nhanTepCoSanDongBo(db, tam.noiDungDir, { duongDan: m.duongDanTuongDoi, itemId: m.id, vai: 'bai' })
  return p
}

/** Chèn một bản chụp duyệt (phase 2b mới có đường ghi thật). */
function chenBanChup(
  m: MucHoc,
  noiDung: string,
  tuyChon: { ngay?: string; thayLuc?: string | null } = {},
): void {
  const luc = nowIso()
  db.prepare(
    `INSERT INTO content_approvals (item_id, approved_on, hash, body, superseded_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    m.id,
    tuyChon.ngay ?? '2026-10-18',
    bamNoiDung(noiDung),
    noiDung,
    tuyChon.thayLuc ?? null,
    luc,
    luc,
  )
}

/** Mọi file dưới thư mục (đường dẫn tương đối → sha256), để kiểm API không ghi gì. */
function anhChupThuMuc(goc: string): Record<string, string> {
  const kq: Record<string, string> = {}
  if (!fs.existsSync(goc)) return kq
  for (const ten of fs.readdirSync(goc, { recursive: true, encoding: 'utf8' })) {
    const p = path.join(goc, ten)
    const st = fs.lstatSync(p)
    kq[ten] = st.isFile() ? bamNoiDung(fs.readFileSync(p)) : st.isDirectory() ? 'thu-muc' : 'khac'
  }
  return kq
}

describe('GET /api/bai/:id — trạng thái nội dung (3.6, 1.6)', () => {
  it('Chưa có file → Chưa có, bai null (thư mục nội dung chưa tồn tại cũng vậy)', async () => {
    expect(fs.existsSync(tam.noiDungDir)).toBe(false)
    const bai = await layBai(scopeCreep)
    expect(bai).toEqual({
      muc: scopeCreep.id,
      trangThaiNoiDung: { loai: 'chua-co' },
      bai: null,
      loiDoc: null,
      canhBaoDuyet: null,
      banHien: null,
      hashFile: null,
    })
    fs.mkdirSync(tam.noiDungDir, { recursive: true })
    expect((await layBai(scopeCreep)).trangThaiNoiDung).toEqual({ loai: 'chua-co' })
  })

  it('Bản nháp · AI: đọc file ở đường dẫn chuẩn, Đủ khối 9/9, hash = sha256 byte file', async () => {
    ghiBai(scopeCreep, BAN_NHAP)
    const bai = await layBai(scopeCreep)
    expect(bai.trangThaiNoiDung).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
    expect(bai.banHien).toBe('file')
    expect(bai.canhBaoDuyet).toBeNull()
    expect(bai.loiDoc).toBeNull()
    expect(bai.hashFile).toBe(bamNoiDung(Buffer.from(BAN_NHAP, 'utf8')))
    expect(bai.hashFile).toMatch(/^[0-9a-f]{64}$/)
    expect(bai.bai?.duKhoi).toEqual({ co: 9, tong: 9 })
    expect(bai.bai?.canhBao).toEqual([])
    // Bố cục theo mẫu Chủ đề: khối do app tạo đúng vị trí, khối tuỳ chọn trống ẩn (D15)
    expect(bai.bai?.boCuc.map((o) => [o.mau?.id, o.hien])).toEqual([
      ['tom-tat', 'noi-dung'],
      ['vi-sao-pm-can-biet', 'noi-dung'],
      ['khai-niem-cot-loi', 'noi-dung'],
      ['vi-du-thuc-te', 'noi-dung'],
      ['cach-ap-dung', 'noi-dung'],
      ['goc-dev-lead-pm', 'noi-dung'],
      ['noi-lai-bang-loi-cua-ban', 'app'],
      ['so-sanh', 'an'],
      ['thuc-hanh-tren-du-an-that', 'noi-dung'],
      ['tu-kiem-tra', 'noi-dung'],
      ['muc-lien-quan', 'app'],
      ['tham-khao', 'noi-dung'],
    ])
    const tuKiemTra = bai.bai?.khoi.find((k) => k.mau?.id === 'tu-kiem-tra')
    expect(tuKiemTra?.cauTruc).toMatchObject({ kieu: 'tu-kiem-tra', hopLe: true })
  })

  it('Bản nháp · Tự viết theo frontmatter', async () => {
    ghiBai(scopeCreep, BAN_NHAP.replace('nguon: ai', 'nguon: tu-viet'))
    expect((await layBai(scopeCreep)).trangThaiNoiDung).toEqual({
      loai: 'ban-nhap',
      nguon: 'tu-viet',
    })
  })

  it('Bản nháp sửa ngoài app: mỗi lần đọc thẳng bản mới trên đĩa (1.6)', async () => {
    ghiBai(scopeCreep, BAN_NHAP)
    const truoc = await layBai(scopeCreep)
    const moi = BAN_NHAP.replace('[Nội dung mẫu — Tóm tắt] …', '[Nội dung mẫu — Tóm tắt, bản 2] …')
    ghiBai(scopeCreep, moi)
    const sau = await layBai(scopeCreep)
    expect(sau.hashFile).not.toBe(truoc.hashFile)
    expect(sau.bai?.khoi[0].noiDung).toBe('[Nội dung mẫu — Tóm tắt, bản 2] …')
  })

  it('file chỉ có frontmatter: Đủ khối 0/9 · 1/8 · 1/7 theo mẫu của mục', async () => {
    const chiFm = (m: MucHoc) =>
      `---\nloai: ${m.mau}\ntrang_thai_noi_dung: ban-nhap\nnguon: ai\n---\n`
    for (const m of [salience, riskRegister, chungChi]) ghiBai(m, chiFm(m))
    expect((await layBai(salience)).bai?.duKhoi).toEqual({ co: 0, tong: 9 })
    expect((await layBai(riskRegister)).bai?.duKhoi).toEqual({ co: 1, tong: 8 })
    expect((await layBai(chungChi)).bai?.duKhoi).toEqual({ co: 1, tong: 7 })
  })

  it('BOM + CRLF: hash trên byte gốc, bài vẫn đọc đúng', async () => {
    const byte = Buffer.from(`\uFEFF${BAN_NHAP.replace(/\n/g, '\r\n')}`, 'utf8')
    ghiBai(scopeCreep, byte)
    const bai = await layBai(scopeCreep)
    expect(bai.hashFile).toBe(bamNoiDung(byte))
    expect(bai.bai?.duKhoi).toEqual({ co: 9, tong: 9 })
  })

  it('file ghi da-duyet mà DB không có bản chụp → Bản nháp + "chưa xác nhận", bài vẫn hiện (1.6)', async () => {
    ghiBai(scopeCreep, DA_DUYET)
    const bai = await layBai(scopeCreep)
    expect(bai.trangThaiNoiDung).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
    expect(bai.canhBaoDuyet).toBe('chua-xac-nhan')
    expect(CAU_CANH_BAO_DUYET[bai.canhBaoDuyet!]).toBe(
      'File ghi Đã duyệt nhưng app chưa xác nhận — Quét lại',
    )
    expect(bai.banHien).toBe('file')
    expect(bai.bai?.frontmatter?.trangThaiNoiDung).toBe('da-duyet')
  })

  it('bản chụp của mục khác không tính: mục này vẫn ◎ "chưa xác nhận"', async () => {
    ghiBai(scopeCreep, DA_DUYET)
    chenBanChup(salience, DA_DUYET)
    const bai = await layBai(scopeCreep)
    expect(bai.trangThaiNoiDung).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
    expect(bai.canhBaoDuyet).toBe('chua-xac-nhan')
  })

  it('chỉ còn bản chụp đã bị thay, file ghi da-duyet trùng hash bản cũ → Bản nháp + "đổi ngoài app", hiện file (1.6: ◎ chỉ khi DB không có bản chụp nào)', async () => {
    ghiBai(scopeCreep, DA_DUYET)
    chenBanChup(scopeCreep, DA_DUYET, { thayLuc: '2026-10-20T00:00:00.000Z' })
    const bai = await layBai(scopeCreep)
    expect(bai.trangThaiNoiDung).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
    expect(bai.canhBaoDuyet).toBe('doi-ngoai-app')
    expect(bai.banHien).toBe('file')
    expect(bai.hashFile).toBe(bamNoiDung(DA_DUYET))
    expect(bai.bai?.duKhoi).toEqual({ co: 9, tong: 9 })
  })

  it('chỉ còn bản chụp đã bị thay, file da-duyet khác mọi bản cũ → cũng "đổi ngoài app"; file ban-nhap → không banner', async () => {
    chenBanChup(scopeCreep, DA_DUYET, { thayLuc: '2026-10-20T00:00:00.000Z' })
    ghiBai(scopeCreep, DA_DUYET.replace('[Nội dung mẫu — Tóm tắt] …', '[Bản khác] …'))
    let bai = await layBai(scopeCreep)
    expect(bai.trangThaiNoiDung.loai).toBe('ban-nhap')
    expect(bai.canhBaoDuyet).toBe('doi-ngoai-app')
    ghiBai(scopeCreep, BAN_NHAP)
    bai = await layBai(scopeCreep)
    expect(bai.trangThaiNoiDung).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
    expect(bai.canhBaoDuyet).toBeNull()
  })

  it('Đã duyệt: file trùng hash bản chụp → Đã duyệt, ngày của bản chụp, hiện file', async () => {
    ghiBai(scopeCreep, DA_DUYET)
    chenBanChup(scopeCreep, DA_DUYET, { ngay: '2026-10-18' })
    const bai = await layBai(scopeCreep)
    expect(bai.trangThaiNoiDung).toEqual({ loai: 'da-duyet', ngayDuyet: '2026-10-18' })
    expect(bai.canhBaoDuyet).toBeNull()
    expect(bai.banHien).toBe('file')
    expect(bai.hashFile).toBe(bamNoiDung(DA_DUYET))
    expect(bai.bai?.duKhoi).toEqual({ co: 9, tong: 9 })
  })

  it('Đã duyệt bị sửa ngoài app → hiện BẢN CHỤP + "File đã đổi ngoài app" (1.6)', async () => {
    chenBanChup(scopeCreep, DA_DUYET)
    const sua = DA_DUYET.replace('[Nội dung mẫu — Tóm tắt] …', '[Nội dung mẫu — sửa ngoài app] …')
    ghiBai(scopeCreep, sua)
    const res = await get(`/api/bai/${scopeCreep.id}`)
    const bai = res.body as PhanHoiBai
    expect(bai.trangThaiNoiDung).toEqual({ loai: 'da-duyet', ngayDuyet: '2026-10-18' })
    expect(bai.canhBaoDuyet).toBe('doi-ngoai-app')
    expect(CAU_CANH_BAO_DUYET[bai.canhBaoDuyet!]).toBe(
      'File đã đổi ngoài app — Quét lại để kiểm tra',
    )
    expect(bai.banHien).toBe('ban-chup')
    expect(bai.hashFile).toBe(bamNoiDung(sua))
    expect(bai.bai?.khoi[0].noiDung).toBe('[Nội dung mẫu — Tóm tắt] …')
    expect(res.text).not.toContain('sửa ngoài app')
  })

  it('Đã duyệt bị sửa thành bản nháp / frontmatter lỗi ngoài app → vẫn hiện bản chụp, không lỗi', async () => {
    chenBanChup(scopeCreep, DA_DUYET)
    ghiBai(scopeCreep, BAN_NHAP)
    let bai = await layBai(scopeCreep)
    expect(bai.trangThaiNoiDung.loai).toBe('da-duyet')
    expect(bai.banHien).toBe('ban-chup')
    ghiBai(scopeCreep, '---\nloai: [hỏng\n---\n')
    bai = await layBai(scopeCreep)
    expect(bai.trangThaiNoiDung.loai).toBe('da-duyet')
    expect(bai.loiDoc).toBeNull()
    expect(bai.canhBaoDuyet).toBe('doi-ngoai-app')
    expect(bai.bai?.duKhoi).toEqual({ co: 9, tong: 9 })
  })

  it('bài đã duyệt mất file vẫn là Đã duyệt, hiện bản chụp (bất biến 7)', async () => {
    chenBanChup(scopeCreep, DA_DUYET)
    const bai = await layBai(scopeCreep)
    expect(bai.trangThaiNoiDung).toEqual({ loai: 'da-duyet', ngayDuyet: '2026-10-18' })
    expect(bai.banHien).toBe('ban-chup')
    expect(bai.canhBaoDuyet).toBe('doi-ngoai-app')
    expect(bai.hashFile).toBeNull()
    expect(bai.bai?.duKhoi).toEqual({ co: 9, tong: 9 })
  })

  it('frontmatter lỗi dòng 3 → Bản nháp + loiDoc (banner F26), bai null', async () => {
    ghiBai(changeLog, LOI_FM)
    const bai = await layBai(changeLog)
    expect(path.basename(changeLog.duongDanTuongDoi)).toBe('change-log.md')
    expect(bai.trangThaiNoiDung).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
    expect(bai.loiDoc).toEqual({
      dong: 3,
      thongBao: 'frontmatter không đọc được (lỗi cú pháp YAML)',
    })
    expect(bai.bai).toBeNull()
    expect(bai.banHien).toBe('file')
    expect(bai.canhBaoDuyet).toBeNull()
    expect(bai.hashFile).toBe(bamNoiDung(LOI_FM))
  })

  it('alias YAML vòng / alias bomb ở khoá lạ → 200, Bản nháp + loiDoc (F26), không 500', async () => {
    const bom = [
      'a: &a [x, x, x, x, x, x, x, x, x]',
      'b: &b [*a, *a, *a, *a, *a, *a, *a, *a, *a]',
      'c: &c [*b, *b, *b, *b, *b, *b, *b, *b, *b]',
    ]
    for (const them of [['vong: &v [*v]'], ['vong: &v { con: *v }'], bom]) {
      ghiBai(scopeCreep, BAN_NHAP.replace('nguon: ai\n', `nguon: tu-viet\n${them.join('\n')}\n`))
      const res = await get(`/api/bai/${scopeCreep.id}`)
      expect(res.status).toBe(200)
      const bai = res.body as PhanHoiBai
      expect(bai.trangThaiNoiDung).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
      expect(bai.loiDoc?.thongBao).toMatch(/^frontmatter có alias YAML/)
      expect(bai.bai).toBeNull()
      expect(bai.banHien).toBe('file')
    }
  })

  it('file lớn hơn 256 KB (đề xuất 1.7) → không đọc: Bản nháp · AI + loiDoc, hashFile null; đúng 256 KB vẫn đọc', async () => {
    const dem = (soByte: number) => {
      const fm =
        '---\nloai: chu-de\nnguon: tu-viet\ntrang_thai_noi_dung: ban-nhap\n---\n## Tóm tắt\n'
      return fm + 'x'.repeat(soByte - Buffer.byteLength(fm))
    }
    ghiBai(scopeCreep, dem(256 * 1024))
    let bai = await layBai(scopeCreep)
    expect(bai.loiDoc).toBeNull()
    expect(bai.trangThaiNoiDung).toEqual({ loai: 'ban-nhap', nguon: 'tu-viet' })

    ghiBai(scopeCreep, dem(256 * 1024 + 1))
    bai = await layBai(scopeCreep)
    expect(bai.trangThaiNoiDung).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
    expect(bai.loiDoc).toEqual({
      dong: 1,
      thongBao: 'file 257 KB, vượt giới hạn 256 KB của một bài — app không đọc file này',
    })
    expect(bai.bai).toBeNull()
    expect(bai.hashFile).toBeNull()
    expect(bai.banHien).toBe('file')
    expect(bai.canhBaoDuyet).toBeNull()
  })

  it('bài Đã duyệt bị thay bằng file quá 256 KB → vẫn Đã duyệt, hiện bản chụp + "đổi ngoài app"', async () => {
    chenBanChup(scopeCreep, DA_DUYET)
    ghiBai(scopeCreep, DA_DUYET + 'x'.repeat(300 * 1024))
    const bai = await layBai(scopeCreep)
    expect(bai.trangThaiNoiDung).toEqual({ loai: 'da-duyet', ngayDuyet: '2026-10-18' })
    expect(bai.banHien).toBe('ban-chup')
    expect(bai.canhBaoDuyet).toBe('doi-ngoai-app')
    expect(bai.loiDoc).toBeNull()
    expect(bai.bai?.duKhoi).toEqual({ co: 9, tong: 9 })
  })

  it('loai khác mẫu bài của mục cũng là lỗi đọc file', async () => {
    ghiBai(changeLog, BAN_NHAP)
    const bai = await layBai(changeLog)
    expect(bai.trangThaiNoiDung.loai).toBe('ban-nhap')
    expect(bai.loiDoc?.dong).toBe(3)
    expect(bai.bai).toBeNull()
  })

  it('bất biến 7: Đã duyệt + Bản nháp + Chưa có = soMucHoc', async () => {
    ghiBai(scopeCreep, DA_DUYET)
    chenBanChup(scopeCreep, DA_DUYET)
    chenBanChup(salience, DA_DUYET) // mất file
    ghiBai(riskRegister, '---\nloai: tai-lieu\nnguon: ai\ntrang_thai_noi_dung: ban-nhap\n---\n')
    ghiBai(changeLog, LOI_FM) // lỗi đọc file → Bản nháp
    ghiBai(
      chungChi,
      `---\nloai: chung-chi\ntrang_thai_noi_dung: da-duyet\nngay_duyet: 2026-10-01\n---\n`,
    )

    const dem = { 'da-duyet': 0, 'ban-nhap': 0, 'chua-co': 0 }
    for (const m of cay.mucHoc) dem[(await layBai(m)).trangThaiNoiDung.loai]++
    expect(dem).toEqual({ 'da-duyet': 2, 'ban-nhap': 3, 'chua-co': cay.soMucHoc - 5 })
    expect(dem['da-duyet'] + dem['ban-nhap'] + dem['chua-co']).toBe(cay.soMucHoc)
  })

  it('quyetDinhBai: hàm thuần cho cùng kết quả với API (không cần đĩa)', () => {
    const kq = quyetDinhBai(scopeCreep, null, {
      id: 1,
      itemId: scopeCreep.id,
      ngayDuyet: '2026-10-18',
      hash: bamNoiDung(DA_DUYET),
      noiDung: DA_DUYET,
    })
    expect(kq.trangThaiNoiDung).toEqual({ loai: 'da-duyet', ngayDuyet: '2026-10-18' })
    expect(kq.banHien).toBe('ban-chup')
    expect(quyetDinhBai(scopeCreep, null, undefined).trangThaiNoiDung).toEqual({ loai: 'chua-co' })
    const tep = { noiDung: DA_DUYET, hash: bamNoiDung(DA_DUYET) }
    expect(quyetDinhBai(scopeCreep, tep, undefined).canhBaoDuyet).toBe('chua-xac-nhan')
    expect(quyetDinhBai(scopeCreep, tep, undefined, true).canhBaoDuyet).toBe('doi-ngoai-app')
    expect(quyetDinhBai(scopeCreep, { quaLon: true, kichThuoc: 300_000 }, undefined)).toMatchObject(
      {
        trangThaiNoiDung: { loai: 'ban-nhap', nguon: 'ai' },
        loiDoc: { dong: 1 },
        hashFile: null,
      },
    )
  })
})

describe('GET /api/bai/:id — id và route (bất biến 8, 5)', () => {
  it('id không phải mục học (id lạ, lĩnh vực, phần, nhóm) → 404 tiếng Việt', async () => {
    const linhVuc = [...cay.nutTheoId.values()].find((n) => n.kind === 'area')!
    const nhom = [...cay.nutTheoId.values()].find((n) => n.kind === 'group')!
    for (const id of ['khong-co-xyz', linhVuc.id, cay.phan[0].id, nhom.id, scopeCreep.slug]) {
      const res = await get(`/api/bai/${encodeURIComponent(id)}`)
      expect(res.status).toBe(404)
      expect(res.body.loi).toContain('Không có mục học id')
    }
  })

  it('chỉ đọc: GET không đổi byte nào trong thư mục nội dung, không ghi DB; không có route ghi', async () => {
    ghiBai(scopeCreep, DA_DUYET)
    chenBanChup(scopeCreep, DA_DUYET)
    ghiBai(changeLog, LOI_FM)
    ghiBai(salience, DA_DUYET.replace('qYiMeY-dDDfq-5-ppLJHb', salience.id))
    const truoc = anhChupThuMuc(tam.noiDungDir)
    const revision = layRevision(db)
    const soBanChup = db.prepare('SELECT count(*) AS n FROM content_approvals').get()

    for (const m of [scopeCreep, changeLog, salience, riskRegister]) await layBai(m)
    expect(anhChupThuMuc(tam.noiDungDir)).toEqual(truoc)
    expect(layRevision(db)).toBe(revision)
    expect(db.prepare('SELECT count(*) AS n FROM content_approvals').get()).toEqual(soBanChup)

    for (const phuongThuc of ['put', 'post', 'delete', 'patch'] as const) {
      const goi = request(app)
      const res = await goi[phuongThuc](`/api/bai/${scopeCreep.id}`)
        .set('Host', HOST)
        .send({ noiDung: 'x' })
      expect(res.status).toBe(404)
      expect(res.body.loi).toMatch(/^Không có API/)
    }
    expect(anhChupThuMuc(tam.noiDungDir)).toEqual(truoc)
  })
})
