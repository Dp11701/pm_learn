// @vitest-environment jsdom
// Bố cục trang bài trên máy tính (đề xuất 4.4; phạm vi rút gọn 27/10/2026 — chỉ ≥ 1024, không đồng hồ) và cột phải
// F11: ≥ 1280 cột phải [tab Mục lục | Trong lĩnh vực · Ghi chú · Flashcard] dính khi cuộn; 1024–1279 nút "Mục lục" /
// "Ghi chú" mở panel trượt 360px, card Flashcard xuống cuối bài (giữ neo #flashcard). Mục lục từ khối thực sự hiện
// (D15), tab Trong lĩnh vực (hàng C9 rút gọn), mở / đóng panel và trả focus; axe. Cỡ cột (720/640, 320/280) là lớp
// CSS theo bề rộng — jsdom không bố cục nên kiểm lớp; bề rộng thật đã đo trên trình duyệt.
import { StrictMode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TEN_TRANG_THAI_HOC } from '../../../shared/domain/trang-thai'
import { viTriTrongVung } from '../../../shared/roadmap'
import { PhimTatProvider } from '../../../src/app/phim-tat'
import { ToastProvider } from '../../../src/components/Toast'
import TrangMucHoc from '../../../src/pages/TrangMucHoc'
import { MUC_LUC_TRONG } from '../../../src/copy/cho-duyet'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { doiBeRong, giaMatchMedia } from '../../app/khung/moi-truong'
import { taoGiaMayChuHoc, type GiaMayChuHoc } from '../../app/du-lieu/hoc-gia-may-chu'
import { taoGiaMayChu, type GiaMayChu } from '../../app/du-lieu/gia-may-chu'
import { cay, fileChuDe, muc, phanHoi } from './ho-tro'

const sc = muc('scope-creep')
const { cacMuc: cungLinhVuc } = viTriTrongVung(cay, sc.id)
const khac = cungLinhVuc.find((m) => m.id !== sc.id)!

let sv: GiaMayChuHoc
/** Trạng thái học (GET /api/state, PUT /api/trang-thai/:id, lượt mở) */
let svTrangThai: GiaMayChu
/** Nội dung file theo id; không có → Chưa có nội dung */
let tep: Map<string, string>

beforeEach(() => {
  svTrangThai = taoGiaMayChu()
  const trangThai = globalThis.fetch
  sv = taoGiaMayChuHoc()
  tep = new Map([
    [sc.id, fileChuDe(sc, { trangThai: 'da-duyet', them: [['Ghi thêm', 'Một khối ngoài mẫu.']] })],
  ])
  // Một fetch: GET /api/bai/:id ở đây, trạng thái học ở gia-may-chu, dữ liệu học ở hoc-gia-may-chu
  const hoc = globalThis.fetch
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (/^\/api\/(state|trang-thai\/|luot-mo\/|noi-dung\/trang-thai)/.test(String(input))) {
        return trangThai(input, init)
      }
      const m = /^\/api\/bai\/(.+)$/.exec(String(input))
      if (m && (init?.method ?? 'GET') === 'GET') {
        const id = decodeURIComponent(m[1])
        return new Response(JSON.stringify(phanHoi(cay.mucTheoId.get(id)!, tep.get(id) ?? null)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return hoc(input, init)
    }),
  )
  sv.the.push({
    id: 1,
    itemId: sc.id,
    truoc: 'Thẻ một',
    sau: 'Đáp',
    hop: 2,
    hanOn: '2026-10-24',
    khoaCau: null,
  })
  sv.mucCua(sc.id).ghiChu = { text: 'Ghi chú có sẵn', capNhat: '2026-10-22T14:42:00.000Z' }
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.title = ''
})

function DuongDan() {
  const { pathname } = useLocation()
  return <p data-testid="duong-dan">{pathname}</p>
}

function moBai(rong: number, slug = sc.slug, neo = '') {
  giaMatchMedia(rong)
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  })
  return render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <PhimTatProvider>
            <MemoryRouter initialEntries={[`/hoc/${slug}${neo}`]}>
              <main>
                <Routes>
                  <Route path="/hoc/:slug" element={<TrangMucHoc />} />
                </Routes>
              </main>
              <DuongDan />
            </MemoryRouter>
          </PhimTatProvider>
        </ToastProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

const cotPhai = () => screen.queryByRole('complementary', { name: 'Công cụ của bài' })
const article = () => screen.getByRole('article')
const nutDau = (ten: string) =>
  screen.queryAllByRole('button', { name: ten }).find((b) => !b.closest('[role="dialog"]'))
const oGhiChu = () => screen.getAllByRole('textbox', { name: 'Ghi chú' })
const flashcard = () => document.querySelectorAll('#flashcard')
const tabMucLuc = () => screen.getByRole('tab', { name: 'Mục lục' })
const hangMucLuc = () =>
  within(screen.getByRole('tabpanel')).getAllByRole('link') as HTMLAnchorElement[]

/** Bài và dữ liệu học (thẻ) đã tải xong. */
async function choBai() {
  await screen.findByRole('article')
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Tạo thẻ' })).toHaveProperty('disabled', false),
  )
}

describe('≥ 1280: cột phải (F11)', () => {
  it('1440: "Công cụ của bài" = tab Mục lục / Trong lĩnh vực · Ghi chú · Flashcard (không có đồng hồ); dính đầu trang; không có nút đầu trang', async () => {
    moBai(1440)
    await choBai()
    const cot = cotPhai()!
    expect(cot).toBeTruthy()
    // Vùng cuộn → ruột cột (bề rộng 280 / 320) chứa ba card
    expect(cot.children).toHaveLength(1)
    const cuon = cot.firstElementChild as HTMLElement
    expect(cuon.children).toHaveLength(1)
    const ruot = cuon.firstElementChild as HTMLElement
    const con = [...ruot.children]
    expect(con).toHaveLength(3)
    expect(
      within(con[0] as HTMLElement).getByRole('tablist', { name: 'Điều hướng trong bài' }),
    ).toBeTruthy()
    expect(within(con[1] as HTMLElement).getByRole('textbox', { name: 'Ghi chú' })).toBeTruthy()
    expect(con[2].id).toBe('flashcard')
    expect(cot.textContent).not.toMatch(/Đồng hồ|bấm giờ/)
    expect(cot.className).toContain('sticky')
    expect(cot.className).toContain('top-6')
    // ≥ 1440: cột phải 320, cột đọc ≤ 720 (cách 48); 1280–1439: 280 và ≤ 640. jsdom không bố cục: kiểm lớp (bề rộng
    // thật đo trên trình duyệt, cả với thanh cuộn cổ điển).
    expect(ruot.className).toMatch(/(^| )w-\[280px\]( |$)/)
    expect(ruot.className).toContain('min-[1440px]:w-80')
    // Cột có bề rộng đúng bằng ruột: thanh cuộn của cột không làm hàng rộng thêm (hồi quy: cột 320 + rãnh 15–17px
    // làm cột đọc còn 698 ở 1440 với thanh cuộn cổ điển) — nên không dùng scrollbar-gutter trên cột
    expect(cot.className).toMatch(/(^| )w-\[280px\]( |$)/)
    expect(cot.className).toContain('min-[1440px]:w-80')
    expect(cot.className).not.toContain('scrollbar-gutter')
    expect(cot.className).not.toContain('overflow-y-auto')
    // Khoảng cách 32 / 48 là lề trái của cột; ≥ 1440 co về 32 khi hàng hẹp hơn 720 + 48 + 320 (thanh cuộn cổ điển
    // của cửa sổ) để cột đọc vẫn đủ 720
    expect(cot.className).toMatch(/(^| )ml-8( |$)/)
    expect(cot.className).toContain('min-[1440px]:ml-[clamp(32px,calc(100%_-_1040px),48px)]')
    // Vùng cuộn rộng hơn cột 20px sang lề trang: thanh cuộn nằm ngoài 280 / 320, card không hẹp lại (hồi quy 309 / 269)
    expect(cuon.className).toContain('overflow-y-auto')
    expect(cuon.className).toMatch(/(^| )-mr-5( |$)/)
    expect(cuon.className).not.toContain('scrollbar-gutter')
    expect(article().className).toContain('max-w-[720px]')
    expect(article().className).toContain('xl:max-[1440px]:max-w-[640px]')
    // Hàng không có gap (gap cộng thêm vào lề trái của cột thì cột đọc lại hẹp)
    expect(article().parentElement!.className).not.toMatch(/(^| )(min-\[1440px\]:)?gap-/)
    expect(nutDau('Mục lục')).toBeUndefined()
    expect(flashcard()).toHaveLength(1)
    expect(oGhiChu()).toHaveLength(1)
    // Cột phải đứng sau cột đọc trong cùng một hàng
    expect(article().nextElementSibling).toBe(cot)
  })

  it('1280: vẫn có cột phải', async () => {
    moBai(1280)
    await choBai()
    expect(cotPhai()).toBeTruthy()
    expect(nutDau('Ghi chú')).toBeUndefined()
  })

  it('bước Ghi nhớ của thanh 4 bước trỏ tới #flashcard; bấm → focus card, chỉ cuộn vừa đủ (nearest) — không kéo cả trang', async () => {
    moBai(1440)
    await choBai()
    const cuon = vi.fn()
    flashcard()[0].scrollIntoView = cuon
    const ghiNho = screen.getAllByRole('link').find((a) => a.getAttribute('href') === '#flashcard')!
    expect(ghiNho).toBeTruthy()
    fireEvent.click(ghiNho)
    expect(document.activeElement).toBe(flashcard()[0])
    expect(cuon).toHaveBeenCalledWith(expect.objectContaining({ block: 'nearest' }))
    // Khối trong cột đọc vẫn cuộn lên đầu
    const thucHanh = document.getElementById('thuc-hanh-tren-du-an-that')!
    const cuonKhoi = vi.fn()
    thucHanh.scrollIntoView = cuonKhoi
    fireEvent.click(
      screen
        .getAllByRole('link')
        .find((a) => a.getAttribute('href') === '#thuc-hanh-tren-du-an-that')!,
    )
    expect(cuonKhoi).toHaveBeenCalledWith(expect.objectContaining({ block: 'start' }))
  })

  it('axe (Sáng; tương phản kiểm riêng)', async () => {
    const { container } = moBai(1440)
    await choBai()
    await expectNoAxeViolations(container)
  })
})

// Hồi quy review: "Tạo thẻ" của Ôn tập mở /hoc/<slug>#flashcard — card phải vào tầm nhìn và nhận focus.
describe('vào bằng #flashcard ("Tạo thẻ" của Ôn tập)', () => {
  const cuon = vi.fn()
  beforeEach(() => {
    cuon.mockClear()
    Element.prototype.scrollIntoView = cuon
  })
  afterEach(() => {
    delete (Element.prototype as Partial<Element>).scrollIntoView
  })
  const cuonCard = () => cuon.mock.contexts.filter((el) => el === flashcard()[0]).length

  it('≥ 1280: trang dựng xong → cuộn cột phải vừa đủ thấy card (nearest) và focus card, một lần', async () => {
    moBai(1440, sc.slug, '#flashcard')
    await choBai()
    await waitFor(() => expect(document.activeElement).toBe(flashcard()[0]))
    expect(cotPhai()!.contains(flashcard()[0])).toBe(true)
    expect(cuon).toHaveBeenCalledWith(expect.objectContaining({ block: 'nearest' }))
    expect(cuonCard()).toBe(1)
  })

  it('1024–1279: card ở cuối bài → cuộn tới đầu card (start) và focus card', async () => {
    moBai(1024, sc.slug, '#flashcard')
    await choBai()
    await waitFor(() => expect(document.activeElement).toBe(flashcard()[0]))
    expect(article().contains(flashcard()[0])).toBe(true)
    expect(cuon).toHaveBeenCalledWith(expect.objectContaining({ block: 'start' }))
  })

  it('không có #flashcard: không cuộn tới card, không lấy focus', async () => {
    moBai(1440)
    await choBai()
    await new Promise((r) => setTimeout(r, 20))
    expect(cuonCard()).toBe(0)
    expect(document.activeElement).not.toBe(flashcard()[0])
  })
})

describe('F19 phải "Đã xong khi còn thiếu bước" (§1, đề xuất 3.1, quyết định 10)', () => {
  const datXong = () => svTrangThai.yeuCau.filter((y) => y.method === 'PUT')

  it('segmented "Đã xong" khi còn bước thiếu → alertdialog, chưa đặt; "Quay lại học tiếp" không đặt; "Vẫn đánh dấu Đã xong" → PUT da-xong', async () => {
    moBai(1440)
    await choBai()
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Đã xong/ })).toHaveProperty('disabled', false),
    )
    fireEvent.click(screen.getByRole('radio', { name: /Đã xong/ }))
    let d = screen.getByRole('alertdialog')
    expect(d.textContent).toContain(`Đánh dấu ${sc.label} là Đã xong?`)
    expect(datXong()).toHaveLength(0)
    fireEvent.click(within(d).getByRole('button', { name: 'Quay lại học tiếp' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(datXong()).toHaveLength(0))
    fireEvent.click(screen.getByRole('radio', { name: /Đã xong/ }))
    d = screen.getByRole('alertdialog')
    fireEvent.click(within(d).getByRole('button', { name: 'Vẫn đánh dấu Đã xong' }))
    await waitFor(() => expect(datXong()).toHaveLength(1))
    expect(datXong()[0].url).toBe(`/api/trang-thai/${encodeURIComponent(sc.id)}`)
    expect(JSON.stringify(datXong()[0].body)).toContain('da-xong')
  })

  it('"Đã xong, sang bài tiếp" cũng qua F19: chỉ sang bài sau khi chọn "Vẫn đánh dấu Đã xong"', async () => {
    moBai(1440)
    await choBai()
    const nut = await screen.findByRole('button', { name: 'Đã xong, sang bài tiếp' })
    await waitFor(() => expect(nut).toHaveProperty('disabled', false))
    fireEvent.click(nut)
    expect(screen.getByTestId('duong-dan').textContent).toBe(`/hoc/${sc.slug}`)
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Vẫn đánh dấu Đã xong' }),
    )
    await waitFor(() =>
      expect(screen.getByTestId('duong-dan').textContent).not.toBe(`/hoc/${sc.slug}`),
    )
  })

  it('phím 3 (Đã xong) khi còn bước thiếu → F19; không đặt khi chưa chọn', async () => {
    moBai(1440)
    await choBai()
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Đã xong/ })).toHaveProperty('disabled', false),
    )
    fireEvent.keyDown(document.body, { key: '3', code: 'Digit3' })
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    expect(datXong()).toHaveLength(0)
  })
})

describe('Mục lục (D15) và Trong lĩnh vực (C9 rút gọn)', () => {
  it('đúng các khối đang hiện, theo thứ tự trang (kể cả khối ngoài mẫu, không có khối tuỳ chọn trống); bấm → focus khối, aria-current="location"', async () => {
    moBai(1440)
    await choBai()
    const hang = hangMucLuc()
    const ids = hang.map((a) => a.getAttribute('href')!.slice(1))
    // Mỗi hàng trỏ tới một khối có trong cột đọc, đúng thứ tự trang
    const khoi = ids.map((id) => document.getElementById(id))
    expect(khoi.every((k) => k && article().contains(k))).toBe(true)
    for (let i = 1; i < khoi.length; i++) {
      expect(
        khoi[i - 1]!.compareDocumentPosition(khoi[i]!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    }
    const ten = hang.map((a) => a.textContent)
    expect(ten).toContain('Tóm tắt')
    expect(ten).toContain('Ghi thêm')
    expect(ten).not.toContain('So sánh')
    const tu = hang.find((a) => a.textContent === 'Tham khảo')!
    fireEvent.click(tu)
    expect(document.activeElement?.id).toBe(tu.getAttribute('href')!.slice(1))
    expect(tu.getAttribute('aria-current')).toBe('location')
    expect(hang.filter((a) => a.getAttribute('aria-current'))).toHaveLength(1)
  })

  it('tab "Trong lĩnh vực" (mũi tên phải): một hàng mỗi mục cùng lĩnh vực, icon + chữ trạng thái, mục đang mở aria-current="page"; bấm hàng → sang bài', async () => {
    moBai(1440)
    await choBai()
    tabMucLuc().focus()
    fireEvent.keyDown(tabMucLuc(), { key: 'ArrowRight' })
    const tab = screen.getByRole('tab', { name: 'Trong lĩnh vực' })
    await waitFor(() => expect(tab.getAttribute('aria-selected')).toBe('true'))
    const panel = screen.getByRole('tabpanel')
    const hang = within(panel).getAllByRole('link')
    expect(hang).toHaveLength(cungLinhVuc.length)
    expect(hang.map((a) => a.querySelector('[lang="en"]')?.textContent)).toEqual(
      cungLinhVuc.map((m) => m.label),
    )
    const dangMo = hang.filter((a) => a.getAttribute('aria-current') === 'page')
    expect(dangMo).toHaveLength(1)
    expect(dangMo[0].getAttribute('href')).toBe(`/hoc/${sc.slug}`)
    expect(hang[0].querySelector('[data-trang-thai]')).toBeTruthy()
    expect(hang[0].textContent).toContain(TEN_TRANG_THAI_HOC['chua-hoc'])
    expect(hang[0].className).toContain('focus-trong')
    fireEvent.click(hang.find((a) => a.getAttribute('href') === `/hoc/${khac.slug}`)!)
    expect(screen.getByTestId('duong-dan').textContent).toBe(`/hoc/${khac.slug}`)
  })

  it('bài chưa có nội dung: Mục lục chỉ có khối chứa việc của người học đang hiện (Chủ đề: phần làm bài Thực hành), không phải câu trống; vẫn có Ghi chú và Flashcard', async () => {
    tep.clear()
    moBai(1440)
    await waitFor(() =>
      expect(hangMucLuc().map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
        ['Thực hành trên dự án thật', '#thuc-hanh-tren-du-an-that'],
      ]),
    )
    expect(screen.getByRole('tabpanel').textContent).not.toContain(MUC_LUC_TRONG)
    expect(oGhiChu()).toHaveLength(1)
    expect(flashcard()).toHaveLength(1)
  })
})

describe('1024–1279: không có cột phải, panel trượt (đề xuất 4.4)', () => {
  it('nút "Mục lục" / "Ghi chú" ở đầu trang; card Flashcard ở cuối bài, trước chân bài; một #flashcard', async () => {
    moBai(1100)
    await choBai()
    expect(cotPhai()).toBeNull()
    expect(nutDau('Mục lục')!.getAttribute('aria-haspopup')).toBe('dialog')
    expect(nutDau('Ghi chú')).toBeTruthy()
    expect(flashcard()).toHaveLength(1)
    const card = flashcard()[0]
    expect(article().contains(card)).toBe(true)
    expect(card.nextElementSibling?.tagName).toBe('FOOTER')
    // Chưa mở panel thì chưa có ô ghi chú
    expect(screen.queryAllByRole('textbox', { name: 'Ghi chú' })).toHaveLength(0)
  })

  it('"Ghi chú": panel phải "Ghi chú", focus vào ô (chữ đã lưu); Esc đóng, focus về nút; axe', async () => {
    moBai(1100)
    await screen.findByRole('article')
    const nut = nutDau('Ghi chú')!
    nut.focus()
    fireEvent.click(nut)
    const panel = screen.getByRole('dialog', { name: 'Ghi chú' })
    const o = within(panel).getByRole('textbox', { name: 'Ghi chú' }) as HTMLTextAreaElement
    await waitFor(() => expect(o.value).toBe('Ghi chú có sẵn'))
    await waitFor(() => expect(document.activeElement).toBe(o))
    await expectNoAxeViolations(document.body)
    fireEvent.keyDown(o, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(nut))
  })

  it('"Mục lục": panel có tab; bấm một khối → panel đóng, focus vào khối đó (không về nút)', async () => {
    moBai(1100)
    await screen.findByRole('article')
    const nut = nutDau('Mục lục')!
    nut.focus()
    fireEvent.click(nut)
    const panel = screen.getByRole('dialog', { name: 'Điều hướng trong bài' })
    expect(within(panel).getByRole('tab', { name: 'Trong lĩnh vực' })).toBeTruthy()
    const hang = within(within(panel).getByRole('tabpanel')).getAllByRole('link')
    const tk = hang.find((a) => a.textContent === 'Tham khảo')!
    const id = tk.getAttribute('href')!.slice(1)
    fireEvent.click(tk)
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement?.id).toBe(id))
  })

  it('đổi bề rộng 1440 → 1100 → 1440: cột phải ↔ nút + Flashcard cuối bài; luôn đúng một #flashcard', async () => {
    moBai(1440)
    await choBai()
    expect(cotPhai()).toBeTruthy()
    doiBeRong(1100)
    expect(cotPhai()).toBeNull()
    expect(nutDau('Mục lục')).toBeTruthy()
    expect(flashcard()).toHaveLength(1)
    expect(article().contains(flashcard()[0])).toBe(true)
    doiBeRong(1440)
    expect(cotPhai()!.contains(flashcard()[0])).toBe(true)
    expect(flashcard()).toHaveLength(1)
    expect(nutDau('Mục lục')).toBeUndefined()
  })

  it('axe', async () => {
    const { container } = moBai(1100)
    await screen.findByRole('article')
    await expectNoAxeViolations(container)
  })
})

describe('ngoài máy chủ (gallery, test khung app)', () => {
  it('cột phải vẽ được, ô ghi chú và "Tạo thẻ" khoá, không gọi API', () => {
    giaMatchMedia(1440)
    render(
      <PhimTatProvider>
        <MemoryRouter initialEntries={[`/hoc/${sc.slug}`]}>
          <Routes>
            <Route path="/hoc/:slug" element={<TrangMucHoc />} />
          </Routes>
        </MemoryRouter>
      </PhimTatProvider>,
    )
    expect(cotPhai()).toBeTruthy()
    expect(oGhiChu()[0]).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Tạo thẻ' })).toHaveProperty('disabled', true)
    expect(sv.yeuCau).toHaveLength(0)
  })
})
