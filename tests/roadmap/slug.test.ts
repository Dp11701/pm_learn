import { describe, expect, it } from 'vitest'
import { ganSlug, LoiCay, taoSlug } from '../../shared/roadmap'

describe('taoSlug', () => {
  it.each([
    ['Power/Interest Grid', 'power-interest-grid'],
    ['WBS + WBS dictionary', 'wbs-wbs-dictionary'],
    ['CI/CD', 'ci-cd'],
    ['SAFe', 'safe'],
    ['Project Management Professional (PMP)', 'project-management-professional-pmp'],
    [
      'Schedule compression (crashing, fast tracking)',
      'schedule-compression-crashing-fast-tracking',
    ],
    ['100 Dollar Test', '100-dollar-test'],
  ])('%s → %s', (ten, slug) => {
    expect(taoSlug(ten)).toBe(slug)
  })

  it("xoá ' ’ ® thay vì đổi thành gạch nối; & thành gạch nối", () => {
    expect(taoSlug("Lewin's Change Management Model")).toBe('lewins-change-management-model')
    expect(taoSlug('Vroom’s Theory of Expectancy')).toBe('vrooms-theory-of-expectancy')
    expect(taoSlug('Agile Certified Practitioner (PMI-ACP®)')).toBe(
      'agile-certified-practitioner-pmi-acp',
    )
    expect(taoSlug('Automated testing & test pyramid')).toBe('automated-testing-test-pyramid')
  })

  it('bỏ dấu tiếng Việt, đ/Đ → d, gộp và cắt gạch nối hai đầu', () => {
    expect(taoSlug('Quản lý rủi ro định lượng')).toBe('quan-ly-rui-ro-dinh-luong')
    expect(taoSlug('ĐỘ PHỦ Đã duyệt')).toBe('do-phu-da-duyet')
    expect(taoSlug('  --Ước lượng   chi phí!!  ')).toBe('uoc-luong-chi-phi')
    expect(taoSlug('Nghiệm thu sản phẩm bàn giao')).toBe('nghiem-thu-san-pham-ban-giao')
  })
})

describe('ganSlug', () => {
  it('không trùng thì giữ slug gốc', () => {
    const kq = ganSlug([
      { id: 'a', label: 'Một', toTien: [] },
      { id: 'b', label: 'Hai', toTien: ['Một'] },
    ])
    expect(Object.fromEntries(kq)).toEqual({ a: 'mot', b: 'hai' })
  })

  it('trùng thì gắn slug cha trực tiếp cho MỌI nút trong cụm', () => {
    const kq = ganSlug([
      { id: 'g', label: 'Scaled Agile', toTien: ['PM Framework / Approach', 'Project Management'] },
      { id: 'x', label: 'SAFe', toTien: ['Scaled Agile', 'PM Framework / Approach'] },
      { id: 'p', label: 'Certifications', toTien: [] },
      { id: 'y', label: 'SAFe', toTien: ['Certifications'] },
    ])
    expect(kq.get('x')).toBe('safe-scaled-agile')
    expect(kq.get('y')).toBe('safe-certifications')
    expect(kq.get('g')).toBe('scaled-agile')
  })

  it('cha trùng tên thì gắn tiếp cấp trên', () => {
    const kq = ganSlug([
      { id: 'x1', label: 'X', toTien: ['Nhóm', 'Vùng 1'] },
      { id: 'x2', label: 'X', toTien: ['Nhóm', 'Vùng 2'] },
    ])
    expect([kq.get('x1'), kq.get('x2')]).toEqual(['x-nhom-vung-1', 'x-nhom-vung-2'])
  })

  it('slug sau khi gắn lại trùng một nút khác thì cả hai tiếp tục gắn', () => {
    const kq = ganSlug([
      { id: 'a', label: 'A', toTien: ['B', 'P'] },
      { id: 'a2', label: 'A', toTien: ['C', 'P'] },
      { id: 'ab', label: 'A B', toTien: ['Q'] },
    ])
    expect(new Set(kq.values()).size).toBe(3)
    expect(kq.get('a2')).toBe('a-c')
    expect(kq.get('a')).toBe('a-b-p')
    expect(kq.get('ab')).toBe('a-b-q')
  })

  it('hết tổ tiên mà vẫn trùng → LoiCay', () => {
    expect(() =>
      ganSlug([
        { id: 'p1', label: 'Phần', toTien: [] },
        { id: 'p2', label: 'phần', toTien: [] },
      ]),
    ).toThrow(LoiCay)
  })

  it('tên không tạo được slug → LoiCay', () => {
    expect(() => ganSlug([{ id: 'x', label: '®’ !', toTien: [] }])).toThrow(LoiCay)
  })
})
