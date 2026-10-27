// Gợi ý mục gần nhất của trang 404 (§8.10, đề xuất 0.1 "Dice", 5).
import { describe, expect, it } from 'vitest'
import cayJson from '../fixtures/roadmap-tree.json'
import cauHinhJson from '../../shared/roadmap/cau-hinh-cay.json'
import { dungCay } from '../../shared/roadmap'
import {
  dice,
  duongDanCua,
  goiYChoDuongDan,
  SO_GOI_Y_TOI_DA,
} from '../../src/pages/khong-tim-thay/goi-y'

const cay = dungCay(cayJson, cauHinhJson)
const goiY = (p: string) => goiYChoDuongDan(cay, p).map((g) => [g.nut.label, g.duongDan])

describe('dice', () => {
  it('đúng số của đề xuất 0.1', () => {
    expect(dice('risk registr', 'risk register')).toBeCloseTo(0.87, 2)
    expect(dice('risk assessment', 'qualitative risk assessment')).toBeCloseTo(0.7, 3)
    expect(dice('risk assessment', 'quantitative risk assessment')).toBeCloseTo(0.683, 3)
  })

  it('chuỗi ngắn hơn 2 ký tự: chỉ bằng nhau mới là 1', () => {
    expect(dice('a', 'a')).toBe(1)
    expect(dice('a', 'ab')).toBe(0)
    expect(dice('', '')).toBe(0)
  })
})

describe('goiYChoDuongDan', () => {
  it('đường dẫn gõ sai tên mục → mục gần nhất', () => {
    expect(goiY('/hoc/scope-crep')).toEqual([['Scope Creep', '/hoc/scope-creep']])
    expect(goiY('/hoc/scope-creap')).toEqual([['Scope Creep', '/hoc/scope-creep']])
    expect(goiY('/hoc/risk-registr')).toEqual([['Risk Register', '/hoc/risk-register']])
  })

  it('nhiều mục gần bằng nhau: điểm cao trước, tối đa 3', () => {
    expect(goiY('/hoc/risk-assessment')).toEqual([
      ['Qualitative Risk Assessment', '/hoc/qualitative-risk-assessment'],
      ['Quantitative Risk Assessment', '/hoc/quantitative-risk-assessment'],
    ])
    expect(goiYChoDuongDan(cay, '/hoc/communication').length).toBeLessThanOrEqual(SO_GOI_Y_TOI_DA)
  })

  it('khớp tên gốc trên roadmap', () => {
    expect(goiY('/hoc/steering-comittee')).toEqual([
      ['Steering Committee', '/hoc/steering-committee'],
    ])
  })

  it('gợi ý đúng trang của loại nút: lĩnh vực, phần (Lộ trình lọc theo phần — trang Phần đã bỏ), mục học dù gõ nhầm route', () => {
    expect(goiY('/linh-vuc/scope-managment')).toEqual([
      ['Scope Management', '/linh-vuc/scope-management'],
    ])
    expect(goiY('/phan/tool')).toEqual([['Tools', '/lo-trinh?xem=danh-sach&phan=tools']])
    expect(goiY('/linh-vuc/scope-creep')[0]).toEqual(['Scope Creep', '/hoc/scope-creep'])
  })

  it('bỏ đoạn đầu (tên route); không giống gì thì không gợi ý', () => {
    expect(goiY('/hoc/xyz')).toEqual([])
    expect(goiY('/abc')).toEqual([])
    expect(goiY('/')).toEqual([])
    // "hoc" không bị so với tên mục
    expect(goiY('/hoc/risk').map(([ten]) => ten)).not.toContain('PoC')
  })

  it('giải mã %xx, không phân biệt hoa thường và dấu', () => {
    expect(goiY('/hoc/Scope%20Cr%C3%A9ep')).toEqual([['Scope Creep', '/hoc/scope-creep']])
  })

  it('nhóm không có trang riêng', () => {
    const nhom = [...cay.nutTheoId.values()].find((n) => n.kind === 'group')
    expect(nhom && duongDanCua(nhom)).toBeUndefined()
  })
})
