import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { datLech } from '../../shared/clock.ts'
import { docSetting, ghiSetting } from '../../server/db/settings.ts'
import { GIU_MAC_DINH } from '../../server/sao-luu.ts'
import {
  datGio,
  dsTen,
  ghiTep,
  quaNgay,
  quaPhut,
  taoMoiTruong,
  type MoiTruong,
} from './tro-giup.ts'

let mt: MoiTruong
let thuMuc: string

const tepDb = () => dsTen(thuMuc).filter((t) => t.endsWith('.db'))
const thuMucNd = () => dsTen(thuMuc).filter((t) => t.startsWith('noi-dung-'))

beforeEach(async () => {
  datGio('2026-10-22T12:00:00')
  mt = await taoMoiTruong()
  thuMuc = path.join(mt.tam.dataDir, 'backups')
  ghiTep(mt.tam.noiDungDir, 'phan-a/linh-vuc-b/bai.md', '# bài\n')
  ghiTep(mt.tam.noiDungDir, '_tong-quan.md', 'tổng quan\n')
  ghiTep(mt.tam.noiDungDir, '.thung-rac/2026-10-21/cu.md', 'rác\n')
})

afterEach(async () => {
  vi.restoreAllMocks()
  await mt.dong()
  datLech(0)
})

describe('sao lưu hằng ngày qua /api/meta', () => {
  it('chạy một lần mỗi ngày, ghi ngay_sao_luu', async () => {
    await mt.get('/api/meta')
    await mt.saoLuu.choXong()
    expect(tepDb()).toEqual(['hoc-2026-10-22.db'])
    expect(thuMucNd()).toEqual(['noi-dung-2026-10-22'])
    expect(docSetting(mt.db, 'ngay_sao_luu')).toBe('2026-10-22')

    await mt.get('/api/meta')
    await mt.saoLuu.choXong()
    expect(mt.saoLuu.saoLuuHangNgayNeuCan()).toBeNull()
    expect(tepDb()).toEqual(['hoc-2026-10-22.db'])

    quaNgay(1)
    await mt.get('/api/meta')
    await mt.saoLuu.choXong()
    expect(tepDb()).toEqual(['hoc-2026-10-22.db', 'hoc-2026-10-23.db'])
    expect(thuMucNd()).toEqual(['noi-dung-2026-10-22', 'noi-dung-2026-10-23'])
    expect(docSetting(mt.db, 'ngay_sao_luu')).toBe('2026-10-23')
  })

  it('không chặn phản hồi: meta trả về khi sao lưu còn đang chạy', async () => {
    let moCua = () => {}
    const cua = new Promise<void>((r) => {
      moCua = r
    })
    const goc = mt.db.backup.bind(mt.db)
    mt.db.backup = async (...thamSo) => {
      await cua
      return goc(...thamSo)
    }
    const res = await mt.get('/api/meta')
    expect(res.status).toBe(200)
    expect(mt.saoLuu.dangChay()).toBe(true)
    expect(tepDb()).toEqual([])
    moCua()
    await mt.saoLuu.choXong()
    expect(mt.saoLuu.dangChay()).toBe(false)
    expect(tepDb()).toEqual(['hoc-2026-10-22.db'])
  })

  it('chép nội dung, bỏ .thung-rac; bản DB đọc được', async () => {
    ghiSetting(mt.db, 'muc_tieu_gio_tuan', '6')
    await mt.get('/api/meta')
    await mt.saoLuu.choXong()
    const nd = path.join(thuMuc, 'noi-dung-2026-10-22')
    expect(fs.readFileSync(path.join(nd, 'phan-a/linh-vuc-b/bai.md'), 'utf8')).toBe('# bài\n')
    expect(fs.readFileSync(path.join(nd, '_tong-quan.md'), 'utf8')).toBe('tổng quan\n')
    expect(fs.existsSync(path.join(nd, '.thung-rac'))).toBe(false)
    expect(dsTen(thuMuc).some((t) => t.startsWith('.tam-'))).toBe(false)

    const banSao = new Database(path.join(thuMuc, 'hoc-2026-10-22.db'), { readonly: true })
    try {
      const dong = banSao.prepare("SELECT value FROM settings WHERE key = 'muc_tieu_gio_tuan'")
      expect(dong.get()).toEqual({ value: '6' })
    } finally {
      banSao.close()
    }
  })

  it('không có thư mục nội dung thì vẫn sao lưu DB, không lỗi', async () => {
    fs.rmSync(mt.tam.noiDungDir, { recursive: true })
    await mt.get('/api/meta')
    await mt.saoLuu.choXong()
    expect(tepDb()).toEqual(['hoc-2026-10-22.db'])
    expect(thuMucNd()).toEqual([])
    expect(docSetting(mt.db, 'ngay_sao_luu')).toBe('2026-10-22')
  })

  it(`giữ ${GIU_MAC_DINH} bản mới nhất mỗi loại`, async () => {
    for (let i = 0; i < GIU_MAC_DINH + 2; i++) {
      if (i > 0) quaNgay(1)
      const p = mt.saoLuu.saoLuuHangNgayNeuCan()
      expect(p).not.toBeNull()
      await p
    }
    const db = tepDb()
    const nd = thuMucNd()
    expect(db).toHaveLength(GIU_MAC_DINH)
    expect(nd).toHaveLength(GIU_MAC_DINH)
    expect(db[0]).toBe('hoc-2026-10-24.db')
    expect(db.at(-1)).toBe('hoc-2026-11-06.db')
    expect(nd[0]).toBe('noi-dung-2026-10-24')
  })

  it('bản sao lưu theo lý do giữ riêng, không đẩy mất bản hằng ngày', async () => {
    for (let i = 0; i < 3; i++) {
      if (i > 0) quaNgay(1)
      await mt.saoLuu.saoLuuHangNgayNeuCan()
    }
    for (let i = 0; i < GIU_MAC_DINH + 3; i++) await mt.saoLuu.saoLuuNgay('nhap-json')
    const db = tepDb()
    expect(db.filter((t) => /^hoc-\d{4}-\d{2}-\d{2}\.db$/.test(t))).toHaveLength(3)
    expect(db.filter((t) => t.includes('-nhap-json'))).toHaveLength(GIU_MAC_DINH)
  })

  it('lỗi thì không ghi ngày, thử lại sau 10 phút', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const goc = mt.db.backup.bind(mt.db)
    let lanGoi = 0
    mt.db.backup = async (...thamSo) => {
      lanGoi++
      if (lanGoi === 1) throw new Error('đĩa đầy')
      return goc(...thamSo)
    }
    await mt.saoLuu.saoLuuHangNgayNeuCan()
    expect(console.error).toHaveBeenCalledOnce()
    expect(docSetting(mt.db, 'ngay_sao_luu')).toBeNull()
    expect(tepDb()).toEqual([])
    expect(mt.saoLuu.saoLuuHangNgayNeuCan()).toBeNull()

    quaPhut(11)
    await mt.saoLuu.saoLuuHangNgayNeuCan()
    expect(tepDb()).toEqual(['hoc-2026-10-22.db'])
    expect(docSetting(mt.db, 'ngay_sao_luu')).toBe('2026-10-22')
  })
})

describe('sao lưu theo lý do', () => {
  it('thêm hậu tố, không ghi đè bản cùng ngày, không đổi ngay_sao_luu', async () => {
    await mt.saoLuu.saoLuuNgay('nhap-json')
    await mt.saoLuu.saoLuuNgay('nhap-json')
    await mt.saoLuu.saoLuuNgay('truoc-migration')
    expect(tepDb()).toEqual([
      'hoc-2026-10-22-nhap-json-2.db',
      'hoc-2026-10-22-nhap-json.db',
      'hoc-2026-10-22-truoc-migration.db',
    ])
    expect(thuMucNd()).toEqual([
      'noi-dung-2026-10-22-nhap-json',
      'noi-dung-2026-10-22-nhap-json-2',
      'noi-dung-2026-10-22-truoc-migration',
    ])
    expect(docSetting(mt.db, 'ngay_sao_luu')).toBeNull()
  })
})

describe('không bao giờ hai lượt sao lưu cùng lúc', () => {
  it('nhiều /api/meta song song chỉ tạo một bản', async () => {
    await Promise.all([mt.get('/api/meta'), mt.get('/api/meta'), mt.get('/api/meta')])
    await mt.saoLuu.choXong()
    expect(tepDb()).toEqual(['hoc-2026-10-22.db'])
  })

  it('gọi hằng ngày hai lần liền trả cùng một lượt', async () => {
    const a = mt.saoLuu.saoLuuHangNgayNeuCan()
    const b = mt.saoLuu.saoLuuHangNgayNeuCan()
    expect(a).not.toBeNull()
    expect(b).toBe(a)
    await a
  })

  it('các lượt xếp hàng: lượt sau chỉ bắt đầu khi lượt trước xong hẳn', async () => {
    const goc = mt.db.backup.bind(mt.db)
    const daXongLucBatDau: number[] = []
    let dangChay = 0
    let toiDa = 0
    mt.db.backup = async (...thamSo) => {
      daXongLucBatDau.push(thuMucNd().length)
      dangChay++
      toiDa = Math.max(toiDa, dangChay)
      try {
        await new Promise((r) => setTimeout(r, 20))
        return await goc(...thamSo)
      } finally {
        dangChay--
      }
    }
    const ds = [
      mt.saoLuu.saoLuuNgay('nhap-json'),
      mt.saoLuu.saoLuuHangNgayNeuCan(),
      mt.saoLuu.saoLuuNgay('dat-lai'),
      mt.saoLuu.saoLuuNgay('thay-cay'),
    ]
    expect(mt.saoLuu.dangChay()).toBe(true)
    await Promise.all(ds)
    expect(toiDa).toBe(1)
    expect(daXongLucBatDau).toEqual([0, 1, 2, 3])
    expect(tepDb()).toHaveLength(4)
    expect(thuMucNd()).toHaveLength(4)
  })
})
