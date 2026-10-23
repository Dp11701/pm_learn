import type { NextFunction, Request, Response } from 'express'

// Chặn DNS rebinding (Host lạ) và trang web khác gọi API (Origin lạ) — đề xuất 1.10.

export function nosniff(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  next()
}

/**
 * Host hợp lệ: 127.0.0.1 / localhost với cổng API, hoặc cổng web
 * (proxy /api của Vite giữ nguyên Host của trình duyệt).
 */
export function kiemHost(congApi: number, congWeb: number) {
  const hopLe = new Set(
    [congApi, congWeb].flatMap((cong) => [`127.0.0.1:${cong}`, `localhost:${cong}`]),
  )
  return (req: Request, res: Response, next: NextFunction): void => {
    const host = (req.headers.host ?? '').toLowerCase()
    if (!hopLe.has(host)) {
      res.status(403).json({ loi: 'Địa chỉ máy chủ (Host) không được phép.' })
      return
    }
    next()
  }
}

/** Origin (nếu có) phải là trang web của app hoặc chính API. */
export function kiemOrigin(congApi: number, congWeb: number) {
  const hopLe = new Set(
    [congApi, congWeb].flatMap((cong) => [`http://127.0.0.1:${cong}`, `http://localhost:${cong}`]),
  )
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin
    if (origin !== undefined && !hopLe.has(origin.toLowerCase())) {
      res.status(403).json({ loi: 'Trang gửi yêu cầu (Origin) không được phép.' })
      return
    }
    next()
  }
}
