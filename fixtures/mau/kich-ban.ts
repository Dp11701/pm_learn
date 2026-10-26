// Kịch bản của bộ dữ liệu mẫu (đề xuất mục 7): dựng lại thư mục dữ liệu + thư mục nội dung tạm dưới .mau/
// rồi seed DB. Không bao giờ chạm data/ và noi-dung/ thật: mọi đường dẫn được kiểm (kể cả qua symlink)
// trước khi xoá hay ghi bất cứ thứ gì.

import fs from 'node:fs'
import path from 'node:path'
import { layCay, type Cay } from '../../shared/roadmap/index.ts'
import { GOC_DU_AN } from '../../server/cau-hinh.ts'
import { moDb } from '../../server/db/index.ts'
import { taoBanSuaScopeCreep, taoChangeLogHong } from './noi-dung-mau.ts'
import { seedMau, type TomTatSeed } from './seed.ts'
import { THU_MUC_NOI_DUNG_MAU, dsFileMd } from './tao-noi-dung.ts'

export const CAC_KICH_BAN = ['mac-dinh', 'f12', 'loi-file', 'trong'] as const
export type KichBan = (typeof CAC_KICH_BAN)[number]

export const MO_TA_KICH_BAN: Readonly<Record<KichBan, string>> = {
  'mac-dinh': 'dữ liệu §7 (37 Đã xong · 6 Đang học · 4 Bỏ qua; 41 Đã duyệt · 9 Bản nháp)',
  f12: 'như mac-dinh + scope-creep.ban-sua.md (bản sửa bỏ ## Tự kiểm tra) — so F12',
  'loi-file': 'như mac-dinh, change-log.md hỏng frontmatter ở dòng 3 — so F26',
  trong: 'DB và thư mục nội dung trống — so F05',
}

export function laKichBan(x: string): x is KichBan {
  return (CAC_KICH_BAN as readonly string[]).includes(x)
}

export interface ThuMucMau {
  /** Thư mục gốc của dữ liệu mẫu (mặc định <dự án>/.mau, đã gitignore) */
  gocMau: string
  /** DATA_DIR khi chạy mẫu */
  dataDir: string
  /** NOI_DUNG_DIR khi chạy mẫu: bản chép tạm của fixtures/mau/noi-dung, dựng lại mỗi lần */
  noiDungDir: string
  tepDb: string
}

export function thuMucMau(gocMau: string = path.join(GOC_DU_AN, '.mau')): ThuMucMau {
  const goc = path.resolve(gocMau)
  const dataDir = path.join(goc, 'data')
  return {
    gocMau: goc,
    dataDir,
    noiDungDir: path.join(goc, 'noi-dung'),
    tepDb: path.join(dataDir, 'hoc.db'),
  }
}

/** Thư mục dữ liệu thật không được chạm: <dự án>/data, <dự án>/noi-dung và DATA_DIR / NOI_DUNG_DIR đang đặt. */
export function thuMucCanBaoVe(
  gocDuAn: string = GOC_DU_AN,
  env: Record<string, string | undefined> = {},
): string[] {
  const ds = [path.join(gocDuAn, 'data'), path.join(gocDuAn, 'noi-dung')]
  for (const khoa of ['DATA_DIR', 'NOI_DUNG_DIR']) {
    const giaTri = env[khoa]
    if (giaTri) ds.push(path.resolve(gocDuAn, giaTri))
  }
  return ds.map((x) => path.resolve(x))
}

/** Đường dẫn thật (giải symlink) kể cả khi chưa tồn tại: realpath phần cha đã có rồi nối phần còn lại. */
export function duongDanThat(duongDan: string): string {
  let hienTai = path.resolve(duongDan)
  const conLai: string[] = []
  for (;;) {
    try {
      return path.join(fs.realpathSync(hienTai), ...conLai.reverse())
    } catch {
      const cha = path.dirname(hienTai)
      if (cha === hienTai) return path.resolve(duongDan)
      conLai.push(path.basename(hienTai))
      hienTai = cha
    }
  }
}

/** a nằm trong b hoặc trùng b. */
function nam(a: string, b: string): boolean {
  const tuongDoi = path.relative(b, a)
  return tuongDoi === '' || (!tuongDoi.startsWith('..') && !path.isAbsolute(tuongDoi))
}

/**
 * Dừng nếu thư mục mẫu trùng, nằm trong, hoặc chứa thư mục dữ liệu thật hay chính dự án (so cả đường dẫn
 * khai báo lẫn đường dẫn thật sau khi giải symlink), hoặc không nằm hẳn trong gocMau.
 */
export function kiemAnToan(
  thuMuc: ThuMucMau,
  baoVe: readonly string[],
  gocDuAn: string = GOC_DU_AN,
): void {
  const cam = [...baoVe, gocDuAn].flatMap((x) => [path.resolve(x), duongDanThat(x)])
  const duAn = [path.resolve(gocDuAn), duongDanThat(gocDuAn)]
  for (const goc of [path.resolve(thuMuc.gocMau), duongDanThat(thuMuc.gocMau)]) {
    for (const d of duAn) {
      if (nam(d, goc)) {
        throw new Error(
          `Từ chối dùng ${thuMuc.gocMau} cho dữ liệu mẫu: thư mục này chứa dự án ${d}.`,
        )
      }
    }
  }
  for (const dich of [thuMuc.dataDir, thuMuc.noiDungDir]) {
    for (const d of [path.resolve(dich), duongDanThat(dich)]) {
      for (const c of cam) {
        const laDuAn = duAn.includes(c)
        // Thư mục mẫu được nằm trong dự án (.mau/), nhưng không được chứa dự án hay dữ liệu thật
        if ((!laDuAn && nam(d, c)) || nam(c, d)) {
          throw new Error(
            `Từ chối dùng ${dich} cho dữ liệu mẫu: đụng tới ${c}. Dữ liệu mẫu chỉ được nằm trong thư mục riêng (mặc định .mau/).`,
          )
        }
      }
    }
    const tuongDoi = path.relative(thuMuc.gocMau, dich)
    if (tuongDoi === '' || tuongDoi.startsWith('..') || path.isAbsolute(tuongDoi)) {
      throw new Error(`Từ chối dùng ${dich}: không nằm trong ${thuMuc.gocMau}.`)
    }
  }
}

export interface TuyChonChuanBi {
  gocMau?: string
  /** Gốc dự án để xác định thư mục cần bảo vệ (test dùng dự án giả) */
  gocDuAn?: string
  /** Biến môi trường của người chạy (DATA_DIR / NOI_DUNG_DIR đang đặt cũng được bảo vệ) */
  env?: Record<string, string | undefined>
  /** Thư mục bài mẫu nguồn (mặc định fixtures/mau/noi-dung) */
  nguon?: string
  cay?: Cay
}

export interface KetQuaChuanBi extends ThuMucMau {
  kichBan: KichBan
  soFile: number
  /** null với kịch bản trong */
  tomTat: TomTatSeed | null
}

function chepBaiMau(nguon: string, dich: string): void {
  if (!fs.existsSync(nguon)) {
    throw new Error(
      `Không thấy ${nguon}. Chạy npx tsx fixtures/mau/tao-noi-dung.ts để dựng bài mẫu.`,
    )
  }
  fs.cpSync(nguon, dich, {
    recursive: true,
    filter: (tu) => {
      const ten = path.basename(tu)
      if (tu !== nguon && (ten.startsWith('.') || ten.startsWith('~'))) return false
      const st = fs.lstatSync(tu)
      return st.isDirectory() || (st.isFile() && ten.endsWith('.md'))
    },
  })
}

function ghi(goc: string, tep: { duongDan: string; text: string }): void {
  const dich = path.join(goc, tep.duongDan)
  fs.mkdirSync(path.dirname(dich), { recursive: true })
  fs.writeFileSync(dich, tep.text, 'utf8')
}

/** File đánh dấu thư mục do bộ mẫu tạo: chỉ xoá dataDir / noiDungDir khi có dấu này (hoặc chúng trống). */
export const TEP_DANH_DAU = '.du-lieu-mau'

function coNoiDung(thuMuc: string): boolean {
  return fs.existsSync(thuMuc) && fs.readdirSync(thuMuc).length > 0
}

/** Xoá thư mục dữ liệu + nội dung mẫu (sau khi kiểm an toàn và thấy dấu của bộ mẫu). */
export function xoaThuMucMau(
  thuMuc: ThuMucMau,
  baoVe: readonly string[],
  gocDuAn = GOC_DU_AN,
): void {
  kiemAnToan(thuMuc, baoVe, gocDuAn)
  const coDau = fs.existsSync(path.join(thuMuc.gocMau, TEP_DANH_DAU))
  if (!coDau && (coNoiDung(thuMuc.dataDir) || coNoiDung(thuMuc.noiDungDir))) {
    throw new Error(
      `Từ chối xoá ${thuMuc.dataDir} / ${thuMuc.noiDungDir}: có dữ liệu nhưng không phải do bộ mẫu tạo (thiếu ${TEP_DANH_DAU}).`,
    )
  }
  fs.rmSync(thuMuc.dataDir, { recursive: true, force: true })
  fs.rmSync(thuMuc.noiDungDir, { recursive: true, force: true })
}

/**
 * Dựng lại thư mục của một kịch bản: xoá dữ liệu mẫu cũ, chép bài mẫu, thêm / làm hỏng file theo kịch bản,
 * tạo DB mới (đủ migration) rồi seed. Lần chạy nào cũng ra đúng một trạng thái.
 */
export async function chuanBiKichBan(
  kichBan: KichBan,
  tuyChon: TuyChonChuanBi = {},
): Promise<KetQuaChuanBi> {
  const gocDuAn = tuyChon.gocDuAn ?? GOC_DU_AN
  const thuMuc = thuMucMau(tuyChon.gocMau)
  const baoVe = thuMucCanBaoVe(gocDuAn, tuyChon.env)
  xoaThuMucMau(thuMuc, baoVe, gocDuAn)
  fs.mkdirSync(thuMuc.gocMau, { recursive: true })
  fs.writeFileSync(
    path.join(thuMuc.gocMau, TEP_DANH_DAU),
    'Thư mục dữ liệu mẫu của npm run dev:mau: data/ và noi-dung/ ở đây bị xoá và dựng lại mỗi lần chạy.\n',
  )
  fs.mkdirSync(thuMuc.dataDir, { recursive: true })
  fs.mkdirSync(thuMuc.noiDungDir, { recursive: true })

  const cay = tuyChon.cay ?? layCay()
  if (kichBan !== 'trong') chepBaiMau(tuyChon.nguon ?? THU_MUC_NOI_DUNG_MAU, thuMuc.noiDungDir)
  if (kichBan === 'f12') ghi(thuMuc.noiDungDir, taoBanSuaScopeCreep(cay))
  if (kichBan === 'loi-file') ghi(thuMuc.noiDungDir, taoChangeLogHong(cay))

  const db = await moDb(thuMuc.tepDb)
  let tomTat: TomTatSeed | null = null
  try {
    if (kichBan !== 'trong') tomTat = seedMau({ db, cay, noiDungDir: thuMuc.noiDungDir })
  } finally {
    db.close()
  }
  return { ...thuMuc, kichBan, soFile: dsFileMd(thuMuc.noiDungDir).length, tomTat }
}
