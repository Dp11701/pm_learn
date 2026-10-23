import { describe, expect, it } from 'vitest'
import cayJson from '../fixtures/roadmap-tree.json'
import cauHinhJson from '../../shared/roadmap/cau-hinh-cay.json'
import { dungCay, type Nut } from '../../shared/roadmap'
import {
  TOI_DA_CAU_TRUC,
  TOI_DA_MUC_HOC,
  taoChiMuc,
  timKiem,
  type Doan,
  type KetQuaKhop,
} from '../../shared/tim-kiem'

const cay = dungCay(cayJson, cauHinhJson)
const chiMuc = taoChiMuc(cay)

function idMuc(label: string): string {
  const ds = cay.mucHoc.filter((m) => m.label === label)
  expect(ds).toHaveLength(1)
  return ds[0].id
}

const ten = (ds: KetQuaKhop[]) => ds.map((k) => k.nut.label)
const cat = (text: string, doan: Doan[]) => doan.map(([a, b]) => text.slice(a, b))
const breadcrumb = (k: KetQuaKhop) => k.chuoiCha.map((n: Nut) => n.label).join(' › ')

describe('F25: "risk"', () => {
  const kq = timKiem(chiMuc, 'risk')
  const F25 = [
    'Risk and Issue Reports',
    'Risk Register',
    'Risk Identification Process',
    'Risk and Opportunity Response Strategies',
    'Risk Appetite',
    'Quantitative Risk Assessment',
    'Qualitative Risk Assessment',
  ]

  it('nhóm cấu trúc chỉ có lĩnh vực Risk Management', () => {
    expect(ten(kq.cauTruc)).toEqual(['Risk Management'])
    expect(kq.cauTruc[0].nut.kind).toBe('area')
  })

  it('mục học đúng thứ tự F25: đầu tên trước, giữa tên sau, cùng bậc theo thứ tự cây', () => {
    expect(ten(kq.mucHoc)).toEqual(F25)
    expect(kq.mucHoc.map((k) => k.bac)).toEqual([1, 1, 1, 1, 1, 2, 2])
    // thứ tự cây của 7 mục khác thứ tự F25: chính xếp hạng theo bậc tạo ra thứ tự F25
    const theoCay = cay.mucHoc.filter((m) => F25.includes(m.label)).map((m) => m.label)
    expect(theoCay).toEqual([
      'Risk and Issue Reports',
      'Risk Register',
      'Quantitative Risk Assessment',
      'Risk Identification Process',
      'Qualitative Risk Assessment',
      'Risk and Opportunity Response Strategies',
      'Risk Appetite',
    ])
  })

  it('breadcrumb không phải trường khớp (mục khác của Risk Management không hiện)', () => {
    expect(ten(kq.mucHoc)).not.toContain('PESTLE')
  })

  it('in đậm "Risk" trên tên', () => {
    for (const k of kq.mucHoc) {
      expect(k.truong).toBe('ten')
      expect(cat(k.nut.label, k.doanTen)).toEqual(['Risk'])
    }
    expect(breadcrumb(kq.mucHoc[0])).toBe(
      'Project Management › Project Governance › Project Reporting',
    )
    expect(breadcrumb(kq.mucHoc[1])).toBe('Project Management › Risk Management')
  })
})

describe('F25b', () => {
  it('"comittee" → Steering Committee qua tên gốc, in đậm "Committee"', () => {
    const kq = timKiem(chiMuc, 'comittee')
    expect(kq.cauTruc).toEqual([])
    expect(ten(kq.mucHoc)).toEqual(['Steering Committee'])
    const [k] = kq.mucHoc
    expect([k.bac, k.truong]).toEqual([3, 'tenGoc'])
    expect(k.nut.labelOriginal).toBe('Steering Comittee')
    expect(cat(k.nut.labelOriginal ?? '', k.doan)).toEqual(['Comittee'])
    expect(cat(k.nut.label, k.doanTen)).toEqual(['Committee'])
    expect(breadcrumb(k)).toBe('Project Management › Project Governance')
  })

  it('"safe" → 2 mục SAFe, phân biệt bằng breadcrumb', () => {
    const kq = timKiem(chiMuc, 'safe')
    expect(kq.cauTruc).toEqual([])
    expect(ten(kq.mucHoc)).toEqual(['SAFe', 'SAFe'])
    expect(kq.mucHoc.map(breadcrumb)).toEqual([
      'Project Management › PM Framework / Approach › Scaled Agile',
      'Certifications',
    ])
    expect(kq.mucHoc.map((k) => k.nut.slug)).toEqual(['safe-scaled-agile', 'safe-certifications'])
    expect(kq.mucHoc.map((k) => k.bac)).toEqual([0, 0])
    expect(cat('SAFe', kq.mucHoc[0].doanTen)).toEqual(['SAFe'])
  })

  it('"kiểm thử tự động": chưa có giải nghĩa → không có kết quả', () => {
    const kq = timKiem(chiMuc, 'kiểm thử tự động')
    expect(kq).toEqual({ cauTruc: [], mucHoc: [] })
  })

  it('"kiểm thử tự động" khớp giải nghĩa khi mục đã có nội dung (giải nghĩa chỉ có trong test)', () => {
    const giaiNghia = 'Kiểm thử tự động và tháp kiểm thử'
    const cm = taoChiMuc(cay, new Map([[idMuc('Automated testing & test pyramid'), giaiNghia]]))
    for (const q of ['kiểm thử tự động', 'kiem thu tu dong', 'KIỂM THỬ']) {
      const kq = timKiem(cm, q)
      expect(ten(kq.mucHoc)).toEqual(['Automated testing & test pyramid'])
      expect([kq.mucHoc[0].bac, kq.mucHoc[0].truong]).toEqual([3, 'giaiNghia'])
      expect(kq.mucHoc[0].doanTen).toEqual([])
    }
    expect(cat(giaiNghia, timKiem(cm, 'kiem thu tu dong').mucHoc[0].doan)).toEqual([
      'Kiểm thử tự động',
    ])
  })
})

describe('giải nghĩa tiếng Việt không phân biệt dấu', () => {
  const giaiNghia = 'phình phạm vi'
  const cm = taoChiMuc(cay, new Map([[idMuc('Scope Creep'), giaiNghia]]))

  it.each(['phinh pham vi', 'phình', 'PHÌNH PHẠM VI', 'pham vi'])('"%s" → Scope Creep', (q) => {
    const kq = timKiem(cm, q)
    expect(ten(kq.mucHoc)).toEqual(['Scope Creep'])
    expect(kq.mucHoc[0].truong).toBe('giaiNghia')
  })

  it('in đậm đúng đoạn có dấu trong giải nghĩa', () => {
    expect(cat(giaiNghia, timKiem(cm, 'phinh').mucHoc[0].doan)).toEqual(['phình'])
    expect(cat(giaiNghia, timKiem(cm, 'pham vi').mucHoc[0].doan)).toEqual(['phạm vi'])
  })

  it('giải nghĩa rỗng bị bỏ qua', () => {
    const rong = taoChiMuc(cay, new Map([[idMuc('Scope Creep'), '   ']]))
    expect(rong.cacMuc.find((m) => m.nut.label === 'Scope Creep')?.giaiNghia).toBeUndefined()
  })
})

describe('xếp hạng', () => {
  it('nguyên tên → đầu tên → giữa tên, cùng bậc theo thứ tự cây', () => {
    const kq = timKiem(chiMuc, 'scrum')
    expect(ten(kq.mucHoc)).toEqual([
      'Scrum',
      'Scrum of Scrums',
      'Professional Scrum Master (PSM)',
      'Professional Scrum Product Owner (PSPO)',
      'Professional Scrum with Kanban (PSK)',
    ])
    expect(kq.mucHoc.map((k) => k.bac)).toEqual([0, 1, 2, 2, 2])
    expect(cat('Scrum of Scrums', kq.mucHoc[1].doanTen)).toEqual(['Scrum', 'Scrum'])
  })

  it('nguyên viết tắt xếp trên giữa tên: "ice" → ICE Score trước RICE Score', () => {
    const kq = timKiem(chiMuc, 'ice')
    expect(kq.mucHoc[0].nut.label).toBe('ICE Score')
    expect([kq.mucHoc[0].bac, kq.mucHoc[0].truong]).toEqual([0, 'vietTat'])
    expect(ten(kq.mucHoc)).toContain('RICE Score')
    expect(kq.mucHoc.slice(1).every((k) => k.bac === 2)).toBe(true)
  })

  it('giải nghĩa xếp sau giữa tên dù đứng trước trong cây', () => {
    const dau = cay.mucHoc[0]
    const cm = taoChiMuc(cay, new Map([[dau.id, 'Sổ đăng ký (register) tài sản quy trình']]))
    const kq = timKiem(cm, 'register')
    expect(ten(kq.mucHoc)).toEqual(['Risk Register', 'Stakeholder Register', dau.label])
    expect(kq.mucHoc.map((k) => k.bac)).toEqual([2, 2, 3])
  })

  it('tên gốc: "inititation" → Initiation', () => {
    const kq = timKiem(chiMuc, 'inititation')
    expect(ten(kq.mucHoc)).toEqual(['Initiation'])
    expect(cat('Initiation', kq.mucHoc[0].doanTen)).toEqual(['Initiation'])
  })
})

describe('viết tắt', () => {
  it('"ccb" → Change Control Board (CCB), in đậm CCB', () => {
    const kq = timKiem(chiMuc, 'ccb')
    expect(ten(kq.mucHoc)).toEqual(['Change Control Board (CCB)'])
    expect([kq.mucHoc[0].bac, kq.mucHoc[0].truong]).toEqual([0, 'vietTat'])
    expect(cat(kq.mucHoc[0].nut.label, kq.mucHoc[0].doanTen)).toEqual(['CCB'])
  })

  it.each(['ci/cd', 'CI CD', 'cicd'])('"%s" → CI/CD', (q) => {
    const kq = timKiem(chiMuc, q)
    expect(ten(kq.mucHoc)).toEqual(['CI/CD'])
    expect(kq.mucHoc[0].bac).toBe(0)
  })

  it('"pmi-acp" và "capex"', () => {
    expect(ten(timKiem(chiMuc, 'pmi-acp').mucHoc)).toEqual([
      'Agile Certified Practitioner (PMI-ACP®)',
    ])
    const capex = timKiem(chiMuc, 'capex').mucHoc[0]
    expect(cat(capex.nut.label, capex.doanTen)).toEqual(['CAPEX'])
  })

  it('"pmo" → nhóm PMO Types trong nhóm cấu trúc', () => {
    const kq = timKiem(chiMuc, 'pmo')
    expect(ten(kq.cauTruc)).toEqual(['PMO Types'])
    expect(kq.cauTruc[0].nut.kind).toBe('group')
  })
})

describe('gợi ý khi không có kết quả và giới hạn', () => {
  it('"test pyramid" (gợi ý trong C28) → Automated testing & test pyramid', () => {
    const kq = timKiem(chiMuc, 'test pyramid')
    expect(ten(kq.mucHoc)).toEqual(['Automated testing & test pyramid'])
    expect(cat(kq.mucHoc[0].nut.label, kq.mucHoc[0].doanTen)).toEqual(['test pyramid'])
  })

  it('truy vấn rỗng hoặc chỉ có dấu câu → không có kết quả', () => {
    for (const q of ['', '   ', ' / ', '—']) {
      expect(timKiem(chiMuc, q)).toEqual({ cauTruc: [], mucHoc: [] })
    }
  })

  it('tối đa 8 kết quả cấu trúc, 30 mục học; đổi được qua tuỳ chọn', () => {
    expect([TOI_DA_CAU_TRUC, TOI_DA_MUC_HOC]).toEqual([8, 30])
    const kq = timKiem(chiMuc, 'e')
    expect(kq.cauTruc).toHaveLength(8)
    expect(kq.mucHoc).toHaveLength(30)
    const it2 = timKiem(chiMuc, 'e', { toiDaCauTruc: 2, toiDaMucHoc: 3 })
    expect(it2.cauTruc).toEqual(kq.cauTruc.slice(0, 2))
    expect(it2.mucHoc).toEqual(kq.mucHoc.slice(0, 3))
  })

  it('nhóm cấu trúc gồm phần, lĩnh vực, nhóm; mục học có đủ thông tin MucHoc', () => {
    const kq = timKiem(chiMuc, 'management', { toiDaCauTruc: 100, toiDaMucHoc: 1000 })
    expect(new Set(kq.cauTruc.map((k) => k.nut.kind))).toEqual(new Set(['part', 'area', 'group']))
    expect(kq.cauTruc[0].nut.label).toBe('Project Management')
    expect(kq.mucHoc.every((k) => typeof k.nut.mau === 'string')).toBe(true)
    expect(ten(timKiem(chiMuc, 'scaled agile').cauTruc)).toEqual(['Scaled Agile'])
  })
})

describe('chỉ mục', () => {
  it('có mọi nút của cây, theo thứ tự cây', () => {
    expect(chiMuc.cacMuc).toHaveLength(cay.soNut)
    expect(chiMuc.cacMuc.filter((m) => m.laMucHoc).map((m) => m.nut.id)).toEqual(
      cay.mucHoc.map((m) => m.id),
    )
    expect(chiMuc.cacMuc.map((m) => m.thuTu)).toEqual(chiMuc.cacMuc.map((_m, i) => i))
  })
})

describe('in đậm tên đã sửa khi khớp tên gốc (cây nhỏ)', () => {
  const caySua = dungCay(
    {
      parts: [
        {
          id: 'p1',
          kind: 'part',
          label: 'Phan A',
          children: [
            {
              id: 'g1',
              kind: 'group',
              label: 'Nhom B',
              children: [
                {
                  id: 't1',
                  kind: 'topic',
                  label: 'Alpha Model',
                  labelOriginal: 'Alpah Model Model',
                },
                { id: 't2', kind: 'topic', label: 'Beta', labelOriginal: 'Baaaa' },
              ],
            },
          ],
        },
      ],
    },
    { iconPhan: { p1: 'briefcase' }, phanChungChi: 'p1', nhomProcessGroup: 'g1' },
  )
  const cm = taoChiMuc(caySua)
  const dam = (q: string) => {
    const [k] = timKiem(cm, q).mucHoc
    return cat(k.nut.label, k.doanTen)
  }

  it('từ cùng thứ tự; từ vượt quá tên đã sửa bị bỏ', () => {
    expect(dam('alpah')).toEqual(['Alpha'])
    expect(dam('model model')).toEqual(['Model'])
  })

  it('nhiều lần khớp trong cùng một từ chỉ in đậm từ đó một lần', () => {
    expect(dam('aa')).toEqual(['Beta'])
  })
})
