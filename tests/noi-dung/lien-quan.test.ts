import { describe, expect, it } from 'vitest'
import { TB, giaiLienQuan, traMucLienQuan } from '../../shared/noi-dung'
import { cay, muc } from './ho-tro'

describe('traMucLienQuan: slug → slug cũ → slug tên gốc → id (1.5)', () => {
  it('slug hiện tại (không phân biệt hoa thường, bỏ khoảng trắng)', () => {
    expect(traMucLienQuan(cay, 'change-request-cr')?.label).toBe('Change Request (CR)')
    expect(traMucLienQuan(cay, ' Scope-Baseline ')?.label).toBe('Scope Baseline')
  })

  it('slug cũ qua hàm tra của server', () => {
    const scopeCreep = muc('Scope Creep')
    const traSlugCu = (s: string) => (s === 'scope-creep-cu' ? scopeCreep.id : undefined)
    expect(traMucLienQuan(cay, 'scope-creep-cu', traSlugCu)?.id).toBe(scopeCreep.id)
    expect(traMucLienQuan(cay, 'scope-creep-cu')).toBeUndefined()
  })

  it('slug của tên gốc (Steering Comittee)', () => {
    expect(traMucLienQuan(cay, 'steering-comittee')?.label).toBe('Steering Committee')
  })

  it('id nút', () => {
    const m = muc('Salience Model')
    expect(traMucLienQuan(cay, m.id)?.id).toBe(m.id)
  })

  it('SAFe: hai slug phân biệt', () => {
    expect(traMucLienQuan(cay, 'safe-scaled-agile')?.phan.label).toBe('Project Management')
    expect(traMucLienQuan(cay, 'safe-certifications')?.phan.label).toBe('Certifications')
    expect(traMucLienQuan(cay, 'safe')).toBeUndefined()
  })

  it('nút không phải mục học (lĩnh vực) hay giá trị lạ → không tìm thấy', () => {
    expect(traMucLienQuan(cay, 'scope-management')).toBeUndefined()
    expect(traMucLienQuan(cay, 'khong-co')).toBeUndefined()
    expect(traMucLienQuan(cay, '')).toBeUndefined()
  })
})

describe('giaiLienQuan', () => {
  it('bỏ trùng, giữ thứ tự, bỏ chính mục đang xem, liệt kê giá trị không tìm thấy', () => {
    const scopeCreep = muc('Scope Creep')
    const kq = giaiLienQuan(
      cay,
      ['change-request-cr', 'khong-co', scopeCreep.slug, 'change-request-cr', 'scope-baseline'],
      { boId: scopeCreep.id },
    )
    expect(kq.muc.map((m) => m.label)).toEqual(['Change Request (CR)', 'Scope Baseline'])
    expect(kq.khongThay).toEqual(['khong-co'])
    expect(TB.lienQuanKhongThay('khong-co')).toBe('Liên quan: không tìm thấy khong-co')
  })
})
