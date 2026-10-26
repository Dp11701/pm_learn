// @vitest-environment jsdom
// C30 Vùng thả file (F02b, F22): 4 trạng thái (thường / kéo vào / đang xử lý / lỗi), thả file và thư mục
// (webkitGetAsEntry lấy ngay trong drop), nút "Chọn file…" / "Chọn thư mục…" mở hộp chọn, đang xử lý thì
// không nhận thả, thả ngoài vùng không làm trình duyệt mở file, axe.
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import VungThaFile, { type NguonTha } from '../../../src/components/VungThaFile'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { tepEntry, thuMucEntry } from './ho-tro'

afterEach(cleanup)

const vung = () => screen.getByRole('group')

function dt(items: { type: string; entry?: FileSystemEntry | null }[], files: File[] = []) {
  return {
    types: ['Files'],
    items: items.map((i) => ({
      kind: 'file',
      type: i.type,
      webkitGetAsEntry: i.entry === undefined ? undefined : () => i.entry,
    })),
    files,
    dropEffect: 'none',
  }
}

describe('C30 VungThaFile', () => {
  it('thường: câu F22, viền nét đứt; nhóm có tên + mô tả; axe', async () => {
    const { container } = render(<VungThaFile onNhan={() => {}} />)
    expect(vung().getAttribute('data-trang-thai')).toBe('thuong')
    expect(vung().className).toContain('border-dashed')
    expect(
      screen.getByRole('group', { name: 'Kéo thả file hoặc thư mục .md vào đây' }),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Nội dung nhập vào luôn là Bản nháp. Không ghi đè bản Đã duyệt khi chưa xác nhận.',
      ),
    ).toBeTruthy()
    await expectNoAxeViolations(container)
  })

  it('kéo vào: "Thả để kiểm tra n file" khi biết số file, chỉ "Thả để kiểm tra" khi có thể là thư mục; ra hẳn thì về thường', () => {
    render(<VungThaFile onNhan={() => {}} />)
    fireEvent.dragEnter(vung(), {
      dataTransfer: dt([{ type: 'text/markdown' }, { type: 'text/markdown' }]),
    })
    expect(vung().getAttribute('data-trang-thai')).toBe('keo-vao')
    expect(screen.getByText('Thả để kiểm tra 2 file')).toBeTruthy()
    // Vào phần tử con rồi ra khỏi con: vẫn đang kéo trong vùng.
    fireEvent.dragEnter(screen.getByText('Thả để kiểm tra 2 file'), { dataTransfer: dt([]) })
    fireEvent.dragLeave(screen.getByText('Thả để kiểm tra 2 file'), { dataTransfer: dt([]) })
    expect(vung().getAttribute('data-trang-thai')).toBe('keo-vao')
    fireEvent.dragLeave(vung(), { dataTransfer: dt([]) })
    expect(vung().getAttribute('data-trang-thai')).toBe('thuong')

    fireEvent.dragEnter(vung(), { dataTransfer: dt([{ type: '' }]) })
    expect(screen.getByText('Thả để kiểm tra')).toBeTruthy()
  })

  it('thả thư mục: gửi entry (lấy trong sự kiện drop); trình duyệt không có webkitGetAsEntry → gửi FileList', () => {
    const onNhan = vi.fn<(n: NguonTha) => void>()
    render(<VungThaFile onNhan={onNhan} />)
    const thuMuc = thuMucEntry('noi-dung', [tepEntry('noi-dung/a.md')])
    const tha = createEvent.drop(vung(), { dataTransfer: dt([{ type: '', entry: thuMuc }]) })
    fireEvent(vung(), tha)
    expect(tha.defaultPrevented).toBe(true)
    expect(onNhan).toHaveBeenLastCalledWith({ loai: 'entries', entries: [thuMuc] })

    const f = new File(['x'], 'a.md')
    fireEvent.drop(vung(), { dataTransfer: dt([{ type: 'text/markdown' }], [f]) })
    expect(onNhan).toHaveBeenLastCalledWith({ loai: 'files', files: [f] })
  })

  it('"Chọn file…" và "Chọn thư mục…" mở đúng hộp chọn; chọn xong gửi danh sách file, ô chọn được đặt lại', () => {
    const onNhan = vi.fn()
    const { container } = render(<VungThaFile onNhan={onNhan} />)
    const oFile = container.querySelector<HTMLInputElement>('input[data-chon="file"]')!
    const oThuMuc = container.querySelector<HTMLInputElement>('input[data-chon="thu-muc"]')!
    expect(oFile.multiple).toBe(true)
    expect(oFile.accept).toBe('.md,text/markdown')
    expect(oThuMuc.hasAttribute('webkitdirectory')).toBe(true)
    const bamFile = vi.spyOn(oFile, 'click')
    const bamThuMuc = vi.spyOn(oThuMuc, 'click')
    fireEvent.click(screen.getByRole('button', { name: 'Chọn file…' }))
    expect(bamFile).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Chọn thư mục…' }))
    expect(bamThuMuc).toHaveBeenCalledOnce()

    const f = new File(['x'], 'b.md')
    fireEvent.change(oFile, { target: { files: [f] } })
    expect(onNhan).toHaveBeenCalledWith({ loai: 'files', files: [f] })
  })

  it('đang xử lý: thanh tiến độ 9/15, không nhận thả, nút aria-disabled (vẫn giữ focus)', () => {
    const onNhan = vi.fn()
    render(<VungThaFile trangThai="xu-ly" tienDo={{ xong: 9, tong: 15 }} onNhan={onNhan} />)
    expect(screen.getByText('Đang xử lý')).toBeTruthy()
    const thanh = screen.getByRole('progressbar', { name: 'Đang xử lý' })
    expect(thanh.getAttribute('aria-valuenow')).toBe('9')
    expect(thanh.getAttribute('aria-valuemax')).toBe('15')
    expect(screen.getByText('9/15')).toBeTruthy()
    expect(vung().getAttribute('aria-busy')).toBe('true')
    fireEvent.drop(vung(), {
      dataTransfer: dt([{ type: 'text/markdown' }], [new File(['x'], 'a.md')]),
    })
    expect(onNhan).not.toHaveBeenCalled()
    const nut = screen.getByRole('button', { name: 'Chọn file…' })
    expect(nut.getAttribute('aria-disabled')).toBe('true')
    nut.focus()
    expect(document.activeElement).toBe(nut)
  })

  it('lỗi: viền đỏ nét đứt, câu lỗi màu danger', async () => {
    const { container } = render(
      <VungThaFile
        trangThai="loi"
        tieuDe="Chỉ nhận file .md"
        moTa="Kéo thả lại."
        onNhan={() => {}}
      />,
    )
    expect(vung().className).toContain('border-danger')
    expect(screen.getByText('Chỉ nhận file .md').className).toContain('text-danger')
    await expectNoAxeViolations(container)
  })

  it('thả ngoài vùng: chặn trình duyệt mở file', () => {
    render(<VungThaFile onNhan={() => {}} />)
    const ev = createEvent.drop(document.body, { dataTransfer: dt([]) })
    fireEvent(document.body, ev)
    expect(ev.defaultPrevented).toBe(true)
  })
})
