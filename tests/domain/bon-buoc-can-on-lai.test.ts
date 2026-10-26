// Cờ "Cần ôn lại" (shared/domain/can-on-lai.ts; đề xuất 3.3, bất biến 3): suy ra từ trạng thái học + thẻ đến hạn,
// không lưu. Hạn ôn so theo ngày lịch (YYYY-MM-DD) — chạy ở cả hai múi giờ của test:tz.
import { describe, expect, it } from 'vitest'
import { canOnLai, canOnLaiTrong, denHan, soTheDenHan } from '../../shared/domain/can-on-lai'

const HOM_NAY = '2026-10-22'

describe('thẻ đến hạn', () => {
  it('hạn ôn ≤ hôm nay là đến hạn; ngày mai thì chưa', () => {
    expect(denHan({ hanOn: '2026-10-21' }, HOM_NAY)).toBe(true)
    expect(denHan({ hanOn: '2026-10-22' }, HOM_NAY)).toBe(true)
    expect(denHan({ hanOn: '2026-10-23' }, HOM_NAY)).toBe(false)
    // Qua năm
    expect(denHan({ hanOn: '2026-12-31' }, '2027-01-01')).toBe(true)
    expect(
      soTheDenHan([{ hanOn: '2026-10-01' }, { hanOn: '2026-10-23' }, { hanOn: HOM_NAY }], HOM_NAY),
    ).toBe(2)
  })
})

describe('Cần ôn lại = Đã xong + ≥ 1 thẻ đến hạn', () => {
  it('Đã xong có thẻ đến hạn → bật', () => {
    expect(canOnLai('da-xong', [{ hanOn: '2026-10-23' }, { hanOn: HOM_NAY }], HOM_NAY)).toBe(true)
  })
  it('Đã xong nhưng không thẻ nào đến hạn / không có thẻ → tắt', () => {
    expect(canOnLai('da-xong', [{ hanOn: '2026-10-23' }], HOM_NAY)).toBe(false)
    expect(canOnLai('da-xong', [], HOM_NAY)).toBe(false)
  })
  it('chưa Đã xong thì không bao giờ bật', () => {
    for (const tt of ['chua-hoc', 'dang-hoc', 'bo-qua'] as const) {
      expect(canOnLai(tt, [{ hanOn: '2026-10-01' }], HOM_NAY)).toBe(false)
    }
  })
  it('theo danh sách canOnLai của GET /api/state; thiếu danh sách = tắt', () => {
    expect(canOnLaiTrong({ canOnLai: ['a', 'b'] }, 'b')).toBe(true)
    expect(canOnLaiTrong({ canOnLai: ['a'] }, 'b')).toBe(false)
    expect(canOnLaiTrong({}, 'a')).toBe(false)
    expect(canOnLaiTrong(undefined, 'a')).toBe(false)
  })
})
