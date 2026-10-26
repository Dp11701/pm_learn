// @vitest-environment jsdom
// Trang Nội dung /noi-dung, tab Nhập (phase 2b; F21/F22; đề xuất 1.6, 1.7, 3.8; D21) trên máy chủ giả theo hợp đồng
// nhập: tab + URL, lô F22 (đủ 5 loại + ✕, "Nhập 13 file"), Gán cho mục…, file trùng, ◎, link trình soạn, nhập +
// Hoàn tác, Quét lại (nhập thẳng / có bảng / không có gì), "Có n file chưa nhận", ?muc= gán sẵn, giới hạn
// phía trình duyệt, lô hết hạn (410), lỗi kiểm tra, axe.
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PhanHoiKiemTra } from '../../../src/app/du-lieu/nhap'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import {
  cay,
  dong,
  fileMd,
  loF22,
  muc,
  mucNgan,
  SLUG_HOP_LE,
  tepEntry,
  thuMucEntry,
} from '../../components/nhap/ho-tro'
import { moTrang, taoMayChu, type MayChuNhap } from './moi-truong'

const ketNoi = vi.hoisted(() => ({
  meta: null as unknown,
  thuNgay: vi.fn(async () => {}),
}))

vi.mock('../../../src/app/ket-noi', async (goc) => {
  const thuc = await goc<typeof import('../../../src/app/ket-noi')>()
  return {
    ...thuc,
    useKetNoi: () => ({
      trangThai: 'on-dinh',
      meta: ketNoi.meta,
      thuNgay: ketNoi.thuNgay,
      dangThu: false,
    }),
  }
})

let sv: MayChuNhap

beforeEach(() => {
  sv = taoMayChu()
  ketNoi.meta = null
  ketNoi.thuNgay.mockClear()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.title = ''
})

const duongDan = () => screen.getAllByTestId('duong-dan').at(-1)!.textContent
const vung = () => screen.getByRole('group', { name: /Kéo thả file|Thả để|Đang|Chỉ nhận|Không/ })
const trangThai = () =>
  screen
    .getAllByRole('status')
    .find((el) => el.tagName === 'P' && el.classList.contains('sr-only'))!
const nutNhap = () => screen.getByRole('button', { name: /^(Nhập \d+ file|Giữ \d+ bản cũ)/ })
const hangCua = (ten: string) => screen.getByRole('rowheader', { name: ten }).closest('tr')!
/** Chữ của ô, bỏ nhãn cột chỉ hiện ở thẻ hàng < 768 ("Mục:", "Khớp theo:"). */
function chuO(o: HTMLElement): string {
  const ban = o.cloneNode(true) as HTMLElement
  for (const nhan of ban.querySelectorAll('[data-nhan-cot]')) nhan.remove()
  return ban.textContent ?? ''
}

/** Thả các entry (file / thư mục) vào vùng thả. */
function tha(entries: FileSystemEntry[]) {
  fireEvent.drop(vung(), {
    dataTransfer: {
      types: ['Files'],
      items: entries.map((e) => ({ kind: 'file', type: '', webkitGetAsEntry: () => e })),
      files: [],
    },
  })
}

/** 15 file của F22 trong một thư mục được thả. */
function entriesF22() {
  const ds = loF22().ketQua.map((kq) => {
    const slug = kq.muc!.slug
    const noiDung =
      kq.ten === 'vuca.md'
        ? '---\nloai chu-de\n---\n'
        : kq.ten === 'risk-registr.md'
          ? '---\nloai: tai-lieu\n---\n'
          : fileMd(slug)
    return tepEntry(`lo/${kq.ten}`, noiDung)
  })
  return [thuMucEntry('lo', ds, 6)]
}

function datKiemTra(kt: PhanHoiKiemTra | ((body: unknown) => PhanHoiKiemTra)) {
  sv.traLoi.set('POST /api/nhap/kiem-tra', (body) => ({
    data: typeof kt === 'function' ? kt(body) : kt,
  }))
}

async function thaF22() {
  datKiemTra(loF22())
  sv.trangThaiNoiDung = {
    [muc('scope-creep').id]: { loai: 'da-duyet', ngayDuyet: '2026-10-18' },
  }
  const kq = moTrang('/noi-dung?tab=nhap')
  tha(entriesF22())
  await screen.findByRole('table')
  return kq
}

describe('trang và tab (F21, F22)', () => {
  it('không có ?tab= → Nhập; H1, title, dòng đếm theo trạng thái nội dung, "Chờ duyệt (n)"', async () => {
    sv.trangThaiNoiDung = {
      [muc('scope-creep').id]: { loai: 'da-duyet', ngayDuyet: '2026-10-18' },
      [muc('pestle').id]: { loai: 'ban-nhap', nguon: 'ai' },
      [muc('bani').id]: { loai: 'ban-nhap', nguon: 'tu-viet' },
    }
    moTrang('/noi-dung')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Nội dung')
    expect(document.title).toBe('Nội dung · Học PM A–Z')
    expect(screen.getByRole('tab', { name: 'Nhập' }).getAttribute('aria-selected')).toBe('true')
    expect(
      await screen.findByText(
        `1 Đã duyệt · 2 Bản nháp · ${cay.soMucHoc - 3} Chưa có · ${cay.soMucHoc} mục`,
      ),
    ).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Chờ duyệt (2)' })).toBeTruthy()
    expect(screen.getByRole('tabpanel', { name: 'Nhập' })).toBeTruthy()
  })

  it('roving tabindex: ←/→/Home/End đổi tab, chuyển focus, URL ?tab= (giữ ?muc=); Độ phủ, Chờ duyệt là "Có ở phase 7a"', async () => {
    moTrang('/noi-dung?tab=nhap&muc=pestle')
    const nhap = screen.getByRole('tab', { name: 'Nhập' })
    expect(nhap.tabIndex).toBe(0)
    expect(screen.getByRole('tab', { name: 'Độ phủ' }).tabIndex).toBe(-1)
    nhap.focus()
    fireEvent.keyDown(nhap, { key: 'ArrowLeft' })
    const choDuyet = screen.getByRole('tab', { name: /^Chờ duyệt/ })
    expect(choDuyet.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(choDuyet)
    expect(duongDan()).toBe('/noi-dung?tab=cho-duyet&muc=pestle')
    expect(screen.getByText('Có ở phase 7a', { exact: false })).toBeTruthy()
    fireEvent.keyDown(choDuyet, { key: 'Home' })
    expect(duongDan()).toBe('/noi-dung?tab=do-phu&muc=pestle')
    const panel = screen.getByRole('tabpanel', { name: 'Độ phủ' })
    expect(within(panel).getByRole('link', { name: 'Nhập file .md' }).getAttribute('href')).toBe(
      '/noi-dung?tab=nhap',
    )
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Độ phủ' }), { key: 'End' })
    expect(screen.getByRole('tab', { name: 'Nhập' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Nhập' }), { key: 'ArrowRight' })
    expect(duongDan()).toBe('/noi-dung?tab=do-phu&muc=pestle')
    await expectNoAxeViolations(screen.getByRole('main'))
  })
})

describe('lô F22: bảng kết quả', () => {
  it('gửi 15 file kèm đường dẫn trong thư mục; đủ loại, cột, tóm tắt, "Nhập 13 file"; vùng status báo kết quả; axe', async () => {
    const { container } = await thaF22()
    const [gui] = sv.goi('POST /api/nhap/kiem-tra')
    const body = gui.body as { files: { ten: string; noiDung: string; duongDan?: string }[] }
    expect(body.files).toHaveLength(15)
    expect(body.files[0]).toEqual({
      ten: 'pestle.md',
      noiDung: fileMd('pestle'),
      duongDan: 'lo/pestle.md',
    })
    expect('mucMacDinh' in (gui.body as object)).toBe(false)

    expect(screen.getByRole('heading', { name: 'Kiểm tra trước khi nhập · 15 file' })).toBeTruthy()
    const bang = screen.getByRole('table', { name: 'Kiểm tra trước khi nhập · 15 file' })
    expect(
      within(bang)
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual(['File', 'Mục', 'Khớp theo', 'Kết quả'])
    expect(within(bang).getAllByRole('row')).toHaveLength(16)

    // ✓ Hợp lệ: màu chữ thường + glyph (D21), không màu Đã xong; tên mục đầy đủ lang=en.
    const pestle = hangCua('pestle.md')
    const nhanHopLe = within(pestle).getByText('Hợp lệ')
    expect(nhanHopLe.className).toContain('text-text')
    expect(nhanHopLe.className).not.toMatch(/st-done|danger/)
    expect(nhanHopLe.querySelector('[aria-hidden="true"]')?.textContent).toBe('✓')
    expect(within(pestle).getByText(muc('pestle').label).getAttribute('lang')).toBe('en')
    expect(chuO(within(pestle).getAllByRole('cell')[1])).toBe('id')
    for (const s of SLUG_HOP_LE) expect(within(hangCua(`${s}.md`)).getByText('Hợp lệ')).toBeTruthy()

    const ra = hangCua('risk-appetite.md')
    expect(within(ra).getByText('Thiếu khối bắt buộc')).toBeTruthy()
    expect(within(ra).getByText('Thiếu: Tự kiểm tra, Tham khảo · vẫn nhập được')).toBeTruthy()

    const rr = hangCua('risk-registr.md')
    expect(within(rr).getByText('Không khớp mục')).toBeTruthy()
    expect(chuO(within(rr).getAllByRole('cell')[0])).toBe(muc('risk-register').label)
    expect(chuO(within(rr).getAllByRole('cell')[1])).toBe('tên file')
    expect(within(rr).getByText(/Gợi ý:/).textContent).toBe(`Gợi ý: ${muc('risk-register').label}`)
    expect(within(rr).getByRole('button', { name: 'Gán cho mục…' })).toBeTruthy()

    const sc = hangCua('scope-creep.md')
    expect(within(sc).getByText('Trùng bản đã duyệt')).toBeTruthy()
    expect(await within(sc).findByText('Bản hiện tại duyệt 18/10/2026')).toBeTruthy()
    const nhom = within(sc).getByRole('radiogroup', { name: 'Xử lý file trùng' })
    expect(within(nhom).getByRole('radio', { name: 'Giữ bản cũ' })).toHaveProperty('checked', true)

    const vuca = hangCua('vuca.md')
    const nhanLoi = within(vuca).getByText('Lỗi frontmatter')
    expect(nhanLoi.className).toContain('text-danger')
    expect(within(vuca).getByText('Dòng 3: thiếu dấu ":" sau loai')).toBeTruthy()
    expect(chuO(within(vuca).getAllByRole('cell')[1])).toBe('tên file')
    expect(
      within(vuca).getByRole('link', { name: 'Mở trong trình soạn' }).getAttribute('href'),
    ).toBe(`/hoc/vuca/soan?bo-dem=${encodeURIComponent('nhap:tok-f22:14')}`)

    expect(screen.getByText('11 hợp lệ').tagName).toBe('STRONG')
    expect(screen.getByText('11 hợp lệ').parentElement!.textContent).toBe(
      '11 hợp lệ · 2 cảnh báo · 1 trùng · 1 lỗi',
    )
    expect(screen.getByText('File trùng chỉ nhập khi chọn "Nhập thành bản sửa"')).toBeTruthy()
    expect(nutNhap().textContent).toBe('Nhập 13 file')
    expect(trangThai().textContent).toBe(
      'Kiểm tra xong 15 file: 11 hợp lệ · 2 cảnh báo · 1 trùng · 1 lỗi.',
    )
    expect(screen.getByRole('region', { name: 'Kết quả kiểm tra, cuộn ngang' }).tabIndex).toBe(0)
    await expectNoAxeViolations(container)
  })

  it('"Nhập thành bản sửa" → "Nhập 14 file"; chọn lại "Giữ bản cũ" → 13', async () => {
    await thaF22()
    const sc = hangCua('scope-creep.md')
    fireEvent.click(within(sc).getByRole('radio', { name: 'Nhập thành bản sửa' }))
    expect(nutNhap().textContent).toBe('Nhập 14 file')
    fireEvent.click(within(sc).getByRole('radio', { name: 'Giữ bản cũ' }))
    expect(nutNhap().textContent).toBe('Nhập 13 file')
  })

  it('nhập: gửi lựa chọn, toast "Đã nhập 13 file" + Hoàn tác, bảng xoá, focus "Vừa nhập"; Hoàn tác → hoan-tac, focus "Chọn file…"', async () => {
    await thaF22()
    sv.traLoi.set('POST /api/nhap/thuc-hien', () => ({
      data: {
        daNhap: [
          { chiSo: 0, mucId: muc('pestle').id, duongDan: 'project-management/x/pestle.md' },
          {
            chiSo: 12,
            mucId: muc('risk-register').id,
            duongDan: 'project-management/y/risk-register.md',
          },
        ],
        fileOp: 7,
        revision: 12,
      },
    }))
    sv.traLoi.set('POST /api/nhap/hoan-tac', () => ({ data: { revision: 13 } }))
    fireEvent.click(nutNhap())
    await screen.findByText('Đã nhập 2 file')
    expect(sv.goi('POST /api/nhap/thuc-hien')[0].body).toEqual({
      token: 'tok-f22',
      gan: { 12: muc('risk-register').id },
      xuLyTrung: { 13: 'giu-ban-cu' },
      nhanDaDuyet: [],
    })
    expect(screen.queryByRole('table')).toBeNull()
    const vuaNhap = screen.getByRole('heading', { name: 'Vừa nhập' })
    await waitFor(() => expect(document.activeElement).toBe(vuaNhap))
    expect(
      screen.getByRole('link', { name: muc('risk-register').label }).getAttribute('href'),
    ).toBe('/hoc/risk-register')
    expect(ketNoi.thuNgay).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    await screen.findByText('Đã hoàn tác: 2 file trở lại như trước khi nhập')
    expect(sv.goi('POST /api/nhap/hoan-tac')[0].body).toEqual({ fileOp: 7 })
    expect(screen.queryByRole('heading', { name: 'Vừa nhập' })).toBeNull()
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Chọn file…' })),
    )
  })

  it('lô hết hạn (410): banner câu của server + "Kiểm tra lại" gửi lại đúng các file, giữ lựa chọn', async () => {
    await thaF22()
    sv.traLoi.set('POST /api/nhap/thuc-hien', () => ({
      status: 410,
      data: { loi: 'Lô kiểm tra đã quá 30 phút — hãy kiểm tra lại.' },
    }))
    fireEvent.click(
      within(hangCua('scope-creep.md')).getByRole('radio', { name: 'Nhập thành bản sửa' }),
    )
    fireEvent.click(nutNhap())
    const banner = await screen.findByRole('alert')
    expect(banner.textContent).toContain('Lô kiểm tra đã quá 30 phút — hãy kiểm tra lại.')
    datKiemTra(loF22('tok-moi'))
    fireEvent.click(within(banner).getByRole('button', { name: 'Kiểm tra lại' }))
    await waitFor(() => expect(sv.goi('POST /api/nhap/kiem-tra')).toHaveLength(2))
    expect(sv.goi('POST /api/nhap/kiem-tra')[1].body).toEqual(
      sv.goi('POST /api/nhap/kiem-tra')[0].body,
    )
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(nutNhap().textContent).toBe('Nhập 14 file')
  })

  it('lỗi nhập khác: toast lỗi + Thử lại, bảng giữ nguyên', async () => {
    await thaF22()
    sv.traLoi.set('POST /api/nhap/thuc-hien', () => ({
      status: 409,
      data: { loi: 'File đã đổi.' },
    }))
    fireEvent.click(nutNhap())
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Không nhập được: File đã đổi.',
    )
    expect(screen.getByRole('table')).toBeTruthy()
  })
})

describe('Gán cho mục…, ◎', () => {
  it('Không khớp mục chưa gán: không đếm; gán qua dialog → Mục, "bạn gán", "Nhập 1 file", focus về nút', async () => {
    datKiemTra({
      token: 't1',
      ketQua: [
        dong({
          chiSo: 0,
          ten: 'rui-ro.md',
          loai: 'khong-khop',
          ungVien: [{ ...mucNgan('risk-register'), diem: 0.64 }],
        }),
      ],
      tomTat: { hopLe: 0, canhBao: 1, trung: 0, loi: 0 },
      soNhapDuoc: 0,
    })
    moTrang('/noi-dung?tab=nhap')
    tha([tepEntry('rui-ro.md', '---\nloai: tai-lieu\n---\n')])
    const hang = hangCua(await screen.findByText('rui-ro.md').then((el) => el.textContent!))
    expect(chuO(within(hang).getAllByRole('cell')[0])).toBe('—Chưa gán mục')
    expect(within(hang).getByText(/Gợi ý:/).textContent).toBe(
      `Gợi ý: ${muc('risk-register').label}`,
    )
    expect(nutNhap()).toHaveProperty('disabled', true)
    expect(nutNhap().textContent).toBe('Nhập 0 file')

    const nutGan = within(hang).getByRole('button', { name: 'Gán cho mục…' })
    nutGan.focus()
    fireEvent.click(nutGan)
    const o = await screen.findByRole('combobox', { name: 'Tìm mục để gán' })
    fireEvent.keyDown(o, { key: 'ArrowDown' })
    fireEvent.keyDown(o, { key: 'Enter' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(chuO(within(hang).getAllByRole('cell')[0])).toBe(muc('risk-register').label)
    expect(chuO(within(hang).getAllByRole('cell')[1])).toBe('bạn gán')
    expect(nutNhap().textContent).toBe('Nhập 1 file')
    await waitFor(() => expect(document.activeElement).toBe(nutGan))

    sv.traLoi.set('POST /api/nhap/thuc-hien', () => ({
      data: {
        daNhap: [{ chiSo: 0, mucId: muc('risk-register').id, duongDan: 'x.md' }],
        fileOp: 1,
        revision: 2,
      },
    }))
    fireEvent.click(nutNhap())
    await screen.findByText('Đã nhập 1 file')
    expect(sv.goi('POST /api/nhap/thuc-hien')[0].body).toMatchObject({
      gan: { 0: muc('risk-register').id },
    })
  })

  it('◎: mặc định không tick; tick từng dòng / cả nhóm → đếm, gửi nhanDaDuyet', async () => {
    datKiemTra({
      token: 't2',
      ketQua: [
        dong({
          chiSo: 0,
          ten: 'pestle.md',
          loai: 'chua-chup',
          muc: mucNgan('pestle'),
          chuyenVeBanNhap: true,
        }),
        dong({
          chiSo: 1,
          ten: 'bani.md',
          loai: 'chua-chup',
          muc: mucNgan('bani'),
          chuyenVeBanNhap: true,
        }),
      ],
      tomTat: { hopLe: 0, canhBao: 2, trung: 0, loi: 0 },
      soNhapDuoc: 0,
    })
    moTrang('/noi-dung?tab=nhap')
    tha([tepEntry('pestle.md', fileMd('pestle')), tepEntry('bani.md', fileMd('bani'))])
    await screen.findByRole('table')
    expect(screen.getAllByText('Đã duyệt nhưng app chưa có bản chụp')).toHaveLength(2)
    expect(screen.queryByText('Đã chuyển về Bản nháp')).toBeNull()
    const tick = within(hangCua('pestle.md')).getByRole('checkbox', { name: 'Nhận là Đã duyệt' })
    expect(tick).toHaveProperty('checked', false)
    expect(nutNhap().textContent).toBe('Nhập 0 file')
    fireEvent.click(tick)
    expect(nutNhap().textContent).toBe('Nhập 1 file')
    const tatCa = screen.getByRole('checkbox', { name: 'Nhận là Đã duyệt cả 2 file ◎' })
    expect(tatCa).toHaveProperty('indeterminate', true)
    fireEvent.click(tatCa)
    expect(nutNhap().textContent).toBe('Nhập 2 file')
    sv.traLoi.set('POST /api/nhap/thuc-hien', () => ({
      data: { daNhap: [], fileOp: 3, revision: 4 },
    }))
    fireEvent.click(nutNhap())
    await waitFor(() => expect(sv.goi('POST /api/nhap/thuc-hien')).toHaveLength(1))
    expect(sv.goi('POST /api/nhap/thuc-hien')[0].body).toMatchObject({ nhanDaDuyet: [0, 1] })
  })
})

describe('Quét lại', () => {
  it('nhập thẳng: toast "Đã nhập n file" + Hoàn tác (đảo đúng fileOp), không có bảng', async () => {
    sv.traLoi.set('POST /api/nhap/quet-lai', () => ({
      data: { daNhap: 3, fileOp: 9, kiemTra: null, chuaNhan: 0 },
    }))
    sv.traLoi.set('POST /api/nhap/hoan-tac', () => ({ data: { revision: 5 } }))
    moTrang('/noi-dung?tab=nhap')
    fireEvent.click(screen.getByRole('button', { name: 'Quét lại thư mục' }))
    await screen.findByText('Đã nhập 3 file')
    expect(screen.queryByRole('table')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    await screen.findByText('Đã hoàn tác: 3 file trở lại như trước khi nhập')
    expect(sv.goi('POST /api/nhap/hoan-tac')[0].body).toEqual({ fileOp: 9 })
  })

  it('có file cần quyết: hiện bảng; ⟳ "Giữ bản cũ" là việc phải làm → thuc-hien + giu-ban-cu', async () => {
    const sc = mucNgan('scope-creep')
    sv.traLoi.set('POST /api/nhap/quet-lai', () => ({
      data: {
        daNhap: 2,
        fileOp: 4,
        chuaNhan: 0,
        kiemTra: {
          token: 'q1',
          ketQua: [
            dong({
              chiSo: 0,
              ten: 'scope-creep.md',
              loai: 'trung-da-duyet',
              muc: sc,
              ghiChu: 'Bản hiện tại duyệt 18/10/2026',
            }),
            dong({ chiSo: 1, ten: 'x.md', loai: 'khong-khop', muc: mucNgan('bani'), ganSan: true }),
          ],
          tomTat: { hopLe: 0, canhBao: 1, trung: 1, loi: 0 },
          soNhapDuoc: 1,
        },
      },
    }))
    sv.traLoi.set('POST /api/nhap/thuc-hien', () => ({
      data: {
        daNhap: [{ chiSo: 1, mucId: muc('bani').id, duongDan: 'b.md' }],
        fileOp: 5,
        revision: 6,
      },
    }))
    sv.traLoi.set(`POST /api/noi-dung/giu-ban-cu/${encodeURIComponent(sc.id)}`, () => ({
      data: { revision: 7 },
    }))
    moTrang('/noi-dung?tab=nhap')
    fireEvent.click(screen.getByRole('button', { name: 'Quét lại thư mục' }))
    await screen.findByText('Đã nhập 2 file')
    await screen.findByRole('table')
    expect(screen.getByText('Ghi lại bản đã duyệt; bản sửa ngoài app vào thùng rác')).toBeTruthy()
    expect(nutNhap().textContent).toBe('Nhập 1 file · giữ 1 bản cũ')
    expect(chuO(within(hangCua('scope-creep.md')).getAllByRole('cell')[1])).toBe('tên file')
    fireEvent.click(nutNhap())
    await screen.findByText('Đã giữ 1 bản cũ')
    expect(sv.goi('POST /api/nhap/thuc-hien')[0].body).toMatchObject({
      token: 'q1',
      xuLyTrung: { 0: 'giu-ban-cu' },
      gan: { 1: muc('bani').id },
    })
    expect(sv.goi(`POST /api/noi-dung/giu-ban-cu/${encodeURIComponent(sc.id)}`)).toHaveLength(1)
  })

  it('không có gì: toast; "Có n file chưa nhận — Quét lại" theo /api/meta', async () => {
    ketNoi.meta = {
      revision: 1,
      now: '2026-10-26T08:00:00.000Z',
      homNay: '2026-10-26',
      soMucHoc: cay.soMucHoc,
      noiDung: { revision: 3, chuaNhan: 2 },
    }
    sv.traLoi.set('POST /api/nhap/quet-lai', () => ({
      data: { daNhap: 0, fileOp: null, kiemTra: null, chuaNhan: 0 },
    }))
    moTrang('/noi-dung?tab=nhap')
    const banner = screen.getByText('Có 2 file chưa nhận').closest('[role="status"]')!
    fireEvent.click(within(banner as HTMLElement).getByRole('button', { name: 'Quét lại' }))
    await screen.findByText('Quét lại xong: không có file nào cần nhập.')
    expect(sv.goi('POST /api/nhap/quet-lai')).toHaveLength(1)
    expect(ketNoi.thuNgay).toHaveBeenCalled()
  })

  it('lỗi: toast lỗi + Thử lại', async () => {
    sv.traLoi.set('POST /api/nhap/quet-lai', () => ({
      status: 500,
      data: { loi: 'Thư mục nội dung có hơn 2.000 file.' },
    }))
    moTrang('/noi-dung?tab=nhap')
    fireEvent.click(screen.getByRole('button', { name: 'Quét lại thư mục' }))
    const loi = await screen.findByRole('alert')
    expect(loi.textContent).toContain('Không quét lại được: Thư mục nội dung có hơn 2.000 file.')
    expect(within(loi).getByRole('button', { name: 'Thử lại' })).toBeTruthy()
  })
})

describe('Quét lại: ⟳ theo chỗ của file (review phase 2b)', () => {
  const sc = mucNgan('scope-creep')
  const duongGiu = `POST /api/noi-dung/giu-ban-cu/${encodeURIComponent(sc.id)}`

  function quetRa(ketQua: ReturnType<typeof dong>[]) {
    sv.traLoi.set('POST /api/nhap/quet-lai', () => ({
      data: {
        daNhap: 0,
        fileOp: null,
        chuaNhan: ketQua.length,
        kiemTra: {
          token: 'q9',
          ketQua,
          tomTat: { hopLe: 0, canhBao: 0, trung: ketQua.length, loi: 0 },
          soNhapDuoc: 0,
        },
      },
    }))
    sv.traLoi.set(duongGiu, () => ({ data: { revision: 11 } }))
  }

  async function quet() {
    moTrang('/noi-dung?tab=nhap')
    fireEvent.click(screen.getByRole('button', { name: 'Quét lại thư mục' }))
    await screen.findByRole('table')
  }

  /** Bản sửa Claude ghi ở gốc thư mục (không phải file đã nhận <slug>.md): server khớp theo id. */
  const banChep = dong({
    chiSo: 0,
    ten: 'scope-creep.md',
    loai: 'trung-da-duyet',
    muc: sc,
    ghiChu: 'Bản hiện tại duyệt 18/10/2026',
    khopTheo: 'id',
    duongDan: 'scope-creep.md',
  })

  it('bản chép lạc chỗ, "Giữ 1 bản cũ" dù 0 file nhập → vẫn gọi thuc-hien (bỏ bản chép vào thùng rác) rồi giu-ban-cu; không "Đã nhập 0 file"', async () => {
    quetRa([banChep])
    sv.traLoi.set('POST /api/nhap/thuc-hien', () => ({
      data: { daNhap: [], fileOp: 8, revision: 10 },
    }))
    await quet()
    expect(chuO(within(hangCua('scope-creep.md')).getAllByRole('cell')[1])).toBe('id')
    expect(nutNhap().textContent).toBe('Giữ 1 bản cũ')
    fireEvent.click(nutNhap())
    await screen.findByText('Đã giữ 1 bản cũ')
    expect(sv.goi('POST /api/nhap/thuc-hien')).toHaveLength(1)
    expect(sv.goi('POST /api/nhap/thuc-hien')[0].body).toEqual({
      token: 'q9',
      gan: {},
      xuLyTrung: { 0: 'giu-ban-cu' },
      nhanDaDuyet: [],
    })
    // thuc-hien (thùng rác) trước, rồi ghi lại bản chụp
    const thuTu = sv.yeuCau.map((y) => `${y.method} ${y.url}`)
    expect(thuTu.indexOf('POST /api/nhap/thuc-hien')).toBeLessThan(thuTu.indexOf(duongGiu))
    expect(screen.queryByText(/^Đã nhập/)).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Vừa nhập' })).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('thuc-hien trả 422 "không có gì để nhập" khi 0 file → coi như xong, không toast lỗi', async () => {
    quetRa([banChep])
    sv.traLoi.set('POST /api/nhap/thuc-hien', () => ({
      status: 422,
      data: { loi: 'Không có file nào được chọn để nhập.' },
    }))
    await quet()
    fireEvent.click(nutNhap())
    await screen.findByText('Đã giữ 1 bản cũ')
    expect(screen.queryByText(/Không nhập được/)).toBeNull()
    expect(sv.goi(duongGiu)).toHaveLength(1)
  })

  it('file đã nhận <slug>.md bị sửa (khớp theo đường dẫn): chỉ giu-ban-cu, "Khớp theo" = "đường dẫn"', async () => {
    quetRa([{ ...banChep, khopTheo: 'duong-dan', duongDan: 'project-management/scope-creep.md' }])
    await quet()
    expect(chuO(within(hangCua('scope-creep.md')).getAllByRole('cell')[1])).toBe('đường dẫn')
    fireEvent.click(nutNhap())
    await screen.findByText('Đã giữ 1 bản cũ')
    expect(sv.goi('POST /api/nhap/thuc-hien')).toHaveLength(0)
    expect(sv.goi(duongGiu)).toHaveLength(1)
  })

  it('file Đã duyệt không còn trên đĩa (không có duongDan): "Nhập thành bản sửa" vô hiệu, chỉ Giữ bản cũ', async () => {
    quetRa([
      {
        ...banChep,
        khopTheo: 'duong-dan',
        duongDan: undefined,
        ghiChu:
          'File Đã duyệt bị xoá hoặc chuyển đi ngoài app · bản đã duyệt 18/10/2026 — chỉ Giữ bản cũ được',
      },
    ])
    await quet()
    const hang = hangCua('scope-creep.md')
    const banSua = within(hang).getByRole('radio', { name: 'Nhập thành bản sửa' })
    expect(banSua).toHaveProperty('disabled', true)
    fireEvent.click(banSua)
    expect(within(hang).getByRole('radio', { name: 'Giữ bản cũ' })).toHaveProperty('checked', true)
    expect(nutNhap().textContent).toBe('Giữ 1 bản cũ')
    // Không có bản ngoài app để bỏ vào thùng rác
    expect(within(hang).getByText('Ghi lại bản đã duyệt từ bản chụp của app')).toBeTruthy()
    expect(within(hang).queryByText(/vào thùng rác/)).toBeNull()
    fireEvent.click(nutNhap())
    await screen.findByText('Đã giữ 1 bản cũ')
    expect(sv.goi('POST /api/nhap/thuc-hien')).toHaveLength(0)
  })

  it('?quet=1 (từ banner trang bài): quét lại ngay đúng một lần, bỏ ?quet khỏi URL', async () => {
    sv.traLoi.set('POST /api/nhap/quet-lai', () => ({
      data: { daNhap: 0, fileOp: null, kiemTra: null, chuaNhan: 0 },
    }))
    moTrang('/noi-dung?tab=nhap&quet=1')
    await screen.findByText('Quét lại xong: không có file nào cần nhập.')
    expect(duongDan()).toBe('/noi-dung?tab=nhap')
    expect(sv.goi('POST /api/nhap/quet-lai')).toHaveLength(1)
  })
})

describe('"Vừa nhập": mỗi dòng ghi file vào đâu (review phase 2b)', () => {
  it('Bản nháp / Bản sửa (.ban-sua.md) / Đã duyệt (◎); câu mô tả trung tính', async () => {
    datKiemTra({
      token: 't7',
      ketQua: [
        dong({ chiSo: 0, ten: 'pestle.md', loai: 'hop-le', muc: mucNgan('pestle') }),
        dong({
          chiSo: 1,
          ten: 'scope-creep.md',
          loai: 'trung-da-duyet',
          muc: mucNgan('scope-creep'),
          khopTheo: 'id',
        }),
        dong({ chiSo: 2, ten: 'bani.md', loai: 'chua-chup', muc: mucNgan('bani'), khopTheo: 'id' }),
      ],
      tomTat: { hopLe: 1, canhBao: 0, trung: 1, loi: 0 },
      soNhapDuoc: 1,
    })
    sv.traLoi.set('POST /api/nhap/thuc-hien', () => ({
      data: {
        daNhap: [
          { chiSo: 0, mucId: muc('pestle').id, duongDan: 'a/pestle.md' },
          { chiSo: 1, mucId: muc('scope-creep').id, duongDan: 'b/scope-creep.ban-sua.md' },
          { chiSo: 2, mucId: muc('bani').id, duongDan: 'c/bani.md' },
        ],
        fileOp: 12,
        revision: 13,
      },
    }))
    moTrang('/noi-dung?tab=nhap')
    tha([
      tepEntry('pestle.md', fileMd('pestle')),
      tepEntry('scope-creep.md', fileMd('scope-creep')),
      tepEntry('bani.md', fileMd('bani')),
    ])
    await screen.findByRole('table')
    fireEvent.click(
      within(hangCua('scope-creep.md')).getByRole('radio', { name: 'Nhập thành bản sửa' }),
    )
    fireEvent.click(within(hangCua('bani.md')).getByRole('checkbox', { name: 'Nhận là Đã duyệt' }))
    expect(nutNhap().textContent).toBe('Nhập 3 file')
    fireEvent.click(nutNhap())
    const khoi = (await screen.findByRole('heading', { name: 'Vừa nhập' })).closest('section')!
    expect(within(khoi).getByText('Các bài vừa nhập — mở bài để đọc.')).toBeTruthy()
    expect(within(khoi).queryByText(/đã vào Bản nháp/)).toBeNull()
    const dongCua = (slug: string) =>
      within(khoi)
        .getByRole('link', { name: muc(slug).label })
        .closest('li')!
    expect(dongCua('pestle').getAttribute('data-ban')).toBe('ban-nhap')
    expect(dongCua('pestle').textContent).toContain('Bản nháp')
    expect(dongCua('scope-creep').getAttribute('data-ban')).toBe('ban-sua')
    expect(dongCua('scope-creep').textContent).toContain('Bản sửa — bài vẫn hiện bản Đã duyệt')
    expect(dongCua('bani').getAttribute('data-ban')).toBe('da-duyet')
    expect(dongCua('bani').textContent).toContain('Đã duyệt')
  })
})

describe('bảng kết quả < 768: thẻ hàng, Kết quả không bị đẩy ra ngoài màn hình (review phase 2b)', () => {
  it('vẫn là bảng (role ghi rõ), hàng là lưới thẻ, hàng tiêu đề chỉ cho trình đọc, Kết quả trải cả hàng; ≥ 768 giữ 760px', async () => {
    await thaF22()
    const bang = screen.getByRole('table')
    expect(bang.getAttribute('role')).toBe('table')
    expect(bang.className).toContain('max-md:block')
    expect(bang.className).toContain('md:min-w-[760px]')
    expect(bang.className).not.toMatch(/(^|\s)min-w-\[760px\]/)
    expect(bang.querySelector('thead')!.className).toContain('max-md:sr-only')
    const rr = hangCua('risk-registr.md')
    expect(rr.getAttribute('role')).toBe('row')
    expect(rr.className).toContain('max-md:grid')
    const [mucO, khop, ketQua] = within(rr).getAllByRole('cell')
    expect(ketQua.className).toContain('max-md:col-span-2')
    expect(within(ketQua).getByRole('button', { name: 'Gán cho mục…' })).toBeTruthy()
    // Nhãn cột chỉ hiện ở thẻ hàng, ẩn với trình đọc (đã có tiêu đề cột)
    expect(mucO.querySelector('[data-nhan-cot]')!.getAttribute('aria-hidden')).toBe('true')
    expect(khop.querySelector('[data-nhan-cot]')!.textContent).toBe('Khớp theo: ')
    expect(within(rr).getByRole('rowheader').className).toContain('max-md:col-span-2')
  })
})

describe('?muc= gán sẵn, giới hạn, lỗi kiểm tra', () => {
  it('?muc=<slug>: dòng "gán sẵn" + gửi mucMacDinh = id; "Bỏ gán sẵn" bỏ khỏi URL', async () => {
    const sm = muc('salience-model')
    datKiemTra({
      token: 't3',
      ketQua: [
        dong({ chiSo: 0, ten: 'ban-thao.md', loai: 'hop-le', muc: mucNgan('salience-model') }),
      ],
      tomTat: { hopLe: 1, canhBao: 0, trung: 0, loi: 0 },
      soNhapDuoc: 1,
    })
    moTrang(`/noi-dung?tab=nhap&muc=${sm.slug}`)
    expect(
      screen.getByText('File thả vào được gán sẵn cho', { exact: false }).textContent,
    ).toContain(sm.label)
    tha([tepEntry('ban-thao.md', '---\nloai: chu-de\n---\n')])
    await screen.findByRole('table')
    expect(sv.goi('POST /api/nhap/kiem-tra')[0].body).toMatchObject({ mucMacDinh: sm.id })
    expect(chuO(within(hangCua('ban-thao.md')).getAllByRole('cell')[1])).toBe('gán sẵn')
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ gán sẵn' }))
    expect(duongDan()).toBe('/noi-dung?tab=nhap')
  })

  it('chỉ file khác .md → vùng lỗi "Chỉ nhận file .md" + danh sách không nhận, không gọi máy chủ', async () => {
    moTrang('/noi-dung?tab=nhap')
    tha([tepEntry('anh.png', 'png', 'image/png'), tepEntry('ghi-chu.txt', 'x', 'text/plain')])
    await waitFor(() => expect(vung().getAttribute('data-trang-thai')).toBe('loi'))
    expect(within(vung()).getByText('Chỉ nhận file .md')).toBeTruthy()
    expect(screen.getByText('Không nhận 2 file')).toBeTruthy()
    expect(screen.getByText('anh.png').parentElement!.textContent).toBe(
      'anh.png — Chỉ nhận file .md',
    )
    expect(trangThai().textContent).toBe('Chỉ nhận file .md')
    expect(sv.yeuCau).toHaveLength(0)
  })

  it('file .md lớn hơn 256 KB bị bỏ, phần còn lại vẫn kiểm tra', async () => {
    datKiemTra((body) => {
      const files = (body as { files: { ten: string }[] }).files
      return {
        token: 't4',
        ketQua: files.map((f, i) =>
          dong({ chiSo: i, ten: f.ten, loai: 'hop-le', muc: mucNgan('pestle') }),
        ),
        tomTat: { hopLe: files.length, canhBao: 0, trung: 0, loi: 0 },
        soNhapDuoc: files.length,
      }
    })
    moTrang('/noi-dung?tab=nhap')
    tha([tepEntry('pestle.md', fileMd('pestle')), tepEntry('lon.md', 'x'.repeat(256 * 1024 + 1))])
    await screen.findByRole('table')
    expect((sv.goi('POST /api/nhap/kiem-tra')[0].body as { files: unknown[] }).files).toHaveLength(
      1,
    )
    expect(screen.getByText('lon.md').parentElement!.textContent).toBe(
      'lon.md — File lớn hơn 256 KB',
    )
  })

  it('kiem-tra lỗi → vùng lỗi với câu của máy chủ', async () => {
    sv.traLoi.set('POST /api/nhap/kiem-tra', () => ({ status: 413, data: { loi: 'Lô quá lớn.' } }))
    moTrang('/noi-dung?tab=nhap')
    tha([tepEntry('pestle.md', fileMd('pestle'))])
    await waitFor(() => expect(vung().getAttribute('data-trang-thai')).toBe('loi'))
    expect(within(vung()).getByText('Không kiểm tra được: Lô quá lớn.')).toBeTruthy()
    // Thả lại thì về xử lý bình thường.
    datKiemTra(loF22())
    await act(async () => tha(entriesF22()))
    await screen.findByRole('table')
  })
})
