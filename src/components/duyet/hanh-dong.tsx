// Gửi một thao tác duyệt (bước 4) từ trang bài: Duyệt bài / Duyệt bản sửa / Bỏ bản sửa. Xong → toast "Đã duyệt
// {tên}" (không Hoàn tác — Cần chốt 13) hoặc toast lỗi với câu của máy chủ (409 file đã đổi, lỗi frontmatter…),
// không tự đóng để kịp đọc; cả hai trường hợp đều làm mới dữ liệu nội dung (mọi khoá 'noi-dung': trạng thái nội
// dung, bài, chờ duyệt, chi tiết duyệt; và /api/meta) để mọi nơi hiện đúng bản trên đĩa.
import { useCallback, useState } from 'react'
import type { MucHoc } from '../../../shared/roadmap'
import { LoiGoiApi } from '../../app/du-lieu/api'
import { guiBoBanSua, guiDuyet, guiDuyetBanSua } from '../../app/du-lieu/duyet'
import { cauLoi, useLamMoiNoiDung } from '../../app/du-lieu/nhap'
import { LOI_NHAP } from '../../copy/cho-duyet'
import {
  DA_BO_BAN_SUA,
  DA_DUYET_BAN_SUA,
  DA_TAI_LAI_BAI,
  LOI_DUYET,
} from '../../copy/cho-duyet-duyet'
import TenMuc from '../TenMuc'
import { useToast } from '../Toast'

export type ViecDuyet = 'duyet' | 'duyet-ban-sua' | 'bo-ban-sua'

const DA_XONG: Record<ViecDuyet, string> = {
  duyet: 'Đã duyệt',
  'duyet-ban-sua': DA_DUYET_BAN_SUA,
  'bo-ban-sua': DA_BO_BAN_SUA,
}

export interface HanhDongDuyet {
  /** Thao tác đang gửi; null khi rảnh */
  dang: ViecDuyet | null
  /** Gửi thao tác; trả true khi máy chủ nhận. `hashNhap` bắt buộc với duyet, duyet-ban-sua. */
  chay: (viec: ViecDuyet, hashNhap?: string) => Promise<boolean>
}

export function useHanhDongDuyet(muc: MucHoc): HanhDongDuyet {
  const { toast } = useToast()
  const lamMoi = useLamMoiNoiDung()
  const [dang, datDang] = useState<ViecDuyet | null>(null)

  const chay = useCallback(
    async (viec: ViecDuyet, hashNhap = '') => {
      datDang(viec)
      try {
        if (viec === 'duyet') await guiDuyet(muc.id, hashNhap)
        else if (viec === 'duyet-ban-sua') await guiDuyetBanSua(muc.id, hashNhap)
        else await guiBoBanSua(muc.id)
        toast({
          noiDung: (
            <>
              {DA_XONG[viec]} <TenMuc>{muc.label}</TenMuc>
            </>
          ),
        })
        return true
      } catch (loi) {
        const dau = viec === 'bo-ban-sua' ? LOI_DUYET.boBanSua : LOI_DUYET.duyet
        // 409: file trên đĩa khác bản đang hiện → trang tải lại (lamMoi dưới), nói rõ cho người dùng
        const sau = loi instanceof LoiGoiApi && loi.status === 409 ? ` ${DA_TAI_LAI_BAI}` : ''
        toast({
          loai: 'loi',
          noiDung: `${dau}: ${cauLoi(loi, LOI_NHAP.matKetNoi)}${sau}`,
          thoiGian: null,
        })
        return false
      } finally {
        datDang(null)
        lamMoi()
      }
    },
    [muc.id, muc.label, toast, lamMoi],
  )

  return { dang, chay }
}
