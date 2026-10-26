// "Học tiếp" và khối "Đang học" (§6.2, đề xuất 3.9; F05 "Học tiếp: OPA (mục đầu tiên trong cây)").
import { describe, expect, it } from 'vitest'
import cayJson from '../../fixtures/roadmap-tree.json'
import cauHinhJson from '../../../shared/roadmap/cau-hinh-cay.json'
import { dungCay } from '../../../shared/roadmap'
import type { AnhChupHoc, MucTrangThai } from '../../../server/du-lieu/hop-dong-trang-thai'
import {
  cacMucDangHoc,
  danhSachDangHoc,
  hocTiep,
  lyDoBoQuaTrong,
  SO_DANG_HOC_GAN_DAY,
  trangThaiTrong,
} from '../../../src/app/du-lieu/hoc-tiep'

// Cây đóng băng: số và tên ở đây là dữ liệu test, được phép gõ cứng.
const cay = dungCay(cayJson, cauHinhJson)
const m = cay.mucHoc

function anhChup(
  trangThai: Record<string, MucTrangThai['status'] | MucTrangThai>,
  luotMo: Record<string, string> = {},
): AnhChupHoc {
  return {
    revision: 1,
    trangThai: Object.fromEntries(
      Object.entries(trangThai).map(([id, v]) => [id, typeof v === 'string' ? { status: v } : v]),
    ),
    luotMo,
  }
}

describe('trạng thái của một mục', () => {
  it('không có khoá / chưa có ảnh chụp = Chưa học; ánh xạ learning/done/skip', () => {
    const a = anhChup({ [m[0].id]: 'learning', [m[1].id]: 'done', [m[2].id]: 'skip' })
    expect(trangThaiTrong(a, m[0].id)).toBe('dang-hoc')
    expect(trangThaiTrong(a, m[1].id)).toBe('da-xong')
    expect(trangThaiTrong(a, m[2].id)).toBe('bo-qua')
    expect(trangThaiTrong(a, m[3].id)).toBe('chua-hoc')
    expect(trangThaiTrong(undefined, m[0].id)).toBe('chua-hoc')
  })

  it('lý do Bỏ qua chỉ khi đang Bỏ qua', () => {
    const a = anhChup({ [m[0].id]: { status: 'skip', lyDoBoQua: 'Để sau' }, [m[1].id]: 'skip' })
    expect(lyDoBoQuaTrong(a, m[0].id)).toBe('Để sau')
    expect(lyDoBoQuaTrong(a, m[1].id)).toBeUndefined()
    expect(lyDoBoQuaTrong(a, m[2].id)).toBeUndefined()
  })
})

describe('Học tiếp', () => {
  it('lần đầu (chưa có trạng thái nào) → mục đầu tiên của cây: OPA', () => {
    const muc = hocTiep(cay, anhChup({}))
    expect(muc).toBe(m[0])
    expect(muc?.label).toBe('OPA')
  })

  it('chưa có ảnh chụp → undefined (chưa biết)', () => {
    expect(hocTiep(cay, undefined)).toBeUndefined()
  })

  it('có Đang học → mục Đang học mở gần nhất (không theo thứ tự cây)', () => {
    const a = anhChup(
      { [m[5].id]: 'learning', [m[40].id]: 'learning', [m[90].id]: 'learning' },
      {
        [m[5].id]: '2026-10-20T08:00:00.000Z',
        [m[40].id]: '2026-10-22T14:30:00.000Z',
        [m[90].id]: '2026-10-21T09:00:00.000Z',
        // Mở gần đây hơn nhưng Đã xong: không tính.
        [m[7].id]: '2026-10-22T15:00:00.000Z',
      },
    )
    expect(hocTiep(cay, a)).toBe(m[40])
  })

  it('Đang học chưa mở lần nào vẫn hơn Chưa học; nhiều mục chưa mở thì theo thứ tự cây', () => {
    const a = anhChup({ [m[0].id]: 'done', [m[30].id]: 'learning', [m[12].id]: 'learning' })
    expect(hocTiep(cay, a)).toBe(m[12])
  })

  it('không có Đang học → mục Chưa học đầu tiên theo thứ tự cây (bỏ qua Đã xong, Bỏ qua)', () => {
    const a = anhChup({ [m[0].id]: 'done', [m[1].id]: 'skip', [m[2].id]: 'done' })
    expect(hocTiep(cay, a)).toBe(m[3])
  })

  it('mọi mục Đã xong / Bỏ qua → undefined', () => {
    const tatCa = Object.fromEntries(m.map((muc, i) => [muc.id, i % 2 ? 'done' : 'skip'] as const))
    expect(hocTiep(cay, anhChup(tatCa))).toBeUndefined()
  })

  it('bất biến 8: bản ghi mồ côi (id không còn trong cây) không bao giờ thành Học tiếp', () => {
    const a = anhChup({ 'id-mo-coi': 'learning' }, { 'id-mo-coi': '2026-10-22T23:00:00.000Z' })
    expect(hocTiep(cay, a)).toBe(m[0])
    expect(cacMucDangHoc(cay, a)).toEqual([])
  })
})

describe('khối Đang học', () => {
  it('3 mục mở gần nhất + tổng', () => {
    const ids = [m[3], m[50], m[100], m[150], m[198]].map((x) => x.id)
    const a = anhChup(Object.fromEntries(ids.map((id) => [id, 'learning'])), {
      [ids[0]]: '2026-10-18T10:00:00.000Z',
      [ids[1]]: '2026-10-22T10:00:00.000Z',
      [ids[2]]: '2026-10-21T10:00:00.000Z',
      [ids[3]]: '2026-10-22T11:00:00.000Z',
    })
    expect(SO_DANG_HOC_GAN_DAY).toBe(3)
    const ds = danhSachDangHoc(cay, a)
    expect(ds.tong).toBe(5)
    expect(ds.cacMuc).toEqual([m[150], m[50], m[100]])
    expect(cacMucDangHoc(cay, a)).toEqual([m[150], m[50], m[100], m[3], m[198]])
    expect(danhSachDangHoc(cay, a, 1).cacMuc).toEqual([m[150]])
  })

  it('trống / chưa có ảnh chụp', () => {
    expect(danhSachDangHoc(cay, anhChup({}))).toEqual({ cacMuc: [], tong: 0 })
    expect(danhSachDangHoc(cay, undefined)).toEqual({ cacMuc: [], tong: 0 })
  })
})
