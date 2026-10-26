// Nhật ký file_ops (đề xuất 1.6, mục 6 "API"): một transaction ghi 'du-dinh' + mọi thay đổi SQLite; từng bước
// file idempotent; 'xong'; khởi động chạy tiếp. Giết tiến trình sau TỪNG bước (và giữa bước) rồi chạy tiếp →
// đúng như chạy một mạch. Bản cũ luôn vào thùng rác trước khi bị ghi đè. Hoàn tác đảo lại qua file_ops.
// Bất biến 5 (đường ghi khác "duyệt bản sửa" / "Giữ bản cũ" vào <slug>.md đã duyệt → từ chối), bất biến 8.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import cayJson from '../fixtures/roadmap-tree.json'
import cauHinhJson from '../../shared/roadmap/cau-hinh-cay.json'
import { datLech } from '../../shared/clock.ts'
import { dungCay, type MucHoc } from '../../shared/roadmap/index.ts'
import { moDb, type Db } from '../../server/db/index.ts'
import { chupBanDuyet, docBanChupHienHanh } from '../../server/du-lieu/ban-chup-duyet.ts'
import { docSo, docTepCuaMuc, layRevisionNoiDung } from '../../server/du-lieu/so-noi-dung.ts'
import { bamNoiDung } from '../../server/noi-dung/bam.ts'
import { duongDanCuaMuc } from '../../server/noi-dung/duong-dan.ts'
import {
  chayFileOp,
  daoNguocFileOp,
  docFileOp,
  dsFileOpDuDinh,
  taoFileOp,
  thucHienFileOp,
  tiepTucFileOps,
  type BuocFile,
  type DiemDung,
} from '../../server/noi-dung/file-ops.ts'
import { nhanTepCoSanDongBo } from '../../server/noi-dung/quet.ts'
import { LoiApi } from '../../server/loi.ts'
import { taoThuMucTam, type ThuMucTam } from './tro-giup.ts'

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
const evm = muc('Earned Value Management')

const fm = (m: MucHoc, them = '') =>
  `---\nid: ${m.id}\nloai: ${m.mau}\ntrang_thai_noi_dung: ban-nhap\nnguon: ai\n${them}---\n## Tóm tắt\n[Nội dung mẫu — ${m.slug}] …\n`
const daDuyet = (m: MucHoc) =>
  `---\nid: ${m.id}\nloai: ${m.mau}\ntrang_thai_noi_dung: da-duyet\nngay_duyet: 2026-10-18\nnguon: ai\n---\n## Tóm tắt\n[Nội dung mẫu — đã duyệt] …\n`

interface MoiTruong {
  tam: ThuMucTam
  db: Db
  goc: string
  ghi(tuongDoi: string, noiDung: string): void
  nhan(m: MucHoc, vai?: 'bai' | 'ban-sua', tuongDoi?: string): void
  dong(): void
}

async function taoMt(): Promise<MoiTruong> {
  const tam = taoThuMucTam()
  const db = await moDb(path.join(tam.dataDir, 'hoc.db'))
  const goc = tam.noiDungDir
  fs.mkdirSync(goc, { recursive: true })
  return {
    tam,
    db,
    goc,
    ghi(tuongDoi, noiDung) {
      const p = path.join(goc, tuongDoi)
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.writeFileSync(p, noiDung)
    },
    nhan(m, vai = 'bai', tuongDoi = duongDanCuaMuc(m, vai)) {
      nhanTepCoSanDongBo(db, goc, { duongDan: tuongDoi, itemId: m.id, vai, ngayNhap: '2026-10-01' })
    },
    dong() {
      db.close()
      tam.xoa()
    },
  }
}

/** Mọi file dưới gốc (tương đối → nội dung); nhãn thời điểm thùng rác thay bằng <nhan> để so giữa các lần chạy. */
function anhFile(goc: string): Record<string, string> {
  const kq: Record<string, string> = {}
  if (!fs.existsSync(goc)) return kq
  for (const ten of fs.readdirSync(goc, { recursive: true, encoding: 'utf8' })) {
    const p = path.join(goc, ten)
    if (!fs.lstatSync(p).isFile()) continue
    kq[
      ten
        .split(path.sep)
        .join('/')
        .replace(/\.thung-rac\/\d{8}-\d{6}-\d{3}/, '.thung-rac/<nhan>')
    ] = fs.readFileSync(p, 'utf8')
  }
  return kq
}

function anhSo(db: Db) {
  return docSo(db).map(({ mtime: _m, ...d }) => d)
}

let mt: MoiTruong
beforeEach(async () => {
  datLech(Date.parse('2026-10-26T10:00:00+07:00') - Date.now())
  mt = await taoMt()
})
afterEach(() => {
  mt.dong()
  datLech(0)
})

/** Trạng thái ban đầu dùng chung: nháp đã nhận, file lạ chưa nhận, bài đã duyệt, file tên khác hoa/thường. */
function dungBoiCanh(m: MoiTruong) {
  m.ghi(riskRegister.duongDanTuongDoi, fm(riskRegister))
  m.nhan(riskRegister)
  m.ghi('tai-ve/risk.md', fm(changeLog, 'giai_nghia: x\n'))
  m.ghi(salience.duongDanTuongDoi, fm(salience))
  m.nhan(salience)
  m.ghi(scopeCreep.duongDanTuongDoi, daDuyet(scopeCreep))
  m.nhan(scopeCreep)
  m.db.transaction(() =>
    chupBanDuyet(m.db, { itemId: scopeCreep.id, noiDung: daDuyet(scopeCreep) }),
  )()
  const evmHoa = evm.duongDanTuongDoi.replace(/[^/]+$/, (t) =>
    t.toUpperCase().replace('.MD', '.md'),
  )
  m.ghi(evmHoa, fm(evm))
  m.nhan(evm, 'bai', evmHoa)
  return { evmHoa }
}

function cacBuoc(evmHoa: string): BuocFile[] {
  const moiRisk = fm(riskRegister, 'giai_nghia: bản nhập\n')
  const banSua =
    daDuyet(scopeCreep).replace(
      'trang_thai_noi_dung: da-duyet\nngay_duyet: 2026-10-18\n',
      'trang_thai_noi_dung: ban-nhap\n',
    ) + '\n## Tự kiểm tra\n- H: a | Đ: b\n'
  return [
    // thay bản nháp (bản cũ vào thùng rác)
    {
      tu: null,
      den: riskRegister.duongDanTuongDoi,
      hashMoi: bamNoiDung(moiRisk),
      noiDung: moiRisk,
      so: { itemId: riskRegister.id, vai: 'bai', ngayNhap: '2026-10-26' },
    },
    // file chưa nhận → đường dẫn chuẩn của mục
    {
      tu: 'tai-ve/risk.md',
      den: changeLog.duongDanTuongDoi,
      hashMoi: bamNoiDung(fm(changeLog, 'giai_nghia: x\n')),
      so: { itemId: changeLog.id, vai: 'bai' },
    },
    // bản nháp vào thùng rác
    { tu: salience.duongDanTuongDoi, den: null, hashMoi: bamNoiDung(fm(salience)) },
    // bài đã duyệt: ghi vào bản sửa
    {
      tu: null,
      den: duongDanCuaMuc(scopeCreep, 'ban-sua'),
      hashMoi: bamNoiDung(banSua),
      noiDung: banSua,
      so: { itemId: scopeCreep.id, vai: 'ban-sua' },
    },
    // tên chỉ khác hoa/thường → tên chuẩn
    {
      tu: evmHoa,
      den: evm.duongDanTuongDoi,
      hashMoi: bamNoiDung(fm(evm)),
      so: { itemId: evm.id, vai: 'bai' },
    },
  ]
}

describe('file_ops: chạy một mạch', () => {
  it('ghi / chuyển / vào thùng rác / bản sửa / đổi hoa-thường; sổ khớp đĩa; bản cũ trong thùng rác', async () => {
    const { evmHoa } = dungBoiCanh(mt)
    const revTruoc = layRevisionNoiDung(mt.db)
    const kq = await thucHienFileOp(mt.db, cay, mt.goc, { op: 'nhap', buoc: cacBuoc(evmHoa) })
    expect(kq.loi).toEqual([])
    const files = anhFile(mt.goc)
    expect(files[riskRegister.duongDanTuongDoi]).toContain('giai_nghia: bản nhập')
    expect(files[`.thung-rac/<nhan>/${riskRegister.duongDanTuongDoi}`]).toBe(fm(riskRegister))
    expect(files[changeLog.duongDanTuongDoi]).toBe(fm(changeLog, 'giai_nghia: x\n'))
    expect(files['tai-ve/risk.md']).toBeUndefined()
    expect(files[salience.duongDanTuongDoi]).toBeUndefined()
    expect(files[`.thung-rac/<nhan>/${salience.duongDanTuongDoi}`]).toBe(fm(salience))
    expect(files[scopeCreep.duongDanTuongDoi]).toBe(daDuyet(scopeCreep))
    expect(files[duongDanCuaMuc(scopeCreep, 'ban-sua')]).toContain('## Tự kiểm tra')
    expect(fs.readdirSync(path.join(mt.goc, path.dirname(evm.duongDanTuongDoi)))).toContain(
      path.basename(evm.duongDanTuongDoi),
    )
    expect(files[evmHoa]).toBeUndefined()
    // không còn file tạm
    expect(Object.keys(files).filter((p) => /\.tmp$|doi-ten/.test(p))).toEqual([])
    // sổ
    expect(docTepCuaMuc(mt.db, riskRegister.id)).toMatchObject({
      path: riskRegister.duongDanTuongDoi,
      importedOn: '2026-10-26',
      hash: bamNoiDung(files[riskRegister.duongDanTuongDoi]),
    })
    expect(docTepCuaMuc(mt.db, changeLog.id)?.path).toBe(changeLog.duongDanTuongDoi)
    expect(docTepCuaMuc(mt.db, salience.id)).toBeUndefined()
    expect(docTepCuaMuc(mt.db, scopeCreep.id, 'ban-sua')?.path).toBe(
      duongDanCuaMuc(scopeCreep, 'ban-sua'),
    )
    expect(docTepCuaMuc(mt.db, evm.id)?.path).toBe(evm.duongDanTuongDoi)
    for (const d of docSo(mt.db)) expect(d.mtime, d.path).not.toBeNull()
    const op = docFileOp(mt.db, kq.id)
    expect(op?.state).toBe('xong')
    expect(op?.steps.every((b) => b.noi_dung === undefined)).toBe(true)
    // revision nội dung tăng khi lập và khi xong
    expect(layRevisionNoiDung(mt.db)).toBe(revTruoc + 2)
  })
})

describe('file_ops: giết tiến trình sau từng bước, khởi động lại → như chạy một mạch', () => {
  it('mọi điểm dừng (sau chép thùng rác, sau ghi file tạm, sau rename, sau mỗi bước, trước bước đầu)', async () => {
    // Lần chạy một mạch: ghi lại mọi điểm dừng và kết quả
    const { evmHoa } = dungBoiCanh(mt)
    const diem: [Parameters<DiemDung>[0], number][] = []
    await thucHienFileOp(
      mt.db,
      cay,
      mt.goc,
      { op: 'nhap', buoc: cacBuoc(evmHoa) },
      { diemDung: (ten, i) => void diem.push([ten, i]) },
    )
    const mongFile = anhFile(mt.goc)
    const mongSo = anhSo(mt.db)
    expect(diem.length).toBeGreaterThanOrEqual(10)

    for (const [tenDung, iDung] of [['truoc-buoc-dau', -1] as const, ...diem]) {
      const m2 = await taoMt()
      try {
        dungBoiCanh(m2)
        const id = taoFileOp(m2.db, cay, { op: 'nhap', buoc: cacBuoc(evmHoa) })
        if (tenDung !== 'truoc-buoc-dau') {
          await expect(
            chayFileOp(m2.db, m2.goc, id, {
              diemDung: (ten, i) => {
                if (ten === tenDung && i === iDung) throw new Error('chết')
              },
            }),
          ).rejects.toThrow('chết')
        }
        expect(dsFileOpDuDinh(m2.db)).toEqual([id])
        // "Khởi động lại"
        const tiep = await tiepTucFileOps(m2.db, m2.goc)
        expect(tiep).toEqual({ xong: [id], loi: [] })
        expect(anhFile(m2.goc), `${tenDung} #${iDung}`).toEqual(mongFile)
        expect(anhSo(m2.db), `${tenDung} #${iDung}`).toEqual(mongSo)
        expect(docFileOp(m2.db, id)?.state).toBe('xong')
        // chạy tiếp lần nữa: không làm gì thêm
        await tiepTucFileOps(m2.db, m2.goc)
        expect(anhFile(m2.goc)).toEqual(mongFile)
      } finally {
        m2.dong()
      }
    }
  })
})

describe('file_ops: bước không làm được', () => {
  it('nguồn đã mất → ghi loi cho bước, các bước khác vẫn chạy, op xong', async () => {
    mt.ghi('a.md', fm(changeLog))
    const kq = await thucHienFileOp(mt.db, cay, mt.goc, {
      op: 'quet-lai',
      buoc: [
        {
          tu: 'khong-co.md',
          den: salience.duongDanTuongDoi,
          hashMoi: 'x'.repeat(64),
          so: { itemId: salience.id, vai: 'bai' },
        },
        {
          tu: 'a.md',
          den: changeLog.duongDanTuongDoi,
          hashMoi: bamNoiDung(fm(changeLog)),
          so: { itemId: changeLog.id, vai: 'bai' },
        },
      ],
    })
    expect(kq.loi.map((x) => x.chiSo)).toEqual([0])
    expect(fs.readFileSync(path.join(mt.goc, changeLog.duongDanTuongDoi), 'utf8')).toBe(
      fm(changeLog),
    )
    expect(docFileOp(mt.db, kq.id)?.state).toBe('xong')
  })

  it('thư mục đích là symlink ra ngoài → bước bị từ chối, không ghi gì ra ngoài', async () => {
    const ngoai = path.join(mt.tam.goc, 'ngoai')
    fs.mkdirSync(ngoai)
    fs.symlinkSync(ngoai, path.join(mt.goc, scopeCreep.phan.slug))
    const noi = fm(scopeCreep)
    const kq = await thucHienFileOp(mt.db, cay, mt.goc, {
      op: 'nhap',
      buoc: [
        {
          tu: null,
          den: scopeCreep.duongDanTuongDoi,
          hashMoi: bamNoiDung(noi),
          noiDung: noi,
          so: { itemId: scopeCreep.id, vai: 'bai' },
        },
      ],
    })
    expect(kq.loi).toHaveLength(1)
    expect(fs.readdirSync(ngoai)).toEqual([])
  })

  it('kiểm trước khi lập: path traversal, tên lạ, hash không khớp, không bước nào → không ghi gì vào DB', async () => {
    const noi = fm(salience)
    const thu = (b: BuocFile) => () => taoFileOp(mt.db, cay, { op: 'nhap', buoc: [b] })
    expect(thu({ tu: null, den: '../ngoai.md', hashMoi: bamNoiDung(noi), noiDung: noi })).toThrow()
    expect(thu({ tu: null, den: 'a/b.txt', hashMoi: bamNoiDung(noi), noiDung: noi })).toThrow()
    expect(thu({ tu: null, den: 'a.md', hashMoi: 'sai', noiDung: noi })).toThrow()
    expect(thu({ tu: '/etc/passwd', den: 'a.md', hashMoi: bamNoiDung(noi) })).toThrow()
    expect(() => taoFileOp(mt.db, cay, { op: 'nhap', buoc: [] })).toThrow()
    expect(mt.db.prepare('SELECT count(*) AS n FROM file_ops').get()).toEqual({ n: 0 })
  })

  it('bất biến 8: sổ chỉ nhận id có trong cây, đúng vai (bai → mục học; tong-quan → phần / lĩnh vực)', () => {
    const noi = fm(salience)
    const lap = (itemId: string, vai: 'bai' | 'tong-quan') => () =>
      taoFileOp(mt.db, cay, {
        op: 'nhap',
        buoc: [
          { tu: null, den: 'x.md', hashMoi: bamNoiDung(noi), noiDung: noi, so: { itemId, vai } },
        ],
      })
    expect(lap('id-khong-co', 'bai')).toThrow(LoiApi)
    expect(lap(scopeCreep.linhVuc!.id, 'bai')).toThrow(LoiApi)
    expect(lap(scopeCreep.id, 'tong-quan')).toThrow(LoiApi)
    expect(lap(scopeCreep.linhVuc!.id, 'tong-quan')).not.toThrow()
  })
})

describe('Hoàn tác (đảo file_ops)', () => {
  it('file về như trước (bản nháp cũ lấy lại từ thùng rác, file nhập vào thùng rác), sổ + bản chụp về như trước', async () => {
    const { evmHoa } = dungBoiCanh(mt)
    const truocSo = anhSo(mt.db)
    // lô nhập còn "Nhận là Đã duyệt" một mục (◎): bản chụp mới cũng phải bị gỡ khi Hoàn tác
    mt.ghi(changeLog.duongDanTuongDoi.replace('change-log', 'khac'), daDuyet(changeLog))
    const viTriO = changeLog.duongDanTuongDoi.replace('change-log', 'khac')
    const truocFile2 = anhFile(mt.goc)
    const buoc = cacBuoc(evmHoa).filter((b) => b.tu !== 'tai-ve/risk.md')
    buoc.push({
      tu: viTriO,
      den: changeLog.duongDanTuongDoi,
      hashMoi: bamNoiDung(daDuyet(changeLog)),
      so: { itemId: changeLog.id, vai: 'bai' },
    })
    const kq = await thucHienFileOp(mt.db, cay, mt.goc, {
      op: 'nhap',
      buoc,
      thayDoiDb: () => chupBanDuyet(mt.db, { itemId: changeLog.id, noiDung: daDuyet(changeLog) }),
    })
    expect(docBanChupHienHanh(mt.db, changeLog.id)).toBeDefined()
    expect(anhFile(mt.goc)).not.toEqual(truocFile2)

    const hoanTac = await daoNguocFileOp(mt.db, cay, mt.goc, kq.id)
    expect(hoanTac.loi).toEqual([])
    const sau = anhFile(mt.goc)
    // Mọi file trước khi nhập còn đúng chỗ, đúng nội dung
    for (const [p, noi] of Object.entries(truocFile2)) expect(sau[p], p).toBe(noi)
    // Không mất gì: file mới ghi nằm trong thùng rác
    const trongRac = Object.entries(sau).filter(([p]) => p.startsWith('.thung-rac/'))
    expect(trongRac.map(([, n]) => n)).toEqual(
      expect.arrayContaining([fm(riskRegister, 'giai_nghia: bản nhập\n')]),
    )
    expect(sau[duongDanCuaMuc(scopeCreep, 'ban-sua')]).toBeUndefined()
    expect(anhSo(mt.db)).toEqual(truocSo)
    expect(docBanChupHienHanh(mt.db, changeLog.id)).toBeUndefined()
    expect(docBanChupHienHanh(mt.db, scopeCreep.id)).toBeDefined()

    // Hoàn tác lần nữa → 409
    await expect(daoNguocFileOp(mt.db, cay, mt.goc, kq.id)).rejects.toMatchObject({ status: 409 })
  })

  it('có thao tác sau chạm cùng file → không hoàn tác (409); op lạ → 404', async () => {
    const a = fm(salience)
    const op1 = await thucHienFileOp(mt.db, cay, mt.goc, {
      op: 'nhap',
      buoc: [
        {
          tu: null,
          den: salience.duongDanTuongDoi,
          hashMoi: bamNoiDung(a),
          noiDung: a,
          so: { itemId: salience.id, vai: 'bai' },
        },
      ],
    })
    const b = fm(salience, 'giai_nghia: lần 2\n')
    await thucHienFileOp(mt.db, cay, mt.goc, {
      op: 'nhap',
      buoc: [
        {
          tu: null,
          den: salience.duongDanTuongDoi,
          hashMoi: bamNoiDung(b),
          noiDung: b,
          so: { itemId: salience.id, vai: 'bai' },
        },
      ],
    })
    await expect(daoNguocFileOp(mt.db, cay, mt.goc, op1.id)).rejects.toMatchObject({ status: 409 })
    await expect(daoNguocFileOp(mt.db, cay, mt.goc, 999)).rejects.toMatchObject({ status: 404 })
  })
})

describe('Hoàn tác: phân biệt "đích đã có sẵn" với "trước đó chưa có file" (review 2b #3)', () => {
  const ghiSalience = (noi: string): BuocFile => ({
    tu: null,
    den: salience.duongDanTuongDoi,
    hashMoi: bamNoiDung(noi),
    noiDung: noi,
    so: { itemId: salience.id, vai: 'bai', ngayNhap: '2026-10-26' },
  })

  it('ghi đúng nội dung file đang có (nhập lại đúng file) → bước không đổi; Hoàn tác giữ file, không vào thùng rác', async () => {
    const a = fm(salience)
    mt.ghi(salience.duongDanTuongDoi, a)
    mt.nhan(salience)
    const truocSo = anhSo(mt.db)
    const kq = await thucHienFileOp(mt.db, cay, mt.goc, { op: 'nhap', buoc: [ghiSalience(a)] })
    expect(docFileOp(mt.db, kq.id)?.steps[0]).toMatchObject({ khong_doi: true })
    expect(docTepCuaMuc(mt.db, salience.id)?.importedOn).toBe('2026-10-26')

    const hoanTac = await daoNguocFileOp(mt.db, cay, mt.goc, kq.id)
    expect(hoanTac.loi).toEqual([])
    expect(anhFile(mt.goc)).toEqual({ [salience.duongDanTuongDoi]: a })
    expect(anhSo(mt.db)).toEqual(truocSo)
  })

  it('chết ngay sau khi ghi file mới (trước khi đánh dấu xong) → chạy tiếp → Hoàn tác vẫn biết trước đó chưa có file', async () => {
    const a = fm(salience)
    const id = taoFileOp(mt.db, cay, { op: 'nhap', buoc: [ghiSalience(a)] })
    await expect(
      chayFileOp(mt.db, mt.goc, id, {
        diemDung: (ten) => {
          if (ten === 'sau-doi-ten') throw new Error('chết')
        },
      }),
    ).rejects.toThrow('chết')
    expect(fs.existsSync(path.join(mt.goc, salience.duongDanTuongDoi))).toBe(true)
    await tiepTucFileOps(mt.db, mt.goc)
    const buoc = docFileOp(mt.db, id)?.steps[0]
    expect(buoc?.rac).toBeNull()
    expect(buoc?.khong_doi).toBeUndefined()

    await daoNguocFileOp(mt.db, cay, mt.goc, id)
    expect(anhFile(mt.goc)).toEqual({
      [`.thung-rac/<nhan>/${salience.duongDanTuongDoi}`]: a,
    })
    expect(docSo(mt.db)).toEqual([])
  })

  it('chuyển file vào chỗ đang có bản giống hệt → Hoàn tác trả cả hai file về như trước', async () => {
    const a = fm(changeLog)
    mt.ghi('tai-ve/change-log.md', a)
    mt.ghi(changeLog.duongDanTuongDoi, a)
    const truoc = anhFile(mt.goc)
    const kq = await thucHienFileOp(mt.db, cay, mt.goc, {
      op: 'quet-lai',
      buoc: [
        {
          tu: 'tai-ve/change-log.md',
          den: changeLog.duongDanTuongDoi,
          hashMoi: bamNoiDung(a),
          so: { itemId: changeLog.id, vai: 'bai' },
        },
      ],
    })
    expect(anhFile(mt.goc)['tai-ve/change-log.md']).toBeUndefined()
    const hoanTac = await daoNguocFileOp(mt.db, cay, mt.goc, kq.id)
    expect(hoanTac.loi).toEqual([])
    const sau = anhFile(mt.goc)
    for (const [p, noi] of Object.entries(truoc)) expect(sau[p], p).toBe(noi)
    expect(docSo(mt.db)).toEqual([])
  })

  it('đưa vào thùng rác một file đã không còn → bước không đổi; Hoàn tác không báo lỗi, không tạo file', async () => {
    const kq = await thucHienFileOp(mt.db, cay, mt.goc, {
      op: 'nhap',
      buoc: [{ tu: salience.duongDanTuongDoi, den: null, hashMoi: bamNoiDung(fm(salience)) }],
    })
    expect(docFileOp(mt.db, kq.id)?.steps[0]).toMatchObject({ khong_doi: true })
    const hoanTac = await daoNguocFileOp(mt.db, cay, mt.goc, kq.id)
    expect(hoanTac.loi).toEqual([])
    expect(anhFile(mt.goc)).toEqual({})
  })
})

describe('bất biến 5: chỉ "duyệt bản sửa" và "Giữ bản cũ" được ghi đè <slug>.md đã duyệt', () => {
  const sua = daDuyet(scopeCreep).replace('[Nội dung mẫu — đã duyệt]', '[Nội dung mẫu — sửa]')

  function chuanBi() {
    mt.ghi(scopeCreep.duongDanTuongDoi, daDuyet(scopeCreep))
    mt.nhan(scopeCreep)
    mt.db.transaction(() =>
      chupBanDuyet(mt.db, { itemId: scopeCreep.id, noiDung: daDuyet(scopeCreep) }),
    )()
    mt.ghi('tai-ve/ngoai.md', sua)
  }

  function canhGiu() {
    expect(fs.readFileSync(path.join(mt.goc, scopeCreep.duongDanTuongDoi), 'utf8')).toBe(
      daDuyet(scopeCreep),
    )
    expect(mt.db.prepare('SELECT count(*) AS n FROM file_ops').get()).toEqual({ n: 0 })
    expect(docBanChupHienHanh(mt.db, scopeCreep.id)?.hash).toBe(bamNoiDung(daDuyet(scopeCreep)))
  }

  it('mọi đường ghi khác bị từ chối 409, không đổi gì (ghi, chuyển đè, vào thùng rác, mọi tên op, đổi hoa/thường)', async () => {
    chuanBi()
    const ghi: BuocFile = {
      tu: null,
      den: scopeCreep.duongDanTuongDoi,
      hashMoi: bamNoiDung(sua),
      noiDung: sua,
      so: { itemId: scopeCreep.id, vai: 'bai' },
    }
    const ghiHoa: BuocFile = {
      ...ghi,
      den: scopeCreep.duongDanTuongDoi.toUpperCase().replace('.MD', '.md'),
    }
    const chuyenDe: BuocFile = {
      tu: 'tai-ve/ngoai.md',
      den: scopeCreep.duongDanTuongDoi,
      hashMoi: bamNoiDung(sua),
      so: { itemId: scopeCreep.id, vai: 'bai' },
    }
    const vaoRac: BuocFile = {
      tu: scopeCreep.duongDanTuongDoi,
      den: null,
      hashMoi: bamNoiDung(daDuyet(scopeCreep)),
    }
    for (const op of [
      'nhap',
      'quet-lai',
      'luu',
      'chuyen-cho',
      'thay-cay',
      'duyet',
      'hoan-tac:1',
      'giu-ban-cu',
    ]) {
      for (const b of [ghi, ghiHoa, chuyenDe, vaoRac]) {
        if (op === 'thay-cay' && b === chuyenDe) continue // thay cây chỉ dời file đã nhận (kiểm ở thay-cay.test)
        expect(() => taoFileOp(mt.db, cay, { op, buoc: [b] }), `${op} ${b.tu}→${b.den}`).toThrow(
          LoiApi,
        )
        canhGiu()
      }
    }
    // thay bản chụp ngoài "duyệt bản sửa" cũng bị từ chối
    expect(() =>
      taoFileOp(mt.db, cay, {
        op: 'nhap',
        buoc: [ghi],
        thayDoiDb: () => chupBanDuyet(mt.db, { itemId: scopeCreep.id, noiDung: sua }),
      }),
    ).toThrow(LoiApi)
    canhGiu()
  })

  it('đường được phép: ghi vào .ban-sua.md; "Giữ bản cũ" (ghi lại đúng bản chụp); "duyệt bản sửa" (bản chụp mới = nội dung ghi)', async () => {
    chuanBi()
    const banSua = {
      tu: null,
      den: duongDanCuaMuc(scopeCreep, 'ban-sua'),
      hashMoi: bamNoiDung(sua),
      noiDung: sua,
      so: { itemId: scopeCreep.id, vai: 'ban-sua' as const },
    }
    await thucHienFileOp(mt.db, cay, mt.goc, { op: 'nhap', buoc: [banSua] })
    // sửa ngoài app rồi "Giữ bản cũ"
    mt.ghi(scopeCreep.duongDanTuongDoi, sua)
    const goc = daDuyet(scopeCreep)
    await thucHienFileOp(mt.db, cay, mt.goc, {
      op: 'giu-ban-cu',
      buoc: [
        {
          tu: null,
          den: scopeCreep.duongDanTuongDoi,
          hashMoi: bamNoiDung(goc),
          noiDung: goc,
          so: { itemId: scopeCreep.id, vai: 'bai' },
        },
      ],
    })
    expect(fs.readFileSync(path.join(mt.goc, scopeCreep.duongDanTuongDoi), 'utf8')).toBe(goc)
    expect(Object.values(anhFile(mt.goc))).toContain(sua) // bản ngoài app vào thùng rác
    // duyệt bản sửa
    const moi = sua.replace('ngay_duyet: 2026-10-18', 'ngay_duyet: 2026-10-26')
    await thucHienFileOp(mt.db, cay, mt.goc, {
      op: 'duyet-ban-sua',
      buoc: [
        {
          tu: null,
          den: scopeCreep.duongDanTuongDoi,
          hashMoi: bamNoiDung(moi),
          noiDung: moi,
          so: { itemId: scopeCreep.id, vai: 'bai' },
        },
        { tu: duongDanCuaMuc(scopeCreep, 'ban-sua'), den: null, hashMoi: bamNoiDung(sua) },
      ],
      thayDoiDb: () => chupBanDuyet(mt.db, { itemId: scopeCreep.id, noiDung: moi }),
    })
    expect(docBanChupHienHanh(mt.db, scopeCreep.id)?.ngayDuyet).toBe('2026-10-26')
    expect(fs.existsSync(path.join(mt.goc, duongDanCuaMuc(scopeCreep, 'ban-sua')))).toBe(false)
    expect(
      mt.db
        .prepare('SELECT count(*) AS n FROM content_approvals WHERE item_id = ?')
        .get(scopeCreep.id),
    ).toEqual({ n: 2 })
  })
})
