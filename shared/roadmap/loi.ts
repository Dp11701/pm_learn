/** Lỗi khi nạp cây roadmap hoặc cau-hinh-cay.json; UI hiện trang "Không đọc được cây roadmap". */
export class LoiCay extends Error {
  override name = 'LoiCay'
}
