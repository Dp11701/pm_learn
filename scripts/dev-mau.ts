// npm run dev:mau -- --kich-ban=<mac-dinh|f12|loi-file|trong> (đề xuất mục 7).
// Dựng lại .mau/data (DB seed từ fixtures/mau/seed.ts) và .mau/noi-dung (bản chép fixtures/mau/noi-dung) rồi
// chạy web 5322 + API 5323 như `npm run dev`, đồng hồ ảo GIO_MAU. Không bao giờ chạm data/ và noi-dung/ thật.
// Thêm --chi-chuan-bi để chỉ dựng thư mục, không chạy server.

import { spawn } from 'node:child_process'
import path from 'node:path'
import { GOC_DU_AN } from '../server/cau-hinh.ts'
import {
  CAC_KICH_BAN,
  MO_TA_KICH_BAN,
  chuanBiKichBan,
  laKichBan,
  type KichBan,
  type ThuMucMau,
} from '../fixtures/mau/kich-ban.ts'
import { GIO_MAU, MUI_GIO_MAU } from '../fixtures/mau/so-lieu.ts'
import { laLenhChinh } from './chay-truc-tiep.ts'

export const CONG_WEB_MAU = 5322
export const CONG_API_MAU = 5323

export interface ThamSoDevMau {
  kichBan: KichBan
  chiChuanBi: boolean
  troGiup: boolean
}

const DS_KICH_BAN = CAC_KICH_BAN.join(' | ')

/** Đọc tham số dòng lệnh (sau `--`). Kịch bản lạ → lỗi. */
export function docThamSo(argv: readonly string[]): ThamSoDevMau {
  const kq: ThamSoDevMau = { kichBan: 'mac-dinh', chiChuanBi: false, troGiup: false }
  for (let i = 0; i < argv.length; i++) {
    const thamSo = argv[i]
    let giaTri: string | undefined
    if (thamSo.startsWith('--kich-ban=')) giaTri = thamSo.slice('--kich-ban='.length)
    else if (thamSo === '--kich-ban') giaTri = argv[++i] ?? ''
    else if (thamSo === '--chi-chuan-bi') kq.chiChuanBi = true
    else if (thamSo === '--help' || thamSo === '-h') kq.troGiup = true
    else throw new Error(`Tham số lạ: ${thamSo}. Dùng --kich-ban=<${DS_KICH_BAN}>.`)
    if (giaTri !== undefined) {
      if (!laKichBan(giaTri)) {
        throw new Error(`Kịch bản "${giaTri}" không có. Chọn một trong: ${DS_KICH_BAN}.`)
      }
      kq.kichBan = giaTri
    }
  }
  return kq
}

/** Môi trường cho vite + server: luôn ghi đè DATA_DIR / NOI_DUNG_DIR / cổng bằng giá trị của bộ mẫu. */
export function moiTruongCon(
  thuMuc: ThuMucMau,
  env: Record<string, string | undefined> = process.env,
): Record<string, string | undefined> {
  const bin = path.join(GOC_DU_AN, 'node_modules', '.bin')
  return {
    ...env,
    DATA_DIR: thuMuc.dataDir,
    NOI_DUNG_DIR: thuMuc.noiDungDir,
    CONG_WEB: String(CONG_WEB_MAU),
    CONG_API: String(CONG_API_MAU),
    GIO_MAU,
    TZ: MUI_GIO_MAU,
    PATH: [bin, env.PATH].filter(Boolean).join(path.delimiter),
  }
}

function inTroGiup(): void {
  console.log(
    [
      'npm run dev:mau -- --kich-ban=<tên> [--chi-chuan-bi]',
      ...CAC_KICH_BAN.map((k) => `  ${k.padEnd(9)} ${MO_TA_KICH_BAN[k]}`),
      `Web http://127.0.0.1:${CONG_WEB_MAU} · API ${CONG_API_MAU} · giờ mẫu ${GIO_MAU} · dữ liệu trong .mau/`,
    ].join('\n'),
  )
}

async function chay(argv: readonly string[]): Promise<number> {
  const thamSo = docThamSo(argv)
  if (thamSo.troGiup) {
    inTroGiup()
    return 0
  }
  // Ngày lịch của bộ mẫu theo giờ Việt Nam (GIO_MAU +07:00): seed và server cùng múi giờ này.
  process.env.TZ = MUI_GIO_MAU
  const kq = await chuanBiKichBan(thamSo.kichBan, { env: process.env })
  const tomTat = kq.tomTat
    ? ` · ${kq.tomTat.trangThai.done} Đã xong, ${kq.tomTat.trangThai.learning} Đang học, ${kq.tomTat.trangThai.skip} Bỏ qua, ${kq.tomTat.banChup} bản chụp duyệt`
    : ''
  console.log(`[dev:mau] Kịch bản ${kq.kichBan}: ${kq.soFile} file bài${tomTat}`)
  console.log(`[dev:mau] DATA_DIR=${kq.dataDir}`)
  console.log(`[dev:mau] NOI_DUNG_DIR=${kq.noiDungDir}`)
  if (thamSo.chiChuanBi) return 0

  console.log(`[dev:mau] Mở http://127.0.0.1:${CONG_WEB_MAU} · giờ mẫu ${GIO_MAU}`)
  const con = spawn(
    path.join(GOC_DU_AN, 'node_modules', '.bin', 'concurrently'),
    ['-k', '-n', 'web,api', '-c', 'blue,magenta', 'vite', 'tsx watch server/index.ts'],
    { cwd: GOC_DU_AN, env: moiTruongCon(kq, process.env), stdio: 'inherit' },
  )
  const chuyenTin = (tin: NodeJS.Signals) => () => con.kill(tin)
  process.on('SIGINT', chuyenTin('SIGINT'))
  process.on('SIGTERM', chuyenTin('SIGTERM'))
  return await new Promise<number>((xong) => {
    con.on('error', (loi) => {
      console.error(`[dev:mau] Không chạy được concurrently: ${loi.message}`)
      xong(1)
    })
    con.on('exit', (ma) => xong(ma ?? 1))
  })
}

if (laLenhChinh(import.meta.url)) {
  try {
    process.exitCode = await chay(process.argv.slice(2))
  } catch (loi) {
    console.error(`[dev:mau] ${loi instanceof Error ? loi.message : String(loi)}`)
    process.exitCode = 1
  }
}
