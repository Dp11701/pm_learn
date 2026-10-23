// Test build (đề xuất mục 6): bundle production không chứa trang dev và chữ mẫu.
// Chạy: npx tsx scripts/kiem-bundle.ts            → chạy `vite build` vào dist/ rồi quét
//       npx tsx scripts/kiem-bundle.ts --khong-build → chỉ quét dist/ đang có
// Báo lỗi khi một file text trong dist/ chứa:
//   - "/_dev" (route gallery, so frame phải bị loại khỏi bản build);
//   - một cụm trong tests/fixtures/cam-go-cung.txt;
//   - một chuỗi mẫu xuất từ module trong fixtures/mau/ (trừ fixtures/mau/noi-dung/).
// Tên, id nút không kiểm ở đây: cây roadmap được bundle hợp lệ. Chuỗi mẫu trùng hệt chuỗi của cây,
// của JSON hoặc chuỗi literal trong mã production (src/ trừ src/dev/, shared/) được coi là chữ UI.
// Module trong fixtures/mau/ được import động nên không được có tác dụng phụ khi import.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, type Dirent } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  cacChuoi,
  danhSachFile,
  docCumCam,
  FILE_CAY,
  FILE_CUM_CAM,
  giaiThucThe,
  GOC,
} from './kiem-go-cung'
import { laLenhChinh } from './chay-truc-tiep'

export interface FileBundle {
  ten: string
  noiDung: string
}

export interface ChuoiMau {
  chuoi: string
  /** file và khoá trong fixtures/mau, để biết chuỗi đến từ đâu */
  nguon: string
}

export interface ViPhamBundle {
  file: string
  loai: 'dev' | 'cum-cam' | 'chu-mau'
  chiTiet: string
  nguCanh: string
}

const DUOI_TEXT = /\.(?:[cm]?js|css|html?|json|svg|txt|map|webmanifest|xml)$/i
const DUOI_MODULE = /\.(?:[cm]?ts|tsx|[cm]?js|json)$/
const THU_MUC_MAU = 'fixtures/mau'
const BO_QUA_MAU = 'fixtures/mau/noi-dung'
const MA_DEV = '/_dev'

/** Giải escape \uXXXX, \u{…}, \xNN mà trình nén có thể sinh cho chữ ngoài ASCII. */
export function giaiEscapeJs(s: string): string {
  return s.replace(
    /\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g,
    (toanBo: string, a?: string, b?: string, c?: string) => {
      const so = parseInt(a ?? b ?? c ?? '', 16)
      return Number.isFinite(so) && so <= 0x10ffff ? String.fromCodePoint(so) : toanBo
    },
  )
}

function chuan(s: string): string {
  return giaiEscapeJs(s).normalize('NFC').replace(/\s+/g, ' ').toLowerCase()
}

/** Mọi chuỗi trong một giá trị xuất (object, mảng lồng nhau), kèm đường dẫn khoá. */
export function thuChuoi(giaTri: unknown, nguon: string): ChuoiMau[] {
  const ketQua: ChuoiMau[] = []
  const daQua = new WeakSet<object>()
  const di = (x: unknown, khoa: string) => {
    if (typeof x === 'string') ketQua.push({ chuoi: x, nguon: khoa })
    else if (typeof x === 'object' && x !== null && !daQua.has(x)) {
      daQua.add(x)
      for (const [k, v] of Object.entries(x)) di(v, `${khoa}.${k}`)
    }
  }
  di(giaTri, nguon)
  return ketQua
}

export function gonChuoi(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim()
}

/** Tập chuỗi (đã gọn) trong một giá trị bất kỳ. */
export function tapChuoi(giaTri: unknown): Set<string> {
  return new Set(thuChuoi(giaTri, '').map((c) => gonChuoi(c.chuoi)))
}

/**
 * Chuỗi được phép có trong bundle: mọi chuỗi của cây roadmap, của file JSON và chuỗi literal trong
 * mã production (src/ trừ src/dev/, shared/). Chuỗi mẫu trùng hệt một chuỗi này là chữ UI hoặc
 * dữ liệu cây (vd. tên khối "Tóm tắt"), không phải chữ mẫu bị lọt.
 */
export function chuoiHopLe(goc: string): Set<string> {
  const hopLe = tapChuoi(JSON.parse(readFileSync(path.join(goc, FILE_CAY), 'utf8')))
  const json = (t: string) => t.endsWith('.json')
  for (const f of [...duyet(goc, 'src', json, 'src/dev'), ...duyet(goc, 'shared', json)]) {
    for (const c of tapChuoi(JSON.parse(readFileSync(path.join(goc, f), 'utf8')))) hopLe.add(c)
  }
  for (const f of danhSachFile(goc)) {
    if (f.startsWith('server/') || f.startsWith('src/dev/')) continue
    for (const c of cacChuoi(readFileSync(path.join(goc, f), 'utf8'), f).ds) {
      hopLe.add(gonChuoi(giaiThucThe(c.chuoi)))
    }
  }
  return hopLe
}

/**
 * Giữ chuỗi mẫu đủ đặc trưng để so với bundle: ít nhất 2 từ, có chữ, không thuộc tập hợp lệ.
 * Chuỗi 1 từ (mã trạng thái, slug, phím…) dễ trùng mã thư viện nên bỏ; chữ mẫu 1 từ cần cấm thì
 * ghi vào cam-go-cung.txt.
 */
export function locChuoiMau(ds: ChuoiMau[], hopLe: Set<string>): ChuoiMau[] {
  const daCo = new Set<string>()
  return ds.filter(({ chuoi }) => {
    const s = gonChuoi(chuoi)
    if (s.split(' ').length < 2 || !/\p{L}/u.test(s) || hopLe.has(s) || daCo.has(s)) return false
    daCo.add(s)
    return true
  })
}

function nguCanh(noiDung: string, viTri: number, doDai: number): string {
  const tu = Math.max(0, viTri - 40)
  return noiDung
    .slice(tu, viTri + doDai + 40)
    .replace(/\s+/g, ' ')
    .trim()
}

/** Quét các file bundle; trả mọi vi phạm (thuần, không đọc đĩa). */
export function quetBundle(
  files: FileBundle[],
  cumCam: string[],
  chuoiMau: ChuoiMau[],
): ViPhamBundle[] {
  const canTim = [
    ...cumCam.map((c) => ({ loai: 'cum-cam' as const, goc: c, chiTiet: `chứa cụm cấm “${c}”` })),
    ...chuoiMau.map((m) => ({
      loai: 'chu-mau' as const,
      goc: m.chuoi,
      chiTiet: `chứa chữ mẫu “${m.chuoi}” (${m.nguon})`,
    })),
  ]
    .map((x) => ({ ...x, chuan: chuan(x.goc).trim() }))
    .filter((x) => x.chuan !== '')
  const ketQua: ViPhamBundle[] = []
  for (const f of files) {
    // JSON có thể viết "\/" thay cho "/".
    const tho = f.noiDung.replaceAll('\\/', '/')
    const viTriDev = tho.indexOf(MA_DEV)
    if (viTriDev >= 0) {
      ketQua.push({
        file: f.ten,
        loai: 'dev',
        chiTiet: `chứa “${MA_DEV}”`,
        nguCanh: nguCanh(tho, viTriDev, MA_DEV.length),
      })
    }
    const text = chuan(f.noiDung)
    for (const x of canTim) {
      const i = text.indexOf(x.chuan)
      if (i >= 0) {
        ketQua.push({
          file: f.ten,
          loai: x.loai,
          chiTiet: x.chiTiet,
          nguCanh: nguCanh(text, i, x.chuan.length),
        })
      }
    }
  }
  return ketQua
}

function duyet(goc: string, tuongDoi: string, loc: (ten: string) => boolean, boQua = ''): string[] {
  const ketQua: string[] = []
  let muc: Dirent[]
  try {
    muc = readdirSync(path.join(goc, tuongDoi), { withFileTypes: true })
  } catch {
    return ketQua
  }
  for (const m of muc) {
    const con = `${tuongDoi}/${m.name}`
    if (m.isDirectory()) {
      if (con !== boQua && m.name !== 'node_modules') ketQua.push(...duyet(goc, con, loc, boQua))
    } else if (m.isFile() && loc(m.name)) {
      ketQua.push(con)
    }
  }
  return ketQua.sort()
}

/** Nạp chuỗi xuất từ mọi module dưới fixtures/mau/ (trừ noi-dung/). Chưa có module nào → rỗng. */
export async function napChuoiMau(goc: string): Promise<ChuoiMau[]> {
  const files = duyet(
    goc,
    THU_MUC_MAU,
    (ten) => DUOI_MODULE.test(ten) && !/\.d\.[cm]?ts$|\.test\./.test(ten),
    BO_QUA_MAU,
  )
  const ketQua: ChuoiMau[] = []
  for (const f of files) {
    const duongDan = path.join(goc, f)
    const mod: unknown = f.endsWith('.json')
      ? JSON.parse(readFileSync(duongDan, 'utf8'))
      : await import(pathToFileURL(duongDan).href)
    ketQua.push(...thuChuoi(mod, f))
  }
  return ketQua
}

export function docBundle(goc: string, thuMuc = 'dist'): FileBundle[] {
  return duyet(goc, thuMuc, (ten) => DUOI_TEXT.test(ten)).map((ten) => ({
    ten,
    noiDung: readFileSync(path.join(goc, ten), 'utf8'),
  }))
}

export async function chay(goc: string, build: boolean): Promise<number> {
  if (build) {
    execFileSync(path.join(goc, 'node_modules', '.bin', 'vite'), ['build'], {
      cwd: goc,
      stdio: 'inherit',
    })
  } else if (!existsSync(path.join(goc, 'dist'))) {
    console.error('Chưa có dist/. Chạy `npm run build` trước, hoặc bỏ --khong-build.')
    return 1
  }
  const files = docBundle(goc)
  if (files.length === 0) {
    console.error('dist/ không có file text nào để quét.')
    return 1
  }
  const cumCam = docCumCam(readFileSync(path.join(goc, FILE_CUM_CAM), 'utf8'))
  const tatCaMau = await napChuoiMau(goc)
  const chuoiMau = locChuoiMau(tatCaMau, chuoiHopLe(goc))
  const viPham = quetBundle(files, cumCam, chuoiMau)

  if (viPham.length > 0) {
    for (const v of viPham) console.error(`${v.file}  ${v.chiTiet}\n    …${v.nguCanh}…`)
    console.error(`\nKiểm bundle: ${viPham.length} vi phạm.`)
    return 1
  }
  console.log(
    `Kiểm bundle: OK · ${files.length} file trong dist/ · không có “${MA_DEV}” · ` +
      `${cumCam.length} cụm cấm · ${chuoiMau.length}/${tatCaMau.length} chuỗi mẫu từ ${THU_MUC_MAU}/`,
  )
  return 0
}

if (laLenhChinh(import.meta.url)) {
  process.exitCode = await chay(GOC, !process.argv.includes('--khong-build'))
}
