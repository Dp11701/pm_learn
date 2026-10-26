// Thay file cây (đề xuất 1.3, mục 6 "Unit": thêm, bỏ, đổi tên → chuyển file, slug_cu, mồ côi): bản sửa của cây
// đóng băng — đổi tên 1 mục, đổi chỗ tên 2 mục (slug đổi cho nhau), bỏ 1 mục, thêm 1 mục, chuyển 1 mục sang
// lĩnh vực khác. File đã nhận chuyển qua file_ops (kể cả bài Đã duyệt), slug_cu, mồ côi giữ nguyên, banner một
// lần, sao lưu trước; chết giữa chừng → khởi động lại chạy tiếp ra cùng kết quả.
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import cayJson from '../fixtures/roadmap-tree.json'
import cauHinhJson from '../../shared/roadmap/cau-hinh-cay.json'
import { datLech } from '../../shared/clock.ts'
import { dungCay, type Cay, type MucHoc } from '../../shared/roadmap/index.ts'
import { taoApp } from '../../server/app.ts'
import { docCauHinh } from '../../server/cau-hinh.ts'
import { moDb, type Db } from '../../server/db/index.ts'
import { docSetting } from '../../server/db/settings.ts'
import { chupBanDuyet } from '../../server/du-lieu/ban-chup-duyet.ts'
import { docSlugCu } from '../../server/du-lieu/slug-cu.ts'
import { docSo, docTepCuaMuc } from '../../server/du-lieu/so-noi-dung.ts'
import { datTrangThai } from '../../server/du-lieu/trang-thai.ts'
import { duongDanCuaMuc } from '../../server/noi-dung/duong-dan.ts'
import { dsFileOpDuDinh, tiepTucFileOps } from '../../server/noi-dung/file-ops.ts'
import type { PhanHoiBai } from '../../server/noi-dung/hop-dong-bai.ts'
import { nhanTepCoSanDongBo } from '../../server/noi-dung/quet.ts'
import { THU_MUC_TAM_THAY_CAY, anhCay, xuLyThayCay } from '../../server/noi-dung/thay-cay.ts'
import { taoSaoLuu } from '../../server/sao-luu.ts'
import { HOST, taoThuMucTam, type ThuMucTam } from './tro-giup.ts'

type NutJson = { id: string; kind: string; label: string; children?: NutJson[] }

const cayCu = dungCay(cayJson, cauHinhJson)
const mucCu = (label: string): MucHoc => {
  const ds = cayCu.mucHoc.filter((m) => m.label === label)
  if (ds.length !== 1) throw new Error(label)
  return ds[0]
}
const risk = mucCu('Risk Register')
const scrum = mucCu('Scrum')
const kanban = mucCu('Kanban')
const changeLog = mucCu('Change log')
const salience = mucCu('Salience Model')
const scopeCreep = mucCu('Scope Creep')
const tShirt = mucCu('T-shirt Sizing')

/** Bản sửa của cây đóng băng (JSON) */
function cayMoiJson(): unknown {
  const json = structuredClone(cayJson) as { parts: NutJson[] }
  const tatCa: NutJson[] = []
  const duyet = (n: NutJson) => {
    tatCa.push(n)
    n.children?.forEach(duyet)
  }
  json.parts.forEach(duyet)
  const nut = (id: string) => tatCa.find((n) => n.id === id)!
  const cha = (id: string) => tatCa.find((n) => n.children?.some((c) => c.id === id))!
  nut(risk.id).label = 'Risk Register Log'
  nut(scrum.id).label = 'Kanban'
  nut(kanban.id).label = 'Scrum'
  const chaLog = cha(changeLog.id)
  chaLog.children = chaLog.children!.filter((c) => c.id !== changeLog.id)
  const chaSal = cha(salience.id)
  chaSal.children = chaSal.children!.filter((c) => c.id !== salience.id)
  cha(scopeCreep.id).children!.push(nut(salience.id))
  cha(scopeCreep.id).children!.push({
    id: 'muc-moi-hoan-toan',
    kind: 'topic',
    label: 'Brand New Topic',
  })
  return json
}

const fm = (m: MucHoc, them = '') =>
  `---\nid: ${m.id}\nloai: ${m.mau}\ntrang_thai_noi_dung: ban-nhap\nnguon: ai\n${them}---\n## Tóm tắt\n[Nội dung mẫu — ${m.slug}] …\n`
const daDuyet = (m: MucHoc) =>
  `---\nid: ${m.id}\nloai: ${m.mau}\ntrang_thai_noi_dung: da-duyet\nngay_duyet: 2026-10-18\nnguon: ai\n---\n## Tóm tắt\n[Nội dung mẫu — đã duyệt] …\n`

let tam: ThuMucTam
let db: Db
let cayMoi: Cay

function ghi(tuongDoi: string, noiDung: string) {
  const p = path.join(tam.noiDungDir, tuongDoi)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, noiDung)
}
const nhan = (m: MucHoc, vai: 'bai' | 'ban-sua' = 'bai') =>
  nhanTepCoSanDongBo(db, tam.noiDungDir, { duongDan: duongDanCuaMuc(m, vai), itemId: m.id, vai })

/** Dữ liệu trên cây cũ: 5 file đã nhận (1 đã duyệt + bản sửa), 1 dòng sổ đã mất, trạng thái học của mục sắp bị bỏ. */
async function dungDuLieu() {
  expect(
    (await xuLyThayCay(db, { noiDungDir: tam.noiDungDir, cay: cayCu, sha: 'sha-1' })).ketQua,
  ).toBe('moi')
  for (const m of [risk, scrum, kanban, changeLog]) {
    ghi(m.duongDanTuongDoi, fm(m))
    nhan(m)
  }
  ghi(salience.duongDanTuongDoi, daDuyet(salience))
  nhan(salience)
  db.transaction(() => chupBanDuyet(db, { itemId: salience.id, noiDung: daDuyet(salience) }))()
  ghi(duongDanCuaMuc(salience, 'ban-sua'), fm(salience, 'giai_nghia: bản sửa\n'))
  nhan(salience, 'ban-sua')
  // dòng sổ đã mất của một mục không đổi chỗ, và của mục đổi tên (không có bước file)
  ghi(tShirt.duongDanTuongDoi, fm(tShirt))
  nhan(tShirt)
  fs.rmSync(path.join(tam.noiDungDir, tShirt.duongDanTuongDoi))
  db.prepare(
    "UPDATE content_files SET missing_since = '2026-10-20T00:00:00.000Z' WHERE path = ?",
  ).run(tShirt.duongDanTuongDoi)
  datTrangThai(db, { id: changeLog.id, giaTri: { trangThai: 'dang-hoc' }, via: 'mot-muc' })
}

function anhFile(goc: string): Record<string, string> {
  const kq: Record<string, string> = {}
  for (const ten of fs.readdirSync(goc, { recursive: true, encoding: 'utf8' })) {
    const p = path.join(goc, ten)
    if (fs.lstatSync(p).isFile()) kq[ten.split(path.sep).join('/')] = fs.readFileSync(p, 'utf8')
  }
  return kq
}

beforeEach(async () => {
  datLech(0)
  tam = taoThuMucTam()
  fs.mkdirSync(tam.noiDungDir, { recursive: true })
  db = await moDb(path.join(tam.dataDir, 'hoc.db'))
  cayMoi = dungCay(cayMoiJson(), cauHinhJson)
})

afterEach(() => {
  vi.restoreAllMocks()
  db.close()
  tam.xoa()
})

describe('xuLyThayCay', () => {
  it('lần đầu: ghi cay_sha + ảnh cây; cây khớp: không làm gì; DB 2a (thiếu ảnh cây) được bổ sung ảnh', async () => {
    expect(
      (await xuLyThayCay(db, { noiDungDir: tam.noiDungDir, cay: cayCu, sha: 's' })).ketQua,
    ).toBe('moi')
    expect(docSetting(db, 'cay_sha')).toBe('s')
    expect(JSON.parse(docSetting(db, 'cay_nut')!)).toEqual(anhCay(cayCu))
    db.prepare("DELETE FROM settings WHERE key = 'cay_nut'").run()
    expect(
      (await xuLyThayCay(db, { noiDungDir: tam.noiDungDir, cay: cayCu, sha: 's' })).ketQua,
    ).toBe('khop')
    expect(JSON.parse(docSetting(db, 'cay_nut')!)).toEqual(anhCay(cayCu))
    expect(docSetting(db, 'thay_cay')).toBeNull()
  })

  it('cây đổi: sao lưu trước; chuyển file theo id (cả đổi chỗ cho nhau, bài đã duyệt, bản sửa); slug_cu; mồ côi giữ; banner', async () => {
    await dungDuLieu()
    const truoc = anhFile(tam.noiDungDir)
    const saoLuu = vi.fn(async () => {
      // sao lưu chạy trước khi đổi gì
      expect(docSetting(db, 'cay_sha')).toBe('sha-1')
      expect(anhFile(tam.noiDungDir)).toEqual(truoc)
    })
    const kq = await xuLyThayCay(db, {
      noiDungDir: tam.noiDungDir,
      cay: cayMoi,
      sha: 'sha-2',
      saoLuuNgay: saoLuu,
    })
    expect(saoLuu).toHaveBeenCalledWith('thay-cay')
    expect(kq).toMatchObject({
      ketQua: 'khac',
      banner: { them: 1, bo: 1, doiTen: 3 },
      soFileChuyen: 5,
    })

    const moi = (id: string) => cayMoi.mucTheoId.get(id)!
    const files = anhFile(tam.noiDungDir)
    // đổi tên: risk-register → risk-register-log
    expect(moi(risk.id).slug).toBe('risk-register-log')
    expect(files[moi(risk.id).duongDanTuongDoi]).toBe(fm(risk))
    expect(files[risk.duongDanTuongDoi]).toBeUndefined()
    // đổi chỗ: scrum.md ↔ kanban.md theo id
    expect(moi(scrum.id).duongDanTuongDoi).toBe(kanban.duongDanTuongDoi)
    expect(files[kanban.duongDanTuongDoi]).toBe(fm(scrum))
    expect(files[scrum.duongDanTuongDoi]).toBe(fm(kanban))
    // chuyển lĩnh vực: bài đã duyệt + bản sửa
    expect(files[moi(salience.id).duongDanTuongDoi]).toBe(daDuyet(salience))
    expect(files[duongDanCuaMuc(moi(salience.id), 'ban-sua')]).toBe(
      fm(salience, 'giai_nghia: bản sửa\n'),
    )
    expect(files[salience.duongDanTuongDoi]).toBeUndefined()
    // mồ côi: file + dòng sổ + trạng thái học giữ nguyên
    expect(files[changeLog.duongDanTuongDoi]).toBe(fm(changeLog))
    expect(docTepCuaMuc(db, changeLog.id)?.path).toBe(changeLog.duongDanTuongDoi)
    expect(
      db.prepare('SELECT status FROM item_status WHERE item_id = ?').get(changeLog.id),
    ).toEqual({
      status: 'learning',
    })
    // không còn thư mục tạm, không có gì vào thùng rác
    expect(Object.keys(files).some((p) => p.startsWith(THU_MUC_TAM_THAY_CAY))).toBe(false)
    expect(fs.existsSync(path.join(tam.noiDungDir, THU_MUC_TAM_THAY_CAY))).toBe(false)
    expect(Object.keys(files).some((p) => p.startsWith('.thung-rac'))).toBe(false)
    expect(Object.keys(files)).toHaveLength(Object.keys(truoc).length)
    // sổ theo id
    for (const m of [risk, scrum, kanban, salience]) {
      expect(docTepCuaMuc(db, m.id)?.path, m.label).toBe(moi(m.id).duongDanTuongDoi)
    }
    expect(docTepCuaMuc(db, salience.id, 'ban-sua')?.path).toBe(
      duongDanCuaMuc(moi(salience.id), 'ban-sua'),
    )
    expect(docTepCuaMuc(db, tShirt.id)?.missingSince).not.toBeNull()
    expect(
      docSo(db).every((d) => cayMoi.nutTheoId.has(d.itemId) || d.itemId === changeLog.id),
    ).toBe(true)
    // slug_cu: slug cũ → id; slug đang là slug hiện tại của nút khác thì không giữ
    expect(docSlugCu(db)).toEqual({ 'risk-register': risk.id })
    // settings
    expect(docSetting(db, 'cay_sha')).toBe('sha-2')
    expect(JSON.parse(docSetting(db, 'cay_nut')!)).toEqual(anhCay(cayMoi))
    expect(JSON.parse(docSetting(db, 'thay_cay')!)).toMatchObject({ them: 1, bo: 1, doiTen: 3 })
    expect(dsFileOpDuDinh(db)).toEqual([])

    // chạy lại với cùng cây: không làm gì
    expect(
      (await xuLyThayCay(db, { noiDungDir: tam.noiDungDir, cay: cayMoi, sha: 'sha-2' })).ketQua,
    ).toBe('khop')
    expect(anhFile(tam.noiDungDir)).toEqual(files)
  })

  it('API trên cây mới: bài đã duyệt đọc file ở chỗ mới (không banner); /api/meta có banner; mục mồ côi 404', async () => {
    await dungDuLieu()
    await xuLyThayCay(db, { noiDungDir: tam.noiDungDir, cay: cayMoi, sha: 'sha-2' })
    const saoLuu = taoSaoLuu({ db, dataDir: tam.dataDir, noiDungDir: tam.noiDungDir })
    const cauHinh = docCauHinh({ DATA_DIR: tam.dataDir, NOI_DUNG_DIR: tam.noiDungDir })
    const app = taoApp({ cauHinh, db, saoLuu, soMucHoc: cayMoi.soMucHoc, cay: cayMoi })
    const get = (url: string) => request(app).get(url).set('Host', HOST)
    const bai = (await get(`/api/bai/${salience.id}`)).body as PhanHoiBai
    expect(bai.trangThaiNoiDung).toEqual({
      loai: 'da-duyet',
      ngayDuyet: '2026-10-18',
      coBanSua: true,
    })
    expect(bai.banHien).toBe('file')
    expect(bai.canhBaoDuyet).toBeNull()
    const meta = (await get('/api/meta')).body.noiDung
    expect(meta.thayCay).toMatchObject({ them: 1, bo: 1, doiTen: 3 })
    // file của mục mồ côi vẫn giữ dòng sổ (dữ liệu giữ nguyên) nên không đếm là chưa nhận
    expect(meta.chuaNhan).toBe(0)
    expect((await get(`/api/bai/${changeLog.id}`)).status).toBe(404)
    expect((await get('/api/noi-dung/slug-cu')).body).toEqual({ 'risk-register': risk.id })
    await saoLuu.choXong()
  })

  it('chết giữa lúc chuyển file → khởi động lại (tiepTucFileOps) ra đúng kết quả như chạy một mạch', async () => {
    // Một mạch
    await dungDuLieu()
    await xuLyThayCay(db, { noiDungDir: tam.noiDungDir, cay: cayMoi, sha: 'sha-2' })
    const mong = anhFile(tam.noiDungDir)
    const mongSo = docSo(db).map(({ mtime: _m, ...d }) => d)
    db.close()
    tam.xoa()

    for (const lan of [1, 3, 6, 9]) {
      tam = taoThuMucTam()
      fs.mkdirSync(tam.noiDungDir, { recursive: true })
      db = await moDb(path.join(tam.dataDir, 'hoc.db'))
      await dungDuLieu()
      let dem = 0
      const that = fsp.rename.bind(fsp)
      const gia = vi.spyOn(fsp, 'rename').mockImplementation(async (a, b) => {
        if (++dem === lan) throw new Error('chết')
        return that(a, b)
      })
      await expect(
        xuLyThayCay(db, { noiDungDir: tam.noiDungDir, cay: cayMoi, sha: 'sha-2' }),
      ).rejects.toThrow('chết')
      gia.mockRestore()
      // cây đã ghi nhận (cùng transaction với file_ops 'du-dinh'): lần khởi động sau không xử lý lại
      expect(docSetting(db, 'cay_sha')).toBe('sha-2')
      expect(dsFileOpDuDinh(db)).toHaveLength(1)
      await tiepTucFileOps(db, tam.noiDungDir)
      const sau = anhFile(tam.noiDungDir)
      // thư mục tạm rỗng có thể còn (không có file); file giống hệt
      expect(sau, `rename thứ ${lan}`).toEqual(mong)
      expect(docSo(db).map(({ mtime: _m, ...d }) => d)).toEqual(mongSo)
      db.close()
      tam.xoa()
    }
    tam = taoThuMucTam()
    db = await moDb(path.join(tam.dataDir, 'hoc.db'))
  })
})
