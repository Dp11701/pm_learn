// Flashcard của một mục trên trang bài (đề xuất 3.5; Cần chốt 5: thẻ là dữ liệu học trong SQLite): đọc từ dữ liệu
// học của mục (GET /api/hoc/:id, trường `the`), tạo / sửa / xoá qua /api/the. Cùng hàng chờ ghi với các lần ghi
// khác của mục (hoc.ts): chạy nối tiếp, revision của chính tab.
// - Tạo: chờ server (cần id, hộp 1, hạn = hôm nay của server + 1); trả kết quả để hộp thoại (C32 + C36) đóng
//   hoặc hiện lỗi. Thẻ mới vào danh sách → bước Ghi nhớ xong.
// - Sửa: lạc quan; lỗi → giá trị server đã xác nhận; trả kết quả cho hộp thoại.
// - Xoá: lạc quan + toast "Đã xoá thẻ" kèm Hoàn tác 5 giây (POST /api/the/:id/khoi-phuc: cùng id, giữ hộp và
//   hạn); lỗi → thẻ trở lại + toast lỗi "Thử lại".
// Phiên ôn (Nhớ / Quên, đổi hộp) có ở phase 8.
import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/Toast'
import { DA_XOA_THE } from '../../copy/cho-duyet'
import {
  HOAN_TAC,
  baoLoiGhi,
  cauLoi,
  guiGhiHoc,
  khoaHoc,
  layTheTrong,
  useHoc,
  type BienTaoThe,
  type DuLieuHoc,
  type The,
} from './hoc'

export type { BienTaoThe, The }

/** Kết quả cho hộp thoại; `the` null khi server không gửi lại thẻ (danh sách được tải lại). */
export type KetQuaThe = { ok: true; the: The | null } | { ok: false; loi: string }

export interface DuLieuThe {
  /** Thẻ của mục (rỗng khi chưa tải xong) */
  the: The[]
  dangTai: boolean
  loi: boolean
}

/** Thẻ của mục `itemId`. */
export function useThe(itemId: string | undefined): DuLieuThe {
  const { hoc, dangTai, loi } = useHoc(itemId)
  return useMemo(() => ({ the: hoc?.the ?? [], dangTai, loi }), [hoc, dangTai, loi])
}

/** "Tạo flashcard" từ câu Tự kiểm tra (điền sẵn H/Đ, kèm khoaCau) / "Tạo thẻ" (điền sẵn tên mục). */
export function useTaoThe(itemId: string): (bien: BienTaoThe) => Promise<KetQuaThe> {
  const client = useQueryClient()
  return useCallback(
    (bien) =>
      new Promise<KetQuaThe>((xong) => {
        const gui: BienTaoThe = { truoc: bien.truoc.trim(), sau: bien.sau.trim() }
        if (bien.khoaCau) gui.khoaCau = bien.khoaCau
        guiGhiHoc(
          client,
          itemId,
          { loai: 'tao-the', bien: gui },
          {
            khiXong: (kq) => {
              // Server không gửi lại thẻ: danh sách được tải lại (hoc.ts)
              xong({ ok: true, the: layTheTrong(kq) })
            },
            khiLoi: (loi) => xong({ ok: false, loi: cauLoi(loi) }),
          },
        )
      }),
    [client, itemId],
  )
}

/** Sửa mặt trước / mặt sau của thẻ. */
export function useSuaThe(
  itemId: string,
): (id: number, bien: { truoc?: string; sau?: string }) => Promise<KetQuaThe> {
  const client = useQueryClient()
  return useCallback(
    (id, bien) =>
      new Promise<KetQuaThe>((xong) => {
        const truoc = bien.truoc?.trim()
        const sau = bien.sau?.trim()
        guiGhiHoc(
          client,
          itemId,
          {
            loai: 'sua-the',
            id,
            ...(truoc !== undefined ? { truoc } : {}),
            ...(sau !== undefined ? { sau } : {}),
          },
          {
            khiXong: () => {
              const the = client
                .getQueryData<DuLieuHoc>(khoaHoc(itemId))
                ?.the.find((t) => t.id === id)
              xong({ ok: true, the: the ?? null })
            },
            khiLoi: (loi) => xong({ ok: false, loi: cauLoi(loi) }),
          },
        )
      }),
    [client, itemId],
  )
}

/** Xoá thẻ (sau alertdialog xác nhận của nơi gọi): toast "Đã xoá thẻ" + Hoàn tác. */
export function useXoaThe(itemId: string): (id: number) => void {
  const client = useQueryClient()
  const { toast } = useToast()

  const khoiPhuc = useCallback(
    function khoiPhuc(the: The) {
      guiGhiHoc(
        client,
        itemId,
        { loai: 'khoi-phuc-the', the },
        { khiLoi: baoLoiGhi(client, toast, () => khoiPhuc(the)) },
      )
    },
    [client, itemId, toast],
  )

  return useCallback(
    function xoa(id: number) {
      const the = client.getQueryData<DuLieuHoc>(khoaHoc(itemId))?.the.find((t) => t.id === id)
      if (!the) return
      guiGhiHoc(
        client,
        itemId,
        { loai: 'xoa-the', id },
        {
          khiXong: (kq) => {
            // Server gửi lại thẻ vừa xoá thì khôi phục đúng bản đó (hộp, hạn mới nhất)
            const daXoa = layTheTrong(kq) ?? the
            toast({
              noiDung: DA_XOA_THE,
              hanhDong: { nhan: HOAN_TAC, chay: () => khoiPhuc(daXoa) },
            })
          },
          khiLoi: baoLoiGhi(client, toast, () => xoa(id)),
        },
      )
    },
    [client, itemId, toast, khoiPhuc],
  )
}
