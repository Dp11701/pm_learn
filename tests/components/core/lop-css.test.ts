// Thứ tự cascade của src/styles/app.css sau khi Tailwind dựng: kiểu phần tử (body, vòng focus nền) phải
// ở @layer base để tiện ích (@layer utilities) ghi đè được — vd. focus-visible:outline-on-primary của
// nút trong toast nền mực, outline-none ở H1 / <main> / khung dialog. Luật ngoài layer thắng mọi layer,
// nên ngoài layer chỉ được có token (custom property).
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { compile } from 'tailwindcss'
import { beforeAll, describe, expect, it } from 'vitest'

const GOC = join(import.meta.dirname, '../../..')
const yeuCau = createRequire(import.meta.url)

async function dungCss(lop: string[]): Promise<string> {
  const duongApp = join(GOC, 'src/styles/app.css')
  const { build } = await compile(readFileSync(duongApp, 'utf8'), {
    base: dirname(duongApp),
    loadStylesheet: async (id, base) => {
      const path =
        id === 'tailwindcss' ? yeuCau.resolve('tailwindcss/index.css') : resolve(base, id)
      return { path, base: dirname(path), content: readFileSync(path, 'utf8') }
    },
  })
  return build(lop)
}

type Luat = { chon: string; cha: string[]; than: string }

/** Tách CSS (có lồng) thành các luật kèm chuỗi khối cha (@layer…, @media…, selector cha). */
function tachLuat(css: string): Luat[] {
  const sach = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const ketQua: Luat[] = []
  const ngan: Luat[] = []
  let dem = ''
  for (const kt of sach) {
    if (kt === '{') {
      const chon = dem.trim().replace(/\s+/g, ' ')
      const luat = { chon, cha: ngan.map((l) => l.chon), than: '' }
      ketQua.push(luat)
      ngan.push(luat)
      dem = ''
    } else if (kt === '}') {
      const luat = ngan.pop()
      if (luat) luat.than += dem
      dem = ''
    } else if (kt === ';') {
      if (ngan.length) ngan[ngan.length - 1].than += `${dem};`
      dem = ''
    } else dem += kt
  }
  return ketQua
}

const trongLayer = (l: Luat, ten: string) => l.cha.includes(`@layer ${ten}`)
const ngoaiLayer = (l: Luat) =>
  !l.cha.some((c) => c.startsWith('@layer')) && !l.chon.startsWith('@')

describe('app.css: kiểu nền ở @layer base, tiện ích ghi đè được', () => {
  let luat: Luat[] = []
  let css = ''
  beforeAll(async () => {
    css = await dungCss([
      'outline-none',
      'focus-visible:outline-on-primary',
      'focus-visible:outline-none!',
      'bg-primary',
    ])
    luat = tachLuat(css)
  })

  it('thứ tự layer: base trước utilities', () => {
    const khaiBao = /@layer ([\w-]+(?:, ?[\w-]+)*);/.exec(css)?.[1].split(/, ?/) ?? []
    expect(khaiBao.indexOf('base')).toBeGreaterThanOrEqual(0)
    expect(khaiBao.indexOf('base')).toBeLessThan(khaiBao.indexOf('components'))
    expect(khaiBao.indexOf('components')).toBeLessThan(khaiBao.indexOf('utilities'))
  })

  it('vòng focus nền (:focus-visible) và body chỉ nằm trong @layer base', () => {
    const vong = luat.filter((l) => l.chon === ':focus-visible')
    expect(vong.length).toBeGreaterThan(0)
    for (const l of vong) {
      expect(l.than).toContain('outline: var(--focus-ring)')
      expect(trongLayer(l, 'base')).toBe(true)
    }
    const body = luat.filter((l) => l.chon === 'body' && l.than.includes('var(--bg)'))
    expect(body).toHaveLength(1)
    expect(trongLayer(body[0], 'base')).toBe(true)
  })

  it('ngoài layer chỉ có token (custom property), không có kiểu phần tử', () => {
    const ngoai = luat.filter(
      (l) => ngoaiLayer(l) && !l.cha.some((c) => c.startsWith('@keyframes')),
    )
    for (const l of ngoai) {
      const khaiBao = l.than
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean)
      for (const d of khaiBao) expect(d, `${l.chon} { ${d} }`).toMatch(/^--[\w-]+\s*:/)
    }
  })

  it('outline-none và focus-visible:outline-on-primary nằm trong @layer utilities (thắng vòng nền)', () => {
    const outlineNone = luat.find((l) => l.chon === '.outline-none')
    expect(outlineNone && trongLayer(outlineNone, 'utilities')).toBe(true)
    expect(outlineNone?.than).toContain('outline-style: none')
    const vongToast = luat.find((l) => l.than.includes('outline-color: var(--on-primary)'))
    expect(vongToast && trongLayer(vongToast, 'utilities')).toBe(true)
    expect([vongToast?.chon, ...(vongToast?.cha ?? [])].join(' ')).toContain(':focus-visible')
  })

  it('.focus-trong (D18) ở @layer components: thắng vòng nền, tiện ích vẫn ghi đè được', () => {
    const trong = luat.filter((l) => l.chon === '.focus-trong:focus-visible')
    expect(trong).toHaveLength(1)
    expect(trongLayer(trong[0], 'components')).toBe(true)
  })
})
