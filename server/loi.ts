import type { NextFunction, Request, Response } from 'express'

// Lỗi API: luôn trả JSON { loi: '<câu tiếng Việt>' } kèm mã HTTP đúng.

export class LoiApi extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function khongCoApi(req: Request, res: Response): void {
  res.status(404).json({ loi: `Không có API ${req.method} ${req.originalUrl}.` })
}

export function khongTimThay(_req: Request, res: Response): void {
  res.status(404).json({ loi: 'Không tìm thấy trang này trên máy chủ API.' })
}

interface LoiCoMa {
  status?: number
  statusCode?: number
  type?: string
  limit?: number
}

export function xuLyLoi(loi: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) return next(loi)
  if (loi instanceof LoiApi) {
    res.status(loi.status).json({ loi: loi.message })
    return
  }
  const e = (typeof loi === 'object' && loi !== null ? loi : {}) as LoiCoMa
  const status = e.status ?? e.statusCode ?? 500
  if (e.type === 'entity.too.large') {
    const mb = Math.max(1, Math.round((e.limit ?? 0) / 1024 / 1024))
    res.status(413).json({ loi: `Dữ liệu gửi lên quá lớn (tối đa ${mb} MB).` })
  } else if (e.type === 'entity.parse.failed') {
    res.status(400).json({ loi: 'Dữ liệu gửi lên không phải JSON hợp lệ.' })
  } else if (status >= 400 && status < 500) {
    res.status(status).json({ loi: 'Yêu cầu không hợp lệ.' })
  } else {
    console.error(loi)
    res.status(500).json({ loi: 'Máy chủ gặp lỗi. Thử lại sau; nếu vẫn lỗi, xem log của server.' })
  }
}
