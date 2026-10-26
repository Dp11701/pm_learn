// @vitest-environment jsdom
// Markdown của bài đã làm sạch (đề xuất 1.5, 6 "file .md chứa <script>, <img onerror>, [x](javascript:…),
// ![](../../data/hoc.db), ![](x.svg)"): HTML thô thành chữ, link chỉ http(s) / mailto / trong app / neo, link
// ngoài mở tab mới rel="noopener noreferrer", ảnh chỉ trong thư mục nội dung qua /api/anh, tiêu đề không quá h3,
// bảng trong vùng cuộn riêng.
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import MarkdownBai from '../../../src/components/bai-hoc/Markdown'
import { expectNoAxeViolations } from '../../ho-tro/axe'
import { muc } from '../../pages/bai-hoc/ho-tro'

afterEach(cleanup)

const sc = muc('scope-creep')

function ve(md: string, trongDong = false) {
  return render(
    <MemoryRouter>
      <main>
        <MarkdownBai muc={sc} tenKhoi="Tóm tắt" trongDong={trongDong}>
          {md}
        </MarkdownBai>
      </main>
    </MemoryRouter>,
  )
}

describe('MarkdownBai — an toàn', () => {
  it('HTML thô (khối và trong dòng) hiện thành chữ, không thành phần tử', () => {
    const { container } = ve(
      [
        '<script>alert(1)</script>',
        '',
        'Chữ <b>đậm giả</b> và <img src=x onerror="alert(2)">.',
      ].join('\n'),
    )
    expect(container.querySelector('script, b, img, iframe')).toBeNull()
    expect(container.textContent).toContain('<script>alert(1)</script>')
    expect(container.textContent).toContain('<b>đậm giả</b>')
    expect(container.textContent).toContain('<img src=x onerror="alert(2)">')
  })

  it('link javascript: / data: / //host chỉ hiện chữ, không có href', () => {
    const { container } = ve(
      '[a](javascript:alert(1)) [b](data:text/html,x) [c](//evil.example) [d](JaVaScRiPt:alert(1))',
    )
    expect(container.querySelectorAll('a')).toHaveLength(0)
    for (const chu of ['a', 'b', 'c', 'd']) expect(screen.getByText(chu).tagName).toBe('SPAN')
  })

  it('link ngoài mở tab mới với rel="noopener noreferrer"; link trong app đi qua router; neo giữ nguyên', () => {
    ve(
      '[ngoài](https://example.com/x) [thư](mailto:a@example.com) [trong](/hoc/scope-creep) [neo](#tham-khao)',
    )
    const ngoai = screen.getByRole('link', { name: /ngoài/ })
    expect(ngoai.getAttribute('href')).toBe('https://example.com/x')
    expect(ngoai.getAttribute('target')).toBe('_blank')
    expect(ngoai.getAttribute('rel')).toBe('noopener noreferrer')
    expect(ngoai.textContent).toBe('ngoài (mở tab mới)')
    expect(screen.getByRole('link', { name: /thư/ }).getAttribute('target')).toBe('_blank')
    const trong = screen.getByRole('link', { name: 'trong' })
    expect(trong.getAttribute('href')).toBe('/hoc/scope-creep')
    expect(trong.hasAttribute('target')).toBe(false)
    expect(screen.getByRole('link', { name: 'neo' }).getAttribute('href')).toBe('#tham-khao')
  })

  it('ảnh: trong thư mục nội dung → /api/anh/<id>; ra ngoài, đuôi lạ, ảnh ngoài → không có <img>', () => {
    const { container } = ve(
      [
        '![sơ đồ](hinh/so-do.png)',
        '![db](../../data/hoc.db)',
        '![ra ngoài](../../../x.png)',
        '![ẩn](.thung-rac/x.png)',
        '![ngoài](https://example.com/a.png)',
        '![](javascript:alert(1))',
      ].join('\n\n'),
    )
    const anh = container.querySelectorAll('img')
    expect(anh).toHaveLength(1)
    expect(anh[0].getAttribute('src')).toBe(
      `/api/anh/${encodeURIComponent(sc.id)}?duong-dan=${encodeURIComponent('hinh/so-do.png')}`,
    )
    expect(anh[0].getAttribute('alt')).toBe('sơ đồ')
    expect(screen.getByText('db').tagName).toBe('SPAN')
    expect(screen.getByText('ra ngoài').tagName).toBe('SPAN')
    const ngoai = screen.getByRole('link', { name: /^ngoài/ })
    expect(ngoai.getAttribute('href')).toBe('https://example.com/a.png')
    expect(container.querySelector('[href^="javascript"], [src^="javascript"]')).toBeNull()
  })

  it('tiêu đề trong khối không lên quá h3 (H1 là tên mục, h2 là tên khối)', () => {
    const { container } = ve(['# Một', '', '### Ba', '', '#### Bốn'].join('\n'))
    expect(container.querySelector('h1, h2')).toBeNull()
    expect([...container.querySelectorAll('h3, h4')].map((h) => h.tagName)).toEqual([
      'H3',
      'H3',
      'H4',
    ])
  })

  it('bảng GFM nằm trong vùng cuộn ngang có tên, Tab tới được; task list chỉ để đọc', async () => {
    const { container } = ve(
      [
        '| Cột 1 | Cột 2 |',
        '| --- | --- |',
        '| a | b |',
        '',
        '- [x] Đã tick',
        '- [ ] Chưa tick',
      ].join('\n'),
    )
    const vung = screen.getByRole('region', { name: 'Bảng trong khối Tóm tắt, cuộn ngang' })
    expect(vung.getAttribute('tabindex')).toBe('0')
    expect(vung.querySelector('table')).not.toBeNull()
    const tick = container.querySelectorAll('input[type="checkbox"]')
    expect(tick).toHaveLength(2)
    expect([...tick].every((o) => (o as HTMLInputElement).disabled)).toBe(true)
    expect((tick[0] as HTMLInputElement).checked).toBe(true)
    await expectNoAxeViolations(container)
  })

  it('trongDong: không bọc <p> (ô bảng, câu hỏi, thuật ngữ)', () => {
    const { container } = ve('Chữ **đậm** trong dòng', true)
    expect(container.querySelector('p')).toBeNull()
    expect(container.querySelector('strong')?.textContent).toBe('đậm')
  })
})
