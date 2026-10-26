// @vitest-environment jsdom
// Dự án thực hành (src/app/du-lieu/du-an.ts) trên máy chủ giả: tải danh sách, thêm dự án (bỏ khoảng trắng, có id
// ngay để chọn), lỗi → kết quả lỗi kèm câu của máy chủ, tải lại theo revision của nơi khác (không vì lần ghi của tab).
import { StrictMode, cloneElement, type ReactElement, type ReactNode } from 'react'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDuAn, useThemDuAn, type KetQuaThemDuAn } from '../../../src/app/du-lieu/du-an'
import { taoGiaMayChuHoc, type GiaMayChuHoc } from './hoc-gia-may-chu'

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

let sv: GiaMayChuHoc

beforeEach(() => {
  sv = taoGiaMayChuHoc()
  sv.duAn = [{ id: 1, ten: 'Dự án A', vaiTro: 'PM', giaiDoan: null }]
  ketNoi.revision = undefined
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const h = {} as { duAn: ReturnType<typeof useDuAn>; them: ReturnType<typeof useThemDuAn> }

function Thu() {
  h.duAn = useDuAn()
  h.them = useThemDuAn()
  return null
}

function dung(ui: ReactElement = <Thu />) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  })
  const boc = (x: ReactNode) => (
    <StrictMode>
      <QueryClientProvider client={client}>{x}</QueryClientProvider>
    </StrictMode>
  )
  const kq = render(boc(ui))
  return { dungLai: () => kq.rerender(boc(cloneElement(ui))) }
}

const cho = (ms = 20) => act(() => new Promise((r) => setTimeout(r, ms)))

describe('useDuAn, useThemDuAn', () => {
  it('tải danh sách dự án', async () => {
    dung()
    await waitFor(() => expect(h.duAn.duAn).toEqual(sv.duAn))
    expect(h.duAn.dangTai).toBe(false)
  })

  it('thêm dự án: bỏ khoảng trắng (trường trống không gửi), có id ngay, vào danh sách', async () => {
    dung()
    await waitFor(() => expect(h.duAn.duAn).toHaveLength(1))
    let kq: KetQuaThemDuAn | undefined
    await act(async () => {
      kq = await h.them({ ten: '  Dự án B ', vaiTro: ' Dev lead ', giaiDoan: '   ' })
    })
    expect(kq).toEqual({
      ok: true,
      duAn: { id: 11, ten: 'Dự án B', vaiTro: 'Dev lead', giaiDoan: null },
    })
    expect(sv.cacLan('POST /api/du-an')[0].body).toEqual({ ten: 'Dự án B', vaiTro: 'Dev lead' })
    await waitFor(() => expect(h.duAn.duAn?.map((d) => d.id)).toEqual([1, 11]))
  })

  it('thêm lỗi → kết quả lỗi kèm câu của máy chủ', async () => {
    dung()
    await waitFor(() => expect(h.duAn.duAn).toHaveLength(1))
    let kq: KetQuaThemDuAn | undefined
    await act(async () => {
      kq = await h.them({ ten: '   ' })
    })
    expect(kq).toEqual({ ok: false, loi: 'Ghi tên dự án.' })
    expect(h.duAn.duAn).toHaveLength(1)
  })

  it('tải lại khi nơi khác đổi; lần ghi của chính tab thì không', async () => {
    sv.revision = 5
    ketNoi.revision = 5
    const { dungLai } = dung()
    await waitFor(() => expect(h.duAn.duAn).toHaveLength(1))
    await act(async () => {
      await h.them({ ten: 'Dự án B' })
    })
    ketNoi.revision = 6
    dungLai()
    await cho()
    expect(sv.dem('GET /api/du-an')).toBe(1)

    sv.duAn.push({ id: 50, ten: 'Tab khác', vaiTro: null, giaiDoan: null })
    sv.revision = 7
    ketNoi.revision = 7
    dungLai()
    await waitFor(() => expect(h.duAn.duAn?.map((d) => d.id)).toEqual([1, 11, 50]))
    expect(sv.dem('GET /api/du-an')).toBe(2)
  })

  it('ngoài QueryClientProvider: không gọi API', () => {
    function Le() {
      h.duAn = useDuAn()
      return null
    }
    render(<Le />)
    expect(h.duAn.duAn).toBeUndefined()
    expect(h.duAn.dangTai).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
})
