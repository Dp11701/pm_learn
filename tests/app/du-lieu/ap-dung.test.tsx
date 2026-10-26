// @vitest-environment jsdom
// Lớp dữ liệu bước Áp dụng (src/app/du-lieu/ap-dung.ts; đề xuất 1.10, 3.1, 3.2) trên máy chủ giả: các lần ghi
// nối tiếp của cùng mục — lỗi thì trả về giá trị server đã xác nhận (không phải giá trị lạc quan của lần ghi
// trước, chưa từng lưu), lần trước xong khi lần sau còn chờ thì giữ giá trị lạc quan của lần sau; tải lại theo
// revision như ảnh chụp trạng thái học (meta hỏi trước lần ghi của chính tab không làm tải lại); DELETE qua
// goiApi.
import { StrictMode, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layCay } from '../../../shared/roadmap'
import type { MucApDung } from '../../../server/du-lieu/ap-dung'
import { ToastProvider } from '../../../src/components/Toast'
import { KHOA_AP_DUNG, useApDung, useGhiApDung } from '../../../src/app/du-lieu/ap-dung'

const ketNoi = vi.hoisted(() => ({ revision: undefined as number | undefined }))
vi.mock(import('../../../src/app/ket-noi'), async (goc) => ({
  ...(await goc()),
  useKetNoi: () => ({
    trangThai: 'on-dinh' as const,
    meta:
      ketNoi.revision === undefined
        ? null
        : {
            revision: ketNoi.revision,
            now: '2026-10-22T14:42:00.000Z',
            homNay: '2026-10-22',
            soMucHoc: 1,
          },
    thuNgay: async () => {},
    dangThu: false,
  }),
}))

const pmp = layCay().mucTheoSlug.get('project-management-professional-pmp')!
const DUONG_DAN_MUC = `/api/ap-dung/${encodeURIComponent(pmp.id)}`

interface MayChu {
  revision: number
  apDung: Record<string, MucApDung>
  /** Số lần PUT / DELETE tới trả 500 */
  loiGhi: number
  /** Số lần GET /api/ap-dung tới trả 500 */
  loiTai: number
  yeuCau: { method: string; url: string }[]
  dongCua(): void
  moCua(): void
  /** Cửa vẫn đóng, chỉ cho lần ghi đang chờ sớm nhất chạy tiếp */
  moMot(): void
  soDangGiu(): number
  dem(khoa: string): number
}

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

/** GET /api/ap-dung, PUT / DELETE /api/ap-dung/:id theo hợp đồng server/du-lieu/ap-dung.ts. */
function taoMayChu(): MayChu {
  let dong = false
  const dangGiu: (() => void)[] = []
  const sv: MayChu = {
    revision: 0,
    apDung: {},
    loiGhi: 0,
    loiTai: 0,
    yeuCau: [],
    dongCua() {
      dong = true
    },
    moCua() {
      dong = false
      for (const mo of dangGiu.splice(0)) mo()
    },
    moMot() {
      dangGiu.shift()?.()
    },
    soDangGiu: () => dangGiu.length,
    dem: (khoa) => sv.yeuCau.filter((y) => `${y.method} ${y.url}` === khoa).length,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      sv.yeuCau.push({ method, url })
      if (method === 'GET' && url === '/api/ap-dung') {
        if (sv.loiTai > 0) {
          sv.loiTai -= 1
          return json(500, { loi: 'Máy chủ gặp lỗi.' })
        }
        return json(200, { revision: sv.revision, apDung: structuredClone(sv.apDung) })
      }
      const m = /^\/api\/ap-dung\/(.+)$/.exec(url)
      if (m && (method === 'PUT' || method === 'DELETE')) {
        if (dong) await new Promise<void>((r) => dangGiu.push(r))
        if (sv.loiGhi > 0) {
          sv.loiGhi -= 1
          return json(500, { loi: 'Máy chủ gặp lỗi.' })
        }
        const id = decodeURIComponent(m[1])
        const truoc = sv.apDung[id] ?? null
        const lyDo = method === 'PUT' ? String(JSON.parse(String(init!.body)).lyDo) : null
        const moi: MucApDung | null = lyDo === null ? null : { trangThai: 'khong-ap-dung', lyDo }
        const daDoi = JSON.stringify(truoc) !== JSON.stringify(moi)
        if (daDoi) {
          if (moi) sv.apDung[id] = moi
          else delete sv.apDung[id]
          sv.revision += 1
        }
        return json(200, { revision: sv.revision, id, muc: moi, truoc, daDoi })
      }
      return json(404, { loi: `Không có API ${method} ${url}.` })
    }),
  )
  return sv
}

let sv: MayChu

beforeEach(() => {
  sv = taoMayChu()
  ketNoi.revision = undefined
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function taoClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  })
}

function dung(ui: ReactNode, client = taoClient()) {
  const boc = (x: ReactNode) => (
    <StrictMode>
      <QueryClientProvider client={client}>
        <ToastProvider>{x}</ToastProvider>
      </QueryClientProvider>
    </StrictMode>
  )
  const kq = render(boc(ui))
  return { client, dungLai: (x: ReactNode) => kq.rerender(boc(x)) }
}

/** Áp dụng của PMP + các nút ghi (như khối Kế hoạch thi). */
function KhoiThu() {
  const ad = useApDung()
  const ghi = useGhiApDung()
  const muc = ad.cua(pmp.id)
  return (
    <main>
      <p data-testid="ap-dung">
        {ad.dangTai ? 'dang-tai' : muc ? `${muc.trangThai}: ${muc.lyDo ?? ''}` : 'chua-lam'}
      </p>
      <p data-testid="luu">{ghi.dangLuu(pmp.id) ? 'dang-luu' : 'xong'}</p>
      <button type="button" onClick={() => ghi.khongApDung(pmp.id, 'Lý do 1')}>
        Đánh dấu 1
      </button>
      <button type="button" onClick={() => ghi.khongApDung(pmp.id, 'Lý do 2')}>
        Đánh dấu 2
      </button>
      <button type="button" onClick={() => ghi.boDanhDau(pmp.id)}>
        Bỏ đánh dấu
      </button>
    </main>
  )
}

const apDung = () => screen.getByTestId('ap-dung').textContent
const luu = () => screen.getByTestId('luu').textContent
const bam = (ten: string) => act(() => fireEvent.click(screen.getByRole('button', { name: ten })))
const cho = (ms = 20) => act(() => new Promise((r) => setTimeout(r, ms)))
const GHI = [`PUT ${DUONG_DAN_MUC}`, `DELETE ${DUONG_DAN_MUC}`]
const soLanGhi = () => sv.yeuCau.filter((y) => GHI.includes(`${y.method} ${y.url}`)).length

describe('useGhiApDung — các lần ghi nối tiếp của cùng mục', () => {
  it('hai lần ghi liên tiếp cùng lỗi: trả về giá trị server đã xác nhận, không phải giá trị lạc quan của lần trước', async () => {
    sv.apDung[pmp.id] = { trangThai: 'khong-ap-dung', lyDo: 'Lý do cũ' }
    dung(<KhoiThu />)
    await waitFor(() => expect(apDung()).toBe('khong-ap-dung: Lý do cũ'))

    sv.loiGhi = 2
    // Lượt tải lại sau lỗi cũng hỏng: màn hình chỉ còn dựa vào giá trị trả về lúc lỗi
    sv.loiTai = 1
    sv.dongCua()
    await bam('Bỏ đánh dấu') // A
    await bam('Đánh dấu 2') // B
    await waitFor(() => expect(apDung()).toBe('khong-ap-dung: Lý do 2'))
    await waitFor(() => expect(sv.soDangGiu()).toBe(1))

    // A lỗi khi B còn chờ: giữ giá trị lạc quan của B, không toast cho A
    await act(async () => sv.moMot())
    await waitFor(() => expect(soLanGhi()).toBe(2))
    await waitFor(() => expect(sv.soDangGiu()).toBe(1))
    expect(apDung()).toBe('khong-ap-dung: Lý do 2')
    expect(luu()).toBe('dang-luu')
    expect(screen.queryByRole('alert')).toBeNull()

    // B lỗi: về "Lý do cũ" (giá trị server), không phải "chưa làm" (giá trị lạc quan của A, chưa từng lưu)
    await act(async () => sv.moCua())
    await waitFor(() => expect(luu()).toBe('xong'))
    await waitFor(() => expect(sv.dem('GET /api/ap-dung')).toBe(2))
    await cho()
    expect(apDung()).toBe('khong-ap-dung: Lý do cũ')
    expect(sv.apDung[pmp.id]).toEqual({ trangThai: 'khong-ap-dung', lyDo: 'Lý do cũ' })
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('lần trước lưu xong khi lần sau còn chờ: giữ giá trị lạc quan của lần sau; lần sau lỗi → về giá trị lần trước', async () => {
    dung(<KhoiThu />)
    await waitFor(() => expect(apDung()).toBe('chua-lam'))
    sv.dongCua()
    await bam('Đánh dấu 1') // A — lưu được
    await bam('Bỏ đánh dấu') // B — lỗi
    await waitFor(() => expect(sv.soDangGiu()).toBe(1))
    await act(async () => sv.moMot())
    await waitFor(() => expect(soLanGhi()).toBe(2))
    await waitFor(() => expect(sv.soDangGiu()).toBe(1))
    expect(sv.apDung[pmp.id]).toEqual({ trangThai: 'khong-ap-dung', lyDo: 'Lý do 1' })
    // A xong khi B còn chờ: màn hình giữ giá trị lạc quan của B (không nhảy về "Lý do 1")
    expect(apDung()).toBe('chua-lam')

    sv.loiGhi = 1
    sv.loiTai = 1
    await act(async () => sv.moCua())
    await screen.findByRole('alert')
    await cho()
    expect(apDung()).toBe('khong-ap-dung: Lý do 1')
  })

  it('bỏ đánh dấu gửi DELETE qua goiApi (JSON, không cache)', async () => {
    sv.apDung[pmp.id] = { trangThai: 'khong-ap-dung', lyDo: 'Lý do cũ' }
    dung(<KhoiThu />)
    await waitFor(() => expect(apDung()).toBe('khong-ap-dung: Lý do cũ'))
    await bam('Bỏ đánh dấu')
    await waitFor(() => expect(sv.apDung).toEqual({}))
    expect(fetch).toHaveBeenCalledWith(
      DUONG_DAN_MUC,
      expect.objectContaining({
        method: 'DELETE',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      }),
    )
  })
})

describe('useApDung — tải lại theo revision', () => {
  it('sau lần ghi của chính tab: nhận revision server trả về; meta cũ hơn (hỏi trước lần ghi) không làm tải lại', async () => {
    sv.revision = 3
    ketNoi.revision = 3
    const { client, dungLai } = dung(<KhoiThu />)
    const revisionAnh = () => client.getQueryData<{ revision: number }>(KHOA_AP_DUNG)?.revision
    await waitFor(() => expect(apDung()).toBe('chua-lam'))
    expect(sv.dem('GET /api/ap-dung')).toBe(1)

    await bam('Đánh dấu 1')
    await waitFor(() => expect(revisionAnh()).toBe(4))
    await waitFor(() => expect(luu()).toBe('xong'))
    // Meta vẫn 3 (hỏi trước lần ghi): không tải lại
    dungLai(<KhoiThu />)
    await cho()
    expect(sv.dem('GET /api/ap-dung')).toBe(1)

    // Lần hỏi meta sau bắt kịp lần ghi: vẫn không tải lại
    ketNoi.revision = 4
    dungLai(<KhoiThu />)
    await cho()
    expect(sv.dem('GET /api/ap-dung')).toBe(1)

    // Nơi khác ghi: meta mới hơn → tải lại đúng một lần
    sv.apDung[pmp.id] = { trangThai: 'khong-ap-dung', lyDo: 'Tab khác' }
    sv.revision = 5
    ketNoi.revision = 5
    dungLai(<KhoiThu />)
    await waitFor(() => expect(apDung()).toBe('khong-ap-dung: Tab khác'))
    expect(sv.dem('GET /api/ap-dung')).toBe(2)

    // Revision server lùi (thay file DB, chạy lại server) → tải lại
    sv.apDung = {}
    sv.revision = 2
    ketNoi.revision = 2
    dungLai(<KhoiThu />)
    await waitFor(() => expect(apDung()).toBe('chua-lam'))
    expect(sv.dem('GET /api/ap-dung')).toBe(3)
  })

  it('lần ghi không đổi gì (daDoi false) không nhận revision server: thay đổi của nơi khác vẫn được tải về', async () => {
    sv.revision = 3
    ketNoi.revision = 3
    const { client, dungLai } = dung(<KhoiThu />)
    const revisionAnh = () => client.getQueryData<{ revision: number }>(KHOA_AP_DUNG)?.revision
    await waitFor(() => expect(apDung()).toBe('chua-lam'))
    // Nơi khác ghi một mục khác (revision 4) trước khi meta kịp báo
    sv.apDung.khac = { trangThai: 'khong-ap-dung', lyDo: 'Tab khác' }
    sv.revision = 4
    await bam('Bỏ đánh dấu') // không có gì để bỏ: daDoi false, revision 4 là của nơi khác
    await waitFor(() => expect(sv.dem(`DELETE ${DUONG_DAN_MUC}`)).toBe(1))
    await waitFor(() => expect(luu()).toBe('xong'))
    expect(revisionAnh()).toBe(3)
    ketNoi.revision = 4
    dungLai(<KhoiThu />)
    await waitFor(() => expect(sv.dem('GET /api/ap-dung')).toBe(2))
    await waitFor(() => expect(revisionAnh()).toBe(4))
  })
})
