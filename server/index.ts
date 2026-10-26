import http from 'node:http'
import path from 'node:path'
import { layCay } from '../shared/roadmap/index.ts'
import { laLenhChinh } from '../scripts/chay-truc-tiep.ts'
import { nowIso } from '../shared/clock.ts'
import { taoApp } from './app.ts'
import { apDungGioMau, docCauHinh, type CauHinh } from './cau-hinh.ts'
import { capNhatSchema, moKetNoi } from './db/index.ts'
import { shaCuaTep } from './cay-sha.ts'
import { donBoDemNhapMoCoi } from './nhap/lo.ts'
import { tiepTucFileOps } from './noi-dung/file-ops.ts'
import { khoCuaDb, layKhoNoiDung, type KhoNoiDung } from './noi-dung/kho-noi-dung.ts'
import { xuLyThayCay } from './noi-dung/thay-cay.ts'
import { taoSaoLuu } from './sao-luu.ts'

// Khởi động API: chỉ nghe 127.0.0.1, cổng cố định (đề xuất 1.1, 1.10).

export interface ServerDangChay {
  server: http.Server
  /** Kho nội dung (khoá nối tiếp mọi thao tác file) — cho test */
  kho: KhoNoiDung
  /** Tắt: ngừng nhận request → chờ hết việc trong khoá của kho (thao tác file đang chạy) → sao lưu → đóng DB */
  dong(): Promise<void>
}

export async function batDau(cauHinh: CauHinh = docCauHinh()): Promise<ServerDangChay> {
  apDungGioMau(cauHinh.gioMau)
  // Nạp cây trước: cây lỗi thì dừng ngay (LoiCay), chưa mở DB, chưa ghi cay_sha.
  const cay = layCay()
  const { soMucHoc } = cay
  const db = moKetNoi(path.join(cauHinh.dataDir, 'hoc.db'))
  const saoLuu = taoSaoLuu({ db, dataDir: cauHinh.dataDir, noiDungDir: cauHinh.noiDungDir })
  let kho: KhoNoiDung
  try {
    const soMigration = await capNhatSchema(db, {
      truocMigration: () => saoLuu.saoLuuNgay('truoc-migration'),
    })
    if (soMigration > 0) console.log(`Đã cập nhật DB (${soMigration} migration).`)
    // Lô nhập nằm trong bộ nhớ nên đã mất: bản tạm chưa sửa của file nhập lỗi thành mồ côi → xoá
    const soBoDem = donBoDemNhapMoCoi(db)
    if (soBoDem > 0) console.log(`Đã xoá ${soBoDem} bản tạm của lô nhập cũ (chưa sửa).`)
    // Nội dung (đề xuất 1.6, 1.3): chạy tiếp file_ops dở dang → xử lý thay file cây → quét nhẹ đầu tiên
    // (DB nâng từ 2a: nhận các file đang ở đúng đường dẫn chuẩn).
    kho = layKhoNoiDung(db, cauHinh.noiDungDir, cay)
    await kho.khoa(async () => {
      const tiep = await tiepTucFileOps(db, cauHinh.noiDungDir)
      if (tiep.xong.length > 0)
        console.log(`Đã chạy tiếp ${tiep.xong.length} thao tác file dở dang.`)
      for (const x of tiep.loi) console.error(`Thao tác file ${x.id} chưa chạy tiếp được:`, x.loi)
      const thay = await xuLyThayCay(db, {
        noiDungDir: cauHinh.noiDungDir,
        cay,
        sha: shaCuaTep(cauHinh.tepCay),
        saoLuuNgay: (lyDo) => saoLuu.saoLuuNgay(lyDo),
      })
      if (thay.ketQua === 'khac' && thay.banner) {
        const { them, bo, doiTen } = thay.banner
        console.log(
          `Cây roadmap đã đổi: +${them} mục, −${bo} mục, ${doiTen} mục đổi tên; chuyển ${thay.soFileChuyen ?? 0} file.`,
        )
      }
    })
    await kho.quetNhe()
  } catch (loi) {
    db.close()
    throw loi
  }

  const app = taoApp({ cauHinh, db, saoLuu, soMucHoc, cay })
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
    kho,
    async dong() {
      const daDong = new Promise<void>((xong) => server.close(() => xong()))
      server.closeAllConnections()
      await daDong
      // Request đã ngắt nhưng việc trong khoá (thao tác file, quét) vẫn chạy: chờ hết hàng đợi rồi mới đóng DB
      for (const k of new Set([kho, khoCuaDb(db) ?? kho])) await k.khoa(async () => {})
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
