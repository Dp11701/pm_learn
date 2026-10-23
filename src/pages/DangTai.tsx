// Đang tải (HydrateFallback, trang lười): skeleton theo F26 "Skeleton · Tổng quan đang tải" — lưới 2 cột,
// card 180 · 180 · 140 (cả hàng) · 120, cách 16, lề 24; mobile 1 cột, lề 16.
import { TheCho, VungDangTai } from '../components/TrangThaiTrong'

export default function DangTai() {
  return (
    <VungDangTai className="grid grid-cols-2 gap-4 p-6 max-md:grid-cols-1 max-md:p-4">
      <TheCho cao={180} />
      <TheCho cao={180} />
      <TheCho cao={140} className="col-span-2 max-md:col-span-1" />
      <TheCho cao={120} />
    </VungDangTai>
  )
}
