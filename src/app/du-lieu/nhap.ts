// Nhập file .md (đề xuất 1.6, 1.7, 3.8; F22): gọi API /api/nhap/* theo hợp đồng phase 2b, kiểm phản hồi bằng
// zod; đọc kết quả quét nhẹ trong /api/meta (noiDung: revision, chuaNhan — src/app/ket-noi.tsx kiểm trường này);
// làm mới dữ liệu nội dung (trạng thái nội dung, bài học, slug cũ — mọi khoá query bắt đầu bằng 'noi-dung') sau
// khi nhập, hoàn tác, quét lại, giữ bản cũ, và khi revision nội dung của /api/meta đổi (KhungApp theo dõi).
// - POST /api/nhap/kiem-tra: không ghi; trả token lô (hết hạn sau 30 phút → 410) + kết quả từng file.
// - POST /api/nhap/thuc-hien: server kiểm lại mọi thứ rồi ghi qua file_ops; trả fileOp để Hoàn tác.
// - POST /api/nhap/hoan-tac, /api/nhap/quet-lai, /api/noi-dung/giu-ban-cu/:id.
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { QueryClientContext, type QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useKetNoi, type NoiDungMeta } from '../ket-noi'
import { goiApi, LoiGoiApi } from './api'

export type { NoiDungMeta }

// ---------- Hợp đồng ----------

export const CAC_LOAI_KET_QUA = [
  'hop-le',
  'thieu-khoi',
  'khong-khop',
  'trung-da-duyet',
  'chua-chup',
  'loi',
] as const
/** ✓ Hợp lệ · ⚠ Thiếu khối bắt buộc · ⚠ Không khớp mục · ⟳ Trùng bản đã duyệt · ◎ chưa có bản chụp · ✕ Lỗi frontmatter */
export type LoaiKetQua = (typeof CAC_LOAI_KET_QUA)[number]

export interface MucNgan {
  id: string
  slug: string
  label: string
}

export interface UngVien extends MucNgan {
  /** Dice bigram 0–1 */
  diem: number
}

export interface KetQuaFile {
  /** Vị trí trong mảng files đã gửi (hoặc trong lô của Quét lại) */
  chiSo: number
  /** Tên file (basename) */
  ten: string
  loai: LoaiKetQua
  /** Mục khớp; với 'khong-khop' chỉ có hiệu lực khi ganSan */
  muc: MucNgan | null
  ganSan: boolean
  /** Tối đa 3 ứng viên ≥ 0,6, chỉ khi không gán sẵn */
  ungVien: UngVien[]
  /** Tên các khối ★ thiếu */
  thieu: string[]
  loi: { dong: number; thongBao: string } | null
  /** File ghi da-duyet, sẽ bị ép ban-nhap */
  chuyenVeBanNhap: boolean
  /** Mục đang có Bản nháp: bản cũ vào thùng rác */
  thayBanNhap: boolean
  ghiChu: string | null
  /**
   * Server khớp file với `muc` theo gì (cột "Khớp theo"): id trong frontmatter, tên file, đường dẫn (Quét lại: file
   * đã nhận / nằm ở chỗ chuẩn của mục), gán sẵn theo ?muc=, gợi ý tên gần đúng; null khi không có mục. Thiếu
   * (server cũ) thì web tự suy.
   */
  khopTheo?: KhopTheo | null
  /** Chỉ ở lô Quét lại: đường dẫn tương đối của file trong thư mục nội dung; thiếu = file không còn trên đĩa. */
  duongDan?: string
}

export const CAC_KHOP_THEO = ['id', 'ten-file', 'duong-dan', 'gan-san', 'goi-y'] as const
export type KhopTheo = (typeof CAC_KHOP_THEO)[number]

export interface TomTatKiemTra {
  hopLe: number
  canhBao: number
  trung: number
  loi: number
}

export interface PhanHoiKiemTra {
  token: string
  ketQua: KetQuaFile[]
  tomTat: TomTatKiemTra
  soNhapDuoc: number
}

/** Một file gửi đi kiểm tra: basename, nội dung UTF-8, đường dẫn tương đối trong thư mục được thả (nếu có). */
export interface TepGui {
  ten: string
  noiDung: string
  duongDan?: string
}

export type XuLyTrung = 'giu-ban-cu' | 'thanh-ban-sua'

export interface YeuCauThucHien {
  token: string
  /** chiSo → id mục */
  gan: Record<string, string>
  xuLyTrung: Record<string, XuLyTrung>
  nhanDaDuyet: number[]
}

export interface PhanHoiThucHien {
  daNhap: { chiSo: number; mucId: string; duongDan: string }[]
  fileOp: number
  revision: number
}

export interface PhanHoiQuetLai {
  daNhap: number
  fileOp: number | null
  /** Chỉ khi có file cần bạn quyết (Không khớp mục, ⟳, ◎, Lỗi frontmatter) */
  kiemTra: PhanHoiKiemTra | null
  chuaNhan: number
}

const LuocDoMucNgan = z.object({ id: z.string(), slug: z.string(), label: z.string() })

const LuocDoKetQuaFile: z.ZodType<KetQuaFile> = z.object({
  chiSo: z.number().int().nonnegative(),
  ten: z.string(),
  loai: z.enum(CAC_LOAI_KET_QUA),
  muc: LuocDoMucNgan.nullable(),
  ganSan: z.boolean(),
  ungVien: z.array(LuocDoMucNgan.extend({ diem: z.number() })),
  thieu: z.array(z.string()),
  loi: z.object({ dong: z.number(), thongBao: z.string() }).nullable(),
  chuyenVeBanNhap: z.boolean(),
  thayBanNhap: z.boolean(),
  ghiChu: z.string().nullable(),
  // Giá trị lạ (server mới hơn) → coi như không có, web tự suy
  khopTheo: z.enum(CAC_KHOP_THEO).nullable().optional().catch(undefined),
  duongDan: z.string().optional(),
})

export const LuocDoKiemTra: z.ZodType<PhanHoiKiemTra> = z.object({
  token: z.string(),
  ketQua: z.array(LuocDoKetQuaFile),
  tomTat: z.object({
    hopLe: z.number(),
    canhBao: z.number(),
    trung: z.number(),
    loi: z.number(),
  }),
  soNhapDuoc: z.number(),
})

const LuocDoThucHien: z.ZodType<PhanHoiThucHien> = z.object({
  daNhap: z.array(z.object({ chiSo: z.number(), mucId: z.string(), duongDan: z.string() })),
  fileOp: z.number(),
  revision: z.number(),
})

const LuocDoRevision = z.object({ revision: z.number() })

const LuocDoQuetLai: z.ZodType<PhanHoiQuetLai> = z.object({
  daNhap: z.number(),
  fileOp: z.number().nullable(),
  kiemTra: LuocDoKiemTra.nullable(),
  chuaNhan: z.number(),
})

export const DUONG_DAN_NHAP = {
  kiemTra: '/api/nhap/kiem-tra',
  thucHien: '/api/nhap/thuc-hien',
  hoanTac: '/api/nhap/hoan-tac',
  quetLai: '/api/nhap/quet-lai',
} as const

export const duongDanGiuBanCu = (id: string) => `/api/noi-dung/giu-ban-cu/${encodeURIComponent(id)}`

// ---------- Gọi API ----------

/** POST /api/nhap/kiem-tra (không ghi file). `mucMacDinh`: id mục của ?muc= — file thả vào được gán sẵn mục này. */
export function guiKiemTra(files: TepGui[], mucMacDinh?: string): Promise<PhanHoiKiemTra> {
  return goiApi(DUONG_DAN_NHAP.kiemTra, LuocDoKiemTra, {
    method: 'POST',
    body: mucMacDinh ? { files, mucMacDinh } : { files },
  })
}

/** POST /api/nhap/thuc-hien */
export function guiThucHien(yeuCau: YeuCauThucHien): Promise<PhanHoiThucHien> {
  return goiApi(DUONG_DAN_NHAP.thucHien, LuocDoThucHien, { method: 'POST', body: yeuCau })
}

/** POST /api/nhap/hoan-tac */
export function guiHoanTac(fileOp: number): Promise<{ revision: number }> {
  return goiApi(DUONG_DAN_NHAP.hoanTac, LuocDoRevision, { method: 'POST', body: { fileOp } })
}

/** POST /api/nhap/quet-lai */
export function guiQuetLai(): Promise<PhanHoiQuetLai> {
  return goiApi(DUONG_DAN_NHAP.quetLai, LuocDoQuetLai, { method: 'POST' })
}

/** POST /api/noi-dung/giu-ban-cu/:id — ghi lại bản chụp đã duyệt (bản ngoài app vào thùng rác). */
export function guiGiuBanCu(id: string): Promise<{ revision: number }> {
  return goiApi(duongDanGiuBanCu(id), LuocDoRevision, { method: 'POST' })
}

/** Lô kiểm tra đã hết hạn (token quá 30 phút): server trả 410. */
export function laHetHan(loi: unknown): loi is LoiGoiApi {
  return loi instanceof LoiGoiApi && loi.status === 410
}

/** Câu lỗi để hiện: câu tiếng Việt của server; không gọi được máy chủ (fetch ném lỗi) → `matKetNoi`. */
export function cauLoi(loi: unknown, matKetNoi: string): string {
  return loi instanceof LoiGoiApi ? loi.message : matKetNoi
}

// ---------- Kết quả quét nhẹ (/api/meta) ----------

/**
 * `noiDung` của /api/meta (đã kiểm ở src/app/ket-noi.tsx); undefined khi chưa có meta hoặc server không gửi.
 * Meta là đối tượng mới mỗi 5 giây: giữ nguyên đối tượng trả về khi các số không đổi.
 */
export function useNoiDungMeta(): NoiDungMeta | undefined {
  const nd = useKetNoi().meta?.noiDung
  const revision = nd?.revision
  const chuaNhan = nd?.chuaNhan
  const tc = nd?.thayCay
  const [them, bo, doiTen, luc] = tc ? [tc.them, tc.bo, tc.doiTen, tc.luc] : []
  return useMemo(() => {
    if (revision === undefined || chuaNhan === undefined) return undefined
    const thayCay =
      them === undefined || bo === undefined || doiTen === undefined || luc === undefined
        ? null
        : { them, bo, doiTen, luc }
    return { revision, chuaNhan, thayCay }
  }, [revision, chuaNhan, them, bo, doiTen, luc])
}

// ---------- Làm mới dữ liệu nội dung ----------

/** Tiền tố khoá query của dữ liệu nội dung: trạng thái nội dung (['noi-dung','trang-thai']) và bài (['noi-dung','bai',id]). */
export const KHOA_NOI_DUNG = ['noi-dung'] as const

function lamMoi(client: QueryClient) {
  void client.invalidateQueries({ queryKey: KHOA_NOI_DUNG }, { cancelRefetch: false })
}

/**
 * Sau một lần ghi file (nhập, hoàn tác, quét lại, giữ bản cũ): tải lại trạng thái nội dung và bài học đang
 * giữ, hỏi lại /api/meta ngay (số file chưa nhận). Revision trả về KHÔNG ghi nhận là "của tab" (nội dung đã đổi).
 */
export function useLamMoiNoiDung(): () => void {
  const client = useContext(QueryClientContext)
  const { thuNgay } = useKetNoi()
  return useCallback(() => {
    if (client) lamMoi(client)
    void thuNgay()
  }, [client, thuNgay])
}

/**
 * Theo dõi revision nội dung của /api/meta (quét nhẹ thấy thư mục nội dung đổi: Claude ghi file, sửa ngoài
 * app): đổi so với lần trước → tải lại trạng thái nội dung, bài học đang mở (đề xuất 1.6 "Bản nháp đã nhận bị
 * sửa ngoài app: đọc thẳng bản mới"), slug cũ. Gắn MỘT lần ở khung app (KhungApp) cho mọi trang.
 */
export function useTheoDoiNoiDung(): void {
  const client = useContext(QueryClientContext)
  const revision = useNoiDungMeta()?.revision
  const truoc = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (revision === undefined) return
    const cu = truoc.current
    truoc.current = revision
    if (cu !== undefined && cu !== revision && client) lamMoi(client)
  }, [revision, client])
}
