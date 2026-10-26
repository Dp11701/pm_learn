// Quy tắc an toàn khi hiện Markdown của bài (đề xuất 1.5 "Làm sạch") và khi tải bảng ra .csv.
// Dùng chung: web quyết định link/ảnh, server kiểm lại đường dẫn ảnh trước khi đọc file.

// ---------- Link ----------

/** Giao thức link được phép (ngoài đường dẫn trong app và neo #) */
export const GIAO_THUC_LINK = ['http:', 'https:', 'mailto:'] as const

/** Thuộc tính cho link ngoài: mở tab mới, không lộ trang gốc */
export const THUOC_TINH_LINK_NGOAI = { target: '_blank', rel: 'noopener noreferrer' } as const

export type LoaiLink =
  /** http(s), mailto: mở tab mới với THUOC_TINH_LINK_NGOAI */
  | { loai: 'ngoai'; href: string }
  /** đường dẫn trong app, vd. /hoc/<slug> */
  | { loai: 'trong-app'; href: string }
  /** neo trong trang, vd. #tu-kiem-tra */
  | { loai: 'neo'; href: string }
  /** không được phép: hiện chữ của link, không có href */
  | { loai: 'chan' }

/** Có ký tự điều khiển (mã < 32 hoặc 127) */
function coKyTuDieuKhien(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const ma = s.charCodeAt(i)
    if (ma < 32 || ma === 127) return true
  }
  return false
}

/** Phân loại href của link trong bài. */
export function phanLoaiLink(href: string): LoaiLink {
  const s = href.trim()
  if (s === '' || coKyTuDieuKhien(s)) return { loai: 'chan' }
  if (s.startsWith('#')) return { loai: 'neo', href: s }
  if (s.startsWith('/')) {
    // '//host' và '/\host' là link sang máy khác
    if (/^\/[\\/]/.test(s) || s.includes('\\')) return { loai: 'chan' }
    return { loai: 'trong-app', href: s }
  }
  let url: URL
  try {
    url = new URL(s)
  } catch {
    return { loai: 'chan' }
  }
  if (!(GIAO_THUC_LINK as readonly string[]).includes(url.protocol)) return { loai: 'chan' }
  if (url.protocol !== 'mailto:' && url.hostname === '') return { loai: 'chan' }
  return { loai: 'ngoai', href: url.href }
}

// ---------- Ảnh ----------

/** Đuôi ảnh được phép (so không phân biệt hoa thường) */
export const DUOI_ANH = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'] as const

/** Gốc API phục vụ ảnh trong thư mục nội dung */
export const API_ANH = '/api/anh'

/**
 * Đường dẫn ảnh trong bài → đường dẫn tính từ gốc thư mục nội dung, hoặc null nếu không được
 * hiện như ảnh (khi đó hiện thành link theo phanLoaiLink). Chỉ nhận đường dẫn tương đối
 * (so với thư mục của file bài), không ra ngoài thư mục nội dung, không đi qua thư mục/file ẩn
 * ('.' hoặc '~' đầu tên, vd. .thung-rac), đuôi thuộc DUOI_ANH.
 *
 * @param duongDanBai đường dẫn file bài tính từ gốc thư mục nội dung (MucHoc.duongDanTuongDoi)
 * @param src đường dẫn ảnh như viết trong Markdown (có thể đã mã hoá %)
 */
export function giaiDuongDanAnh(duongDanBai: string, src: string): string | null {
  const tho = src.trim().replace(/[?#].*$/s, '')
  if (tho === '' || tho.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(tho)) return null
  let giai: string
  try {
    giai = decodeURIComponent(tho)
  } catch {
    return null
  }
  if (giai.includes('\\') || coKyTuDieuKhien(giai) || giai.startsWith('/')) return null

  const doan = duongDanBai.split('/').filter(Boolean).slice(0, -1)
  for (const phan of giai.split('/')) {
    if (phan === '' || phan === '.') continue
    if (phan === '..') {
      if (doan.length === 0) return null
      doan.pop()
      continue
    }
    if (phan.startsWith('.') || phan.startsWith('~')) return null
    doan.push(phan)
  }
  const ten = doan.at(-1)
  if (!ten) return null
  const duoi = ten.slice(ten.lastIndexOf('.')).toLowerCase()
  if (ten.lastIndexOf('.') <= 0 || !(DUOI_ANH as readonly string[]).includes(duoi)) return null
  return doan.join('/')
}

/**
 * URL API của một ảnh trong bài. relPath là đường dẫn như viết trong Markdown, đã qua
 * giaiDuongDanAnh(muc.duongDanTuongDoi, relPath) ở web; server tra mục theo itemId rồi kiểm lại
 * bằng chính giaiDuongDanAnh + realpath/lstat trước khi đọc file.
 */
export function duongDanAnh(itemId: string, relPath: string): string {
  return `${API_ANH}/${encodeURIComponent(itemId)}?duong-dan=${encodeURIComponent(relPath)}`
}

// ---------- CSV ("Tải .csv" của Mẫu điền sẵn) ----------

// Ô bắt đầu bằng ký tự này bị bảng tính hiểu là công thức (CSV injection)
const DAU_CONG_THUC = /^[=+\-@\t\r]/

/** Một ô CSV: thêm tiền tố ' nếu bắt đầu bằng = + - @ tab (hoặc CR); bọc "" khi cần. */
export function oCsv(o: string): string {
  const an = DAU_CONG_THUC.test(o) ? `'${o}` : o
  return /[",\r\n]/.test(an) ? `"${an.replace(/"/g, '""')}"` : an
}

/** Cả bảng → CSV (dòng CRLF; mặc định có BOM để bảng tính đọc đúng UTF-8). */
export function taoCsv(
  bang: { cot: readonly string[]; hang: readonly (readonly string[])[] },
  tuyChon: { bom?: boolean } = {},
): string {
  const dong = [bang.cot, ...bang.hang].map((h) => h.map(oCsv).join(','))
  return `${tuyChon.bom === false ? '' : '\uFEFF'}${dong.join('\r\n')}\r\n`
}
