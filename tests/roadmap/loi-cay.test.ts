import { describe, expect, it } from 'vitest'
import cayJson from '../fixtures/roadmap-tree.json'
import cauHinhJson from '../../shared/roadmap/cau-hinh-cay.json'
import { dungCay, LoiCay } from '../../shared/roadmap'

// Cây nhỏ tự dựng để thử từng lỗi nạp.
interface NutThu {
  id: string
  kind: string
  label: string
  labelOriginal?: string
  children?: NutThu[]
}

function cayNho(): { parts: NutThu[] } {
  return {
    parts: [
      {
        id: 'p1',
        kind: 'part',
        label: 'Phần một',
        children: [
          {
            id: 'a1',
            kind: 'area',
            label: 'Lĩnh vực',
            children: [
              {
                id: 'g1',
                kind: 'group',
                label: 'Nhóm',
                children: [{ id: 't1', kind: 'topic', label: 'Mục' }],
              },
              { id: 'd1', kind: 'document', label: 'Bảng', labelOriginal: 'Bang' },
            ],
          },
        ],
      },
      {
        id: 'p2',
        kind: 'part',
        label: 'Phần hai',
        children: [{ id: 't2', kind: 'topic', label: 'Mục' }],
      },
    ],
  }
}

function cauHinhNho() {
  return { iconPhan: { p1: 'briefcase', p2: 'award' }, phanChungChi: 'p2', nhomProcessGroup: 'g1' }
}

function timTrong(ds: NutThu[], id: string): NutThu | undefined {
  for (const n of ds) {
    const kq = n.id === id ? n : timTrong(n.children ?? [], id)
    if (kq) return kq
  }
  return undefined
}

function tim(ds: NutThu[], id: string): NutThu {
  const kq = timTrong(ds, id)
  if (!kq) throw new Error(`Không có nút ${id}`)
  return kq
}

describe('dungCay trên cây nhỏ', () => {
  it('dựng đúng mục học, mẫu, slug, đường dẫn', () => {
    const cay = dungCay(cayNho(), cauHinhNho())
    expect(cay.soMucHoc).toBe(3)
    expect(cay.soNut).toBe(7)
    expect(cay.mucHoc.map((m) => [m.slug, m.mau, m.duongDanFile])).toEqual([
      ['muc-nhom', 'chu-de', 'noi-dung/phan-mot/linh-vuc/muc-nhom.md'],
      ['bang', 'tai-lieu', 'noi-dung/phan-mot/linh-vuc/bang.md'],
      ['muc-phan-hai', 'chung-chi', 'noi-dung/phan-hai/muc-phan-hai.md'],
    ])
    expect(cay.mucTheoId.get('d1')?.labelOriginal).toBe('Bang')
    expect('labelOriginal' in (cay.mucTheoId.get('t1') ?? {})).toBe(false)
  })
})

describe('lỗi cây → LoiCay', () => {
  const thu = (sua: (c: { parts: NutThu[] }) => unknown) => () => {
    const c = cayNho()
    return dungCay(sua(c) ?? c, cauHinhNho())
  }

  it.each<[string, (c: { parts: NutThu[] }) => unknown, RegExp]>([
    ['không phải object', () => 'cay', /parts/],
    ['thiếu parts', () => ({}), /parts/],
    ['parts rỗng', () => ({ parts: [] }), /parts/],
    ['trùng id', (c) => void (tim(c.parts, 't2').id = 't1'), /Trùng id/],
    ['kind lạ', (c) => void (tim(c.parts, 't2').kind = 'chapter'), /kind không hợp lệ/],
    [
      'kind trùng tên thuộc tính Object',
      (c) => void (tim(c.parts, 't2').kind = 'toString'),
      /kind/,
    ],
    ['thiếu label', (c) => void (tim(c.parts, 't2').label = ' '), /thiếu label/],
    ['thiếu id', (c) => void (tim(c.parts, 't2').id = ''), /thiếu id/],
    ['mục học ở gốc cây', (c) => void (tim(c.parts, 'p2').kind = 'topic'), /gốc cây/],
    ['lĩnh vực nằm trong nhóm', (c) => void (tim(c.parts, 't1').kind = 'area'), /trong nhóm/],
    ['nhóm lồng nhóm', (c) => void (tim(c.parts, 't1').kind = 'group'), /trong nhóm/],
    [
      'mục học có con',
      (c) => void (tim(c.parts, 't2').children = [{ id: 'x', kind: 'topic', label: 'X' }]),
      /không được có nút con/,
    ],
    ['slug trùng không gỡ được', (c) => void (tim(c.parts, 'p2').label = 'Phần một'), /slug/],
    ['tên không tạo được slug', (c) => void (tim(c.parts, 't2').label = '®'), /slug/],
    [
      'không có mục học nào',
      (c) => {
        tim(c.parts, 'g1').children = []
        tim(c.parts, 'a1').children = [tim(c.parts, 'g1')]
        tim(c.parts, 'p2').children = []
      },
      /không có mục học/,
    ],
  ])('%s', (_ten, sua, thongDiep) => {
    expect(thu(sua)).toThrow(LoiCay)
    expect(thu(sua)).toThrow(thongDiep)
  })
})

describe('lỗi cau-hinh-cay.json → LoiCay', () => {
  const thu = (sua: (c: Record<string, unknown>) => void) => () => {
    const c = { ...cauHinhJson, iconPhan: { ...cauHinhJson.iconPhan } } as Record<string, unknown>
    sua(c)
    return dungCay(cayJson, c)
  }

  it('cấu hình thật hợp lệ', () => {
    expect(thu(() => {})).not.toThrow()
  })

  it('id không có trong cây', () => {
    expect(thu((c) => (c.phanChungChi = 'khong-co-id-nay'))).toThrow(LoiCay)
    expect(thu((c) => (c.phanChungChi = 'khong-co-id-nay'))).toThrow(/không có trong cây/)
    expect(thu((c) => (c.nhomProcessGroup = 'khong-co-id-nay'))).toThrow(LoiCay)
    expect(thu((c) => ((c.iconPhan as Record<string, string>)['khong-co'] = 'cpu'))).toThrow(LoiCay)
  })

  it('id sai kind', () => {
    const linhVuc = 'OM8zp84cx9AmrgTXePshx' // PM Framework / Approach (area)
    const nhom = 'sH0pgNW29EQo7yIRhLV1-' // Project Process Groups (group)
    const phan = 'qkYV2ygHIA58dsjcvMN0b' // Certifications (part)
    expect(thu((c) => (c.phanChungChi = linhVuc))).toThrow(LoiCay)
    expect(thu((c) => (c.phanChungChi = linhVuc))).toThrow(/cần phần/)
    expect(thu((c) => (c.nhomProcessGroup = phan))).toThrow(LoiCay)
    expect(thu((c) => ((c.iconPhan as Record<string, string>)[nhom] = 'cpu'))).toThrow(LoiCay)
  })

  it('icon không thuộc 5 icon §5.2', () => {
    expect(
      thu((c) => ((c.iconPhan as Record<string, string>)['qkYV2ygHIA58dsjcvMN0b'] = 'star')),
    ).toThrow(LoiCay)
  })

  it('phần chưa có icon', () => {
    expect(
      thu((c) => delete (c.iconPhan as Record<string, string>)['z3_IoE9wqkipxTOPkEEaa']),
    ).toThrow(/chưa có icon/)
  })

  it('thiếu trường hoặc không phải object', () => {
    expect(thu((c) => delete c.iconPhan)).toThrow(LoiCay)
    expect(thu((c) => delete c.nhomProcessGroup)).toThrow(LoiCay)
    expect(() => dungCay(cayJson, null)).toThrow(LoiCay)
  })

  it('LoiCay là Error có name riêng và thông điệp tiếng Việt', () => {
    try {
      dungCay(cayJson, { ...cauHinhJson, phanChungChi: 'x' })
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
      expect(e).toBeInstanceOf(LoiCay)
      expect((e as Error).name).toBe('LoiCay')
      expect((e as Error).message).toContain('phanChungChi')
    }
  })
})
