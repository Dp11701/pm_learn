import { LoiCay } from './loi'
import { ganSlug } from './slug'
import type { Cay, CauHinhCay, IconPhan, LoaiNut, MauBai, MucHoc, Nut } from './types'

const CAC_ICON: readonly IconPhan[] = ['briefcase', 'trending-up', 'cpu', 'wrench', 'award']

// Loại nút con được phép dưới mỗi loại nút: phần › lĩnh vực › nhóm › mục học.
const CON_HOP_LE: Record<LoaiNut, readonly LoaiNut[]> = {
  part: ['area', 'group', 'topic', 'document'],
  area: ['group', 'topic', 'document'],
  group: ['topic', 'document'],
  topic: [],
  document: [],
}

const TEN_LOAI: Record<LoaiNut, string> = {
  part: 'phần',
  area: 'lĩnh vực',
  group: 'nhóm',
  topic: 'chủ đề',
  document: 'tài liệu',
}

const THU_MUC_NOI_DUNG = 'noi-dung'

interface BanGhi {
  id: string
  kind: LoaiNut
  label: string
  labelOriginal?: string
  con: string[]
  /** id tổ tiên, phần trước, cha trực tiếp sau cùng */
  toTien: string[]
}

function laObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function laChuoi(x: unknown): x is string {
  return typeof x === 'string' && x.trim() !== ''
}

function laLoaiNut(x: unknown): x is LoaiNut {
  return typeof x === 'string' && Object.hasOwn(CON_HOP_LE, x)
}

/** Đọc và kiểm cấu trúc cây: id duy nhất, kind hợp lệ, đúng thứ bậc. Trả mọi nút theo thứ tự cây. */
function docCay(json: unknown): BanGhi[] {
  if (!laObject(json) || !Array.isArray(json.parts) || json.parts.length === 0) {
    throw new LoiCay('File cây không có danh sách phần (parts).')
  }
  const ketQua: BanGhi[] = []
  const daCo = new Set<string>()

  const doc = (x: unknown, viTri: string, cha: BanGhi | null): string => {
    if (!laObject(x)) throw new LoiCay(`Nút ${viTri} không phải object.`)
    const { id, kind, label, labelOriginal, children } = x
    if (!laChuoi(id)) throw new LoiCay(`Nút ${viTri} thiếu id.`)
    if (daCo.has(id)) throw new LoiCay(`Trùng id nút “${id}”.`)
    if (!laLoaiNut(kind)) throw new LoiCay(`Nút “${id}” có kind không hợp lệ.`)
    if (!laChuoi(label)) throw new LoiCay(`Nút “${id}” thiếu label.`)
    if (labelOriginal !== undefined && !laChuoi(labelOriginal)) {
      throw new LoiCay(`Nút “${id}” có labelOriginal không hợp lệ.`)
    }
    if (children !== undefined && !Array.isArray(children)) {
      throw new LoiCay(`Nút “${id}” có children không phải danh sách.`)
    }
    const hopLe = cha ? CON_HOP_LE[cha.kind].includes(kind) : kind === 'part'
    if (!hopLe) {
      const noi = cha ? `trong ${TEN_LOAI[cha.kind]} “${cha.label}”` : 'ở gốc cây'
      throw new LoiCay(`Nút “${label}” (${TEN_LOAI[kind]}) không được nằm ${noi}.`)
    }
    if (CON_HOP_LE[kind].length === 0 && children?.length) {
      throw new LoiCay(`Mục học “${label}” không được có nút con.`)
    }

    daCo.add(id)
    const banGhi: BanGhi = {
      id,
      kind,
      label,
      ...(labelOriginal === undefined ? {} : { labelOriginal }),
      con: [],
      toTien: cha ? [...cha.toTien, cha.id] : [],
    }
    ketQua.push(banGhi)
    children?.forEach((c, i) => banGhi.con.push(doc(c, `${viTri}.children[${i}]`, banGhi)))
    return id
  }

  json.parts.forEach((p, i) => doc(p, `parts[${i}]`, null))
  return ketQua
}

/** Kiểm cau-hinh-cay.json theo cây: id tồn tại, đúng kind; phần nào cũng có icon. */
function docCauHinh(cauHinh: unknown, theoId: Map<string, BanGhi>): CauHinhCay {
  if (!laObject(cauHinh) || !laObject(cauHinh.iconPhan)) {
    throw new LoiCay('cau-hinh-cay.json thiếu iconPhan.')
  }
  const canKind = (id: unknown, kind: LoaiNut, truong: string): string => {
    if (!laChuoi(id)) throw new LoiCay(`cau-hinh-cay.json thiếu ${truong}.`)
    const nut = theoId.get(id)
    if (!nut) throw new LoiCay(`cau-hinh-cay.json: ${truong} “${id}” không có trong cây.`)
    if (nut.kind !== kind) {
      throw new LoiCay(
        `cau-hinh-cay.json: ${truong} “${id}” là ${TEN_LOAI[nut.kind]}, cần ${TEN_LOAI[kind]}.`,
      )
    }
    return id
  }

  const iconPhan: Record<string, IconPhan> = {}
  for (const [id, icon] of Object.entries(cauHinh.iconPhan)) {
    canKind(id, 'part', 'iconPhan')
    if (!CAC_ICON.includes(icon as IconPhan)) {
      throw new LoiCay(`cau-hinh-cay.json: icon “${String(icon)}” không hợp lệ.`)
    }
    iconPhan[id] = icon as IconPhan
  }
  for (const nut of theoId.values()) {
    if (nut.kind === 'part' && !Object.hasOwn(iconPhan, nut.id)) {
      throw new LoiCay(`cau-hinh-cay.json: phần “${nut.label}” chưa có icon.`)
    }
  }

  return {
    iconPhan,
    phanChungChi: canKind(cauHinh.phanChungChi, 'part', 'phanChungChi'),
    nhomProcessGroup: canKind(cauHinh.nhomProcessGroup, 'group', 'nhomProcessGroup'),
  }
}

/** Dựng cây app từ roadmap-tree.json và cau-hinh-cay.json (hàm thuần). Lỗi → LoiCay. */
export function dungCay(json: unknown, cauHinhTho: unknown): Cay {
  const banGhi = docCay(json)
  const theoId = new Map(banGhi.map((b) => [b.id, b]))
  const cauHinh = docCauHinh(cauHinhTho, theoId)
  const slug = ganSlug(
    banGhi.map((b) => ({
      id: b.id,
      label: b.label,
      toTien: b.toTien.map((id) => theoId.get(id)?.label ?? '').reverse(),
    })),
  )

  const nutTheoId = new Map<string, Nut>()
  const mucHoc: MucHoc[] = []
  // banGhi theo thứ tự cây nên tổ tiên luôn được dựng trước con cháu
  for (const b of banGhi) {
    const nut: Nut = {
      id: b.id,
      kind: b.kind,
      label: b.label,
      ...(b.labelOriginal === undefined ? {} : { labelOriginal: b.labelOriginal }),
      slug: slug.get(b.id) ?? '',
      chaId: b.toTien.at(-1) ?? null,
      con: b.con,
      ...(b.kind === 'part' ? { icon: cauHinh.iconPhan[b.id] } : {}),
    }
    if (nut.kind === 'topic' || nut.kind === 'document') {
      const toTien = b.toTien.map((id) => nutTheoId.get(id) as Nut)
      const phan = toTien[0]
      const linhVuc = toTien.find((t) => t.kind === 'area')
      const nhom = toTien.find((t) => t.kind === 'group')
      const duongDanTuongDoi = [
        phan.slug,
        ...(linhVuc ? [linhVuc.slug] : []),
        `${nut.slug}.md`,
      ].join('/')
      let mau: MauBai = 'chu-de'
      if (nut.kind === 'document') mau = 'tai-lieu'
      else if (phan.id === cauHinh.phanChungChi) mau = 'chung-chi'
      const muc: MucHoc = {
        ...nut,
        kind: nut.kind,
        mau,
        phan,
        ...(linhVuc ? { linhVuc } : {}),
        ...(nhom ? { nhom } : {}),
        index: mucHoc.length,
        duongDanFile: `${THU_MUC_NOI_DUNG}/${duongDanTuongDoi}`,
        duongDanTuongDoi,
      }
      mucHoc.push(muc)
      nutTheoId.set(muc.id, muc)
    } else {
      nutTheoId.set(nut.id, nut)
    }
  }

  if (mucHoc.length === 0) throw new LoiCay('Cây không có mục học nào.')

  const tatCa = [...nutTheoId.values()]
  return {
    phan: tatCa.filter((n) => n.kind === 'part'),
    nutTheoId,
    nutTheoSlug: new Map(tatCa.map((n) => [n.slug, n])),
    mucHoc,
    mucTheoId: new Map(mucHoc.map((m) => [m.id, m])),
    mucTheoSlug: new Map(mucHoc.map((m) => [m.slug, m])),
    soMucHoc: mucHoc.length,
    soNut: nutTheoId.size,
    phanChungChi: nutTheoId.get(cauHinh.phanChungChi) as Nut,
    nhomProcessGroup: nutTheoId.get(cauHinh.nhomProcessGroup) as Nut,
  }
}
