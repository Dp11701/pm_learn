// Ví dụ của gợi ý "Thử tên tiếng Anh hoặc viết tắt, vd. … hoặc …" (F25b): lấy từ cây lúc chạy, không gõ
// cứng; cây thiếu loại ví dụ nào thì bỏ loại đó.
import { describe, expect, it } from 'vitest'
import { viDuTimKiem } from '../../../src/components/tim-kiem/vi-du'
import { layCay } from '../../../shared/roadmap'
import { taoChiMuc, timKiem, type ChiMuc } from '../../../shared/tim-kiem'

const chiMuc = taoChiMuc(layCay())

describe('viDuTimKiem', () => {
  it('cây thật: tên 2 từ đầu tiên không viết tắt, viết tắt đầu tiên không đứng đầu tên', () => {
    expect(viDuTimKiem(chiMuc)).toEqual({ ten: 'iterative approach', vietTat: 'ccb' })
  })

  it('gõ ví dụ thì mục đó đứng đầu kết quả (viết tắt khớp bậc viết tắt)', () => {
    const { ten, vietTat } = viDuTimKiem(chiMuc)
    expect(timKiem(chiMuc, ten!).mucHoc[0]?.truong).toBe('ten')
    const kq = timKiem(chiMuc, vietTat!).mucHoc[0]
    expect(kq?.truong).toBe('vietTat')
    expect(kq?.bac).toBe(0)
  })

  it('nhớ theo chỉ mục (cùng đối tượng)', () => {
    expect(viDuTimKiem(chiMuc)).toBe(viDuTimKiem(chiMuc))
  })

  it('mọi viết tắt đều đứng đầu tên: lấy viết tắt đầu tiên', () => {
    const cm: ChiMuc = {
      cacMuc: chiMuc.cacMuc.filter((m) =>
        m.vietTat.every((v) => m.ten.folded.startsWith(v.toLowerCase())),
      ),
    }
    const dau = cm.cacMuc.find((m) => m.laMucHoc && m.vietTat.length > 0)
    expect(viDuTimKiem(cm).vietTat).toBe(dau?.vietTat[0].toLowerCase())
  })

  it('không có viết tắt / không có tên 2 từ / không có mục học: bỏ ví dụ tương ứng', () => {
    expect(viDuTimKiem({ cacMuc: chiMuc.cacMuc.filter((m) => m.vietTat.length === 0) })).toEqual({
      ten: 'iterative approach',
    })
    expect(
      viDuTimKiem({
        cacMuc: chiMuc.cacMuc.filter((m) => m.vietTat.length > 0 || m.nut.label.includes('-')),
      }),
    ).toEqual({ vietTat: 'ccb' })
    expect(viDuTimKiem({ cacMuc: chiMuc.cacMuc.filter((m) => !m.laMucHoc) })).toEqual({})
  })
})
