// @vitest-environment jsdom
// Duyệt bài gọn trên trang bài /hoc/:slug (bước 4; đề xuất 3.6, 3.7 rút gọn theo mục 10; Cần chốt 13) trên máy chủ
// giả (trang bài + dữ liệu học + /api/duyet/*):
// - bản nháp: banner AI / Tự viết + "Duyệt bài" → dialog "Duyệt bài này?" ("Sẽ thành Đã duyệt · dd/MM/yyyy" theo
//   hôm nay của server, khối ★ thiếu vẫn cho duyệt, focus "Duyệt"); Huỷ / Esc không gửi gì, focus về nút; Duyệt →
//   POST kèm hashFile, toast "Đã duyệt {tên}" không có Hoàn tác, banner biến mất, chip Đã duyệt, focus H1; axe;
// - 409: toast lỗi (câu máy chủ + "Trang đã tải lại…"), bài tải lại;
// - bản sửa: "Có thay đổi chưa duyệt" + "Duyệt bản sửa" (hash của GET /api/duyet/:id) / "Bỏ bản sửa" (đỏ, focus
//   Huỷ); bản sửa lỗi frontmatter → không duyệt được, vẫn bỏ được.
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PhanHoiBai } from '../../../server/noi-dung/hop-dong-bai'
import type { ChiTietBanSua } from '../../../src/app/du-lieu/duyet'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { taoMayChuDayDu } from '../../components/bai-hoc/moi-truong-hoc'
import { fileChuDe, muc, phanHoi } from './ho-tro'
import { giaResizeObserver, moBai, type MayChuBai } from './moi-truong'

const sc = muc('scope-creep')
const HOM_NAY = '2026-10-28'

interface MayChuDuyet {
  bai: MayChuBai
  gui: { url: string; body: unknown }[]
  /** Trả lời cho POST tới (theo đường dẫn); không có → 200 và đổi bài theo thao tác */
  loi: Map<string, { status: number; loi: string }>
  banSua: ChiTietBanSua | null
}

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

function daDuyet(text: string, ngay = '2026-10-18', coBanSua = false): PhanHoiBai {
  const p = phanHoi(sc, text, { banChup: { ngayDuyet: ngay, noiDung: text, khop: true } })
  return coBanSua
    ? { ...p, trangThaiNoiDung: { loai: 'da-duyet', ngayDuyet: ngay, coBanSua: true } }
    : p
}

/** Máy chủ giả đầy đủ + /api/duyet/*: duyệt xong thì GET /api/bai trả bài Đã duyệt. */
function taoMayChu(): MayChuDuyet {
  const bai = taoMayChuDayDu().bai
  const may: MayChuDuyet = { bai, gui: [], loi: new Map(), banSua: null }
  const fetchGoc = globalThis.fetch
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (!url.startsWith('/api/duyet/')) return fetchGoc(input, init)
    if (method === 'GET') return json(200, { homNay: HOM_NAY, banSua: may.banSua })
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined
    may.gui.push({ url, body })
    const loi = may.loi.get(url)
    if (loi) return json(loi.status, { loi: loi.loi })
    const text = fileChuDe(sc, { trangThai: 'da-duyet' })
    if (url.endsWith('/bo-ban-sua')) {
      bai.bai.set(sc.id, daDuyet(text))
      may.banSua = null
      return json(200, { revision: 2 })
    }
    bai.bai.set(sc.id, daDuyet(text, HOM_NAY))
    may.banSua = null
    return json(200, { revision: 2, ngayDuyet: HOM_NAY })
  })
  return may
}

let sv: MayChuDuyet

beforeEach(() => {
  sv = taoMayChu()
  giaResizeObserver()
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.title = ''
})

const h1 = () => screen.getByRole('heading', { level: 1 })
const soLanTaiBai = () => sv.bai.yeuCau.filter((y) => y.url === `/api/bai/${sc.id}`).length

async function mo() {
  const kq = moBai(`/hoc/${sc.slug}`)
  await screen.findByRole('radio', { name: /Chưa học/, checked: true })
  return kq
}

describe('bản nháp: "Duyệt bài"', () => {
  it('dialog: hôm nay của server, khối ★ thiếu, focus "Duyệt"; Duyệt → POST hashFile, toast không Hoàn tác, banner mất, focus H1; axe', async () => {
    sv.bai.bai.set(sc.id, phanHoi(sc, fileChuDe(sc, { bo: ['Ví dụ thực tế'] })))
    await mo()
    expect(
      await screen.findByText('Bản nháp do AI soạn — chưa được bạn duyệt, có thể sai.'),
    ).toBeTruthy()
    const nut = screen.getByRole('button', { name: 'Duyệt bài' })
    fireEvent.click(nut)

    const hop = await screen.findByRole('alertdialog', { name: 'Duyệt bài này?' })
    await waitFor(() => expect(hop.textContent).toContain('Sẽ thành Đã duyệt · 28/10/2026'))
    expect(hop.textContent).toContain('Duyệt xong không hoàn tác được.')
    expect(hop.textContent).toContain(sc.label)
    expect(
      within(hop)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Ví dụ thực tế'])
    expect(document.activeElement).toBe(within(hop).getByRole('button', { name: 'Duyệt' }))
    await expectNoAxeViolations(hop)

    const truoc = soLanTaiBai()
    fireEvent.click(within(hop).getByRole('button', { name: 'Duyệt' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(sv.gui).toEqual([{ url: `/api/duyet/${sc.id}`, body: { hashNhap: 'hash-file' } }])

    // Toast "Đã duyệt {tên}", không có Hoàn tác
    await waitFor(() =>
      expect(
        screen.getAllByRole('status').some((s) => s.textContent?.includes(`Đã duyệt ${sc.label}`)),
      ).toBe(true),
    )
    expect(screen.queryByRole('button', { name: 'Hoàn tác' })).toBeNull()

    // Bài tải lại: banner bản nháp mất, chip Đã duyệt với hôm nay của server
    await waitFor(() => expect(soLanTaiBai()).toBeGreaterThan(truoc))
    await waitFor(() => expect(screen.queryByText(/Bản nháp do/)).toBeNull())
    expect(screen.queryByRole('button', { name: 'Duyệt bài' })).toBeNull()
    expect(await screen.findByText('Đã duyệt · 28/10/2026')).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(h1()))
  })

  it('Huỷ và Esc: không gửi gì, focus về "Duyệt bài"; bản Tự viết có banner riêng', async () => {
    sv.bai.bai.set(sc.id, phanHoi(sc, fileChuDe(sc, { nguon: 'tu-viet' })))
    await mo()
    expect(await screen.findByText('Bản nháp do bạn tự viết — chưa duyệt.')).toBeTruthy()
    const nut = screen.getByRole('button', { name: 'Duyệt bài' })
    nut.focus()
    fireEvent.click(nut)
    let hop = await screen.findByRole('alertdialog', { name: 'Duyệt bài này?' })
    // Đủ khối: không có danh sách khối thiếu
    expect(within(hop).queryByRole('list')).toBeNull()
    fireEvent.click(within(hop).getByRole('button', { name: 'Huỷ' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(nut))

    fireEvent.click(nut)
    hop = await screen.findByRole('alertdialog', { name: 'Duyệt bài này?' })
    fireEvent.keyDown(hop, { key: 'Escape', code: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(sv.gui).toEqual([])
  })

  it('bài tự tải bản mới khi dialog đang mở: vẫn gửi hash của lúc mở (máy chủ sẽ từ chối, không duyệt nhầm)', async () => {
    sv.bai.bai.set(sc.id, phanHoi(sc, fileChuDe(sc)))
    const { client } = await mo()
    fireEvent.click(await screen.findByRole('button', { name: 'Duyệt bài' }))
    const hop = await screen.findByRole('alertdialog', { name: 'Duyệt bài này?' })
    // File đổi ngoài app → revision nội dung đổi → trang tải lại bài (hash mới, thiếu một khối)
    sv.bai.bai.set(sc.id, {
      ...phanHoi(sc, fileChuDe(sc, { bo: ['Tóm tắt'] })),
      hashFile: 'hash-moi',
    })
    const truoc = soLanTaiBai()
    await act(() => client.invalidateQueries({ queryKey: ['noi-dung'] }))
    await waitFor(() => expect(soLanTaiBai()).toBeGreaterThan(truoc))
    // Dialog giữ đúng bản đã mở: không có khối thiếu mới chen vào
    expect(within(hop).queryByRole('list')).toBeNull()
    fireEvent.click(within(hop).getByRole('button', { name: 'Duyệt' }))
    await waitFor(() =>
      expect(sv.gui).toEqual([{ url: `/api/duyet/${sc.id}`, body: { hashNhap: 'hash-file' } }]),
    )
  })

  it('409 (file đổi ngoài app): toast lỗi với câu máy chủ + "Trang đã tải lại…", bài tải lại, banner còn', async () => {
    sv.bai.bai.set(sc.id, phanHoi(sc, fileChuDe(sc)))
    sv.loi.set(`/api/duyet/${sc.id}`, { status: 409, loi: 'File bài đã đổi từ lúc bạn mở trang.' })
    await mo()
    fireEvent.click(await screen.findByRole('button', { name: 'Duyệt bài' }))
    const hop = await screen.findByRole('alertdialog', { name: 'Duyệt bài này?' })
    const truoc = soLanTaiBai()
    fireEvent.click(within(hop).getByRole('button', { name: 'Duyệt' }))
    const alert = await waitFor(() => {
      const a = screen
        .getAllByRole('alert')
        .find((el) => el.textContent?.includes('Không duyệt được'))
      expect(a).toBeTruthy()
      return a!
    })
    expect(alert.textContent).toContain(
      'Không duyệt được: File bài đã đổi từ lúc bạn mở trang. Trang đã tải lại bản mới nhất.',
    )
    await waitFor(() => expect(soLanTaiBai()).toBeGreaterThan(truoc))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Duyệt bài' })).toBeTruthy()
  })
})

describe('bản sửa: "Duyệt bản sửa" / "Bỏ bản sửa"', () => {
  const banSua = (tc: Partial<ChiTietBanSua> = {}): ChiTietBanSua => ({
    hash: 'b'.repeat(64),
    duongDan: `project-management/scope-management/${sc.slug}.ban-sua.md`,
    ngayNhap: '2026-10-24',
    duKhoi: { co: 8, tong: 9 },
    thieu: ['Ví dụ thực tế'],
    loiDoc: null,
    ...tc,
  })

  it('banner + duyệt bản sửa: dialog hôm nay + khối thiếu, POST kèm hash bản sửa, banner mất; axe', async () => {
    sv.bai.bai.set(sc.id, daDuyet(fileChuDe(sc, { trangThai: 'da-duyet' }), '2026-10-18', true))
    sv.banSua = banSua()
    const { container } = await mo()
    const tieuDe = await screen.findByText('Có thay đổi chưa duyệt')
    const banner = tieuDe.closest('[role="status"]') as HTMLElement
    await waitFor(() =>
      expect(banner.textContent).toContain(
        `${sc.slug}.ban-sua.md · nhập 24/10/2026 · Đủ khối 8/9. Trang đang hiện bản Đã duyệt.`,
      ),
    )
    await expectNoAxeViolations(container)

    fireEvent.click(within(banner).getByRole('button', { name: 'Duyệt bản sửa' }))
    const hop = await screen.findByRole('alertdialog', { name: 'Duyệt bản sửa này?' })
    expect(hop.textContent).toContain('Sẽ thành Đã duyệt · 28/10/2026')
    expect(
      within(hop)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Ví dụ thực tế'])
    fireEvent.click(within(hop).getByRole('button', { name: 'Duyệt' }))
    await waitFor(() =>
      expect(sv.gui).toEqual([
        { url: `/api/duyet/${sc.id}/ban-sua`, body: { hashNhap: 'b'.repeat(64) } },
      ]),
    )
    await waitFor(() => expect(screen.queryByText('Có thay đổi chưa duyệt')).toBeNull())
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('status')
          .some((s) => s.textContent?.includes(`Đã duyệt bản sửa ${sc.label}`)),
      ).toBe(true),
    )
  })

  it('bỏ bản sửa: dialog đỏ, focus Huỷ; xác nhận → POST bo-ban-sua; bản sửa lỗi frontmatter: không duyệt được', async () => {
    sv.bai.bai.set(sc.id, daDuyet(fileChuDe(sc, { trangThai: 'da-duyet' }), '2026-10-18', true))
    sv.banSua = banSua({ loiDoc: { dong: 3, thongBao: 'loai không khớp mẫu bài' } })
    await mo()
    const banner = (await screen.findByText('Có thay đổi chưa duyệt')).closest(
      '[role="status"]',
    ) as HTMLElement
    await waitFor(() =>
      expect(banner.textContent).toContain(
        `${sc.slug}.ban-sua.md: lỗi frontmatter dòng 3 — sửa file rồi duyệt. Loai không khớp mẫu bài.`,
      ),
    )
    expect(
      (within(banner).getByRole('button', { name: 'Duyệt bản sửa' }) as HTMLButtonElement).disabled,
    ).toBe(true)

    fireEvent.click(within(banner).getByRole('button', { name: 'Bỏ bản sửa' }))
    const hop = await screen.findByRole('alertdialog', { name: 'Bỏ bản sửa?' })
    expect(hop.textContent).toContain(`File ${sc.slug}.ban-sua.md sẽ vào thùng rác`)
    expect(document.activeElement).toBe(within(hop).getByRole('button', { name: 'Huỷ' }))
    await act(async () => {
      fireEvent.click(within(hop).getByRole('button', { name: 'Bỏ bản sửa' }))
    })
    await waitFor(() =>
      expect(sv.gui).toEqual([{ url: `/api/duyet/${sc.id}/bo-ban-sua`, body: undefined }]),
    )
    await waitFor(() => expect(screen.queryByText('Có thay đổi chưa duyệt')).toBeNull())
  })
})
