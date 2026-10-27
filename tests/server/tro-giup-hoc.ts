// Tiện ích test API phase 3 (4 bước, thẻ, đồng hồ): app thật trên DB + thư mục tạm, cây thật của app; đổi múi
// giờ của tiến trình trong lúc chạy (Node đọc lại process.env.TZ) để thử ngày lịch ở cả Asia/Ho_Chi_Minh và
// America/Los_Angeles trong cùng một file test.
import fs from 'node:fs'
import path from 'node:path'
import request from 'supertest'
import { datLech } from '../../shared/clock.ts'
import { taoKhoa } from '../../shared/noi-dung/index.ts'
import { layCay, type MucHoc } from '../../shared/roadmap/index.ts'
import { taoApp } from '../../server/app.ts'
import { docCauHinh } from '../../server/cau-hinh.ts'
import { moDb, type Db } from '../../server/db/index.ts'
import { nhanTepCoSanDongBo } from '../../server/noi-dung/quet.ts'
import { taoSaoLuu, type SaoLuu } from '../../server/sao-luu.ts'
import { HOST, SO_MUC_HOC_GIA, taoThuMucTam, type ThuMucTam } from './tro-giup.ts'

export const cay = layCay()
export const ID_LA = 'khong-co-trong-cay-xyz'

export function mucSlug(slug: string): MucHoc {
  const m = cay.mucTheoSlug.get(slug)
  if (!m) throw new Error(`Không có mục "${slug}"`)
  return m
}

export interface MoiTruongHoc {
  tam: ThuMucTam
  db: Db
  saoLuu: SaoLuu
  app: ReturnType<typeof taoApp>
  get(url: string): request.Test
  post(url: string, body?: unknown): request.Test
  put(url: string, body?: unknown): request.Test
  del(url: string): request.Test
  /** Mở lại DB từ file (như tắt / mở server) và dựng app mới */
  moLai(): Promise<void>
  dong(): Promise<void>
}

export async function taoMoiTruongHoc(): Promise<MoiTruongHoc> {
  datLech(0)
  const tam = taoThuMucTam()
  const tepDb = path.join(tam.dataDir, 'hoc.db')
  const cauHinh = docCauHinh({ DATA_DIR: tam.dataDir, NOI_DUNG_DIR: tam.noiDungDir })
  const dung = async () => {
    const db = await moDb(tepDb)
    const saoLuu = taoSaoLuu({ db, dataDir: tam.dataDir, noiDungDir: tam.noiDungDir })
    return { db, saoLuu, app: taoApp({ cauHinh, db, saoLuu, soMucHoc: SO_MUC_HOC_GIA }) }
  }
  const mt = { tam, ...(await dung()) } as MoiTruongHoc
  const gui = (r: request.Test, body: unknown) =>
    body === undefined ? r.set('Host', HOST) : r.set('Host', HOST).send(body as object)
  mt.get = (url) => request(mt.app).get(url).set('Host', HOST)
  mt.post = (url, body) => gui(request(mt.app).post(url), body)
  mt.put = (url, body) => gui(request(mt.app).put(url), body)
  mt.del = (url) => request(mt.app).delete(url).set('Host', HOST)
  mt.moLai = async () => {
    await mt.saoLuu.choXong()
    mt.db.close()
    Object.assign(mt, await dung())
  }
  mt.dong = async () => {
    await mt.saoLuu.choXong()
    mt.db.close()
    tam.xoa()
    datLech(0)
  }
  return mt
}

/** Chạy fn với múi giờ tiến trình = tz (Node áp dụng ngay khi gán process.env.TZ), rồi trả lại múi giờ cũ. */
export async function trongMuiGio<T>(tz: string, fn: () => T | Promise<T>): Promise<T> {
  const cu = process.env.TZ
  process.env.TZ = tz
  try {
    return await fn()
  } finally {
    if (cu === undefined) delete process.env.TZ
    else process.env.TZ = cu
  }
}

export const MUI_GIO_THU = ['Asia/Ho_Chi_Minh', 'America/Los_Angeles'] as const

/** Số dòng của một bảng. */
export function dem(db: Db, bang: string, where = ''): number {
  return (db.prepare(`SELECT count(*) AS n FROM ${bang} ${where}`).get() as { n: number }).n
}

export interface BaiHoc {
  /** Câu Tự kiểm tra (khối "Tự kiểm tra", mỗi câu "- H: … | Đ: …") */
  cauHoi?: readonly string[]
  /** Tiêu chí tự kiểm (khối "Thực hành trên dự án thật", chỉ Chủ đề) */
  tieuChi?: readonly string[]
  /** Dòng "Checklist chất lượng" (chỉ Tài liệu) */
  checklist?: readonly string[]
  /** Frontmatter hỏng → lỗi đọc file (F26) */
  loiFrontmatter?: boolean
}

/** File bài tối giản của mục: frontmatter đúng mẫu + khối Thực hành / Tự kiểm tra theo quy ước 1.5. */
export function vietBai(muc: MucHoc, bai: BaiHoc): string {
  const dong = [
    '---',
    `loai: ${bai.loiFrontmatter ? '[hỏng' : muc.mau}`,
    'trang_thai_noi_dung: ban-nhap',
    'nguon: ai',
    '---',
    '',
  ]
  if (bai.tieuChi?.length) {
    dong.push('## Thực hành trên dự án thật', '', '### Đề bài', '', '[Đề bài]', '')
    dong.push('### Đầu ra', '', '[Đầu ra]', '', '### Tiêu chí tự kiểm', '')
    dong.push(...bai.tieuChi.map((t) => `- [ ] ${t}`), '')
  }
  if (bai.checklist?.length) {
    dong.push('## Checklist chất lượng', '', ...bai.checklist.map((t) => `- [ ] ${t}`), '')
  }
  if (bai.cauHoi?.length) {
    dong.push('## Tự kiểm tra', '', ...bai.cauHoi.map((h, i) => `- H: ${h} | Đ: [Đáp án ${i + 1}]`))
    dong.push('')
  }
  return dong.join('\n')
}

/**
 * Ghi file bài vào đường dẫn chuẩn của mục và nhận vào sổ nội dung (như sau Nhập / Quét lại); gọi lại để sửa bài
 * (bản nháp đã nhận bị sửa thì server đọc thẳng bản mới). Trả khoá câu hỏi / tiêu chí (taoKhoa) theo thứ tự.
 */
export function ghiBaiHoc(
  mt: MoiTruongHoc,
  muc: MucHoc,
  bai: BaiHoc,
): { cau: string[]; tc: string[]; cl: string[] } {
  const p = path.join(mt.tam.noiDungDir, muc.duongDanTuongDoi)
  const daCo = fs.existsSync(p)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, vietBai(muc, bai))
  if (!daCo) {
    nhanTepCoSanDongBo(mt.db, mt.tam.noiDungDir, {
      duongDan: muc.duongDanTuongDoi,
      itemId: muc.id,
      vai: 'bai',
    })
  }
  return {
    cau: taoKhoa(bai.cauHoi ?? []),
    tc: taoKhoa(bai.tieuChi ?? []),
    cl: taoKhoa(bai.checklist ?? []),
  }
}
