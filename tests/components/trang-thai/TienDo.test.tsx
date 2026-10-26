// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ChuGiaiTienDo,
  chuNoiDung,
  chuPhanSo,
  chuTienDo,
  chuTienDoChiTiet,
  DongTienDo,
  MauSocBoQua,
  nhanNoiDungTong,
  nhanVongTienDo,
  phanTramTienDo,
  ThanhNoiDung,
  ThanhTienDo,
  TienDoDangTai,
  TienDoLoi,
  VongTienDo,
} from '../../../src/components/trang-thai/TienDo'
import { expectNoAxeViolations } from '../../ho-tro/axe'

afterEach(cleanup)

// Số của F02 / F03 (tổng 199 chỉ có trong test)
const F02 = { xong: 37, dangHoc: 6, boQua: 4, tong: 199 }
const CHU_VI = 2 * Math.PI * 52

describe('chữ tiến độ (§1, đề xuất 3.3)', () => {
  it('"19% · 37/195 · 4 bỏ qua" — % = Đã xong / (tổng − Bỏ qua)', () => {
    expect(phanTramTienDo(F02)).toBe('19%')
    expect(chuPhanSo(F02)).toBe('37/195 · 4 bỏ qua')
    expect(chuTienDo(F02)).toBe('19% · 37/195 · 4 bỏ qua')
  })

  it('ẩn " · n bỏ qua" khi n = 0; luonHienBoQua giữ "0 bỏ qua" (cả roadmap, F05)', () => {
    const s = { xong: 12, boQua: 0, tong: 22 }
    expect(chuTienDo(s)).toBe('55% · 12/22')
    expect(chuTienDo(s, { luonHienBoQua: true })).toBe('55% · 12/22 · 0 bỏ qua')
  })

  it('mẫu số 0 (chưa có mục / bỏ qua hết) → "—", không chia cho 0', () => {
    expect(phanTramTienDo({ xong: 0, boQua: 0, tong: 0 })).toBe('—')
    expect(chuTienDo({ xong: 0, boQua: 3, tong: 3 })).toBe('— · 0/0 · 3 bỏ qua')
  })

  it('làm tròn; chưa đủ thì không hiện 100%; đủ thì 100%; có 1 mục vẫn có thể 0%', () => {
    expect(phanTramTienDo({ xong: 198, boQua: 0, tong: 199 })).toBe('99%')
    expect(phanTramTienDo({ xong: 195, boQua: 4, tong: 199 })).toBe('100%')
    expect(phanTramTienDo({ xong: 1, boQua: 0, tong: 300 })).toBe('0%')
    expect(phanTramTienDo({ xong: 0, boQua: 0, tong: 199 })).toBe('0%')
    expect(phanTramTienDo({ xong: 1, boQua: 0, tong: 8 })).toBe('13%')
  })

  it('số kiểu Việt Nam (chấm hàng nghìn)', () => {
    expect(chuPhanSo({ xong: 1200, boQua: 1000, tong: 3500 })).toBe('1.200/2.500 · 1.000 bỏ qua')
  })

  it('dòng chi tiết bỏ phần có số 0: "5/16 · Đang học 1 · Chưa học 10"', () => {
    expect(chuTienDoChiTiet({ xong: 5, dangHoc: 1, boQua: 0, tong: 16 })).toBe(
      '5/16 · Đang học 1 · Chưa học 10',
    )
    expect(chuTienDoChiTiet({ xong: 3, dangHoc: 0, boQua: 2, tong: 16 })).toBe(
      '3/14 · 2 bỏ qua · Chưa học 11',
    )
    expect(chuTienDoChiTiet({ xong: 4, dangHoc: 0, boQua: 0, tong: 4 })).toBe('4/4')
  })

  it('aria vòng (F03): "Tiến độ 19%, 37 trên 195 mục, 4 bỏ qua"', () => {
    expect(nhanVongTienDo(F02)).toBe('Tiến độ 19%, 37 trên 195 mục, 4 bỏ qua')
    expect(nhanVongTienDo({ xong: 0, boQua: 0, tong: 199 })).toBe(
      'Tiến độ 0%, 0 trên 199 mục, 0 bỏ qua',
    )
    expect(nhanVongTienDo({ xong: 0, boQua: 2, tong: 2 })).toBe(
      'Tiến độ chưa tính được phần trăm, 0 trên 0 mục, 2 bỏ qua',
    )
  })

  it('độ phủ nội dung: "41 duyệt · 9 nháp · 149 chưa có", aria đủ chữ', () => {
    const s = { daDuyet: 41, banNhap: 9, tong: 199 }
    expect(chuNoiDung(s)).toBe('41 duyệt · 9 nháp · 149 chưa có')
    expect(nhanNoiDungTong(s)).toBe('41 đã duyệt, 9 bản nháp, 149 chưa có')
    expect(nhanNoiDungTong({ daDuyet: 0, banNhap: 0, tong: 199 })).toBe(
      '0 đã duyệt, 0 bản nháp, 199 chưa có',
    )
  })
})

describe('VongTienDo (C11 vòng)', () => {
  it('136px, role="img" + aria; giữa: %, phân số, "n bỏ qua"', () => {
    const { container } = render(<VongTienDo {...F02} />)
    const svg = screen.getByRole('img', { name: 'Tiến độ 19%, 37 trên 195 mục, 4 bỏ qua' })
    expect(svg.getAttribute('width')).toBe('136')
    expect(svg.getAttribute('viewBox')).toBe('0 0 136 136')
    const giua = container.querySelector('[aria-hidden="true"]')!
    expect([...giua.children].map((c) => c.textContent)).toEqual(['19%', '37/195', '4 bỏ qua'])
  })

  it('từ 12 giờ theo chiều kim đồng hồ: Đã xong → Đang học → Bỏ qua (sọc), tỉ lệ trên tổng như frame', () => {
    const { container } = render(<VongTienDo {...F02} />)
    const doan = [...container.querySelectorAll('circle[data-doan]')]
    expect(doan.map((d) => d.getAttribute('data-doan'))).toEqual(['xong', 'dang-hoc', 'bo-qua'])
    for (const d of doan) expect(d.getAttribute('transform')).toBe('rotate(-90 68 68)')
    // F02: "60.75 326.73" / "9.85" lệch −60.75 / "6.57" lệch −70.6
    expect(doan.map((d) => d.getAttribute('stroke-dasharray'))).toEqual([
      `60.75 ${CHU_VI.toFixed(2)}`,
      `9.85 ${CHU_VI.toFixed(2)}`,
      `6.57 ${CHU_VI.toFixed(2)}`,
    ])
    expect(doan.map((d) => d.getAttribute('stroke-dashoffset'))).toEqual([
      '0.00',
      '-60.75',
      '-70.60',
    ])
    expect(doan[0].getAttribute('class')).toContain('stroke-[var(--st-done-solid)]')
    expect(doan[1].getAttribute('class')).toContain('stroke-[var(--st-learning-solid)]')
    // D19: Bỏ qua tô bằng <pattern> sọc dùng chung
    const id = container.querySelector('pattern')!.id
    expect(doan[2].getAttribute('stroke')).toBe(`url(#${id})`)
  })

  it('phần có số 0 không vẽ; chưa bắt đầu chỉ còn nền', () => {
    const { container } = render(<VongTienDo xong={0} dangHoc={0} boQua={0} tong={199} />)
    expect(container.querySelectorAll('circle[data-doan]')).toHaveLength(0)
    expect(container.querySelectorAll('circle')).toHaveLength(1)
    expect(container.textContent).toBe('0%0/1990 bỏ qua')
  })

  it('số đếm lỗi (tổng các phần > tổng) không vẽ vượt một vòng', () => {
    const { container } = render(<VongTienDo xong={8} dangHoc={4} boQua={4} tong={10} />)
    const dai = [...container.querySelectorAll('circle[data-doan]')].map((d) =>
      Number(d.getAttribute('stroke-dasharray')!.split(' ')[0]),
    )
    expect(dai.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(CHU_VI + 0.01)
  })

  it('bản nhỏ 112px (F04): không có dòng "n bỏ qua" ở giữa', () => {
    const { container } = render(<VongTienDo {...F02} co="nho" />)
    expect(screen.getByRole('img').getAttribute('width')).toBe('112')
    expect(container.textContent).toBe('19%37/195')
  })

  it('mỗi vòng có id pattern riêng, an toàn cho url(#…)', () => {
    const { container } = render(
      <>
        <VongTienDo {...F02} />
        <VongTienDo {...F02} />
      </>,
    )
    const ids = [...container.querySelectorAll('pattern')].map((p) => p.id)
    expect(new Set(ids).size).toBe(2)
    for (const id of ids) expect(id).toMatch(/^[\w-]+$/)
  })

  it('MauSocBoQua: ô 6, sọc 2px xoay 45°, màu theo token Bỏ qua', () => {
    const { container } = render(
      <svg>
        <defs>
          <MauSocBoQua id="soc" />
        </defs>
      </svg>,
    )
    const p = container.querySelector('pattern#soc')!
    expect(p.getAttribute('patternTransform')).toBe('rotate(45)')
    expect(p.getAttribute('width')).toBe('6')
    const [nen, soc] = [...p.querySelectorAll('rect')]
    expect(nen.getAttribute('class')).toContain('fill-[var(--st-skip-bg)]')
    expect(soc.getAttribute('width')).toBe('2')
    expect(soc.getAttribute('class')).toContain('fill-[var(--st-skip-fg)]')
  })
})

describe('ChuGiaiTienDo', () => {
  it('4 dòng ô màu + chữ + số; Chưa học = tổng − các phần', () => {
    const { container } = render(<ChuGiaiTienDo {...F02} />)
    expect([...container.querySelectorAll('li')].map((l) => l.textContent)).toEqual([
      'Đã xong 37',
      'Đang học 6',
      'Bỏ qua 4',
      'Chưa học 152',
    ])
    expect(container.innerHTML).toContain('bg-[image:var(--st-skip-stripe)]')
  })
})

describe('ThanhTienDo (C11 thanh, D19)', () => {
  it('cao 8, bo 4, nền surface-2, viền border; Đã xong → Đang học → Bỏ qua (sọc, dồn phải)', () => {
    const { container } = render(<ThanhTienDo xong={3} dangHoc={1} boQua={2} tong={16} />)
    const thanh = container.firstElementChild as HTMLElement
    expect(thanh.className).toContain('h-2')
    expect(thanh.className).toContain('rounded-[4px]')
    expect(thanh.className).toContain('bg-surface-2')
    expect(thanh.getAttribute('aria-hidden')).toBe('true')
    const doan = [...thanh.children] as HTMLElement[]
    expect(doan.map((d) => d.dataset.doan)).toEqual(['xong', 'dang-hoc', 'bo-qua'])
    // F02 "Schedule Management": 18.75% / 6.25% / 12.5%
    expect(doan.map((d) => d.style.width)).toEqual(['18.75%', '6.25%', '12.5%'])
    expect(doan[2].className).toContain('ml-auto')
    expect(doan[2].className).toContain('bg-[image:var(--st-skip-stripe)]')
  })

  it('đứng một mình có nhãn thì role="img"; phần 0 không vẽ', () => {
    render(<ThanhTienDo xong={0} dangHoc={0} boQua={0} tong={10} nhan="Tiến độ 0%" />)
    const thanh = screen.getByRole('img', { name: 'Tiến độ 0%' })
    expect(thanh.children).toHaveLength(0)
  })

  it('DongTienDo: tên + phân số + thanh; chưa bắt đầu thì chữ muted', () => {
    const { container, rerender } = render(
      <DongTienDo ten="Phần A" xong={3} dangHoc={1} boQua={2} tong={16} />,
    )
    expect(container.textContent).toBe('Phần A3/14 · 2 bỏ qua')
    expect(container.innerHTML).not.toContain('text-muted')
    rerender(<DongTienDo ten="Phần B" xong={0} dangHoc={0} boQua={0} tong={10} />)
    expect(container.textContent).toBe('Phần B0/10')
    expect((container.firstElementChild!.firstElementChild as HTMLElement).className).toContain(
      'text-muted',
    )
  })
})

describe('ThanhNoiDung (D19: phần Chưa có nét đứt)', () => {
  it('viền nét đứt border-input, Đã duyệt → Bản nháp, phần còn lại để trống; aria đủ', () => {
    render(<ThanhNoiDung daDuyet={41} banNhap={9} tong={199} />)
    const thanh = screen.getByRole('img', { name: '41 đã duyệt, 9 bản nháp, 149 chưa có' })
    expect(thanh.className).toContain('border-dashed')
    expect(thanh.className).toContain('border-border-input')
    expect(thanh.className).toContain('h-2')
    const doan = [...thanh.children] as HTMLElement[]
    expect(doan.map((d) => d.dataset.doan)).toEqual(['da-duyet', 'ban-nhap'])
    expect(doan.map((d) => d.style.width)).toEqual(['20.6%', '4.52%'])
    expect(doan[0].className).toContain('bg-[var(--noi-dung-duyet)]')
    expect(doan[1].className).toContain('bg-[var(--noi-dung-nhap)]')
  })

  it('bản nhỏ 80×6 (F06)', () => {
    render(<ThanhNoiDung daDuyet={0} banNhap={0} tong={10} co="nho" />)
    const thanh = screen.getByRole('img')
    expect(thanh.className).toContain('h-1.5 w-20')
    expect(thanh.children).toHaveLength(0)
  })
})

describe('đang tải / lỗi', () => {
  it('đang tải: thanh skeleton 160 + "Đang tải…"', () => {
    const { container } = render(<TienDoDangTai />)
    expect(container.textContent).toBe('Đang tải…')
    expect((container.querySelector('[aria-hidden="true"]') as HTMLElement).style.width).toBe(
      '160px',
    )
  })

  it('lỗi: icon + "Không tính được tiến độ — Thử lại"', () => {
    const thuLai = vi.fn()
    const { container } = render(<TienDoLoi thuLai={thuLai} />)
    expect(container.textContent).toBe('Không tính được tiến độ — Thử lại')
    expect(container.firstElementChild?.className).toContain('text-danger')
    expect(container.querySelector('svg')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(thuLai).toHaveBeenCalledTimes(1)
  })
})

it('C11 không vi phạm axe', async () => {
  const { container } = render(
    <div>
      <VongTienDo {...F02} />
      <VongTienDo {...F02} co="nho" />
      <ChuGiaiTienDo {...F02} />
      <p>
        {chuTienDo(F02)} <ThanhTienDo {...F02} />
      </p>
      <ThanhTienDo {...F02} nhan={nhanVongTienDo(F02)} />
      <DongTienDo ten="Phần A" xong={3} dangHoc={1} boQua={2} tong={16} />
      <ThanhNoiDung daDuyet={41} banNhap={9} tong={199} />
      <TienDoDangTai />
      <TienDoLoi thuLai={() => {}} />
    </div>,
  )
  await expectNoAxeViolations(container)
})
