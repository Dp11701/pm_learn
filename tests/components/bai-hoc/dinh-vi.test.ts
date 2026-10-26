// Định vị ở trang bài (§6.2, đề xuất 3.3, 3.9, D10, D12, D30): đường dẫn từng loại nút, phân số, Trước / Tiếp
// bỏ qua mục Bỏ qua, loại ranh giới và nhãn pager. Chạy trên cây của app (tên lấy từ cây, không gõ cứng).
import { describe, expect, it } from 'vitest'
import { layCay, mucHocCua } from '../../../shared/roadmap'
import type { TrangThaiHoc } from '../../../shared/domain/trang-thai'
import {
  cungCap,
  demTienDo,
  duongDanBanDo,
  duongDanNhap,
  duongDanNut,
  duongDanSoan,
  nhanPager,
  ranhGioi,
  truocTiep,
} from '../../../src/components/bai-hoc/dinh-vi'

const cay = layCay()
const muc = (slug: string) => cay.mucTheoSlug.get(slug)!
const nut = (slug: string) => cay.nutTheoSlug.get(slug)!

const tra = (bang: Record<string, TrangThaiHoc>) => (id: string) => bang[id] ?? 'chua-hoc'

describe('duongDanNut', () => {
  it('mục học → /hoc, lĩnh vực → /linh-vuc, phần → Lộ trình lọc theo phần (trước phase 10)', () => {
    expect(duongDanNut(cay, muc('scope-creep'))).toBe('/hoc/scope-creep')
    expect(duongDanNut(cay, muc('risk-register'))).toBe('/hoc/risk-register')
    expect(duongDanNut(cay, nut('scope-management'))).toBe('/linh-vuc/scope-management')
    expect(duongDanNut(cay, nut('certifications'))).toBe(
      '/lo-trinh?xem=danh-sach&phan=certifications',
    )
  })

  it('nhóm → điểm neo #slug trên trang cha (lĩnh vực hoặc phần)', () => {
    expect(duongDanNut(cay, nut('prioritization-techniques'))).toBe(
      '/linh-vuc/scope-management#prioritization-techniques',
    )
    const nhomCuaPhan = muc('net-present-value-npv').nhom!
    expect(duongDanNut(cay, nhomCuaPhan)).toBe(
      `/lo-trinh?xem=danh-sach&phan=business-acumen#${nhomCuaPhan.slug}`,
    )
  })

  it('đường dẫn của bản đồ, trình soạn, tab Nhập (gán sẵn mục)', () => {
    const m = muc('salience-model')
    expect(duongDanBanDo(m)).toBe('/lo-trinh?xem=ban-do&muc=salience-model')
    expect(duongDanSoan(m)).toBe('/hoc/salience-model/soan')
    expect(duongDanNhap(m)).toBe('/noi-dung?tab=nhap&muc=salience-model')
  })
})

describe('cungCap, demTienDo (menu breadcrumb, D10)', () => {
  it('phần → mọi phần; lĩnh vực → lĩnh vực của phần; nhóm → con của lĩnh vực (mục + nhóm)', () => {
    expect(cungCap(cay, nut('certifications'))).toEqual([...cay.phan])
    const cacLinhVuc = cungCap(cay, nut('scope-management'))
    expect(cacLinhVuc.every((n) => n.kind === 'area')).toBe(true)
    expect(cacLinhVuc.map((n) => n.slug)).toContain('risk-management')
    const conLinhVuc = cungCap(cay, nut('prioritization-techniques'))
    expect(conLinhVuc.map((n) => n.kind)).toEqual(
      expect.arrayContaining(['topic', 'document', 'group']),
    )
    expect(conLinhVuc.map((n) => n.id)).toEqual([...nut('scope-management').con])
  })

  it('đếm Đã xong / Đang học / Bỏ qua trên mọi mục học của nút (kể cả trong nhóm)', () => {
    const cacMuc = mucHocCua(cay, nut('scope-management').id)
    const bang: Record<string, TrangThaiHoc> = {
      [cacMuc[0].id]: 'da-xong',
      [cacMuc[1].id]: 'da-xong',
      [cacMuc[2].id]: 'dang-hoc',
      [cacMuc[3].id]: 'bo-qua',
    }
    expect(demTienDo(cay, nut('scope-management').id, tra(bang))).toEqual({
      xong: 2,
      dangHoc: 1,
      boQua: 1,
      tong: cacMuc.length,
    })
  })
})

describe('truocTiep (§6.2): bỏ qua mục Bỏ qua, vẫn dừng ở mục chưa có nội dung', () => {
  it('Trước của Risk Register là Wideband Delphi khi Function Point Analysis Bỏ qua (§8.6)', () => {
    const rr = muc('risk-register')
    expect(truocTiep(cay, rr, tra({})).truoc?.slug).toBe('function-point-analysis')
    const { truoc } = truocTiep(cay, rr, tra({ [muc('function-point-analysis').id]: 'bo-qua' }))
    expect(truoc?.slug).toBe('wideband-delphi')
  })

  it('mục đầu không có Trước; mục cuối (hoặc mọi mục sau đều Bỏ qua) không có Tiếp', () => {
    expect(truocTiep(cay, cay.mucHoc[0], tra({})).truoc).toBeUndefined()
    const cuoi = cay.mucHoc[cay.soMucHoc - 1]
    expect(truocTiep(cay, cuoi, tra({})).tiep).toBeUndefined()
    const keCuoi = cay.mucHoc[cay.soMucHoc - 2]
    expect(truocTiep(cay, keCuoi, tra({ [cuoi.id]: 'bo-qua' })).tiep).toBeUndefined()
  })
})

describe('ranhGioi + nhanPager (D12)', () => {
  it('lĩnh vực: "Trước — sang lĩnh vực trước:" + tên lĩnh vực của mục đích (F15)', () => {
    const rg = ranhGioi(muc('risk-register'), muc('wideband-delphi'))
    expect(rg).toEqual({ loai: 'linh-vuc', nut: muc('wideband-delphi').linhVuc })
    expect(nhanPager('truoc', rg)).toBe('Trước — sang lĩnh vực trước:')
    expect(nhanPager('tiep', ranhGioi(muc('wideband-delphi'), muc('risk-register')))).toBe(
      'Tiếp — sang lĩnh vực mới:',
    )
  })

  it('phần ưu tiên hơn lĩnh vực / nhóm: "Tiếp — sang phần mới:"', () => {
    const iBa = cay.mucHoc.findIndex((m) => m.phan.slug === 'business-acumen')
    const [tu, den] = [cay.mucHoc[iBa - 1], cay.mucHoc[iBa]]
    const rg = ranhGioi(tu, den)
    expect(rg?.loai).toBe('phan')
    expect(rg?.nut.slug).toBe('business-acumen')
    expect(nhanPager('tiep', rg)).toBe('Tiếp — sang phần mới:')
    expect(nhanPager('truoc', ranhGioi(den, tu))).toBe('Trước — sang phần trước:')
  })

  it('nhóm: sang nhóm khác trong cùng lĩnh vực; rời nhóm về mục trực tiếp thì không phải ranh giới', () => {
    const iDau = cay.mucHoc.findIndex((m) => m.nhom?.slug === 'prioritization-techniques')
    const [tu, den] = [cay.mucHoc[iDau - 1], cay.mucHoc[iDau]]
    expect(tu.nhom?.id).not.toBe(den.nhom?.id)
    expect(nhanPager('tiep', ranhGioi(tu, den))).toBe('Tiếp — sang nhóm mới:')
    expect(ranhGioi(tu, den)?.nut.slug).toBe('prioritization-techniques')
    // Mục đứng trực tiếp trong lĩnh vực, sau một mục trong nhóm
    const iRoiNhom = cay.mucHoc.findIndex(
      (m, i) =>
        i > 0 &&
        !m.nhom &&
        cay.mucHoc[i - 1].nhom !== undefined &&
        m.phan.id === cay.mucHoc[i - 1].phan.id &&
        m.linhVuc?.id === cay.mucHoc[i - 1].linhVuc?.id,
    )
    if (iRoiNhom > 0) {
      expect(ranhGioi(cay.mucHoc[iRoiNhom - 1], cay.mucHoc[iRoiNhom])).toBeNull()
    }
  })

  it('cùng vùng: chỉ "Trước" / "Tiếp"', () => {
    const sc = muc('scope-creep')
    const { truoc, tiep } = truocTiep(cay, sc, tra({}))
    expect(nhanPager('truoc', ranhGioi(sc, truoc!))).toBe('Trước')
    expect(nhanPager('tiep', ranhGioi(sc, tiep!))).toBe('Tiếp')
  })
})
