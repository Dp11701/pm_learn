// Dựng phần cây cần vẽ của danh sách (Lộ trình, trang Lĩnh vực): giữ cấp cha (phần, lĩnh vực, nhóm) của mục khớp
// bộ lọc, bỏ nút không còn mục nào (§6.3 "Danh sách giữ lại cấp cha của mục khớp"). Hàm thuần, theo thứ tự cây.
import { mucHocCua, type Cay, type MucHoc, type Nut } from '../../../shared/roadmap'
import type { SoTienDo } from '../trang-thai/TienDo'
import type { TrangThaiHoc } from '../../../shared/domain/trang-thai'

export interface NhomHien {
  nut: Nut
  con: PhanTuHien[]
}

export type PhanTuHien = { loai: 'muc'; muc: MucHoc } | { loai: 'nhom'; nhom: NhomHien }

/** Các phần tử cần vẽ dưới các nút `gocIds` (theo thứ tự), chỉ giữ mục có trong `hien`. */
export function dungCayHien(
  cay: Pick<Cay, 'nutTheoId' | 'mucTheoId'>,
  gocIds: readonly string[],
  hien: ReadonlySet<string>,
): PhanTuHien[] {
  const ketQua: PhanTuHien[] = []
  for (const id of gocIds) {
    const muc = cay.mucTheoId.get(id)
    if (muc) {
      if (hien.has(id)) ketQua.push({ loai: 'muc', muc })
      continue
    }
    const nut = cay.nutTheoId.get(id)
    if (!nut) continue
    const con = dungCayHien(cay, nut.con, hien)
    if (con.length > 0) ketQua.push({ loai: 'nhom', nhom: { nut, con } })
  }
  return ketQua
}

/**
 * Số đếm tiến độ của mọi mục học trong một nút, không phụ thuộc bộ lọc (đề xuất 3.3). Như demTienDo của trang bài
 * nhưng nhận danh sách mục đã tra sẵn để không lọc lại cả cây cho mỗi nút.
 */
export function demTrongNut(
  cacMuc: readonly MucHoc[],
  trangThaiCua: (id: string) => TrangThaiHoc,
): SoTienDo {
  const s: SoTienDo = { xong: 0, dangHoc: 0, boQua: 0, tong: 0 }
  for (const m of cacMuc) {
    s.tong += 1
    const tt = trangThaiCua(m.id)
    if (tt === 'da-xong') s.xong += 1
    else if (tt === 'dang-hoc') s.dangHoc += 1
    else if (tt === 'bo-qua') s.boQua += 1
  }
  return s
}

/** Mục học của từng nút không phải mục học (phần, lĩnh vực, nhóm), tính một lần cho cả cây. */
export function mucTheoNut(cay: Cay): ReadonlyMap<string, MucHoc[]> {
  const bang = new Map<string, MucHoc[]>()
  for (const nut of cay.nutTheoId.values()) {
    if (!cay.mucTheoId.has(nut.id)) bang.set(nut.id, mucHocCua(cay, nut.id))
  }
  return bang
}
