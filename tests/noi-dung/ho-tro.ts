import cayJson from '../fixtures/roadmap-tree.json'
import cauHinhJson from '../../shared/roadmap/cau-hinh-cay.json'
import { dungCay, type MucHoc } from '../../shared/roadmap'

// Cây đóng băng + tra mục theo tên cho test nội dung.

export const cay = dungCay(cayJson, cauHinhJson)

export function muc(label: string): MucHoc {
  const ds = cay.mucHoc.filter((m) => m.label === label)
  if (ds.length !== 1) throw new Error(`Không có đúng 1 mục “${label}”`)
  return ds[0]
}

/** Ghép frontmatter + thân bài thành file. */
export function file(frontmatter: string[], than: string[]): string {
  return ['---', ...frontmatter, '---', ...than].join('\n')
}

/** Frontmatter tối thiểu hợp lệ cho một mục. */
export function fmToiThieu(m: MucHoc): string[] {
  return [`id: ${m.id}`, `loai: ${m.mau}`, 'trang_thai_noi_dung: ban-nhap', 'nguon: ai']
}
