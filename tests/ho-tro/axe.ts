// axe-core trong jsdom: tắt color-contrast (jsdom không tính layout; tương phản đã có tests/tuong-phan).
import axe from 'axe-core'
import { expect } from 'vitest'

export async function expectNoAxeViolations(
  container: Element,
  tatThem: string[] = [],
): Promise<void> {
  const rules = Object.fromEntries(
    ['color-contrast', ...tatThem].map((r) => [r, { enabled: false }]),
  )
  const ketQua = await axe.run(container, { rules })
  const loi = ketQua.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
  )
  expect(loi).toEqual([])
}
