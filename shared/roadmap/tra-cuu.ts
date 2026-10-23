import type { Cay, MucHoc, Nut } from './types'

// Tra cứu trên cây đã dựng (hàm thuần).

function layMuc(cay: Cay, id: string): MucHoc {
  const muc = cay.mucTheoId.get(id)
  if (!muc) throw new Error(`Không có mục học id “${id}” trong cây.`)
  return muc
}

/** Tổ tiên của một nút, từ phần xuống cha trực tiếp (breadcrumb). */
export function chuoiCha(cay: Cay, id: string): Nut[] {
  const ketQua: Nut[] = []
  let chaId = cay.nutTheoId.get(id)?.chaId
  while (chaId) {
    const cha = cay.nutTheoId.get(chaId)
    if (!cha) break
    ketQua.unshift(cha)
    chaId = cha.chaId
  }
  return ketQua
}

/** Các nút con trực tiếp, theo thứ tự cây. */
export function conCua(cay: Cay, id: string): Nut[] {
  return (cay.nutTheoId.get(id)?.con ?? []).flatMap((c) => cay.nutTheoId.get(c) ?? [])
}

/** Mục học nằm trong một nút (phần, lĩnh vực, nhóm; mục học thì là chính nó), theo thứ tự cây. */
export function mucHocCua(cay: Cay, id: string): MucHoc[] {
  return cay.mucHoc.filter(
    (m) => m.id === id || m.phan.id === id || m.linhVuc?.id === id || m.nhom?.id === id,
  )
}

export interface ViTriTrongVung {
  /** Từ 1 */
  thuTu: number
  tong: number
  /** Lĩnh vực của mục; mục không thuộc lĩnh vực thì là phần */
  vung: Nut
  /** Mọi mục học của vùng, theo thứ tự cây (các chấm của dải vị trí) */
  cacMuc: MucHoc[]
}

/** Vị trí của mục trong vùng, vd. "Mục 3/16 · <tên lĩnh vực>" (§6.2, §8.5). */
export function viTriTrongVung(cay: Cay, itemId: string): ViTriTrongVung {
  const muc = layMuc(cay, itemId)
  const vung = muc.linhVuc ?? muc.phan
  const cacMuc = mucHocCua(cay, vung.id)
  return { thuTu: cacMuc.indexOf(muc) + 1, tong: cacMuc.length, vung, cacMuc }
}

/** Bỏ qua những mục mà hàm trả true (vd. mục có trạng thái Bỏ qua). */
export type BoQuaMuc = (muc: MucHoc) => boolean

function timTheoHuong(cay: Cay, itemId: string, buoc: 1 | -1, boQua?: BoQuaMuc) {
  for (let i = layMuc(cay, itemId).index + buoc; i >= 0 && i < cay.soMucHoc; i += buoc) {
    const muc = cay.mucHoc[i]
    if (!boQua?.(muc)) return muc
  }
  return undefined
}

/** Mục trước theo thứ tự cây; không còn thì undefined. */
export function mucTruoc(cay: Cay, itemId: string, boQua?: BoQuaMuc): MucHoc | undefined {
  return timTheoHuong(cay, itemId, -1, boQua)
}

/** Mục tiếp theo theo thứ tự cây; không còn thì undefined. */
export function mucSau(cay: Cay, itemId: string, boQua?: BoQuaMuc): MucHoc | undefined {
  return timTheoHuong(cay, itemId, 1, boQua)
}
