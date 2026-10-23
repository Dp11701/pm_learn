import cayJson from '../../docs/roadmap-tree.json'
import cauHinhJson from './cau-hinh-cay.json'
import { dungCay } from './dung-cay'
import type { Cay } from './types'

export type * from './types'
export { LoiCay } from './loi'
export { taoSlug, ganSlug, type NutCanSlug } from './slug'
export { dungCay } from './dung-cay'
export {
  chuoiCha,
  conCua,
  mucHocCua,
  viTriTrongVung,
  mucTruoc,
  mucSau,
  type ViTriTrongVung,
  type BoQuaMuc,
} from './tra-cuu'

let cayCuaApp: Cay | undefined

/**
 * Cây của app, dựng từ docs/roadmap-tree.json + cau-hinh-cay.json ở lần gọi đầu rồi giữ lại.
 * Lỗi → LoiCay (không giữ lại, gọi lại là dựng lại), để UI hiện "Không đọc được cây roadmap".
 */
export function layCay(): Cay {
  cayCuaApp ??= dungCay(cayJson, cauHinhJson)
  return cayCuaApp
}

/**
 * Cây của app cho chỗ chỉ đọc thuộc tính (vd. cay.soMucHoc). Dựng ở lần đọc đầu chứ không lúc import,
 * nên cây lỗi chỉ ném LoiCay ở chỗ dùng. Cần bắt lỗi để hiện trang lỗi cây thì gọi layCay().
 */
export const cay: Cay = new Proxy({} as Cay, {
  get: (_dich, khoa) => Reflect.get(layCay(), khoa),
  has: (_dich, khoa) => Reflect.has(layCay(), khoa),
})
