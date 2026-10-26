// Bộ dữ liệu mẫu phase 3 (§7, đề xuất mục 7; F03, F11, F15, F31, F38): flashcard 85 thẻ hộp 34/21/15/9/6, 12 đến
// hạn, nhớ 81% (30 ngày), Cần ôn lại 3 mục; giờ học (tuần 4 giờ 35 phút, tổng 38 giờ 10 phút, streak 5, kỷ lục
// 12); đồng hồ Risk Register 00:24:17; 7 bài thực hành Xong; Nói lại, ghi chú như frame — qua DB và API thật.
import Database from 'better-sqlite3'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { datLech, ngayCua } from '../../shared/clock.ts'
import { congNgay } from '../../shared/lich.ts'
import { taoApp } from '../../server/app.ts'
import { docCauHinh } from '../../server/cau-hinh.ts'
import type { Db } from '../../server/db/index.ts'
import { docMoiPhien } from '../../server/du-lieu/dong-ho.ts'
import { giayTuanNay, tinhStreak } from '../../server/du-lieu/hop-dong-dong-ho.ts'
import { sauKhiOn, theMoi } from '../../server/du-lieu/hop-dong-the.ts'
import { DANG_HOC, GIO_MAU, luc } from '../../fixtures/mau/so-lieu.ts'
import {
  DICH_HOC,
  GHI_CHU_MAU,
  PHIEN_GIO,
  THE_MAU,
  THUC_HANH_XONG,
} from '../../fixtures/mau/so-lieu-hoc.ts'
import type { KetQuaChuanBi } from '../../fixtures/mau/kich-ban.ts'
import { cay, dungKichBan, laGioMau, mucSlug, thuMucTam } from './ho-tro.ts'

const HOM_NAY = GIO_MAU.slice(0, 10)

let tam: ReturnType<typeof thuMucTam>
let kq: KetQuaChuanBi
let db: Db

beforeAll(async () => {
  if (!laGioMau) return
  tam = thuMucTam()
  kq = await dungKichBan('mac-dinh', tam.goc)
  db = new Database(kq.tepDb, { readonly: true })
})

afterAll(() => {
  datLech(0)
  if (!laGioMau) return
  db.close()
  tam.xoa()
})

const slugCua = (id: string) => cay.mucTheoId.get(id)?.slug

interface DongThe {
  id: number
  item_id: string
  box: number
  due_on: string
  created_at: string
}

describe.skipIf(!laGioMau)('flashcard §7 / F31', () => {
  it('85 thẻ; hộp 1–5 = 34 / 21 / 15 / 9 / 6; 12 thẻ đến hạn 22/10', () => {
    expect(kq.tomTat?.soThe).toBe(DICH_HOC.soThe)
    const hop = db
      .prepare('SELECT box, count(*) AS n FROM flashcards GROUP BY box ORDER BY box')
      .all()
    expect(hop).toEqual(DICH_HOC.hop.map((n, i) => ({ box: i + 1, n })))
    const denHan = db.prepare('SELECT count(*) AS n FROM flashcards WHERE due_on <= ?').get(HOM_NAY)
    expect(denHan).toEqual({ n: DICH_HOC.denHan })
    // Ôn mỗi ngày trước 22/10 nên không thẻ nào trễ hạn quá hôm nay mà ngoài 12 thẻ đó
    const tenMuc = db
      .prepare('SELECT item_id, count(*) AS n FROM flashcards WHERE due_on <= ? GROUP BY item_id')
      .all(HOM_NAY) as { item_id: string; n: number }[]
    expect(Object.fromEntries(tenMuc.map((x) => [slugCua(x.item_id), x.n]))).toEqual({
      scrum: 5,
      moscow: 4,
      'definition-of-done': 3,
    })
  })

  it('tỉ lệ nhớ 30 ngày = 81% (Nhớ / tổng lần ôn; cửa sổ 23/09–22/10, cả 22/09–22/10)', () => {
    for (const lui of [29, 30]) {
      const tu = congNgay(HOM_NAY, -lui)
      const r = db
        .prepare(
          `SELECT sum(result = 'nho') AS nho, count(*) AS tong FROM flashcard_reviews
           WHERE reviewed_on BETWEEN ? AND ?`,
        )
        .get(tu, HOM_NAY) as { nho: number; tong: number }
      expect(Math.round((r.nho / r.tong) * 100), tu).toBe(DICH_HOC.tiLeNho30Ngay)
    }
  })

  it('mỗi thẻ: hộp và hạn = phát lại lịch sử ôn bằng quy tắc Leitner (3.5); không ôn trước khi tạo, sau GIO_MAU', () => {
    const cacThe = db.prepare('SELECT * FROM flashcards ORDER BY id').all() as DongThe[]
    const lanOn = db.prepare('SELECT * FROM flashcard_reviews WHERE card_id = ? ORDER BY id')
    for (const t of cacThe) {
      let trang = theMoi(ngayCua(Date.parse(t.created_at)))
      for (const l of lanOn.all(t.id) as {
        reviewed_at: string
        reviewed_on: string
        result: 'nho' | 'quen'
        from_box: number
        to_box: number
      }[]) {
        expect(l.reviewed_at > t.created_at).toBe(true)
        expect(l.reviewed_at < new Date(Date.parse(GIO_MAU)).toISOString()).toBe(true)
        expect(l.reviewed_on >= trang.hanOn, `thẻ ${t.id} ôn trước hạn`).toBe(true)
        expect(l.from_box).toBe(trang.hop)
        trang = sauKhiOn(trang.hop, l.result, l.reviewed_on)
        expect(l.to_box).toBe(trang.hop)
      }
      expect({ hop: t.box, hanOn: t.due_on }).toEqual(trang)
    }
    expect(kq.tomTat?.soLanOn).toBe(
      THE_MAU.reduce((n, [, , on]) => n + (on ? on.split(', ').length : 0), 0),
    )
  })

  it('Scope Creep 3 thẻ như F11 (hộp 2 ôn lại 24/10; hộp 1 ôn lại 23/10 ×2); Risk Register không có thẻ (F15)', () => {
    const cua = (slug: string) =>
      db
        .prepare('SELECT box, due_on FROM flashcards WHERE item_id = ? ORDER BY id')
        .all(mucSlug(slug).id)
    expect(cua('scope-creep')).toEqual([
      { box: 2, due_on: '2026-10-24' },
      { box: 1, due_on: '2026-10-23' },
      { box: 1, due_on: '2026-10-23' },
    ])
    expect(cua('risk-register')).toEqual([])
  })
})

describe.skipIf(!laGioMau)('API trên DB mẫu lúc GIO_MAU', () => {
  let rw: Db
  let app: ReturnType<typeof taoApp>
  const get = (url: string) => request(app).get(url).set('Host', '127.0.0.1:5321')

  beforeAll(() => {
    if (!laGioMau) return
    rw = new Database(kq.tepDb)
    app = taoApp({
      cauHinh: docCauHinh({ DATA_DIR: kq.dataDir, NOI_DUNG_DIR: kq.noiDungDir }),
      db: rw,
      soMucHoc: cay.soMucHoc,
    })
  })
  afterAll(() => {
    if (laGioMau) rw.close()
  })
  beforeEach(() => {
    // Đồng hồ ảo của bộ mẫu như dev:mau: now() = GIO_MAU
    datLech(Date.parse(GIO_MAU) - Date.now())
  })

  it('GET /api/state: Cần ôn lại = Scrum, MoSCoW, Definition of Done; lọc Đang học + Cần ôn lại = 9', async () => {
    const st = (await get('/api/state')).body
    expect(st.canOnLai.map(slugCua).sort()).toEqual([...DICH_HOC.canOnLai].sort())
    const dangHoc = Object.keys(st.trangThai).filter((id) => st.trangThai[id].status === 'learning')
    expect(new Set([...dangHoc, ...st.canOnLai]).size).toBe(9)
  })

  it('GET /api/dong-ho: Risk Register chạy từ GIO_MAU − 24 phút 17 giây (F03 "00:24:17")', async () => {
    const { dangChay, lichSu } = (await get('/api/dong-ho')).body
    expect(dangChay.itemId).toBe(mucSlug('risk-register').id)
    expect((Date.parse(GIO_MAU) - Date.parse(dangChay.batDau)) / 1000).toBe(DICH_HOC.dongHoGiay)
    expect(lichSu).toHaveLength(5)
    expect(lichSu[0]).toMatchObject({ itemId: mucSlug('scope-creep').id, ngay: HOM_NAY, giay: 720 })
  })

  it('GET /api/hoc: Scope Creep (F11) — Đã học 35 phút, Nói lại + ghi chú lưu 21:42, Áp dụng đang làm trên dự án mẫu', async () => {
    const sc = (await get(`/api/hoc/${mucSlug('scope-creep').id}`)).body
    expect(sc.daHocGiay).toBe(DICH_HOC.phutScopeCreep * 60)
    expect(sc.noiLai.capNhat).toBe(new Date(Date.parse(GIO_MAU)).toISOString())
    expect(sc.ghiChu.capNhat).toBe(new Date(Date.parse(GIO_MAU)).toISOString())
    expect(sc.thucHanh).toMatchObject({ trangThai: 'dang-lam', ketQua: '', xongLuc: null })
    const duAn = (await get('/api/du-an')).body
    expect(duAn).toEqual([
      { id: sc.thucHanh.duAnId, ten: 'Cổng đặt lịch nội bộ', vaiTro: null, giaiDoan: 'Execution' },
    ])
    expect(sc.tuKiemTra).toEqual({}) // F19 "chưa tự chấm câu nào"
    expect(sc.the).toHaveLength(3)

    const rr = (await get(`/api/hoc/${mucSlug('risk-register').id}`)).body
    expect(rr.daHocGiay).toBe(DICH_HOC.phutRiskRegister * 60) // F15 "Tổng 1 giờ 05 phút"
    expect(rr.noiLai.capNhat).toBe(new Date(luc('2026-10-22 21:18')).toISOString())
    expect(rr.the).toEqual([])
  })
})

describe.skipIf(!laGioMau)('giờ học §7 / F03 / F32', () => {
  it('tổng 38 giờ 10 phút; tuần này 4 giờ 35 phút; streak 5 ngày, kỷ lục 12', () => {
    const phien = docMoiPhien(db)
    expect(phien).toHaveLength(PHIEN_GIO.length)
    expect(kq.tomTat?.soPhienGio).toBe(PHIEN_GIO.length)
    expect(phien.reduce((t, p) => t + p.giay, 0)).toBe(DICH_HOC.phutTong * 60)
    expect(giayTuanNay(phien, HOM_NAY)).toBe(DICH_HOC.phutTuanNay * 60)
    expect(tinhStreak(phien, HOM_NAY)).toEqual({
      hienTai: DICH_HOC.streak,
      kyLuc: DICH_HOC.kyLuc,
    })
  })

  it('phiên không chồng nhau, không chồng đồng hồ đang chạy; ngày = ngày bắt đầu; bắt đầu từ 17/09/2026', () => {
    const ds = db.prepare('SELECT * FROM time_entries ORDER BY started_at').all() as {
      date: string
      seconds: number
      started_at: string
      ended_at: string
    }[]
    for (let i = 0; i < ds.length; i++) {
      expect(ds[i].date).toBe(ngayCua(Date.parse(ds[i].started_at)))
      expect(Date.parse(ds[i].ended_at) - Date.parse(ds[i].started_at)).toBe(ds[i].seconds * 1000)
      if (i > 0) expect(ds[i].started_at >= ds[i - 1].ended_at).toBe(true)
    }
    expect(ds[0].date).toBe('2026-09-17')
    const dongHo = db.prepare('SELECT started_at FROM active_timer').get() as { started_at: string }
    expect(ds[ds.length - 1].ended_at <= dongHo.started_at).toBe(true)
  })
})

describe.skipIf(!laGioMau)('4 bước, ghi chú (§7 độ sâu, F11, F38)', () => {
  it('7 bài thực hành Xong (Chủ đề Đã xong, có kết quả, tiêu chí tick); không có Không áp dụng', () => {
    const xong = db
      .prepare("SELECT item_id, result_md, criteria FROM practice WHERE state = 'xong'")
      .all() as { item_id: string; result_md: string; criteria: string | null }[]
    expect(xong.map((x) => slugCua(x.item_id)).sort()).toEqual([...THUC_HANH_XONG].sort())
    expect(xong).toHaveLength(DICH_HOC.thucHanhXong)
    for (const x of xong) {
      expect(x.result_md.trim()).not.toBe('')
      expect(Object.keys(JSON.parse(x.criteria ?? '{}')).length).toBeGreaterThan(0)
    }
    expect(
      db.prepare("SELECT count(*) AS n FROM practice WHERE state = 'khong-ap-dung'").get(),
    ).toEqual({ n: 0 })
  })

  it('Nói lại: 37 mục Đã xong + Scope Creep + Risk Register; mục Đã xong đã tự chấm mọi câu', () => {
    expect(db.prepare('SELECT count(*) AS n FROM restatements').get()).toEqual({ n: 39 })
    const chuaCham = db
      .prepare('SELECT count(*) AS n FROM self_check WHERE grade IS NULL OR revealed_at IS NULL')
      .get()
    expect(chuaCham).toEqual({ n: 0 })
    const dangHoc = DANG_HOC.map((x) => mucSlug(x.slug).id)
    const cuaDangHoc = db
      .prepare(
        `SELECT count(*) AS n FROM self_check WHERE item_id IN (${dangHoc.map(() => '?').join(', ')})`,
      )
      .get(...dangHoc)
    expect(cuaDangHoc).toEqual({ n: 0 })
  })

  it('6 ghi chú, ngày như F38 (mới nhất: Scope Creep 22/10/2026)', () => {
    const ds = db
      .prepare('SELECT item_id, updated_at FROM notes ORDER BY updated_at DESC')
      .all() as { item_id: string; updated_at: string }[]
    expect(ds).toHaveLength(DICH_HOC.soGhiChu)
    expect(ds.map((x) => [slugCua(x.item_id), ngayCua(Date.parse(x.updated_at))])).toEqual(
      [...GHI_CHU_MAU].reverse().map((x) => [x.slug, x.luc.slice(0, 10)]),
    )
  })
})
