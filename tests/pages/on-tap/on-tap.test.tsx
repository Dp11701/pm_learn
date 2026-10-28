// @vitest-environment jsdom
// Trang Ôn tập /on-tap và phiên ôn /on-tap/phien (bước 3; §8.9 F23, §9 F31; đề xuất 3.5) trên máy chủ giả: số thẻ
// đến hạn + "Bắt đầu phiên" (khoá khi 0), hộp, tỉ lệ nhớ, trạng thái trống "Tạo thẻ"; phiên chỉ bằng bàn phím
// (Space lật, 1 Quên, 2 Nhớ, Esc thoát), lưu từng câu, cuối phiên + vòng luyện thêm (luyenThem), 409 bỏ qua thẻ;
// axe.
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { HOM_NAY, cay, moTrang, onTapRong, taoMayChu, taoThe, type MayChuOnTap } from './moi-truong'

const ketNoi = vi.hoisted(() => ({ meta: null as unknown }))
vi.mock('../../../src/app/ket-noi', async (goc) => {
  const thuc = await goc<typeof import('../../../src/app/ket-noi')>()
  return {
    ...thuc,
    useKetNoi: () => ({
      trangThai: 'on-dinh',
      meta: ketNoi.meta,
      thuNgay: async () => {},
      dangThu: false,
    }),
  }
})

let sv: MayChuOnTap

beforeEach(() => {
  sv = taoMayChu()
  ketNoi.meta = null
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.title = ''
})

const duongDan = () => screen.getAllByTestId('duong-dan').at(-1)!.textContent
/** Nhấn phím trên phần tử đang focus (bộ xử lý toàn cục nghe ở document). */
function phim(code: string, key = code) {
  fireEvent.keyDown(document.activeElement ?? document.body, { code, key })
}

describe('/on-tap', () => {
  it('thẻ đến hạn + "Bắt đầu phiên", 5 hộp kèm khoảng ôn, tỉ lệ nhớ 30 ngày; axe', async () => {
    sv.onTap = onTapRong({
      denHan: [taoThe(0), taoThe(1, { hop: 2 })],
      hop: { 1: 4, 2: 3, 3: 2, 4: 1, 5: 0 },
      tongThe: 10,
      tiLeNho30: 0.75,
      lanOn30: { nho: 9, tong: 12 },
      hanKeTiep: '2026-10-28',
    })
    const { container } = moTrang('/on-tap')
    expect(
      await screen.findByRole('heading', { level: 2, name: '2 thẻ đến hạn hôm nay' }),
    ).toBeTruthy()
    expect(document.title).toBe('Ôn tập · Học PM A–Z')
    expect(screen.getByText('10 thẻ · Leitner 5 hộp')).toBeTruthy()
    const hop = within(screen.getByRole('region', { name: 'Hộp Leitner' })).getAllByRole(
      'listitem',
    )
    expect(hop.map((h) => h.textContent)).toEqual([
      'Hộp 14ôn sau 1 ngày',
      'Hộp 23ôn sau 2 ngày',
      'Hộp 32ôn sau 4 ngày',
      'Hộp 41ôn sau 8 ngày',
      'Hộp 50ôn sau 16 ngày',
    ])
    const tiLe = screen.getByRole('region', { name: 'Tỉ lệ nhớ 30 ngày' })
    expect(within(tiLe).getByText('75%')).toBeTruthy()
    expect(within(tiLe).getByText('9/12 lần ôn')).toBeTruthy()
    await expectNoAxeViolations(container)

    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu phiên' }))
    expect(duongDan()).toBe('/on-tap/phien')
  })

  it('0 thẻ đến hạn: "Bắt đầu phiên" khoá, có lần ôn kế tiếp; chưa ôn lần nào: "Chưa có tỉ lệ nhớ"', async () => {
    sv.onTap = onTapRong({ hop: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 }, tongThe: 1, hanKeTiep: '2026-10-29' })
    moTrang('/on-tap')
    expect(await screen.findByText('Lần ôn kế tiếp 29/10/2026')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '0 thẻ đến hạn hôm nay' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Bắt đầu phiên' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect(screen.getByText('Chưa có tỉ lệ nhớ')).toBeTruthy()
  })

  it('chưa có thẻ nào: "Chưa có flashcard nào" + "Tạo thẻ" → bài Đang học mở gần nhất #flashcard; không có → Lộ trình', async () => {
    const [a, b] = [cay.mucHoc[3], cay.mucHoc[5]]
    sv.anhChup = {
      revision: 1,
      trangThai: { [a.id]: { status: 'learning' }, [b.id]: { status: 'learning' } },
      luotMo: { [a.id]: '2026-10-20T01:00:00.000Z', [b.id]: '2026-10-26T01:00:00.000Z' },
    }
    const { container } = moTrang('/on-tap')
    expect(await screen.findByText('Chưa có flashcard nào')).toBeTruthy()
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Tạo thẻ' }).getAttribute('href')).toBe(
        `/hoc/${b.slug}#flashcard`,
      ),
    )
    await expectNoAxeViolations(container)
    cleanup()

    sv.anhChup = { revision: 1, trangThai: {}, luotMo: {} }
    moTrang('/on-tap')
    await screen.findByText('Chưa có flashcard nào')
    expect(screen.getByRole('link', { name: 'Tạo thẻ' }).getAttribute('href')).toBe('/lo-trinh')
  })
})

describe('/on-tap/phien', () => {
  it('chỉ bàn phím: Space lật, 2 Nhớ, 1 Quên, lưu từng câu; cuối phiên; vòng luyện thêm không tính; axe', async () => {
    const the1 = taoThe(0, { hop: 2 })
    const the2 = taoThe(1)
    sv.onTap = onTapRong({
      denHan: [the1, the2],
      hop: { 1: 1, 2: 1, 3: 0, 4: 0, 5: 0 },
      tongThe: 2,
    })
    const { container } = moTrang('/on-tap/phien')
    expect(await screen.findByText('Câu hỏi 1')).toBeTruthy()
    expect(screen.getByText('Thẻ 1/2')).toBeTruthy()
    // Tên mục là link tới bài
    expect(
      screen.getByRole('link', { name: cay.mucHoc[0].label }).getAttribute('href'),
    ).toBe(`/hoc/${cay.mucHoc[0].slug}`)
    expect(screen.queryByText('Đáp án 1')).toBeNull()
    await expectNoAxeViolations(container)

    // Chưa lật: 1 / 2 không làm gì
    phim('Digit2', '2')
    expect(sv.cacLanOn()).toEqual([])

    phim('Space', ' ')
    expect(screen.getByText('Đáp án 1')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Đáp án' }))
    await expectNoAxeViolations(container)

    phim('Digit2', '2')
    expect(await screen.findByText('Câu hỏi 2')).toBeTruthy()
    expect(screen.getByText('Thẻ 2/2')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Câu hỏi' }))
    phim('Space', ' ')
    phim('Digit1', '1')

    expect(await screen.findByRole('heading', { name: 'Xong phiên hôm nay' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Xong phiên hôm nay' }))
    expect(sv.cacLanOn()).toEqual([
      { theId: the1.id, body: { ket: 'nho', luyenThem: false } },
      { theId: the2.id, body: { ket: 'quen', luyenThem: false } },
    ])
    // Cache đã cập nhật: lần ôn kế tiếp = hạn sớm nhất của các thẻ vừa ôn (ngày mai)
    expect(screen.getByText('Nhớ 1 · Quên 1 · Lần ôn kế tiếp 28/10/2026')).toBeTruthy()
    await expectNoAxeViolations(container)

    // Vòng luyện thêm: chỉ thẻ đã quên, gửi luyenThem true
    fireEvent.click(screen.getByRole('button', { name: 'Ôn lại 1 thẻ đã quên' }))
    expect(await screen.findByText('Câu hỏi 2')).toBeTruthy()
    expect(screen.getByText('Thẻ 1/1')).toBeTruthy()
    expect(
      screen.getByText('Vòng luyện thêm: không đổi hộp, không tính vào tỉ lệ nhớ.'),
    ).toBeTruthy()
    phim('Space', ' ')
    phim('Digit2', '2')
    expect(await screen.findByRole('heading', { name: 'Xong vòng luyện thêm' })).toBeTruthy()
    expect(screen.getByText('Nhớ 1 · Quên 0')).toBeTruthy()
    expect(sv.cacLanOn().at(-1)).toEqual({
      theId: the2.id,
      body: { ket: 'nho', luyenThem: true },
    })
    expect(screen.queryByRole('button', { name: /Ôn lại/ })).toBeNull()

    fireEvent.click(screen.getByRole('link', { name: 'Về Ôn tập' }))
    expect(duongDan()).toBe('/on-tap')
  })

  it('bấm hai lần chỉ gửi một câu; 409 (đã ôn ở nơi khác): báo, bỏ qua thẻ, không đếm', async () => {
    const the1 = taoThe(0)
    const the2 = taoThe(1)
    sv.onTap = onTapRong({ denHan: [the1, the2], tongThe: 2 })
    sv.traLoiOn = (theId) =>
      theId === the1.id
        ? { status: 409, data: { loi: `Thẻ id ${theId} chưa đến hạn ôn (hạn 29/10/2026).` } }
        : {
            status: 200,
            data: {
              revision: 2,
              daDoi: true,
              luyenThem: false,
              ket: 'nho',
              the: { ...the2, hop: 2, hanOn: '2026-10-29' },
              truoc: the2,
            },
          }
    moTrang('/on-tap/phien')
    await screen.findByText('Câu hỏi 1')
    fireEvent.click(screen.getByRole('button', { name: 'Lật thẻ' }))
    const nho = screen.getByRole('button', { name: 'Nhớ' })
    fireEvent.click(nho)
    fireEvent.click(nho)
    expect(await screen.findByText(/^Thẻ id \d+ chưa đến hạn ôn/)).toBeTruthy()
    expect(await screen.findByText('Câu hỏi 2')).toBeTruthy()
    expect(sv.cacLanOn()).toHaveLength(1)
    phim('Space', ' ')
    phim('Digit2', '2')
    expect(await screen.findByText('Nhớ 1 · Quên 0 · Lần ôn kế tiếp 29/10/2026')).toBeTruthy()
  })

  it('không còn thẻ đến hạn: câu F23 + "Về Ôn tập" + "Tạo thẻ"; Esc thoát về /on-tap', async () => {
    sv.onTap = onTapRong({ tongThe: 3, hanKeTiep: '2026-10-30' })
    const { container } = moTrang('/on-tap/phien')
    expect(await screen.findByText('Hôm nay không còn thẻ nào cần ôn')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Tạo thẻ' })).toBeTruthy()
    await expectNoAxeViolations(container)
    await act(async () => phim('Escape'))
    expect(duongDan()).toBe('/on-tap')
  })

  it('phím không chạy khi giữ Ctrl / ⌘ hay đang ghép chữ (IME)', async () => {
    sv.onTap = onTapRong({ denHan: [taoThe(0)], tongThe: 1 })
    moTrang('/on-tap/phien')
    await screen.findByText('Câu hỏi 1')
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ', ctrlKey: true })
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ', metaKey: true })
    fireEvent.keyDown(document.body, { code: 'Space', key: 'Process', keyCode: 229 })
    expect(screen.queryByText('Đáp án 1')).toBeNull()
    expect(HOM_NAY).toBe('2026-10-27')
  })
})
