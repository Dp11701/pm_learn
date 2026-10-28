// Hàm thuần dựng cây hiện của danh sách (src/components/danh-sach/cay-hien.ts; §6.3 "Danh sách giữ lại cấp cha của
// mục khớp", đề xuất 3.3): giữ phần / lĩnh vực / nhóm của mục khớp theo thứ tự cây, bỏ nút không còn mục nào; số đếm
// tiến độ của một nút không phụ thuộc bộ lọc.
import { describe, expect, it } from 'vitest'
import { layCay, mucHocCua, type MucHoc } from '../../../shared/roadmap'
import {
  demTrongNut,
  dungCayHien,
  mucTheoNut,
  type PhanTuHien,
} from '../../../src/components/danh-sach/cay-hien'

const cay = layCay()

/** Mọi mục học trong cây hiện, theo thứ tự vẽ. */
function cacMucTrong(ds: readonly PhanTuHien[]): MucHoc[] {
  return ds.flatMap((pt) => (pt.loai === 'muc' ? [pt.muc] : cacMucTrong(pt.nhom.con)))
}

describe('dungCayHien', () => {
  it('không lọc: đủ soMucHoc mục theo thứ tự cây, mỗi phần một nhóm gốc', () => {
    const hien = new Set(cay.mucHoc.map((m) => m.id))
    const ds = dungCayHien(
      cay,
      cay.phan.map((p) => p.id),
      hien,
    )
    expect(ds.map((pt) => (pt.loai === 'nhom' ? pt.nhom.nut.id : pt.muc.id))).toEqual(
      cay.phan.map((p) => p.id),
    )
    expect(cacMucTrong(ds)).toEqual(cay.mucHoc)
  })

  it('giữ chuỗi cha của mục khớp, bỏ nút rỗng', () => {
    const muc = cay.mucHoc.find((m) => m.linhVuc && m.nhom)!
    const ds = dungCayHien(
      cay,
      cay.phan.map((p) => p.id),
      new Set([muc.id]),
    )
    expect(ds).toHaveLength(1)
    const phan = ds[0]
    expect(phan.loai === 'nhom' && phan.nhom.nut.id).toBe(muc.phan.id)
    const linhVuc = phan.loai === 'nhom' ? phan.nhom.con : []
    expect(linhVuc).toHaveLength(1)
    expect(linhVuc[0].loai === 'nhom' && linhVuc[0].nhom.nut.id).toBe(muc.linhVuc!.id)
    expect(cacMucTrong(ds)).toEqual([muc])
  })

  it('không mục nào khớp: rỗng', () => {
    expect(
      dungCayHien(
        cay,
        cay.phan.map((p) => p.id),
        new Set(),
      ),
    ).toEqual([])
  })
})

describe('demTrongNut / mucTheoNut', () => {
  it('đếm theo trạng thái trên mọi mục của nút; tong lấy từ cây', () => {
    const phan = cay.phan[0]
    const cacMuc = mucHocCua(cay, phan.id)
    const [a, b, c] = cacMuc
    const tra = (id: string) =>
      id === a.id ? 'da-xong' : id === b.id ? 'dang-hoc' : id === c.id ? 'bo-qua' : 'chua-hoc'
    expect(demTrongNut(cacMuc, tra)).toEqual({
      xong: 1,
      dangHoc: 1,
      boQua: 1,
      tong: cacMuc.length,
    })
    const bang = mucTheoNut(cay)
    expect(bang.get(phan.id)).toEqual(cacMuc)
    // Mục học không có khoá (chỉ phần, lĩnh vực, nhóm)
    expect(bang.has(a.id)).toBe(false)
    const tong = cay.phan.reduce((s, p) => s + (bang.get(p.id)?.length ?? 0), 0)
    expect(tong).toBe(cay.soMucHoc)
  })
})
