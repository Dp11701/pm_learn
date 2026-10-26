// @vitest-environment jsdom
// Lớp dữ liệu học của một mục (src/app/du-lieu/hoc.ts; đề xuất 2.1, 3.2; §11 "Tự lưu, không tải đè lên ô đang
// gõ") trên máy chủ giả: tải GET /api/hoc/:id, vòng 4 bước, tự lưu ô chữ (chữ cuối thắng, bản tạm giữ tới khi lưu
// xong, lỗi giữ chữ), ghi lạc quan + trả về giá trị server đã xác nhận khi lỗi, toast Hoàn tác của Không áp dụng,
// Tự kiểm tra (Xem đáp án / tự chấm), revision của chính tab.
import { StrictMode, cloneElement, type ReactElement, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layCay } from '../../../shared/roadmap'
import { ToastProvider } from '../../../src/components/Toast'
import {
  TRE_TU_LUU,
  useBonBuoc,
  useHoc,
  useLuuNoiLai,
  useLuuThucHanh,
  useLuuTuKiemTra,
} from '../../../src/app/du-lieu/hoc'
import { useTrangThai } from '../../../src/app/du-lieu/trang-thai'
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

const muc = layCay().mucHoc.find((m) => m.mau === 'chu-de')!
const ID = muc.id
const GOC = `/api/hoc/${encodeURIComponent(ID)}`
const KHOA_NHAP_NOI_LAI = `hoc-pm-a-z:nhap-tam:noi-lai:${ID}`

let sv: GiaMayChuHoc

beforeEach(() => {
  sv = taoGiaMayChuHoc()
  ketNoi.revision = undefined
  window.sessionStorage.clear()
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

/** Hook đang dựng (gán lại mỗi lần vẽ). */
const h = {} as {
  hoc: ReturnType<typeof useHoc>
  noiLai: ReturnType<typeof useLuuNoiLai>
  th: ReturnType<typeof useLuuThucHanh>
  tk: ReturnType<typeof useLuuTuKiemTra>
  tk2: ReturnType<typeof useLuuTuKiemTra>
  bb: ReturnType<typeof useBonBuoc>
}

function Thu() {
  h.hoc = useHoc(ID)
  h.noiLai = useLuuNoiLai(ID)
  h.th = useLuuThucHanh(ID)
  h.tk = useLuuTuKiemTra(ID, 'k1')
  h.tk2 = useLuuTuKiemTra(ID, 'k1#2')
  h.bb = useBonBuoc(ID, 'chu-de', ['k1'])
  return null
}

function dung(ui: ReactElement = <Thu />, client = taoClient()) {
  const boc = (x: ReactNode) => (
    <StrictMode>
      <QueryClientProvider client={client}>
        <ToastProvider>{x}</ToastProvider>
      </QueryClientProvider>
    </StrictMode>
  )
  const kq = render(boc(ui))
  // Phần tử mới mỗi lần để React vẽ lại (đọc meta mới)
  return { client, dungLai: () => kq.rerender(boc(cloneElement(ui))) }
}

const cho = (ms = 20) => act(() => new Promise((r) => setTimeout(r, ms)))
const daTai = () => waitFor(() => expect(h.hoc.hoc).toBeDefined())
const vungToast = () => screen.getByRole('status', { name: 'Thông báo' })
const PUT_NOI_LAI = `PUT ${GOC}/noi-lai`
const PUT_THUC_HANH = `PUT ${GOC}/thuc-hanh`

describe('useHoc, useBonBuoc', () => {
  it('tải dữ liệu học của mục; 4 bước theo dữ liệu; "Đã lưu lúc" theo lần lưu của máy chủ', async () => {
    sv.mucCua(ID).noiLai = { text: 'Nói lại', capNhat: '2026-10-22T14:00:00.000Z' }
    dung()
    await daTai()
    expect(h.noiLai.giaTri).toBe('Nói lại')
    expect(h.noiLai.tinhTrang).toBe('da-luu')
    expect(h.noiLai.luc).toBe('2026-10-22T14:00:00.000Z')
    expect(h.bb?.soXong).toBe(1)
    expect(h.bb?.tiep).toBe('ap-dung')
    expect(h.bb?.buoc['kiem-tra'].thieu).toBe('Thiếu · chưa tự chấm câu nào')
  })

  it('ngoài QueryClientProvider: không gọi API, chưa có dữ liệu', () => {
    function Le() {
      h.hoc = useHoc(ID)
      return null
    }
    render(<Le />)
    expect(h.hoc.hoc).toBeUndefined()
    expect(h.hoc.dangTai).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('tự lưu ô chữ (C25, nhap-tam)', () => {
  it('gõ liên tiếp: một lần gửi chữ cuối sau khi ngừng gõ; bản tạm giữ tới khi lưu xong', async () => {
    dung()
    await daTai()
    act(() => {
      h.noiLai.luu('a')
      h.noiLai.luu('ab')
      h.noiLai.luu('abc')
    })
    expect(h.noiLai.giaTri).toBe('abc')
    expect(h.noiLai.tinhTrang).toBe('dang-luu')
    expect(window.sessionStorage.getItem(KHOA_NHAP_NOI_LAI)).toBe('abc')
    // Bước Hiểu đổi ngay khi ô có chữ (trước khi gửi)
    await waitFor(() => expect(h.bb?.buoc.hieu.tinhTrang).toBe('xong'))
    expect(sv.dem(PUT_NOI_LAI)).toBe(0)

    await cho(TRE_TU_LUU + 100)
    await waitFor(() => expect(h.noiLai.tinhTrang).toBe('da-luu'))
    expect(sv.cacLan(PUT_NOI_LAI).map((y) => y.body)).toEqual([{ text: 'abc' }])
    expect(sv.muc[ID].noiLai?.text).toBe('abc')
    expect(h.noiLai.luc).not.toBeNull()
    expect(window.sessionStorage.getItem(KHOA_NHAP_NOI_LAI)).toBeNull()
  })

  it('gõ tiếp trong lúc đang gửi: gửi nối tiếp, chữ mới nhất thắng, kết quả lần cũ không đè chữ mới', async () => {
    dung()
    await daTai()
    sv.dongCua()
    act(() => {
      h.noiLai.luu('a')
      h.noiLai.xongNgay()
    })
    await waitFor(() => expect(sv.soDangGiu()).toBe(1))
    act(() => {
      h.noiLai.luu('ab')
      h.noiLai.xongNgay()
    })
    await cho()
    // Lần sau xếp hàng sau lần trước (cùng mục chạy nối tiếp)
    expect(sv.dem(PUT_NOI_LAI)).toBe(1)
    await act(async () => sv.moMot())
    await waitFor(() => expect(sv.dem(PUT_NOI_LAI)).toBe(2))
    expect(h.noiLai.giaTri).toBe('ab')
    expect(h.noiLai.tinhTrang).toBe('dang-luu')
    await act(async () => sv.moCua())
    await waitFor(() => expect(h.noiLai.tinhTrang).toBe('da-luu'))
    expect(sv.cacLan(PUT_NOI_LAI).map((y) => y.body)).toEqual([{ text: 'a' }, { text: 'ab' }])
    expect(sv.muc[ID].noiLai?.text).toBe('ab')
    expect(h.noiLai.giaTri).toBe('ab')
  })

  it('lưu lỗi: giữ chữ và bản tạm, "Lỗi lưu" (không toast); Thử lại lưu được thì xoá bản tạm', async () => {
    dung()
    await daTai()
    sv.loiGhi = 1
    act(() => {
      h.noiLai.luu('Chưa lưu được')
      h.noiLai.xongNgay()
    })
    await waitFor(() => expect(h.noiLai.tinhTrang).toBe('loi'))
    expect(h.noiLai.loi).toBe('Máy chủ gặp lỗi.')
    expect(h.noiLai.giaTri).toBe('Chưa lưu được')
    expect(window.sessionStorage.getItem(KHOA_NHAP_NOI_LAI)).toBe('Chưa lưu được')
    expect(screen.queryByRole('alert')).toBeNull()
    // Tải lại sau lỗi vẫn giữ chữ đang gõ
    await waitFor(() => expect(sv.dem(`GET ${GOC}`)).toBe(2))
    await cho()
    expect(h.noiLai.giaTri).toBe('Chưa lưu được')
    expect(h.bb?.buoc.hieu.tinhTrang).toBe('xong')

    act(() => h.noiLai.thuLai())
    await waitFor(() => expect(h.noiLai.tinhTrang).toBe('da-luu'))
    expect(sv.muc[ID].noiLai?.text).toBe('Chưa lưu được')
    expect(window.sessionStorage.getItem(KHOA_NHAP_NOI_LAI)).toBeNull()
  })

  it('tải lại vì nơi khác ghi không đè chữ đang gõ', async () => {
    sv.revision = 3
    ketNoi.revision = 3
    const { dungLai } = dung()
    await daTai()
    act(() => h.noiLai.luu('Đang gõ'))
    // Tab khác ghi Nói lại + Ghi chú
    sv.mucCua(ID).noiLai = { text: 'Tab khác', capNhat: sv.gio }
    sv.mucCua(ID).ghiChu = { text: 'Ghi chú tab khác', capNhat: sv.gio }
    sv.revision = 4
    ketNoi.revision = 4
    dungLai()
    await waitFor(() => expect(h.hoc.hoc?.ghiChu?.text).toBe('Ghi chú tab khác'))
    expect(h.noiLai.giaTri).toBe('Đang gõ')
    expect(h.hoc.hoc?.noiLai?.text).toBe('Đang gõ')
    act(() => h.noiLai.xongNgay())
    await waitFor(() => expect(h.noiLai.tinhTrang).toBe('da-luu'))
    expect(sv.muc[ID].noiLai?.text).toBe('Đang gõ')
  })

  it('bản tạm còn từ lần trước (chưa lưu được) → hiện ngay và tự lưu lại', async () => {
    sv.mucCua(ID).noiLai = { text: 'Cũ', capNhat: sv.gio }
    window.sessionStorage.setItem(KHOA_NHAP_NOI_LAI, 'Bản tạm')
    dung()
    await daTai()
    expect(h.noiLai.giaTri).toBe('Bản tạm')
    await waitFor(() => expect(sv.muc[ID].noiLai?.text).toBe('Bản tạm'), { timeout: 2000 })
    await waitFor(() => expect(h.noiLai.tinhTrang).toBe('da-luu'))
    expect(window.sessionStorage.getItem(KHOA_NHAP_NOI_LAI)).toBeNull()
  })

  it('bản tạm trùng máy chủ → bỏ bản tạm, không gửi', async () => {
    sv.mucCua(ID).noiLai = { text: 'Giống', capNhat: sv.gio }
    window.sessionStorage.setItem(KHOA_NHAP_NOI_LAI, 'Giống')
    dung()
    await daTai()
    await cho()
    expect(window.sessionStorage.getItem(KHOA_NHAP_NOI_LAI)).toBeNull()
    expect(sv.dem(PUT_NOI_LAI)).toBe(0)
  })
})

describe('Thực hành (bước Áp dụng)', () => {
  it('"Xong" mang theo Kết quả chưa lưu trong cùng một lần ghi; bước Áp dụng xong', async () => {
    dung()
    await daTai()
    act(() => h.th.ketQua.luu('Kết quả của tôi'))
    act(() => h.th.dat({ trangThai: 'xong' }))
    await waitFor(() => expect(h.th.ketQua.tinhTrang).toBe('da-luu'))
    expect(sv.cacLan(PUT_THUC_HANH).map((y) => y.body)).toEqual([
      { trangThai: 'xong', ketQua: 'Kết quả của tôi' },
    ])
    expect(sv.muc[ID].thucHanh.trangThai).toBe('xong')
    expect(h.bb?.buoc['ap-dung'].tinhTrang).toBe('xong')
    expect(h.th.dangLuu).toBe(false)
  })

  it('lưu lỗi → trả về giá trị server đã xác nhận + toast "Lỗi lưu — đã giữ trạng thái cũ." + Thử lại', async () => {
    dung()
    await daTai()
    sv.loiGhi = 1
    sv.dongCua()
    act(() => h.th.dat({ trangThai: 'dang-lam' }))
    await waitFor(() => expect(h.hoc.hoc?.thucHanh.trangThai).toBe('dang-lam'))
    expect(h.th.dangLuu).toBe(true)
    await act(async () => sv.moCua())
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Lỗi lưu — đã giữ trạng thái cũ.')
    expect(h.hoc.hoc?.thucHanh.trangThai).toBeNull()
    await act(() => fireEvent.click(within(alert).getByRole('button', { name: 'Thử lại' })))
    await waitFor(() => expect(sv.muc[ID].thucHanh.trangThai).toBe('dang-lam'))
    await waitFor(() => expect(h.hoc.hoc?.thucHanh.trangThai).toBe('dang-lam'))
  })

  it('hai lần ghi cùng khoá đều lỗi: về giá trị server (không phải giá trị lạc quan của lần trước); lần trước lỗi khi lần sau còn chờ thì không toast', async () => {
    sv.mucCua(ID).thucHanh.duAnId = 5
    dung()
    await daTai()
    sv.loiGhi = 2
    sv.loiTai = 1
    sv.dongCua()
    act(() => h.th.dat({ duAnId: 1 })) // A
    act(() => h.th.dat({ duAnId: 2 })) // B
    await waitFor(() => expect(h.hoc.hoc?.thucHanh.duAnId).toBe(2))
    await waitFor(() => expect(sv.soDangGiu()).toBe(1))
    await act(async () => sv.moMot())
    await waitFor(() => expect(sv.dem(PUT_THUC_HANH)).toBe(2))
    // A lỗi khi B còn chờ: giữ giá trị lạc quan của B, không toast
    expect(h.hoc.hoc?.thucHanh.duAnId).toBe(2)
    expect(screen.queryByRole('alert')).toBeNull()
    await act(async () => sv.moCua())
    await screen.findByRole('alert')
    await cho()
    expect(h.hoc.hoc?.thucHanh.duAnId).toBe(5)
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('lần trước lưu xong khi lần sau còn chờ: giữ giá trị lạc quan của lần sau; lần sau lỗi → về giá trị lần trước', async () => {
    dung()
    await daTai()
    sv.dongCua()
    act(() => h.th.dat({ duAnId: 1 })) // A — lưu được
    act(() => h.th.dat({ duAnId: 2 })) // B — lỗi
    await waitFor(() => expect(sv.soDangGiu()).toBe(1))
    await act(async () => sv.moMot())
    await waitFor(() => expect(sv.muc[ID].thucHanh.duAnId).toBe(1))
    await cho()
    expect(h.hoc.hoc?.thucHanh.duAnId).toBe(2)
    sv.loiGhi = 1
    sv.loiTai = 1
    await act(async () => sv.moCua())
    await screen.findByRole('alert')
    await cho()
    expect(h.hoc.hoc?.thucHanh.duAnId).toBe(1)
  })

  it('lỗi do dữ liệu (4xx): toast câu của máy chủ, không có Thử lại; giữ trạng thái cũ', async () => {
    dung()
    await daTai()
    act(() => h.th.dat({ trangThai: 'xong' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Ghi kết quả trước khi đánh dấu Xong.')
    expect(within(alert).queryByRole('button', { name: 'Thử lại' })).toBeNull()
    await waitFor(() => expect(h.hoc.hoc?.thucHanh.trangThai).toBeNull())
  })

  it('Không áp dụng (mọi mẫu): lý do bỏ khoảng trắng; toast + Hoàn tác gửi lại giá trị cũ; Hoàn tác không có Hoàn tác', async () => {
    dung()
    await daTai()
    act(() => h.th.dat({ trangThai: 'khong-ap-dung', lyDo: '  Không có dự án phù hợp  ' }))
    await waitFor(() => expect(sv.muc[ID].thucHanh.trangThai).toBe('khong-ap-dung'))
    expect(sv.cacLan(PUT_THUC_HANH)[0].body).toEqual({
      trangThai: 'khong-ap-dung',
      lyDo: 'Không có dự án phù hợp',
    })
    expect(h.bb?.buoc['ap-dung'].tinhTrang).toBe('khong-ap-dung')
    await waitFor(() =>
      expect(vungToast().textContent).toContain(`Đã đánh dấu Không áp dụng: ${muc.label}`),
    )
    expect(vungToast().querySelector('[lang="en"]')?.textContent).toBe(muc.label)
    await act(() => fireEvent.click(within(vungToast()).getByRole('button', { name: 'Hoàn tác' })))
    await waitFor(() => expect(sv.muc[ID].thucHanh.trangThai).toBeNull())
    expect(sv.cacLan(PUT_THUC_HANH)[1].body).toEqual({ trangThai: null })
    await waitFor(() =>
      expect(vungToast().textContent).toContain(`Đã bỏ đánh dấu Không áp dụng: ${muc.label}`),
    )
    expect(within(vungToast()).queryByRole('button', { name: 'Hoàn tác' })).toBeNull()
  })

  it('tick tiêu chí gửi cả bảng tiêu chí', async () => {
    dung()
    await daTai()
    act(() => h.th.datTieuChi('t1', true))
    act(() => h.th.datTieuChi('t2', true))
    await waitFor(() => expect(sv.dem(PUT_THUC_HANH)).toBe(2))
    expect(sv.cacLan(PUT_THUC_HANH)[1].body).toEqual({ tieuChi: { t1: true, t2: true } })
    await waitFor(() => expect(sv.muc[ID].thucHanh.tieuChi).toEqual({ t1: true, t2: true }))
    expect(h.bb?.buoc['ap-dung'].tinhTrang).toBe('dang-lam')
  })
})

describe('Tự kiểm tra (bước Kiểm tra)', () => {
  it('Xem đáp án chỉ khi có câu trả lời (mang theo câu trả lời); tự chấm chỉ sau khi xem; giữ lần chấm mới nhất', async () => {
    dung()
    await daTai()
    let duoc = true
    act(() => {
      duoc = h.tk.cham('dung')
    })
    expect(duoc).toBe(false)
    act(() => {
      duoc = h.tk.xemDapAn()
    })
    expect(duoc).toBe(false)
    act(() => h.tk.traLoi.luu('   '))
    act(() => {
      duoc = h.tk.xemDapAn()
    })
    expect(duoc).toBe(false)
    await cho()
    expect(sv.yeuCau.filter((y) => y.method === 'PUT')).toHaveLength(0)

    act(() => h.tk.traLoi.luu('Câu trả lời'))
    act(() => {
      duoc = h.tk.xemDapAn()
    })
    expect(duoc).toBe(true)
    await waitFor(() => expect(h.hoc.hoc?.tuKiemTra.k1?.daXem).toBe(true))
    act(() => {
      duoc = h.tk.cham('sai')
    })
    expect(duoc).toBe(true)
    act(() => h.tk.cham('dung'))
    await waitFor(() => expect(sv.muc[ID].tuKiemTra.k1?.cham).toBe('dung'))
    expect(sv.cacLan(`PUT ${GOC}/tu-kiem-tra/k1`).map((y) => y.body)).toEqual([
      { daXem: true, traLoi: 'Câu trả lời' },
      { cham: 'sai' },
      { cham: 'dung' },
    ])
    expect(h.tk.traLoi.tinhTrang).toBe('da-luu')
    expect(h.bb?.buoc['kiem-tra'].tinhTrang).toBe('xong')
  })

  it('khoá câu trùng ("…#2") được mã hoá trong đường dẫn', async () => {
    dung()
    await daTai()
    act(() => {
      h.tk2.traLoi.luu('Trả lời câu trùng')
      h.tk2.traLoi.xongNgay()
    })
    await waitFor(() => expect(sv.muc[ID].tuKiemTra['k1#2']?.traLoi).toBe('Trả lời câu trùng'))
    expect(sv.dem(`PUT ${GOC}/tu-kiem-tra/k1%232`)).toBe(1)
  })
})

describe('revision', () => {
  function CaHai() {
    useTrangThai()
    h.hoc = useHoc(ID)
    h.noiLai = useLuuNoiLai(ID)
    return null
  }

  it('lần ghi của chính tab không làm tải lại dữ liệu học hay ảnh chụp trạng thái; nơi khác ghi thì tải lại', async () => {
    sv.revision = 3
    ketNoi.revision = 3
    const { dungLai } = dung(<CaHai />)
    await daTai()
    await waitFor(() => expect(sv.dem('GET /api/state')).toBe(1))
    act(() => {
      h.noiLai.luu('Của tab này')
      h.noiLai.xongNgay()
    })
    await waitFor(() => expect(h.noiLai.tinhTrang).toBe('da-luu'))
    expect(h.hoc.hoc?.revision).toBe(4)
    ketNoi.revision = 4
    dungLai()
    await cho()
    expect(sv.dem(`GET ${GOC}`)).toBe(1)
    expect(sv.dem('GET /api/state')).toBe(1)

    // Nơi khác ghi → tải lại cả hai
    sv.mucCua(ID).ghiChu = { text: 'Tab khác', capNhat: sv.gio }
    sv.revision = 5
    ketNoi.revision = 5
    dungLai()
    await waitFor(() => expect(h.hoc.hoc?.ghiChu?.text).toBe('Tab khác'))
    expect(sv.dem(`GET ${GOC}`)).toBe(2)
    await waitFor(() => expect(sv.dem('GET /api/state')).toBe(2))
  })
})
