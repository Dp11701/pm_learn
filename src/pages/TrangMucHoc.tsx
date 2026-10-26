// /hoc/:slug — bài học (phase 2a; F11 trừ cột phải, F17, F18, F19 trái, F26 lỗi đọc file). Slug phải là mục
// học trong cây; không có → 404 có gợi ý. Mỗi mục một lần gắn (key = id): đổi bài là trang mới.
// Dữ liệu: GET /api/bai/:id (bài), trạng thái học + đặt trạng thái + lượt mở (src/app/du-lieu). Ngoài
// QueryClientProvider (gallery, test khung app) trang vẫn vẽ đầu bài từ cây, trạng thái chỉ đọc, thân bài ở
// trạng thái đang tải — không gọi API.
import { useContext } from 'react'
import { useParams } from 'react-router'
import { QueryClientContext } from '@tanstack/react-query'
import type { MucHoc } from '../../shared/roadmap'
import { useDatTrangThai, useGhiLuotMo, useTrangThai } from '../app/du-lieu/trang-thai'
import { useBai } from './bai-hoc/du-lieu-bai'
import TrangBaiHoc from './bai-hoc/TrangBaiHoc'
import { timMucHoc } from './chung'
import KhongTimThay from './KhongTimThay'

function BaiCoMayChu({ muc }: { muc: MucHoc }) {
  const hoc = useTrangThai()
  const datHoc = useDatTrangThai()
  useGhiLuotMo(muc.id)
  const bai = useBai(muc.id)
  return <TrangBaiHoc muc={muc} bai={bai} hoc={hoc} datHoc={datHoc} />
}

function BaiKhongMayChu({ muc }: { muc: MucHoc }) {
  const hoc = useTrangThai()
  return <TrangBaiHoc muc={muc} bai={{ tinhTrang: 'dang-tai' }} hoc={hoc} />
}

export default function TrangMucHoc() {
  const muc = timMucHoc(useParams().slug)
  const coMayChu = useContext(QueryClientContext) !== undefined
  if (!muc) return <KhongTimThay />
  return coMayChu ? (
    <BaiCoMayChu key={muc.id} muc={muc} />
  ) : (
    <BaiKhongMayChu key={muc.id} muc={muc} />
  )
}
