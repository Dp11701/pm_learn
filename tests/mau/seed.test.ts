// Seed bộ dữ liệu mẫu (§7, đề xuất mục 7) trên thư mục tạm: đúng số liệu §7 mà các bảng phase 2a biểu diễn
// được, lịch sử trạng thái cho burnup, lượt mở cho Học tiếp / sidebar, bản chụp duyệt khớp hash file.
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ngayCua } from '../../shared/clock.ts'
import { dinhDangPhanTram } from '../../shared/dinh-dang.ts'
import { tuanIso } from '../../shared/lich.ts'
import { docFrontmatter } from '../../shared/noi-dung/index.ts'
import type { MucHoc } from '../../shared/roadmap/index.ts'
import { taoApp } from '../../server/app.ts'
import { docCauHinh } from '../../server/cau-hinh.ts'
import type { Db } from '../../server/db/index.ts'
import { docSetting } from '../../server/db/settings.ts'
import { docBanChupHienHanh, docCacBanChupHienHanh } from '../../server/du-lieu/ban-chup-duyet.ts'
import type { AnhChupHoc, TrangThaiDb } from '../../server/du-lieu/hop-dong-trang-thai.ts'
import { docAnhChup, docSuKien } from '../../server/du-lieu/trang-thai.ts'
import { danhSachDangHoc, hocTiep } from '../../src/app/du-lieu/hoc-tiep.ts'
import { bamFile, kiemMuiGio, lichDoiTrangThai } from '../../fixtures/mau/seed.ts'
import {
  BO_QUA,
  DANG_HOC,
  DA_DUYET,
  DA_XONG,
  LY_DO_BO_QUA,
  NGAY_BAT_DAU,
  luc,
  ngayCuaMoc,
} from '../../fixtures/mau/so-lieu.ts'
import type { KetQuaChuanBi } from '../../fixtures/mau/kich-ban.ts'
import { cay, dungKichBan, laGioMau, mucSlug, thuMucTam } from './ho-tro.ts'

let tam: ReturnType<typeof thuMucTam>
let kq: KetQuaChuanBi
let db: Db
let anhChup: AnhChupHoc

// Bộ mẫu chỉ dựng được ở giờ Việt Nam: múi giờ khác thì không dựng, mọi describe bên dưới bị bỏ qua.
beforeAll(async () => {
  if (!laGioMau) return
  tam = thuMucTam()
  kq = await dungKichBan('mac-dinh', tam.goc)
  db = new Database(kq.tepDb, { readonly: true })
  anhChup = docAnhChup(db, (id) => cay.mucTheoId.has(id))
})

afterAll(() => {
  if (!laGioMau) return
  db.close()
  tam.xoa()
})

const trangThaiCua = (muc: MucHoc): TrangThaiDb | undefined => anhChup.trangThai[muc.id]?.status

describe.skipIf(!laGioMau)('trạng thái học §7', () => {
  it('máy chạy test ở giờ Việt Nam (ngày lịch của bộ mẫu)', () => {
    expect(() => kiemMuiGio()).not.toThrow()
  })

  it('37 Đã xong · 6 Đang học · 4 Bỏ qua · 152 Chưa học → "19% · 37/195 · 4 bỏ qua"', () => {
    const dem = { done: 0, learning: 0, skip: 0, chua: 0 }
    for (const muc of cay.mucHoc) dem[trangThaiCua(muc) ?? 'chua']++
    expect(dem).toEqual({ done: 37, learning: 6, skip: 4, chua: 152 })
    expect(kq.tomTat?.trangThai).toEqual({ done: 37, learning: 6, skip: 4 })
    const mau = cay.soMucHoc - dem.skip
    expect(`${dinhDangPhanTram(dem.done, mau)} · ${dem.done}/${mau} · ${dem.skip} bỏ qua`).toBe(
      '19% · 37/195 · 4 bỏ qua',
    )
  })

  it('đúng các mục: Đang học, Bỏ qua kèm lý do "Không dùng trong công việc"', () => {
    const dangHoc = cay.mucHoc.filter((m) => trangThaiCua(m) === 'learning').map((m) => m.label)
    expect(dangHoc.sort()).toEqual(
      [
        'Risk Register',
        'Scope Creep',
        'Power/Interest Grid',
        'Jira',
        'Qualitative Risk Assessment',
        'Schedule creation (milestones, phases, critical path)',
      ].sort(),
    )
    const boQua = cay.mucHoc.filter((m) => trangThaiCua(m) === 'skip')
    expect(boQua.map((m) => m.label).sort()).toEqual(
      ['Use Case Points', 'Function Point Analysis', 'Mural', 'Primavera P6 Oracle'].sort(),
    )
    for (const m of boQua) expect(anhChup.trangThai[m.id].lyDoBoQua).toBe(LY_DO_BO_QUA)
  })

  it('theo phần: PM 28/142 (2 bỏ qua) · BA 3/17 · TA 5/16 · Tools 1/10 (2 bỏ qua) · Certifications 0/10', () => {
    const theoPhan = cay.phan.map((p) => {
      const ds = cay.mucHoc.filter((m) => m.phan.id === p.id)
      const xong = ds.filter((m) => trangThaiCua(m) === 'done').length
      const boQua = ds.filter((m) => trangThaiCua(m) === 'skip').length
      return `${p.label} ${xong}/${ds.length - boQua} (${boQua})`
    })
    expect(theoPhan).toEqual([
      'Project Management 28/142 (2)',
      'Business Acumen 3/17 (0)',
      'Technical Acumen 5/16 (0)',
      'Tools 1/10 (2)',
      'Certifications 0/10 (0)',
    ])
  })

  it('theo lĩnh vực: 12/22 · 6/18 · 5/16 · 2/8 · 3/14 (2 bỏ qua) · 6 lĩnh vực còn lại 0', () => {
    const linhVuc = [...cay.nutTheoId.values()].filter((n) => n.kind === 'area')
    const theoLinhVuc = linhVuc.map((lv) => {
      const ds = cay.mucHoc.filter((m) => m.linhVuc?.id === lv.id)
      const xong = ds.filter((m) => trangThaiCua(m) === 'done').length
      const boQua = ds.filter((m) => trangThaiCua(m) === 'skip').length
      return `${xong}/${ds.length - boQua}${boQua ? ` (${boQua})` : ''}`
    })
    expect(theoLinhVuc).toEqual([
      '12/22',
      '6/18',
      '5/16',
      '2/8',
      '3/14 (2)',
      '0/10',
      '0/10',
      '0/10',
      '0/14',
      '0/9',
      '0/11',
    ])
  })

  it('cài đặt: ngày bắt đầu 17/09/2026, mục tiêu 6 giờ/tuần', () => {
    const rw = new Database(kq.tepDb, { readonly: true })
    try {
      expect(docSetting(rw, 'ngay_bat_dau')).toBe(NGAY_BAT_DAU)
      expect(docSetting(rw, 'muc_tieu_gio_tuan')).toBe('6')
    } finally {
      rw.close()
    }
  })
})

describe.skipIf(!laGioMau)('lịch sử trạng thái (status_events) cho burnup', () => {
  it('phát lại mọi sự kiện ra đúng trạng thái hiện tại; mỗi sự kiện nối tiếp sự kiện trước của mục', () => {
    const cuoi = new Map<string, TrangThaiDb | null>()
    for (const sk of docSuKien(db)) {
      expect(sk.tu).toBe(cuoi.get(sk.itemId) ?? null)
      expect(sk.via).toBe('mot-muc')
      cuoi.set(sk.itemId, sk.den)
    }
    for (const muc of cay.mucHoc) expect(cuoi.get(muc.id) ?? undefined).toBe(trangThaiCua(muc))
    expect(docSuKien(db)).toHaveLength(37 * 2 + 6 + 4)
  })

  it('sự kiện theo thứ tự thời gian, `on` = ngày giờ Việt Nam của `at`, không trước ngày bắt đầu', () => {
    const ds = docSuKien(db)
    for (let i = 1; i < ds.length; i++) expect(ds[i].at >= ds[i - 1].at).toBe(true)
    for (const sk of ds) {
      expect(sk.on).toBe(ngayCua(Date.parse(sk.at)))
      expect(sk.on >= NGAY_BAT_DAU).toBe(true)
      expect(sk.at < new Date(luc('2026-10-22 21:42')).toISOString()).toBe(true)
    }
  })

  it('burnup cộng dồn tuần 38–43 = 6 · 12 · 19 · 27 · 33 · 37; phạm vi 199 → 195 ở tuần 40', () => {
    const tuan = ['2026-W38', '2026-W39', '2026-W40', '2026-W41', '2026-W42', '2026-W43']
    const suKien = docSuKien(db)
    const xong: number[] = []
    const phamVi: number[] = []
    for (const t of tuan) {
      const trangThai = new Map<string, TrangThaiDb | null>()
      for (const sk of suKien) if (tuanIso(sk.on) <= t) trangThai.set(sk.itemId, sk.den)
      const gt = [...trangThai.values()]
      xong.push(gt.filter((x) => x === 'done').length)
      phamVi.push(cay.soMucHoc - gt.filter((x) => x === 'skip').length)
    }
    expect(xong).toEqual([6, 12, 19, 27, 33, 37])
    expect(phamVi).toEqual([199, 199, 195, 195, 195, 195])
  })

  it('số liệu nguồn nhất quán: bắt đầu trước khi xong, mỗi mục chỉ một lịch', () => {
    for (const x of DA_XONG) expect(luc(x.batDau) < luc(x.xong), x.slug).toBe(true)
    const slugs = [...DA_XONG, ...DANG_HOC, ...BO_QUA].map((x) => x.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(lichDoiTrangThai()).toHaveLength(37 * 2 + 6 + 4)
  })
})

describe.skipIf(!laGioMau)('lượt mở → Học tiếp và sidebar "Đang học" (F03, F11, C34)', () => {
  it('Học tiếp = Risk Register; sidebar 3 mục Risk Register, Scope Creep, Power/Interest Grid + "Xem tất cả (6)"', () => {
    expect(hocTiep(cay, anhChup)?.slug).toBe('risk-register')
    const ds = danhSachDangHoc(cay, anhChup)
    expect(ds.cacMuc.map((m) => m.label)).toEqual([
      'Risk Register',
      'Scope Creep',
      'Power/Interest Grid',
    ])
    expect(ds.tong).toBe(6)
    expect(danhSachDangHoc(cay, anhChup, 6).cacMuc.map((m) => m.slug)).toEqual(
      DANG_HOC.map((x) => x.slug),
    )
  })

  it('lượt mở Risk Register trước GIO_MAU 24 phút 40 giây (trước lúc bấm đồng hồ)', () => {
    expect(anhChup.luotMo[mucSlug('risk-register').id]).toBe('2026-10-22T14:17:20.000Z')
    expect(Object.keys(anhChup.luotMo)).toHaveLength(37 + 6)
  })
})

describe.skipIf(!laGioMau)('bản chụp duyệt (content_approvals)', () => {
  it('41 bản chụp hiện hành; hash = sha256 toàn file, body = toàn văn file, ngày = ngay_duyet', () => {
    const banChup = docCacBanChupHienHanh(db)
    expect(banChup.size).toBe(41)
    for (const x of DA_DUYET) {
      const muc = mucSlug(x.slug)
      const tep = path.join(kq.noiDungDir, muc.duongDanTuongDoi)
      const goc = fs.readFileSync(tep)
      const chup = docBanChupHienHanh(db, muc.id)
      expect(chup?.hash, x.slug).toBe(bamFile(goc))
      expect(chup?.noiDung).toBe(goc.toString('utf8'))
      expect(chup?.ngayDuyet).toBe(ngayCuaMoc(x.duyetLuc))
      expect(docFrontmatter(goc.toString('utf8')).frontmatter?.ngayDuyet).toBe(chup?.ngayDuyet)
    }
    expect(docBanChupHienHanh(db, mucSlug('scope-creep').id)?.ngayDuyet).toBe('2026-10-18')
  })

  it('bản nháp và mục chưa có nội dung không có bản chụp', () => {
    const banChup = docCacBanChupHienHanh(db)
    for (const slug of ['risk-register', 'earned-value-management', 'salience-model', 'jira']) {
      expect(banChup.has(mucSlug(slug).id), slug).toBe(false)
    }
  })
})

describe.skipIf(!laGioMau)('API thật trên DB mẫu', () => {
  it('GET /api/state trả 47 mục khác Chưa học và 43 lượt mở', async () => {
    const rw = new Database(kq.tepDb)
    try {
      const cauHinh = docCauHinh({ DATA_DIR: kq.dataDir, NOI_DUNG_DIR: kq.noiDungDir })
      const app = taoApp({ cauHinh, db: rw, soMucHoc: cay.soMucHoc })
      const res = await request(app).get('/api/state').set('Host', '127.0.0.1:5321')
      expect(res.status).toBe(200)
      expect(Object.keys(res.body.trangThai)).toHaveLength(47)
      expect(Object.keys(res.body.luotMo)).toHaveLength(43)
      expect(hocTiep(cay, res.body as AnhChupHoc)?.slug).toBe('risk-register')
    } finally {
      rw.close()
    }
  })
})
