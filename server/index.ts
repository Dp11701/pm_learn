import http from 'node:http'
import path from 'node:path'
import { layCay } from '../shared/roadmap/index.ts'
import { laLenhChinh } from '../scripts/chay-truc-tiep.ts'
import { nowIso } from '../shared/clock.ts'
import { taoApp } from './app.ts'
import { apDungGioMau, docCauHinh, type CauHinh } from './cau-hinh.ts'
import { capNhatSchema, moKetNoi } from './db/index.ts'
import { kiemShaCay } from './cay-sha.ts'
import { taoSaoLuu } from './sao-luu.ts'

// Khởi động API: chỉ nghe 127.0.0.1, cổng cố định (đề xuất 1.1, 1.10).

export interface ServerDangChay {
  server: http.Server
  dong(): Promise<void>
}

export async function batDau(cauHinh: CauHinh = docCauHinh()): Promise<ServerDangChay> {
  apDungGioMau(cauHinh.gioMau)
  // Nạp cây trước: cây lỗi thì dừng ngay (LoiCay), chưa mở DB, chưa ghi cay_sha.
  const { soMucHoc } = layCay()
  const db = moKetNoi(path.join(cauHinh.dataDir, 'hoc.db'))
  const saoLuu = taoSaoLuu({ db, dataDir: cauHinh.dataDir, noiDungDir: cauHinh.noiDungDir })
  try {
    const soMigration = await capNhatSchema(db, {
      truocMigration: () => saoLuu.saoLuuNgay('truoc-migration'),
    })
    if (soMigration > 0) console.log(`Đã cập nhật DB (${soMigration} migration).`)
    if (kiemShaCay(db, cauHinh.tepCay) === 'khac') {
      console.warn(
        'Cây roadmap đã đổi so với lần trước (cay_sha khác). Bước chuyển dữ liệu khi thay cây chưa có ở phiên bản này.',
      )
    }
  } catch (loi) {
    db.close()
    throw loi
  }

  const app = taoApp({ cauHinh, db, saoLuu, soMucHoc })
  const server = http.createServer(app)
  try {
    await new Promise<void>((xong, loi) => {
      server.once('error', loi)
      server.listen({ port: cauHinh.congApi, host: '127.0.0.1', exclusive: true }, xong)
    })
  } catch (loi) {
    db.close()
    if ((loi as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      throw new Error(
        `Cổng ${cauHinh.congApi} đang bận. Tắt tiến trình đang dùng cổng (lsof -i :${cauHinh.congApi}) hoặc đặt CONG_API khác.`,
      )
    }
    throw loi
  }

  const gio = cauHinh.gioMau ? ` · giờ mẫu ${nowIso()}` : ''
  console.log(
    `API Học PM A–Z: http://127.0.0.1:${cauHinh.congApi} · dữ liệu ${cauHinh.dataDir}${gio}`,
  )

  return {
    server,
    async dong() {
      const daDong = new Promise<void>((xong) => server.close(() => xong()))
      server.closeAllConnections()
      await daDong
      await saoLuu.choXong()
      db.close()
    },
  }
}

if (laLenhChinh(import.meta.url)) {
  try {
    const dangChay = await batDau()
    let dangDong = false
    const dong = async () => {
      if (dangDong) return
      dangDong = true
      try {
        await dangChay.dong()
      } finally {
        process.exit(0)
      }
    }
    process.on('SIGINT', dong)
    process.on('SIGTERM', dong)
  } catch (loi) {
    console.error(loi instanceof Error ? loi.message : loi)
    process.exit(1)
  }
}
