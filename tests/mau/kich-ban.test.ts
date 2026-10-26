// Kịch bản dev:mau (đề xuất mục 7): dựng / dọn thư mục mẫu, f12, loi-file, trong; không bao giờ chạm data/ và
// noi-dung/ thật (kể cả qua symlink); tham số và môi trường của scripts/dev-mau.ts.
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { phanTichBai } from '../../shared/noi-dung/index.ts'
import { GOC_DU_AN, docCauHinh } from '../../server/cau-hinh.ts'
import { layPhienBan } from '../../server/db/index.ts'
import { dsMigration } from '../../server/db/migrations.ts'
import {
  CAC_KICH_BAN,
  TEP_DANH_DAU,
  chuanBiKichBan,
  duongDanThat,
  kiemAnToan,
  thuMucCanBaoVe,
  thuMucMau,
  xoaThuMucMau,
} from '../../fixtures/mau/kich-ban.ts'
import { GIO_MAU } from '../../fixtures/mau/so-lieu.ts'
import { THU_MUC_NOI_DUNG_MAU, dsFileMd, soVoiBoDung } from '../../fixtures/mau/tao-noi-dung.ts'
import { CONG_API_MAU, CONG_WEB_MAU, docThamSo, moiTruongCon } from '../../scripts/dev-mau.ts'
import { cay, dungKichBan, laGioMau, mucSlug, thuMucTam } from './ho-tro.ts'

let tam: ReturnType<typeof thuMucTam>

beforeEach(() => {
  tam = thuMucTam()
})

afterEach(() => {
  tam.xoa()
})

function demDong(tepDb: string, bang: string): number {
  const db = new Database(tepDb, { readonly: true })
  try {
    return (db.prepare(`SELECT count(*) AS n FROM ${bang}`).get() as { n: number }).n
  } finally {
    db.close()
  }
}

describe.skipIf(!laGioMau)('dựng kịch bản có seed (giờ Việt Nam)', () => {
  it('mac-dinh: chép đúng 50 bài mẫu, DB đủ migration và đã seed', async () => {
    const kq = await dungKichBan('mac-dinh', tam.goc)
    expect(kq.soFile).toBe(50)
    expect(dsFileMd(kq.noiDungDir)).toEqual(dsFileMd(THU_MUC_NOI_DUNG_MAU))
    for (const tep of dsFileMd(kq.noiDungDir)) {
      expect(fs.readFileSync(path.join(kq.noiDungDir, tep), 'utf8')).toBe(
        fs.readFileSync(path.join(THU_MUC_NOI_DUNG_MAU, tep), 'utf8'),
      )
    }
    const db = new Database(kq.tepDb, { readonly: true })
    try {
      expect(layPhienBan(db)).toBe(dsMigration.length)
    } finally {
      db.close()
    }
    expect(demDong(kq.tepDb, 'item_status')).toBe(47)
    expect(demDong(kq.tepDb, 'content_approvals')).toBe(41)
  })

  it('f12: thêm scope-creep.ban-sua.md, bài đã duyệt giữ nguyên và vẫn khớp bản chụp', async () => {
    const kq = await dungKichBan('f12', tam.goc)
    const muc = mucSlug('scope-creep')
    const banSua = path.join(kq.noiDungDir, muc.duongDanTuongDoi.replace(/\.md$/, '.ban-sua.md'))
    expect(kq.soFile).toBe(51)
    expect(fs.readFileSync(banSua, 'utf8')).not.toContain('## Tự kiểm tra')
    expect(fs.readFileSync(path.join(kq.noiDungDir, muc.duongDanTuongDoi), 'utf8')).toBe(
      fs.readFileSync(path.join(THU_MUC_NOI_DUNG_MAU, muc.duongDanTuongDoi), 'utf8'),
    )
    expect(kq.tomTat?.banChup).toBe(41)
    // sổ nội dung (2b): bản sửa là file đã nhận → chip "Đã duyệt · có bản sửa chưa duyệt" (F12)
    expect(demDong(kq.tepDb, 'content_files')).toBe(51)
    const db = new Database(kq.tepDb, { readonly: true })
    try {
      expect(
        db
          .prepare("SELECT path FROM content_files WHERE item_id = ? AND role = 'ban-sua'")
          .get(muc.id),
      ).toEqual({ path: muc.duongDanTuongDoi.replace(/\.md$/, '.ban-sua.md') })
    } finally {
      db.close()
    }
  })

  it('loi-file: change-log.md lỗi dòng 3, mọi file khác đọc được; fixtures nguồn không bị đổi', async () => {
    const kq = await dungKichBan('loi-file', tam.goc)
    for (const tep of dsFileMd(kq.noiDungDir)) {
      const muc = cay.mucHoc.find((m) => m.duongDanTuongDoi === tep)!
      const ket = phanTichBai(fs.readFileSync(path.join(kq.noiDungDir, tep), 'utf8'), muc)
      if (muc.slug === 'change-log') expect(ket.loi?.dong).toBe(3)
      else expect(ket.loi, tep).toBeNull()
    }
    // file hỏng vẫn là file đã nhận (banner F26 trên bài)
    expect(demDong(kq.tepDb, 'content_files')).toBe(50)
    expect(soVoiBoDung()).toEqual({ thieu: [], thua: [], khac: [] })
  })

  it('chạy lại là dựng lại từ đầu: bỏ file của kịch bản trước, DB không cộng dồn', async () => {
    const f12 = await dungKichBan('f12', tam.goc)
    fs.writeFileSync(path.join(f12.noiDungDir, 'rac.md'), 'x')
    const kq = await dungKichBan('mac-dinh', tam.goc)
    expect(kq.soFile).toBe(50)
    expect(fs.existsSync(path.join(kq.noiDungDir, 'rac.md'))).toBe(false)
    expect(demDong(kq.tepDb, 'item_status')).toBe(47)
    expect(demDong(kq.tepDb, 'status_events')).toBe(84)
    expect(fs.existsSync(path.join(kq.gocMau, TEP_DANH_DAU))).toBe(true)
  })

  it('xoaThuMucMau dọn sạch dữ liệu và nội dung mẫu', async () => {
    const kq = await dungKichBan('mac-dinh', tam.goc)
    xoaThuMucMau(kq, thuMucCanBaoVe(path.join(tam.goc, 'du-an')), path.join(tam.goc, 'du-an'))
    expect(fs.existsSync(kq.dataDir)).toBe(false)
    expect(fs.existsSync(kq.noiDungDir)).toBe(false)
  })
})

describe('dựng kịch bản không seed (mọi múi giờ)', () => {
  it('trong: thư mục nội dung trống, DB có schema nhưng không có dữ liệu (F05)', async () => {
    const kq = await dungKichBan('trong', tam.goc)
    expect(kq.soFile).toBe(0)
    expect(fs.readdirSync(kq.noiDungDir)).toEqual([])
    expect(kq.tomTat).toBeNull()
    for (const bang of [
      'item_status',
      'status_events',
      'item_visits',
      'content_approvals',
      'content_files',
      'file_ops',
      'settings',
    ]) {
      expect(demDong(kq.tepDb, bang), bang).toBe(0)
    }
  })

  it('mọi kịch bản đều có tên trong danh sách', () => {
    expect(CAC_KICH_BAN).toEqual(['mac-dinh', 'f12', 'loi-file', 'trong'])
  })
})

describe('không bao giờ chạm data/ và noi-dung/ thật', () => {
  it('thư mục mặc định nằm trong <dự án>/.mau, không trùng / không chứa data/ hay noi-dung/', () => {
    const mau = thuMucMau()
    expect(mau.gocMau).toBe(path.join(GOC_DU_AN, '.mau'))
    expect(mau.dataDir).toBe(path.join(GOC_DU_AN, '.mau', 'data'))
    expect(mau.noiDungDir).toBe(path.join(GOC_DU_AN, '.mau', 'noi-dung'))
    expect(() => kiemAnToan(mau, thuMucCanBaoVe())).not.toThrow()
    for (const that of thuMucCanBaoVe()) {
      for (const dich of [mau.dataDir, mau.noiDungDir]) {
        expect(path.relative(that, dich).startsWith('..')).toBe(true)
        expect(path.relative(dich, that).startsWith('..')).toBe(true)
      }
    }
  })

  it('môi trường của server mẫu luôn trỏ vào .mau, kể cả khi DATA_DIR / NOI_DUNG_DIR đang đặt', () => {
    const env = moiTruongCon(thuMucMau(), {
      DATA_DIR: 'data',
      NOI_DUNG_DIR: 'noi-dung',
      CONG_WEB: '5320',
      CONG_API: '5321',
      PATH: '/usr/bin',
    })
    expect(env).toMatchObject({
      CONG_WEB: String(CONG_WEB_MAU),
      CONG_API: String(CONG_API_MAU),
      GIO_MAU,
      TZ: 'Asia/Ho_Chi_Minh',
    })
    expect([CONG_WEB_MAU, CONG_API_MAU]).toEqual([5322, 5323])
    const cauHinh = docCauHinh(env)
    expect(cauHinh.dataDir).toBe(path.join(GOC_DU_AN, '.mau', 'data'))
    expect(cauHinh.noiDungDir).toBe(path.join(GOC_DU_AN, '.mau', 'noi-dung'))
    expect(cauHinh.dataDir).not.toBe(path.join(GOC_DU_AN, 'data'))
    expect(cauHinh.noiDungDir).not.toBe(path.join(GOC_DU_AN, 'noi-dung'))
    expect(cauHinh.gioMau).toBe(GIO_MAU)
    expect(env.PATH?.split(path.delimiter)[0]).toBe(path.join(GOC_DU_AN, 'node_modules', '.bin'))
  })

  /** Dự án giả có data/ và noi-dung/ chứa file canh; sau mỗi lần thử, file canh phải còn. */
  function duAnGia() {
    const duAn = path.join(tam.goc, 'du-an')
    for (const ten of ['data', 'noi-dung']) {
      fs.mkdirSync(path.join(duAn, ten), { recursive: true })
      fs.writeFileSync(path.join(duAn, ten, 'canh.txt'), 'không được xoá')
    }
    const conNguyen = () =>
      ['data', 'noi-dung'].every((ten) => fs.existsSync(path.join(duAn, ten, 'canh.txt')))
    return { duAn, conNguyen }
  }

  it('từ chối gốc mẫu = gốc dự án, chứa dự án, hay nằm trong data/ — trước khi xoá gì', async () => {
    const { duAn, conNguyen } = duAnGia()
    for (const gocMau of [duAn, tam.goc, path.dirname(tam.goc), path.join(duAn, 'data', 'x')]) {
      await expect(chuanBiKichBan('mac-dinh', { gocMau, gocDuAn: duAn }), gocMau).rejects.toThrow(
        /Từ chối/,
      )
      expect(conNguyen()).toBe(true)
    }
  })

  it('từ chối khi .mau/data là symlink trỏ vào data/ thật', async () => {
    const { duAn, conNguyen } = duAnGia()
    const gocMau = path.join(duAn, '.mau')
    fs.mkdirSync(gocMau, { recursive: true })
    fs.symlinkSync(path.join(duAn, 'data'), path.join(gocMau, 'data'))
    expect(duongDanThat(path.join(gocMau, 'data', 'hoc.db'))).toBe(
      path.join(duAn, 'data', 'hoc.db'),
    )
    await expect(chuanBiKichBan('mac-dinh', { gocMau, gocDuAn: duAn })).rejects.toThrow(/Từ chối/)
    expect(conNguyen()).toBe(true)
  })

  it('từ chối thư mục DATA_DIR / NOI_DUNG_DIR mà người chạy đang đặt', async () => {
    const { duAn, conNguyen } = duAnGia()
    const gocMau = path.join(tam.goc, 'mau-rieng')
    await expect(
      chuanBiKichBan('mac-dinh', {
        gocMau,
        gocDuAn: duAn,
        env: { DATA_DIR: path.join(gocMau, 'data') },
      }),
    ).rejects.toThrow(/Từ chối/)
    expect(conNguyen()).toBe(true)
  })

  it('không xoá thư mục có dữ liệu mà bộ mẫu không tạo (thiếu file đánh dấu)', async () => {
    const { duAn } = duAnGia()
    const gocMau = path.join(tam.goc, 'la')
    fs.mkdirSync(path.join(gocMau, 'noi-dung'), { recursive: true })
    fs.writeFileSync(path.join(gocMau, 'noi-dung', 'cua-ai-do.md'), 'x')
    await expect(chuanBiKichBan('mac-dinh', { gocMau, gocDuAn: duAn })).rejects.toThrow(
      new RegExp(TEP_DANH_DAU.replace('.', '\\.')),
    )
    expect(fs.existsSync(path.join(gocMau, 'noi-dung', 'cua-ai-do.md'))).toBe(true)
  })
})

describe('tham số dev:mau', () => {
  it('mặc định mac-dinh; nhận --kich-ban=x và --kich-ban x; --chi-chuan-bi; --help', () => {
    expect(docThamSo([])).toEqual({ kichBan: 'mac-dinh', chiChuanBi: false, troGiup: false })
    expect(docThamSo(['--kich-ban=f12']).kichBan).toBe('f12')
    expect(docThamSo(['--kich-ban', 'loi-file']).kichBan).toBe('loi-file')
    expect(docThamSo(['--kich-ban=trong', '--chi-chuan-bi'])).toEqual({
      kichBan: 'trong',
      chiChuanBi: true,
      troGiup: false,
    })
    expect(docThamSo(['-h']).troGiup).toBe(true)
  })

  it('kịch bản lạ hoặc tham số lạ → lỗi kèm danh sách kịch bản', () => {
    expect(() => docThamSo(['--kich-ban=f13'])).toThrow(/mac-dinh \| f12 \| loi-file \| trong/)
    expect(() => docThamSo(['--kich-ban'])).toThrow()
    expect(() => docThamSo(['--data=data'])).toThrow(/Tham số lạ/)
  })
})
