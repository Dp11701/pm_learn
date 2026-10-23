// Kiểu dữ liệu của cây roadmap sau khi nạp (đề xuất 1.3).

export type LoaiNut = 'part' | 'area' | 'group' | 'topic' | 'document'
export type LoaiMucHoc = 'topic' | 'document'

/** Mẫu bài: Chứng chỉ = chủ đề nằm trong phần chứng chỉ của cau-hinh-cay.json. */
export type MauBai = 'chu-de' | 'tai-lieu' | 'chung-chi'

/** Icon Lucide của 5 phần (§5.2). */
export type IconPhan = 'briefcase' | 'trending-up' | 'cpu' | 'wrench' | 'award'

/** Nội dung shared/roadmap/cau-hinh-cay.json. */
export interface CauHinhCay {
  iconPhan: Record<string, IconPhan>
  phanChungChi: string
  nhomProcessGroup: string
}

export interface Nut {
  id: string
  kind: LoaiNut
  label: string
  /** Tên gốc trên roadmap khi tên đã sửa chính tả */
  labelOriginal?: string
  slug: string
  /** null với nút phần */
  chaId: string | null
  /** id các nút con, theo thứ tự cây */
  con: readonly string[]
  /** Chỉ có ở nút phần */
  icon?: IconPhan
}

export interface MucHoc extends Nut {
  kind: LoaiMucHoc
  mau: MauBai
  phan: Nut
  linhVuc?: Nut
  nhom?: Nut
  /** Vị trí trong cay.mucHoc (thứ tự cây), từ 0 */
  index: number
  /** noi-dung/<phần>/<lĩnh vực>/<slug>.md, không có lĩnh vực thì noi-dung/<phần>/<slug>.md; nhóm không vào đường dẫn */
  duongDanFile: string
  /** Như duongDanFile nhưng tính từ gốc thư mục nội dung (bỏ "noi-dung/") */
  duongDanTuongDoi: string
}

export interface Cay {
  /** Các nút phần, theo thứ tự cây */
  phan: readonly Nut[]
  /** Mọi nút (phần, lĩnh vực, nhóm, mục học) */
  nutTheoId: ReadonlyMap<string, Nut>
  nutTheoSlug: ReadonlyMap<string, Nut>
  /** Mục học (chủ đề + tài liệu) theo thứ tự cây */
  mucHoc: readonly MucHoc[]
  mucTheoId: ReadonlyMap<string, MucHoc>
  mucTheoSlug: ReadonlyMap<string, MucHoc>
  soMucHoc: number
  soNut: number
  phanChungChi: Nut
  nhomProcessGroup: Nut
}
