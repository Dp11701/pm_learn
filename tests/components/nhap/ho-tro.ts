// Hỗ trợ test tab Nhập (phase 2b): entry giả của File System API (kéo thả thư mục), mục của cây theo slug,
// lô kiểm tra mẫu theo F22 (15 file: 11 hợp lệ, 2 cảnh báo, 1 trùng, 1 lỗi → "Nhập 13 file").
import { layCay } from '../../../shared/roadmap'
import type { KetQuaFile, MucNgan, PhanHoiKiemTra } from '../../../src/app/du-lieu/nhap'

export const cay = layCay()

export function muc(slug: string) {
  const m = cay.mucTheoSlug.get(slug)
  if (!m) throw new Error(`Không có mục ${slug}`)
  return m
}

export function mucNgan(slug: string): MucNgan {
  const m = muc(slug)
  return { id: m.id, slug: m.slug, label: m.label }
}

/** File .md giữ chỗ (nội dung học chỉ là "[Nội dung mẫu — …]"). */
export function fileMd(slug: string, them: string[] = []): string {
  return [
    '---',
    `id: ${muc(slug).id}`,
    'loai: chu-de',
    ...them,
    '---',
    '',
    '## Tóm tắt',
    '[Nội dung mẫu — tóm tắt]',
  ].join('\n')
}

// ---------- Entry giả (webkitGetAsEntry) ----------

export function tepEntry(duongDan: string, noiDung: BlobPart = '', type = 'text/markdown') {
  const ten = duongDan.split('/').at(-1)!
  return {
    isFile: true,
    isDirectory: false,
    name: ten,
    fullPath: `/${duongDan}`,
    file: (xong: (f: File) => void) => xong(new File([noiDung], ten, { type })),
  } as unknown as FileSystemFileEntry
}

/** Thư mục giả: readEntries trả từng lô `moiLan` mục (như Chrome trả tối đa 100), hết thì mảng rỗng. */
export function thuMucEntry(duongDan: string, con: FileSystemEntry[], moiLan = 2) {
  const ten = duongDan.split('/').at(-1)!
  return {
    isFile: false,
    isDirectory: true,
    name: ten,
    fullPath: `/${duongDan}`,
    createReader: () => {
      let i = 0
      return {
        readEntries: (xong: (ds: FileSystemEntry[]) => void) => {
          const lo = con.slice(i, i + moiLan)
          i += moiLan
          setTimeout(() => xong(lo), 0)
        },
      }
    },
  } as unknown as FileSystemDirectoryEntry
}

// ---------- Lô F22 ----------

export function dong(
  kq: Partial<KetQuaFile> & Pick<KetQuaFile, 'chiSo' | 'ten' | 'loai'>,
): KetQuaFile {
  return {
    muc: null,
    ganSan: false,
    ungVien: [],
    thieu: [],
    loi: null,
    chuyenVeBanNhap: false,
    thayBanNhap: false,
    ghiChu: null,
    ...kq,
  }
}

export const SLUG_HOP_LE = [
  'pestle',
  'quantitative-risk-assessment',
  'risk-identification-process',
  'risk-and-opportunity-response-strategies',
  'contingency-management-reserve-allocation',
  'bani',
  'cost-baseline',
  'gross-profit-margin-gpm',
  'purchase-order-invoice',
  'capex-opex',
  'ebit-ebitda',
]

/** Lô 15 file của F22: 11 ✓, ⚠ thiếu khối (risk-appetite), ⚠ không khớp gán sẵn (risk-registr.md → Risk Register), ⟳ scope-creep, ✕ vuca. */
export function loF22(token = 'tok-f22'): PhanHoiKiemTra {
  const ketQua: KetQuaFile[] = SLUG_HOP_LE.map((s, i) =>
    dong({ chiSo: i, ten: `${s}.md`, loai: 'hop-le', muc: mucNgan(s) }),
  )
  ketQua.push(
    dong({
      chiSo: 11,
      ten: 'risk-appetite.md',
      loai: 'thieu-khoi',
      muc: mucNgan('risk-appetite'),
      thieu: ['Tự kiểm tra', 'Tham khảo'],
    }),
    dong({
      chiSo: 12,
      ten: 'risk-registr.md',
      loai: 'khong-khop',
      muc: mucNgan('risk-register'),
      ganSan: true,
    }),
    dong({ chiSo: 13, ten: 'scope-creep.md', loai: 'trung-da-duyet', muc: mucNgan('scope-creep') }),
    dong({
      chiSo: 14,
      ten: 'vuca.md',
      loai: 'loi',
      muc: mucNgan('vuca'),
      loi: { dong: 3, thongBao: 'thiếu dấu ":" sau loai' },
    }),
  )
  return { token, ketQua, tomTat: { hopLe: 11, canhBao: 2, trung: 1, loi: 1 }, soNhapDuoc: 13 }
}
