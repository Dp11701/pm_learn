// Bài mẫu fixtures/mau/noi-dung (đề xuất mục 7, §7 "Nội dung", §13 quy tắc 6): đúng 50 file ở đường dẫn chuẩn,
// đọc được không cảnh báo, thân bài toàn câu giữ chỗ, khớp các frame F11 / F15 / F17 / F21b, khớp bộ dựng.
import { describe, expect, it } from 'vitest'
import {
  MUC_CON_GOC_DEV_LEAD,
  MUC_CON_THUC_HANH,
  cacTen,
  docFrontmatter,
  giaiLienQuan,
  khoiTrongFile,
  phanTichBai,
  type KetQuaBai,
} from '../../shared/noi-dung/index.ts'
import { BAN_NHAP, DA_DUYET, KHONG_CO_NOI_DUNG, ngayCuaMoc } from '../../fixtures/mau/so-lieu.ts'
import {
  DOAN_BAN_SUA,
  cacBaiMau,
  taoBai,
  taoBanSuaScopeCreep,
  taoChangeLogHong,
} from '../../fixtures/mau/noi-dung-mau.ts'
import { THU_MUC_NOI_DUNG_MAU, dsFileMd, soVoiBoDung } from '../../fixtures/mau/tao-noi-dung.ts'
import { cay, docBaiTheoCay, mucSlug } from './ho-tro.ts'

const baiTrenDia = docBaiTheoCay(THU_MUC_NOI_DUNG_MAU)
const theoSlug = new Map(baiTrenDia.map((b) => [b.muc.slug, b]))
const bai = (slug: string) => {
  const b = theoSlug.get(slug)
  if (!b) throw new Error(`không có bài ${slug}`)
  return b
}
const hienCua = (kq: KetQuaBai) =>
  Object.fromEntries(kq.boCuc.map((o) => [o.mau?.id ?? o.khoi[0].tieuDe, o.hien]))

describe('fixtures/mau/noi-dung — tập file', () => {
  it('khớp bộ dựng (chạy npx tsx fixtures/mau/tao-noi-dung.ts nếu lệch)', () => {
    expect(soVoiBoDung()).toEqual({ thieu: [], thua: [], khac: [] })
  })

  it('đúng 50 file .md, mỗi file ở đường dẫn chuẩn của một mục học khác nhau', () => {
    const ds = dsFileMd(THU_MUC_NOI_DUNG_MAU)
    expect(ds).toHaveLength(50)
    expect(baiTrenDia).toHaveLength(50)
    expect(new Set(baiTrenDia.map((b) => b.muc.duongDanTuongDoi))).toEqual(new Set(ds))
  })

  it('41 Đã duyệt + 9 Bản nháp + 149 Chưa có = 199 (§7)', () => {
    const daDuyet = baiTrenDia.filter((b) => b.kq.frontmatter?.trangThaiNoiDung === 'da-duyet')
    const banNhap = baiTrenDia.filter((b) => b.kq.frontmatter?.trangThaiNoiDung === 'ban-nhap')
    expect(daDuyet).toHaveLength(41)
    expect(banNhap).toHaveLength(9)
    expect(cay.soMucHoc - baiTrenDia.length).toBe(149)
    expect(cay.soMucHoc).toBe(199)
    expect(new Set(daDuyet.map((b) => b.muc.slug))).toEqual(new Set(DA_DUYET.map((x) => x.slug)))
    expect(banNhap.map((b) => b.muc.slug).sort()).toEqual(BAN_NHAP.map((x) => x.slug).sort())
  })

  it('Đã duyệt theo phần: Project Management 30 · Business Acumen 3 · Technical Acumen 5 · Tools 3', () => {
    const dem: Record<string, number> = {}
    for (const b of baiTrenDia) {
      if (b.kq.frontmatter?.trangThaiNoiDung !== 'da-duyet') continue
      dem[b.muc.phan.label] = (dem[b.muc.phan.label] ?? 0) + 1
    }
    expect(dem).toEqual({
      'Project Management': 30,
      'Business Acumen': 3,
      'Technical Acumen': 5,
      Tools: 3,
    })
  })

  it('mọi file đọc được: không lỗi, không cảnh báo, id và loai đúng mục, liên quan tra được', () => {
    for (const { muc, kq } of baiTrenDia) {
      expect(kq.loi, muc.slug).toBeNull()
      expect(kq.canhBao, muc.slug).toEqual([])
      expect(kq.frontmatter?.id).toBe(muc.id)
      expect(kq.frontmatter?.loai).toBe(muc.mau)
      const lq = giaiLienQuan(cay, kq.frontmatter?.lienQuan ?? [], { boId: muc.id })
      expect(lq.khongThay, muc.slug).toEqual([])
      expect(lq.muc.length, muc.slug).toBeGreaterThanOrEqual(2)
      for (const k of kq.khoi) {
        if (k.cauTruc) expect(k.cauTruc.hopLe, `${muc.slug} · ${k.tieuDe}`).toBe(true)
      }
    }
  })

  it('bài Đã duyệt đủ khối ★ và ngày duyệt đúng số liệu; bản nháp có "Đủ khối" như F21b', () => {
    for (const x of DA_DUYET) {
      const { kq } = bai(x.slug)
      expect(kq.duKhoi.co, x.slug).toBe(kq.duKhoi.tong)
      expect(kq.frontmatter?.ngayDuyet).toBe(ngayCuaMoc(x.duyetLuc))
      expect(kq.frontmatter?.nguon).toBe(x.nguon)
    }
    for (const x of BAN_NHAP) {
      const { kq } = bai(x.slug)
      expect(`${kq.duKhoi.co}/${kq.duKhoi.tong}`, x.slug).toBe(x.duKhoi)
      expect(kq.frontmatter?.nguon).toBe(x.nguon)
      expect(kq.frontmatter?.ngayDuyet).toBeUndefined()
      for (const ten of x.thieuKhoi) {
        const o = kq.boCuc.find((b) => b.mau?.tieuDe === ten)
        expect(o?.hien, `${x.slug} · ${ten}`).toBe('chua-co')
      }
    }
  })

  it('bản nháp Tự viết: Project Charter, Change log; còn lại AI', () => {
    const tuViet = BAN_NHAP.filter((x) => bai(x.slug).kq.frontmatter?.nguon === 'tu-viet')
    expect(tuViet.map((x) => x.slug).sort()).toEqual(['change-log', 'project-charter'])
  })
})

/** Tách thân bài thành từng "đơn vị chữ": đoạn, mục danh sách, câu hỏi / đáp án, ô bảng. */
function donViChu(than: string): { tieuDe: string[]; donVi: string[] } {
  const tieuDe: string[] = []
  const donVi: string[] = []
  for (const dong of than.split('\n')) {
    const d = dong.trim()
    if (d === '') continue
    if (/^#{2,3} /.test(d)) {
      tieuDe.push(d)
      continue
    }
    if (/^\|(\s*-{3,}\s*\|)+$/.test(d)) continue
    if (d.startsWith('|')) {
      donVi.push(
        ...d
          .split('|')
          .map((o) => o.trim())
          .filter(Boolean),
      )
      continue
    }
    let chu = d.replace(/^(?:[-*+]|\d+\.)\s+/, '').replace(/^\[[ xX]\]\s+/, '')
    chu = chu.replace(/^\*\*(.+?)\*\*/, '$1')
    const hoiDap = /^H:\s*(.+?)\s+\|\s+Đ:\s*(.+)$/.exec(chu)
    if (hoiDap) donVi.push(hoiDap[1], hoiDap[2])
    else donVi.push(chu)
  }
  return { tieuDe, donVi }
}

const NHAN_GIU_CHO =
  /^\[(?:Nội dung mẫu — [^\]]+|(?:Khái niệm|Bước|Phần|Tiêu chí|Cột|Ô|Trường|Domain) mẫu [\d.]+)\]/
const THAM_KHAO_MAU = /^Nguồn mẫu \d+ — chưa điền$/

describe('thân bài chỉ có câu giữ chỗ (§13 quy tắc 6)', () => {
  it('mọi đoạn, mục, câu hỏi, đáp án, ô bảng mở đầu bằng nhãn "[… mẫu …]" (Tham khảo: "Nguồn mẫu n — chưa điền")', () => {
    for (const { muc, text } of baiTrenDia) {
      const than = docFrontmatter(text).dongThan.join('\n')
      const { donVi } = donViChu(than)
      expect(donVi.length).toBeGreaterThan(5)
      for (const x of donVi) {
        expect(NHAN_GIU_CHO.test(x) || THAM_KHAO_MAU.test(x), `${muc.slug}: ${x}`).toBe(true)
      }
    }
  })

  it('không có link, URL, ảnh, HTML trong bài mẫu', () => {
    for (const { muc, text } of baiTrenDia) {
      expect(text, muc.slug).not.toMatch(/https?:|www\.|\]\(|<[a-z!/]|@/i)
    }
  })

  it('tiêu đề ## / ### chỉ là tên khối và tiểu mục của mẫu bài', () => {
    for (const { muc, text } of baiTrenDia) {
      const tenKhoi = new Set(khoiTrongFile(muc.mau).flatMap(cacTen))
      const tenMucCon = new Set<string>([...MUC_CON_GOC_DEV_LEAD, ...MUC_CON_THUC_HANH])
      for (const t of donViChu(docFrontmatter(text).dongThan.join('\n')).tieuDe) {
        const ten = t.replace(/^#+ /, '')
        if (t.startsWith('## ')) expect(tenKhoi.has(ten), `${muc.slug}: ${t}`).toBe(true)
        else expect(tenMucCon.has(ten), `${muc.slug}: ${t}`).toBe(true)
      }
    }
  })

  it('đoạn văn dài như bài thật: đoạn mở đầu của khối văn bản ≥ 90 ký tự', () => {
    for (const { muc, kq } of baiTrenDia) {
      for (const k of kq.khoi) {
        if (k.mau?.kieu !== 'van-ban') continue
        const dau = k.noiDung.split('\n\n')[0]
        expect(dau.length, `${muc.slug} · ${k.tieuDe}`).toBeGreaterThanOrEqual(90)
      }
    }
  })
})

describe('bài theo frame', () => {
  it('F11 Scope Creep: Đã duyệt 18/10/2026, giải nghĩa, đủ khối, 3 khái niệm, 1 câu hỏi, liên quan như §8.5', () => {
    const { muc, kq } = bai('scope-creep')
    expect(kq.frontmatter).toMatchObject({
      trangThaiNoiDung: 'da-duyet',
      ngayDuyet: '2026-10-18',
      giaiNghia: 'phình phạm vi',
      lienQuan: ['change-request-cr', 'change-control-board-ccb', 'scope-baseline'],
    })
    expect(
      giaiLienQuan(cay, kq.frontmatter!.lienQuan, { boId: muc.id }).muc.map((m) => m.label),
    ).toEqual(['Change Request (CR)', 'Change Control Board (CCB)', 'Scope Baseline'])
    expect(kq.duKhoi).toEqual({ co: 9, tong: 9 })
    expect(hienCua(kq)).toEqual({
      'tom-tat': 'noi-dung',
      'vi-sao-pm-can-biet': 'noi-dung',
      'khai-niem-cot-loi': 'noi-dung',
      'vi-du-thuc-te': 'noi-dung',
      'cach-ap-dung': 'noi-dung',
      'goc-dev-lead-pm': 'noi-dung',
      'noi-lai-bang-loi-cua-ban': 'app',
      'so-sanh': 'an',
      'thuc-hanh-tren-du-an-that': 'noi-dung',
      'tu-kiem-tra': 'noi-dung',
      'muc-lien-quan': 'app',
      'tham-khao': 'noi-dung',
    })
    const cauTruc = (id: string) => kq.khoi.find((k) => k.mau?.id === id)?.cauTruc
    const khaiNiem = cauTruc('khai-niem-cot-loi')
    expect(khaiNiem?.kieu === 'dinh-nghia' && khaiNiem.dinhNghia.map((x) => x.thuatNgu)).toEqual([
      '[Khái niệm mẫu 1]',
      '[Khái niệm mẫu 2]',
      '[Khái niệm mẫu 3]',
    ])
    // F11: một đoạn mở rồi danh sách; khối vẫn theo quy ước (hiện danh sách định nghĩa, không phải Markdown thường)
    expect(khaiNiem?.hopLe).toBe(true)
    expect(khaiNiem?.kieu === 'dinh-nghia' && khaiNiem.truoc?.noiDung).toMatch(
      /^\[Nội dung mẫu — Khái niệm cốt lõi\] Khối này liệt kê 3–5 khái niệm chính/,
    )
    expect(khaiNiem?.kieu === 'dinh-nghia' && khaiNiem.sau).toBeNull()
    const tuKiemTra = cauTruc('tu-kiem-tra')
    expect(tuKiemTra?.kieu === 'tu-kiem-tra' && tuKiemTra.cauHoi).toHaveLength(1)
    const gocDev = cauTruc('goc-dev-lead-pm')
    expect(gocDev?.kieu === 'goc-dev-lead' && gocDev.mucCon.map((m) => m.mauTen)).toEqual([
      'Bạn đã quen',
      'Điều cần đổi',
    ])
    const thucHanh = cauTruc('thuc-hanh-tren-du-an-that')
    expect(thucHanh?.kieu === 'thuc-hanh' && thucHanh.tieuChi).toHaveLength(3)
    expect(thucHanh?.kieu === 'thuc-hanh' && thucHanh.mucCon.map((m) => m.mauTen)).toEqual([
      'Đề bài',
      'Đầu ra',
      'Tiêu chí tự kiểm',
    ])
  })

  it('F15 Risk Register: Tài liệu · Bản nháp · AI, process group, liên quan, bảng 8 cột × 3 hàng, Lỗi thường gặp', () => {
    const { muc, kq } = bai('risk-register')
    expect(muc.mau).toBe('tai-lieu')
    expect(kq.frontmatter).toMatchObject({
      trangThaiNoiDung: 'ban-nhap',
      nguon: 'ai',
      processGroup: ['planning', 'monitoring-and-control'],
      lienQuan: [
        'qualitative-risk-assessment',
        'risk-identification-process',
        'risk-and-opportunity-response-strategies',
      ],
    })
    expect(kq.duKhoi).toEqual({ co: 8, tong: 8 })
    const bang = kq.khoi.find((k) => k.mau?.id === 'mau-dien-san')?.cauTruc
    expect(bang?.kieu === 'mau-dien-san' && bang.bang?.cot).toHaveLength(8)
    expect(bang?.kieu === 'mau-dien-san' && bang.bang?.hang).toHaveLength(3)
    const checklist = kq.khoi.find((k) => k.mau?.id === 'checklist-chat-luong')?.cauTruc
    expect(checklist?.kieu === 'checklist' && checklist.dongTick).toHaveLength(3)
    expect(hienCua(kq)['loi-thuong-gap']).toBe('noi-dung')
    expect(hienCua(kq)['ban-cua-toi']).toBe('app')
  })

  it('F14 Earned Value Management: bản nháp AI, 10 khối có nội dung (9 bắt buộc + So sánh)', () => {
    const { kq } = bai('earned-value-management')
    expect(kq.frontmatter?.trangThaiNoiDung).toBe('ban-nhap')
    expect(kq.boCuc.filter((o) => o.hien === 'noi-dung')).toHaveLength(10)
    expect(kq.khoi.find((k) => k.mau?.id === 'so-sanh')?.tieuDe).toBe('So sánh')
  })

  it('F17 / F18 Salience Model và Jira chưa có nội dung', () => {
    for (const slug of KHONG_CO_NOI_DUNG) expect(theoSlug.has(slug), slug).toBe(false)
  })

  it('D13: khối 7 dùng đủ ba tên So sánh / Thuật ngữ / Thực hành công cụ', () => {
    const ten = new Set(
      baiTrenDia.flatMap((b) =>
        b.kq.khoi.filter((k) => k.mau?.id === 'so-sanh').map((k) => k.tieuDe),
      ),
    )
    expect(ten).toEqual(new Set(['So sánh', 'Thuật ngữ', 'Thực hành công cụ']))
  })
})

describe('file của kịch bản', () => {
  it('f12: scope-creep.ban-sua.md là Bản nháp, bỏ ## Tự kiểm tra, thêm một đoạn ở Ví dụ thực tế', () => {
    const { duongDan, text } = taoBanSuaScopeCreep(cay)
    const muc = mucSlug('scope-creep')
    expect(duongDan).toBe(muc.duongDanTuongDoi.replace(/\.md$/, '.ban-sua.md'))
    const kq = phanTichBai(text, muc)
    expect(kq.loi).toBeNull()
    expect(kq.canhBao).toEqual([])
    expect(kq.frontmatter).toMatchObject({ id: muc.id, trangThaiNoiDung: 'ban-nhap' })
    expect(kq.duKhoi).toEqual({ co: 8, tong: 9 })
    expect(hienCua(kq)['tu-kiem-tra']).toBe('chua-co')
    expect(text).not.toContain('## Tự kiểm tra')
    expect(kq.khoi.find((k) => k.mau?.id === 'vi-du-thuc-te')?.noiDung).toContain(DOAN_BAN_SUA)
    // khối khác giữ nguyên bản đã duyệt
    const goc = bai('scope-creep').kq
    for (const k of goc.khoi) {
      if (k.mau?.id === 'tu-kiem-tra' || k.mau?.id === 'vi-du-thuc-te') continue
      expect(kq.khoi.find((x) => x.mau?.id === k.mau?.id)?.noiDung).toBe(k.noiDung)
    }
  })

  it('loi-file: change-log.md lỗi frontmatter ở dòng 3 (F26 "lỗi frontmatter dòng 3")', () => {
    const { duongDan, text } = taoChangeLogHong(cay)
    const muc = mucSlug('change-log')
    expect(duongDan).toBe(muc.duongDanTuongDoi)
    const kq = phanTichBai(text, muc)
    expect(kq.frontmatter).toBeNull()
    expect(kq.loi?.dong).toBe(3)
    // chỉ khác bản nháp ở đúng dòng 3
    const dongGoc = bai('change-log').text.split('\n')
    const dongHong = text.split('\n')
    expect(dongHong.filter((d, i) => d !== dongGoc[i]).length).toBe(1)
    expect(dongHong[2]).not.toBe(dongGoc[2])
  })
})

describe('bộ dựng dùng được cho cả 3 mẫu bài', () => {
  it('mẫu Chứng chỉ (bộ §7 không có bài nào): đọc không cảnh báo, đủ 7/7 khối', () => {
    const muc = cay.mucHoc.find((m) => m.mau === 'chung-chi')!
    const kq = phanTichBai(taoBai(cay, muc, { trangThai: 'ban-nhap', nguon: 'ai' }), muc)
    expect(kq.loi).toBeNull()
    expect(kq.canhBao).toEqual([])
    expect(kq.duKhoi).toEqual({ co: 7, tong: 7 })
    for (const k of kq.khoi) if (k.cauTruc) expect(k.cauTruc.hopLe, k.tieuDe).toBe(true)
  })

  it('mỗi mục học đều dựng được bài đọc không lỗi; thiếu khối không phải ★ trong file thì báo lỗi', () => {
    for (const muc of cay.mucHoc) {
      const kq = phanTichBai(taoBai(cay, muc, { trangThai: 'ban-nhap', nguon: 'ai' }), muc)
      expect(kq.loi, muc.slug).toBeNull()
      expect(kq.duKhoi.co, muc.slug).toBe(kq.duKhoi.tong)
    }
    expect(() =>
      taoBai(cay, mucSlug('scope-creep'), {
        trangThai: 'ban-nhap',
        nguon: 'ai',
        thieuKhoi: ['Nói lại bằng lời của bạn'],
      }),
    ).toThrow()
    expect(() =>
      taoBai(cay, mucSlug('scope-creep'), { trangThai: 'da-duyet', nguon: 'ai' }),
    ).toThrow()
  })

  it('ổn định: dựng hai lần ra cùng nội dung', () => {
    expect([...cacBaiMau(cay)]).toEqual([...cacBaiMau(cay)])
  })
})
