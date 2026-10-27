// @vitest-environment jsdom
// Đầu bài phase 3 (F11; §1; đề xuất 3.1, 3.2; D8, D34): thanh 4 bước C10 tính từ dữ liệu học (shared/domain/
// bon-buoc.ts) — đổi ngay khi gõ Nói lại, D8 khi bài không có câu hỏi, "chưa làm" khi chưa biết câu hỏi, lỗi đọc +
// Thử lại — và lý do Bỏ qua (tuỳ chọn, gợi ý lý do đã dùng, PUT /api/trang-thai kèm lý do). Thêm: propsTuKetQua,
// lyDoDaDung.
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tinhBonBuoc, DU_LIEU_BON_BUOC_TRONG } from '../../../shared/domain/bon-buoc'
import { useDatTrangThai, useTrangThai } from '../../../src/app/du-lieu/trang-thai'
import { usePhimTat } from '../../../src/app/phim-tat'
import { lyDoDaDung } from '../../../src/components/bai-hoc/HopThoaiBoQua'
import NoiLai from '../../../src/components/bai-hoc/NoiLai'
import { propsTuKetQua } from '../../../src/components/trang-thai/ThanhBonBuoc'
import DauBai, { type PropsDauBai } from '../../../src/pages/bai-hoc/DauBai'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { cay, muc } from '../../pages/bai-hoc/ho-tro'
import { giaResizeObserver } from '../../pages/bai-hoc/moi-truong'
import { dungVoiProvider, taoMayChuDayDu, type MayChuDayDu } from './moi-truong-hoc'

let sv: MayChuDayDu
const sc = muc('scope-creep')
const ID = sc.id

beforeEach(() => {
  sv = taoMayChuDayDu()
  giaResizeObserver()
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const NEO = {
  hieu: '#noi-lai-bang-loi-cua-ban',
  'ap-dung': '#thuc-hanh-tren-du-an-that',
  'kiem-tra': '#tu-kiem-tra',
  'ghi-nho': '#flashcard',
}

/** DauBai với trạng thái học thật (useTrangThai / useDatTrangThai) như TrangMucHoc. */
function Dau(props: Pick<PropsDauBai, 'cauHoiKhoa'>) {
  const tt = useTrangThai()
  const dat = useDatTrangThai()
  return (
    <DauBai
      muc={sc}
      cay={cay}
      noiDung={{ loai: 'chua-co' }}
      loiDoc={null}
      hoc={tt}
      datHoc={{ dat: dat.dat, loiLuu: dat.loiLuu, thuLai: dat.thuLai }}
      neoBuoc={NEO}
      {...props}
    />
  )
}

const buoc = (b: string) => document.querySelector(`header [data-buoc="${b}"]`) as HTMLElement
const tinhTrang = () =>
  Object.fromEntries(
    [...document.querySelectorAll('header [data-buoc]')].map((li) => [
      li.getAttribute('data-buoc'),
      li.getAttribute('data-tinh-trang'),
    ]),
  )
const choTai = () =>
  waitFor(() => expect(sv.hoc.dem(`GET /api/hoc/${encodeURIComponent(ID)}`)).toBeGreaterThan(0))

describe('thanh 4 bước theo dữ liệu học (đề xuất 3.2)', () => {
  it('như F11: Hiểu xong, Áp dụng "· đang làm" (aria-current), Kiểm tra chưa làm, Ghi nhớ xong; link tới khối; axe', async () => {
    const m = sv.hoc.mucCua(ID)
    m.noiLai = { text: 'Nói lại', capNhat: sv.hoc.gio }
    m.thucHanh = { ...m.thucHanh, trangThai: 'dang-lam' }
    sv.hoc.the.push({
      id: 1,
      itemId: ID,
      truoc: 't',
      sau: 's',
      hop: 1,
      hanOn: '2026-10-23',
      khoaCau: null,
    })
    const { container } = dungVoiProvider(<Dau cauHoiKhoa={['k1']} />)
    await waitFor(() =>
      expect(tinhTrang()).toEqual({
        hieu: 'xong',
        'ap-dung': 'dang-lam',
        'kiem-tra': 'chua-lam',
        'ghi-nho': 'xong',
      }),
    )
    const nav = screen.getByRole('navigation', { name: 'Bốn bước học' })
    expect(
      within(nav)
        .getAllByRole('link')
        .map((a) => [a.textContent, a.getAttribute('href')]),
    ).toEqual([
      ['Hiểu — đã xong', '#noi-lai-bang-loi-cua-ban'],
      ['Áp dụng · đang làm', '#thuc-hanh-tren-du-an-that'],
      ['Kiểm tra — chưa làm', '#tu-kiem-tra'],
      ['Ghi nhớ — đã xong', '#flashcard'],
    ])
    expect(within(buoc('ap-dung')).getByRole('link').getAttribute('aria-current')).toBe('step')
    await expectNoAxeViolations(container)
  })

  it('gõ Nói lại → bước Hiểu xong NGAY (chưa lưu); xoá hết chữ → về chưa làm', async () => {
    dungVoiProvider(
      <>
        <Dau cauHoiKhoa={['k1']} />
        <NoiLai id="noi-lai-bang-loi-cua-ban" tieuDe="Nói lại bằng lời của bạn" muc={sc} />
      </>,
    )
    await choTai()
    const o = screen.getByRole('textbox', {
      name: 'Nói lại bằng lời của bạn',
    }) as HTMLTextAreaElement
    await waitFor(() => expect(o.disabled).toBe(false))
    expect(buoc('hieu').getAttribute('data-tinh-trang')).toBe('chua-lam')
    fireEvent.focus(o)
    fireEvent.change(o, { target: { value: 'Một câu' } })
    await waitFor(() => expect(buoc('hieu').getAttribute('data-tinh-trang')).toBe('xong'))
    expect(sv.hoc.dem(`PUT /api/hoc/${encodeURIComponent(ID)}/noi-lai`)).toBe(0)
    fireEvent.change(o, { target: { value: '   ' } })
    await waitFor(() => expect(buoc('hieu').getAttribute('data-tinh-trang')).toBe('chua-lam'))
    expect(sv.hoc.dem(`PUT /api/hoc/${encodeURIComponent(ID)}/noi-lai`)).toBe(0)
  })

  it('D8: bài không có câu hỏi ([]) → "Kiểm tra · Không áp dụng · chưa có câu hỏi", không bấm được', async () => {
    dungVoiProvider(<Dau cauHoiKhoa={[]} />)
    await choTai()
    await waitFor(() =>
      expect(buoc('kiem-tra').textContent).toBe('Kiểm tra · Không áp dụng · chưa có câu hỏi'),
    )
    expect(buoc('kiem-tra').querySelector('a')).toBeNull()
  })

  it('chưa biết câu hỏi (bài đang tải / lỗi đọc file): Kiểm tra "chưa làm", vẫn là link', async () => {
    sv.hoc.mucCua(ID).tuKiemTra.k1 = { traLoi: 'a', daXem: true, cham: 'dung', chamLuc: null }
    dungVoiProvider(<Dau cauHoiKhoa={null} />)
    await choTai()
    await waitFor(() => expect(buoc('kiem-tra').getAttribute('data-tinh-trang')).toBe('chua-lam'))
    expect(buoc('kiem-tra').textContent).toBe('Kiểm tra — chưa làm')
    expect(buoc('kiem-tra').querySelector('a')).not.toBeNull()
  })

  it('không đọc được dữ liệu học: "Lỗi: không đọc được tiến độ bước — Thử lại"; Thử lại tải được thì có thanh', async () => {
    sv.hoc.loiTai = 1
    dungVoiProvider(<Dau cauHoiKhoa={['k1']} />)
    const loi = await screen.findByText(/Lỗi: không đọc được tiến độ bước/)
    fireEvent.click(within(loi.closest('p')!).getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('navigation', { name: 'Bốn bước học' })).toBeTruthy()
  })
})

describe('lý do Bỏ qua (đề xuất 3.1, F02 "Bỏ qua kèm lý do (tuỳ chọn)")', () => {
  const dongLyDo = () => document.querySelector('[data-ly-do-bo-qua]') as HTMLElement | null
  const muc2 = cay.mucHoc[1].id
  const muc3 = cay.mucHoc[2].id
  const muc4 = cay.mucHoc[3].id

  it('chỉ hiện khi đang Bỏ qua: "Chưa ghi lý do bỏ qua." + nút; dialog gợi ý lý do đã dùng (dùng nhiều trước); Lưu → PUT kèm lý do', async () => {
    sv.bai.trangThai[ID] = { status: 'skip' }
    sv.bai.trangThai[muc2] = { status: 'skip', lyDoBoQua: 'Lý do B' }
    sv.bai.trangThai[muc3] = { status: 'skip', lyDoBoQua: 'Lý do A' }
    sv.bai.trangThai[muc4] = { status: 'skip', lyDoBoQua: 'Lý do B' }
    const { container } = dungVoiProvider(<Dau cauHoiKhoa={['k1']} />)
    await waitFor(() => expect(dongLyDo()).not.toBeNull())
    expect(dongLyDo()!.textContent).toBe('Chưa ghi lý do bỏ qua.Ghi lý do (tuỳ chọn)')
    await expectNoAxeViolations(container)
    const nut = within(dongLyDo()!).getByRole('button', { name: 'Ghi lý do (tuỳ chọn)' })
    nut.focus()
    fireEvent.click(nut)
    const dialog = await screen.findByRole('dialog', { name: 'Lý do bỏ qua' })
    expect(dialog.textContent).toContain(`${sc.label} · Chủ đề`)
    const o = within(dialog).getByRole('textbox', { name: /Lý do/ }) as HTMLInputElement
    await waitFor(() => expect(document.activeElement).toBe(o))
    const goiY = within(dialog).getByRole('group', { name: 'Lý do đã dùng' })
    expect(
      within(goiY)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Lý do B', 'Lý do A'])
    await expectNoAxeViolations(dialog)
    fireEvent.click(within(goiY).getByRole('button', { name: 'Lý do A' }))
    expect(o.value).toBe('Lý do A')
    expect(document.activeElement).toBe(o)
    fireEvent.keyDown(o, { key: 'Enter' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() =>
      expect(sv.bai.trangThai[ID]).toEqual({ status: 'skip', lyDoBoQua: 'Lý do A' }),
    )
    const put = sv.bai.yeuCau.filter((y) => y.method === 'PUT').at(-1)!
    expect(put.body).toEqual({ trangThai: 'bo-qua', lyDo: 'Lý do A', via: 'mot-muc' })
    expect(dongLyDo()!.textContent).toBe('Lý do: "Lý do A"Sửa lý do')
    // Cùng một nút, chữ đổi: focus không mất
    await waitFor(() => expect(document.activeElement).toBe(nut))
    expect(nut.textContent).toBe('Sửa lý do')
  })

  it('Sửa lý do: ô điền sẵn; để trống + Lưu → bỏ lý do; Huỷ không gửi gì', async () => {
    sv.bai.trangThai[ID] = { status: 'skip', lyDoBoQua: 'Lý do cũ' }
    dungVoiProvider(<Dau cauHoiKhoa={['k1']} />)
    await waitFor(() => expect(dongLyDo()?.textContent).toBe('Lý do: "Lý do cũ"Sửa lý do'))
    fireEvent.click(within(dongLyDo()!).getByRole('button', { name: 'Sửa lý do' }))
    let dialog = await screen.findByRole('dialog', { name: 'Lý do bỏ qua' })
    expect((within(dialog).getByRole('textbox') as HTMLInputElement).value).toBe('Lý do cũ')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(sv.bai.yeuCau.some((y) => y.method === 'PUT')).toBe(false)
    fireEvent.click(within(dongLyDo()!).getByRole('button', { name: 'Sửa lý do' }))
    dialog = await screen.findByRole('dialog', { name: 'Lý do bỏ qua' })
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: '  ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(sv.bai.trangThai[ID]).toEqual({ status: 'skip' }))
    expect(dongLyDo()!.textContent).toBe('Chưa ghi lý do bỏ qua.Ghi lý do (tuỳ chọn)')
  })

  it('hồi quy: chỉ sửa lý do → toast "Đã lưu lý do bỏ qua: <tên>" (không phải "Đã chuyển … sang Bỏ qua"); Hoàn tác trả lý do cũ', async () => {
    sv.bai.trangThai[ID] = { status: 'skip', lyDoBoQua: 'Lý do cũ' }
    dungVoiProvider(<Dau cauHoiKhoa={['k1']} />)
    await waitFor(() => expect(dongLyDo()?.textContent).toBe('Lý do: "Lý do cũ"Sửa lý do'))
    fireEvent.click(within(dongLyDo()!).getByRole('button', { name: 'Sửa lý do' }))
    const dialog = await screen.findByRole('dialog', { name: 'Lý do bỏ qua' })
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Lý do mới' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
    const vung = screen.getByRole('status', { name: 'Thông báo' })
    await waitFor(() => expect(vung.textContent).toContain(`Đã lưu lý do bỏ qua: ${sc.label}`))
    expect(vung.textContent).not.toContain('Đã chuyển')
    fireEvent.click(within(vung).getByRole('button', { name: 'Hoàn tác' }))
    await waitFor(() =>
      expect(sv.bai.trangThai[ID]).toEqual({ status: 'skip', lyDoBoQua: 'Lý do cũ' }),
    )
  })

  it('hồi quy: focus ở "Sửa lý do" rồi bấm phím 2 (Đang học) → dòng lý do mất, focus về đoạn đang chọn của segmented (không rơi về body)', async () => {
    sv.bai.trangThai[ID] = { status: 'skip', lyDoBoQua: 'Lý do cũ' }
    /** Phím 2 như trang bài (TrangBaiHoc): đặt Đang học, focus không đổi. */
    function DauCoPhim() {
      const { dat } = useDatTrangThai()
      usePhimTat('Digit2', () => dat(ID, 'dang-hoc'))
      return <Dau cauHoiKhoa={['k1']} />
    }
    dungVoiProvider(<DauCoPhim />)
    await waitFor(() => expect(dongLyDo()).not.toBeNull())
    const sua = within(dongLyDo()!).getByRole('button', { name: 'Sửa lý do' })
    sua.focus()
    fireEvent.keyDown(sua, { key: '2', code: 'Digit2' })
    await waitFor(() => expect(dongLyDo()).toBeNull())
    const dangHoc = screen.getByRole('radio', { name: /Đang học/ })
    await waitFor(() => expect(document.activeElement).toBe(dangHoc))
    expect(dangHoc.getAttribute('aria-checked')).toBe('true')
  })

  it('không hiện khi mục không Bỏ qua', async () => {
    sv.bai.trangThai[ID] = { status: 'learning' }
    dungVoiProvider(<Dau cauHoiKhoa={['k1']} />)
    await waitFor(() => expect(sv.bai.dem('GET /api/state')).toBeGreaterThan(0))
    await new Promise((r) => setTimeout(r, 30))
    expect(dongLyDo()).toBeNull()
  })

  it('lyDoDaDung: chỉ mục Bỏ qua có lý do, trừ lý do đang có, dùng nhiều trước rồi theo chữ cái, tối đa 5', () => {
    const anhChup = {
      revision: 1,
      luotMo: {},
      trangThai: {
        a: { status: 'skip' as const, lyDoBoQua: 'Z' },
        b: { status: 'skip' as const, lyDoBoQua: 'B' },
        c: { status: 'skip' as const, lyDoBoQua: 'Z' },
        d: { status: 'skip' as const, lyDoBoQua: 'A' },
        e: { status: 'done' as const },
        f: { status: 'skip' as const, lyDoBoQua: 'C' },
        g: { status: 'skip' as const, lyDoBoQua: 'D' },
        h: { status: 'skip' as const, lyDoBoQua: 'E' },
        i: { status: 'skip' as const, lyDoBoQua: 'F' },
      },
    }
    expect(lyDoDaDung(anhChup)).toEqual(['Z', 'A', 'B', 'C', 'D'])
    expect(lyDoDaDung(anhChup, 'Z')).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(lyDoDaDung(undefined)).toEqual([])
  })
})

describe('propsTuKetQua (C10 từ shared/domain/bon-buoc.ts)', () => {
  it('tình trạng, ghi chú D8 của Kiểm tra, bước không bấm được', () => {
    const khong = propsTuKetQua(
      tinhBonBuoc({ mau: 'chu-de', cauHoiKhoa: [], hoc: DU_LIEU_BON_BUOC_TRONG }),
    )
    expect(khong).toEqual({
      tinhTrang: {
        hieu: 'chua-lam',
        'ap-dung': 'chua-lam',
        'kiem-tra': 'khong-ap-dung',
        'ghi-nho': 'chua-lam',
      },
      ghiChu: { 'kiem-tra': 'Không áp dụng · chưa có câu hỏi' },
      voHieu: ['kiem-tra'],
    })
    const co = propsTuKetQua(
      tinhBonBuoc({ mau: 'chu-de', cauHoiKhoa: ['k'], hoc: DU_LIEU_BON_BUOC_TRONG }),
    )
    expect(co.ghiChu).toEqual({})
    expect(co.voHieu).toEqual([])
  })
})
