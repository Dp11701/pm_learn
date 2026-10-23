// Node 25 có sẵn localStorage toàn cục (rỗng, không có phương thức khi thiếu --localstorage-file),
// che mất localStorage của jsdom trong môi trường jsdom của Vitest → dùng lại bản của jsdom.
import { vi } from 'vitest'

export function dungLocalStorageJsdom(): void {
  const jsdom = (globalThis as { jsdom?: { window: Window } }).jsdom
  if (typeof globalThis.localStorage?.clear !== 'function' && jsdom) {
    vi.stubGlobal('localStorage', jsdom.window.localStorage)
  }
}
