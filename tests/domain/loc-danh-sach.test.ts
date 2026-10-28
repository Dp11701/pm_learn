// Bộ lọc Lộ trình dạng danh sách (shared/domain/loc-danh-sach.ts; đề xuất 3.9, §6.3): đọc / ghi URL, HOẶC trong
// nhóm và VÀ giữa các nhóm, Cần ôn lại là một giá trị của nhóm trạng thái, sắp xếp cây / A–Z / mở gần đây.
import { describe, expect, it } from 'vitest'
import {
  BO_LOC_TRONG,
  cacLinhVuc,
  dangLoc,
  docUrlDanhSach,
  doiGiaTri,
  ghiUrlDanhSach,
  khopBoLoc,
  locMuc,
  sapXepMuc,
  type BoLoc,
  type TraMuc,
} from '../../shared/domain/loc-danh-sach'
import type { TrangThaiHoc, TrangThaiNoiDung } from '../../shared/domain/trang-thai'
import { layCay } from '../../shared/roadmap'

const cay = layCay()
const muc = (slug: string) => cay.mucTheoSlug.get(slug)!
const scopeCreep = muc('scope-creep')
const riskRegister = muc('risk-register')
const pmp = muc('project-management-professional-pmp')
const [phanDau, , , , phanCuoi] = cay.phan
const linhVucScope = cay.nutTheoSlug.get('scope-management')!

const url = (q: string) => docUrlDanhSach(new URLSearchParams(q), cay)

function tra(
  trangThai: Record<string, TrangThaiHoc> = {},
  canOnLai: string[] = [],
  noiDung: Record<string, TrangThaiNoiDung> | null = {},
): TraMuc {
  return {
    trangThai: (id) => trangThai[id] ?? 'chua-hoc',
    canOnLai: (id) => canOnLai.includes(id),
    noiDung: (id) => (noiDung === null ? undefined : (noiDung[id] ?? { loai: 'chua-co' })),
  }
}

describe('docUrlDanhSach / ghiUrlDanhSach', () => {
  it('không có tham số: không lọc, sắp theo cây', () => {
    expect(url('')).toEqual({ boLoc: BO_LOC_TRONG, sapXep: 'cay' })
    expect(dangLoc(url('').boLoc)).toBe(false)
  })

  it('link cũ ?xem=danh-sach&phan=<slug> lọc theo phần; ?muc=<slug> chỉ nhận mục học của cây', () => {
    const t = url(`xem=danh-sach&phan=${phanCuoi.slug}&muc=scope-creep`)
    expect(t.boLoc.phan).toEqual([phanCuoi.slug])
    expect(t.muc).toBe('scope-creep')
    expect(url('muc=scope-management').muc).toBeUndefined()
    expect(url('muc=khong-co').muc).toBeUndefined()
  })

  it('nhận dấu phẩy và tham số lặp lại; bỏ giá trị lạ, slug sai loại; thứ tự chuẩn, không trùng', () => {
    const t = url(
      `trang-thai=can-on-lai,dang-hoc&trang-thai=xong,dang-hoc&loai=tai-lieu,chu-de&phan=${phanCuoi.slug},scope-management,${phanDau.slug}` +
        `&linh-vuc=scope-creep,scope-management&noi-dung=da-duyet,khac&sap-xep=z-a`,
    )
    expect(t.boLoc).toEqual({
      trangThai: ['dang-hoc', 'can-on-lai'],
      loai: ['chu-de', 'tai-lieu'],
      phan: [phanDau.slug, phanCuoi.slug],
      linhVuc: ['scope-management'],
      noiDung: ['da-duyet'],
    })
    expect(t.sapXep).toBe('cay')
  })

  it('ghi lại: nhóm có giá trị, ngăn bằng dấu phẩy; sap-xep khác cây; giữ xem, bỏ muc', () => {
    const cu = new URLSearchParams('xem=danh-sach&muc=scope-creep&la=1')
    const boLoc: BoLoc = { ...BO_LOC_TRONG, trangThai: ['dang-hoc', 'can-on-lai'], noiDung: ['chua-co'] }
    expect(ghiUrlDanhSach({ boLoc, sapXep: 'a-z' }, cu).toString()).toBe(
      'xem=danh-sach&trang-thai=dang-hoc%2Ccan-on-lai&noi-dung=chua-co&sap-xep=a-z',
    )
    expect(ghiUrlDanhSach({ boLoc: BO_LOC_TRONG, sapXep: 'cay' }).toString()).toBe('')
    // Đọc lại đúng như đã ghi
    expect(docUrlDanhSach(ghiUrlDanhSach({ boLoc, sapXep: 'mo-gan-day' }), cay)).toEqual({
      boLoc,
      sapXep: 'mo-gan-day',
    })
  })

  it('doiGiaTri bật / tắt một giá trị', () => {
    const b1 = doiGiaTri(BO_LOC_TRONG, 'loai', 'tai-lieu')
    expect(b1.loai).toEqual(['tai-lieu'])
    expect(dangLoc(b1)).toBe(true)
    expect(doiGiaTri(b1, 'loai', 'tai-lieu').loai).toEqual([])
  })

  it('cacLinhVuc theo thứ tự cây, đủ mọi lĩnh vực', () => {
    const ds = cacLinhVuc(cay)
    expect(ds).toHaveLength(11)
    expect(ds.every((n) => n.kind === 'area')).toBe(true)
    expect(ds[0].chaId).toBe(phanDau.id)
  })
})

describe('khopBoLoc / locMuc', () => {
  const tt = tra(
    { [scopeCreep.id]: 'dang-hoc', [riskRegister.id]: 'da-xong', [pmp.id]: 'bo-qua' },
    [riskRegister.id],
    { [scopeCreep.id]: { loai: 'da-duyet', ngayDuyet: '2026-10-18' } },
  )

  it('không lọc: mọi mục, đúng soMucHoc, theo thứ tự cây', () => {
    const ds = locMuc(cay, BO_LOC_TRONG, tt)
    expect(ds).toHaveLength(199)
    expect(ds.map((m) => m.index)).toEqual([...ds.keys()])
  })

  it('trong nhóm trạng thái là HOẶC; Cần ôn lại là một giá trị của nhóm', () => {
    const b: BoLoc = { ...BO_LOC_TRONG, trangThai: ['dang-hoc', 'can-on-lai'] }
    expect(locMuc(cay, b, tt).map((m) => m.slug)).toEqual(['scope-creep', 'risk-register'].sort(
      (a, c) => muc(a).index - muc(c).index,
    ))
    const chuaHoc = locMuc(cay, { ...BO_LOC_TRONG, trangThai: ['chua-hoc'] }, tt)
    expect(chuaHoc).toHaveLength(199 - 3)
  })

  it('giữa các nhóm là VÀ: trạng thái × loại × phần × lĩnh vực × nội dung', () => {
    const boQuaChungChi: BoLoc = { ...BO_LOC_TRONG, trangThai: ['bo-qua'], loai: ['chung-chi'] }
    expect(locMuc(cay, boQuaChungChi, tt)).toEqual([pmp])
    expect(locMuc(cay, { ...boQuaChungChi, loai: ['chu-de'] }, tt)).toEqual([])

    const scope: BoLoc = { ...BO_LOC_TRONG, linhVuc: ['scope-management'] }
    const trongScope = locMuc(cay, scope, tt)
    expect(trongScope).toHaveLength(16)
    expect(trongScope.every((m) => m.linhVuc?.id === linhVucScope.id)).toBe(true)
    expect(locMuc(cay, { ...scope, loai: ['tai-lieu'] }, tt).length).toBeGreaterThan(0)
    expect(locMuc(cay, { ...scope, loai: ['tai-lieu'] }, tt).every((m) => m.mau === 'tai-lieu')).toBe(
      true,
    )
    expect(locMuc(cay, { ...scope, noiDung: ['da-duyet'] }, tt)).toEqual([scopeCreep])

    const phan: BoLoc = { ...BO_LOC_TRONG, phan: [phanCuoi.slug] }
    expect(locMuc(cay, phan, tt).every((m) => m.phan.id === phanCuoi.id)).toBe(true)
    // Lọc lĩnh vực loại mục không thuộc lĩnh vực nào
    expect(locMuc(cay, { ...phan, linhVuc: ['scope-management'] }, tt)).toEqual([])
  })

  it('nội dung chưa biết (đang tải): không khớp khi đang lọc theo nội dung, không ảnh hưởng khi không lọc', () => {
    const chuaBiet = tra({}, [], null)
    expect(khopBoLoc(scopeCreep, { ...BO_LOC_TRONG, noiDung: ['chua-co'] }, chuaBiet)).toBe(false)
    expect(khopBoLoc(scopeCreep, BO_LOC_TRONG, chuaBiet)).toBe(true)
  })
})

describe('sapXepMuc', () => {
  const ds = [pmp, riskRegister, scopeCreep]

  it('cây: theo index', () => {
    expect(sapXepMuc(ds, 'cay').map((m) => m.index)).toEqual(
      ds.map((m) => m.index).sort((a, b) => a - b),
    )
  })

  it('A–Z: theo tên, không phân biệt hoa/thường', () => {
    const tatCa = sapXepMuc(cay.mucHoc, 'a-z')
    const ten = tatCa.map((m) => m.label.toLowerCase())
    expect(ten.slice(0, 5)).toEqual([...ten].sort((a, b) => a.localeCompare(b, 'en')).slice(0, 5))
    expect(sapXepMuc(ds, 'a-z').map((m) => m.slug)).toEqual([
      'project-management-professional-pmp',
      'risk-register',
      'scope-creep',
    ])
  })

  it('mở gần đây: mở gần nhất trước, chưa mở đứng sau theo thứ tự cây', () => {
    const luotMo = {
      [pmp.id]: '2026-10-20T08:00:00.000Z',
      [scopeCreep.id]: '2026-10-22T08:00:00.000Z',
    }
    expect(sapXepMuc(ds, 'mo-gan-day', luotMo)).toEqual([scopeCreep, pmp, riskRegister])
    expect(sapXepMuc([pmp, scopeCreep, riskRegister], 'mo-gan-day', {})).toEqual(
      sapXepMuc([pmp, scopeCreep, riskRegister], 'cay'),
    )
  })
})
