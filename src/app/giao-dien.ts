// Giao diện Sáng / Tối / Theo hệ thống (đề xuất 1.2, D5). Khớp với script chống nháy trong index.html:
// 'sang' → data-theme="light", 'toi' → data-theme="dark", 'he-thong' → không đặt (theo prefers-color-scheme).
import { useSyncExternalStore } from 'react'

export type GiaoDien = 'sang' | 'toi' | 'he-thong'
export type GiaoDienHieuLuc = 'sang' | 'toi'

export const KHOA_GIAO_DIEN = 'hoc-pm:giao-dien'

/** Thứ tự vòng đổi: Sáng → Tối → Theo hệ thống. */
export const CAC_GIAO_DIEN: readonly GiaoDien[] = ['sang', 'toi', 'he-thong']

export const TEN_GIAO_DIEN: Record<GiaoDien, string> = {
  sang: 'Sáng',
  toi: 'Tối',
  'he-thong': 'Theo hệ thống',
}

const DATA_THEME: Record<GiaoDien, string | null> = { sang: 'light', toi: 'dark', 'he-thong': null }

export function laGiaoDien(x: unknown): x is GiaoDien {
  return CAC_GIAO_DIEN.includes(x as GiaoDien)
}

/** Giao diện đã lưu; mặc định 'he-thong' (cả khi trình duyệt chặn localStorage). */
export function docGiaoDien(): GiaoDien {
  try {
    const g = localStorage.getItem(KHOA_GIAO_DIEN)
    return laGiaoDien(g) ? g : 'he-thong'
  } catch {
    return 'he-thong'
  }
}

/** Chỉ đặt / bỏ data-theme trên <html>, không lưu. */
export function apDungGiaoDien(g: GiaoDien, goc: HTMLElement = document.documentElement): void {
  const theme = DATA_THEME[g]
  if (theme) goc.dataset.theme = theme
  else goc.removeAttribute('data-theme')
}

/** Giao diện kế tiếp trong vòng Sáng → Tối → Theo hệ thống → Sáng. */
export function giaoDienKe(g: GiaoDien): GiaoDien {
  return CAC_GIAO_DIEN[(CAC_GIAO_DIEN.indexOf(g) + 1) % CAC_GIAO_DIEN.length]
}

function truyVanToi(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null
}

/** Sáng hay Tối thật sự đang hiện ('he-thong' tra theo hệ điều hành). */
export function giaoDienHieuLuc(g: GiaoDien): GiaoDienHieuLuc {
  if (g !== 'he-thong') return g
  return truyVanToi()?.matches ? 'toi' : 'sang'
}

// Lựa chọn trong phiên: giữ được cả khi localStorage không ghi được.
let daChon: GiaoDien | null = null
const nguoiNghe = new Set<() => void>()

function layGiaoDien(): GiaoDien {
  return daChon ?? docGiaoDien()
}

/** Lưu, áp dụng và báo cho mọi component đang dùng useGiaoDien. */
export function datGiaoDien(g: GiaoDien): void {
  daChon = g
  try {
    localStorage.setItem(KHOA_GIAO_DIEN, g)
  } catch {
    // Trình duyệt chặn lưu: vẫn đổi trong phiên này.
  }
  apDungGiaoDien(g)
  nguoiNghe.forEach((f) => f())
}

function dangKy(f: () => void): () => void {
  nguoiNghe.add(f)
  // Tab khác đổi giao diện → đổi theo.
  const khiLuu = (e: StorageEvent) => {
    if (e.key !== KHOA_GIAO_DIEN) return
    daChon = null
    apDungGiaoDien(docGiaoDien())
    f()
  }
  window.addEventListener('storage', khiLuu)
  return () => {
    nguoiNghe.delete(f)
    window.removeEventListener('storage', khiLuu)
  }
}

function dangKyHieuLuc(f: () => void): () => void {
  const huy = dangKy(f)
  const mq = truyVanToi()
  mq?.addEventListener('change', f)
  return () => {
    huy()
    mq?.removeEventListener('change', f)
  }
}

export function useGiaoDien(): [GiaoDien, (g: GiaoDien) => void] {
  return [useSyncExternalStore(dangKy, layGiaoDien), datGiaoDien]
}

/** Sáng / Tối đang hiện; đổi theo cả lựa chọn lẫn hệ điều hành. */
export function useGiaoDienHieuLuc(): GiaoDienHieuLuc {
  return useSyncExternalStore(dangKyHieuLuc, () => giaoDienHieuLuc(layGiaoDien()))
}
