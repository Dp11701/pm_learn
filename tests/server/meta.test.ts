import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { datLech, layLech, ngayCua, now } from '../../shared/clock.ts'
import { apDungGioMau, docCauHinh, GOC_DU_AN } from '../../server/cau-hinh.ts'
import { tangRevision } from '../../server/db/settings.ts'
import { quaNgay, SO_MUC_HOC_GIA, taoMoiTruong, type MoiTruong } from './tro-giup.ts'

const GIO_MAU = '2026-10-22T21:42:00+07:00'

let mt: MoiTruong

beforeEach(async () => {
  datLech(0)
  mt = await taoMoiTruong()
})

afterEach(async () => {
  await mt.dong()
  datLech(0)
})

describe('GET /api/meta', () => {
  it('trả đúng 5 trường (thêm noiDung ở phase 2b); now và homNay chạy theo GIO_MAU', async () => {
    apDungGioMau(GIO_MAU)
    const res = await mt.get('/api/meta')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(Object.keys(res.body).sort()).toEqual([
      'homNay',
      'noiDung',
      'now',
      'revision',
      'soMucHoc',
    ])
    expect(res.body.revision).toBe(0)
    expect(res.body.soMucHoc).toBe(SO_MUC_HOC_GIA)
    expect(res.body.now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    const lech = Date.parse(res.body.now) - Date.parse('2026-10-22T14:42:00Z')
    expect(lech).toBeGreaterThanOrEqual(0)
    expect(lech).toBeLessThan(5000)
    expect(res.body.homNay).toBe(ngayCua(Date.parse(GIO_MAU)))
    if (process.env.TZ === 'Asia/Ho_Chi_Minh') expect(res.body.homNay).toBe('2026-10-22')
  })

  it('homNay đổi khi đồng hồ qua ngày (datLech)', async () => {
    apDungGioMau('2026-12-31T12:00:00+07:00')
    const truoc = (await mt.get('/api/meta')).body.homNay
    quaNgay(1)
    const sau = (await mt.get('/api/meta')).body.homNay
    expect(truoc).toBe(ngayCua(Date.parse('2026-12-31T12:00:00+07:00')))
    expect(sau).toBe(ngayCua(Date.parse('2027-01-01T12:00:00+07:00')))
  })

  it('revision lấy từ settings, tangRevision tăng dần', async () => {
    expect(tangRevision(mt.db)).toBe(1)
    expect(tangRevision(mt.db)).toBe(2)
    expect((await mt.get('/api/meta')).body.revision).toBe(2)
  })

  it('không cho trình duyệt cache', async () => {
    const res = await mt.get('/api/meta')
    expect(res.headers['cache-control']).toBe('no-store')
  })
})

describe('GIO_MAU và cấu hình', () => {
  it('thời gian trôi tiếp từ GIO_MAU', () => {
    apDungGioMau(GIO_MAU)
    expect(Math.abs(now() - Date.parse(GIO_MAU))).toBeLessThan(1000)
  })

  it('áp lại GIO_MAU không cộng dồn độ lệch', () => {
    apDungGioMau(GIO_MAU)
    const lech = layLech()
    apDungGioMau(GIO_MAU)
    expect(Math.abs(layLech() - lech)).toBeLessThan(1000)
  })

  it('không có GIO_MAU thì giữ giờ thật', () => {
    apDungGioMau(null)
    expect(layLech()).toBe(0)
  })

  it('GIO_MAU sai hoặc thiếu múi giờ → lỗi tiếng Việt', () => {
    expect(() => apDungGioMau('hôm qua')).toThrow(/GIO_MAU không hợp lệ/)
    expect(() => apDungGioMau('2026-10-22T21:42:00')).toThrow(/GIO_MAU không hợp lệ/)
  })

  it('đọc biến môi trường, có mặc định', () => {
    const mac = docCauHinh({})
    expect(mac.congApi).toBe(5321)
    expect(mac.congWeb).toBe(5320)
    expect(mac.dataDir).toBe(path.join(GOC_DU_AN, 'data'))
    expect(mac.noiDungDir).toBe(path.join(GOC_DU_AN, 'noi-dung'))
    expect(mac.gioMau).toBeNull()
    const doi = docCauHinh({
      CONG_API: '5323',
      CONG_WEB: '5322',
      DATA_DIR: '.mau/data',
      GIO_MAU,
    })
    expect(doi.congApi).toBe(5323)
    expect(doi.congWeb).toBe(5322)
    expect(doi.dataDir).toBe(path.join(GOC_DU_AN, '.mau', 'data'))
    expect(doi.gioMau).toBe(GIO_MAU)
    expect(() => docCauHinh({ CONG_API: 'abc' })).toThrow(/CONG_API không hợp lệ/)
  })
})
