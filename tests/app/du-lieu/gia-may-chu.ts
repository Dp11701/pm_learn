// Máy chủ giả trong bộ nhớ cho test lớp dữ liệu web: thay `fetch`, làm đúng hợp đồng
// server/du-lieu/hop-dong-trang-thai.ts cho GET /api/state, PUT /api/trang-thai/:id, POST /api/luot-mo/:id, và
// GET /api/noi-dung/trang-thai ({ [id]: TrangThaiNoiDung }, không có khoá = Chưa có nội dung).
// Điều khiển được: làm lỗi n lần PUT / GET /api/state tới, giữ PUT lại tới khi mở cửa (hoặc cho từng PUT đi
// một), giờ của lượt mở.
import { vi } from 'vitest'
import type { TrangThaiNoiDung } from '../../../shared/domain/trang-thai'
import {
  giaTriCua,
  mucCua,
  type GiaTriTrangThai,
  type MucTrangThai,
} from '../../../server/du-lieu/hop-dong-trang-thai'

export interface YeuCauDaGui {
  method: string
  url: string
  body?: unknown
}

export interface GiaMayChu {
  revision: number
  trangThai: Record<string, MucTrangThai>
  luotMo: Record<string, string>
  yeuCau: YeuCauDaGui[]
  /** Trạng thái nội dung theo id (GET /api/noi-dung/trang-thai) */
  noiDung: Record<string, TrangThaiNoiDung>
  /** Số lần PUT tới trả 500 */
  loiPut: number
  /** Số lần GET /api/state tới trả 500 */
  loiGet: number
  /** Giờ ghi cho lượt mở tới (ISO) */
  gioMo: string
  /** Giữ mọi PUT lại; gọi moCua() để cho chạy tiếp */
  dongCua(): void
  moCua(): void
  /** Cửa vẫn đóng, chỉ cho PUT đang chờ sớm nhất chạy tiếp */
  moMot(): void
  /** Số PUT đang bị giữ */
  soDangGiu(): number
  /** Số lần gọi theo method + đường dẫn, vd. 'GET /api/state' */
  dem(khoa: string): number
}

export function taoGiaMayChu(): GiaMayChu {
  let dong = false
  /** PUT đang bị giữ, theo thứ tự tới */
  const dangGiu: (() => void)[] = []
  const sv: GiaMayChu = {
    revision: 0,
    trangThai: {},
    luotMo: {},
    yeuCau: [],
    noiDung: {},
    loiPut: 0,
    loiGet: 0,
    gioMo: '2026-10-22T14:42:00.000Z',
    dongCua() {
      dong = true
    },
    moCua() {
      dong = false
      for (const mo of dangGiu.splice(0)) mo()
    },
    moMot() {
      dangGiu.shift()?.()
    },
    soDangGiu: () => dangGiu.length,
    dem: (khoa) => sv.yeuCau.filter((y) => `${y.method} ${y.url}` === khoa).length,
  }

  const json = (status: number, data: unknown) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const body = init?.body === undefined ? undefined : JSON.parse(String(init.body))
      sv.yeuCau.push({ method, url, body })

      if (method === 'GET' && url === '/api/state') {
        if (sv.loiGet > 0) {
          sv.loiGet -= 1
          return json(500, { loi: 'Máy chủ gặp lỗi.' })
        }
        return json(200, {
          revision: sv.revision,
          trangThai: structuredClone(sv.trangThai),
          luotMo: { ...sv.luotMo },
        })
      }
      const dat = /^\/api\/trang-thai\/(.+)$/.exec(url)
      if (method === 'GET' && url === '/api/noi-dung/trang-thai') {
        return json(200, structuredClone(sv.noiDung))
      }
      if (method === 'PUT' && dat) {
        if (dong) await new Promise<void>((r) => dangGiu.push(r))
        if (sv.loiPut > 0) {
          sv.loiPut -= 1
          return json(500, {
            loi: 'Máy chủ gặp lỗi. Thử lại sau; nếu vẫn lỗi, xem log của server.',
          })
        }
        const id = decodeURIComponent(dat[1])
        const truoc = giaTriCua(sv.trangThai[id])
        const muc = mucCua(body as GiaTriTrangThai)
        if (muc) sv.trangThai[id] = muc
        else delete sv.trangThai[id]
        sv.revision += 1
        return json(200, {
          revision: sv.revision,
          id,
          muc,
          sau: giaTriCua(muc),
          truoc,
          daDoi: true,
        })
      }
      const luot = /^\/api\/luot-mo\/(.+)$/.exec(url)
      if (method === 'POST' && luot) {
        const id = decodeURIComponent(luot[1])
        sv.luotMo[id] = sv.gioMo
        sv.revision += 1
        return json(200, { revision: sv.revision, id, lanMoCuoi: sv.gioMo })
      }
      return json(404, { loi: `Không có API ${method} ${url}.` })
    }),
  )
  return sv
}
