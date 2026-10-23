import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import request from 'supertest'
import { datLech, layLech, now } from '../../shared/clock.ts'
import { taoApp } from '../../server/app.ts'
import { docCauHinh, type CauHinh } from '../../server/cau-hinh.ts'
import { moDb, type Db } from '../../server/db/index.ts'
import { taoSaoLuu, type SaoLuu } from '../../server/sao-luu.ts'

export const HOST = '127.0.0.1:5321'
export const SO_MUC_HOC_GIA = 7

export interface ThuMucTam {
  goc: string
  dataDir: string
  noiDungDir: string
  xoa(): void
}

export function taoThuMucTam(): ThuMucTam {
  const goc = fs.mkdtempSync(path.join(os.tmpdir(), 'hoc-pm-server-'))
  return {
    goc,
    dataDir: path.join(goc, 'data'),
    noiDungDir: path.join(goc, 'noi-dung'),
    xoa: () => fs.rmSync(goc, { recursive: true, force: true }),
  }
}

/** Đặt đồng hồ app về một thời điểm (ISO; không có múi giờ = giờ địa phương). */
export function datGio(iso: string): void {
  datLech(Date.parse(iso) - (now() - layLech()))
}

export function quaPhut(soPhut: number): void {
  datLech(layLech() + soPhut * 60 * 1000)
}

export function quaNgay(soNgay = 1): void {
  quaPhut(soNgay * 24 * 60)
}

export interface MoiTruong {
  tam: ThuMucTam
  cauHinh: CauHinh
  db: Db
  saoLuu: SaoLuu
  get(url: string): request.Test
  post(url: string): request.Test
  dong(): Promise<void>
}

/** App thật trên DB + thư mục tạm; mọi request mang Host hợp lệ. */
export async function taoMoiTruong(): Promise<MoiTruong> {
  const tam = taoThuMucTam()
  const cauHinh = docCauHinh({ DATA_DIR: tam.dataDir, NOI_DUNG_DIR: tam.noiDungDir })
  const db = await moDb(path.join(tam.dataDir, 'hoc.db'))
  const saoLuu = taoSaoLuu({ db, dataDir: tam.dataDir, noiDungDir: tam.noiDungDir })
  const app = taoApp({ cauHinh, db, saoLuu, soMucHoc: SO_MUC_HOC_GIA })
  return {
    tam,
    cauHinh,
    db,
    saoLuu,
    get: (url) => request(app).get(url).set('Host', HOST),
    post: (url) => request(app).post(url).set('Host', HOST),
    async dong() {
      await saoLuu.choXong()
      db.close()
      tam.xoa()
    },
  }
}

export function dsTen(thuMuc: string): string[] {
  return fs.existsSync(thuMuc) ? fs.readdirSync(thuMuc).sort() : []
}

export function ghiTep(goc: string, tuongDoi: string, noiDung: string): void {
  const duongDan = path.join(goc, tuongDoi)
  fs.mkdirSync(path.dirname(duongDan), { recursive: true })
  fs.writeFileSync(duongDan, noiDung)
}
