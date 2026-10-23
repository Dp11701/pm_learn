import { describe, expect, it } from 'vitest'
import cayJson from '../fixtures/roadmap-tree.json'
import cauHinhJson from '../../shared/roadmap/cau-hinh-cay.json'
import {
  chuoiCha,
  conCua,
  dungCay,
  mucHocCua,
  mucSau,
  mucTruoc,
  viTriTrongVung,
} from '../../shared/roadmap'

const cay = dungCay(cayJson, cauHinhJson)

function id(label: string): string {
  const ds = cay.mucHoc.filter((m) => m.label === label)
  expect(ds).toHaveLength(1)
  return ds[0].id
}

describe('viTriTrongVung (dải vị trí §6.2, số liệu §7)', () => {
  it.each([
    ['Scope Creep', 3, 16, 'Scope Management', 'area'],
    ['Risk Register', 1, 10, 'Risk Management', 'area'],
    ['Salience Model', 2, 9, 'Stakeholder and Communication Management', 'area'],
    ['Project Management Professional (PMP)', 6, 10, 'Certifications', 'part'],
  ])('%s: Mục %i/%i · %s', (label, thuTu, tong, vung, kind) => {
    const viTri = viTriTrongVung(cay, id(label))
    expect([viTri.thuTu, viTri.tong, viTri.vung.label, viTri.vung.kind]).toEqual([
      thuTu,
      tong,
      vung,
      kind,
    ])
    expect(viTri.cacMuc).toHaveLength(tong)
    expect(viTri.cacMuc[thuTu - 1].id).toBe(id(label))
  })

  it('mục không thuộc lĩnh vực nhưng có nhóm thì vùng là phần', () => {
    const viTri = viTriTrongVung(cay, id('Net Present Value (NPV)'))
    expect([viTri.vung.label, viTri.thuTu, viTri.tong]).toEqual(['Business Acumen', 4, 17])
  })

  it('id không phải mục học → lỗi', () => {
    expect(() => viTriTrongVung(cay, cay.phan[0].id)).toThrow()
  })
})

describe('mucTruoc / mucSau theo thứ tự cây', () => {
  it('Trước của Risk Register là Function Point Analysis; bỏ qua mục đó thì là Wideband Delphi', () => {
    expect(mucTruoc(cay, id('Risk Register'))?.label).toBe('Function Point Analysis')
    const boQua = (m: { label: string }) => m.label === 'Function Point Analysis'
    expect(mucTruoc(cay, id('Risk Register'), boQua)?.label).toBe('Wideband Delphi')
    expect(mucSau(cay, id('Wideband Delphi'), boQua)?.label).toBe('Risk Register')
  })

  it('Tiếp của Function Point Analysis là Risk Register (sang lĩnh vực mới)', () => {
    expect(mucSau(cay, id('Function Point Analysis'))?.label).toBe('Risk Register')
  })

  it('đầu và cuối roadmap không có Trước / Tiếp', () => {
    const dau = cay.mucHoc[0]
    const cuoi = cay.mucHoc[cay.soMucHoc - 1]
    expect(mucTruoc(cay, dau.id)).toBeUndefined()
    expect(mucSau(cay, cuoi.id)).toBeUndefined()
    expect(mucSau(cay, dau.id)?.index).toBe(1)
    expect(mucTruoc(cay, cuoi.id)?.index).toBe(cay.soMucHoc - 2)
  })

  it('bỏ qua mọi mục còn lại thì không có Tiếp', () => {
    expect(mucSau(cay, cay.mucHoc[0].id, () => true)).toBeUndefined()
  })
})

describe('chuoiCha, conCua, mucHocCua', () => {
  it('chuoiCha từ phần xuống cha trực tiếp', () => {
    expect(chuoiCha(cay, id('MoSCoW')).map((n) => n.label)).toEqual([
      'Project Management',
      'Scope Management',
      'Prioritization Techniques',
    ])
    expect(chuoiCha(cay, id('Project Management Professional (PMP)')).map((n) => n.label)).toEqual([
      'Certifications',
    ])
    expect(chuoiCha(cay, cay.phan[0].id)).toEqual([])
  })

  it('conCua theo thứ tự cây; Business Acumen: 3 chủ đề lẻ trước 2 nhóm', () => {
    const ba = cay.phan[1]
    expect(conCua(cay, ba.id).map((n) => n.kind)).toEqual([
      'topic',
      'topic',
      'topic',
      'group',
      'group',
    ])
    expect(conCua(cay, id('Scope Creep'))).toEqual([])
  })

  it('mucHocCua của nhóm và của chính mục học', () => {
    const nhom = cay.nutTheoSlug.get('scaled-agile')
    expect(nhom?.kind).toBe('group')
    expect(mucHocCua(cay, nhom?.id ?? '').map((m) => m.slug)).toEqual([
      'scrum-of-scrums',
      'safe-scaled-agile',
      'nexus',
      'spotify-model',
      'less',
    ])
    expect(mucHocCua(cay, id('Scope Creep')).map((m) => m.label)).toEqual(['Scope Creep'])
  })
})
