// Đọc file ở trình duyệt trước khi kiểm tra (đề xuất 1.7 bước 1): chỉ .md, 256 KB/file, 250 file và 16 MB mỗi
// lần, thư mục đọc đệ quy qua webkitGetAsEntry (readEntries tới khi rỗng), bỏ file ẩn trong thư mục, UTF-8.
import { describe, expect, it } from 'vitest'
import {
  TOI_DA_BYTE_BAI,
  TOI_DA_BYTE_LO,
  TOI_DA_FILE,
  docNoiDung,
  kiemLo,
  phanLoai,
  soByteYeuCau,
  soMb,
  thuTuDanhSach,
  thuTuEntry,
} from '../../../src/components/nhap/doc-tep'
import { tepEntry, thuMucEntry } from './ho-tro'

const file = (ten: string, noiDung: BlobPart = 'x', type = 'text/markdown') =>
  new File([noiDung], ten, { type })

/** File giả chỉ có kích thước (không cấp phát thật). */
function fileCo(ten: string, size: number): File {
  const f = file(ten)
  Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('phanLoai, kiemLo', () => {
  it('khác .md → "khong-phai-md" (kể cả .MD, .markdown); > 256 KB → "qua-lon"; tên > 200 ký tự → "ten-qua-dai"', () => {
    const kq = phanLoai([
      { ten: 'a.md', file: file('a.md') },
      { ten: 'anh.png', file: file('anh.png') },
      { ten: 'B.MD', file: file('B.MD') },
      { ten: 'c.markdown', file: file('c.markdown') },
      { ten: 'lon.md', file: fileCo('lon.md', TOI_DA_BYTE_BAI + 1) },
      { ten: 'vua.md', file: fileCo('vua.md', TOI_DA_BYTE_BAI) },
      { ten: `${'x'.repeat(198)}.md`, file: file('dai.md') },
    ])
    expect(kq.nhan.map((t) => t.ten)).toEqual(['a.md', 'vua.md'])
    expect(kq.khongNhan.map((t) => [t.ten.slice(0, 10), t.lyDo])).toEqual([
      ['anh.png', 'khong-phai-md'],
      ['B.MD', 'khong-phai-md'],
      ['c.markdown', 'khong-phai-md'],
      ['lon.md', 'qua-lon'],
      ['xxxxxxxxxx', 'ten-qua-dai'],
    ])
    expect(kq.loiLo).toBeNull()
  })

  it(`quá ${TOI_DA_FILE} file .md hoặc quá 16 MB → cả lô bị từ chối; lô rỗng → khong-co-file`, () => {
    const nhieu = Array.from({ length: TOI_DA_FILE + 1 }, (_, i) => ({
      ten: `f${i}.md`,
      file: file(`f${i}.md`),
    }))
    expect(phanLoai(nhieu).loiLo).toEqual({ loai: 'qua-nhieu-file', so: TOI_DA_FILE + 1 })
    expect(phanLoai(nhieu.slice(0, TOI_DA_FILE)).loiLo).toBeNull()

    const lon = Array.from({ length: 65 }, (_, i) => ({
      ten: `f${i}.md`,
      file: fileCo(`f${i}.md`, TOI_DA_BYTE_BAI),
    }))
    expect(65 * TOI_DA_BYTE_BAI).toBeGreaterThan(TOI_DA_BYTE_LO)
    expect(phanLoai(lon).loiLo).toEqual({ loai: 'qua-dung-luong', soByte: 65 * TOI_DA_BYTE_BAI })
    expect(phanLoai(lon.slice(0, 64)).loiLo).toBeNull()

    expect(kiemLo([], [])).toEqual({ loai: 'khong-co-file' })
    expect(kiemLo([], [{ ten: 'a.png', lyDo: 'khong-phai-md' }])).toBeNull()
  })
})

describe('thuTuDanhSach (chọn file / chọn thư mục)', () => {
  it('chọn thư mục: đường dẫn theo webkitRelativePath, bỏ mọi thứ dưới thư mục / file ẩn', () => {
    const tep = (duongDan: string) => {
      const f = file(duongDan.split('/').at(-1)!)
      Object.defineProperty(f, 'webkitRelativePath', { value: duongDan })
      return f
    }
    const kq = thuTuDanhSach([
      tep('noi-dung/project-management/a.md'),
      tep('noi-dung/.thung-rac/20261020/b.md'),
      tep('noi-dung/.DS_Store'),
      tep('noi-dung/~tam.md'),
      tep('noi-dung/tools/anh.png'),
    ])
    expect(kq.nhan).toEqual([
      expect.objectContaining({ ten: 'a.md', duongDan: 'noi-dung/project-management/a.md' }),
    ])
    expect(kq.khongNhan).toEqual([
      { ten: 'anh.png', duongDan: 'noi-dung/tools/anh.png', lyDo: 'khong-phai-md' },
    ])
  })

  it('chọn nhiều file: không có đường dẫn', () => {
    const kq = thuTuDanhSach([file('a.md'), file('b.md')])
    expect(kq.nhan.map((t) => [t.ten, t.duongDan])).toEqual([
      ['a.md', undefined],
      ['b.md', undefined],
    ])
  })
})

describe('thuTuEntry (kéo thả thư mục)', () => {
  it('đọc đệ quy, gọi readEntries tới khi trả mảng rỗng, giữ thứ tự, bỏ file ẩn trong thư mục', async () => {
    const goc = thuMucEntry('noi-dung', [
      thuMucEntry('noi-dung/project-management', [
        thuMucEntry('noi-dung/project-management/scope-management', [
          tepEntry('noi-dung/project-management/scope-management/a.md'),
          tepEntry('noi-dung/project-management/scope-management/b.md'),
          tepEntry('noi-dung/project-management/scope-management/c.md'),
        ]),
        tepEntry('noi-dung/project-management/_tong-quan.md'),
      ]),
      tepEntry('noi-dung/.DS_Store', '', ''),
      tepEntry('noi-dung/~nhap.md'),
      thuMucEntry('noi-dung/.thung-rac', [tepEntry('noi-dung/.thung-rac/x.md')]),
      tepEntry('noi-dung/tools/hinh.png', 'png', 'image/png'),
    ])
    const leTrucTiep = tepEntry('rieng.md')
    const kq = await thuTuEntry([goc, leTrucTiep])
    expect(kq.nhan.map((t) => [t.ten, t.duongDan])).toEqual([
      ['a.md', 'noi-dung/project-management/scope-management/a.md'],
      ['b.md', 'noi-dung/project-management/scope-management/b.md'],
      ['c.md', 'noi-dung/project-management/scope-management/c.md'],
      ['_tong-quan.md', 'noi-dung/project-management/_tong-quan.md'],
      ['rieng.md', undefined],
    ])
    expect(kq.khongNhan).toEqual([
      { ten: 'hinh.png', duongDan: 'noi-dung/tools/hinh.png', lyDo: 'khong-phai-md' },
    ])
    expect(kq.loiLo).toBeNull()
  })

  it('file ẩn thả trực tiếp (không nằm trong thư mục) vẫn được xét', async () => {
    const kq = await thuTuEntry([tepEntry('.an.md')])
    expect(kq.nhan.map((t) => t.ten)).toEqual(['.an.md'])
  })

  it('dừng sớm khi đã quá số file .md', async () => {
    const con = Array.from({ length: TOI_DA_FILE + 5 }, (_, i) => tepEntry(`thu-muc/f${i}.md`))
    const kq = await thuTuEntry([thuMucEntry('thu-muc', con, 100)])
    expect(kq.loiLo).toEqual({ loai: 'qua-nhieu-file', so: TOI_DA_FILE + 1 })
  })
})

describe('docNoiDung', () => {
  it('đọc UTF-8, bỏ BOM, báo tiến độ từng file; sai UTF-8 → khong-doc-duoc', async () => {
    const bom = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode('---\nid: x\n---\nTiếng Việt'),
    ])
    const sai = new Uint8Array([0x2d, 0x2d, 0x2d, 0x0a, 0xc3, 0x28])
    const tienDo: string[] = []
    const kq = await docNoiDung(
      [
        { ten: 'a.md', file: file('a.md', bom) },
        { ten: 'b.md', duongDan: 'tm/b.md', file: file('b.md', sai) },
        { ten: 'c.md', duongDan: 'tm/c.md', file: file('c.md', 'Đã đọc') },
      ],
      (xong, tong) => tienDo.push(`${xong}/${tong}`),
    )
    expect(kq.gui).toEqual([
      { ten: 'a.md', noiDung: '---\nid: x\n---\nTiếng Việt' },
      { ten: 'c.md', noiDung: 'Đã đọc', duongDan: 'tm/c.md' },
    ])
    expect(kq.khongNhan).toEqual([{ ten: 'b.md', duongDan: 'tm/b.md', lyDo: 'khong-doc-duoc' }])
    expect(tienDo).toEqual(['1/3', '2/3', '3/3'])
  })

  it('soByteYeuCau tính theo byte UTF-8 của JSON; soMb làm tròn lên 1 chữ số', () => {
    expect(soByteYeuCau({ a: 'đ' })).toBe(new TextEncoder().encode('{"a":"đ"}').length)
    expect(soMb(16 * 1024 * 1024 + 1)).toBe(16.1)
  })
})
