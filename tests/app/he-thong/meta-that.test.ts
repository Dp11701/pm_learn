// GET /api/meta THẬT (server phase 2b trên thư mục tạm) đi qua hoiMeta của web: lược đồ zod của ket-noi.tsx phải
// giữ `noiDung` (revision nội dung, số file chưa nhận, banner thay cây). Test trang khác giả useKetNoi().meta nên
// không bắt được khi lược đồ bỏ mất trường này (review phase 2b: banner "Có n file chưa nhận" không hiện).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ghiSetting } from '../../../server/db/settings'
import { hoiMeta } from '../../../src/app/ket-noi'
import { baiNhap, muc, taoMoiTruongNhap, type MoiTruongNhap } from '../../fixtures/nhap/moi-truong'

let mt: MoiTruongNhap | undefined

afterEach(async () => {
  vi.unstubAllGlobals()
  await mt?.dong()
  mt = undefined
})

/** fetch của web trả đúng thân JSON server vừa trả. */
function fetchTra(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })),
  )
}

describe('hoiMeta trên phản hồi /api/meta thật', () => {
  it('giữ noiDung: chuaNhan đếm file Claude chép vào, revision nội dung; thayCay null', async () => {
    mt = await taoMoiTruongNhap()
    const pestle = muc('PESTLE')
    const bani = muc('BANI')
    mt.ghi(pestle.duongDanTuongDoi, baiNhap(pestle))
    mt.ghi('bani.md', baiNhap(bani))
    const { body } = await mt.get('/api/meta')
    expect(body.noiDung.chuaNhan).toBe(2)

    fetchTra(body)
    const meta = await hoiMeta()
    expect(meta.noiDung).toEqual({
      revision: body.noiDung.revision,
      chuaNhan: 2,
      thayCay: null,
    })
    expect(meta.soMucHoc).toBe(body.soMucHoc)
  })

  it('giữ banner thay cây (settings.thay_cay) để khung hiện "Cây roadmap vừa cập nhật…"', async () => {
    mt = await taoMoiTruongNhap()
    const banner = { them: 2, bo: 1, doiTen: 3, luc: '2026-10-26T07:00:00.000Z' }
    ghiSetting(mt.db, 'thay_cay', JSON.stringify(banner))
    const { body } = await mt.get('/api/meta')
    fetchTra(body)
    expect((await hoiMeta()).noiDung?.thayCay).toEqual(banner)
  })
})
