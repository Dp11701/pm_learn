// Ví dụ cho gợi ý "Thử tên tiếng Anh hoặc viết tắt, vd. … hoặc …" (frame F25b): lấy từ cây lúc chạy,
// không gõ cứng tên mục. Chọn theo thứ tự cây, viết thường như người dùng gõ.
import { foldVi, type ChiMuc } from '../../../shared/tim-kiem'

export interface ViDuTimKiem {
  /** Tên tiếng Anh: mục học đầu tiên có tên 2 từ chỉ gồm chữ, không chứa viết tắt */
  ten?: string
  /** Viết tắt: ưu tiên viết tắt không đứng đầu tên (vd. trong ngoặc cuối tên), không có thì lấy cái đầu */
  vietTat?: string
}

const HAI_TU = /^\p{L}+ \p{L}+$/u

const boNho = new WeakMap<ChiMuc, ViDuTimKiem>()

export function viDuTimKiem(chiMuc: ChiMuc): ViDuTimKiem {
  const daCo = boNho.get(chiMuc)
  if (daCo) return daCo
  const mucHoc = chiMuc.cacMuc.filter((m) => m.laMucHoc)
  const ten = mucHoc.find((m) => m.vietTat.length === 0 && HAI_TU.test(m.nut.label))
  const cacVietTat = mucHoc.flatMap((m) =>
    m.vietTat.map((v) => {
      const gap = foldVi(v).folded
      return { gap, dauTen: m.ten.folded.startsWith(gap) }
    }),
  )
  const vietTat = (cacVietTat.find((v) => !v.dauTen) ?? cacVietTat[0])?.gap
  const viDu: ViDuTimKiem = {
    ...(ten ? { ten: ten.nut.label.toLocaleLowerCase('en') } : {}),
    ...(vietTat ? { vietTat } : {}),
  }
  boNho.set(chiMuc, viDu)
  return viDu
}
