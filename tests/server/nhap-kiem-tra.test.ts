// POST /api/nhap/kiem-tra (đề xuất 1.7, 3.8, 0.1 Dice; F22; mục 6 "lô 15 file F22 → 11/2/1/1, Nhập 13 file,
// risk-assessment.md không gán sẵn"): khớp theo id / tên file / tên gốc / Dice / ?muc=, đủ 6 loại kết quả,
// không ghi file, bản tạm cho file lỗi, giới hạn 256 KB / 250 file / 16 MB, tên file lạ, token 410.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { seedMau } from '../../fixtures/mau/seed.ts'
import { THU_MUC_NOI_DUNG_MAU } from '../../fixtures/mau/tao-noi-dung.ts'
import { docBoDem, ghiBoDem } from '../../server/du-lieu/bo-dem-soan.ts'
import { ghiSlugCu } from '../../server/du-lieu/slug-cu.ts'
import type { KetQuaFile, PhanHoiKiemTra } from '../../server/nhap/hop-dong.ts'
import { dice } from '../../server/nhap/khop.ts'
import { THOI_HAN_LO_MS, donBoDemNhapMoCoi, lucTaoCuaToken } from '../../server/nhap/lo.ts'
import { laGioMau } from '../mau/ho-tro.ts'
import { quaPhut } from './tro-giup.ts'
import {
  TEN_F22,
  baiDaDuyet,
  baiNhap,
  cay,
  loF22,
  muc,
  taoMoiTruongNhap,
  type MoiTruongNhap,
} from '../fixtures/nhap/moi-truong.ts'

let mt: MoiTruongNhap
beforeEach(async () => {
  mt = await taoMoiTruongNhap()
})
afterEach(async () => {
  await mt.dong()
})

async function kiemTra(body: object): Promise<PhanHoiKiemTra> {
  const res = await mt.post('/api/nhap/kiem-tra', body)
  expect(res.status, JSON.stringify(res.body)).toBe(200)
  return res.body as PhanHoiKiemTra
}

const scopeCreep = muc('Scope Creep')
const riskRegister = muc('Risk Register')

function dongTheoTen(kq: PhanHoiKiemTra, ten: string): KetQuaFile {
  const d = kq.ketQua.find((k) => k.ten === ten)
  if (!d) throw new Error(ten)
  return d
}

describe('lô F22', () => {
  it('15 file → 11 hợp lệ · 2 cảnh báo · 1 trùng · 1 lỗi; "Nhập 13 file"; không ghi file nào', async () => {
    mt.daDuyet(scopeCreep)
    const truoc = mt.dsFile()
    const kq = await kiemTra({ files: loF22() })
    expect(kq.token).toMatch(/^[0-9a-f]{32}$/)
    expect(kq.ketQua.map((k) => k.ten)).toEqual([...TEN_F22])
    expect(kq.ketQua.map((k) => k.chiSo)).toEqual(TEN_F22.map((_, i) => i))
    expect(kq.tomTat).toEqual({ hopLe: 11, canhBao: 2, trung: 1, loi: 1 })
    expect(kq.soNhapDuoc).toBe(13)
    expect(mt.dsFile()).toEqual(truoc)

    for (const k of kq.ketQua.slice(0, 11)) {
      expect(k, k.ten).toMatchObject({ loai: 'hop-le', khopTheo: 'id', ganSan: false, thieu: [] })
      expect(k.muc?.slug).toBe(k.ten.replace(/\.md$/, ''))
    }
    expect(dongTheoTen(kq, 'risk-appetite.md')).toMatchObject({
      loai: 'thieu-khoi',
      thieu: ['Tự kiểm tra', 'Tham khảo'],
      khopTheo: 'id',
    })
    expect(dongTheoTen(kq, 'risk-registr.md')).toMatchObject({
      loai: 'khong-khop',
      ganSan: true,
      muc: { id: riskRegister.id, slug: 'risk-register', label: 'Risk Register' },
      ungVien: [],
      khopTheo: 'goi-y',
      thieu: [],
    })
    expect(dongTheoTen(kq, 'scope-creep.md')).toMatchObject({
      loai: 'trung-da-duyet',
      muc: { id: scopeCreep.id },
      ghiChu: 'Bản hiện tại duyệt 18/10/2026',
      khopTheo: 'id',
    })
    const vuca = dongTheoTen(kq, 'vuca.md')
    expect(vuca).toMatchObject({
      loai: 'loi',
      muc: { slug: 'vuca' },
      khopTheo: 'ten-file',
      loi: { dong: 3, thongBao: 'thiếu dấu ":" sau loai' },
      khoaBoDem: `nhap:${kq.token}:14`,
    })
    // Câu lỗi đúng nguyên văn F22 (nháy thẳng; bảng tab Nhập của F21 hiện "Dòng n: …")
    const f21 = fs.readFileSync(
      fileURLToPath(
        new URL('../../docs/design-handoff/design/F21-noi-dung-do-phu.dc.html', import.meta.url),
      ),
      'utf8',
    )
    expect(f21).toContain(`'Dòng 3: ${vuca.loi?.thongBao}'`)
    // File lỗi: bản tạm trong editor_buffers, không ghi ra đĩa
    expect(docBoDem(mt.db, vuca.khoaBoDem as string)).toMatchObject({
      itemId: muc('VUCA').id,
      text: loF22()[14].noiDung,
      baseHash: null,
    })
    for (const k of kq.ketQua.filter((x) => x.loai !== 'loi')) expect(k.khoaBoDem).toBeNull()
  })

  // Bộ mẫu seed theo giờ Việt Nam: ở múi giờ khác thì bỏ qua (như tests/mau), `npm test` chạy ở Asia/Ho_Chi_Minh
  it.skipIf(!laGioMau)(
    'trên bộ dữ liệu mẫu (seed mac-dinh: 41 Đã duyệt + 9 Bản nháp) cũng ra 11/2/1/1 và 13',
    async () => {
      fs.cpSync(THU_MUC_NOI_DUNG_MAU, mt.tam.noiDungDir, { recursive: true })
      seedMau({ db: mt.db, cay, noiDungDir: mt.tam.noiDungDir })
      const kq = await kiemTra({ files: loF22() })
      expect(kq.tomTat).toEqual({ hopLe: 11, canhBao: 2, trung: 1, loi: 1 })
      expect(kq.soNhapDuoc).toBe(13)
      expect(dongTheoTen(kq, 'scope-creep.md').ghiChu).toBe('Bản hiện tại duyệt 18/10/2026')
      // Risk Register của bộ mẫu là Bản nháp: nhập sẽ thay (bản cũ vào thùng rác)
      expect(dongTheoTen(kq, 'risk-registr.md')).toMatchObject({ ganSan: true, thayBanNhap: true })
    },
  )
})

describe('khớp mục (1.7)', () => {
  it('Dice: risk-registr → Risk Register 0,87 gán sẵn; risk-assessment → 0,700 / 0,683 không gán sẵn', async () => {
    expect(dice('risk registr', 'risk register')).toBeCloseTo(0.87, 2)
    const kq = await kiemTra({
      files: [
        {
          ten: 'risk-assessment.md',
          noiDung: baiNhap(muc('Qualitative Risk Assessment'), '', false),
        },
      ],
    })
    expect(kq.ketQua[0]).toMatchObject({ loai: 'khong-khop', ganSan: false, muc: null })
    expect(kq.ketQua[0].ungVien).toEqual([
      expect.objectContaining({ slug: 'qualitative-risk-assessment', diem: 0.7 }),
      expect.objectContaining({ slug: 'quantitative-risk-assessment', diem: 0.683 }),
    ])
    expect(kq.soNhapDuoc).toBe(0)
  })

  it('tên gốc (steering-comittee.md), slug cũ, .ban-sua; id lạ → khớp tên + "id không có trong cây"', async () => {
    const steering = muc('Steering Committee')
    ghiSlugCu(mt.db, 'ten-cu-cua-pestle', muc('PESTLE').id)
    const kq = await kiemTra({
      files: [
        { ten: 'steering-comittee.md', noiDung: baiNhap(steering, '', false) },
        { ten: 'ten-cu-cua-pestle.md', noiDung: baiNhap(muc('PESTLE'), '', false) },
        { ten: 'risk-register.ban-sua.md', noiDung: baiNhap(riskRegister, '', false) },
        {
          ten: 'bani.md',
          noiDung: baiNhap(muc('BANI'), '', false).replace('---\n', '---\nid: khong-co-id-nay\n'),
        },
      ],
    })
    expect(kq.ketQua.map((k) => [k.muc?.id, k.khopTheo, k.ghiChu])).toEqual([
      [steering.id, 'ten-file', null],
      [muc('PESTLE').id, 'ten-file', null],
      [riskRegister.id, 'ten-file', null],
      [muc('BANI').id, 'ten-file', 'id không có trong cây'],
    ])
  })

  it('id có trong cây thắng tên file; file thứ hai của cùng mục → Không khớp mục (ứng viên là mục đó)', async () => {
    const pestle = muc('PESTLE')
    const kq = await kiemTra({
      files: [
        { ten: 'pestle.md', noiDung: baiNhap(pestle, '', false) },
        { ten: 'ten-bat-ky.md', noiDung: baiNhap(pestle) },
      ],
    })
    // file 1 khớp theo id (bậc cao hơn tên file) nên giành mục; file 0 thành file thứ hai
    expect(kq.ketQua[1]).toMatchObject({
      loai: 'thieu-khoi',
      muc: { id: pestle.id },
      khopTheo: 'id',
    })
    expect(kq.ketQua[0]).toMatchObject({ loai: 'khong-khop', muc: null, ganSan: false })
    expect(kq.ketQua[0].ungVien[0]).toMatchObject({ id: pestle.id, diem: 1 })
    expect(kq.ketQua[0].ghiChu).toContain('ten-bat-ky.md')
    expect(kq.soNhapDuoc).toBe(1)
  })

  it('?muc= gán sẵn file không khớp id / tên (một file), file khớp vẫn theo id', async () => {
    const salience = muc('Salience Model')
    const kq = await kiemTra({
      mucMacDinh: salience.id,
      files: [
        { ten: 'bai-moi.md', noiDung: baiNhap(salience, '', false) },
        { ten: 'bai-moi-2.md', noiDung: baiNhap(salience, '', false) },
        { ten: 'pestle.md', noiDung: baiNhap(muc('PESTLE')) },
      ],
    })
    expect(kq.ketQua[0]).toMatchObject({
      loai: 'khong-khop',
      ganSan: true,
      muc: { id: salience.id },
      khopTheo: 'gan-san',
    })
    expect(kq.ketQua[1]).toMatchObject({ loai: 'khong-khop', ganSan: false, muc: null })
    expect(kq.ketQua[2]).toMatchObject({ muc: { slug: 'pestle' }, khopTheo: 'id' })
    expect(kq.soNhapDuoc).toBe(2)
  })

  it('gán sẵn cho mục Đã duyệt → ghi chú "thành bản sửa"', async () => {
    mt.daDuyet(scopeCreep)
    const kq = await kiemTra({
      files: [{ ten: 'scope-crep.md', noiDung: baiNhap(scopeCreep, '', false) }],
    })
    expect(kq.ketQua[0]).toMatchObject({
      loai: 'khong-khop',
      ganSan: true,
      muc: { id: scopeCreep.id },
    })
    expect(kq.ketQua[0].ghiChu).toContain('bản sửa')
  })
})

describe('đủ 6 loại kết quả (3.8)', () => {
  it('◎ file da-duyet, DB chưa có bản chụp nào của mục', async () => {
    const pestle = muc('PESTLE')
    const kq = await kiemTra({ files: [{ ten: 'pestle.md', noiDung: baiDaDuyet(pestle) }] })
    expect(kq.ketQua[0]).toMatchObject({
      loai: 'chua-chup',
      muc: { id: pestle.id },
      chuyenVeBanNhap: false,
    })
    expect(kq.tomTat).toEqual({ hopLe: 0, canhBao: 0, trung: 0, loi: 0 })
    expect(kq.soNhapDuoc).toBe(0)
  })

  it('✕ loai khác mẫu của mục; file không có frontmatter; mục có bản nháp → thayBanNhap', async () => {
    const pestle = muc('PESTLE')
    mt.coBanNhap(muc('BANI'))
    const kq = await kiemTra({
      files: [
        { ten: 'pestle.md', noiDung: baiNhap(pestle).replace('loai: chu-de', 'loai: tai-lieu') },
        { ten: 'ghi-chu.md', noiDung: '# chỉ là ghi chú\n' },
        { ten: 'bani.md', noiDung: baiNhap(muc('BANI')) },
      ],
    })
    expect(kq.ketQua[0]).toMatchObject({
      loai: 'loi',
      muc: { id: pestle.id },
      loi: { dong: 3, thongBao: 'loai “tai-lieu” khác mẫu bài của mục này (chu-de)' },
    })
    expect(kq.ketQua[1]).toMatchObject({ loai: 'loi', muc: null, loi: { dong: 1 } })
    expect(kq.ketQua[1].khoaBoDem).toBe(`nhap:${kq.token}:1`)
    expect(kq.ketQua[2]).toMatchObject({ loai: 'thieu-khoi', thayBanNhap: true })
  })

  it('file chưa nhận nằm ở đường dẫn đích → thayBanNhap (bản đó vào thùng rác khi nhập)', async () => {
    const pestle = muc('PESTLE')
    mt.ghi(pestle.duongDanTuongDoi, baiNhap(pestle, 'giai_nghia: claude ghi\n'))
    const kq = await kiemTra({ files: [{ ten: 'pestle.md', noiDung: baiNhap(pestle) }] })
    expect(kq.ketQua[0].thayBanNhap).toBe(true)
  })
})

describe('an toàn, giới hạn (1.6, 1.7)', () => {
  it('tên file lạ / đường dẫn → 400, không ghi gì; duongDan bị bỏ qua', async () => {
    for (const ten of [
      '../../hoc.md',
      'a/b.md',
      'a\\b.md',
      'x.MD',
      'x.txt',
      '.md',
      `${'a'.repeat(201)}.md`,
    ]) {
      const res = await mt.post('/api/nhap/kiem-tra', { files: [{ ten, noiDung: 'x' }] })
      expect(res.status, ten).toBe(400)
      expect(res.body.loi).toMatch(/Tên file không hợp lệ/)
    }
    const kq = await kiemTra({
      files: [
        {
          ten: 'pestle.md',
          noiDung: baiNhap(muc('PESTLE')),
          duongDan: '../../../../etc/pestle.md',
        },
      ],
    })
    expect(kq.ketQua[0].muc?.slug).toBe('pestle')
    expect(mt.dsFile()).toEqual([])
  })

  it('file > 256 KB → 413; > 250 file → 413; body > 16 MB → 413; sai dạng → 400', async () => {
    const lon = await mt.post('/api/nhap/kiem-tra', {
      files: [{ ten: 'x.md', noiDung: 'a'.repeat(256 * 1024 + 1) }],
    })
    expect(lon.status).toBe(413)
    expect(lon.body.loi).toBe('“x.md” lớn hơn 256 KB — app không nhận file này.')
    const vua = await mt.post('/api/nhap/kiem-tra', {
      files: [{ ten: 'x.md', noiDung: 'a'.repeat(256 * 1024) }],
    })
    expect(vua.status).toBe(200)

    const nhieu = await mt.post('/api/nhap/kiem-tra', {
      files: Array.from({ length: 251 }, (_, i) => ({ ten: `f${i}.md`, noiDung: 'x' })),
    })
    expect(nhieu.status).toBe(413)
    expect(nhieu.body.loi).toBe('Mỗi lần nhập tối đa 250 file.')
    const du = await mt.post('/api/nhap/kiem-tra', {
      files: Array.from({ length: 250 }, (_, i) => ({ ten: `f${i}.md`, noiDung: 'x' })),
    })
    expect(du.status).toBe(200)

    const quaKho = await mt.post('/api/nhap/kiem-tra', {
      files: Array.from({ length: 70 }, (_, i) => ({
        ten: `f${i}.md`,
        noiDung: 'a'.repeat(250_000),
      })),
    })
    expect(quaKho.status).toBe(413)
    expect(quaKho.body.loi).toBe('Dữ liệu gửi lên quá lớn (tối đa 16 MB).')

    for (const body of [{}, { files: 'x' }, { files: [] }, { files: [{ ten: 'a.md' }] }]) {
      const res = await mt.post('/api/nhap/kiem-tra', body)
      expect(res.status, JSON.stringify(body)).toBe(400)
    }
    const mucLa = await mt.post('/api/nhap/kiem-tra', {
      files: [{ ten: 'a.md', noiDung: 'x' }],
      mucMacDinh: 'khong-co',
    })
    expect(mucLa.status).toBe(400)
  })

  it('16 MB chỉ ở /api/nhap/*: API khác vẫn 1 MB', async () => {
    const res = await mt
      .post('/api/noi-dung/giu-ban-cu/x')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ x: 'a'.repeat(1024 * 1024 + 10) }))
    expect(res.status).toBe(413)
  })

  it('chuẩn hoá chữ: BOM, CRLF, NFD → NFC (khớp như nhau)', async () => {
    const pestle = muc('PESTLE')
    const goc = baiNhap(pestle)
    const kq = await kiemTra({
      files: [
        { ten: 'pestle.md', noiDung: `\uFEFF${goc.normalize('NFD').replace(/\n/g, '\r\n')}` },
      ],
    })
    expect(kq.ketQua[0]).toMatchObject({ loai: 'thieu-khoi', muc: { id: pestle.id } })
  })
})

describe('token lô', () => {
  it('quá 30 phút → 410 tiếng Việt; bản tạm chưa sửa bị xoá, bản tạm đã sửa được giữ', async () => {
    const kq = await kiemTra({
      files: [
        { ten: 'a.md', noiDung: '# không frontmatter\n' },
        { ten: 'b.md', noiDung: '# không frontmatter 2\n' },
      ],
    })
    const [a, b] = kq.ketQua.map((k) => k.khoaBoDem as string)
    mt.db.prepare('UPDATE editor_buffers SET text = ? WHERE key = ?').run('đã sửa', b)
    quaPhut(THOI_HAN_LO_MS / 60000 + 1)
    const res = await mt.post('/api/nhap/thuc-hien', {
      token: kq.token,
      gan: {},
      xuLyTrung: {},
      nhanDaDuyet: [],
    })
    expect(res.status).toBe(410)
    expect(res.body.loi).toMatch(/hết hạn/)
    expect(docBoDem(mt.db, a)).toBeUndefined()
    expect(docBoDem(mt.db, b)?.text).toBe('đã sửa')
  })

  it('khởi động lại (lô mất cùng tiến trình): bản tạm chưa sửa bị xoá, bản tạm đã sửa được giữ (review 2b #8)', async () => {
    const kq = await kiemTra({
      files: [
        { ten: 'a.md', noiDung: '# không frontmatter\n' },
        { ten: 'b.md', noiDung: '# không frontmatter 2\n' },
      ],
    })
    // Token mang thời điểm tạo lô; bản tạm ghi updated_at đúng lúc đó
    const luc = lucTaoCuaToken(kq.token)
    const [a, b] = kq.ketQua.map((k) => k.khoaBoDem as string)
    expect(Date.parse(docBoDem(mt.db, a)?.updatedAt ?? '')).toBe(luc)
    // Trình soạn tự lưu bản b (updated_at đổi); bản tạm của file nội dung (không phải nhap:) không bị đụng
    quaPhut(1)
    ghiBoDem(mt.db, { key: b, itemId: null, text: 'đã sửa', baseHash: null })
    ghiBoDem(mt.db, { key: 'tai-lieu/x.md', itemId: null, text: 'x', baseHash: null })
    expect(donBoDemNhapMoCoi(mt.db)).toBe(1)
    expect(docBoDem(mt.db, a)).toBeUndefined()
    expect(docBoDem(mt.db, b)?.text).toBe('đã sửa')
    expect(docBoDem(mt.db, 'tai-lieu/x.md')).toBeDefined()
    expect(donBoDemNhapMoCoi(mt.db)).toBe(0)
    expect(lucTaoCuaToken('khong-phai-token')).toBeNull()
  })

  it('token lạ → 410', async () => {
    const res = await mt.post('/api/nhap/thuc-hien', {
      token: 'khong-co',
      gan: {},
      xuLyTrung: {},
      nhanDaDuyet: [],
    })
    expect(res.status).toBe(410)
  })
})

describe('cây không có tên mục nào trong code', () => {
  it('mọi mục học khớp được theo slug của chính nó', async () => {
    const files = cay.mucHoc
      .slice(0, 40)
      .map((m) => ({ ten: `${m.slug}.md`, noiDung: baiNhap(m, '', false) }))
    const kq = await kiemTra({ files })
    expect(kq.ketQua.map((k) => k.muc?.id)).toEqual(cay.mucHoc.slice(0, 40).map((m) => m.id))
  })
})
