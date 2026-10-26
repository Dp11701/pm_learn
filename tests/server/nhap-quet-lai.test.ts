// POST /api/nhap/quet-lai (đề xuất 1.6 "Quét lại", "Bảo vệ bản Đã duyệt", bảng sự kiện ngoài app; 3.8; mục 6
// "DB trống + 41 file da-duyet → 41 dòng ◎, xác nhận → 41 Đã duyệt"): nhập thẳng Hợp lệ / Thiếu khối (một
// file_op, Hoàn tác được), dừng ở bảng khi có Không khớp / ⟳ / ◎ / Lỗi, file đổi tên cùng hash về chỗ không hỏi,
// giới hạn 3 cấp / symlink, kiểm lại lúc nhập.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { docBanChupHienHanh } from '../../server/du-lieu/ban-chup-duyet.ts'
import { docBoDem } from '../../server/du-lieu/bo-dem-soan.ts'
import { docSo, docTepCuaMuc } from '../../server/du-lieu/so-noi-dung.ts'
import type { KetQuaFile, PhanHoiQuetLai, PhanHoiThucHien } from '../../server/nhap/hop-dong.ts'
import { bamNoiDung } from '../../server/noi-dung/bam.ts'
import {
  baiDaDuyet,
  baiNhap,
  cay,
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
const vuca = muc('VUCA')
const changeLog = muc('Change log')

async function quetLai(ma = 200): Promise<PhanHoiQuetLai & { loi?: string }> {
  const res = await mt.post('/api/nhap/quet-lai')
  expect(res.status, JSON.stringify(res.body)).toBe(ma)
  return res.body as PhanHoiQuetLai
}

async function thucHien(body: object, ma = 200) {
  const res = await mt.post('/api/nhap/thuc-hien', body)
  expect(res.status, JSON.stringify(res.body)).toBe(ma)
  return res.body as PhanHoiThucHien & { loi?: string }
}

function dong(kq: PhanHoiQuetLai, ten: string): KetQuaFile {
  const d = kq.kiemTra?.ketQua.find((k) => k.ten === ten)
  if (!d) throw new Error(`không có dòng ${ten}`)
  return d
}

async function trangThai() {
  return (await mt.get('/api/noi-dung/trang-thai')).body as Record<
    string,
    { loai: string; ngayDuyet?: string; coBanSua?: boolean }
  >
}

describe('nhập thẳng Hợp lệ / Thiếu khối', () => {
  it('file ở đúng chỗ và đặt sai chỗ → nhập, đưa về đường dẫn chuẩn, ép ban-nhap; toast + Hoàn tác đảo lại', async () => {
    const tai = baiNhap(pestle) // đúng chỗ, đã đúng frontmatter → nhận tại chỗ, không đổi byte
    const sai = baiNhap(bani, '', false).replace('ban-nhap', 'da-duyet\nngay_duyet: 2026-10-01')
    mt.ghi(pestle.duongDanTuongDoi, tai)
    mt.ghi('nhap-tu-claude/bani.md', sai)
    expect((await mt.get('/api/meta')).body.noiDung.chuaNhan).toBe(1) // quét nhẹ không xuống nhap-tu-claude/
    // BANI đã từng có bản chụp (bị thay) → file da-duyet không phải ◎ mà là bản nháp "đã chuyển về Bản nháp"
    mt.db
      .prepare(
        "INSERT INTO content_approvals (item_id, approved_on, hash, body, superseded_at, created_at, updated_at) VALUES (?, '2026-09-01', 'x', 'x', '2026-09-02T00:00:00Z', '2026-09-01T00:00:00Z', '2026-09-02T00:00:00Z')",
      )
      .run(bani.id)

    const kq = await quetLai()
    expect(kq).toMatchObject({ daNhap: 2, kiemTra: null, chuaNhan: 0, daChuyen: 0 })
    expect(kq.fileOp).toBeGreaterThan(0)
    expect(mt.dsFile()).toEqual([bani.duongDanTuongDoi, pestle.duongDanTuongDoi].sort())
    expect(mt.doc(pestle.duongDanTuongDoi)).toBe(tai)
    expect(mt.doc(bani.duongDanTuongDoi)).toBe(
      sai
        .replace('---\n', `---\nid: ${bani.id}\n`)
        .replace('da-duyet\nngay_duyet: 2026-10-01', 'ban-nhap'),
    )
    expect(mt.dsRac().some((p) => p.endsWith('nhap-tu-claude/bani.md'))).toBe(true)
    const tt = await trangThai()
    expect(tt[pestle.id].loai).toBe('ban-nhap')
    expect(tt[bani.id].loai).toBe('ban-nhap')
    expect((await mt.get('/api/meta')).body.noiDung.chuaNhan).toBe(0)

    // Hoàn tác: file về như trước (chưa nhận), sổ trống
    await mt.post('/api/nhap/hoan-tac', { fileOp: kq.fileOp }).expect(200)
    expect(mt.doc('nhap-tu-claude/bani.md')).toBe(sai)
    expect(mt.doc(pestle.duongDanTuongDoi)).toBe(tai)
    expect(mt.doc(bani.duongDanTuongDoi)).toBeNull()
    expect(docSo(mt.db)).toEqual([])
    expect(await trangThai()).toEqual({})
  })

  it('không có gì → daNhap 0, kiemTra null', async () => {
    expect(await quetLai()).toEqual({
      daNhap: 0,
      fileOp: null,
      kiemTra: null,
      chuaNhan: 0,
      daChuyen: 0,
    })
  })

  it('_tong-quan.md của lĩnh vực (loai tong-quan) được nhận; _lo-trinh-goi-y.md → Không khớp + ghi chú', async () => {
    const linhVuc = pestle.linhVuc
    if (!linhVuc) throw new Error('PESTLE phải thuộc một lĩnh vực')
    const tq = `---\nloai: tong-quan\nnguon: ai\n---\n## Tổng quan\n[Nội dung mẫu — tổng quan] …\n`
    const thuMuc = path.posix.dirname(pestle.duongDanTuongDoi)
    mt.ghi(`${thuMuc}/_tong-quan.md`, tq)
    mt.ghi('_lo-trinh-goi-y.md', `---\nloai: lo-trinh\n---\n`)
    const kq = await quetLai()
    expect(kq.daNhap).toBe(1)
    expect(docTepCuaMuc(mt.db, linhVuc.id, 'tong-quan')?.path).toBe(`${thuMuc}/_tong-quan.md`)
    expect(mt.doc(`${thuMuc}/_tong-quan.md`)).toBe(
      tq
        .replace('---\n', `---\nid: ${linhVuc.id}\n`)
        .replace('nguon: ai', 'nguon: ai\ntrang_thai_noi_dung: ban-nhap'),
    )
    expect(dong(kq, '_lo-trinh-goi-y.md')).toMatchObject({
      loai: 'khong-khop',
      muc: null,
      ungVien: [],
    })
    expect(dong(kq, '_lo-trinh-goi-y.md').ghiChu).toMatch(/file riêng của app/)
    expect(kq.chuaNhan).toBe(1)
  })
})

describe('dừng ở bảng kiểm tra khi cần bạn quyết', () => {
  it('Không khớp, ⟳ sửa ngoài app, ✕ lỗi → bảng; Nhập thành bản sửa ghi lại bản đã duyệt', async () => {
    mt.daDuyet(scopeCreep)
    const banDuyet = mt.doc(scopeCreep.duongDanTuongDoi) as string
    const suaNgoai = baiNhap(scopeCreep, 'giai_nghia: sửa ngoài app\n')
    mt.ghi(scopeCreep.duongDanTuongDoi, suaNgoai)
    mt.ghi('risk-registr.md', baiNhap(riskRegister, '', false))
    const hong = baiNhap(vuca, '', false).replace('loai: chu-de', 'loai chu-de')
    mt.ghi(vuca.duongDanTuongDoi, hong)
    mt.ghi(pestle.duongDanTuongDoi, baiNhap(pestle))
    await mt.get('/api/meta')

    const kq = await quetLai()
    expect(kq.daNhap).toBe(1) // PESTLE
    // sắp theo đường dẫn
    expect(kq.kiemTra?.ketQua.map((k) => [k.ten, k.loai])).toEqual([
      ['vuca.md', 'loi'],
      ['scope-creep.md', 'trung-da-duyet'],
      ['risk-registr.md', 'khong-khop'],
    ])
    expect(kq.kiemTra?.ketQua.map((k) => k.chiSo)).toEqual([0, 1, 2])
    expect(kq.chuaNhan).toBe(2)
    expect(dong(kq, 'scope-creep.md')).toMatchObject({
      muc: { id: scopeCreep.id },
      ghiChu: 'File Đã duyệt bị sửa ngoài app · bản đã duyệt 18/10/2026',
      khopTheo: 'duong-dan',
      duongDan: scopeCreep.duongDanTuongDoi,
    })
    const v = dong(kq, 'vuca.md')
    expect(v).toMatchObject({
      muc: { id: vuca.id },
      loi: { dong: 2, thongBao: 'thiếu dấu ":" sau loai' },
      khopTheo: 'duong-dan',
    })
    expect(docBoDem(mt.db, v.khoaBoDem as string)).toMatchObject({
      text: hong,
      baseHash: bamNoiDung(hong),
      itemId: vuca.id,
    })
    expect(dong(kq, 'risk-registr.md')).toMatchObject({
      ganSan: true,
      muc: { id: riskRegister.id },
    })
    expect(kq.kiemTra?.soNhapDuoc).toBe(1)

    const token = kq.kiemTra?.token
    const r = await thucHien({
      token,
      gan: { 2: riskRegister.id },
      xuLyTrung: { 1: 'thanh-ban-sua' },
      nhanDaDuyet: [],
    })
    const banSua = scopeCreep.duongDanTuongDoi.replace(/\.md$/, '.ban-sua.md')
    expect(r.daNhap.map((d) => d.duongDan).sort()).toEqual(
      [banSua, riskRegister.duongDanTuongDoi].sort(),
    )
    // Bản ngoài app thành bản sửa; <slug>.md về đúng bản chụp; bản ngoài cũng nằm trong thùng rác
    expect(mt.doc(banSua)).toBe(suaNgoai)
    expect(mt.doc(scopeCreep.duongDanTuongDoi)).toBe(banDuyet)
    expect(mt.doc('risk-registr.md')).toBeNull()
    expect(mt.doc(riskRegister.duongDanTuongDoi)).toBe(baiNhap(riskRegister))
    expect((await trangThai())[scopeCreep.id]).toEqual({
      loai: 'da-duyet',
      ngayDuyet: '2026-10-18',
      coBanSua: true,
    })
    const bai = (await mt.get(`/api/bai/${encodeURIComponent(scopeCreep.id)}`)).body
    expect(bai.canhBaoDuyet).toBeNull()
    // vuca.md còn nguyên (lỗi, chưa nhận)
    expect(mt.doc(vuca.duongDanTuongDoi)).toBe(hong)
    expect((await mt.get('/api/meta')).body.noiDung.chuaNhan).toBe(1)
  })

  it('⟳ Nhập thành bản sửa → Hoàn tác được cả lô: gỡ bản sửa, bài Đã duyệt giữ đúng bản chụp (review 2b #4)', async () => {
    mt.daDuyet(scopeCreep)
    const banDuyet = mt.doc(scopeCreep.duongDanTuongDoi) as string
    const suaNgoai = baiNhap(scopeCreep, 'giai_nghia: sửa ngoài app\n')
    mt.ghi(scopeCreep.duongDanTuongDoi, suaNgoai)
    const riskNgoai = baiNhap(riskRegister, '', false)
    mt.ghi('risk-registr.md', riskNgoai)
    await mt.get('/api/meta')
    const kq = await quetLai()
    const r = await thucHien({
      token: kq.kiemTra?.token,
      gan: { [dong(kq, 'risk-registr.md').chiSo]: riskRegister.id },
      xuLyTrung: { [dong(kq, 'scope-creep.md').chiSo]: 'thanh-ban-sua' },
      nhanDaDuyet: [],
    })
    const banSua = scopeCreep.duongDanTuongDoi.replace(/\.md$/, '.ban-sua.md')
    expect(mt.doc(banSua)).toBe(suaNgoai)
    expect(mt.doc(scopeCreep.duongDanTuongDoi)).toBe(banDuyet)
    // "Giữ bản cũ" là thao tác riêng, không nằm trong lần nhập
    expect(
      mt.db
        .prepare('SELECT op FROM file_ops ORDER BY id')
        .all()
        .map((x) => (x as { op: string }).op),
    ).toEqual(['nhap-quet-lai', 'giu-ban-cu'])

    const ht = await mt.post('/api/nhap/hoan-tac', { fileOp: r.fileOp })
    expect(ht.status, JSON.stringify(ht.body)).toBe(200)
    expect(mt.doc(banSua)).toBeNull()
    expect(mt.doc(scopeCreep.duongDanTuongDoi)).toBe(banDuyet)
    expect(mt.doc('risk-registr.md')).toBe(riskNgoai)
    expect(mt.doc(riskRegister.duongDanTuongDoi)).toBeNull()
    // Bản sửa ngoài app không mất: nằm trong thùng rác
    const trongRac = mt
      .dsRac()
      .map((p) => fs.readFileSync(path.join(mt.tam.noiDungDir, '.thung-rac', p), 'utf8'))
    expect(trongRac).toContain(suaNgoai)
    expect((await trangThai())[scopeCreep.id]).toEqual({
      loai: 'da-duyet',
      ngayDuyet: '2026-10-18',
    })
    expect(docTepCuaMuc(mt.db, riskRegister.id)).toBeUndefined()
    expect(docTepCuaMuc(mt.db, scopeCreep.id, 'ban-sua')).toBeUndefined()
  })

  it('bài Đã duyệt sửa ngoài app mà giữ nguyên cỡ và mtime (cp -p, rsync -a) → Quét lại vẫn xếp ⟳ (review 2b #5)', async () => {
    mt.daDuyet(scopeCreep)
    const p = path.join(mt.tam.noiDungDir, scopeCreep.duongDanTuongDoi)
    const giay = 1_790_000_000 // mtime tròn giây: đặt lại được chính xác
    fs.utimesSync(p, giay, giay)
    await mt.get('/api/meta')
    expect(docTepCuaMuc(mt.db, scopeCreep.id)?.mtime).toBe(giay * 1000)
    const cu = fs.readFileSync(p, 'utf8')
    const moi = cu.replace('Nội dung mẫu', 'Nội dung MẪU')
    expect(Buffer.byteLength(moi)).toBe(Buffer.byteLength(cu))
    fs.writeFileSync(p, moi)
    fs.utimesSync(p, giay, giay)
    await mt.get('/api/meta')
    expect(docTepCuaMuc(mt.db, scopeCreep.id)?.hash).toBe(bamNoiDung(cu)) // quét nhẹ: tin mtime + size
    // Bài thấy (băm file thật) "đổi ngoài app"; trước khi sửa, Quét lại không ra gì → kẹt
    expect((await mt.get(`/api/bai/${encodeURIComponent(scopeCreep.id)}`)).body.canhBaoDuyet).toBe(
      'doi-ngoai-app',
    )
    const kq = await quetLai()
    expect(kq.kiemTra?.ketQua).toHaveLength(1)
    expect(dong(kq, 'scope-creep.md')).toMatchObject({
      loai: 'trung-da-duyet',
      muc: { id: scopeCreep.id },
      khopTheo: 'duong-dan',
    })
    expect(docTepCuaMuc(mt.db, scopeCreep.id)?.hash).toBe(bamNoiDung(moi))
  })

  it('file đã duyệt bị đổi tên + sửa: dòng file mới ⟳ (thay dòng "không còn file"); Giữ bản cũ → bản ngoài vào thùng rác', async () => {
    mt.daDuyet(scopeCreep)
    const banDuyet = mt.doc(scopeCreep.duongDanTuongDoi) as string
    const p = path.join(mt.tam.noiDungDir, scopeCreep.duongDanTuongDoi)
    const moi = path.join(mt.tam.noiDungDir, 'scope-creep-v2.md')
    fs.renameSync(p, moi)
    fs.appendFileSync(moi, '\nthêm một dòng\n')
    await mt.get('/api/meta')

    const kq = await quetLai()
    expect(kq.kiemTra?.ketQua).toHaveLength(1)
    expect(dong(kq, 'scope-creep-v2.md')).toMatchObject({
      loai: 'trung-da-duyet',
      muc: { id: scopeCreep.id },
      khopTheo: 'id',
    })
    // Giữ bản cũ: thuc-hien đưa bản ngoài vào thùng rác; web gọi thêm giu-ban-cu/:id để ghi lại bản chụp
    const r = await thucHien({
      token: kq.kiemTra?.token,
      gan: {},
      xuLyTrung: { 0: 'giu-ban-cu' },
      nhanDaDuyet: [],
    })
    expect(r.daNhap).toEqual([])
    expect(fs.existsSync(moi)).toBe(false)
    await mt.post(`/api/noi-dung/giu-ban-cu/${encodeURIComponent(scopeCreep.id)}`).expect(200)
    expect(mt.doc(scopeCreep.duongDanTuongDoi)).toBe(banDuyet)
    expect((await quetLai()).kiemTra).toBeNull()
  })

  it('file đã duyệt bị xoá: ⟳ chỉ Giữ bản cũ; Nhập thành bản sửa → 409', async () => {
    mt.daDuyet(scopeCreep)
    fs.rmSync(path.join(mt.tam.noiDungDir, scopeCreep.duongDanTuongDoi))
    await mt.get('/api/meta')
    const kq = await quetLai()
    expect(kq.kiemTra?.ketQua[0]).toMatchObject({
      ten: 'scope-creep.md',
      loai: 'trung-da-duyet',
      muc: { id: scopeCreep.id },
    })
    expect(kq.kiemTra?.ketQua[0].ghiChu).toMatch(/chỉ Giữ bản cũ được/)
    const r = await thucHien(
      { token: kq.kiemTra?.token, gan: {}, xuLyTrung: { 0: 'thanh-ban-sua' }, nhanDaDuyet: [] },
      409,
    )
    expect(r.loi).toMatch(/không còn trên đĩa/)
  })

  it('file đã nhận có id của mục khác → Không khớp "id trong file thuộc mục X, file nằm ở chỗ của mục Y"; gán X → chuyển sang chỗ của X', async () => {
    const salience = muc('Salience Model')
    const file = baiNhap(salience)
    mt.coBanNhap(changeLog, file.replace('loai: chu-de', `loai: ${changeLog.mau}`))
    mt.ghi(changeLog.duongDanTuongDoi, file)
    await mt.get('/api/meta')
    const kq = await quetLai()
    const d = dong(kq, 'change-log.md')
    expect(d).toMatchObject({
      loai: 'khong-khop',
      muc: null,
      ghiChu: 'id trong file thuộc mục “Salience Model”, file nằm ở chỗ của mục “Change log”',
    })
    expect(d.ungVien.map((u) => u.id)).toEqual([salience.id, changeLog.id])
    await thucHien({
      token: kq.kiemTra?.token,
      gan: { 0: salience.id },
      xuLyTrung: {},
      nhanDaDuyet: [],
    })
    expect(mt.doc(salience.duongDanTuongDoi)).toBe(file)
    expect(mt.doc(changeLog.duongDanTuongDoi)).toBeNull()
    expect(docTepCuaMuc(mt.db, changeLog.id)).toBeUndefined()
    expect((await trangThai())[salience.id].loai).toBe('ban-nhap')
  })

  it('2 file cùng id: file ở đường dẫn chuẩn thắng, file kia Không khớp mục', async () => {
    mt.ghi(pestle.duongDanTuongDoi, baiNhap(pestle))
    mt.ghi('pestle-ban-2.md', baiNhap(pestle, 'giai_nghia: bản hai\n'))
    const kq = await quetLai()
    expect(kq.daNhap).toBe(1)
    expect(mt.doc(pestle.duongDanTuongDoi)).toBe(baiNhap(pestle))
    expect(dong(kq, 'pestle-ban-2.md')).toMatchObject({ loai: 'khong-khop', muc: null })
    expect(dong(kq, 'pestle-ban-2.md').ungVien[0].id).toBe(pestle.id)
    // Quét lại lần nữa: file đã nhận ở đường dẫn chuẩn → vẫn Không khớp, ghi chú mục đã có file
    const lai = await quetLai()
    expect(dong(lai, 'pestle-ban-2.md').ghiChu).toBe(
      `Mục đã có file “${pestle.duongDanTuongDoi}” — file ở đường dẫn chuẩn được giữ`,
    )
  })

  it('file không phải UTF-8 → ✕ (không có bản tạm)', async () => {
    mt.ghi(pestle.duongDanTuongDoi, '')
    fs.writeFileSync(
      path.join(mt.tam.noiDungDir, pestle.duongDanTuongDoi),
      Buffer.from([0xff, 0xfe, 0x41]),
    )
    const kq = await quetLai()
    expect(kq.kiemTra?.ketQua[0]).toMatchObject({
      loai: 'loi',
      loi: { dong: 1, thongBao: 'file không phải chữ UTF-8 — lưu lại với mã UTF-8 rồi nhập lại' },
      khoaBoDem: null,
    })
  })

  it('file > 256 KB → ✕ "vượt giới hạn", không đọc; bài Đã duyệt sửa thành file lỗi vẫn là ⟳', async () => {
    mt.ghi('to.md', `---\nloai: chu-de\n---\n${'a'.repeat(256 * 1024)}`)
    mt.daDuyet(scopeCreep)
    mt.ghi(scopeCreep.duongDanTuongDoi, 'không còn frontmatter')
    await mt.get('/api/meta')
    const kq = await quetLai()
    expect(dong(kq, 'to.md')).toMatchObject({ loai: 'loi', khoaBoDem: null, loi: { dong: 1 } })
    expect(dong(kq, 'to.md').loi?.thongBao).toMatch(/vượt giới hạn 256 KB/)
    expect(dong(kq, 'scope-creep.md')).toMatchObject({
      loai: 'trung-da-duyet',
      loi: { dong: 1, thongBao: 'thiếu frontmatter: file phải mở đầu bằng dòng ---' },
    })
    // Nhập thành bản sửa một file lỗi → 409; Giữ bản cũ vẫn được (giu-ban-cu/:id)
    const chiSo = dong(kq, 'scope-creep.md').chiSo
    const r = await thucHien(
      {
        token: kq.kiemTra?.token,
        gan: {},
        xuLyTrung: { [chiSo]: 'thanh-ban-sua' },
        nhanDaDuyet: [],
      },
      409,
    )
    expect(r.loi).toMatch(/không nhập được/)
    await mt.post(`/api/noi-dung/giu-ban-cu/${encodeURIComponent(scopeCreep.id)}`).expect(200)
    expect(mt.doc(scopeCreep.duongDanTuongDoi)).toBe(baiDaDuyet(scopeCreep))
  })

  it('file trên đĩa đổi giữa lúc Quét lại và lúc nhập → 410, không ghi gì', async () => {
    mt.ghi('risk-registr.md', baiNhap(riskRegister, '', false))
    const kq = await quetLai()
    mt.ghi('risk-registr.md', baiNhap(riskRegister, 'giai_nghia: đổi\n', false))
    const r = await thucHien(
      { token: kq.kiemTra?.token, gan: { 0: riskRegister.id }, xuLyTrung: {}, nhanDaDuyet: [] },
      410,
    )
    expect(r.loi).toMatch(/đã đổi từ lúc kiểm tra/)
    expect(mt.doc(riskRegister.duongDanTuongDoi)).toBeNull()
  })
})

describe('bảng sự kiện ngoài app (1.6) sau Quét lại', () => {
  it('file đã nhận đổi tên / chuyển chỗ (cùng hash) → về đường dẫn chuẩn, không hỏi', async () => {
    mt.coBanNhap(pestle)
    fs.mkdirSync(path.join(mt.tam.noiDungDir, 'tam'))
    fs.renameSync(
      path.join(mt.tam.noiDungDir, pestle.duongDanTuongDoi),
      path.join(mt.tam.noiDungDir, 'tam/pestle-cu.md'),
    )
    await mt.get('/api/meta')
    const kq = await quetLai()
    expect(kq).toMatchObject({ daNhap: 0, daChuyen: 1, kiemTra: null, chuaNhan: 0 })
    expect(mt.doc(pestle.duongDanTuongDoi)).toBe(baiNhap(pestle))
    expect((await trangThai())[pestle.id].loai).toBe('ban-nhap')
  })

  it('bản nháp đã nhận bị xoá → gỡ dòng sổ', async () => {
    mt.coBanNhap(pestle)
    fs.rmSync(path.join(mt.tam.noiDungDir, pestle.duongDanTuongDoi))
    await mt.get('/api/meta')
    expect(await quetLai()).toMatchObject({ daNhap: 0, kiemTra: null })
    expect(docSo(mt.db)).toEqual([])
  })
})

describe('◎ hàng loạt (mục 6)', () => {
  it('DB trống + 41 file da-duyet → 41 dòng ◎; tick hết → 41 Đã duyệt, giữ ngay_duyet', async () => {
    const ds = cay.mucHoc.filter((m) => m.mau === 'chu-de').slice(0, 41)
    for (const m of ds) mt.ghi(m.duongDanTuongDoi, baiDaDuyet(m))
    const kq = await quetLai()
    expect(kq.daNhap).toBe(0)
    expect(kq.kiemTra?.ketQua).toHaveLength(41)
    expect(kq.kiemTra?.ketQua.every((k) => k.loai === 'chua-chup')).toBe(true)
    expect(kq.kiemTra?.soNhapDuoc).toBe(0)
    const r = await thucHien({
      token: kq.kiemTra?.token,
      gan: {},
      xuLyTrung: {},
      nhanDaDuyet: kq.kiemTra?.ketQua.map((k) => k.chiSo),
    })
    expect(r.daNhap).toHaveLength(41)
    const tt = await trangThai()
    expect(
      Object.values(tt).filter((x) => x.loai === 'da-duyet' && x.ngayDuyet === '2026-10-18'),
    ).toHaveLength(41)
    // Không đổi byte nào của file đã duyệt
    for (const m of ds) {
      expect(mt.doc(m.duongDanTuongDoi)).toBe(baiDaDuyet(m))
      expect(docBanChupHienHanh(mt.db, m.id)?.noiDung).toBe(baiDaDuyet(m))
    }
    expect((await quetLai()).kiemTra).toBeNull()
  })

  it('DB nâng từ 2a: file da-duyet đã tự nhận (◎ đã nhận) → dòng ◎, nhận tại chỗ giữ ngày nhập cũ', async () => {
    mt.ghi(pestle.duongDanTuongDoi, baiDaDuyet(pestle))
    mt.db
      .prepare(
        "INSERT INTO settings (key, value) VALUES ('so_noi_dung', 'can-khoi-tao') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .run()
    await mt.get('/api/meta')
    mt.db.prepare("UPDATE content_files SET imported_on = '2026-09-30'").run()
    const kq = await quetLai()
    expect(kq.kiemTra?.ketQua[0]).toMatchObject({ loai: 'chua-chup', khopTheo: 'duong-dan' })
    await thucHien({ token: kq.kiemTra?.token, gan: {}, xuLyTrung: {}, nhanDaDuyet: [0] })
    expect(docTepCuaMuc(mt.db, pestle.id)?.importedOn).toBe('2026-09-30')
    expect((await trangThai())[pestle.id]).toEqual({ loai: 'da-duyet', ngayDuyet: '2026-10-18' })
  })
})

describe('giới hạn (1.6)', () => {
  it('lồng quá 3 cấp → 422 tiếng Việt, không nhập gì', async () => {
    mt.ghi(pestle.duongDanTuongDoi, baiNhap(pestle))
    mt.ghi('a/b/c/d/x.md', 'x')
    const r = await quetLai(422)
    expect(r.loi).toMatch(/lồng quá 3 cấp/)
    expect(docSo(mt.db)).toEqual([])
  })

  it('thư mục nội dung tạm không có / không đọc được → quét nhẹ không đánh dấu mất; Quét lại 422, sổ giữ nguyên (review 2b #7)', async () => {
    mt.coBanNhap(pestle)
    mt.daDuyet(scopeCreep)
    await mt.get('/api/meta')
    const anhSo = () => docSo(mt.db).map((d) => [d.path, d.itemId, d.hash, d.missingSince])
    const truoc = anhSo()
    expect(truoc).toHaveLength(2)
    const goc = mt.tam.noiDungDir
    // Đổi tên / ổ ngoài chưa gắn
    fs.renameSync(goc, `${goc}-tam`)
    try {
      expect((await mt.get('/api/meta')).status).toBe(200)
      expect(anhSo()).toEqual(truoc)
      const r = await quetLai(422)
      expect(r.loi).toBe(
        `Không thấy thư mục nội dung “${goc}” (bị đổi tên, ổ ngoài chưa gắn hoặc NOI_DUNG_DIR sai) — chưa quét, sổ nội dung giữ nguyên. Kiểm tra thư mục rồi Quét lại.`,
      )
      expect(anhSo()).toEqual(truoc)
    } finally {
      fs.renameSync(`${goc}-tam`, goc)
    }
    // Thiếu quyền đọc
    fs.chmodSync(goc, 0o000)
    try {
      expect((await mt.get('/api/meta')).status).toBe(200)
      expect(anhSo()).toEqual(truoc)
      expect((await quetLai(422)).loi).toMatch(/^Không đọc được thư mục nội dung/)
      expect(anhSo()).toEqual(truoc)
    } finally {
      fs.chmodSync(goc, 0o755)
    }
    // Thư mục về lại: mọi thứ như cũ, không có gì phải quyết
    expect(await quetLai()).toMatchObject({ daNhap: 0, kiemTra: null, chuaNhan: 0 })
    expect(anhSo()).toEqual(truoc)
    expect((await trangThai())[pestle.id].loai).toBe('ban-nhap')
  })

  it('symlink (file / thư mục) bị bỏ qua; tên bắt đầu bằng . hay ~ bị bỏ qua', async () => {
    const ngoai = path.join(mt.tam.goc, 'ngoai')
    fs.mkdirSync(ngoai)
    fs.writeFileSync(path.join(ngoai, 'pestle.md'), baiNhap(pestle))
    fs.symlinkSync(ngoai, path.join(mt.tam.noiDungDir, 'lien-ket'))
    fs.symlinkSync(path.join(ngoai, 'pestle.md'), path.join(mt.tam.noiDungDir, 'pestle.md'))
    mt.ghi('.an.md', baiNhap(bani))
    mt.ghi('~tam.md', baiNhap(bani))
    expect(await quetLai()).toEqual({
      daNhap: 0,
      fileOp: null,
      kiemTra: null,
      chuaNhan: 0,
      daChuyen: 0,
    })
    expect(docSo(mt.db)).toEqual([])
  })
})
