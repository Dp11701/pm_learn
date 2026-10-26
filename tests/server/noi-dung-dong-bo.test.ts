// Sổ nội dung + đồng bộ (đề xuất 1.6 "Đồng bộ", "Bảo vệ bản Đã duyệt", bảng sự kiện ngoài app; mục 6 "API"):
// quét nhẹ qua /api/meta (noiDung.revision, chuaNhan), file chưa nhận không hiện trong bài, Quét lại (phần cơ
// học: cùng hash → đưa về chỗ, gỡ dòng mất, liệt kê ⟳ / ◎ / cảnh báo id), "Giữ bản cũ", khởi tạo sổ khi nâng
// từ phase 2a, ◎ hàng loạt. supertest trên DB + thư mục nội dung tạm, cây đóng băng.
import fs from 'node:fs'
import path from 'node:path'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import cayJson from '../fixtures/roadmap-tree.json'
import cauHinhJson from '../../shared/roadmap/cau-hinh-cay.json'
import { datLech } from '../../shared/clock.ts'
import { dungCay, type MucHoc } from '../../shared/roadmap/index.ts'
import { taoApp } from '../../server/app.ts'
import { docCauHinh } from '../../server/cau-hinh.ts'
import { capNhatSchema, moDb, moKetNoi, type Db } from '../../server/db/index.ts'
import { dsMigration } from '../../server/db/migrations.ts'
import { docSetting, ghiSetting } from '../../server/db/settings.ts'
import { chupBanDuyet } from '../../server/du-lieu/ban-chup-duyet.ts'
import { docDongSo, docTepCuaMuc } from '../../server/du-lieu/so-noi-dung.ts'
import { datTrangThai } from '../../server/du-lieu/trang-thai.ts'
import { bamNoiDung } from '../../server/noi-dung/bam.ts'
import type { PhanHoiBai } from '../../server/noi-dung/hop-dong-bai.ts'
import {
  dichGhiNoiDung,
  layKhoNoiDung,
  type KhoNoiDung,
} from '../../server/noi-dung/kho-noi-dung.ts'
import {
  docBoDem,
  ghiBoDem,
  khoaBoDemNhap,
  xoaBoDemCuaLo,
} from '../../server/du-lieu/bo-dem-soan.ts'
import { nhanTepCoSanDongBo, TOI_DA_FILE_QUET } from '../../server/noi-dung/quet.ts'
import { taoSaoLuu, type SaoLuu } from '../../server/sao-luu.ts'
import { HOST, taoThuMucTam, type ThuMucTam } from './tro-giup.ts'

const cay = dungCay(cayJson, cauHinhJson)
const muc = (label: string): MucHoc => {
  const ds = cay.mucHoc.filter((m) => m.label === label)
  if (ds.length !== 1) throw new Error(label)
  return ds[0]
}
const scopeCreep = muc('Scope Creep')
const riskRegister = muc('Risk Register')
const changeLog = muc('Change log')
const salience = muc('Salience Model')

const fm = (m: MucHoc, them = '') =>
  `---\nid: ${m.id}\nloai: ${m.mau}\ntrang_thai_noi_dung: ban-nhap\nnguon: ai\n${them}---\n## Tóm tắt\n[Nội dung mẫu — ${m.slug}] …\n`
const daDuyet = (m: MucHoc) =>
  `---\nid: ${m.id}\nloai: ${m.mau}\ntrang_thai_noi_dung: da-duyet\nngay_duyet: 2026-10-18\nnguon: ai\n---\n## Tóm tắt\n[Nội dung mẫu — đã duyệt] …\n`

let tam: ThuMucTam
let db: Db
let saoLuu: SaoLuu
let app: ReturnType<typeof taoApp>
let kho: KhoNoiDung

async function dung(dbMoi?: Db) {
  db = dbMoi ?? (await moDb(path.join(tam.dataDir, 'hoc.db')))
  saoLuu = taoSaoLuu({ db, dataDir: tam.dataDir, noiDungDir: tam.noiDungDir })
  const cauHinh = docCauHinh({ DATA_DIR: tam.dataDir, NOI_DUNG_DIR: tam.noiDungDir })
  app = taoApp({ cauHinh, db, saoLuu, soMucHoc: cay.soMucHoc, cay })
  kho = layKhoNoiDung(db, tam.noiDungDir, cay)
}

beforeEach(async () => {
  datLech(0)
  tam = taoThuMucTam()
  fs.mkdirSync(tam.noiDungDir, { recursive: true })
  await dung()
})

afterEach(async () => {
  await saoLuu.choXong()
  db.close()
  tam.xoa()
})

const get = (url: string) => request(app).get(url).set('Host', HOST)
const post = (url: string) => request(app).post(url).set('Host', HOST)

function ghi(tuongDoi: string, noiDung: string): string {
  const p = path.join(tam.noiDungDir, tuongDoi)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, noiDung)
  return p
}
const nhan = (m: MucHoc, tuongDoi = m.duongDanTuongDoi, vai: 'bai' | 'ban-sua' = 'bai') =>
  nhanTepCoSanDongBo(db, tam.noiDungDir, { duongDan: tuongDoi, itemId: m.id, vai })
const duyet = (m: MucHoc) =>
  db.transaction(() => chupBanDuyet(db, { itemId: m.id, noiDung: daDuyet(m) }))()

async function meta() {
  const res = await get('/api/meta')
  expect(res.status).toBe(200)
  return res.body.noiDung as { revision: number; chuaNhan: number; thayCay: unknown }
}
async function bai(m: MucHoc): Promise<PhanHoiBai> {
  const res = await get(`/api/bai/${encodeURIComponent(m.id)}`)
  expect(res.status).toBe(200)
  return res.body as PhanHoiBai
}

describe('/api/meta noiDung: quét nhẹ', () => {
  it('đúng 3 trường; revision không đổi khi thư mục không đổi; file mới → chuaNhan + revision tăng một lần', async () => {
    const dau = await meta()
    expect(dau).toEqual({ revision: 0, chuaNhan: 0, thayCay: null })
    expect(await meta()).toEqual(dau)
    ghi(riskRegister.duongDanTuongDoi, fm(riskRegister))
    const sau = await meta()
    expect(sau.chuaNhan).toBe(1)
    expect(sau.revision).toBe(dau.revision + 1)
    expect(await meta()).toEqual(sau)
    // file chưa nhận không hiện trong bài (đường 3: chờ Quét lại)
    expect((await bai(riskRegister)).trangThaiNoiDung).toEqual({ loai: 'chua-co' })
  })

  it('chỉ gốc + thư mục phần / lĩnh vực; bỏ tên . / ~, symlink, file không phải .md, thư mục sâu hơn', async () => {
    const dir = path.dirname(scopeCreep.duongDanTuongDoi)
    ghi('goc.md', 'x')
    ghi(`${scopeCreep.phan.slug}/phan.md`, 'x')
    ghi(`${dir}/linh-vuc.md`, 'x')
    ghi(`${dir}/.an.md`, 'x')
    ghi(`${dir}/~tam.md`, 'x')
    ghi(`${dir}/ghi-chu.txt`, 'x')
    ghi(`${dir}/hinh/sau.md`, 'x')
    ghi('.thung-rac/20261026-000000-000/a.md', 'x')
    fs.symlinkSync(
      path.join(tam.noiDungDir, 'goc.md'),
      path.join(tam.noiDungDir, dir, 'lien-ket.md'),
    )
    expect(kho.dsChuaNhan()).toEqual([])
    expect((await meta()).chuaNhan).toBe(3)
    expect(kho.dsChuaNhan()).toEqual(
      [`${dir}/linh-vuc.md`, `${scopeCreep.phan.slug}/phan.md`, 'goc.md'].sort(),
    )
  })

  it('file đã nhận đổi mtime / size mới băm lại; cùng nội dung thì không tăng revision', async () => {
    ghi(riskRegister.duongDanTuongDoi, fm(riskRegister))
    nhan(riskRegister)
    const r1 = (await meta()).revision
    // ghi lại cùng nội dung (mtime đổi) → không tăng
    const p = ghi(riskRegister.duongDanTuongDoi, fm(riskRegister))
    fs.utimesSync(p, new Date(Date.parse('2026-01-01')), new Date(Date.parse('2026-01-01')))
    expect((await meta()).revision).toBe(r1)
    expect(docTepCuaMuc(db, riskRegister.id)?.mtime).toBe(fs.statSync(p).mtimeMs)
    // nội dung khác → tăng, hash mới
    ghi(riskRegister.duongDanTuongDoi, fm(riskRegister, 'nguon_phu: x\n'))
    expect((await meta()).revision).toBe(r1 + 1)
    expect(docTepCuaMuc(db, riskRegister.id)?.hash).toBe(
      bamNoiDung(fm(riskRegister, 'nguon_phu: x\n')),
    )
  })

  it('kho đang làm thao tác file dài: /api/meta không chờ, trả số của lượt quét trước', async () => {
    await meta()
    let xong!: () => void
    const dangLam = kho.khoa(() => new Promise<void>((r) => (xong = r)))
    ghi('moi.md', 'x')
    const batDau = performance.now()
    expect((await meta()).chuaNhan).toBe(0)
    expect(performance.now() - batDau).toBeLessThan(1000)
    xong()
    await dangLam
    expect((await meta()).chuaNhan).toBe(1)
  })

  it('lỗi quét không làm hỏng /api/meta', async () => {
    fs.rmSync(tam.noiDungDir, { recursive: true })
    fs.writeFileSync(tam.noiDungDir, 'không phải thư mục')
    const res = await get('/api/meta')
    expect(res.status).toBe(200)
    expect(res.body.noiDung.chuaNhan).toBe(0)
  })
})

describe('bảng sự kiện ngoài app (1.6)', () => {
  it('bản nháp đã nhận bị xoá → Chưa có, dòng sổ "mất", trạng thái học giữ; Quét lại → gỡ dòng sổ', async () => {
    ghi(riskRegister.duongDanTuongDoi, fm(riskRegister))
    nhan(riskRegister)
    datTrangThai(db, { id: riskRegister.id, giaTri: { trangThai: 'dang-hoc' }, via: 'mot-muc' })
    expect((await bai(riskRegister)).trangThaiNoiDung.loai).toBe('ban-nhap')
    fs.rmSync(path.join(tam.noiDungDir, riskRegister.duongDanTuongDoi))
    const r = (await meta()).revision
    expect(docTepCuaMuc(db, riskRegister.id)?.missingSince).toMatch(/Z$/)
    expect((await bai(riskRegister)).trangThaiNoiDung).toEqual({ loai: 'chua-co' })
    expect((await get('/api/noi-dung/trang-thai')).body[riskRegister.id]).toBeUndefined()
    expect((await get('/api/state')).body.trangThai[riskRegister.id]?.status).toBe('learning')
    expect((await meta()).revision).toBe(r)
    const kq = await kho.quetLai()
    expect(kq.daGo).toEqual([
      { duongDan: riskRegister.duongDanTuongDoi, itemId: riskRegister.id, vai: 'bai' },
    ])
    expect(docTepCuaMuc(db, riskRegister.id)).toBeUndefined()
  })

  it('file đã nhận bị đổi tên / chuyển chỗ (cùng hash) → như bị xoá + 1 file chưa nhận; Quét lại đưa về chỗ chuẩn, không hỏi', async () => {
    ghi(riskRegister.duongDanTuongDoi, fm(riskRegister))
    nhan(riskRegister)
    ghi(scopeCreep.duongDanTuongDoi, daDuyet(scopeCreep))
    nhan(scopeCreep)
    duyet(scopeCreep)
    fs.renameSync(
      path.join(tam.noiDungDir, riskRegister.duongDanTuongDoi),
      path.join(tam.noiDungDir, 'risk-ban-cu.md'),
    )
    const thuMucScope = path.dirname(scopeCreep.duongDanTuongDoi)
    fs.renameSync(
      path.join(tam.noiDungDir, scopeCreep.duongDanTuongDoi),
      path.join(tam.noiDungDir, thuMucScope, 'scope-cu.md'),
    )
    expect((await meta()).chuaNhan).toBe(2)
    expect((await bai(riskRegister)).trangThaiNoiDung).toEqual({ loai: 'chua-co' })
    const sc = await bai(scopeCreep)
    expect(sc.trangThaiNoiDung.loai).toBe('da-duyet')
    expect(sc.banHien).toBe('ban-chup')
    expect(sc.canhBaoDuyet).toBe('doi-ngoai-app')

    const kq = await kho.quetLai()
    expect(kq.daChuyen.map((x) => x.den).sort()).toEqual(
      [riskRegister.duongDanTuongDoi, scopeCreep.duongDanTuongDoi].sort(),
    )
    expect(kq.fileOp).not.toBeNull()
    expect(kq.chuaNhan).toEqual([])
    expect(kq.daGo).toEqual([])
    expect(kq.doiNgoaiApp).toEqual([])
    expect((await meta()).chuaNhan).toBe(0)
    expect((await bai(riskRegister)).trangThaiNoiDung.loai).toBe('ban-nhap')
    const sc2 = await bai(scopeCreep)
    expect(sc2.banHien).toBe('file')
    expect(sc2.canhBaoDuyet).toBeNull()
    expect(docTepCuaMuc(db, riskRegister.id)?.importedOn).toBe(
      docDongSo(db, riskRegister.duongDanTuongDoi)?.importedOn,
    )
  })

  it('bản nháp sửa thành frontmatter lỗi → banner lỗi đọc file (F26), vẫn tính Bản nháp', async () => {
    ghi(changeLog.duongDanTuongDoi, fm(changeLog))
    nhan(changeLog)
    const r = (await meta()).revision
    ghi(changeLog.duongDanTuongDoi, '---\nloai: [hỏng\n---\n')
    expect((await meta()).revision).toBe(r + 1)
    const b = await bai(changeLog)
    expect(b.trangThaiNoiDung).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
    expect(b.loiDoc?.dong).toBe(2)
  })

  it('id trong file thuộc mục khác / không có trong cây → giữ nguyên, cảnh báo cho tab Nhập', async () => {
    ghi(changeLog.duongDanTuongDoi, fm(changeLog).replace(changeLog.id, salience.id))
    nhan(changeLog)
    ghi(riskRegister.duongDanTuongDoi, fm(riskRegister).replace(riskRegister.id, 'id-la'))
    nhan(riskRegister)
    await meta()
    expect((await bai(changeLog)).trangThaiNoiDung.loai).toBe('ban-nhap')
    expect(await kho.kiemSo()).toEqual(
      expect.arrayContaining([
        {
          duongDan: changeLog.duongDanTuongDoi,
          itemId: changeLog.id,
          loai: 'id-muc-khac',
          idTrongFile: salience.id,
        },
        {
          duongDan: riskRegister.duongDanTuongDoi,
          itemId: riskRegister.id,
          loai: 'id-khong-co',
          idTrongFile: 'id-la',
        },
      ]),
    )
    expect((await kho.quetLai()).canhBao).toHaveLength(2)
  })

  it('2 file cùng id → file ở đường dẫn chuẩn thắng; file kia chưa nhận (Quét lại liệt kê để xếp "Không khớp mục")', async () => {
    ghi(riskRegister.duongDanTuongDoi, fm(riskRegister))
    nhan(riskRegister)
    const khac = fm(riskRegister, 'giai_nghia: bản thứ hai\n')
    ghi(`${riskRegister.phan.slug}/risk-2.md`, khac)
    expect((await meta()).chuaNhan).toBe(1)
    expect((await bai(riskRegister)).hashFile).toBe(bamNoiDung(fm(riskRegister)))
    const kq = await kho.quetLai()
    expect(kq.chuaNhan).toEqual([
      {
        duongDan: `${riskRegister.phan.slug}/risk-2.md`,
        hash: bamNoiDung(khac),
        size: Buffer.byteLength(khac),
        noiDung: khac,
      },
    ])
  })

  it('đổi hoa/thường tên file đã nhận ngoài app (APFS): vẫn là file đã nhận; Quét lại đưa về đúng tên', async () => {
    ghi(riskRegister.duongDanTuongDoi, fm(riskRegister))
    nhan(riskRegister)
    const hoa = riskRegister.duongDanTuongDoi.replace(/[^/]+$/, (t) =>
      t.toUpperCase().replace('.MD', '.md'),
    )
    const khongPhanBiet = fs.existsSync(path.join(tam.noiDungDir, hoa))
    if (!khongPhanBiet) return // hệ tệp phân biệt hoa/thường: không có ca này
    fs.renameSync(
      path.join(tam.noiDungDir, riskRegister.duongDanTuongDoi),
      path.join(tam.noiDungDir, hoa),
    )
    expect((await meta()).chuaNhan).toBe(0)
    expect((await bai(riskRegister)).trangThaiNoiDung.loai).toBe('ban-nhap')
    await kho.quetLai()
    expect(fs.readdirSync(path.join(tam.noiDungDir, path.dirname(hoa)))).toContain(
      path.basename(riskRegister.duongDanTuongDoi),
    )
  })
})

describe('Bảo vệ bản Đã duyệt + "Giữ bản cũ"', () => {
  it('sửa ngoài app → bản chụp + banner; Quét lại xếp ⟳; POST giu-ban-cu ghi lại bản chụp, bản ngoài vào thùng rác', async () => {
    ghi(scopeCreep.duongDanTuongDoi, daDuyet(scopeCreep))
    nhan(scopeCreep)
    duyet(scopeCreep)
    const sua = daDuyet(scopeCreep).replace('đã duyệt]', 'sửa ngoài app]')
    ghi(scopeCreep.duongDanTuongDoi, sua)
    await meta()
    const b = await bai(scopeCreep)
    expect(b.banHien).toBe('ban-chup')
    expect(b.canhBaoDuyet).toBe('doi-ngoai-app')
    const kq = await kho.quetLai()
    expect(kq.doiNgoaiApp).toEqual([
      { itemId: scopeCreep.id, duongDan: scopeCreep.duongDanTuongDoi, hash: bamNoiDung(sua) },
    ])

    const res = await post(`/api/noi-dung/giu-ban-cu/${scopeCreep.id}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ revision: (await meta()).revision })
    expect(fs.readFileSync(path.join(tam.noiDungDir, scopeCreep.duongDanTuongDoi), 'utf8')).toBe(
      daDuyet(scopeCreep),
    )
    const rac = fs
      .readdirSync(path.join(tam.noiDungDir, '.thung-rac'), { recursive: true, encoding: 'utf8' })
      .filter((p) => p.endsWith('.md'))
    expect(rac).toHaveLength(1)
    expect(fs.readFileSync(path.join(tam.noiDungDir, '.thung-rac', rac[0]), 'utf8')).toBe(sua)
    const sau = await bai(scopeCreep)
    expect(sau.banHien).toBe('file')
    expect(sau.canhBaoDuyet).toBeNull()
    expect((await kho.quetLai()).doiNgoaiApp).toEqual([])
  })

  it('file đã duyệt bị xoá → Giữ bản cũ ghi lại file; gọi lại khi đã khớp thì không làm gì', async () => {
    ghi(scopeCreep.duongDanTuongDoi, daDuyet(scopeCreep))
    nhan(scopeCreep)
    duyet(scopeCreep)
    fs.rmSync(path.join(tam.noiDungDir, scopeCreep.duongDanTuongDoi))
    await meta()
    expect((await kho.quetLai()).doiNgoaiApp).toEqual([
      { itemId: scopeCreep.id, duongDan: null, hash: null },
    ])
    expect((await post(`/api/noi-dung/giu-ban-cu/${scopeCreep.id}`)).status).toBe(200)
    expect(fs.readFileSync(path.join(tam.noiDungDir, scopeCreep.duongDanTuongDoi), 'utf8')).toBe(
      daDuyet(scopeCreep),
    )
    const ops = (db.prepare('SELECT count(*) AS n FROM file_ops').get() as { n: number }).n
    expect((await post(`/api/noi-dung/giu-ban-cu/${scopeCreep.id}`)).status).toBe(200)
    expect(db.prepare('SELECT count(*) AS n FROM file_ops').get()).toEqual({ n: ops })
  })

  it('giu-ban-cu: mục chưa duyệt → 409; id lạ → 404; GET → 404', async () => {
    expect((await post(`/api/noi-dung/giu-ban-cu/${riskRegister.id}`)).status).toBe(409)
    expect((await post('/api/noi-dung/giu-ban-cu/khong-co')).status).toBe(404)
    expect((await get(`/api/noi-dung/giu-ban-cu/${scopeCreep.id}`)).status).toBe(404)
  })
})

describe('bất biến 5: nơi ghi nội dung mới của mục', () => {
  it('mục Đã duyệt → <slug>.ban-sua.md; chưa duyệt → <slug>.md', () => {
    duyet(scopeCreep)
    expect(dichGhiNoiDung(db, scopeCreep)).toEqual({
      duongDan: scopeCreep.duongDanTuongDoi.replace(/\.md$/, '.ban-sua.md'),
      vai: 'ban-sua',
    })
    expect(dichGhiNoiDung(db, riskRegister)).toEqual({
      duongDan: riskRegister.duongDanTuongDoi,
      vai: 'bai',
    })
  })
})

describe('editor_buffers (bản tạm file nhập lỗi, 1.7)', () => {
  it('khoá nhap:<token>:<i>; ghi / đọc / xoá cả lô; item_id null được', () => {
    const k = khoaBoDemNhap('tok-1', 3)
    expect(k).toBe('nhap:tok-1:3')
    ghiBoDem(db, { key: k, itemId: null, text: 'x', baseHash: null })
    ghiBoDem(db, {
      key: khoaBoDemNhap('tok-1', 4),
      itemId: riskRegister.id,
      text: 'y',
      baseHash: 'h',
    })
    ghiBoDem(db, { key: khoaBoDemNhap('tok-2', 0), itemId: null, text: 'z', baseHash: null })
    expect(docBoDem(db, k)).toMatchObject({ key: k, itemId: null, text: 'x', baseHash: null })
    expect(xoaBoDemCuaLo(db, 'tok-1')).toBe(2)
    expect(docBoDem(db, k)).toBeUndefined()
    expect(docBoDem(db, khoaBoDemNhap('tok-2', 0))?.text).toBe('z')
  })
})

describe('◎ Đã duyệt nhưng app chưa có bản chụp', () => {
  it('DB trống + 41 file da-duyet: chưa nhận (Quét lại liệt kê để xếp ◎), không mục nào Đã duyệt', async () => {
    const ds = cay.mucHoc.filter((m) => m.mau === 'chu-de').slice(0, 41)
    for (const m of ds) ghi(m.duongDanTuongDoi, daDuyet(m))
    expect((await meta()).chuaNhan).toBe(41)
    const kq = await kho.quetLai()
    expect(kq.chuaNhan).toHaveLength(41)
    expect(Object.keys((await get('/api/noi-dung/trang-thai')).body)).toEqual([])
  })

  it('DB nâng từ 2a + 41 file da-duyet: tự nhận → Bản nháp + banner ◎; Nhận là Đã duyệt (file_ops tại chỗ) → 41 Đã duyệt', async () => {
    const ds = cay.mucHoc.filter((m) => m.mau === 'chu-de').slice(0, 41)
    for (const m of ds) ghi(m.duongDanTuongDoi, daDuyet(m))
    ghiSetting(db, 'so_noi_dung', 'can-khoi-tao')
    expect((await meta()).chuaNhan).toBe(0)
    expect(docSetting(db, 'so_noi_dung')).toBe('da-khoi-tao')
    const b = await bai(ds[0])
    expect(b.trangThaiNoiDung).toEqual({ loai: 'ban-nhap', nguon: 'ai' })
    expect(b.canhBaoDuyet).toBe('chua-xac-nhan')
    const kq = await kho.quetLai()
    expect(kq.chuaXacNhan).toHaveLength(41)

    // "Nhận là Đã duyệt": bước tại chỗ + chụp bản hiện tại, giữ ngay_duyet trong file
    await kho.thucHien({
      op: 'nhan-da-duyet',
      buoc: kq.chuaXacNhan.map((x) => ({
        tu: x.duongDan,
        den: x.duongDan,
        hashMoi: x.hash,
        so: { itemId: x.itemId, vai: 'bai' as const },
      })),
      thayDoiDb: () => {
        for (const x of kq.chuaXacNhan) {
          const noiDung = fs.readFileSync(path.join(tam.noiDungDir, x.duongDan), 'utf8')
          chupBanDuyet(db, { itemId: x.itemId, noiDung })
        }
      },
    })
    const tt = (await get('/api/noi-dung/trang-thai')).body as Record<
      string,
      { loai: string; ngayDuyet?: string }
    >
    expect(Object.values(tt).filter((x) => x.loai === 'da-duyet')).toHaveLength(41)
    expect(tt[ds[0].id].ngayDuyet).toBe('2026-10-18')
    expect((await kho.quetLai()).chuaXacNhan).toEqual([])
  })

  it('migration 4 chỉ đánh dấu khởi tạo sổ cho DB đã chạy phase 2a (có cay_sha)', async () => {
    for (const coCaySha of [true, false]) {
      const p = path.join(tam.goc, `nang-${coCaySha}.db`)
      const cu = moKetNoi(p)
      await capNhatSchema(cu, { migrations: dsMigration.slice(0, 3) })
      if (coCaySha) ghiSetting(cu, 'cay_sha', 'abc')
      cu.close()
      const moi = await moDb(p)
      expect(docSetting(moi, 'so_noi_dung')).toBe(coCaySha ? 'can-khoi-tao' : null)
      moi.close()
    }
  })
})

describe('Quét lại: giới hạn (1.6)', () => {
  it('thư mục lồng quá 3 cấp → 422 tiếng Việt, không đổi gì', async () => {
    ghi('a/b/c/d/x.md', 'x')
    await expect(kho.quetLai()).rejects.toMatchObject({ status: 422 })
    ghi('a/b/c/x.md', 'x')
    fs.rmSync(path.join(tam.noiDungDir, 'a/b/c/d'), { recursive: true })
    expect((await kho.quetLai()).chuaNhan.map((x) => x.duongDan)).toEqual(['a/b/c/x.md'])
  })

  it(`hơn ${TOI_DA_FILE_QUET} file .md → báo lỗi, dừng`, async () => {
    const dir = path.join(tam.noiDungDir, 'nhieu')
    fs.mkdirSync(dir)
    for (let i = 0; i <= TOI_DA_FILE_QUET; i++) fs.writeFileSync(path.join(dir, `${i}.md`), '')
    await expect(kho.quetLai()).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining('2.000'),
    })
  })
})

describe('slug cũ, banner thay cây', () => {
  it('GET /api/noi-dung/slug-cu; POST thay-cay/da-xem tắt banner một lần', async () => {
    expect((await get('/api/noi-dung/slug-cu')).body).toEqual({})
    db.prepare("INSERT INTO slug_cu (slug, item_id) VALUES ('ten-cu', ?)").run(scopeCreep.id)
    expect((await get('/api/noi-dung/slug-cu')).body).toEqual({ 'ten-cu': scopeCreep.id })
    ghiSetting(db, 'thay_cay', JSON.stringify({ them: 1, bo: 2, doiTen: 3, luc: 'x' }))
    expect((await meta()).thayCay).toEqual({ them: 1, bo: 2, doiTen: 3, luc: 'x' })
    const r = (await meta()).revision
    expect((await post('/api/noi-dung/thay-cay/da-xem')).body).toEqual({ revision: r + 1 })
    expect((await meta()).thayCay).toBeNull()
    expect((await post('/api/noi-dung/thay-cay/da-xem')).body).toEqual({ revision: r + 1 })
  })
})
