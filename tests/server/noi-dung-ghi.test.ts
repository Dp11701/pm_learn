// Ghi file nội dung (đề xuất 1.6 "Ghi file", mục 6 "API"): path traversal, symlink, basename lạ, realpath trong
// gốc, ghi nguyên tử không để lại file tạm, tên chỉ khác hoa/thường, thùng rác không bao giờ ghi đè, NFC + LF;
// sửa frontmatter giữ thứ tự khoá, chú thích, khoá lạ và thân bài TỪNG BYTE.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { docFrontmatter } from '../../shared/noi-dung/index.ts'
import { bamNoiDung } from '../../server/noi-dung/bam.ts'
import {
  LoiTep,
  THUNG_RAC,
  chepVaoRac,
  chuanHoaTep,
  chuanTenHoaThuong,
  duongDanRac,
  giaiDuongDan,
  ghiNguyenTu,
  kiemTenTep,
  nhanThoiDiem,
} from '../../server/noi-dung/ghi-tep.ts'
import { epBanNhap, suaFrontmatter } from '../../server/noi-dung/sua-frontmatter.ts'
import { taoThuMucTam, type ThuMucTam } from './tro-giup.ts'

let tam: ThuMucTam
let goc: string
let ngoai: string

beforeEach(() => {
  tam = taoThuMucTam()
  goc = tam.noiDungDir
  fs.mkdirSync(goc, { recursive: true })
  ngoai = path.join(tam.goc, 'ngoai')
  fs.mkdirSync(ngoai)
})

afterEach(() => tam.xoa())

/** Mọi file dưới thư mục (tương đối → nội dung), kể cả file ẩn. */
function anhChup(thuMuc: string): Record<string, string> {
  const kq: Record<string, string> = {}
  if (!fs.existsSync(thuMuc)) return kq
  for (const ten of fs.readdirSync(thuMuc, { recursive: true, encoding: 'utf8' })) {
    const p = path.join(thuMuc, ten)
    if (fs.lstatSync(p).isFile()) kq[ten.split(path.sep).join('/')] = fs.readFileSync(p, 'utf8')
  }
  return kq
}

describe('kiemTenTep: basename client gửi (^[^/\\\\\\0]{1,200}\\.md$)', () => {
  it('nhận tên .md thường, có dấu, có khoảng trắng; tối đa 200 ký tự trước .md', () => {
    for (const ten of [
      'a.md',
      'scope-creep.md',
      'Phạm vi.md',
      'x y (2).md',
      `${'a'.repeat(200)}.md`,
    ]) {
      expect(kiemTenTep(ten), ten).toBe(true)
    }
  })

  it('từ chối đường dẫn, \\, NUL, đuôi khác, tên rỗng, quá dài', () => {
    for (const ten of [
      '../a.md',
      'a/b.md',
      'a\\b.md',
      'a\0.md',
      '.md',
      'a.MD',
      'a.md.txt',
      'a.markdown',
      `${'a'.repeat(201)}.md`,
      '',
    ]) {
      expect(kiemTenTep(ten), JSON.stringify(ten)).toBe(false)
    }
  })
})

describe('giaiDuongDan: đường dẫn ghi an toàn', () => {
  it('từ chối thành phần rỗng / . / .. / \\ / NUL / tuyệt đối (path traversal)', async () => {
    for (const p of [
      '',
      '/etc/passwd.md',
      'a//b.md',
      './a.md',
      'a/../../b.md',
      '..',
      'a\\..\\b.md',
      'a\0.md',
    ]) {
      await expect(giaiDuongDan(goc, p, { taoCha: true }), p).rejects.toBeInstanceOf(LoiTep)
    }
    expect(anhChup(tam.goc)).toEqual({})
  })

  it('tạo thư mục cha khi cần; trả đường dẫn trong realpath(gốc)', async () => {
    const p = await giaiDuongDan(goc, 'phan/linh-vuc/bai.md', { taoCha: true })
    expect(p?.tep).toBe(path.join(fs.realpathSync(goc), 'phan', 'linh-vuc', 'bai.md'))
    expect(fs.statSync(path.join(goc, 'phan', 'linh-vuc')).isDirectory()).toBe(true)
  })

  it('thư mục giữa đường là symlink ra ngoài → LoiTep symlink, không tạo gì ngoài gốc', async () => {
    fs.symlinkSync(ngoai, path.join(goc, 'phan'))
    await expect(giaiDuongDan(goc, 'phan/linh-vuc/bai.md', { taoCha: true })).rejects.toMatchObject(
      { lyDo: 'symlink' },
    )
    expect(fs.readdirSync(ngoai)).toEqual([])
  })

  it('file đích là symlink → từ chối (không ghi xuyên symlink)', async () => {
    fs.writeFileSync(path.join(ngoai, 'that.md'), 'x')
    fs.symlinkSync(path.join(ngoai, 'that.md'), path.join(goc, 'lien-ket.md'))
    await expect(giaiDuongDan(goc, 'lien-ket.md')).rejects.toMatchObject({ lyDo: 'symlink' })
  })

  it('đích là thư mục → từ chối', async () => {
    fs.mkdirSync(path.join(goc, 'thu-muc.md'))
    await expect(giaiDuongDan(goc, 'thu-muc.md')).rejects.toMatchObject({
      lyDo: 'khong-phai-file',
    })
  })

  it('gốc là symlink (vd. /var → /private/var) vẫn ghi được, đường dẫn theo realpath', async () => {
    const gocLienKet = path.join(tam.goc, 'goc-lien-ket')
    fs.symlinkSync(goc, gocLienKet)
    const p = await giaiDuongDan(gocLienKet, 'a/b.md', { taoCha: true })
    expect(p?.tep.startsWith(fs.realpathSync(goc))).toBe(true)
  })
})

describe('ghiNguyenTu', () => {
  it('ghi đúng byte, không để lại file tạm; lỗi trước rename thì file cũ còn nguyên, không còn file tạm', async () => {
    const tep = path.join(goc, 'a.md')
    fs.writeFileSync(tep, 'cũ')
    await ghiNguyenTu(tep, 'mới')
    expect(fs.readFileSync(tep, 'utf8')).toBe('mới')
    expect(fs.readdirSync(goc)).toEqual(['a.md'])
    await expect(
      ghiNguyenTu(tep, 'hỏng', () => {
        throw new Error('chết giữa chừng')
      }),
    ).rejects.toThrow('chết giữa chừng')
    expect(fs.readFileSync(tep, 'utf8')).toBe('mới')
    expect(fs.readdirSync(goc)).toEqual(['a.md'])
  })
})

describe('tên chỉ khác hoa/thường (APFS)', () => {
  it('Scope-Creep.md → scope-creep.md qua tên tạm, nội dung giữ nguyên', async () => {
    fs.writeFileSync(path.join(goc, 'Scope-Creep.md'), 'nội dung')
    expect(await chuanTenHoaThuong(goc, 'scope-creep.md', '.scope-creep.md.doi-ten-1-0')).toBe(true)
    expect(fs.readdirSync(goc)).toEqual(['scope-creep.md'])
    expect(fs.readFileSync(path.join(goc, 'scope-creep.md'), 'utf8')).toBe('nội dung')
    expect(await chuanTenHoaThuong(goc, 'scope-creep.md', '.x')).toBe(false)
  })

  it('chết sau khi đổi sang tên tạm → lần sau đổi tiếp sang tên chuẩn', async () => {
    fs.writeFileSync(path.join(goc, '.scope-creep.md.doi-ten-1-0'), 'nội dung')
    expect(await chuanTenHoaThuong(goc, 'scope-creep.md', '.scope-creep.md.doi-ten-1-0')).toBe(true)
    expect(fs.readdirSync(goc)).toEqual(['scope-creep.md'])
  })
})

describe('thùng rác .thung-rac/<YYYYMMDD-HHmmss-SSS>/<đường dẫn gốc>', () => {
  it('nhãn thời điểm đúng dạng', () => {
    expect(nhanThoiDiem()).toMatch(/^\d{8}-\d{6}-\d{3}$/)
    expect(duongDanRac('20261026-101500-123', 'a/b.md')).toBe(
      `${THUNG_RAC}/20261026-101500-123/a/b.md`,
    )
    expect(duongDanRac('20261026-101500-123', 'a/b.md', 2)).toBe(
      `${THUNG_RAC}/20261026-101500-123-2/a/b.md`,
    )
  })

  it('chép giữ file gốc; chép lại cùng bản → cùng chỗ; bản khác cùng nhãn → chỗ mới, KHÔNG ghi đè', async () => {
    fs.mkdirSync(path.join(goc, 'p'))
    fs.writeFileSync(path.join(goc, 'p', 'a.md'), 'bản 1')
    const nhan = '20261026-101500-123'
    const r1 = await chepVaoRac(goc, nhan, 'p/a.md', bamNoiDung('bản 1'))
    expect(r1).toBe(`${THUNG_RAC}/${nhan}/p/a.md`)
    expect(await chepVaoRac(goc, nhan, 'p/a.md', bamNoiDung('bản 1'))).toBe(r1)
    fs.writeFileSync(path.join(goc, 'p', 'a.md'), 'bản 2')
    const r2 = await chepVaoRac(goc, nhan, 'p/a.md', bamNoiDung('bản 2'))
    expect(r2).toBe(`${THUNG_RAC}/${nhan}-2/p/a.md`)
    expect(anhChup(goc)).toEqual({
      'p/a.md': 'bản 2',
      [r1]: 'bản 1',
      [r2]: 'bản 2',
    })
  })
})

describe('chuanHoaTep: NFC, LF, bỏ BOM', () => {
  it('NFD → NFC, CRLF / CR → LF, bỏ BOM đầu file', () => {
    const nfd = 'Phạm vi'.normalize('NFD')
    expect(chuanHoaTep(`\uFEFF---\r\nloai: chu-de\r\n---\r${nfd}\r\n`)).toBe(
      `---\nloai: chu-de\n---\n${nfd.normalize('NFC')}\n`,
    )
  })
})

describe('suaFrontmatter (yaml.parseDocument): giữ khoá lạ, chú thích, thứ tự; thân bài từng byte', () => {
  const THAN =
    '## Tóm tắt\r\n[Nội dung mẫu — Tóm tắt] …  \n\n```\n---\nkhông phải frontmatter\n```\n'
  const FILE = [
    '---',
    '# chú thích đầu',
    'loai: chu-de   # loại bài',
    'giai_nghia: "[Nội dung mẫu — giải nghĩa]"',
    'trang_thai_noi_dung: da-duyet',
    'ngay_duyet: 2026-10-18 # ngày',
    'lien_quan:',
    '  - a',
    '  - b',
    'khoa_la: { x: 1, y: [2, 3] }',
    'so: 012',
    '---',
    '',
  ].join('\n')

  it('ép ban-nhap + thêm id: chỉ đổi đúng các dòng đó, khoá lạ / chú thích / thân bài nguyên vẹn', () => {
    const goc = FILE + THAN
    const kq = epBanNhap(goc, 'id-moi', false)
    expect(kq).toBe(
      [
        '---',
        '# chú thích đầu',
        'id: id-moi',
        'loai: chu-de   # loại bài',
        'giai_nghia: "[Nội dung mẫu — giải nghĩa]"',
        'trang_thai_noi_dung: ban-nhap',
        'lien_quan:',
        '  - a',
        '  - b',
        'khoa_la: { x: 1, y: [2, 3] }',
        'so: 012',
        '---',
        '',
      ].join('\n') + THAN,
    )
    // thân bài từng byte
    expect(Buffer.from(kq.slice(kq.length - THAN.length))).toEqual(Buffer.from(THAN))
    const fm = docFrontmatter(kq).frontmatter
    expect(fm).toMatchObject({ id: 'id-moi', trangThaiNoiDung: 'ban-nhap', lienQuan: ['a', 'b'] })
    expect(fm?.khoaLa).toEqual({ khoa_la: { x: '1', y: ['2', '3'] }, so: '012' })
    expect(fm?.ngayDuyet).toBeUndefined()
  })

  it('đã có id thì không thêm; file đã là ban-nhap không ngay_duyet thì giữ nguyên văn', () => {
    const daDung = '---\nid: x\nloai: chu-de\ntrang_thai_noi_dung: ban-nhap\n---\n' + THAN
    expect(epBanNhap(daDung, 'khac', true)).toBe(daDung)
  })

  it('đặt danh sách thay khối nhiều dòng; thêm khoá mới ở cuối; CRLF giữ CRLF', () => {
    const kq = suaFrontmatter(FILE + THAN, { dat: { lien_quan: ['c', 'd e'], nguon: 'tu-viet' } })
    expect(kq).toContain(
      'lien_quan: [c, d e]\nkhoa_la: { x: 1, y: [2, 3] }\nso: 012\nnguon: tu-viet\n---\n',
    )
    const crlf = '---\r\nloai: chu-de\r\n---\r\nthân\r\n'
    expect(suaFrontmatter(crlf, { dat: { id: 'a:b' } })).toBe(
      '---\r\nid: a:b\r\nloai: chu-de\r\n---\r\nthân\r\n',
    )
  })

  it('giá trị cần trích dẫn được trích; frontmatter trống; dòng đóng "..." giữ nguyên', () => {
    expect(suaFrontmatter('---\nloai: chu-de\n...\nx', { dat: { id: '123' } })).toBe(
      '---\nid: "123"\nloai: chu-de\n...\nx',
    )
    expect(suaFrontmatter('---\n---\nx', { dat: { id: 'a', loai: 'chu-de' } })).toBe(
      '---\nid: a\nloai: chu-de\n---\nx',
    )
    expect(
      docFrontmatter(suaFrontmatter('---\nloai: chu-de\n---\n', { dat: { id: '#x: y' } }))
        .frontmatter?.id,
    ).toBe('#x: y')
  })

  it('không có frontmatter / YAML hỏng → lỗi, không đoán', () => {
    expect(() => epBanNhap('## Tóm tắt\n', 'x', false)).toThrow()
    expect(() => epBanNhap('---\nloai: [hỏng\n---\n', 'x', false)).toThrow()
  })
})
