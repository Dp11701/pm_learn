// Ép trạng thái hover / focus để gallery vẽ các trạng thái cạnh nhau như frame F02 (chỉ bản dev).
// Không chép kiểu của component: đọc mọi luật CSS đang có của trang (Tailwind + app.css) có :hover,
// :focus-visible, :focus, :focus-within rồi thêm bản sao mà phần tử mang data-gia-hover / data-gia-focus
// cũng khớp. Component vẫn dùng đúng lớp thật, nên đổi kiểu ở component là gallery đổi theo.
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'

export type KieuGia = 'hover' | 'focus'

const THUOC_TINH: Record<KieuGia, string> = { hover: 'data-gia-hover', focus: 'data-gia-focus' }

const THAY: Record<string, string> = {
  ':hover': ':is(:hover,[data-gia-hover])',
  ':focus-visible': ':is(:focus-visible,[data-gia-focus])',
  ':focus': ':is(:focus,[data-gia-focus])',
  ':focus-within': ':is(:focus-within,:has([data-gia-focus]))',
}
// Bỏ qua dấu hai chấm đã escape trong tên lớp Tailwind (vd. .not-disabled\:hover\:bg-x).
const MAU_GIA = /(?<!\\):(?:hover|focus-visible|focus-within|focus)(?![\w-])/g

const ID_STYLE = 'gia-trang-thai'

type LuatCss = CSSRule & {
  selectorText?: string
  style?: CSSStyleDeclaration
  cssRules?: CSSRuleList
}

/** Chép một luật; trả '' khi luật (và luật con) không dính trạng thái nào cần ép. */
function chepLuat(luat: LuatCss, trongGia: boolean): string {
  const con = (gia: boolean) =>
    Array.from(luat.cssRules ?? [])
      .map((l) => chepLuat(l as LuatCss, gia))
      .join('')
  if (typeof luat.selectorText === 'string') {
    const chon = luat.selectorText.replace(MAU_GIA, (m) => THAY[m])
    const gia = trongGia || chon !== luat.selectorText
    const khai = gia ? (luat.style?.cssText ?? '') : ''
    const ben = con(gia)
    return khai || ben ? `${chon}{${khai}${ben}}` : ''
  }
  // Khai báo lồng (CSSNestedDeclarations) trong luật đã ép
  if (luat.style && !luat.cssRules) return trongGia ? luat.style.cssText : ''
  // @media, @supports, @layer, @container…: giữ nguyên đầu luật
  if (luat.cssRules) {
    const ben = con(trongGia)
    if (!ben) return ''
    const dau = luat.cssText.slice(0, luat.cssText.indexOf('{'))
    return `${dau}{${ben}}`
  }
  return ''
}

function dungStyle() {
  let css = ''
  for (const bang of Array.from(document.styleSheets)) {
    if (bang.ownerNode instanceof Element && bang.ownerNode.id === ID_STYLE) continue
    try {
      for (const luat of Array.from(bang.cssRules)) css += chepLuat(luat as LuatCss, false)
    } catch {
      // Bảng khác nguồn: không đọc được, bỏ qua
    }
  }
  let the = document.getElementById(ID_STYLE)
  if (!the) {
    the = document.createElement('style')
    the.id = ID_STYLE
    document.head.append(the)
  }
  if (the.textContent !== css) the.textContent = css
}

/**
 * Gắn một lần ở trang gallery: dựng bảng luật ép trạng thái, dựng lại khi CSS của trang đổi (HMR của
 * Vite, Tailwind sinh thêm lớp). Rời trang thì gỡ.
 */
export function useGiaTrangThai() {
  useEffect(() => {
    let hen = 0
    const quan = new MutationObserver((ds) => {
      if (ds.every((d) => d.target instanceof Element && d.target.id === ID_STYLE)) return
      window.clearTimeout(hen)
      hen = window.setTimeout(dungStyle, 50)
    })
    dungStyle()
    quan.observe(document.head, { childList: true, subtree: true, characterData: true })
    return () => {
      window.clearTimeout(hen)
      quan.disconnect()
      document.getElementById(ID_STYLE)?.remove()
    }
  }, [])
}

/**
 * Vẽ phần tử con như đang hover / focus. `chon`: selector của phần tử cần ép bên trong (mặc định phần tử
 * con đầu tiên). Chỉ đổi hình; focus thật vẫn ở chỗ khác.
 */
export function Gia({
  kieu,
  chon,
  children,
}: {
  kieu: KieuGia | readonly { kieu: KieuGia; chon: string }[]
  chon?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const ds = typeof kieu === 'string' ? [{ kieu, chon }] : kieu
  const khoa = JSON.stringify(ds)
  useLayoutEffect(() => {
    const goc = ref.current
    if (!goc) return
    const daGan: [Element, string][] = []
    for (const { kieu: k, chon: c } of JSON.parse(khoa) as { kieu: KieuGia; chon?: string }[]) {
      const el = c ? goc.querySelector(c) : goc.firstElementChild
      if (!el) continue
      el.setAttribute(THUOC_TINH[k], '')
      daGan.push([el, THUOC_TINH[k]])
    }
    return () => daGan.forEach(([el, tt]) => el.removeAttribute(tt))
  }, [khoa])
  return (
    <span ref={ref} className="contents">
      {children}
    </span>
  )
}
