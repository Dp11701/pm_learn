// Bảng kết quả kiểm tra (đề xuất 1.7, 3.8; F22): lô F22 → 11/2/1/1 và "Nhập 13 file"; số trên nút đổi theo
// "Gán cho mục…", "Nhập thành bản sửa", tick ◎; yêu cầu thuc-hien; cột "Khớp theo"; ⟳ của Quét lại.
import { describe, expect, it } from 'vitest'
import {
  LUA_CHON_TRONG,
  canBoVaoRac,
  chuTomTat,
  demLoai,
  demViec,
  giuLuaChon,
  idTrongFile,
  khongConFile,
  khopTheo,
  mucHieuLuc,
  nhanNutNhap,
  seGiuBanCu,
  seNhap,
  taoYeuCau,
  tenGocFile,
  xuLyTrungCua,
  type LuaChon,
} from '../../../src/components/nhap/ket-qua'
import { dong, fileMd, loF22, muc, mucNgan } from './ho-tro'

const f22 = loF22()

describe('lô F22', () => {
  it('11 hợp lệ · 2 cảnh báo · 1 trùng · 1 lỗi → "Nhập 13 file" (risk-registr.md đã gán sẵn)', () => {
    const d = demLoai(f22.ketQua)
    expect(d).toEqual({ hopLe: 11, canhBao: 2, trung: 1, loi: 1, chuaChup: 0 })
    expect(chuTomTat(d)).toBe('11 hợp lệ · 2 cảnh báo · 1 trùng · 1 lỗi')
    const viec = demViec(f22.ketQua, LUA_CHON_TRONG, 'tha')
    expect(viec).toEqual({ nhap: 13, giu: 0 })
    expect(nhanNutNhap(viec)).toBe('Nhập 13 file')
  })

  it('"Nhập thành bản sửa" cho file trùng → 14; ✕ không bao giờ nhập', () => {
    const lc: LuaChon = { ...LUA_CHON_TRONG, xuLyTrung: { 13: 'thanh-ban-sua' } }
    expect(demViec(f22.ketQua, lc, 'tha').nhap).toBe(14)
    expect(seNhap(f22.ketQua[14], lc)).toBe(false)
  })

  it('yêu cầu thuc-hien: gán cho dòng Không khớp (gán sẵn), cách xử lý mọi dòng ⟳, không gán dòng ✓', () => {
    const lc: LuaChon = { ...LUA_CHON_TRONG, xuLyTrung: { 13: 'thanh-ban-sua' } }
    expect(taoYeuCau('tok-f22', f22.ketQua, lc)).toEqual({
      token: 'tok-f22',
      gan: { 12: muc('risk-register').id },
      xuLyTrung: { 13: 'thanh-ban-sua' },
      nhanDaDuyet: [],
    })
    expect(taoYeuCau('t', f22.ketQua, LUA_CHON_TRONG).xuLyTrung).toEqual({ 13: 'giu-ban-cu' })
  })
})

describe('Không khớp mục (đề xuất 1.7 "Khớp")', () => {
  const khongGanSan = dong({
    chiSo: 0,
    ten: 'risk-assessment.md',
    loai: 'khong-khop',
    muc: null,
    ungVien: [{ ...mucNgan('quantitative-risk-assessment'), diem: 0.66 }],
  })

  it('không gán sẵn: không đếm vào nút; "Gán cho mục…" → đếm, gửi gan', () => {
    expect(mucHieuLuc(khongGanSan, LUA_CHON_TRONG)).toBeNull()
    expect(demViec([khongGanSan], LUA_CHON_TRONG, 'tha').nhap).toBe(0)
    expect(nhanNutNhap({ nhap: 0, giu: 0 })).toBe('Nhập 0 file')
    const lc: LuaChon = { ...LUA_CHON_TRONG, gan: { 0: mucNgan('risk-register') } }
    expect(seNhap(khongGanSan, lc)).toBe(true)
    expect(taoYeuCau('t', [khongGanSan], lc).gan).toEqual({ 0: muc('risk-register').id })
  })

  it('id thuộc mục khác, không gán sẵn: mục server ghi không có hiệu lực tới khi bạn gán', () => {
    const kq = dong({
      chiSo: 1,
      ten: 'x.md',
      loai: 'khong-khop',
      muc: mucNgan('pestle'),
      ganSan: false,
      ghiChu: 'id trong file thuộc mục khác',
    })
    expect(mucHieuLuc(kq, LUA_CHON_TRONG)).toBeNull()
    expect(seNhap(kq, LUA_CHON_TRONG)).toBe(false)
  })
})

describe('◎ Đã duyệt nhưng app chưa có bản chụp', () => {
  const ds = Array.from({ length: 3 }, (_, i) =>
    dong({ chiSo: i, ten: `f${i}.md`, loai: 'chua-chup', muc: mucNgan('bani') }),
  )
  it('mặc định không nhập; tick "Nhận là Đã duyệt" → đếm và gửi nhanDaDuyet', () => {
    expect(demViec(ds, LUA_CHON_TRONG, 'tha').nhap).toBe(0)
    const lc: LuaChon = { ...LUA_CHON_TRONG, nhanDaDuyet: { 0: true, 2: true } }
    expect(demViec(ds, lc, 'tha').nhap).toBe(2)
    expect(taoYeuCau('t', ds, lc).nhanDaDuyet).toEqual([0, 2])
    expect(chuTomTat(demLoai(ds))).toBe(
      '0 hợp lệ · 0 cảnh báo · 0 trùng · 0 lỗi · 3 chưa có bản chụp',
    )
  })
})

describe('⟳ của Quét lại (bản Đã duyệt bị sửa ngoài app)', () => {
  const trung = dong({
    chiSo: 0,
    ten: 'scope-creep.md',
    loai: 'trung-da-duyet',
    muc: mucNgan('scope-creep'),
  })
  const hopLe = dong({ chiSo: 1, ten: 'pestle.md', loai: 'hop-le', muc: mucNgan('pestle') })

  it('"Giữ bản cũ" (mặc định) là một việc: ghi lại bản chụp; kéo thả thì chỉ là bỏ qua', () => {
    expect(seGiuBanCu(trung, LUA_CHON_TRONG, 'quet-lai')).toBe(true)
    expect(seGiuBanCu(trung, LUA_CHON_TRONG, 'tha')).toBe(false)
    expect(demViec([trung], LUA_CHON_TRONG, 'quet-lai')).toEqual({ nhap: 0, giu: 1 })
    expect(nhanNutNhap({ nhap: 0, giu: 1 })).toBe('Giữ 1 bản cũ')
    expect(nhanNutNhap(demViec([trung, hopLe], LUA_CHON_TRONG, 'quet-lai'))).toBe(
      'Nhập 1 file · giữ 1 bản cũ',
    )
    const banSua: LuaChon = { ...LUA_CHON_TRONG, xuLyTrung: { 0: 'thanh-ban-sua' } }
    expect(demViec([trung], banSua, 'quet-lai')).toEqual({ nhap: 1, giu: 0 })
  })
})

describe('⟳ của Quét lại theo chỗ của file (khopTheo, duongDan của server)', () => {
  const sc = mucNgan('scope-creep')
  // File đã nhận <slug>.md bị sửa ngoài app: server khớp theo đường dẫn → giu-ban-cu/:id lo, không cần thuc-hien
  const daNhan = dong({
    chiSo: 0,
    ten: 'scope-creep.md',
    loai: 'trung-da-duyet',
    muc: sc,
    khopTheo: 'duong-dan',
    duongDan: 'project-management/scope/scope-creep.md',
  })
  // Bản chép Claude ghi ở chỗ khác (chưa nhận, có id) → chỉ thuc-hien bỏ được vào thùng rác
  const banChep = dong({
    chiSo: 1,
    ten: 'scope-creep.md',
    loai: 'trung-da-duyet',
    muc: sc,
    khopTheo: 'id',
    duongDan: 'scope-creep.md',
  })
  // File đã nhận không còn trên đĩa: không có duongDan
  const mat = dong({
    chiSo: 2,
    ten: 'scope-creep.md',
    loai: 'trung-da-duyet',
    muc: sc,
    khopTheo: 'duong-dan',
  })

  it('bản chép lạc chỗ cần thuc-hien (bỏ vào thùng rác); file đã nhận / không còn file thì không', () => {
    expect(canBoVaoRac(banChep, LUA_CHON_TRONG, 'quet-lai')).toBe(true)
    expect(canBoVaoRac(daNhan, LUA_CHON_TRONG, 'quet-lai')).toBe(false)
    expect(canBoVaoRac(mat, LUA_CHON_TRONG, 'quet-lai')).toBe(false)
    expect(canBoVaoRac(banChep, LUA_CHON_TRONG, 'tha')).toBe(false)
    const banSua: LuaChon = { ...LUA_CHON_TRONG, xuLyTrung: { 1: 'thanh-ban-sua' } }
    expect(canBoVaoRac(banChep, banSua, 'quet-lai')).toBe(false)
    // Server cũ (không có khopTheo) mà có đường dẫn: coi là cần (422 = không có gì, coi như xong)
    expect(canBoVaoRac({ ...banChep, khopTheo: undefined }, LUA_CHON_TRONG, 'quet-lai')).toBe(true)
  })

  it('không còn file → chỉ Giữ bản cũ: lựa chọn "Nhập thành bản sửa" bị bỏ, không đếm vào Nhập', () => {
    expect(khongConFile(mat)).toBe(true)
    expect(khongConFile(daNhan)).toBe(false)
    expect(khongConFile(dong({ ...mat, khopTheo: undefined }))).toBe(false)
    const banSua: LuaChon = { ...LUA_CHON_TRONG, xuLyTrung: { 2: 'thanh-ban-sua' } }
    expect(xuLyTrungCua(mat, banSua)).toBe('giu-ban-cu')
    expect(seNhap(mat, banSua)).toBe(false)
    expect(demViec([mat], banSua, 'quet-lai')).toEqual({ nhap: 0, giu: 1 })
    expect(taoYeuCau('t', [mat], banSua).xuLyTrung).toEqual({ 2: 'giu-ban-cu' })
  })
})

describe('giuLuaChon (kiểm tra lại sau khi lô hết hạn)', () => {
  it('chỉ giữ lựa chọn của dòng cùng chiSo và cùng tên file', () => {
    const lc: LuaChon = {
      gan: { 12: mucNgan('risk-register'), 3: mucNgan('pestle') },
      xuLyTrung: { 13: 'thanh-ban-sua' },
      nhanDaDuyet: {},
    }
    const moi = loF22('tok-moi').ketQua.map((k) => (k.chiSo === 3 ? { ...k, ten: 'khac.md' } : k))
    expect(giuLuaChon(lc, f22.ketQua, moi)).toEqual({
      gan: { 12: mucNgan('risk-register') },
      xuLyTrung: { 13: 'thanh-ban-sua' },
      nhanDaDuyet: {},
    })
  })
})

describe('cột "Khớp theo"', () => {
  it('id trong file = id mục → "id"; không id, tên file = slug → "tên file"; vuca lỗi YAML → "tên file"', () => {
    const pestle = f22.ketQua[0]
    expect(khopTheo(pestle, LUA_CHON_TRONG, fileMd('pestle'), undefined)).toBe('id')
    const khongId = '---\nloai: chu-de\n---\n'
    expect(khopTheo(pestle, LUA_CHON_TRONG, khongId, undefined)).toBe('tên file')
    expect(khopTheo(f22.ketQua[14], LUA_CHON_TRONG, '---\nloai chu-de\n---\n', undefined)).toBe(
      'tên file',
    )
  })

  it('gán sẵn gần đúng → "tên file"; chưa có mục → "tên file"; bạn gán → "bạn gán"; ?muc= → "gán sẵn"', () => {
    const rr = f22.ketQua[12]
    expect(khopTheo(rr, LUA_CHON_TRONG, '---\nloai: tai-lieu\n---\n', undefined)).toBe('tên file')
    const chuaCo = dong({ chiSo: 0, ten: 'zz.md', loai: 'khong-khop' })
    expect(khopTheo(chuaCo, LUA_CHON_TRONG, '', undefined)).toBe('tên file')
    expect(
      khopTheo(chuaCo, { ...LUA_CHON_TRONG, gan: { 0: mucNgan('bani') } }, '', undefined),
    ).toBe('bạn gán')
    const theoMuc = dong({
      chiSo: 0,
      ten: 'ban-thao.md',
      loai: 'hop-le',
      muc: mucNgan('salience-model'),
    })
    expect(
      khopTheo(theoMuc, LUA_CHON_TRONG, '---\nloai: chu-de\n---\n', muc('salience-model').id),
    ).toBe('gán sẵn')
  })

  it('tên gốc trên roadmap (steering-comittee.md) và .ban-sua tính là khớp tên file; Quét lại không có nội dung', () => {
    const sc = dong({
      chiSo: 0,
      ten: 'steering-comittee.md',
      loai: 'hop-le',
      muc: mucNgan('steering-committee'),
    })
    expect(khopTheo(sc, LUA_CHON_TRONG, undefined, undefined)).toBe('tên file')
    expect(tenGocFile('scope-creep.ban-sua.md')).toBe('scope-creep')
    const theoId = dong({ chiSo: 0, ten: 'ten-khac.md', loai: 'hop-le', muc: mucNgan('pestle') })
    expect(khopTheo(theoId, LUA_CHON_TRONG, undefined, undefined)).toBe('id')
  })

  it('theo khopTheo của server: id / tên file / gợi ý → "tên file" / gán sẵn / đường dẫn; bạn gán vẫn thắng', () => {
    const goc = dong({
      chiSo: 0,
      ten: 'scope-creep.md',
      loai: 'trung-da-duyet',
      muc: mucNgan('scope-creep'),
    })
    // Lô Quét lại không có nội dung trong tay: trước đây đoán "tên file" cho file khớp theo đường dẫn chuẩn
    expect(khopTheo({ ...goc, khopTheo: 'duong-dan' }, LUA_CHON_TRONG, undefined, undefined)).toBe(
      'đường dẫn',
    )
    expect(khopTheo({ ...goc, khopTheo: 'id' }, LUA_CHON_TRONG, undefined, undefined)).toBe('id')
    expect(khopTheo({ ...goc, khopTheo: 'ten-file' }, LUA_CHON_TRONG, undefined, undefined)).toBe(
      'tên file',
    )
    expect(khopTheo({ ...goc, khopTheo: 'goi-y' }, LUA_CHON_TRONG, undefined, undefined)).toBe(
      'tên file',
    )
    expect(khopTheo({ ...goc, khopTheo: 'gan-san' }, LUA_CHON_TRONG, undefined, undefined)).toBe(
      'gán sẵn',
    )
    // Server nói "id" dù file có tên khớp slug: theo server, không đoán
    expect(
      khopTheo({ ...goc, khopTheo: 'id' }, LUA_CHON_TRONG, '---\nloai: chu-de\n---\n', undefined),
    ).toBe('id')
    const banGan: LuaChon = { ...LUA_CHON_TRONG, gan: { 0: mucNgan('pestle') } }
    expect(khopTheo({ ...goc, khopTheo: 'duong-dan' }, banGan, undefined, undefined)).toBe(
      'bạn gán',
    )
  })

  it('idTrongFile đọc nhẹ dòng id: trong frontmatter (nháy, chú thích), ngoài frontmatter thì không', () => {
    expect(idTrongFile('---\nloai: chu-de\nid: "abc"   # ghi chú\n---\n')).toBe('abc')
    expect(idTrongFile('\uFEFF---\r\nid: xyz\r\n---\r\n')).toBe('xyz')
    expect(idTrongFile('---\nloai: chu-de\n---\nid: sau\n')).toBeUndefined()
    expect(idTrongFile('id: khong-co-frontmatter')).toBeUndefined()
  })
})
