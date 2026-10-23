import { describe, expect, it } from 'vitest'
import cayJson from '../fixtures/roadmap-tree.json'
import cauHinhJson from '../../shared/roadmap/cau-hinh-cay.json'
import { cay as cayApp, dungCay, layCay, mucHocCua, type MucHoc } from '../../shared/roadmap'

// Mọi số liệu kiểm trên bản cây đóng băng tests/fixtures/roadmap-tree.json (bất biến 1).
const cay = dungCay(cayJson, cauHinhJson)
const tatCaNut = [...cay.nutTheoId.values()]

function muc(label: string, phan?: string): MucHoc {
  const ds = cay.mucHoc.filter((m) => m.label === label && (!phan || m.phan.label === phan))
  expect(ds).toHaveLength(1)
  return ds[0]
}

describe('số liệu cây (§3, đề xuất 0.1)', () => {
  it('236 nút = 5 phần + 11 lĩnh vực + 21 nhóm + 184 chủ đề + 15 tài liệu', () => {
    const dem = (kind: string) => tatCaNut.filter((n) => n.kind === kind).length
    expect([dem('part'), dem('area'), dem('group'), dem('topic'), dem('document')]).toEqual([
      5, 11, 21, 184, 15,
    ])
    expect(cay.soNut).toBe(236)
    expect(cay.soMucHoc).toBe(199)
    expect(cay.mucHoc).toHaveLength(199)
    expect(cay.mucTheoId.size).toBe(199)
    expect(cay.phan).toHaveLength(5)
  })

  it('13 nút có labelOriginal, đều là mục học: 13 mục có dòng tên gốc, 186 mục không có', () => {
    expect(tatCaNut.filter((n) => n.labelOriginal)).toHaveLength(13)
    expect(cay.mucHoc.filter((m) => m.labelOriginal)).toHaveLength(13)
    expect(cay.mucHoc.filter((m) => !m.labelOriginal)).toHaveLength(186)
    expect(muc('Steering Committee').labelOriginal).toBe('Steering Comittee')
  })

  it('mục đầu là OPA, mục cuối là SAFe của Certifications', () => {
    expect(cay.mucHoc[0]).toMatchObject({ label: 'OPA', index: 0, slug: 'opa' })
    const cuoi = cay.mucHoc[cay.soMucHoc - 1]
    expect(cuoi).toMatchObject({ label: 'SAFe', id: 'avvjiXod6h_oM8kfFSjvM' })
    expect(cuoi.phan.label).toBe('Certifications')
    expect(cay.mucHoc.every((m, i) => m.index === i)).toBe(true)
  })

  it('số mục theo phần và theo lĩnh vực (mục · tài liệu · nhóm)', () => {
    expect(cay.phan.map((p) => [p.label, mucHocCua(cay, p.id).length])).toEqual([
      ['Project Management', 144],
      ['Business Acumen', 17],
      ['Technical Acumen', 16],
      ['Tools', 12],
      ['Certifications', 10],
    ])
    const linhVuc = tatCaNut
      .filter((n) => n.kind === 'area')
      .map((n) => {
        const ds = mucHocCua(cay, n.id)
        const soNhom = n.con.filter((c) => cay.nutTheoId.get(c)?.kind === 'group').length
        return `${n.label} ${ds.length}·${ds.filter((m) => m.kind === 'document').length}·${soNhom}`
      })
    expect(linhVuc).toEqual([
      'PM Framework / Approach 22·0·1',
      'Project Governance 18·2·3',
      'Scope Management 16·3·2',
      'Change Management 8·3·0',
      'Schedule Management 16·1·1',
      'Risk Management 10·1·0',
      'Cost Management 10·1·0',
      'Quality Management 10·1·0',
      'People Management 14·0·1',
      'Stakeholder and Communication Management 9·3·0',
      'Procurement Management 11·0·2',
    ])
  })

  it('mẫu bài: 174 chủ đề, 15 tài liệu, 10 chứng chỉ (chứng chỉ chọn theo phần)', () => {
    const dem = (mau: string) => cay.mucHoc.filter((m) => m.mau === mau).length
    expect([dem('chu-de'), dem('tai-lieu'), dem('chung-chi')]).toEqual([174, 15, 10])
    expect(cay.mucHoc.every((m) => (m.kind === 'document') === (m.mau === 'tai-lieu'))).toBe(true)
    const chungChi = cay.mucHoc.filter((m) => m.mau === 'chung-chi')
    expect(chungChi.every((m) => m.kind === 'topic' && m.phan.id === cay.phanChungChi.id)).toBe(
      true,
    )
    expect(muc('Project Management Professional (PMP)').mau).toBe('chung-chi')
    expect(muc('Risk Register').mau).toBe('tai-lieu')
    expect(muc('Scope Creep').mau).toBe('chu-de')
  })
})

describe('chuỗi cha', () => {
  it('mỗi mục học có đúng một chuỗi phần › (lĩnh vực) › (nhóm) hợp lệ', () => {
    for (const m of cay.mucHoc) {
      expect(m.phan.kind).toBe('part')
      expect(m.linhVuc?.kind ?? 'area').toBe('area')
      expect(m.nhom?.kind ?? 'group').toBe('group')
      expect(m.chaId).toBe((m.nhom ?? m.linhVuc ?? m.phan).id)
      expect(cay.nutTheoId.get(m.chaId ?? '')?.con).toContain(m.id)
    }
  })

  it('ví dụ breadcrumb của §3', () => {
    const moscow = muc('MoSCoW')
    expect([moscow.phan.label, moscow.linhVuc?.label, moscow.nhom?.label]).toEqual([
      'Project Management',
      'Scope Management',
      'Prioritization Techniques',
    ])
    const npv = muc('Net Present Value (NPV)')
    expect([npv.phan.label, npv.linhVuc, npv.nhom?.label]).toEqual([
      'Business Acumen',
      undefined,
      'Project Selection Method',
    ])
    const pmp = muc('Project Management Professional (PMP)')
    expect([pmp.phan.label, pmp.linhVuc, pmp.nhom]).toEqual([
      'Certifications',
      undefined,
      undefined,
    ])
  })
})

describe('slug', () => {
  const dangSlug = /^[a-z0-9]+(-[a-z0-9]+)*$/

  it('id và slug của mọi nút (kể cả phần, lĩnh vực, nhóm) duy nhất và đúng dạng', () => {
    expect(new Set(tatCaNut.map((n) => n.id)).size).toBe(236)
    expect(new Set(tatCaNut.map((n) => n.slug)).size).toBe(236)
    expect(cay.nutTheoSlug.size).toBe(236)
    expect(tatCaNut.every((n) => dangSlug.test(n.slug))).toBe(true)
  })

  it('chỉ SAFe trùng: safe-scaled-agile và safe-certifications, đúng id', () => {
    expect(cay.mucTheoSlug.get('safe-scaled-agile')?.id).toBe('a66yNuBIMbIdC2nLS6-8-')
    expect(cay.mucTheoSlug.get('safe-certifications')?.id).toBe('avvjiXod6h_oM8kfFSjvM')
    expect(cay.mucTheoSlug.get('safe-scaled-agile')?.nhom?.label).toBe('Scaled Agile')
    expect(cay.nutTheoSlug.has('safe')).toBe(false)
    const doiSlug = tatCaNut.filter((n) => n.slug !== tenThanhSlugGoc(n.label))
    expect(doiSlug.map((n) => n.slug).sort()).toEqual(['safe-certifications', 'safe-scaled-agile'])
  })

  it.each([
    ['Power/Interest Grid', 'power-interest-grid'],
    ['WBS + WBS dictionary', 'wbs-wbs-dictionary'],
    ['CI/CD', 'ci-cd'],
    ['Scope Creep', 'scope-creep'],
    ['Project Management Professional (PMP)', 'project-management-professional-pmp'],
  ])('%s → %s', (label, slug) => {
    expect(muc(label).slug).toBe(slug)
  })

  it("tên có ' ’ ® &: 10 mục học + 1 nhóm, slug hợp lệ", () => {
    const coKyTu = tatCaNut.filter((n) => /['’®&]/.test(n.label))
    expect(coKyTu.map((n) => [n.kind, n.label, n.slug])).toEqual([
      ['topic', "Lewin's Change Management Model", 'lewins-change-management-model'],
      ['topic', "Kotter's 8-Step Process", 'kotters-8-step-process'],
      ['topic', "Tuckman's Model", 'tuckmans-model'],
      ['topic', 'Alderfer’s ERG Theory', 'alderfers-erg-theory'],
      ['topic', "Maslow's Hierarchy of Needs", 'maslows-hierarchy-of-needs'],
      ['topic', "Herzberg's Motivation-Hygiene theory", 'herzbergs-motivation-hygiene-theory'],
      ['topic', 'Vroom’s Theory of Expectancy', 'vrooms-theory-of-expectancy'],
      ['topic', 'McClelland’s Theory of Needs', 'mcclellands-theory-of-needs'],
      ['topic', 'Automated testing & test pyramid', 'automated-testing-test-pyramid'],
      ['group', 'Wiki & Others', 'wiki-others'],
      ['topic', 'Agile Certified Practitioner (PMI-ACP®)', 'agile-certified-practitioner-pmi-acp'],
    ])
    expect(coKyTu.filter((n) => cay.mucTheoId.has(n.id))).toHaveLength(10)
  })

  it('phần, lĩnh vực, nhóm cũng có slug và tra được theo slug', () => {
    expect(cay.nutTheoSlug.get('scope-management')?.kind).toBe('area')
    expect(cay.nutTheoSlug.get('certifications')?.kind).toBe('part')
    expect(cay.nutTheoSlug.get('prioritization-techniques')?.kind).toBe('group')
  })
})

describe('đường dẫn file nội dung', () => {
  it('mục có lĩnh vực: noi-dung/<phần>/<lĩnh vực>/<slug>.md', () => {
    expect(muc('Scope Creep').duongDanFile).toBe(
      'noi-dung/project-management/scope-management/scope-creep.md',
    )
    expect(muc('Salience Model').duongDanFile).toBe(
      'noi-dung/project-management/stakeholder-and-communication-management/salience-model.md',
    )
  })

  it('nhóm không vào đường dẫn', () => {
    expect(muc('MoSCoW').duongDanFile).toBe(
      'noi-dung/project-management/scope-management/moscow.md',
    )
    expect(muc('SAFe', 'Project Management').duongDanFile).toBe(
      'noi-dung/project-management/pm-framework-approach/safe-scaled-agile.md',
    )
  })

  it('mục không thuộc lĩnh vực (Business Acumen, Certifications): noi-dung/<phần>/<slug>.md', () => {
    expect(muc('Sales Process').duongDanFile).toBe('noi-dung/business-acumen/sales-process.md')
    expect(muc('Net Present Value (NPV)').duongDanFile).toBe(
      'noi-dung/business-acumen/net-present-value-npv.md',
    )
    expect(muc('Project Management Professional (PMP)').duongDanFile).toBe(
      'noi-dung/certifications/project-management-professional-pmp.md',
    )
    expect(muc('SAFe', 'Certifications').duongDanTuongDoi).toBe(
      'certifications/safe-certifications.md',
    )
  })

  it('đường dẫn duy nhất; duongDanTuongDoi = duongDanFile bỏ "noi-dung/"', () => {
    expect(new Set(cay.mucHoc.map((m) => m.duongDanFile)).size).toBe(199)
    expect(cay.mucHoc.every((m) => m.duongDanFile === `noi-dung/${m.duongDanTuongDoi}`)).toBe(true)
  })
})

describe('cau-hinh-cay.json', () => {
  it('icon phần theo §5.2, phần chứng chỉ và nhóm Process Groups', () => {
    expect(cay.phan.map((p) => [p.label, p.icon])).toEqual([
      ['Project Management', 'briefcase'],
      ['Business Acumen', 'trending-up'],
      ['Technical Acumen', 'cpu'],
      ['Tools', 'wrench'],
      ['Certifications', 'award'],
    ])
    expect(cay.phanChungChi.label).toBe('Certifications')
    expect(cay.nhomProcessGroup.label).toBe('Project Process Groups')
    expect(mucHocCua(cay, cay.nhomProcessGroup.id).map((m) => m.label)).toEqual([
      'Initiation',
      'Planning',
      'Execution',
      'Monitoring and Control',
      'Closure',
    ])
    expect(tatCaNut.filter((n) => n.kind !== 'part').every((n) => n.icon === undefined)).toBe(true)
  })
})

describe('layCay (cây của app từ docs/roadmap-tree.json)', () => {
  it('dựng được và giữ lại một bản', () => {
    const a = layCay()
    expect(a.soMucHoc).toBeGreaterThan(0)
    expect(layCay()).toBe(a)
  })

  it('cay (đọc thuộc tính) trỏ vào cùng bản với layCay()', () => {
    expect(cayApp.soMucHoc).toBe(layCay().soMucHoc)
    expect(cayApp.mucHoc).toBe(layCay().mucHoc)
    expect('mucTheoSlug' in cayApp).toBe(true)
  })
})

// Slug gốc theo quy tắc 1.3, viết lại độc lập để đối chiếu
function tenThanhSlugGoc(ten: string): string {
  return ten
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/['’®]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
