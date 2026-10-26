import { describe, expect, it } from 'vitest'
import {
  API_ANH,
  DUOI_ANH,
  GIAO_THUC_LINK,
  THUOC_TINH_LINK_NGOAI,
  duongDanAnh,
  giaiDuongDanAnh,
  oCsv,
  phanLoaiLink,
  taoCsv,
} from '../../shared/noi-dung'

describe('phanLoaiLink: chỉ http(s), mailto, đường dẫn trong app (1.5)', () => {
  it('hằng số', () => {
    expect(GIAO_THUC_LINK).toEqual(['http:', 'https:', 'mailto:'])
    expect(THUOC_TINH_LINK_NGOAI).toEqual({ target: '_blank', rel: 'noopener noreferrer' })
  })

  it.each([
    ['https://example.org/a?b=1', { loai: 'ngoai', href: 'https://example.org/a?b=1' }],
    ['HTTP://Example.org', { loai: 'ngoai', href: 'http://example.org/' }],
    ['mailto:a@b.c', { loai: 'ngoai', href: 'mailto:a@b.c' }],
    ['/hoc/scope-creep', { loai: 'trong-app', href: '/hoc/scope-creep' }],
    ['#tu-kiem-tra', { loai: 'neo', href: '#tu-kiem-tra' }],
  ])('%s → được phép', (href, ket) => {
    expect(phanLoaiLink(href)).toEqual(ket)
  })

  it.each([
    'javascript:alert(1)',
    ' JavaScript:alert(1)',
    'java\tscript:alert(1)',
    '\u0001javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox',
    'file:///etc/passwd',
    'ftp://example.org',
    '//evil.example',
    '/\\evil.example',
    'http://',
    'scope-creep',
    '../../data/hoc.db',
    '',
  ])('%j → chặn (hiện chữ)', (href) => {
    expect(phanLoaiLink(href)).toEqual({ loai: 'chan' })
  })
})

describe('giaiDuongDanAnh: ảnh chỉ trong thư mục nội dung', () => {
  const BAI = 'project-management/scope-management/scope-creep.md'

  it('đuôi được phép', () => {
    expect(DUOI_ANH).toEqual(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'])
  })

  it.each([
    ['x.svg', 'project-management/scope-management/x.svg'],
    ['hinh/so-do.PNG', 'project-management/scope-management/hinh/so-do.PNG'],
    ['./a/./b.jpeg', 'project-management/scope-management/a/b.jpeg'],
    ['../chung/a.webp', 'project-management/chung/a.webp'],
    ['../../anh/a.gif', 'anh/a.gif'],
    ['hinh%20a.jpg', 'project-management/scope-management/hinh a.jpg'],
    ['a.png?v=2#x', 'project-management/scope-management/a.png'],
  ])('%s → %s', (src, ket) => {
    expect(giaiDuongDanAnh(BAI, src)).toBe(ket)
  })

  it.each([
    '../../data/hoc.db',
    '../../../data/a.png',
    '..%2F..%2F..%2Fa.png',
    '/etc/a.png',
    'https://example.org/a.png',
    'data:image/png;base64,AAAA',
    'file:///a.png',
    '.thung-rac/a.png',
    'hinh/.an/a.png',
    '~tam/a.png',
    'a\\b.png',
    'a%00.png',
    'a.png.exe',
    'a.html',
    '.png',
    'hinh/',
    '%E0%A4%A',
    '',
  ])('%j → không phải ảnh (hiện thành link)', (src) => {
    expect(giaiDuongDanAnh(BAI, src)).toBeNull()
  })

  it('bài không thuộc lĩnh vực (2 cấp)', () => {
    expect(giaiDuongDanAnh('certifications/pmp.md', '../a.png')).toBe('a.png')
    expect(giaiDuongDanAnh('certifications/pmp.md', '../../a.png')).toBeNull()
  })

  it('duongDanAnh: URL API, id và đường dẫn được mã hoá', () => {
    expect(API_ANH).toBe('/api/anh')
    expect(duongDanAnh('a_B-1', '../chung/hình a.png')).toBe(
      '/api/anh/a_B-1?duong-dan=..%2Fchung%2Fh%C3%ACnh%20a.png',
    )
    expect(duongDanAnh('x/y', 'a.png')).toBe('/api/anh/x%2Fy?duong-dan=a.png')
  })
})

describe('CSV ("Tải .csv"): chặn công thức, bọc ô', () => {
  it.each([
    ['=SUM(A1)', "'=SUM(A1)"],
    ['+1', "'+1"],
    ['-2', "'-2"],
    ['@cmd', "'@cmd"],
    ['\tx', "'\tx"],
    ['bình thường', 'bình thường'],
    ['a,b', '"a,b"'],
    ['nói "chào"', '"nói ""chào"""'],
    ['dòng 1\ndòng 2', '"dòng 1\ndòng 2"'],
    ['=a,b', `"'=a,b"`],
    ['', ''],
  ])('%j → %j', (o, ket) => {
    expect(oCsv(o)).toBe(ket)
  })

  it('cả bảng: BOM, CRLF, ô được xử lý', () => {
    expect(
      taoCsv({
        cot: ['ID', 'Mô tả'],
        hang: [
          ['1', '=x'],
          ['2', 'a, b'],
        ],
      }),
    ).toBe('﻿ID,Mô tả\r\n1,\'=x\r\n2,"a, b"\r\n')
    expect(taoCsv({ cot: ['A'], hang: [] }, { bom: false })).toBe('A\r\n')
  })
})
