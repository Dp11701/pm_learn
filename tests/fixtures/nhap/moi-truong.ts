// Môi trường test của API nhập file .md (tests/server/nhap*.test.ts): app thật trên DB + thư mục nội dung tạm,
// cây đóng băng, lô F22 (15 file giữ chỗ trong tests/fixtures/nhap/f22/).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import request from 'supertest'
import cayJson from '../roadmap-tree.json'
import cauHinhJson from '../../../shared/roadmap/cau-hinh-cay.json'
import { datLech } from '../../../shared/clock.ts'
import { dungCay, type MucHoc } from '../../../shared/roadmap/index.ts'
import { taoApp } from '../../../server/app.ts'
import { docCauHinh } from '../../../server/cau-hinh.ts'
import { moDb, type Db } from '../../../server/db/index.ts'
import { chupBanDuyet } from '../../../server/du-lieu/ban-chup-duyet.ts'
import { layKhoNoiDung, type KhoNoiDung } from '../../../server/noi-dung/kho-noi-dung.ts'
import { nhanTepCoSanDongBo } from '../../../server/noi-dung/quet.ts'
import { taoSaoLuu, type SaoLuu } from '../../../server/sao-luu.ts'
import type { TepGui } from '../../../server/nhap/hop-dong.ts'
import { HOST, taoThuMucTam, type ThuMucTam } from '../../server/tro-giup.ts'

export const cay = dungCay(cayJson, cauHinhJson)

export function muc(label: string): MucHoc {
  const ds = cay.mucHoc.filter((m) => m.label === label)
  if (ds.length !== 1) throw new Error(`Không có đúng một mục "${label}"`)
  return ds[0]
}

export const THU_MUC_F22 = fileURLToPath(new URL('./f22', import.meta.url))

/** Thứ tự file của F22 (đúng như bảng của frame) */
export const TEN_F22 = [
  'pestle.md',
  'quantitative-risk-assessment.md',
  'risk-identification-process.md',
  'risk-and-opportunity-response-strategies.md',
  'contingency-management-reserve-allocation.md',
  'bani.md',
  'cost-baseline.md',
  'gross-profit-margin-gpm.md',
  'purchase-order-invoice.md',
  'capex-opex.md',
  'ebit-ebitda.md',
  'risk-appetite.md',
  'risk-registr.md',
  'scope-creep.md',
  'vuca.md',
] as const

export function loF22(): TepGui[] {
  return TEN_F22.map((ten) => ({
    ten,
    noiDung: fs.readFileSync(path.join(THU_MUC_F22, ten), 'utf8'),
    duongDan: `lo-f22/${ten}`,
  }))
}

/** File bài giữ chỗ tối thiểu (thiếu hầu hết khối ★) */
export function baiNhap(m: MucHoc, them = '', coId = true): string {
  return (
    `---\n${coId ? `id: ${m.id}\n` : ''}loai: ${m.mau}\ntrang_thai_noi_dung: ban-nhap\nnguon: ai\n${them}---\n` +
    `## Tóm tắt\n[Nội dung mẫu — ${m.slug}] …\n`
  )
}

export function baiDaDuyet(
  m: MucHoc,
  ngay = '2026-10-18',
  than = '[Nội dung mẫu — đã duyệt] …',
): string {
  return (
    `---\nid: ${m.id}\nloai: ${m.mau}\ntrang_thai_noi_dung: da-duyet\nngay_duyet: ${ngay}\nnguon: ai\n---\n` +
    `## Tóm tắt\n${than}\n`
  )
}

export interface MoiTruongNhap {
  tam: ThuMucTam
  db: Db
  saoLuu: SaoLuu
  kho: KhoNoiDung
  app: ReturnType<typeof taoApp>
  get(url: string): request.Test
  post(url: string, body?: object): request.Test
  /** Ghi file vào thư mục nội dung (không nhận) */
  ghi(tuongDoi: string, noiDung: string): void
  doc(tuongDoi: string): string | null
  /** Ghi + nhận file ở đường dẫn (mặc định đường dẫn chuẩn) như một bản nháp đã nhận */
  coBanNhap(m: MucHoc, noiDung?: string, tuongDoi?: string): void
  /** Ghi + nhận file da-duyet + chụp bản (mục Đã duyệt) */
  daDuyet(m: MucHoc, noiDung?: string): void
  /** Mọi file .md dưới thư mục nội dung (bỏ .thung-rac), sắp theo tên */
  dsFile(): string[]
  /** Mọi file trong thùng rác */
  dsRac(): string[]
  dong(): Promise<void>
}

function dsDuoi(goc: string, loc: (p: string) => boolean): string[] {
  if (!fs.existsSync(goc)) return []
  return (fs.readdirSync(goc, { recursive: true, encoding: 'utf8' }) as string[])
    .map((p) => p.split(path.sep).join('/'))
    .filter((p) => fs.statSync(path.join(goc, p)).isFile() && loc(p))
    .sort()
}

export async function taoMoiTruongNhap(tuyChon: { saoLuu?: SaoLuu } = {}): Promise<MoiTruongNhap> {
  datLech(0)
  const tam = taoThuMucTam()
  fs.mkdirSync(tam.noiDungDir, { recursive: true })
  const db = await moDb(path.join(tam.dataDir, 'hoc.db'))
  const saoLuu =
    tuyChon.saoLuu ?? taoSaoLuu({ db, dataDir: tam.dataDir, noiDungDir: tam.noiDungDir })
  const cauHinh = docCauHinh({ DATA_DIR: tam.dataDir, NOI_DUNG_DIR: tam.noiDungDir })
  const app = taoApp({ cauHinh, db, saoLuu, soMucHoc: cay.soMucHoc, cay })
  const kho = layKhoNoiDung(db, tam.noiDungDir, cay)
  const ghi = (tuongDoi: string, noiDung: string) => {
    const p = path.join(tam.noiDungDir, tuongDoi)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, noiDung)
  }
  return {
    tam,
    db,
    saoLuu,
    kho,
    app,
    get: (url) => request(app).get(url).set('Host', HOST),
    post: (url, body) => {
      const r = request(app).post(url).set('Host', HOST)
      return body === undefined ? r : r.send(body)
    },
    ghi,
    doc: (tuongDoi) => {
      const p = path.join(tam.noiDungDir, tuongDoi)
      return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null
    },
    coBanNhap(m, noiDung = baiNhap(m), tuongDoi = m.duongDanTuongDoi) {
      ghi(tuongDoi, noiDung)
      nhanTepCoSanDongBo(db, tam.noiDungDir, { duongDan: tuongDoi, itemId: m.id, vai: 'bai' })
    },
    daDuyet(m, noiDung = baiDaDuyet(m)) {
      ghi(m.duongDanTuongDoi, noiDung)
      db.transaction(() => {
        nhanTepCoSanDongBo(db, tam.noiDungDir, {
          duongDan: m.duongDanTuongDoi,
          itemId: m.id,
          vai: 'bai',
        })
        chupBanDuyet(db, { itemId: m.id, noiDung })
      })()
    },
    dsFile: () => dsDuoi(tam.noiDungDir, (p) => !p.startsWith('.thung-rac/') && p.endsWith('.md')),
    dsRac: () => dsDuoi(path.join(tam.noiDungDir, '.thung-rac'), () => true),
    async dong() {
      await saoLuu.choXong()
      db.close()
      tam.xoa()
    },
  }
}
