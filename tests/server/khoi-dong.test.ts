// Khởi động / tắt server (server/index.ts batDau): tắt thì chờ hết việc trong khoá của kho nội dung rồi mới
// đóng DB (review 2b #10); khởi động xoá bản tạm chưa sửa của lô nhập cũ (review 2b #8). Server thật trên DB +
// thư mục nội dung tạm, cổng do hệ điều hành chọn (0), chỉ 127.0.0.1.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { datLech } from '../../shared/clock.ts'
import { docCauHinh, type CauHinh } from '../../server/cau-hinh.ts'
import { moDb } from '../../server/db/index.ts'
import { docBoDem, ghiBoDem, khoaBoDemNhap } from '../../server/du-lieu/bo-dem-soan.ts'
import { batDau } from '../../server/index.ts'
import { taoToken } from '../../server/nhap/lo.ts'
import { taoThuMucTam, type ThuMucTam } from './tro-giup.ts'

let tam: ThuMucTam
let cauHinh: CauHinh

beforeEach(() => {
  datLech(0)
  tam = taoThuMucTam()
  fs.mkdirSync(tam.noiDungDir, { recursive: true })
  cauHinh = {
    ...docCauHinh({ DATA_DIR: tam.dataDir, NOI_DUNG_DIR: tam.noiDungDir }),
    congApi: 0,
  }
})
afterEach(() => {
  tam.xoa()
})

describe('tắt server', () => {
  it('chờ việc đang chạy trong khoá của kho (thao tác file) xong rồi mới đóng DB', async () => {
    const dc = await batDau(cauHinh)
    let xong = false
    const viec = dc.kho.khoa(async () => {
      await new Promise((r) => setTimeout(r, 50))
      xong = true
      return dc.kho.db.prepare('SELECT 1 AS x').get()
    })
    await dc.dong()
    expect(xong).toBe(true)
    await expect(viec).resolves.toEqual({ x: 1 })
    expect(dc.kho.db.open).toBe(false)
  })
})

describe('khởi động', () => {
  it('xoá bản tạm nhap:* chưa sửa của lô cũ (lô mất cùng tiến trình), giữ bản đã sửa', async () => {
    const db = await moDb(path.join(tam.dataDir, 'hoc.db'))
    const luc = Date.parse('2026-10-26T08:00:00Z')
    const token = taoToken(luc)
    const chuaSua = khoaBoDemNhap(token, 0)
    const daSua = khoaBoDemNhap(token, 1)
    const taoLuc = new Date(luc).toISOString()
    ghiBoDem(db, { key: chuaSua, itemId: null, text: 'a', baseHash: null, updatedAt: taoLuc })
    ghiBoDem(db, {
      key: daSua,
      itemId: null,
      text: 'b đã sửa',
      baseHash: null,
      updatedAt: '2026-10-26T08:05:00.000Z',
    })
    db.close()

    const dc = await batDau(cauHinh)
    try {
      expect(docBoDem(dc.kho.db, chuaSua)).toBeUndefined()
      expect(docBoDem(dc.kho.db, daSua)?.text).toBe('b đã sửa')
    } finally {
      await dc.dong()
    }
  })
})
