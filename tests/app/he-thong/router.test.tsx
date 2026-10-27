// @vitest-environment jsdom
// Bảng route (§6.1 routes P0, đề xuất 4.1; phạm vi rút gọn mục 10): mọi route có trang với H1, route chưa làm tới
// hiện C38 "Có ở phase n", slug kiểm theo cây, route lạ → 404 trong khung (D24). Route của phần đã bỏ (trang P1,
// /phan/:slug, trình soạn …/soan, Bản của tôi) không còn: 404 trong khung.
// /hoc/:slug là trang bài thật (phase 2a, vòng 4 bước phase 3): API trạng thái học / bài / trạng thái nội dung /
// dữ liệu học của mục (GET /api/hoc/:id) là máy chủ giả trong bộ nhớ (giaApiBai), không đi mạng.
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { datLech, layLech, now } from '../../../shared/clock'
import { THUC_HANH_TRONG, type DuLieuHoc } from '../../../server/du-lieu/hop-dong-hoc'
import { CAC_TRANG_TINH } from '../../../src/pages/cac-trang'
import { cayMau } from './gia'
import { datMoiTruong, moTrang } from './moi-truong'

vi.mock('../../../shared/roadmap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/roadmap')>()),
  layCay: (await import('./gia')).layCayGia,
}))
vi.mock('../../../src/app/khung/KhungApp', async () => ({
  default: (await import('./gia')).KhungGia,
}))
vi.mock('../../../src/app/phim-tat', async () => ({
  PhimTatProvider: (await import('./gia')).QuaMat,
  useMoBangPhimTat: () => () => {},
  usePhimTat: () => {},
}))
vi.mock('../../../src/components/tim-kiem/TimKiem', async () => ({
  TimKiemProvider: (await import('./gia')).QuaMat,
  useTimKiem: () => ({ mo: () => {} }),
}))

/** Bảng slug cũ của máy chủ giả (GET /api/noi-dung/slug-cu); mỗi test đặt lại rỗng. */
let slugCu: Record<string, string> = {}

/** GET /api/hoc/:id của một mục chưa học gì (hợp đồng server/du-lieu/hop-dong-hoc.ts). */
const HOC_TRONG: DuLieuHoc = {
  revision: 1,
  noiLai: null,
  thucHanh: THUC_HANH_TRONG,
  tuKiemTra: {},
  ghiChu: null,
  the: [],
  banCuaToi: { coHoanThanh: false },
  keHoachThi: { coNgayThi: false },
  daHocGiay: 0,
}

/**
 * Máy chủ giả cho trang bài: GET /api/state (chưa có dữ liệu học), GET /api/bai/:id (mục chưa có file),
 * POST /api/luot-mo/:id, GET /api/noi-dung/trang-thai (chưa mục nào có file), GET /api/noi-dung/slug-cu
 * (`slugCu`), GET /api/hoc/:id (chưa học gì), GET /api/du-an (chưa có dự án). /api/meta và đường dẫn khác đi
 * tiếp vào fetch giả của datMoiTruong.
 */
function giaApiBai() {
  const fetchGoc = globalThis.fetch
  const json = (data: unknown) =>
    new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (method === 'GET' && url === '/api/state') {
        return Promise.resolve(json({ revision: 1, trangThai: {}, luotMo: {} }))
      }
      if (method === 'GET' && url === '/api/noi-dung/trang-thai') return Promise.resolve(json({}))
      if (method === 'GET' && url === '/api/noi-dung/slug-cu') return Promise.resolve(json(slugCu))
      if (method === 'GET' && /^\/api\/hoc\/[^/]+$/.test(url))
        return Promise.resolve(json(HOC_TRONG))
      if (method === 'GET' && url === '/api/du-an') return Promise.resolve(json([]))
      const bai = /^\/api\/bai\/(.+)$/.exec(url)
      if (method === 'GET' && bai) {
        return Promise.resolve(
          json({
            muc: decodeURIComponent(bai[1]),
            trangThaiNoiDung: { loai: 'chua-co' },
            bai: null,
            loiDoc: null,
            canhBaoDuyet: null,
            banHien: null,
            hashFile: null,
          }),
        )
      }
      const luotMo = /^\/api\/luot-mo\/(.+)$/.exec(url)
      if (method === 'POST' && luotMo) {
        return Promise.resolve(
          json({
            revision: 1,
            id: decodeURIComponent(luotMo[1]),
            lanMoCuoi: '2026-10-23T08:00:00.000Z',
          }),
        )
      }
      return fetchGoc(input, init)
    }),
  )
}

/** Các lần gọi fetch (method + đường dẫn), trừ /api/meta. */
function cacLanGoiApi() {
  return vi
    .mocked(fetch)
    .mock.calls.map(([input, init]) => `${init?.method ?? 'GET'} ${String(input)}`)
    .filter((x) => x !== 'GET /api/meta')
}

beforeEach(() => {
  slugCu = {}
  datMoiTruong()
  giaApiBai()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  datLech(0)
})

const h1 = () => screen.getByRole('heading', { level: 1 })
const khung = () => screen.queryByTestId('khung')

describe('GocApp', () => {
  it('gắn provider một lần: vùng toast, hỏi /api/meta, đồng hồ theo giờ server', async () => {
    await moTrang('/')
    expect(screen.getAllByRole('status', { name: 'Thông báo' })).toHaveLength(1)
    expect(fetch).toHaveBeenCalledWith('/api/meta', expect.anything())
    await waitFor(() => expect(layLech()).not.toBe(0))
    expect(Math.abs(now() - Date.parse('2026-10-23T08:00:00.000Z'))).toBeLessThan(5000)
  })
})

describe('route tĩnh chưa làm tới', () => {
  it.each(CAC_TRANG_TINH.map((t) => [`/${t.duongDan}`, t] as const))(
    '%s → H1 + "Có ở phase n" trong khung',
    async (duongDan, trang) => {
      await moTrang(duongDan)
      expect(h1().textContent).toBe(trang.tenTrang)
      expect(h1().id).toBe('tieu-de-trang')
      expect(document.title).toBe(`${trang.tenTrang} · Học PM A–Z`)
      expect(screen.getByText(`Có ở phase ${trang.phase}`)).toBeTruthy()
      expect(screen.getByText(trang.moTa)).toBeTruthy()
      expect(within(khung()!).getByRole('heading', { level: 1 })).toBe(h1())
    },
  )

  it.each([
    ['/', 'Xem lộ trình', '/lo-trinh'],
    ['/lo-trinh', 'Về Tổng quan', '/'],
    ['/on-tap', 'Về Tổng quan', '/'],
    ['/on-tap/phien', 'Về Ôn tập', '/on-tap'],
    ['/linh-vuc/scope-management', 'Về Lộ trình', '/lo-trinh'],
  ])(
    '%s: ô "Có ở phase n" có nút phụ đi tiếp "%s" (D20, §2 quy tắc 4)',
    async (duongDan, nhan, den) => {
      await moTrang(duongDan)
      const o = screen.getByText(/^Có ở phase /).parentElement!.parentElement!
      const nut = within(o).getByRole('link', { name: nhan })
      expect(nut.getAttribute('href')).toBe(den)
    },
  )

  it('mọi route tĩnh đều có đúng một nút đi tiếp trỏ tới route có thật', async () => {
    const coThat = new Set(['/', ...CAC_TRANG_TINH.map((t) => `/${t.duongDan}`)])
    for (const t of CAC_TRANG_TINH) {
      await moTrang(`/${t.duongDan}`)
      const o = screen.getByText(`Có ở phase ${t.phase}`).parentElement!.parentElement!
      const cac = within(o).getAllByRole('link')
      expect(cac).toHaveLength(1)
      expect(coThat.has(cac[0].getAttribute('href')!)).toBe(true)
      cleanup()
    }
  })

  it('chỉ còn route P0 của phạm vi rút gọn (đề xuất mục 10): không có trang P1', () => {
    expect(CAC_TRANG_TINH.map((t) => t.duongDan).sort()).toEqual(
      ['', 'lo-trinh', 'on-tap', 'on-tap/phien'].sort(),
    )
  })
})

describe('trang có slug', () => {
  it('/hoc/:slug: trang bài thật trong khung — H1 tên mục (lang=en), chip loại + chip nội dung, C6, 4 bước', async () => {
    const sc = cayMau.mucTheoSlug.get('scope-creep')!
    await moTrang('/hoc/scope-creep')
    expect(within(khung()!).getByRole('heading', { level: 1 })).toBe(h1())
    expect(h1().textContent).toBe('Scope Creep')
    expect(h1().querySelector('[lang="en"]')?.textContent).toBe('Scope Creep')
    expect(document.title).toBe('Scope Creep · Học PM A–Z')
    const dau = h1().closest('header')!
    expect(within(dau).getByText('Chủ đề')).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Trạng thái học' })).toBeTruthy()
    // Thanh 4 bước là <nav>: bước Ghi nhớ luôn có link tới card Flashcard (phase 3)
    const bonBuoc = screen.getByRole('navigation', { name: 'Bốn bước học' })
    expect(
      within(bonBuoc)
        .getByRole('link', { name: /Ghi nhớ/ })
        .getAttribute('href'),
    ).toBe('#flashcard')
    // Bài tải từ API giả: mục chưa có file → chip "Chưa có nội dung" + card F17
    expect(await screen.findByRole('heading', { name: 'Mục này chưa có nội dung.' })).toBeTruthy()
    expect(within(dau).getByText('Chưa có nội dung')).toBeTruthy()
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Chưa học/ }).getAttribute('aria-checked')).toBe(
        'true',
      ),
    )
    // Không còn ô giữ chỗ phase 1
    expect(screen.queryByText(/^Có ở phase /)).toBeNull()
    await waitFor(() =>
      expect(cacLanGoiApi()).toEqual(
        expect.arrayContaining([
          'GET /api/state',
          `GET /api/bai/${encodeURIComponent(sc.id)}`,
          `POST /api/luot-mo/${encodeURIComponent(sc.id)}`,
          'GET /api/noi-dung/trang-thai',
          `GET /api/hoc/${encodeURIComponent(sc.id)}`,
        ]),
      ),
    )
    // Dữ liệu học tải được: card Flashcard (đích của bước Ghi nhớ) qua trạng thái đang tải, thanh 4 bước không lỗi
    const theFlashcard = document.getElementById('flashcard')!
    expect(await within(theFlashcard).findByText(/^Chưa có thẻ cho mục này\./)).toBeTruthy()
    expect(screen.queryByText(/Lỗi: không đọc được tiến độ bước/)).toBeNull()
  })

  it('/hoc/:slug: chip theo mẫu bài; dòng tên gốc khi tên đã sửa', async () => {
    const chipLoai = () => within(h1().closest('header')!).getByText
    await moTrang('/hoc/risk-register')
    expect(chipLoai()('Tài liệu')).toBeTruthy()
    cleanup()
    await moTrang('/hoc/project-management-professional-pmp')
    expect(chipLoai()('Chứng chỉ')).toBeTruthy()
    cleanup()
    const coTenGoc = cayMau.mucHoc.find((m) => m.labelOriginal)!
    await moTrang(`/hoc/${coTenGoc.slug}`)
    expect(screen.getByText(/Tên gốc trên roadmap:/).textContent).toBe(
      `Tên gốc trên roadmap: ${coTenGoc.labelOriginal}`,
    )
  })

  it.each([
    ['/hoc/scope-creep', 'scope-creep'],
    ['/hoc/project-management-professional-pmp', 'project-management-professional-pmp'],
  ])(
    '%s: luôn có đường đi tiếp (D20, §2 quy tắc 4) — pager Trước/Tiếp tới mục kề trong cây',
    async (duongDan, slug) => {
      await moTrang(duongDan)
      const muc = cayMau.mucTheoSlug.get(slug)!
      const pager = await screen.findByRole('navigation', { name: 'Mục trước và tiếp' })
      const cac = within(pager)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href'))
      const ke = [cayMau.mucHoc[muc.index - 1], cayMau.mucHoc[muc.index + 1]]
        .filter(Boolean)
        .map((m) => `/hoc/${m.slug}`)
      expect(cac).toEqual(ke)
      // Không phải trang chờ "Có ở phase n" (ô C38 trong khối do app tạo của bài thì có, vd. Kế hoạch thi)
      expect(
        screen.queryAllByText(/^Có ở phase /).filter((p) => !p.closest('section[data-khoi]')),
      ).toEqual([])
    },
  )

  it('/linh-vuc/:slug: H1 tên lĩnh vực, chip Lĩnh vực, "Có ở phase 4"', async () => {
    await moTrang('/linh-vuc/scope-management')
    expect(h1().textContent).toBe('Scope Management')
    expect(screen.getByText('Lĩnh vực')).toBeTruthy()
    expect(screen.getByText('Có ở phase 4')).toBeTruthy()
  })

  it.each([
    ['/hoc/scope-crep', 'mục học gõ sai'],
    ['/hoc/scope-management', 'slug lĩnh vực ở route mục học'],
    ['/linh-vuc/scope-creep', 'slug mục học ở route lĩnh vực'],
    ['/linh-vuc/tools', 'slug phần ở route lĩnh vực'],
    ['/hoc/', 'thiếu slug'],
    ['/khong-co-trang-nay', 'route lạ'],
    ['/hoc/scope-creep/khong-co', 'đoạn thừa'],
  ])('%s (%s) → 404 trong khung', async (duongDan) => {
    await moTrang(duongDan)
    // Slug lạ ở /hoc, /linh-vuc: hỏi bảng slug cũ trước (không có) rồi mới 404.
    await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy trang này.' })
    expect(document.title).toBe('Không tìm thấy trang · Học PM A–Z')
    expect(within(khung()!).getByRole('heading', { level: 1 })).toBe(h1())
    expect(screen.getByRole('link', { name: 'Về Tổng quan' }).getAttribute('href')).toBe('/')
  })

  it('404 gợi ý mục gần nhất cho đường dẫn gõ sai', async () => {
    await moTrang('/hoc/scope-crep')
    const goiY = await screen.findByText(/Có phải bạn muốn mở/)
    expect(goiY.textContent).toBe('Có phải bạn muốn mở Scope Creep?')
    expect(within(goiY).getByRole('link', { name: 'Scope Creep' }).getAttribute('href')).toBe(
      '/hoc/scope-creep',
    )
  })
})

describe('/noi-dung (trang thật từ phase 2b)', () => {
  it('không còn là route "Có ở phase 2b": H1 Nội dung trong khung, tab Nhập', async () => {
    expect(CAC_TRANG_TINH.some((t) => t.duongDan === 'noi-dung')).toBe(false)
    await moTrang('/noi-dung')
    expect(h1().textContent).toBe('Nội dung')
    expect(within(khung()!).getByRole('heading', { level: 1 })).toBe(h1())
    expect(document.title).toBe('Nội dung · Học PM A–Z')
    expect(screen.getByRole('tab', { name: 'Nhập' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByText('Có ở phase 2b')).toBeNull()
  })
})

describe('slug cũ sau khi thay file cây (đề xuất 1.3 bước 2)', () => {
  const sc = cayMau.mucTheoSlug.get('scope-creep')!
  const lv = cayMau.nutTheoSlug.get('scope-management')!

  it('/hoc/<slug cũ> → chuyển (replace) sang slug hiện tại, giữ ?query và #neo; không hiện 404 trước', async () => {
    slugCu = { 'scope-creep-cu': sc.id }
    const { router } = await moTrang('/hoc/scope-creep-cu?xem=1#tu-kiem-tra')
    expect(screen.queryByText('Không tìm thấy trang này.')).toBeNull()
    await waitFor(() => expect(router.state.location.pathname).toBe('/hoc/scope-creep'))
    expect(router.state.location.search).toBe('?xem=1')
    expect(router.state.location.hash).toBe('#tu-kiem-tra')
    expect(router.state.historyAction).toBe('REPLACE')
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Scope Creep')
    expect(cacLanGoiApi()).toContain('GET /api/noi-dung/slug-cu')
  })

  it('/linh-vuc/<slug cũ> → lĩnh vực hiện tại; slug cũ của nút khác loại → 404', async () => {
    slugCu = { 'quan-ly-pham-vi-cu': lv.id, 'scope-creep-cu': sc.id }
    const { router } = await moTrang('/linh-vuc/quan-ly-pham-vi-cu')
    await waitFor(() => expect(router.state.location.pathname).toBe('/linh-vuc/scope-management'))
    cleanup()
    await moTrang('/linh-vuc/scope-creep-cu')
    await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy trang này.' })
  })

  it('GET /api/noi-dung/slug-cu lỗi → 404 như thường', async () => {
    const fetchGia = vi.mocked(fetch)
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
        String(input) === '/api/noi-dung/slug-cu'
          ? Promise.resolve(new Response('{"loi":"hỏng"}', { status: 500 }))
          : fetchGia(input, init),
      ),
    )
    await moTrang('/hoc/scope-creep-cu')
    await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy trang này.' })
  })
})

describe('route của phần đã bỏ (đề xuất mục 10) → 404 trong khung', () => {
  it.each([
    ['/thong-ke', 'Thống kê'],
    ['/ho-so', 'Bộ hồ sơ dự án'],
    ['/chung-chi', 'Chứng chỉ'],
    ['/thuat-ngu', 'Thuật ngữ'],
    ['/ghi-chu', 'Ghi chú'],
    ['/cai-dat', 'Cài đặt'],
    ['/lo-trinh-goi-y', 'Lộ trình gợi ý'],
    ['/chao-mung', 'Thiết lập lần đầu'],
    ['/phan/tools', 'trang Phần'],
    ['/hoc/risk-register/ban-cua-toi/1', 'Bản của tôi'],
    ['/hoc/scope-creep/soan', 'trình soạn bài'],
    ['/linh-vuc/scope-management/soan', 'trình soạn tổng quan lĩnh vực'],
    ['/phan/tools/soan', 'trình soạn tổng quan phần'],
  ])('%s (%s) → 404 trong khung, không còn trang chờ "Có ở phase n"', async (duongDan) => {
    await moTrang(duongDan)
    expect(within(khung()!).getByRole('heading', { level: 1 }).textContent).toBe(
      'Không tìm thấy trang này.',
    )
    expect(screen.queryByText(/^Có ở phase /)).toBeNull()
    expect(screen.getByRole('link', { name: 'Về Tổng quan' }).getAttribute('href')).toBe('/')
  })

  it('/hoc/<slug>/soan: 404 gợi ý mở bài của mục', async () => {
    await moTrang('/hoc/scope-creep/soan')
    const goiY = await screen.findByText(/Có phải bạn muốn mở/)
    expect(within(goiY).getByRole('link', { name: 'Scope Creep' }).getAttribute('href')).toBe(
      '/hoc/scope-creep',
    )
  })
})
