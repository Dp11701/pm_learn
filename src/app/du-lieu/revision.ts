// Revision của DB (đề xuất 1.10) cho các bảng dữ liệu web giữ trong TanStack Query (ảnh chụp trạng thái học,
// Áp dụng, trạng thái nội dung): khi nào /api/meta buộc tải lại, revision nào do lần ghi của chính tab tạo ra.
// Mỗi lần ghi có đổi dữ liệu tăng revision đúng 1 (server/db/settings.ts tangRevision).
import type { QueryClient } from '@tanstack/react-query'

/** Revision /api/meta lớn nhất đã thấy, theo từng QueryClient và từng loại dữ liệu. */
const metaCaoNhat = new WeakMap<QueryClient, Map<string, number>>()

/**
 * Có cần tải lại dữ liệu `loai` đang giữ ở `revisionDangGiu` khi /api/meta báo `revisionMeta` không. Meta mới hơn
 * → có. Meta cũ hơn là lần hỏi trước lần ghi của chính tab (dữ liệu đã nhận revision server trả về) → không.
 * Riêng khi revision server lùi so với lần hỏi trước (thay file DB rồi chạy lại server) → có.
 */
export function canTaiLaiTheoMeta(
  client: QueryClient,
  loai: string,
  revisionMeta: number,
  revisionDangGiu: number,
): boolean {
  let bang = metaCaoNhat.get(client)
  if (!bang) {
    bang = new Map()
    metaCaoNhat.set(client, bang)
  }
  const truoc = bang.get(loai)
  const lui = truoc !== undefined && revisionMeta < truoc
  if (truoc === undefined || revisionMeta > truoc || lui) bang.set(loai, revisionMeta)
  return revisionMeta > revisionDangGiu || (lui && revisionMeta !== revisionDangGiu)
}

/**
 * Revision dữ liệu nhận sau một lần ghi: revision server trả về chỉ khi lần ghi đó là thay đổi duy nhất kể từ
 * dữ liệu đang giữ; ngược lại để nguyên, revision của /api/meta sẽ mới hơn và dữ liệu được tải lại.
 */
export function revisionSauGhi(revisionDangGiu: number, revisionMoi: number): number {
  return revisionMoi === revisionDangGiu + 1 ? revisionMoi : revisionDangGiu
}

// ---------- Revision do chính tab ghi ----------

/** Revision tạo ra bởi lần ghi của chính tab (trạng thái học, lượt mở, Áp dụng), theo từng QueryClient. */
const cuaTab = new WeakMap<QueryClient, Set<number>>()
/** Chỉ giữ chừng này revision gần nhất (cũ hơn thì coi như không phải của tab: tải lại, không sai). */
const GIU_TOI_DA = 500

/** Ghi nhận revision mà một lần ghi CÓ ĐỔI dữ liệu của tab vừa nhận từ server. */
export function ghiNhanRevisionCuaTab(client: QueryClient, revision: number): void {
  let ds = cuaTab.get(client)
  if (!ds) {
    ds = new Set()
    cuaTab.set(client, ds)
  }
  ds.add(revision)
  if (ds.size > GIU_TOI_DA) ds.delete(ds.values().next().value as number)
}

/** Mọi revision trong (tu, den] đều do lần ghi của chính tab tạo ra (tu ≥ den → false). */
export function chiDoTabGhi(client: QueryClient, tu: number, den: number): boolean {
  const ds = cuaTab.get(client)
  if (!ds || den <= tu || den - tu > ds.size) return false
  for (let r = tu + 1; r <= den; r++) if (!ds.has(r)) return false
  return true
}
