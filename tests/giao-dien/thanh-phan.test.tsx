// @vitest-environment jsdom
// Gallery /_dev/thanh-phan: F01 dựng được, chữ mẫu đến từ fixtures/mau, không lỗi console, qua axe;
// thanh chuyển trang F01 / F02 / F02b; bộ ép trạng thái hover / focus (gia-trang-thai).
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ThanhPhan from '../../src/dev/ThanhPhan'
import { Gia, useGiaTrangThai } from '../../src/dev/thanh-phan/gia-trang-thai'
import { datGiaoDien } from '../../src/app/giao-dien'
import { PhimTatProvider } from '../../src/app/phim-tat'
import { ToastProvider } from '../../src/components/Toast'
import { TimKiemProvider } from '../../src/components/tim-kiem/TimKiem'
import { mauF01 } from '../../fixtures/mau/thanh-phan'
import { expectNoAxeViolations } from '../ho-tro/axe'
import { dungLocalStorageJsdom } from './moi-truong'

dungLocalStorageJsdom()

let loiConsole: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  datGiaoDien('sang')
  loiConsole = vi.spyOn(console, 'error')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// Như GocApp: toast, phím tắt, tìm kiếm bọc quanh trang; route giống src/app/router.tsx.
function trangGallery() {
  return (
    <ToastProvider>
      <PhimTatProvider>
        <TimKiemProvider>
          <ThanhPhan />
        </TimKiemProvider>
      </PhimTatProvider>
    </ToastProvider>
  )
}

// Chữ mẫu nạp động + Suspense: dựng trong act bất đồng bộ để React xử lý lượt vẽ lại sau khi nạp xong.
async function dung(duong = '/_dev/thanh-phan') {
  const router = createMemoryRouter(
    [
      { path: '/_dev/thanh-phan', element: trangGallery() },
      { path: '/_dev/thanh-phan/:phan', element: trangGallery() },
    ],
    { initialEntries: [duong] },
  )
  const kq = await act(async () => render(<RouterProvider router={router} />))
  await screen.findByRole('heading', { level: 1 })
  return { ...kq, router }
}

describe('gallery F01', () => {
  it('dựng đủ 9 mục với chữ mẫu từ fixtures', async () => {
    await dung()
    expect(screen.getByRole('heading', { level: 1, name: 'Học PM A–Z' })).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(9)
    for (const chu of [mauF01.taiLieu, mauF01.nhom, mauF01.boQua, mauF01.chuThich.doan]) {
      expect(screen.getByText(chu)).toBeTruthy()
    }
    for (const p of mauF01.iconPhan) expect(screen.getByText(p.nhan)).toBeTruthy()
    expect(document.title).toBe('Design system · Học PM A–Z')
    expect(loiConsole).not.toHaveBeenCalled()
  })

  it('có ChonGiaoDien; đổi sang Tối thì nhãn frame đổi theo', async () => {
    await dung()
    expect(screen.getByText('F01 · Design system · Sáng')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'Tối' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByText('F01 · Design system · Tối')).toBeTruthy()
    expect(loiConsole).not.toHaveBeenCalled()
  })

  it('không có lỗi axe', async () => {
    const { container } = await dung()
    await expectNoAxeViolations(container)
  })
})

describe('thanh chuyển trang gallery', () => {
  it('3 link F01 / F02 / F02b, đánh dấu trang đang mở', async () => {
    await dung()
    const nav = screen.getByRole('navigation', { name: 'Trang gallery' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('aria-label'))).toEqual([
      'F01 · Design system',
      'F02 · Component phần 1',
      'F02b · Component phần 2',
    ])
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/_dev/thanh-phan',
      '/_dev/thanh-phan/f02',
      '/_dev/thanh-phan/f02b',
    ])
    expect(links[0].getAttribute('aria-current')).toBe('page')
    expect(links[1].getAttribute('aria-current')).toBeNull()
  })

  it('bấm F02 rồi F02b: đổi trang, đổi tiêu đề tab, giữ thanh chuyển trang', async () => {
    await dung()
    fireEvent.click(screen.getByRole('link', { name: 'F02 · Component phần 1' }))
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'C1 · C4–C8 · C10–C11 · C26 · C35 · C36',
      }),
    ).toBeTruthy()
    expect(document.title).toBe('Component phần 1 · Học PM A–Z')
    fireEvent.click(screen.getByRole('link', { name: 'F02b · Component phần 2' }))
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'C2 · C3 · C9 · C12–C25 · C28–C34 · C37 · C38',
      }),
    ).toBeTruthy()
    expect(document.title).toBe('Component phần 2 · Học PM A–Z')
    expect(
      screen.getByRole('link', { name: 'F02b · Component phần 2' }).getAttribute('aria-current'),
    ).toBe('page')
    expect(loiConsole).not.toHaveBeenCalled()
  })

  it('đường dẫn không có trang: báo, vẫn có thanh chuyển trang', async () => {
    const router = createMemoryRouter(
      [{ path: '/_dev/thanh-phan/:phan', element: trangGallery() }],
      { initialEntries: ['/_dev/thanh-phan/f99'] },
    )
    await act(async () => render(<RouterProvider router={router} />))
    expect(await screen.findByText(/Không có trang gallery này/)).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Trang gallery' })).toBeTruthy()
  })

  it('/f02 viết hoa vẫn mở F02', async () => {
    await dung('/_dev/thanh-phan/F02')
    expect(
      screen.getByRole('heading', { level: 1, name: 'C1 · C4–C8 · C10–C11 · C26 · C35 · C36' }),
    ).toBeTruthy()
  })
})

describe('ép trạng thái hover / focus (gia-trang-thai)', () => {
  function Thu() {
    useGiaTrangThai()
    return (
      <div>
        <Gia kieu="hover">
          <button type="button">Một</button>
        </Gia>
        <Gia
          kieu={[
            { kieu: 'hover', chon: '[data-k="2"]' },
            { kieu: 'focus', chon: '[data-k="3"]' },
          ]}
        >
          <div>
            <button type="button" data-k="1">
              Một
            </button>
            <button type="button" data-k="2">
              Hai
            </button>
            <button type="button" data-k="3">
              Ba
            </button>
          </div>
        </Gia>
      </div>
    )
  }

  let style: HTMLStyleElement
  beforeEach(() => {
    style = document.createElement('style')
    style.textContent = [
      '.a { color: red; }',
      '@media (hover: hover) { .b:hover { color: blue; } }',
      ':focus-visible { outline: 2px solid black; }',
      '.c:focus-within { border-color: green; }',
      '.d:not(:disabled):hover { background: gray; }',
      '.not-disabled\\:hover\\:e:not(:disabled):hover { color: teal; }',
    ].join('\n')
    document.head.append(style)
  })
  afterEach(() => style.remove())

  it('chép luật :hover / :focus-visible / :focus-within sang thuộc tính data-gia-*, giữ @media', () => {
    render(<Thu />)
    const css = document.getElementById('gia-trang-thai')?.textContent ?? ''
    expect(css).toContain('.b:is(:hover,[data-gia-hover])')
    expect(css).toMatch(/@media \(hover: ?hover\)/)
    expect(css).toContain(':is(:focus-visible,[data-gia-focus])')
    expect(css).toContain('.c:is(:focus-within,:has([data-gia-focus]))')
    expect(css).toContain('.d:not(:disabled):is(:hover,[data-gia-hover])')
    // Dấu hai chấm đã escape trong tên lớp giữ nguyên
    expect(css).toContain('.not-disabled\\:hover\\:e:not(:disabled):is(:hover,[data-gia-hover])')
    // Luật không có trạng thái thì không chép
    expect(css).not.toContain('.a')
  })

  it('đánh dấu đúng phần tử, gỡ khi rời trang', () => {
    render(<Thu />)
    const mot = screen.getAllByRole('button', { name: 'Một' })
    expect(mot[0].hasAttribute('data-gia-hover')).toBe(true)
    expect(mot[1].hasAttribute('data-gia-hover')).toBe(false)
    expect(screen.getByRole('button', { name: 'Hai' }).hasAttribute('data-gia-hover')).toBe(true)
    expect(screen.getByRole('button', { name: 'Ba' }).hasAttribute('data-gia-focus')).toBe(true)
    cleanup()
    expect(document.getElementById('gia-trang-thai')).toBeNull()
  })
})
