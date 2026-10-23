import { describe, expect, it } from 'vitest'
import cayJson from '../fixtures/roadmap-tree.json'
import cauHinhJson from '../../shared/roadmap/cau-hinh-cay.json'
import { dungCay } from '../../shared/roadmap'
import { vietTat } from '../../shared/tim-kiem'

const cay = dungCay(cayJson, cauHinhJson)

// Danh sách đóng băng: vietTat trên mọi mục học của cây, theo thứ tự cây, bỏ trùng.
const DANH_SACH_DONG_BANG = [
  'OPA',
  'PMIS',
  'SDLC',
  'PDLC',
  'EEF',
  'PoC',
  'MVP',
  'SAFe',
  'LeSS',
  'WBS',
  'MoSCoW',
  'RICE',
  'ICE',
  'CCB',
  'CR',
  'ADKAR',
  'PESTLE',
  'VUCA',
  'BANI',
  'GPM',
  'COGS',
  'CAPEX',
  'OPEX',
  'EBIT',
  'EBITDA',
  'PnL',
  'CoQ',
  'TQM',
  'ERG',
  'RACI',
  'RFP',
  'RFQ',
  'RFI',
  'NDA',
  'MSA',
  'SOW',
  'SLA',
  'NPV',
  'IRR',
  'ROI',
  'CI/CD',
  'LLMs',
  'MS',
  'PSM',
  'PRINCE',
  'CAPM',
  'PSPO',
  'PMP',
  'PSK',
  'ITIL',
  'PMI-ACP',
]

// Ví dụ "bắt" trong đề xuất 1.8 (không phải toàn bộ danh sách)
const VI_DU_BAT = [
  'WBS',
  'RICE',
  'ICE',
  'RACI',
  'ADKAR',
  'PnL',
  'MoSCoW',
  'PoC',
  'CoQ',
  'SAFe',
  'LeSS',
  'LLMs',
  'MS',
  'ERG',
  'PRINCE',
  'CAPEX',
  'OPEX',
  'EBIT',
  'EBITDA',
  'PMI-ACP',
]
const VI_DU_LOAI = [
  'McKinsey',
  'McGregor',
  'McClelland’s',
  'DevOps',
  'GenAI',
  'Top-Down',
  'crashing, fast tracking',
]

function tatCaVietTat(cacTen: readonly string[]): string[] {
  const ketQua: string[] = []
  for (const ten of cacTen) for (const v of vietTat(ten)) if (!ketQua.includes(v)) ketQua.push(v)
  return ketQua
}

describe('vietTat trên cây thật', () => {
  const tren = tatCaVietTat(cay.mucHoc.map((m) => m.label))

  it('khớp danh sách đóng băng', () => {
    expect(tren).toEqual(DANH_SACH_DONG_BANG)
  })

  it('bắt mọi ví dụ của đề xuất 1.8 và loại các ví dụ cần loại', () => {
    expect(tren).toEqual(expect.arrayContaining(VI_DU_BAT))
    for (const v of VI_DU_LOAI) expect(tren).not.toContain(v)
  })

  it('14 mục dạng "Tên (VIẾT TẮT)" lấy được viết tắt từ ngoặc cuối (tên đầy đủ cho F37)', () => {
    const coNgoac = cay.mucHoc.filter((m) => {
      const ngoac = /\(([^()]*)\)\s*$/.exec(m.label)
      return ngoac !== null && vietTat(m.label).includes(ngoac[1].replace('®', '').trim())
    })
    expect(coNgoac.map((m) => vietTat(m.label).at(-1))).toEqual([
      'CCB',
      'CR',
      'GPM',
      'COGS',
      'CoQ',
      'TQM',
      'NPV',
      'IRR',
      'PSM',
      'CAPM',
      'PSPO',
      'PMP',
      'PSK',
      'PMI-ACP',
    ])
  })

  it('nút phần / lĩnh vực / nhóm: PM, PMO, QA, AI (dùng trong chỉ mục tìm kiếm, không vào F37)', () => {
    const cauTruc = [...cay.nutTheoId.values()].filter((n) => !cay.mucTheoId.has(n.id))
    expect(tatCaVietTat(cauTruc.map((n) => n.label))).toEqual(['PM', 'PMO', 'QA', 'AI'])
  })

  it('mục có nhiều viết tắt hoặc trùng viết tắt', () => {
    const theoTen = (vt: string) =>
      cay.mucHoc.filter((m) => vietTat(m.label).includes(vt)).map((m) => m.slug)
    expect(theoTen('SAFe')).toEqual(['safe-scaled-agile', 'safe-certifications'])
    expect(theoTen('MS')).toHaveLength(2)
    expect(theoTen('PRINCE')).toHaveLength(2)
    expect(theoTen('SDLC')).toHaveLength(2)
  })
})

describe('vietTat từng tên', () => {
  it.each([
    ['CAPEX / OPEX', ['CAPEX', 'OPEX']],
    ['EBIT / EBITDA', ['EBIT', 'EBITDA']],
    ['WBS + WBS dictionary', ['WBS']],
    ['CI/CD', ['CI/CD']],
    ['Change Control Board (CCB)', ['CCB']],
    ['Agile Certified Practitioner (PMI-ACP®)', ['PMI-ACP']],
    ['Cost of Quality (CoQ)', ['CoQ']],
    ['GenAI / GenAI for SDLC', ['SDLC']],
    ['PRINCE 2 Foundation', ['PRINCE']],
    ['PnL model', ['PnL']],
    ['LLMs overview', ['LLMs']],
    ['Schedule compression (crashing, fast tracking)', []],
    ['Bottom-Up / Top-Down Estimation', []],
    ['McKinsey 7S Framework', []],
    ['Primavera P6 Oracle', []],
    ['Azure DevOps', []],
    ['Value/Effort Matrix', []],
    ['V-model', []],
    ['Kotter’s 8-Step Process', []],
  ])('%s → %j', (ten, mongDoi) => {
    expect(vietTat(ten)).toEqual(mongDoi)
  })

  it('ngoặc cuối chỉ lấy khi nội dung cũng là viết tắt; ngoặc giữa tên tách như token thường', () => {
    expect(vietTat('Tên (ABC) phía sau')).toEqual(['ABC'])
    expect(vietTat('Tên (abc)')).toEqual([])
    expect(vietTat('Tên (Ab)')).toEqual([])
  })
})
