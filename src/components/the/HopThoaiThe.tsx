// HỢP ĐỒNG (stub, agent "cot-phai" viết thật): hộp thoại tạo / sửa flashcard (đề xuất 3.5, 4.3).
export interface PropsHopThoaiThe {
  mo: boolean
  doiMo: (mo: boolean) => void
  itemId: string
  /** Sửa thẻ có sẵn. */
  theId?: number
  /** Điền sẵn khi tạo từ câu Tự kiểm tra (H/Đ) hoặc tên mục. */
  giaTriDau?: { truoc: string; sau: string; khoaCau?: string }
}

export default function HopThoaiThe(_props: PropsHopThoaiThe) {
  return null
}
