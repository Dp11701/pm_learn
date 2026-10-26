// POST /api/nhap/thuc-hien + /api/nhap/hoan-tac (đề xuất 1.6, 1.7, 3.6, 3.8, 2.2 bất biến 5, 8; mục 6 "API"):
// nhập lô F22 (ép ban-nhap, thêm id, đường dẫn chuẩn, ngày nhập), ⟳ Nhập thành bản sửa / Giữ bản cũ, ◎ Nhận
// là Đã duyệt, Gán cho mục…, kiểm lại lúc nhập (410), hai lần nhập cùng mục, hoàn tác (vòng tròn), symlink,
// sao lưu trước khi nhập.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { homNay } from '../../shared/clock.ts'
import { docBanChupHienHanh } from '../../server/du-lieu/ban-chup-duyet.ts'
import { docSo, docTepCuaMuc } from '../../server/du-lieu/so-noi-dung.ts'
import type { PhanHoiKiemTra, PhanHoiThucHien, YeuCauThucHien } from '../../server/nhap/hop-dong.ts'
import { bamNoiDung } from '../../server/noi-dung/bam.ts'
import type { SaoLuu } from '../../server/sao-luu.ts'
import { dsTen } from './tro-giup.ts'
import {
  baiDaDuyet,
  baiNhap,
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

const scopeCreep = muc('Scope Creep')
const riskRegister = muc('Risk Register')
const pestle = muc('PESTLE')
const bani = muc('BANI')

async function kiemTra(body: object): Promise<PhanHoiKiemTra> {
  const res = await mt.post('/api/nhap/kiem-tra', body)
  expect(res.status, JSON.stringify(res.body)).toBe(200)
  return res.body as PhanHoiKiemTra
}

/** Thân thuc-hien như web gửi khi giữ mặc định: gán sẵn → gan; ⟳ → Giữ bản cũ; ◎ không tick. */
function macDinh(kq: PhanHoiKiemTra, them: Partial<YeuCauThucHien> = {}): YeuCauThucHien {
  const gan: Record<string, string> = {}
  const xuLyTrung: Record<string, 'giu-ban-cu' | 'thanh-ban-sua'> = {}
  for (const k of kq.ketQua) {
    if (k.loai === 'khong-khop' && k.ganSan && k.muc) gan[k.chiSo] = k.muc.id
    if (k.loai === 'trung-da-duyet') xuLyTrung[k.chiSo] = 'giu-ban-cu'
  }
  return {
    token: kq.token,
    gan: { ...gan, ...them.gan },
    xuLyTrung: { ...xuLyTrung, ...them.xuLyTrung },
    nhanDaDuyet: them.nhanDaDuyet ?? [],
  }
}

async function thucHien(body: object, ma = 200) {
  const res = await mt.post('/api/nhap/thuc-hien', body)
  expect(res.status, JSON.stringify(res.body)).toBe(ma)
  return res.body as PhanHoiThucHien & { loi?: string }
}

async function trangThai() {
  const res = await mt.get('/api/noi-dung/trang-thai')
  expect(res.status).toBe(200)
  return res.body as Record<
    string,
    { loai: string; nguon?: string; ngayDuyet?: string; coBanSua?: boolean }
  >
}

describe('nhập lô F22', () => {
  it('13 file vào đường dẫn chuẩn, ép ban-nhap, thêm id, ngày nhập hôm nay; ⟳ / ✕ không ghi; sao lưu trước', async () => {
    mt.daDuyet(scopeCreep)
    const banDuyet = mt.doc(scopeCreep.duongDanTuongDoi)
    const kq = await kiemTra({ files: loF22() })
    const r = await thucHien(macDinh(kq))
    expect(r.daNhap).toHaveLength(13)
    expect(r.daNhap.map((d) => d.chiSo)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(r.fileOp).toBeGreaterThan(0)
    const meta = await mt.get('/api/meta')
    expect(r.revision).toBeLessThanOrEqual(meta.body.noiDung.revision)

    const rr = r.daNhap.find((d) => d.mucId === riskRegister.id)
    expect(rr?.duongDan).toBe(riskRegister.duongDanTuongDoi)
    // risk-registr.md không có id: thêm id lên đầu frontmatter, thân bài giữ nguyên
    const goc = loF22()[12].noiDung
    expect(mt.doc(riskRegister.duongDanTuongDoi)).toBe(
      goc.replace('---\n', `---\nid: ${riskRegister.id}\n`),
    )
    // file đã đúng (có id, ban-nhap) giữ nguyên từng byte
    expect(mt.doc(pestle.duongDanTuongDoi)).toBe(loF22()[0].noiDung)

    expect(mt.doc(scopeCreep.duongDanTuongDoi)).toBe(banDuyet)
    expect(mt.dsFile()).not.toContain('project-management/scope-management/scope-creep.ban-sua.md')
    expect(mt.doc(muc('VUCA').duongDanTuongDoi)).toBeNull()

    const tt = await trangThai()
    expect(Object.values(tt).filter((x) => x.loai === 'ban-nhap')).toHaveLength(13)
    expect(tt[scopeCreep.id]).toEqual({ loai: 'da-duyet', ngayDuyet: '2026-10-18' })
    for (const d of docSo(mt.db).filter((x) => x.itemId !== scopeCreep.id)) {
      expect(d.importedOn).toBe(homNay())
    }
    // Sao lưu "nhap" trước khi ghi
    await mt.saoLuu.choXong()
    expect(dsTen(path.join(mt.tam.dataDir, 'backups')).some((t) => t.includes('-nhap'))).toBe(true)
    // Bài đọc được qua API, không còn là file chưa nhận
    expect((await mt.get('/api/meta')).body.noiDung.chuaNhan).toBe(0)
  })

  it('hoàn tác: file mới vào thùng rác, bản nháp bị thay trở lại, sổ như cũ; hoàn tác lần hai → 409', async () => {
    mt.daDuyet(scopeCreep)
    const cu = baiNhap(riskRegister, 'giai_nghia: bản cũ\n')
    mt.coBanNhap(riskRegister, cu)
    const soTruoc = docSo(mt.db)
    const fileTruoc = mt.dsFile()
    const kq = await kiemTra({ files: loF22() })
    const r = await thucHien(macDinh(kq))
    expect(mt.doc(riskRegister.duongDanTuongDoi)).not.toBe(cu)
    expect(mt.dsRac().some((p) => p.endsWith('risk-register.md'))).toBe(true)

    const ht = await mt.post('/api/nhap/hoan-tac', { fileOp: r.fileOp })
    expect(ht.status, JSON.stringify(ht.body)).toBe(200)
    expect(ht.body.revision).toBeGreaterThan(r.revision)
    expect(mt.dsFile()).toEqual(fileTruoc)
    expect(mt.doc(riskRegister.duongDanTuongDoi)).toBe(cu)
    expect(docSo(mt.db).map((d) => [d.path, d.itemId, d.hash])).toEqual(
      soTruoc.map((d) => [d.path, d.itemId, d.hash]),
    )
    const tt = await trangThai()
    expect(Object.keys(tt).sort()).toEqual([riskRegister.id, scopeCreep.id].sort())

    const lai = await mt.post('/api/nhap/hoan-tac', { fileOp: r.fileOp })
    expect(lai.status).toBe(409)
    expect(lai.body.loi).toBe('Thao tác này đã được hoàn tác.')
  })

  it('nhập lại đúng file vừa nhập rồi Hoàn tác lần sau → file của lần trước còn nguyên, mục vẫn Bản nháp (review 2b #3)', async () => {
    const f = { ten: 'scope-creep.md', noiDung: baiNhap(scopeCreep) }
    await thucHien(macDinh(await kiemTra({ files: [f] })))
    const sau1 = mt.doc(scopeCreep.duongDanTuongDoi)
    const anhSo = () => docSo(mt.db).map((d) => [d.path, d.hash, d.importedOn, d.missingSince])
    const soSau1 = anhSo()
    const r2 = await thucHien(macDinh(await kiemTra({ files: [f] })))
    const ht = await mt.post('/api/nhap/hoan-tac', { fileOp: r2.fileOp })
    expect(ht.status, JSON.stringify(ht.body)).toBe(200)
    expect(mt.doc(scopeCreep.duongDanTuongDoi)).toBe(sau1)
    expect(mt.dsRac()).toEqual([])
    await mt.get('/api/meta')
    expect(anhSo()).toEqual(soSau1)
    expect((await trangThai())[scopeCreep.id]).toMatchObject({ loai: 'ban-nhap' })
  })

  it('dùng lại token đã nhập → 410', async () => {
    const kq = await kiemTra({ files: [{ ten: 'pestle.md', noiDung: baiNhap(pestle) }] })
    await thucHien(macDinh(kq))
    const lai = await thucHien(macDinh(kq), 410)
    expect(lai.loi).toBe('Lô này đã được nhập — kiểm tra lại nếu muốn nhập lần nữa.')
  })
})

describe('⟳ Trùng bản đã duyệt (bất biến 5)', () => {
  it('Nhập thành bản sửa → <slug>.ban-sua.md (ép ban-nhap), bản đã duyệt không đổi; có bản sửa cũ thì thay', async () => {
    mt.daDuyet(scopeCreep)
    const banDuyet = mt.doc(scopeCreep.duongDanTuongDoi)
    const moi = baiDaDuyet(scopeCreep, '2026-10-20', '[Nội dung mẫu — bản mới] …')
    const kq = await kiemTra({ files: [{ ten: 'scope-creep.md', noiDung: moi }] })
    expect(kq.ketQua[0]).toMatchObject({
      loai: 'trung-da-duyet',
      chuyenVeBanNhap: true,
      thayBanNhap: false,
    })
    const r = await thucHien(macDinh(kq, { xuLyTrung: { 0: 'thanh-ban-sua' } }))
    const banSua = scopeCreep.duongDanTuongDoi.replace(/\.md$/, '.ban-sua.md')
    expect(r.daNhap).toEqual([{ chiSo: 0, mucId: scopeCreep.id, duongDan: banSua }])
    expect(mt.doc(scopeCreep.duongDanTuongDoi)).toBe(banDuyet)
    expect(mt.doc(banSua)).toBe(
      moi
        .replace('trang_thai_noi_dung: da-duyet', 'trang_thai_noi_dung: ban-nhap')
        .replace('ngay_duyet: 2026-10-20\n', ''),
    )
    expect((await trangThai())[scopeCreep.id]).toEqual({
      loai: 'da-duyet',
      ngayDuyet: '2026-10-18',
      coBanSua: true,
    })
    expect(docTepCuaMuc(mt.db, scopeCreep.id, 'ban-sua')?.path).toBe(banSua)

    // Lần hai: thay bản sửa cũ (bản cũ vào thùng rác)
    const kq2 = await kiemTra({ files: [{ ten: 'scope-creep.md', noiDung: baiNhap(scopeCreep) }] })
    expect(kq2.ketQua[0].thayBanNhap).toBe(true)
    await thucHien(macDinh(kq2, { xuLyTrung: { 0: 'thanh-ban-sua' } }))
    expect(mt.doc(banSua)).toBe(baiNhap(scopeCreep))
    expect(mt.dsRac().some((p) => p.endsWith('scope-creep.ban-sua.md'))).toBe(true)
  })

  it('Giữ bản cũ (mặc định) không ghi gì → 422 khi không còn file nào để nhập', async () => {
    mt.daDuyet(scopeCreep)
    const kq = await kiemTra({ files: [{ ten: 'scope-creep.md', noiDung: baiNhap(scopeCreep) }] })
    const r = await thucHien(macDinh(kq), 422)
    expect(r.loi).toBe('Không có file nào được chọn để nhập.')
    expect(mt.dsFile()).toEqual([scopeCreep.duongDanTuongDoi])
  })

  it('mọi đường gán vào mục Đã duyệt đều ra bản sửa, không bao giờ ghi đè <slug>.md', async () => {
    mt.daDuyet(scopeCreep)
    const banDuyet = mt.doc(scopeCreep.duongDanTuongDoi)
    // Gán sẵn theo Dice; gán tay một file khớp mục khác; gán tay file Không khớp
    for (const [ten, noiDung, gan] of [
      ['scope-crep.md', baiNhap(scopeCreep, '', false), undefined],
      ['pestle.md', baiNhap(pestle).replace(`id: ${pestle.id}\n`, ''), scopeCreep.id],
      ['abc-xyz.md', baiNhap(scopeCreep, '', false), scopeCreep.id],
    ] as const) {
      const kq = await kiemTra({ files: [{ ten, noiDung }] })
      const body = macDinh(kq, gan ? { gan: { 0: gan } } : {})
      const r = await thucHien(body)
      expect(r.daNhap[0].duongDan, ten).toMatch(/scope-creep\.ban-sua\.md$/)
      expect(mt.doc(scopeCreep.duongDanTuongDoi)).toBe(banDuyet)
    }
    expect(docBanChupHienHanh(mt.db, scopeCreep.id)?.noiDung).toBe(banDuyet)
  })
})

describe('◎ Đã duyệt nhưng app chưa có bản chụp', () => {
  it('không tick → không nhập; tick → nhận là Đã duyệt, giữ ngay_duyet trong file; hoàn tác bỏ bản chụp', async () => {
    const file = baiDaDuyet(pestle, '2026-10-02').replace(`id: ${pestle.id}\n`, '')
    const kq = await kiemTra({
      files: [
        { ten: 'pestle.md', noiDung: file },
        { ten: 'bani.md', noiDung: baiDaDuyet(bani) },
      ],
    })
    expect(kq.ketQua.map((k) => k.loai)).toEqual(['chua-chup', 'chua-chup'])
    const r = await thucHien(macDinh(kq, { nhanDaDuyet: [0] }))
    expect(r.daNhap.map((d) => d.mucId)).toEqual([pestle.id])
    // id được thêm; trạng thái da-duyet + ngay_duyet giữ nguyên; bản chụp = file trên đĩa
    const daGhi = mt.doc(pestle.duongDanTuongDoi) as string
    expect(daGhi).toBe(file.replace('---\n', `---\nid: ${pestle.id}\n`))
    expect(docBanChupHienHanh(mt.db, pestle.id)).toMatchObject({
      ngayDuyet: '2026-10-02',
      hash: bamNoiDung(daGhi),
    })
    const tt = await trangThai()
    expect(tt[pestle.id]).toEqual({ loai: 'da-duyet', ngayDuyet: '2026-10-02' })
    expect(tt[bani.id]).toBeUndefined()

    await mt.post('/api/nhap/hoan-tac', { fileOp: r.fileOp }).expect(200)
    expect(docBanChupHienHanh(mt.db, pestle.id)).toBeUndefined()
    expect(mt.doc(pestle.duongDanTuongDoi)).toBeNull()
  })
})

describe('Gán cho mục… và kiểm lại lúc nhập', () => {
  it('gán file Không khớp cho một mục: nhập, thêm id; gán mục khác mẫu → 409; id lạ → 400; chiSo lạ → 400', async () => {
    const qual = muc('Qualitative Risk Assessment')
    const kq = await kiemTra({
      files: [{ ten: 'risk-assessment.md', noiDung: baiNhap(qual, '', false) }],
    })
    expect(kq.ketQua[0].loai).toBe('khong-khop')
    const khacMau = await thucHien(macDinh(kq, { gan: { 0: riskRegister.id } }), 409)
    expect(khacMau.loi).toBe(
      '“risk-assessment.md” không nhập được vào mục “Risk Register”: Dòng 2: loai “chu-de” khác mẫu bài của mục này (tai-lieu).',
    )
    expect((await thucHien(macDinh(kq, { gan: { 0: 'khong-co' } }), 400)).loi).toMatch(/khong-co/)
    expect((await thucHien(macDinh(kq, { gan: { 7: qual.id } }), 400)).loi).toBe(
      'Không có file số 7 trong lô.',
    )
    const bad = await mt.post('/api/nhap/thuc-hien', { token: kq.token, gan: [], nhanDaDuyet: 'x' })
    expect(bad.status).toBe(400)
    expect(mt.dsFile()).toEqual([])

    const r = await thucHien(macDinh(kq, { gan: { 0: qual.id } }))
    expect(r.daNhap).toEqual([{ chiSo: 0, mucId: qual.id, duongDan: qual.duongDanTuongDoi }])
    expect(mt.doc(qual.duongDanTuongDoi)).toBe(baiNhap(qual))
  })

  it('hai dòng cùng một mục → 409, không ghi gì', async () => {
    const kq = await kiemTra({
      files: [
        { ten: 'pestle.md', noiDung: baiNhap(pestle) },
        { ten: 'khac.md', noiDung: baiNhap(pestle, '', false) },
      ],
    })
    const r = await thucHien(macDinh(kq, { gan: { 1: pestle.id } }), 409)
    expect(r.loi).toBe('“pestle.md” và “khac.md” cùng nhập vào mục “PESTLE” — bỏ bớt một file.')
    expect(mt.dsFile()).toEqual([])
  })

  it('mục được duyệt sau lúc kiểm tra → 410 "đã đổi", không ghi gì', async () => {
    const kq = await kiemTra({ files: [{ ten: 'pestle.md', noiDung: baiNhap(pestle) }] })
    mt.daDuyet(pestle)
    const r = await thucHien(macDinh(kq), 410)
    expect(r.loi).toMatch(/đã đổi từ lúc kiểm tra/)
    expect(mt.doc(pestle.duongDanTuongDoi)).toBe(baiDaDuyet(pestle))
  })

  it('hai lần nhập cùng một mục chạy song song: lần đầu nhập, lần sau 410 (đã đổi), bản đầu còn nguyên', async () => {
    const a = baiNhap(pestle, 'giai_nghia: lô A\n')
    const b = baiNhap(pestle, 'giai_nghia: lô B\n')
    const [kqA, kqB] = await Promise.all([
      kiemTra({ files: [{ ten: 'pestle.md', noiDung: a }] }),
      kiemTra({ files: [{ ten: 'pestle.md', noiDung: b }] }),
    ])
    const [rA, rB] = await Promise.all([
      mt.post('/api/nhap/thuc-hien', macDinh(kqA)),
      mt.post('/api/nhap/thuc-hien', macDinh(kqB)),
    ])
    expect([rA.status, rB.status].sort()).toEqual([200, 410])
    const thang = rA.status === 200 ? a : b
    expect(mt.doc(pestle.duongDanTuongDoi)).toBe(thang)
    expect(docSo(mt.db)).toHaveLength(1)
  })
})

describe('an toàn khi ghi (1.6)', () => {
  it('thư mục lĩnh vực là symlink ra ngoài → 409, không ghi gì ra ngoài', async () => {
    const ngoai = path.join(mt.tam.goc, 'ngoai')
    fs.mkdirSync(ngoai)
    const dir = path.join(mt.tam.noiDungDir, path.dirname(pestle.duongDanTuongDoi))
    fs.mkdirSync(path.dirname(dir), { recursive: true })
    fs.symlinkSync(ngoai, dir)
    const kq = await kiemTra({ files: [{ ten: 'pestle.md', noiDung: baiNhap(pestle) }] })
    const r = await thucHien(macDinh(kq), 409)
    expect(r.loi).toMatch(/symlink/)
    expect(fs.readdirSync(ngoai)).toEqual([])
    expect(docSo(mt.db)).toEqual([])
  })

  it('duongDan độc hại bị bỏ qua: chỉ ghi vào đường dẫn chuẩn của mục', async () => {
    const kq = await kiemTra({
      files: [{ ten: 'pestle.md', noiDung: baiNhap(pestle), duongDan: '../../../ngoai/pestle.md' }],
    })
    await thucHien(macDinh(kq))
    expect(mt.dsFile()).toEqual([pestle.duongDanTuongDoi])
    expect(fs.existsSync(path.join(mt.tam.goc, 'ngoai'))).toBe(false)
  })

  it('frontmatter: giữ khoá lạ, chú thích, thân bài từng byte; bỏ ngay_duyet khi ép ban-nhap', async () => {
    const file =
      `---\n# chú thích đầu\nloai: chu-de   # loại\nkhoa_la: [a, b]\ntrang_thai_noi_dung: da-duyet\n` +
      `ngay_duyet: 2026-10-01\nnguon: tu-viet\n---\n\n## Tóm tắt\n\n  [Nội dung mẫu — thân]  \n\n\n`
    mt.daDuyet(bani) // để file da-duyet của PESTLE không thành ◎ thì PESTLE phải có bản chụp cũ
    mt.db
      .prepare(
        "INSERT INTO content_approvals (item_id, approved_on, hash, body, superseded_at, created_at, updated_at) VALUES (?, '2026-09-01', 'x', 'x', '2026-09-02T00:00:00Z', '2026-09-01T00:00:00Z', '2026-09-02T00:00:00Z')",
      )
      .run(pestle.id)
    const kq = await kiemTra({ files: [{ ten: 'pestle.md', noiDung: file }] })
    expect(kq.ketQua[0]).toMatchObject({ loai: 'thieu-khoi', chuyenVeBanNhap: true })
    await thucHien(macDinh(kq))
    expect(mt.doc(pestle.duongDanTuongDoi)).toBe(
      `---\n# chú thích đầu\nid: ${pestle.id}\nloai: chu-de   # loại\nkhoa_la: [a, b]\n` +
        `trang_thai_noi_dung: ban-nhap\nnguon: tu-viet\n---\n\n## Tóm tắt\n\n  [Nội dung mẫu — thân]  \n\n\n`,
    )
  })

  it('sao lưu lỗi → 500 tiếng Việt, chưa ghi file nào', async () => {
    await mt.dong()
    const hong: SaoLuu = {
      saoLuuNgay: () => Promise.reject(new Error('đầy đĩa')),
      saoLuuHangNgayNeuCan: () => null,
      choXong: () => Promise.resolve(),
      dangChay: () => false,
    }
    mt = await taoMoiTruongNhap({ saoLuu: hong })
    const kq = await kiemTra({ files: [{ ten: 'pestle.md', noiDung: baiNhap(pestle) }] })
    const r = await thucHien(macDinh(kq), 500)
    expect(r.loi).toBe('Không sao lưu được trước khi nhập — chưa ghi file nào. Xem log của server.')
    expect(mt.dsFile()).toEqual([])
  })
})

describe('lỗi đĩa giữa chừng (review 2b #6)', () => {
  it('EACCES khi ghi → 503; lô đã dùng (410); quét nhẹ không đánh dấu mất; thao tác mới bị từ chối tới khi thao tác dở làm tiếp được', async () => {
    const loiLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const dsOp = () => mt.db.prepare('SELECT id, op, state FROM file_ops ORDER BY id').all()
    const thuMuc = path.join(mt.tam.noiDungDir, path.dirname(pestle.duongDanTuongDoi))
    fs.mkdirSync(thuMuc, { recursive: true })
    fs.chmodSync(thuMuc, 0o555)
    let k2: PhanHoiKiemTra
    try {
      const k1 = await kiemTra({ files: [{ ten: 'pestle.md', noiDung: baiNhap(pestle) }] })
      const r1 = await thucHien(macDinh(k1), 503)
      expect(r1.loi).toBe(
        'Thao tác file số 1 dừng giữa chừng vì lỗi đĩa (EACCES). App sẽ làm tiếp thao tác này trước thao tác sau; nếu vẫn lỗi, kiểm tra quyền ghi và dung lượng của thư mục nội dung.',
      )
      expect(dsOp()).toEqual([{ id: 1, op: 'nhap', state: 'du-dinh' }])
      // "Thử lại" cùng token không tạo thao tác trùng
      expect((await thucHien(macDinh(k1), 410)).loi).toMatch(/đã được nhập/)
      // Quét nhẹ (mỗi /api/meta) không chạy chồng lên thao tác dở: không đánh dấu mất file sắp ghi
      expect((await mt.get('/api/meta')).status).toBe(200)
      expect(docTepCuaMuc(mt.db, pestle.id)?.missingSince).toBeNull()
      // Thao tác mới (nhập, hoàn tác, Giữ bản cũ) bị từ chối, không ghi gì
      k2 = await kiemTra({ files: [{ ten: 'bani.md', noiDung: baiNhap(bani) }] })
      const r2 = await thucHien(macDinh(k2), 503)
      expect(r2.loi).toBe(
        'Thao tác file số 1 trước đó vẫn chưa xong (lỗi đĩa EACCES) nên app chưa làm thao tác mới. Kiểm tra quyền ghi và dung lượng của thư mục nội dung rồi thử lại.',
      )
      expect((await mt.post('/api/nhap/hoan-tac', { fileOp: 1 })).status).toBe(503)
      expect(dsOp()).toHaveLength(1)
      expect(mt.dsFile()).toEqual([])
    } finally {
      fs.chmodSync(thuMuc, 0o755)
    }
    // Hết lỗi: thao tác dở làm tiếp TRƯỚC thao tác mới (cùng token, lô chưa dùng)
    await thucHien(macDinh(k2))
    expect(dsOp()).toEqual([
      { id: 1, op: 'nhap', state: 'xong' },
      { id: 2, op: 'nhap', state: 'xong' },
    ])
    expect(mt.doc(pestle.duongDanTuongDoi)).toBe(baiNhap(pestle))
    expect(mt.doc(bani.duongDanTuongDoi)).toBe(baiNhap(bani))
    const tt = await trangThai()
    expect([tt[pestle.id]?.loai, tt[bani.id]?.loai]).toEqual(['ban-nhap', 'ban-nhap'])
    // Log lỗi của thao tác dở chỉ một lần (quét nhẹ chạy theo mỗi /api/meta)
    const lanLog = loiLog.mock.calls.filter((c) => String(c[0]).includes('Thao tác file 1 '))
    expect(lanLog).toHaveLength(1)
    loiLog.mockRestore()
  })
})

describe('/api/nhap/hoan-tac', () => {
  it('fileOp lạ → 404; không phải lần nhập → 409; sai dạng → 400', async () => {
    expect((await mt.post('/api/nhap/hoan-tac', { fileOp: 999 })).status).toBe(404)
    expect((await mt.post('/api/nhap/hoan-tac', { fileOp: 'x' })).status).toBe(400)
    mt.daDuyet(scopeCreep)
    fs.writeFileSync(path.join(mt.tam.noiDungDir, scopeCreep.duongDanTuongDoi), 'sửa ngoài app')
    await mt.get('/api/meta')
    await mt.post(`/api/noi-dung/giu-ban-cu/${encodeURIComponent(scopeCreep.id)}`).expect(200)
    const op = mt.db.prepare("SELECT id FROM file_ops WHERE op = 'giu-ban-cu'").get() as {
      id: number
    }
    const res = await mt.post('/api/nhap/hoan-tac', { fileOp: op.id })
    expect(res.status).toBe(409)
    expect(res.body.loi).toBe(
      `Thao tác file số ${op.id} không phải một lần nhập — không hoàn tác ở đây được.`,
    )
  })
})
