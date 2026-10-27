// @vitest-environment jsdom
// F19 phải "Đã xong khi còn thiếu bước" (§1 "không chặn cứng"; đề xuất 3.1, 3.2; quyết định 10) qua
// useXacNhanDaXong: alertdialog liệt kê 4 bước với câu 3.2 nguyên văn, "Bài còn n bước chưa xong", focus sẵn "Quay
// lại học tiếp"; "Quay lại học tiếp" / Esc không đặt gì; "Vẫn đánh dấu Đã xong" chạy việc đặt Đã xong đúng một lần;
// đủ bước / đã Đã xong / chưa có dữ liệu học → đặt ngay; chưa biết câu hỏi → bỏ Kiểm tra khỏi danh sách; axe.
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useXacNhanDaXong } from '../../../src/components/bai-hoc/HopThoaiDaXong'
import type { MucHoc } from '../../../shared/roadmap'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { muc } from '../../pages/bai-hoc/ho-tro'
import { giaResizeObserver } from '../../pages/bai-hoc/moi-truong'
import { dungVoiProvider, taoMayChuDayDu, type MayChuDayDu } from './moi-truong-hoc'

let sv: MayChuDayDu
const sc = muc('scope-creep')
const ID = sc.id

beforeEach(() => {
  sv = taoMayChuDayDu()
  giaResizeObserver()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Thu({
  m,
  cauHoiKhoa,
  lam,
}: {
  m: MucHoc
  cauHoiKhoa: readonly string[] | null
  lam: () => void
}) {
  const { xacNhan, hopThoai } = useXacNhanDaXong(m, cauHoiKhoa)
  return (
    <>
      <button type="button" onClick={() => xacNhan(lam)}>
        Đặt Đã xong
      </button>
      {hopThoai}
    </>
  )
}

/** Dữ liệu như frame F19: Hiểu xong, Áp dụng đang làm, Kiểm tra chưa chấm, Ghi nhớ xong. */
function datNhuF19() {
  const m = sv.hoc.mucCua(ID)
  m.noiLai = { text: 'Nói lại', capNhat: sv.hoc.gio }
  m.thucHanh = { ...m.thucHanh, trangThai: 'dang-lam', ketQua: 'Đang làm dở' }
  sv.hoc.the.push({
    id: 1,
    itemId: ID,
    truoc: 'Mặt trước',
    sau: 'Mặt sau',
    hop: 1,
    hanOn: '2026-10-23',
    khoaCau: null,
  })
}

async function moVaCho(cauHoiKhoa: readonly string[] | null = ['k1', 'k2'], lam = vi.fn()) {
  const kq = dungVoiProvider(<Thu m={sc} cauHoiKhoa={cauHoiKhoa} lam={lam} />)
  // Chờ dữ liệu học tải xong (xacNhan cần dữ liệu để biết bước thiếu)
  await waitFor(() =>
    expect(sv.hoc.dem(`GET /api/hoc/${encodeURIComponent(ID)}`)).toBeGreaterThan(0),
  )
  await new Promise((r) => setTimeout(r, 30))
  return { ...kq, lam }
}

const bam = () => fireEvent.click(screen.getByRole('button', { name: 'Đặt Đã xong' }))

describe('F19 phải (useXacNhanDaXong)', () => {
  it('như frame: tiêu đề có tên mục lang=en, "Bài còn 2 bước chưa xong", 4 dòng câu 3.2, focus "Quay lại học tiếp"; axe', async () => {
    datNhuF19()
    const { lam } = await moVaCho()
    bam()
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByRole('heading').textContent).toBe(`Đánh dấu ${sc.label} là Đã xong?`)
    expect(dialog.querySelector('h2 [lang="en"]')?.textContent).toBe(sc.label)
    expect(dialog.textContent).toContain(
      'Bài còn 2 bước chưa xong. Bạn vẫn có thể đánh dấu, nhưng tiến độ sẽ không phản ánh đủ những gì bạn đã luyện.',
    )
    expect(
      [...dialog.querySelectorAll('li[data-buoc]')].map((li) => [
        li.getAttribute('data-buoc'),
        li.textContent,
        li.className.includes('font-semibold'),
      ]),
    ).toEqual([
      ['hieu', 'HiểuĐã xong', false],
      ['ap-dung', 'Áp dụngThiếu · đang làm bài thực hành', true],
      ['kiem-tra', 'Kiểm traThiếu · chưa tự chấm câu nào', true],
      ['ghi-nho', 'Ghi nhớĐã xong', false],
    ])
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(dialog).getByRole('button', { name: 'Quay lại học tiếp' }),
      ),
    )
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Vẫn đánh dấu Đã xong', 'Quay lại học tiếp'])
    await expectNoAxeViolations(dialog)
    expect(lam).not.toHaveBeenCalled()
  })

  it('"Quay lại học tiếp" và Esc đóng, không đặt Đã xong; "Vẫn đánh dấu Đã xong" đặt đúng một lần', async () => {
    datNhuF19()
    const { lam } = await moVaCho()
    bam()
    let dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Quay lại học tiếp' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    bam()
    dialog = await screen.findByRole('alertdialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(lam).not.toHaveBeenCalled()
    bam()
    dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vẫn đánh dấu Đã xong' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(lam).toHaveBeenCalledTimes(1)
  })

  it('đã chấm 1/2 câu, chưa nói lại, chưa có thẻ: câu "đã chấm x/y câu", "Bài còn 4 bước"', async () => {
    sv.hoc.mucCua(ID).tuKiemTra.k1 = { traLoi: 'a', daXem: true, cham: 'dung', chamLuc: null }
    await moVaCho()
    bam()
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain('Bài còn 4 bước chưa xong.')
    expect(dialog.textContent).toContain('Thiếu · chưa nói lại bằng lời')
    expect(dialog.textContent).toContain('Thiếu · chưa làm bài thực hành')
    expect(dialog.textContent).toContain('Thiếu · đã chấm 1/2 câu')
    expect(dialog.textContent).toContain('Thiếu · chưa có flashcard')
  })

  it('đủ 4 bước (Kiểm tra Không áp dụng vì bài không có câu hỏi) → đặt ngay, không hỏi', async () => {
    datNhuF19()
    sv.hoc.mucCua(ID).thucHanh = {
      ...sv.hoc.mucCua(ID).thucHanh,
      trangThai: 'xong',
      xongLuc: sv.hoc.gio,
    }
    const { lam } = await moVaCho([])
    bam()
    expect(lam).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('mục đã Đã xong → đặt ngay (không hỏi lại)', async () => {
    sv.bai.trangThai[ID] = { status: 'done' }
    const { lam } = await moVaCho()
    await waitFor(() => expect(sv.bai.dem('GET /api/state')).toBeGreaterThan(0))
    await new Promise((r) => setTimeout(r, 30))
    bam()
    expect(lam).toHaveBeenCalledTimes(1)
  })

  it('chưa biết câu hỏi của bài (null): danh sách bỏ Kiểm tra, n chỉ đếm 3 bước còn lại', async () => {
    datNhuF19()
    await moVaCho(null)
    bam()
    const dialog = await screen.findByRole('alertdialog')
    expect(
      [...dialog.querySelectorAll('li[data-buoc]')].map((li) => li.getAttribute('data-buoc')),
    ).toEqual(['hieu', 'ap-dung', 'ghi-nho'])
    expect(dialog.textContent).toContain('Bài còn 1 bước chưa xong.')
  })

  it('không đọc được dữ liệu học → đặt ngay (không chặn người học vì lỗi tải)', async () => {
    sv.hoc.loiTai = 5
    const lam = vi.fn()
    dungVoiProvider(<Thu m={sc} cauHoiKhoa={['k1']} lam={lam} />)
    await waitFor(() =>
      expect(sv.hoc.dem(`GET /api/hoc/${encodeURIComponent(ID)}`)).toBeGreaterThan(0),
    )
    bam()
    expect(lam).toHaveBeenCalledTimes(1)
  })
})

describe('F19 của Tài liệu / Chứng chỉ (phạm vi rút gọn mục 10: bước Áp dụng là bài thực hành như Chủ đề)', () => {
  /** Mở F19 cho mục `m` (chưa nói lại, chưa có thẻ), trả dòng bước Áp dụng. */
  async function dongApDung(m: MucHoc) {
    dungVoiProvider(<Thu m={m} cauHoiKhoa={['k1']} lam={vi.fn()} />)
    await waitFor(() =>
      expect(sv.hoc.dem(`GET /api/hoc/${encodeURIComponent(m.id)}`)).toBeGreaterThan(0),
    )
    await new Promise((r) => setTimeout(r, 30))
    bam()
    const dialog = await screen.findByRole('alertdialog')
    return dialog.querySelector('li[data-buoc="ap-dung"]')!.textContent
  }

  it.each([
    ['risk-register', 'Tài liệu'],
    ['project-management-professional-pmp', 'Chứng chỉ'],
  ])(
    '%s (%s): câu bài thực hành, không còn "chưa có bản Hoàn thành" / "chưa có kế hoạch thi"',
    async (slug) => {
      const m = muc(slug)
      expect(await dongApDung(m)).toBe('Áp dụngThiếu · chưa làm bài thực hành')
      cleanup()
      sv.hoc.mucCua(m.id).thucHanh = {
        ...sv.hoc.mucCua(m.id).thucHanh,
        trangThai: 'dang-lam',
        ketQua: 'Đang làm dở',
      }
      expect(await dongApDung(m)).toBe('Áp dụngThiếu · đang làm bài thực hành')
      cleanup()
      sv.hoc.mucCua(m.id).thucHanh = {
        ...sv.hoc.mucCua(m.id).thucHanh,
        trangThai: 'xong',
        xongLuc: sv.hoc.gio,
      }
      expect(await dongApDung(m)).toBe('Áp dụngĐã xong')
      expect(document.body.textContent).not.toMatch(/chưa có bản Hoàn thành|chưa có kế hoạch thi/)
    },
  )
})
