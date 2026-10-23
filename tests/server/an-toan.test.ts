import express from 'express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { LoiApi, xuLyLoi } from '../../server/loi.ts'
import { taoMoiTruong, type MoiTruong } from './tro-giup.ts'

let mt: MoiTruong

beforeAll(async () => {
  mt = await taoMoiTruong()
})

afterAll(async () => {
  await mt.dong()
})

describe('Host (chống DNS rebinding)', () => {
  it.each(['127.0.0.1:5321', 'localhost:5321', '127.0.0.1:5320', 'LOCALHOST:5320'])(
    'nhận Host %s',
    async (host) => {
      const res = await mt.get('/api/meta').set('Host', host)
      expect(res.status).toBe(200)
    },
  )

  it.each(['evil.example:5321', 'evil.example', '127.0.0.1:9999', '127.0.0.1', '0.0.0.0:5321'])(
    'từ chối Host %s bằng 403 + JSON tiếng Việt',
    async (host) => {
      const res = await mt.get('/api/meta').set('Host', host)
      expect(res.status).toBe(403)
      expect(res.headers['content-type']).toMatch(/application\/json/)
      expect(res.body).toEqual({ loi: 'Địa chỉ máy chủ (Host) không được phép.' })
    },
  )
})

describe('Origin', () => {
  it('không có Origin (cùng nguồn, GET) thì cho qua', async () => {
    expect((await mt.get('/api/meta')).status).toBe(200)
  })

  it.each([
    'http://127.0.0.1:5320',
    'http://localhost:5320',
    'http://127.0.0.1:5321',
    'http://localhost:5321',
  ])('nhận Origin %s', async (origin) => {
    expect((await mt.get('/api/meta').set('Origin', origin)).status).toBe(200)
  })

  it.each(['http://evil.example', 'null', 'https://127.0.0.1:5320', 'http://127.0.0.1:5322'])(
    'từ chối Origin %s bằng 403',
    async (origin) => {
      const res = await mt.post('/api/meta').set('Origin', origin).send({ a: 1 })
      expect(res.status).toBe(403)
      expect(res.body).toEqual({ loi: 'Trang gửi yêu cầu (Origin) không được phép.' })
    },
  )
})

describe('Header và lỗi', () => {
  it('mọi phản hồi có nosniff, không lộ X-Powered-By', async () => {
    const ds = [
      await mt.get('/api/meta'),
      await mt.get('/api/khong-co'),
      await mt.get('/api/meta').set('Host', 'evil.example'),
      await mt.get('/khong-phai-api'),
    ]
    for (const res of ds) {
      expect(res.headers['x-content-type-options']).toBe('nosniff')
      expect(res.headers['x-powered-by']).toBeUndefined()
    }
  })

  it('API không có → 404 JSON tiếng Việt', async () => {
    const res = await mt.get('/api/khong-co')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ loi: 'Không có API GET /api/khong-co.' })
  })

  it('đường dẫn ngoài /api → 404 JSON', async () => {
    const res = await mt.get('/khong-phai-api')
    expect(res.status).toBe(404)
    expect(res.body.loi).toMatch(/Không tìm thấy/)
  })

  it('body JSON quá 1 MB → 413 tiếng Việt', async () => {
    const lon = JSON.stringify({ text: 'a'.repeat(1024 * 1024 + 10) })
    const res = await mt.post('/api/khong-co').set('Content-Type', 'application/json').send(lon)
    expect(res.status).toBe(413)
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.body).toEqual({ loi: 'Dữ liệu gửi lên quá lớn (tối đa 1 MB).' })
  })

  it('body dưới 1 MB vẫn qua (tới 404 của route)', async () => {
    const vua = JSON.stringify({ text: 'a'.repeat(1000 * 1000) })
    const res = await mt.post('/api/khong-co').set('Content-Type', 'application/json').send(vua)
    expect(res.status).toBe(404)
  })

  it('JSON hỏng → 400 tiếng Việt', async () => {
    const res = await mt.post('/api/khong-co').set('Content-Type', 'application/json').send('{"a":')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ loi: 'Dữ liệu gửi lên không phải JSON hợp lệ.' })
  })
})

describe('xuLyLoi', () => {
  const app = express()
  app.get('/xung-dot', () => {
    throw new LoiApi(409, 'Bài đã đổi ngoài app.')
  })
  app.get('/hong', async () => {
    throw new Error('lỗi bất ngờ')
  })
  app.use(xuLyLoi)

  it('LoiApi → đúng mã và câu', async () => {
    const res = await request(app).get('/xung-dot')
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ loi: 'Bài đã đổi ngoài app.' })
  })

  it('lỗi khác (kể cả async) → 500 JSON tiếng Việt, không lộ chi tiết', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await request(app).get('/hong')
    expect(res.status).toBe(500)
    expect(res.body.loi).toMatch(/^Máy chủ gặp lỗi/)
    expect(JSON.stringify(res.body)).not.toContain('lỗi bất ngờ')
    expect(log).toHaveBeenCalledOnce()
    log.mockRestore()
  })
})
