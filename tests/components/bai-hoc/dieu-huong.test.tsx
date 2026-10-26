// @vitest-environment jsdom
// C12 Breadcrumb + menu ▾ (D10, đề xuất 4.3), C13 dải vị trí (D10), C14 pager (D12, D30), khung bài trống (F17).
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mucHocCua, viTriTrongVung } from '../../../shared/roadmap'
import type { TrangThaiHoc } from '../../../shared/domain/trang-thai'
import Breadcrumb from '../../../src/components/bai-hoc/Breadcrumb'
import DaiViTri from '../../../src/components/bai-hoc/DaiViTri'
import KhungBaiTrong from '../../../src/components/bai-hoc/KhungBaiTrong'
import Pager from '../../../src/components/bai-hoc/Pager'
import { truocTiep } from '../../../src/components/bai-hoc/dinh-vi'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { cay, muc } from '../../pages/bai-hoc/ho-tro'

beforeEach(() => {
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
})

const tra = (bang: Record<string, TrangThaiHoc>) => (id: string) => bang[id] ?? 'chua-hoc'
const boc = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('C12 Breadcrumb', () => {
  it('2–4 cấp: mỗi cấp cha là nút ▾ (lang=en), cấp cuối là mục đang mở aria-current="page"', async () => {
    const moscow = muc('moscow')
    const { container } = boc(<Breadcrumb muc={moscow} cay={cay} trangThaiCua={tra({})} />)
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    const nut = within(nav).getAllByRole('button')
    expect(nut.map((n) => n.textContent)).toEqual([
      moscow.phan.label,
      moscow.linhVuc!.label,
      moscow.nhom!.label,
    ])
    expect(nut.every((n) => n.getAttribute('aria-haspopup') === 'menu')).toBe(true)
    const cuoi = nav.querySelector('[aria-current="page"]')!
    expect(cuoi.textContent).toBe(moscow.label)
    expect(cuoi.querySelector('[lang="en"]')).not.toBeNull()
    await expectNoAxeViolations(container)
    cleanup()
    const pmp = muc('project-management-professional-pmp')
    boc(<Breadcrumb muc={pmp} cay={cay} trangThaiCua={tra({})} />)
    expect(screen.getAllByRole('button').map((n) => n.textContent)).toEqual([pmp.phan.label])
  })

  it('menu lĩnh vực: các lĩnh vực cùng phần + phân số "x/y", lĩnh vực đang mở "· đang mở" (D10)', () => {
    const sc = muc('scope-creep')
    const cacMuc = mucHocCua(cay, sc.linhVuc!.id)
    const bang = { [cacMuc[0].id]: 'da-xong', [cacMuc[1].id]: 'bo-qua' } as Record<
      string,
      TrangThaiHoc
    >
    boc(<Breadcrumb muc={sc} cay={cay} trangThaiCua={tra(bang)} />)
    const nut = screen.getByRole('button', { name: sc.linhVuc!.label })
    act(() => nut.focus())
    fireEvent.keyDown(nut, { key: 'Enter' })
    const menu = screen.getByRole('menu')
    const cac = within(menu).getAllByRole('menuitem')
    expect(cac.length).toBe(sc.phan.con.length)
    const dangMo = cac.find((a) => a.getAttribute('aria-current') === 'page')!
    expect(dangMo.getAttribute('href')).toBe(`/linh-vuc/${sc.linhVuc!.slug}`)
    expect(dangMo.textContent).toBe(
      `${sc.linhVuc!.label}1/${cacMuc.length - 1} · 1 bỏ qua · đang mở`,
    )
    expect(cac.filter((a) => a.getAttribute('aria-current'))).toHaveLength(1)
  })

  it('menu nhóm: mục học có icon + chữ trạng thái (D2), nhóm có phân số; phần dẫn tới Lộ trình lọc theo phần', () => {
    const moscow = muc('moscow')
    const sc = muc('scope-creep')
    boc(<Breadcrumb muc={moscow} cay={cay} trangThaiCua={tra({ [sc.id]: 'dang-hoc' })} />)
    fireEvent.keyDown(screen.getByRole('button', { name: moscow.nhom!.label }), { key: 'Enter' })
    const mucSc = screen.getByRole('menuitem', { name: new RegExp(sc.label) })
    expect(mucSc.getAttribute('href')).toBe(`/hoc/${sc.slug}`)
    expect(mucSc.textContent).toBe(`${sc.label}Đang học`)
    expect(mucSc.querySelector('[data-trang-thai="dang-hoc"]')).not.toBeNull()
    const nhom = screen.getByRole('menuitem', { name: new RegExp(moscow.nhom!.label) })
    expect(nhom.getAttribute('href')).toBe(`/linh-vuc/${moscow.linhVuc!.slug}#${moscow.nhom!.slug}`)
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    fireEvent.keyDown(screen.getByRole('button', { name: moscow.phan.label }), { key: 'Enter' })
    const cacPhan = within(screen.getByRole('menu')).getAllByRole('menuitem')
    expect(cacPhan).toHaveLength(cay.phan.length)
    expect(cacPhan[0].getAttribute('href')).toBe(`/lo-trinh?xem=danh-sach&phan=${cay.phan[0].slug}`)
  })
})

describe('C13 Dải vị trí', () => {
  it('mỗi mục cùng lĩnh vực một chấm (icon trạng thái), mục đang mở aria-current + ", đang mở"; "Mục 3/16 · <lĩnh vực>"', async () => {
    const sc = muc('scope-creep')
    const vt = viTriTrongVung(cay, sc.id)
    const bang = { [vt.cacMuc[0].id]: 'da-xong' } as Record<string, TrangThaiHoc>
    const { container } = boc(<DaiViTri muc={sc} cay={cay} trangThaiCua={tra(bang)} />)
    const nav = screen.getByRole('navigation', { name: `Các mục trong ${sc.linhVuc!.label}` })
    const cham = within(nav).getAllByRole('link')
    expect(cham).toHaveLength(vt.tong)
    expect(cham[0].getAttribute('aria-label')).toBe(
      `Mục 1/${vt.tong}: ${vt.cacMuc[0].label}, Đã xong`,
    )
    const dangMo = cham[vt.thuTu - 1]
    expect(dangMo.getAttribute('aria-current')).toBe('page')
    expect(dangMo.getAttribute('aria-label')).toBe(
      `Mục ${vt.thuTu}/${vt.tong}: ${sc.label}, Chưa học, đang mở`,
    )
    expect(dangMo.querySelector('svg')?.getAttribute('width')).toBe('22')
    expect(cham[1].querySelector('svg')?.getAttribute('width')).toBe('14')
    expect(cham[1].getAttribute('href')).toBe(`/hoc/${vt.cacMuc[1].slug}`)
    expect(container.textContent).toContain(`Mục ${vt.thuTu}/${vt.tong} · ${sc.linhVuc!.label}`)
    await expectNoAxeViolations(container)
  })

  it('màu chấm như F11: Đã xong / Đang học dùng token màu đặc (solid), Chưa học border-input, mục đang mở màu chữ', () => {
    const sc = muc('scope-creep')
    const vt = viTriTrongVung(cay, sc.id)
    const [m0, m1, m2] = vt.cacMuc.filter((m) => m.id !== sc.id)
    boc(
      <DaiViTri
        muc={sc}
        cay={cay}
        trangThaiCua={tra({ [m0.id]: 'da-xong', [m1.id]: 'dang-hoc', [sc.id]: 'da-xong' })}
      />,
    )
    const cham = (id: string) =>
      screen
        .getAllByRole('link')
        .find((a) => a.getAttribute('href') === `/hoc/${cay.mucTheoId.get(id)!.slug}`)!
    expect(cham(m0.id).className).toContain('text-[var(--st-done-solid)]')
    expect(cham(m0.id).className).not.toContain('--st-done-ic')
    expect(cham(m1.id).className).toContain('text-[var(--st-learning-solid)]')
    expect(cham(m2.id).className).toContain('text-border-input')
    expect(cham(sc.id).className).toContain('text-text')
    expect(cham(sc.id).className).not.toContain('st-done')
  })

  it('mục không thuộc lĩnh vực: vùng là phần', () => {
    const pmp = muc('project-management-professional-pmp')
    const vt = viTriTrongVung(cay, pmp.id)
    const { container } = boc(<DaiViTri muc={pmp} cay={cay} trangThaiCua={tra({})} />)
    expect(container.textContent).toContain(`Mục ${vt.thuTu}/${vt.tong} · ${pmp.phan.label}`)
  })
})

describe('C14 Pager', () => {
  it('cùng vùng: "Trước" / "Tiếp" + tên mục, phím [ ] (aria-keyshortcuts)', async () => {
    const sc = muc('scope-creep')
    const { truoc, tiep } = truocTiep(cay, sc, tra({}))
    const { container } = boc(<Pager muc={sc} truoc={truoc} tiep={tiep} />)
    const nav = screen.getByRole('navigation', { name: 'Mục trước và tiếp' })
    const [a, b] = within(nav).getAllByRole('link')
    expect(a.getAttribute('href')).toBe(`/hoc/${truoc!.slug}`)
    expect(a.getAttribute('aria-keyshortcuts')).toBe('[')
    // Chữ phím [ ] chỉ để nhìn (aria-hidden), tên truy cập không có.
    expect(a.textContent).toBe(`Trước[${truoc!.label}`)
    expect(a.querySelector('kbd')?.getAttribute('aria-hidden')).toBe('true')
    expect(b.getAttribute('aria-keyshortcuts')).toBe(']')
    expect(b.textContent).toBe(`]Tiếp${tiep!.label}`)
    await expectNoAxeViolations(container)
  })

  it('vượt ranh giới (D12): "‹ Trước — sang lĩnh vực trước: {tên}", bỏ qua mục Bỏ qua (F15)', () => {
    const rr = muc('risk-register')
    const { truoc, tiep } = truocTiep(
      cay,
      rr,
      tra({ [muc('function-point-analysis').id]: 'bo-qua' }),
    )
    boc(<Pager muc={rr} truoc={truoc} tiep={tiep} />)
    const a = screen.getAllByRole('link')[0]
    expect(a.textContent).toBe(
      `Trước — sang lĩnh vực trước: ${truoc!.linhVuc!.label}[${truoc!.label}`,
    )
    expect(a.querySelector('[lang="en"]')?.textContent).toBe(truoc!.linhVuc!.label)
  })

  it('mục cuối (D30): card viền liền "Đây là mục cuối cùng của roadmap", không phải link; không có Trước thì giữ chỗ', () => {
    const cuoi = cay.mucHoc[cay.soMucHoc - 1]
    const { truoc, tiep } = truocTiep(cay, cuoi, tra({}))
    const { container } = boc(<Pager muc={cuoi} truoc={truoc} tiep={tiep} />)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    const het = screen.getByText('Đây là mục cuối cùng của roadmap')
    expect(het.tagName).toBe('P')
    expect(het.className).toContain('border-border')
    expect(het.className).not.toContain('dashed')
    cleanup()
    const dau = cay.mucHoc[0]
    const tt = truocTiep(cay, dau, tra({}))
    boc(<Pager muc={dau} truoc={tt.truoc} tiep={tt.tiep} />)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(container.querySelector('[data-huong="truoc"]')).toBeNull()
  })

  it('chip nội dung của mục kề khi biết (phase 2b cấp dữ liệu)', () => {
    const sc = muc('scope-creep')
    const { truoc, tiep } = truocTiep(cay, sc, tra({}))
    boc(
      <Pager
        muc={sc}
        truoc={truoc}
        tiep={tiep}
        noiDungCua={(id) => (id === tiep!.id ? { loai: 'chua-co' } : undefined)}
      />,
    )
    expect(screen.getAllByText('Chưa có nội dung')).toHaveLength(1)
  })
})

describe('Khung bài trống (F17, F18)', () => {
  /** Khối do app tạo: nơi dùng vẽ chính khối đó (trang thật: KhoiApp); ở đây chỉ là một đoạn đánh dấu. */
  const veKhoiApp = (k: { id: string; tieuDe: string }) => <p data-khoi-that={k.id}>{k.tieuDe}</p>

  it('Chủ đề: "0/9 khối bắt buộc", khối 7 ghi đủ 3 tên, Mục liên quan tuỳ chọn, không có Nói lại', async () => {
    const { container } = render(<KhungBaiTrong mau="chu-de" veKhoiApp={veKhoiApp} />)
    expect(container.textContent).toContain('0/9 khối bắt buộc')
    const hang = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(hang.map((h) => h.getAttribute('data-khoi'))).not.toContain('noi-lai-bang-loi-cua-ban')
    expect(hang).toHaveLength(11)
    expect(hang[6].textContent).toBe('So sánh · Thuật ngữ · Thực hành công cụ · tuỳ chọnChưa có')
    expect(hang[0].textContent).toBe('Tóm tắt ★ (bắt buộc)Chưa có')
    expect(hang.every((h) => h.className.includes('border-dashed'))).toBe(true)
    // Mục liên quan đọc lien_quan của file: vẫn là ô "Chưa có" (F17)
    expect(container.querySelector('[data-khoi="muc-lien-quan"]')?.textContent).toBe(
      'Mục liên quan · tuỳ chọnChưa có',
    )
    expect(container.querySelector('[data-khoi-that]')).toBeNull()
    await expectNoAxeViolations(container)
  })

  it('Tài liệu 0/8, Chứng chỉ 0/7 (không có Nhật ký thi thử P2): Bản của tôi, Kế hoạch thi là khối do app tạo — vẽ qua veKhoiApp đúng vị trí, không bao giờ là ô nét đứt "Chưa có"', async () => {
    const { container } = render(<KhungBaiTrong mau="tai-lieu" veKhoiApp={veKhoiApp} />)
    expect(container.textContent).toContain('0/8 khối bắt buộc')
    expect(container.querySelector('[data-khoi="ban-cua-toi"]')).toBeNull()
    const banCuaToi = container.querySelector('[data-khoi-app="ban-cua-toi"]')!
    expect(banCuaToi.className).not.toContain('border-dashed')
    expect(banCuaToi.textContent).toBe('Bản của tôi')
    expect(banCuaToi.textContent).not.toContain('Chưa có')
    // đúng vị trí trong mẫu: sau Lỗi thường gặp, trước Tự kiểm tra
    const thuTu = (c: Element) =>
      [...c.querySelectorAll('li')].map(
        (h) => h.getAttribute('data-khoi') ?? h.getAttribute('data-khoi-app'),
      )
    expect(thuTu(container).slice(5, 8)).toEqual(['loi-thuong-gap', 'ban-cua-toi', 'tu-kiem-tra'])
    await expectNoAxeViolations(container)
    cleanup()

    const cc = render(<KhungBaiTrong mau="chung-chi" veKhoiApp={veKhoiApp} />)
    expect(cc.container.textContent).toContain('0/7 khối bắt buộc')
    expect(cc.container.querySelector('[data-khoi="ke-hoach-thi-cua-toi"]')).toBeNull()
    const keHoach = cc.container.querySelector('[data-khoi-app="ke-hoach-thi-cua-toi"]')!
    expect(keHoach.className).not.toContain('border-dashed')
    expect(keHoach.querySelector('[data-khoi-that="ke-hoach-thi-cua-toi"]')).not.toBeNull()
    expect(cc.container.querySelector('[data-khoi="nhat-ky-thi-thu"]')).toBeNull()
    expect(cc.container.querySelector('[data-khoi-app="nhat-ky-thi-thu"]')).toBeNull()
    expect(thuTu(cc.container).slice(3, 6)).toEqual([
      'phu-roadmap',
      'ke-hoach-thi-cua-toi',
      'tu-kiem-tra',
    ])
    // Không ô nét đứt nào là khối do app tạo chứa việc của người học
    for (const o of cc.container.querySelectorAll('.border-dashed')) {
      expect(o.getAttribute('data-khoi')).not.toMatch(/noi-lai|ban-cua-toi|ke-hoach-thi/)
    }
  })
})
