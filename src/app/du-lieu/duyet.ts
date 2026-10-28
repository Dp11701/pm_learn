// Duyệt bài gọn (bước 4; đề xuất 3.6, 3.7 rút gọn theo mục 10): gọi API /api/duyet/* theo hợp đồng
// server/du-lieu/duyet.ts (khai lại bằng zod ở đây: file hợp đồng phía server có import Node), kiểm phản hồi.
// - GET  /api/duyet/cho-duyet     bản nháp + bản sửa chờ duyệt (tab Chờ duyệt);
// - GET  /api/duyet/:id           hôm nay theo server + bản sửa của mục (banner bản sửa trên trang bài);
// - POST /api/duyet/:id           { hashNhap } duyệt bản nháp (hashNhap = hashFile của GET /api/bai/:id);
// - POST /api/duyet/:id/ban-sua   { hashNhap } duyệt bản sửa (hashNhap = banSua.hash của GET /api/duyet/:id);
// - POST /api/duyet/:id/bo-ban-sua.
// Khoá query nằm dưới tiền tố 'noi-dung': sau mỗi lần ghi file trong app (useLamMoiNoiDung) và khi revision nội
// dung của /api/meta đổi (useTheoDoiNoiDung ở khung app) đều được tải lại cùng trạng thái nội dung + bài học.
import { useContext } from 'react'
import { QueryClientContext, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { CAC_NGUON } from '../../../shared/noi-dung'
import type { NguonBanNhap } from '../../../shared/domain/trang-thai'
import type { CanhBaoDuyet } from '../../../server/noi-dung/hop-dong-bai'
import { goiApi } from './api'
import { layClientRong } from './trang-thai'

// ---------- Hợp đồng ----------

export interface DuKhoi {
  co: number
  tong: number
}

export interface DongBanNhapCho {
  id: string
  nguon: NguonBanNhap
  /** YYYY-MM-DD */
  ngayNhap: string
  duKhoi: DuKhoi
  /** File lỗi frontmatter / quá 256 KB */
  coLoi: boolean
  /**
   * File đã ghi da-duyet mà app chưa có bản chụp hiện hành ('chua-xac-nhan': chưa có bản chụp nào; 'doi-ngoai-app':
   * chỉ còn bản chụp đã bị thay) — không duyệt được ở đây (409), chỉ "Quét lại"; null = bản nháp thường
   */
  canhBaoDuyet: CanhBaoDuyet | null
}

export interface DongBanSuaCho {
  id: string
  ngayNhap: string
}

export interface PhanHoiChoDuyet {
  banNhap: DongBanNhapCho[]
  banSua: DongBanSuaCho[]
}

export interface ChiTietBanSua {
  /** null khi file quá 256 KB (không đọc) */
  hash: string | null
  duongDan: string
  ngayNhap: string
  duKhoi: DuKhoi
  thieu: string[]
  loiDoc: { dong: number; thongBao: string } | null
}

export interface PhanHoiChiTietDuyet {
  homNay: string
  banSua: ChiTietBanSua | null
}

export interface KetQuaDuyet {
  revision: number
  ngayDuyet: string
}

const LuocDoDuKhoi = z.object({ co: z.number(), tong: z.number() })

export const LuocDoChoDuyet: z.ZodType<PhanHoiChoDuyet> = z.object({
  banNhap: z.array(
    z.object({
      id: z.string(),
      nguon: z.enum(CAC_NGUON),
      ngayNhap: z.string(),
      duKhoi: LuocDoDuKhoi,
      coLoi: z.boolean(),
      canhBaoDuyet: z.enum(['chua-xac-nhan', 'doi-ngoai-app']).nullable(),
    }),
  ),
  banSua: z.array(z.object({ id: z.string(), ngayNhap: z.string() })),
})

export const LuocDoChiTietDuyet: z.ZodType<PhanHoiChiTietDuyet> = z.object({
  homNay: z.string(),
  banSua: z
    .object({
      hash: z.string().nullable(),
      duongDan: z.string(),
      ngayNhap: z.string(),
      duKhoi: LuocDoDuKhoi,
      thieu: z.array(z.string()),
      loiDoc: z.object({ dong: z.number(), thongBao: z.string() }).nullable(),
    })
    .nullable(),
})

const LuocDoKetQuaDuyet: z.ZodType<KetQuaDuyet> = z.object({
  revision: z.number(),
  ngayDuyet: z.string(),
})

const LuocDoRevision = z.object({ revision: z.number() })

const ma = (id: string) => encodeURIComponent(id)

export const DUONG_DAN_DUYET = {
  choDuyet: '/api/duyet/cho-duyet',
  muc: (id: string) => `/api/duyet/${ma(id)}`,
  banSua: (id: string) => `/api/duyet/${ma(id)}/ban-sua`,
  boBanSua: (id: string) => `/api/duyet/${ma(id)}/bo-ban-sua`,
} as const

// ---------- Gọi API ----------

/** GET /api/duyet/cho-duyet */
export function taiChoDuyet(): Promise<PhanHoiChoDuyet> {
  return goiApi(DUONG_DAN_DUYET.choDuyet, LuocDoChoDuyet)
}

/** GET /api/duyet/:id */
export function taiChiTietDuyet(id: string): Promise<PhanHoiChiTietDuyet> {
  return goiApi(DUONG_DAN_DUYET.muc(id), LuocDoChiTietDuyet)
}

/** POST /api/duyet/:id — duyệt bản nháp đang đọc. */
export function guiDuyet(id: string, hashNhap: string): Promise<KetQuaDuyet> {
  return goiApi(DUONG_DAN_DUYET.muc(id), LuocDoKetQuaDuyet, {
    method: 'POST',
    body: { hashNhap },
  })
}

/** POST /api/duyet/:id/ban-sua */
export function guiDuyetBanSua(id: string, hashNhap: string): Promise<KetQuaDuyet> {
  return goiApi(DUONG_DAN_DUYET.banSua(id), LuocDoKetQuaDuyet, {
    method: 'POST',
    body: { hashNhap },
  })
}

/** POST /api/duyet/:id/bo-ban-sua */
export function guiBoBanSua(id: string): Promise<{ revision: number }> {
  return goiApi(DUONG_DAN_DUYET.boBanSua(id), LuocDoRevision, { method: 'POST' })
}

// ---------- Query ----------

/** Khoá query danh sách chờ duyệt (dưới tiền tố 'noi-dung'). */
export const KHOA_CHO_DUYET = ['noi-dung', 'cho-duyet'] as const
/** Khoá query chi tiết duyệt của một mục (dưới tiền tố 'noi-dung'). */
export const khoaChiTietDuyet = (id: string) => ['noi-dung', 'duyet', id] as const

/** Danh sách chờ duyệt; mỗi lần mở tab tải lại. Ngoài QueryClientProvider: không gọi API. */
export function useChoDuyet() {
  const ctx = useContext(QueryClientContext)
  return useQuery(
    {
      queryKey: KHOA_CHO_DUYET,
      queryFn: taiChoDuyet,
      enabled: ctx !== undefined,
      staleTime: 0,
    },
    ctx ?? layClientRong(),
  )
}

/** Chi tiết duyệt của mục (bản sửa); chỉ tải khi `can` (mục Đã duyệt có bản sửa). */
export function useChiTietDuyet(id: string, can: boolean) {
  const ctx = useContext(QueryClientContext)
  return useQuery(
    {
      queryKey: khoaChiTietDuyet(id),
      queryFn: () => taiChiTietDuyet(id),
      enabled: ctx !== undefined && can,
      staleTime: 0,
    },
    ctx ?? layClientRong(),
  )
}
