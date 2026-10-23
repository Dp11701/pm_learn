// shared/clock.ts: không mock gì toàn cục, chỉ dời giờ bằng datLech.
// Chạy ở cả Asia/Ho_Chi_Minh và America/Los_Angeles (npm run test:tz).
import { afterEach, describe, expect, it } from 'vitest'
import { datLech, homNay, layLech, ngayCua, now, nowIso } from '../../shared/clock'
import { congNgay } from '../../shared/lich'

const MS_GIO = 3_600_000

// Nửa đêm theo giờ máy của một ngày: Date.UTC cộng độ lệch múi giờ của chính lúc đó.
function nuaDem(y: number, m: number, d: number): number {
  const lech = new Date(y, m - 1, d).getTimezoneOffset() * 60_000
  return Date.UTC(y, m - 1, d) + lech
}

// Dời đồng hồ app tới thời điểm `ms`.
function doiToi(ms: number): void {
  datLech(ms - Date.now())
}

afterEach(() => datLech(0))

describe('now, datLech, layLech', () => {
  it('mặc định bám giờ máy', () => {
    expect(layLech()).toBe(0)
    expect(Math.abs(now() - Date.now())).toBeLessThan(1000)
  })

  it('cộng độ lệch', () => {
    datLech(86_400_000)
    expect(layLech()).toBe(86_400_000)
    expect(Math.abs(now() - Date.now() - 86_400_000)).toBeLessThan(1000)
  })

  it('nowIso là ISO UTC của now()', () => {
    doiToi(Date.UTC(2026, 9, 22, 5, 0, 0))
    expect(nowIso().slice(0, 16)).toBe('2026-10-22T05:00')
    expect(nowIso().endsWith('Z')).toBe(true)
  })
})

describe('ngayCua quanh nửa đêm theo giờ máy', () => {
  it('nửa đêm dựng từ Date.UTC khớp giờ máy', () => {
    expect(nuaDem(2026, 10, 22)).toBe(new Date(2026, 9, 22).getTime())
  })

  it('đổi ngày đúng lúc nửa đêm', () => {
    const t = nuaDem(2026, 10, 22)
    expect(ngayCua(t)).toBe('2026-10-22')
    expect(ngayCua(t - 1)).toBe('2026-10-21')
    expect(ngayCua(nuaDem(2026, 10, 23) - 1)).toBe('2026-10-22')
  })

  it('ngày DST bắt đầu (Los Angeles: 23 giờ) vẫn đúng ngày', () => {
    const dau = nuaDem(2027, 3, 14)
    const sau = nuaDem(2027, 3, 15)
    expect(ngayCua(dau)).toBe('2027-03-14')
    expect(ngayCua(sau - 1)).toBe('2027-03-14')
    expect(ngayCua(sau)).toBe('2027-03-15')
    expect([23 * MS_GIO, 24 * MS_GIO]).toContain(sau - dau)
  })

  it('qua năm', () => {
    const t = nuaDem(2027, 1, 1)
    expect(ngayCua(t - 1)).toBe('2026-12-31')
    expect(ngayCua(t)).toBe('2027-01-01')
  })
})

describe('homNay', () => {
  it('theo giờ app sau khi dời', () => {
    doiToi(nuaDem(2026, 10, 22) + 12 * MS_GIO)
    expect(homNay()).toBe('2026-10-22')
    doiToi(nuaDem(2026, 10, 23) - 60_000)
    expect(homNay()).toBe('2026-10-22')
    doiToi(nuaDem(2026, 10, 23) + 60_000)
    expect(homNay()).toBe('2026-10-23')
  })

  it('23:30 ngày 07/03/2027 + 8 ngày = 15/03/2027 (qua DST ở Los Angeles)', () => {
    doiToi(nuaDem(2027, 3, 7) + 23.5 * MS_GIO)
    expect(homNay()).toBe('2027-03-07')
    expect(congNgay(homNay(), 8)).toBe('2027-03-15')
  })
})
