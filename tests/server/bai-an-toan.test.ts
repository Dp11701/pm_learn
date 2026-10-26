// An toàn của API bài học và ảnh (đề xuất 1.5 "Làm sạch", 1.6, 1.10, mục 6 "API"): path traversal,
// symlink, basename lạ, file .md chứa <script> / <img onerror> / javascript: / ảnh ra ngoài thư mục /
// SVG → không chạy script, không đọc file ngoài thư mục nội dung. Thư mục + DB tạm, cây đóng băng.
import fs from 'node:fs'
import path from 'node:path'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import cayJson from '../fixtures/roadmap-tree.json'
import cauHinhJson from '../../shared/roadmap/cau-hinh-cay.json'
import { datLech } from '../../shared/clock.ts'
import { duongDanAnh, giaiDuongDanAnh, phanLoaiLink } from '../../shared/noi-dung/index.ts'
import { dungCay, type MucHoc } from '../../shared/roadmap/index.ts'
import { taoApp } from '../../server/app.ts'
import { docCauHinh } from '../../server/cau-hinh.ts'
import { moDb, type Db } from '../../server/db/index.ts'
import { CSP_ANH } from '../../server/noi-dung/anh.ts'
import { nhanTepCoSanDongBo } from '../../server/noi-dung/quet.ts'
import { bamNoiDung } from '../../server/noi-dung/bam.ts'
import type { PhanHoiBai } from '../../server/noi-dung/hop-dong-bai.ts'
import { docTepTrongGoc, namTrongGoc } from '../../server/noi-dung/tep-an-toan.ts'
import { taoSaoLuu, type SaoLuu } from '../../server/sao-luu.ts'
import { HOST, taoThuMucTam, type ThuMucTam } from './tro-giup.ts'

const cay = dungCay(cayJson, cauHinhJson)
const FIXTURE = path.resolve(import.meta.dirname, '../fixtures/noi-dung')
const scopeCreep = cay.mucHoc.find((m) => m.label === 'Scope Creep')!
const BAN_NHAP = fs.readFileSync(path.join(FIXTURE, 'chu-de-ban-nhap.md'), 'utf8')
const NGUY_HIEM = fs.readFileSync(path.join(FIXTURE, 'chu-de-nguy-hiem.md'), 'utf8')

// Byte giả của ảnh: đủ để so nguyên văn, không cần là ảnh hợp lệ
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4])
const SVG_CO_SCRIPT =
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="1" height="1"/></svg>'
const BI_MAT = 'BI-MAT-NGOAI-THU-MUC-NOI-DUNG'

let tam: ThuMucTam
let db: Db
let saoLuu: SaoLuu
let app: ReturnType<typeof taoApp>
/** Thư mục của file bài Scope Creep (noi-dung/<phần>/<lĩnh vực>) */
let thuMucBai: string
/** Thư mục ngoài thư mục nội dung, chứa file "bí mật" */
let ngoai: string

beforeEach(async () => {
  datLech(0)
  tam = taoThuMucTam()
  db = await moDb(path.join(tam.dataDir, 'hoc.db'))
  saoLuu = taoSaoLuu({ db, dataDir: tam.dataDir, noiDungDir: tam.noiDungDir })
  const cauHinh = docCauHinh({ DATA_DIR: tam.dataDir, NOI_DUNG_DIR: tam.noiDungDir })
  app = taoApp({ cauHinh, db, saoLuu, soMucHoc: cay.soMucHoc, cay })
  thuMucBai = path.join(tam.noiDungDir, path.dirname(scopeCreep.duongDanTuongDoi))
  fs.mkdirSync(thuMucBai, { recursive: true })
  ngoai = path.join(tam.goc, 'ngoai')
  fs.mkdirSync(ngoai)
  fs.writeFileSync(path.join(ngoai, 'bi-mat.png'), BI_MAT)
  fs.writeFileSync(path.join(ngoai, 'bi-mat.md'), `${BAN_NHAP}\n${BI_MAT}\n`)
  fs.writeFileSync(path.join(tam.dataDir, 'bi-mat.png'), BI_MAT)
})

afterEach(async () => {
  await saoLuu.choXong()
  db.close()
  tam.xoa()
})

const get = (url: string) => request(app).get(url).set('Host', HOST)
const urlBai = (m: MucHoc) => `/api/bai/${encodeURIComponent(m.id)}`
const anh = (duongDan: string) => get(duongDanAnh(scopeCreep.id, duongDan))
const tepBai = () => path.join(tam.noiDungDir, scopeCreep.duongDanTuongDoi)

/** Phản hồi lỗi JSON, không mang byte của file nào */
function laLoiJson(res: request.Response, status: number): void {
  expect(res.status).toBe(status)
  expect(res.headers['content-type']).toMatch(/^application\/json/)
  expect(typeof res.body.loi).toBe('string')
  expect(res.text).not.toContain(BI_MAT)
  expect(res.text).not.toContain('SQLite format 3')
}

describe('docTepTrongGoc / namTrongGoc', () => {
  it('namTrongGoc: chỉ đường dẫn nằm hẳn bên trong gốc', () => {
    expect(namTrongGoc('/a/b', '/a/b/c')).toBe(true)
    expect(namTrongGoc('/a/b', '/a/b/..c/d')).toBe(true)
    expect(namTrongGoc('/a/b', '/a/b')).toBe(false)
    expect(namTrongGoc('/a/b', '/a/bc')).toBe(false)
    expect(namTrongGoc('/a/b', '/a')).toBe(false)
    expect(namTrongGoc('/a/b', '/x/b/c')).toBe(false)
  })

  it('từ chối thành phần rỗng, ".", "..", "\\", NUL, đường dẫn tuyệt đối', async () => {
    for (const p of [
      '',
      '/etc/x.md',
      'a//b.md',
      './a.md',
      'a/../b.md',
      '..',
      'a\\b.md',
      'a\0.md',
    ]) {
      expect(await docTepTrongGoc(tam.noiDungDir, p)).toEqual({ ok: false, lyDo: 'ngoai-thu-muc' })
    }
  })

  it('symlink ở file hoặc ở thư mục giữa đường → từ chối; thư mục → không phải file', async () => {
    fs.symlinkSync(path.join(ngoai, 'bi-mat.md'), path.join(thuMucBai, 'lien-ket.md'))
    fs.symlinkSync(ngoai, path.join(tam.noiDungDir, 'thu-muc-lien-ket'))
    fs.mkdirSync(path.join(thuMucBai, 'thu-muc.md'))
    const tuongDoi = path.dirname(scopeCreep.duongDanTuongDoi)
    expect(await docTepTrongGoc(tam.noiDungDir, `${tuongDoi}/lien-ket.md`)).toEqual({
      ok: false,
      lyDo: 'symlink',
    })
    expect(await docTepTrongGoc(tam.noiDungDir, 'thu-muc-lien-ket/bi-mat.md')).toEqual({
      ok: false,
      lyDo: 'symlink',
    })
    expect(await docTepTrongGoc(tam.noiDungDir, `${tuongDoi}/thu-muc.md`)).toEqual({
      ok: false,
      lyDo: 'khong-phai-file',
    })
    expect(await docTepTrongGoc(tam.noiDungDir, `${tuongDoi}/${'x'.repeat(300)}.md`)).toEqual({
      ok: false,
      lyDo: 'khong-co',
    })
  })

  it('gốc là symlink (vd. /var → /private/var trên macOS) vẫn đọc được file bên trong', async () => {
    const gocLienKet = path.join(tam.goc, 'goc-lien-ket')
    fs.symlinkSync(tam.noiDungDir, gocLienKet)
    fs.writeFileSync(tepBai(), BAN_NHAP)
    const kq = await docTepTrongGoc(gocLienKet, scopeCreep.duongDanTuongDoi)
    expect(kq.ok && kq.noiDung.toString('utf8')).toBe(BAN_NHAP)
  })
})

describe('GET /api/bai/:id — symlink, file lạ (1.6)', () => {
  it('file bài là symlink ra ngoài → coi như không có file, không lộ nội dung', async () => {
    fs.symlinkSync(path.join(ngoai, 'bi-mat.md'), tepBai())
    const res = await get(urlBai(scopeCreep))
    expect(res.status).toBe(200)
    expect((res.body as PhanHoiBai).trangThaiNoiDung).toEqual({ loai: 'chua-co' })
    expect(res.text).not.toContain(BI_MAT)
  })

  it('thư mục lĩnh vực / phần là symlink ra ngoài → không đọc', async () => {
    fs.rmSync(thuMucBai, { recursive: true })
    fs.writeFileSync(
      path.join(ngoai, path.basename(scopeCreep.duongDanTuongDoi)),
      BAN_NHAP + BI_MAT,
    )
    fs.symlinkSync(ngoai, thuMucBai)
    let res = await get(urlBai(scopeCreep))
    expect((res.body as PhanHoiBai).trangThaiNoiDung).toEqual({ loai: 'chua-co' })
    expect(res.text).not.toContain(BI_MAT)

    const phan = path.join(tam.noiDungDir, scopeCreep.phan.slug)
    fs.rmSync(phan, { recursive: true })
    const ngoaiPhan = path.join(tam.goc, 'ngoai-phan')
    const [, linhVuc, tenTep] = scopeCreep.duongDanTuongDoi.split('/')
    fs.mkdirSync(path.join(ngoaiPhan, linhVuc), { recursive: true })
    fs.writeFileSync(path.join(ngoaiPhan, linhVuc, tenTep), BAN_NHAP + BI_MAT)
    fs.symlinkSync(ngoaiPhan, phan)
    res = await get(urlBai(scopeCreep))
    expect((res.body as PhanHoiBai).trangThaiNoiDung).toEqual({ loai: 'chua-co' })
    expect(res.text).not.toContain(BI_MAT)
  })

  it('bài Đã duyệt bị thay bằng symlink (dù trùng nội dung) → hiện bản chụp + đổi ngoài app', async () => {
    const dongNgoai = path.join(ngoai, 'trung.md')
    fs.writeFileSync(dongNgoai, BAN_NHAP)
    db.prepare(
      `INSERT INTO content_approvals (item_id, approved_on, hash, body, created_at, updated_at)
       VALUES (?, '2026-10-18', ?, ?, 'x', 'x')`,
    ).run(scopeCreep.id, bamNoiDung(BAN_NHAP), BAN_NHAP)
    fs.symlinkSync(dongNgoai, tepBai())
    const bai = (await get(urlBai(scopeCreep))).body as PhanHoiBai
    expect(bai.trangThaiNoiDung.loai).toBe('da-duyet')
    expect(bai.banHien).toBe('ban-chup')
    expect(bai.canhBaoDuyet).toBe('doi-ngoai-app')
    expect(bai.hashFile).toBeNull()
  })

  it('đường dẫn bài là thư mục → coi như không có file', async () => {
    fs.mkdirSync(tepBai())
    expect((await get(urlBai(scopeCreep))).body.trangThaiNoiDung).toEqual({ loai: 'chua-co' })
  })

  it('id lạ dạng đường dẫn → 404, không đọc gì', async () => {
    for (const id of ['..', '%2e%2e%2f%2e%2e%2fdata%2fhoc.db', 'a%00b', '..%5C..%5Cx']) {
      laLoiJson(await get(`/api/bai/${id}`), 404)
    }
  })
})

describe('.md chứa HTML / link / ảnh nguy hiểm (mục 6)', () => {
  beforeEach(() => {
    fs.writeFileSync(tepBai(), NGUY_HIEM)
    // Từ phase 2b bài chỉ đọc file đã nhận (sổ nội dung)
    nhanTepCoSanDongBo(db, tam.noiDungDir, {
      duongDan: scopeCreep.duongDanTuongDoi,
      itemId: scopeCreep.id,
      vai: 'bai',
    })
    fs.writeFileSync(path.join(thuMucBai, 'x.svg'), SVG_CO_SCRIPT)
  })

  it('API trả bài dạng dữ liệu JSON (nosniff), chữ HTML giữ nguyên để web hiện thành chữ', async () => {
    const res = await get(urlBai(scopeCreep))
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    const bai = res.body as PhanHoiBai
    expect(bai.trangThaiNoiDung).toEqual({ loai: 'ban-nhap', nguon: 'tu-viet' })
    const tomTat = bai.bai!.khoi.find((k) => k.mau?.id === 'tom-tat')!
    expect(tomTat.noiDung).toContain('<script>alert(1)</script>')
    expect(tomTat.noiDung).toContain('<img src="x" onerror="alert(1)">')
  })

  it('link javascript: bị chặn; ảnh ../../data/hoc.db không thành ảnh; x.svg thành ảnh qua API', () => {
    expect(phanLoaiLink('javascript:alert(1)')).toEqual({ loai: 'chan' })
    expect(giaiDuongDanAnh(scopeCreep.duongDanTuongDoi, '../../data/hoc.db')).toBeNull()
    expect(giaiDuongDanAnh(scopeCreep.duongDanTuongDoi, 'x.svg')).toBe(
      `${path.dirname(scopeCreep.duongDanTuongDoi)}/x.svg`,
    )
  })

  it('GET ảnh ../../data/hoc.db và mọi biến thể ra DB thật → 400, không có byte nào của DB', async () => {
    fs.mkdirSync(path.join(tam.noiDungDir, 'data'), { recursive: true })
    fs.copyFileSync(path.join(tam.dataDir, 'hoc.db'), path.join(tam.noiDungDir, 'data', 'hoc.db'))
    for (const p of ['../../data/hoc.db', '../../../data/hoc.db', '../../../data/hoc.db.png']) {
      laLoiJson(await anh(p), 400)
    }
  })

  it('SVG chứa <script> được phục vụ với CSP sandbox + nosniff (script không chạy kể cả mở trực tiếp)', async () => {
    const res = await anh('x.svg')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/^image\/svg\+xml/)
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    )
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin')
  })
})

describe('GET /api/anh/:id (1.5)', () => {
  beforeEach(() => {
    fs.mkdirSync(path.join(thuMucBai, 'hinh'))
    fs.writeFileSync(path.join(thuMucBai, 'hinh', 'a.png'), PNG)
  })

  it('ảnh trong thư mục của bài → 200, đúng byte, Content-Type theo đuôi, CSP + nosniff', async () => {
    const res = await anh('hinh/a.png').buffer(true)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('image/png')
    expect(Buffer.compare(res.body as Buffer, PNG)).toBe(0)
    expect(res.headers['content-security-policy']).toBe(CSP_ANH)
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['cache-control']).toBe('no-store')
  })

  it('mỗi đuôi được phép có Content-Type đúng (không phân biệt hoa thường)', async () => {
    const loai: Record<string, string> = {
      'b.JPG': 'image/jpeg',
      'c.jpeg': 'image/jpeg',
      'd.gif': 'image/gif',
      'e.webp': 'image/webp',
      'f.Svg': 'image/svg+xml',
      'g.png': 'image/png',
    }
    for (const [ten, kieu] of Object.entries(loai)) {
      fs.writeFileSync(path.join(thuMucBai, ten), PNG)
      const res = await anh(ten)
      expect(res.status, ten).toBe(200)
      expect(res.headers['content-type'].split(';')[0], ten).toBe(kieu)
    }
  })

  it('đường dẫn viết như trong Markdown: %20, ./, ../ vẫn trong thư mục nội dung', async () => {
    fs.writeFileSync(path.join(thuMucBai, 'hinh', 'a b.png'), PNG)
    const linhVucKhac = path.join(tam.noiDungDir, scopeCreep.phan.slug, 'linh-vuc-khac')
    fs.mkdirSync(linhVucKhac)
    fs.writeFileSync(path.join(linhVucKhac, 'c.png'), PNG)
    expect((await anh('hinh/a%20b.png')).status).toBe(200)
    expect((await anh('./hinh/a.png')).status).toBe(200)
    expect((await anh('../linh-vuc-khac/c.png')).status).toBe(200)
    expect((await anh('hinh/a.png?v=2#x')).status).toBe(200)
  })

  it('path traversal, đường dẫn tuyệt đối, giao thức, basename lạ, đuôi lạ → 400', async () => {
    const ds = [
      '../../../ngoai/bi-mat.png',
      '../../../data/bi-mat.png',
      '../../../../ngoai/bi-mat.png',
      '..%2F..%2F..%2Fngoai%2Fbi-mat.png',
      '%2e%2e/%2e%2e/%2e%2e/ngoai/bi-mat.png',
      '..\\..\\..\\ngoai\\bi-mat.png',
      `${tam.goc}/ngoai/bi-mat.png`,
      '/etc/hosts.png',
      '//example.com/x.png',
      'file:///etc/x.png',
      'https://example.com/x.png',
      'data:image/png;base64,AAAA',
      'C:\\x.png',
      'hinh/a.png%00.md',
      'hinh/a.png\0',
      '.thung-rac/a.png',
      '~tam/a.png',
      'hinh/.an.png',
      '.png',
      'hinh/a.md',
      'hinh/a.html',
      'hinh/a.svgz',
      'hinh/a',
      '%',
    ]
    for (const p of ds) {
      const res = await anh(p)
      expect(res.status, p).toBe(400)
      laLoiJson(res, 400)
    }
    // Mã hoá 2 lần chỉ giải 1 lần: thành tên file có dấu % trong thư mục của bài → 404, không ra ngoài
    laLoiJson(await anh('%252e%252e%252f%252e%252e%252f%252e%252e%252fngoai%252fbi-mat.png'), 404)
  })

  it('symlink (file hoặc thư mục) trong thư mục nội dung trỏ ra ngoài → 404, không lộ byte', async () => {
    fs.symlinkSync(path.join(ngoai, 'bi-mat.png'), path.join(thuMucBai, 'lien-ket.png'))
    fs.symlinkSync(ngoai, path.join(thuMucBai, 'thu-muc-lien-ket'))
    fs.symlinkSync(path.join(thuMucBai, 'hinh', 'a.png'), path.join(thuMucBai, 'trong.png'))
    laLoiJson(await anh('lien-ket.png'), 404)
    laLoiJson(await anh('thu-muc-lien-ket/bi-mat.png'), 404)
    // kể cả symlink trỏ vào chính thư mục nội dung
    laLoiJson(await anh('trong.png'), 404)
  })

  it('không có file, thư mục mang đuôi ảnh → 404; thiếu hoặc lặp duong-dan → 400', async () => {
    fs.mkdirSync(path.join(thuMucBai, 'thu-muc.png'))
    laLoiJson(await anh('khong-co.png'), 404)
    laLoiJson(await anh('thu-muc.png'), 404)
    laLoiJson(await get(`/api/anh/${scopeCreep.id}`), 400)
    laLoiJson(await get(`/api/anh/${scopeCreep.id}?duong-dan=`), 400)
    laLoiJson(await get(`/api/anh/${scopeCreep.id}?duong-dan=hinh/a.png&duong-dan=x.png`), 400)
  })

  it('id không phải mục học → 404', async () => {
    const linhVuc = [...cay.nutTheoId.values()].find((n) => n.kind === 'area')!
    for (const id of ['khong-co', linhVuc.id, cay.phan[0].id]) {
      laLoiJson(await get(`/api/anh/${id}?duong-dan=hinh%2Fa.png`), 404)
    }
  })

  it('dạng đường dẫn trong path /api/anh/:id/<src> cùng quy tắc', async () => {
    const res = await get(`/api/anh/${scopeCreep.id}/hinh/a.png`).buffer(true)
    expect(res.status).toBe(200)
    expect(res.headers['content-security-policy']).toBe(CSP_ANH)
    expect(Buffer.compare(res.body as Buffer, PNG)).toBe(0)
    laLoiJson(await get(`/api/anh/${scopeCreep.id}/..%2F..%2F..%2Fngoai%2Fbi-mat.png`), 400)
    laLoiJson(await get(`/api/anh/${scopeCreep.id}/hinh/a.md`), 400)
    fs.symlinkSync(path.join(ngoai, 'bi-mat.png'), path.join(thuMucBai, 'lien-ket.png'))
    laLoiJson(await get(`/api/anh/${scopeCreep.id}/lien-ket.png`), 404)
  })

  it('Host / Origin lạ → 403 cho cả /api/bai và /api/anh', async () => {
    for (const url of [urlBai(scopeCreep), duongDanAnh(scopeCreep.id, 'hinh/a.png')]) {
      expect((await request(app).get(url).set('Host', 'evil.test:5321')).status).toBe(403)
      const res = await request(app).get(url).set('Host', HOST).set('Origin', 'http://evil.test')
      expect(res.status).toBe(403)
      expect(res.text).not.toContain('PNG')
    }
  })
})
