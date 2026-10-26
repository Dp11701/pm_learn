import type { Request } from 'express'
import type { z } from 'zod'
import type { Cay, MucHoc } from '../../shared/roadmap/index.ts'
import { TB_HOC } from '../du-lieu/thong-bao.ts'
import { LoiApi } from '../loi.ts'

// Kiểm body bằng zod cho các route phase 3, đổi vấn đề đầu tiên thành câu tiếng Việt (400).

export type VanDe = z.core.$ZodIssue

export interface CauHinhLoi {
  /** Các trường body nhận (cho câu "Chỉ nhận …") */
  chiNhan: readonly string[]
  /** Dạng JSON mẫu cho câu "Thân yêu cầu phải là JSON dạng …" */
  mau: string
  /** Câu riêng theo trường (path[0]); không có thì dùng câu chung */
  truong?: Readonly<Record<string, (vanDe: VanDe) => string>>
}

export function cauLoiBody(vanDe: VanDe | undefined, ch: CauHinhLoi): string {
  if (!vanDe) return 'Yêu cầu không hợp lệ.'
  if (vanDe.code === 'unrecognized_keys') return TB_HOC.truongLa(vanDe.keys, ch.chiNhan)
  const ten = vanDe.path[0]
  if (typeof ten === 'string') {
    const rieng = ch.truong?.[ten]
    if (rieng) return rieng(vanDe)
    if (vanDe.code === 'too_big') return TB_HOC.quaDai(ten, Number(vanDe.maximum))
    if (vanDe.code === 'too_small') return TB_HOC.khongDeTrong(ten)
    if (vanDe.code === 'invalid_type' && vanDe.expected === 'string') return TB_HOC.phaiLaChuoi(ten)
  }
  if (vanDe.code === 'custom' && vanDe.params?.canMot) return TB_HOC.canMotTruong(ch.chiNhan)
  return TB_HOC.thanBody(ch.mau)
}

/** Parse body; lỗi → LoiApi 400 với câu tiếng Việt. */
export function docBody<T>(luocDo: z.ZodType<T>, body: unknown, ch: CauHinhLoi): T {
  const kq = luocDo.safeParse(body)
  if (!kq.success) throw new LoiApi(400, cauLoiBody(kq.error.issues[0], ch))
  return kq.data
}

/** Có ít nhất một khoá khác undefined (dùng trong .refine, params canMot). */
export const coItNhatMot = (o: object) => Object.values(o).some((v) => v !== undefined)

/** Mục học của tham số :id (bất biến 8: không có trong cây → 404). */
export function mucCuaThamSo(cay: Pick<Cay, 'mucTheoId'>, req: Request<{ id: string }>): MucHoc {
  return mucCuaId(cay, req.params.id)
}

export function mucCuaId(cay: Pick<Cay, 'mucTheoId'>, id: string): MucHoc {
  const muc = cay.mucTheoId.get(id)
  if (!muc) throw new LoiApi(404, TB_HOC.khongCoMuc(id))
  return muc
}

/** Tham số :id dạng số nguyên dương; không phải → undefined (route trả 404 như id không có). */
export function soNguyenDuong(chuoi: string): number | undefined {
  if (!/^[1-9][0-9]{0,15}$/.test(chuoi)) return undefined
  const so = Number(chuoi)
  return Number.isSafeInteger(so) ? so : undefined
}
