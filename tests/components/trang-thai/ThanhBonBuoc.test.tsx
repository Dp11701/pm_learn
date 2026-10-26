// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ThanhBonBuoc, {
  BonBuocMini,
  buocTiep,
  chuBonBuoc,
  nhanBonBuoc,
  soBuocXong,
  type TinhTrangBonBuoc,
} from '../../../src/components/trang-thai/ThanhBonBuoc'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

// Ví dụ của F02 / F11 / D34
const MAU: TinhTrangBonBuoc = {
  hieu: 'xong',
  'ap-dung': 'dang-lam',
  'kiem-tra': 'chua-lam',
  'ghi-nho': 'xong',
}
const CHUA: TinhTrangBonBuoc = {
  hieu: 'chua-lam',
  'ap-dung': 'chua-lam',
  'kiem-tra': 'chua-lam',
  'ghi-nho': 'chua-lam',
}
const DU: TinhTrangBonBuoc = {
  hieu: 'xong',
  'ap-dung': 'khong-ap-dung',
  'kiem-tra': 'xong',
  'ghi-nho': 'xong',
}
const NEO = {
  hieu: '#b-noi-lai',
  'ap-dung': '#b-thuc-hanh',
  'kiem-tra': '#b-tu-kiem-tra',
  'ghi-nho': '#flashcard',
}

describe('hàm chữ của 4 bước', () => {
  it('D34: aria mini "4 bước: Hiểu xong, Áp dụng đang làm, Kiểm tra chưa làm, Ghi nhớ xong"', () => {
    expect(nhanBonBuoc(MAU)).toBe(
      '4 bước: Hiểu xong, Áp dụng đang làm, Kiểm tra chưa làm, Ghi nhớ xong',
    )
    expect(nhanBonBuoc(DU)).toBe(
      '4 bước: Hiểu xong, Áp dụng không áp dụng, Kiểm tra xong, Ghi nhớ xong',
    )
    expect(nhanBonBuoc(CHUA)).toBe(
      '4 bước: Hiểu chưa làm, Áp dụng chưa làm, Kiểm tra chưa làm, Ghi nhớ chưa làm',
    )
  })

  it('x/4 đếm cả Không áp dụng; "Tiếp" là bước chưa xong đầu tiên', () => {
    expect(soBuocXong(MAU)).toBe(2)
    expect(buocTiep(MAU)).toBe('ap-dung')
    expect(soBuocXong(DU)).toBe(4)
    expect(buocTiep(DU)).toBeNull()
    expect(chuBonBuoc(MAU)).toBe('2/4 · Tiếp: Áp dụng')
    expect(chuBonBuoc(CHUA)).toBe('0/4')
    expect(chuBonBuoc(DU)).toBe('4/4')
  })
})

describe('ThanhBonBuoc (C10 đầy đủ)', () => {
  it('nav "Bốn bước học", 4 bước theo thứ tự, link tới neo khối', () => {
    render(<ThanhBonBuoc tinhTrang={MAU} lienKet={NEO} />)
    const nav = screen.getByRole('navigation', { name: 'Bốn bước học' })
    const links = [...nav.querySelectorAll('a')]
    expect(links.map((a) => a.getAttribute('href'))).toEqual(Object.values(NEO))
    expect(nav.querySelector('ol')?.className).toContain('md:grid-cols-4')
    for (const a of links) {
      // Cao tối thiểu 40 (mobile 44), cao thêm khi chữ xuống dòng; h-full: các bước cùng hàng cao bằng nhau
      expect(a.className).toContain('min-h-10')
      expect(a.className).toContain('max-md:min-h-[var(--h-control-touch)]')
      expect(a.className).toContain('h-full')
      expect(a.className).toContain('hover:bg-surface-2')
    }
  })

  it('mỗi bước có chấm + chữ; trạng thái đọc được bằng chữ (không chỉ bằng hình)', () => {
    render(<ThanhBonBuoc tinhTrang={MAU} lienKet={NEO} />)
    expect(screen.getByRole('link', { name: 'Hiểu — đã xong' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Áp dụng · đang làm' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Kiểm tra — chưa làm' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Ghi nhớ — đã xong' })).toBeDefined()
  })

  it('quyết định 1: màu mực — Xong là check trên nền primary; Đang làm viền 1,5px primary, chữ 600, aria-current', () => {
    const { container } = render(<ThanhBonBuoc tinhTrang={MAU} lienKet={NEO} />)
    const li = (b: string) => container.querySelector(`li[data-buoc="${b}"]`)!
    const chamXong = li('hieu').querySelector('a > span')!
    expect(chamXong.className).toContain('bg-primary')
    expect(chamXong.querySelector('svg')?.getAttribute('class')).toContain('lucide-check')
    const dangLam = li('ap-dung').querySelector('a')!
    expect(dangLam.getAttribute('aria-current')).toBe('step')
    expect(dangLam.className).toContain('border-[1.5px] border-primary')
    expect(dangLam.className).toContain('font-semibold')
    expect(li('kiem-tra').querySelector('a')!.hasAttribute('aria-current')).toBe(false)
    expect(container.innerHTML).not.toMatch(/st-done|green/)
  })

  it('Không áp dụng: chấm có gạch ngang + "· Không áp dụng"', () => {
    const { container } = render(<ThanhBonBuoc tinhTrang={DU} lienKet={NEO} />)
    const li = container.querySelector('li[data-buoc="ap-dung"]')!
    expect(li.textContent).toBe('Áp dụng · Không áp dụng')
    expect(li.querySelector('svg')?.getAttribute('class')).toContain('lucide-minus')
  })

  it('bước disabled (D8 — Kiểm tra chưa có câu hỏi): không link, nền surface-2, chữ muted, có ghi chú', () => {
    render(
      <ThanhBonBuoc
        tinhTrang={{ ...MAU, 'kiem-tra': 'khong-ap-dung' }}
        lienKet={NEO}
        voHieu={['kiem-tra']}
        ghiChu={{ 'kiem-tra': 'Không áp dụng · chưa có câu hỏi' }}
      />,
    )
    const nav = screen.getByRole('navigation')
    expect(nav.querySelectorAll('a')).toHaveLength(3)
    const li = nav.querySelector('li[data-buoc="kiem-tra"]')!
    expect(li.textContent).toBe('Kiểm tra · Không áp dụng · chưa có câu hỏi')
    const o = li.firstElementChild as HTMLElement
    expect(o.tagName).toBe('DIV')
    expect(o.className).toContain('bg-surface-2')
    expect(o.className).toContain('text-muted')
  })

  it('chữ trạng thái không bao giờ bị cắt "…" (§11): ghi chú dài xuống dòng dưới tên, dấu · đầu dòng bị che', () => {
    const { container } = render(
      <ThanhBonBuoc
        tinhTrang={{ ...MAU, 'kiem-tra': 'khong-ap-dung' }}
        lienKet={NEO}
        voHieu={['kiem-tra']}
        ghiChu={{ 'kiem-tra': 'Không áp dụng · chưa có câu hỏi' }}
      />,
    )
    // Không còn lớp cắt chữ một dòng ở bất kỳ đâu trong thanh
    expect(container.querySelector('.truncate, .text-ellipsis, .whitespace-nowrap')).toBeNull()
    expect(container.innerHTML).not.toMatch(/line-clamp/)
    const chu = container.querySelector('[data-buoc="kiem-tra"] [data-chu-buoc]') as HTMLElement
    // Tên + ghi chú là hai ô của hàng flex-wrap (ghi chú không vừa thì xuống dòng và tự ngắt)
    const hang = chu.firstElementChild as HTMLElement
    expect(hang.className).toContain('flex-wrap')
    const [ten, ghiChu] = [...hang.children] as HTMLElement[]
    expect(ten.textContent).toBe('Kiểm tra')
    expect(ghiChu.textContent).toBe('· Không áp dụng · chưa có câu hỏi')
    // Dấu · nằm trong phần đệm trái 16px của ghi chú; hàng lùi trái 16px trong khung overflow-hidden
    expect(chu.className).toContain('overflow-hidden')
    expect(hang.className).toContain('-ml-4')
    expect(ten.className).toContain('pl-4')
    expect(ghiChu.className).toContain('pl-4')
    expect(ghiChu.className).not.toContain('min-w-0')
    expect((ghiChu.firstElementChild as HTMLElement).className).toContain('absolute')
  })

  it('bấm bước gọi khiChon (để đưa focus vào khối)', () => {
    const khiChon = vi.fn()
    render(<ThanhBonBuoc tinhTrang={MAU} lienKet={NEO} khiChon={khiChon} />)
    fireEvent.click(screen.getByRole('link', { name: /Ghi nhớ/ }))
    expect(khiChon).toHaveBeenCalledWith('ghi-nho', expect.anything())
  })

  it('không có link thì là nhóm có nhãn, không phải nav', () => {
    render(<ThanhBonBuoc tinhTrang={MAU} />)
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.getByRole('group', { name: 'Bốn bước học' })).toBeDefined()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('lỗi: icon + câu lỗi danger + "Thử lại"', () => {
    const thuLai = vi.fn()
    const { container } = render(<ThanhBonBuoc tinhTrang={MAU} loi thuLai={thuLai} />)
    expect(container.textContent).toBe('Lỗi: không đọc được tiến độ bước — Thử lại')
    expect(container.firstElementChild?.className).toContain('text-danger')
    expect(container.querySelector('svg')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(thuLai).toHaveBeenCalledTimes(1)
  })

  it('không vi phạm axe', async () => {
    const { container } = render(
      <div>
        <ThanhBonBuoc tinhTrang={MAU} lienKet={NEO} />
        <ThanhBonBuoc tinhTrang={DU} />
        <ThanhBonBuoc tinhTrang={MAU} loi thuLai={() => {}} />
      </div>,
    )
    await expectNoAxeViolations(container)
  })
})

describe('BonBuocMini (C10 mini)', () => {
  it('role="img" với aria D34, 4 ô 14×6 cách 3, chữ "2/4 · Tiếp: Áp dụng"', () => {
    const { container } = render(<BonBuocMini tinhTrang={MAU} />)
    const hinh = screen.getByRole('img', {
      name: '4 bước: Hiểu xong, Áp dụng đang làm, Kiểm tra chưa làm, Ghi nhớ xong',
    })
    expect(hinh.className).toContain('gap-[3px]')
    const o = [...hinh.children] as HTMLElement[]
    expect(o).toHaveLength(4)
    for (const x of o) expect(x.className).toContain('h-1.5 w-3.5')
    expect(o.map((x) => x.dataset.tinhTrang)).toEqual(['xong', 'dang-lam', 'chua-lam', 'xong'])
    // màu mực: xong đặc primary; đang làm nửa đặc + viền primary; chưa làm viền border-input
    expect(o[0].className).toContain('bg-primary')
    expect(o[1].className).toContain('border-primary')
    expect(o[1].className).toContain('linear-gradient(90deg,var(--primary)_50%,transparent_50%)')
    expect(o[2].className).toContain('border-border-input')
    expect(container.textContent).toBe('2/4 · Tiếp: Áp dụng')
  })

  it('chưa bắt đầu "0/4"; coChu=false thì chỉ có hình', () => {
    const { container, rerender } = render(<BonBuocMini tinhTrang={CHUA} />)
    expect(container.textContent).toBe('0/4')
    rerender(<BonBuocMini tinhTrang={CHUA} coChu={false} />)
    expect(container.textContent).toBe('')
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('4 bước: Hiểu chưa làm')
  })

  it('không vi phạm axe', async () => {
    const { container } = render(
      <div>
        <BonBuocMini tinhTrang={MAU} />
        <BonBuocMini tinhTrang={DU} coChu={false} />
      </div>,
    )
    await expectNoAxeViolations(container)
  })
})
