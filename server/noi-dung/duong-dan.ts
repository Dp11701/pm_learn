import path from 'node:path'
import type { Cay, MucHoc } from '../../shared/roadmap/index.ts'
import type { VaiTep } from '../du-lieu/so-noi-dung.ts'

// Đường dẫn chuẩn trong thư mục nội dung (§4, đề xuất 1.3, 1.6), tính từ cây lúc chạy:
//  - bai      <phần>/<lĩnh vực>/<slug>.md (không thuộc lĩnh vực: <phần>/<slug>.md) = MucHoc.duongDanTuongDoi;
//  - ban-sua  cùng thư mục, <slug>.ban-sua.md;
//  - tong-quan _tong-quan.md trong thư mục của lĩnh vực / phần.
// Chỉ cần cay.mucTheoId (routes nhận Pick<Cay, 'mucTheoId'>); thư mục phần / lĩnh vực suy từ mục học.

export type CayNoiDung = Pick<Cay, 'mucTheoId'>

export const TEN_TONG_QUAN = '_tong-quan.md'
export const DUOI_BAN_SUA = '.ban-sua.md'

export interface ViTriChuan {
  itemId: string
  vai: VaiTep
}

interface BangDuongDan {
  /** id phần / lĩnh vực → thư mục (tương đối) */
  thuMucNut: Map<string, string>
  /** Thư mục quét nhẹ: '' (gốc) + thư mục mọi phần, lĩnh vực; thứ tự cây */
  thuMucQuet: string[]
  /** đường dẫn chuẩn (chữ thường) → mục + vai */
  viTri: Map<string, ViTriChuan>
}

const dem = new WeakMap<object, BangDuongDan>()

export function thuMucCua(muc: MucHoc): string {
  return path.posix.dirname(muc.duongDanTuongDoi)
}

/** Đường dẫn chuẩn của một mục học theo vai bai / ban-sua. */
export function duongDanCuaMuc(muc: MucHoc, vai: 'bai' | 'ban-sua' = 'bai'): string {
  return vai === 'bai' ? muc.duongDanTuongDoi : `${thuMucCua(muc)}/${muc.slug}${DUOI_BAN_SUA}`
}

export function khoaDuongDan(tuongDoi: string): string {
  return tuongDoi.normalize('NFC').toLowerCase()
}

function dung(cay: CayNoiDung): BangDuongDan {
  const thuMucNut = new Map<string, string>()
  const thuMucQuet: string[] = ['']
  const viTri = new Map<string, ViTriChuan>()
  const themThuMuc = (id: string, dir: string) => {
    if (thuMucNut.has(id)) return
    thuMucNut.set(id, dir)
    thuMucQuet.push(dir)
    viTri.set(khoaDuongDan(`${dir}/${TEN_TONG_QUAN}`), { itemId: id, vai: 'tong-quan' })
  }
  for (const muc of cay.mucTheoId.values()) {
    themThuMuc(muc.phan.id, muc.phan.slug)
    if (muc.linhVuc) themThuMuc(muc.linhVuc.id, `${muc.phan.slug}/${muc.linhVuc.slug}`)
    viTri.set(khoaDuongDan(duongDanCuaMuc(muc, 'bai')), { itemId: muc.id, vai: 'bai' })
    viTri.set(khoaDuongDan(duongDanCuaMuc(muc, 'ban-sua')), { itemId: muc.id, vai: 'ban-sua' })
  }
  return { thuMucNut, thuMucQuet, viTri }
}

function bang(cay: CayNoiDung): BangDuongDan {
  let b = dem.get(cay.mucTheoId)
  if (!b) {
    b = dung(cay)
    dem.set(cay.mucTheoId, b)
  }
  return b
}

/** '' + thư mục mọi phần và lĩnh vực (đề xuất 1.6: quét nhẹ không đệ quy sâu hơn). */
export function thuMucQuetNhe(cay: CayNoiDung): readonly string[] {
  return bang(cay).thuMucQuet
}

/** Mục + vai mà đường dẫn này là đường dẫn chuẩn của nó (so không phân biệt hoa thường). */
export function viTriChuanCua(cay: CayNoiDung, tuongDoi: string): ViTriChuan | undefined {
  return bang(cay).viTri.get(khoaDuongDan(tuongDoi))
}

/** Đường dẫn chuẩn của (nút, vai); undefined khi nút không có trong cây hoặc vai không hợp nút. */
export function duongDanChuan(cay: CayNoiDung, itemId: string, vai: VaiTep): string | undefined {
  if (vai === 'bai' || vai === 'ban-sua') {
    const muc = cay.mucTheoId.get(itemId)
    return muc ? duongDanCuaMuc(muc, vai) : undefined
  }
  if (vai === 'tong-quan') {
    const dir = bang(cay).thuMucNut.get(itemId)
    return dir === undefined ? undefined : `${dir}/${TEN_TONG_QUAN}`
  }
  return undefined
}

/** Nút có trong cây và hợp vai (bất biến 8): bai / ban-sua → mục học; tong-quan → phần / lĩnh vực. */
export function hopVai(cay: CayNoiDung, itemId: string, vai: VaiTep): boolean {
  return duongDanChuan(cay, itemId, vai) !== undefined
}
