// Máy chủ giả trong bộ nhớ cho test lớp dữ liệu phase 3 (src/app/du-lieu/hoc.ts, the.ts, du-an.ts, dong-ho.ts):
// thay `fetch`, làm đúng hợp đồng API của phase 3 — GET /api/hoc/:id, PUT noi-lai / thuc-hanh / tu-kiem-tra/:khoa
// / ghi-chu, /api/the, /api/du-an, /api/dong-ho, /api/phien-gio, GET /api/state (để thấy có tải lại hay không).
// Mỗi lần ghi có đổi dữ liệu tăng revision 1 và trả { revision, daDoi } + dữ liệu mới như hợp đồng của server
// (server/du-lieu/hop-dong-hoc.ts, hop-dong-the.ts, hop-dong-dong-ho.ts): noiLai / ghiChu, thucHanh + truoc,
// { khoa, cau, truoc }, the, duAn, { dangChay, phien }.
// Điều khiển được: làm lỗi 500 n lần ghi tới, giữ mọi lần ghi lại (dongCua / moCua / moMot), hỏi quên tắt
// đồng hồ (canHoi), giờ server.
import { vi } from 'vitest'

export interface ThucHanhGia {
  trangThai: 'dang-lam' | 'xong' | 'khong-ap-dung' | null
  duAnId: number | null
  ketQua: string
  tieuChi: Record<string, boolean>
  lyDo: string | null
  xongLuc: string | null
}

export interface CauGia {
  traLoi: string
  daXem: boolean
  cham: 'dung' | 'mot-phan' | 'sai' | null
  chamLuc: string | null
  /** Chữ câu hỏi lúc lưu (server ghi; đề xuất 1.5) — thiếu = chưa biết */
  cauHoi?: string | null
}

export interface TheGia {
  id: number
  itemId: string
  truoc: string
  sau: string
  hop: number
  hanOn: string
  khoaCau: string | null
}

export interface MucGia {
  noiLai: { text: string; capNhat: string } | null
  thucHanh: ThucHanhGia
  tuKiemTra: Record<string, CauGia>
  ghiChu: { text: string; capNhat: string } | null
}

export interface YeuCauGia {
  method: string
  url: string
  body?: unknown
}

export interface GiaMayChuHoc {
  revision: number
  muc: Record<string, MucGia>
  the: TheGia[]
  theDaXoa: TheGia[]
  duAn: { id: number; ten: string; vaiTro: string | null; giaiDoan: string | null }[]
  dangChay: { itemId: string; batDau: string } | null
  lichSu: { id: number; itemId: string; ngay: string; giay: number }[]
  phienDaXoa: { id: number; itemId: string; ngay: string; giay: number }[]
  /** Dừng / chuyển mà chưa có ghiGiay → 409 { canHoi: true, giay } */
  canHoi: number | null
  /** Giờ server (ISO) cho capNhat, batDau… */
  gio: string
  homNay: string
  yeuCau: YeuCauGia[]
  /** Số lần ghi tới trả 500 */
  loiGhi: number
  /** Số lần GET /api/hoc tới trả 500 */
  loiTai: number
  dongCua(): void
  moCua(): void
  moMot(): void
  soDangGiu(): number
  dem(khoa: string): number
  /** Các lần gọi theo method + đường dẫn */
  cacLan(khoa: string): YeuCauGia[]
  mucCua(id: string): MucGia
}

export const thucHanhTrong = (): ThucHanhGia => ({
  trangThai: null,
  duAnId: null,
  ketQua: '',
  tieuChi: {},
  lyDo: null,
  xongLuc: null,
})

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export function taoGiaMayChuHoc(): GiaMayChuHoc {
  let dong = false
  const dangGiu: (() => void)[] = []
  let idThe = 100
  let idDuAn = 10
  let idPhien = 500
  /** Lần dừng / chuyển gần nhất (cho POST /api/dong-ho/hoan-tac) */
  let lanDungCuoi: {
    dangChay: { itemId: string; batDau: string }
    phien: { id: number; itemId: string; ngay: string; giay: number } | null
  } | null = null
  const sv: GiaMayChuHoc = {
    revision: 0,
    muc: {},
    the: [],
    theDaXoa: [],
    duAn: [],
    dangChay: null,
    lichSu: [],
    phienDaXoa: [],
    canHoi: null,
    gio: '2026-10-22T14:42:00.000Z',
    homNay: '2026-10-22',
    yeuCau: [],
    loiGhi: 0,
    loiTai: 0,
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
    dem: (khoa) => sv.cacLan(khoa).length,
    cacLan: (khoa) => sv.yeuCau.filter((y) => `${y.method} ${y.url}` === khoa),
    mucCua(id) {
      sv.muc[id] ??= { noiLai: null, thucHanh: thucHanhTrong(), tuKiemTra: {}, ghiChu: null }
      return sv.muc[id]
    },
  }

  const loi400 = (loi: string) => json(400, { loi })
  const ghiXong = (them: Record<string, unknown> = {}) => {
    sv.revision += 1
    return json(200, { revision: sv.revision, daDoi: true, ...them })
  }

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const body: Record<string, unknown> | undefined =
        init?.body === undefined ? undefined : JSON.parse(String(init.body))
      sv.yeuCau.push({ method, url, body })

      // ---------- Đọc ----------
      if (method === 'GET') {
        if (url === '/api/state') {
          return json(200, { revision: sv.revision, trangThai: {}, luotMo: {} })
        }
        const hoc = /^\/api\/hoc\/([^/]+)$/.exec(url)
        if (hoc) {
          if (sv.loiTai > 0) {
            sv.loiTai -= 1
            return json(500, { loi: 'Máy chủ gặp lỗi.' })
          }
          const id = decodeURIComponent(hoc[1])
          const m = sv.mucCua(id)
          return json(200, {
            revision: sv.revision,
            ...structuredClone(m),
            the: structuredClone(sv.the.filter((t) => t.itemId === id)),
            daHocGiay: sv.lichSu.filter((p) => p.itemId === id).reduce((t, p) => t + p.giay, 0),
          })
        }
        if (url === '/api/du-an') return json(200, structuredClone(sv.duAn))
        const dongHo = /^\/api\/dong-ho(?:\?itemId=(.+))?$/.exec(url)
        if (dongHo) {
          const loc = dongHo[1] ? decodeURIComponent(dongHo[1]) : null
          const lichSu = sv.lichSu.filter((p) => loc === null || p.itemId === loc).slice(0, 5)
          return json(200, {
            revision: sv.revision,
            dangChay: sv.dangChay,
            lichSu: structuredClone(lichSu),
          })
        }
        return json(404, { loi: `Không có API ${method} ${url}.` })
      }

      // ---------- Ghi ----------
      if (dong) await new Promise<void>((r) => dangGiu.push(r))
      if (sv.loiGhi > 0) {
        sv.loiGhi -= 1
        return json(500, { loi: 'Máy chủ gặp lỗi.' })
      }
      const b = body ?? {}

      const chu = /^\/api\/hoc\/([^/]+)\/(noi-lai|ghi-chu)$/.exec(url)
      if (method === 'PUT' && chu) {
        const m = sv.mucCua(decodeURIComponent(chu[1]))
        // Chữ chỉ có khoảng trắng = xoá
        const giaTri = String(b.text).trim() ? { text: String(b.text), capNhat: sv.gio } : null
        if (chu[2] === 'noi-lai') {
          m.noiLai = giaTri
          return ghiXong({ noiLai: giaTri })
        }
        m.ghiChu = giaTri
        return ghiXong({ ghiChu: giaTri })
      }
      const th = /^\/api\/hoc\/([^/]+)\/thuc-hanh$/.exec(url)
      if (method === 'PUT' && th) {
        const m = sv.mucCua(decodeURIComponent(th[1]))
        const moi = { ...m.thucHanh }
        if ('trangThai' in b) moi.trangThai = b.trangThai as ThucHanhGia['trangThai']
        if ('duAnId' in b) moi.duAnId = b.duAnId as number | null
        if ('ketQua' in b) moi.ketQua = String(b.ketQua)
        if ('tieuChi' in b) moi.tieuChi = { ...moi.tieuChi, ...(b.tieuChi as object) }
        if ('lyDo' in b) {
          if (typeof b.lyDo !== 'string') return loi400('Lý do phải là chữ.')
          moi.lyDo = b.lyDo.trim()
        }
        const coDuLieu =
          moi.ketQua.trim() !== '' ||
          moi.duAnId !== null ||
          Object.values(moi.tieuChi).some(Boolean)
        if (moi.trangThai === null && coDuLieu) moi.trangThai = 'dang-lam'
        if (moi.trangThai !== 'khong-ap-dung') moi.lyDo = null
        if (moi.trangThai === 'khong-ap-dung' && !(moi.lyDo ?? '').trim()) {
          return loi400('Ghi lý do để đánh dấu Không áp dụng.')
        }
        if (moi.trangThai === 'xong' && !moi.ketQua.trim()) {
          return loi400('Ghi kết quả trước khi đánh dấu Xong.')
        }
        moi.xongLuc =
          moi.trangThai !== 'xong'
            ? null
            : m.thucHanh.trangThai === 'xong'
              ? m.thucHanh.xongLuc
              : sv.gio
        const truoc = m.thucHanh
        m.thucHanh = moi
        return ghiXong({ thucHanh: moi, truoc })
      }
      const tk = /^\/api\/hoc\/([^/]+)\/tu-kiem-tra\/([^/]+)$/.exec(url)
      if (method === 'PUT' && tk) {
        const m = sv.mucCua(decodeURIComponent(tk[1]))
        const khoa = decodeURIComponent(tk[2])
        const cu = m.tuKiemTra[khoa] ?? { traLoi: '', daXem: false, cham: null, chamLuc: null }
        const moi = { ...cu }
        if ('traLoi' in b) moi.traLoi = String(b.traLoi)
        if (b.daXem === true) {
          if (!moi.traLoi.trim()) return loi400('Trả lời trước khi xem đáp án.')
          moi.daXem = true
        }
        if ('cham' in b) {
          if (!moi.daXem) return loi400('Xem đáp án trước khi tự chấm.')
          moi.cham = b.cham as CauGia['cham']
          moi.chamLuc = sv.gio
        }
        m.tuKiemTra[khoa] = moi
        return ghiXong({ khoa, cau: moi, truoc: cu })
      }

      if (method === 'POST' && url === '/api/the') {
        const t: TheGia = {
          id: (idThe += 1),
          itemId: String(b.itemId),
          truoc: String(b.truoc),
          sau: String(b.sau),
          hop: 1,
          hanOn: '2026-10-23',
          khoaCau: typeof b.khoaCau === 'string' ? b.khoaCau : null,
        }
        sv.the.push(t)
        return ghiXong({ the: structuredClone(t) })
      }
      const the = /^\/api\/the\/(\d+)(\/khoi-phuc)?$/.exec(url)
      if (the) {
        const id = Number(the[1])
        if (the[2] && method === 'POST') {
          const t = sv.theDaXoa.find((x) => x.id === id)
          if (!t) return json(404, { loi: 'Không có thẻ này.' })
          sv.theDaXoa = sv.theDaXoa.filter((x) => x !== t)
          sv.the.push(t)
          return ghiXong({ the: structuredClone(t) })
        }
        const t = sv.the.find((x) => x.id === id)
        if (!t) return json(404, { loi: 'Không có thẻ này.' })
        if (method === 'PUT') {
          if ('truoc' in b) t.truoc = String(b.truoc)
          if ('sau' in b) t.sau = String(b.sau)
          return ghiXong({ the: structuredClone(t) })
        }
        if (method === 'DELETE') {
          sv.the = sv.the.filter((x) => x !== t)
          sv.theDaXoa.push(t)
          return ghiXong({ the: structuredClone(t) })
        }
      }

      if (method === 'POST' && url === '/api/du-an') {
        if (!String(b.ten ?? '').trim()) return loi400('Ghi tên dự án.')
        const d = {
          id: (idDuAn += 1),
          ten: String(b.ten),
          vaiTro: typeof b.vaiTro === 'string' ? b.vaiTro : null,
          giaiDoan: typeof b.giaiDoan === 'string' ? b.giaiDoan : null,
        }
        sv.duAn.push(d)
        return ghiXong({ duAn: d })
      }

      // Đồng hồ
      const dungDongHo = (ghiGiay: unknown) => {
        const dc = sv.dangChay
        lanDungCuoi = null
        if (!dc) return null
        let giay = 30 * 60
        if (sv.canHoi !== null) giay = sv.canHoi
        if (typeof ghiGiay === 'number') giay = Math.min(Math.max(ghiGiay, 60), giay)
        sv.dangChay = null
        if (ghiGiay === null || giay < 60) {
          lanDungCuoi = { dangChay: dc, phien: null }
          return null
        }
        const p = { id: (idPhien += 1), itemId: dc.itemId, ngay: sv.homNay, giay }
        sv.lichSu = [p, ...sv.lichSu]
        lanDungCuoi = { dangChay: dc, phien: p }
        return p
      }
      if (method === 'POST' && url === '/api/dong-ho/hoan-tac') {
        if (!lanDungCuoi) return json(409, { loi: 'Không có gì để hoàn tác.' })
        const { dangChay, phien } = lanDungCuoi
        lanDungCuoi = null
        if (phien) sv.lichSu = sv.lichSu.filter((p) => p.id !== phien.id)
        sv.dangChay = dangChay
        return ghiXong({ dangChay, dung: null, phien: null })
      }
      if (method === 'POST' && url === '/api/dong-ho/bat-dau') {
        if (sv.dangChay && sv.dangChay.itemId !== b.itemId) {
          if (b.chuyen !== true)
            return json(409, { loi: 'Đang bấm giờ mục khác.', dangChay: sv.dangChay })
          if (sv.canHoi !== null && !('ghiGiay' in b)) {
            return json(409, { canHoi: true, giay: sv.canHoi })
          }
        }
        const phien = dungDongHo(b.ghiGiay)
        sv.canHoi = null
        sv.dangChay = { itemId: String(b.itemId), batDau: sv.gio }
        return ghiXong({ dangChay: sv.dangChay, phien })
      }
      if (method === 'POST' && url === '/api/dong-ho/dung') {
        if (!sv.dangChay) return json(409, { loi: 'Không có đồng hồ nào đang chạy.' })
        if (sv.canHoi !== null && !('ghiGiay' in b)) {
          return json(409, { canHoi: true, giay: sv.canHoi })
        }
        const phien = dungDongHo(b.ghiGiay)
        sv.canHoi = null
        return ghiXong({ dangChay: null, phien })
      }
      const phien = /^\/api\/phien-gio\/(\d+)(\/khoi-phuc)?$/.exec(url)
      if (phien) {
        const id = Number(phien[1])
        if (phien[2] && method === 'POST') {
          const p = sv.phienDaXoa.find((x) => x.id === id)
          if (!p) return json(404, { loi: 'Không có phiên này.' })
          sv.phienDaXoa = sv.phienDaXoa.filter((x) => x !== p)
          sv.lichSu = [...sv.lichSu, p].sort((x, y) => y.id - x.id)
          return ghiXong({ phien: p })
        }
        if (method === 'DELETE') {
          const p = sv.lichSu.find((x) => x.id === id)
          if (!p) return json(404, { loi: 'Không có phiên này.' })
          sv.lichSu = sv.lichSu.filter((x) => x !== p)
          sv.phienDaXoa.push(p)
          return ghiXong({ phien: p })
        }
      }
      return json(404, { loi: `Không có API ${method} ${url}.` })
    }),
  )
  return sv
}
