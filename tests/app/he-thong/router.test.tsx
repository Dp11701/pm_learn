// @vitest-environment jsdom
// Bảng route (§6.1 routes P0 + P1, đề xuất 4.1): mọi route có trang với H1, route chưa làm tới hiện C38
// "Có ở phase n", slug kiểm theo cây, route lạ → 404 trong khung (D24), /hoc/:slug/soan ngoài khung (D27).
// /hoc/:slug là trang bài thật (phase 2a): API dữ liệu học / bài / trạng thái nội dung là máy chủ giả trong bộ
// nhớ (giaApiBai), không đi mạng.
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { datLech, layLech, now } from '../../../shared/clock'
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

/**
 * Máy chủ giả cho trang bài: GET /api/state (chưa có dữ liệu học), GET /api/bai/:id (mục chưa có file),
 * POST /api/luot-mo/:id, GET /api/noi-dung/trang-thai (chưa mục nào có file). /api/meta và đường dẫn khác
 * đi tiếp vào fetch giả của datMoiTruong.
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
    ['/cai-dat', 'Về Tổng quan', '/'],
    ['/on-tap/phien', 'Về Ôn tập', '/on-tap'],
    ['/lo-trinh-goi-y', 'Về Lộ trình', '/lo-trinh'],
    ['/chao-mung', 'Về Tổng quan', '/'],
    ['/linh-vuc/scope-management', 'Về Lộ trình', '/lo-trinh'],
    ['/phan/tools', 'Về Lộ trình', '/lo-trinh'],
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

  it('đủ route P0 + P1 của §6.1', () => {
    expect(CAC_TRANG_TINH.map((t) => t.duongDan).sort()).toEqual(
      [
        '',
        'lo-trinh',
        'noi-dung',
        'on-tap',
        'on-tap/phien',
        'lo-trinh-goi-y',
        'thong-ke',
        'ho-so',
        'chung-chi',
        'chao-mung',
        'thuat-ngu',
        'ghi-chu',
        'cai-dat',
      ].sort(),
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
    expect(screen.getByRole('group', { name: 'Bốn bước học' })).toBeTruthy()
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
        ]),
      ),
    )
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
      expect(screen.queryByText(/^Có ở phase /)).toBeNull()
    },
  )

  it('/linh-vuc/:slug: H1 tên lĩnh vực, chip Lĩnh vực, "Có ở phase 4"', async () => {
    await moTrang('/linh-vuc/scope-management')
    expect(h1().textContent).toBe('Scope Management')
    expect(screen.getByText('Lĩnh vực')).toBeTruthy()
    expect(screen.getByText('Có ở phase 4')).toBeTruthy()
  })

  it('/phan/:slug: H1 "Phần <tên>", "Có ở phase 10"', async () => {
    await moTrang('/phan/tools')
    expect(h1().textContent).toBe('Phần Tools')
    expect(document.title).toBe('Phần Tools · Học PM A–Z')
    expect(screen.getByText('Có ở phase 10')).toBeTruthy()
  })

  it.each([
    ['/hoc/scope-crep', 'mục học gõ sai'],
    ['/hoc/scope-management', 'slug lĩnh vực ở route mục học'],
    ['/linh-vuc/scope-creep', 'slug mục học ở route lĩnh vực'],
    ['/linh-vuc/tools', 'slug phần ở route lĩnh vực'],
    ['/phan/scope-management', 'slug lĩnh vực ở route phần'],
    ['/hoc/', 'thiếu slug'],
    ['/khong-co-trang-nay', 'route lạ'],
    ['/hoc/scope-creep/khong-co', 'đoạn thừa'],
  ])('%s (%s) → 404 trong khung', async (duongDan) => {
    await moTrang(duongDan)
    expect(h1().textContent).toBe('Không tìm thấy trang này.')
    expect(document.title).toBe('Không tìm thấy trang · Học PM A–Z')
    expect(within(khung()!).getByRole('heading', { level: 1 })).toBe(h1())
    expect(screen.getByRole('link', { name: 'Về Tổng quan' }).getAttribute('href')).toBe('/')
  })

  it('404 gợi ý mục gần nhất cho đường dẫn gõ sai', async () => {
    await moTrang('/hoc/scope-crep')
    const goiY = screen.getByText(/Có phải bạn muốn mở/)
    expect(goiY.textContent).toBe('Có phải bạn muốn mở Scope Creep?')
    expect(within(goiY).getByRole('link', { name: 'Scope Creep' }).getAttribute('href')).toBe(
      '/hoc/scope-creep',
    )
  })
})

describe('/hoc/:slug/ban-cua-toi/:id (Bản của tôi, phase 7c)', () => {
  const taiLieu = cayMau.mucTheoSlug.get('risk-register')!

  it('bài Tài liệu: trong khung, H1 "Bản của tôi", tên bài, "Có ở phase 7c", nút "Về bài"', async () => {
    await moTrang('/hoc/risk-register/ban-cua-toi/1')
    expect(within(khung()!).getByRole('heading', { level: 1 })).toBe(h1())
    expect(h1().textContent).toBe('Bản của tôi')
    expect(document.title).toBe(`Bản của tôi · ${taiLieu.label} · Học PM A–Z`)
    expect(screen.getByText(taiLieu.label).getAttribute('lang')).toBe('en')
    expect(screen.getByText('Có ở phase 7c')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Về bài' }).getAttribute('href')).toBe(
      '/hoc/risk-register',
    )
  })

  it.each([
    ['/hoc/scope-creep/ban-cua-toi/1', 'mục Chủ đề không có Bản của tôi'],
    ['/hoc/project-management-professional-pmp/ban-cua-toi/1', 'mục Chứng chỉ'],
    ['/hoc/risk-registr/ban-cua-toi/1', 'slug gõ sai'],
    ['/hoc/risk-register/ban-cua-toi', 'thiếu id'],
    ['/hoc/risk-register/ban-cua-toi/1/thua', 'đoạn thừa'],
  ])('%s (%s) → 404 trong khung', async (duongDan) => {
    await moTrang(duongDan)
    expect(within(khung()!).getByRole('heading', { level: 1 }).textContent).toBe(
      'Không tìm thấy trang này.',
    )
  })
})

describe('/hoc/:slug/soan (D27)', () => {
  it('mục có thật: màn tập trung ngoài khung, "‹ Về bài", H1 "Soạn bài", "Có ở phase 7b"', async () => {
    await moTrang('/hoc/scope-creep/soan')
    expect(khung()).toBeNull()
    expect(h1().textContent).toBe('Soạn bài')
    expect(document.title).toBe('Soạn bài · Scope Creep · Học PM A–Z')
    expect(screen.getByRole('link', { name: 'Về bài' }).getAttribute('href')).toBe(
      '/hoc/scope-creep',
    )
    expect(screen.getByRole('main').id).toBe('noi-dung-chinh')
    expect(screen.getByText('Có ở phase 7b')).toBeTruthy()
  })

  it('slug sai → 404 trong khung, có gợi ý', async () => {
    await moTrang('/hoc/scope-crep/soan')
    expect(within(khung()!).getByRole('heading', { level: 1 }).textContent).toBe(
      'Không tìm thấy trang này.',
    )
    expect(screen.getByRole('link', { name: 'Scope Creep' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Về bài' })).toBeNull()
  })

  it('link bỏ qua dùng chung với khung: đầu tiên, focus <main>, không thêm lượt điều hướng', async () => {
    const { router, container } = await moTrang('/hoc/scope-creep/soan')
    const dau = container.querySelector<HTMLAnchorElement>('a[href], button')!
    expect(dau.textContent).toBe('Chuyển tới nội dung chính')
    expect(dau.getAttribute('href')).toBe('#noi-dung-chinh')
    const truoc = router.state.location
    fireEvent.click(dau)
    expect(document.activeElement).toBe(screen.getByRole('main'))
    expect(router.state.location).toBe(truoc)
  })

  it('lần tải đầu không kéo focus; Lùi về trình soạn (mục lịch sử đầu, key "default") thì focus H1', async () => {
    const { router } = await moTrang('/hoc/scope-creep/soan')
    expect(document.activeElement).toBe(document.body)
    await act(() => router.navigate('/hoc/scope-creep'))
    expect(h1().textContent).toBe('Scope Creep')
    await act(() => router.navigate(-1))
    expect(router.state.location.key).toBe('default')
    expect(h1().textContent).toBe('Soạn bài')
    expect(document.activeElement).toBe(h1())
  })
})

describe('soạn tổng quan lĩnh vực / phần (đề xuất 4.1 "Route thêm", D27)', () => {
  it('/linh-vuc/:slug/soan: màn tập trung ngoài khung, "‹ Về lĩnh vực", H1 "Soạn tổng quan"', async () => {
    await moTrang('/linh-vuc/scope-management/soan')
    expect(khung()).toBeNull()
    expect(h1().textContent).toBe('Soạn tổng quan')
    expect(document.title).toBe('Soạn tổng quan · Scope Management · Học PM A–Z')
    expect(screen.getByText('Scope Management').getAttribute('lang')).toBe('en')
    expect(screen.getByRole('link', { name: 'Về lĩnh vực' }).getAttribute('href')).toBe(
      '/linh-vuc/scope-management',
    )
    expect(screen.getByRole('main').id).toBe('noi-dung-chinh')
    expect(screen.getByText('Có ở phase 7b')).toBeTruthy()
  })

  it('/phan/:slug/soan: "‹ Về phần", tên "Phần <tên>"', async () => {
    await moTrang('/phan/tools/soan')
    expect(khung()).toBeNull()
    expect(h1().textContent).toBe('Soạn tổng quan')
    expect(document.title).toBe('Soạn tổng quan · Phần Tools · Học PM A–Z')
    expect(screen.getByRole('link', { name: 'Về phần' }).getAttribute('href')).toBe('/phan/tools')
    expect(screen.getByText('Có ở phase 7b')).toBeTruthy()
  })

  it.each([
    ['/linh-vuc/scope-creep/soan', 'slug mục học'],
    ['/linh-vuc/tools/soan', 'slug phần ở route lĩnh vực'],
    ['/phan/scope-management/soan', 'slug lĩnh vực ở route phần'],
    ['/phan/khong-co/soan', 'slug không có'],
    ['/phan/tools/soan/thua', 'đoạn thừa'],
  ])('%s (%s) → 404 trong khung', async (duongDan) => {
    await moTrang(duongDan)
    expect(within(khung()!).getByRole('heading', { level: 1 }).textContent).toBe(
      'Không tìm thấy trang này.',
    )
    expect(screen.queryByRole('link', { name: /^Về (lĩnh vực|phần)$/ })).toBeNull()
  })
})
