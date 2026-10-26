// Tiện ích test bộ dữ liệu mẫu: dựng kịch bản trong thư mục tạm (không bao giờ dùng .mau/, data/, noi-dung/
// của dự án), đọc file bài theo cây.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { phanTichBai, type KetQuaBai } from '../../shared/noi-dung/index.ts'
import { layCay, type MucHoc } from '../../shared/roadmap/index.ts'
import { chuanBiKichBan, type KetQuaChuanBi, type KichBan } from '../../fixtures/mau/kich-ban.ts'
import { kiemMuiGio } from '../../fixtures/mau/seed.ts'

export const cay = layCay()

/**
 * Bộ mẫu seed theo ngày giờ Việt Nam (kiemMuiGio): ở múi giờ khác, test cần seed được BỎ QUA
 * (describe.skipIf(!laGioMau)) thay vì ném lỗi; `npm test` chạy chúng ở Asia/Ho_Chi_Minh.
 */
export const laGioMau = (() => {
  try {
    kiemMuiGio()
    return true
  } catch {
    return false
  }
})()

export function thuMucTam(tien = 'hoc-pm-mau-'): { goc: string; xoa(): void } {
  const goc = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), tien)))
  return { goc, xoa: () => fs.rmSync(goc, { recursive: true, force: true }) }
}

/** Dựng một kịch bản dưới thư mục tạm; dự án giả để thư mục cần bảo vệ cũng nằm trong thư mục tạm. */
export async function dungKichBan(kichBan: KichBan, goc: string): Promise<KetQuaChuanBi> {
  return chuanBiKichBan(kichBan, {
    gocMau: path.join(goc, '.mau'),
    gocDuAn: path.join(goc, 'du-an'),
  })
}

export function mucSlug(slug: string): MucHoc {
  const muc = cay.mucTheoSlug.get(slug)
  if (!muc) throw new Error(`không có slug ${slug}`)
  return muc
}

export interface BaiTrenDia {
  muc: MucHoc
  text: string
  kq: KetQuaBai
}

/** Đọc file bài của mọi mục học ở đường dẫn chuẩn (mục không có file thì không có trong kết quả). */
export function docBaiTheoCay(noiDungDir: string): BaiTrenDia[] {
  const ds: BaiTrenDia[] = []
  for (const muc of cay.mucHoc) {
    const tep = path.join(noiDungDir, muc.duongDanTuongDoi)
    if (!fs.existsSync(tep)) continue
    const text = fs.readFileSync(tep, 'utf8')
    ds.push({ muc, text, kq: phanTichBai(text, muc) })
  }
  return ds
}
