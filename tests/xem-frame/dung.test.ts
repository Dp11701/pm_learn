// scripts/xem-frame.ts: bộ dựng .dc.html trên mẫu tự viết nhỏ, và chạy thử trên frame thật của gói bàn giao.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  docTuThuMuc,
  dsFrame,
  dungFrame,
  dungThanhPhan,
  taoTrang,
  THU_MUC_THIET_KE,
  timFrame,
  type Canvas,
} from '../../scripts/xem-frame'
import * as trang from '../../src/dev/XemFrame'

// Một file .dc.html tối giản như của Claude Design.
function tep(markup: string, renderVals = 'return {}', props = '{}'): string {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>thử</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
${markup}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='${props}'>
class Component extends DCLogic {
  renderVals() { ${renderVals} }
}
</script>
</body>
</html>`
}

function dung(nguon: Record<string, string>, props: Record<string, unknown> = {}) {
  return dungThanhPhan('Goc', props, (ten) => nguon[ten])
}

describe('{{lỗ}}', () => {
  it('chèn đường dẫn vào chữ và thuộc tính, có thoát ký tự', () => {
    const kq = dung({
      Goc: tep(
        '<p title="{{a.b}}" style="color: {{a.mau}}; width: 2px">{{x}} &amp; {{y}}</p>',
        `return { x: '<b>', y: 3, a: { b: 'nói "chào"', mau: 'red' } }`,
      ),
    })
    expect(kq.than).toBe(
      '<p title="nói &quot;chào&quot;" style="color: red; width: 2px">&lt;b&gt; &amp; 3</p>',
    )
    expect(kq.thieu).toEqual([])
  })

  it('tính biểu thức JS đơn giản trong phạm vi vals', () => {
    const kq = dung({
      Goc: tep(
        `<span>{{n + 1}}</span><i>{{ds.length > 1 ? 'nhiều' : 'ít'}}</i><b title="{{'x' + n}}">{{false}}{{0}}</b>`,
        'return { n: 2, ds: [1, 2] }',
      ),
    })
    expect(kq.than).toBe('<span>3</span><i>nhiều</i><b title="x2">false0</b>')
    expect(kq.thieu).toEqual([])
  })

  it('giá trị rỗng thành chuỗi rỗng; tên không có thì ghi vào thiếu', () => {
    const kq = dung({ Goc: tep('<p>[{{a.khong}}][{{khongCo}}]</p>', 'return { a: {} }') })
    expect(kq.than).toBe('<p>[][]</p>')
    expect(kq.thieu.join('\n')).toContain('{{khongCo}}')
  })

  it('thuộc tính boolean: false thì bỏ, true thì giữ tên; aria-* giữ chữ "false"', () => {
    const markup = '<input type="checkbox" checked="{{c}}" aria-checked="{{c}}">'
    expect(dung({ Goc: tep(markup, 'return { c: false }') }).than).toBe(
      '<input type="checkbox" aria-checked="false">',
    )
    expect(dung({ Goc: tep(markup, 'return { c: true }') }).than).toBe(
      '<input type="checkbox" checked aria-checked="true">',
    )
  })

  it('giữ nguyên thẻ SVG tự đóng và chữ thường', () => {
    const kq = dung({ Goc: tep('<svg viewBox="0 0 2 2"><path d="M0 0" /></svg> a > b') })
    expect(kq.than).toBe('<svg viewBox="0 0 2 2"><path d="M0 0" /></svg> a > b')
  })
})

describe('<sc-for> và <sc-if>', () => {
  it('lặp theo list/as, vẫn đọc được biến ngoài vòng', () => {
    const kq = dung({
      Goc: tep(
        '<ul><sc-for list="{{ds}}" as="m" hint-placeholder-count="2"><li>{{m.ten}}{{dau}}</li></sc-for></ul>',
        `return { dau: '!', ds: [{ ten: 'a' }, { ten: 'b' }] }`,
      ),
    })
    expect(kq.than).toBe('<ul><li>a!</li><li>b!</li></ul>')
  })

  it('vòng lồng nhau trong bảng không bị đẩy ra ngoài <table>', () => {
    const kq = dung({
      Goc: tep(
        '<table><tbody><sc-for list="{{hang}}" as="h"><tr><sc-for list="{{h.o}}" as="o"><td>{{h.id}}{{o}}</td></sc-for></tr></sc-for></tbody></table>',
        `return { hang: [{ id: 'R', o: [1, 2] }, { id: 'S', o: [3] }] }`,
      ),
    })
    expect(kq.than).toBe(
      '<table><tbody><tr><td>R1</td><td>R2</td></tr><tr><td>S3</td></tr></tbody></table>',
    )
  })

  it('sc-if theo giá trị truthy, kể cả trong vòng lặp', () => {
    const kq = dung({
      Goc: tep(
        '<sc-if value="{{co}}" hint-placeholder-val="{{false}}"><b>có</b></sc-if><sc-if value="{{khong}}"><i>không</i></sc-if><sc-for list="{{ds}}" as="x"><sc-if value="{{x.on}}">{{x.t}}</sc-if></sc-for>',
        `return { co: 1, khong: '', ds: [{ on: true, t: 'a' }, { on: false, t: 'b' }, { on: 'y', t: 'c' }] }`,
      ),
    })
    expect(kq.than).toBe('<b>có</b>ac')
  })

  it('list không phải mảng thì ghi thiếu, không dựng', () => {
    const kq = dung({
      Goc: tep('<sc-for list="{{x}}" as="m">{{m}}</sc-for>', `return { x: 'abc' }`),
    })
    expect(kq.than).toBe('')
    expect(kq.thieu.join('\n')).toContain('không phải mảng')
  })

  it('thẻ sc-/dc- chưa hỗ trợ thì dựng phần bên trong và ghi thiếu', () => {
    const kq = dung({ Goc: tep('<sc-else><b>x</b></sc-else>') })
    expect(kq.than).toBe('<b>x</b>')
    expect(kq.thieu.join('\n')).toContain('<sc-else>')
  })
})

describe('<dc-import> và <helmet>', () => {
  const con = tep(
    `<helmet><link rel="stylesheet" href="font.css"><style>a{color:red}</style></helmet>
<div>{{s}}</div>`,
    `var p = this.props
    return { s: [p.tone, p.firstRun, typeof p.firstRun, p.minHeight, p.soLan, p.$preview.width, typeof p.hintSize].join('/') }`,
    '{"tone":{"editor":"enum","options":["sang","toi"],"default":"sang"},"soLan":{"editor":null,"default":2},"$preview":{"width":200,"height":100}}',
  )

  it('truyền prop: kebab-case thành camelCase, {{lỗ}} giữ kiểu, mặc định từ data-props, bỏ hint-*', () => {
    const kq = dung({
      Goc: tep(
        `<helmet><link rel="stylesheet" href="font.css"></helmet>
<section><dc-import name="Con" first-run="{{true}}" min-height="{{h}}" hint-size="1px,1px"></dc-import><dc-import name="Con" tone="toi" min-height="5px"></dc-import></section>`,
        `return { h: '960px' }`,
      ),
      Con: con,
    })
    expect(kq.than).toBe(
      '<section><div>sang/true/boolean/960px/2/200/undefined</div><div>toi//undefined/5px/2/200/undefined</div></section>',
    )
    // helmet của khung và của thành phần nhúng gom lại, bỏ trùng
    expect(kq.helmet).toEqual([
      '<link rel="stylesheet" href="font.css">',
      '<style>a{color:red}</style>',
    ])
    expect(kq.thieu).toEqual([])
  })

  it('props của frame gốc đè mặc định', () => {
    const kq = dungThanhPhan('Con', { tone: 'toi' }, (t) => (t === 'Con' ? con : undefined))
    expect(kq.than).toBe('<div>toi//undefined//2/200/undefined</div>')
  })

  it('thiếu file nhúng hoặc renderVals lỗi thì ghi thiếu', () => {
    const kq = dung({
      Goc: tep('<p>a</p><dc-import name="KhongCo"></dc-import><dc-import name="Hong"></dc-import>'),
      Hong: tep('<p>{{x}}</p>', `throw new Error('hỏng')`),
    })
    expect(kq.than).toBe('<p>a</p><p></p>')
    const thieu = kq.thieu.join('\n')
    expect(thieu).toContain('KhongCo.dc.html')
    expect(thieu).toContain('renderVals() lỗi: hỏng')
  })

  it('taoTrang gắn meta để trang /_dev/frame nhận ra và đọc danh sách thiếu', () => {
    const html = taoTrang(
      { ma: 'F99', tep: 'F99-thu.dc.html', tieuDe: 'F99 Thử', rong: 10, cao: 20 },
      { than: '<div>x</div>', helmet: ['<style>b{}</style>'], thieu: ['[F99] "a"'] },
    )
    expect(html).toContain('<meta name="xem-frame" content="F99">')
    expect(html).toContain(
      '<meta name="xem-frame-thieu" content="[&quot;[F99] \\&quot;a\\&quot;&quot;]">',
    )
    expect(html).toContain('<title>F99 Thử</title>')
    expect(html).toMatch(/<style>b\{\}<\/style>\n<\/head>\n<body>\n<div>x<\/div>\n<\/body>/)
  })
})

const canvas = JSON.parse(
  readFileSync(path.join(THU_MUC_THIET_KE, 'canvas.json'), 'utf8'),
) as Canvas
const ds = dsFrame(canvas)

describe('danh sách frame từ canvas.json', () => {
  it('đủ frame, mã không trùng', () => {
    expect(ds).toHaveLength(51)
    expect(new Set(ds.map((f) => f.ma.toLowerCase())).size).toBe(51)
  })

  it('mã lấy từ tên file, Main lấy từ tiêu đề, bản trùng mã dùng tên file', () => {
    const tepCua = (ma: string) => ds.find((f) => f.ma === ma)?.tep
    expect(tepCua('F01')).toBe('Main.dc.html')
    expect(tepCua('F01-toi')).toBe('F01-toi.dc.html')
    expect(tepCua('F02')).toBe('F02-sang.dc.html')
    expect(tepCua('F02-toi')).toBe('F02-toi.dc.html')
    expect(tepCua('F02b')).toBe('F02b-sang.dc.html')
    expect(tepCua('F02b-toi')).toBe('F02b-toi.dc.html')
    expect(tepCua('F06b')).toBe('F06b-ban-do-linh-vuc.dc.html')
    expect(tepCua('F25b')).toBe('F25b-tim-kiem-khac.dc.html')
    expect(tepCua('C34')).toBe('C34-sidebar.dc.html')
    expect(ds.find((f) => f.ma === 'F11')).toMatchObject({ rong: 1440, cao: 3900 })
    expect(ds.find((f) => f.ma === 'C34')).toMatchObject({ rong: 264, cao: 960 })
  })

  it('tìm theo mã, tên file có/không đuôi, không phân biệt hoa thường', () => {
    expect(timFrame(ds, 'f11')?.tep).toBe('F11-scope-creep.dc.html')
    expect(timFrame(ds, 'F11-scope-creep')?.ma).toBe('F11')
    expect(timFrame(ds, 'F11-scope-creep.dc.html')?.ma).toBe('F11')
    expect(timFrame(ds, 'main')?.ma).toBe('F01')
    expect(timFrame(ds, 'F02-sang')?.ma).toBe('F02')
    expect(timFrame(ds, 'F99')).toBeUndefined()
  })

  it('trang /_dev/frame dùng cùng quy tắc với script', () => {
    expect(trang.dsFrame(canvas)).toEqual(ds)
    const khoa = ds.flatMap((f) => [f.ma, f.ma.toLowerCase(), f.tep, f.tep.slice(0, -8)])
    for (const k of [...khoa, 'F99', '']) expect(trang.timFrame(ds, k)).toEqual(timFrame(ds, k))
    expect(trang.dsFrame(null)).toEqual([])
    expect(trang.dsFrame({ boards: 'x' })).toEqual([])
  })
})

describe('frame thật của gói bàn giao', () => {
  const sotLai = /\{\{|<\/?sc-|<\/?dc-|<\/?x-dc|<\/?helmet/

  for (const ma of ['F01', 'F11']) {
    it(`${ma} dựng đủ, không sót {{ hay thẻ <sc-/<dc-`, () => {
      const f = timFrame(ds, ma)
      expect(f).toBeDefined()
      if (!f) return
      const { html, thieu } = dungFrame(f, THU_MUC_THIET_KE)
      expect(thieu).toEqual([])
      expect(html).not.toMatch(sotLai)
      expect(html).toContain(`<meta name="xem-frame" content="${ma}">`)
      expect(html).toContain('fonts.googleapis.com')
      expect(html.length).toBeGreaterThan(20_000)
    })
  }

  it('bản Tối nhúng bản Sáng với theme="dark"', () => {
    const f = timFrame(ds, 'F01-toi')
    if (!f) throw new Error('thiếu F01-toi')
    const { html } = dungFrame(f, THU_MUC_THIET_KE)
    expect(html).toContain('F01 · Design system · Tối')
    expect(html).not.toMatch(sotLai)
  })

  it('mọi frame dựng được, không còn chỗ thiếu', () => {
    const conThieu = ds
      .map((f) => ({ ma: f.ma, ...dungFrame(f, THU_MUC_THIET_KE) }))
      .filter((k) => k.thieu.length > 0 || sotLai.test(k.html))
      .map((k) => `${k.ma}: ${k.thieu.join('; ')}`)
    expect(conThieu).toEqual([])
  })
})

// File .dc.html là dữ liệu tải về: mã của nó không được chạm tới tiến trình chính (review phase 0).
describe('cô lập mã của file thiết kế', () => {
  const thoat = [
    'this.constructor.constructor("return process")()',
    'globalThis.constructor.constructor("return process")()',
    'Object.getPrototypeOf(this.props).constructor.constructor("return process")()',
    'this.props.constructor.constructor("return process")()',
  ]
  for (const ma of thoat) {
    it(`renderVals không lấy được process: ${ma}`, () => {
      const kq = dung({ Goc: tep('<p>{{x}}</p>', `return { x: typeof (${ma}) }`) })
      expect(kq.than).not.toContain('object')
      expect(kq.thieu.join('\n')).toMatch(/renderVals\(\) lỗi/)
    })
  }

  it('{{biểu thức}} không lấy được process và không eval được', () => {
    const kq = dung({
      Goc: tep(
        '<p>{{ds.constructor.constructor("return process")().pid}}</p><i>{{eval("1+1")}}</i>',
        'return { ds: [1] }',
      ),
    })
    expect(kq.than).toBe('<p></p><i></i>')
    expect(kq.thieu).toHaveLength(2)
  })

  it('microtask chạy mãi bị dừng theo thời hạn', () => {
    const t0 = performance.now()
    const kq = dung({
      Goc: tep(
        '<p>{{x}}</p>',
        'const lap = () => Promise.resolve().then(lap); lap(); return { x: 1 }',
      ),
    })
    expect(performance.now() - t0).toBeLessThan(10_000)
    expect(kq.thieu.join('\n')).toMatch(/renderVals\(\) lỗi/)
  })

  it('bỏ <script>, iframe, thuộc tính on* và URL javascript: khỏi trang dựng ra', () => {
    const kq = dung({
      Goc: tep(
        '<helmet><script>alert(1)</script><style>p{}</style></helmet>' +
          '<p onclick="alert(1)" ONMOUSEOVER="x">a</p><img src="x" onerror="alert(1)">' +
          '<a href=" javascript:alert(1)">b</a><a href="{{u}}">c</a><iframe srcdoc="x"></iframe>' +
          '<script>alert(2)</script>',
        `return { u: 'JaVaScRiPt:alert(1)' }`,
      ),
    })
    expect(kq.than).toBe('<p>a</p><img src="x"><a>b</a><a>c</a>')
    expect(kq.helmet).toEqual(['<style>p{}</style>'])
  })

  it('tên file lạ trong canvas.json hoặc <dc-import> không ra ngoài thư mục thiết kế', () => {
    const canvas: Canvas = {
      boards: {
        '../../x.dc.html': { w: 1, h: 1, title: 'x' },
        'a/b.dc.html': { w: 1, h: 1, title: 'y' },
        'F99-thu.dc.html': { w: 1, h: 1, title: 'F99 thử' },
      },
    }
    expect(dsFrame(canvas).map((f) => f.tep)).toEqual(['F99-thu.dc.html'])
    expect(trang.dsFrame(canvas).map((f) => f.tep)).toEqual(['F99-thu.dc.html'])
    const doc = docTuThuMuc(THU_MUC_THIET_KE)
    expect(doc('Main')).toBeDefined()
    expect(doc('../design/Main')).toBeUndefined()
    expect(doc('/etc/hosts')).toBeUndefined()
  })
})
